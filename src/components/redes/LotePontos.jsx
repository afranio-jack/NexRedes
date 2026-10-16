// Drawers das ações em lote da sub-aba "Pontos": registro de resultado em
// lote (PASS/FAIL com técnico e data — cria um teste por ponto, nunca
// sobrescreve o histórico) e mudança de sala (a cadeia física é desfeita na
// sala de origem; revincule as portas pela edição do ponto depois).

import { useEffect, useRef, useState } from 'react'
import { XIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import { criarTeste, NORMAS } from '../../utils/testes'
import { moverPontosParaSala } from '../../utils/pontos'
import { obterConfig } from '../../utils/etiquetas'
import { agoraLocalInput, inputParaISO } from '../../utils/datas'
import '../sala/SalaModal.css'

function usarDrawer(onFechar) {
  const ref = useRef(null)
  useEffect(() => {
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        onFechar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = scrollAnterior
      window.removeEventListener('keydown', aoTeclar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}

// ---------- Alterar status em lote (registra um teste por ponto) ----------

export function LoteStatusDrawer({
  pontos,
  onFechar,
  onConcluir,
  onTestesAlterados,
}) {
  const drawerRef = usarDrawer(onFechar)
  const responsaveis = obterConfig().testes.responsaveis || []
  const [form, setForm] = useState(() => ({
    resultado: 'PASS',
    dataHora: agoraLocalInput(),
    tecnico: '',
    motivoFalha: '',
    observacoes: '',
  }))
  const [erros, setErros] = useState({})

  function atualizar(chave, valor) {
    setForm((atual) => ({ ...atual, [chave]: valor }))
    setErros((atual) => (atual[chave] ? { ...atual, [chave]: undefined } : atual))
  }

  function aoSubmeter(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!form.dataHora) novosErros.dataHora = 'Informe a data e a hora.'
    if (!form.tecnico.trim()) novosErros.tecnico = 'Informe o técnico responsável.'
    if (form.resultado === 'FAIL' && !form.motivoFalha.trim()) {
      novosErros.motivoFalha = 'Descreva o motivo da falha.'
    }
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    const norma = obterConfig().testes.normaPadrao || NORMAS[0]
    for (const ponto of pontos) {
      criarTeste(
        {
          pontoId: ponto.id,
          dataHora: inputParaISO(form.dataHora),
          tecnico: form.tecnico,
          norma,
          resultado: form.resultado,
          medicoes: {},
          motivoFalha: form.resultado === 'FAIL' ? form.motivoFalha : '',
          observacoes: form.observacoes,
        },
        {}
      )
    }
    onTestesAlterados?.()
    onConcluir(`${pontos.length} teste(s) registrado(s) em lote`)
  }

  return (
    <div
      className="redes-drawer-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar()
      }}
    >
      <aside
        ref={drawerRef}
        className="redes-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lote-status-titulo"
        tabIndex={-1}
      >
        <header className="redes-drawer-cabecalho">
          <div>
            <h3 id="lote-status-titulo">Alterar status em lote</h3>
            <p>
              Registra um teste de certificação para {pontos.length} ponto(s)
              selecionado(s) — o histórico de cada ponto é preservado.
            </p>
          </div>
          <button type="button" className="btn-fechar" onClick={onFechar} aria-label="Fechar">
            <XIcon size={20} />
          </button>
        </header>
        <form className="redes-drawer-corpo" onSubmit={aoSubmeter}>
          <section className="redes-drawer-secao">
            <h4>Pontos</h4>
            <p className="lote-lista-pontos">
              {pontos.map((ponto) => ponto.identificacao).join(', ')}
            </p>
          </section>
          <section className="redes-drawer-secao">
            <h4>Resultado</h4>
            <div className="teste-resultado-botoes" role="radiogroup" aria-label="Resultado em lote">
              <button
                type="button"
                className={`btn-teste pass${form.resultado === 'PASS' ? ' ativo' : ''}`}
                aria-pressed={form.resultado === 'PASS'}
                onClick={() => atualizar('resultado', 'PASS')}
              >
                <CheckCircleIcon size={18} />
                PASS
              </button>
              <button
                type="button"
                className={`btn-teste fail${form.resultado === 'FAIL' ? ' ativo' : ''}`}
                aria-pressed={form.resultado === 'FAIL'}
                onClick={() => atualizar('resultado', 'FAIL')}
              >
                <XCircleIcon size={18} />
                FAIL
              </button>
            </div>
          </section>
          <section className="redes-drawer-secao">
            <h4>Registro</h4>
            <div className="redes-drawer-grade">
              <CampoInput
                chave="dataHora"
                label="Data e hora"
                obrigatorio
                tipo="datetime-local"
                erro={erros.dataHora}
                valor={form.dataHora}
                aoAlterar={(valor) => atualizar('dataHora', valor)}
              />
              <CampoInput
                chave="tecnico"
                label="Técnico responsável"
                obrigatorio
                placeholder="ex.: Ana Souza"
                erro={erros.tecnico}
                valor={form.tecnico}
                aoAlterar={(valor) => atualizar('tecnico', valor)}
                list="lote-responsaveis"
              />
            </div>
            {responsaveis.length > 0 && (
              <datalist id="lote-responsaveis">
                {responsaveis.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            )}
            {form.resultado === 'FAIL' && (
              <CampoTextarea
                chave="motivoFalha"
                label="Motivo da falha"
                obrigatorio
                linhas={2}
                placeholder="ex.: Par aberto, conector mal crimpado..."
                erro={erros.motivoFalha}
                valor={form.motivoFalha}
                aoAlterar={(valor) => atualizar('motivoFalha', valor)}
              />
            )}
            <CampoTextarea
              chave="observacoes"
              label="Observações"
              linhas={2}
              placeholder="Informações extras sobre o lote"
              valor={form.observacoes}
              aoAlterar={(valor) => atualizar('observacoes', valor)}
            />
          </section>
          <footer className="redes-drawer-rodape">
            <button type="button" className="btn-modal secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal primario">
              Registrar em lote
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}

// ---------- Mover pontos para outra sala ----------

export function LoteMoverDrawer({
  salas,
  pontoIds,
  onFechar,
  onConcluir,
}) {
  const drawerRef = usarDrawer(onFechar)
  const [salaDestinoId, setSalaDestinoId] = useState('')
  const [erro, setErro] = useState('')

  function aoSubmeter(evento) {
    evento.preventDefault()
    if (!salaDestinoId) {
      setErro('Escolha a sala de destino.')
      return
    }
    const movidos = moverPontosParaSala(pontoIds, salaDestinoId)
    onConcluir(
      movidos > 0
        ? `${movidos} ponto(s) movido(s) de sala`
        : 'Nenhum ponto precisou ser movido'
    )
  }

  return (
    <div
      className="redes-drawer-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar()
      }}
    >
      <aside
        ref={drawerRef}
        className="redes-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lote-mover-titulo"
        tabIndex={-1}
      >
        <header className="redes-drawer-cabecalho">
          <div>
            <h3 id="lote-mover-titulo">Mover pontos de sala</h3>
            <p>
              {pontoIds.length} ponto(s) selecionado(s). A cadeia física
              (patch panel e switch) é desvinculada na sala de origem —
              revincule as portas editando cada ponto na sala de destino.
            </p>
          </div>
          <button type="button" className="btn-fechar" onClick={onFechar} aria-label="Fechar">
            <XIcon size={20} />
          </button>
        </header>
        <form className="redes-drawer-corpo" onSubmit={aoSubmeter}>
          <section className="redes-drawer-secao">
            <h4>Sala de destino</h4>
            <CampoSelect
              chave="salaDestino"
              label="Mover para"
              obrigatorio
              valor={salaDestinoId}
              opcoes={[{ valor: '', label: '—' }].concat(
                salas.map((sala) => ({ valor: sala.id, label: sala.nome }))
              )}
              erro={erro}
              aoAlterar={(valor) => {
                setSalaDestinoId(valor)
                setErro('')
              }}
            />
            <p className="painel-nota">
              <AlertTriangleIcon size={13} /> Pontos que já estão na sala de
              destino continuam onde estão.
            </p>
          </section>
          <footer className="redes-drawer-rodape">
            <button type="button" className="btn-modal secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal primario">
              Mover {pontoIds.length} ponto(s)
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
