////////////////////////////////////////////////////
// ElevatorManager
// (c) 2022 by Carl Fravel
// Handles the state machine, logic, events to elevator/scene, and MessageBus for ONE ELEVATOR PER INSTANCE of this class.
// I.e. if you have multiple elevators, give each a unique elevatorId, and instantiate an ElevatorManager for each one.
// Assumes that at scene startup the elevator is placed at the lowest floor, e.g. at G
// Upon startup, if ElevatorInfo.syncPlayers==true, it puts out a request for current state.
// If no answer within ElevatorInfo.startupSyncTimeout (increased by a reandom 50% more) it assumes this player is alone and becomes authoritative
////////////////////////////////////////////////////

/*
https://www.quora.com/How-fast-do-speed-elevators-go-on-average
Speed: 
    0.4 to 0.75 m/s (less than 1m/s) for hydraulics
    Up to about 3m/sec for cable driven elevators


https://phoenixmodularelevator.com/elevator-speed/#:~:text=Let's%20start%20with%20the%20turtle,buildings%2010%20stories%20or%20less.

When you push the button in any elevator, it doesn’t immediately blast off at 2.27 mph. 
If it did, most people would be knocked to the ground; the elevator has to ramp up to top speed. 
Acceleration and Jerk (rate of change of acceleration) are human comfort considerations that must be taken into account 
when looking at elevator speed. 
The practical limits (for math geeks) are 4 ft/sec^2 acceleration and 8 ft/sec^3 for jerk.
Keep in mind, these formulas represent the the very top limits of elevator movement and are aggressive but acceptable. 
Anything beyond these levels and the car becomes a roller-coaster or the Tower of Terror. 
To ensure a real smooth ride, technicians use around 70% of these levels.

https://www.quora.com/What-is-the-maximum-minimum-speed-of-elevators

[Acceleration bio tolerance] is 19.6m/s^2 to 29.4m/s^2.
*/

import {
    Vector3,
    Color3,
    Color4,
    Quaternion
} from '@dcl/sdk/math'

import { 
    engine,Entity,Transform,TransformTypeWithOptionals,
    Material,PBMaterial,PBMaterial_PbrMaterial,Texture,TextureUnion,
    TextShape, Font,
    MeshCollider, MeshRenderer, GltfContainer,
    pointerEventsSystem,InputAction, inputSystem,
    VideoPlayer, PBVideoPlayer,
    executeTask, EventSystemOptions, 
    NftFrameType,
    NftShape,
    PointerEventType,
} from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'

// import {ElevatorTestSystem} from "./ElevatorTester"
import { EventManager, EventConstructor} from './EventManager'


// LOG_VERBOSITY
// 0 => silent. Higher values log more.  Typical use is: 
// 1 reports warnings and errors.  
// 2 for light debugging.  
// 3 for deep tracing.  
let debugLevel = 1

export function debugLog1 (...args:any[]) {
  if (debugLevel >= 1) {
      console.log(...args)
  }
}

export function debugLog2 (...args:any[]) {
  if (debugLevel >= 2) {
    console.log(...args)
  }
}

export function debugLog3 (...args:any[]) {
  if (debugLevel >= 3) {
    console.log(...args)
  }
}

export enum ElevatorEventTypes {
    // MessageBus event types
    REQUEST_STATE="REQUEST_STATE", // ElevatorEventTypes,
    CURRENT_STATE="CURRENT_STATE", // ElevatorEventTypes
    REQUEST_OPEN_DOORS="REQUEST_OPEN_DOORS",
    REQUEST_GOTO_FLOOR="REQUEST_GOTO_FLOOR",
    REQUEST_CALL_FROM_FLOOR="REQUEST_CALL_FROM_FLOOR",
    DOORS_OPENED="DOORS_OPENED",

    // used by both MessageBus and EventManager
    DOORS_CLOSED="DOORS_CLOSED",


    // EventManager event types
    OPEN_DOORS="OPEN_DOORS",
    CLOSE_DOORS="CLOSE_DOORS",
    NEW_FLOOR="NEW_FLOOR",
    MOVEMENT_STARTED="MOVEMENT_STARTED",
    MOVE = "MOVE",
    MOVEMENT_STOPPED="MOVEMENT_STOPPED",
    RUN_TESTS="RUN_TESTS",
    TESTING_STARTED="TESTING_STARTED",
    TESTING_ENDED="TESTING_ENDED"
}

export enum ElevatorStates {
    STOPPED="STOPPED",  // stopped, doors closed, nothng being requested
    OPENING="OPENING",
    OPEN="OPEN",
    CLOSING="CLOSING",
    MOVING="MOVING"
}

export type ElevatorRequest = {
    requestedFloor:number
    requestedUp:boolean// field used only in CALL_FROM_FLOOR
}

export type ElevatorStatus = {
    // fields that contain the current state of the scene sending the event, may or may not be used by recipient
    state:string // ElevatorStates
    prevFloor:number
    currentFloor:number // floors are zero-based in the code
    nextFloor:number
    up:boolean
    doorOpenCountdown:number
    elevation:number // the sender's elevation
    requestedFloors:RequestedFloor[]
}

export type ElevatorEventData = {
    elevatorId:string
    event:string
    status:ElevatorStatus|null  // different events need state, request, elevatorManager, others may be null
    request:ElevatorRequest|null
    elevatorManager:ElevatorManager|null
    elevation:number|null // for MOVE event: new vertical position sent from manager to elevator implementation.
}

@EventConstructor()
export class ElevatorEvent {
    constructor(public id:string, public type:string, public data:ElevatorEventData) {}
}

export type ElevatorFloorInfo = {
    elevation:number // in meters above ground level
}

