'use strict'

/**
 * Known Subscription Services Database
 * 
 * A curated list of common subscription services with their typical characteristics.
 * Used to boost confidence when detecting subscriptions.
 */

const KNOWN_SUBSCRIPTIONS = [
  // Streaming Services
  { name: 'netflix', aliases: ['netflix', 'netflix.com', 'netflix inc'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'spotify', aliases: ['spotify', 'spotify.com', 'spotify usa'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'youtube', aliases: ['youtube', 'youtube.com', 'youtube premium', 'google youtube'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'disney', aliases: ['disney', 'disney+', 'disney plus', 'disneyplus'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'hulu', aliases: ['hulu', 'hulu.com'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'amazon prime', aliases: ['amazon prime', 'prime video', 'amazon prime video'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'apple tv', aliases: ['apple tv', 'apple tv+', 'appletv'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'hbo', aliases: ['hbo', 'hbo max', 'hbomax', 'max'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'paramount', aliases: ['paramount', 'paramount+', 'paramount plus'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'peacock', aliases: ['peacock', 'nbc peacock'], category: 'entertainment', typicalFrequency: 'monthly' },
  
  // Music Services
  { name: 'apple music', aliases: ['apple music', 'itunes music'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'tidal', aliases: ['tidal', 'tidal.com'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'pandora', aliases: ['pandora', 'pandora media'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'soundcloud', aliases: ['soundcloud', 'soundcloud go'], category: 'entertainment', typicalFrequency: 'monthly' },
  
  // Software & Cloud Services
  { name: 'adobe', aliases: ['adobe', 'adobe creative cloud', 'adobe systems'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'microsoft 365', aliases: ['microsoft 365', 'office 365', 'microsoft office'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'dropbox', aliases: ['dropbox', 'dropbox.com'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'google drive', aliases: ['google drive', 'google one'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'icloud', aliases: ['icloud', 'apple icloud'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'github', aliases: ['github', 'github.com'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'notion', aliases: ['notion', 'notion.so'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'slack', aliases: ['slack', 'slack technologies'], category: 'software', typicalFrequency: 'monthly' },
  { name: 'zoom', aliases: ['zoom', 'zoom.us'], category: 'software', typicalFrequency: 'monthly' },
  
  // Social Media Premium
  { name: 'snapchat', aliases: ['snapchat', 'snap inc'], category: 'social', typicalFrequency: 'monthly' },
  { name: 'twitter', aliases: ['twitter', 'twitter blue', 'x.com', 'x premium'], category: 'social', typicalFrequency: 'monthly' },
  { name: 'linkedin', aliases: ['linkedin', 'linkedin premium'], category: 'professional', typicalFrequency: 'monthly' },
  
  // Fitness & Health
  { name: 'peloton', aliases: ['peloton', 'peloton interactive'], category: 'fitness', typicalFrequency: 'monthly' },
  { name: 'strava', aliases: ['strava', 'strava inc'], category: 'fitness', typicalFrequency: 'monthly' },
  { name: 'myfitnesspal', aliases: ['myfitnesspal', 'under armour'], category: 'health', typicalFrequency: 'monthly' },
  { name: 'headspace', aliases: ['headspace', 'headspace inc'], category: 'health', typicalFrequency: 'monthly' },
  { name: 'calm', aliases: ['calm', 'calm.com'], category: 'health', typicalFrequency: 'monthly' },
  
  // News & Media
  { name: 'new york times', aliases: ['new york times', 'nytimes', 'ny times'], category: 'news', typicalFrequency: 'monthly' },
  { name: 'washington post', aliases: ['washington post', 'wapo'], category: 'news', typicalFrequency: 'monthly' },
  { name: 'wall street journal', aliases: ['wall street journal', 'wsj', 'dow jones'], category: 'news', typicalFrequency: 'monthly' },
  { name: 'the atlantic', aliases: ['the atlantic', 'atlantic'], category: 'news', typicalFrequency: 'monthly' },
  
  // Gaming
  { name: 'xbox game pass', aliases: ['xbox game pass', 'xbox live', 'microsoft xbox'], category: 'gaming', typicalFrequency: 'monthly' },
  { name: 'playstation plus', aliases: ['playstation', 'playstation plus', 'ps plus', 'sony playstation'], category: 'gaming', typicalFrequency: 'monthly' },
  { name: 'nintendo switch online', aliases: ['nintendo', 'nintendo switch online'], category: 'gaming', typicalFrequency: 'monthly' },
  { name: 'steam', aliases: ['steam', 'valve'], category: 'gaming', typicalFrequency: 'monthly' },
  
  // Food & Delivery
  { name: 'amazon prime', aliases: ['amazon prime', 'amazon.com prime'], category: 'shopping', typicalFrequency: 'annual' },
  { name: 'instacart', aliases: ['instacart', 'instacart express'], category: 'food', typicalFrequency: 'monthly' },
  { name: 'doordash', aliases: ['doordash', 'doordash pass'], category: 'food', typicalFrequency: 'monthly' },
  { name: 'uber eats', aliases: ['uber eats', 'uber pass'], category: 'food', typicalFrequency: 'monthly' },
  
  // Other Common Services
  { name: 'audible', aliases: ['audible', 'audible.com'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'kindle unlimited', aliases: ['kindle unlimited', 'amazon kindle'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'patreon', aliases: ['patreon', 'patreon.com'], category: 'entertainment', typicalFrequency: 'monthly' },
  { name: 'onlyfans', aliases: ['onlyfans', 'onlyfans.com'], category: 'entertainment', typicalFrequency: 'monthly' },
]

/**
 * Check if a merchant name matches a known subscription service
 * @param {string} merchantName - Merchant name (can be normalized or original)
 * @returns {Object|null} - Known subscription info or null
 */
function findKnownSubscription (merchantName) {
  if (!merchantName) return null
  
  // Normalize the input: lowercase, remove common suffixes, etc.
  let normalized = merchantName.toLowerCase().trim()
  
  // Remove common domain suffixes and company suffixes for matching
  normalized = normalized.replace(/\.(com|net|org|io|co|app|tv|plus|us|ca|uk|fr|de)\b/gi, '')
  normalized = normalized.replace(/\s+(inc|llc|ltd|corp|co|usa|ab|gmbh|pty|limited)\b/gi, '')
  normalized = normalized.replace(/\s*\+\s*/g, ' plus ')
  normalized = normalized.replace(/\s*-\s*/g, ' ')
  normalized = normalized.replace(/[^\w\s]/g, ' ') // Remove punctuation
  normalized = normalized.replace(/\s+/g, ' ').trim()
  
  // Try exact match first, then partial matches
  for (const service of KNOWN_SUBSCRIPTIONS) {
    for (const alias of service.aliases) {
      const aliasNormalized = alias.toLowerCase().trim()
      
      // Exact match
      if (normalized === aliasNormalized) {
        return {
          name: service.name,
          category: service.category,
          typicalFrequency: service.typicalFrequency,
          confidence: 0.95
        }
      }
      
      // Check if normalized contains alias or vice versa
      if (normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
        // Additional check: ensure it's not too short (avoid false positives)
        if (normalized.length >= 3 && aliasNormalized.length >= 3) {
          return {
            name: service.name,
            category: service.category,
            typicalFrequency: service.typicalFrequency,
            confidence: 0.95
          }
        }
      }
      
      // Also check word-by-word matching for multi-word services
      const normalizedWords = normalized.split(/\s+/)
      const aliasWords = aliasNormalized.split(/\s+/)
      
      // If most words match, consider it a match
      if (normalizedWords.length > 1 && aliasWords.length > 1) {
        const matchingWords = normalizedWords.filter(word => 
          aliasWords.some(aliasWord => word.includes(aliasWord) || aliasWord.includes(word))
        )
        if (matchingWords.length >= Math.min(normalizedWords.length, aliasWords.length) * 0.7) {
          return {
            name: service.name,
            category: service.category,
            typicalFrequency: service.typicalFrequency,
            confidence: 0.9
          }
        }
      }
    }
  }
  
  return null
}

/**
 * Check if a category suggests a subscription
 * @param {string} categoryName - Category name
 * @returns {boolean} - True if category suggests subscription
 */
function isSubscriptionCategory (categoryName) {
  if (!categoryName) return false
  
  const normalized = categoryName.toLowerCase().trim()
  
  // Exact matches (highest confidence)
  const exactMatches = [
    'subscription',
    'subscriptions',
    'recurring',
    'recurring payment',
    'recurring payments'
  ]
  
  if (exactMatches.includes(normalized)) {
    return true
  }
  
  // Keyword matches
  const subscriptionKeywords = [
    'subscription',
    'subscriptions',
    'recurring',
    'membership',
    'premium',
    'service',
    'streaming',
    'software',
    'saas',
    'software as a service',
    'monthly service',
    'annual service'
  ]
  
  return subscriptionKeywords.some(keyword => normalized.includes(keyword))
}

module.exports = {
  KNOWN_SUBSCRIPTIONS,
  findKnownSubscription,
  isSubscriptionCategory
}

