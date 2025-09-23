# Elevator System for Decentraland SDK7

This is a portable elevator system that can be easily integrated into any Decentraland SDK7 project.

## Installation

Copy the entire `Elevator` folder to your project's `src` directory.

## Usage

```typescript
import { initializeElevator, ElevatorInfo } from './Elevator'

// Define elevator configuration
const elevatorInfo: ElevatorInfo = {
  elevatorId: "main",
  elevatorMessageBusChannel: "your-unique-uuid-here",
  floors: [
    { elevation: 0 },   // Ground floor
    { elevation: 3 },   // Floor 1
    { elevation: 6 },   // Floor 2
    // Add more floors as needed
  ],
  doorOpenPeriod: 5,        // Seconds to keep doors open
  maxSpeed: 2,              // Meters per second
  groundFloorIsOne: false,  // false = G,1,2,3... true = 1,2,3,4...
  syncPlayers: true,        // Enable multiplayer synchronization
  sceneStartupDelay: 6,     // Seconds for scene to load
  startupSyncTimeout: 5,    // Seconds to wait for sync
  testMode: false           // Enable testing features
}

// Initialize the elevator
const { elevator, eventManager } = initializeElevator({
  elevatorInfo,
  scene: yourSceneEntity,
  position: { x: 7, y: 0, z: 9 },
  rotation: { x: 0, y: -90, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  onTestingStarted: (data) => {
    // Optional: Handle when testing starts
  },
  onTestingEnded: (data) => {
    // Optional: Handle when testing ends
  }
})

// Use the elevator
elevator.elevatorManager.requestGoto(2)      // Go to floor 2
elevator.elevatorManager.requestCall(1, true) // Call from floor 1 going up
elevator.elevatorManager.requestOpenDoors()   // Open doors
```

## API

### ElevatorInfo Configuration

- `elevatorId`: Unique identifier for this elevator
- `elevatorMessageBusChannel`: UUID for multiplayer sync (generate a unique one)
- `floors`: Array of floor definitions with elevation in meters
- `doorOpenPeriod`: How long doors stay open (seconds)
- `maxSpeed`: Maximum elevator speed (m/s)
- `groundFloorIsOne`: Floor numbering system
- `syncPlayers`: Enable multiplayer synchronization
- `testMode`: Enable automated testing features

### Methods

- `requestGoto(floor: number)`: Send elevator to specific floor
- `requestCall(floor: number, goingUp: boolean)`: Call elevator from a floor
- `requestOpenDoors()`: Open elevator doors
- `runTests()`: Run automated test suite (if testMode enabled)

## Events

The system emits various events through the EventManager:
- `DOORS_OPENED`, `DOORS_CLOSED`
- `MOVEMENT_STARTED`, `MOVEMENT_STOPPED`
- `NEW_FLOOR`
- `TESTING_STARTED`, `TESTING_ENDED`

## Files Included

- `Elevator.ts`: Main elevator entity and door control
- `ElevatorManager.ts`: State machine and logic
- `EventManager.ts`: Event system for decoupled communication
- `ElevatorTester.ts`: Automated testing system
- `SpawnerFunctions.ts`: Helper functions for creating entities