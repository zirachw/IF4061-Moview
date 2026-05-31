export interface Movie {
  id: number
  title: string
  year: number | null
  month: number | null
  decade: number | null
  genres: string[]
  primary_genre: string | null
  budget: number | null
  revenue: number | null
  profit: number | null
  vote_average: number | null
  vote_count: number
  popularity: number | null
  director: string | null
  cast: string[]
  production_companies: string[]
  primary_iso: string | null
  continent: string | null
  original_language: string
  keywords: string[]
}

export interface GeoEntry {
  iso_a2: string
  name: string
  continent: string | null
  film_count: number
  avg_profit: number | null
  avg_rating: number | null
}

export interface CountryFeatureCollection {
  type: 'FeatureCollection'
  features: CountryFeature[]
}

export interface CountryFeature {
  type: 'Feature'
  properties?: {
    ISO_A2?: string
    ISO_A2_EH?: string
    NAME?: string
    NAME_CIAWF?: string
    NAME_LONG?: string
    CONTINENT?: string
  }
  geometry?: unknown
}

export type ScopeType = 'world' | 'continent' | 'country'

export interface MetricAgg {
  scope_type: ScopeType
  scope_id: string
  year: number
  film_count: number
  budget_sum: number
  budget_count: number
  revenue_sum: number
  revenue_count: number
  profit_sum: number
  profit_count: number
  rating_sum: number
  rating_count: number
  vote_count_sum: number
  popularity_sum: number
  popularity_count: number
}

export interface KpiLanguageEntry {
  scope_type: ScopeType
  scope_id: string
  year: number
  language: string | null
  film_count: number
}

export interface KpiTileEntry {
  scope_type: ScopeType
  scope_id: string
  from_year: number
  to_year: number
  tab: TabId
  films?: number | null
  avg_popularity?: number | null
  avg_rating?: number | null
  vote_count?: number | null
  avg_budget?: number | null
  avg_profit?: number | null
  avg_roi?: number | null
  active_genres?: number | null
  top_genre?: string | null
  top_language?: string | null
  studio_count?: number | null
  director_count?: number | null
  cast_count?: number | null
}

export interface GenreAggEntry extends MetricAgg {
  genre: string | null
}

export type BudgetTier = 'Low' | 'Mid' | 'High'
export type ProfitTier = 'Low' | 'Mid-Low' | 'Mid-High' | 'High'

export interface FinancialAggEntry extends MetricAgg {
  genre: string | null
  budget_tier: BudgetTier | null
  release_season: string | null
  profit_tier: ProfitTier | null
}

export type PeopleEntityType = 'director' | 'studio' | 'cast'

export interface PeopleAggEntry extends MetricAgg {
  entity_type: PeopleEntityType
  name: string
}

export interface GenrePairAggEntry extends MetricAgg {
  genre_a: string
  genre_b: string
}

export interface KeywordAggEntry {
  scope_type: ScopeType
  scope_id: string
  year: number
  genre: string
  keyword: string
  count: number
}

export interface TopMovieEntry {
  scope_type: ScopeType
  scope_id: string
  id: number
  title: string
  year: number | null
  month: number | null
  primary_genre: string | null
  primary_iso: string | null
  continent: string | null
  budget: number | null
  revenue: number | null
  profit: number | null
  vote_average: number | null
  vote_count: number
  popularity: number | null
}

export interface Manifest {
  generated_at: string
  year_min: number
  year_max: number
  db?: string
  core_files: string[]
  scopes?: Array<{ scope_type: ScopeType; scope_id: string; path: string }>
  scope_files?: string[]
}

export interface AppData {
  movies: Movie[]
  manifest: Manifest | null
  geo: GeoEntry[]
  countriesGeo: CountryFeatureCollection
  kpi: MetricAgg[]
  kpiTiles: KpiTileEntry[]
  kpiTileShard: { scope_type: ScopeType; scope_id: string } | null
  kpiLanguage: KpiLanguageEntry[]
  genreAgg: GenreAggEntry[]
  financialAgg: FinancialAggEntry[]
  peopleAgg: PeopleAggEntry[]
  genrePairAgg: GenrePairAggEntry[]
  keywordAgg: KeywordAggEntry[]
  topMovies: TopMovieEntry[]
  loading: boolean
  scopeLoading: boolean
  error: string | null
}

export interface FilterState {
  country: string | null
  continent: string | null
  yearRange: [number, number]
}

export type TabId = 'popularity' | 'financial' | 'genre' | 'people'
