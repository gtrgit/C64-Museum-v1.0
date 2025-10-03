import {
  engine,
  Transform,
  inputSystem,
  PointerEvents,
  InputAction,
  PointerEventType,
  Material,
  TextureWrapMode,
  PointerEvents as PointerEventsComponent
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { Cube, Spinner, PreviewPlane, PlacedPlane, TemplatePreview, TemplatePreviewParent, OriginalEmission } from './plane-components'
import { getRandomHexColor, setHoveredPlaneName, setHoveredPlaneEntity, getSnappingEnabled, setHoveredSnapTarget, getHoveredSnapTarget, calculateDistance, getTemplates, TemplateData, isCreatingTemplate, addPlaneToTemplate, removePlaneFromTemplate, templateCreationState, isDeletingPlanes, addPlaneToDelete, removePlaneFromDelete, deleteModeState } from './plane-utils'
import { isDeveloperMode } from '../ui-manager'
import { openExternalUrl } from '~system/RestrictedActions'


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
          // Restore original emission values
          const material = Material.getMutable(entity)
          if (material.material?.$case === 'pbr' && material.material.pbr.emissiveColor) {
            const originalEmission = OriginalEmission.getOrNull(entity)
            if (originalEmission && originalEmission.hasOriginal) {
              // Restore original values
              material.material.pbr.emissiveColor = Color4.create(
                originalEmission.emissiveColorR,
                originalEmission.emissiveColorG,
                originalEmission.emissiveColorB,
                originalEmission.emissiveColorA
              )
              material.material.pbr.emissiveIntensity = originalEmission.emissiveIntensity
              // Remove the component as it's no longer needed
              OriginalEmission.deleteFrom(entity)
            } else {
              // Fallback to default values if no original stored
              material.material.pbr.emissiveColor = Color4.create(0.2, 0.2, 0.3, 1)
              material.material.pbr.emissiveIntensity = 0.3
            }
          }
          console.log(`Removed plane from template: ${plane.name}`)
        } else {
          addPlaneToTemplate(entity)
          // Store original emission values before applying highlight
          const material = Material.getMutable(entity)
          if (material.material?.$case === 'pbr') {
            // Store original values if not already stored
            if (!OriginalEmission.has(entity)) {
              const originalEmissive = material.material.pbr.emissiveColor || Color4.create(0.2, 0.2, 0.3, 1)
              const originalIntensity = material.material.pbr.emissiveIntensity || 0.3
              OriginalEmission.create(entity, {
                emissiveColorR: originalEmissive.r,
                emissiveColorG: originalEmissive.g,
                emissiveColorB: originalEmissive.b,
                emissiveColorA: 1, // Color3 doesn't have alpha, so we use 1
                emissiveIntensity: originalIntensity,
                hasOriginal: true
              })
            }
            // Apply selection highlight - bright green glow
            material.material.pbr.emissiveColor = Color4.create(0.2, 1, 0.2, 1)
            material.material.pbr.emissiveIntensity = 0.8
          }
          console.log(`Added plane to template: ${plane.name}`)
        }
      } else if (isDeletingPlanes()) {
        // Toggle plane selection for deletion
        if (deleteModeState.selectedPlanes.has(entity)) {
          removePlaneFromDelete(entity)
          // Restore original emission values
          const material = Material.getMutable(entity)
          if (material.material?.$case === 'pbr' && material.material.pbr.emissiveColor) {
            const originalEmission = OriginalEmission.getOrNull(entity)
            if (originalEmission && originalEmission.hasOriginal) {
              // Restore original values
              material.material.pbr.emissiveColor = Color4.create(
                originalEmission.emissiveColorR,
                originalEmission.emissiveColorG,
                originalEmission.emissiveColorB,
                originalEmission.emissiveColorA
              )
              material.material.pbr.emissiveIntensity = originalEmission.emissiveIntensity
              // Remove the component as it's no longer needed
              OriginalEmission.deleteFrom(entity)
            } else {
              // Fallback to default values if no original stored
              material.material.pbr.emissiveColor = Color4.create(0.2, 0.2, 0.3, 1)
              material.material.pbr.emissiveIntensity = 0.3
            }
          }
          console.log(`Removed plane from delete selection: ${plane.name}`)
        } else {
          addPlaneToDelete(entity)
          // Store original emission values before applying highlight
          const material = Material.getMutable(entity)
          if (material.material?.$case === 'pbr') {
            // Store original values if not already stored
            if (!OriginalEmission.has(entity)) {
              const originalEmissive = material.material.pbr.emissiveColor || Color4.create(0.2, 0.2, 0.3, 1)
              const originalIntensity = material.material.pbr.emissiveIntensity || 0.3
              OriginalEmission.create(entity, {
                emissiveColorR: originalEmissive.r,
                emissiveColorG: originalEmissive.g,
                emissiveColorB: originalEmissive.b,
                emissiveColorA: 1, // Color3 doesn't have alpha, so we use 1
                emissiveIntensity: originalIntensity,
                hasOriginal: true
              })
            }
            // Apply selection highlight - bright red glow
            material.material.pbr.emissiveColor = Color4.create(1, 0.2, 0.2, 1)
            material.material.pbr.emissiveIntensity = 0.8
          }
          console.log(`Added plane to delete selection: ${plane.name}`)
        }
      } else {
        // Check if not in developer mode and plane has URL
        if (!isDeveloperMode() && plane.url && plane.url.trim() !== '') {
          // Open the URL in a new tab/window
          openExternalUrl({ url: plane.url })
          console.log(`Opening URL: ${plane.url}`)
        } else if (isDeveloperMode()) {
          // Only select plane in developer mode
          setHoveredPlaneName(plane.name)
          setHoveredPlaneEntity(entity)
          console.log(`Selected plane: ${plane.name} (Developer Mode)`)
        } else {
          // Not in developer mode but no URL - do nothing
          console.log(`Clicked plane: ${plane.name} (No URL set)`)
        }
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
      
      // Update hover text based on mode and URL
      const pointerEvents = PointerEvents.getMutable(entity)
      if (pointerEvents && pointerEvents.pointerEvents.length > 0) {
        if (!isDeveloperMode() && plane.url && plane.url.trim() !== '') {
          // Show URL hover text when not in developer mode
          pointerEvents.pointerEvents[0].eventInfo = {
            button: InputAction.IA_POINTER,
            hoverText: `Open: ${plane.url}`
          }
        } else if (isDeveloperMode()) {
          // Show selection hover text in developer mode
          pointerEvents.pointerEvents[0].eventInfo = {
            button: InputAction.IA_POINTER,
            hoverText: `Click to select ${plane.name}`
          }
        } else {
          // No URL and not in developer mode
          pointerEvents.pointerEvents[0].eventInfo = {
            button: InputAction.IA_POINTER,
            hoverText: plane.name
          }
        }
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
  loadDistance: 20.0, // Distance to start loading textures
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
  // BUT always run on first load when lastPlayerPosition is Zero
  const moveDistance = calculateDistance(currentPlayerPos, textureStreamingState.lastPlayerPosition)
  const isFirstLoad = Vector3.equals(textureStreamingState.lastPlayerPosition, Vector3.Zero())
  
  if (!isFirstLoad && moveDistance < 1.0) return // Less than 1 meter movement (skip optimization on first load)
  
  if (isFirstLoad) {
    console.log('[PLANE-KNN] 🎮 First load: Activating texture streaming system')
    console.log(`[PLANE-KNN] Player starting position: (${currentPlayerPos.x.toFixed(2)}, ${currentPlayerPos.y.toFixed(2)}, ${currentPlayerPos.z.toFixed(2)})`)
  }
  
  textureStreamingState.lastPlayerPosition = Vector3.clone(currentPlayerPos)
  
  // Find all unique cluster center IDs and their distances
  const clusterDistances = new Map<number, number>()
  
  // Debug: Check all PlacedPlane entities on first load
  if (isFirstLoad) {
    const allPlanes = [...engine.getEntitiesWith(PlacedPlane)]
    console.log(`[PLANE-KNN] 🔍 Found ${allPlanes.length} total PlacedPlane entities`)
    
    let clusteredPlanes = 0
    let unclusteredPlanes = 0
    for (const [entity, planeComponent] of allPlanes) {
      if (planeComponent.localKnnClusterId === 0) {
        unclusteredPlanes++
      } else {
        clusteredPlanes++
      }
    }
    console.log(`[PLANE-KNN]   - ${clusteredPlanes} have cluster IDs`)
    console.log(`[PLANE-KNN]   - ${unclusteredPlanes} have NO cluster ID (localKnnClusterId = 0)`)
  }
  
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
  
  // Find closest cluster for logging purposes
  let closestDistance = Infinity
  let closestClusterId = 0
  for (const [clusterId, distance] of clusterDistances) {
    if (distance < closestDistance) {
      closestDistance = distance
      closestClusterId = clusterId
    }
  }
  
  if (isFirstLoad) {
    // On first load: Just load the first 3 clusters regardless of distance
    const allClusterIds = Array.from(clusterDistances.keys())
    const firstThreeClusters = allClusterIds.slice(0, 3)
    for (const clusterId of firstThreeClusters) {
      newActiveClusterIds.add(clusterId)
    }
    console.log(`[PLANE-KNN] First load: Loading first 3 clusters [${firstThreeClusters.join(', ')}]`)
  } else {
    // Normal operation: Use distance-based loading
    for (const [clusterId, distance] of clusterDistances) {
      if (distance < textureStreamingState.loadDistance) {
        newActiveClusterIds.add(clusterId)
      }
    }
    
    // Always load the closest cluster, even if it's beyond load distance
    if (closestClusterId && closestDistance < 50.0) { // Maximum range of 50 meters
      newActiveClusterIds.add(closestClusterId)
    }
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
  
  // Debug output - especially useful on first load
  if (clustersToLoad.size > 0 || clustersToUnload.size > 0 || isFirstLoad) {
    console.log(`[PLANE-KNN] 📊 Texture Streaming Status:`)
    console.log(`[PLANE-KNN]   Total clusters found: ${clusterDistances.size}`)
    console.log(`[PLANE-KNN]   Active cluster IDs: [${Array.from(newActiveClusterIds).join(', ')}]`)
    console.log(`[PLANE-KNN]   Clusters to load: ${clustersToLoad.size} [${Array.from(clustersToLoad).join(', ')}]`)
    console.log(`[PLANE-KNN]   Clusters to unload: ${clustersToUnload.size} [${Array.from(clustersToUnload).join(', ')}]`)
    console.log(`[PLANE-KNN]   Load distance: ${isFirstLoad ? 'First 3 clusters' : textureStreamingState.loadDistance + 'm (normal)'}`)
    if (closestClusterId) {
      console.log(`[PLANE-KNN]   Closest cluster: ${closestClusterId} at ${closestDistance.toFixed(2)}m`)
    }
  }
}

function loadTexturesForCluster(clusterId: number) {
  console.log(`[PLANE-KNN] 📥 Loading textures for cluster ID: ${clusterId}`)
  
  let loadedCount = 0
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
        loadedCount++
      }
    }
  }
  console.log(`[PLANE-KNN]   ✅ Loaded ${loadedCount} textures for cluster ${clusterId}`)
}

function unloadTexturesForCluster(clusterId: number) {
  console.log(`[PLANE-KNN] 📤 Unloading textures for cluster ID: ${clusterId}`)
  
  let unloadedCount = 0
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    if (planeComponent.localKnnClusterId === clusterId && planeComponent.currentImage) {
      const material = Material.getMutable(entity)
      
      if (material.material?.$case === 'pbr') {
        material.material.pbr.texture = undefined
        material.material.pbr.emissiveTexture = undefined
        unloadedCount++
      }
    }
  }
  console.log(`[PLANE-KNN]   ❌ Unloaded ${unloadedCount} textures for cluster ${clusterId}`)
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
