import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor, fmtMoney, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

type Metric = 'revenue' | 'profit' | 'budget'

export default function StackedArea({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>('revenue')

  const traces = useMemo(() => {
    const rows = filterAgg(data.genreAgg, filter).filter(r => r.genre !== null)
    const genreYearMap = new Map<string, Map<number, number>>()
    const years = new Set<number>()

    for (const r of rows) {
      years.add(r.year)
      const val = metric === 'revenue' ? r.revenue_sum
        : metric === 'profit' ? r.profit_sum
        : r.budget_sum
      if (val <= 0) continue
      if (!genreYearMap.has(r.genre!)) genreYearMap.set(r.genre!, new Map())
      const ym = genreYearMap.get(r.genre!)!
      ym.set(r.year, (ym.get(r.year) ?? 0) + val)
    }

    const sortedYears = [...years].sort((a, b) => a - b)
    const totalByGenre = new Map<string, number>()
    for (const [g, ym] of genreYearMap) totalByGenre.set(g, [...ym.values()].reduce((s, v) => s + v, 0))

    const topGenres = [...totalByGenre.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([g]) => g)

    return topGenres.map(g => {
      const ym = genreYearMap.get(g)!
      return {
        type: 'scatter' as const,
        mode: 'none' as const,
        name: g,
        x: sortedYears,
        y: sortedYears.map(y => ym.get(y) ?? 0),
        fill: 'tonexty' as const,
        fillcolor: genreColor(g) + 'AA',
        line: { color: genreColor(g), width: 0.5 },
        stackgroup: 'one',
        hovertemplate: `<b>${g}</b><br>%{x}: ${metric === 'revenue' ? '$' : metric === 'budget' ? '$' : '$'}%{y:,.0f}<extra></extra>`,
      }
    })
  }, [data.genreAgg, filter, metric])

  return (
    <ChartPanel
      title="Genre Stream"
      metric={metric}
      metrics={[
        { value: 'revenue', label: 'Rev' },
        { value: 'profit', label: 'Profit' },
        { value: 'budget', label: 'Budget' },
      ]}
      onMetric={setMetric}
    >
      <Plot
        data={traces}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
          margin: { l: 54, r: 8, t: 8, b: 32 },
          showlegend: true,
          legend: {
            font: { color: '#9E9589', size: 8 },
            bgcolor: 'transparent',
            orientation: 'h',
            x: 0, y: -0.15,
            traceorder: 'normal',
          },
          xaxis: { ...DARK_AXIS, showgrid: false },
          yaxis: {
            ...DARK_AXIS,
            tickformat: '$~s',
            gridcolor: 'rgba(255,255,255,0.05)',
          },
          hovermode: 'x unified',
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
