import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function useAnthropic() {
  const config = useRuntimeConfig()
  if (!config.anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_ANTHROPIC_API_KEY が未設定です' })
  }
  client ??= new Anthropic({ apiKey: config.anthropicApiKey })
  return { client, model: config.anthropicModel }
}

// 構造化出力（output_config.format: json_schema）の応答から JSON を取り出す。
// スキーマに沿った JSON が text ブロックで返ってくる。
// https://platform.claude.com/docs/en/build-with-claude/structured-outputs
export function extractJson<T>(message: Anthropic.Message): T {
  if (message.stop_reason === 'max_tokens') {
    throw createError({ statusCode: 502, statusMessage: 'AI の応答が途中で切れました' })
  }
  if (message.stop_reason === 'refusal') {
    throw createError({ statusCode: 502, statusMessage: 'AI が応答を拒否しました' })
  }
  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!block) throw createError({ statusCode: 502, statusMessage: 'AI の応答形式が想定外です' })
  return JSON.parse(block.text) as T
}
