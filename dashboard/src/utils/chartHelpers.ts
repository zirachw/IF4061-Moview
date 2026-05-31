import type { FilterState, MetricAgg } from '../types'
import { matchesScope } from '../hooks/useFilter'

export function filterAgg<T extends { scope_type: string; scope_id: string; year: number }>(
  rows: T[],
  filter: FilterState,
): T[] {
  const [yMin, yMax] = filter.yearRange
  return rows.filter(r =>
    matchesScope(r as Pick<MetricAgg, 'scope_type' | 'scope_id'>, filter) &&
    r.year >= yMin && r.year <= yMax,
  )
}

export const GENRE_COLORS: Record<string, string> = {
  Action:           '#C0392B',
  Adventure:        '#E67E22',
  Animation:        '#27AE60',
  Comedy:           '#D4AF37',
  Crime:            '#7F8C8D',
  Documentary:      '#1ABC9C',
  Drama:            '#2980B9',
  Family:           '#48C9B0',
  Fantasy:          '#F39C12',
  History:          '#D35400',
  Horror:           '#95A5A6',
  Music:            '#E74C3C',
  Mystery:          '#9B59B6',
  Romance:          '#E8607A',
  'Science Fiction':'#16A085',
  'TV Movie':       '#BDC3C7',
  Thriller:         '#8E44AD',
  War:              '#2C3E50',
  Western:          '#C0392B',
}

const COLOR_POOL = Object.values(GENRE_COLORS)
const extraColorCache = new Map<string, string>()
let extraIdx = 0

export function genreColor(genre: string | null | undefined): string {
  if (!genre) return '#9E9589'
  if (GENRE_COLORS[genre]) return GENRE_COLORS[genre]
  if (!extraColorCache.has(genre)) {
    extraColorCache.set(genre, COLOR_POOL[extraIdx % COLOR_POOL.length])
    extraIdx++
  }
  return extraColorCache.get(genre)!
}

export function fmtMoney(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

export function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return `${Math.round(n)}`
}

export const DARK_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor:  'transparent',
  font:  { family: 'Inter, sans-serif', color: '#9E9589', size: 10 },
  margin: { l: 50, r: 12, t: 8, b: 32, pad: 0 },
  showlegend: false,
}

export const DARK_AXIS = {
  gridcolor:   'rgba(255,255,255,0.06)',
  zerolinecolor:'rgba(255,255,255,0.10)',
  linecolor:   'rgba(255,255,255,0.08)',
  tickfont:    { color: '#9E9589', size: 9 },
  tickcolor:   'rgba(255,255,255,0.2)',
  color:       '#9E9589',
  automargin:  true,
}

export const PLOTLY_CFG = { displayModeBar: false, responsive: true }
