import { Schemas, engine } from '@dcl/sdk/ecs'


// We use this component to track and group all spinning entities.
// engine.getEntitiesWith(Spinner)
export const Spinner = engine.defineComponent('spinner', { speed: Schemas.Number })

// We use this component to track and group all the cubes.
// engine.getEntitiesWith(Cube)
export const Cube = engine.defineComponent('cube-id', {})

// We use this component to track and group all the planes.
// engine.getEntitiesWith(Plane)
export const Plane = engine.defineComponent('plane-id', { angle: Schemas.Number })

// Component to store plane metadata
export const PlaneData = engine.defineComponent('plane-data', {
  id: Schemas.String,
  title: Schemas.String,
  description: Schemas.String,
  isSpecialPlane: Schemas.Boolean,
  gameIndex: Schemas.Number,  // Store the actual game index for material sync
  identifier: Schemas.String,  // Unique game identifier for consistent material mapping
  temporaryIdentifier: Schemas.String  // Identifier for distant plane material (from subset of closest 45)
})