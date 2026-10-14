// JST の「今日」を YYYY-MM-DD で返す。サーバーが UTC で動いても日付がずれないように。
export function todayJst(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())
}
