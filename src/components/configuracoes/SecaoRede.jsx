// Configurações → Rede: padrões da rede — categorias de cabo (com cor e
// comprimento máximo), categorias de pontos (com cor), status de ponto e de
// equipamento (nomes e cores), faixas de VLAN/IP por sala ou setor e o
// número padrão de portas de patch panel e switch.

import { useState } from 'react'
import { NetworkIcon } from '../icons'
import { CampoSelect } from '../sala/Campo'
import { CartaoSecao, RodapeSecao, ListaEditavel } from './UI'

const COLUNAS_CABO = [
  { chave: 'nome', label: 'Categoria', placeholder: 'ex.: Cat6' },
  { chave: 'cor', label: 'Cor', tipo: 'color' },
  { chave: 'comprimentoMax', label: 'Comprimento máx. (m)', placeholder: 'ex.: 100' },
]

const COLUNAS_PONTO = [
  { chave: 'nome', label: 'Categoria do ponto', placeholder: 'ex.: Dados' },
  {
    chave: 'icone',
    label: 'Ícone',
    tipo: 'select',
    opcoes: [
      { valor: 'plug', label: 'Tomada' },
      { valor: 'wifi', label: 'Wi-Fi' },
      { valor: 'camera', label: 'Câmera' },
      { valor: 'phone', label: 'Telefone' },
      { valor: 'printer', label: 'Impressora' },
      { valor: 'box', label: 'Caixa' },
    ],
  },
  { chave: 'cor', label: 'Cor', tipo: 'color' },
]

const COLUNAS_STATUS = [
  { chave: 'nome', label: 'Nome', placeholder: 'ex.: Operacional' },
  { chave: 'cor', label: 'Cor', tipo: 'color' },
]

const COLUNAS_VLAN = [
  { chave: 'nome', label: 'Sala/setor', placeholder: 'ex.: Secretaria' },
  { chave: 'vlan', label: 'VLAN', placeholder: 'ex.: 10' },
  { chave: 'ip', label: 'Faixa de IP', placeholder: 'ex.: 192.168.10.0/24' },
]

export default function SecaoRede({ config, onSalvar }) {
  const [rede, setRede] = useState(() => ({
    ...config.rede,
    faixasVlan: [...(config.rede.faixasVlan || [])],
    categoriasCabo: [...(config.rede.categoriasCabo || [])],
    categoriasPonto: [...(config.rede.categoriasPonto || [])],
    statusPonto: [...(config.rede.statusPonto || [])],
    statusEquipamento: [...(config.rede.statusEquipamento || [])],
  }))

  function atualizar(chave, valor) {
    setRede((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <>
      <CartaoSecao
        icone={NetworkIcon}
        titulo="Categorias de cabo"
        descricao="Categorias usadas nos pontos de rede e portas (nome, cor e comprimento máximo de referência)."
      >
        <ListaEditavel
          colunas={COLUNAS_CABO}
          itens={rede.categoriasCabo}
          onChange={(itens) => atualizar('categoriasCabo', itens)}
          rotuloAdicionar="Adicionar categoria"
          vazio="Nenhuma categoria de cabo cadastrada."
        />
        <RodapeSecao onSalvar={() => onSalvar({ rede })} />
      </CartaoSecao>

      <CartaoSecao
        icone={NetworkIcon}
        titulo="Categorias de pontos"
        descricao="Tipos de ponto de rede por finalidade (dados, voz, Wi-Fi, câmera...)."
      >
        <ListaEditavel
          colunas={COLUNAS_PONTO}
          itens={rede.categoriasPonto}
          onChange={(itens) => atualizar('categoriasPonto', itens)}
          rotuloAdicionar="Adicionar categoria"
          vazio="Nenhuma categoria de ponto cadastrada."
        />
        <RodapeSecao onSalvar={() => onSalvar({ rede })} />
      </CartaoSecao>

      <CartaoSecao
        icone={NetworkIcon}
        titulo="Status de ponto e de equipamento"
        descricao="Nomes e cores dos status usados na tela Equipamentos e nos relatórios."
      >
        <h3 className="configuracoes-subtitulo">Status de ponto</h3>
        <ListaEditavel
          colunas={COLUNAS_STATUS}
          itens={rede.statusPonto}
          onChange={(itens) => atualizar('statusPonto', itens)}
          rotuloAdicionar="Adicionar status"
        />
        <h3 className="configuracoes-subtitulo">Status de equipamento</h3>
        <ListaEditavel
          colunas={COLUNAS_STATUS}
          itens={rede.statusEquipamento}
          onChange={(itens) => atualizar('statusEquipamento', itens)}
          rotuloAdicionar="Adicionar status"
        />
        <RodapeSecao onSalvar={() => onSalvar({ rede })} />
      </CartaoSecao>

      <CartaoSecao
        icone={NetworkIcon}
        titulo="Faixas de VLAN/IP por sala ou setor"
        descricao="Padrões de segmentação anotados por sala/setor, para consulta nos cadastros."
      >
        <ListaEditavel
          colunas={COLUNAS_VLAN}
          itens={rede.faixasVlan}
          onChange={(itens) => atualizar('faixasVlan', itens)}
          rotuloAdicionar="Adicionar faixa"
          vazio="Nenhuma faixa cadastrada."
        />
        <RodapeSecao onSalvar={() => onSalvar({ rede })} />
      </CartaoSecao>

      <CartaoSecao
        icone={NetworkIcon}
        titulo="Portas por equipamento"
        descricao="Número padrão de portas sugerido ao criar patch panels e switches."
      >
        <div className="secao-grade">
          <CampoSelect
            chave="portasPadraoPatchPanel"
            label="Portas por patch panel"
            valor={rede.portasPadraoPatchPanel}
            opcoes={['12', '24', '48'].map((n) => ({ valor: n, label: `${n} portas` }))}
            aoAlterar={(valor) => atualizar('portasPadraoPatchPanel', valor)}
          />
          <CampoSelect
            chave="portasPadraoSwitch"
            label="Portas por switch"
            valor={rede.portasPadraoSwitch}
            opcoes={['12', '24', '48'].map((n) => ({ valor: n, label: `${n} portas` }))}
            aoAlterar={(valor) => atualizar('portasPadraoSwitch', valor)}
          />
        </div>
        <RodapeSecao onSalvar={() => onSalvar({ rede })} />
      </CartaoSecao>
    </>
  )
}
