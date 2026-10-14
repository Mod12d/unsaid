// 講評の再実行（AI 呼び出しが失敗したとき用）
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })
  return await reviewAndSave(event, id)
})
