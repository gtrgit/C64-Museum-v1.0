import { Schemas, engine } from '@dcl/sdk/ecs'


// We use this component to track and group all spinning entities.
// engine.getEntitiesWith(Spinner)
export const Spinner = engine.defineComponent('spinner', { speed: Schemas.Number })

// We use this component to track and group all the cubes.
// engine.getEntitiesWith(Cube)
export const Cube = engine.defineComponent('cube-id', {})

// Component to track preview planes attached to camera
export const PreviewPlane = engine.defineComponent('preview-plane', {
  offset: Schemas.Vector3
})

// Component to track template preview planes
export const TemplatePreview = engine.defineComponent('template-preview', {
  templateId: Schemas.Number,
  originalPlaneId: Schemas.Number // References the original plane this preview represents
})

// Component to track the parent entity for template previews
export const TemplatePreviewParent = engine.defineComponent('template-preview-parent', {
  templateId: Schemas.Number
})

// Component to track placed planes with names
export const PlacedPlane = engine.defineComponent('placed-plane', {
  name: Schemas.String,
  id: Schemas.Number, // Unique ID for clustering and references
  currentImage: Schemas.String,
  localKnnClusterId: Schemas.Number, // References the ID of the cluster center plane
  snapParentId: Schemas.Number // ID of the plane this was snapped to (0 if not snapped)
})

// Component to track text on planes
export const PlaneText = engine.defineComponent('plane-text', {
  parentPlane: Schemas.Entity,
  text: Schemas.String,
  fontSize: Schemas.Number,
  font: Schemas.String
})