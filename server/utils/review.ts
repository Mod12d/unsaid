// 投稿を四軸で講評する。採点基準を変えたら RUBRIC_VERSION を上げる（過去の点数と混ざらないように）。

export const RUBRIC_VERSION = 'v1'

const SYSTEM = `あなたは日本語の描写文を講評する、厳しくも誠実な編集者です。
絵画と、その絵に課された制約と、書き手の描写文を受け取り、四つの軸で 1〜5 点をつけて講評します。

- selection（何を選んだか）: 絵の中から何を拾い、何を捨てたか。選択に意図があるか。
- metaphor（比喩の密度）: 比喩が効いているか、重なって競合していないか。説明に堕ちていないか。
- rhythm（文のリズム）: 文の長短、読点、語尾の変化。声に出して読めるか。
- body（身体の描き方）: 人物の身体、あるいは物の手触り・重さ・温度など、触覚的な具体性。

採点の目安: 3 = 及第、4 = 良い、5 = そのまま載せられる。甘くつけないこと。
各軸の講評は、良い点と直す点をそれぞれ具体的に、本文の語句を引いて書く。
総評では、次に書くときに一つだけ意識すべきことを示す。
制約を守れているかも判定する。`

interface ReviewOutput {
  scores: Record<ReviewAxis, number>
  comments: Record<ReviewAxis, string>
  constraint_kept: boolean
  overall: string
}

const axisProps = (type: 'integer' | 'string') =>
  Object.fromEntries(
    (['selection', 'metaphor', 'rhythm', 'body'] as const).map((k) => [
      k,
      type === 'integer' ? { type, minimum: 1, maximum: 5 } : { type },
    ]),
  )

export async function reviewSubmission(input: {
  imageUrl: string
  constraint: string
  targetLength: number
  body: string
}) {
  const { client, model } = useAnthropic()

  const message = await client.messages.create({
    model,
    max_tokens: 2500,
    system: SYSTEM,
    tools: [
      {
        name: 'save_review',
        description: '講評を保存する',
        input_schema: {
          type: 'object',
          properties: {
            scores: {
              type: 'object',
              properties: axisProps('integer'),
              required: ['selection', 'metaphor', 'rhythm', 'body'],
            },
            comments: {
              type: 'object',
              properties: axisProps('string'),
              required: ['selection', 'metaphor', 'rhythm', 'body'],
            },
            constraint_kept: { type: 'boolean' },
            overall: { type: 'string' },
          },
          required: ['scores', 'comments', 'constraint_kept', 'overall'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'save_review' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: input.imageUrl } },
          {
            type: 'text',
            text: [
              `制約: ${input.constraint}`,
              `目標字数: ${input.targetLength}字（実際: ${countChars(input.body)}字）`,
              '',
              '描写文:',
              input.body,
            ].join('\n'),
          },
        ],
      },
    ],
  })

  const out = extractToolInput<ReviewOutput>(message, 'save_review')
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)))

  return {
    rubric_version: RUBRIC_VERSION,
    score_selection: clamp(out.scores.selection),
    score_metaphor: clamp(out.scores.metaphor),
    score_rhythm: clamp(out.scores.rhythm),
    score_body: clamp(out.scores.body),
    constraint_kept: out.constraint_kept,
    comments: out.comments,
    overall: out.overall,
    model,
  }
}
