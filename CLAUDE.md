# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Decentraland SDK7 scene project - a **Commodore 64 Museum** that displays a large collection of C64 games/software in an immersive 3D environment. The scene spans 25 parcels (5×5 grid) and showcases 570 game covers arranged in a curved grid formation.

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
- **Platform**: Decentraland SDK 7.10.2
- **Language**: TypeScript (strict mode enabled)
- **UI Framework**: React (@dcl/sdk/react-ecs)
- **Entry Point**: `src/index.ts`
- **Build Output**: `bin/index.js`

### Core Modules

#### Games Directory (`src/games-directory/`)
The main museum functionality:
- **games-factory.ts**: Creates curved grid of 570 planes (3 rows × 190 columns) with 32m radius
- **games-systems.ts**: ECS systems handling plane selection, hover effects, circular animations
- **games-state.ts**: Global state management for pagination, filtering, selected items
- **games-ui.tsx**: React UI showing game details (title, year, creator, genre, links)
- **games-pagination-ui.tsx**: Navigation controls for browsing the collection
- **games-knn-material-system.ts**: K-nearest neighbor system for efficient material management
- **games-museum-config.ts**: Configuration constants (grid dimensions, spacing, etc.)

#### Plane Positioner (`src/plane-positioner/`)
Tools for plane management and positioning:
- Template-based plane creation system
- Preview functionality for placement
- Texture streaming capabilities
- Own UI system for manipulation

#### Teleporter (`src/teleporter/`)
Teleportation system (currently disabled in index.ts)

### Key Architectural Patterns

#### Entity Component System (ECS)
- Custom components: `Plane`, `PlaneData`, `Spinner`, `Cube`
- Multiple concurrent systems for different behaviors
- Component-based architecture following Decentraland SDK7 patterns

#### Resource Management
- **Texture Cache**: LRU cache limited to 200 textures
- **Dynamic Loading**: Materials loaded/unloaded based on proximity
- **Performance Monitoring**: Resource usage tracking

#### UI Architecture
- React-based UI using Decentraland's React ECS integration
- Displays game metadata with external links (Internet Archive, Wikipedia, eBay)
- Responsive pagination system

### Scene Configuration

- **Location**: Multi-parcel scene at coordinates (-126,107) to (-122,111)
- **scene.json**: Contains parcel definitions, spawn points, permissions
- **Features**: Voice chat enabled, portable experiences supported

### Development Context

#### Code Style
- Prettier: No semicolons, single quotes, 120 char line width
- TypeScript strict mode enforced
- Follow Decentraland SDK7 ECS patterns

#### Data Dependencies
- Expects `c64_software_cleaned.json` with game metadata (not included in repo)
- Each game entry should contain: title, year, creator, genre, thumbnail URL, etc.

#### Performance Considerations
- 570 planes rendered simultaneously requires careful resource management
- Texture caching prevents memory overflow
- Pagination limits active elements

### Working with This Codebase

When modifying the museum:
1. Grid layout is configured in `games-museum-config.ts`
2. Visual effects and interactions are in `games-systems.ts`
3. UI components are React-based in `games-ui.tsx`
4. State management happens through `games-state.ts`

For adding new features:
- Follow the existing ECS pattern with components and systems
- Use the plane positioner module for dynamic plane management
- Integrate with the existing caching system for textures
- Maintain the modular structure with clear separation of concerns