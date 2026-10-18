// Art Institute of Chicago API からパブリックドメインの絵画を一枚選ぶ。
// https://api.artic.edu/docs/
const AIC_API = 'https://api.artic.edu/api/v1'

interface AicArtwork {
  id: number
  title: string
  artist_display: string | null
  date_display: string | null
  image_id: string | null
}

export interface PickedArtwork {
  source: 'aic'
  source_id: string
  title: string
  artist: string | null
  date_display: string | null
  image_url: string
  source_url: string
}

// AIC は検索の深さが 1000 件までなので、その範囲でランダムな位置を取る。
// excludeIds: すでにお題にした作品の source_id
export async function pickRandomPainting(excludeIds: Set<string>): Promise<PickedArtwork> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const from = Math.floor(Math.random() * 1000)
    const res = await $fetch<{ data: AicArtwork[] }>(`${AIC_API}/artworks/search`, {
      method: 'POST',
      headers: { 'AIC-User-Agent': 'unsaid (pilot)' },
      body: {
        query: {
          bool: {
            must: [
              { term: { is_public_domain: true } },
              { term: { artwork_type_id: 1 } }, // 1 = Painting
              { exists: { field: 'image_id' } },
            ],
          },
        },
        fields: ['id', 'title', 'artist_display', 'date_display', 'image_id'],
        limit: 1,
        from,
      },
    })

    const a = res.data[0]
    if (!a?.image_id || excludeIds.has(String(a.id))) continue

    return {
      source: 'aic',
      source_id: String(a.id),
      title: a.title,
      artist: a.artist_display,
      date_display: a.date_display,
      image_url: `https://www.artic.edu/iiif/2/${a.image_id}/full/843,/0/default.jpg`,
      source_url: `https://www.artic.edu/artworks/${a.id}`,
    }
  }
  throw createError({ statusCode: 502, statusMessage: 'お題の絵を取得できませんでした' })
}
