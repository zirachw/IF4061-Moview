import { useRef } from 'react'
import type { TabId } from '../../types'

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const SLANT = 18
const EDGE_COLOR = 'rgba(255,255,255,0.58)'

const TABS: { id: TabId; label: string }[] = [
  { id: 'popularity', label: 'POPULARITY' },
  { id: 'financial',  label: 'FINANCIAL'  },
  { id: 'genre',      label: 'GENRE'      },
  { id: 'people',     label: 'PEOPLE'     },
]

const SHAPES: Record<TabId, string> = {
  popularity: `polygon(${SLANT}px 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`,
  financial:  `polygon(${SLANT}px 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`,
  genre:      `polygon(${SLANT}px 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`,
  people:     `polygon(${SLANT}px 0, 100% 0, 100% 100%, 0 100%)`,
}

const LOGO_SHAPE = `polygon(0 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`

function RightEdge() {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        right: SLANT,
        width: '1px',
        height: '100%',
        backgroundColor: EDGE_COLOR,
        transform: `skewX(-${Math.atan(SLANT / 44) * (180 / Math.PI)}deg)`,
        transformOrigin: 'bottom center',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  )
}

export default function Clapperboard({ activeTab, onTabChange }: Props) {
  const btnRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    popularity: null, financial: null, genre: null, people: null,
  })

  function handleTabClick(id: TabId) {
    const btn = btnRefs.current[id]
    if (btn) {
      btn.style.transition = 'none'
      btn.style.transform = 'scaleY(0.82)'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        btn.style.transition = 'transform 110ms ease-out'
        btn.style.transform = 'scaleY(1)'
      }))
    }
    onTabChange(id)
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        height: 'var(--nav-h)',
        border: '1px solid var(--film-edge)',
        backgroundColor: 'var(--bg-theater)',
      }}
    >
      <div
        style={{
          flex: '0 0 10rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          clipPath: LOGO_SHAPE,
          backgroundColor: 'var(--bg-card)',
          flexShrink: 0,
          paddingRight: `${SLANT}px`,
        }}
      >
        <span
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: '1.25rem',
            color: 'var(--gold)',
            letterSpacing: '0.06em',
            userSelect: 'none',
          }}
        >
          MOVIEW
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'visible', position: 'relative' }}>
        {TABS.map(({ id, label }, i) => {
          const isActive = id === activeTab
          const isLast = i === TABS.length - 1
          return (
            <button
              key={id}
              ref={el => { btnRefs.current[id] = el }}
              onClick={() => handleTabClick(id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                clipPath: SHAPES[id],
                background: isActive ? '#E0E0E0' : 'var(--bg-theater)',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
                position: 'relative',
                marginLeft: `-${SLANT}px`,
                paddingInline: `${SLANT + 4}px`,
                zIndex: isActive ? 4 : 2,
                transition: 'transform 110ms ease-out, background-color 110ms ease-out',
              }}
            >
              {!isLast && <RightEdge />}
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.08em',
                  color: isActive ? '#111111' : 'var(--text-secondary)',
                  transition: 'color 110ms',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
