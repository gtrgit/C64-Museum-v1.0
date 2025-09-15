import {
  Entity,
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  PointerEvents,
  PointerEventType,
  InputAction,
  Material,
  TextureWrapMode,
  MaterialTransparencyMode
} from '@dcl/sdk/ecs'

// Helper function to count materials in the scene
function getMaterialCount(): number {
  let count = 0
  for (const [entity] of engine.getEntitiesWith(Material)) {
    count++
  }
  return count
}
import { Cube, Spinner, Plane, PlaneData } from './games-components'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getRandomHexColor, getPositionOnCircle, getRotationFacingCenter, getPositionOnCurvedGrid } from './games-utils'
import { getCurrentPageGames, initializeSceneConfig, getCurrentPage, getItemsPerPage, getFilteredGames } from './games-state'
import { calculateGridDimensions, getCurrentPlanesPerPage, getSceneConfig, calculateOptimalAngularRanges } from './games-scene-config'

// Create a single texture instance to avoid multiple downloads
const muleTexture = Material.Texture.Common({
  src: 'images/mule-cover.jpg'
})

// Texture cache to avoid creating duplicate textures with LRU eviction
const textureCache = new Map<string, any>()
const MAX_CACHE_SIZE = 200 // Limit to ~200 textures to control material count

// Function to get or create cached texture with LRU cache management
export function getCachedTexture(src: string) {
  if (textureCache.has(src)) {
    // Move to end (most recently used)
    const texture = textureCache.get(src)
    textureCache.delete(src)
    textureCache.set(src, texture)
    return texture
  } else {
    // If cache is full, remove oldest entry
    if (textureCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = textureCache.keys().next().value
      if (oldestKey) {
        textureCache.delete(oldestKey)
      }
    }
    
    const texture = Material.Texture.Common({
      src: src,
      wrapMode: TextureWrapMode.TWM_CLAMP,
    })
    textureCache.set(src, texture)
    return texture
  }
}

// Function to clear unused textures from cache
export function clearTextureCache() {
  textureCache.clear()
}

// Function to clear only textures not used on current page
function clearUnusedTextures(currentTexturePaths: Set<string>) {
  const keysToDelete: string[] = []
  for (const [path] of textureCache) {
    if (!currentTexturePaths.has(path)) {
      keysToDelete.push(path)
    }
  }
  keysToDelete.forEach(key => textureCache.delete(key))
}

// Cube factory
export function createCube(x: number, y: number, z: number, spawner = true): Entity {
  const entity = engine.addEntity()

  // Used to track the cubes
  Cube.create(entity)

  Transform.create(entity, { position: { x, y, z } })

  // set how the cube looks and collides
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)
  Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })

  // Make the cube spin, with the circularSystem
  Spinner.create(entity, { speed: 100 * Math.random() })

  // Create PointerEvent with the hover feedback.
  // We are going to check the onClick event on the changeColorSystem.
  PointerEvents.create(entity, {
    pointerEvents: [
      { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_POINTER, hoverText: 'Change Color' } }
    ]
  })

  return entity
}

// Plane factory
export function createPlane(angleDegrees: number, radius: number = 5, scale: Vector3 = Vector3.create(1, 1, 1)): Entity {
  const entity = engine.addEntity()
  
  // Track the plane with angle information
  Plane.create(entity, { angle: angleDegrees })
  
  // Calculate position on circle and rotation to face center
  const position = getPositionOnCircle(angleDegrees, radius)
  const rotation = getRotationFacingCenter(position)
  
  // Set transform with calculated position and rotation
  Transform.create(entity, { 
    position: position,
    rotation: rotation,
    scale: scale
  })
  
  // Set plane mesh and material
  MeshRenderer.setPlane(entity)
  Material.setPbrMaterial(entity, { 
    albedoColor: Color4.fromHexString('#ffffffff'),
    emissiveColor: Color4.fromHexString('#ffffffff'),
    emissiveIntensity: 0.2,
    castShadows: false
  })
  
  return entity
}

// Create multiple planes evenly distributed between two angles
export function createPlanesInRange(
  rangeStart: number, 
  rangeEnd: number, 
  planeCount: number, 
  radius: number = 5, 
  scale: Vector3 = Vector3.create(1, 1, 1)
): Entity[] {
  const planes: Entity[] = []
  
  // Calculate the angle step between each plane
  const angleStep = (rangeEnd - rangeStart) / (planeCount - 1)
  
  // Create planes at calculated angles
  for (let i = 0; i < planeCount; i++) {
    const angle = rangeStart + (angleStep * i)
    const plane = createPlane(angle, radius, scale)
    planes.push(plane)
  }
  
  return planes
}

