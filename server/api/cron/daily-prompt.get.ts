import { createHash } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'

// 毎朝のお題生成。Vercel Cron は Authorization: Bearer <CRON_SECRET> を付けて叩く。
// 手元では: curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-prompt
export default defineEventHandler(async (event) => {
  // nuxt.config の process.env はビルド時に固定されるので、実行時の環境変数を直接読む。
  // Vercel で後から CRON_SECRET を登録・変更しても、再ビルドなしで反映される。
  const cronSecret = (process.env.CRON_SECRET || useRuntimeConfig().cronSecret || '').trim()
  const received = (getHeader(event, 'authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!cronSecret || received !== cronSecret) {
    // 値そのものは出さず、長さとハッシュの先頭だけを記録する（食い違いの原因を調べるため）
    const fp = (s: string) => (s ? createHash('sha256').update(s).digest('hex').slice(0, 8) : '-')
    console.warn('[cron] unauthorized', {
      serverLen: cronSecret.length,
      serverHash: fp(cronSecret),
      receivedLen: received.length,
      receivedHash: fp(received),
    })
    throw createError({ statusCode: 401 })
  }

  const db = serverSupabaseServiceRole(event)
  const date = todayJst()
  const targetLength = 400

  // 二重実行しても一日一題になるように
  const { data: existing } = await db.from('prompts').select('id').eq('date', date).maybeSingle()
  if (existing) return { status: 'exists', date }

  const { data: used } = await db.from('artworks').select('source_id').eq('source', 'aic')
  const picked = await pickRandomPainting(new Set((used ?? []).map((r) => r.source_id)))

  const { data: artwork, error: artErr } = await db
    .from('artworks')
    .upsert(picked, { onConflict: 'source,source_id' })
    .select('id, title, image_url')
    .single()
  if (artErr || !artwork) throw createError({ statusCode: 500, statusMessage: artErr?.message })

  const generated = await generatePromptContent(artwork, targetLength)

  const { data: prompt, error: promptErr } = await db
    .from('prompts')
    .insert({
      date,
      artwork_id: artwork.id,
      constraint_text: generated.constraint,
      target_length: targetLength,
    })
    .select('id')
    .single()
  if (promptErr || !prompt) throw createError({ statusCode: 500, statusMessage: promptErr?.message })

  const { error: refErr } = await db.from('reference_texts').insert({
    prompt_id: prompt.id,
    body: generated.reference_text,
    model: generated.model,
  })
  if (refErr) throw createError({ statusCode: 500, statusMessage: refErr.message })

  return { status: 'created', date, title: artwork.title, constraint: generated.constraint }
})
