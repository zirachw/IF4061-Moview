import type { PagesFunction } from '@cloudflare/workers-types'

interface Env { DB: D1Database }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { searchParams } = new URL(request.url)
  const scope_type  = searchParams.get('scope_type')  ?? 'world'
  const scope_id    = searchParams.get('scope_id')    ?? 'WORLD'
  const entity_type = searchParams.get('entity_type')

  let query = 'SELECT * FROM people_agg WHERE scope_type = ? AND scope_id = ?'
  const params: unknown[] = [scope_type, scope_id]

  if (entity_type) {
    query += ' AND entity_type = ?'
    params.push(entity_type)
  }

  query += ' ORDER BY film_count DESC LIMIT 2000'

  const { results } = await env.DB.prepare(query).bind(...params).all()
  return Response.json(results)
}
