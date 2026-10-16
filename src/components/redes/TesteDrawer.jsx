// Drawer lateral "Registrar teste" (sub-aba Testes e página do ponto):
// ponto (já vem preenchido quando aberto pela página do ponto), data e
// hora (padrão: agora), técnico, norma, resultado em botões grandes
// PASS/FAIL, medições opcionais e — quando FAIL — o motivo obrigatório e a
// opção de criar um registro de falha/manutenção na sala.

import { useEffect, useRef, useState } from 'react'
import {
  XIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import { GRAVIDADES } from '../sala/opcoes'
import {
  agoraLocalInput,
  inputParaISO,
  isoParaInputLocal,
} from '../../utils/datas'
import { NORMAS, MAPAS_FIOS } from '../../utils/testes'
import { obterConfig } from '../../utils/etiquetas'
import '../sala/SalaModal.css'

export default function TesteDrawer({
  salas,
  teste,
  pontoIdInicial,
  onFechar,
  onSalvar,
}) {
  const drawerRef = useRef(null)
  const editando = Boolean(teste)
  // Preferências de Configurações → Testes (responsáveis sugeridos, norma
  // padrão e campos obrigatórios no registro)
  const configTestes = obterConfig().testes
  const [form, setForm] = useState(() => ({
    pontoId: teste?.pontoId || pontoIdInicial || '',
    dataHora: teste ? isoParaInputLocal(teste.dataHora) : agoraLocalInput(),
    tecnico: teste?.tecnico || '',
    norma: teste?.norma || configTestes.normaPadrao || NORMAS[0],
    resultado: teste?.resultado || 'PASS',
    comprimentoM: teste?.medicoes?.comprimentoM || '',
    mapaFios: teste?.medicoes?.mapaFios || '',
    atenuacao: teste?.medicoes?.atenuacao || '',
    next: teste?.medicoes?.next || '',
    perdaRetorno: teste?.medicoes?.perdaRetorno || '',
    motivoFalha: teste?.motivoFalha || '',
    criarFalha: false,
    gravidade: 'baixa',
    observacoes: teste?.observacoes || '',
  }))
  const [erros, setErros] = useState({})

  const gruposPontos = salas
    .map((sala) => ({ sala, pontos: sala.pontos || [] }))
    .filter((grupo) => grupo.pontos.length > 0)

  // Foco no drawer; fundo não rola; Esc fecha
  useEffect(() => {
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.focus()
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

  function atualizar(chave, valor) {
    setForm((atual) => ({ ...atual, [chave]: valor }))
    setErros((atual) =>
      atual[chave] ? { ...atual, [chave]: undefined } : atual
    )
  }

  function aoSubmeter(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!form.pontoId) novosErros.pontoId = 'Escolha o ponto de rede.'
    if (!form.dataHora) novosErros.dataHora = 'Informe a data e a hora.'
    if (!form.tecnico.trim()) novosErros.tecnico = 'Informe o técnico responsável.'
    // Campos obrigatórios marcados em Configurações → Testes
    const obrigatorios = configTestes.camposObrigatorios || {}
    if (obrigatorios.comprimentoM && !form.comprimentoM.trim()) {
      novosErros.comprimentoM = 'Informe o comprimento (campo obrigatório).'
    }
    if (obrigatorios.mapaFios && !form.mapaFios) {
      novosErros.mapaFios = 'Informe o mapa de fios (campo obrigatório).'
    }
    if (obrigatorios.atenuacao && !form.atenuacao.trim()) {
      novosErros.atenuacao = 'Informe a atenuação (campo obrigatório).'
    }
    if (obrigatorios.next && !form.next.trim()) {
      novosErros.next = 'Informe o NEXT (campo obrigatório).'
    }
    if (obrigatorios.perdaRetorno && !form.perdaRetorno.trim()) {
      novosErros.perdaRetorno = 'Informe a perda de retorno (campo obrigatório).'
    }
    if (form.resultado === 'FAIL' && !form.motivoFalha.trim()) {
      novosErros.motivoFalha = 'Descreva o motivo da falha.'
    }
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) {
      document
        .querySelector('[data-erro-chave="' + Object.keys(novosErros)[0] + '"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onSalvar(
      {
        pontoId: form.pontoId,
        dataHora: inputParaISO(form.dataHora),
        tecnico: form.tecnico,
        norma: form.norma,
        resultado: form.resultado,
        medicoes: {
          comprimentoM: form.comprimentoM,
          mapaFios: form.mapaFios,
          atenuacao: form.atenuacao,
          next: form.next,
          perdaRetorno: form.perdaRetorno,
        },
        motivoFalha: form.motivoFalha,
        observacoes: form.observacoes,
      },
      {
        criarFalha: form.resultado === 'FAIL' && form.criarFalha,
        gravidade: form.gravidade,
      },
      teste?.id
    )
    onFechar()
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
        aria-labelledby="redes-drawer-titulo"
        tabIndex={-1}
      >
        <header className="redes-drawer-cabecalho">
          <div>
            <h3 id="redes-drawer-titulo">
              {editando ? 'Editar teste' : 'Registrar teste'}
            </h3>
            <p>
              {editando
                ? 'Altere os dados do registro — o histórico dos outros testes continua intacto.'
                : 'Um novo teste sempre cria um novo registro no histórico.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <XIcon size={20} />
          </button>
        </header>

        <form className="redes-drawer-corpo" onSubmit={aoSubmeter}>
          <section className="redes-drawer-secao">
            <h4>Ponto e data</h4>
            <div className="campo">
              <label htmlFor="campo-teste-ponto">Ponto de rede</label>
              <select
                id="campo-teste-ponto"
                className={`campo-input${erros.pontoId ? ' invalido' : ''}`}
                value={form.pontoId}
                onChange={(evento) => atualizar('pontoId', evento.target.value)}
              >
                <option value="">Escolha um ponto</option>
                {gruposPontos.map((grupo) => (
                  <optgroup key={grupo.sala.id} label={grupo.sala.nome}>
                    {grupo.pontos.map((ponto) => (
                      <option key={ponto.id} value={ponto.id}>
                        {ponto.identificacao}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {erros.pontoId && (
                <p className="campo-erro">{erros.pontoId}</p>
              )}
            </div>
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
              <CampoSelect
                chave="norma"
                label="Norma aplicada"
                valor={form.norma}
                opcoes={NORMAS.map((norma) => ({ valor: norma, label: norma }))}
                aoAlterar={(valor) => atualizar('norma', valor)}
              />
            </div>
          </section>

          <section className="redes-drawer-secao">
            <h4>Responsável</h4>
            <CampoInput
              chave="tecnico"
              label="Técnico responsável"
              obrigatorio
              placeholder="ex.: Ana Souza"
              erro={erros.tecnico}
              valor={form.tecnico}
              aoAlterar={(valor) => atualizar('tecnico', valor)}
              list="teste-responsaveis"
            />
            {(configTestes.responsaveis || []).length > 0 && (
              <datalist id="teste-responsaveis">
                {configTestes.responsaveis.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            )}
            {(configTestes.criterios?.comprimentoMax ||
              configTestes.criterios?.atenuacaoMax ||
              configTestes.criterios?.perdaRetornoMax ||
              configTestes.criterios?.nextMin) && (
              <p className="painel-nota">
                Critérios de referência (Configurações → Testes): comprimento
                até {configTestes.criterios.comprimentoMax || '—'} m ·
                atenuação até {configTestes.criterios.atenuacaoMax || '—'} dB ·
                perda de retorno até{' '}
                {configTestes.criterios.perdaRetornoMax || '—'} dB · NEXT
                mínimo {configTestes.criterios.nextMin || '—'} dB.
              </p>
            )}
          </section>

          <section className="redes-drawer-secao">
            <h4>Resultado</h4>
            <div
              className="teste-resultado-botoes"
              role="radiogroup"
              aria-label="Resultado do teste"
            >
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
            <h4>Medições (opcionais)</h4>
            <div className="redes-drawer-grade">
              <CampoInput
                chave="comprimentoM"
                label="Comprimento (m)"
                tipo="number"
                min="0"
                step="0.1"
                placeholder="ex.: 45"
                erro={erros.comprimentoM}
                valor={form.comprimentoM}
                aoAlterar={(valor) => atualizar('comprimentoM', valor)}
              />
              <CampoSelect
                chave="mapaFios"
                label="Mapa de fios"
                valor={form.mapaFios}
                erro={erros.mapaFios}
                opcoes={MAPAS_FIOS.map((item) => ({
                  valor: item.id,
                  label: item.label,
                }))}
                aoAlterar={(valor) => atualizar('mapaFios', valor)}
              />
              <CampoInput
                chave="atenuacao"
                label="Atenuação (dB)"
                tipo="number"
                min="0"
                step="0.1"
                placeholder="ex.: 3.2"
                erro={erros.atenuacao}
                valor={form.atenuacao}
                aoAlterar={(valor) => atualizar('atenuacao', valor)}
              />
              <CampoInput
                chave="next"
                label="NEXT (dB)"
                tipo="number"
                min="0"
                step="0.1"
                placeholder="ex.: 45"
                erro={erros.next}
                valor={form.next}
                aoAlterar={(valor) => atualizar('next', valor)}
              />
              <CampoInput
                chave="perdaRetorno"
                label="Perda de retorno (dB)"
                tipo="number"
                min="0"
                step="0.1"
                placeholder="ex.: 12"
                erro={erros.perdaRetorno}
                valor={form.perdaRetorno}
                aoAlterar={(valor) => atualizar('perdaRetorno', valor)}
              />
            </div>
          </section>

          {form.resultado === 'FAIL' && (
            <section className="redes-drawer-secao">
              <h4>Falha</h4>
              <CampoTextarea
                chave="motivoFalha"
                label="Motivo da falha"
                obrigatorio
                linhas={2}
                placeholder="ex.: Par aberto no condutor 3, conector mal crimpado..."
                erro={erros.motivoFalha}
                valor={form.motivoFalha}
                aoAlterar={(valor) => atualizar('motivoFalha', valor)}
              />
              <label className="redes-check">
                <input
                  type="checkbox"
                  checked={form.criarFalha}
                  onChange={(evento) =>
                    atualizar('criarFalha', evento.target.checked)
                  }
                />
                Criar registro de falha/manutenção na sala
              </label>
              {form.criarFalha && (
                <CampoSelect
                  chave="gravidade"
                  label="Gravidade da falha"
                  valor={form.gravidade}
                  opcoes={GRAVIDADES.map((item) => ({
                    valor: item.id,
                    label: item.label,
                  }))}
                  aoAlterar={(valor) => atualizar('gravidade', valor)}
                />
              )}
              <p className="painel-nota">
                <AlertTriangleIcon size={13} /> O registro aparece em
                “Falhas e manutenção” da sala e muda o status dela em Salas.
              </p>
            </section>
          )}

          <section className="redes-drawer-secao">
            <h4>Observações</h4>
            <CampoTextarea
              chave="observacoes"
              label="Observações"
              linhas={2}
              placeholder="Informações extras sobre o teste"
              valor={form.observacoes}
              aoAlterar={(valor) => atualizar('observacoes', valor)}
            />
          </section>

          <footer className="redes-drawer-rodape">
            <button
              type="button"
              className="btn-modal secundario"
              onClick={onFechar}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-modal primario">
              {editando ? 'Salvar alterações' : 'Registrar teste'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
