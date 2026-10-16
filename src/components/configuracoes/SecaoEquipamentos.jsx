// Configurações → Equipamentos: tipos de equipamento personalizados,
// fabricantes mais usados, aviso de garantia a vencer (dias de antecedência)
// e campos personalizados extras.

import { useState } from 'react'
import { ServerIcon } from '../icons'
import { CampoInput } from '../sala/Campo'
import { CartaoSecao, RodapeSecao, ListaSimples } from './UI'

export default function SecaoEquipamentos({ config, onSalvar }) {
  const [equip, setEquip] = useState(() => ({
    ...config.equipamentos,
    tipos: [...(config.equipamentos.tipos || [])],
    fabricantes: [...(config.equipamentos.fabricantes || [])],
    camposPersonalizados: [...(config.equipamentos.camposPersonalizados || [])],
  }))

  return (
    <>
      <CartaoSecao
        icone={ServerIcon}
        titulo="Tipos de equipamento personalizados"
        descricao="Além de Switch, Patch panel, Rack, Máquina, Roteador, Access point, Servidor e Outro."
      >
        <ListaSimples
          itens={equip.tipos}
          onChange={(itens) => setEquip((atual) => ({ ...atual, tipos: itens }))}
          rotuloAdicionar="Adicionar tipo"
          placeholder="ex.: NVR"
        />
        <RodapeSecao onSalvar={() => onSalvar({ equipamentos: equip })} />
      </CartaoSecao>

      <CartaoSecao
        icone={ServerIcon}
        titulo="Fabricantes mais usados"
        descricao="Sugestões de preenchimento no cadastro de equipamentos."
      >
        <ListaSimples
          itens={equip.fabricantes}
          onChange={(itens) =>
            setEquip((atual) => ({ ...atual, fabricantes: itens }))
          }
          rotuloAdicionar="Adicionar fabricante"
          placeholder="ex.: Cisco"
        />
        <RodapeSecao onSalvar={() => onSalvar({ equipamentos: equip })} />
      </CartaoSecao>

      <CartaoSecao
        icone={ServerIcon}
        titulo="Garantia e campos personalizados"
        descricao="Antecedência do aviso de garantia vencendo e nomes de campos extras."
      >
        <div className="secao-grade">
          <CampoInput
            chave="avisoGarantiaDias"
            label="Avisar garantia vencendo (dias antes)"
            tipo="number"
            min="1"
            max="365"
            valor={String(equip.avisoGarantiaDias)}
            aoAlterar={(valor) =>
              setEquip((atual) => ({
                ...atual,
                avisoGarantiaDias: valor,
              }))
            }
          />
        </div>
        <h3 className="configuracoes-subtitulo">Campos personalizados extras</h3>
        <p className="etiquetas-nota">
          Nomes de informações extras que você quer lembrar de preencher no
          cadastro (ex.: "Patrimônio", "Nota fiscal").
        </p>
        <ListaSimples
          itens={equip.camposPersonalizados}
          onChange={(itens) =>
            setEquip((atual) => ({ ...atual, camposPersonalizados: itens }))
          }
          rotuloAdicionar="Adicionar campo"
          placeholder="ex.: Patrimônio"
        />
        <RodapeSecao onSalvar={() => onSalvar({ equipamentos: equip })} />
      </CartaoSecao>
    </>
  )
}
