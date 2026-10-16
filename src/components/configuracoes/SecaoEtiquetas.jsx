// Configurações → Etiquetas: o cartão "Etiquetas" ORIGINAL (prefixo padrão
// de nomenclatura, lista de modelos, "Adicionar modelo", "Restaurar modelos
// padrão" e "Salvar alterações") — mantido como estava — mais as seções
// novas ao redor: Nomenclatura (formato de numeração e prefixos de patch
// panel, switch, rack e sala, com pré-visualização ao vivo) e
// Conteúdo/formatação da etiqueta (campos impressos, fonte, margens e modelo
// padrão).

import { useState } from 'react'
import { TagIcon, PlusIcon, TrashIcon, QrCodeIcon } from '../icons'
import { CampoInput, CampoSelect } from '../sala/Campo'
import ConfirmDialog from '../sala/ConfirmDialog'
import { CartaoSecao, RodapeSecao } from './UI'
import {
  listarModelos,
  salvarModelos,
  excluirModelo,
  restaurarModelosPadrao,
  obterConfig,
  salvarConfig,
} from '../../utils/etiquetas'

function novoModelo() {
  return {
    id: `novo-${Date.now().toString(36)}`,
    nome: '',
    largura: '',
    altura: '',
    configuracao: {},
  }
}

const TAMANHOS_FONTE = [7, 8, 9, 10, 11, 12, 14]

