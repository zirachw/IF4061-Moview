import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

type Metric = 'films' | 'revenue' | 'profit'
type EntityType = 'director' | 'studio' | 'cast'

const ENTITY_COLORS: Record<EntityType, string> = {
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

export default function StudioTreemap({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>('films')
  const [entityType, setEntityType] = useState<EntityType>('director')

  const treemapData = useMemo(() => {
    const rows = filterAgg(data.peopleAgg, filter).filter(r => r.entity_type === entityType)
    const entityMap = new Map<string, number>()
    for (const r of rows) {
      const val = metric === 'films' ? r.film_count
        : metric === 'revenue' ? r.revenue_sum
        : r.profit_sum
      entityMap.set(r.name, (entityMap.get(r.name) ?? 0) + val)
    }

    const top = [...entityMap.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)

    if (!top.length) return null

    const color = ENTITY_COLORS[entityType]
    const maxVal = top[0][1]
    const ROOT = '​'
    return {
      labels: [ROOT, ...top.map(([n]) => n)],
      parents: ['', ...top.map(() => ROOT)],
      values: [0, ...top.map(([, v]) => v)],
      colors: ['rgba(0,0,0,0)', ...top.map(([, v]) => {
        const t = Math.max(0.25, v / maxVal)
        return color + Math.round(t * 255).toString(16).padStart(2, '0')
      })],
      hovertemplate: ['<extra></extra>', ...top.map(() => '<b>%{label}</b><br>%{value:,.0f}<extra></extra>')],
    }
  }, [data.peopleAgg, filter, metric, entityType])

  const metricColor = '#D4AF37'

  return (
    <ChartPanel
      title="Entity Treemap"
      noData={!treemapData}
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {(['director', 'studio', 'cast'] as EntityType[]).map(et => (
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
      {treemapData && (
        <Plot
          data={[{
            type: 'treemap',
            labels: treemapData.labels,
            parents: treemapData.parents,
            values: treemapData.values,
            marker: {
              colors: treemapData.colors,
              line: { color: 'rgba(0,0,0,0.5)', width: 0.5 },
            },
            textfont: { color: '#F5F0E8', size: 10, family: 'Inter, sans-serif' },
            textinfo: 'label+value',
            hovertemplate: '<b>%{label}</b><br>%{value:,.0f}<extra></extra>',
            hoverinfo: 'skip' as const,
          }]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor:  'transparent',
            font: { family: 'Inter, sans-serif', color: '#F5F0E8', size: 9 },
            margin: { l: 2, r: 2, t: 2, b: 2 },
          }}
          config={PLOTLY_CFG}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      )}
    </ChartPanel>
  )
}
