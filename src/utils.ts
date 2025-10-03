import { engine, Transform, Entity, Material, TextShape, PointerEvents, PointerEventType, InputAction, Font, TextureWrapMode, MeshRenderer, MeshCollider, Billboard } from '@dcl/sdk/ecs'
import { Quaternion, Vector3, Color4 } from '@dcl/sdk/math'
import { PlaneText, PlacedPlane, TemplatePreview, TemplatePreviewParent } from './plane-positioner/plane-components'
import { initializePlaneCounter, createPreviewPlane } from './plane-positioner/plane-factory'

export interface StoredTransform {
  position: Vector3
  rotation: Quaternion
  scale: Vector3
}

export interface SavedTextData {
  text: string
  fontSize: number
  font: string
  textColor: { r: number, g: number, b: number, a: number }
  outlineColor: { r: number, g: number, b: number, a: number }
}

export interface SavedMaterialData {
  albedoColor: { r: number, g: number, b: number, a: number }
  emissiveColor: { r: number, g: number, b: number, a: number }
  emissiveIntensity: number
}

export interface SavedPlaneData {
  name: string
  id?: number // Optional for backwards compatibility
  position: { x: number, y: number, z: number }
  rotation: { x: number, y: number, z: number, w: number }
  scale: { x: number, y: number, z: number }
  currentImage: string
  localKnnClusterId?: number // Optional for new format
  localKnnCluster?: string // Optional for backwards compatibility  
  snapParentId?: number // Optional - ID of plane this was snapped to (0 if not snapped)
  url?: string // Optional - URL that opens when plane is clicked (if not in developer mode)
  material: SavedMaterialData
  texts: SavedTextData[]
}

export interface TemplateData {
  id: number
  name: string
  planes: SavedPlaneData[]
  createdAt: string
}

export interface SavedSceneData {
  version: string
  timestamp: string
  planes: SavedPlaneData[]
}

function mapStringToFont(fontString: string): Font {
  switch (fontString) {
    case 'sans-serif':
      return Font.F_SANS_SERIF
    case 'serif':
      return Font.F_SERIF
    case 'monospace':
      return Font.F_MONOSPACE
    default:
      return Font.F_SANS_SERIF // Default fallback
  }
}

export let lastLoggedTransform: StoredTransform | null = null

// State for UI updates
export const uiState = {
  hoveredPlaneName: '',
  hoveredPlaneEntity: null as Entity | null,
  showMaterialColorPicker: false,
  showEmissionColorPicker: false,
  showTextControls: false,
  snappingEnabled: false,
  hoveredSnapTarget: null as Entity | null,
  showCreateTemplate: false,
  templateName: '',
  templates: [] as TemplateData[],
  templateIdCounter: 1
}

export function setHoveredPlaneName(name: string) {
  uiState.hoveredPlaneName = name
}

export function getHoveredPlaneName(): string {
  return uiState.hoveredPlaneName
}

export function setHoveredPlaneEntity(entity: Entity | null) {
  uiState.hoveredPlaneEntity = entity
}

export function getHoveredPlaneEntity(): Entity | null {
  return uiState.hoveredPlaneEntity
}

export function toggleSnapping(): void {
  uiState.snappingEnabled = !uiState.snappingEnabled
}

export function getSnappingEnabled(): boolean {
  return uiState.snappingEnabled
}

export function setHoveredSnapTarget(entity: Entity | null) {
  uiState.hoveredSnapTarget = entity
}

export function getHoveredSnapTarget(): Entity | null {
  return uiState.hoveredSnapTarget
}

// Template management functions
export function toggleCreateTemplate(): void {
  uiState.showCreateTemplate = !uiState.showCreateTemplate
  if (!uiState.showCreateTemplate) {
    uiState.templateName = '' // Clear template name when closing
  }
}

export function getCreateTemplateState(): boolean {
  return uiState.showCreateTemplate
}

export function setTemplateName(name: string): void {
  uiState.templateName = name
}

export function getTemplateName(): string {
  return uiState.templateName
}

export function getTemplates(): TemplateData[] {
  return uiState.templates
}

// State for template creation mode
export const templateCreationState = {
  isCreating: false,
  selectedPlanes: new Set<Entity>(),
  parentPlaneEntity: null as Entity | null,
  templateName: ''
}

export function startTemplateCreation(): void {
  console.log('startTemplateCreation called')
  templateCreationState.isCreating = true
  templateCreationState.selectedPlanes.clear()
  templateCreationState.parentPlaneEntity = null
  
  // Create a green preview plane similar to Generate Plane
  const entity = createPreviewPlane()
  templateCreationState.parentPlaneEntity = entity
  
  console.log('Template creation mode started')
  console.log('Parent plane entity created:', entity)
  console.log('templateCreationState.isCreating:', templateCreationState.isCreating)
  console.log('templateCreationState.parentPlaneEntity:', templateCreationState.parentPlaneEntity)
}

export function addPlaneToTemplate(planeEntity: Entity): void {
  if (!templateCreationState.isCreating) return
  
  templateCreationState.selectedPlanes.add(planeEntity)
  console.log(`Added plane to template selection. Total: ${templateCreationState.selectedPlanes.size}`)
}

export function removePlaneFromTemplate(planeEntity: Entity): void {
  templateCreationState.selectedPlanes.delete(planeEntity)
  console.log(`Removed plane from template selection. Total: ${templateCreationState.selectedPlanes.size}`)
}

