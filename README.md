# Commodore 64 Museum

## Overview

The Commodore 64 Museum is an immersive 3D virtual experience built on Decentraland that showcases the rich history of Commodore 64 software. This multi-parcel scene spans a 5×5 grid and features an extensive collection of 570 C64 games and applications displayed in an innovative curved gallery format.

### Key Features
- **570 Game Covers**: Displayed in a curved grid formation (3 rows × 190 columns)
- **Interactive Gallery**: Hover effects, selection capabilities, and detailed information panels
- **External Links**: Direct links to Internet Archive, Wikipedia, and eBay for each title
- **Performance Optimized**: Advanced texture caching and resource management for smooth experience
- **Navigation System**: Pagination controls for browsing the extensive collection

## Code Structure

### Core Modules

#### 1. Games Directory (`src/games-directory/`)
The heart of the museum functionality, managing the display and interaction with the game collection.

- **games-factory.ts**: Creates the curved grid of game cover planes with precise positioning
  - Generates 570 planes in a 3×190 configuration
  - Implements 32-meter radius curved layout
  - Handles initial entity creation and positioning

- **games-systems.ts**: ECS systems for interactive behaviors
  - `PlaneHoverSystem`: Manages hover effects and visual feedback
  - `SpinnerSystem`: Creates circular animation effects
  - `PlaneSelectionSystem`: Handles user selection and interaction
  - `ResourceMonitoringSystem`: Tracks performance metrics

- **games-state.ts**: Global state management
  - Maintains current page and selected items
  - Manages filtering and search functionality
  - Handles pagination state

- **games-ui.tsx**: React-based UI components
  - Displays detailed game information (title, year, creator, genre)
  - Provides external links for each game
  - Responsive layout adapting to screen size

- **games-pagination-ui.tsx**: Navigation controls
  - Page navigation buttons
  - Current page indicator
  - Smooth transition between pages

- **games-knn-material-system.ts**: K-nearest neighbor texture management
  - Efficiently loads/unloads textures based on player proximity
  - Implements LRU cache limited to 200 textures
  - Prevents memory overflow in large collections

- **games-museum-config.ts**: Configuration constants
  - Grid dimensions and spacing
  - Animation parameters
  - Resource limits

#### 2. Plane Positioner (`src/plane-positioner/`)
Advanced tools for dynamic plane creation and management.

- **plane-positioner-factory.ts**: Factory pattern for plane creation
- **plane-positioner-systems.ts**: Systems for plane manipulation
- **plane-positioner-ui.tsx**: UI for positioning tools
- **texture-streaming-system.ts**: Dynamic texture loading
- **plane-spawner.ts**: Template-based plane spawning

#### 3. Elevator System (`src/Elevator/`)
Vertical transportation system within the museum.

- **ElevatorManager.ts**: Central elevator control logic
- **Elevator.ts**: Individual elevator entity management
- **EventManager.ts**: Event-driven elevator interactions
- **SpawnerFunctions.ts**: Dynamic elevator creation
- **ElevatorTester.ts**: Testing utilities for elevator functionality

#### 4. Teleporter (`src/teleporter/`)
Fast travel system (currently disabled in production).

- **teleporter-components.ts**: Component definitions for teleportation
- **teleporter-factory.ts**: Creation of teleport points
- **teleporter-systems.ts**: Teleportation logic and effects

### Architecture & Technical Details

#### Technology Stack
- **Platform**: Decentraland SDK 7.10.2
- **Language**: TypeScript with strict mode
- **UI Framework**: React with @dcl/sdk/react-ecs
- **Build System**: Rollup with TypeScript compilation
- **Entry Point**: `src/index.ts`

#### Entity Component System (ECS)
The scene follows Decentraland's ECS architecture:
- Custom components: `Plane`, `PlaneData`, `Spinner`, `Cube`
- Multiple concurrent systems for different behaviors
- Efficient component queries for performance

#### Performance Optimization
- **Texture Cache**: LRU implementation capped at 200 simultaneous textures
- **Dynamic Loading**: Materials loaded based on player proximity
- **Resource Monitoring**: Real-time tracking of memory usage
- **Batch Processing**: Efficient update cycles for multiple entities

#### Data Structure
The museum expects game data in the following format:
```typescript
{
  title: string,
  year: number,
  creator: string,
  genre: string,
  thumbnail: string,  // URL to cover image
  links: {
    archive?: string,
    wikipedia?: string,
    ebay?: string
  }
}
```

## Development

### Prerequisites
- Node.js 14+ and npm
- Decentraland SDK7 knowledge
- TypeScript experience

### Setup
```bash
npm install
```

### Commands
- `npm start` - Start development server with hot reloading
- `npm run build` - Build production bundle
- `npm run deploy` - Deploy to Decentraland
- `npm run upgrade-sdk` - Update to latest SDK version

### Code Style
- Prettier configuration: No semicolons, single quotes, 120 character line width
- TypeScript strict mode enforced
- Follow Decentraland ECS patterns

## Scene Configuration

### Location
Multi-parcel scene spanning coordinates (-126,107) to (-122,111) in Decentraland.

### Permissions
- Voice chat enabled
- Portable experiences supported
- Standard Decentraland permissions apply

### Resources
- Maximum texture count: 200 (managed by cache)
- Dynamic resource allocation based on player position
- Optimized for multiple concurrent users

## Troubleshooting

### Common Issues
1. **Texture Loading**: If textures fail to load, check cache limits in `games-knn-material-system.ts`
2. **Performance**: Monitor resource usage via the built-in monitoring system
3. **Navigation**: Ensure pagination state is properly initialized in `games-state.ts`

### Support
For technical support or questions about the codebase, refer to the inline documentation or contact the development team.