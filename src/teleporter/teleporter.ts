import {
  Entity,
  engine,
  Transform,
  MeshRenderer,
  Material,
  MeshCollider,
  MaterialTransparencyMode,
  TextShape,
  Billboard,
  VirtualCamera,
  MainCamera
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3, Color4 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { Teleporter, TeleporterAnimated, TeleporterRipple } from './teleporter-components'

// Cache textures to avoid creating duplicates
const teleporterTextureCache = new Map<string, any>()

function getTeleporterCachedTexture(src: string) {
  if (!teleporterTextureCache.has(src)) {
    teleporterTextureCache.set(src, Material.Texture.Common({ src }))
  }
  return teleporterTextureCache.get(src)
}

export function createTeleporter(
  position: { x: number, y: number, z: number },
  destination: { x: number, y: number, z: number },
  textureSrc: string = 'images/teleporter-pad.png',
  logoTextureSrc: string = 'images/Commodore Logo.png',
  labelText: string = 'Teleporter'
): Entity {
  const entity = engine.addEntity()

  // Add teleporter component with destination
  Teleporter.create(entity, { destination })

  // Set position for static layer
  Transform.create(entity, { 
    position: Vector3.create(position.x, position.y, position.z),
    scale: Vector3.create(2, 2, 2), // Make it a thin plane, 2x2 units
    rotation: Quaternion.fromEulerDegrees(90,0,0)
  })

  // Create plane mesh and collider for static layer
  MeshRenderer.setPlane(entity)
  MeshCollider.setPlane(entity)

  // Get cached textures
  const teleporterTexture = getTeleporterCachedTexture(textureSrc)
  const logoTexture = getTeleporterCachedTexture(logoTextureSrc)

  // Apply texture for static layer (no animation)
  Material.setPbrMaterial(entity, {
    texture: teleporterTexture,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    alphaTest: 0.1,
    emissiveColor: Color4.create(1, 1, 1, 1), // Dimmed emission for static layer
    emissiveIntensity: 7.3,
    castShadows: false,
    albedoColor: Color4.create(1, 1, 1, 0.8) // Slightly transparent
  })

  // Create single animated child plane
  const animatedEntity = engine.addEntity()
  
  // Add animated component for animation tracking
  TeleporterAnimated.create(animatedEntity, {
    animationTime: 0,
    basePosition: { x: 0, y: 0, z: 0.01 } // Slightly above static layer
  })
  
  // Set as child of main teleporter at base position
  Transform.create(animatedEntity, {
    position: Vector3.create(0, 0, 0.01), // Slightly above static layer
    scale: Vector3.create(1, 1, 1),
    parent: entity
  })

  // Add mesh renderer but no collider for animated layer
  MeshRenderer.setPlane(animatedEntity)

  // Apply same material but will be animated
  Material.setPbrMaterial(animatedEntity, {
    texture: teleporterTexture,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    alphaTest: 0.1,
    emissiveColor: Color4.create(1, 1, 1, 1), // Full white emission initially
    emissiveIntensity: 5.0, // Full intensity initially
    castShadows: false,
    albedoColor: Color4.create(1, 1, 1, 1.0) // Full opacity initially
  })

  // Create logo plane (not as child to avoid inheriting transparency)
  const logoEntity = engine.addEntity()
  
  // Position independently but linked to teleporter position
  Transform.create(logoEntity, {
    position: Vector3.create(position.x, position.y, position.z), // Above teleporter
    scale: Vector3.create(0.9, 0.9, 0.9), // Reduced scale
    rotation: Quaternion.fromEulerDegrees(90, 0, 0)
  })

  // Add mesh renderer but no collider
  MeshRenderer.setPlane(logoEntity)

  // Apply logo texture without transparency inheritance
  Material.setPbrMaterial(logoEntity, {
    texture: logoTexture,
    emissiveTexture: logoTexture,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    alphaTest: 0.1,
    emissiveColor: Color4.create(1.0, 1.0, 1.0, 1.0),
    emissiveIntensity: 1.5,
    castShadows: false,
    albedoColor: Color4.create(1, 1, 1, 1.0) // Full opacity
  })

  // Create text label above teleporter
  const textEntity = engine.addEntity()
  
  // Position text 2 meters above teleporter
  Transform.create(textEntity, {
    position: Vector3.create(position.x, position.y + 2, position.z)
  })

  // Add billboard component for X-axis rotation only
  Billboard.create(textEntity, {
    billboardMode: 2 // X-axis billboard
  })

  // Create text shape
  TextShape.create(textEntity, {
    text: labelText,
    fontSize: 3,
    textColor: Color4.create(1, 1, 1, 1), // White text
    outlineColor: Color4.create(0, 0, 0, 1), // Black outline
    outlineWidth: 0.1
  })

  return entity
}

export function teleporterAnimationSystem(dt: number) {
  const animationDuration = 2.0 // 2 seconds for full cycle (up and back down)
  const time = Date.now() / 1000 // Time in seconds
  
  // Count entities for debugging
  let entityCount = 0
  for (const [entity, animated] of engine.getEntitiesWith(TeleporterAnimated)) {
    entityCount++
  }
  
  // Track material count every frame to see if we're creating materials
  let materialCountBefore = 0
  let materialCountAfter = 0
  
  // Count materials before animation
  for (const [entity] of engine.getEntitiesWith(Material)) {
    materialCountBefore++
  }
  
  // Animate the single animated plane on each teleporter
  for (const [entity, animated] of engine.getEntitiesWith(TeleporterAnimated)) {
    // Get transform mutable
    const transform = Transform.getMutable(entity)
    if (!transform) continue
    
    // Check if material exists before getting mutable
    const materialCheck = Material.getOrNull(entity)
    if (!materialCheck || !materialCheck.material || materialCheck.material.$case !== 'pbr') continue
    
    // Only get mutable material if we know it exists and is PBR
    const material = Material.getMutable(entity)
    
    // Calculate animation phase (0 to 1 repeating)
    const phase = (time / animationDuration) % 1
    
    // Z position animation: starts at base, goes up 1 meter, then back down
    // Since the plane is rotated 90° around X-axis, Z is the "up" direction visually
    const baseZ = animated.basePosition.z
    let zOffset: number
    let alpha: number
    let emissionIntensity: number
    
    if (phase <= 0.5) {
      // Rising phase (0 to 0.5): go up 1 meter
      const risingPhase = phase * 2 // 0 to 1
      zOffset = -risingPhase * 1.0 // 0 to -1 meter up (negative Z is up when rotated)
      alpha = 1.0 - risingPhase // 1.0 to 0.0 (fade out as it rises)
      emissionIntensity = 1.0 - risingPhase // 1.0 to 0.0 (emission fades as it rises)
    } else {
      // Falling phase (0.5 to 1): come back down instantly and fade in
      const fallingPhase = (phase - 0.5) * 2 // 0 to 1
      zOffset = 0 // Back at base position
      alpha = fallingPhase // 0.0 to 1.0 (fade in)
      emissionIntensity = fallingPhase // 0.0 to 1.0 (emission increases)
    }
    
    // Update transform position
    transform.position = Vector3.create(
      animated.basePosition.x,
      animated.basePosition.y,
      baseZ + zOffset
    )
    
    // Since modifying materials creates new instances, we'll use transform scale instead for the effect
    // Scale the animated plane to create a visual fade effect
    // At alpha 0, scale to almost 0; at alpha 1, scale to full size
    const scaleMultiplier = 0.1 + (alpha * 0.9) // Range from 0.1 to 1.0
    transform.scale = Vector3.create(scaleMultiplier, scaleMultiplier, 1)
  }
  
  // Count materials after animation
  for (const [entity] of engine.getEntitiesWith(Material)) {
    materialCountAfter++
  }
  
  // Log material count changes every 120 frames (every 2 seconds at 60fps)
  if (Math.floor(time * 60) % 120 === 0) {
    console.log(`Teleporter animation: Materials before: ${materialCountBefore}, after: ${materialCountAfter}, entities: ${entityCount}`)
    if (materialCountAfter > materialCountBefore) {
      console.log(`⚠️ Material count increased by ${materialCountAfter - materialCountBefore} during teleporter animation!`)
    }
    
    // Log detailed material analysis every 10 seconds
    if (Math.floor(time) % 10 === 0) {
      // Count total materials vs unique textures
      let totalMaterials = 0
      let materialsWithTexture = 0
      let materialsWithoutTexture = 0
      
      for (const [entity, material] of engine.getEntitiesWith(Material)) {
        totalMaterials++
        if (material.material && material.material.$case === 'pbr') {
          if (material.material.pbr.texture) {
            materialsWithTexture++
          } else {
            materialsWithoutTexture++
          }
        }
      }
      
      console.log('📊 Material Analysis:')
      console.log(`  Total materials: ${totalMaterials}`)
      console.log(`  Materials with texture: ${materialsWithTexture}`)
      console.log(`  Materials without texture: ${materialsWithoutTexture}`)
      console.log(`  Unique textures in teleporter cache: ${teleporterTextureCache.size}`)
    }
  }
}

// Keep the old system for backwards compatibility but it will do nothing
export function teleporterRippleSystem(dt: number) {
  // Legacy system - no longer used but kept for backwards compatibility
  // The new teleporterAnimationSystem handles all teleporter animations
}

// Store teleportation state
let isTeleporting = false
let teleportCooldown = 0

export function teleporterSystem(dt: number) {
  // Update cooldown
  if (teleportCooldown > 0) {
    teleportCooldown -= dt
    return
  }

  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  if (!playerTransform) return

  const playerPos = playerTransform.position

  for (const [entity, teleporter, transform] of engine.getEntitiesWith(Teleporter, Transform)) {
    const teleporterPos = transform.position
    
    // Check if player is close enough to the teleporter (within 1.5 units on X and Z, and close on Y)
    const xDiff = Math.abs(playerPos.x - teleporterPos.x)
    const yDiff = Math.abs(playerPos.y - teleporterPos.y)
    const zDiff = Math.abs(playerPos.z - teleporterPos.z)
    
    if (xDiff < 1.5 && zDiff < 1.5 && yDiff < 3 && !isTeleporting) {
      console.log('Initiating teleportation sequence!')
      isTeleporting = true
      teleportCooldown = 4.0 // 4 second cooldown to prevent rapid teleporting
      
      // Create virtual camera at start position (at teleporter, looking towards destination)
      const startCamera = engine.addEntity()
      console.log('Creating start camera entity:', startCamera)
      
      // Calculate direction from teleporter to destination
      const direction = Vector3.subtract(
        Vector3.create(teleporter.destination.x, teleporter.destination.y, teleporter.destination.z),
        Vector3.create(teleporterPos.x, teleporterPos.y, teleporterPos.z)
      )
      const lookAtRotation = Quaternion.lookRotation(Vector3.normalize(direction))
      
      Transform.create(startCamera, {
        position: Vector3.create(teleporterPos.x, teleporterPos.y + 3, teleporterPos.z), // At teleporter, 3m up
        rotation: lookAtRotation // Look towards destination
      })
      VirtualCamera.create(startCamera, {
        defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0.5) }
      })
      console.log('Start camera position (at teleporter):', teleporterPos.x, teleporterPos.y + 3, teleporterPos.z)
      console.log('Looking towards destination:', teleporter.destination.x, teleporter.destination.y, teleporter.destination.z)

      // Create virtual camera at destination position
      const endCamera = engine.addEntity()
      console.log('Creating end camera entity:', endCamera)
      Transform.create(endCamera, {
        position: Vector3.create(
          teleporter.destination.x,
          teleporter.destination.y + 5,
          teleporter.destination.z - 5
        ),
        rotation: Quaternion.fromEulerDegrees(45, 0, 0)
      })
      VirtualCamera.create(endCamera, {
        defaultTransition: { transitionMode: VirtualCamera.Transition.Time(3) }
      })
      console.log('End camera position:', teleporter.destination.x, teleporter.destination.y + 5, teleporter.destination.z - 5)

      // Switch to start camera (exactly like test camera)
      console.log('Switching to start camera')
      MainCamera.createOrReplace(engine.CameraEntity, {
        virtualCameraEntity: startCamera,
      })

      // Create timer system for the sequence
      let sequenceTimer = 0
      let phase = 0 // 0: at start, 1: transitioning, 2: at destination
      
      engine.addSystem(function teleportSequence(dt: number) {
        sequenceTimer += dt
        
        if (phase === 0 && sequenceTimer >= 1.0) {
          console.log('Phase 0 complete - switching to end camera')
          // Switch to end camera - exactly like test camera switch
          MainCamera.createOrReplace(engine.CameraEntity, {
            virtualCameraEntity: endCamera,
          })
          
          phase = 1
          sequenceTimer = 0
          console.log('Camera transition started (3s)')
        } else if (phase === 1 && sequenceTimer >= 3.0) {
          console.log('Phase 1 complete - camera arrived, teleporting player')
          // Camera has arrived, now teleport player
          movePlayerTo({
            newRelativePosition: Vector3.create(
              teleporter.destination.x,
              teleporter.destination.y,
              teleporter.destination.z
            )
          })
          
          phase = 2
          sequenceTimer = 0
        } else if (phase === 2 && sequenceTimer >= 1.0) {
          console.log('Phase 2 complete - resetting to player camera')
          // Reset to player camera (exactly like test camera reset)
          MainCamera.createOrReplace(engine.CameraEntity, {
            virtualCameraEntity: undefined
          })
          
          // Cleanup
          engine.removeEntity(startCamera)
          engine.removeEntity(endCamera)
          isTeleporting = false
          console.log('Teleportation complete')
          
          // Remove this system
          engine.removeSystem(teleportSequence)
        }
      })
    }
  }
}