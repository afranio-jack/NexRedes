// Configurações → Geral: dados da organização (nome da empresa/instituição,
// responsável, logo, endereço) e preferências regionais (fuso, idioma,
// formato de data/hora e unidade de medida).

import { useRef, useState } from 'react'
import { BuildingIcon, UploadIcon, TrashIcon } from '../icons'
import { CampoInput, CampoSelect } from '../sala/Campo'
import { CartaoSecao, RodapeSecao } from './UI'

const FUSOS = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Recife',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Belem',
  'UTC',
]

const FORMATOS_DATA = [
  { valor: 'dd/mm/aaaa', label: 'dd/mm/aaaa' },
  { valor: 'mm/dd/aaaa', label: 'mm/dd/aaaa' },
  { valor: 'aaaa-mm-dd', label: 'aaaa-mm-dd' },
]

const FORMATOS_HORA = [
  { valor: '24h', label: '24 horas' },
  { valor: '12h', label: '12 horas (AM/PM)' },
]

export default function SecaoGeral({ config, onSalvar }) {
  const [org, setOrg] = useState(() => ({ ...config.organizacao }))
  const [erroLogo, setErroLogo] = useState('')
  const inputLogo = useRef(null)

  function atualizar(chave, valor) {
    setOrg((atual) => ({ ...atual, [chave]: valor }))
  }

  function aoEscolherLogo(evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    // Os dados vivem no localStorage: imagens grandes não cabem
    if (arquivo.size > 400 * 1024) {
      setErroLogo('Imagem muito grande — envie um arquivo de até 400 KB.')
      evento.target.value = ''
      return
    }
    setErroLogo('')
    const leitor = new FileReader()
    leitor.onload = () => {
      atualizar('logo', String(leitor.result))
      evento.target.value = ''
    }
    leitor.readAsDataURL(arquivo)
  }

  return (
    <>
      <CartaoSecao
        icone={BuildingIcon}
        titulo="Organização"
        descricao="Dados da sua empresa ou instituição, usados nos relatórios e etiquetas."
      >
        <div className="secao-grade">
          <CampoInput
            chave="nomeEmpresa"
            label="Nome da empresa/instituição"
            placeholder="ex.: Colégio Aurora"
            valor={org.nomeEmpresa}
            aoAlterar={(valor) => atualizar('nomeEmpresa', valor)}
          />
          <CampoInput
            chave="responsavelGeral"
            label="Nome do responsável"
            placeholder="ex.: Ana Souza"
            valor={org.responsavel}
            aoAlterar={(valor) => atualizar('responsavel', valor)}
          />
          <CampoInput
            chave="endereco"
            label="Endereço"
            placeholder="ex.: Rua das Flores, 123 — São Paulo/SP"
            valor={org.endereco}
            aoAlterar={(valor) => atualizar('endereco', valor)}
            className="campo-linha-toda"
          />
        </div>

        <div className="campo">
          <span className="campo-rotulo-solto">Logo da instituição</span>
          <div className="configuracoes-logo">
            {org.logo ? (
              <>
                <img src={org.logo} alt="Logo da instituição" />
                <button
                  type="button"
                  className="redes-btn-acao perigo"
                  aria-label="Remover logo"
                  title="Remover logo"
                  onClick={() => atualizar('logo', '')}
                >
                  <TrashIcon size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="redes-filtro-btn"
                  onClick={() => inputLogo.current?.click()}
                >
                  <UploadIcon size={15} />
                  Enviar imagem (PNG/JPG)
                </button>
                <span className="configuracoes-logo-nota">
                  Aparece nas etiquetas (quando habilitado) e nos relatórios.
                </span>
              </>
            )}
            <input
              ref={inputLogo}
              type="file"
              accept="image/*"
              hidden
              onChange={aoEscolherLogo}
            />
          </div>
          {erroLogo && <p className="campo-erro">{erroLogo}</p>}
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ organizacao: org })} />
      </CartaoSecao>

      <CartaoSecao
        icone={BuildingIcon}
        titulo="Preferências regionais"
        descricao="Fuso horário, idioma, formatos de data/hora e unidade de medida."
      >
        <div className="secao-grade">
          <CampoSelect
            chave="fuso"
            label="Fuso horário"
            valor={org.fuso}
            opcoes={FUSOS.map((fuso) => ({ valor: fuso, label: fuso }))}
            aoAlterar={(valor) => atualizar('fuso', valor)}
          />
          <CampoSelect
            chave="idioma"
            label="Idioma"
            valor={org.idioma}
            opcoes={[
              { valor: 'pt-BR', label: 'Português (Brasil)' },
              { valor: 'en-US', label: 'English (US)' },
              { valor: 'es-ES', label: 'Español' },
            ]}
            aoAlterar={(valor) => atualizar('idioma', valor)}
          />
          <CampoSelect
            chave="formatoData"
            label="Formato de data"
            valor={org.formatoData}
            opcoes={FORMATOS_DATA}
            aoAlterar={(valor) => atualizar('formatoData', valor)}
          />
          <CampoSelect
            chave="formatoHora"
            label="Formato de hora"
            valor={org.formatoHora}
            opcoes={FORMATOS_HORA}
            aoAlterar={(valor) => atualizar('formatoHora', valor)}
          />
          <CampoSelect
            chave="unidade"
            label="Unidade de medida"
            valor={org.unidade}
            opcoes={[
              { valor: 'm', label: 'Metros (m)' },
              { valor: 'ft', label: 'Pés (ft)' },
            ]}
            aoAlterar={(valor) => atualizar('unidade', valor)}
          />
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ organizacao: org })} />
      </CartaoSecao>
    </>
  )
}
