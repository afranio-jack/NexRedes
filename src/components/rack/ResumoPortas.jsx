// Resumo de portas no topo da página do equipamento:
// total, em uso, livres, com falha e porcentagem de ocupação.

export default function ResumoPortas({ resumo }) {
  return (
    <div className="resumo-portas">
      <div className="resumo-item">
        <span>Total de portas</span>
        <strong>{resumo.total}</strong>
      </div>
      <div className="resumo-item">
        <span>Em uso</span>
        <strong>{resumo.emUso}</strong>
      </div>
      <div className="resumo-item">
        <span>Livres</span>
        <strong>{resumo.livres}</strong>
      </div>
      <div className="resumo-item">
        <span>Com falha</span>
        <strong>{resumo.comFalha}</strong>
      </div>
      <div className="resumo-item resumo-ocupacao">
        <span>Ocupação</span>
        <strong>{resumo.ocupacao}%</strong>
        <div className="rack-barra" aria-hidden="true">
          <div
            className="rack-barra-fill"
            style={{ width: `${resumo.ocupacao}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
