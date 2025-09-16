import { Entity } from '@dcl/sdk/ecs'
import gamesDataImport, { GameData } from '../../data/c64_software_cleaned'

// Convert readonly array to mutable for internal use
const gamesData = [...gamesDataImport] as GameData[]
import { loadSceneConfig, getCurrentPlanesPerPage } from './games-scene-config'

// Global state for UI updates
export let selectedPlaneId: string = 'None'
export let currentHoveredEntity: Entity | null = null
export let isUIVisible: boolean = false
export let selectedGameData: GameData | null = null

// Pagination state
export let currentPage: number = 1
export let itemsPerPage: number = 162 // Default, will be updated by scene config
export let filteredGames: GameData[] = gamesData
export let totalPages: number = Math.ceil(gamesData.length / itemsPerPage)

// Initialize scene configuration
export let sceneConfigLoaded: boolean = false

// Load scene configuration and update pagination
export async function initializeSceneConfig() {
  if (sceneConfigLoaded) {
    console.log(`G: Scene config already loaded, skipping. Current itemsPerPage: ${itemsPerPage}`)
    return
  }
  
  console.log('🚀 INITIALIZING scene configuration...')
  
  // Step 1: Load basic scene config
  console.log('📄 Step 1: Loading scene.json...')
  await loadSceneConfig()
  const autoPlanes = getCurrentPlanesPerPage()
  console.log(`   Auto-calculated planes: ${autoPlanes}`)
  
  // Step 2: Apply custom grid size BEFORE updating pagination
  console.log('📄 Step 2: Applying custom grid configuration...')
  const { applyCustomGridSize } = await import('./games-museum-config')
  await applyCustomGridSize()
  
  // Step 3: Get final plane count after custom config
  const finalPlanesPerPage = getCurrentPlanesPerPage()
  console.log(`📄 Step 3: Final planes per page: ${finalPlanesPerPage}`)
  
  // Step 4: Update pagination state
  itemsPerPage = finalPlanesPerPage
  console.log(`📄 Step 4: Set itemsPerPage = ${itemsPerPage}`)
  
  // Step 5: Recalculate pagination
  updatePaginationForNewPageSize()
  
  sceneConfigLoaded = true
  console.log(`✅ SCENE CONFIG COMPLETE: ${itemsPerPage} planes per page, ${totalPages} total pages`)
}

// Filter state
export let searchQuery: string = ''
export let selectedMediaType: string = 'all'
export let selectedCreator: string = 'all'
export let selectedGenre: string = 'all' // New genre filter
export let selectedYear: string = 'all' // New year filter
export let genreCounts: { [key: string]: number } = {} // Dynamic genre counts
export let creatorCounts: { [key: string]: number } = {} // Dynamic creator counts
export let yearCounts: { [key: string]: number } = {} // Dynamic year counts

export function setSelectedPlaneId(id: string) {
  selectedPlaneId = id
}

export function getSelectedPlaneId(): string {
  return selectedPlaneId
}

export function setCurrentHoveredEntity(entity: Entity | null) {
  currentHoveredEntity = entity
}

export function getCurrentHoveredEntity(): Entity | null {
  return currentHoveredEntity
}

export function setUIVisible(visible: boolean) {
  isUIVisible = visible
}

export function getUIVisible(): boolean {
  return isUIVisible
}

export function setSelectedGameData(data: GameData | null) {
  selectedGameData = data
}

export function getSelectedGameData(): GameData | null {
  return selectedGameData
}

// Pagination functions
export function getCurrentPage(): number {
  return currentPage
}

export function setCurrentPage(page: number) {
  currentPage = Math.max(1, Math.min(page, totalPages))
}

export function getItemsPerPage(): number {
  // console.log(`🔍 DEBUG getItemsPerPage: returning ${itemsPerPage}`)
  return itemsPerPage
}

export function setItemsPerPage(count: number) {
  itemsPerPage = count
  totalPages = Math.ceil(filteredGames.length / itemsPerPage)
  // Adjust current page if needed
  if (currentPage > totalPages) {
    currentPage = Math.max(1, totalPages)
  }
}

export function getTotalPages(): number {
  return totalPages
}

export function getFilteredGames(): GameData[] {
  return filteredGames
}

export function getCurrentPageGames(): GameData[] {
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const games = filteredGames.slice(startIndex, endIndex)
  
  // Debug logging to see what's happening
  if (games.length !== itemsPerPage && games.length !== filteredGames.length) {
    console.log(`🔍 DEBUG getCurrentPageGames:`)
    console.log(`   currentPage: ${currentPage}`)
    console.log(`   itemsPerPage: ${itemsPerPage}`)
    console.log(`   startIndex: ${startIndex}, endIndex: ${endIndex}`)
    console.log(`   games returned: ${games.length}`)
    console.log(`   total games: ${filteredGames.length}`)
  }
  
  return games
}

// Filter functions
export function getSearchQuery(): string {
  return searchQuery
}

export function setSearchQuery(query: string) {
  searchQuery = query
  applyFilters()
}

export function getSelectedMediaType(): string {
  return selectedMediaType
}

