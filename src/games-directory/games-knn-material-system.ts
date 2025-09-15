import { 
  engine, 
  Transform, 
  Material, 
  MaterialTransparencyMode,
  Entity,
  MeshRenderer
} from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { Plane, PlaneData } from './games-components'
import { getCachedTexture } from './games-factory'
import gamesDataImport from '../../data/c64_software_cleaned'

// Convert readonly array to mutable for internal use
const gamesData = [...gamesDataImport]
import { getCurrentHoveredEntity, getCurrentPageGames } from './games-state'

// Configuration
const MAX_HIGH_QUALITY_MATERIALS = 45
const UPDATE_INTERVAL = 1.0 // seconds between updates
const MIN_MOVEMENT_THRESHOLD = 2.0 // minimum player movement to trigger update
const MAX_RAY_DISTANCE = 50.0 // maximum distance to consider hovered planes (in meters)

// System state
let lastPlayerPosition = Vector3.create(0, 0, 0)
let lastUpdateTime = 0
let highQualityPlanes = new Set<Entity>() // Entities with high-quality materials
let highQualityMaterials: Entity[] = [] // Array of entities that have high-quality materials to share
let gameDataArray = gamesData
let isInitialized = false
let temporaryIdentifiersAssigned = false // Flag to track if temporaryIdentifiers have been assigned
let forceUpdateHighQuality = false // Flag to force update high-quality materials

// Track which planes have materials applied
const planesWithMaterials = new Set<Entity>()
// Track temporary identifiers in use
const temporaryIdentifiersInUse = new Set<string>()

interface PlaneDistance {
  entity: Entity
  distance: number
  gameIndex: number
  identifier: string
  planeData: any
}

// Get player world position
function getPlayerWorldPosition(): Vector3 {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return Vector3.create(0, 0, 0)
  return playerTransform.position
}

// Calculate world position of a plane (considering parent transforms)
function getPlaneWorldPosition(entity: Entity): Vector3 {
  const transform = Transform.getOrNull(entity)
  if (!transform) return Vector3.create(0, 0, 0)
  
  let worldPos = Vector3.clone(transform.position)
  
  // Add parent position if exists
  if (transform.parent) {
    const parentTransform = Transform.getOrNull(transform.parent)
    if (parentTransform) {
      worldPos = Vector3.add(worldPos, parentTransform.position)
    }
  }
  
  return worldPos
}

// Calculate distance between two 3D points
function calculateDistance(pos1: Vector3, pos2: Vector3): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y  
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// Find the K nearest planes to the reference point (hovered plane or player) using KNN
function findNearestPlanes(referencePos: Vector3, k: number): PlaneDistance[] {
  const distances: PlaneDistance[] = []
  
  // Calculate distances to all planes (including empty ones for proper distance calculation)
  for (const [entity, plane, planeData] of engine.getEntitiesWith(Plane, PlaneData)) {
    const identifier = planeData.identifier || ''
    // Don't skip empty planes here - we need them in distance calculations
    // The filtering will happen in the material application logic
    
    const planeWorldPos = getPlaneWorldPosition(entity)
    const distance = calculateDistance(referencePos, planeWorldPos)
    
    // Use the stored gameIndex and identifier from plane creation (ensures sync with title/description)
    const gameIndex = planeData.gameIndex || 0
    
    distances.push({
      entity: entity,
      distance: distance,
      gameIndex: gameIndex,
      identifier: identifier,
      planeData: planeData
    })
  }
  
  // Sort by distance and return the K nearest
  distances.sort((a, b) => a.distance - b.distance)
  return distances.slice(0, k)
}

// No longer needed - we apply materials directly
function getOrCreateMaterialEntity(identifier: string): Entity | null {
  // This function is no longer used but kept for compatibility
  return null
}

// Apply high-quality material directly to plane
function applyHighQualityMaterialToPlane(planeEntity: Entity) {
  // Remove any existing material assignment
  removeMaterialFromPlane(planeEntity)
  
  // Get the plane data to find the identifier
  const planeData = PlaneData.getOrNull(planeEntity)
  if (!planeData || !planeData.identifier) return
  
  // Apply high-quality material directly to this plane
  const thumbnailPath = `thumbnails/${planeData.identifier}/__ia_thumb.jpg`
  const texture = getCachedTexture(thumbnailPath)
  
  Material.setPbrMaterial(planeEntity, {
    texture: texture,
    emissiveTexture: texture,
    emissiveColor: Color4.create(0.3, 0.3, 0.3, 1.0),
    albedoColor: Color4.create(1, 1, 1, 0.3),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.1,
    metallic: 0.0,
    roughness: 1.0,
    castShadows: false
  })
  
  // Track that this plane has a material
  planesWithMaterials.add(planeEntity)
}

