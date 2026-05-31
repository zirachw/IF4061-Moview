import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { getScope } from '../../hooks/useFilter'
import { genreColor, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

type Metric = 'popularity' | 'rating' | 'votes'

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

export default function TopFilmsBar({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>('popularity')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const { bars, genres } = useMemo(() => {
    const [yMin, yMax] = filter.yearRange
    const { scope_type, scope_id } = getScope(filter)
    const allMovies = data.topMovies.filter(m =>
      m.scope_type === scope_type && m.scope_id === scope_id &&
      m.year !== null && m.year >= yMin && m.year <= yMax,
    )

    const genreList = [...new Set(allMovies.map(m => m.primary_genre ?? 'Other'))].sort()

    const movies = selectedGenre
      ? allMovies.filter(m => (m.primary_genre ?? 'Other') === selectedGenre)
      : allMovies

    const getValue = (m: typeof movies[0]) =>
      metric === 'popularity' ? (m.popularity ?? 0)
      : metric === 'rating' ? (m.vote_average ?? 0)
      : m.vote_count

    const topBars = movies
      .filter(m => getValue(m) > 0)
      .sort((a, b) => getValue(b) - getValue(a))
      .slice(0, 15)
      .reverse()

    return { bars: topBars, genres: genreList }
  }, [data.topMovies, filter, metric, selectedGenre])

  const xLabel = metric === 'popularity' ? 'Popularity Score'
    : metric === 'rating' ? 'Avg Rating'
    : 'Vote Count'

  return (
    <ChartPanel
      title="Top Films"
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
      metric={metric}
      metrics={[
        { value: 'popularity', label: 'Pop.' },
        { value: 'rating', label: 'Rating' },
        { value: 'votes', label: 'Votes' },
      ]}
      onMetric={setMetric}
    >
      <Plot
        data={[{
          type: 'bar',
          orientation: 'h',
          x: bars.map(m =>
            metric === 'popularity' ? m.popularity
            : metric === 'rating' ? m.vote_average
            : m.vote_count,
          ),
          y: bars.map(m => m.title.length > 28 ? m.title.slice(0, 26) + '…' : m.title),
          marker: {
            color: bars.map(m => genreColor(m.primary_genre)),
            opacity: 0.85,
            line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
          },
          text: bars.map(m =>
            metric === 'popularity' ? (m.popularity ?? 0).toFixed(1)
            : metric === 'rating' ? `★ ${(m.vote_average ?? 0).toFixed(1)}`
            : m.vote_count.toLocaleString(),
          ),
          textposition: 'outside',
          textfont: { color: '#9E9589', size: 8 },
          cliponaxis: false,
          hovertemplate: '<b>%{y}</b> (%{x})<extra></extra>',
        }]}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
          margin: { l: 150, r: 56, t: 8, b: 8 },
          xaxis: {
            ...DARK_AXIS,
            showgrid: false, showticklabels: false, zeroline: false,
            title: { text: xLabel, font: { size: 9, color: '#9E9589' } },
          },
          yaxis: {
            ...DARK_AXIS, showgrid: false, tickfont: { color: '#F5F0E8', size: 8 },
            tickmode: 'array',
            tickvals: bars.map(m => m.title.length > 28 ? m.title.slice(0, 26) + '…' : m.title),
            ticktext: bars.map(m => m.title.length > 28 ? m.title.slice(0, 26) + '…' : m.title),
          },
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
