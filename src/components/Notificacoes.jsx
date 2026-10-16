// Sino de notificações do topo: itens calculados em tempo real a partir dos
// dados — falhas ativas, testes reprovados, garantias vencendo e pontos sem
// teste há X dias — respeitando as preferências de Configurações →
// Notificações (inclusive a opção "silenciar").

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellIcon,
  AlertTriangleIcon,
  XCircleIcon,
  WrenchIcon,
  ClockIcon,
  CheckCircleIcon,
  VolumeXIcon,
} from './icons'
import { formatarDataRelativa } from '../utils/datas'
import './Notificacoes.css'

const MAX_ITENS = 12

const ICONES = {
  falha: AlertTriangleIcon,
  teste: XCircleIcon,
  garantia: WrenchIcon,
  ponto: ClockIcon,
}

// Monta a lista de notificações (função pura, usada pelo sino)
export function montarNotificacoes({ salas, testes, config }) {
  const notif = config.notificacoes
  const itens = []
  const hoje = new Date()
  const diasSemTeste = Number(notif.diasSemTeste) || 30
  const diasGarantia = Number(config.equipamentos.avisoGarantiaDias) || 30

  // Último teste de cada ponto (para FAIL recentes e pontos sem teste)
  const ultimoPorPonto = new Map()
  for (const teste of testes) {
    const atual = ultimoPorPonto.get(teste.pontoId)
    if (!atual || teste.dataHora > atual.dataHora) {
      ultimoPorPonto.set(teste.pontoId, teste)
    }
  }

  if (notif.falhasNovas) {
    for (const sala of salas) {
      for (const falha of sala.falhas || []) {
        if (falha.status === 'resolvida') continue
        itens.push({
          id: `falha-${falha.id}`,
          tipo: 'falha',
          quando: falha.dataIdentificacao
            ? `${falha.dataIdentificacao}T12:00:00`
            : '',
          titulo: `Falha em ${falha.alvo || sala.nome}`,
          detalhe: `${sala.nome} · ${
            falha.status === 'em_andamento' ? 'em andamento' : 'aberta'
          } · gravidade ${falha.gravidade || 'baixa'}`,
          destino: { tipo: 'sala', salaId: sala.id },
        })
      }
    }
  }

  if (notif.testesReprovados) {
    for (const [pontoId, teste] of ultimoPorPonto) {
      if (teste.resultado !== 'FAIL') continue
      itens.push({
        id: `teste-${teste.id}`,
        tipo: 'teste',
        quando: teste.dataHora,
        titulo: `Teste FAIL em ${teste.snapshot?.pontoIdentificacao || 'ponto'}`,
        detalhe: `${teste.snapshot?.salaNome || ''}${
          teste.motivoFalha ? ` · ${teste.motivoFalha}` : ''
        }`,
        destino: { tipo: 'ponto', pontoId },
      })
    }
  }

  if (notif.garantiaVencendo) {
    const checarGarantia = (registro, sala) => {
      if (!registro.garantia || !registro.nome) return
      const vencimento = new Date(`${registro.garantia}T12:00:00`)
      if (Number.isNaN(vencimento.getTime())) return
      const dias = Math.round(
        (vencimento - hoje) / 86400000
      )
      if (dias < 0 || dias > diasGarantia) return
      itens.push({
        id: `garantia-${registro.id}`,
        tipo: 'garantia',
        quando: `${registro.garantia}T12:00:00`,
        titulo: `Garantia vencendo: ${registro.nome}`,
        detalhe: `${sala.nome} · ${
          dias === 0 ? 'vence hoje' : `vence em ${dias} dia(s)`
        }`,
        destino: { tipo: 'equipamentos' },
      })
    }
    for (const sala of salas) {
      for (const rack of sala.racks || []) {
        for (const equipamento of rack.equipamentos || []) {
          checarGarantia(equipamento, sala)
        }
      }
      for (const item of sala.equipamentos || []) {
        checarGarantia(item, sala)
      }
    }
  }

  if (notif.pontosSemTeste) {
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() - diasSemTeste)
    const limiteISO = limite.toISOString()
    for (const sala of salas) {
      for (const ponto of sala.pontos || []) {
        const ultimo = ultimoPorPonto.get(ponto.id)
        const antigo = !ultimo || ultimo.dataHora < limiteISO
        if (!antigo) continue
        itens.push({
          id: `ponto-${ponto.id}`,
          tipo: 'ponto',
          quando: ultimo ? ultimo.dataHora : ponto.criadoEm || '',
          titulo: `Ponto sem teste: ${ponto.identificacao}`,
          detalhe: `${sala.nome} · ${
            ultimo ? 'sem teste recente' : 'nunca testado'
          }`,
          destino: { tipo: 'ponto', pontoId: ponto.id },
        })
      }
    }
  }

  return itens
    .sort((a, b) => (b.quando || '').localeCompare(a.quando || ''))
    .slice(0, MAX_ITENS)
}

export default function Notificacoes({
  salas,
  testes,
  config,
  onAbrirDestino,
  onSilenciar,
}) {
  const [aberto, setAberto] = useState(false)
  const wrapRef = useRef(null)

  const itens = useMemo(
    () => montarNotificacoes({ salas, testes, config }),
    [salas, testes, config]
  )
  const silenciar = Boolean(config.notificacoes.silenciar)

  // Fecha ao clicar fora ou ao trocar de aba
  useEffect(() => {
    if (!aberto) return
    function aoClicar(evento) {
      if (wrapRef.current && !wrapRef.current.contains(evento.target)) {
        setAberto(false)
      }
    }
    function aoTeclar(evento) {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', aoClicar)
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicar)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function abrirItem(item) {
    setAberto(false)
    onAbrirDestino?.(item.destino)
  }

  return (
    <div className="notificacoes-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bell-btn"
        aria-label={`Notificações (${itens.length})`}
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={() => setAberto((atual) => !atual)}
      >
        <BellIcon size={20} />
        {!silenciar && itens.length > 0 && (
          <>
            <span className="bell-dot" aria-hidden="true"></span>
            <span className="bell-contagem">{itens.length}</span>
          </>
        )}
      </button>

      {aberto && (
        <div className="notificacoes-painel" role="dialog" aria-label="Notificações">
          <header>
            <strong>Notificações</strong>
            <button
              type="button"
              className="redes-filtro-btn"
              onClick={onSilenciar}
              title={
                silenciar
                  ? 'Reativar o contador do sino'
                  : 'Silenciar o contador do sino'
              }
            >
              <VolumeXIcon size={14} />
              {silenciar ? 'Reativar' : 'Silenciar'}
            </button>
          </header>
          {itens.length === 0 ? (
            <div className="notificacoes-vazio">
              <CheckCircleIcon size={22} />
              <p>Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <ul>
              {itens.map((item) => {
                const Icone = ICONES[item.tipo] || BellIcon
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => abrirItem(item)}
                    >
                      <span className={`notificacao-icone tipo-${item.tipo}`}>
                        <Icone size={14} />
                      </span>
                      <span className="notificacao-texto">
                        <strong>{item.titulo}</strong>
                        <span>{item.detalhe}</span>
                      </span>
                      <span className="notificacao-quando">
                        {formatarDataRelativa(item.quando)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <footer>
            <span>
              {itens.length > 0
                ? `${itens.length} notificação(ões) — configure em Configurações → Notificações`
                : 'Configure o que aparece aqui em Configurações → Notificações'}
            </span>
          </footer>
        </div>
      )}
    </div>
  )
}
