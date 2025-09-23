import {
  Vector3,
  Color3,
  Color4,
  Quaternion
} from '@dcl/sdk/math'
import { engine,Entity,Transform,TransformTypeWithOptionals,
  Material,PBMaterial,PBMaterial_PbrMaterial,Texture,TextureUnion,
  TextShape, Font,
  MeshCollider, MeshRenderer, GltfContainer,
  pointerEventsSystem,InputAction, inputSystem
 } from '@dcl/sdk/ecs'

import { changeColorSystem, circularSystem, planeSelectionSystem } from './games-directory/games-systems'
import { createSingleCurvedGrid } from './games-directory/games-factory'
import { MUSEUM_CONFIG, applyCustomGridSize } from './games-directory/games-museum-config'
import { knnMaterialSystem, initializeKNNMaterialSystem } from './games-directory/games-knn-material-system'
import { initializeFiltering } from './games-directory/games-state'

import {} from '@dcl/sdk/math'

// Import the plane positioner module
import { initializePlanePositioner, logPlayerTransformValues } from './plane-positioner'
import { createTeleporter, teleporterSystem, teleporterRippleSystem, teleporterAnimationSystem } from './teleporter/teleporter'
import { setupCombinedUI } from './ui-manager'


//Elevator
import {addNamedEntity, spawnEntity, spawnBoxX} from './Elevator/SpawnerFunctions'
import { initializeElevator, ElevatorInfo, ElevatorEventTypes } from './Elevator'

// Export utilities for reuse in other projects
// export { logPlayerTransformValues } from './plane-positioner'


let testIndicator:Entity | null = null

