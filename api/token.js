import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const WORDS = [
  'LIKEUR','VIEWER','STREAM','ABONNE','CLIP','LIVE','CHAT',
  'GAMING','FOLLOW','HYPE','RAID','SQUAD','GRIND','NOLIFE',
  'POGGERS','MONTAGE','UPLOAD','CONTENU','REPOST','PARTAGE',
  'FANDOM','COLLAB','BOOST','TRENDING','VIRAL','IMPACT',
  'SOUTIEN','MEMBRE','FIDELE','ACTIF','PRESENT','REGULIER',
  'COMMENTAIRE','REACTION','REPONSE','DISCUSSION','DIALOGUE',
  'POUCE','CLOCHE','NOTIFICATION','ALERTE','NOUVEAU','FRAIS'
]

async function getUniqueWord(videoId) {
  const usedKey = `used_words:${videoId}`
  const used = await redis.smembers(usedKey)
  const available = WORDS.filter(w => !used.includes(w))
  if (!available.length) {
    // Si tous les mots sont utilisés, on génère un combo
    const w1 = WORDS[Math.floor(Math.random() * WORDS.length)]
    const w2 = WORDS[Math.floor(Math.random() * WORDS.length)]
    return w1 + w2
  }
  const word = available[Math.floor(Math.random() * available.length)]
  await redis.sadd(usedKey, word)
  await redis.expire(usedKey, 60 * 60 * 48)
  return word
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { viewerId, videoId } = req.query
  if (!viewerId || !videoId) return res.status(400).json({ error: 'Missing params' })

  const key = `token:${videoId}:${viewerId}`
  let token = await redis.get(key)

  if (!token) {
    token = await getUniqueWord(videoId)
    await redis.set(key, token, { ex: 60 * 60 * 48 })
  }

  return res.status(200).json({ token })
}
