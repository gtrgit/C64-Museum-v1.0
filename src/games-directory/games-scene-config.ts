import { getCurrentPageGames } from './games-state'
import { getConfiguredGridDimensions } from './games-museum-config'

// Scene configuration and limits management
interface SceneConfig {
  parcelCount: number
  maxEntities: number
  maxBodies: number
  maxMaterials: number
  maxTextures: number
  recommendedPlanesPerPage: number
  actualPlanesPerPage: number
}

let cachedSceneConfig: SceneConfig | null = null

// Load scene.json and calculate parcel-based limits
export async function loadSceneConfig(): Promise<SceneConfig> {
  if (cachedSceneConfig) {
    return cachedSceneConfig
  }

  try {
    // Import scene data from TypeScript file
    const { sceneData } = await import('./games-scene-data')
    
    // Count parcels
    const parcelCount = sceneData.scene?.parcels?.length || 1
    
    // Calculate limits based on Decentraland formulas
    // Entities: n x 200
    const maxEntities = parcelCount * 200
    
    // Bodies: n x 300  
    const maxBodies = parcelCount * 300
    
    // Materials: log2(n+1) x 20
    const maxMaterials = Math.floor(Math.log2(parcelCount + 1) * 20)
    
    // Textures: log2(n+1) x 10
    const maxTextures = Math.floor(Math.log2(parcelCount + 1) * 10)
    
    // Calculate recommended planes per page using logarithmic scaling
    // Base: 10 planes for single parcel
    // Scale using same formula as materials: log2(n+1) × base
    const basePlanesPerParcel = 10
    const scaleFactor = Math.log2(parcelCount + 1)
    
    // Calculate planes using logarithmic scaling
    let recommendedPlanesPerPage = Math.floor(basePlanesPerParcel * scaleFactor)
    
    console.log(`   🔢 Raw calculation: ${basePlanesPerParcel} × ${scaleFactor} = ${basePlanesPerParcel * scaleFactor}`)
    
    // Ensure we have at least the base amount and don't exceed material limits
    // Reserve 50% of materials for other scene objects (UI, decorations, etc.)
    const maxAllowedPlanes = Math.floor(maxMaterials * 0.5)
    recommendedPlanesPerPage = Math.max(basePlanesPerParcel, Math.min(recommendedPlanesPerPage, maxAllowedPlanes))
    
    console.log(`   🎯 After limits: ${recommendedPlanesPerPage} (max allowed: ${maxAllowedPlanes})`)
    
    // Round to a nice grid size for better visuals
    // Find closest valid grid size
    const validGridSizes = [
      10,  // 5×2 or 2×5
      12,  // 4×3 or 3×4
      15,  // 5×3 or 3×5
      20,  // 5×4 or 4×5
      24,  // 6×4 or 4×6
      30,  // 6×5 or 5×6
      36,  // 6×6
      42,  // 7×6 or 6×7
      48,  // 8×6 or 6×8
      54,  // 9×6 or 6×9
      60,  // 10×6 or 6×10
      72,  // 12×6 or 6×12
      90,  // 15×6 or 6×15
      108, // 18×6 or 6×18
      126, // 21×6 or 6×21
      144, // 24×6 or 6×24
      162  // 27×6 or 6×27
    ]
    
    // Find the closest valid grid size
    let closestSize = validGridSizes[0]
    let minDiff = Math.abs(recommendedPlanesPerPage - closestSize)
    
    for (const size of validGridSizes) {
      const diff = Math.abs(recommendedPlanesPerPage - size)
      if (diff < minDiff && size <= maxAllowedPlanes) {
        closestSize = size
        minDiff = diff
      }
    }
    
    recommendedPlanesPerPage = closestSize
    
    console.log(`   📏 Grid size selection: calculated ${Math.floor(basePlanesPerParcel * scaleFactor)}, selected ${recommendedPlanesPerPage}`)
    
    cachedSceneConfig = {
      parcelCount,
      maxEntities,
      maxBodies, 
      maxMaterials,
      maxTextures,
      recommendedPlanesPerPage,
      actualPlanesPerPage: recommendedPlanesPerPage // Default to recommended
    }
    
    console.log('🏞️ SCENE CONFIG LOADED:')
    console.log(`   📦 Parcels: ${parcelCount}`)
    console.log(`   🎯 Max Entities: ${maxEntities}`)
    console.log(`   🎨 Max Materials: ${maxMaterials} (log2(${parcelCount}+1) × 20 = ${Math.log2(parcelCount + 1)} × 20)`)
    console.log(`   🖼️ Max Textures: ${maxTextures} (log2(${parcelCount}+1) × 10 = ${Math.log2(parcelCount + 1)} × 10)`)
    console.log(`   📄 Plane Calculation: log2(${parcelCount}+1) × ${basePlanesPerParcel} = ${scaleFactor} × ${basePlanesPerParcel} = ${Math.floor(basePlanesPerParcel * scaleFactor)}`)
    console.log(`   🎮 Planes/Page: ${recommendedPlanesPerPage} (50% of materials reserved for other objects)`)
    
    return cachedSceneConfig
    
  } catch (error) {
    console.error('Failed to load games-scene config, using defaults:', error)
    
    // Check for manual parcel count override
    const { MUSEUM_CONFIG } = await import('./games-museum-config')
    const manualParcelCount = MUSEUM_CONFIG.MANUAL_PARCEL_COUNT
    
    if (manualParcelCount && manualParcelCount > 1) {
      console.log(`🔧 MANUAL OVERRIDE: Using ${manualParcelCount} parcels from MUSEUM_CONFIG`)
      
      // Calculate limits based on manual parcel count
      const maxMaterials = Math.floor(Math.log2(manualParcelCount + 1) * 20)
      const maxTextures = Math.floor(Math.log2(manualParcelCount + 1) * 10)
      const maxEntities = manualParcelCount * 200
      const maxBodies = manualParcelCount * 300
      
      // Calculate recommended planes using logarithmic scaling
      const basePlanesPerParcel = 10
      const scaleFactor = Math.log2(manualParcelCount + 1)
      let recommendedPlanesPerPage = Math.floor(basePlanesPerParcel * scaleFactor)
      const maxAllowedPlanes = Math.floor(maxMaterials * 0.5)
      recommendedPlanesPerPage = Math.max(basePlanesPerParcel, Math.min(recommendedPlanesPerPage, maxAllowedPlanes))
      
      // Find closest valid grid size
      const validGridSizes = [10, 12, 15, 20, 24, 30, 36, 42, 48, 54, 60, 72, 90, 108, 126, 144, 162]
      let closestSize = validGridSizes[0]
      let minDiff = Math.abs(recommendedPlanesPerPage - closestSize)
      
      for (const size of validGridSizes) {
        const diff = Math.abs(recommendedPlanesPerPage - size)
        if (diff < minDiff && size <= maxAllowedPlanes) {
          closestSize = size
          minDiff = diff
        }
      }
      
      cachedSceneConfig = {
        parcelCount: manualParcelCount,
        maxEntities,
        maxBodies,
        maxMaterials,
        maxTextures,
        recommendedPlanesPerPage: closestSize,
        actualPlanesPerPage: closestSize
      }
      
      console.log(`🔧 MANUAL CONFIG: ${manualParcelCount} parcels → ${maxMaterials} materials, ${closestSize} planes`)
    } else {
      // Fallback for single parcel
      cachedSceneConfig = {
        parcelCount: 1,
        maxEntities: 200,
        maxBodies: 300,
        maxMaterials: 20, // log2(1+1) * 20 = 20
        maxTextures: 10,  // log2(1+1) * 10 = 10
        recommendedPlanesPerPage: 10, // log2(1+1) * 10 = 10
        actualPlanesPerPage: 10
      }
    }
    
    return cachedSceneConfig
  }
}