export async function main() {
  // Setup combined UI first
  setupCombinedUI()

  engine.addSystem(planeSelectionSystem)
  engine.addSystem(knnMaterialSystem) // Add KNN material management system

  // Configuration for curved grid placement
  // const horizontalRangeStart = 190
  // const horizontalRangeEnd = 350
  
  // // Vertical configuration (e.g., -30° to +30° for a 60° vertical arc)
  // const verticalRangeStart = -15
  // const verticalRangeEnd = 15
  
  // const radius = 5
  // const planeScale = Vector3.create(.5, .5, .5)
  
  // Create curved grid of planes with automatic sizing based on scene limits
  // Grid dimensions are now calculated automatically from scene.json parcel count
  
  engine.addSystem(teleporterSystem)
  engine.addSystem(teleporterRippleSystem)
  engine.addSystem(teleporterAnimationSystem)

  // // // Create test teleporter
  createTeleporter(
    { x: 36, y: 0.01, z: 36 },    // teleporter position
    { x: 16, y: 7.5, z: 24 },    // destination
    'images/teleporter-pad.png',
    'images/joystick-icon.png',
    'Games!'
  )

  

   createTeleporter(
    { x: 36, y: 0.01, z: 39 },    // teleporter position
    { x: 36, y: 0, z: 10 },    // destination
    'images/teleporter-pad.png',
    'images/joystick-icon.png',
    'History'
  )

  //game 3d ui
  initializeScene()

  // Initialize the plane positioner system
  await initializePlanePositioner()



  
  // debugLog1("\n========= Elevator Demo =========")
  
  // Scene setup
  let scene = spawnEntity(0,0,0, 0,0,0, 1,1,1, "scene")
  
  // // Simple Ground Plane
  // const groundPlane = spawnBoxX(8,0,8,    0,0,0,    16,0.038,16, "groundPlane", scene)
  // Material.setPbrMaterial(groundPlane,{
  //   albedoColor: Color4.create(0.282, 0.437, 0.300),
  //   roughness: 1,
  //   metallic: 0
  // })
  
  // Elevator configuration
  let elevatorInfo:ElevatorInfo = {
      elevatorId:"main",
      elevatorMessageBusChannel:"a95ba95c-19c4-11ed-861d-0242ac120002",
      floors:[{elevation:0},{elevation:5.35},{elevation:10.5}],
      doorOpenPeriod:5,
      maxSpeed:2,
      groundFloorIsOne:false,
      syncPlayers:true,
      sceneStartupDelay:6,
      startupSyncTimeout:5,
      testMode:true
  }

  // Building floors
  let floorMtl:PBMaterial_PbrMaterial = {
    albedoColor: Color4.create(0,0,.6),
    roughness: 1,
    metallic: 0
  }

  //Floors
  for (let i=0; i<elevatorInfo.floors.length; i++) {
      let floor = spawnBoxX(42.5,elevatorInfo.floors[i].elevation,39,  0,0,0, 9,0.01,49,"floor")
      Material.setPbrMaterial(floor, floorMtl)
  }    




  // Initialize the elevator using the new function
  const { elevator, eventManager } = initializeElevator({
    elevatorInfo,
    scene,
    position: { x: 48, y: elevatorInfo.floors[0].elevation, z: 39.15 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    onTestingStarted: (data) => {
      if (!testIndicator) {
        testIndicator = spawnEntity(8,2,7.5,  0,0,0,  1,1,1, "testIndicator", scene)
        TextShape.create(testIndicator,{
          text: "Elevator Closed for Testing",
          fontSize: 4,
          textColor: Color4.Red()
        })
      }
    },
    onTestingEnded: (data) => {
      if (testIndicator) {
        engine.removeEntity(testIndicator)
        testIndicator = null
      }
    }
  })

  // Call buttons for each floor
  let buttonMtl:PBMaterial_PbrMaterial = {
    emissiveColor: Color4.White(),
    emissiveIntensity: 1
  }
  
  for (let i=0; i<elevatorInfo.floors.length; i++) {
      if (i < elevatorInfo.floors.length-1) {
        let buttonUp = spawnBoxX(46.2,elevatorInfo.floors[i].elevation+1.7,38,  0,90,0, 0.2,0.2,0.05)
        Material.setPbrMaterial(buttonUp, buttonMtl)
        pointerEventsSystem.onPointerDown(
          { 
            entity:buttonUp,
            opts: {
              button: InputAction.IA_POINTER,
              hoverText: "Call to go up",
              maxDistance: 8,
              showFeedback: true
            }
          },
          ()=>{
            elevator.elevatorManager.requestCall(i,true)
          }
        )

        let textUp = addNamedEntity("textUp"+i)
        Transform.create(textUp,{
          parent:buttonUp,
          position:Vector3.create(0,-0.07,-0.6),
          rotation:Quaternion.fromEulerDegrees(0,0,0),
          scale:Vector3.create(1,1,1)
        })
        TextShape.create(textUp,{
          text: "^",
          fontSize: 8,
          textColor: Color4.Black()
        })
      }
      
      if (i > 0) {
        let buttonDown = spawnBoxX(46.2,elevatorInfo.floors[i].elevation+1.5,38,  0,90,0, 0.2,0.2,0.05)
          Material.setPbrMaterial(buttonDown,buttonMtl)
          pointerEventsSystem.onPointerDown(
            { 
              entity:buttonDown,
              opts: {
                button: InputAction.IA_POINTER,
                hoverText: "Call to go down",
                maxDistance: 8,
                showFeedback: true
              }
            },
            ()=>{
              elevator.elevatorManager.requestCall(i,false)
            }
          )
          
          let textDown = addNamedEntity("textDown"+i)
          Transform.create(textDown,{
            parent:buttonDown,
            position:Vector3.create(0,0,-0.6),
            rotation:Quaternion.fromEulerDegrees(0,0,0),
            scale:Vector3.create(1,1,1)
          })
          TextShape.create(textDown,{
            text: "v",
            fontSize: 5,
            textColor: Color4.Black()
          })
      }
  }



}





// Initialize scene asynchronously
async function initializeScene() {
  console.log('🚀 INITIALIZING C64 Museum Scene...')
  
  try {
    // Define the center position for the entire curved grid display
    const gridCenterPosition = Vector3.create(34, 7.2,38)
    

    // Angular ranges with 1° per row vertical separation
    const horizontalRangeStart = 180
    const horizontalRangeEnd = 360
    const verticalRangeStart = -1.0  // 1° per row: 3 rows = 2 gaps × 1° = 2° total span
    const verticalRangeEnd = 1.0     // Range: -1.0° to +1.0° = 2° total
    
    // Create single large curved grid with fixed ranges
    console.log('📊 Creating single curved grid...')
    const gridPlanes = await createSingleCurvedGrid(
      MUSEUM_CONFIG.PLANE_RADIUS,
      Vector3.create(MUSEUM_CONFIG.PLANE_SCALE, MUSEUM_CONFIG.PLANE_SCALE, MUSEUM_CONFIG.PLANE_SCALE),
      gridCenterPosition,
      horizontalRangeStart,
      horizontalRangeEnd,
      verticalRangeStart,
      verticalRangeEnd
    )
    
    console.log('✅ Scene initialized successfully!')
    console.log(`   Created ${gridPlanes.length} planes in a single curved grid`)
    console.log(`   Radius: ${MUSEUM_CONFIG.PLANE_RADIUS}m`)
    console.log(`   Angular coverage: ${horizontalRangeEnd - horizontalRangeStart}° horizontal, ${verticalRangeEnd - verticalRangeStart}° vertical`)
    
    // Initialize KNN material system after grid creation
    console.log('🎯 Initializing KNN Material System...')
    initializeKNNMaterialSystem()
    
    // Initialize filtering system after everything else is ready
    console.log('📊 Initializing filtering system...')
    initializeFiltering()
  } catch (error) {
    console.error('❌ Failed to initialize scene:', error)
  }
}