// Create a curved grid of planes with both horizontal and vertical distribution
// Grid dimensions and angular ranges will be calculated automatically based on scene limits
export async function createCurvedGrid(
  radius: number = 5,
  scale: Vector3 = Vector3.create(1, 1, 1),
  heightOffset: number = 2, // Height offset for the entire grid
  parentRotation: number = 0, // Y-axis rotation for the parent entity
  parentPosition: Vector3 = Vector3.create(0, 0, 8) // Position of the entire grid in world space
): Promise<Entity> {
  const planes: Entity[] = []
  
  // Create parent entity at specified position
  const parentEntity = engine.addEntity()
  Transform.create(parentEntity, {
    position: parentPosition, // Use the provided position parameter
    rotation: Quaternion.fromEulerDegrees(0, parentRotation, 0)
  })
  
  // Initialize scene configuration first (includes custom grid sizing)
  // console.log('🔍 DEBUG: About to call initializeSceneConfig()')
  await initializeSceneConfig()
  // console.log('🔍 DEBUG: Finished initializeSceneConfig()')
  
  const materialCountBefore = getMaterialCount()
  const planesPerPage = getCurrentPlanesPerPage()
  const gridDims = calculateGridDimensions(planesPerPage)
  
  console.log(`🔍 FINAL GRID DEBUG:`)
  console.log(`   Planes per page: ${planesPerPage}`)
  console.log(`   Grid dimensions: ${gridDims.cols}×${gridDims.rows} = ${gridDims.cols * gridDims.rows}`)
  console.log(`   Expected total pages: ${Math.ceil(1227 / planesPerPage)}`)
  console.log(`   🎯 RADIUS BEING USED: ${radius} meters`)
  const sceneConfig = getSceneConfig()
  
  // Calculate optimal angular ranges based on grid dimensions
  const angularRanges = calculateOptimalAngularRanges(gridDims)
  
  console.log('🏗️ GRID CREATION START:')
  console.log(`   Materials before: ${materialCountBefore}`)
  console.log(`   Parcel count: ${sceneConfig?.parcelCount || 1}`)
  console.log(`   Material limit: ${sceneConfig?.maxMaterials || 20}`)
  console.log(`   Grid: ${gridDims.cols}x${gridDims.rows} = ${planesPerPage} planes`)
  
  // Get current page games from pagination state
  const games = getCurrentPageGames()
  
  // Calculate angle steps based on dynamic grid dimensions and optimal ranges
  const hAngleStep = (angularRanges.horizontalRangeEnd - angularRanges.horizontalRangeStart) / (gridDims.cols - 1)
  const vAngleStep = (angularRanges.verticalRangeEnd - angularRanges.verticalRangeStart) / (gridDims.rows - 1)
  
  // Create grid of planes using calculated dimensions
  let gameIndex = 0
  for (let v = 0; v < gridDims.rows; v++) {
    const vAngle = angularRanges.verticalRangeStart + (vAngleStep * v)
    
    for (let h = 0; h < gridDims.cols; h++) {
      const hAngle = angularRanges.horizontalRangeStart + (hAngleStep * h)
      
      // Create plane entity
      const entity = engine.addEntity()
      
      // Track the plane with angle information
      Plane.create(entity, { angle: hAngle })
      
      // Get game data for this plane
      const game = games[gameIndex % games.length]
      const planeId = `r${v}-c${h}`
      const planeTitle = game ? (game.title || `Game ${gameIndex}`) : `Test ${planeId}`
      const thumbnailPath = game ? `thumbnails/${game.identifier}/__ia_thumb.jpg` : null
      
      // Handle description properly - could be string or array
      let description = 'Hello World'
      if (game && game.description) {
        if (Array.isArray(game.description)) {
          description = game.description.join(' ')
        } else {
          description = String(game.description)
        }
      }
      
      PlaneData.create(entity, {
        id: planeId,
        title: String(planeTitle),
        description: description,
        isSpecialPlane: false,
        gameIndex: gameIndex % games.length,  // Store the actual game index
        identifier: game && game.identifier ? String(game.identifier) : '',  // Store unique game identifier
        temporaryIdentifier: ''  // Will be populated from subset of closest 45
      })
      
      // Calculate position on curved grid
      const basePosition = getPositionOnCurvedGrid(hAngle, vAngle, radius)
      // Apply height offset by creating new Vector3
      const position = Vector3.create(basePosition.x, basePosition.y + heightOffset, basePosition.z)
      const rotation = getRotationFacingCenter(position)
      
      // Add 180 degree rotation on Y axis
      const rotated180 = Quaternion.multiply(rotation, Quaternion.fromEulerDegrees(0, 180, 0))
      
      // Set transform with parent entity
      Transform.create(entity, {
        position: position,
        rotation: rotated180,
        scale: scale,
        parent: parentEntity
      })
      
      // Set plane mesh and material
      MeshRenderer.setPlane(entity)
      MeshCollider.setPlane(entity)
      
      // Create texture if we have a thumbnail path
      if (thumbnailPath) {
        const texture = getCachedTexture(thumbnailPath)
        Material.setPbrMaterial(entity, {
          texture: texture,
          emissiveTexture: texture,
          emissiveColor: Color4.create(.3, .3, .3, 1.0),
          albedoColor: Color4.create(1, 1, 1, 0.3),
          transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
          alphaTest: 0.1,
          metallic: 0.0,
          roughness: 1.0,
          castShadows: false
        })
      } else {
        // Default material for planes without thumbnails
        Material.setPbrMaterial(entity, {
          albedoColor: Color4.fromHexString('#FFFFFF'),
          roughness: 1,
          castShadows: false
        })
      }
      
      // Add pointer events to detect hover and click
      PointerEvents.create(entity, {
        pointerEvents: [
          { 
            eventType: PointerEventType.PET_HOVER_ENTER,
            eventInfo: { 
              button: InputAction.IA_POINTER, 
              hoverText: planeTitle 
            } 
          },
          { 
            eventType: PointerEventType.PET_HOVER_LEAVE,
            eventInfo: { 
              button: InputAction.IA_POINTER, 
              hoverText: planeTitle 
            } 
          },
          {
            eventType: PointerEventType.PET_DOWN,
            eventInfo: {
              button: InputAction.IA_POINTER,
              hoverText: planeTitle
            }
          }
        ]
      })
      
      // TextShape removed for cleaner look - using PointerEvent tooltips only
      
      planes.push(entity)
      gameIndex++
    }
  }
  
  const materialCountAfter = getMaterialCount()
  const materialChange = materialCountAfter - materialCountBefore
  console.log('🏗️ GRID CREATION END:')
  console.log(`   Materials after: ${materialCountAfter} | Change: ${materialChange > 0 ? '+' : ''}${materialChange}`)
  console.log(`   Created: ${planes.length} planes | Grid: ${gridDims.cols}x${gridDims.rows}`)
  console.log(`   Material usage: ${materialCountAfter}/${sceneConfig?.maxMaterials || 20} (${Math.round((materialCountAfter / (sceneConfig?.maxMaterials || 20)) * 100)}%)`)
  console.log(`   Texture cache: ${textureCache.size}/${sceneConfig?.maxTextures || 10} (${Math.round((textureCache.size / (sceneConfig?.maxTextures || 10)) * 100)}%)`)
  console.log(`   Parent rotation: ${parentRotation}° | Height offset: ${heightOffset}m`)
  
  return parentEntity
}

