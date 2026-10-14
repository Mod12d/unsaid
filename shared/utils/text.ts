// 字数の数え方を一か所に決めておく（画面表示とサーバー保存で食い違わないように）。
// 空白・改行は数えない。Array.from でサロゲートペアを一文字として数える。
export function countChars(text: string): number {
  return Array.from(text.replace(/\s/g, '')).length
}

export const REVIEW_AXES = [
  { key: 'selection', label: '何を選んだか' },
  { key: 'metaphor', label: '比喩の密度' },
  { key: 'rhythm', label: '文のリズム' },
  { key: 'body', label: '身体の描き方' },
] as const