// Remove material from a plane
function removeMaterialFromPlane(planeEntity: Entity) {
  // Remove tracking
  planesWithMaterials.delete(planeEntity)
  
  // Remove material component
  if (Material.has(planeEntity)) {
    Material.deleteFrom(planeEntity)
  }
}

// Apply high-quality material to a plane using its stored identifier
function applyHighQualityMaterial(entity: Entity, gameIndex: number) {
  // Just apply the high-quality material directly
  applyHighQualityMaterialToPlane(entity)
}

// Assign temporaryIdentifiers to all planes from the first 10 closest planes
function assignTemporaryIdentifiers() {
  if (highQualityMaterials.length === 0) return
  
  console.log('🔄 Assigning temporaryIdentifiers from first 10 closest planes...')
  
  // Get identifiers from first 10 closest planes for the temporary pool
  const temporaryPool: string[] = []
  const numTemporary = Math.min(10, highQualityMaterials.length)
  
  for (let i = 0; i < numTemporary; i++) {
    const sourceEntity = highQualityMaterials[i]
    const sourcePlaneData = PlaneData.getOrNull(sourceEntity)
    if (sourcePlaneData && sourcePlaneData.identifier) {
      temporaryPool.push(sourcePlaneData.identifier)
    }
  }
  
  console.log(`📋 Temporary pool: ${temporaryPool.length} identifiers`)
  
  // Assign temporaryIdentifier to all planes
  let assignedCount = 0
  for (const [entity, plane, planeData] of engine.getEntitiesWith(Plane, PlaneData)) {
    const mutablePlaneData = PlaneData.getMutable(entity)
    
    // If plane has no identifier (empty plane), give it no temporaryIdentifier
    if (!planeData.identifier || planeData.identifier === '') {
      mutablePlaneData.temporaryIdentifier = ''
    } else {
      // Assign a random temporaryIdentifier from the pool
      const randomIndex = Math.floor(Math.random() * temporaryPool.length)
      mutablePlaneData.temporaryIdentifier = temporaryPool[randomIndex] || ''
      assignedCount++
    }
  }
  
  console.log(`✅ Assigned temporaryIdentifiers to ${assignedCount} planes`)
}

// Apply low-quality material to distant plane using its temporaryIdentifier
function applyTemporaryMaterial(entity: Entity) {
  const planeData = PlaneData.getOrNull(entity)
  if (!planeData || !planeData.temporaryIdentifier) return
  
  // Apply low-quality material directly using temporaryIdentifier
  const thumbnailPath = `thumbnails/${planeData.temporaryIdentifier}/__ia_thumb.jpg`
  const texture = getCachedTexture(thumbnailPath)
  
  Material.setPbrMaterial(entity, {
    texture: texture,
    emissiveTexture: texture,
    emissiveColor: Color4.create(0.1, 0.1, 0.1, 1.0), // Dimmer for distant planes
    albedoColor: Color4.create(1, 1, 1, 0.2), // More transparent for distant planes
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.1,
    metallic: 0.0,
    roughness: 1.0,
    castShadows: false
  })
  
  // Track that this plane has a material and track the temporary identifier
  planesWithMaterials.add(entity)
  temporaryIdentifiersInUse.add(planeData.temporaryIdentifier)
}

// Make empty planes invisible by removing their mesh renderer
function makeEmptyPlaneInvisible(entity: Entity) {
  // Remove any existing material
  if (Material.has(entity)) {
    Material.deleteFrom(entity)
  }
  
  // Remove the mesh renderer to make it completely invisible
  if (MeshRenderer.has(entity)) {
    MeshRenderer.deleteFrom(entity)
  }
}

// Make empty planes visible again by restoring their mesh renderer
function makeEmptyPlaneVisible(entity: Entity) {
  // Add back the plane mesh renderer if it doesn't exist
  if (!MeshRenderer.has(entity)) {
    MeshRenderer.setPlane(entity)
  }
}

// Update materials when pagination changes
export function updateRandomMaterialPool() {
  console.log('🔄 Updating materials for new page...')
  
  // Reset temporaryIdentifiers flag so they get reassigned with new page data
  temporaryIdentifiersAssigned = false
  
  // Clear all material associations by removing materials from all tracked planes
  for (const planeEntity of planesWithMaterials) {
    removeMaterialFromPlane(planeEntity)
  }
  
  // Clear tracking sets
  planesWithMaterials.clear()
  temporaryIdentifiersInUse.clear()
  
  // Force refresh of all high-quality materials by clearing the set
  highQualityPlanes.clear()
  
  // Set flag to force update all high-quality materials on next KNN cycle
  forceUpdateHighQuality = true
  
  // Force a KNN update to refresh materials with new page data
  updateMaterialAssignments()
  
  console.log(`✅ Updated materials for new page - KNN will handle closest 45 + temporaryIdentifiers`)
}

