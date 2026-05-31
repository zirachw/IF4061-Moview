const BORDER = '1px solid rgba(0,0,0,0.18)'

const LBL: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#666',
  textTransform: 'uppercase' as const,
  lineHeight: 1,
  display: 'block',
  marginBottom: '0.5rem',
}

const VAL: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '1.35rem',
  color: '#111',
  lineHeight: 1.2,
  display: 'block',
}

function Row({ label, value, children }: { label?: string; value?: string; children?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', borderBottom: BORDER, minHeight: '5rem' }}>
      {children ?? (
        <div style={{ flex: 1, padding: '1rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={LBL}>{label}</span>
          <span style={VAL}>{value}</span>
        </div>
      )}
    </div>
  )
}

function Cell({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <div style={{ flex, padding: '1rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <span style={LBL}>{label}</span>
      <span style={VAL}>{value}</span>
    </div>
  )
}

const VDiv = () => <div style={{ width: '1px', backgroundColor: 'rgba(0,0,0,0.18)', flexShrink: 0 }} />

export default function ClapperAbout() {
  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      backgroundColor: '#F5F0E8',
      display: 'flex',
      flexDirection: 'column',
      border: BORDER,
    }}>
      <Row>
        <Cell label="PRODUCTION" value="Moview" />
        <VDiv />
        <Cell label="ROLL" value="G01" />
      </Row>
      <Row label="DIRECTOR" value="Dessi Puji Lestari, S.T, M.Eng., Ph.D." />
      <Row>
        <Cell label="SCENE" value="IF4061 Data Visualization" />
        <VDiv />
        <Cell label="TAKE" value="Tubes 2" />
        <VDiv />
        <Cell label="DATE" value="2025/2026" />
      </Row>
      <Row label="GRAPHIC" value="Interactive Dashboard" />
      <div style={{ flex: 1, display: 'flex', minHeight: '5rem' }}>
        <Cell label="DATASET" value="TMDB Film" />
        <VDiv />
        <Cell label="TECH STACK" value="React, Plotly.js, Cloudflare (D1, Functions, Pages)" flex={1.5} />
      </div>
    </div>
  )
}
