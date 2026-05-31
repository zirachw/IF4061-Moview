import { useState, useEffect, useRef } from 'react'
import type {
  AppData,
  CountryFeatureCollection,
  GeoEntry,
  Manifest,
  MetricAgg,
  KpiTileEntry,
  KpiLanguageEntry,
  GenreAggEntry,
  FinancialAggEntry,
  PeopleAggEntry,
  GenrePairAggEntry,
  KeywordAggEntry,
  TopMovieEntry,
  ScopeType,
  TabId,
} from '../types'

const DATA = '/data'
const API  = '/api'
const KPI_TILES_DEBOUNCE_MS = 300

const EMPTY_COUNTRIES: CountryFeatureCollection = { type: 'FeatureCollection', features: [] }

type ShardScopeType = ScopeType

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url} returned ${r.status}`)
    return r.json() as Promise<T>
  })
}

function apiUrl(endpoint: string, params: Record<string, string | number>): string {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString()
  return `${API}/${endpoint}?${qs}`
}

// ---------------------------------------------------------------------------
// Core layer — static assets + world kpi (loaded once)
// ---------------------------------------------------------------------------
interface CoreData {
  manifest:         Manifest
  geo:              GeoEntry[]
  countriesGeo:     CountryFeatureCollection
  worldKpi:         MetricAgg[]
  worldKpiLanguage: KpiLanguageEntry[]
}

let corePromise: Promise<CoreData> | null = null

function loadCore(): Promise<CoreData> {
  corePromise ??= Promise.all([
    fetchJson<Manifest>(`${DATA}/manifest.json`),
    fetchJson<GeoEntry[]>(`${DATA}/geo_summary.json`),
    fetchJson<CountryFeatureCollection>(`${DATA}/countries.geojson`),
    fetchJson<MetricAgg[]>(apiUrl('kpi', { scope_type: 'world', scope_id: 'WORLD' })),
    fetchJson<KpiLanguageEntry[]>(apiUrl('kpi-language', { scope_type: 'world', scope_id: 'WORLD' })),
  ]).then(([manifest, geo, countriesGeo, worldKpi, worldKpiLanguage]) => ({
    manifest, geo, countriesGeo, worldKpi, worldKpiLanguage,
  }))
  return corePromise
}

// ---------------------------------------------------------------------------
// Scoped layer — per-scope data, cached by key
// ---------------------------------------------------------------------------
interface ScopedData {
  scopedKpi:         MetricAgg[]
  scopedKpiLanguage: KpiLanguageEntry[]
  genreAgg:          GenreAggEntry[]
  financialAgg:      FinancialAggEntry[]
  peopleAgg:         PeopleAggEntry[]
  genrePairAgg:      GenrePairAggEntry[]
  topMovies:         TopMovieEntry[]
}

const EMPTY_SCOPED: ScopedData = {
  scopedKpi:         [],
  scopedKpiLanguage: [],
  genreAgg:          [],
  financialAgg:      [],
  peopleAgg:         [],
  genrePairAgg:      [],
  topMovies:         [],
}

const scopeCache = new Map<string, Promise<ScopedData>>()

function scopeKey(scopeType: ShardScopeType, scopeId: string) {
  return `${scopeType}:${scopeId}`
}

function loadScoped(scopeType: ShardScopeType, scopeId: string): Promise<ScopedData> {
  const key = scopeKey(scopeType, scopeId)
  if (scopeCache.has(key)) return scopeCache.get(key)!

  const base = { scope_type: scopeType, scope_id: scopeId }
  const isWorld = scopeType === 'world'

  const p = Promise.all([
    isWorld ? Promise.resolve([] as MetricAgg[])        : fetchJson<MetricAgg[]>(apiUrl('kpi', base)),
    isWorld ? Promise.resolve([] as KpiLanguageEntry[]) : fetchJson<KpiLanguageEntry[]>(apiUrl('kpi-language', base)),
    fetchJson<GenreAggEntry[]>(apiUrl('genre', base)),
    fetchJson<FinancialAggEntry[]>(apiUrl('financial', base)),
    fetchJson<PeopleAggEntry[]>(apiUrl('people', base)),
    fetchJson<GenrePairAggEntry[]>(apiUrl('genre-pairs', base)),
    fetchJson<TopMovieEntry[]>(apiUrl('top-movies', base)),
  ]).then(([scopedKpi, scopedKpiLanguage, genreAgg, financialAgg, peopleAgg, genrePairAgg, topMovies]) => ({
    scopedKpi, scopedKpiLanguage, genreAgg, financialAgg, peopleAgg, genrePairAgg, topMovies,
  })).catch(err => {
    scopeCache.delete(key)
    throw err
  })

  scopeCache.set(key, p)
  return p
}

// ---------------------------------------------------------------------------
// kpi-tiles — fetch all 4 tabs in parallel for a given scope + year range
// ---------------------------------------------------------------------------
const TABS: TabId[] = ['popularity', 'financial', 'genre', 'people']

function fetchKpiTiles(
  scopeType: ShardScopeType,
  scopeId: string,
  fromYear: number,
  toYear: number,
): Promise<KpiTileEntry[]> {
  const base = { scope_type: scopeType, scope_id: scopeId, from_year: fromYear, to_year: toYear }
  return Promise.all(TABS.map(tab => fetchJson<KpiTileEntry>(apiUrl('kpi-tiles', { ...base, tab }))))
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------
export function useData(
  scopeType: ShardScopeType,
  scopeId: string,
  yearRange: [number, number],
): AppData {
  const [core, setCore]               = useState<CoreData | null>(null)
  const [scoped, setScoped]           = useState<ScopedData>(EMPTY_SCOPED)
  const [kpiTiles, setKpiTiles]       = useState<KpiTileEntry[]>([])
  const [kpiTileShard, setKpiTileShard] =
    useState<{ scope_type: ShardScopeType; scope_id: string } | null>(null)
  const [coreError, setCoreError]     = useState<string | null>(null)
  const [scopeLoading, setScopeLoading] = useState(true)
  const scopeInStateRef  = useRef<string | null>(null)
  const tilesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Layer 1 — core, once
  useEffect(() => {
    let cancelled = false
    loadCore()
      .then(c  => { if (!cancelled) setCore(c) })
      .catch(e => { if (!cancelled) setCoreError(String(e)) })
    return () => { cancelled = true }
  }, [])

  // Layer 2 — scoped data, on scope change
  useEffect(() => {
    const key = scopeKey(scopeType, scopeId)
    if (scopeInStateRef.current === key) {
      setScopeLoading(false)
      return
    }

    let cancelled = false
    setScopeLoading(true)
    // Clear tiles immediately so KpiStrip shows loading state for new scope
    setKpiTiles([])
    setKpiTileShard(null)

    loadScoped(scopeType, scopeId)
      .then(s => {
        if (!cancelled) {
          setScoped(s)
          setScopeLoading(false)
          scopeInStateRef.current = key
        }
      })
      .catch(() => { if (!cancelled) setScopeLoading(false) })

    return () => { cancelled = true }
  }, [scopeType, scopeId])

  // Layer 3 — kpi-tiles, debounced
  // Stale tiles stay visible during year-drag debounce (no loading flash).
  // Scope changes clear tiles immediately (effect above), then this re-fetches.
  useEffect(() => {
    const [fromYear, toYear] = yearRange
    let cancelled = false

    if (tilesDebounceRef.current !== null) clearTimeout(tilesDebounceRef.current)

    tilesDebounceRef.current = setTimeout(() => {
      tilesDebounceRef.current = null
      fetchKpiTiles(scopeType, scopeId, fromYear, toYear)
        .then(tiles => {
          if (!cancelled) {
            setKpiTiles(tiles)
            setKpiTileShard({ scope_type: scopeType, scope_id: scopeId })
          }
        })
        .catch(() => {})
    }, KPI_TILES_DEBOUNCE_MS)

    return () => {
      cancelled = true
      if (tilesDebounceRef.current !== null) {
        clearTimeout(tilesDebounceRef.current)
        tilesDebounceRef.current = null
      }
    }
  // yearRange[0]/[1] used instead of the array ref to avoid spurious re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeType, scopeId, yearRange[0], yearRange[1]])

  const kpi = core
    ? scopeType === 'world' ? core.worldKpi : [...core.worldKpi, ...scoped.scopedKpi]
    : []

  const kpiLanguage = core
    ? scopeType === 'world' ? core.worldKpiLanguage : [...core.worldKpiLanguage, ...scoped.scopedKpiLanguage]
    : []

  return {
    movies:       [],
    manifest:     core?.manifest ?? null,
    geo:          core?.geo ?? [],
    countriesGeo: core?.countriesGeo ?? EMPTY_COUNTRIES,
    kpi,
    kpiLanguage,
    genreAgg:     scoped.genreAgg,
    financialAgg: scoped.financialAgg,
    peopleAgg:    scoped.peopleAgg,
    genrePairAgg: scoped.genrePairAgg,
    keywordAgg:   [],
    topMovies:    scoped.topMovies,
    kpiTiles,
    kpiTileShard,
    loading:      core === null,
    scopeLoading,
    error:        coreError,
  }
}

// ---------------------------------------------------------------------------
// useKeywords — call from WordCloud when a genre is selected
// ---------------------------------------------------------------------------
export function useKeywords(
  scopeType: ShardScopeType,
  scopeId: string,
  genre: string | null,
): KeywordAggEntry[] {
  const [keywords, setKeywords] = useState<KeywordAggEntry[]>([])

  useEffect(() => {
    let cancelled = false
    const params: Record<string, string> = { scope_type: scopeType, scope_id: scopeId }
    if (genre) params.genre = genre
    fetchJson<KeywordAggEntry[]>(apiUrl('keywords', params))
      .then(data => { if (!cancelled) setKeywords(data) })
      .catch(() => { if (!cancelled) setKeywords([]) })
    return () => { cancelled = true }
  }, [scopeType, scopeId, genre])

  return keywords
}
