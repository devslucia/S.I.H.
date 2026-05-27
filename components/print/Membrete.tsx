export function Membrete() {
  return (
    <div className="print-only" style={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: '2px solid #000',
      paddingBottom: '8px',
      marginBottom: '16px'
    }}>
      <div style={{ fontSize: '28px', marginRight: '12px' }}>✚</div>
      <div>
        <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>
          SANATORIO SIMES
        </div>
        <div style={{ fontSize: '9pt' }}>
          Córdoba N° 2344 — Posadas, Misiones
        </div>
        <div style={{ fontSize: '9pt' }}>
          Tel: 03765-430280 / 430283
        </div>
      </div>
    </div>
  )
}
