// Aba "Visão geral" da página da sala: tudo que já era exibido antes das abas

import {
  ClockIcon,
  MapPinIcon,
  MonitorIcon,
  NetworkIcon,
  ServerIcon,
  AlertTriangleIcon,
} from '../icons'
import { contarFalhasAtivas } from '../../utils/salas'
import { formatarDataRelativa, formatarDataInput } from '../../utils/datas'
import { GRAVIDADES, STATUS_FALHA } from './opcoes'

function rotulo(lista, id) {
  const item = lista.find((opcao) => opcao.id === id)
  return item ? item.label : id
}

export default function SalaVisaoGeral({ sala }) {
  const falhasAtivas = contarFalhasAtivas(sala.falhas)
  const pontos = sala.pontosRede || []
  const equipamentos = sala.equipamentos || []
  const falhas = sala.falhas || []

  return (
    <>
      <p className="detalhe-atualizacao">
        <ClockIcon size={14} />
        Última atualização: {formatarDataRelativa(sala.atualizadoEm)}
        {' · '}
        {falhasAtivas === 1
          ? '1 falha ativa'
          : `${falhasAtivas} falhas ativas`}
      </p>

      <section className="detalhe-bloco">
        <h2>
          <MapPinIcon size={18} />
          Localização
        </h2>
        <ul className="detalhe-lista-info">
          <li>
            <span>Prédio ou bloco</span>
            <strong>{sala.predio || '—'}</strong>
          </li>
          <li>
            <span>Andar</span>
            <strong>{sala.andar || '—'}</strong>
          </li>
          <li>
            <span>Descrição</span>
            <strong>{sala.descricaoLocalizacao || '—'}</strong>
          </li>
        </ul>
      </section>

      <section className="detalhe-bloco">
        <h2>
          <MonitorIcon size={18} />
          Máquinas
        </h2>
        <ul className="detalhe-lista-info">
          <li>
            <span>Quantidade de máquinas</span>
            <strong>{sala.quantidadeMaquinas}</strong>
          </li>
          <li>
            <span>Tipos</span>
            <strong>{sala.tiposMaquinas || '—'}</strong>
          </li>
        </ul>
      </section>

      <section className="detalhe-bloco">
        <h2>
          <NetworkIcon size={18} />
          Pontos de rede ({pontos.length})
        </h2>
        {pontos.length === 0 && (
          <p className="detalhe-vazio">Nenhum ponto de rede cadastrado.</p>
        )}
        <ul className="detalhe-registros">
          {pontos.map((ponto) => (
            <li key={ponto.id}>
              <div className="detalhe-registro-topo">
                <strong>{ponto.identificacao}</strong>
                <span className="detalhe-chip neutro">
                  {ponto.categoriaCabo}
                </span>
              </div>
              <p className="detalhe-registro-texto">
                Patch panel: {ponto.patchPanelPorta || '—'} · Switch:{' '}
                {ponto.portaSwitch || '—'}
              </p>
              {ponto.observacao && (
                <p className="detalhe-registro-texto">{ponto.observacao}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="detalhe-bloco">
        <h2>
          <ServerIcon size={18} />
          Equipamentos ({equipamentos.length})
        </h2>
        {equipamentos.length === 0 && (
          <p className="detalhe-vazio">Nenhum equipamento associado.</p>
        )}
        <ul className="detalhe-registros">
          {equipamentos.map((equipamento) => (
            <li key={equipamento.id}>
              <div className="detalhe-registro-topo">
                <strong>
                  {equipamento.nome}{' '}
                  <span className="detalhe-registro-tipo">
                    ({equipamento.tipo})
                  </span>
                </strong>
              </div>
              <p className="detalhe-registro-texto">
                Modelo: {equipamento.modelo || '—'} · IP:{' '}
                {equipamento.ip || '—'}
                {equipamento.vlan ? ` · VLAN: ${equipamento.vlan}` : ''}
              </p>
              {equipamento.observacao && (
                <p className="detalhe-registro-texto">{equipamento.observacao}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="detalhe-bloco">
        <h2>
          <AlertTriangleIcon size={18} />
          Falhas e manutenção ({falhas.length})
        </h2>
        {falhas.length === 0 && (
          <p className="detalhe-vazio">Nenhuma falha registrada.</p>
        )}
        <ul className="detalhe-registros">
          {falhas.map((falha) => (
            <li key={falha.id}>
              <div className="detalhe-registro-topo">
                <strong>{falha.alvo}</strong>
                <span className="detalhe-chips">
                  <span
                    className={`detalhe-chip grav-${falha.gravidade}`}
                  >
                    {rotulo(GRAVIDADES, falha.gravidade)}
                  </span>
                  <span className={`detalhe-chip status-${falha.status}`}>
                    {rotulo(STATUS_FALHA, falha.status)}
                  </span>
                </span>
              </div>
              <p className="detalhe-registro-texto">{falha.descricao}</p>
              <p className="detalhe-registro-texto detalhe-registro-data">
                Identificada em {formatarDataInput(falha.dataIdentificacao)}
              </p>
              {(falha.historicoManutencao || []).length > 0 && (
                <div className="detalhe-historico">
                  {(falha.historicoManutencao || []).map((registro, index) => (
                    <p key={index}>
                      <strong>{formatarDataInput(registro.data)}</strong>
                      {' — '}
                      {registro.texto || '—'}
                    </p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