export function finishTemplateCreation(name: string): void {
  console.log('finishTemplateCreation called with name:', name)
  console.log('templateCreationState.isCreating:', templateCreationState.isCreating)
  console.log('templateCreationState.parentPlaneEntity:', templateCreationState.parentPlaneEntity)
  console.log('templateCreationState.selectedPlanes.size:', templateCreationState.selectedPlanes.size)
  
  if (!templateCreationState.isCreating) {
    console.error('Template creation is not active')
    return
  }
  
  if (!templateCreationState.parentPlaneEntity) {
    console.error('Parent plane entity is missing')
    return
  }

  if (templateCreationState.selectedPlanes.size === 0) {
    console.error('No planes selected for template')
    return
  }

  const parentTransform = Transform.getOrNull(templateCreationState.parentPlaneEntity)
  if (!parentTransform) {
    console.error('Parent plane transform not found')
    return
  }

  console.log(`Creating template "${name}" with ${templateCreationState.selectedPlanes.size} selected planes`)

  // Use the parent plane position as the template center
  const centroidPosition = Vector3.clone(parentTransform.position)
  console.log(`Template centroid: ${centroidPosition.x.toFixed(3)}, ${centroidPosition.y.toFixed(3)}, ${centroidPosition.z.toFixed(3)}`)

  // Create template data with selected planes positioned relative to centroid
  const templatePlanes: SavedPlaneData[] = []
  
  for (const entity of templateCreationState.selectedPlanes) {
    const transform = Transform.getOrNull(entity)
    const material = Material.getOrNull(entity)
    const planeComponent = PlacedPlane.getOrNull(entity)
    
    if (!transform || !material || !planeComponent) continue

    // Calculate position relative to centroid
    const relativePosition = Vector3.subtract(transform.position, centroidPosition)

    // Get material data
    let savedMaterial: SavedMaterialData = {
      albedoColor: { r: 1, g: 1, b: 1, a: 0.8 },
      emissiveColor: { r: 0.2, g: 0.2, b: 0.3, a: 1 },
      emissiveIntensity: 0.3
    }
    
    if (material.material?.$case === 'pbr') {
      const pbr = material.material.pbr
      if (pbr.albedoColor) {
        savedMaterial.albedoColor = {
          r: pbr.albedoColor.r,
          g: pbr.albedoColor.g,
          b: pbr.albedoColor.b,
          a: pbr.albedoColor.a
        }
      }
      if (pbr.emissiveColor) {
        savedMaterial.emissiveColor = {
          r: pbr.emissiveColor.r,
          g: pbr.emissiveColor.g,
          b: pbr.emissiveColor.b,
          a: 1
        }
      }
      if (pbr.emissiveIntensity !== undefined) {
        savedMaterial.emissiveIntensity = pbr.emissiveIntensity
      }
    }
    
    // Get text data
    const savedTexts: SavedTextData[] = []
    const textEntities = getTextEntitiesForPlane(entity)
    
    for (const textEntity of textEntities) {
      const textShape = TextShape.getOrNull(textEntity)
      const planeText = PlaneText.getOrNull(textEntity)
      
      if (textShape && planeText) {
        savedTexts.push({
          text: planeText.text,
          fontSize: planeText.fontSize,
          font: planeText.font,
          textColor: {
            r: textShape.textColor?.r || 1,
            g: textShape.textColor?.g || 1,
            b: textShape.textColor?.b || 1,
            a: textShape.textColor?.a || 1
          },
          outlineColor: {
            r: textShape.outlineColor?.r || 0,
            g: textShape.outlineColor?.g || 0,
            b: textShape.outlineColor?.b || 0,
            a: 1
          }
        })
      }
    }

    templatePlanes.push({
      name: planeComponent.name,
      id: planeComponent.id,
      position: {
        x: relativePosition.x,
        y: relativePosition.y,
        z: relativePosition.z
      },
      rotation: {
        x: transform.rotation.x,
        y: transform.rotation.y,
        z: transform.rotation.z,
        w: transform.rotation.w
      },
      scale: {
        x: transform.scale.x,
        y: transform.scale.y,
        z: transform.scale.z
      },
      currentImage: planeComponent.currentImage || '',
      localKnnClusterId: planeComponent.localKnnClusterId,
      snapParentId: planeComponent.snapParentId,
      url: planeComponent.url || '',
      material: savedMaterial,
      texts: savedTexts
    })
  }
  
  // Create template
  const template: TemplateData = {
    id: uiState.templateIdCounter++,
    name: name,
    planes: templatePlanes,
    createdAt: new Date().toISOString()
  }
  
  // Add template to the list
  uiState.templates.push(template)
  
  // Reset visual highlights for all selected planes
  for (const entity of templateCreationState.selectedPlanes) {
    const material = Material.getMutable(entity)
    if (material.material?.$case === 'pbr' && material.material.pbr.emissiveColor) {
      // Reset to normal emissive color
      material.material.pbr.emissiveColor = Color4.create(0.2, 0.2, 0.3, 1)
      material.material.pbr.emissiveIntensity = 0.3
    }
  }
  
  // Clean up template creation state
  if (templateCreationState.parentPlaneEntity) {
    engine.removeEntity(templateCreationState.parentPlaneEntity)
  }
  templateCreationState.isCreating = false
  templateCreationState.selectedPlanes.clear()
  templateCreationState.parentPlaneEntity = null
  
  console.log(`Template "${name}" created with ${templatePlanes.length} planes`)
}

export function cancelTemplateCreation(): void {
  // Reset visual highlights for all selected planes
  for (const entity of templateCreationState.selectedPlanes) {
    const material = Material.getMutable(entity)
    if (material.material?.$case === 'pbr' && material.material.pbr.emissiveColor) {
      // Reset to normal emissive color
      material.material.pbr.emissiveColor = Color4.create(0.2, 0.2, 0.3, 1)
      material.material.pbr.emissiveIntensity = 0.3
    }
  }
  
  if (templateCreationState.parentPlaneEntity) {
    engine.removeEntity(templateCreationState.parentPlaneEntity)
  }
  templateCreationState.isCreating = false
  templateCreationState.selectedPlanes.clear()
  templateCreationState.parentPlaneEntity = null
  
  console.log('Template creation cancelled')
}

export function isCreatingTemplate(): boolean {
  return templateCreationState.isCreating
}

export function getSelectedPlanesCount(): number {
  return templateCreationState.selectedPlanes.size
}

// Legacy function for backward compatibility - now redirects to new workflow
export function createTemplate(name: string, selectedPlaneEntity: Entity): void {
  console.log('createTemplate is deprecated - use new template creation workflow')
  // For now, just add the selected plane to the current template creation
  if (templateCreationState.isCreating) {
    addPlaneToTemplate(selectedPlaneEntity)
  }
}

