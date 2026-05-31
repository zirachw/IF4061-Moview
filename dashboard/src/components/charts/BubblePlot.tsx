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

export default function BubblePlot({ data, filter, mode }: Props) {
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())

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
      const activeGenres = allGenres.filter(g => selectedGenres.size === 0 || selectedGenres.has(g))

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

    const entries = [...genreMap.entries()].filter(([g]) => selectedGenres.size === 0 || selectedGenres.has(g))
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
  }, [data, filter, mode, selectedGenres])

  const title = mode === 'popularity' ? 'Popularity Bubble' : 'Budget vs Profit'

  return (
    <ChartPanel title={title}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
        {/* Genre toggle overlay — only for popularity mode */}
        {mode === 'popularity' && genres.length > 0 && (
          <div style={{
            position: 'absolute', top: 4, right: 6,
            display: 'flex', flexDirection: 'column', gap: '0.12rem',
            maxHeight: '70%', overflowY: 'auto',
          }}>
            {genres.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenres(prev => {
                  const next = new Set(prev)
                  if (next.has(g)) next.delete(g); else next.add(g)
                  return next
                })}
                style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.52rem',
                  padding: '0.06rem 0.3rem', borderRadius: '0.15rem',
                  border: `1px solid ${selectedGenres.has(g) ? genreColor(g) + 'aa' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer',
                  backgroundColor: selectedGenres.has(g) ? genreColor(g) + '28' : 'rgba(10,10,10,0.6)',
                  color: selectedGenres.has(g) ? genreColor(g) : '#9E9589',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.length > 8 ? g.slice(0, 7) + '…' : g}
              </button>
            ))}
          </div>
        )}
      </div>
    </ChartPanel>
  )
}