// Get the current scene configuration
export function getSceneConfig(): SceneConfig | null {
  return cachedSceneConfig
}

// Calculate optimal grid dimensions for given plane count
export function calculateGridDimensions(planeCount: number): { cols: number, rows: number } {
  // console.log(`🔍 DEBUG calculateGridDimensions: planeCount=${planeCount}`)
  
  // First check if custom dimensions are configured
  const configuredDims = getConfiguredGridDimensions()
  
  // console.log(`🔍 DEBUG: configuredDims.rows=${configuredDims.rows}, configuredDims.cols=${configuredDims.cols}`)
  
  if (configuredDims.rows !== null && configuredDims.cols !== null) {
    // Use exact configured dimensions
    const result = { cols: configuredDims.cols, rows: configuredDims.rows }
    // console.log(`🔍 DEBUG: Using configured dimensions: ${result.cols}×${result.rows}`)
    return result
  }
  
  // Otherwise, calculate optimal dimensions
  // Try to maintain roughly 16:9 aspect ratio
  const targetRatio = 16 / 9
  
  // Find factors of planeCount that are closest to target ratio
  let bestCols = Math.sqrt(planeCount * targetRatio)
  let bestRows = Math.sqrt(planeCount / targetRatio)
  
  // Round to integers and find closest valid combination
  const factors: Array<{cols: number, rows: number, ratio: number}> = []
  
  for (let cols = 1; cols <= planeCount; cols++) {
    if (planeCount % cols === 0) {
      const rows = planeCount / cols
      const ratio = cols / rows
      factors.push({ cols, rows, ratio })
    }
  }
  
  // Find the factor pair closest to target ratio
  let best = factors[0]
  let bestDiff = Math.abs(best.ratio - targetRatio)
  
  for (const factor of factors) {
    const diff = Math.abs(factor.ratio - targetRatio)
    if (diff < bestDiff) {
      best = factor
      bestDiff = diff
    }
  }
  
  return { cols: best.cols, rows: best.rows }
}

