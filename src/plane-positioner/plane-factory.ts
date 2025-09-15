import {
  Entity,
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  PointerEvents,
  PointerEventType,
  InputAction,
  Material
} from '@dcl/sdk/ecs'
import { Cube, Spinner, PreviewPlane, PlacedPlane, TemplatePreview } from './plane-components'
import { Color4, Vector3, Quaternion } from '@dcl/sdk/math'
import { getRandomHexColor, StoredTransform } from './plane-utils'

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
let planeCounter = 1
let planeIdCounter = 1

// Function to initialize plane counter based on existing planes
export function initializePlaneCounter(savedPlanes?: Array<{name: string, id?: number}>): void {
  let highestNameId = 0
  let highestPlaneId = 0
  
  // Check all existing planes in the scene
  for (const [_, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    // Check name-based ID
    const match = planeComponent.name.match(/^Plane_(\d+)$/)
    if (match) {
      const nameId = parseInt(match[1])
      if (nameId > highestNameId) {
        highestNameId = nameId
      }
    }
    
    // Check plane ID
    if (planeComponent.id > highestPlaneId) {
      highestPlaneId = planeComponent.id
    }
  }
  
  // Check saved planes if provided
  if (savedPlanes) {
    for (const plane of savedPlanes) {
      // Check name-based ID
      const match = plane.name.match(/^Plane_(\d+)$/)
      if (match) {
        const nameId = parseInt(match[1])
        if (nameId > highestNameId) {
          highestNameId = nameId
        }
      }
      
      // Check plane ID
      if (plane.id && plane.id > highestPlaneId) {
        highestPlaneId = plane.id
      }
    }
  }
  
  // Set counters to highest IDs + 1
  planeCounter = highestNameId + 1
  planeIdCounter = highestPlaneId + 1
  console.log(`Plane counter initialized to: ${planeCounter} (highest name ID: ${highestNameId})`)
  console.log(`Plane ID counter initialized to: ${planeIdCounter} (highest plane ID: ${highestPlaneId})`)
}

export function createPlane(transform: StoredTransform, snapParentId?: number): Entity {
  const entity = engine.addEntity()
  const planeName = `Plane_${planeCounter++}`
  const planeId = planeIdCounter++

  // Add PlacedPlane component with name and ID
  PlacedPlane.create(entity, { 
    name: planeName, 
    id: planeId,
    currentImage: '', 
    localKnnClusterId: 0, // 0 means no cluster assigned yet
    snapParentId: snapParentId || 0 // 0 means not snapped to any plane
  })

  // Set transform with default scale of 1
  Transform.create(entity, {
    position: transform.position,
    rotation: transform.rotation,
    scale: Vector3.create(1, 1, 1)
  })

  // Set plane mesh and collider
  MeshRenderer.setPlane(entity)
  MeshCollider.setPlane(entity)
  
  // Set material with a semi-transparent white color and slight emission
  Material.setPbrMaterial(entity, { 
    albedoColor: Color4.create(1, 1, 1, 0.8),
    emissiveColor: Color4.create(0.2, 0.2, 0.3, 1),
    emissiveIntensity: 0.3
  })

  // Add pointer events to select plane on click and detect hover
  PointerEvents.create(entity, {
    pointerEvents: [
      { 
        eventType: PointerEventType.PET_DOWN, 
        eventInfo: { 
          button: InputAction.IA_POINTER, 
          hoverText: `Click to select ${planeName}` 
        } 
      },
      {
        eventType: PointerEventType.PET_HOVER_ENTER,
        eventInfo: {
          button: InputAction.IA_POINTER,
          hoverText: `${planeName} (Snap Target)`
        }
      },
      {
        eventType: PointerEventType.PET_HOVER_LEAVE,
        eventInfo: {
          button: InputAction.IA_POINTER
        }
      }
    ]
  })

  return entity
}

// Preview plane factory
export function createPreviewPlane(): Entity {
  const entity = engine.addEntity()
  
  // Add preview component with offset
  PreviewPlane.create(entity, {
    offset: Vector3.create(0, 0, 2) // 2 meters forward
  })
  
  // Set initial transform at origin
  Transform.create(entity, {
    position: Vector3.create(0, 0, 0),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1, 1, 1)
  })

  // Set plane mesh and collider
  MeshRenderer.setPlane(entity)
  
  // Set material with semi-transparent green for preview
  Material.setPbrMaterial(entity, { 
    albedoColor: Color4.create(0.2, 1, 0.2, 0.5),
    emissiveColor: Color4.create(0.1, 0.5, 0.1, 1),
    emissiveIntensity: 0.5
  })

  // Add hover text
  PointerEvents.create(entity, {
    pointerEvents: [
      { 
        eventType: PointerEventType.PET_HOVER_ENTER, 
        eventInfo: { 
          button: InputAction.IA_POINTER, 
          hoverText: 'Preview - Move to position and press Place' 
        } 
      }
    ]
  })

  return entity
}