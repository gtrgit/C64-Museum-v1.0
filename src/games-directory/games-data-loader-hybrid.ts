import { GameData } from './games-data-loader'

// Try multiple approaches to load the data
export async function loadGamesDataHybrid(): Promise<GameData[]> {
  console.log('🔄 Attempting to load games data...')
  
  // Approach 1: Try external URL first (if you host it)
  const externalUrl = 'https://your-cdn.com/c64_software_cleaned.json' // Replace with your URL
  
  // Approach 2: Try local JSON (might work in production)
  const localUrls = [
    'c64_software_cleaned.json',
    '/c64_software_cleaned.json',
    './c64_software_cleaned.json',
    'assets/c64_software_cleaned.json',
    '/assets/c64_software_cleaned.json'
  ]
  
  // Try external URL first
  if (externalUrl.startsWith('https://')) {
    try {
      console.log(`📡 Trying external URL: ${externalUrl}`)
      const response = await fetch(externalUrl)
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Loaded ${data.length} games from external URL`)
        return data
      }
    } catch (error) {
      console.log('📡 External URL failed:', error instanceof Error ? error.message : String(error))
    }
  }
  
  // Try local URLs
  for (const url of localUrls) {
    try {
      console.log(`📁 Trying local URL: ${url}`)
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Loaded ${data.length} games from ${url}`)
        return data
      }
    } catch (error) {
      // Continue to next URL
    }
  }
  
  // If all else fails, load embedded data
  console.log('📦 Loading embedded data as final fallback...')
  try {
    // For production, use full dataset
    const { gamesData } = await import('../../data/c64_software_minimal')
    console.log(`✅ Loaded ${gamesData.length} games from embedded data`)
    return [...gamesData]
  } catch (error) {
    // For development/testing, use minimal dataset
    console.log('📦 Using minimal dataset for development')
    const { gamesData } = await import('../../data/c64_software_minimal')
    return [...gamesData]
  }
}