// Set custom planes per page with resource validation
export function setCustomPlanesPerPage(count: number, force: boolean = false) {
  if (!cachedSceneConfig) {
    console.error('❌ Scene config not loaded. Call loadSceneConfig() first.')
    return false
  }
  
  const { maxMaterials, maxTextures, maxEntities, parcelCount } = cachedSceneConfig
  
  // Calculate resource usage
  const materialUsage = count // Each plane uses 1 material
  const textureUsage = count // Each plane uses 1 texture (worst case)
  const entityUsage = count * 2 // Each plane + its text entity
  
  // Check limits
  const materialPercent = Math.round((materialUsage / maxMaterials) * 100)
  const texturePercent = Math.round((textureUsage / maxTextures) * 100)
  const entityPercent = Math.round((entityUsage / maxEntities) * 100)
  
  console.log(`\n🎛️ CUSTOM GRID REQUEST: ${count} planes`)
  console.log(`📊 RESOURCE USAGE ANALYSIS:`)
  console.log(`   🎨 Materials: ${materialUsage}/${maxMaterials} (${materialPercent}%)${materialPercent > 100 ? ' ⚠️ EXCEEDS LIMIT!' : ''}`)
  console.log(`   🖼️ Textures: ${textureUsage}/${maxTextures} (${texturePercent}%)${texturePercent > 100 ? ' ⚠️ EXCEEDS LIMIT!' : ''}`)
  console.log(`   🎯 Entities: ${entityUsage}/${maxEntities} (${entityPercent}%)${entityPercent > 100 ? ' ⚠️ EXCEEDS LIMIT!' : ''}`)
  
  // Warnings for high usage
  if (materialPercent > 80) {
    console.log(`   ⚠️ WARNING: High material usage leaves little room for other objects`)
  }
  
  // Check if it exceeds limits
  const exceedsLimits = materialUsage > maxMaterials || entityUsage > maxEntities
  
  if (exceedsLimits && !force) {
    console.log(`\n❌ REJECTED: Requested grid size exceeds scene limits!`)
    console.log(`💡 TIP: Use force=true to override (may cause scene to fail)`)
    console.log(`💡 RECOMMENDED: Maximum safe grid size is ${Math.min(maxMaterials, Math.floor(maxEntities / 2))} planes\n`)
    return false
  }
  
  if (exceedsLimits && force) {
    console.log(`\n⚠️ FORCE OVERRIDE: Setting grid size despite exceeding limits!`)
    console.log(`🔥 WARNING: Scene may fail to load or behave unexpectedly!\n`)
  }
  
  // Calculate grid dimensions for the custom count
  const gridDims = calculateGridDimensions(count)
  
  cachedSceneConfig.actualPlanesPerPage = count
  
  console.log(`✅ SUCCESS: Set planes per page to ${count} (${gridDims.cols}×${gridDims.rows} grid)\n`)
  
  return true
}

// Get current planes per page setting
export function getCurrentPlanesPerPage(): number {
  return cachedSceneConfig?.actualPlanesPerPage || 162
}

// Calculate optimal angular ranges based on grid dimensions
export function calculateOptimalAngularRanges(gridDims: { cols: number, rows: number }) {
  // For large radius (78m), use tight angular ranges for denser grid
  // Each grid segment should span only 10 degrees for better density
  const gridSegmentSpan = 10 // degrees
  
  // Horizontal span: limit to grid segment span
  const horizontalSpan = Math.min(gridSegmentSpan, gridDims.cols * 1.5) // 1.5° per column maximum
  
  // Vertical span: reduced for tighter vertical spacing
  const verticalSpan = Math.min(4, gridDims.rows * 0.8) // 0.8° per row, max 4° (reduced from 1.2° per row)
  
  // Start from 195° (slightly to the right of 190° to center the 10° span)
  const horizontalMidpoint = 195 + (horizontalSpan / 2) // leftmost starts at ~190°
  const verticalMidpoint = 0 // level height
  
  const horizontalRangeStart = horizontalMidpoint - (horizontalSpan / 2)
  const horizontalRangeEnd = horizontalMidpoint + (horizontalSpan / 2)
  const verticalRangeStart = verticalMidpoint - (verticalSpan / 2)
  const verticalRangeEnd = verticalMidpoint + (verticalSpan / 2)
  
  console.log(`📐 ANGULAR RANGES for large radius (tight spacing) ${gridDims.cols}x${gridDims.rows} grid:`)
  console.log(`   Horizontal: ${horizontalRangeStart.toFixed(1)}° to ${horizontalRangeEnd.toFixed(1)}° (${horizontalSpan.toFixed(1)}° span)`)
  console.log(`   Vertical: ${verticalRangeStart.toFixed(1)}° to ${verticalRangeEnd.toFixed(1)}° (${verticalSpan.toFixed(1)}° span)`)
  console.log(`   Designed for 78m radius with dense plane spacing, starting from ~190°`)
  
  return {
    horizontalRangeStart,
    horizontalRangeEnd,
    verticalRangeStart,
    verticalRangeEnd
  }
}