// Roteamento mínimo do app (sem biblioteca externa):
// - "/"                 → Salas (grade de salas)
// - "/redes/pontos"     → aba Redes, sub-aba Pontos (padrão)
// - "/redes/pontos/:id" → página do ponto de rede
// - "/redes/testes"     → aba Redes, sub-aba Testes
// - "/redes/etiquetas"  → aba Redes, sub-aba Etiquetas
// - "/equipamentos"     → aba Equipamentos
// - "/relatorios"       → aba Relatórios
// - "/configuracoes"    → Configurações
// A navegação usa history.pushState + um evento popstate próprio, então o
// botão voltar/avançar do navegador e o refresh funcionam nas sub-abas.
// Rotas desconhecidas continuam caindo na tela "não encontrada".

export function analisarRota(caminho = window.location.pathname) {
  const limpo = caminho.replace(/\/+$/, '') || '/'
  if (limpo === '/') return { vista: 'projetos' }
  if (limpo === '/configuracoes') return { vista: 'configuracoes' }
  if (limpo === '/equipamentos') return { vista: 'equipamentos' }
  if (limpo === '/relatorios') return { vista: 'relatorios' }
  if (limpo === '/redes' || limpo === '/redes/pontos') {
    return { vista: 'redes', subaba: 'pontos', pontoId: null }
  }
  if (limpo === '/redes/testes') {
    return { vista: 'redes', subaba: 'testes', pontoId: null }
  }
  if (limpo === '/redes/etiquetas') {
    return { vista: 'redes', subaba: 'etiquetas', pontoId: null }
  }
  const achado = /^\/redes\/pontos\/([^/]+)$/.exec(limpo)
  if (achado) {
    return {
      vista: 'redes',
      subaba: 'pontos',
      pontoId: decodeURIComponent(achado[1]),
    }
  }
  return null
}

export function rotaConhecida(caminho) {
  return analisarRota(caminho) !== null
}

// Troca a URL e avisa os ouvintes (mesma fila de eventos do popstate)
export function navegar(caminho) {
  if (window.location.pathname !== caminho) {
    window.history.pushState(null, '', caminho)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}
