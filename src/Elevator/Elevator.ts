//////////////////////////////////////////////
// Demo Elevator
// (c) 2023 by Carl Fravel
//////////////////////////////////////////////

import {
    Vector3,
    Color4,
    Quaternion
} from '@dcl/sdk/math'
  
import {
    engine,Entity,Transform,
    Material,PBMaterial_PbrMaterial,
    TextShape, 
    MeshCollider, MeshRenderer, 
    pointerEventsSystem,InputAction, AudioSource
} from '@dcl/sdk/ecs'

import { addNamedEntity } from './SpawnerFunctions'
import { EventManager } from "./EventManager"
import { ElevatorManager, ElevatorInfo, ElevatorEvent, ElevatorEventTypes } from "./ElevatorManager";

let debugLevel = 1 // 0 => silent. Higher values log more.  Tyipical use is: 1 reports warnings and errors.  2 for light debugging.  3 for deep tracing.  
export function setDebugLevel(level:number) {
    debugLevel = level
}

function debugLog1 (...args:any[]) {
    if (debugLevel >= 1) {
        console.log(...args)
    }
}

function debugLog2 (...args:any[]) {
    if (debugLevel >= 2) {
        console.log(...args)
    }
}

function debugLog3 (...args:any[]) {
  if (debugLevel >= 3) {
    console.log(...args)
  }
}

//////////////////////////////////////////////
// Demo Elevator
//////////////////////////////////////////////

/**
 * This holds information that is used by the ElevatorDoorAnimator to know the range and direction of motion
 * for animating one or more doors
 */
export type ElevatorDoorsInfo = {
    door:Entity, 
    startX:number, 
    endX:number, 
    openDirection:number
}


export class Elevator{
    rootEntity:Entity
    // left and right wall, panel and door names are as seen from outside the door, looking into the elevator
    floor?:ElevatorSurface
    backWall?:ElevatorSurface
    leftWall?:ElevatorSurface
    rightWall?:ElevatorSurface
    // ceiling:Entity
    leftPanel?:ElevatorSurface
    rightPanel?:ElevatorSurface
    leftDoor?:ElevatorSurface // initially in closed position
    rightDoor?:ElevatorSurface // initially in closed position
    // panel's x is also as seen from outside looking in, and, like other entities on the near (door), are rotated 180
    controlUi?:ElevatorControlPanel
    
    elevatorDoorsData?:ElevatorDoorsInfo[]

    elevatorDoorOpenClip?:string
    elevatorDoorCloseClip?:string
    elevatorMovementClip?:string
    elevatorDingClip?:string
    openDoorAudioSourceEntity?:Entity
    closeDoorAudioSourceEntity?:Entity
    movementAudioSourceEntity?:Entity
    dingAudioSourceEntity?:Entity

    // elevatorDoorOpenSource = new AudioSource(this.elevatorDoorOpenClip)
    // elevatorDoorCloseSource = new AudioSource(this.elevatorDoorCloseClip)
    // elevatorMovementSource = new AudioSource(this.elevatorMovementClip)
    
    elevatorManager:ElevatorManager

    elevatorDoorsAnimator?:ElevatorDoorsAnimator

    elevatorListener = new EventManager()

    doorMtl?:PBMaterial_PbrMaterial
    wallMtl?:PBMaterial_PbrMaterial

    constructor(parent:Entity, x:number,y:number, z:number,  rX:number, rY:number, rZ:number, sX:number, sY:number, sZ:number, public elevatorInfo:ElevatorInfo) {
        this.rootEntity = addNamedEntity("elevatorRootEntity_"+this.elevatorInfo.elevatorId)
        Transform.create(this.rootEntity,{
            parent:parent,
            position: Vector3.create(x,y,z),
            rotation: Quaternion.fromEulerDegrees(rX,rY,rZ),
            scale: Vector3.create(sX,sY,sZ)
        })
        this.createWallMaterial()
        this.createDoorMaterial()
        this.createCarriage()
        this.createInnerDoors()
        this.setupElevatorDoorsAnimator()
        this.elevatorManager = new ElevatorManager(this.rootEntity, this.elevatorInfo)
        this.createControls()
        this.setupSounds( // openDoor, closeDoor, movement, ding
            (this.leftDoor)?this.leftDoor.rootEntity:undefined,
            (this.rightDoor)?this.rightDoor.rootEntity:undefined,
            (this.leftPanel)?this.leftPanel.rootEntity:undefined,
            (this.controlUi)?this.controlUi.rootEntity:undefined
        )
        this.setupEventHandling()        
    }

