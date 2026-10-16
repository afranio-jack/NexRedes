// Configurações → Notificações: o que aparece no sino do topo (apenas
// dentro do app, sem e-mail/SMS) e a opção de silenciar.

import { useState } from 'react'
import { BellIcon } from '../icons'
import { CampoInput } from '../sala/Campo'
import { CartaoSecao, RodapeSecao } from './UI'

export default function SecaoNotificacoes({ config, onSalvar }) {
  const [notif, setNotif] = useState(() => ({
    ...config.notificacoes,
  }))

  const ITENS = [
    { id: 'falhasNovas', label: 'Falhas novas e ativas', descricao: 'Falhas abertas ou em andamento nas salas.' },
    { id: 'testesReprovados', label: 'Testes reprovados', descricao: 'Últimos testes de certificação com resultado FAIL.' },
    { id: 'garantiaVencendo', label: 'Garantia vencendo', descricao: 'Equipamentos com garantia vencendo nos próximos dias.' },
    { id: 'pontosSemTeste', label: 'Pontos sem teste há X dias', descricao: 'Pontos de rede que nunca foram certificados.' },
  ]

  return (
    <CartaoSecao
      icone={BellIcon}
      titulo="Notificações do aplicativo"
      descricao="O que aparece no sino, no topo da tela — sem e-mail e sem SMS."
    >
      <div className="configuracoes-checks configuracoes-checks-lista">
        {ITENS.map((item) => (
          <label key={item.id} className="redes-check configuracoes-check-item">
            <input
              type="checkbox"
              checked={Boolean(notif[item.id])}
              onChange={(evento) =>
                setNotif((atual) => ({ ...atual, [item.id]: evento.target.checked }))
              }
            />
            <span>
              <strong>{item.label}</strong>
              <span className="configuracoes-check-descricao">
                {item.descricao}
              </span>
            </span>
          </label>
        ))}
        {notif.pontosSemTeste && (
          <div className="configuracoes-nota-campo">
            <CampoInput
              chave="diasSemTeste"
              label="Avisar pontos sem teste há mais de (dias)"
              tipo="number"
              min="1"
              max="365"
              valor={String(notif.diasSemTeste)}
              aoAlterar={(valor) =>
                setNotif((atual) => ({ ...atual, diasSemTeste: valor }))
              }
            />
          </div>
        )}
      </div>

      <label className="redes-check">
        <input
          type="checkbox"
          checked={Boolean(notif.silenciar)}
          onChange={(evento) =>
            setNotif((atual) => ({ ...atual, silenciar: evento.target.checked }))
          }
        />
        Silenciar notificações (esconde o contador do sino)
      </label>

      <RodapeSecao onSalvar={() => onSalvar({ notificacoes: notif })} />
    </CartaoSecao>
  )
}
