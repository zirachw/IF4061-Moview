import { useMemo } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

export default function CooccurrenceHeatmap({ data, filter }: Props) {
  const { genres, matrix } = useMemo(() => {
    const rows = filterAgg(data.genrePairAgg, filter)
    const pairMap = new Map<string, number>()
    for (const r of rows) {
      const key = [r.genre_a, r.genre_b].sort().join('|')
      pairMap.set(key, (pairMap.get(key) ?? 0) + r.film_count)
    }

    const genreSet = new Set<string>()
    for (const r of rows) { genreSet.add(r.genre_a); genreSet.add(r.genre_b) }

    const genresByCount = [...genreSet].map(g => {
      let total = 0
      for (const [key, v] of pairMap) if (key.includes(g)) total += v
      return { g, total }
    }).sort((a, b) => b.total - a.total).slice(0, 12).map(x => x.g)

    const n = genresByCount.length
    const mat: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const key = [genresByCount[i], genresByCount[j]].sort().join('|')
        mat[i][j] = pairMap.get(key) ?? 0
      }
    }
    return { genres: genresByCount, matrix: mat }
  }, [data.genrePairAgg, filter])

  if (!genres.length) return <ChartPanel title="Genre Co-occurrence"><div style={{ color: '#4A4540', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.75rem' }}>No data</div></ChartPanel>

  return (
    <ChartPanel title="Genre Co-occurrence">
      <Plot
        data={[{
          type: 'heatmap',
          z: matrix,
          x: genres,
          y: genres,
          colorscale: [
            [0, 'rgba(0,0,0,0)'],
            [0.01, 'rgba(26,18,14,0.9)'],
            [0.3, 'rgba(212,175,55,0.35)'],
            [1, 'rgba(212,175,55,0.95)'],
          ],
          showscale: false,
          hovertemplate: '<b>%{x}</b> + <b>%{y}</b><br>%{z} films<extra></extra>',
        }]}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 9 },
          margin: { l: 80, r: 8, t: 80, b: 8 },
          xaxis: {
            tickfont: { color: '#9E9589', size: 8 }, tickangle: 40,
            side: 'top',
            showgrid: false, linecolor: 'rgba(255,255,255,0.08)',
            color: '#9E9589', automargin: true,
          },
          yaxis: {
            tickfont: { color: '#9E9589', size: 8 },
            showgrid: false, linecolor: 'rgba(255,255,255,0.08)',
            color: '#9E9589', automargin: true,
          },
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
