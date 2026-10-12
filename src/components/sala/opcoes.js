// Opções fixas usadas no formulário, no cartão e na página da sala

import {
  BuildingIcon,
  ServerIcon,
  UsersIcon,
  UsersRoundIcon,
  DollarSignIcon,
  NetworkIcon,
  HomeIcon,
  ChartIcon,
} from '../icons'

// Cores já usadas nos cartões — definem a borda lateral e o fundo do ícone
export const CORES_SALA = [
  { id: 'azul', label: 'Azul', valor: '#2563EB' },
  { id: 'roxo', label: 'Roxo', valor: '#7C3AED' },
  { id: 'verde', label: 'Verde', valor: '#16A34A' },
  { id: 'laranja', label: 'Laranja', valor: '#F59E0B' },
  { id: 'vermelho', label: 'Vermelho', valor: '#EF4444' },
]

export const ICONES_SALA = [
  { id: 'predio', label: 'Prédio', Icon: BuildingIcon },
  { id: 'servidor', label: 'Servidor', Icon: ServerIcon },
  { id: 'usuarios', label: 'Usuários', Icon: UsersIcon },
  { id: 'equipe', label: 'Equipe', Icon: UsersRoundIcon },
  { id: 'financas', label: 'Finanças', Icon: DollarSignIcon },
  { id: 'rede', label: 'Rede', Icon: NetworkIcon },
  { id: 'casa', label: 'Casa', Icon: HomeIcon },
  { id: 'grafico', label: 'Gráfico', Icon: ChartIcon },
]

export const TIPOS_SALA = [
  'Administrativo',
  'Sala de aula',
  'Laboratório',
  'Sala de hardware/CPD',
  'Outro',
]

export const CATEGORIAS_CABO = ['Cat5e', 'Cat6', 'Cat6A', 'Outro']

export const TIPOS_EQUIPAMENTO = [
  'Switch',
  'Roteador',
  'Access point',
  'Patch panel',
  'Servidor',
  'Rack',
  'Outro',
]

export const GRAVIDADES = [
  { id: 'baixa', label: 'Baixa' },
  { id: 'atencao', label: 'Atenção' },
  { id: 'critica', label: 'Crítica' },
]

export const STATUS_FALHA = [
  { id: 'aberta', label: 'Aberta' },
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'resolvida', label: 'Resolvida' },
]

// Status da sala (derivado das falhas) — classes do Dashboard.css
export const STATUS_SALA = [
  { id: 'operacional', label: 'Operacional', className: 'st-ok' },
  { id: 'atencao', label: 'Atenção', className: 'st-warn' },
  { id: 'critico', label: 'Crítico', className: 'st-crit' },
]
