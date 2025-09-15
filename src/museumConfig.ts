// C64 Museum Configuration
// Modify these settings to customize your museum display

export const MUSEUM_CONFIG = {
  // Manual parcel count override (use when scene.json can't be loaded)
  MANUAL_PARCEL_COUNT: 25,  // 5×5 = 25 parcels
  
  // Grid size override - set to null for automatic sizing based on parcel count
  // Option 1: Specify total planes (will auto-calculate best grid layout)
  // CUSTOM_GRID_SIZE: 162,  // Total planes
  
  // Option 2: Specify exact rows and columns
  CUSTOM_GRID_ROWS: 3,     // Number of rows (vertical)
  CUSTOM_GRID_COLS: 190,     // Number of columns (horizontal)
  // Total planes = CUSTOM_GRID_ROWS × CUSTOM_GRID_COLS = 570
  
  // Set both to null to use automatic sizing
  // CUSTOM_GRID_ROWS: null as number | null,
  // CUSTOM_GRID_COLS: null as number | null,
  
  // Force grid size even if it exceeds scene limits (may cause failures)
  FORCE_GRID_SIZE: true,  // Force 570 planes for the museum display
  
  // Visual settings
  PLANE_RADIUS: 32,        // Distance from center (large radius for better viewing)
  PLANE_SCALE: .5,         // Size of each plane (0.5 = half size)
  
  // Performance settings
  TEXTURE_CACHE_SIZE: 200, // Maximum textures to keep in memory
  
  // Debug settings
  SHOW_RESOURCE_USAGE: true, // Show detailed resource usage in console
}

// Helper function to apply custom grid size if configured
export async function applyCustomGridSize() {
  // console.log(`🔍 DEBUG: CUSTOM_GRID_ROWS = ${MUSEUM_CONFIG.CUSTOM_GRID_ROWS}`)
  // console.log(`🔍 DEBUG: CUSTOM_GRID_COLS = ${MUSEUM_CONFIG.CUSTOM_GRID_COLS}`)
  
  // Check if rows and columns are specified
  if (MUSEUM_CONFIG.CUSTOM_GRID_ROWS !== null && MUSEUM_CONFIG.CUSTOM_GRID_COLS !== null) {
    const { setCustomPlanesPerPage, getCurrentPlanesPerPage } = await import('./sceneConfig')
    
    const totalPlanes = MUSEUM_CONFIG.CUSTOM_GRID_ROWS * MUSEUM_CONFIG.CUSTOM_GRID_COLS
    // console.log(`🎨 Applying custom grid: ${MUSEUM_CONFIG.CUSTOM_GRID_COLS}×${MUSEUM_CONFIG.CUSTOM_GRID_ROWS} = ${totalPlanes} planes`)
    // console.log(`🔍 DEBUG: Current planes before custom: ${getCurrentPlanesPerPage()}`)
    
    const success = setCustomPlanesPerPage(
      totalPlanes, 
      MUSEUM_CONFIG.FORCE_GRID_SIZE
    )
    
    // console.log(`🔍 DEBUG: setCustomPlanesPerPage success: ${success}`)
    // console.log(`🔍 DEBUG: Current planes after custom: ${getCurrentPlanesPerPage()}`)
    
    if (!success && !MUSEUM_CONFIG.FORCE_GRID_SIZE) {
      console.log('💡 To use this grid size, either:')
      console.log('   1. Deploy to a larger scene with more parcels')
      console.log('   2. Set FORCE_GRID_SIZE: true in museumConfig.ts (risky)')
    }
    
    return success
  } else if (MUSEUM_CONFIG.CUSTOM_GRID_ROWS === null && MUSEUM_CONFIG.CUSTOM_GRID_COLS === null) {
    // Both null - use automatic sizing
    console.log('🎨 Using automatic grid sizing based on parcel count')
    return true
  } else {
    // One is null, one is not - error
    console.error('❌ ERROR: Both CUSTOM_GRID_ROWS and CUSTOM_GRID_COLS must be set, or both must be null')
    return false
  }
}

// Export function to get configured grid dimensions
export function getConfiguredGridDimensions(): { rows: number | null, cols: number | null } {
  return {
    rows: MUSEUM_CONFIG.CUSTOM_GRID_ROWS,
    cols: MUSEUM_CONFIG.CUSTOM_GRID_COLS
  }
}