    createWallMaterial() {
        this.wallMtl = {
            albedoColor: Color4.create(0.5,0.3,0,0.6),
            roughness: 1,
            metallic: 0
        }
    }

    createDoorMaterial() {
        this.doorMtl = {
            albedoColor: Color4.create(0.9,0.9,0.9,1),
            roughness: 0.1,
            metallic: 1
        }
    }

    createCarriage () {
        this.floor = new ElevatorSurface(this.rootEntity,  0,0,0, 0,0,0, 2,.01,2)
        this.backWall = new ElevatorSurface(this.rootEntity,  0,1.5,1, 90,0,0, 2,.01,3)
        this.leftWall = new ElevatorSurface(this.rootEntity,  -1,1.5,0, 90,-90,0, 2,.01,3)
        this.rightWall = new ElevatorSurface(this.rootEntity,  1,1.5,0, 90,90,0, 2,.01,3)
        // ceiling:Entity
        this.leftPanel = new ElevatorSurface(this.rootEntity,  -0.725,1.5,-1, 90,180,0, 0.55,.01,3)
        this.rightPanel = new ElevatorSurface(this.rootEntity,  0.725,1.5,-1, 90,180,0, 0.55,.01,3)

        if (this.wallMtl) {
            Material.setPbrMaterial(this.floor.rootEntity, this.wallMtl)
            Material.setPbrMaterial(this.backWall.rootEntity, this.wallMtl)
            Material.setPbrMaterial(this.rightWall.rootEntity, this.wallMtl)
            Material.setPbrMaterial(this.leftWall.rootEntity, this.wallMtl)
        }
        if (this.doorMtl) {
            Material.setPbrMaterial(this.leftPanel.rootEntity, this.doorMtl)
            Material.setPbrMaterial(this.rightPanel.rootEntity, this.doorMtl)
        }
    }

    createInnerDoors() {
        this.leftDoor = new ElevatorSurface(this.rootEntity,  -0.25,1.5,-1, 90,180,0, 0.5,.009,3) // initially in closed position
        this.rightDoor = new ElevatorSurface(this.rootEntity,  0.25,1.5,-1, 90,180,0, 0.5,.009,3) // initially in closed position
        if (this.doorMtl) {
            Material.setPbrMaterial(this.leftDoor.rootEntity, this.doorMtl)
            Material.setPbrMaterial(this.rightDoor.rootEntity, this.doorMtl)
        }
        this.elevatorDoorsData = [
            {door:this.leftDoor.rootEntity, startX:-0.25, endX:-0.73,openDirection:-1},
            {door:this.rightDoor.rootEntity, startX:0.25, endX:0.73,openDirection:1}
        ]
        this.elevatorDoorsAnimator = new ElevatorDoorsAnimator(this, this.elevatorDoorsData)
    }

    setupElevatorDoorsAnimator() {
        if (this.elevatorDoorsData) {
            this.elevatorDoorsAnimator = new ElevatorDoorsAnimator(this, this.elevatorDoorsData)
        }
    }
    createControls() {
        this.controlUi = new ElevatorControlPanel(this, this.rootEntity, -0.75,1.8,-0.95, 0,180,0, 1,1,1, this.elevatorInfo.floors.length)
    }

