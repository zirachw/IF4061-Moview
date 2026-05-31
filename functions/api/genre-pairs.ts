import type { PagesFunction } from '@cloudflare/workers-types'

interface Env { DB: D1Database }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { searchParams } = new URL(request.url)
  const scope_type = searchParams.get('scope_type') ?? 'world'
  const scope_id   = searchParams.get('scope_id')   ?? 'WORLD'

  const { results } = await env.DB
    .prepare('SELECT * FROM genre_pair_agg WHERE scope_type = ? AND scope_id = ?')
    .bind(scope_type, scope_id)
    .all()

  return Response.json(results)
}
