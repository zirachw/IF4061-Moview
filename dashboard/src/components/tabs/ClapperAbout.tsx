const BOARD_BORDER = '1px solid #1a1a1a'

const LBL: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.55rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#555',
  textTransform: 'uppercase' as const,
  lineHeight: 1,
  display: 'block',
  marginBottom: '0.28rem',
}

const VAL: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.8rem',
  color: '#111',
  lineHeight: 1.35,
  display: 'block',
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ padding: '0.45rem 0.75rem', ...(last ? {} : { borderBottom: BOARD_BORDER }) }}>
      <span style={LBL}>{label}</span>
      <span style={VAL}>{value}</span>
    </div>
  )
}

function Cell({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <div style={{ flex, padding: '0.4rem 0.75rem' }}>
      <span style={LBL}>{label}</span>
      <span style={VAL}>{value}</span>
    </div>
  )
}

const VDiv = () => <div style={{ width: '1px', backgroundColor: '#1a1a1a', flexShrink: 0 }} />

export default function ClapperAbout() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        width: 'min(520px, 90%)',
        backgroundColor: '#F5F0E8',
        border: '2px solid #1a1a1a',
        borderRadius: '1px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>
        <Row label="PROD." value="Moview" />
        <Row label="DIRECTOR" value="Dessi Puji Lestari, S.T, M.Eng., Ph.D." />
        <div style={{ display: 'flex', borderBottom: BOARD_BORDER }}>
          <Cell label="SCENE" value="IF4061" />
          <VDiv />
          <Cell label="TAKE" value="Tubes 2" />
          <VDiv />
          <Cell label="ROLL" value="G01" />
        </div>
        <div style={{ display: 'flex', borderBottom: BOARD_BORDER }}>
          <Cell label="DATE" value="2025/2026" />
          <VDiv />
          <Cell label="GRAPHIC" value="Interactive Visualization" flex={1.5} />
        </div>
        <Row label="DATASET" value="Kaggle TMDB Film" last />
      </div>
    </div>
  )
}
