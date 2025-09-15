import {
  engine,
  Transform,
  inputSystem,
  PointerEvents,
  InputAction,
  PointerEventType,
  Material,
  TextureWrapMode,
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { Cube, Spinner, PreviewPlane, PlacedPlane, TemplatePreview, TemplatePreviewParent } from './plane-components'
import { getRandomHexColor, setHoveredPlaneName, setHoveredPlaneEntity, getSnappingEnabled, setHoveredSnapTarget, getHoveredSnapTarget, calculateDistance, getTemplates, TemplateData, isCreatingTemplate, addPlaneToTemplate, removePlaneFromTemplate, templateCreationState } from './plane-utils'


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
 * System to update preview plane position relative to camera or snap target
 */
export function previewPlaneSystem() {
  const cameraTransform = Transform.getOrNull(engine.CameraEntity)
  if (!cameraTransform) return

  for (const [entity, preview] of engine.getEntitiesWith(PreviewPlane, Transform)) {
    const mutableTransform = Transform.getMutable(entity)
    
    // Check if snapping is enabled and we have a snap target
    if (getSnappingEnabled() && getHoveredSnapTarget()) {
      const snapTarget = getHoveredSnapTarget()
      const targetTransform = Transform.getOrNull(snapTarget!)
      
      if (targetTransform) {
        // Snap to the target plane with Z offset to avoid Z-fighting
        const snapOffset = Vector3.create(0, 0, -0.2) // Z offset
        const rotatedOffset = Vector3.rotate(snapOffset, targetTransform.rotation)
        const snapPosition = Vector3.add(targetTransform.position, rotatedOffset)
        
        mutableTransform.position = snapPosition
        mutableTransform.rotation = targetTransform.rotation
      }
    } else {
      // Normal camera-following behavior
      const forward = Vector3.rotate(preview.offset, cameraTransform.rotation)
      const newPosition = Vector3.add(cameraTransform.position, forward)
      
      mutableTransform.position = newPosition
      mutableTransform.rotation = cameraTransform.rotation
    }
  }
}

/**
 * System to detect hover events on planes and update hover state
 */
export function planeSelectionSystem() {
  // Check for click events on placed planes
  for (const [entity, plane] of engine.getEntitiesWith(PlacedPlane, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      // Check if we're in template creation mode
      if (isCreatingTemplate()) {
        // Toggle plane selection for template
        if (templateCreationState.selectedPlanes.has(entity)) {
          removePlaneFromTemplate(entity)
          // Remove selection highlight
          const material = Material.getMutable(entity)
          if (material.material?.$case === 'pbr' && material.material.pbr.emissiveColor) {
            // Reset to normal emissive color
            material.material.pbr.emissiveColor = Color4.create(0.2, 0.2, 0.3, 1)
            material.material.pbr.emissiveIntensity = 0.3
          }
          console.log(`Removed plane from template: ${plane.name}`)
        } else {
          addPlaneToTemplate(entity)
          // Add selection highlight - bright green glow
          const material = Material.getMutable(entity)
          if (material.material?.$case === 'pbr') {
            material.material.pbr.emissiveColor = Color4.create(0.2, 1, 0.2, 1)
            material.material.pbr.emissiveIntensity = 0.8
          }
          console.log(`Added plane to template: ${plane.name}`)
        }
      } else {
        // Normal plane selection
        setHoveredPlaneName(plane.name)
        setHoveredPlaneEntity(entity)
        console.log(`Selected plane: ${plane.name}`)
      }
    }
    
    // Check for hover enter events (for snapping and texture loading)
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_ENTER, entity)) {
      if (getSnappingEnabled()) {
        setHoveredSnapTarget(entity)
        console.log(`Hovering over snap target: ${plane.name}`)
      }
      
      // Immediately load textures for hovered cluster
      if (plane.localKnnClusterId > 0) {
        loadTexturesForCluster(plane.localKnnClusterId)
        console.log(`Hover-loaded textures for cluster ID: ${plane.localKnnClusterId}`)
      }
    }
    
    // Check for hover leave events (for snapping)
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_LEAVE, entity)) {
      if (getHoveredSnapTarget() === entity) {
        setHoveredSnapTarget(null)
        console.log(`Left snap target: ${plane.name}`)
      }
    }
  }
}

// Global state for texture streaming
const textureStreamingState = {
  activeClusterIds: new Set<number>(),
  loadDistance: 10.0, // Distance to start loading textures
  lastPlayerPosition: Vector3.Zero()
}

/**
 * System to manage texture loading based on player proximity to clusters
 */
