import { serverSupabaseClient } from '#supabase/server'

// 絵の画像を自分のサーバー経由で配信する。
// 美術館の画像サーバーはブラウザからの直接読み込みを弾くことがあるため。
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })

  const db = await serverSupabaseClient(event)
  const { data: artwork } = await db.from('artworks').select('image_url').eq('id', id).maybeSingle()
  if (!artwork) throw createError({ statusCode: 404 })

  const res = await fetch(artwork.image_url, {
    headers: { 'User-Agent': 'unsaid (pilot)', 'AIC-User-Agent': 'unsaid (pilot)' },
  })
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: `画像を取得できませんでした (${res.status})` })

  setHeader(event, 'Content-Type', res.headers.get('content-type') ?? 'image/jpeg')
  // 同じ絵の画像は変わらないので、ブラウザに一日キャッシュさせる
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  return Buffer.from(await res.arrayBuffer())
})
