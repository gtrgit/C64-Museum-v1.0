# Plane Positioner Module

A Decentraland SDK7 module for creating, positioning, and managing interactive 3D planes with template support.

## Features

- **Plane Creation & Management**: Create and position planes in 3D space
- **Snapping System**: Snap planes to other planes for precise alignment
- **Template System**: Create reusable templates from selected planes
- **Texture Streaming**: Efficient texture loading based on proximity
- **Text Support**: Add customizable text to planes
- **Material Customization**: Adjust colors, emission, and opacity
- **Clustering**: Automatic KNN clustering for texture optimization
- **Save/Load System**: Persist scene and template data

## Module Structure

```
plane-positioner/
├── plane-components.ts    # ECS component definitions
├── plane-factory.ts       # Entity creation functions
├── plane-systems.ts       # ECS systems for runtime behavior
├── plane-utils.ts         # Utility functions and state management
├── plane-ui.tsx          # React-based UI components
└── index.ts              # Module entry point
```

## Usage

### Basic Integration

```typescript
import { initializePlanePositioner } from './plane-positioner'

export async function main() {
  // Initialize the plane positioner system
  await initializePlanePositioner()
}
```

### Advanced Integration

```typescript
import { 
  createPlane,
  PlacedPlane,
  previewPlaneSystem,
  setupPlanePositionerUi 
} from './plane-positioner'
import { engine } from '@dcl/sdk/ecs'

export async function main() {
  // Add only specific systems you need
  engine.addSystem(previewPlaneSystem)
  
  // Create planes programmatically
  const transform = {
    position: Vector3.create(8, 1, 8),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  }
  const planeEntity = createPlane(transform)
  
  // Setup UI separately
  setupPlanePositionerUi()
}
```

## Data Storage

The module uses two data files:
- `data/label-data.ts` - Stores plane data
- `data/template-data.ts` - Stores template data

## Key Components

### PlacedPlane Component
```typescript
{
  name: string
  id: number
  currentImage: string
  localKnnClusterId: number
  snapParentId: number
}
```

### Template System
- Create templates by selecting multiple planes
- Place templates with preserved relative positions
- Templates are saved separately from plane data

## UI Controls

- **Plane Tab**: Generate and place planes
- **Edit Tab**: Modify plane properties (position, scale, rotation)
- **Text Tab**: Add and customize text on planes
- **Image Tab**: Apply textures to planes
- **Template Tab**: Create and place templates
- **Delete Tab**: Remove selected planes

## Export Functions

- `initializePlanePositioner()` - Initialize the complete system
- `createPlane()` - Create a single plane
- `createTemplatePreview()` - Preview a template
- `saveSceneState()` - Save current scene
- `loadSceneState()` - Load saved scene