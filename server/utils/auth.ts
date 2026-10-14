import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

// @nuxtjs/supabase の版によって、user オブジェクト（id）か JWT クレーム（sub）が返るので両方に対応する。
export async function requireUserId(event: H3Event): Promise<string> {
  const user = (await serverSupabaseUser(event).catch(() => null)) as
    | { id?: string; sub?: string }
    | null
  const id = user?.id ?? user?.sub
  if (!id) throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  return id
}
