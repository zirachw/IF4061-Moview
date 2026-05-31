import type { PagesFunction } from '@cloudflare/workers-types'

interface Env { DB: D1Database }

const ENTITY_TYPES = ['director', 'studio', 'cast'] as const

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { searchParams } = new URL(request.url)
  const scope_type  = searchParams.get('scope_type')  ?? 'world'
  const scope_id    = searchParams.get('scope_id')    ?? 'WORLD'
  const entity_type = searchParams.get('entity_type')

  const ets = (entity_type && (ENTITY_TYPES as readonly string[]).includes(entity_type))
    ? [entity_type]
    : [...ENTITY_TYPES]

  const queries = ets.map(et =>
    env.DB.prepare(`
      WITH top AS (
        SELECT name FROM people_agg
        WHERE scope_type = ? AND scope_id = ? AND entity_type = ?
        GROUP BY name ORDER BY SUM(film_count) DESC LIMIT 200
      )
      SELECT p.* FROM people_agg p
      WHERE p.scope_type = ? AND p.scope_id = ? AND p.entity_type = ?
      AND p.name IN (SELECT name FROM top)
    `).bind(scope_type, scope_id, et, scope_type, scope_id, et).all()
  )

  const allResults = await Promise.all(queries)
  return Response.json(allResults.flatMap(r => r.results))
}
