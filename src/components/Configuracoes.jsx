// Página "Configurações" (/configuracoes): organizada em sub-abas — Geral |
// Rede | Etiquetas | Equipamentos | Testes | Notificações | Aparência |
// Dados | Conta | Sobre — mantendo o cartão "Etiquetas" original dentro da
// seção Etiquetas. Cada seção tem seu botão "Salvar alterações" e aviso de
// confirmação (toast) ao salvar.

import { useState } from 'react'
import {
  BuildingIcon,
  NetworkIcon,
  TagIcon,
  ServerIcon,
  ClipboardCheckIcon,
  BellIcon,
  PaletteIcon,
  DatabaseIcon,
  UserCircleIcon,
  HelpCircleIcon,
} from './icons'
import './sala/SalaModal.css'
import './sala/SalaDetalhe.css'
import './redes/redes.css'
import './Configuracoes.css'
import { obterConfig, salvarConfig } from '../utils/etiquetas'
import SecaoGeral from './configuracoes/SecaoGeral'
import SecaoRede from './configuracoes/SecaoRede'
import SecaoEtiquetas from './configuracoes/SecaoEtiquetas'
import SecaoEquipamentos from './configuracoes/SecaoEquipamentos'
import SecaoTestes from './configuracoes/SecaoTestes'
import SecaoNotificacoes from './configuracoes/SecaoNotificacoes'
import SecaoAparencia from './configuracoes/SecaoAparencia'
import SecaoDados from './configuracoes/SecaoDados'
import SecaoConta from './configuracoes/SecaoConta'
import SecaoSobre from './configuracoes/SecaoSobre'

const SUBABAS = [
  { id: 'geral', label: 'Geral', Icon: BuildingIcon },
  { id: 'rede', label: 'Rede', Icon: NetworkIcon },
  { id: 'etiquetas', label: 'Etiquetas', Icon: TagIcon },
  { id: 'equipamentos', label: 'Equipamentos', Icon: ServerIcon },
  { id: 'testes', label: 'Testes', Icon: ClipboardCheckIcon },
  { id: 'notificacoes', label: 'Notificações', Icon: BellIcon },
  { id: 'aparencia', label: 'Aparência', Icon: PaletteIcon },
  { id: 'dados', label: 'Dados', Icon: DatabaseIcon },
  { id: 'conta', label: 'Conta', Icon: UserCircleIcon },
  { id: 'sobre', label: 'Sobre', Icon: HelpCircleIcon },
]

export default function Configuracoes({
  user,
  salas,
  onLogout,
  onMostrarToast,
  onUsuarioAlterado,
  onDadosAlterados,
  onConfigAlterado,
}) {
  const [subaba, setSubaba] = useState('geral')
  const [config, setConfig] = useState(() => obterConfig())

  function atualizarConfigLocal() {
    setConfig(obterConfig())
    onConfigAlterado?.()
  }

  // Salva uma seção mesclando com as demais configurações (nunca apaga o
  // resto) e mostra o aviso de confirmação.
  function salvarSecao(parcial) {
    salvarConfig({ ...obterConfig(), ...parcial })
    setConfig(obterConfig())
    onConfigAlterado?.()
    onMostrarToast?.('Configurações salvas com sucesso')
  }

  return (
    <main className="dash-main configuracoes">
      <div className="main-header">
        <div>
          <h1>Configurações</h1>
          <p>Ajustes gerais do NexRedes.</p>
        </div>
      </div>

      <div className="redes-subabas" role="tablist" aria-label="Seções de Configurações">
        {SUBABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={`redes-subaba${subaba === item.id ? ' ativa' : ''}`}
            aria-selected={subaba === item.id}
            onClick={() => setSubaba(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="configuracoes-conteudo">
        {subaba === 'geral' && (
          <SecaoGeral config={config} onSalvar={salvarSecao} />
        )}
        {subaba === 'rede' && <SecaoRede config={config} onSalvar={salvarSecao} />}
        {subaba === 'etiquetas' && (
          <SecaoEtiquetas
            config={config}
            onSalvar={salvarSecao}
            onConfigAlterado={atualizarConfigLocal}
            onMostrarToast={onMostrarToast}
          />
        )}
        {subaba === 'equipamentos' && (
          <SecaoEquipamentos config={config} onSalvar={salvarSecao} />
        )}
        {subaba === 'testes' && (
          <SecaoTestes config={config} onSalvar={salvarSecao} />
        )}
        {subaba === 'notificacoes' && (
          <SecaoNotificacoes config={config} onSalvar={salvarSecao} />
        )}
        {subaba === 'aparencia' && (
          <SecaoAparencia config={config} onSalvar={salvarSecao} />
        )}
        {subaba === 'dados' && (
          <SecaoDados
            salas={salas}
            onDadosAlterados={onDadosAlterados}
            onConfigAlterado={atualizarConfigLocal}
            onMostrarToast={onMostrarToast}
          />
        )}
        {subaba === 'conta' && (
          <SecaoConta
            user={user}
            config={config}
            onLogout={onLogout}
            onUsuarioAlterado={onUsuarioAlterado}
            onSalvar={salvarSecao}
            onMostrarToast={onMostrarToast}
          />
        )}
        {subaba === 'sobre' && <SecaoSobre />}
      </div>
    </main>
  )
}
