// Configurações → Dados e backup: exportar tudo (JSON/Excel), importar pontos
// de rede por planilha (com modelo para baixar), backup/restauração e a zona
// de perigo (apagar todos os dados, com confirmação digitando o nome da
// instituição).

import { useRef, useState } from 'react'
import {
  DatabaseIcon,
  DownloadIcon,
  UploadIcon,
  AlertTriangleIcon,
  TrashIcon,
} from '../icons'
import ConfirmDialog from '../sala/ConfirmDialog'
import { CartaoSecao } from './UI'
import {
  datasetSalas,
  datasetEquipamentos,
  datasetPontos,
  datasetTestes,
  datasetEtiquetas,
  datasetFalhas,
  baixarXLSX,
  baixarJSON,
} from '../../utils/exportacao'
import {
  baixarModeloPontos,
  baixarModeloPontosCSV,
  importarPontos,
} from '../../utils/importacao'
import {
  listarSalas,
  salvarSalas,
} from '../../utils/salas'
import { listarTestes, salvarTestes } from '../../utils/testes'
import { listarModelos, salvarModelos, obterConfig, salvarConfig } from '../../utils/etiquetas'
import { chaveDeUsuario } from '../../utils/sessao'

export default function SecaoDados({
  salas,
  onDadosAlterados,
  onConfigAlterado,
  onMostrarToast,
}) {
  const inputImportar = useRef(null)
  const inputRestaurar = useRef(null)
  const [resultadoImportacao, setResultadoImportacao] = useState(null)
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(null) // arquivo lido
  const [confirmarApagar, setConfirmarApagar] = useState(false)
  const [nomeDigitado, setNomeDigitado] = useState('')

  const nomeInstituicao = (obterConfig().organizacao.nomeEmpresa || '').trim()
  const palavraConfirmacao = nomeInstituicao || 'EXCLUIR TUDO'

  function exportarTudoExcel() {
    const salasAtuais = listarSalas()
    baixarXLSX('nexredes-dados.xlsx', [
      datasetSalas(salasAtuais),
      datasetEquipamentos(salasAtuais),
      datasetPontos(salasAtuais, listarTestes()),
      datasetTestes(listarTestes()),
      datasetFalhas(salasAtuais),
      datasetEtiquetas(),
    ])
    onMostrarToast?.('Planilha completa baixada')
  }

  function exportarTudoJSON() {
    baixarJSON('nexredes-backup.json', {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      salas: listarSalas(),
      testes: listarTestes(),
      modelos: listarModelos(),
      config: obterConfig(),
    })
    onMostrarToast?.('Backup completo baixado (JSON)')
  }

  function aoImportar(evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      try {
        const resultado = importarPontos(String(leitor.result))
        setResultadoImportacao(resultado)
        if (resultado.criados > 0) onDadosAlterados?.()
        onMostrarToast?.(
          `${resultado.criados} ponto(s) importado(s)` +
            (resultado.avisos.length > 0
              ? ` · ${resultado.avisos.length} linha(s) ignorada(s)`
              : '')
        )
      } catch {
        onMostrarToast?.('Não foi possível ler o arquivo CSV')
      }
      evento.target.value = ''
    }
    leitor.readAsText(arquivo)
  }

  function aoLerBackup(evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      try {
        const dados = JSON.parse(String(leitor.result))
        if (!dados || !Array.isArray(dados.salas)) {
          onMostrarToast?.('Arquivo de backup inválido')
          return
        }
        setConfirmarRestaurar(dados)
      } catch {
        onMostrarToast?.('Não foi possível ler o arquivo JSON')
      }
      evento.target.value = ''
    }
    leitor.readAsText(arquivo)
  }

  function restaurar() {
    if (!confirmarRestaurar) return
    const dados = confirmarRestaurar
    if (Array.isArray(dados.salas)) salvarSalas(dados.salas)
    salvarTestes(Array.isArray(dados.testes) ? dados.testes : [])
    if (Array.isArray(dados.modelos)) salvarModelos(dados.modelos)
    if (dados.config && typeof dados.config === 'object') {
      salvarConfig(dados.config)
    }
    setConfirmarRestaurar(null)
    onDadosAlterados?.()
    onConfigAlterado?.()
    onMostrarToast?.('Backup restaurado com sucesso')
  }

  function apagarTudo() {
    const chaves = [
      'nexredes_salas',
      'nexredes_testes',
      'nexredes_modelos_etiqueta',
      'nexredes_config',
    ]
    for (const base of chaves) {
      const chave = chaveDeUsuario(base)
      if (chave) localStorage.removeItem(chave)
    }
    setConfirmarApagar(false)
    setNomeDigitado('')
    onDadosAlterados?.()
    onConfigAlterado?.()
    onMostrarToast?.('Todos os dados foram apagados')
  }

  return (
    <>
      <CartaoSecao
        icone={DatabaseIcon}
        titulo="Exportar dados"
        descricao="Baixe tudo o que está cadastrado, no formato que preferir."
      >
        <div className="configuracoes-acoes">
          <button
            type="button"
            className="redes-filtro-btn"
            onClick={exportarTudoExcel}
          >
            <DownloadIcon size={15} />
            Exportar tudo (Excel .xlsx)
          </button>
          <button
            type="button"
            className="redes-filtro-btn"
            onClick={exportarTudoJSON}
          >
            <DownloadIcon size={15} />
            Backup completo (JSON)
          </button>
        </div>
      </CartaoSecao>

      <CartaoSecao
        icone={UploadIcon}
        titulo="Importar dados"
        descricao="Importe pontos de rede a partir de uma planilha (CSV). Baixe o modelo, preencha e envie."
      >
        <div className="configuracoes-acoes">
          <button
            type="button"
            className="redes-filtro-btn"
            onClick={() => baixarModeloPontos()}
          >
            <DownloadIcon size={15} />
            Baixar modelo (.xlsx)
          </button>
          <button
            type="button"
            className="redes-filtro-btn"
            onClick={() => baixarModeloPontosCSV()}
          >
            <DownloadIcon size={15} />
            Baixar modelo (.csv)
          </button>
          <button
            type="button"
            className="redes-filtro-btn"
            onClick={() => inputImportar.current?.click()}
          >
            <UploadIcon size={15} />
            Enviar planilha de pontos
          </button>
          <input
            ref={inputImportar}
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={aoImportar}
          />
        </div>
        {resultadoImportacao && (
          <div className="configuracoes-resultado">
            <p>
              <strong>{resultadoImportacao.criados}</strong> ponto(s)
              importado(s).
            </p>
            {resultadoImportacao.avisos.length > 0 ? (
              <ul>
                {resultadoImportacao.avisos
                  .slice(0, 6)
                  .map((aviso, indice) => (
                    <li key={indice}>
                      Linha {aviso.linha}: {aviso.motivo}
                    </li>
                  ))}
                {resultadoImportacao.avisos.length > 6 && (
                  <li>
                    … e mais {resultadoImportacao.avisos.length - 6} aviso(s)
                  </li>
                )}
              </ul>
            ) : (
              <p className="etiquetas-nota">Nenhum aviso — importação limpa.</p>
            )}
          </div>
        )}
        <p className="etiquetas-nota">
          Colunas do modelo: Identificação, Sala (nome ou código), Categoria
          do cabo e Observações. Pontos importados entram sem cadeia física —
          edite cada um para vincular patch panel e switch.
        </p>
      </CartaoSecao>

      <CartaoSecao
        icone={DatabaseIcon}
        titulo="Backup e restauração"
        descricao="Restaure um backup JSON feito por este aplicativo (substitui os dados atuais)."
      >
        <div className="configuracoes-acoes">
          <button
            type="button"
            className="redes-filtro-btn"
            onClick={() => inputRestaurar.current?.click()}
          >
            <UploadIcon size={15} />
            Restaurar backup (JSON)
          </button>
          <input
            ref={inputRestaurar}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={aoLerBackup}
          />
        </div>
        {confirmarRestaurar && (
          <ConfirmDialog
            titulo="Restaurar backup"
            texto={`O backup contém ${confirmarRestaurar.salas.length} sala(s) e ${
              Array.isArray(confirmarRestaurar.testes)
                ? confirmarRestaurar.testes.length
                : 0
            } teste(s). Os dados atuais serão substituídos. Continuar?`}
            confirmarLabel="Restaurar"
            onConfirmar={restaurar}
            onCancelar={() => setConfirmarRestaurar(null)}
          />
        )}
      </CartaoSecao>

      <section className="detalhe-bloco configuracoes-bloco configuracoes-perigo">
        <h2>
          <AlertTriangleIcon size={18} />
          Zona de perigo
        </h2>
        <p className="configuracoes-descricao">
          Apaga TODOS os dados desta conta: salas, racks, pontos, testes e
          configurações. Não há volta.
        </p>
        <div className="configuracoes-perigo-form">
          <label className="campo">
            <span>
              Digite <strong>“{palavraConfirmacao}”</strong> para confirmar
            </span>
            <input
              type="text"
              className="campo-input"
              value={nomeDigitado}
              placeholder={palavraConfirmacao}
              aria-label="Confirmação para apagar os dados"
              onChange={(evento) => setNomeDigitado(evento.target.value)}
            />
          </label>
          <button
            type="button"
            className="configuracoes-btn-perigo"
            disabled={nomeDigitado.trim() !== palavraConfirmacao}
            onClick={() => setConfirmarApagar(true)}
          >
            <TrashIcon size={15} />
            Apagar todos os dados
          </button>
        </div>
      </section>

      {confirmarApagar && (
        <ConfirmDialog
          titulo="Apagar todos os dados"
          texto={`Isso remove permanentemente todas as salas, racks, pontos de rede, testes e configurações desta conta. Não há como desfazer. Continuar?`}
          confirmarLabel="Apagar tudo"
          perigo
          onConfirmar={apagarTudo}
          onCancelar={() => setConfirmarApagar(false)}
        />
      )}
    </>
  )
}
