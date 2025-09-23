import { Entity } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import { Elevator } from './Elevator'
import { ElevatorInfo, ElevatorEvent, ElevatorEventTypes } from './ElevatorManager'
import { EventManager } from './EventManager'

export { Elevator, ElevatorInfo, ElevatorEvent, ElevatorEventTypes, EventManager }

export interface ElevatorConfig {
  elevatorInfo: ElevatorInfo
  scene: Entity
  position: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  scale?: { x: number; y: number; z: number }
  onTestingStarted?: (data: any) => void
  onTestingEnded?: (data: any) => void
}

export function initializeElevator(config: ElevatorConfig): {
  elevator: Elevator
  eventManager: EventManager
} {
  const {
    elevatorInfo,
    scene,
    position,
    rotation = { x: 0, y: -90, z: 0 },
    scale = { x: 1, y: 1, z: 1 },
    onTestingStarted,
    onTestingEnded
  } = config

  // Create the elevator instance
  const elevator = new Elevator(
    scene,
    position.x,
    position.y,
    position.z,
    rotation.x,
    rotation.y,
    rotation.z,
    scale.x,
    scale.y,
    scale.z,
    elevatorInfo
  )

  // Create event manager for scene-level events
  const sceneEventManager = new EventManager()
  
  // Set up event listeners
  sceneEventManager.addListener(ElevatorEvent, null, ({ id, type, data }) => {
    if (data.elevatorId !== elevatorInfo.elevatorId) {
      return
    }

    switch (type) {
      case ElevatorEventTypes.TESTING_STARTED:
        if (onTestingStarted) {
          onTestingStarted(data)
        }
        break
      case ElevatorEventTypes.TESTING_ENDED:
        if (onTestingEnded) {
          onTestingEnded(data)
        }
        break
    }
  })

  // Connect the event manager to the elevator
  elevator.elevatorManager.addListener(sceneEventManager)

  return {
    elevator,
    eventManager: sceneEventManager
  }
}