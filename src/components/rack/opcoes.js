// Opções do módulo de racks: estados visuais das portas, tipos de dispositivo,
// velocidades, PoE, alturas e demais listas fixas usadas nas páginas.

import {
  MonitorIcon,
  PrinterIcon,
  AccessPointIcon,
  CameraIcon,
  PhoneIcon,
  BoxIcon,
  PlugIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  WrenchIcon,
  LinkArrowsIcon,
  LockIcon,
} from '../icons'
import { CATEGORIAS_CABO } from '../sala/opcoes'

export { CATEGORIAS_CABO }

// Estados visuais das portas — SEMPRE calculados a partir dos dados
// (utils/racks.js → calcularEstadoPorta), nunca salvos.
// A ordem define também a ordem da legenda.
export const ESTADOS_PORTA = [
  {
    id: 'livre',
    label: 'Livre',
    selo: 'Livre',
    cor: '#ffffff',
    borda: '#d1d5db',
    Icone: PlugIcon,
    iconeFundo: '#9ca3af',
    descricao: 'Livre: nada conectado',
  },
  {
    id: 'certificada',
    label: 'Em uso (certificada)',
    selo: 'Em uso e certificada',
    curto: 'Certificada',
    cor: '#16a34a',
    borda: '#16a34a',
    Icone: CheckCircleIcon,
    iconeFundo: '#ffffff',
    descricao: 'Em uso e certificada: último teste PASS',
  },
  {
    id: 'aguardando',
    label: 'Em uso (aguardando teste)',
    selo: 'Em uso, aguardando teste',
    curto: 'Aguardando teste',
    cor: '#2563eb',
    borda: '#2563eb',
    Icone: ClockIcon,
    iconeFundo: '#ffffff',
    descricao: 'Em uso, aguardando teste de certificação',
  },
  {
    id: 'uplink',
    label: 'Uplink',
    selo: 'Uplink ou tronco',
    curto: 'Uplink',
    cor: '#7c3aed',
    borda: '#7c3aed',
    Icone: LinkArrowsIcon,
    iconeFundo: '#ffffff',
    descricao: 'Uplink ou tronco: liga a outro switch ou rack',
  },
  {
    id: 'atencao',
    label: 'Atenção',
    selo: 'Atenção ou manutenção',
    curto: 'Atenção',
    cor: '#f59e0b',
    borda: '#f59e0b',
    Icone: WrenchIcon,
    iconeFundo: '#ffffff',
    descricao: 'Atenção ou em manutenção: falha leve ou em andamento',
  },
  {
    id: 'critica',
    label: 'Falha crítica',
    selo: 'Falha crítica',
    curto: 'Crítica',
    cor: '#dc2626',
    borda: '#dc2626',
    Icone: XCircleIcon,
    iconeFundo: '#ffffff',
    descricao: 'Teste FAIL ou falha crítica aberta',
  },
  {
    id: 'bloqueada',
    label: 'Desativada/Reservada',
    selo: 'Desativada ou reservada',
    curto: 'Reservada',
    cor: '#374151',
    borda: '#374151',
    Icone: LockIcon,
    iconeFundo: '#ffffff',
    descricao: 'Desativada ou reservada',
  },
]

export function estadoPortaInfo(id) {
  return ESTADOS_PORTA.find((estado) => estado.id === id) || ESTADOS_PORTA[0]
}

// Tipos de dispositivo que podem estar conectados a uma porta.
// "Outro switch" e "Patch panel" foram REMOVIDOS: ligações com switches e
// patch panels são feitas pelo campo "Vínculos" (SeletorVinculo), não pelo
// dispositivo conectado. Registros legados migram em utils/migracao.js.
export const TIPOS_DISPOSITIVO = [
  { id: 'computador', label: 'Computador', Icone: MonitorIcon },
  { id: 'impressora', label: 'Impressora', Icone: PrinterIcon },
  { id: 'access_point', label: 'Access point', Icone: AccessPointIcon },
  { id: 'camera', label: 'Câmera', Icone: CameraIcon },
  { id: 'telefone', label: 'Telefone', Icone: PhoneIcon },
  { id: 'outro', label: 'Outro', Icone: BoxIcon },
]

export function dispositivoInfo(id) {
  return TIPOS_DISPOSITIVO.find((tipo) => tipo.id === id) || null
}

export function rotuloDispositivo(id) {
  const info = dispositivoInfo(id)
  return info ? info.label : 'Outro'
}

// Estado do campo "estado" da porta (diferente do estado VISUAL calculado)
export const ESTADOS_CAMPO = [
  { id: 'ativa', label: 'Ativa' },
  { id: 'desativada', label: 'Desativada' },
  { id: 'reservada', label: 'Reservada' },
]

export const VELOCIDADES = [
  { id: 'auto', label: 'Auto' },
  { id: '10/100', label: '10/100' },
  { id: '1gbps', label: '1 Gbps' },
  { id: '2.5gbps', label: '2,5 Gbps' },
  { id: '10gbps', label: '10 Gbps' },
]

export function rotuloVelocidade(id) {
  const info = VELOCIDADES.find((vel) => vel.id === id)
  return info ? info.label : '—'
}

export const MODOS_POE = [
  { id: 'desligado', label: 'Desligado' },
  { id: 'poe', label: 'PoE' },
  { id: 'poe+', label: 'PoE+' },
  { id: 'poe++', label: 'PoE++' },
]

export function rotuloPoe(id) {
  const info = MODOS_POE.find((modo) => modo.id === id)
  return info ? info.label : '—'
}

export const ULTIMOS_TESTES = [
  { id: 'SEM_TESTE', label: 'Sem teste' },
  { id: 'PASS', label: 'PASS' },
  { id: 'FAIL', label: 'FAIL' },
]

export function rotuloTeste(id) {
  const info = ULTIMOS_TESTES.find((teste) => teste.id === id)
  return info ? info.label : 'Sem teste'
}

export const ALTURAS_RACK = [12, 16, 24, 42, 48]

export const PORTAS_SWITCH = [
  { id: '8', label: '8 portas' },
  { id: '16', label: '16 portas' },
  { id: '24', label: '24 portas' },
  { id: '48', label: '48 portas' },
  { id: 'custom', label: 'Personalizado' },
]

export const PORTAS_PATCH_PANEL = [
  { id: '12', label: '12 portas' },
  { id: '24', label: '24 portas' },
  { id: '48', label: '48 portas' },
  { id: 'custom', label: 'Personalizado' },
]

export const QTD_UPLINK = [0, 1, 2, 3, 4]

export const LADOS_PATCH_PANEL = [
  { id: 'frente', label: 'Frente (lado do switch)' },
  { id: 'verso', label: 'Verso (lado dos pontos de rede)' },
]

export const ROTULO_LADO = {
  frente: 'Frente',
  verso: 'Verso',
}

// Filtros rápidos acima da tabela de portas
export const FILTROS_RAPIDOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'em_uso', label: 'Em uso' },
  { id: 'livres', label: 'Livres' },
  { id: 'com_falha', label: 'Com falha' },
  { id: 'reservadas', label: 'Reservadas' },
  { id: 'uplink', label: 'Uplink' },
]
