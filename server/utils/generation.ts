// お題の「制約」と「AI の模範文」を、絵を見せて一度に生成する。

const SYSTEM = `あなたは日本語の描写訓練のお題を作る編集者です。
渡された絵画を一枚見て、次の二つを作ります。

1. 制約（constraint）
   書き手に課す縛りを一文で。描写の選択を鍛えるものにする。
   例: 「人物の感情を直接書かない」「絵の中にいる別の人物の視点で書く」「色の名前を使わない」「音だけで場面を立ち上げる」
   絵の内容に合ったものを選び、毎回同じ型に偏らないこと。

2. 模範文（reference_text）
   その制約を守った描写文。目標字数の前後一割に収める（空白・改行は数えない）。
   作品名・作者名・美術史の解説は書かない。説明ではなく描写にする。
   比喩は重ねすぎず、一つの文に一つまでを目安にする。`

interface Generated {
  constraint: string
  reference_text: string
}

export async function generatePromptContent(
  artwork: { title: string; image_url: string },
  targetLength: number,
): Promise<Generated & { model: string }> {
  const { client, model } = useAnthropic()

  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM,
    tools: [
      {
        name: 'save_prompt',
        description: 'お題の制約と模範文を保存する',
        input_schema: {
          type: 'object',
          properties: {
            constraint: { type: 'string', description: '制約を一文で' },
            reference_text: { type: 'string', description: '制約を守った模範文' },
          },
          required: ['constraint', 'reference_text'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'save_prompt' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: artwork.image_url } },
          { type: 'text', text: `目標字数: ${targetLength}字` },
        ],
      },
    ],
  })

  return { ...extractToolInput<Generated>(message, 'save_prompt'), model }
}
