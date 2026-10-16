// Página "Redes": título + sub-abas "Pontos", "Testes" e "Etiquetas", cada
// uma com URL própria (/redes/pontos, /redes/testes, /redes/etiquetas) — o
// roteamento mínimo vive em utils/rotas.js e o Dashboard repassa a rota.
// Mantém o estado dos testes para as duas telas (tabela e página do ponto).

import { useState } from 'react'
import { navegar } from '../../utils/rotas'
import {
  listarTestes,
  criarTeste,
  editarTeste,
  excluirTeste,
} from '../../utils/testes'
import Pontos from './Pontos'
import PontoDetalhe from './PontoDetalhe'
import PainelPonto from './PainelPonto'
import Testes from './Testes'
import Etiquetas from './Etiquetas'
import TesteDrawer from './TesteDrawer'
import './redes.css'
// Reuso de classes do módulo de racks (.cadeia, .selo-teste, .medicoes) e da
// página da sala (.detalhe-bloco, .detalhe-cabecalho, .detalhe-chip...)
import '../rack/rack.css'
import '../sala/SalaDetalhe.css'

const SUBABAS = [
  { id: 'pontos', label: 'Pontos' },
  { id: 'testes', label: 'Testes' },
  { id: 'etiquetas', label: 'Etiquetas' },
]

export default function Redes({
  salas,
  subaba,
  pontoId,
  onDadosAlterados,
  onMostrarToast,
  onAbrirSalaFoco,
  onGerarEtiquetasDoPonto,
  onGerarEtiquetasLote,
  presetEtiquetas,
  onPresetConsumido,
}) {
  const [testes, setTestes] = useState(() => listarTestes())
  // drawer = null | { pontoId } | { teste } (edição)
  const [drawer, setDrawer] = useState(null)
  // painel lateral do ponto (abre ao clicar numa linha/cartão da lista)
  const [painelPontoId, setPainelPontoId] = useState(null)

  function atualizarTestes() {
    setTestes(listarTestes())
  }

  function aoTrocarSubaba(id) {
    navegar(`/redes/${id}`)
  }

  function abrirDrawerNovoTeste(pontoId = null) {
    setDrawer(pontoId ? { pontoId } : {})
  }

  function abrirDrawerEdicao(teste) {
    setDrawer({ teste })
  }

  function salvarTeste(dados, opcoes, testeId) {
    if (testeId) {
      editarTeste(testeId, dados, opcoes)
      onMostrarToast?.('Teste atualizado com sucesso')
    } else {
      criarTeste(dados, opcoes)
      onMostrarToast?.(
        dados.resultado === 'PASS'
          ? 'Teste PASS registrado'
          : 'Teste FAIL registrado'
      )
    }
    atualizarTestes()
    onDadosAlterados?.()
  }

  function excluirTestePorId(id) {
    excluirTeste(id)
    atualizarTestes()
    onDadosAlterados?.()
    onMostrarToast?.('Teste excluído')
  }

  // Abre a sala (vindo de links do painel do ponto) fechando o painel antes
  function abrirSalaFoco(salaId, foco) {
    setPainelPontoId(null)
    onAbrirSalaFoco?.(salaId, foco)
  }

  function gerarEtiquetasDoPonto(pontoId) {
    setPainelPontoId(null)
    onGerarEtiquetasDoPonto?.(pontoId)
  }

  return (
    <main className="dash-main redes">
      <div className="main-header">
        <div>
          <h1>Redes</h1>
          <p>
            Gerencie pontos de rede, testes de certificação e etiquetas.
          </p>
        </div>
      </div>

      <div className="redes-subabas" role="tablist" aria-label="Seções de Redes">
        {SUBABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={`redes-subaba${subaba === item.id ? ' ativa' : ''}`}
            aria-selected={subaba === item.id}
            onClick={() => aoTrocarSubaba(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {subaba === 'pontos' &&
        (pontoId ? (
          <PontoDetalhe
            salas={salas}
            pontoId={pontoId}
            testes={testes}
            onAbrirSalaFoco={onAbrirSalaFoco}
            onGerarEtiquetas={onGerarEtiquetasDoPonto}
            onRegistrarTeste={abrirDrawerNovoTeste}
            onEditarTeste={abrirDrawerEdicao}
            onExcluirTeste={excluirTestePorId}
            onMostrarToast={onMostrarToast}
            onDadosAlterados={onDadosAlterados}
          />
        ) : (
          <Pontos
            salas={salas}
            testes={testes}
            onMostrarToast={onMostrarToast}
            onDadosAlterados={onDadosAlterados}
            onTestesAlterados={atualizarTestes}
            onAbrirPainel={setPainelPontoId}
            onGerarEtiquetasLote={onGerarEtiquetasLote}
          />
        ))}

      {subaba === 'testes' && (
        <Testes
          salas={salas}
          testes={testes}
          onRegistrarTeste={abrirDrawerNovoTeste}
          onEditarTeste={abrirDrawerEdicao}
          onExcluirTeste={excluirTestePorId}
          onMostrarToast={onMostrarToast}
        />
      )}

      {subaba === 'etiquetas' && (
        <Etiquetas
          salas={salas}
          preset={presetEtiquetas}
          onPresetConsumido={onPresetConsumido}
        />
      )}

      {painelPontoId && (
        <PainelPonto
          salas={salas}
          testes={testes}
          pontoId={painelPontoId}
          onFechar={() => setPainelPontoId(null)}
          onAbrirSalaFoco={abrirSalaFoco}
          onRegistrarTeste={abrirDrawerNovoTeste}
          onGerarEtiquetas={gerarEtiquetasDoPonto}
          onEditarTeste={abrirDrawerEdicao}
          onExcluirTeste={excluirTestePorId}
          onMostrarToast={onMostrarToast}
          onDadosAlterados={onDadosAlterados}
        />
      )}

      {/* O drawer de teste fica por cima do painel do ponto (é aberto a
          partir dele) */}
      {drawer && (
        <TesteDrawer
          salas={salas}
          teste={drawer.teste || null}
          pontoIdInicial={drawer.pontoId || drawer.teste?.pontoId || null}
          onFechar={() => setDrawer(null)}
          onSalvar={salvarTeste}
        />
      )}
    </main>
  )
}
