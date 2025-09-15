// Main entry point for plane positioner module
export * from './plane-components'
export * from './plane-factory'
export * from './plane-systems'
export * from './plane-utils'
export { setupUi as setupPlanePositionerUi } from './plane-ui'

// Main initialization function for the plane positioner
import { engine } from '@dcl/sdk/ecs'
import { 
  changeColorSystem, 
  circularSystem, 
  previewPlaneSystem, 
  planeSelectionSystem, 
  textureStreamingSystem, 
  templatePreviewSystem 
} from './plane-systems'
import { setupUi } from './plane-ui'
import { loadSceneState } from './plane-utils'

export async function initializePlanePositioner() {
  // Add all plane positioner systems
  engine.addSystem(circularSystem)
  engine.addSystem(changeColorSystem)
  engine.addSystem(previewPlaneSystem)
  engine.addSystem(planeSelectionSystem)
  engine.addSystem(textureStreamingSystem)
  engine.addSystem(templatePreviewSystem)

  // UI is now handled by ui-manager.tsx
  // setupUi() - removed
  
  // Load saved scene data if available
  await loadSceneState()
}