export type ElevatorInfo = {
    elevatorId:string // An arbitrary identifier for an elevator, so a scene can have more than one of them.  Returned in events.
    elevatorMessageBusChannel:string // needs to be unique in Decentraland for this scene.  UUID v1 recommended.
    floors:ElevatorFloorInfo[]
    doorOpenPeriod:number // how long to leave the door open before closing it.
    maxSpeed:number // m/second   2 is reasonable.
    groundFloorIsOne:boolean // true means floor UI displays are are 1,2,3 etc.   false means G,1,2 etc.
    syncPlayers:boolean
    sceneStartupDelay:number
    startupSyncTimeout:number // seconds to wait at startup before assuming player is alone in scene and authoritative
    testMode:true
}

export type RequestedFloor = {
    floor:number // for ease of debugging, have each floor also have its floor number
    requested:boolean
    up:boolean
    down:boolean
}




export class ElevatorManager {
    state:string
    prevFloor:number
    nextFloor:number
    currentFloor:number
    requestedFloors:RequestedFloor[]=[]
    up:boolean
    elevatorListeners:EventManager[] = []
    elevation:number
    doorOpenCountdown:number
    busy:number
    elevatorMesssageBus = new MessageBus()
    elevatorMessageBusChannel:string = "a95ba95c-19c4-11ed-861d-0242ac120002" // unique channel
    starting = true
    pendingDataRequestsReceived = 0
    startupTimer:ElevatorManagerStartupTimer|undefined = undefined
    provideDataTimer:ElevatorManagerProvideDataTimer|undefined = undefined
    randomSeed:number
    needToRequestSync:boolean = true

    constructor (public elevator:Entity, public elevatorInfo:ElevatorInfo) {
        theElevatorManagers.push(this) // other modules, such as test system, will use this global to find elevator managers, avoiding circular dependencies
        //Initialize a new elevator as being at ground floor, not moving, and the direction of movement would by default be up
        this.state = ElevatorStates.STOPPED
        this.prevFloor = 0
        this.nextFloor = 0
        this.currentFloor = 0
        this.up = true

        // Somewhat randomize the PseudoRandomNumber number generator, based on the milliseconds in the startup time 
        this.randomSeed = parseFloat(Date.now().toString().substr(10,3))
        debugLog3("*** RandomSeed = "+this.randomSeed)
        for (let i=0; i<= this.randomSeed; i++){
            let r = Math.random()
        }
        debugLog3(("*** First random number = "+Math.random()))

        for (let i=0; i < this.elevatorInfo.floors.length;i++){
            this.requestedFloors.push({
                floor:i,
                requested:false,
                up:false,
                down:false
            })
        }


        this.elevation = Transform.get(elevator).position.y
        this.doorOpenCountdown = 0
        this.busy = 0
        if (this.elevatorInfo.syncPlayers) {
            this.elevatorMesssageBus.on(this.elevatorMessageBusChannel,(data: ElevatorEventData) => {
                this.handleMessage(data)
            })
            debugLog2("*** Starting startup timer at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3))
            // this.startupTimer = new ElevatorManagerStartupTimer(this.elevatorInfo.startupSyncTimeout + (Math.random() * 0.5 * this.elevatorInfo.startupSyncTimeout), this)
            this.startupTimer = new ElevatorManagerStartupTimer(this.elevatorInfo.sceneStartupDelay, this.elevatorInfo.startupSyncTimeout + (Math.random() * this.elevatorInfo.startupSyncTimeout), this)
        }
    }

    /**
     * How elevator or scene regsters EventManagers to listen to events sent from this ElevatorManager
     * @param em 
     */
    addListener(em:EventManager){
        this.elevatorListeners.push(em)
    }

    /**
     * Obtains the text representation of floor.
     * Based on elevator.groundFloorIsOne the response for floors is either 1,2,3...  or G,1,2...
     * @param floor 
     * @returns 
     */
    getFloorText(floor:number){
        if (this.elevatorInfo.groundFloorIsOne) {
            return ""+(floor+1)
        }
        else if (floor == 0) {
            return "G"
        }
        else {
            return ""+floor
        }
    }

    /**
     * Called early in startup sequence to put out a request to other scenes to some other scene instance, if any, o provide elevator state.
     */
    requestState() {
        debugLog2("*** Sending REQUEST_STATE at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3))
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId, // enabling one scene event handler to handle multiple elevators in the scene.
            event:ElevatorEventTypes.REQUEST_STATE, // ElevatorEventTypes
            status:null,
            request:null,
            elevatorManager:null,
            elevation:null
        }
        this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel, data)
    }


    /////////////////////////////////////////
    // Requests from UI (doors, calls, goto)
    ////////////////////////////////////////////

