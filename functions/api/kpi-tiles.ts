import type { PagesFunction } from '@cloudflare/workers-types'

interface Env { DB: D1Database }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { searchParams } = new URL(request.url)
  const scope_type = searchParams.get('scope_type') ?? 'world'
  const scope_id   = searchParams.get('scope_id')   ?? 'WORLD'
  const tab        = searchParams.get('tab')        ?? 'popularity'
  const from_year  = Number(searchParams.get('from_year') ?? 0)
  const to_year    = Number(searchParams.get('to_year')   ?? 9999)

  const base = [scope_type, scope_id, from_year, to_year] as const

  let row: Record<string, unknown> | null = null

  if (tab === 'popularity') {
    const result = await env.DB
      .prepare(`
        SELECT
          SUM(film_count) AS films,
          CAST(SUM(popularity_sum) AS REAL) / NULLIF(SUM(popularity_count), 0) AS avg_popularity,
          CAST(SUM(rating_sum)     AS REAL) / NULLIF(SUM(rating_count),     0) AS avg_rating,
          SUM(vote_count_sum) AS vote_count
        FROM kpi
        WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?
      `)
      .bind(...base)
      .first<Record<string, unknown>>()
    row = result

  } else if (tab === 'financial') {
    const result = await env.DB
      .prepare(`
        SELECT
          (SELECT SUM(film_count)
           FROM kpi WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?) AS films,
          CAST(SUM(budget_sum)  AS REAL) / NULLIF(SUM(budget_count),  0) AS avg_budget,
          CAST(SUM(profit_sum)  AS REAL) / NULLIF(SUM(profit_count),  0) AS avg_profit,
          CAST(SUM(revenue_sum) AS REAL) / NULLIF(SUM(budget_sum),    0) AS avg_roi
        FROM financial_agg
        WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?
      `)
      .bind(...base, ...base)
      .first<Record<string, unknown>>()
    row = result

  } else if (tab === 'genre') {
    const result = await env.DB
      .prepare(`
        SELECT
          (SELECT SUM(film_count)
           FROM kpi WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?) AS films,
          NULLIF((SELECT COUNT(DISTINCT genre)
           FROM genre_agg WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?), 0) AS active_genres,
          (SELECT genre FROM genre_agg
           WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?
           GROUP BY genre ORDER BY SUM(film_count) DESC LIMIT 1) AS top_genre,
          (SELECT language FROM kpi_language
           WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?
           GROUP BY language ORDER BY SUM(film_count) DESC LIMIT 1) AS top_language
      `)
      .bind(...base, ...base, ...base, ...base)
      .first<Record<string, unknown>>()
    row = result

  } else if (tab === 'people') {
    const result = await env.DB
      .prepare(`
        SELECT
          (SELECT SUM(film_count)
           FROM kpi WHERE scope_type = ? AND scope_id = ? AND year BETWEEN ? AND ?) AS films,
          NULLIF((SELECT COUNT(DISTINCT name) FROM people_agg
           WHERE scope_type = ? AND scope_id = ? AND entity_type = 'studio'
             AND year BETWEEN ? AND ?), 0) AS studio_count,
          NULLIF((SELECT COUNT(DISTINCT name) FROM people_agg
           WHERE scope_type = ? AND scope_id = ? AND entity_type = 'director'
             AND year BETWEEN ? AND ?), 0) AS director_count,
          NULLIF((SELECT COUNT(DISTINCT name) FROM people_agg
           WHERE scope_type = ? AND scope_id = ? AND entity_type = 'cast'
             AND year BETWEEN ? AND ?), 0) AS cast_count
      `)
      .bind(...base, ...base, ...base, ...base)
      .first<Record<string, unknown>>()
    row = result

  } else {
    return new Response(`Unknown tab: ${tab}`, { status: 400 })
  }

  return Response.json({ tab, scope_type, scope_id, from_year, to_year, ...row })
}
