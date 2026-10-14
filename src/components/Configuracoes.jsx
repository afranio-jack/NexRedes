// Página "Configurações" (/configuracoes): por ora apenas a seção
// "Etiquetas" — edição dos modelos (nome e tamanhos em mm) e do prefixo
// padrão de nomenclatura dos pontos, usado como sugestão no cadastro e na
// numeração automática de etiquetas. O gerador e o formulário de teste NÃO
// vivem aqui (ficam na aba Redes).

import { useState } from 'react'
import { TagIcon, PlusIcon, TrashIcon } from './icons'
import { CampoInput } from './sala/Campo'
import ConfirmDialog from './sala/ConfirmDialog'
import './sala/SalaModal.css'
import './sala/SalaDetalhe.css'
import './Configuracoes.css'
import {
  listarModelos,
  salvarModelos,
  excluirModelo,
  restaurarModelosPadrao,
  obterConfig,
  salvarConfig,
} from '../utils/etiquetas'

function novoModelo() {
  return {
    id: `novo-${Date.now().toString(36)}`,
    nome: '',
    largura: '',
    altura: '',
    configuracao: {},
  }
}

export default function Configuracoes({ onMostrarToast }) {
  const [modelos, setModelos] = useState(() => listarModelos())
  const [prefixo, setPrefixo] = useState(() => obterConfig().prefixoPadrao)
  const [modeloParaExcluir, setModeloParaExcluir] = useState(null)
  const [confirmarPadrao, setConfirmarPadrao] = useState(false)

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
    salvarConfig({ prefixoPadrao: prefixo.trim() || 'CO-P' })
    setModelos(listarModelos())
    onMostrarToast?.('Configurações salvas com sucesso')
  }

  function restaurarPadrao() {
    restaurarModelosPadrao()
    setModelos(listarModelos())
    setConfirmarPadrao(false)
    onMostrarToast?.('Modelos padrão restaurados')
  }

  return (
    <main className="dash-main configuracoes">
      <div className="main-header">
        <div>
          <h1>Configurações</h1>
          <p>Ajustes gerais do NexRedes.</p>
        </div>
      </div>

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
    </main>
  )
}
