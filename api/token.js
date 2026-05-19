import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { viewerId, videoId } = req.query
  if (!viewerId || !videoId) return res.status(400).json({ error: 'Missing params' })

  const key = `token:${videoId}:${viewerId}`
  let token = await redis.get(key)

  if (!token) {
    token = Math.random().toString(36).substring(2, 8).toUpperCase()
    await redis.set(key, token, { ex: 60 * 60 * 48 })
  }

  return res.status(200).json({ token })
}
