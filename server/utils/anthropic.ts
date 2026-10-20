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

// 画像はこちらで取得して base64 で渡す。
// URL を渡すと Anthropic 側がダウンロードするが、美術館の画像サーバーが外部からの取得を弾くことがあるため。
const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type MediaType = (typeof SUPPORTED_MEDIA_TYPES)[number]

export async function imageBlock(url: string): Promise<Anthropic.ImageBlockParam> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'unsaid (pilot)', 'AIC-User-Agent': 'unsaid (pilot)' },
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `画像を取得できませんでした (${res.status})` })
  }
  const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0]!.trim()
  const mediaType: MediaType = (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(contentType)
    ? (contentType as MediaType)
    : 'image/jpeg'
  const data = Buffer.from(await res.arrayBuffer()).toString('base64')
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
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
