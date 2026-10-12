// Campos de formulário compartilhados: rótulo + asterisco + erro + data-erro-chave

import './SalaModal.css'

function baseProps({ chave, obrigatorio, erro }) {
  const id = `campo-${chave}`
  return {
    id,
    'aria-invalid': erro ? 'true' : undefined,
    'aria-required': obrigatorio ? 'true' : undefined,
    'aria-describedby': erro ? `${id}-erro` : undefined,
  }
}

function Envoltorio({ chave, label, obrigatorio, erro, className, children }) {
  return (
    <div
      className={`campo ${className || ''}`}
      data-erro-chave={chave}
    >
      <label htmlFor={`campo-${chave}`}>
        {label}
        {obrigatorio && (
          <span className="campo-obrigatorio" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {erro && (
        <p className="campo-erro" id={`campo-${chave}-erro`}>
          {erro}
        </p>
      )}
    </div>
  )
}

export function CampoInput({
  chave,
  label,
  obrigatorio,
  erro,
  valor,
  aoAlterar,
  tipo = 'text',
  placeholder,
  className,
  ...outros
}) {
  const props = baseProps({ chave, obrigatorio, erro })
  return (
    <Envoltorio
      chave={chave}
      label={label}
      obrigatorio={obrigatorio}
      erro={erro}
      className={className}
    >
      <input
        {...props}
        {...outros}
        type={tipo}
        className={`campo-input${erro ? ' invalido' : ''}`}
        value={valor}
        placeholder={placeholder}
        onChange={(event) => aoAlterar(event.target.value)}
      />
    </Envoltorio>
  )
}

// opcoes: lista de strings ou de objetos { valor, label }
export function CampoSelect({
  chave,
  label,
  obrigatorio,
  erro,
  valor,
  aoAlterar,
  opcoes,
  className,
}) {
  const props = baseProps({ chave, obrigatorio, erro })
  return (
    <Envoltorio
      chave={chave}
      label={label}
      obrigatorio={obrigatorio}
      erro={erro}
      className={className}
    >
      <select
        {...props}
        className={`campo-input${erro ? ' invalido' : ''}`}
        value={valor}
        onChange={(event) => aoAlterar(event.target.value)}
      >
        {opcoes.map((opcao) => {
          const valorOpcao = typeof opcao === 'string' ? opcao : opcao.valor
          const labelOpcao = typeof opcao === 'string' ? opcao : opcao.label
          return (
            <option key={valorOpcao} value={valorOpcao}>
              {labelOpcao}
            </option>
          )
        })}
      </select>
    </Envoltorio>
  )
}

export function CampoTextarea({
  chave,
  label,
  obrigatorio,
  erro,
  valor,
  aoAlterar,
  placeholder,
  linhas = 3,
  className,
}) {
  const props = baseProps({ chave, obrigatorio, erro })
  return (
    <Envoltorio
      chave={chave}
      label={label}
      obrigatorio={obrigatorio}
      erro={erro}
      className={className}
    >
      <textarea
        {...props}
        rows={linhas}
        className={`campo-input campo-textarea${erro ? ' invalido' : ''}`}
        value={valor}
        placeholder={placeholder}
        onChange={(event) => aoAlterar(event.target.value)}
      />
    </Envoltorio>
  )
}
