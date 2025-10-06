export interface GameData {
  identifier: string
  thumbnailPath?: string
  description?: string
  mediatype?: string
  title: string
  date?: string
  creator?: string | string[]
  wikipedia?: string
  manual?: string | string[]
  tag?: string[]
  internetarchive?: string
}

let cachedGamesData: GameData[] | null = null
let loadingPromise: Promise<GameData[]> | null = null

export async function loadGamesData(): Promise<GameData[]> {
  // Return cached data if available
  if (cachedGamesData !== null) {
    return cachedGamesData
  }

  // Return existing loading promise if already loading
  if (loadingPromise !== null) {
    return loadingPromise
  }

  // Import config
  const { DATA_CONFIG } = await import('../config')
  
  // Build URLs to try
  const urlsToTry = []
  
  if (DATA_CONFIG.USE_EXTERNAL_DATA) {
    urlsToTry.push(DATA_CONFIG.GITHUB_PAGES_URL)
    urlsToTry.push(...DATA_CONFIG.ALTERNATIVE_URLS)
  }
  
  // Always try local as fallback
  urlsToTry.push('c64_software_cleaned.json')
  
  console.log('📥 Starting to fetch games data...')
  
  loadingPromise = (async () => {
    for (const url of urlsToTry) {
      try {
        console.log(`📥 Trying: ${url}`)
        const response = await fetch(url)
        
        if (response.ok) {
          console.log(`📥 Success! Status: ${response.status}`)
          const data = await response.json()
          console.log(`📥 JSON parsed successfully, got ${data.length} games`)
          cachedGamesData = data
          loadingPromise = null
          console.log(`✅ Loaded ${data.length} games successfully from ${url}`)
          return data
        }
      } catch (error) {
        console.log(`❌ Failed to load from ${url}:`, error instanceof Error ? error.message : String(error))
        continue
      }
    }
    
    // If all URLs fail, throw error to trigger fallback
    throw new Error('All URLs failed')
  })()
    .catch(async error => {
      loadingPromise = null
      console.error('❌ Failed to load games data from JSON:', error)
      console.error('   Error details:', error.message)
      console.log('📦 Falling back to minimal embedded dataset...')
      
      try {
        // Import minimal embedded data as fallback to keep bundle small
        const { gamesData: fallbackData } = await import('../../data/c64_software_minimal')
        cachedGamesData = [...fallbackData]
        console.log(`✅ Loaded ${cachedGamesData.length} games from minimal fallback dataset`)
        return cachedGamesData
      } catch (fallbackError) {
        console.error('❌ Failed to load fallback data:', fallbackError)
        cachedGamesData = []
        return []
      }
    })

  return loadingPromise
}

export function getGamesDataSync(): GameData[] {
  if (cachedGamesData === null) {
    console.log('⚠️ Games data not loaded yet, returning empty array')
    return []
  }
  return cachedGamesData
}

// Initialize loading immediately
loadGamesData()