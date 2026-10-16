// Gráficos leves em SVG/CSS puro (sem bibliotecas): rosca, barras verticais,
// linha e barras empilhadas horizontais. Todos aceitam estado vazio.

export function GraficoVazio({ texto = 'Sem dados para exibir.' }) {
  return (
    <div className="grafico-vazio">
      <p>{texto}</p>
    </div>
  )
}

// Rosca (donut) com legenda e total no centro
export function GraficoRosca({
  dados, // [{ label, valor, cor }]
  tamanho = 168,
  espessura = 26,
  textoCentral,
  subTexto,
}) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0)
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  let deslocamento = 0
  const segmentos = dados.map((item) => {
    const fracao = total > 0 ? item.valor / total : 0
    const comprimento = fracao * circunferencia
    const segmento = { ...item, comprimento, deslocamento }
    deslocamento += comprimento
    return segmento
  })
  return (
    <div className="grafico-rosca">
      <svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        role="img"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={espessura}
        />
        {segmentos.map((segmento) => (
          <circle
            key={segmento.label}
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            stroke={segmento.cor}
            strokeWidth={espessura}
            strokeDasharray={`${segmento.comprimento} ${
              circunferencia - segmento.comprimento
            }`}
            strokeDashoffset={-segmento.deslocamento}
            transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
          />
        ))}
        <text
          x="50%"
          y={subTexto ? '46%' : '52%'}
          textAnchor="middle"
          className="grafico-rosca-valor"
        >
          {textoCentral !== undefined ? textoCentral : total}
        </text>
        {subTexto && (
          <text x="50%" y="60%" textAnchor="middle" className="grafico-rosca-sub">
            {subTexto}
          </text>
        )}
      </svg>
      <ul className="grafico-legenda">
        {dados.map((item) => (
          <li key={item.label}>
            <span
              className="grafico-legenda-dot"
              style={{ background: item.cor }}
              aria-hidden="true"
            ></span>
            <span className="grafico-legenda-rotulo">{item.label}</span>
            <strong>{item.valor}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Barras verticais (CSS), com valor no topo e rótulo embaixo
export function GraficoBarras({ dados, altura = 200 }) {
  if (!dados || dados.length === 0) return <GraficoVazio />
  const maximo = Math.max(1, ...dados.map((item) => item.valor))
  return (
    <div className="grafico-barras" style={{ '--grafico-altura': `${altura}px` }}>
      {dados.map((item) => (
        <div
          key={item.label}
          className="grafico-barra-coluna"
          title={`${item.label}: ${item.valor}`}
        >
          <span className="grafico-barra-valor">{item.valor}</span>
          <div className="grafico-barra-area">
            <div
              className="grafico-barra"
              style={{
                height: `${(item.valor / maximo) * 100}%`,
                background: item.cor || '#2563eb',
              }}
            ></div>
          </div>
          <span className="grafico-barra-rotulo">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Linha (SVG) com pontos, valores e rótulos de mês
export function GraficoLinha({ pontos, altura = 210, cor = '#2563eb' }) {
  if (!pontos || pontos.length === 0) return <GraficoVazio />
  const largura = Math.max(320, pontos.length * 62)
  const maximo = Math.max(1, ...pontos.map((ponto) => ponto.valor))
  const padTopo = 26
  const padBaixo = 30
  const padEsq = 10
  const padDir = 10
  const alturaUtil = altura - padTopo - padBaixo
  const passoX =
    pontos.length > 1 ? (largura - padEsq - padDir) / (pontos.length - 1) : 0
  const coords = pontos.map((ponto, indice) => ({
    x: padEsq + passoX * indice,
    y: padTopo + alturaUtil - (ponto.valor / maximo) * alturaUtil,
    ...ponto,
  }))
  const linha = coords.map((c) => `${c.x},${c.y}`).join(' ')
  return (
    <div className="grafico-linha-scroll">
      <svg
        width={largura}
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
      >
        <polyline
          points={linha}
          fill="none"
          stroke={cor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r="4" fill="#fff" stroke={cor} strokeWidth="2" />
            <text x={c.x} y={c.y - 9} textAnchor="middle" className="grafico-linha-valor">
              {c.valor}
            </text>
            <text x={c.x} y={altura - 9} textAnchor="middle" className="grafico-linha-rotulo">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Barras empilhadas horizontais (CSS): cada linha com label à esquerda e
// segmentos coloridos proporcionais ao maior total da lista
export function BarrasEmpilhadas({ chaves, itens }) {
  // chaves: [{ id, label, cor }] · itens: [{ label, valores: {id: número} }]
  const comDados = itens.filter((item) =>
    chaves.some((chave) => (item.valores[chave.id] || 0) > 0)
  )
  if (comDados.length === 0) return <GraficoVazio />
  const maximo = Math.max(
    1,
    ...comDados.map((item) =>
      chaves.reduce((soma, chave) => soma + (item.valores[chave.id] || 0), 0)
    )
  )
  return (
    <div className="grafico-empilhado">
      <ul className="grafico-legenda">
        {chaves.map((chave) => (
          <li key={chave.id}>
            <span
              className="grafico-legenda-dot"
              style={{ background: chave.cor }}
              aria-hidden="true"
            ></span>
            <span className="grafico-legenda-rotulo">{chave.label}</span>
          </li>
        ))}
      </ul>
      <div className="grafico-empilhado-linhas">
        {comDados.map((item) => {
          const total = chaves.reduce(
            (soma, chave) => soma + (item.valores[chave.id] || 0),
            0
          )
          return (
            <div
              key={item.label}
              className="grafico-empilhado-linha"
              title={`${item.label}: ${total}`}
            >
              <span className="grafico-empilhado-rotulo">{item.label}</span>
              <div className="grafico-empilhado-trilha">
                {chaves.map((chave) => {
                  const valor = item.valores[chave.id] || 0
                  if (valor === 0) return null
                  return (
                    <div
                      key={chave.id}
                      className="grafico-empilhado-segmento"
                      style={{
                        width: `${(valor / maximo) * 100}%`,
                        background: chave.cor,
                      }}
                      title={`${chave.label}: ${valor}`}
                    ></div>
                  )
                })}
              </div>
              <span className="grafico-empilhado-total">{total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