    setupSounds( // openDoor, closeDoor, movement, ding
        openDoorAudioSourceEntity:Entity|undefined, 
        closeDoorAudioSourceEntity:Entity|undefined, 
        movementAudioSourceEntity:Entity|undefined, 
        dingAudioSourceEntity:Entity|undefined)
    {
        if (openDoorAudioSourceEntity) {
            this.openDoorAudioSourceEntity = openDoorAudioSourceEntity
            this.elevatorDoorOpenClip = "sounds/ElevatorDoorOpen.mp3"
            AudioSource.create(this.openDoorAudioSourceEntity, {
                audioClipUrl: this.elevatorDoorOpenClip,
                loop: false,
                playing: false,
            })
        }
        else {
            debugLog1("\n*** openDoorAudioSourceEntity isn't defined")
        }
        if (closeDoorAudioSourceEntity) {
            this.closeDoorAudioSourceEntity = closeDoorAudioSourceEntity
            this.elevatorDoorCloseClip = "sounds/ElevatorDoorClose.mp3"
            AudioSource.create(this.closeDoorAudioSourceEntity, {
                audioClipUrl: this.elevatorDoorCloseClip,
                loop: false,
                playing: false,
            })
        }
        else {
            debugLog1("\n*** closeDoorAudioSourceEntity isn't defined")
        }
        if (movementAudioSourceEntity) {
            this.movementAudioSourceEntity = movementAudioSourceEntity
            this.elevatorMovementClip = "sounds/ElevatorMovement.mp3"
            AudioSource.create(this.movementAudioSourceEntity, {
                audioClipUrl: this.elevatorMovementClip,
                loop: true,
                playing: false,
                volume: 1
            })
        }
        else {
            debugLog1("\n*** movementAudioSourceEntity isn't defined")
        }
        if (dingAudioSourceEntity) {
            this.dingAudioSourceEntity = dingAudioSourceEntity
            this.elevatorDingClip = "sounds/ElevatorDing.mp3"
            AudioSource.create(dingAudioSourceEntity,{
                audioClipUrl: this.elevatorDingClip,
                loop: false,
                playing: false,
                volume: 0.3
    
            })
        }
        else {
            debugLog1("\n*** dingAudioSourceEntity isn't defined")
        }
    }

    playOpeningSound() {
        if (this.openDoorAudioSourceEntity) {
            let as = AudioSource.getMutable(this.openDoorAudioSourceEntity)
            as.playing = false
            as.playing = true
        }
    }

    playClosingSound() {
        if (this.closeDoorAudioSourceEntity) {
            let as = AudioSource.getMutable(this.closeDoorAudioSourceEntity)
            as.playing = false
            as.playing = true
        }
    }

    playMovementSound(play:boolean) {
        if (this.movementAudioSourceEntity) {
            let as = AudioSource.getMutable(this.movementAudioSourceEntity)
            if (play) {
                as.playing = false
            }
            as.playing = play
        }
    }

    playNewFloorDing() {
        if (this.dingAudioSourceEntity) {
            let as = AudioSource.getMutable(this.dingAudioSourceEntity)
            as.playing = false
            as.playing = true
        }
    }

    setupEventHandling() {
        ///////////////////////////////////////////
        // Optional event handling
        // If no event menager(s) are added to the ElevatorManager.addListener, then the ElevatorManager will handle doorsOpened() and doorsClosed() internally
        // If you add an listener, then it must handle the OPEN_DOORS and CLOSE_DOORS events by at least calling doorsOpened() and doorsClosed() after anything else it does.
        // Handling the NEW_FLOOR event is optional, but can be used to play a sound, or set  elevator floor indicators outside the elevator
        ////////////////////////////////////////////

        this.elevatorListener.addListener(ElevatorEvent,null,({id,type,data})=>{
            if (data.elevatorId != this.elevatorInfo.elevatorId) {
                debugLog1("ERROR: Elevator Event for wrong elevatorId = "+data.elevatorId)
                return
            }
            switch (type) {
                case ElevatorEventTypes.OPEN_DOORS:
                    // open the doors
                    if (this.elevatorDoorsAnimator) {
                        this.elevatorDoorsAnimator.doorState=ElevatorDoorStates.OPENING
                    }
                    // initiate door opening sound
                    this.playOpeningSound()
                    break
                case ElevatorEventTypes.CLOSE_DOORS:
                    // close the doors
                    if (this.elevatorDoorsAnimator) {
                        this.elevatorDoorsAnimator.doorState=ElevatorDoorStates.CLOSING
                    }
                    // initiate door closing sound
                    this.playClosingSound()
                    break
                case ElevatorEventTypes.DOORS_CLOSED:
                    // The doors closed.
                    // base Elevator need do nothing, but a scene might close outer elevator doors on this event
                    break
                case ElevatorEventTypes.NEW_FLOOR:
                    // play sound
                    this.playNewFloorDing()
                    // update the floor display in the elevator
                    if (data.status && this.controlUi) {
                        TextShape.getMutable(this.controlUi.floorIndicator).text = this.elevatorManager.getFloorText(data.status.currentFloor)
                    }
                    else {
                        debugLog1("ERROR Elevator Event Listener got NEW_FLOOR but missing data.state or this.panel")
                    }
                    break
                case ElevatorEventTypes.MOVEMENT_STARTED:
                    this.playMovementSound(true)
                    break
                case ElevatorEventTypes.MOVE:
                    if (data.elevation != null) {
                        Transform.getMutable(this.rootEntity).position.y = data.elevation
                    }
                    else {
                        debugLog1("\n*** Elevator MOVE event received with null elevation")
                    }
                    break
                case ElevatorEventTypes.MOVEMENT_STOPPED:
                    this.playMovementSound(false)
                    break
                case ElevatorEventTypes.RUN_TESTS:
                case ElevatorEventTypes.TESTING_STARTED:
                case ElevatorEventTypes.TESTING_ENDED:
                    // silently do nothing, these are valid events for an optional test system, which in example scene are handled in scene code
                    break
                default:
                    debugLog1("Demo Elevator - Elevator Event for unknown event type = "+type)
                    break
            }
        })
        this.elevatorManager.addListener(this.elevatorListener)
    }
}

