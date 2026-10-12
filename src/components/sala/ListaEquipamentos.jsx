// Seção 5 — Equipamentos associados à sala

import { PlusIcon, TrashIcon, ServerIcon } from '../icons'
import { CampoInput, CampoSelect } from './Campo'
import { TIPOS_EQUIPAMENTO } from './opcoes'

export default function ListaEquipamentos({
  itens,
  aoAlterar,
  aoLimparErro,
  erros,
  prefixo = 'equipamentos',
}) {
  function adicionar() {
    aoAlterar([
      ...itens,
      {
        id: null,
        tipo: TIPOS_EQUIPAMENTO[0],
        nome: '',
        modelo: '',
        ip: '',
        vlan: '',
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
          Adicionar equipamento
        </button>
        <span className="lista-contador" aria-live="polite">
          {itens.length} {itens.length === 1 ? 'equipamento' : 'equipamentos'}
        </span>
      </div>

      {itens.length === 0 && (
        <p className="lista-vazia">Nenhum equipamento associado.</p>
      )}

      {itens.map((item, index) => (
        <div className="lista-item" key={index}>
          <div className="lista-item-topo">
            <span className="lista-item-titulo">
              <ServerIcon size={16} />
              Equipamento {index + 1}
            </span>
            <button
              type="button"
              className="btn-remover"
              onClick={() => removerItem(index)}
              aria-label={`Remover equipamento ${index + 1}`}
            >
              <TrashIcon size={16} />
            </button>
          </div>
          <div className="lista-item-grade">
            <CampoSelect
              chave={`${prefixo}.${index}.tipo`}
              label="Tipo"
              valor={item.tipo}
              opcoes={TIPOS_EQUIPAMENTO}
              aoAlterar={(valor) => atualizarItem(index, 'tipo', valor)}
            />
            <CampoInput
              chave={`${prefixo}.${index}.nome`}
              label="Nome / identificação"
              obrigatorio
              placeholder="ex.: Switch central"
              erro={erros[`${prefixo}.${index}.nome`]}
              valor={item.nome}
              aoAlterar={(valor) => atualizarItem(index, 'nome', valor)}
            />
            <CampoInput
              chave={`${prefixo}.${index}.modelo`}
              label="Modelo"
              placeholder="ex.: Cisco 2960-X"
              valor={item.modelo}
              aoAlterar={(valor) => atualizarItem(index, 'modelo', valor)}
            />
            <CampoInput
              chave={`${prefixo}.${index}.ip`}
              label="Endereço IP"
              placeholder="ex.: 192.168.10.24"
              erro={erros[`${prefixo}.${index}.ip`]}
              valor={item.ip}
              aoAlterar={(valor) => atualizarItem(index, 'ip', valor)}
            />
            <CampoInput
              chave={`${prefixo}.${index}.vlan`}
              label="VLAN"
              placeholder="ex.: 10"
              valor={item.vlan}
              aoAlterar={(valor) => atualizarItem(index, 'vlan', valor)}
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