export default function SecaoEtiquetas({ config, onSalvar, onConfigAlterado, onMostrarToast }) {
  // ---------- Cartão original "Etiquetas" (mantido) ----------
  const [modelos, setModelos] = useState(() => listarModelos())
  const [prefixo, setPrefixo] = useState(() => obterConfig().prefixoPadrao)
  const [modeloParaExcluir, setModeloParaExcluir] = useState(null)
  const [confirmarPadrao, setConfirmarPadrao] = useState(false)

  // ---------- Seções novas ----------
  const [nomenclatura, setNomenclatura] = useState(() => ({
    ...config.nomenclatura,
  }))
  const [etiquetas, setEtiquetas] = useState(() => ({
    ...config.etiquetas,
    conteudo: { ...config.etiquetas.conteudo },
  }))
  const modelosDisponiveis = listarModelos()

  function atualizarModelo(id, campo, valor) {
    setModelos((atual) =>
      atual.map((modelo) =>
        modelo.id === id ? { ...modelo, [campo]: valor } : modelo
      )
    )
  }

  function adicionarModelo() {
    setModelos((atual) => [...atual, novoModelo()])
  }

  function removerModelo(id) {
    const restantes = modelos.filter((modelo) => modelo.id !== id)
    setModelos(restantes)
    // Se o modelo já estava salvo, remove também do armazenamento
    if (!id.startsWith('novo-')) excluirModelo(id)
    onMostrarToast?.('Modelo excluído')
  }

  function salvarTudo() {
    const validos = modelos.filter(
      (modelo) =>
        (modelo.nome || '').trim() !== '' &&
        Number(modelo.largura) > 0 &&
        Number(modelo.altura) > 0
    )
    if (validos.length !== modelos.length) {
      onMostrarToast?.('Preencha nome, largura e altura de todos os modelos')
      return
    }
    salvarModelos(
      validos.map((modelo) => ({
        ...modelo,
        nome: modelo.nome.trim(),
        largura: Number(modelo.largura),
        altura: Number(modelo.altura),
      }))
    )
    // Preserva as demais configurações (antes o config era só o prefixo)
    salvarConfig({
      ...obterConfig(),
      prefixoPadrao: prefixo.trim() || 'CO-P',
    })
    setModelos(listarModelos())
    onConfigAlterado?.()
    onMostrarToast?.('Configurações salvas com sucesso')
  }

  function restaurarPadrao() {
    restaurarModelosPadrao()
    setModelos(listarModelos())
    setConfirmarPadrao(false)
    onMostrarToast?.('Modelos padrão restaurados')
  }

  // Pré-visualização ao vivo dos nomes gerados (ex.: CO-P01)
  const exemploPonto = `${prefixo || 'CO-P'}${String(1).padStart(
    Number(nomenclatura.digitos) || 2,
    '0'
  )}`

  return (
    <>
      {/* ---------- Cartão "Etiquetas" original ---------- */}
      <section className="detalhe-bloco configuracoes-bloco">
        <h2>
          <TagIcon size={18} />
          Etiquetas
        </h2>
        <p className="configuracoes-descricao">
          Modelos usados pelo gerador de etiquetas (aba Redes) e o prefixo
          padrão de nomenclatura dos pontos de rede.
        </p>

        <div className="configuracoes-prefixo">
          <CampoInput
            chave="prefixoPadrao"
            label="Prefixo padrão de nomenclatura"
            placeholder="ex.: CO-P"
            valor={prefixo}
            aoAlterar={setPrefixo}
          />
          <p className="etiquetas-nota">
            Usado como sugestão ao criar pontos (ex.: {prefixo}01) e na
            numeração automática das etiquetas.
          </p>
        </div>

        <div className="configuracoes-modelos">
          <div className="configuracoes-modelos-topo">
            <h3>Modelos de etiqueta</h3>
            <button
              type="button"
              className="redes-filtro-btn"
              onClick={adicionarModelo}
            >
              <PlusIcon size={14} />
              Adicionar modelo
            </button>
          </div>
          <div className="configuracoes-modelos-grade configuracoes-modelos-cabecalho">
            <span>Nome</span>
            <span>Largura (mm)</span>
            <span>Altura (mm)</span>
            <span className="configuracoes-coluna-acoes"></span>
          </div>
          {modelos.map((modelo) => (
            <div
              className="configuracoes-modelos-grade"
              key={modelo.id}
            >
              <input
                type="text"
                className="campo-input"
                value={modelo.nome}
                aria-label="Nome do modelo"
                placeholder="ex.: 25 × 50 mm"
                onChange={(evento) =>
                  atualizarModelo(modelo.id, 'nome', evento.target.value)
                }
              />
              <input
                type="number"
                min="1"
                step="0.1"
                className="campo-input"
                value={modelo.largura}
                aria-label="Largura do modelo em milímetros"
                onChange={(evento) =>
                  atualizarModelo(modelo.id, 'largura', evento.target.value)
                }
              />
              <input
                type="number"
                min="1"
                step="0.1"
                className="campo-input"
                value={modelo.altura}
                aria-label="Altura do modelo em milímetros"
                onChange={(evento) =>
                  atualizarModelo(modelo.id, 'altura', evento.target.value)
                }
              />
              <button
                type="button"
                className="redes-btn-acao perigo configuracoes-btn-excluir"
                aria-label={`Excluir modelo ${modelo.nome || 'sem nome'}`}
                title="Excluir modelo"
                onClick={() => setModeloParaExcluir(modelo)}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ))}
          <div className="configuracoes-modelos-acoes">
            <button
              type="button"
              className="redes-filtro-btn"
              onClick={() => setConfirmarPadrao(true)}
            >
              Restaurar modelos padrão
            </button>
            <button
              type="button"
              className="btn-new"
              onClick={salvarTudo}
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Nomenclatura ---------- */}
      <CartaoSecao
        icone={QrCodeIcon}
        titulo="Nomenclatura"
        descricao="Formato de numeração e prefixos usados nas sugestões de nome (pontos, patch panels, switches, racks e salas)."
      >
        <div className="secao-grade">
          <CampoSelect
            chave="formatoNumeracao"
            label="Formato de numeração dos pontos"
            valor={String(nomenclatura.digitos || 2)}
            opcoes={[
              { valor: '2', label: 'P01, P02, P03...' },
              { valor: '3', label: 'P001, P002, P003...' },
            ]}
            aoAlterar={(valor) =>
              setNomenclatura((atual) => ({ ...atual, digitos: Number(valor) }))
            }
          />
          <CampoInput
            chave="prefixoPatchPanel"
            label="Prefixo de patch panel"
            placeholder="ex.: PP"
            valor={nomenclatura.prefixoPatchPanel}
            aoAlterar={(valor) =>
              setNomenclatura((atual) => ({ ...atual, prefixoPatchPanel: valor }))
            }
          />
          <CampoInput
            chave="prefixoSwitch"
            label="Prefixo de switch"
            placeholder="ex.: SW"
            valor={nomenclatura.prefixoSwitch}
            aoAlterar={(valor) =>
              setNomenclatura((atual) => ({ ...atual, prefixoSwitch: valor }))
            }
          />
          <CampoInput
            chave="prefixoRack"
            label="Prefixo de rack"
            placeholder="ex.: RACK"
            valor={nomenclatura.prefixoRack}
            aoAlterar={(valor) =>
              setNomenclatura((atual) => ({ ...atual, prefixoRack: valor }))
            }
          />
          <CampoInput
            chave="prefixoSala"
            label="Prefixo de sala"
            placeholder="ex.: SALA"
            valor={nomenclatura.prefixoSala}
            aoAlterar={(valor) =>
              setNomenclatura((atual) => ({ ...atual, prefixoSala: valor }))
            }
          />
        </div>
        <p className="configuracoes-previa" aria-live="polite">
          Pré-visualização:{' '}
          <strong>{exemploPonto}</strong>
          {nomenclatura.prefixoPatchPanel ? (
            <>
              {' · '}
              <strong>{nomenclatura.prefixoPatchPanel}01</strong>
            </>
          ) : null}
          {nomenclatura.prefixoSwitch ? (
            <>
              {' · '}
              <strong>{nomenclatura.prefixoSwitch}01</strong>
            </>
          ) : null}
        </p>
        <RodapeSecao onSalvar={() => onSalvar({ nomenclatura })} />
      </CartaoSecao>

      {/* ---------- Conteúdo e formatação ---------- */}
      <CartaoSecao
        icone={TagIcon}
        titulo="Conteúdo e formatação da etiqueta"
        descricao="Padrões aplicados ao abrir o gerador de etiquetas (aba Redes)."
      >
        <div className="configuracoes-checks">
          <label className="redes-check">
            <input
              type="checkbox"
              checked={etiquetas.conteudo.nomePonto}
              onChange={(evento) =>
                setEtiquetas((atual) => ({
                  ...atual,
                  conteudo: { ...atual.conteudo, nomePonto: evento.target.checked },
                }))
              }
            />
            Nome do ponto
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={etiquetas.conteudo.patchPanel}
              onChange={(evento) =>
                setEtiquetas((atual) => ({
                  ...atual,
                  conteudo: { ...atual.conteudo, patchPanel: evento.target.checked },
                }))
              }
            />
            Patch panel / porta
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={etiquetas.conteudo.switchPorta}
              onChange={(evento) =>
                setEtiquetas((atual) => ({
                  ...atual,
                  conteudo: { ...atual.conteudo, switchPorta: evento.target.checked },
                }))
              }
            />
            Switch / porta
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={etiquetas.conteudo.qr}
              onChange={(evento) =>
                setEtiquetas((atual) => ({
                  ...atual,
                  conteudo: { ...atual.conteudo, qr: evento.target.checked },
                }))
              }
            />
            QR code <span className="etiquetas-em-breve">(em breve)</span>
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={etiquetas.conteudo.logo}
              onChange={(evento) =>
                setEtiquetas((atual) => ({
                  ...atual,
                  conteudo: { ...atual.conteudo, logo: evento.target.checked },
                }))
              }
            />
            Logo da instituição
          </label>
        </div>

        <div className="secao-grade">
          <CampoSelect
            chave="tamanhoTextoEtiqueta"
            label="Tamanho do texto (px)"
            valor={String(etiquetas.tamanhoFonte)}
            opcoes={TAMANHOS_FONTE.map((tamanho) => ({
              valor: String(tamanho),
              label: `${tamanho} px`,
            }))}
            aoAlterar={(valor) =>
              setEtiquetas((atual) => ({
                ...atual,
                tamanhoFonte: Number(valor),
              }))
            }
          />
          <CampoInput
            chave="margensEtiqueta"
            label="Margens (mm)"
            tipo="number"
            min="0"
            step="0.5"
            valor={String(etiquetas.margens)}
            aoAlterar={(valor) =>
              setEtiquetas((atual) => ({ ...atual, margens: Number(valor) || 0 }))
            }
          />
          <CampoSelect
            chave="modeloPadraoEtiqueta"
            label="Modelo padrão"
            valor={etiquetas.modeloPadraoId}
            opcoes={[{ valor: '', label: 'Primeiro da lista' }].concat(
              modelosDisponiveis.map((modelo) => ({
                valor: modelo.id,
                label: modelo.nome,
              }))
            )}
            aoAlterar={(valor) =>
              setEtiquetas((atual) => ({ ...atual, modeloPadraoId: valor }))
            }
          />
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ etiquetas })} />
      </CartaoSecao>

      {modeloParaExcluir && (
        <ConfirmDialog
          titulo="Excluir modelo"
          texto={`Tem certeza que deseja excluir o modelo “${
            modeloParaExcluir.nome || 'sem nome'
          }”?`}
          confirmarLabel="Excluir"
          perigo
          onConfirmar={() => {
            removerModelo(modeloParaExcluir.id)
            setModeloParaExcluir(null)
          }}
          onCancelar={() => setModeloParaExcluir(null)}
        />
      )}

      {confirmarPadrao && (
        <ConfirmDialog
          titulo="Restaurar modelos padrão"
          texto="Os modelos personalizados serão substituídos pelos quatro modelos pré-definidos (9 × 25, 12 × 50, 25 × 50 e Folha A4 com 30 etiquetas)."
          confirmarLabel="Restaurar"
          onConfirmar={restaurarPadrao}
          onCancelar={() => setConfirmarPadrao(false)}
        />
      )}
    </>
  )
}