    /**
     * The Elevator UI or test harness is requesting that the doors be opened
     * such as from the OpenDoors button inside the elevator
     */
     requestOpenDoors() {
        if (this.elevatorInfo.syncPlayers) {
            let data:ElevatorEventData = {
                elevatorId:this.elevatorInfo.elevatorId, // enabling one scene event handler to handle multiple elevators in the scene.
                event:ElevatorEventTypes.REQUEST_OPEN_DOORS, // ElevatorEventTypes
                status:null,
                request:null,
                elevatorManager:null,
                elevation:null
            }
            this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel,data)
        }
        else {
            this.openDoors()
        }
    }

    /**
     * The Elevator UI or test harness is requesting that the elevator be sent to some particular floor
     * such as from a floor button inside the elevator
     */
    requestGoto(i:number){
        if (this.elevatorInfo.syncPlayers) {
            let data:ElevatorEventData = {    
                elevatorId:this.elevatorInfo.elevatorId, // enabling one scene event handler to handle multiple elevators in the scene.
                event:ElevatorEventTypes.REQUEST_GOTO_FLOOR,
                status:null,
                request:{
                    requestedFloor:i,
                    // ignored in this case, calculated in each player scene instance
                    requestedUp:false 
    
                },
                elevatorManager:null,
                elevation:null
            }
            this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel,data)
        }
        else {
            this.goto(i)
        }
        
    }

    /**
     * The Building UI or test harness is requesting that the elevator be called to some particular floor
     * such as from an up or down button outside the elevator
     */
     requestCall(requestedFloor:number, requestedUp:boolean){
        debugLog2("\n*** requestCall(floor:"+requestedFloor+", requestedUp:"+requestedUp+")")
        if (this.elevatorInfo.syncPlayers) {
            let data:ElevatorEventData = {    
                elevatorId:this.elevatorInfo.elevatorId, // enabling one scene event handler to handle multiple elevators in the scene.
                event:ElevatorEventTypes.REQUEST_CALL_FROM_FLOOR,
                status:null,
                request: {
                    requestedFloor:requestedFloor,
                    requestedUp:requestedUp 
                },
                elevatorManager:null,
                elevation:null
            }
            this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel,data)
        }
        else {
            this.call(requestedFloor,requestedUp)
        }
        
    }
    
    /**
     * Called if this scene timed out waiting for some other scene to set this scene's state.
     * So it stops waiting, and assumes that its initial values for the elevator state are correct.
     */
    assumeAuthority() {
        // debugLog1("*** THIS ELEVATOR IS ASSUMING AUTHORITY ***")
        // debugLog2("*** ASSUMING AUTHORITY *** at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3))
        this.starting = false
        if (this.startupTimer) {
            this.startupTimer.active = false
        }
        this.provideAuthoritativeData()
    }

    /**
     * An "authoritative" (not starting up) Scene uses this to provide current state because a starting scene that requested it.
     */
    provideAuthoritativeData() {
        // debugLog2("*** Sending CURRENT_STATE")
        if (this.provideDataTimer){
            this.provideDataTimer.active = false
            this.provideDataTimer = undefined
        }
        this.pendingDataRequestsReceived = 0
        let data:ElevatorEventData = {
            event:ElevatorEventTypes.CURRENT_STATE,
            elevatorId:this.elevatorInfo.elevatorId,
            status: {
                state:this.state, // ElevatorStates
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors
            },
            request:null,
            elevatorManager:null,
            elevation:null
        }
        debugLog2("*** Sending CURRENT_STATE at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3)+"\n"+JSON.stringify(data))
        this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel, data)
    }

    /**
     * Scene should call this when doors have finished opening.
     * Normally this will be called after the scene has finished opening the doors in response to an ARRIVED event
     * This will be called within this class if no listeners were added.
     * If listeners are added, there must be a call beck to this once the door is open.
     */
    doorsOpened(){
        debugLog2 ("* * * doorOpened * * *" )
        this.state = ElevatorStates.OPEN
        this.doorOpenCountdown = this.elevatorInfo.doorOpenPeriod

        // there may be elevators that syncned during OPENING< so let tme know by message bus that other elevators have opened their doors
        let data:ElevatorEventData = {
            event:ElevatorEventTypes.DOORS_OPENED,
            elevatorId:this.elevatorInfo.elevatorId,
            status:null,
            request:null,
            elevatorManager:null,
            elevation:null
        }
        debugLog2("*** Sending DOORS_OPENED at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3)+"\n"+JSON.stringify(data))
        this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel, data)

    }

    /**
     * For "completeness" this method is here but does nothing, like in mot real elevators
     */
    requestCloseDoors() {
        // do nothing
    }

    /**
     * Scene should call this when doors have closed.
     * Normally this will be called after the scene has finished closing the doors in response to a CLOSEDOORS event.
     * This will be called within this class if no listeners were added.
     * If listeners are added, there must be a call beck to this once the door is closed.
     * There is an option boolean parameter that defaults to true (to invorm other scends that may be syncing up).
     * That should be called with false explicitly when it is this manager syncing up by closing doors due to inbound message.
     */
    doorsClosed(informOthers:boolean = true){
        this.busy++
        debugLog2 ("* * * doorClosed * * *" )
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:ElevatorEventTypes.DOORS_CLOSED,
            status:{
                state:this.state,
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors,
            },
            request:null,
            elevatorManager:this,
            elevation:null
        }
        this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, ElevatorEventTypes.DOORS_CLOSED, data))
        if (this.setNextFloor()) {
            this.up = (this.elevatorInfo.floors[this.nextFloor].elevation >= this.elevation)
            this.startMoving()
        }
        else {
            //this.state = ElevatorStates.STOPPED
            this.stopMoving()
            if (this.currentFloor == 0) {
                this.up = true
            }
            else if (this.currentFloor == this.requestedFloors.length -1) {
                this.up = false
            }
        }
        this.busy--

        if (informOthers){
            // there may be elevators that syncned during CLOSING so let tme know by message bus that other elevator instance have closed their doors
            data = {
                event:ElevatorEventTypes.DOORS_CLOSED,
                elevatorId:this.elevatorInfo.elevatorId,
                status:null,
                request:null,
                elevatorManager:null,
                elevation:null
            }
            debugLog2("*** Sending DOORS_CLOSED at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3)+"\n"+JSON.stringify(data))
            this.elevatorMesssageBus.emit(this.elevatorMessageBusChannel, data)
        }
    }

    runTests() {
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:ElevatorEventTypes.RUN_TESTS,
            status:{
                state:this.state,
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors,
            },
            request:null,
            elevatorManager:this,
            elevation:null
        }
        this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, ElevatorEventTypes.RUN_TESTS, data))
    }

    
    ////////////////////////////////////////////////////////
    // Private methods used within the ElevatorManager
    ////////////////////////////////////////////////////////


    /**
     * This starting-up scene has now heard from other active scene what the current elevator state is.
     * @param data 
     */
    private receivedCurrentStateFromAnAuthority(data: ElevatorStatus){
        this.starting=false
        if (this.startupTimer) {
            this.startupTimer.active = false
        }
        debugLog1("*** Received CURRENT_STATE at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3)+"\n"+JSON.stringify(data))
        
        this.state = data.state
        this.prevFloor = data.prevFloor
        this.currentFloor = data.currentFloor
        this.nextFloor = data.nextFloor
        this.elevation = data.elevation
        this.doorOpenCountdown = data.doorOpenCountdown
        this.up = data.up
        this.requestedFloors = data.requestedFloors
    }

    /**
     * Handle a button press that originalted "inside the elevator" to go to some floor
     * @param floor 
     */
    private goto(floor:number) {
        debugLog2("-- goto("+floor+")")
        let insert:boolean
        let up:boolean
        switch (this.state) {
            case ElevatorStates.STOPPED:
            case ElevatorStates.OPENING:
            case ElevatorStates.OPEN:
                insert = floor != this.currentFloor
                break
            case ElevatorStates.CLOSING:
                insert = true
                break
            case ElevatorStates.MOVING:
                insert = (
                    floor != this.currentFloor 
                    || (this.up && this.elevation > this.elevatorInfo.floors[this.currentFloor].elevation )
                    || (!this.up && this.elevation < this.elevatorInfo.floors[this.currentFloor].elevation )
                    )
                break
            default:
                debugLog1("ERROR: ElevatorManager goto: invalid state=", this.state)
                insert = false
                break
        }
        if (insert) {
            this.insertRequestedFloor(
                floor, 
                this.elevatorInfo.floors[floor].elevation > this.elevatorInfo.floors[this.currentFloor].elevation
            )
        }
        else {
            debugLog2("ElevatorManager goto("+floor+") ignored (it is the current floor)")
        }

        if (this.setNextFloor() && this.state == ElevatorStates.STOPPED) {
            this.up = (this.elevatorInfo.floors[this.nextFloor].elevation >= this.elevation)
            this.startMoving()
        }
    }


    /**
     * Handle a call from outside the elevator to go up or down
     * @param floor // where the call is coming from
     * @param up // whether the desired direction is up == true, or false == down.
     */
    private call(floor:number, up:boolean) {
        debugLog2("-- call("+floor+","+up+")")
        if (floor == this.currentFloor) {
            switch (this.state) {
                case ElevatorStates.STOPPED: // the elevator is here, but doors are closed, so open them
                    this.openDoors()
                    break
                case ElevatorStates.MOVING:
                    this.insertRequestedFloor(floor,up)
                    // if it is moving but hasn't arrived yet at current floor, you can this.setNextFloor (as the floor)
                    if ((this.up && (this.elevation < this.elevatorInfo.floors[this.currentFloor].elevation))
                    ||(!this.up && (this.elevation > this.elevatorInfo.floors[this.currentFloor].elevation))) {
                        this.setNextFloor()
                        this.up = (this.elevatorInfo.floors[this.nextFloor].elevation >= this.elevation)
                    }
                    break
                case ElevatorStates.OPENING:
                case ElevatorStates.OPEN:
                case ElevatorStates.CLOSING:
                    debugLog2("ElevatorManager call("+floor+","+up+") ignored (it is the current floor)")
                    break
                default:
                    debugLog1("ERROR ElevatorManager call: unknown state="+this.state)
                    break
            }
        }
        else {
            this.insertRequestedFloor(floor,up)
            if (this.setNextFloor() && this.state == ElevatorStates.STOPPED) {
                this.up = (this.elevatorInfo.floors[this.nextFloor].elevation >= this.elevation)
                this.startMoving()
            }
        }
    }

    /**
     * Send an event to any and all EventManagers that were added to this EventManager.
     * @param event 
     */
    fireEvent(event:ElevatorEvent) {
        for (let em of this.elevatorListeners) {
            em.fireEvent(event)
        }
    }

    /**
     * Cause the doors to open, either by informing listening EvenHandlers toopen the doors,
     * or, if no listeners, to just have this manager open the doors
     */
    openDoors() {
        debugLog2("----- openDoors called, state ="+this.state)
        switch (this.state) {
            case ElevatorStates.STOPPED:
                debugLog2("** OpenDoors ***")
                if (this.elevatorListeners.length > 0) {
                    debugLog2 ("FireEvent OPEN_DOORS")
                    this.state = ElevatorStates.OPENING
                    let data:ElevatorEventData = {
                        elevatorId:this.elevatorInfo.elevatorId,
                        event:ElevatorEventTypes.MOVEMENT_STARTED,
                        status:{
                            state:this.state,
                            prevFloor:this.prevFloor,
                            currentFloor:this.currentFloor,
                            nextFloor:this.nextFloor,
                            doorOpenCountdown:this.doorOpenCountdown,
                            elevation:this.elevation,
                            up:this.up,
                            requestedFloors:this.requestedFloors,
                        },
                        request:null,
                        elevatorManager:null,
                        elevation:null
                    }
                    this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, ElevatorEventTypes.OPEN_DOORS, data))
                }
                else {
                    // call this locally, because no event handler is going to call it.
                    this.doorsOpened()
                }
                break
            case ElevatorStates.OPEN:
                debugLog2("** KeepDoorsOpen ***")
                // reset the door open countdown timer if the door is open.
                this.doorOpenCountdown = this.elevatorInfo.doorOpenPeriod
                break
            default:
                // do nothing
                debugLog2("openDoors did nothing due to state being "+this.state)
                break
        }
    }    

    private closeDoors() {
        // do nothing
    } 
        

    /**
     * Put the elevator into the MOVING state.  
     * The state machine update() method will then  do the actual moving
     */
    private startMoving() {
        this.state = ElevatorStates.MOVING
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:ElevatorEventTypes.MOVEMENT_STARTED,
            status:{
                state:this.state,
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors,
            },
            request:null,
            elevatorManager:null,
            elevation:null
        }
        this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, ElevatorEventTypes.MOVEMENT_STARTED,data))
    }

    /**
     * Put the elevator into the STOPPED state.  
     * The state machine update() method will then determine what else, if anything, should occur next
     */
    stopMoving() {
        this.state = ElevatorStates.STOPPED
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:ElevatorEventTypes.MOVEMENT_STARTED,
            status:{
                state:this.state,
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors,
            },
            request:null,
            elevatorManager:null,
            elevation:null
        }
        this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, ElevatorEventTypes.MOVEMENT_STOPPED,data))
    }

    /**
     * Called when there is reason to think that the nextFloor may have changed
     * such as when doors are closed or there has been a requestFloor insertion
     * @returns boolean - whether there is another floor than this one to go to.
     */
    private setNextFloor():boolean {
        this.busy++
        debugLog2 ("******** setNextFloor going "+(this.up?"UP":"DOWN")+" from currentFloor="+this.currentFloor)
        if (!this.requestedFloors || this.requestedFloors.length == 0) {
            // there are no more requested floors, so stop moving
            debugLog2("findNextFloor: no more requested floors")
            this.busy--
            return false
        }
        // if (this.currentFloor == this.requestedFloorslength-1) {
        //     // we are at the highest floor in the request queue, so set the direction down
        //     debugLog2 ("-- at the highest requested floor so go down")
        //     this.up = false
        // }
        // else if (this.currentFloor == 0) {
        //     // we are at the lowest floor in the request queue, se set the dirction up
        //     debugLog2 ("-- at the lowested requested floor so go up")
        //     this.up = true
        // }
        if (this.up) { // going up
            debugLog3("setNextFloor 0")
            if (this.areThereHigherUps()) {
                // find the next higher up
                debugLog2("--there are higher ups")
                debugLog3("setNextFloor 1")
                for (let i=0; i<this.requestedFloors.length;i++) {
                    debugLog3("setNextFloor 2  i="+i)
                    if ((this.elevatorInfo.floors[i].elevation > this.elevation) && this.requestedFloors[i].requested && this.requestedFloors[i].up) {
                        debugLog3("setNextFloor 3")
                        this.nextFloor = i
                        debugLog2("-- nextFloor="+this.nextFloor+","+(this.up?"Up":"Down"))
                        debugLog3("setNextFloor 4")
                        this.busy--
                        return true
                    }
                }
                debugLog1("ERROR: ElevatorManager setNextFloor detected areThereHigherUps but didn't find one")
                this.busy--
                return false
            }
            else {
                debugLog2("--there are no more higher ups")
                debugLog3("setNextFloor 5 There are no higher ups")
                // no more higher ups, so find the highest floor requesting down, if any
                for (let i=this.requestedFloors.length-1; i>=0;i--) {
                    if (this.requestedFloors[i].requested && !this.requestedFloors[i].up){
                        this.nextFloor = i
                        this.up = false
                        debugLog2("-- nextFloor="+this.nextFloor+","+(this.up?"Up":"Down"))
                        this.busy--
                        return true
                    }
                }
                // no floors requesting down, so find the lowest floor requesting up
                for (let i=0; i<this.requestedFloors.length;i++) {
                    if (this.requestedFloors[i].requested && this.requestedFloors[i].up){
                        this.nextFloor = i
                        this.up = true
                        debugLog2("-- nextFloor="+this.nextFloor+","+(this.up?"Up":"Down"))
                        this.busy--
                        return true
                    }
                }
                debugLog2("ElevatorManage setNextFloor up: there are no more requested floors.")
                this.busy--
                return false
            }
        }
        else { // going down
            debugLog3("setNextFloor 10")
            if (this.areThereLowerDowns()) {
                debugLog2("--there are lower downs")
                debugLog3("setNextFloor 13")
                for (let i=this.requestedFloors.length-1; i>=0;i--) {
                    debugLog3("setNextFloor 14  i="+i)
                    // if (i < this.currentFloor && this.requestedFloors[i].requested && this.requestedFloors[i].down) {
                    if ((this.elevatorInfo.floors[i].elevation < this.elevation) && this.requestedFloors[i].requested && this.requestedFloors[i].down) {

                        debugLog3("setNextFloor 15")
                        this.nextFloor = i
                        debugLog2("-- nextFloor="+this.nextFloor+","+(this.up?"Up":"Down"))
                        debugLog3("setNextFloor 16")
                        this.busy--
                        return true
                    }
                }
                debugLog1("ERROR: ElevatorManager setNextFloor detected areThereThereLowerDowns but didn't find one")
                this.busy--
                return false
            }
            else {
                debugLog2("--there are no more lower downs")
                debugLog3("gotoNextRequestedFloorOrStop 5 There are no lower downs")
                // no more lower downs, so find the lowest floor requesting up, if any
                for (let i=0; i<this.requestedFloors.length;i++) {
                    if (this.requestedFloors[i].requested && this.requestedFloors[i].up){
                        this.nextFloor = i
                        this.up = true
                        debugLog2("-- nextFloor="+this.nextFloor+","+(this.up?"Up":"Down"))
                        this.busy--
                        return true
                    }
                }
                // no floors requesting up, so find the highest floor requesting down
                for (let i=this.requestedFloors.length-1; i>=0;i--) {
                    if (this.requestedFloors[i].requested && !this.requestedFloors[i].up){
                        this.nextFloor = i
                        this.up = false
                        debugLog2("-- nextFloor="+this.nextFloor+","+(this.up?"Up":"Down"))
                        this.busy--
                        return true
                    }
                }
                debugLog2("ElevatorManage setNextFloor down: there are no more requested floors.")
                this.busy--
                return false
            }
        }
    }

    /**
     * find out if there are "up"s in the requestedFloors collection that are above the current floor. 
     */
     private areThereHigherUps(){
        debugLog3("areThereHigherUps 1")
        for (let i=0; i<this.requestedFloors.length; i++) {
            debugLog3("areThereHigherUps 2")
            if ((this.elevatorInfo.floors[i].elevation > this.elevation) && this.requestedFloors[i].requested && this.requestedFloors[i].up) {
                debugLog3("areThereHigherUps 3")
                return true
            }
        }
        debugLog3("areThereHigherUps 4")
        return false
    }

    /**
     * find out if there are "downs"s in the requestedFloors collection that are below the current floor. 
     */
    private areThereLowerDowns() {
        debugLog3("areThereLowerDowns 1")
        for (let i=this.requestedFloors.length-1; i>=0; i--) {
            debugLog3("areThereLowerDowns 2")
            if ((this.elevatorInfo.floors[i].elevation < this.elevation) && this.requestedFloors[i].requested && !this.requestedFloors[i].up) {
                debugLog3("areThereLowerDowns 3")
                return true
            }
        }
        debugLog3("areThereLowerDowns 4")
        return false
    }


    /**
     * Called by goto() or call() to insert a floor into the requestedFloors collection
     * @param floor
     * @param up 
     */
    private insertRequestedFloor(floor:number,up:boolean) {
        if (this.requestedFloors.length == 0  || floor >= this.requestedFloors.length) {
            debugLog1("ERROR: ElevatorManager insertRequestedFloor: There weren't any floors into which to set a request")
            this.busy--
            return
        }
        this.busy++
        debugLog3 ("*** goto() 1")
        // set the requested floor to requested and set the up or down flag true
        this.requestedFloors[floor].requested=true
        if (up) {
            this.requestedFloors[floor].up = true 
        }
        else {
            this.requestedFloors[floor].down = true
        }
        debugLog2 ("*** INSERT("+floor+","+(up?"up":"down")+"): this.requestedFloors =" + JSON.stringify(this.requestedFloors))
        this.busy--
    }
    
    /**
     * Called after processing a requested floor (have gotten there) to remove it from the requestedFloors collection
     * @returns
     */
    removeFloorFromRequests(floor:number, up:boolean){
        debugLog2 ("Remove floor ("+floor+","+up+") from requests")
        this.busy++
        if (this.requestedFloors.length == 0 || floor >= this.requestedFloors.length) {
            debugLog1("ERROR: ElevatorManager removeCurrentFloorFromRequests: There weren't any requests form which to remove one")
            this.busy--
            return
        }
        for (let i=0; i < this.requestedFloors.length; i++) {
            if (i == floor) {
                if ((floor == 0) || (floor == this.requestedFloors.length-1)) {
                    this.requestedFloors[i].up = false
                    this.requestedFloors[i].down = false
                    this.requestedFloors[i].requested = false
                } else {
                    if (up) {
                        this.requestedFloors[i].up = false
                    }
                    else {
                        this.requestedFloors[i].down = false
                    }
                } 
                if (!this.requestedFloors[i].up && !this.requestedFloors[i].down) {
                    this.requestedFloors[i].requested = false 
                }
                debugLog2 ("*** REMOVE("+floor+","+(up?"up":"down")+") : this.requestedFloors =" + JSON.stringify(this.requestedFloors))
                this.busy--
                return
            }
        }
        debugLog2 ("removeCurrentFloorFromRequests didn't find current floor "+this.prevFloor)
        this.busy--
        return
    }

    
    /**
     * Returns the nearest floor in the direction of elevator movement.  May return the current floor.
     * IMPORTANT NOTE: coded assuming this is only called while elevator is moving
     * @returns 
     */
    nearestFloor() {
        if (this.up) { // going up
            if (this.currentFloor == this.elevatorInfo.floors.length-1) {
                return this.currentFloor
            }
            else {
                if (this.elevation > (this.elevatorInfo.floors[this.currentFloor].elevation+this.elevatorInfo.floors[this.currentFloor+1].elevation)/2) {
                    return this.currentFloor+1
                }
                else return this.currentFloor
            }
        }
        else { // going down
            if (this.currentFloor == 0) {
                return this.currentFloor
            }
            else {
                if (this.elevation < (this.elevatorInfo.floors[this.currentFloor].elevation+this.elevatorInfo.floors[this.currentFloor-1].elevation)/2) {
                    return this.currentFloor-1
                }
                else return this.currentFloor
            }
        }
    }
    
    
    /**
     * Called when the elevator has crossed the midpoint from one floor to another, 
     * to generate an event to the Elevator that the floor has changed, 
     * e.g. for its floor display and/or sound
     */
    fireNewFloorEvent() {
        // send message to elevator / building.  Maybe bell rings, maybe indicator of floor/direction is updated, at least in elevator
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:ElevatorEventTypes.NEW_FLOOR,
            status:{
                state:this.state,
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors,
            },
            request:null,
            elevatorManager:null,
            elevation:null
        }
        this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, ElevatorEventTypes.NEW_FLOOR, data))
    }

    getStateString(){
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:ElevatorEventTypes.NEW_FLOOR,
            status:{
                state:this.state,
                prevFloor:this.prevFloor,
                currentFloor:this.currentFloor,
                nextFloor:this.nextFloor,
                doorOpenCountdown:this.doorOpenCountdown,
                elevation:this.elevation,
                up:this.up,
                requestedFloors:this.requestedFloors,
            },
            request:null,
            elevatorManager:null,
            elevation:null
        }
        return JSON.stringify(data)
    }

    /**
     * Handle messages from MessageBus that we will receive 
     * and need to process if we are in multiplayer sync mode
     * @param data 
     * @returns 
     */
    private handleMessage (data: ElevatorEventData):void {

        debugLog2("*** Received "+data.event+" message at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3)+"  starting = "+this.starting)

        if (data.elevatorId != this.elevatorInfo.elevatorId) {
            // this is a message from another ElevatorManager instance
            debugLog2("*** I am ElevatorManager("+this.elevatorInfo.elevatorId+"), and received message from a different ElevatorManager instance ("+data.elevatorId+"), ignoring it.")
            return
        }

        if (this.starting) {
            // when starting, this is the only event type to heed
            if (data.event == ElevatorEventTypes.CURRENT_STATE) {
                debugLog2("*** Received CURRENT_STATE message while starting, so calling receivedCurrentStateFromAnAuthority")
                if (data.status){
                    this.receivedCurrentStateFromAnAuthority(data.status)
                }
                else {
                    debugLog1 ("ERROR: ElevatorManager messageHandler CURRENT_STATE data lacks state data")
                }
            }
            return
        } else {
            // if we are here, we are not starting
            switch (data.event) {
                case ElevatorEventTypes.CURRENT_STATE:
                    // this or some other authority has answered the request, so dicontinue timer for this instance to answer
                    debugLog2("*** Received CURRENT_STATE message while not starting")
                    if (this.provideDataTimer) {
                        debugLog2("***** Remove provdeDataTimer, some other scene answered")
                        this.provideDataTimer.active = false
                        this.provideDataTimer = undefined
                        this.pendingDataRequestsReceived = 0
                    }
                    break
                case ElevatorEventTypes.REQUEST_STATE:
                        // This instance could be the authority to answer
                        // but wait for a random amount of time, up to 1/4 of the min startup sync wait
                        // this will hopefully reduce the number of replies to near 1 from among multiple authoritive players
                        debugLog2("*** Received REQUEST_STATE message while not starting, so initiated provideDataTimer")
                        this.pendingDataRequestsReceived++
                        this.provideDataTimer= new ElevatorManagerProvideDataTimer(Math.random(), this)
                        elevatorManagerProvideDataTimers.push(this.provideDataTimer)
                        this.pendingDataRequestsReceived = 0
                    break
                case ElevatorEventTypes.REQUEST_OPEN_DOORS:
                    this.openDoors()
                    break
                case ElevatorEventTypes.REQUEST_GOTO_FLOOR:
                    if (data.request) {
                        this.goto(data.request.requestedFloor)
                        debugLog2("*** REQUEST_GOTO_FLOOR produced state:\n"+this.getStateString())
                    }
                    else {
                        debugLog1("ERROR: ElevatorManager messageHandler REQUEST_GOTO_FLOOR data lacks request data")
                    }
                    break
                case ElevatorEventTypes.REQUEST_CALL_FROM_FLOOR:
                    if (data.request) {
                        this.call(data.request.requestedFloor,data.request.requestedUp)
                        debugLog2("*** REQUEST_CALL_FROM_FLOOR produced state:\n"+this.getStateString())
                    }
                    else {
                        debugLog1("ERROR: ElevatorManager messageHandler REQUEST_CALL_FROM_FLOOR data lacks request data")
                    }
                    break
                case ElevatorEventTypes.DOORS_OPENED:
                    if (this.state == ElevatorStates.OPENING) {
                        // handle case where this elevator is syncing up and got an initial current state
                        // of OPENING but thie syncing-up Elevator instance isn't actually opening,
                        // so we need to jump this syncing-up ElevatorManager to OPEN state.
                        this.state = ElevatorStates.OPEN
                        this.doorOpenCountdown = this.elevatorInfo.doorOpenPeriod
                    }
                    break
                case ElevatorEventTypes.DOORS_CLOSED:
                    if (this.state == ElevatorStates.CLOSING) {
                        // handle case where this elevator is syncing up and got an initial current state
                        // of CLOSING but thie syncing-up Elevator instance isn't actually closing,
                        // so we need to jump this syncing-up ElevatorManager to next state.
                        this.doorsClosed(false)
                    }
                    break
                default:
                    debugLog1("ERROR: ElevatorManagere messageHandler received an uknown event type="+data.event)
                    break
            }
        }
    }

    

    injectDependency(dependencyInitializer: ElevatorDependent){
        dependencyInitializer(this)
    }
    
    underTest(testing:boolean) {
        let type:string = testing?ElevatorEventTypes.TESTING_STARTED:ElevatorEventTypes.TESTING_ENDED
        let data:ElevatorEventData = {
            elevatorId:this.elevatorInfo.elevatorId,
            event:type,
            status:null,
            request:null,
            elevatorManager:this,
            elevation:null
        }
        this.fireEvent(new ElevatorEvent(this.elevatorInfo.elevatorId, type, data))
    }
}

