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

// tool_choice で特定のツールを強制し、その入力（= 構造化された出力）を取り出す。
// JSON を文章からパースするより壊れにくい。
export function extractToolInput<T>(message: Anthropic.Message, toolName: string): T {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === toolName,
  )
  if (!block) throw createError({ statusCode: 502, statusMessage: 'AI の応答形式が想定外です' })
  return block.input as T
}
