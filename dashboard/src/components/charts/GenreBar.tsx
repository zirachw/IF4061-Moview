import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor, fmtMoney, fmtCount, DARK_LAYOUT, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

type Metric = 'revenue' | 'profit' | 'budget'

export default function GenreBar({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>('revenue')

  const bars = useMemo(() => {
    const rows = filterAgg(data.genreAgg, filter).filter(r => r.genre !== null)
    const map = new Map<string, number>()
    for (const r of rows) {
      const g = r.genre!
      const val = metric === 'revenue' ? r.revenue_sum
        : metric === 'profit' ? r.profit_sum
        : r.budget_sum
      map.set(g, (map.get(g) ?? 0) + val)
    }
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[1] - b[1])
      .slice(-12)
  }, [data.genreAgg, filter, metric])

  const labels = metric === 'films' ? fmtCount : fmtMoney

  return (
    <ChartPanel
      title="Top Genres"
      metric={metric}
      metrics={[
        { value: 'revenue', label: 'Rev' },
        { value: 'profit', label: 'Profit' },
        { value: 'budget', label: 'Budget' },
      ]}
      onMetric={setMetric}
    >
      <Plot
        data={[{
          type: 'bar',
          orientation: 'h',
          x: bars.map(([, v]) => v),
          y: bars.map(([g]) => g),
          marker: { color: bars.map(([g]) => genreColor(g)) },
          text: bars.map(([, v]) => labels(v)),
          textposition: 'outside',
          textfont: { color: '#9E9589', size: 9 },
          cliponaxis: false,
          hovertemplate: '<b>%{y}</b><br>%{text}<extra></extra>',
        }]}
        layout={{
          ...DARK_LAYOUT,
          margin: { l: 90, r: 56, t: 8, b: 8 },
          xaxis: { ...DARK_AXIS, showgrid: false, showticklabels: false, zeroline: false },
          yaxis: {
            ...DARK_AXIS, showgrid: false, tickfont: { color: '#F5F0E8', size: 8 },
            tickmode: 'array',
            tickvals: bars.map(([g]) => g),
            ticktext: bars.map(([g]) => g),
          },
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