// Create a single large curved grid with fixed angular ranges
// This approach is simpler and ensures proper circular positioning
export async function createSingleCurvedGrid(
  radius: number = 10,
  scale: Vector3 = Vector3.create(1, 1, 1),
  gridPosition: Vector3 = Vector3.create(0, 0, 0),
  horizontalRangeStart: number = 190,
  horizontalRangeEnd: number = 350,
  verticalRangeStart: number = -15,
  verticalRangeEnd: number = 15
): Promise<Entity[]> {
  const planes: Entity[] = []
  
  // Initialize scene configuration
  await initializeSceneConfig()
  
  const materialCountBefore = getMaterialCount()
  const planesPerPage = getCurrentPlanesPerPage()
  const gridDims = calculateGridDimensions(planesPerPage)
  
  console.log('🏗️ SINGLE GRID CREATION START:')
  console.log(`   Position: (${gridPosition.x}, ${gridPosition.y}, ${gridPosition.z})`)
  console.log(`   Radius: ${radius}m`)
  console.log(`   Horizontal range: ${horizontalRangeStart}° to ${horizontalRangeEnd}°`)
  console.log(`   Vertical range: ${verticalRangeStart}° to ${verticalRangeEnd}°`)
  console.log(`   Grid: ${gridDims.cols}×${gridDims.rows} = ${planesPerPage} planes`)
  // Get current page games from pagination state
  const games = getCurrentPageGames()
  console.log(`   Games available: ${games.length}`)
  
  // Debug: Check if we have no games
  if (games.length === 0) {
    console.error('⚠️ WARNING: No games available for grid creation!')
    console.log('   Debugging pagination state:')
    console.log(`   Current page: ${getCurrentPage()}`)
    console.log(`   Items per page: ${getItemsPerPage()}`)
    console.log(`   Total filtered games: ${getFilteredGames().length}`)
    console.log(`   Planes per page config: ${planesPerPage}`)
    return [] // Return empty array instead of creating empty grid
  }
  
  // Calculate angle steps
  const hAngleStep = (horizontalRangeEnd - horizontalRangeStart) / (gridDims.cols - 1)
  const vAngleStep = (verticalRangeEnd - verticalRangeStart) / (gridDims.rows - 1)
  
  console.log(`   Angle steps: ${hAngleStep.toFixed(2)}° horizontal, ${vAngleStep.toFixed(2)}° vertical`)
  
  // Create parent entity at specified position
  const parentEntity = engine.addEntity()
  Transform.create(parentEntity, {
    position: gridPosition,
    rotation: Quaternion.fromEulerDegrees(0, 0, 0)
  })
  
  // Create grid of planes
  let gameIndex = 0
  for (let v = 0; v < gridDims.rows; v++) {
    const vAngle = verticalRangeStart + (vAngleStep * v)
    
    for (let h = 0; h < gridDims.cols; h++) {
      const hAngle = horizontalRangeStart + (hAngleStep * h)
      
      // Create plane entity
      const entity = engine.addEntity()
      
      // Track the plane
      Plane.create(entity, { angle: hAngle })
      
      // Get game data (use modulo to repeat if needed)
      const game = games[gameIndex % games.length]
      const planeId = `r${v}-c${h}`
      const planeTitle = game ? (game.title || `Game ${gameIndex}`) : `Plane ${planeId}`
      const thumbnailPath = game ? `thumbnails/${game.identifier}/__ia_thumb.jpg` : null
      
      // Handle description
      let description = 'No description'
      if (game && game.description) {
        description = Array.isArray(game.description) 
          ? game.description.join(' ') 
          : String(game.description)
      }
      
      PlaneData.create(entity, {
        id: planeId,
        title: String(planeTitle),
        description: description,
        isSpecialPlane: false,
        gameIndex: gameIndex % games.length,  // Store the actual game index
        identifier: game && game.identifier ? String(game.identifier) : '',  // Store unique game identifier
        temporaryIdentifier: ''  // Will be populated from subset of closest 45
      })
      
      // Calculate position on sphere surface
      const position = getPositionOnCurvedGrid(hAngle, vAngle, radius)
      const rotation = getRotationFacingCenter(position)
      
      // Debug first few planes
      if (gameIndex < 3) {
        console.log(`🎯 Plane ${gameIndex}: hAngle=${hAngle.toFixed(1)}°, vAngle=${vAngle.toFixed(1)}°`)
        console.log(`   Position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`)
        console.log(`   Radius check: ${Math.sqrt(position.x * position.x + position.z * position.z).toFixed(2)}m`)
      }
      
      // Add 180 degree rotation for proper facing
      const rotated180 = Quaternion.multiply(rotation, Quaternion.fromEulerDegrees(0, 180, 0))
      
      // Set transform as child of parent
      Transform.create(entity, {
        position: position,
        rotation: rotated180,
        scale: scale,
        parent: parentEntity
      })
      
      // Debug first plane transform
      if (gameIndex === 0) {
        console.log(`🎯 First plane transform:`)
        console.log(`   Scale: (${scale.x}, ${scale.y}, ${scale.z})`)
        console.log(`   Parent position: (${gridPosition.x}, ${gridPosition.y}, ${gridPosition.z})`)
        console.log(`   World position would be: (${gridPosition.x + position.x}, ${gridPosition.y + position.y}, ${gridPosition.z + position.z})`)
      }
      
      // Set mesh and material
      MeshRenderer.setPlane(entity)
      MeshCollider.setPlane(entity)
      
      // Don't assign materials here - KNN system will handle all material assignments
      // This prevents initial material creation and lets KNN manage everything dynamically
      
      // Add pointer events
      PointerEvents.create(entity, {
        pointerEvents: [
          { 
            eventType: PointerEventType.PET_HOVER_ENTER,
            eventInfo: { button: InputAction.IA_POINTER, hoverText: planeTitle } 
          },
          { 
            eventType: PointerEventType.PET_HOVER_LEAVE,
            eventInfo: { button: InputAction.IA_POINTER, hoverText: planeTitle } 
          },
          {
            eventType: PointerEventType.PET_DOWN,
            eventInfo: { button: InputAction.IA_POINTER, hoverText: planeTitle }
          }
        ]
      })
      
      planes.push(entity)
      gameIndex++
    }
  }
  
  const materialCountAfter = getMaterialCount()
  console.log('🏗️ SINGLE GRID CREATION END:')
  console.log(`   Created: ${planes.length} planes`)
  console.log(`   Materials: ${materialCountAfter} (was ${materialCountBefore})`)
  console.log(`   All planes positioned on circle with radius ${radius}m`)
  
  return planes
}

