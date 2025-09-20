import {Vector3} from '@dcl/sdk/math'
import { engine } from '@dcl/sdk/ecs'

import { changeColorSystem, circularSystem, planeSelectionSystem } from './games-directory/games-systems'
import { createSingleCurvedGrid } from './games-directory/games-factory'
import { MUSEUM_CONFIG, applyCustomGridSize } from './games-directory/games-museum-config'
import { knnMaterialSystem, initializeKNNMaterialSystem } from './games-directory/games-knn-material-system'
import { initializeFiltering } from './games-directory/games-state'

import {} from '@dcl/sdk/math'

// Import the plane positioner module
import { initializePlanePositioner, logPlayerTransformValues } from './plane-positioner'
import { createTeleporter, teleporterSystem, teleporterRippleSystem, teleporterAnimationSystem } from './teleporter/teleporter'
import { setupCombinedUI } from './ui-manager'


// Export utilities for reuse in other projects
// export { logPlayerTransformValues } from './plane-positioner'

export async function main() {
  // Setup combined UI first
  setupCombinedUI()

  engine.addSystem(planeSelectionSystem)
  engine.addSystem(knnMaterialSystem) // Add KNN material management system

  // Configuration for curved grid placement
  // const horizontalRangeStart = 190
  // const horizontalRangeEnd = 350
  
  // // Vertical configuration (e.g., -30° to +30° for a 60° vertical arc)
  // const verticalRangeStart = -15
  // const verticalRangeEnd = 15
  
  // const radius = 5
  // const planeScale = Vector3.create(.5, .5, .5)
  
  // Create curved grid of planes with automatic sizing based on scene limits
  // Grid dimensions are now calculated automatically from scene.json parcel count
  
  engine.addSystem(teleporterSystem)
  engine.addSystem(teleporterRippleSystem)
  engine.addSystem(teleporterAnimationSystem)

  // // // Create test teleporter
  createTeleporter(
    { x: 36, y: 0.01, z: 36 },    // teleporter position
    { x: 16, y: 7.5, z: 24 },    // destination
    'images/teleporter-pad.png',
    'images/joystick-icon.png',
    'Games!'
  )

  

   createTeleporter(
    { x: 36, y: 0.01, z: 39 },    // teleporter position
    { x: 36, y: 0, z: 10 },    // destination
    'images/teleporter-pad.png',
    'images/joystick-icon.png',
    'History'
  )

  //game 3d ui
  initializeScene()

  // Initialize the plane positioner system
  await initializePlanePositioner()
}





// Initialize scene asynchronously
async function initializeScene() {
  console.log('🚀 INITIALIZING C64 Museum Scene...')
  
  try {
    // Define the center position for the entire curved grid display
    const gridCenterPosition = Vector3.create(34, 7.2,38)
    

    // Angular ranges with 1° per row vertical separation
    const horizontalRangeStart = 180
    const horizontalRangeEnd = 360
    const verticalRangeStart = -1.0  // 1° per row: 3 rows = 2 gaps × 1° = 2° total span
    const verticalRangeEnd = 1.0     // Range: -1.0° to +1.0° = 2° total
    
    // Create single large curved grid with fixed ranges
    console.log('📊 Creating single curved grid...')
    const gridPlanes = await createSingleCurvedGrid(
      MUSEUM_CONFIG.PLANE_RADIUS,
      Vector3.create(MUSEUM_CONFIG.PLANE_SCALE, MUSEUM_CONFIG.PLANE_SCALE, MUSEUM_CONFIG.PLANE_SCALE),
      gridCenterPosition,
      horizontalRangeStart,
      horizontalRangeEnd,
      verticalRangeStart,
      verticalRangeEnd
    )
    
    console.log('✅ Scene initialized successfully!')
    console.log(`   Created ${gridPlanes.length} planes in a single curved grid`)
    console.log(`   Radius: ${MUSEUM_CONFIG.PLANE_RADIUS}m`)
    console.log(`   Angular coverage: ${horizontalRangeEnd - horizontalRangeStart}° horizontal, ${verticalRangeEnd - verticalRangeStart}° vertical`)
    
    // Initialize KNN material system after grid creation
    console.log('🎯 Initializing KNN Material System...')
    initializeKNNMaterialSystem()
    
    // Initialize filtering system after everything else is ready
    console.log('📊 Initializing filtering system...')
    initializeFiltering()
  } catch (error) {
    console.error('❌ Failed to initialize scene:', error)
  }
}
