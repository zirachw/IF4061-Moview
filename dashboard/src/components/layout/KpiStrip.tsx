import { useMemo } from 'react'
import type { FilterState, GeoEntry, KpiTileEntry, ScopeType, TabId } from '../../types'
import { getScope } from '../../hooks/useFilter'

interface Props {
  activeTab: TabId
  kpiTiles: KpiTileEntry[]
  kpiTileShard: { scope_type: ScopeType; scope_id: string } | null
  filter: FilterState
  onFilterChange: (f: FilterState) => void
  geo: GeoEntry[]
  countryDisplayName?: string | null
  yearBounds: [number, number]
}

const CONTINENTS = [
  { value: null,            label: 'World' },
  { value: 'Africa',        label: 'Africa' },
  { value: 'Asia',          label: 'Asia' },
  { value: 'Europe',        label: 'Europe' },
  { value: 'North America', label: 'North America' },
  { value: 'Oceania',       label: 'Oceania' },
  { value: 'South America', label: 'South America' },
]

const CTRL: React.CSSProperties = {
  backgroundColor: 'rgba(20,20,20,0.9)',
  color: 'var(--text-primary)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.25rem',
  padding: '0.2rem 0.4rem',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.75rem',
  cursor: 'pointer',
  outline: 'none',
}

const LBL: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.6875rem',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

