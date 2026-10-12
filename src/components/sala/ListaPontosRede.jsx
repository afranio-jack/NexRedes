// Seção 4 — Pontos de rede (ponto → patch panel/porta → porta de switch → cabo)

import { PlusIcon, TrashIcon, NetworkIcon } from '../icons'
import { CampoInput, CampoSelect } from './Campo'
import { CATEGORIAS_CABO } from './opcoes'

export default function ListaPontosRede({
  itens,
  aoAlterar,
  aoLimparErro,
  erros,
  prefixo = 'pontosRede',
}) {
  function adicionar() {
    aoAlterar([
      ...itens,
      {
        id: null,
        identificacao: '',
        patchPanelPorta: '',
        portaSwitch: '',
        categoriaCabo: CATEGORIAS_CABO[0],
        observacao: '',
      },
    ])
  }

  function atualizarItem(index, campo, valor) {
    aoLimparErro?.(`${prefixo}.${index}.${campo}`)
    aoAlterar(
      itens.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    )
  }

  function removerItem(index) {
    aoAlterar(itens.filter((_, i) => i !== index))
  }

  return (
    <div className="lista-dinamica">
      <div className="lista-topo">
        <button type="button" className="btn-adicionar" onClick={adicionar}>
          <PlusIcon size={16} />
          Adicionar ponto de rede
        </button>
        <span className="lista-contador" aria-live="polite">
          {itens.length}{' '}
          {itens.length === 1 ? 'ponto de rede' : 'pontos de rede'}
        </span>
      </div>

      {itens.length === 0 && (
        <p className="lista-vazia">Nenhum ponto de rede adicionado.</p>
      )}

      {itens.map((item, index) => (
        <div className="lista-item" key={index}>
          <div className="lista-item-topo">
            <span className="lista-item-titulo">
              <NetworkIcon size={16} />
              Ponto {index + 1}
            </span>
            <button
              type="button"
              className="btn-remover"
              onClick={() => removerItem(index)}
              aria-label={`Remover ponto ${index + 1}`}
            >
              <TrashIcon size={16} />
            </button>
          </div>
          <div className="lista-item-grade">
            <CampoInput
              chave={`${prefixo}.${index}.identificacao`}
              label="Identificação do ponto"
              obrigatorio
              placeholder="ex.: PR-01-03"
              erro={erros[`${prefixo}.${index}.identificacao`]}
              valor={item.identificacao}
              aoAlterar={(valor) =>
                atualizarItem(index, 'identificacao', valor)
              }
            />
            <CampoInput
              chave={`${prefixo}.${index}.patchPanelPorta`}
              label="Patch panel e porta"
              placeholder="ex.: PP-A / porta 12"
              erro={erros[`${prefixo}.${index}.patchPanelPorta`]}
              valor={item.patchPanelPorta}
              aoAlterar={(valor) =>
                atualizarItem(index, 'patchPanelPorta', valor)
              }
            />
            <CampoInput
              chave={`${prefixo}.${index}.portaSwitch`}
              label="Porta do switch"
              placeholder="ex.: SW-01 / porta 24"
              erro={erros[`${prefixo}.${index}.portaSwitch`]}
              valor={item.portaSwitch}
              aoAlterar={(valor) => atualizarItem(index, 'portaSwitch', valor)}
            />
            <CampoSelect
              chave={`${prefixo}.${index}.categoriaCabo`}
              label="Categoria do cabo"
              valor={item.categoriaCabo}
              opcoes={CATEGORIAS_CABO}
              aoAlterar={(valor) =>
                atualizarItem(index, 'categoriaCabo', valor)
              }
            />
            <CampoInput
              chave={`${prefixo}.${index}.observacao`}
              label="Observação"
              className="campo-linha-toda"
              valor={item.observacao}
              aoAlterar={(valor) => atualizarItem(index, 'observacao', valor)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
