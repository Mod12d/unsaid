import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

// 投稿を（ユーザー権限で）読み、講評を生成して（service role で）保存する。
// 投稿直後と「講評の再実行」の両方から使う。
export async function reviewAndSave(event: H3Event, submissionId: string): Promise<Review> {
  const userDb = await serverSupabaseClient(event)

  // ユーザー権限で読めた = 本人の投稿であることの確認にもなる
  const { data: sub } = await userDb
    .from('submissions')
    .select('id, body, prompts(constraint_text, target_length, artworks(image_url))')
    .eq('id', submissionId)
    .maybeSingle<{
      id: string
      body: string
      prompts: { constraint_text: string; target_length: number; artworks: { image_url: string } }
    }>()
  if (!sub) throw createError({ statusCode: 404, statusMessage: '投稿が見つかりません' })

  const result = await reviewSubmission({
    imageUrl: sub.prompts.artworks.image_url,
    constraint: sub.prompts.constraint_text,
    targetLength: sub.prompts.target_length,
    body: sub.body,
  })

  const { data, error } = await serverSupabaseServiceRole(event)
    .from('reviews')
    .upsert({ submission_id: sub.id, ...result }, { onConflict: 'submission_id,rubric_version' })
    .select('*')
    .single<Review>()
  if (error || !data) throw createError({ statusCode: 500, statusMessage: error?.message })
  return data
}
