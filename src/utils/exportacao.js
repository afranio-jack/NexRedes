// Exportação de dados: CSV (Excel pt-BR), planilha Excel (.xlsx gerada na
// mão — ZIP armazenado + XML, sem dependências externas) e backup JSON.
// Os "datasets" montam { nome, cabecalho, linhas } a partir dos dados reais
// do usuário (salas, racks, pontos, testes, falhas e modelos de etiqueta).

import { baixarCSV } from './csv'
import { listarTestes } from './testes'
import { listarModelos } from './etiquetas'
import { montarInventario, infoStatus } from './equipamentos'
import { formatarDataHora } from './datas'

// ---------- Download genérico ----------

function baixarArquivo(nomeArquivo, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function baixarJSON(nomeArquivo, objeto) {
  baixarArquivo(
    nomeArquivo,
    new Blob([JSON.stringify(objeto, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
  )
}

// ---------- Escritor de .xlsx (ZIP armazenado + XML, sem dependências) ----------

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  return tabela
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = TABELA_CRC[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const CODIFICADOR = new TextEncoder()

// Monta um ZIP com entradas armazenadas (sem compressão) — válido para
// qualquer leitor, inclusive o Excel.
function montarZip(arquivos) {
  const partes = []
  const central = []
  let offset = 0
  for (const arquivo of arquivos) {
    const crc = crc32(arquivo.conteudo)
    const nomeBytes = CODIFICADOR.encode(arquivo.nome)
    const local = new Uint8Array(
      30 + nomeBytes.length + arquivo.conteudo.length
    )
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true)
    vl.setUint16(4, 20, true)
    vl.setUint16(6, 0x0800, true) // nome em UTF-8
    vl.setUint16(8, 0, true) // método: armazenado
    vl.setUint16(10, 0, true)
    vl.setUint16(12, 0x21, true) // data fixa (1980-01-01)
    vl.setUint32(14, crc, true)
    vl.setUint32(18, arquivo.conteudo.length, true)
    vl.setUint32(22, arquivo.conteudo.length, true)
    vl.setUint16(26, nomeBytes.length, true)
    vl.setUint16(28, 0, true)
    local.set(nomeBytes, 30)
    local.set(arquivo.conteudo, 30 + nomeBytes.length)
    partes.push(local)

    const dir = new Uint8Array(46 + nomeBytes.length)
    const vd = new DataView(dir.buffer)
    vd.setUint32(0, 0x02014b50, true)
    vd.setUint16(4, 20, true)
    vd.setUint16(6, 20, true)
    vd.setUint16(8, 0x0800, true)
    vd.setUint16(10, 0, true)
    vd.setUint16(12, 0, true)
    vd.setUint16(14, 0x21, true)
    vd.setUint32(16, crc, true)
    vd.setUint32(20, arquivo.conteudo.length, true)
    vd.setUint32(24, arquivo.conteudo.length, true)
    vd.setUint16(28, nomeBytes.length, true)
    vd.setUint16(30, 0, true)
    vd.setUint16(32, 0, true)
    vd.setUint16(34, 0, true)
    vd.setUint16(36, 0, true)
    vd.setUint32(38, 0, true)
    vd.setUint32(42, offset, true)
    dir.set(nomeBytes, 46)
    central.push(dir)
    offset += local.length
  }
  const tamanhoCentral = central.reduce((soma, item) => soma + item.length, 0)
  const eocd = new Uint8Array(22)
  const ve = new DataView(eocd.buffer)
  ve.setUint32(0, 0x06054b50, true)
  ve.setUint16(4, 0, true)
  ve.setUint16(6, 0, true)
  ve.setUint16(8, arquivos.length, true)
  ve.setUint16(10, arquivos.length, true)
  ve.setUint32(12, tamanhoCentral, true)
  ve.setUint32(16, offset, true)
  ve.setUint16(20, 0, true)

  const total = [...partes, ...central, eocd]
  const saida = new Uint8Array(
    total.reduce((soma, item) => soma + item.length, 0)
  )
  let posicao = 0
  for (const parte of total) {
    saida.set(parte, posicao)
    posicao += parte.length
  }
  return saida
}

function escaparXML(valor) {
  const E = '&'
  return String(valor ?? '')
    .replace(/&/g, E + 'amp;')
    .replace(/</g, E + 'lt;')
    .replace(/>/g, E + 'gt;')
    .replace(/"/g, E + 'quot;')
    .replace(/'/g, E + 'apos;')
}

function colunaExcel(indice) {
  let saida = ''
  let n = indice
  do {
    saida = String.fromCharCode(65 + (n % 26)) + saida
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return saida
}

function celulaXML(coluna, linha, valor) {
  const ref = `${colunaExcel(coluna)}${linha}`
  if (valor === null || valor === undefined) return `<c r="${ref}"/>`
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`
  }
  const texto = String(valor)
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escaparXML(
    texto
  )}</t></is></c>`
}

function planilhaParaXML(cabecalho, linhas) {
  const linhasXML = [
    `<row r="1">${cabecalho
      .map((titulo, indice) => celulaXML(indice, 1, titulo))
      .join('')}</row>`,
  ]
  linhas.forEach((linha, indiceLinha) => {
    const r = indiceLinha + 2
    linhasXML.push(
      `<row r="${r}">${linha
        .map((valor, indice) => celulaXML(indice, r, valor))
        .join('')}</row>`
    )
  })
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${linhasXML.join(
    ''
  )}</sheetData></worksheet>`
}

// Baixa uma planilha .xlsx — aceita UMA aba ({nome, cabecalho, linhas}) ou
// VÁRIAS ([{nome, cabecalho, linhas}, ...]); nomes de aba são saneados,
// limitados a 31 caracteres e garantidos únicos.
export function baixarXLSX(nomeArquivo, planilhaOuLista) {
  const lista = Array.isArray(planilhaOuLista)
    ? planilhaOuLista
    : [planilhaOuLista]
  const usados = new Set()
  const nomesAbas = lista.map((planilha, indice) => {
    let nome = (planilha.nome || `Dados ${indice + 1}`)
      .replace(/[[\]:*?/\\]/g, ' ')
      .trim()
      .slice(0, 31) || `Dados ${indice + 1}`
    let n = 2
    while (usados.has(nome)) {
      nome = `${nome.slice(0, 27)} ${n++}`
    }
    usados.add(nome)
    return nome
  })

  const tipos = nomesAbas
    .map(
      (_, indice) =>
        `<Override PartName="/xl/worksheets/sheet${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('')
  const cabecalhoXML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const arquivos = [
    {
      nome: '[Content_Types].xml',
      xml: `${cabecalhoXML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${tipos}</Types>`,
    },
    {
      nome: '_rels/.rels',
      xml: `${cabecalhoXML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      nome: 'xl/workbook.xml',
      xml: `${cabecalhoXML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomesAbas
        .map(
          (nome, indice) =>
            `<sheet name="${escaparXML(nome)}" sheetId="${indice + 1}" r:id="rId${indice + 1}"/>`
        )
        .join('')}</sheets></workbook>`,
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      xml: `${cabecalhoXML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${nomesAbas
        .map(
          (_, indice) =>
            `<Relationship Id="rId${indice + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${indice + 1}.xml"/>`
        )
        .join('')}</Relationships>`,
    },
    ...lista.map((planilha, indice) => ({
      nome: `xl/worksheets/sheet${indice + 1}.xml`,
      xml: planilhaParaXML(planilha.cabecalho, planilha.linhas),
    })),
  ]
  const zip = montarZip(
    arquivos.map((arquivo) => ({
      nome: arquivo.nome,
      conteudo: CODIFICADOR.encode(arquivo.xml),
    }))
  )
  baixarArquivo(
    nomeArquivo,
    new Blob([zip], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  )
}

// ---------- Datasets (tabela → { nome, cabecalho, linhas }) ----------

function nomeEquipamentoNaSala(sala, equipamentoId) {
  for (const rack of sala.racks || []) {
    const achado = (rack.equipamentos || []).find(
      (item) => item.id === equipamentoId
    )
    if (achado) return { nome: achado.nome, rack }
  }
  return { nome: '', rack: null }
}

export function datasetSalas(salas) {
  return {
    nome: 'Salas',
    cabecalho: [
      'Nome',
      'Código',
      'Tipo',
      'Prédio',
      'Andar',
      'Localização',
      'Responsável',
      'Máquinas',
      'Racks',
      'Pontos de rede',
      'Falhas ativas',
      'Observações',
      'Criada em',
      'Atualizada em',
    ],
    linhas: salas.map((sala) => [
      sala.nome,
      sala.codigo,
      sala.tipo,
      sala.predio,
      sala.andar,
      sala.descricaoLocalizacao,
      sala.responsavel,
      sala.quantidadeMaquinas || 0,
      (sala.racks || []).length,
      (sala.pontos || []).length,
      (sala.falhas || []).filter((falha) => falha.status !== 'resolvida')
        .length,
      sala.observacoes,
      sala.criadoEm ? formatarDataHora(sala.criadoEm) : '',
      sala.atualizadoEm ? formatarDataHora(sala.atualizadoEm) : '',
    ]),
  }
}

export function datasetEquipamentos(salas, statusConfig = []) {
  const linhas = montarInventario(salas).map((linha) => [
    linha.nome,
    linha.tipoExibicao,
    linha.sala ? linha.sala.nome : '',
    linha.rack ? linha.rack.nome : '',
    linha.posicaoU ? `U${linha.posicaoU}` : '',
    linha.quantidadePortas ?? '',
    linha.fabricante,
    linha.modelo,
    linha.numeroSerie,
    linha.ip,
    linha.mac,
    linha.dataAquisicao,
    linha.garantia,
    linha.status ? infoStatus(linha.status, statusConfig).nome : '',
    linha.observacoes,
    linha.atualizadoEm ? formatarDataHora(linha.atualizadoEm) : '',
  ])
  return {
    nome: 'Equipamentos',
    cabecalho: [
      'Nome',
      'Tipo',
      'Sala',
      'Rack',
      'Posição',
      'Portas',
      'Fabricante',
      'Modelo',
      'Nº de série',
      'IP',
      'MAC',
      'Aquisição',
      'Garantia',
      'Status',
      'Observações',
      'Última atualização',
    ],
    linhas,
  }
}

export function datasetPontos(salas, testes = null) {
  const historico = testes === null ? listarTestes() : testes
  const linhas = []
  for (const sala of salas) {
    for (const ponto of sala.pontos || []) {
      const doPonto = historico
        .filter((teste) => teste.pontoId === ponto.id)
        .sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1))
      const ultimo = doPonto[0] || null
      const pp = ponto.patchPanelId
        ? nomeEquipamentoNaSala(sala, ponto.patchPanelId)
        : { nome: '', rack: null }
      const sw = ponto.switchId
        ? nomeEquipamentoNaSala(sala, ponto.switchId)
        : { nome: '', rack: null }
      linhas.push([
        ponto.identificacao,
        sala.nome,
        pp.rack ? pp.rack.nome : '',
        pp.nome && ponto.portaPatchPanel
          ? `${pp.nome} / porta ${ponto.portaPatchPanel}`
          : pp.nome || '',
        sw.nome && ponto.portaSwitch
          ? `${sw.nome} / porta ${ponto.portaSwitch}`
          : sw.nome || '',
        ponto.categoriaCabo,
        ultimo ? ultimo.resultado : 'SEM_TESTE',
        ultimo ? formatarDataHora(ultimo.dataHora) : '',
        ponto.observacoes,
      ])
    }
  }
  return {
    nome: 'Pontos de rede',
    cabecalho: [
      'Identificação',
      'Sala',
      'Rack',
      'Patch panel / porta',
      'Switch / porta',
      'Categoria do cabo',
      'Último teste',
      'Data do último teste',
      'Observações',
    ],
    linhas,
  }
}

export function datasetTestes(testes) {
  return {
    nome: 'Testes de certificação',
    cabecalho: [
      'Data',
      'Ponto',
      'Sala',
      'Categoria do cabo',
      'Resultado',
      'Técnico',
      'Norma',
      'Comprimento (m)',
      'Mapa de fios',
      'Atenuação (dB)',
      'NEXT (dB)',
      'Perda de retorno (dB)',
      'Motivo da falha',
      'Observações',
    ],
    linhas: testes.map((teste) => [
      formatarDataHora(teste.dataHora),
      teste.snapshot?.pontoIdentificacao || '',
      teste.snapshot?.salaNome || '',
      teste.snapshot?.categoriaCabo || '',
      teste.resultado,
      teste.tecnico,
      teste.norma,
      teste.medicoes?.comprimentoM || '',
      teste.medicoes?.mapaFios || '',
      teste.medicoes?.atenuacao || '',
      teste.medicoes?.next || '',
      teste.medicoes?.perdaRetorno || '',
      teste.motivoFalha,
      teste.observacoes,
    ]),
  }
}

export function datasetFalhas(salas) {
  const linhas = []
  for (const sala of salas) {
    for (const falha of sala.falhas || []) {
      linhas.push([
        sala.nome,
        falha.alvo,
        falha.descricao,
        falha.gravidade,
        falha.status,
        falha.dataIdentificacao,
      ])
    }
  }
  return {
    nome: 'Falhas e manutenção',
    cabecalho: [
      'Sala',
      'Alvo',
      'Descrição',
      'Gravidade',
      'Status',
      'Identificada em',
    ],
    linhas,
  }
}

export function datasetEtiquetas() {
  return {
    nome: 'Etiquetas',
    cabecalho: ['Modelo', 'Largura (mm)', 'Altura (mm)'],
    linhas: listarModelos().map((modelo) => [
      modelo.nome,
      modelo.largura,
      modelo.altura,
    ]),
  }
}

// Exporta no formato escolhido ('csv' | 'xlsx'); 'pdf' é tratado pela tela
// (abre a impressão do navegador com CSS dedicado).
export function baixarDataset(formato, nomeBase, dataset) {
  if (formato === 'csv') {
    baixarCSV(`${nomeBase}.csv`, dataset.cabecalho, dataset.linhas)
    return true
  }
  if (formato === 'xlsx') {
    baixarXLSX(`${nomeBase}.xlsx`, dataset)
    return true
  }
  return false
}
