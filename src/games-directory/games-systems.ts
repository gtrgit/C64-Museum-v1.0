import {
  engine,
  Transform,
  inputSystem,
  PointerEvents,
  InputAction,
  PointerEventType,
  Material,
  TextureWrapMode,
  MaterialTransparencyMode
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { Cube, Spinner, Plane, PlaneData } from './games-components'
import { getRandomHexColor } from './games-utils'
import { setSelectedPlaneId, getCurrentHoveredEntity, setCurrentHoveredEntity, setUIVisible, setSelectedGameData, getCurrentPageGames } from './games-state'
import { setupUi } from './games-ui'
import { getCachedTexture } from './games-factory'
import { calculateGridDimensions, getCurrentPlanesPerPage } from './games-scene-config'

// Helper function to count materials in the scene
function getMaterialCount(): number {
  let count = 0
  for (const [entity] of engine.getEntitiesWith(Material)) {
    count++
  }
  return count
}


/**
 * All cubes rotating behavior
 */
export function circularSystem(dt: number) {
  const entitiesWithSpinner = engine.getEntitiesWith(Spinner, Transform)
  for (const [entity, _spinner, _transform] of entitiesWithSpinner) {
    const mutableTransform = Transform.getMutable(entity)
    const spinnerData = Spinner.get(entity)

    mutableTransform.rotation = Quaternion.multiply(
      mutableTransform.rotation,
      Quaternion.fromAngleAxis(dt * spinnerData.speed, Vector3.Up())
    )
  }
}

/**
 * Search for the cubes that has pointerEvents, and when there is a click change the color.
 */
export function changeColorSystem() {
  for (const [entity] of engine.getEntitiesWith(Cube, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })
    }
  }
}

/**
 * Handle plane hover detection and update UI
 * Uses pointer events (mouse over) for reliable detection
 */
export function planeSelectionSystem() {
  const currentHovered = getCurrentHoveredEntity()
  const games = getCurrentPageGames()
  
  // Get current grid dimensions
  const planesPerPage = getCurrentPlanesPerPage()
  const gridDims = calculateGridDimensions(planesPerPage)
  
  // Track materials at the start of each system cycle
  const materialCountStart = getMaterialCount()
  
  let hoverEnterCount = 0
  let hoverLeaveCount = 0
  let clickCount = 0
  
  // First pass: Check for any new hover enters using pointer events
  for (const [entity] of engine.getEntitiesWith(Plane, PlaneData, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_ENTER, entity)) {
      hoverEnterCount++
      const planeData = PlaneData.get(entity)
      
      // Update state
      setCurrentHoveredEntity(entity)
      setSelectedPlaneId(planeData.id)
      setupUi()
      
      // Use stored game index from plane data (ensures sync with materials)
      const gameIndex = planeData.gameIndex || 0
      const game = games[gameIndex % games.length]
      const thumbnailPath = game ? `thumbnails/${game.identifier}/__ia_thumb.jpg` : null
      
      // Material hover effects removed - no material changes to prevent leaks
      // The PointerEvent tooltips provide sufficient hover feedback
      
      // TextShape hover effects removed - using clean PointerEvent tooltips only
    }
  }
  
  // Second pass: Check for hover leaves using pointer events
  for (const [entity] of engine.getEntitiesWith(Plane, PlaneData, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_LEAVE, entity)) {
      hoverLeaveCount++
      // Clear state if this was the hovered entity
      if (entity === currentHovered) {
        setCurrentHoveredEntity(null)
        setSelectedPlaneId('None')
        setupUi()
      }
      
      // Always restore the material and text when hover leaves
      const planeData = PlaneData.get(entity)
      
      // Use stored game index from plane data (ensures sync with materials)
      const gameIndex = planeData.gameIndex || 0
      const game = games[gameIndex % games.length]
      const thumbnailPath = game ? `thumbnails/${game.identifier}/__ia_thumb.jpg` : null
      
      // Material restore effects removed - no material changes to prevent leaks
      // Materials remain in their original state
      
      // TextShape hover effects removed - using clean PointerEvent tooltips only
    }
  }
  
  // Check for click events
  for (const [entity] of engine.getEntitiesWith(Plane, PlaneData, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      clickCount++
      const planeData = PlaneData.get(entity)
      
      // Get game data using stored game index (ensures sync with materials)
      const gameIndex = planeData.gameIndex || 0
      const game = games[gameIndex % games.length]
      
      if (game) {
        // Set selected game data and show UI
        setSelectedGameData(game)
        setUIVisible(true)
        setupUi()
      }
    }
  }
  
  // TextShape cleanup removed - no text entities to manage
  
  // Track materials at the end of system cycle and report if there were any events
  if (hoverEnterCount > 0 || hoverLeaveCount > 0 || clickCount > 0) {
    const materialCountEnd = getMaterialCount()
    const materialChange = materialCountEnd - materialCountStart
    console.log(`👁️ HOVER SYSTEM - Start: ${materialCountStart} | End: ${materialCountEnd} | Change: ${materialChange > 0 ? '+' : ''}${materialChange} | Events: Enter=${hoverEnterCount}, Leave=${hoverLeaveCount}, Click=${clickCount}`)
  }
}
