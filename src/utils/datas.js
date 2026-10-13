// Utilitários de data para exibição em pt-BR (tempo local do usuário)

function zerarHora(data) {
  const copia = new Date(data)
  copia.setHours(0, 0, 0, 0)
  return copia
}

// "Hoje, 14:32" / "Ontem, 09:15" / "Há 3 dias" / "12/03/2026"
export function formatarDataRelativa(iso) {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'

  const agora = zerarHora(new Date())
  const alvo = zerarHora(data)
  const dias = Math.round((agora - alvo) / 86400000)

  if (dias === 0) {
    return `Hoje, ${data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }
  if (dias === 1) {
    return `Ontem, ${data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }
  if (dias > 1 && dias < 7) return `Há ${dias} dias`
  return data.toLocaleDateString('pt-BR')
}

// Data e hora atuais em ISO completo (para histórico de eventos no app)
export function agoraISO() {
  return new Date().toISOString()
}

// "dd/mm/aaaa, hh:mm" a partir de um ISO completo
export function formatarDataHora(iso) {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

// Data de hoje no formato yyyy-mm-dd (para <input type="date">)
export function hojeISO() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

// dd/mm/aaaa a partir de yyyy-mm-dd
export function formatarDataInput(valor) {
  if (!valor) return '—'
  const [ano, mes, dia] = valor.split('-')
  if (!ano || !mes || !dia) return '—'
  return `${dia}/${mes}/${ano}`
}