/**
 * This is common code for creating the floor and walls etc of the Elevator
 */
export class ElevatorSurface {
    rootEntity:Entity
    constructor(parent:Entity, x:number,y:number, z:number,  rX:number, rY:number, rZ:number, sX:number, sY:number, sZ:number) {
        this.rootEntity = addNamedEntity("ElevatorSurface")
        Transform.create(this.rootEntity, {
            parent: parent,
            position: Vector3.create(x,y,z),
            rotation:Quaternion.fromEulerDegrees(rX,rY,rZ),
            scale: Vector3.create(sX,sY,sZ)
        })
        MeshRenderer.setBox(this.rootEntity)
        MeshCollider.setBox(this.rootEntity)
    }
}

/**
 * This defines an example control panel for an elevator
 */
export class ElevatorControlPanel{
    rootEntity = addNamedEntity("ElevatorControlPanel")
    // Create AudioClip object, holding audio file
    elevatorDingClip = "sounds/ElevatorDing.mp3"
    panel = addNamedEntity("ElevatorControlPanel.panel")
    floorIndicator:Entity

    constructor(public elevator:Elevator, parent: Entity, x:number,y:number, z:number,  rX:number, rY:number, rZ:number, sX:number, sY:number, sZ:number, numFloors:number) {
        this.rootEntity = addNamedEntity("ElevatorControlPanel")
        Transform.create(this.rootEntity,{
            parent: parent,
            position: Vector3.create(x,y,z),
            rotation:Quaternion.fromEulerDegrees(rX,rY,rZ),
            scale: Vector3.create(sX,sY,sZ)
        })
        MeshRenderer.setBox(this.panel)
        MeshCollider.setBox(this.panel)
        Transform.create(this.panel, {
            parent: this.rootEntity,
            position: Vector3.create(0,0,0), 
            rotation:Quaternion.fromEulerDegrees(0,0,0),
            scale: Vector3.create(0.25,1.1,0.05)
        })
        Material.setPbrMaterial(this.panel,{
            albedoColor: Color4.Black()
        })

        let openButton = addNamedEntity("openButton")
        Transform.create(openButton,{
            parent: this.rootEntity,
            position: Vector3.create(0,-0.3,-0.05), 
            rotation: Quaternion.fromEulerDegrees(0,0,0), 
            scale: Vector3.create(0.06,0.06,0.01) 
        })
        MeshRenderer.setBox(openButton)
        MeshCollider.setBox(openButton)
        let buttonMtl:PBMaterial_PbrMaterial = {
            emissiveColor: Color4.White(),
            emissiveIntensity: 1
        }
        Material.setPbrMaterial(openButton, buttonMtl)
        pointerEventsSystem.onPointerDown(
            { 
                entity: openButton,
                opts: {
                    button: InputAction.IA_POINTER,
                    hoverText:"Open Doors",
                    maxDistance: 16,
                    showFeedback: true
                }
            },
            ()=>{
                this.elevator.elevatorManager.requestOpenDoors() // in-elevator request to go to a floor
            }
        )
        let openButtonText = addNamedEntity("openButtonText")
        Transform.create(openButtonText,{
            parent: openButton,
            position: Vector3.create(0,0,-0.7),
            rotation: Quaternion.fromEulerDegrees(0,0,0),
            scale: Vector3.create(1,1,1)
        })
        TextShape.create(openButtonText,{
            text: "<|>",
            fontSize: 8,
            textColor: Color4.Black()
        })

        for (let i=0; i<numFloors; i++) {
            let button = addNamedEntity("floorButton")
            Transform.create(button, {
                parent: this.rootEntity,
                position: Vector3.create(0,-0.15+i*0.1,-0.05), 
                rotation: Quaternion.fromEulerDegrees(0,0,0), 
                scale: Vector3.create(0.06,0.06,0.01)
            })
            MeshRenderer.setBox(button)
            MeshCollider.setBox(button)
            Material.setPbrMaterial(button, buttonMtl)
            pointerEventsSystem.onPointerDown(
                { 
                    entity: button,
                    opts: {
                        button: InputAction.IA_POINTER,
                        hoverText: this.elevator.elevatorManager.getFloorText(i),
                        maxDistance: 16,
                        showFeedback: true
                    }
                },
                ()=>{
                    this.elevator.elevatorManager.requestGoto(i) // in-elevator request to go to a floor
                }
            )

            let buttonText = addNamedEntity("buttonText")
            Transform.create(buttonText, {
                parent: button,
                position: Vector3.create(0,0,-0.7),
                rotation: Quaternion.fromEulerDegrees(0,0,0),
                scale: Vector3.create(1,1,1)
            })
            TextShape.create(buttonText, {
                text: this.elevator.elevatorManager.getFloorText(i),
                fontSize: 8,
                textColor: Color4.Black()
            })
        }

        this.floorIndicator = addNamedEntity("floorIndicator")
        Transform.create(this.floorIndicator, {
            parent: this.rootEntity,
            position: Vector3.create(0,0.458,-0.04),
            rotation: Quaternion.fromEulerDegrees(0,0,0),
            scale: Vector3.create(1,1,1)  
        })
        TextShape.create(this.floorIndicator,{
            text: this.elevator.elevatorManager.getFloorText(0),
            fontSize: 1,
            textColor: Color4.Red()
        })
    }
}


