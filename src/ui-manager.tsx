import ReactEcs, { ReactEcsRenderer, UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { engine } from '@dcl/sdk/ecs'

// Import both UI components
import { combinedUIComponent as gamesUI } from './games-directory/games-ui'
import { uiComponent as planeUI } from './plane-positioner/plane-ui'

// Developer mode state
let developerMode = true
let showDeveloperToggle = true

// Toggle developer mode
export function toggleDeveloperMode() {
  developerMode = !developerMode
}

// Get developer mode state
export function isDeveloperMode() {
  return developerMode
}

// Set whether to show developer toggle
export function setShowDeveloperToggle(show: boolean) {
  showDeveloperToggle = show
}

// Combined UI component that renders both UIs
const combinedUIManager = () => {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute'
      }}
    >
      {/* Games UI - Always visible */}
      {gamesUI()}
      
      {/* Plane Positioner UI - Only visible in developer mode */}
      {developerMode && planeUI()}
      
      {/* Developer Mode Toggle Button */}
      {showDeveloperToggle && (
        <UiEntity
          uiTransform={{
            width: 150,
            height: 30,
            positionType: 'absolute',
            position: { top: 16, left: 16 }
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              padding: 2
            }}
            uiBackground={{ 
              color: Color4.create(0.1, 0.1, 0.1, 0.8)
            }}
            onMouseDown={() => {
              toggleDeveloperMode()
            }}
          >
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Label
                value={`Developer Mode: ${developerMode ? 'ON' : 'OFF'}`}
                fontSize={12}
                color={developerMode ? Color4.create(0.2, 1, 0.2, 1) : Color4.create(1, 1, 1, 1)}
                uiTransform={{
                  width: 'auto',
                  height: '100%'
                }}
              />
            </UiEntity>
          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}

// Setup the combined UI
export function setupCombinedUI() {
  ReactEcsRenderer.setUiRenderer(combinedUIManager)
}

// Helper to check if in production (hides developer toggle)
export function setProductionMode(isProduction: boolean) {
  setShowDeveloperToggle(!isProduction)
  if (isProduction) {
    developerMode = false
  }
}