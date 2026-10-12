// Seção 6 — Falhas e manutenção

import { PlusIcon, TrashIcon, AlertTriangleIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from './Campo'
import { GRAVIDADES, STATUS_FALHA } from './opcoes'
import { hojeISO } from '../../utils/datas'

export default function ListaFalhas({
  itens,
  aoAlterar,
  aoLimparErro,
  erros,
  alvos,
  prefixo = 'falhas',
}) {
  function adicionar() {
    aoAlterar([
      ...itens,
      {
        id: null,
        alvo: 'Outro',
        descricao: '',
        dataIdentificacao: hojeISO(),
        gravidade: 'baixa',
        status: 'aberta',
        historicoManutencao: [],
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

  function adicionarRegistro(index) {
    atualizarItem(index, 'historicoManutencao', [
      ...(itens[index].historicoManutencao || []),
      { data: hojeISO(), texto: '' },
    ])
  }

  function atualizarRegistro(indexFalha, indexRegistro, campo, valor) {
    const historico = itens[indexFalha].historicoManutencao.map((registro, i) =>
      i === indexRegistro ? { ...registro, [campo]: valor } : registro
    )
    atualizarItem(indexFalha, 'historicoManutencao', historico)
  }

  function removerRegistro(indexFalha, indexRegistro) {
    const historico = itens[indexFalha].historicoManutencao.filter(
      (_, i) => i !== indexRegistro
    )
    atualizarItem(indexFalha, 'historicoManutencao', historico)
  }

  return (
    <div className="lista-dinamica">
      <div className="lista-topo">
        <button type="button" className="btn-adicionar" onClick={adicionar}>
          <PlusIcon size={16} />
          Registrar falha
        </button>
        <span className="lista-contador" aria-live="polite">
          {itens.length} {itens.length === 1 ? 'falha' : 'falhas'}
        </span>
      </div>

      {itens.length === 0 && (
        <p className="lista-vazia">Nenhuma falha registrada.</p>
      )}

      {itens.map((item, index) => (
        <div className="lista-item" key={index}>
          <div className="lista-item-topo">
            <span className="lista-item-titulo">
              <AlertTriangleIcon size={16} />
              Falha {index + 1}
            </span>
            <button
              type="button"
              className="btn-remover"
              onClick={() => removerItem(index)}
              aria-label={`Remover falha ${index + 1}`}
            >
              <TrashIcon size={16} />
            </button>
          </div>
          <div className="lista-item-grade">
            <CampoSelect
              chave={`${prefixo}.${index}.alvo`}
              label="Equipamento ou ponto afetado"
              valor={item.alvo}
              opcoes={alvos}
              aoAlterar={(valor) => atualizarItem(index, 'alvo', valor)}
            />
            <CampoInput
              chave={`${prefixo}.${index}.dataIdentificacao`}
              label="Data em que foi identificada"
              obrigatorio
              tipo="date"
              max={hojeISO()}
              erro={erros[`${prefixo}.${index}.dataIdentificacao`]}
              valor={item.dataIdentificacao}
              aoAlterar={(valor) =>
                atualizarItem(index, 'dataIdentificacao', valor)
              }
            />
            <CampoSelect
              chave={`${prefixo}.${index}.gravidade`}
              label="Gravidade"
              valor={item.gravidade}
              opcoes={GRAVIDADES.map((opcao) => ({
                valor: opcao.id,
                label: opcao.label,
              }))}
              aoAlterar={(valor) => atualizarItem(index, 'gravidade', valor)}
            />
            <CampoSelect
              chave={`${prefixo}.${index}.status`}
              label="Status"
              valor={item.status}
              opcoes={STATUS_FALHA.map((opcao) => ({
                valor: opcao.id,
                label: opcao.label,
              }))}
              aoAlterar={(valor) => atualizarItem(index, 'status', valor)}
            />
            <CampoTextarea
              chave={`${prefixo}.${index}.descricao`}
              label="Descrição da falha"
              obrigatorio
              linhas={2}
              placeholder="ex.: Porta 12 do switch sem link"
              erro={erros[`${prefixo}.${index}.descricao`]}
              valor={item.descricao}
              aoAlterar={(valor) => atualizarItem(index, 'descricao', valor)}
              className="campo-linha-toda"
            />

            <div className="historico-bloco campo-linha-toda">
              <div className="historico-topo">
                <span className="historico-titulo">
                  Histórico de manutenção
                </span>
                <button
                  type="button"
                  className="btn-adicionar btn-adicionar-mini"
                  onClick={() => adicionarRegistro(index)}
                >
                  <PlusIcon size={14} />
                  Adicionar registro
                </button>
              </div>
              {(item.historicoManutencao || []).length === 0 && (
                <p className="historico-vazio">
                  Nenhum registro de manutenção.
                </p>
              )}
              {(item.historicoManutencao || []).map((registro, indexRegistro) => (
                <div className="historico-linha" key={indexRegistro}>
                  <input
                    type="date"
                    className="campo-input historico-data"
                    aria-label={`Data do registro ${indexRegistro + 1} da falha ${index + 1}`}
                    value={registro.data}
                    onChange={(event) =>
                      atualizarRegistro(
                        index,
                        indexRegistro,
                        'data',
                        event.target.value
                      )
                    }
                  />
                  <input
                    type="text"
                    className="campo-input historico-texto"
                    aria-label={`Texto do registro ${indexRegistro + 1} da falha ${index + 1}`}
                    placeholder="ex.: Trocado cabo do ponto"
                    value={registro.texto}
                    onChange={(event) =>
                      atualizarRegistro(
                        index,
                        indexRegistro,
                        'texto',
                        event.target.value
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn-remover"
                    aria-label={`Remover registro ${indexRegistro + 1} da falha ${index + 1}`}
                    onClick={() => removerRegistro(index, indexRegistro)}
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
