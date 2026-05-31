import { useMemo, useState } from 'react'
import type { AppData, FilterState } from '../../types'
import { getScope } from '../../hooks/useFilter'
import { genreColor } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

const TIERS = [
  { label: 'Excellent', min: 7.5, max: Infinity, color: '#27AE60' },
  { label: 'Good',      min: 6.5, max: 7.5,     color: '#D4AF37' },
  { label: 'Average',   min: 5.0, max: 6.5,     color: '#E67E22' },
  { label: 'Poor',      min: -Infinity, max: 5.0, color: '#C0392B' },
]

const GRID = 10

const SELECT_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(20,20,20,0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.25rem',
  padding: '0.15rem 0.35rem',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  cursor: 'pointer',
  outline: 'none',
  maxWidth: '9rem',
}

export default function RadialBar({ data, filter }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const { counts, total, genres } = useMemo(() => {
    const [yMin, yMax] = filter.yearRange
    const { scope_type, scope_id } = getScope(filter)
    const allMovies = data.topMovies.filter(m =>
      m.scope_type === scope_type && m.scope_id === scope_id &&
      m.year !== null && m.year >= yMin && m.year <= yMax && m.vote_average !== null,
    )
    const genres = [...new Set(allMovies.map(m => m.primary_genre ?? 'Other'))].sort()
    const movies = selectedGenre
      ? allMovies.filter(m => (m.primary_genre ?? 'Other') === selectedGenre)
      : allMovies
    const counts = TIERS.map(t => ({
      ...t,
      count: movies.filter(m => m.vote_average! >= t.min && m.vote_average! < t.max).length,
    }))
    return { counts, total: movies.length, genres }
  }, [data.topMovies, filter, selectedGenre])

  const cells = GRID * GRID
  const tierCells = counts.map((t, i) => ({
    ...t,
    cells: i < counts.length - 1
      ? Math.round((t.count / total) * cells)
      : cells - counts.slice(0, -1).reduce((s, _, j) => s + Math.round((counts[j].count / total) * cells), 0),
  }))

  const flat: string[] = []
  for (const t of tierCells) for (let i = 0; i < t.cells; i++) flat.push(t.color)
  while (flat.length < cells) flat.push('#1A1512')

  return (
    <ChartPanel
      title="Rating Tiers"
      right={
        genres.length > 0 ? (
          <select
            value={selectedGenre ?? ''}
            onChange={e => setSelectedGenre(e.target.value || null)}
            style={{ ...SELECT_STYLE, color: selectedGenre ? genreColor(selectedGenre) : 'var(--text-secondary)' }}
          >
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        ) : undefined
      }
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '0.5rem', padding: '0.5rem',
      }}>
        <svg
          viewBox={`0 0 ${GRID * 11} ${GRID * 11}`}
          style={{ width: '100%', maxWidth: `${GRID * 18}px`, flex: 1 }}
        >
          {flat.map((color, i) => {
            const row = Math.floor(i / GRID)
            const col = i % GRID
            return (
              <rect
                key={i}
                x={col * 11}
                y={row * 11}
                width={10}
                height={10}
                rx={1}
                fill={color}
                fillOpacity={color === '#1A1512' ? 0.3 : 0.85}
              />
            )
          })}
        </svg>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem 0.9rem' }}>
          {counts.map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: t.color }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#9E9589' }}>
                {t.label}
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6rem', color: '#F5F0E8' }}>
                {total > 0 ? `${Math.round((t.count / total) * 100)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartPanel>
  )
}
