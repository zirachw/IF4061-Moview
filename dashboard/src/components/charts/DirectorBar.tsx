import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState, PeopleEntityType } from '../../types'
import { filterAgg, fmtMoney, fmtCount, DARK_AXIS, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

type Metric = 'films' | 'revenue' | 'profit'

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

export default function DirectorBar({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>('films')
  const [entityType, setEntityType] = useState<PeopleEntityType>('director')

  const bars = useMemo(() => {
    const rows = filterAgg(data.peopleAgg, filter).filter(r => r.entity_type === entityType)
    const entityMap = new Map<string, number>()
    for (const r of rows) {
      const val = metric === 'films' ? r.film_count
        : metric === 'revenue' ? r.revenue_sum
        : r.profit_sum
      entityMap.set(r.name, (entityMap.get(r.name) ?? 0) + val)
    }
    return [...entityMap.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[1] - b[1])
      .slice(-15)
  }, [data.peopleAgg, filter, metric, entityType])

  const color = ENTITY_COLORS[entityType]
  const fmt = metric === 'films' ? fmtCount : fmtMoney
  const metricColor = '#D4AF37'

  return (
    <ChartPanel
      title="Top Entities"
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {(['director', 'studio', 'cast'] as PeopleEntityType[]).map(et => (
              <button key={et} type="button" onClick={() => setEntityType(et)}
                style={FILTER_BTN(entityType === et, ENTITY_COLORS[et])}>
                {et}
              </button>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', userSelect: 'none' }}>│</span>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {(['films', 'revenue', 'profit'] as Metric[]).map(m => (
              <button key={m} type="button" onClick={() => setMetric(m)}
                style={FILTER_BTN(metric === m, metricColor)}>
                {m === 'films' ? 'Films' : m === 'revenue' ? 'Rev' : 'Profit'}
              </button>
            ))}
          </div>
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
            color,
            opacity: 0.8,
            line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
          },
          text: bars.map(([, v]) => fmt(v)),
          textposition: 'outside',
          textfont: { color: '#9E9589', size: 8 },
          cliponaxis: false,
          hovertemplate: '<b>%{y}</b><br>%{text}<extra></extra>',
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
