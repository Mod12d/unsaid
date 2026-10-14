import { serverSupabaseClient } from '#supabase/server'

// 今日のお題と、自分の投稿・講評・（投稿済みなら）模範文を返す。
// ユーザーの権限で読むので、見えてよいものだけが RLS で返る。
export default defineEventHandler(async (event): Promise<TodayResponse> => {
  const userId = await requireUserId(event)
  const db = await serverSupabaseClient(event)

  const { data: prompt } = await db
    .from('prompts')
    .select('id, date, constraint_text, target_length, artworks(*)')
    .eq('date', todayJst())
    .maybeSingle<Prompt>()

  if (!prompt) return { prompt: null, submission: null, review: null, reference: null }

  const { data: submission } = await db
    .from('submissions')
    .select('*')
    .eq('prompt_id', prompt.id)
    .eq('user_id', userId)
    .maybeSingle<Submission>()

  if (!submission) return { prompt, submission: null, review: null, reference: null }

  const [{ data: review }, { data: reference }] = await Promise.all([
    db
      .from('reviews')
      .select('*')
      .eq('submission_id', submission.id)
      .eq('rubric_version', RUBRIC_VERSION)
      .maybeSingle<Review>(),
    db.from('reference_texts').select('body').eq('prompt_id', prompt.id).maybeSingle(),
  ])

  return { prompt, submission, review, reference: reference?.body ?? null }
})
