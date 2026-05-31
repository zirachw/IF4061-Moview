import type { FilterState, Movie, GeoEntry, MetricAgg, ScopeType } from '../types'

export const DEFAULT_FILTER: FilterState = {
  country:   null,
  continent: null,
  yearRange: [1950, 2024],
}

export type YearRange = [number, number]

export function buildContinentIsoSet(geo: GeoEntry[], continent: string | null): Set<string> | null {
  if (!continent) return null
  return new Set(geo.filter(e => e.continent === continent).map(e => e.iso_a2))
}

export function getScope(
  scope: Pick<FilterState, 'country' | 'continent'>,
): { scope_type: ScopeType; scope_id: string } {
  if (scope.country) return { scope_type: 'country', scope_id: scope.country }
  if (scope.continent) return { scope_type: 'continent', scope_id: scope.continent }
  return { scope_type: 'world', scope_id: 'WORLD' }
}

export function getShardScope(
  scope: Pick<FilterState, 'country' | 'continent'>,
): { scope_type: Exclude<ScopeType, 'country'>; scope_id: string } {
  if (scope.continent) return { scope_type: 'continent', scope_id: scope.continent }
  return { scope_type: 'world', scope_id: 'WORLD' }
}

export function matchesScope(
  row: Pick<MetricAgg, 'scope_type' | 'scope_id'>,
  scope: Pick<FilterState, 'country' | 'continent'>,
): boolean {
  const target = getScope(scope)
  return row.scope_type === target.scope_type && row.scope_id === target.scope_id
}

export function getYearBoundsForScope(
  kpi: MetricAgg[],
  scope: Pick<FilterState, 'country' | 'continent'>,
): YearRange | null {
  let min = Infinity
  let max = -Infinity

  for (const row of kpi) {
    if (!matchesScope(row, scope) || row.film_count <= 0) continue

    min = Math.min(min, row.year)
    max = Math.max(max, row.year)
  }

  return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null
}

export function clampYearRange(yearRange: YearRange, bounds: YearRange | null): YearRange {
  if (!bounds) return yearRange

  const [oldest, newest] = bounds
  const clamped: YearRange = [
    Math.max(yearRange[0], oldest),
    Math.min(yearRange[1], newest),
  ]

  return clamped[0] <= clamped[1] ? clamped : bounds
}

export function filterMovies(
  movies: Movie[],
  filter: FilterState,
  continentIsos: Set<string> | null = null,
): Movie[] {
  const [yMin, yMax] = filter.yearRange
  return movies.filter(m => {
    if (m.year === null) return false
    if (m.year < yMin || m.year > yMax) return false
    if (filter.country && m.primary_iso !== filter.country) return false
    if (continentIsos && (m.primary_iso === null || !continentIsos.has(m.primary_iso))) return false
    return true
  })
}
