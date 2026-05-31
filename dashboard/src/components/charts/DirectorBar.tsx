import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState, PeopleEntityType } from '../../types'
import { filterAgg, fmtCount, genreColor, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

const ENTITY_COLORS: Record<string, string> = {
  director: '#D4AF37',
  studio:   '#2980B9',
  cast:     '#E8607A',
}

const FILTER_BTN = (active: boolean, color: string): React.CSSProperties => ({
  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem',
  padding: '0.1rem 0.35rem', borderRadius: '0.18rem',
  border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.12)'}`,
  cursor: 'pointer',
  backgroundColor: active ? color + '22' : 'transparent',
  color: active ? color : '#9E9589',
})

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

export default function DirectorBar({ data, filter }: Props) {
  const [entityType, setEntityType] = useState<PeopleEntityType>('director')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const { bars, barColors, barGenres, genres } = useMemo(() => {
    const allRows = filterAgg(data.peopleAgg, filter).filter(r => r.entity_type === entityType)
    const genres = [...new Set(allRows.map(r => r.genre).filter(Boolean) as string[])].sort()
    const rows = selectedGenre ? allRows.filter(r => r.genre === selectedGenre) : allRows
    const entityMap = new Map<string, number>()
    const entityGenreMap = new Map<string, Map<string, number>>()
    for (const r of rows) {
      entityMap.set(r.name, (entityMap.get(r.name) ?? 0) + r.film_count)
      if (r.genre) {
        const gm = entityGenreMap.get(r.name) ?? new Map<string, number>()
        gm.set(r.genre, (gm.get(r.genre) ?? 0) + r.film_count)
        entityGenreMap.set(r.name, gm)
      }
    }
    const bars = [...entityMap.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[1] - b[1])
      .slice(-15)
    const fallback = ENTITY_COLORS[entityType]
    const barColors: string[] = []
    const barGenres: string[] = []
    for (const [name] of bars) {
      const gm = entityGenreMap.get(name)
      const dominant = gm ? ([...gm.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) : null
      const genre = selectedGenre ?? dominant
      barGenres.push(genre ?? '—')
      barColors.push(genre ? genreColor(genre) : fallback)
    }
    return { bars, barColors, barGenres, genres }
  }, [data.peopleAgg, filter, entityType, selectedGenre])

  return (
    <ChartPanel
      title="Top Entities"
      noData={bars.length === 0}
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {(['director', 'studio', 'cast'] as PeopleEntityType[]).map(et => (
              <button key={et} type="button" onClick={() => { setEntityType(et); setSelectedGenre(null) }}
                style={FILTER_BTN(entityType === et, ENTITY_COLORS[et])}>
                {et}
              </button>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', userSelect: 'none' }}>│</span>
          {genres.length > 0 && (
            <select
              value={selectedGenre ?? ''}
              onChange={e => setSelectedGenre(e.target.value || null)}
              style={{ ...SELECT_STYLE, color: selectedGenre ? genreColor(selectedGenre) : 'var(--text-secondary)' }}
            >
              <option value="">All Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
        </div>
      }
    >
      <Plot
        data={[{
          type: 'bar',
          orientation: 'h',
          x: bars.map(([, v]) => v),
          y: bars.map(([n]) => n.length > 22 ? n.slice(0, 20) + '…' : n),
          marker: {
            color: barColors,
            opacity: 0.8,
            line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
          },
          text: bars.map(([, v]) => fmtCount(v)),
          customdata: barGenres,
          textposition: 'outside',
          textfont: { color: '#9E9589', size: 8 },
          cliponaxis: false,
          hovertemplate: '<b>%{y}</b><br>%{text} films<br>%{customdata}<extra></extra>',
        }]}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
          margin: { l: 110, r: 56, t: 8, b: 8 },
          xaxis: { ...DARK_AXIS, showgrid: false, showticklabels: false, zeroline: false },
          yaxis: { ...DARK_AXIS, showgrid: false, tickfont: { color: '#F5F0E8', size: 9 } },
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
