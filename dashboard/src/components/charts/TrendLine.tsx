import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

type Metric = 'rating' | 'popularity' | 'votes'

export default function TrendLine({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>('rating')

  const { years, values } = useMemo(() => {
    const rows = filterAgg(data.kpi, filter)
    const yearMap = new Map<number, { sum: number; cnt: number }>()
    for (const r of rows) {
      const val = metric === 'rating' ? { sum: r.rating_sum, cnt: r.rating_count }
        : metric === 'popularity' ? { sum: r.popularity_sum, cnt: r.popularity_count }
        : { sum: r.vote_count_sum, cnt: r.film_count }
      if (val.cnt === 0) continue
      const cur = yearMap.get(r.year) ?? { sum: 0, cnt: 0 }
      cur.sum += val.sum; cur.cnt += val.cnt
      yearMap.set(r.year, cur)
    }
    const sorted = [...yearMap.entries()].sort((a, b) => a[0] - b[0])
    return {
      years: sorted.map(([y]) => y),
      values: sorted.map(([, { sum, cnt }]) => cnt > 0 ? sum / cnt : 0),
    }
  }, [data.kpi, filter, metric])

  const yLabel = metric === 'rating' ? 'Avg Rating' : metric === 'popularity' ? 'Avg Popularity' : 'Avg Vote Count'
  const lineColor = metric === 'rating' ? '#D4AF37' : metric === 'popularity' ? '#2980B9' : '#E8607A'

  return (
    <ChartPanel
      title="Trend Over Time"
      noData={years.length === 0}
      metric={metric}
      metrics={[
        { value: 'rating', label: 'Rating' },
        { value: 'popularity', label: 'Pop.' },
        { value: 'votes', label: 'Votes' },
      ]}
      onMetric={setMetric}
    >
      <Plot
        data={[{
          type: 'scatter',
          mode: 'lines',
          x: years,
          y: values,
          line: { color: lineColor, width: 2 },
          fill: 'tozeroy',
          fillcolor: lineColor + '18',
          hovertemplate: `%{x}: %{y:.2f}<extra>${yLabel}</extra>`,
        }]}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
          margin: { l: 46, r: 12, t: 8, b: 32 },
          xaxis: { ...DARK_AXIS, showgrid: false },
          yaxis: {
            ...DARK_AXIS,
            title: { text: yLabel, font: { size: 9, color: '#9E9589' } },
            gridcolor: 'rgba(255,255,255,0.05)',
          },
          hovermode: 'x',
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
