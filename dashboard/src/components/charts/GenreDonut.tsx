import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

export default function GenreDonut({ data, filter }: Props) {
  const [metric, setMetric] = useState<'films' | 'revenue' | 'profit'>('films')

  const slices = useMemo(() => {
    const rows = filterAgg(data.genreAgg, filter).filter(r => r.genre !== null)
    const map = new Map<string, number>()
    for (const r of rows) {
      const g = r.genre!
      const val = metric === 'films' ? r.film_count
        : metric === 'revenue' ? r.revenue_sum
        : r.profit_sum
      map.set(g, (map.get(g) ?? 0) + val)
    }
    const sorted = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 8)
    const otherVal = sorted.slice(8).reduce((s, [, v]) => s + v, 0)
    if (otherVal > 0) top.push(['Other', otherVal])
    return top
  }, [data.genreAgg, filter, metric])

  return (
    <ChartPanel
      title="Genre Share"
      metric={metric}
      metrics={[
        { value: 'films', label: 'Films' },
        { value: 'revenue', label: 'Rev' },
        { value: 'profit', label: 'Profit' },
      ]}
      onMetric={setMetric}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Plot
            data={[{
              type: 'pie',
              hole: 0.55,
              labels: slices.map(([g]) => g),
              values: slices.map(([, v]) => v),
              marker: {
                colors: slices.map(([g]) => genreColor(g)),
                line: { color: 'rgba(0,0,0,0.4)', width: 1 },
              },
              textinfo: 'none',
              showlegend: false,
              hovertemplate: '<b>%{label}</b><br>%{value:,.0f}<br>%{percent}<extra></extra>',
            }]}
            layout={{
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
              margin: { l: 4, r: 4, t: 4, b: 4 },
              showlegend: false,
            }}
            config={PLOTLY_CFG}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>

        {/* Custom 3-column legend */}
        <div style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.1rem 0.2rem',
          padding: '0.2rem 0.5rem 0.3rem',
        }}>
          {slices.map(([g]) => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden' }}>
              <div style={{
                width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                backgroundColor: genreColor(g),
              }} />
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#9E9589',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {g}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartPanel>
  )
}