function fmtMoney(n: number) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${fmt(n)}`
}

function valueOrDash(value: number | string | null | undefined, formatter?: (value: number) => string) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return formatter ? formatter(value) : fmt(value)
  return value
}

function KpiTile({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.2rem',
        borderRight: '1px solid var(--film-edge)',
        padding: '0 0.75rem',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(0.85rem, 1.5vw, 1.125rem)',
          color: 'var(--gold)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          ...(loading && { animation: 'kpiPulse 1.2s ease-in-out infinite' }),
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.6875rem',
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default function KpiStrip({
  activeTab, kpiTiles, kpiTileShard, filter, onFilterChange, geo, countryDisplayName, yearBounds,
}: Props) {
  const [yMin, yMax] = filter.yearRange
  const [yearMin, yearMax] = yearBounds
  const scope = getScope(filter)
  const kpiShardMatchesSelection =
    kpiTileShard?.scope_type === scope.scope_type &&
    kpiTileShard.scope_id === scope.scope_id

  const allYears = useMemo(
    () => Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i),
    [yearMin, yearMax],
  )

  const sortedCountries = useMemo(
    () => geo
      .filter(c => !filter.continent || c.continent === filter.continent)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [geo, filter.continent],
  )

  const extraCountry = useMemo(() => {
    if (!filter.country) return null
    if (geo.some(e => e.iso_a2 === filter.country)) return null
    return { iso: filter.country, label: countryDisplayName ?? filter.country }
  }, [filter.country, geo, countryDisplayName])

  const activeTile = useMemo(
    () => {
      if (!kpiShardMatchesSelection) return null
      const candidates = kpiTiles.filter(row =>
        row.scope_type === scope.scope_type &&
        row.scope_id === scope.scope_id &&
        row.tab === activeTab
      )
      return candidates.find(row =>
        Number(row.from_year) === yMin &&
        Number(row.to_year) === yMax
      ) ?? candidates
        .filter(row => Number(row.from_year) >= yMin && Number(row.to_year) <= yMax)
        .sort((a, b) =>
          (Number(a.from_year) - Number(b.from_year)) ||
          (Number(b.to_year) - Number(a.to_year))
        )[0] ?? null
    },
    [kpiShardMatchesSelection, kpiTiles, scope.scope_type, scope.scope_id, activeTab, yMin, yMax],
  )

  const kpiLoading = !kpiShardMatchesSelection

  const centerKpis: { label: string; value: string }[] = (() => {
    switch (activeTab) {
      case 'popularity': return [
        { label: 'Films',          value: valueOrDash(activeTile?.films) },
        { label: 'Avg Popularity', value: valueOrDash(activeTile?.avg_popularity, v => fmt(v, 1)) },
        { label: 'Avg Rating',     value: activeTile?.avg_rating == null ? '-' : `★ ${activeTile.avg_rating.toFixed(1)}` },
        { label: 'Vote Count',     value: valueOrDash(activeTile?.vote_count) },
      ]
      case 'financial': return [
        { label: 'Films',      value: valueOrDash(activeTile?.films) },
        { label: 'Avg Budget', value: valueOrDash(activeTile?.avg_budget, fmtMoney) },
        { label: 'Avg Profit', value: valueOrDash(activeTile?.avg_profit, fmtMoney) },
        { label: 'Avg ROI',    value: activeTile?.avg_roi == null ? '-' : `${activeTile.avg_roi.toFixed(2)}x` },
      ]
      case 'genre': return [
        { label: 'Films',         value: valueOrDash(activeTile?.films) },
        { label: 'Active Genres', value: valueOrDash(activeTile?.active_genres) },
        { label: 'Top Genre',     value: valueOrDash(activeTile?.top_genre) },
        { label: 'Top Language',  value: valueOrDash(activeTile?.top_language) },
      ]
      case 'people': return [
        { label: 'Films',     value: valueOrDash(activeTile?.films) },
        { label: 'Studios',   value: valueOrDash(activeTile?.studio_count) },
        { label: 'Directors', value: valueOrDash(activeTile?.director_count) },
        { label: 'Casts',     value: valueOrDash(activeTile?.cast_count) },
      ]
    }
  })()

  return (
    <div
      style={{
        height: 'var(--kpi-h)',
        display: 'flex',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--film-edge)',
        borderBottom: '1px solid var(--film-edge)',
      }}
    >
      <div
        style={{
          flex: '0 0 21rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0 1rem',
          borderRight: '1px solid var(--film-edge)',
          overflow: 'hidden',
        }}
      >
        <select
          value={filter.continent ?? ''}
          onChange={e => onFilterChange({ ...filter, continent: e.target.value || null, country: null })}
          style={{ ...CTRL, width: '8.5rem', flexShrink: 0 }}
        >
          {CONTINENTS.map(c => (
            <option key={c.value ?? 'all'} value={c.value ?? ''}>{c.label}</option>
          ))}
        </select>
        <select
          value={filter.country ?? ''}
          onChange={e => {
            const iso = e.target.value || null
            const entry = iso ? geo.find(g => g.iso_a2 === iso) : null
            onFilterChange({ ...filter, country: iso, continent: iso ? (entry?.continent ?? filter.continent) : filter.continent })
          }}
          style={{ ...CTRL, width: '8.5rem', flexShrink: 0 }}
        >
          <option value="">All Countries</option>
          {extraCountry && (
            <option key={extraCountry.iso} value={extraCountry.iso}>{extraCountry.label}</option>
          )}
          {sortedCountries.map(c => (
            <option key={c.iso_a2} value={c.iso_a2}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        {centerKpis.map(({ label, value }) => (
          <KpiTile key={label} label={label} value={value} loading={kpiLoading} />
        ))}
      </div>

      <div
        style={{
          flex: '0 0 21rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          padding: '0 1rem',
          borderLeft: '1px solid var(--film-edge)',
          overflow: 'hidden',
        }}
      >
        <span style={LBL}>From</span>
        <select
          value={yMin}
          onChange={e => {
            const v = Number(e.target.value)
            if (v <= yMax) onFilterChange({ ...filter, yearRange: [v, yMax] })
          }}
          style={{ ...CTRL, width: '6.5rem', flexShrink: 0 }}
        >
          {allYears.filter(y => y <= yMax).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={LBL}>To</span>
        <select
          value={yMax}
          onChange={e => {
            const v = Number(e.target.value)
            if (v >= yMin) onFilterChange({ ...filter, yearRange: [yMin, v] })
          }}
          style={{ ...CTRL, width: '6.5rem', flexShrink: 0 }}
        >
          {allYears.filter(y => y >= yMin).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}
