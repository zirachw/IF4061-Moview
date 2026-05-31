import type { AppData, FilterState } from '../../types'
import StudioTreemap from '../charts/StudioTreemap'
import DirectorBar from '../charts/DirectorBar'

interface Props { data: AppData; filter: FilterState }

export default function PeopleTab({ data, filter }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gridTemplateAreas: `"bar donut" "bar treemap"`,
      gap: '0.6rem',
      height: '100%',
      minHeight: 0,
    }}>
      <div style={{ gridArea: 'bar', minWidth: 0, minHeight: 0 }}>
        <DirectorBar data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'donut', minWidth: 0, minHeight: 0 }}>
        <PeopleDonut data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'treemap', minWidth: 0, minHeight: 0 }}>
        <StudioTreemap data={data} filter={filter} />
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import { filterAgg, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'
import type { PeopleEntityType } from '../../types'

const ENTITY_COLORS: Record<PeopleEntityType, string> = {
  director: '#D4AF37',
  studio:   '#2980B9',
  cast:     '#E8607A',
}

function PeopleDonut({ data, filter }: { data: AppData; filter: FilterState }) {
  const [entityType, setEntityType] = useState<PeopleEntityType>('director')
  const [metric, setMetric] = useState<'films' | 'revenue' | 'profit'>('films')

  const slices = useMemo(() => {
    const rows = filterAgg(data.peopleAgg, filter).filter(r => r.entity_type === entityType)
    const map = new Map<string, number>()
    for (const r of rows) {
      const val = metric === 'films' ? r.film_count : metric === 'revenue' ? r.revenue_sum : r.profit_sum
      map.set(r.name, (map.get(r.name) ?? 0) + val)
    }
    const sorted = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 8)
    const other = sorted.slice(8).reduce((s, [, v]) => s + v, 0)
    if (other > 0) top.push(['Other', other])
    return top
  }, [data.peopleAgg, filter, entityType, metric])

  const color = ENTITY_COLORS[entityType]

  const FBTN = (active: boolean, clr: string): React.CSSProperties => ({
    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem',
    padding: '0.1rem 0.35rem', borderRadius: '0.18rem',
    border: `1px solid ${active ? clr + '88' : 'rgba(255,255,255,0.12)'}`,
    cursor: 'pointer',
    backgroundColor: active ? clr + '22' : 'transparent',
    color: active ? clr : '#9E9589',
  })

  return (
    <ChartPanel
      title="Entity Distribution"
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {(['director', 'studio', 'cast'] as PeopleEntityType[]).map(et => (
              <button key={et} type="button" onClick={() => setEntityType(et)}
                style={FBTN(entityType === et, ENTITY_COLORS[et])}>
                {et}
              </button>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', userSelect: 'none' }}>│</span>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {(['films', 'revenue', 'profit'] as Array<'films' | 'revenue' | 'profit'>).map(m => (
              <button key={m} type="button" onClick={() => setMetric(m)}
                style={FBTN(metric === m, '#D4AF37')}>
                {m === 'films' ? 'Films' : m === 'revenue' ? 'Rev' : 'Profit'}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0 }}>
        <Plot
        data={[{
          type: 'pie',
          hole: 0.52,
          labels: slices.map(([n]) => n.length > 20 ? n.slice(0, 18) + '…' : n),
          values: slices.map(([, v]) => v),
          marker: {
            colors: slices.map((_, i) => {
              if (i >= slices.length - 1 && slices[i][0] === 'Other') return '#4A4540'
              const opacity = Math.max(0.3, 1 - i * 0.08)
              return color + Math.round(opacity * 255).toString(16).padStart(2, '0')
            }),
            line: { color: 'rgba(0,0,0,0.4)', width: 1 },
          },
          textinfo: 'none',
          showlegend: false,
          hovertemplate: '<b>%{label}</b><br>%{value:,.0f}<br>%{percent}<extra></extra>',
        }]}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
          margin: { l: 4, r: 4, t: 4, b: 4 },
          showlegend: false,
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
        </div>
        <div style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.1rem 0.2rem',
          padding: '0.2rem 0.5rem 0.3rem',
        }}>
          {slices.map(([n], i) => {
            const isOther = i >= slices.length - 1 && n === 'Other'
            const c = isOther ? '#4A4540'
              : color + Math.round(Math.max(0.3, 1 - i * 0.08) * 255).toString(16).padStart(2, '0')
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, backgroundColor: c }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#9E9589', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {n.length > 14 ? n.slice(0, 12) + '…' : n}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </ChartPanel>
  )
}
