import { Schemas, engine } from '@dcl/sdk/ecs'

// We use this component to track teleporter entities and store their destination
export const Teleporter = engine.defineComponent('teleporter', {
  destination: Schemas.Map({
    x: Schemas.Float,
    y: Schemas.Float,
    z: Schemas.Float
  })
})

// Component to track teleporter animated plane
export const TeleporterAnimated = engine.defineComponent('teleporter-animated', {
  animationTime: Schemas.Float,
  basePosition: Schemas.Map({
    x: Schemas.Float,
    y: Schemas.Float,
    z: Schemas.Float
  })
})

// Legacy component - keep for backwards compatibility but will be unused
export const TeleporterRipple = engine.defineComponent('teleporter-ripple', {
  layerIndex: Schemas.Int,
  animationTime: Schemas.Float
})