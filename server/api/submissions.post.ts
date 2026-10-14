import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const Body = z.object({
  promptId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
})

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const input = await readValidatedBody(event, Body.parse)
  const db = await serverSupabaseClient(event)

  // user_id は DB 側の default auth.uid() で入る（クライアントから偽装できない）
  const { data: submission, error } = await db
    .from('submissions')
    .insert({ prompt_id: input.promptId, body: input.body, char_count: countChars(input.body) })
    .select('id')
    .single()

  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'このお題にはすでに投稿済みです' })
  }
  if (error || !submission) throw createError({ statusCode: 500, statusMessage: error?.message })

  // 講評が失敗しても投稿は残る。画面から再実行できる。
  try {
    await reviewAndSave(event, submission.id)
  } catch (e) {
    console.error('review failed', e)
  }

  return { submissionId: submission.id }
})