// Initialize planes without materials (KNN will handle material assignment)
function initializePlanes() {
  console.log('🎨 Initializing planes (no materials yet - KNN will handle)...')
  let planeCount = 0
  
  // Clear any existing tracking
  planesWithMaterials.clear()
  temporaryIdentifiersInUse.clear()
  
  // Count planes but don't apply any materials yet
  for (const [entity, plane, planeData] of engine.getEntitiesWith(Plane, PlaneData)) {
    // Ensure planes have no materials initially
    removeMaterialFromPlane(entity)
    planeCount++
  }
  
  console.log(`✅ Initialized ${planeCount} planes without materials`)
}

// Update material assignments based on hovered plane or player position (optimized)
function updateMaterialAssignments() {
  // Get reference position - use hovered plane if available and within range, otherwise player position
  const hoveredEntity = getCurrentHoveredEntity()
  const playerPos = getPlayerWorldPosition()
  let referencePos: Vector3
  let referenceType: string
  
  if (hoveredEntity !== null) {
    // Check if hovered plane is within acceptable distance
    const hoveredPlanePos = getPlaneWorldPosition(hoveredEntity)
    const distanceToHoveredPlane = calculateDistance(playerPos, hoveredPlanePos)
    
    if (distanceToHoveredPlane <= MAX_RAY_DISTANCE) {
      // Use hovered plane as center point (only if close enough)
      referencePos = hoveredPlanePos
      referenceType = `hovered plane (${distanceToHoveredPlane.toFixed(1)}m)`
    } else {
      // Hovered plane is too far away, use player position instead
      referencePos = playerPos
      referenceType = `player position (hovered too far: ${distanceToHoveredPlane.toFixed(1)}m)`
    }
  } else {
    // Fall back to player position
    referencePos = playerPos
    referenceType = 'player position'
  }
  
  // Find the 45 nearest planes to the reference point
  const nearestPlanes = findNearestPlanes(referencePos, MAX_HIGH_QUALITY_MATERIALS)
  const newHighQualityPlanes = new Set<Entity>()
  
  let updatedPlanes = 0
  
  // Apply high-quality materials to closest planes (only if they have game data)
  nearestPlanes.forEach(plane => {
    // Only add to high-quality set if the plane has valid game data (identifier exists)
    if (plane.identifier && plane.identifier !== '') {
      newHighQualityPlanes.add(plane.entity)
      
      // Update if new plane or if forced update (pagination)
      if (!highQualityPlanes.has(plane.entity) || forceUpdateHighQuality) {
        applyHighQualityMaterial(plane.entity, plane.gameIndex)
        updatedPlanes++
      }
    }
    // If plane has no identifier (empty plane), don't add it to high-quality set
    // and make it invisible
    else if (!plane.identifier || plane.identifier === '') {
      makeEmptyPlaneInvisible(plane.entity)
    }
  })
  
  // Update the list of high-quality material entities for sharing
  highQualityMaterials = Array.from(newHighQualityPlanes)
  
  // Assign temporaryIdentifiers when we first have enough high-quality materials (with valid data)
  if (!temporaryIdentifiersAssigned && highQualityMaterials.length >= 10) {
    assignTemporaryIdentifiers() // Assign temporaryIdentifiers from first 10 closest planes
    temporaryIdentifiersAssigned = true // Mark as initialized
  }
  
  // If temporaryIdentifiers exist but we're forcing update (e.g., pagination), reassign them
  if (forceUpdateHighQuality && highQualityMaterials.length >= 10) {
    assignTemporaryIdentifiers()
  }
  
  // Handle planes that are no longer in the closest 45 (need to switch to temporaryIdentifier)
  for (const entity of highQualityPlanes) {
    if (!newHighQualityPlanes.has(entity)) {
      // This plane was in closest 45 but no longer is - switch to temporaryIdentifier
      const planeData = PlaneData.getOrNull(entity)
      if (planeData && planeData.temporaryIdentifier && planeData.temporaryIdentifier !== '') {
        applyTemporaryMaterial(entity)
        updatedPlanes++
      } else if (planeData && (!planeData.identifier || planeData.identifier === '')) {
        // Empty plane - make invisible
        makeEmptyPlaneInvisible(entity)
      }
    }
  }

  // Clear temporary identifiers tracking before re-applying
  temporaryIdentifiersInUse.clear()
  
  // Apply temporary materials to all other distant planes using temporaryIdentifier
  for (const [entity, plane, planeData] of engine.getEntitiesWith(Plane, PlaneData)) {
    if (!newHighQualityPlanes.has(entity) && !highQualityPlanes.has(entity)) {
      // This plane was never in closest 45 - apply temporaryIdentifier if it has one
      if (planeData.temporaryIdentifier && planeData.temporaryIdentifier !== '') {
        if (!Material.has(entity)) { // Only apply if it doesn't already have a material
          applyTemporaryMaterial(entity)
        }
      } else if (!planeData.identifier || planeData.identifier === '') {
        // Empty plane - make invisible
        makeEmptyPlaneInvisible(entity)
      }
    }
  }
  
  // Update tracking
  highQualityPlanes = newHighQualityPlanes
  lastPlayerPosition = Vector3.clone(referencePos) // Track reference position for movement detection
  forceUpdateHighQuality = false // Reset force flag
  
  // Count unique textures in use (high quality + temporary identifiers)
  const uniqueTexturesCount = newHighQualityPlanes.size + temporaryIdentifiersInUse.size
  
  // Count planes using materials
  const planesWithMaterialsCount = planesWithMaterials.size
  
  // Count empty vs populated planes for debugging
  let emptyPlanes = 0
  let populatedPlanes = 0
  for (const [entity, plane, planeData] of engine.getEntitiesWith(Plane, PlaneData)) {
    if (planeData.identifier && planeData.identifier !== '') {
      populatedPlanes++
    } else {
      emptyPlanes++
    }
  }

  console.log(`🎯 KNN UPDATE: ${updatedPlanes} planes updated`)
  console.log(`   Reference: ${referenceType} at (${referencePos.x.toFixed(1)}, ${referencePos.y.toFixed(1)}, ${referencePos.z.toFixed(1)})`)
  console.log(`   High-quality: ${newHighQualityPlanes.size} planes (from ${populatedPlanes} with data, ${emptyPlanes} empty)`)
  console.log(`   Unique textures: ${uniqueTexturesCount} (${newHighQualityPlanes.size} high + ${temporaryIdentifiersInUse.size} temp)`)
  console.log(`   Planes with materials: ${planesWithMaterialsCount}`)
}