export type ElevatorDependent = ((elevatorManager:ElevatorManager)=>void)

// export let elevatorDependents:ElevatorDependent[] = []


////////////////////////////////////////////
// Startup Timer(s) 
////////////////////////////////////////////
let elevatorManagerStartupTimers:ElevatorManagerStartupTimer[]=[]

class ElevatorManagerStartupTimer {
    phase = 1
    active = true
    constructor(public sceneStartupDelay:number, public startupSyncTimeout:number, public elevatorManager:ElevatorManager) {
        elevatorManagerStartupTimers.push(this)
    }
    
}

function updateElevatorStartupTimers (dt:number){
    for (let timer of elevatorManagerStartupTimers) {
        if (timer.active) {
            switch (timer.phase) {
                case 1:
                    timer.sceneStartupDelay -= dt
                    if (timer.sceneStartupDelay <= 0) {
                        timer.phase = 2
                        if (timer.elevatorManager.needToRequestSync){
                            timer.elevatorManager.needToRequestSync = false
                            debugLog2 ("*** ElevatorManagerStartupTimer completed scene loading delay at "+Date.now().toString().substr(8,2)+"."+Date.now().toString().substr(10,3))
                            timer.elevatorManager.requestState()
                        }
                    }
                    break
                case 2:
                    if (timer.startupSyncTimeout > 0){
                        timer.startupSyncTimeout -= dt
                    }
                    else {
                        timer.elevatorManager.assumeAuthority()
                    }
                    break
            }
            // // discard the first few updates, as they may have very long dts
            // if (timer.count < 2 ) {
            //     timer.count++
            //     return
            // }
            // timer.count++
            // if (timer.count)
            // if (timer.elevatorManager.needToRequestSync){
            //     timer.elevatorManager.needToRequestSync = false
            //     timer.elevatorManager.requestState()
            // }
            // if (timer.duration > 0){
            //     timer.duration -= dt
            // }
            // else {
            //     timer.elevatorManager.assumeAuthority()
            // }
        }
    }
}
engine.addSystem(updateElevatorStartupTimers)


