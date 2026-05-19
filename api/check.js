import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const YT_API_KEY = process.env.YT_API_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { viewerId, videoId, token } = req.query
  if (!viewerId || !videoId || !token) return res.status(400).json({ error: 'Missing params' })

  const unlockedKey = `unlocked:${videoId}:${viewerId}`
  const alreadyUnlocked = await redis.get(unlockedKey)
  if (alreadyUnlocked) return res.status(200).json({ unlocked: true })

  try {
    let found = false
    let pageToken = ''
    let pages = 0

    while (!found && pages < 5) {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=time${pageToken ? '&pageToken=' + pageToken : ''}&key=${YT_API_KEY}`
      const r = await fetch(url)
      const data = await r.json()

      if (data.error) return res.status(200).json({ unlocked: false, error: data.error.message })

      for (const item of (data.items || [])) {
        const text = item.snippet.topLevelComment.snippet.textDisplay.toUpperCase()
        if (text.includes(token.toUpperCase())) {
          found = true
          break
        }
      }

      pageToken = data.nextPageToken || ''
      if (!pageToken) break
      pages++
    }

    if (found) {
      await redis.set(unlockedKey, '1', { ex: 60 * 60 * 24 * 30 })
      return res.status(200).json({ unlocked: true })
    } else {
      return res.status(200).json({ unlocked: false })
    }
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