// Main KNN material system - called every frame
export function knnMaterialSystem(dt: number) {
  // Initialize on first run
  if (!isInitialized) {
    // Note: initialization is handled by initializeKNNMaterialSystem()
    isInitialized = true
  }
  
  lastUpdateTime += dt
  
  // Only update periodically or when reference point changes significantly
  if (lastUpdateTime < UPDATE_INTERVAL) return
  
  // Get current reference position (hovered plane or player)
  const hoveredEntity = getCurrentHoveredEntity()
  const playerPos = getPlayerWorldPosition()
  let currentReferencePos: Vector3
  
  if (hoveredEntity !== null) {
    // Check if hovered plane is within acceptable distance
    const hoveredPlanePos = getPlaneWorldPosition(hoveredEntity)
    const distanceToHoveredPlane = calculateDistance(playerPos, hoveredPlanePos)
    
    if (distanceToHoveredPlane <= MAX_RAY_DISTANCE) {
      currentReferencePos = hoveredPlanePos
    } else {
      currentReferencePos = playerPos
    }
  } else {
    currentReferencePos = playerPos
  }
  
  const referenceMovement = calculateDistance(currentReferencePos, lastPlayerPosition)
  
  if (referenceMovement < MIN_MOVEMENT_THRESHOLD && highQualityPlanes.size > 0) {
    return // Reference point hasn't moved much, keep current assignments
  }
  
  // Reset timer and update
  lastUpdateTime = 0
  updateMaterialAssignments()
}

// Initialize the system - call this once at startup
export function initializeKNNMaterialSystem() {
  console.log('🎯 Initializing KNN Material System')
  console.log(`   Dataset: ${gameDataArray.length} games`)
  console.log(`   Max high-quality materials: ${MAX_HIGH_QUALITY_MATERIALS}`)
  console.log(`   Low-quality materials: Created as needed`)
  
  // Initialize planes (no materials yet)
  console.log('🎨 Initializing planes...')
  initializePlanes()
  
  // Then do initial KNN assignment for closest 45 + temporary materials for distant
  console.log('🎯 Applying initial materials...')
  updateMaterialAssignments()
  
  // After initial assignment, ensure all distant planes get temporaryIdentifier materials
  console.log('🎯 Applying temporaryIdentifier materials to distant planes...')
  let distantMaterialsApplied = 0
  for (const [entity, plane, planeData] of engine.getEntitiesWith(Plane, PlaneData)) {
    if (!highQualityPlanes.has(entity)) {
      // This is a distant plane - apply temporaryIdentifier material if it has one
      if (planeData.temporaryIdentifier && planeData.temporaryIdentifier !== '') {
        applyTemporaryMaterial(entity)
        distantMaterialsApplied++
      }
    }
  }
  console.log(`✅ Applied temporaryIdentifier materials to ${distantMaterialsApplied} distant planes`)
  
  // Mark as initialized
  isInitialized = true
}