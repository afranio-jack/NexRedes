// Importação de dados (Configurações → Dados e backup): leitura de CSV
// (separador ";" ou vírgula, campos entre aspas, BOM tolerado) e importação
// de pontos de rede a partir de uma planilha-modelo baixável.
// Os pontos importados entram sem cadeia física (patch panel/switch) —
// use a edição normal do ponto para vincular as portas depois.

import { listarSalas } from './salas'
import { criarPontoAvulso } from './pontos'
import { baixarXLSX } from './exportacao'

// ---------- Download de texto ----------

function baixarArquivoTexto(nomeArquivo, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ---------- Leitura de CSV ----------

// Detecta o separador mais frequente na primeira linha
function detectarSeparador(linha) {
  const candidatos = [';', ',', '\t']
  let melhor = ';'
  let maior = -1
  for (const candidato of candidatos) {
    const total = linha.split(candidato).length - 1
    if (total > maior) {
      maior = total
      melhor = candidato
    }
  }
  return melhor
}

// Divide uma linha respeitando campos entre aspas (aspas duplicadas = literal)
function dividirLinha(linha, separador) {
  const campos = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i]
    if (entreAspas) {
      if (caractere === '"') {
        if (linha[i + 1] === '"') {
          atual += '"'
          i++
        } else {
          entreAspas = false
        }
      } else {
        atual += caractere
      }
    } else if (caractere === '"') {
      entreAspas = true
    } else if (caractere === separador) {
      campos.push(atual)
      atual = ''
    } else {
      atual += caractere
    }
  }
  campos.push(atual)
  return campos.map((campo) => campo.trim())
}

// Lê um CSV inteiro → { cabecalho: [nomes], linhas: [[campos]] }
export function analisarCSV(conteudo) {
  const texto = (conteudo || '').replace(/^\ufeff/, '')
  const bruto = texto.split(/\r\n|\n|\r/).filter((linha) => linha.trim() !== '')
  if (bruto.length === 0) return { cabecalho: [], linhas: [] }
  const separador = detectarSeparador(bruto[0])
  const cabecalho = dividirLinha(bruto[0], separador)
  const linhas = bruto.slice(1).map((linha) => dividirLinha(linha, separador))
  return { cabecalho, linhas }
}

// ---------- Modelo de planilha ----------

export const MODELO_PONTOS = {
  cabecalho: ['Identificação', 'Sala', 'Categoria do cabo', 'Observações'],
  exemplo: ['CO-P01', 'SALA-01', 'Cat6', 'Ponto da secretaria'],
}

// Baixa a planilha-modelo de importação de pontos (.xlsx)
export function baixarModeloPontos() {
  baixarXLSX('modelo-pontos-rede.xlsx', {
    nome: 'Pontos',
    cabecalho: MODELO_PONTOS.cabecalho,
    linhas: [MODELO_PONTOS.exemplo],
  })
}

// Também em CSV (abre em qualquer editor de planilha)
export function baixarModeloPontosCSV() {
  const conteudo = [MODELO_PONTOS.cabecalho, MODELO_PONTOS.exemplo]
    .map((linha) => linha.map((campo) => `"${campo}"`).join(';'))
    .join('\r\n')
  baixarArquivoTexto(
    'modelo-pontos-rede.csv',
    '\ufeff' + conteudo,
    'text/csv;charset=utf-8'
  )
}

// ---------- Importação de pontos ----------

// Encontra a sala por nome OU código (ignora maiúsculas/minúsculas)
function buscarSala(salas, termo) {
  const alvo = (termo || '').trim().toLowerCase()
  if (!alvo) return null
  return (
    salas.find(
      (sala) =>
        (sala.nome || '').trim().toLowerCase() === alvo ||
        (sala.codigo || '').trim().toLowerCase() === alvo
    ) || null
  )
}

// Importa pontos de um CSV/planilha exportada no modelo. Colunas aceitas
// (cabeçalho): Identificação, Sala, Categoria do cabo, Observações.
// Devolve { criados, avisos: [{ linha, motivo }] }.
export function importarPontos(conteudo) {
  const { cabecalho, linhas } = analisarCSV(conteudo)
  const indice = (nome) => {
    const alvo = nome.toLowerCase()
    return cabecalho.findIndex((coluna) => (coluna || '').toLowerCase() === alvo)
  }
  const colIdentificacao = indice('identificação') ?? 0
  const colSala = indice('sala')
  const colCategoria = indice('categoria do cabo')
  const colObservacoes = indice('observações')

  const avisos = []
  let criados = 0

  linhas.forEach((campos, indiceLinha) => {
    const numeroLinha = indiceLinha + 2 // cabeçalho é a linha 1
    const identificacao = (campos[colIdentificacao] || '').trim()
    if (!identificacao) {
      avisos.push({ linha: numeroLinha, motivo: 'Identificação vazia' })
      return
    }
    if (colSala === -1) {
      avisos.push({ linha: numeroLinha, motivo: 'Coluna "Sala" não encontrada' })
      return
    }
    const salas = listarSalas()
    const sala = buscarSala(salas, campos[colSala])
    if (!sala) {
      avisos.push({
        linha: numeroLinha,
        motivo: `Sala "${campos[colSala] || '?'}" não encontrada`,
      })
      return
    }
    const existe = (sala.pontos || []).some(
      (ponto) =>
        (ponto.identificacao || '').trim().toLowerCase() ===
        identificacao.toLowerCase()
    )
    if (existe) {
      avisos.push({
        linha: numeroLinha,
        motivo: `Ponto ${identificacao} já existe na sala ${sala.nome}`,
      })
      return
    }
    criarPontoAvulso(sala.id, {
      identificacao,
      categoriaCabo: colCategoria !== -1 ? campos[colCategoria] || '' : '',
      observacoes:
        colObservacoes !== -1 ? campos[colObservacoes] || '' : '',
    })
    criados++
  })

  return { criados, avisos }
}
