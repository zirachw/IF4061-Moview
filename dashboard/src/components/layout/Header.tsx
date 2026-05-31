export default function Header() {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem 2rem',
        background: 'linear-gradient(to bottom, rgba(10,10,10,0.85) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 'clamp(1.5rem, 3vw, 3rem)',
          color: 'var(--gold)',
          letterSpacing: '0.04em',
        }}
      >
        MOVIEW
      </span>
    </header>
  )
}