////////////////////////////////////////////
// Timer(s) for providing Authoritive Data
////////////////////////////////////////////
let elevatorManagerProvideDataTimers:ElevatorManagerProvideDataTimer[]=[]

export class ElevatorManagerProvideDataTimer {
    active = true
    constructor(public duration:number, public elevatorManager:ElevatorManager) {
        elevatorManagerProvideDataTimers.push(this)
    }
}

function updateElevatorManagerProvideDataTimers (dt:number){
    for (let timer of elevatorManagerProvideDataTimers) {
        if (timer.active) {
            if (timer.duration > 0){
                timer.duration -= dt
            }
            else {
                timer.elevatorManager.provideAuthoritativeData()
            }
        }
    }
}

engine.addSystem(updateElevatorManagerProvideDataTimers)


//////////////////////////////////////////////
// Main Elevator State Machine (System) loop
//////////////////////////////////////////////
export let theElevatorManagers:ElevatorManager[]=[]

function elevatorsUpdater(dt:number) {   // This ISystem update method is called 30 times/second by the DCL "engine"
    for (let elevator of theElevatorManagers) {
        debugLog3 ("\n-- update: "+(elevator.busy > 0 ?"BUSY "+elevator.busy : (elevator.state+" "+(elevator.up?"UP":"DOWN")+" PREV:"+elevator.prevFloor+" CURRENT:"+elevator.currentFloor+" NEXT:"+elevator.nextFloor+"\nRequests="+JSON.stringify(elevator.requestedFloors))))
        if (elevator.busy>0) {
            return
        }
        switch (elevator.state){
            case ElevatorStates.STOPPED:
            case ElevatorStates.OPENING:
            case ElevatorStates.CLOSING:
                    // do nothing
                break
            case ElevatorStates.OPEN:
                elevator.doorOpenCountdown -= dt
                if (elevator.doorOpenCountdown <= 0) {
                    elevator.doorOpenCountdown = 0
                    if (elevator.elevatorListeners.length > 0) {
                        debugLog3 ("FireEvent CLOSE DOORS")
                        let data:ElevatorEventData = {
                            elevatorId:elevator.elevatorInfo.elevatorId,
                            event:ElevatorEventTypes.MOVEMENT_STARTED,
                            status: {
                                state:elevator.state,
                                prevFloor:elevator.prevFloor,
                                currentFloor:elevator.currentFloor,
                                nextFloor:elevator.nextFloor,
                                doorOpenCountdown:elevator.doorOpenCountdown,
                                elevation:elevator.elevation,
                                up:elevator.up,
                                requestedFloors:elevator.requestedFloors
                            },
                            request:null,
                            elevatorManager:null,
                            elevation:null
                        }
                        elevator.state = ElevatorStates.CLOSING
                        elevator.fireEvent(new ElevatorEvent(elevator.elevatorInfo.elevatorId,ElevatorEventTypes.CLOSE_DOORS, data))
                            // elevator implementation's event handler must call doorClosed() whewn doors have closed
                    }
                    else {
                        // immediately call this locally, because no event handler is going to call it.
                        elevator.stopMoving() // doorClosed() will result in its being set moving if there are other requested floors
                        elevator.doorsClosed()
                    }
                }
                break
            case ElevatorStates.MOVING:
                elevator.elevation += (elevator.up?1:-1) * dt * elevator.elevatorInfo.maxSpeed
                let data:ElevatorEventData = {
                    elevatorId:elevator.elevatorInfo.elevatorId,
                    event:ElevatorEventTypes.MOVEMENT_STARTED,
                    status: {
                        state:elevator.state,
                        prevFloor:elevator.prevFloor,
                        currentFloor:elevator.currentFloor,
                        nextFloor:elevator.nextFloor,
                        doorOpenCountdown:elevator.doorOpenCountdown,
                        elevation:elevator.elevation,
                        up:elevator.up,
                        requestedFloors:elevator.requestedFloors
                    },
                    request:null,
                    elevatorManager:null,
                    elevation:elevator.elevation
                }
                elevator.fireEvent(new ElevatorEvent(elevator.elevatorInfo.elevatorId,ElevatorEventTypes.MOVE, data))
                    // elevator implementation's event handler must move the elevator carriage to this new elevation
                let currFlr:number = elevator.nearestFloor()
                if (currFlr != elevator.currentFloor) {
                    elevator.currentFloor = currFlr
                    elevator.fireNewFloorEvent()
                }
                let nextFloorElevation = elevator.elevatorInfo.floors[elevator.nextFloor].elevation
                if ((elevator.up && elevator.elevation >= nextFloorElevation) || (!elevator.up && elevator.elevation <= nextFloorElevation)) {
                    // we have arrived at the next stop.
                    debugLog2("update: stop and adjust")
                    elevator.stopMoving()
                    elevator.elevation = nextFloorElevation // do any fine adjustment needed on the elevation.
                    elevator.prevFloor = elevator.nextFloor // nextFloor is this new floor so set previous floor to it now
                    elevator.removeFloorFromRequests(elevator.prevFloor, elevator.up)
                    elevator.openDoors()
                }
                break
            default:
                debugLog1("ERROR: ElevatorManager update received unexpected state: "+elevator.state)
                break
        }
    }
}
engine.addSystem(elevatorsUpdater)