export function setSelectedMediaType(mediaType: string) {
  selectedMediaType = mediaType
  applyFilters()
}

export function getSelectedCreator(): string {
  return selectedCreator
}

export function setSelectedCreator(creator: string) {
  selectedCreator = creator
  applyFilters()
}

export function getSelectedGenre(): string {
  return selectedGenre
}

export function setSelectedGenre(genre: string) {
  selectedGenre = genre
  applyFilters()
}

export function getGenreCounts(): { [key: string]: number } {
  return genreCounts
}

export function getCreatorCounts(): { [key: string]: number } {
  return creatorCounts
}

export function getSelectedYear(): string {
  return selectedYear
}

export function setSelectedYear(year: string) {
  selectedYear = year
  applyFilters()
}

export function getYearCounts(): { [key: string]: number } {
  return yearCounts
}

// Calculate dynamic counts for filtering options based on current filters
export function calculateDynamicCounts() {
  const startTime = Date.now()
  
  // Reset counts
  genreCounts = {}
  creatorCounts = {}
  yearCounts = {}
  
  // Helper functions (same as in applyFilters)
  const getFieldAsString = (field: any): string => {
    if (!field) return ''
    if (Array.isArray(field)) return field.join(' ')
    return String(field)
  }
  
  const getGenre = (game: any): string => {
    if (game.tag && Array.isArray(game.tag) && game.tag.length > 0) {
      return game.tag[0].toLowerCase()
    }
    return 'untagged'
  }
  
  const getCreator = (game: any): string => {
    if (game.creator) {
      if (Array.isArray(game.creator)) {
        return game.creator[0]
      }
      return String(game.creator)
    }
    return 'unknown'
  }
  
  const getYear = (game: any): string => {
    if (game.date) {
      const year = new Date(game.date).getFullYear()
      return year.toString()
    }
    return 'unknown'
  }
  
  // Count each filter type separately, applying OTHER filters but not the same type
  gamesData.forEach(game => {
    // For genre counts: apply search, creator, and year filters (but not genre filter)
    const matchesSearchForGenre = searchQuery === '' || 
      (game.title && String(game.title).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (game.description && getFieldAsString(game.description).toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((game as any).creator && getFieldAsString((game as any).creator).toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesMediaTypeForGenre = selectedMediaType === 'all' || 
      ((game as any).mediatype && getFieldAsString((game as any).mediatype) === selectedMediaType)
    
    const matchesCreatorForGenre = selectedCreator === 'all' || 
      ((game as any).creator && getFieldAsString((game as any).creator).includes(selectedCreator))
    
    const matchesYearForGenre = (() => {
      if (selectedYear === 'all') return true
      if (selectedYear === 'Other') {
        const year = getYear(game)
        if (year === 'unknown') return true
        const yearNum = parseInt(year)
        return !isNaN(yearNum) && (yearNum < 1982 || yearNum > 1992)
      }
      return getYear(game) === selectedYear
    })()
    
    if (matchesSearchForGenre && matchesMediaTypeForGenre && matchesCreatorForGenre && matchesYearForGenre) {
      const genre = getGenre(game)
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    }
    
    // For creator counts: apply search, genre, and year filters (but not creator filter)
    const matchesSearchForCreator = searchQuery === '' || 
      (game.title && String(game.title).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (game.description && getFieldAsString(game.description).toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((game as any).creator && getFieldAsString((game as any).creator).toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesMediaTypeForCreator = selectedMediaType === 'all' || 
      ((game as any).mediatype && getFieldAsString((game as any).mediatype) === selectedMediaType)
    
    const matchesGenreForCreator = selectedGenre === 'all' || getGenre(game) === selectedGenre
    
    const matchesYearForCreator = (() => {
      if (selectedYear === 'all') return true
      if (selectedYear === 'Other') {
        const year = getYear(game)
        if (year === 'unknown') return true
        const yearNum = parseInt(year)
        return !isNaN(yearNum) && (yearNum < 1982 || yearNum > 1992)
      }
      return getYear(game) === selectedYear
    })()
    
    if (matchesSearchForCreator && matchesMediaTypeForCreator && matchesGenreForCreator && matchesYearForCreator) {
      const creator = getCreator(game)
      const creators = creator.split(/[,/]/).map(c => c.trim()).filter(c => c.length > 0)
      creators.forEach(c => {
        creatorCounts[c] = (creatorCounts[c] || 0) + 1
      })
    }
    
    // For year counts: apply search, genre, and creator filters (but not year filter)
    const matchesSearchForYear = searchQuery === '' || 
      (game.title && String(game.title).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (game.description && getFieldAsString(game.description).toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((game as any).creator && getFieldAsString((game as any).creator).toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesMediaTypeForYear = selectedMediaType === 'all' || 
      ((game as any).mediatype && getFieldAsString((game as any).mediatype) === selectedMediaType)
    
    const matchesGenreForYear = selectedGenre === 'all' || getGenre(game) === selectedGenre
    
    const matchesCreatorForYear = selectedCreator === 'all' || 
      ((game as any).creator && getFieldAsString((game as any).creator).includes(selectedCreator))
    
    if (matchesSearchForYear && matchesMediaTypeForYear && matchesGenreForYear && matchesCreatorForYear) {
      const year = getYear(game)
      yearCounts[year] = (yearCounts[year] || 0) + 1
    }
  })
  
  const endTime = Date.now()
  console.log(`📊 Dynamic counts calculated with cross-filtering in ${(endTime - startTime)}ms`)
  console.log(`   Genres: ${Object.keys(genreCounts).length} categories`)
  console.log(`   Creators: ${Object.keys(creatorCounts).length} unique creators`)
  console.log(`   Years: ${Object.keys(yearCounts).length} unique years`)
}

export function applyFilters() {
  try {
    const startTime = Date.now()
    
    filteredGames = gamesData.filter(game => {
      // Helper function to convert any field to string for searching
      const getFieldAsString = (field: any): string => {
        if (!field) return ''
        if (Array.isArray(field)) return field.join(' ')
        return String(field)
      }
      
      // Helper function to get genre from tag array
      const getGenre = (game: any): string => {
        if (game.tag && Array.isArray(game.tag) && game.tag.length > 0) {
          return game.tag[0].toLowerCase()
        }
        return 'untagged'
      }
      
      // Text search across title, description, creator
      const matchesSearch = searchQuery === '' || 
        (game.title && String(game.title).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (game.description && getFieldAsString(game.description).toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((game as any).creator && getFieldAsString((game as any).creator).toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Media type filter (if we have this field)
      const matchesMediaType = selectedMediaType === 'all' || 
        ((game as any).mediatype && getFieldAsString((game as any).mediatype) === selectedMediaType)
      
      // Genre filter
      const matchesGenre = selectedGenre === 'all' || getGenre(game) === selectedGenre
      
      // Creator filter
      const matchesCreator = selectedCreator === 'all' || 
        ((game as any).creator && getFieldAsString((game as any).creator).includes(selectedCreator))
      
      // Year filter
      const getYear = (game: any): string => {
        if (game.date) {
          const year = new Date(game.date).getFullYear()
          return year.toString()
        }
        return 'unknown'
      }
      
      const matchesYear = (() => {
        if (selectedYear === 'all') return true
        if (selectedYear === 'Other') {
          // Match if year is unknown or outside 1982-1992 range
          const year = getYear(game)
          if (year === 'unknown') return true
          const yearNum = parseInt(year)
          return !isNaN(yearNum) && (yearNum < 1982 || yearNum > 1992)
        }
        return getYear(game) === selectedYear
      })()
      
      return matchesSearch && matchesMediaType && matchesGenre && matchesCreator && matchesYear
    })
    
    // Update pagination
    totalPages = Math.ceil(filteredGames.length / itemsPerPage)
    if (currentPage > totalPages) {
      currentPage = Math.max(1, totalPages)
    }
    
    // Recalculate dynamic counts with cross-filtering
    calculateDynamicCounts()
  
    const endTime = Date.now()
    console.log(`🔍 Filters applied in ${(endTime - startTime)}ms`)
    console.log(`   Results: ${filteredGames.length}/${gamesData.length} games`)
  } catch (error) {
    console.error('❌ Error applying filters:', error)
    // Fallback to showing all games if filtering fails
    filteredGames = gamesData
    totalPages = Math.ceil(filteredGames.length / itemsPerPage)
    // Still recalculate counts even in error case
    calculateDynamicCounts()
  }
}

export function clearFilters() {
  searchQuery = ''
  selectedMediaType = 'all'
  selectedCreator = 'all'
  selectedGenre = 'all'
  selectedYear = 'all'
  applyFilters()
}

// Update pagination when page size changes
export function updatePaginationForNewPageSize() {
  totalPages = Math.ceil(filteredGames.length / itemsPerPage)
  if (currentPage > totalPages) {
    currentPage = Math.max(1, totalPages)
  }
  console.log(`📄 PAGINATION UPDATED: ${itemsPerPage} items per page, ${totalPages} total pages, current page: ${currentPage}`)
  console.log(`🔢 CALCULATION: ${filteredGames.length} total games ÷ ${itemsPerPage} per page = ${filteredGames.length / itemsPerPage} (rounded up to ${totalPages})`)
}

// Function to update items per page (used when grid size changes)
export function updateItemsPerPage(newItemsPerPage: number) {
  itemsPerPage = newItemsPerPage
  updatePaginationForNewPageSize()
}

// Initialize filters and calculate counts on startup
export function initializeFiltering() {
  try {
    console.log('📊 Initializing filtering system...')
    calculateDynamicCounts()
    // Don't apply filters immediately - let the existing state remain unchanged
    // The filteredGames is already initialized to gamesData, which is correct
    console.log('✅ Filtering system initialized (counts calculated, filters not applied)')
  } catch (error) {
    console.error('❌ Error initializing filtering system:', error)
    // Initialize with empty counts if something fails
    genreCounts = {}
    creatorCounts = {}
    yearCounts = {}
  }
}