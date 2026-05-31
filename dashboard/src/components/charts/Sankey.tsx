import { useMemo, useState } from 'react'
import Plot from '../../utils/PlotWrapper'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor, PLOTLY_CFG } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props {
  data: AppData
  filter: FilterState
  mode: 'genre' | 'financial' | 'people'
}

function buildGenreSankey(data: AppData, filter: FilterState) {
  const rows = filterAgg(data.genrePairAgg, filter)
  const pairMap = new Map<string, number>()
  for (const r of rows) {
    const key = `${r.genre_a}|${r.genre_b}`
    pairMap.set(key, (pairMap.get(key) ?? 0) + r.film_count)
  }
  const topPairs = [...pairMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  const nodeSet = new Set<string>()
  for (const [key] of topPairs) {
    const [a, b] = key.split('|')
    nodeSet.add(a + '__pri')
    nodeSet.add(b + '__sec')
  }
  const nodes = [...nodeSet]
  const idx = new Map(nodes.map((n, i) => [n, i]))
  const sources: number[] = [], targets: number[] = [], values: number[] = []
  for (const [key, val] of topPairs) {
    const [a, b] = key.split('|')
    sources.push(idx.get(a + '__pri')!)
    targets.push(idx.get(b + '__sec')!)
    values.push(val)
  }
  return { nodes: nodes.map(n => n.replace('__pri', '').replace('__sec', '')), sources, targets, values }
}

function buildFinancialSankey(data: AppData, filter: FilterState) {
  const rows = filterAgg(data.financialAgg, filter)
    .filter(r => r.budget_tier && r.release_season && r.profit_tier)

  const tierMap = new Map<string, number>()
  for (const r of rows) {
    const key = `${r.budget_tier}|${r.release_season}|${r.profit_tier}`
    tierMap.set(key, (tierMap.get(key) ?? 0) + r.film_count)
  }

  const budgetTiers = ['Low', 'Mid', 'High']
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter']
  const profitTiers = ['Low', 'Mid-Low', 'Mid-High', 'High']
  const nodes = [
    ...budgetTiers.map(t => `Budget: ${t}`),
    ...seasons.map(s => `Season: ${s}`),
    ...profitTiers.map(t => `Profit: ${t}`),
  ]
  const idx = new Map(nodes.map((n, i) => [n, i]))
  const sources: number[] = [], targets: number[] = [], values: number[] = []

  for (const [key, val] of tierMap) {
    const [bt, season, pt] = key.split('|')
    const si = idx.get(`Budget: ${bt}`)
    const mi = idx.get(`Season: ${season}`)
    const ti = idx.get(`Profit: ${pt}`)
    if (si !== undefined && mi !== undefined && ti !== undefined) {
      sources.push(si, mi)
      targets.push(mi, ti)
      values.push(val, val)
    }
  }
  return { nodes, sources, targets, values }
}

function buildPeopleSankey(data: AppData, filter: FilterState, metric: 'films' | 'revenue' | 'profit') {
  const rows = filterAgg(data.peopleAgg, filter)
  const entityMap = new Map<string, { type: string; val: number }>()
  for (const r of rows) {
    const key = `${r.entity_type}:${r.name}`
    const val = metric === 'films' ? r.film_count : metric === 'revenue' ? r.revenue_sum : r.profit_sum
    const cur = entityMap.get(key)
    entityMap.set(key, { type: r.entity_type, val: (cur?.val ?? 0) + val })
  }

  const byType = new Map<string, Array<{ name: string; val: number }>>()
  for (const [key, { type, val }] of entityMap) {
    const name = key.split(':').slice(1).join(':')
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push({ name, val })
  }

  const topN = 6
  const typeOrder = ['studio', 'director', 'cast']
  const levels: Array<Array<{ label: string; type: string }>> = typeOrder.map(type =>
    (byType.get(type) ?? []).sort((a, b) => b.val - a.val).slice(0, topN).map(e => ({ label: e.name, type })),
  )

  const nodes = levels.flat().map(e => e.label)
  const nodeVal = new Map<string, number>()
  for (const [key, { val }] of entityMap) {
    const name = key.split(':').slice(1).join(':')
    if (nodes.includes(name)) nodeVal.set(name, (nodeVal.get(name) ?? 0) + val)
  }

  const idx = new Map(nodes.map((n, i) => [n, i]))
  const sources: number[] = [], targets: number[] = [], values: number[] = []

  for (let lvl = 0; lvl + 1 < levels.length; lvl++) {
    for (const src of levels[lvl]) {
      for (const tgt of levels[lvl + 1]) {
        const v = Math.min(nodeVal.get(src.label) ?? 0, nodeVal.get(tgt.label) ?? 0) / topN
        if (v > 0) {
          sources.push(idx.get(src.label)!)
          targets.push(idx.get(tgt.label)!)
          values.push(v)
        }
      }
    }
  }
  return { nodes, sources, targets, values }
}

export default function Sankey({ data, filter, mode }: Props) {
  const [metric, setMetric] = useState<'films' | 'revenue' | 'profit'>('films')

  const { nodes, sources, targets, values } = useMemo(() => {
    if (mode === 'genre') return buildGenreSankey(data, filter)
    if (mode === 'financial') return buildFinancialSankey(data, filter)
    return buildPeopleSankey(data, filter, metric)
  }, [data, filter, mode, metric])

  const title = mode === 'genre' ? 'Genre Flow' : mode === 'financial' ? 'Budget → Season → Profit' : 'People Flow'

  const nodeColors = nodes.map((n, i) => {
    if (mode === 'genre') return genreColor(n)
    if (mode === 'financial') {
      if (i < 3) return '#C0392B'
      if (i < 7) return '#D4AF37'
      return '#27AE60'
    }
    const type = ['studio', 'director', 'cast'][Math.floor(i / 6) % 3] ?? 'cast'
    const colors: Record<string, string> = { studio: '#2980B9', director: '#D4AF37', cast: '#E8607A' }
    return colors[type] ?? '#9E9589'
  })

  return (
    <ChartPanel
      title={title}
      noData={values.length === 0}
      right={mode === 'genre' ? (
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.58rem',
          color: '#9E9589',
          whiteSpace: 'nowrap',
        }}>
          primary → secondary
        </span>
      ) : undefined}
      metric={mode === 'people' ? metric : undefined}
      metrics={mode === 'people' ? [
        { value: 'films', label: 'Films' },
        { value: 'revenue', label: 'Rev' },
        { value: 'profit', label: 'Profit' },
      ] : undefined}
      onMetric={mode === 'people' ? setMetric : undefined}
    >
      <Plot
        data={[{
          type: 'sankey',
          arrangement: 'snap',
          node: {
            label: nodes,
            color: nodeColors,
            pad: 12,
            thickness: 14,
            line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
            hovertemplate: '<b>%{label}</b><br>%{value}<extra></extra>',
          },
          link: {
            source: sources,
            target: targets,
            value: values,
            color: 'rgba(255,255,255,0.07)',
            hovertemplate: '%{source.label} → %{target.label}<br>%{value:.0f}<extra></extra>',
          },
        }]}
        layout={{
          paper_bgcolor: 'transparent',
          plot_bgcolor:  'transparent',
          font: { family: 'Inter, sans-serif', color: '#9E9589', size: 9 },
          margin: { l: 4, r: 4, t: 4, b: 4 },
        }}
        config={PLOTLY_CFG}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartPanel>
  )
}
