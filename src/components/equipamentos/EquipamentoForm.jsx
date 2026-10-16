// Painel lateral "Novo equipamento"/"Editar equipamento" da tela
// Equipamentos. O tipo decide o destino dos dados:
// - Switch e Patch panel → equipamento real do rack (utils/racks.js) + campos
//   extras (fabricante, nº de série, MAC, aquisição, garantia);
// - Rack → rack da sala (nome, altura U, localização);
// - Máquina/Roteador/Access point/Servidor/Outro/tipos personalizados →
//   equipamento associado à sala (sala.equipamentos).

import { useEffect, useMemo, useRef, useState } from 'react'
import { XIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import { CATEGORIAS_CABO } from '../sala/opcoes'
import { ALTURAS_RACK } from '../rack/opcoes'
import {
  criarEquipamento,
  editarEquipamento,
  criarRack,
  editarRack,
  validarEquipamento,
  validarRack,
} from '../../utils/racks'
import {
  salvarEquipamentoAssociado,
  salvarExtrasEquipamentoRack,
} from '../../utils/equipamentos'
import { obterConfig } from '../../utils/etiquetas'
import '../sala/SalaModal.css'
import '../redes/redes.css'
import '../rack/rack.css'

function estadoInicial(linha, salas, config) {
  const base = {
    tipo: 'Switch',
    nome: '',
    fabricante: '',
    modelo: '',
    numeroSerie: '',
    ip: '',
    mac: '',
    salaId: salas[0]?.id || '',
    rackId: '',
    posicaoU: '',
    quantidadePortas: String(config.rede.portasPadraoSwitch || '24'),
    quantidadeUplink: '0',
    categoriaCaboPadrao: CATEGORIAS_CABO[0],
    alturaU: '24',
    localizacao: '',
    dataAquisicao: '',
    garantia: '',
    observacoes: '',
  }
  if (!linha) return base
  return {
    ...base,
    tipo: linha.tipoExibicao === 'Rack' ? 'Rack' : linha.tipoExibicao,
    nome: linha.nome || '',
    fabricante: linha.fabricante || '',
    modelo: linha.modelo || '',
    numeroSerie: linha.numeroSerie || '',
    ip: linha.ip || '',
    mac: linha.mac || '',
    salaId: linha.salaId || base.salaId,
    rackId: linha.rackId || '',
    posicaoU: linha.posicaoU ? String(linha.posicaoU) : '',
    quantidadePortas: linha.quantidadePortas
      ? String(linha.quantidadePortas)
      : base.quantidadePortas,
    quantidadeUplink:
      linha.quantidadeUplink !== undefined && linha.quantidadeUplink !== null
        ? String(linha.quantidadeUplink)
        : base.quantidadeUplink,
    categoriaCaboPadrao: linha.categoriaCaboPadrao || base.categoriaCaboPadrao,
    alturaU: linha.alturaU ? String(linha.alturaU) : base.alturaU,
    localizacao: linha.localizacao || '',
    dataAquisicao: linha.dataAquisicao || '',
    garantia: linha.garantia || '',
    observacoes: linha.observacoes || '',
  }
}

export default function EquipamentoForm({
  salas,
  linha, // null (novo) ou linha do inventário (edição)
  onFechar,
  onSalvo,
  onMostrarToast,
}) {
  const config = useMemo(() => obterConfig(), [])
  const [form, setForm] = useState(() => estadoInicial(linha, salas, config))
  const [erros, setErros] = useState({})
  const drawerRef = useRef(null)

  const tiposDisponiveis = useMemo(() => {
    const customizados = (config.equipamentos.tipos || []).filter(Boolean)
    return [...new Set([...(linha ? [form.tipo] : []), 'Switch', 'Patch panel', 'Rack', 'Máquina', 'Roteador', 'Access point', 'Servidor', 'Outro', ...customizados])]
  }, [config, linha, form.tipo])

  const precisaRack = form.tipo === 'Switch' || form.tipo === 'Patch panel'
  const isRack = form.tipo === 'Rack'
  const isAssociado = !precisaRack && !isRack

  const salaAtual = salas.find((sala) => sala.id === form.salaId) || null
  const racksDaSala = salaAtual?.racks || []
  const rackAtual = racksDaSala.find((rack) => rack.id === form.rackId) || null

  // Posições U livres (ou a atual, na edição)
  const posicoesU = useMemo(() => {
    if (!rackAtual) return []
    const ocupadas = new Set(
      (rackAtual.equipamentos || [])
        .filter((eq) => eq.id !== linha?.id)
        .map((eq) => Number(eq.posicaoU))
    )
    const livres = []
    for (let u = 1; u <= rackAtual.alturaU; u++) {
      if (!ocupadas.has(u)) livres.push(u)
    }
    return livres
  }, [rackAtual, linha])

  useEffect(() => {
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.focus()
    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        onFechar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = scrollAnterior
      window.removeEventListener('keydown', aoTeclar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function atualizar(chave, valor) {
    setForm((atual) => ({ ...atual, [chave]: valor }))
    setErros((atual) =>
      atual[chave] ? { ...atual, [chave]: undefined } : atual
    )
  }

  function trocarSala(salaId) {
    setForm((atual) => ({ ...atual, salaId, rackId: '', posicaoU: '' }))
  }

  function trocarRack(rackId) {
    setForm((atual) => ({ ...atual, rackId, posicaoU: '' }))
  }

  function aoSubmeter(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome do equipamento.'
    if (!form.salaId) novosErros.salaId = 'Escolha a sala.'

    if (precisaRack) {
      if (!form.rackId) novosErros.rackId = 'Escolha o rack.'
      if (!form.posicaoU) novosErros.posicaoU = 'Escolha a posição (U).'
      if (rackAtual) {
        const validacao = validarEquipamento(
          {
            tipo: form.tipo === 'Switch' ? 'switch' : 'patch_panel',
            nome: form.nome,
            quantidadePortas: form.quantidadePortas,
            quantidadeUplink: form.quantidadeUplink,
            posicaoU: form.posicaoU,
            ipGerencia: form.ip,
            categoriaCaboPadrao: form.categoriaCaboPadrao,
          },
          rackAtual,
          linha?.kind === 'rack_equipment' ? linha.id : null
        )
        Object.assign(novosErros, validacao)
      }
    }
    if (isRack && salaAtual) {
      const validacao = validarRack(
        { nome: form.nome, alturaU: form.alturaU, localizacao: form.localizacao, observacoes: form.observacoes },
        salaAtual,
        linha?.kind === 'rack' ? linha.id : null
      )
      Object.assign(novosErros, validacao)
      if (!Number(form.alturaU)) {
        novosErros.alturaU = novosErros.alturaU || 'Escolha a altura do rack.'
      }
    }

    setErros(novosErros)
    const chavesErro = Object.keys(novosErros).filter(
      (chave) => novosErros[chave]
    )
    if (chavesErro.length > 0) {
      document
        .querySelector(`[data-erro-chave="${chavesErro[0]}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const extras = {
      fabricante: form.fabricante,
      numeroSerie: form.numeroSerie,
      mac: form.mac,
      dataAquisicao: form.dataAquisicao,
      garantia: form.garantia,
    }

    if (precisaRack) {
      const dados = {
        tipo: form.tipo === 'Switch' ? 'switch' : 'patch_panel',
        nome: form.nome,
        modelo: form.modelo,
        quantidadePortas: form.quantidadePortas,
        quantidadeUplink: form.tipo === 'Switch' ? form.quantidadeUplink : 0,
        posicaoU: form.posicaoU,
        ipGerencia: form.tipo === 'Switch' ? form.ip : '',
        categoriaCaboPadrao:
          form.tipo === 'Patch panel' ? form.categoriaCaboPadrao : '',
        observacoes: form.observacoes,
      }
      if (linha?.kind === 'rack_equipment') {
        const salvo = editarEquipamento(linha.salaId, linha.rackId, linha.id, dados)
        if (!salvo) {
          onMostrarToast?.(
            'Não foi possível salvar: há dados/vínculos nas portas acima do novo limite de portas ou uplinks'
          )
          return
        }
        salvarExtrasEquipamentoRack(linha.salaId, linha.id, extras)
        onMostrarToast?.('Equipamento atualizado com sucesso')
      } else {
        const novo = criarEquipamento(form.salaId, form.rackId, dados)
        if (!novo) {
          onMostrarToast?.('Não foi possível criar o equipamento no rack')
          return
        }
        salvarExtrasEquipamentoRack(form.salaId, novo.id, extras)
        onMostrarToast?.('Equipamento criado com sucesso')
      }
    } else if (isRack) {
      const dados = {
        nome: form.nome,
        alturaU: form.alturaU,
        localizacao: form.localizacao,
        observacoes: form.observacoes,
      }
      if (linha?.kind === 'rack') {
        const salvo = editarRack(linha.salaId, linha.id, dados)
        if (!salvo) {
          onMostrarToast?.('Não foi possível salvar o rack')
          return
        }
        onMostrarToast?.('Rack atualizado com sucesso')
      } else {
        const novo = criarRack(form.salaId, dados)
        if (!novo) {
          onMostrarToast?.('Não foi possível criar o rack')
          return
        }
        onMostrarToast?.('Rack criado com sucesso')
      }
    } else {
      const salvo = salvarEquipamentoAssociado(
        form.salaId,
        {
          tipo: form.tipo,
          nome: form.nome,
          fabricante: form.fabricante,
          modelo: form.modelo,
          numeroSerie: form.numeroSerie,
          ip: form.ip,
          mac: form.mac,
          dataAquisicao: form.dataAquisicao,
          garantia: form.garantia,
          observacoes: form.observacoes,
        },
        linha?.kind === 'associado' ? linha.id : null
      )
      if (!salvo) {
        onMostrarToast?.('Não foi possível salvar o equipamento')
        return
      }
      onMostrarToast?.(
        linha?.kind === 'associado'
          ? 'Equipamento atualizado com sucesso'
          : 'Equipamento criado com sucesso'
      )
    }
    onSalvo()
  }

  return (
    <div
      className="redes-drawer-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar()
      }}
    >
      <aside
        ref={drawerRef}
        className="redes-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipamento-form-titulo"
        tabIndex={-1}
      >
        <header className="redes-drawer-cabecalho">
          <div>
            <h3 id="equipamento-form-titulo">
              {linha ? 'Editar equipamento' : 'Novo equipamento'}
            </h3>
            <p>
              Switches e patch panels entram no rack da sala; máquinas e
              outros dispositivos ficam associados à sala.
            </p>
          </div>
          <button
            type="button"
            className="btn-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <XIcon size={20} />
          </button>
        </header>

        <form className="redes-drawer-corpo" onSubmit={aoSubmeter}>
          <section className="redes-drawer-secao">
            <h4>Identificação</h4>
            <CampoSelect
              chave="tipo"
              label="Tipo"
              valor={form.tipo}
              opcoes={tiposDisponiveis.map((tipo) => ({ valor: tipo, label: tipo }))}
              aoAlterar={(valor) => atualizar('tipo', valor)}
            />
            <CampoInput
              chave="nome"
              label="Nome"
              obrigatorio
              placeholder="ex.: Switch core"
              erro={erros.nome}
              valor={form.nome}
              aoAlterar={(valor) => atualizar('nome', valor)}
            />
            {!isRack && (
              <div className="redes-drawer-grade">
                <CampoInput
                  chave="fabricante"
                  label="Fabricante"
                  placeholder="ex.: Cisco"
                  list="equipamento-fabricantes"
                  valor={form.fabricante}
                  aoAlterar={(valor) => atualizar('fabricante', valor)}
                />
                <CampoInput
                  chave="modeloEq"
                  label="Modelo"
                  placeholder="ex.: 2960-X-24TS"
                  valor={form.modelo}
                  aoAlterar={(valor) => atualizar('modelo', valor)}
                />
                <CampoInput
                  chave="numeroSerie"
                  label="Nº de série"
                  placeholder="ex.: FOC1234A5BC"
                  valor={form.numeroSerie}
                  aoAlterar={(valor) => atualizar('numeroSerie', valor)}
                />
              </div>
            )}
            {(config.equipamentos.fabricantes || []).length > 0 && (
              <datalist id="equipamento-fabricantes">
                {config.equipamentos.fabricantes.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            )}
          </section>

          <section className="redes-drawer-secao">
            <h4>Localização</h4>
            <CampoSelect
              chave="salaId"
              label="Sala"
              obrigatorio
              valor={form.salaId}
              opcoes={salas.map((sala) => ({ valor: sala.id, label: sala.nome }))}
              erro={erros.salaId}
              aoAlterar={trocarSala}
            />
            {isRack ? (
              <>
                <div className="redes-drawer-grade">
                  <CampoSelect
                    chave="alturaU"
                    label="Altura do rack (U)"
                    obrigatorio
                    valor={form.alturaU}
                    opcoes={ALTURAS_RACK.map((altura) => ({
                      valor: String(altura),
                      label: `${altura}U`,
                    }))}
                    erro={erros.alturaU}
                    aoAlterar={(valor) => atualizar('alturaU', valor)}
                  />
                  <CampoInput
                    chave="localizacao"
                    label="Localização"
                    placeholder="ex.: armário do corredor"
                    valor={form.localizacao}
                    aoAlterar={(valor) => atualizar('localizacao', valor)}
                  />
                </div>
              </>
            ) : precisaRack ? (
              <>
                <CampoSelect
                  chave="rackId"
                  label="Rack da sala"
                  obrigatorio
                  valor={form.rackId}
                  opcoes={[{ valor: '', label: '—' }].concat(
                    racksDaSala.map((rack) => ({
                      valor: rack.id,
                      label: `${rack.nome} (${rack.alturaU}U)`,
                    }))
                  )}
                  erro={erros.rackId}
                  aoAlterar={trocarRack}
                />
                {racksDaSala.length === 0 && (
                  <p className="painel-nota">
                    Nenhum rack nesta sala. Crie um na aba Racks da sala
                    (Salas) ou escolha o tipo “Rack” aqui.
                  </p>
                )}
                {rackAtual && (
                  <div className="redes-drawer-grade">
                    <CampoSelect
                      chave="posicaoU"
                      label="Posição (U)"
                      obrigatorio
                      valor={form.posicaoU}
                      opcoes={[{ valor: '', label: '—' }].concat(
                        posicoesU.map((u) => ({
                          valor: String(u),
                          label: `U${u}`,
                        }))
                      )}
                      erro={erros.posicaoU}
                      aoAlterar={(valor) => atualizar('posicaoU', valor)}
                    />
                    <CampoInput
                      chave="quantidadePortas"
                      label="Nº de portas"
                      obrigatorio
                      tipo="number"
                      min="1"
                      max="96"
                      valor={form.quantidadePortas}
                      erro={erros.quantidadePortas}
                      aoAlterar={(valor) => atualizar('quantidadePortas', valor)}
                    />
                  </div>
                )}
                {form.tipo === 'Switch' && (
                  <div className="redes-drawer-grade">
                    <CampoSelect
                      chave="quantidadeUplink"
                      label="Portas uplink/SFP"
                      valor={form.quantidadeUplink}
                      opcoes={[0, 1, 2, 3, 4].map((n) => ({
                        valor: String(n),
                        label: String(n),
                      }))}
                      erro={erros.quantidadeUplink}
                      aoAlterar={(valor) => atualizar('quantidadeUplink', valor)}
                    />
                    <CampoInput
                      chave="ipGerencia"
                      label="IP de gerência"
                      placeholder="ex.: 192.168.10.24"
                      valor={form.ip}
                      erro={erros.ipGerencia}
                      aoAlterar={(valor) => atualizar('ip', valor)}
                    />
                  </div>
                )}
                {form.tipo === 'Patch panel' && (
                  <CampoSelect
                    chave="categoriaCaboPadrao"
                    label="Categoria padrão do cabo"
                    valor={form.categoriaCaboPadrao}
                    opcoes={CATEGORIAS_CABO.map((categoria) => ({
                      valor: categoria,
                      label: categoria,
                    }))}
                    aoAlterar={(valor) => atualizar('categoriaCaboPadrao', valor)}
                  />
                )}
              </>
            ) : null}
          </section>

          {!isRack && (
            <section className="redes-drawer-secao">
              <h4>Rede e datas</h4>
              <div className="redes-drawer-grade">
                {!precisaRack && (
                  <CampoInput
                    chave="ipEq"
                    label="Endereço IP"
                    placeholder="ex.: 192.168.10.30"
                    valor={form.ip}
                    aoAlterar={(valor) => atualizar('ip', valor)}
                  />
                )}
                <CampoInput
                  chave="mac"
                  label="MAC"
                  placeholder="ex.: A4:2B:B0:1C:44:9E"
                  valor={form.mac}
                  aoAlterar={(valor) => atualizar('mac', valor)}
                />
                <CampoInput
                  chave="dataAquisicao"
                  label="Data de aquisição"
                  tipo="date"
                  valor={form.dataAquisicao}
                  aoAlterar={(valor) => atualizar('dataAquisicao', valor)}
                />
                <CampoInput
                  chave="garantia"
                  label="Garantia até"
                  tipo="date"
                  valor={form.garantia}
                  aoAlterar={(valor) => atualizar('garantia', valor)}
                />
              </div>
            </section>
          )}

          <section className="redes-drawer-secao">
            <h4>Observações</h4>
            <CampoTextarea
              chave="observacoesEq"
              label="Observações"
              linhas={2}
              placeholder="Informações extras sobre o equipamento"
              valor={form.observacoes}
              aoAlterar={(valor) => atualizar('observacoes', valor)}
            />
          </section>

          <footer className="redes-drawer-rodape">
            <button
              type="button"
              className="btn-modal secundario"
              onClick={onFechar}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-modal primario">
              {linha ? 'Salvar alterações' : 'Criar equipamento'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
