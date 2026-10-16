// Configurações → Sobre: versão do sistema, atalhos de teclado e ajuda.

import { HelpCircleIcon, KeyboardIcon } from '../icons'
import { CartaoSecao } from './UI'

const ATALHOS = [
  { teclas: 'Enter', acao: 'Abrir o painel/registro focado (porta, ponto, linha)' },
  { teclas: 'Esc', acao: 'Fechar painéis, modais e drawers' },
  { teclas: '↑ ↓ ← →', acao: 'Navegar entre as portas na faixa do switch/patch panel' },
  { teclas: 'Shift + setas', acao: 'Expandir a seleção de portas em lote' },
  { teclas: 'Tab', acao: 'Percorrer os campos e botões do modal aberto' },
]

export default function SecaoSobre() {
  return (
    <>
      <CartaoSecao
        icone={HelpCircleIcon}
        titulo="Sobre o NexRedes"
        descricao="Sistema de gerenciamento de infraestrutura de rede: salas, racks, pontos, testes de certificação e etiquetas."
      >
        <div className="configuracoes-sobre-versao">
          <strong>Versão 1.0.0</strong>
          <span>Interface em português (pt-BR) · dados salvos localmente no navegador</span>
        </div>
      </CartaoSecao>

      <CartaoSecao
        icone={KeyboardIcon}
        titulo="Atalhos de teclado"
        descricao="Atalhos disponíveis nas telas de portas, pontos e modais."
      >
        <ul className="configuracoes-atalhos">
          {ATALHOS.map((atalho) => (
            <li key={atalho.teclas}>
              <kbd>{atalho.teclas}</kbd>
              <span>{atalho.acao}</span>
            </li>
          ))}
        </ul>
      </CartaoSecao>

      <CartaoSecao
        icone={HelpCircleIcon}
        titulo="Ajuda"
        descricao="Como usar as telas principais."
      >
        <ul className="configuracoes-ajuda">
          <li>
            <strong>Salas:</strong> crie salas, depois racks e equipamentos
            (switches/patch panels) pela aba “Racks” de cada sala.
          </li>
          <li>
            <strong>Redes:</strong> cadastre pontos ligando uma porta do patch
            panel a uma porta do switch e registre os testes de certificação.
          </li>
          <li>
            <strong>Equipamentos:</strong> inventário de tudo, com edição em
            painel lateral; clicar num switch ou patch panel abre a página
            dele.
          </li>
          <li>
            <strong>Relatórios:</strong> indicadores, gráficos e exportação
            (CSV, Excel, PDF e backup JSON).
          </li>
        </ul>
      </CartaoSecao>
    </>
  )
}