/////////////////////////////////////////////
// Elevator Doors Management
////////////////////////////////////////////

export enum ElevatorDoorStates {
    CLOSED="CLOSED",
    OPENING="OPENING",
    OPEN="OPEN",
    CLOSING="CLOSING"
}

let elevatorDoorsAnimators:ElevatorDoorsAnimator[] = []

class ElevatorDoorsAnimator{
    doorState:string = ElevatorDoorStates.CLOSED
    doorSpeed:number = .5 // meters per second door movement speed

    constructor(public elevator:Elevator, public elevatorDoorsData:ElevatorDoorsInfo[]) {
        elevatorDoorsAnimators.push(this)
    }
}

function doorAnimationUpdater(dt:number){
    for (let animator of elevatorDoorsAnimators) {
        switch (animator.doorState) {
            case ElevatorDoorStates.CLOSED:
                // do nothing
                break
            case ElevatorDoorStates.OPENING:
                for (let i in animator.elevator.elevatorDoorsData) {
                    // let p = animator.elevator.elevatorDoorsData[i].door.getComponent(Transform).position
                    let p = Transform.getMutable(animator.elevator.elevatorDoorsData[+i].door).position
                    let dir = animator.elevator.elevatorDoorsData[+i].openDirection
                    let endX = animator.elevator.elevatorDoorsData[+i].endX
                    if ((+i == 0) && ((dir==1)?p.x>=endX:p.x<=endX ) ) {
                        animator.doorState=ElevatorDoorStates.OPEN
                        animator.elevator.elevatorManager.doorsOpened()
                    } 
                    else {
                        p.x += dt * dir * animator.doorSpeed 
                    }
                }
                break
            case ElevatorDoorStates.OPEN:
                // do nothing
                break
            case ElevatorDoorStates.CLOSING:
                for (let i in animator.elevator.elevatorDoorsData) {
                    let p = Transform.getMutable(animator.elevator.elevatorDoorsData[+i].door).position
                    let dir = -animator.elevator.elevatorDoorsData[+i].openDirection
                    let startX = animator.elevator.elevatorDoorsData[+i].startX
                    if ((+i == 0) && ((dir==-1)?p.x<=startX:p.x>=startX ) ) {
                        animator.doorState=ElevatorDoorStates.CLOSED
                        animator.elevator.elevatorManager.doorsClosed()
                        // p.x -= dt/2 * dir * animator.doorSpeed   
                    }
                    else {
                        p.x += dt * dir * animator.doorSpeed   
                    }
                }
                break
            default:
                debugLog1("ERROR: ElevatorDoorAnimator: unknown doorState="+animator.doorState)
        }
    }
}
engine.addSystem(doorAnimationUpdater)
