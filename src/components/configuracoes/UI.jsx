// Utilitários visuais das seções de Configurações: o cartão de seção (ícone
// azul + título + descrição curta em cinza, padrão do cartão "Etiquetas") e
// as listas editáveis (de objetos com cor e de strings simples).

import { PlusIcon, TrashIcon } from '../icons'
import '../Configuracoes.css'

// Cartão de seção: mesmo padrão do cartão "Etiquetas" existente
export function CartaoSecao({ icone: Icone, titulo, descricao, children, className }) {
  return (
    <section className={`detalhe-bloco configuracoes-bloco ${className || ''}`}>
      <h2>
        <Icone size={18} />
        {titulo}
      </h2>
      <p className="configuracoes-descricao">{descricao}</p>
      {children}
    </section>
  )
}

// Rodapé com o botão "Salvar alterações" da seção
export function RodapeSecao({ onSalvar, desabilitado }) {
  return (
    <div className="configuracoes-rodape-secao">
      <button
        type="button"
        className="btn-new"
        onClick={onSalvar}
        disabled={desabilitado}
      >
        Salvar alterações
      </button>
    </div>
  )
}

// Lista editável de objetos com colunas configuráveis
// colunas: [{ chave, label, tipo: 'text'|'color'|'number'|'select', opcoes, placeholder }]
export function ListaEditavel({
  colunas,
  itens,
  onChange,
  rotuloAdicionar = 'Adicionar',
  vazio = 'Nenhum item cadastrado.',
}) {
  const novoItem = () => {
    const item = {}
    for (const coluna of colunas) {
      if (coluna.tipo === 'color') item[coluna.chave] = '#2563eb'
      else if (coluna.tipo === 'select') item[coluna.chave] = coluna.opcoes?.[0]?.valor || ''
      else item[coluna.chave] = ''
    }
    return item
  }

  function atualizar(indice, chave, valor) {
    onChange(
      itens.map((item, i) => (i === indice ? { ...item, [chave]: valor } : item))
    )
  }

  return (
    <div className="configuracoes-lista">
      <div
        className="configuracoes-lista-grade configuracoes-lista-cabecalho"
        style={{
          gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr)) 44px`,
        }}
      >
        {colunas.map((coluna) => (
          <span key={coluna.chave}>{coluna.label}</span>
        ))}
        <span></span>
      </div>
      {itens.length === 0 && <p className="configuracoes-lista-vazio">{vazio}</p>}
      {itens.map((item, indice) => (
        <div
          key={indice}
          className="configuracoes-lista-grade"
          style={{
            gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr)) 44px`,
          }}
        >
          {colunas.map((coluna) =>
            coluna.tipo === 'select' ? (
              <select
                key={coluna.chave}
                className="campo-input"
                value={item[coluna.chave] ?? ''}
                aria-label={coluna.label}
                onChange={(evento) =>
                  atualizar(indice, coluna.chave, evento.target.value)
                }
              >
                {(coluna.opcoes || []).map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                key={coluna.chave}
                type={coluna.tipo || 'text'}
                className={`campo-input${
                  coluna.tipo === 'color' ? ' campo-cor' : ''
                }`}
                value={item[coluna.chave] ?? ''}
                placeholder={coluna.placeholder}
                aria-label={coluna.label}
                onChange={(evento) =>
                  atualizar(indice, coluna.chave, evento.target.value)
                }
              />
            )
          )}
          <button
            type="button"
            className="redes-btn-acao perigo configuracoes-btn-excluir"
            aria-label="Remover item"
            title="Remover"
            onClick={() =>
              onChange(itens.filter((_, i) => i !== indice))
            }
          >
            <TrashIcon size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="redes-filtro-btn"
        onClick={() => onChange([...itens, novoItem()])}
      >
        <PlusIcon size={14} />
        {rotuloAdicionar}
      </button>
    </div>
  )
}

// Lista editável de strings simples (nomes)
export function ListaSimples({ itens, onChange, rotuloAdicionar = 'Adicionar', placeholder }) {
  return (
    <div className="configuracoes-lista">
      {itens.length === 0 && (
        <p className="configuracoes-lista-vazio">Nenhum item cadastrado.</p>
      )}
      {itens.map((item, indice) => (
        <div
          key={indice}
          className="configuracoes-lista-grade"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) 44px' }}
        >
          <input
            type="text"
            className="campo-input"
            value={item}
            placeholder={placeholder}
            aria-label="Item"
            onChange={(evento) =>
              onChange(
                itens.map((atual, i) =>
                  i === indice ? evento.target.value : atual
                )
              )
            }
          />
          <button
            type="button"
            className="redes-btn-acao perigo configuracoes-btn-excluir"
            aria-label="Remover item"
            title="Remover"
            onClick={() => onChange(itens.filter((_, i) => i !== indice))}
          >
            <TrashIcon size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="redes-filtro-btn"
        onClick={() => onChange([...itens, ''])}
      >
        <PlusIcon size={14} />
        {rotuloAdicionar}
      </button>
    </div>
  )
}
