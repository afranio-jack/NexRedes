// Configurações → Testes de certificação: critérios de PASS/FAIL (comprimento
// máximo, atenuação, perda de retorno, NEXT), campos obrigatórios no registro
// (aplicados no drawer de teste), lista de responsáveis/técnicos (sugestões)
// e a norma padrão.

import { useState } from 'react'
import { ClipboardCheckIcon } from '../icons'
import { CampoInput, CampoSelect } from '../sala/Campo'
import { CartaoSecao, RodapeSecao, ListaSimples } from './UI'
import { NORMAS } from '../../utils/testes'

export default function SecaoTestes({ config, onSalvar }) {
  const [testes, setTestes] = useState(() => ({
    ...config.testes,
    criterios: { ...config.testes.criterios },
    camposObrigatorios: { ...config.testes.camposObrigatorios },
    responsaveis: [...(config.testes.responsaveis || [])],
  }))

  const CAMPOS_OBRIGATORIOS = [
    { id: 'comprimentoM', label: 'Comprimento (m)' },
    { id: 'mapaFios', label: 'Mapa de fios' },
    { id: 'atenuacao', label: 'Atenuação (dB)' },
    { id: 'next', label: 'NEXT (dB)' },
    { id: 'perdaRetorno', label: 'Perda de retorno (dB)' },
  ]

  return (
    <>
      <CartaoSecao
        icone={ClipboardCheckIcon}
        titulo="Critérios de PASS/FAIL"
        descricao="Valores de referência usados na avaliação dos testes de certificação."
      >
        <div className="secao-grade">
          <CampoInput
            chave="comprimentoMax"
            label="Comprimento máximo (m)"
            tipo="number"
            min="0"
            valor={String(testes.criterios.comprimentoMax)}
            aoAlterar={(valor) =>
              setTestes((atual) => ({
                ...atual,
                criterios: { ...atual.criterios, comprimentoMax: valor },
              }))
            }
          />
          <CampoInput
            chave="atenuacaoMax"
            label="Atenuação máxima (dB)"
            tipo="number"
            min="0"
            step="0.1"
            valor={String(testes.criterios.atenuacaoMax)}
            aoAlterar={(valor) =>
              setTestes((atual) => ({
                ...atual,
                criterios: { ...atual.criterios, atenuacaoMax: valor },
              }))
            }
          />
          <CampoInput
            chave="perdaRetornoMax"
            label="Perda de retorno máxima (dB)"
            tipo="number"
            min="0"
            step="0.1"
            valor={String(testes.criterios.perdaRetornoMax)}
            aoAlterar={(valor) =>
              setTestes((atual) => ({
                ...atual,
                criterios: { ...atual.criterios, perdaRetornoMax: valor },
              }))
            }
          />
          <CampoInput
            chave="nextMin"
            label="NEXT mínimo (dB)"
            tipo="number"
            min="0"
            step="0.1"
            valor={String(testes.criterios.nextMin)}
            aoAlterar={(valor) =>
              setTestes((atual) => ({
                ...atual,
                criterios: { ...atual.criterios, nextMin: valor },
              }))
            }
          />
        </div>
        <p className="etiquetas-nota">
          Os valores servem de referência para o técnico avaliar o resultado
          registrado no drawer de teste.
        </p>
        <RodapeSecao onSalvar={() => onSalvar({ testes })} />
      </CartaoSecao>

      <CartaoSecao
        icone={ClipboardCheckIcon}
        titulo="Registro de testes"
        descricao="Campos obrigatórios ao registrar um teste, responsáveis sugeridos e a norma padrão."
      >
        <h3 className="configuracoes-subtitulo">Campos obrigatórios no registro</h3>
        <div className="configuracoes-checks">
          {CAMPOS_OBRIGATORIOS.map((campo) => (
            <label key={campo.id} className="redes-check">
              <input
                type="checkbox"
                checked={Boolean(testes.camposObrigatorios[campo.id])}
                onChange={(evento) =>
                  setTestes((atual) => ({
                    ...atual,
                    camposObrigatorios: {
                      ...atual.camposObrigatorios,
                      [campo.id]: evento.target.checked,
                    },
                  }))
                }
              />
              {campo.label}
            </label>
          ))}
        </div>

        <h3 className="configuracoes-subtitulo">Responsáveis/técnicos</h3>
        <ListaSimples
          itens={testes.responsaveis}
          onChange={(itens) =>
            setTestes((atual) => ({ ...atual, responsaveis: itens }))
          }
          rotuloAdicionar="Adicionar responsável"
          placeholder="ex.: Ana Souza"
        />

        <div className="secao-grade">
          <CampoSelect
            chave="normaPadrao"
            label="Norma padrão"
            valor={testes.normaPadrao}
            opcoes={NORMAS.map((norma) => ({ valor: norma, label: norma }))}
            aoAlterar={(valor) =>
              setTestes((atual) => ({ ...atual, normaPadrao: valor }))
            }
          />
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ testes })} />
      </CartaoSecao>
    </>
  )
}