// Function to update existing planes with new page data
export async function updatePlanesWithCurrentPage() {
  const games = getCurrentPageGames()
  let gameIndex = 0
  
  // Ensure scene config is loaded
  await initializeSceneConfig()
  
  const materialCountBefore = getMaterialCount()
  const sceneConfig = getSceneConfig()
  const planesPerGrid = getCurrentPlanesPerPage()
  console.log('📄 PAGINATION START:')
  console.log(`   Materials before: ${materialCountBefore} | Page: ${games.length} games | Cache: ${textureCache.size}/${sceneConfig?.maxTextures || 10}`)
  console.log(`   Updating 2 grids with ${planesPerGrid} planes each`)
  
  // Don't clear texture cache - keep all textures cached for reuse
  
  // Update all existing plane entities with new game data
  for (const [entity] of engine.getEntitiesWith(Plane, PlaneData)) {
    const planeData = PlaneData.getMutable(entity)
    
    // Since we have two grids showing the same content, we use modulo to cycle through games
    const game = gameIndex < games.length ? games[gameIndex % games.length] : null
    
    if (game && game.identifier) {
      const planeTitle = String(game.title || `Game ${gameIndex}`)
      const thumbnailPath = `thumbnails/${game.identifier}/__ia_thumb.jpg`
      
      // Update plane data - ensure all values are strings
      planeData.title = String(planeTitle)
      
      // Handle description - could be string or array
      let description = 'No description'
      if (game.description) {
        if (Array.isArray(game.description)) {
          description = game.description.join(' ')
        } else {
          description = String(game.description)
        }
      }
      planeData.description = description
      planeData.identifier = String(game.identifier) // Update identifier for KNN system
      planeData.gameIndex = gameIndex % games.length // Update gameIndex for KNN system
      
      // Ensure plane is visible (in case it was previously empty and invisible)
      if (!MeshRenderer.has(entity)) {
        MeshRenderer.setPlane(entity)
      }
      
      // DON'T apply materials here - let KNN system handle all material assignments
      
      // TextShape updates removed - using PointerEvent tooltips only
      
      // Update PointerEvents hover text
      if (PointerEvents.has(entity)) {
        const pointerEvents = PointerEvents.getMutable(entity)
        // Update all pointer events that have hover text
        pointerEvents.pointerEvents.forEach(event => {
          if (event.eventInfo?.hoverText) {
            event.eventInfo.hoverText = String(planeTitle)
          }
        })
      }
    } else {
      // Clear plane data for empty planes
      planeData.title = ''
      planeData.description = ''
      planeData.identifier = '' // Clear identifier so KNN system knows it's empty
      planeData.gameIndex = 0
      
      // Make empty plane invisible immediately (don't wait for KNN)
      if (Material.has(entity)) {
        Material.deleteFrom(entity)
      }
      if (MeshRenderer.has(entity)) {
        MeshRenderer.deleteFrom(entity)
      }
      
      // TextShape hiding removed - no text entities to hide
      
      // Clear hover text for hidden planes
      if (PointerEvents.has(entity)) {
        const pointerEvents = PointerEvents.getMutable(entity)
        pointerEvents.pointerEvents.forEach(event => {
          if (event.eventInfo?.hoverText) {
            event.eventInfo.hoverText = ''
          }
        })
      }
    }
    
    gameIndex++
    // Reset gameIndex after one grid's worth of planes to ensure both grids show same content
    if (gameIndex >= planesPerGrid) {
      gameIndex = 0
    }
  }
  
  const materialCountAfter = getMaterialCount()
  const materialChange = materialCountAfter - materialCountBefore
  const sceneConfigEnd = getSceneConfig()
  console.log('📄 PAGINATION END:')
  console.log(`   Materials after: ${materialCountAfter} | Change: ${materialChange > 0 ? '+' : ''}${materialChange}`)
  console.log(`   Usage: ${materialCountAfter}/${sceneConfigEnd?.maxMaterials || 20} materials, ${textureCache.size}/${sceneConfigEnd?.maxTextures || 10} textures`)
}
