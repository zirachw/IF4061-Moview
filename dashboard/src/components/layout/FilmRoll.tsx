import type { ReactNode } from 'react'

const STRIP_W = '3rem'
const HOLE_W = '1.125rem'
const HOLE_H = '0.75rem'
const HOLE_GAP = '1.25rem'
const HOLE_COUNT = 40
const BOTTOM_STRIP_H = '1.25rem'

function SprocketStrip() {
  return (
    <div
      style={{
        width: STRIP_W,
        flexShrink: 0,
        backgroundColor: 'var(--film-edge)',
        overflow: 'hidden',
      }}
      aria-hidden
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: HOLE_GAP,
        }}
      >
        {Array.from({ length: HOLE_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              width: HOLE_W,
              height: HOLE_H,
              borderRadius: '0.15rem',
              backgroundColor: 'rgba(255,255,255,0.18)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function BottomStrip() {
  return (
    <div
      aria-hidden
      style={{
        height: BOTTOM_STRIP_H,
        flexShrink: 0,
        backgroundColor: 'var(--film-edge)',
      }}
    />
  )
}

export default function FilmRoll({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--film-edge)',
        overflow: 'hidden',
      }}
    >
      <div style={{ minHeight: 0, flex: 1, display: 'flex' }}>
        <SprocketStrip />

        <div
          style={{
            minWidth: 0,
            height: '100%',
            flex: 1,
            backgroundColor: '#F5F0E8',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>

        <SprocketStrip />
      </div>

      <BottomStrip />
    </div>
  )
}