export function textureStreamingSystem() {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return
  
  const currentPlayerPos = playerTransform.position
  
  // Only update if player has moved significantly (optimization)
  const moveDistance = calculateDistance(currentPlayerPos, textureStreamingState.lastPlayerPosition)
  if (moveDistance < 1.0) return // Less than 1 meter movement
  
  textureStreamingState.lastPlayerPosition = Vector3.clone(currentPlayerPos)
  
  // Find all unique cluster center IDs and their distances
  const clusterDistances = new Map<number, number>()
  
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    if (planeComponent.localKnnClusterId === 0) continue
    
    const transform = Transform.getOrNull(entity)
    if (!transform) continue
    
    // Only check cluster centers (planes that are the center of their cluster)
    if (planeComponent.id === planeComponent.localKnnClusterId) {
      const distance = calculateDistance(currentPlayerPos, transform.position)
      clusterDistances.set(planeComponent.id, distance)
    }
  }
  
  // Determine which clusters should have textures loaded
  const newActiveClusterIds = new Set<number>()
  
  // Find closest cluster(s) within load distance
  let closestDistance = Infinity
  let closestClusterId = 0
  
  for (const [clusterId, distance] of clusterDistances) {
    if (distance < textureStreamingState.loadDistance) {
      newActiveClusterIds.add(clusterId)
    }
    
    if (distance < closestDistance) {
      closestDistance = distance
      closestClusterId = clusterId
    }
  }
  
  // Always load the closest cluster, even if it's beyond load distance
  if (closestClusterId && closestDistance < 50.0) { // Maximum range of 50 meters
    newActiveClusterIds.add(closestClusterId)
  }
  
  // Check if active clusters have changed
  const clustersToLoad = new Set<number>()
  const clustersToUnload = new Set<number>()
  
  for (const clusterId of newActiveClusterIds) {
    if (!textureStreamingState.activeClusterIds.has(clusterId)) {
      clustersToLoad.add(clusterId)
    }
  }
  
  for (const clusterId of textureStreamingState.activeClusterIds) {
    if (!newActiveClusterIds.has(clusterId)) {
      clustersToUnload.add(clusterId)
    }
  }
  
  // Update active clusters
  textureStreamingState.activeClusterIds = newActiveClusterIds
  
  // Load textures for new active clusters
  for (const clusterId of clustersToLoad) {
    loadTexturesForCluster(clusterId)
  }
  
  // Unload textures for inactive clusters
  for (const clusterId of clustersToUnload) {
    unloadTexturesForCluster(clusterId)
  }
  
  // Debug output
  if (clustersToLoad.size > 0 || clustersToUnload.size > 0) {
    console.log(`Texture streaming: Active cluster IDs: [${Array.from(newActiveClusterIds).join(', ')}]`)
  }
}

function loadTexturesForCluster(clusterId: number) {
  console.log(`Loading textures for cluster ID: ${clusterId}`)
  
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    if (planeComponent.localKnnClusterId === clusterId && planeComponent.currentImage) {
      const material = Material.getMutable(entity)
      const texturePath = `images/${planeComponent.currentImage}`
      
      if (material.material?.$case === 'pbr') {
        material.material.pbr.texture = Material.Texture.Common({
          src: texturePath,
          wrapMode: TextureWrapMode.TWM_CLAMP,
        })
        material.material.pbr.emissiveTexture = Material.Texture.Common({
          src: texturePath,
          wrapMode: TextureWrapMode.TWM_CLAMP,
        })
      }
    }
  }
}

function unloadTexturesForCluster(clusterId: number) {
  console.log(`Unloading textures for cluster ID: ${clusterId}`)
  
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    if (planeComponent.localKnnClusterId === clusterId && planeComponent.currentImage) {
      const material = Material.getMutable(entity)
      
      if (material.material?.$case === 'pbr') {
        material.material.pbr.texture = undefined
        material.material.pbr.emissiveTexture = undefined
      }
    }
  }
}

/**
 * System to update template preview parent position relative to camera
 */
export function templatePreviewSystem() {
  const cameraTransform = Transform.getOrNull(engine.CameraEntity)
  if (!cameraTransform) return

  // Only update the parent entity position - child planes will follow automatically
  for (const [parentEntity, parentComponent] of engine.getEntitiesWith(TemplatePreviewParent, Transform)) {
    const mutableTransform = Transform.getMutable(parentEntity)
    
    // Position the template parent entity in front of the camera
    const forward = Vector3.create(0, 0, 2) // 2 meters forward
    const rotatedOffset = Vector3.rotate(forward, cameraTransform.rotation)
    const newPosition = Vector3.add(cameraTransform.position, rotatedOffset)
    
    mutableTransform.position = newPosition
    // Note: Billboard component will automatically handle rotation to face camera
  }
}