export function createTemplatePreview(templateId: number): void {
  // First clear any existing template previews
  clearTemplatePreview()
  
  const template = uiState.templates.find(t => t.id === templateId)
  if (!template) {
    console.error(`Template with ID ${templateId} not found`)
    return
  }
  
  console.log(`Creating template preview for "${template.name}" with ${template.planes.length} planes`)
  
  // Calculate the center position of the template
  let centerPosition = Vector3.Zero()
  if (template.planes.length > 0) {
    let sumPosition = Vector3.Zero()
    for (const planeData of template.planes) {
      sumPosition = Vector3.add(sumPosition, Vector3.create(planeData.position.x, planeData.position.y, planeData.position.z))
    }
    centerPosition = Vector3.scale(sumPosition, 1 / template.planes.length)
  }
  
  // Create parent entity with billboard component
  const parentEntity = engine.addEntity()
  
  // Add TemplatePreviewParent component
  TemplatePreviewParent.create(parentEntity, {
    templateId: templateId
  })
  
  // Set transform for parent entity (position will be updated by system)
  Transform.create(parentEntity, {
    position: Vector3.create(0, 0, 2), // Initial position in front of camera
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  
  // Add billboard component so parent always faces the camera
  Billboard.create(parentEntity, {})
  
  // Create preview entities for each plane in the template as children
  for (const planeData of template.planes) {
    const entity = engine.addEntity()
    
    // Add TemplatePreview component
    TemplatePreview.create(entity, {
      templateId: templateId,
      originalPlaneId: planeData.id || 0
    })
    
    // Calculate local position relative to template center
    const localPosition = Vector3.subtract(
      Vector3.create(planeData.position.x, planeData.position.y, planeData.position.z),
      centerPosition
    )
    
    // Set transform as child of parent entity with local position
    Transform.create(entity, {
      position: localPosition,
      rotation: Quaternion.create(planeData.rotation.x, planeData.rotation.y, planeData.rotation.z, planeData.rotation.w),
      scale: Vector3.create(planeData.scale.x, planeData.scale.y, planeData.scale.z),
      parent: parentEntity
    })
    
    // Set plane mesh
    MeshRenderer.setPlane(entity)
    
    // Set material with semi-transparent green for template preview
    Material.setPbrMaterial(entity, { 
      albedoColor: Color4.create(0.2, 1, 0.2, 0.3),
      emissiveColor: Color4.create(0.1, 0.5, 0.1, 1),
      emissiveIntensity: 0.8
    })
    
    // Add hover text
    PointerEvents.create(entity, {
      pointerEvents: [
        { 
          eventType: PointerEventType.PET_HOVER_ENTER, 
          eventInfo: { 
            button: InputAction.IA_POINTER, 
            hoverText: `Template: ${template.name} - ${planeData.name}` 
          } 
        }
      ]
    })
  }
}

export function clearTemplatePreview(): void {
  // Remove all existing template preview entities
  for (const [entity] of engine.getEntitiesWith(TemplatePreview)) {
    engine.removeEntity(entity)
  }
  // Remove all template preview parent entities
  for (const [entity] of engine.getEntitiesWith(TemplatePreviewParent)) {
    engine.removeEntity(entity)
  }
}

export function placeTemplate(): void {
  // Get the template preview parent entity
  const parentEntities = [...engine.getEntitiesWith(TemplatePreviewParent, Transform)]
  if (parentEntities.length === 0) return
  
  const [parentEntity, parentComponent, parentTransform] = parentEntities[0]
  const templateId = parentComponent.templateId
  const template = uiState.templates.find(t => t.id === templateId)
  if (!template) return
  
  // Get camera transform to use its rotation (since parent uses Billboard)
  const cameraTransform = Transform.getOrNull(engine.CameraEntity)
  if (!cameraTransform) return
  
  console.log(`Placing template "${template.name}" with ${template.planes.length} planes`)
  
  // Calculate the center position of the template (same as used in createTemplatePreview)
  let centerPosition = Vector3.Zero()
  if (template.planes.length > 0) {
    let sumPosition = Vector3.Zero()
    for (const planeData of template.planes) {
      sumPosition = Vector3.add(sumPosition, Vector3.create(planeData.position.x, planeData.position.y, planeData.position.z))
    }
    centerPosition = Vector3.scale(sumPosition, 1 / template.planes.length)
  }
  
  // Create actual planes from template data
  for (const planeData of template.planes) {
    const entity = engine.addEntity()
    
    // Generate new unique name and ID for the placed plane
    const newName = `Template_Plane_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const newId = Date.now() + Math.floor(Math.random() * 1000)
    
    // Calculate the plane's local position relative to template center
    const localPosition = Vector3.subtract(
      Vector3.create(planeData.position.x, planeData.position.y, planeData.position.z),
      centerPosition
    )
    
    // Transform the local position by the camera's rotation to get world position
    const rotatedLocalPosition = Vector3.rotate(localPosition, cameraTransform.rotation)
    const worldPosition = Vector3.add(parentTransform.position, rotatedLocalPosition)
    
    // Use the camera's rotation combined with the plane's local rotation
    const localRotation = Quaternion.create(planeData.rotation.x, planeData.rotation.y, planeData.rotation.z, planeData.rotation.w)
    const worldRotation = Quaternion.multiply(cameraTransform.rotation, localRotation)
    
    // Add PlacedPlane component with new name and ID
    PlacedPlane.create(entity, { 
      name: newName, 
      id: newId,
      currentImage: planeData.currentImage,
      localKnnClusterId: 0, // Will be assigned by clustering
      snapParentId: 0, // Template planes are not snapped
      url: planeData.url || ''
    })
    
    // Set transform
    Transform.create(entity, {
      position: worldPosition,
      rotation: worldRotation,
      scale: Vector3.create(planeData.scale.x, planeData.scale.y, planeData.scale.z)
    })
    
    // Set plane mesh and collider
    MeshRenderer.setPlane(entity)
    MeshCollider.setPlane(entity)
    
    // Set material from template data, but reset emissive to normal values (remove green tint)
    Material.setPbrMaterial(entity, { 
      albedoColor: Color4.create(
        planeData.material.albedoColor.r,
        planeData.material.albedoColor.g,
        planeData.material.albedoColor.b,
        planeData.material.albedoColor.a
      ),
      emissiveColor: Color4.create(0.2, 0.2, 0.3, 1),  // Normal emissive color
      emissiveIntensity: 0.3  // Normal emissive intensity
    })
    
    // Set texture if there's an image
    if (planeData.currentImage) {
      const material = Material.getMutable(entity)
      const texturePath = `images/${planeData.currentImage}`
      
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
    
    // Add pointer events
    PointerEvents.create(entity, {
      pointerEvents: [
        { 
          eventType: PointerEventType.PET_DOWN, 
          eventInfo: { 
            button: InputAction.IA_POINTER, 
            hoverText: `Click to select ${newName}` 
          } 
        },
        {
          eventType: PointerEventType.PET_HOVER_ENTER,
          eventInfo: {
            button: InputAction.IA_POINTER,
            hoverText: `${newName} (Snap Target)`
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
    
    // Recreate text entities from template
    for (const textData of planeData.texts) {
      const textEntity = engine.addEntity()
      const planeTransform = Transform.get(entity)
      const planeScale = planeTransform.scale
      
      Transform.create(textEntity, {
        position: Vector3.create(0, 0, -0.01),
        rotation: Quaternion.Identity(),
        scale: Vector3.create(1 / planeScale.x, 1 / planeScale.y, 1),
        parent: entity
      })
      
      TextShape.create(textEntity, {
        text: textData.text,
        fontSize: textData.fontSize,
        font: mapStringToFont(textData.font),
        textColor: Color4.create(
          textData.textColor.r,
          textData.textColor.g,
          textData.textColor.b,
          textData.textColor.a
        ),
        outlineWidth: 0.1,
        outlineColor: Color4.create(
          textData.outlineColor.r,
          textData.outlineColor.g,
          textData.outlineColor.b,
          textData.outlineColor.a
        ),
        textWrapping: true,
        width: 4,
        height: 2
      })
      
      PlaneText.create(textEntity, {
        parentPlane: entity,
        text: textData.text,
        fontSize: textData.fontSize,
        font: textData.font
      })
    }
  }
  
  // Clear template preview after placement
  clearTemplatePreview()
  
  console.log(`Template "${template.name}" placed successfully`)
}

// KNN Clustering utilities
interface PlaneClusterData {
  entity: Entity | null
  name: string
  id: number
  position: Vector3
  hasImage: boolean
}

export function calculateDistance(pos1: Vector3, pos2: Vector3): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y  
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function findCentroid(positions: Vector3[]): Vector3 {
  if (positions.length === 0) return Vector3.Zero()
  
  let sumX = 0, sumY = 0, sumZ = 0
  for (const pos of positions) {
    sumX += pos.x
    sumY += pos.y
    sumZ += pos.z
  }
  
  return Vector3.create(
    sumX / positions.length,
    sumY / positions.length, 
    sumZ / positions.length
  )
}

function findClosestPlaneToPoint(planes: PlaneClusterData[], targetPoint: Vector3): number {
  if (planes.length === 0) return 0
  
  let closestPlane = planes[0]
  let minDistance = calculateDistance(planes[0].position, targetPoint)
  
  for (let i = 1; i < planes.length; i++) {
    const distance = calculateDistance(planes[i].position, targetPoint)
    if (distance < minDistance) {
      minDistance = distance
      closestPlane = planes[i]
    }
  }
  
  return closestPlane.id
}

export function calculateKNNClusters(clusterRadius: number = 5.0): void {
  console.log('Calculating KNN clusters with radius:', clusterRadius)
  
  // Collect all plane data
  const allPlanes: PlaneClusterData[] = []
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    const transform = Transform.getOrNull(entity)
    if (!transform) continue
    
    allPlanes.push({
      entity,
      name: planeComponent.name,
      id: planeComponent.id,
      position: Vector3.clone(transform.position),
      hasImage: !!planeComponent.currentImage
    })
  }
  
  console.log(`Found ${allPlanes.length} planes to cluster`)
  
  // Group planes into clusters based on proximity
  const clusters: PlaneClusterData[][] = []
  const processed = new Set<number>()
  
  for (const plane of allPlanes) {
    if (processed.has(plane.id)) continue
    
    // Start a new cluster
    const cluster: PlaneClusterData[] = [plane]
    processed.add(plane.id)
    
    // Find all nearby planes
    for (const otherPlane of allPlanes) {
      if (processed.has(otherPlane.id)) continue
      
      const distance = calculateDistance(plane.position, otherPlane.position)
      if (distance <= clusterRadius) {
        cluster.push(otherPlane)
        processed.add(otherPlane.id)
      }
    }
    
    clusters.push(cluster)
  }
  
  console.log(`Created ${clusters.length} clusters`)
  
  // For each cluster, find the centroid and assign the closest plane as cluster center
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]
    const positions = cluster.map(p => p.position)
    const centroid = findCentroid(positions)
    const centerPlaneId = findClosestPlaneToPoint(cluster, centroid)
    
    console.log(`Cluster ${i + 1}: ${cluster.length} planes, center ID: ${centerPlaneId}`)
    
    // Update all planes in this cluster
    for (const plane of cluster) {
      if (plane.entity !== null) {
        const planeComponent = PlacedPlane.getMutable(plane.entity)
        planeComponent.localKnnClusterId = centerPlaneId
      }
    }
  }
}

// New function to calculate KNN clusters for all plane data (both current and saved)
function calculateKNNClustersForAllPlanes(allPlaneData: SavedPlaneData[], clusterRadius: number = 5.0): Map<number, number> {
  console.log('Calculating KNN clusters for all planes (current + saved) with radius:', clusterRadius)
  
  // Convert SavedPlaneData to cluster format
  const allPlanes = allPlaneData.map(plane => {
    // For legacy data, generate ID from name if not present
    let planeId = plane.id
    if (!planeId) {
      const match = plane.name.match(/^Plane_(\d+)$/)
      planeId = match ? parseInt(match[1]) : 0
    }
    
    return {
      entity: null, // No entity for saved planes
      name: plane.name,
      id: planeId,
      position: Vector3.create(plane.position.x, plane.position.y, plane.position.z),
      hasImage: !!plane.currentImage
    }
  })
  
  console.log(`Found ${allPlanes.length} total planes to cluster`)
  
  // Group planes into clusters based on proximity
  const clusters: typeof allPlanes[] = []
  const processed = new Set<number>()
  
  for (const plane of allPlanes) {
    if (processed.has(plane.id)) continue
    
    // Start a new cluster
    const cluster: typeof allPlanes = [plane]
    processed.add(plane.id)
    
    // Find all nearby planes
    for (const otherPlane of allPlanes) {
      if (processed.has(otherPlane.id)) continue
      
      const distance = calculateDistance(plane.position, otherPlane.position)
      if (distance <= clusterRadius) {
        cluster.push(otherPlane)
        processed.add(otherPlane.id)
      }
    }
    
    clusters.push(cluster)
  }
  
  console.log(`Created ${clusters.length} clusters from all planes`)
  
  // Create cluster assignment map
  const clusterAssignments = new Map<number, number>()
  
  // For each cluster, find the centroid and assign the closest plane as cluster center
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]
    const positions = cluster.map(p => p.position)
    const centroid = findCentroid(positions)
    const centerPlaneId = findClosestPlaneToPoint(cluster, centroid)
    
    console.log(`Cluster ${i + 1}: ${cluster.length} planes, center ID: ${centerPlaneId}`)
    
    // Assign cluster center to all planes in this cluster
    for (const plane of cluster) {
      clusterAssignments.set(plane.id, centerPlaneId)
    }
  }
  
  return clusterAssignments
}

// Function to find the nearest cluster for a newly placed plane
export function findNearestClusterForNewPlane(newPlanePosition: Vector3, clusterRadius: number = 5.0): number {
  let nearestClusterCenterId = 0
  let minDistanceToCluster = Infinity
  
  // Check all existing placed planes in the scene
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    const transform = Transform.getOrNull(entity)
    if (!transform) continue
    
    // Only consider planes that are cluster centers
    if (planeComponent.id === planeComponent.localKnnClusterId) {
      const distance = calculateDistance(newPlanePosition, transform.position)
      
      // If within cluster radius and closer than previous candidates
      if (distance <= clusterRadius && distance < minDistanceToCluster) {
        minDistanceToCluster = distance
        nearestClusterCenterId = planeComponent.id
      }
    }
  }
  
  return nearestClusterCenterId
}

export function getRandomHexColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function logPlayerTransformValues(): void {
  const playerTransform = Transform.getOrNull(engine.PlayerEntity)
  const cameraTransform = Transform.getOrNull(engine.CameraEntity)
  
  if (!playerTransform) {
    console.log('Player transform not available yet')
    return
  }
  
  if (!cameraTransform) {
    console.log('Camera transform not available yet')
    return
  }

  // Get camera position and rotation
  const cameraPosition = cameraTransform.position
  const cameraRotation = cameraTransform.rotation
  
  // Calculate forward vector (1 meter in front of camera)
  // In Decentraland, camera forward is -Z direction
  const forward = Vector3.rotate(Vector3.create(0, 0, 2), cameraRotation)
  const positionInFront = Vector3.add(cameraPosition, forward)
  
  // Get euler angles for logging
  const euler = Quaternion.toEulerAngles(cameraRotation)
  const { x: sx, y: sy, z: sz } = playerTransform.scale

  // Store the transform for later use
  lastLoggedTransform = {
    position: positionInFront,
    rotation: Quaternion.create(cameraRotation.x, cameraRotation.y, cameraRotation.z, cameraRotation.w),
    scale: Vector3.create(sx, sy, sz)
  }

  console.log(`position: Vector3.create(${positionInFront.x.toFixed(3)}, ${positionInFront.y.toFixed(3)}, ${positionInFront.z.toFixed(3)}),`)
  console.log(`scale: Vector3.create(${sx.toFixed(3)}, ${sy.toFixed(3)}, ${sz.toFixed(3)}),`)
  console.log(`rotation: Quaternion.fromEulerDegrees(${euler.x.toFixed(3)}, ${euler.y.toFixed(3)}, ${euler.z.toFixed(3)}),`)
}

export function adjustPlaneScale(entity: Entity, widthDelta: number, heightDelta: number) {
  if (!Transform.has(entity)) return
  
  // Get text entities before scaling
  const textEntities = getTextEntitiesForPlane(entity)
  const textData: Array<{entity: Entity, localPos: Vector3, localRot: Quaternion}> = []
  
  // Store text positions and temporarily remove parent relationships
  textEntities.forEach(textEntity => {
    const textTransform = Transform.getMutable(textEntity)
    if (textTransform.parent === entity) {
      // Store local position and rotation
      textData.push({
        entity: textEntity,
        localPos: Vector3.clone(textTransform.position),
        localRot: Quaternion.create(textTransform.rotation.x, textTransform.rotation.y, textTransform.rotation.z, textTransform.rotation.w)
      })
      // Temporarily remove parent
      textTransform.parent = undefined
    }
  })
  
  // Adjust plane scale
  const transform = Transform.getMutable(entity)
  const currentScale = transform.scale
  
  // Width affects X scale, Height affects Y scale
  const newScaleX = Math.max(0.01, currentScale.x + widthDelta)
  const newScaleY = Math.max(0.01, currentScale.y + heightDelta)
  
  transform.scale = Vector3.create(newScaleX, newScaleY, currentScale.z)
  
  // Reattach text entities with inverse scale to compensate
  textData.forEach(({entity: textEntity, localPos, localRot}) => {
    const textTransform = Transform.getMutable(textEntity)
    textTransform.parent = entity
    textTransform.position = localPos
    textTransform.rotation = localRot
    
    // Apply inverse scale to maintain text's visual size
    // If plane is scaled 2x wide, text needs to be 0.5x to appear normal
    textTransform.scale = Vector3.create(
      1 / newScaleX,
      1 / newScaleY,
      1
    )
  })
  
  console.log(`Scale adjusted to: ${newScaleX.toFixed(2)} x ${newScaleY.toFixed(2)}`)
}

export function adjustPlaneEmission(entity: Entity, emissionDelta: number) {
  if (!Material.has(entity)) return
  
  const material = Material.getMutable(entity)
  const currentIntensity = material.material?.$case === 'pbr' ? material.material.pbr.emissiveIntensity || 0 : 0
  const newIntensity = Math.max(0, Math.min(20, currentIntensity + emissionDelta))
  
  if (material.material?.$case === 'pbr') {
    material.material.pbr.emissiveIntensity = newIntensity
    console.log(`Emission adjusted to: ${newIntensity.toFixed(2)}`)
  }
}

export function adjustPlaneOpacity(entity: Entity, opacityDelta: number) {
  if (!Material.has(entity)) return
  
  const material = Material.getMutable(entity)
  if (material.material?.$case === 'pbr' && material.material.pbr.albedoColor) {
    const currentAlpha = material.material.pbr.albedoColor.a || 1
    const newAlpha = Math.max(0.1, Math.min(1, currentAlpha + opacityDelta))
    
    material.material.pbr.albedoColor = Color4.create(
      material.material.pbr.albedoColor.r,
      material.material.pbr.albedoColor.g,
      material.material.pbr.albedoColor.b,
      newAlpha
    )
    console.log(`Opacity adjusted to: ${newAlpha.toFixed(2)}`)
  }
}

export function getPlaneEmission(entity: Entity): number {
  if (!Material.has(entity)) return 0
  
  const material = Material.getOrNull(entity)
  if (!material) return 0
  
  const currentIntensity = material.material?.$case === 'pbr' ? material.material.pbr.emissiveIntensity || 0 : 0
  return currentIntensity
}

export function getPlaneOpacity(entity: Entity): number {
  if (!Material.has(entity)) return 1
  
  const material = Material.getOrNull(entity)
  if (!material) return 1
  
  if (material.material?.$case === 'pbr' && material.material.pbr.albedoColor) {
    const currentAlpha = material.material.pbr.albedoColor.a || 1
    return currentAlpha
  }
  
  return 1
}

export function hexToColor4(hex: string, alpha: number = 1): Color4 {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Handle 3-digit hex codes
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  
  if (hex.length !== 6) {
    // Default to white if invalid
    return Color4.create(1, 1, 1, alpha)
  }
  
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  return Color4.create(r, g, b, alpha)
}

export function setPlaneAlbedoColor(entity: Entity, hexColor: string) {
  if (!Material.has(entity)) return
  
  const material = Material.getMutable(entity)
  if (material.material?.$case === 'pbr') {
    const currentAlpha = material.material.pbr.albedoColor?.a || 1
    material.material.pbr.albedoColor = hexToColor4(hexColor, currentAlpha)
    console.log(`Material color set to: ${hexColor}`)
  }
}

export function setPlaneEmissionColor(entity: Entity, hexColor: string) {
  if (!Material.has(entity)) return
  
  const material = Material.getMutable(entity)
  if (material.material?.$case === 'pbr') {
    material.material.pbr.emissiveColor = hexToColor4(hexColor, 1)
    console.log(`Emission color set to: ${hexColor}`)
  }
}

// Add these functions to your utils.ts file

export function setTextColor(textEntity: Entity, hexColor: string) {
  if (!TextShape.has(textEntity)) return
  
  const textShape = TextShape.getMutable(textEntity)
  textShape.textColor = hexToColor4(hexColor, 1)
  
  console.log(`Text color set to: ${hexColor}`)
}

export function getTextColor(textEntity: Entity): string {
  if (!TextShape.has(textEntity)) return 'FFFFFF'
  
  const textShape = TextShape.getOrNull(textEntity)
  if (!textShape || !textShape.textColor) return 'FFFFFF'
  
  const color = textShape.textColor
  // Convert Color4 back to hex
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0')
  
  return `${r}${g}${b}`.toUpperCase()
}

export function setTextOutlineColor(textEntity: Entity, hexColor: string) {
  if (!TextShape.has(textEntity)) return
  
  const textShape = TextShape.getMutable(textEntity)
  textShape.outlineColor = hexToColor4(hexColor, 1)
  
  console.log(`Text outline color set to: ${hexColor}`)
}


export function toggleMaterialColorPicker() {
  uiState.showMaterialColorPicker = !uiState.showMaterialColorPicker
  uiState.showEmissionColorPicker = false // Close other picker
}

export function toggleEmissionColorPicker() {
  uiState.showEmissionColorPicker = !uiState.showEmissionColorPicker
  uiState.showMaterialColorPicker = false // Close other picker
}

export function getMaterialColorPickerState(): boolean {
  return uiState.showMaterialColorPicker
}

export function getEmissionColorPickerState(): boolean {
  return uiState.showEmissionColorPicker
}

// Common color palette
export const commonColors = [
  { name: 'White', hex: 'FFFFFF' },
  { name: 'Black', hex: '000000' },
  { name: 'Red', hex: 'FF0000' },
  { name: 'Green', hex: '00FF00' },
  { name: 'Blue', hex: '0000FF' },
  { name: 'Yellow', hex: 'FFFF00' },
  { name: 'Cyan', hex: '00FFFF' },
  { name: 'Magenta', hex: 'FF00FF' },
  { name: 'Orange', hex: 'FF8000' },
  { name: 'Purple', hex: '8000FF' },
  { name: 'Pink', hex: 'FF80C0' },
  { name: 'Lime', hex: '80FF00' }
]

// Available fonts
export const availableFonts = [
  'sans-serif',
  'serif', 
  'monospace'
]

export function toggleTextControls() {
  uiState.showTextControls = !uiState.showTextControls
  uiState.showMaterialColorPicker = false
  uiState.showEmissionColorPicker = false
}

export function getTextControlsState(): boolean {
  return uiState.showTextControls
}

export function addTextToPlane(planeEntity: Entity, text: string, fontSize: number = 1, font: string = 'sans-serif'): Entity | null {
  if (!Transform.has(planeEntity)) return null
  
  const textEntity = engine.addEntity()
  
  // Get plane's current scale to apply inverse scale to text
  const planeTransform = Transform.get(planeEntity)
  const planeScale = planeTransform.scale
  
  // Use parent-child relationship with local offset position
  Transform.create(textEntity, {
    position: Vector3.create(0, 0, -0.01), // Local position relative to parent (in front)
    rotation: Quaternion.Identity(),
    scale: Vector3.create(1 / planeScale.x, 1 / planeScale.y, 1), // Inverse scale to maintain text size
    parent: planeEntity
  })
  
  TextShape.create(textEntity, {
    text: text,
    fontSize: fontSize,
    font: mapStringToFont(font),
    textColor: Color4.White(),
    outlineWidth: 0.1,
    outlineColor: Color4.Black(),
    textWrapping: true,
    width: 4,
    height: 2
  })
  
  // Add PlaneText component to track this text
  PlaneText.create(textEntity, {
    parentPlane: planeEntity,
    text: text,
    fontSize: fontSize,
    font: font
  })
  
  console.log(`Text "${text}" added to plane`)
  return textEntity
}

export function updatePlaneText(textEntity: Entity, newText: string) {
  if (!TextShape.has(textEntity)) return
  
  const textShape = TextShape.getMutable(textEntity)
  const planeTextComponent = PlaneText.getMutable(textEntity)
  
  textShape.text = newText
  planeTextComponent.text = newText
  
  console.log(`Text updated to: "${newText}"`)
}

export function updateTextFontSize(textEntity: Entity, fontSizeDelta: number) {
  if (!TextShape.has(textEntity)) return
  
  const textShape = TextShape.getMutable(textEntity)
  const planeTextComponent = PlaneText.getMutable(textEntity)
  const currentSize = textShape.fontSize || 1
  const newSize = Math.max(0.1, Math.min(10, currentSize + fontSizeDelta))
  
  textShape.fontSize = newSize
  planeTextComponent.fontSize = newSize
  
  console.log(`Font size adjusted to: ${newSize.toFixed(1)}`)
}

// Add this function to your utils.ts file

export function getTextFontSize(textEntity: Entity): number {
  if (!TextShape.has(textEntity)) return 1
  
  const textShape = TextShape.getOrNull(textEntity)
  return textShape?.fontSize || 1
}

// export function updateTextFont(textEntity: Entity, newFont: string) {
//   if (!TextShape.has(textEntity)) return
  
//   const planeTextComponent = PlaneText.getMutable(textEntity)
//   planeTextComponent.font = newFont
  
//   console.log(`Font changed to: ${newFont}`)
// }
export function updateTextFont(textEntity: Entity, newFont: string) {
  if (!TextShape.has(textEntity)) return
  
  const textShape = TextShape.getMutable(textEntity)
  const planeTextComponent = PlaneText.getMutable(textEntity)
  
  // Convert string to Font enum and update the actual rendered text font
  textShape.font = mapStringToFont(newFont)
  
  // Update our tracking component (still stores string for UI purposes)
  planeTextComponent.font = newFont
  
  console.log(`Font changed to: ${newFont}`)
}

export function getTextEntitiesForPlane(planeEntity: Entity): Entity[] {
  const textEntities: Entity[] = []
  
  for (const [entity, planeText] of engine.getEntitiesWith(PlaneText)) {
    if (planeText.parentPlane === planeEntity) {
      textEntities.push(entity)
    }
  }
  
  return textEntities
}

export function removeTextFromPlaneParent(textEntity: Entity) {
  if (!Transform.has(textEntity)) return
  
  const textTransform = Transform.getMutable(textEntity)
  
  // Calculate world position before removing parent
  if (textTransform.parent) {
    const parentEntity = textTransform.parent
    const parentTransform = Transform.getOrNull(parentEntity)
    
    if (parentTransform) {
      // Get the local text position and rotation
      const localPosition = textTransform.position
      const localRotation = textTransform.rotation
      
      // Calculate world position: parent position + rotated local offset
      const rotatedOffset = Vector3.rotate(localPosition, parentTransform.rotation)
      const worldPosition = Vector3.add(parentTransform.position, rotatedOffset)
      
      // Calculate world rotation: parent rotation * local rotation
      const worldRotation = Quaternion.multiply(parentTransform.rotation, localRotation)
      
      // Remove parent relationship
      textTransform.parent = undefined
      
      // Set the calculated world position/rotation
      textTransform.position = worldPosition
      textTransform.rotation = worldRotation
    }
  }
  
  console.log('Text removed from plane parent and positioned at world coordinates')
}

export function renamePlane(entity: Entity, newName: string) {
  if (!PlacedPlane.has(entity)) return
  
  const planeComponent = PlacedPlane.getMutable(entity)
  planeComponent.name = newName
  
  // Update UI state to reflect new name
  setHoveredPlaneName(newName)
  
  // Update the hover text in PointerEvents
  if (PointerEvents.has(entity)) {
    PointerEvents.deleteFrom(entity)
    PointerEvents.create(entity, {
      pointerEvents: [
        { 
          eventType: PointerEventType.PET_DOWN, 
          eventInfo: { 
            button: InputAction.IA_POINTER, 
            hoverText: `Click to select ${newName}` 
          } 
        }
      ]
    })
  }
  
  console.log(`Plane renamed to: ${newName}`)
}

export function setPlaneTexture(entity: Entity, imageName: string) {
  if (!Material.has(entity)) return
  
  const texturePath = `images/${imageName}`
  const material = Material.getMutable(entity)
  
  if (material.material?.$case === 'pbr') {
    // Set both texture and emissiveTexture to the same image
    material.material.pbr.texture = Material.Texture.Common({
      src: texturePath,
      wrapMode: TextureWrapMode.TWM_CLAMP,
    })
    
    material.material.pbr.emissiveTexture = Material.Texture.Common({
      src: texturePath,
      wrapMode: TextureWrapMode.TWM_CLAMP,
    })
    
    // Update the PlacedPlane component to store the current image name
    if (PlacedPlane.has(entity)) {
      const planeComponent = PlacedPlane.getMutable(entity)
      planeComponent.currentImage = imageName
    }
    
    console.log(`Plane texture set to: ${texturePath}`)
  }
}

export async function saveSceneState(): Promise<void> {
  // First, get existing saved data from the data files
  let existingSavedPlanes: SavedPlaneData[] = []
  let existingSavedTemplates: TemplateData[] = []
  
  // Load existing planes
  try {
    const module = await import('../data/label-data')
    if (module.savedSceneData && module.savedSceneData.planes) {
      existingSavedPlanes = module.savedSceneData.planes
    }
  } catch (error) {
    console.log('No existing plane data found, starting fresh')
  }
  
  // Load existing templates
  try {
    const templateModule = await import('../data/template-data')
    if (templateModule.savedTemplateData) {
      existingSavedTemplates = templateModule.savedTemplateData
    }
  } catch (error) {
    console.log('No existing template data found, starting fresh')
  }
  
  // Create a map of existing planes by name for easy lookup
  const existingPlanesMap = new Map<string, SavedPlaneData>()
  for (const plane of existingSavedPlanes) {
    existingPlanesMap.set(plane.name, plane)
  }
  
  const savedPlanes: SavedPlaneData[] = []
  
  // Iterate through all placed planes currently in the scene
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    const transform = Transform.getOrNull(entity)
    const material = Material.getOrNull(entity)
    
    if (!transform || !material) continue
    
    // Get material data
    let savedMaterial: SavedMaterialData = {
      albedoColor: { r: 1, g: 1, b: 1, a: 0.8 },
      emissiveColor: { r: 0.2, g: 0.2, b: 0.3, a: 1 },
      emissiveIntensity: 0.3
    }
    
    if (material.material?.$case === 'pbr') {
      const pbr = material.material.pbr
      if (pbr.albedoColor) {
        savedMaterial.albedoColor = {
          r: pbr.albedoColor.r,
          g: pbr.albedoColor.g,
          b: pbr.albedoColor.b,
          a: pbr.albedoColor.a
        }
      }
      if (pbr.emissiveColor) {
        savedMaterial.emissiveColor = {
          r: pbr.emissiveColor.r,
          g: pbr.emissiveColor.g,
          b: pbr.emissiveColor.b,
          a: 1
        }
      }
      if (pbr.emissiveIntensity !== undefined) {
        savedMaterial.emissiveIntensity = pbr.emissiveIntensity
      }
    }
    
    // Get text data
    const savedTexts: SavedTextData[] = []
    const textEntities = getTextEntitiesForPlane(entity)
    
    for (const textEntity of textEntities) {
      const textShape = TextShape.getOrNull(textEntity)
      const planeText = PlaneText.getOrNull(textEntity)
      
      if (textShape && planeText) {
        savedTexts.push({
          text: planeText.text,
          fontSize: planeText.fontSize,
          font: planeText.font,
          textColor: {
            r: textShape.textColor?.r || 1,
            g: textShape.textColor?.g || 1,
            b: textShape.textColor?.b || 1,
            a: textShape.textColor?.a || 1
          },
          outlineColor: {
            r: textShape.outlineColor?.r || 0,
            g: textShape.outlineColor?.g || 0,
            b: textShape.outlineColor?.b || 0,
            a: 1
          }
        })
      }
    }
    
    // Create saved plane data
    const savedPlane: SavedPlaneData = {
      name: planeComponent.name,
      id: planeComponent.id,
      position: {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z
      },
      rotation: {
        x: transform.rotation.x,
        y: transform.rotation.y,
        z: transform.rotation.z,
        w: transform.rotation.w
      },
      scale: {
        x: transform.scale.x,
        y: transform.scale.y,
        z: transform.scale.z
      },
      currentImage: planeComponent.currentImage || '',
      localKnnClusterId: planeComponent.localKnnClusterId,
      snapParentId: planeComponent.snapParentId,
      url: planeComponent.url || '',
      material: savedMaterial,
      texts: savedTexts
    }
    
    // Add current session plane, replacing any existing plane with the same name
    existingPlanesMap.set(planeComponent.name, savedPlane)
  }
  
  // Merge all planes: existing planes that weren't updated + all current session planes
  const allPlanes = Array.from(existingPlanesMap.values())
  
  console.log(`Merging ${existingSavedPlanes.length} existing saved planes with ${savedPlanes.length} current session planes`)
  console.log(`Total planes after merge: ${allPlanes.length}`)
  
  // Calculate KNN clusters for ALL planes (both existing and current)
  const clusterAssignments = calculateKNNClustersForAllPlanes(allPlanes, 5.0)
  
  // Apply cluster assignments to all planes
  for (const plane of allPlanes) {
    const planeId = plane.id || 0
    if (planeId > 0) {
      const clusterAssignment = clusterAssignments.get(planeId)
      if (clusterAssignment) {
        plane.localKnnClusterId = clusterAssignment
      }
    }
  }
  
  console.log(`Applied cluster assignments to ${allPlanes.length} planes`)
  
  // Merge current templates with existing ones
  const currentTemplates = getTemplates()
  const allTemplatesMap = new Map<string, TemplateData>()
  
  // Add existing templates first
  for (const template of existingSavedTemplates) {
    allTemplatesMap.set(template.name, template)
  }
  
  // Add/update current templates
  for (const template of currentTemplates) {
    allTemplatesMap.set(template.name, template)
  }
  
  const allTemplates = Array.from(allTemplatesMap.values())
  
  console.log(`Merging ${existingSavedTemplates.length} existing templates with ${currentTemplates.length} current templates`)
  console.log(`Total templates after merge: ${allTemplates.length}`)
  
  // Create final save data
  const saveData: SavedSceneData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    planes: allPlanes
  }
  
  // Output to console for copying
  console.log('=== SAVE DATA (Copy this to data/label-data.ts) ===')
  console.log('// Replace the savedSceneData export with:')
  console.log('')
  console.log('export const savedSceneData: SavedSceneData =', JSON.stringify(saveData, null, 2))
  console.log('')
  console.log('=== END SAVE DATA ===')
  
  // Output templates separately
  console.log('')
  console.log('=== TEMPLATE DATA (Copy this to data/template-data.ts) ===')
  console.log('// Replace the savedTemplateData export with:')
  console.log('')
  console.log('export const savedTemplateData: TemplateData[] =', JSON.stringify(allTemplates, null, 2))
  console.log('')
  console.log('=== END TEMPLATE DATA ===')
}

export async function loadSceneState(): Promise<void> {
  try {
    // Import the saved data from the TypeScript file
    const module = await import('../data/label-data')
    const { savedSceneData } = module
    
    if (!savedSceneData || !savedSceneData.planes || savedSceneData.planes.length === 0) {
      console.log('No saved scene data found in data/label-data.ts')
      // Initialize plane counter even when there's no saved data
      initializePlaneCounter()
      return
    }
    
    console.log('Loading scene data:', savedSceneData)
    
    // Clear existing planes (optional - you might want to keep this for safety)
    // for (const [entity] of engine.getEntitiesWith(PlacedPlane)) {
    //   engine.removeEntity(entity)
    // }
    
    // Recreate each plane
    for (const planeData of savedSceneData.planes) {
      const entity = engine.addEntity()
      
      // For legacy data, generate ID from name if not present
      let planeId = planeData.id
      if (!planeId) {
        const match = planeData.name.match(/^Plane_(\d+)$/)
        planeId = match ? parseInt(match[1]) : 0
      }
      
      // For legacy data, convert cluster name to ID if needed
      let clusterId = planeData.localKnnClusterId || 0
      if (!clusterId && planeData.localKnnCluster) {
        const match = planeData.localKnnCluster.match(/^Plane_(\d+)$/)
        clusterId = match ? parseInt(match[1]) : 0
      }
      
      // Create PlacedPlane component
      PlacedPlane.create(entity, {
        name: planeData.name,
        id: planeId,
        currentImage: planeData.currentImage,
        localKnnClusterId: clusterId,
        snapParentId: planeData.snapParentId || 0,
        url: planeData.url || ''
      })
      
      // Set transform
      Transform.create(entity, {
        position: Vector3.create(planeData.position.x, planeData.position.y, planeData.position.z),
        rotation: Quaternion.create(planeData.rotation.x, planeData.rotation.y, planeData.rotation.z, planeData.rotation.w),
        scale: Vector3.create(planeData.scale.x, planeData.scale.y, planeData.scale.z)
      })
      
      // Set mesh and collider
      MeshRenderer.setPlane(entity)
      MeshCollider.setPlane(entity)
      
      // Set material
      Material.setPbrMaterial(entity, {
        albedoColor: Color4.create(
          planeData.material.albedoColor.r,
          planeData.material.albedoColor.g,
          planeData.material.albedoColor.b,
          planeData.material.albedoColor.a
        ),
        emissiveColor: Color4.create(
          planeData.material.emissiveColor.r,
          planeData.material.emissiveColor.g,
          planeData.material.emissiveColor.b,
          planeData.material.emissiveColor.a
        ),
        emissiveIntensity: planeData.material.emissiveIntensity
      })
      
      // Set texture if there's an image
      if (planeData.currentImage) {
        const material = Material.getMutable(entity)
        const texturePath = `images/${planeData.currentImage}`
        
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
      
      // Add pointer events
      PointerEvents.create(entity, {
        pointerEvents: [
          { 
            eventType: PointerEventType.PET_DOWN, 
            eventInfo: { 
              button: InputAction.IA_POINTER, 
              hoverText: `Click to select ${planeData.name}` 
            } 
          },
          {
            eventType: PointerEventType.PET_HOVER_ENTER,
            eventInfo: {
              button: InputAction.IA_POINTER,
              hoverText: `${planeData.name} (Snap Target)`
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
      
      // Recreate text entities
      for (const textData of planeData.texts) {
        const textEntity = engine.addEntity()
        const planeTransform = Transform.get(entity)
        const planeScale = planeTransform.scale
        
        Transform.create(textEntity, {
          position: Vector3.create(0, 0, -0.01),
          rotation: Quaternion.Identity(),
          scale: Vector3.create(1 / planeScale.x, 1 / planeScale.y, 1),
          parent: entity
        })
        
        TextShape.create(textEntity, {
          text: textData.text,
          fontSize: textData.fontSize,
          font: mapStringToFont(textData.font),
          textColor: Color4.create(
            textData.textColor.r,
            textData.textColor.g,
            textData.textColor.b,
            textData.textColor.a
          ),
          outlineWidth: 0.1,
          outlineColor: Color4.create(
            textData.outlineColor.r,
            textData.outlineColor.g,
            textData.outlineColor.b,
            textData.outlineColor.a
          ),
          textWrapping: true,
          width: 4,
          height: 2
        })
        
        PlaneText.create(textEntity, {
          parentPlane: entity,
          text: textData.text,
          fontSize: textData.fontSize,
          font: textData.font
        })
      }
    }
    
    console.log(`Loaded ${savedSceneData.planes.length} planes from saved data`)
    
    // Load templates from separate file
    try {
      const templateModule = await import('../data/template-data')
      const { savedTemplateData } = templateModule
      
      if (savedTemplateData && savedTemplateData.length > 0) {
        // Clear existing templates
        uiState.templates = []
        
        // Load saved templates
        for (const templateData of savedTemplateData) {
          uiState.templates.push(templateData)
          
          // Update template ID counter to avoid conflicts
          if (templateData.id >= uiState.templateIdCounter) {
            uiState.templateIdCounter = templateData.id + 1
          }
        }
        
        console.log(`Loaded ${savedTemplateData.length} templates from template-data.ts`)
      }
    } catch (error) {
      console.log('No template data found in data/template-data.ts')
    }
    
    // Initialize plane counter based on loaded planes
    initializePlaneCounter(savedSceneData.planes)
    
  } catch (error) {
    console.error('Failed to load scene data:', error)
    // Initialize plane counter even when loading fails
    initializePlaneCounter()
  }
}

// Utility functions for temporary parenting during snapped plane movement
export function findParentPlaneEntity(snapParentId: number): Entity | null {
  for (const [entity, planeComponent] of engine.getEntitiesWith(PlacedPlane)) {
    if (planeComponent.id === snapParentId) {
      return entity
    }
  }
  return null
}

export function adjustPlanePositionWithSnapping(entity: Entity, axis: 'x' | 'y' | 'z', delta: number): void {
  if (!Transform.has(entity)) return
  
  const planeComponent = PlacedPlane.getOrNull(entity)
  if (!planeComponent) return
  
  // Check if this plane is snapped to another plane
  if (planeComponent.snapParentId && planeComponent.snapParentId > 0) {
    const parentEntity = findParentPlaneEntity(planeComponent.snapParentId)
    
    if (parentEntity && Transform.has(parentEntity)) {
      console.log(`Adjusting snapped plane ${planeComponent.name} relative to parent ${planeComponent.snapParentId}`)
      
      // Temporarily parent to the snap parent
      const transform = Transform.getMutable(entity)
      const parentTransform = Transform.get(parentEntity)
      
      // Convert current world position to local position relative to parent
      const worldPos = transform.position
      // Manual quaternion conjugate since SDK might not have conjugate method
      const parentRotation = parentTransform.rotation
      const parentInverseRotation = Quaternion.create(-parentRotation.x, -parentRotation.y, -parentRotation.z, parentRotation.w)
      const relativePos = Vector3.subtract(worldPos, parentTransform.position)
      const localPos = Vector3.rotate(relativePos, parentInverseRotation)
      
      // Adjust local position
      const adjustedLocalPos = Vector3.create(
        axis === 'x' ? localPos.x + delta : localPos.x,
        axis === 'y' ? localPos.y + delta : localPos.y,
        axis === 'z' ? localPos.z + delta : localPos.z
      )
      
      // Convert back to world position
      const newRelativePos = Vector3.rotate(adjustedLocalPos, parentTransform.rotation)
      const newWorldPos = Vector3.add(parentTransform.position, newRelativePos)
      
      // Update the plane's world position
      transform.position = newWorldPos
      
      console.log(`Adjusted ${axis} by ${delta}, new position: ${newWorldPos.x.toFixed(3)}, ${newWorldPos.y.toFixed(3)}, ${newWorldPos.z.toFixed(3)}`)
    } else {
      console.log(`Parent plane not found for snap parent ID: ${planeComponent.snapParentId}`)
      // Fall back to normal position adjustment
      adjustPlanePositionNormal(entity, axis, delta)
    }
  } else {
    // Normal position adjustment for non-snapped planes
    adjustPlanePositionNormal(entity, axis, delta)
  }
}

function adjustPlanePositionNormal(entity: Entity, axis: 'x' | 'y' | 'z', delta: number): void {
  const transform = Transform.getMutable(entity)
  const currentPos = transform.position
  
  transform.position = Vector3.create(
    axis === 'x' ? currentPos.x + delta : currentPos.x,
    axis === 'y' ? currentPos.y + delta : currentPos.y,
    axis === 'z' ? currentPos.z + delta : currentPos.z
  )
  
  console.log(`Normal position adjustment: ${axis} by ${delta}`)
}

