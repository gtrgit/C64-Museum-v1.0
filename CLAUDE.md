# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Decentraland SDK7 scene project - a **Commodore 64 Museum** that displays a large collection of C64 games/software in an immersive 3D environment. The scene spans 25 parcels (5×5 grid) and showcases 10,000+ games with 570 visible at any time, arranged in a curved gallery formation.

## Essential Commands

### Development
- `npm start` - Start development server with hot reloading
- `npm run build` - Build the project (outputs to `bin/` directory)
- `npm run deploy` - Deploy the scene to Decentraland

### SDK Management
- `npm run upgrade-sdk` - Upgrade to latest stable SDK version
- `npm run upgrade-sdk:next` - Upgrade to next/beta SDK version

## Architecture Overview

### Technology Stack
- **Platform**: Decentraland SDK 7.10.4
- **Language**: TypeScript (strict mode enabled)
- **UI Framework**: React (@dcl/sdk/react-ecs)
- **Entry Point**: `src/index.ts`
- **Build Output**: `bin/index.js`
- **Node Requirements**: >=16.0.0

### Core Modules

#### Games Directory (`src/games-directory/`)
The main museum functionality:
- **games-factory.ts**: Creates curved grid of 570 planes (3 rows × 190 columns) with 32m radius
- **games-systems.ts**: ECS systems handling plane selection, hover effects, circular animations
- **games-state.ts**: Global state management for pagination (10k+ games), filtering, selected items
- **games-ui.tsx**: React UI showing game details (title, year, creator, genre, external links)
- **games-pagination-ui.tsx**: Navigation controls for browsing the 10k+ collection
- **games-knn-material-system.ts**: K-nearest neighbor system for efficient texture management
- **games-museum-config.ts**: Configuration constants (grid dimensions, spacing, performance limits)
- **games-data-loader.ts**: Handles loading game data from `c64_software_cleaned.json`

#### Elevator System (`src/Elevator/`)
Vertical transportation within the museum:
- **Elevator.ts**: Core elevator entity and movement logic
- **ElevatorManager.ts**: Manages elevator state, calls, and floor requests
- **EventManager.ts**: Event-driven system for elevator interactions
- **SpawnerFunctions.ts**: Factory functions for creating elevator components
- Multi-floor support with call buttons and test mode

#### Plane Positioner (`src/plane-positioner/`)
Tools for dynamic plane management:
- Template-based plane creation system
- Preview functionality for placement
- Texture streaming capabilities
- Own UI system for manipulation

#### Audio System (`src/audio/`)
Audio streaming functionality:
- **audio-ui.tsx**: UI controls for audio playback
- Integrated with scene's audio stream system

#### Teleporter (`src/teleporter/`)
Fast travel system (currently disabled in production)

### Key Architectural Patterns

#### Entity Component System (ECS)
- Custom components: `Plane`, `PlaneData`, `Spinner`, `Cube`
- Multiple concurrent systems for different behaviors
- Component-based architecture following Decentraland SDK7 patterns
- Systems run in parallel for performance

#### Resource Management
- **Texture Cache**: LRU cache limited to 200 textures (configurable)
- **Dynamic Loading**: Materials loaded/unloaded based on proximity
- **Performance Monitoring**: Resource usage tracking when enabled
- **KNN Algorithm**: Efficiently manages which textures to load based on player position

#### UI Architecture
- React-based UI using Decentraland's React ECS integration
- Displays game metadata with external links (Internet Archive, Wikipedia, eBay)
- Responsive pagination system for 10k+ games
- Combined UI manager (`ui-manager.tsx`) orchestrates all UI components

### Scene Configuration

- **Location**: Multi-parcel scene at coordinates (-126,107) to (-122,111)
- **scene.json**: Contains parcel definitions, spawn points, permissions
- **Features**: Voice chat enabled, portable experiences supported
- **Spawn Point**: Position (38, 0, 38) with camera target at (8, 1, 8)
- **Permissions**: Avatar emote triggering, player movement inside scene
- **Fixed Skybox**: Set to 43200 (noon)

### Museum-Specific Configuration

#### Grid Layout (in `games-museum-config.ts`)
- **Grid Size**: 3 rows × 150 columns = 450 planes visible (configurable)
- **Radius**: 32 meters for curved display
- **Plane Scale**: 0.5 (half size)
- **Force Grid Size**: Enabled to ensure 570 planes display

#### Angular Positioning
- **Horizontal Range**: 180° to 360° (180° total coverage)
- **Vertical Range**: -1.0° to +1.0° (2° total, 1° per row spacing)
- **Center Position**: (34, 7.2, 38)

### Development Context

#### Code Style
- Prettier configuration:
  - No semicolons
  - Single quotes
  - 120 character line width
  - No trailing commas
- TypeScript strict mode enforced
- Follow Decentraland SDK7 ECS patterns

#### Data Dependencies
- Requires `c64_software_cleaned.json` with game metadata (10k+ entries)
- Each game entry structure:
  ```typescript
  {
    title: string,
    year: string,
    creator: string,
    genre: string,
    thumbnailUrl: string,
    internetArchiveUrl?: string,
    wikipediaUrl?: string,
    ebaySearchUrl?: string
  }
  ```

#### Performance Considerations
- 570 planes rendered simultaneously requires careful resource management
- Texture caching prevents memory overflow
- Pagination limits active elements to manageable chunks
- KNN system ensures only nearby textures are loaded

### Working with This Codebase

When modifying the museum:
1. Grid layout is configured in `games-museum-config.ts`
2. Visual effects and interactions are in `games-systems.ts`
3. UI components are React-based in `games-ui.tsx` and `games-pagination-ui.tsx`
4. State management happens through `games-state.ts`
5. Elevator system can be configured via `ElevatorInfo` in `index.ts`

For adding new features:
- Follow the existing ECS pattern with components and systems
- Use the plane positioner module for dynamic plane management
- Integrate with the existing caching system for textures
- Maintain the modular structure with clear separation of concerns
- Test with different pagination pages to ensure performance

### Build and Deployment

1. **Development**: Run `npm start` to launch local preview at http://localhost:8000
2. **Building**: Run `npm run build` to compile TypeScript to JavaScript
3. **Deployment**: Run `npm run deploy` to publish to Decentraland

### Directory Structure
```
src/
├── index.ts                    # Main entry point
├── games-directory/           # Core museum functionality
├── Elevator/                  # Vertical transportation
├── plane-positioner/          # Dynamic plane tools
├── audio/                     # Audio streaming
├── teleporter/                # Fast travel (disabled)
├── ui-manager.tsx             # Combined UI orchestration
└── utils.ts                   # Shared utilities
```