import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { getScope } from '../../hooks/useFilter'
import { filterAgg, genreColor, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props {
  data: AppData
  filter: FilterState
  mode: 'popularity' | 'financial'
}

const QUADRANT_LABELS = [
  { x: 0.97, y: 0.97, text: 'Blockbuster', xanchor: 'right' as const, yanchor: 'top' as const },
  { x: 0.03, y: 0.97, text: 'Hidden Gem', xanchor: 'left' as const, yanchor: 'top' as const },
  { x: 0.97, y: 0.03, text: 'Flop', xanchor: 'right' as const, yanchor: 'bottom' as const },
  { x: 0.03, y: 0.03, text: 'Cult Classic', xanchor: 'left' as const, yanchor: 'bottom' as const },
]

const SELECT_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(20,20,20,0.85)',
  color: 'var(--text-secondary)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.25rem',
  padding: '0.15rem 0.35rem',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  cursor: 'pointer',
  outline: 'none',
  maxWidth: '9rem',
}

export default function BubblePlot({ data, filter, mode }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const { traces, genres } = useMemo(() => {
    if (mode === 'popularity') {
      const [yMin, yMax] = filter.yearRange
      const { scope_type, scope_id } = getScope(filter)
      const movies = data.topMovies.filter(m =>
        m.scope_type === scope_type && m.scope_id === scope_id &&
        m.year !== null && m.year >= yMin && m.year <= yMax &&
        m.vote_count > 0 && m.vote_average !== null && m.popularity !== null,
      )

      const byGenre = new Map<string, typeof movies>()
      for (const m of movies) {
        const g = m.primary_genre ?? 'Other'
        if (!byGenre.has(g)) byGenre.set(g, [])
        byGenre.get(g)!.push(m)
      }

      const allGenres = [...byGenre.keys()].sort()
      const activeGenres = allGenres.filter(g => selectedGenre === null || g === selectedGenre)

      const traceList = activeGenres.map(g => {
        const ms = byGenre.get(g)!
        return {
          type: 'scatter' as const,
          mode: 'markers' as const,
          name: g,
          x: ms.map(m => m.vote_count),
          y: ms.map(m => m.vote_average),
          marker: {
            color: genreColor(g),
            size: ms.map(m => Math.sqrt((m.popularity ?? 1)) * 2),
            sizemode: 'diameter' as const,
            sizemin: 3,
            opacity: 0.72,
            line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
          },
          text: ms.map(m => m.title),
          customdata: ms.map(m => (m.popularity ?? 0).toFixed(1)),
          hovertemplate: '<b>%{text}</b><br>Votes: %{x:,}<br>Rating: %{y:.1f}<br>Popularity: %{customdata}<extra></extra>',
        }
      })
      return { traces: traceList, genres: allGenres }
    }

    // Financial mode — per-genre bubble
    const rows = filterAgg(data.financialAgg, filter)
      .filter(r => r.genre !== null && r.budget_count > 0 && r.profit_count > 0)
    const genreMap = new Map<string, { bSum: number; bCnt: number; pSum: number; pCnt: number; fc: number }>()
    for (const r of rows) {
      const g = r.genre!
      const cur = genreMap.get(g) ?? { bSum: 0, bCnt: 0, pSum: 0, pCnt: 0, fc: 0 }
      cur.bSum += r.budget_sum; cur.bCnt += r.budget_count
      cur.pSum += r.profit_sum; cur.pCnt += r.profit_count
      cur.fc += r.film_count
      genreMap.set(g, cur)
    }

    const entries = [...genreMap.entries()].filter(([g]) => selectedGenre === null || g === selectedGenre)
    const traceList = [{
      type: 'scatter' as const,
      mode: 'markers' as const,
      x: entries.map(([, v]) => v.bCnt ? v.bSum / v.bCnt : 0),
      y: entries.map(([, v]) => v.pCnt ? v.pSum / v.pCnt : 0),
      text: entries.map(([g]) => g),
      customdata: entries.map(([, v]) => v.fc),
      marker: {
        color: entries.map(([g]) => genreColor(g)),
        size: entries.map(([, v]) => Math.max(10, Math.sqrt(v.fc) * 3.5)),
        sizemode: 'diameter' as const,
        opacity: 0.82,
        line: { color: 'rgba(0,0,0,0.4)', width: 0.5 },
      },
      hovertemplate: '<b>%{text}</b><br>Avg Budget: $%{x:,.0f}<br>Avg Profit: $%{y:,.0f}<br>Films: %{customdata}<extra></extra>',
    }]
    return { traces: traceList, genres: [...genreMap.keys()].sort() }
  }, [data, filter, mode, selectedGenre])

  const title = mode === 'popularity' ? 'Popularity Bubble' : 'Budget vs Profit'

  const genreSelect = mode === 'popularity' && genres.length > 0 ? (
    <select
      value={selectedGenre ?? ''}
      onChange={e => setSelectedGenre(e.target.value || null)}
      style={{
        ...SELECT_STYLE,
        color: selectedGenre ? genreColor(selectedGenre) : 'var(--text-secondary)',
      }}
    >
      <option value="">All Genres</option>
      {genres.map(g => <option key={g} value={g}>{g}</option>)}
    </select>
  ) : undefined

  return (
    <ChartPanel title={title} right={genreSelect}>
      <Plot
        data={traces}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
          margin: { l: 54, r: 12, t: mode === 'financial' ? 20 : 8, b: 36 },
          showlegend: false,
          xaxis: {
            ...DARK_AXIS,
            title: { text: mode === 'popularity' ? 'Vote Count' : 'Avg Budget', font: { size: 9, color: '#9E9589' } },
            tickformat: mode === 'popularity' ? ',~s' : '$~s',
          },
          yaxis: {
            ...DARK_AXIS,
            title: { text: mode === 'popularity' ? 'Rating' : 'Avg Profit', font: { size: 9, color: '#9E9589' } },
            tickformat: mode === 'financial' ? '$~s' : '.1f',
            zeroline: mode === 'financial',
            zerolinecolor: 'rgba(255,255,255,0.15)',
          },
          ...(mode === 'financial' && {
            annotations: QUADRANT_LABELS.map(q => ({
              x: q.x, y: q.y, xref: 'paper', yref: 'paper',
              text: q.text, xanchor: q.xanchor, yanchor: q.yanchor,
              font: { color: 'rgba(255,255,255,0.18)', size: 9, family: 'Inter, sans-serif' },
              showarrow: false,
            })),
          }),
          hovermode: 'closest',
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
