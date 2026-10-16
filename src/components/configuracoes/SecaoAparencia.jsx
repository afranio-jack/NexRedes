// Configurações → Aparência: tema claro/escuro/automático, cor de destaque,
// tamanho da fonte, densidade (confortável/compacta) e tela inicial ao
// entrar. Aplicado no Dashboard, lendo a configuração salva.

import { useState } from 'react'
import { PaletteIcon, SunIcon, MoonIcon } from '../icons'
import { CampoSelect } from '../sala/Campo'
import { CartaoSecao, RodapeSecao } from './UI'

export default function SecaoAparencia({ config, onSalvar }) {
  const [aparencia, setAparencia] = useState(() => ({
    ...config.aparencia,
  }))

  function atualizar(chave, valor) {
    setAparencia((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <>
      <CartaoSecao
        icone={PaletteIcon}
        titulo="Tema"
        descricao="Claro, escuro ou automático (segue o sistema)."
      >
        <div className="etiquetas-orientacao" role="radiogroup" aria-label="Tema">
          <button
            type="button"
            className={aparencia.tema === 'claro' ? 'ativo' : ''}
            aria-pressed={aparencia.tema === 'claro'}
            onClick={() => atualizar('tema', 'claro')}
          >
            <SunIcon size={15} />
            Claro
          </button>
          <button
            type="button"
            className={aparencia.tema === 'escuro' ? 'ativo' : ''}
            aria-pressed={aparencia.tema === 'escuro'}
            onClick={() => atualizar('tema', 'escuro')}
          >
            <MoonIcon size={15} />
            Escuro
          </button>
          <button
            type="button"
            className={aparencia.tema === 'auto' ? 'ativo' : ''}
            aria-pressed={aparencia.tema === 'auto'}
            onClick={() => atualizar('tema', 'auto')}
          >
            Automático
          </button>
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ aparencia })} />
      </CartaoSecao>

      <CartaoSecao
        icone={PaletteIcon}
        titulo="Cor de destaque e fonte"
        descricao="Cor usada nos botões e destaques, tamanho da fonte e densidade da tela."
      >
        <div className="secao-grade">
          <div className="campo">
            <span className="campo-rotulo-solto">Cor de destaque</span>
            <div className="configuracoes-cor">
              <input
                type="color"
                className="campo-cor"
                value={aparencia.corDestaque || '#2563eb'}
                aria-label="Cor de destaque"
                onChange={(evento) => atualizar('corDestaque', evento.target.value)}
              />
              <button
                type="button"
                className="redes-filtro-btn"
                onClick={() => atualizar('corDestaque', '')}
              >
                Usar padrão
              </button>
            </div>
          </div>
          <CampoSelect
            chave="tamanhoFonte"
            label="Tamanho da fonte"
            valor={aparencia.tamanhoFonte}
            opcoes={[
              { valor: 'pequena', label: 'Pequena (95%)' },
              { valor: 'padrao', label: 'Padrão (100%)' },
              { valor: 'grande', label: 'Grande (105%)' },
            ]}
            aoAlterar={(valor) => atualizar('tamanhoFonte', valor)}
          />
          <CampoSelect
            chave="densidade"
            label="Densidade"
            valor={aparencia.densidade}
            opcoes={[
              { valor: 'confortavel', label: 'Confortável' },
              { valor: 'compacta', label: 'Compacta' },
            ]}
            aoAlterar={(valor) => atualizar('densidade', valor)}
          />
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ aparencia })} />
      </CartaoSecao>

      <CartaoSecao
        icone={PaletteIcon}
        titulo="Tela inicial"
        descricao="Tela exibida ao entrar no aplicativo (enquanto a URL for a raiz)."
      >
        <div className="secao-grade">
          <CampoSelect
            chave="telaInicial"
            label="Abrir ao entrar"
            valor={aparencia.telaInicial}
            opcoes={[
              { valor: 'salas', label: 'Salas' },
              { valor: 'redes', label: 'Redes' },
              { valor: 'relatorios', label: 'Relatórios' },
            ]}
            aoAlterar={(valor) => atualizar('telaInicial', valor)}
          />
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ aparencia })} />
      </CartaoSecao>
    </>
  )
}
