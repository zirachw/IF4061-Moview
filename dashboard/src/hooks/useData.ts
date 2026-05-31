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
} from '../types'

const DATA = '/data'

const EMPTY_COUNTRIES: CountryFeatureCollection = { type: 'FeatureCollection', features: [] }

const EMPTY_SCOPED = {
  genreAgg:     [] as GenreAggEntry[],
  financialAgg: [] as FinancialAggEntry[],
  peopleAgg:    [] as PeopleAggEntry[],
  genrePairAgg: [] as GenrePairAggEntry[],
  keywordAgg:   [] as KeywordAggEntry[],
  topMovies:    [] as TopMovieEntry[],
}

const EMPTY_SCOPED_KPI = {
  kpiTiles: [] as KpiTileEntry[],
  shard: null,
}

function fetchJson<T>(path: string): Promise<T> {
  return fetch(path).then(r => {
    if (!r.ok) throw new Error(`${path} returned ${r.status}`)
    return r.json() as Promise<T>
  })
}

function scopeSlug(id: string): string {
  return id.replace(/ /g, '_').replace(/\//g, '_')
}

type ShardScopeType = Exclude<ScopeType, 'country'>

function scopeBasePath(scopeType: ShardScopeType, scopeId: string): string {
  if (scopeType === 'world') return `${DATA}/scope/world`
  return `${DATA}/scope/${scopeType}/${scopeSlug(scopeId)}`
}

// ---------------------------------------------------------------------------
// Core layer — loaded once at module level
// ---------------------------------------------------------------------------
interface CoreData {
  manifest: Manifest
  geo: GeoEntry[]
  countriesGeo: CountryFeatureCollection
  kpi: MetricAgg[]
  kpiTiles: KpiTileEntry[]
  kpiLanguage: KpiLanguageEntry[]
}

let corePromise: Promise<CoreData> | null = null

function loadCore(): Promise<CoreData> {
  corePromise ??= Promise.all([
    fetchJson<Manifest>(`${DATA}/manifest.json`),
    fetchJson<GeoEntry[]>(`${DATA}/geo_summary.json`),
    fetchJson<CountryFeatureCollection>(`${DATA}/countries.geojson`),
    fetchJson<MetricAgg[]>(`${DATA}/kpi.json`),
    fetchJson<KpiTileEntry[]>(`${DATA}/kpi_tiles.json`),
    fetchJson<KpiLanguageEntry[]>(`${DATA}/kpi_language.json`),
  ]).then(([manifest, geo, countriesGeo, kpi, kpiTiles, kpiLanguage]) => ({
    manifest, geo, countriesGeo, kpi, kpiTiles, kpiLanguage,
  }))
  return corePromise
}

// ---------------------------------------------------------------------------
// Scoped layer — cached per scope key
// ---------------------------------------------------------------------------
interface ScopedData {
  genreAgg:     GenreAggEntry[]
  financialAgg: FinancialAggEntry[]
  peopleAgg:    PeopleAggEntry[]
  genrePairAgg: GenrePairAggEntry[]
  keywordAgg:   KeywordAggEntry[]
  topMovies:    TopMovieEntry[]
}

interface ScopedKpiData {
  kpiTiles: KpiTileEntry[]
  shard: {
    scope_type: ShardScopeType
    scope_id: string
  } | null
}

const scopeCache = new Map<string, Promise<ScopedData>>()
const scopeKpiCache = new Map<string, Promise<ScopedKpiData>>()
const scopeKpiResolved = new Map<string, ScopedKpiData>()

function scopeKey(scopeType: ShardScopeType, scopeId: string) {
  return `${scopeType}:${scopeId}`
}

function loadScopedKpis(scopeType: ShardScopeType, scopeId: string): Promise<ScopedKpiData> {
  const key = scopeKey(scopeType, scopeId)
  if (!scopeKpiCache.has(key)) {
    const base = scopeBasePath(scopeType, scopeId)
    scopeKpiCache.set(
      key,
      fetchJson<KpiTileEntry[]>(`${base}/kpi_tiles.json`)
        .then(kpiTiles => {
          const result: ScopedKpiData = { kpiTiles, shard: { scope_type: scopeType, scope_id: scopeId } }
          scopeKpiResolved.set(key, result)
          return result
        })
        .catch(error => {
          scopeKpiCache.delete(key)
          throw error
        }),
    )
  }
  return scopeKpiCache.get(key)!
}

function loadScopedDetails(scopeType: ShardScopeType, scopeId: string): Promise<ScopedData> {
  const key = `${scopeType}:${scopeId}`
  if (!scopeCache.has(key)) {
    const base = scopeBasePath(scopeType, scopeId)
    scopeCache.set(
      key,
      Promise.all([
        fetchJson<GenreAggEntry[]>(`${base}/genre_agg.json`),
        fetchJson<FinancialAggEntry[]>(`${base}/financial_agg.json`),
        fetchJson<PeopleAggEntry[]>(`${base}/people_agg.json`),
        fetchJson<GenrePairAggEntry[]>(`${base}/genre_pair_agg.json`),
        fetchJson<KeywordAggEntry[]>(`${base}/keyword_agg.json`),
        fetchJson<TopMovieEntry[]>(`${base}/top_movies.json`),
      ])
        .then(([genreAgg, financialAgg, peopleAgg, genrePairAgg, keywordAgg, topMovies]) => ({
          genreAgg, financialAgg, peopleAgg, genrePairAgg, keywordAgg, topMovies,
        }))
        .catch(error => {
          scopeCache.delete(key)
          throw error
        }),
    )
  }
  return scopeCache.get(key)!
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useData(scopeType: ShardScopeType, scopeId: string): AppData {
  const [core, setCore] = useState<CoreData | null>(null)
  const [scoped, setScoped] = useState<ScopedData>(EMPTY_SCOPED)
  const [scopedKpi, setScopedKpi] = useState<ScopedKpiData>(EMPTY_SCOPED_KPI)
  const [coreError, setCoreError] = useState<string | null>(null)
  const [scopeLoading, setScopeLoading] = useState(true)
  const scopeInStateRef = useRef<string | null>(null)

  // Layer 1 — core, once
  useEffect(() => {
    let cancelled = false
    loadCore()
      .then(c => { if (!cancelled) setCore(c) })
      .catch(err => { if (!cancelled) setCoreError(String(err)) })
    return () => { cancelled = true }
  }, [])

  // Layer 2 — scoped, on scope change.
  // No scopeRef guard here — scopeCache handles deduplication so the promise
  // is never re-fetched; removing the guard lets the effect survive Strict Mode's
  // double-invocation (run → cancel → run) without silently skipping the load.
  useEffect(() => {
    const key = scopeKey(scopeType, scopeId)

    if (scopeInStateRef.current === key) {
      setScopeLoading(false)
      return
    }

    let cancelled = false
    setScopeLoading(true)

    const cachedKpi = scopeKpiResolved.get(key)
    if (cachedKpi) {
      setScopedKpi(cachedKpi)
    } else {
      setScopedKpi(EMPTY_SCOPED_KPI)
      loadScopedKpis(scopeType, scopeId)
        .then(s => {
          if (!cancelled) setScopedKpi(s)
        })
        .catch(() => { if (!cancelled) setScopedKpi(EMPTY_SCOPED_KPI) })
    }

    loadScopedDetails(scopeType, scopeId)
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

  return {
    movies:       [],
    manifest:     core?.manifest ?? null,
    geo:          core?.geo ?? [],
    countriesGeo: core?.countriesGeo ?? EMPTY_COUNTRIES,
    kpi:          core?.kpi ?? [],
    kpiLanguage:  core?.kpiLanguage ?? [],
    ...scoped,
    kpiTiles:     scopedKpi.kpiTiles.length ? scopedKpi.kpiTiles : core?.kpiTiles ?? [],
    kpiTileShard: scopedKpi.kpiTiles.length ? scopedKpi.shard : core ? { scope_type: 'world', scope_id: 'WORLD' } : null,
    loading:      core === null,
    scopeLoading,
    error:        coreError,
  }
}
