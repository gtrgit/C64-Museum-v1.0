///////////////////////////////////////////////
// Elevator Test System
//////////////////////////////////////////////

import {ElevatorManager, ElevatorEvent, ElevatorEventTypes, ElevatorDependent, theElevatorManagers} from "./ElevatorManager"
// import {DCLPlayer, DCLPlayerUserDataEvent} from "./DCLPlayer"
import { EventManager, EventConstructor } from "./EventManager"
// import {GuestBook} from "./GuestBook"

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

type ElevatorTestStep = {
    floor:number 
    method:number    // 0 is goto, 1 is call down, 2 is call up    
    delay:number
}


// Test Automation scripts
// Method:  0 is goto, 1 is call down, 2 is call up   

type ElevatorTestScript = {
    name:string
    level:number // 0 = disabled, 1 = smoketest, 2 = thorough
    steps:ElevatorTestStep[]
    expected:number[] // expected order of doors opening
}

type ElevatorTestResult = {
    script: ElevatorTestScript
    results:number[] // actual order of doors opening
    passed: boolean
    message:string
}

export class ElevatorTestSystem {
    // control constants
    active:boolean = false
    TEST_LEVEL=2 // default test level
    DELAY_FOR_COMPLETION=30 // default duration to wait after last commend for elevator motion to complete before timing out as a failed test
                            // temp value until we calculate it from the floors
    testsRunning:boolean = false
    elevatorManager:ElevatorManager|null = null
    level:number=this.TEST_LEVEL // by default we'll use the const that is also the default for the call to the startTests method
    testScripts:ElevatorTestScript[] = testScripts // property in this module code.
    testResults:ElevatorTestResult[] = []
    testIndex:number = 0
    stepIndex:number = 0
    currentTest:ElevatorTestScript|null = null
    currentStep:ElevatorTestStep|null = null
    doorListener = new EventManager()

    delaying = false
    delayCountdown:number = 0
    busy:number = 0
    TESTSTATE_EXECUTING = "EXECUTING"
    TESTSTATE_AWAITING_COMPLETION = "AWAITING_COMPLETION"
    TESTSTATE_UNKNOWN_WAITING_STATE = "UNKNOWN_WAITING_STATE"
    waitingMode = this.TESTSTATE_UNKNOWN_WAITING_STATE

    constructor(){
        elevatorTestSystems.push(this)
        this.doorListener.addListener(ElevatorEvent,null,({id,type,data})=>{
            switch (type) {
                case ElevatorEventTypes.RUN_TESTS:
                    debugLog2("RECEIVED RUN TEST EVENT")
                    if (data.elevatorManager) {
                        this.elevatorManager = data.elevatorManager
                        this.startTesting()
                    }
                    break
                case ElevatorEventTypes.OPEN_DOORS:
                    debugLog2("ElevatorTester got OPEN_DOOR")
                    break
                case ElevatorEventTypes.CLOSE_DOORS:
                    debugLog2("ElevatorTester got CLOSE_DOOR")
                    break
                case ElevatorEventTypes.DOORS_CLOSED:
                    debugLog2("ElevatorTester got DOORS_CLOSED")
                    if (data.status && this.testsRunning) {
                        this.logDoorClosed(data.status.currentFloor)
                    }
                    break
                case ElevatorEventTypes.MOVEMENT_STOPPED:  // todo zzz this event is arriving perhaps for each coor close?
                    debugLog2("ElevatorTester got MOVEMENT_STOPPED")
                    let message:string = ""
                    if (this.currentTest && (this.stepIndex >= this.currentTest.steps.length-1) && !this.areThereMoreRequestedFloors()) {
                        if (this.delaying && (this.waitingMode == this.TESTSTATE_AWAITING_COMPLETION)) {
                            message = "ElevatorTester ElevatorEvent Movement Stopped after "+(this.DELAY_FOR_COMPLETION-this.delayCountdown)+" seconds of "+this.waitingMode+", calling processEndOfTest"
                            debugLog2(message)
                        }
                        else {
                            let delay:string = "undefined"
                            if (this.currentTest) {
                                delay = ""+this.currentTest.steps[this.stepIndex].delay
                            }
                            message = "ElevatorTester ElevatorEvent Movement Stopped with no more requested floors, calling processEndOfTest after a final step["+this.stepIndex+"] delay of "+delay+" seconds"
                            debugLog2(message)
                        }
                        this.processEndOfTest(message)
                    }
                    break
            }            
        })
    }

    areThereMoreRequestedFloors():boolean {
        if (!this.elevatorManager) {
            debugLog1 ("ERROR: ElevatorTester areThereMoreRequestedFloors: null elevatorManager")
            return false
        }
        else {
            // if (this.elevatorManager) {
                debugLog2 ("\n-- areThereMoreRequestedFloors: "+(this.elevatorManager.state+" "+(this.elevatorManager.up?"UP":"DOWN")+" PREV:"+this.elevatorManager.prevFloor+" CURRENT:"+this.elevatorManager.currentFloor+" NEXT:"+this.elevatorManager.nextFloor+"\nRequests="+JSON.stringify(this.elevatorManager.requestedFloors)))
            // }
            for (let i = 0; i < this.elevatorManager.requestedFloors.length-1;i++) {
                if (this.elevatorManager.requestedFloors[i].requested) {
                    return true
                }
            }
        }
        debugLog2("ElevatorTester areThereMoreRequestedFloors didn't find any more floor requests")
        return false
    }

    /**
     * This is a callback from ElevatorManager, which knows there may be dependent modules that need its instance,
     * but otherwise those dependent modules areopaque to the Elevator Manager.
     * See more notes at bottom of this file about such dependency arrangements.
     * @param elevatorManager 
     */
    setElevatorManager(elevatorManager:ElevatorManager) {
        this.elevatorManager = elevatorManager
        this.DELAY_FOR_COMPLETION = 11 * this.elevatorManager.elevatorInfo.floors.length
        this.elevatorManager.addListener(this.doorListener)
    }

    startOneTest(testIndex:number){
        debugLog2("========= Begin test["+testIndex+"]  "+this.testScripts[testIndex].name)
        if (!this.testScripts || testIndex > this.testScripts.length-1) {
            debugLog1("ERROR: ElevatorTester: this.testScripts is null or length is only "+this.testScripts.length)
            debugLog3("ElevatorTester startOneTest 1")
            return
        }
        this.currentTest = this.testScripts[testIndex]
        let testResultInit:ElevatorTestResult = {
            script:this.currentTest,
            results:[],
            passed:false,
            message:""
        }
        this.testResults.push(testResultInit)
        this.testResults[testIndex].results=[]
        this.stepIndex = 0
        this.delaying = false
        if (!this.currentTest || this.currentTest.steps.length < 1) {
            debugLog1("ERROR: ElevatorTester: this.currentTest has no steps")
            return 
        }
        this.currentStep = this.currentTest.steps[this.stepIndex]
        this.executeCurrentTestStep()  // do the first step, and then begin the post-delays.  further steps run in update() method.
        this.active = true
        debugLog3("ElevatorTester startOneTest 99")
    }

    executeCurrentTestStep() {
        debugLog3("ElevatorTester executeCurrentTestStep 0")
        if (this.currentStep && this.elevatorManager) {
            switch (this.currentStep.method) {
                case 0: // goto
                    this.elevatorManager.requestGoto(this.currentStep.floor)
                    break
                case 1: // call down
                this.elevatorManager.requestCall(this.currentStep.floor, false)
                    break
                case 2: // call up
                this.elevatorManager.requestCall(this.currentStep.floor, true)
                    break
                default:
                    debugLog1("ERROR: Tester executeCurrentTestStep invalid case = "+this.currentStep.method)
                    break
            }
            this.delayCountdown = this.currentStep.delay
            this.delaying = true
            this.waitingMode = this.TESTSTATE_EXECUTING
        }
        debugLog3("ElevatorTester executeCurrentTestStep 99")
    }

    startTesting(level:number=this.TEST_LEVEL) {
        this.testsRunning = true
        this.testResults = []
        this.testIndex = 0
        this.stepIndex = 0
        this.currentTest = null
        this.currentStep = null
        if (this.elevatorManager) this.elevatorManager.underTest(true)
        this.level = level
        if (!this.elevatorManager) {
            debugLog1("ERROR: ElevatorTester startTests didn't receive an ElevatorManager")
            return
        }
       // todo zzz limit the run to tests lf level <= to the level parameter
       this.startOneTest(0)
    }

    logDoorClosed(floor:number) {
        debugLog2("* * * ElevatorTester logDoorClosed("+floor+")")
        this.testResults[this.testIndex].results.push(floor)
        // debugLog3("ElevatorTester logDoorOpen 99")
    }

    determineTestResult(testIndex:number, message:string) {
        this.testResults[testIndex].script = this.testScripts[testIndex] // record the test as run
        this.testResults[testIndex].passed = (JSON.stringify(this.testResults[testIndex].results) == JSON.stringify(this.testScripts[testIndex].expected))
        this.testResults[testIndex].message = message
    }

    reportAllResults(){
        debugLog1("\n===== Report for all tests =====")
        for (let i=0; i < this.testResults.length; i++){
            this.reportOneResult(i,true)
        }
    }
    reportOneResult(testIndex:number, enabled:boolean=false){
        if (enabled){
            let message = "\nResult: Test["+testIndex+"] "+(this.testResults[testIndex].passed?"PASSED":"FAILED")+" "+this.testResults[testIndex].script.name
        
            if (this.testResults[testIndex].passed) {
                message += "\nActuals == Expected:\n"+this.testResults[testIndex].results
            }
            else {
                message += "\nExpected:\n"+this.testResults[testIndex].script.expected+"\nActuals:\n"+this.testResults[testIndex].results
            }
            message += "\n"+this.testResults[testIndex].message
            message += "\n------------------------------"
            debugLog1(message)
        }
    }
    
    
    processEndOfTest(message:string){
        debugLog2("ElevatorTester processOneTestEnded for test "+this.testIndex)
        this.delaying = false
        this.waitingMode = this.TESTSTATE_UNKNOWN_WAITING_STATE
        this.active = false
        this.determineTestResult(this.testIndex, message)
        this.reportOneResult(this.testIndex, debugLevel>1)
        if (this.testIndex < this.testScripts.length-1) {
            this.testIndex++
            this.startOneTest(this.testIndex)
        }
        else {
            debugLog2("ElevatorTester all tests have completed, final test was "+this.testIndex)
            // all tests have been run, so do the end stuff
            this.testsRunning = false
            if (this.elevatorManager) this.elevatorManager.underTest(false)
            this.reportAllResults()
            // guestBook?.post("Elevator Test Results", this.testResults)
        }
    }
}

let elevatorTestSystems:ElevatorTestSystem[] = []

function elevatorTestSystemUpdater (dt:number){
    for (let testSystem of elevatorTestSystems) {
        if (testSystem.active) {
            if (testSystem.busy > 0) {
                return
            }
            if (testSystem.delaying) {
                testSystem.delayCountdown -= dt
                if (testSystem.delayCountdown <= 0){
                    testSystem.busy++
                    switch (testSystem.waitingMode) {
                        case testSystem.TESTSTATE_UNKNOWN_WAITING_STATE:
                            debugLog1("ElevatorTester update with state = "+testSystem.waitingMode)
                            break
                        case testSystem.TESTSTATE_EXECUTING:
                            // the most recent test step (goto or call) has been executed.
                            testSystem.delaying = false
                            if (testSystem.currentTest && (testSystem.stepIndex < testSystem.currentTest.steps.length-1)) {
                                // there is another step to executed
                                testSystem.stepIndex++
                                debugLog3("ElevatorTester update stepIndex = "+testSystem.stepIndex)
                                testSystem.currentStep = testSystem.currentTest.steps[testSystem.stepIndex]
                                testSystem.executeCurrentTestStep()
                            } else {
                                let delay:string = "undefined"
                                if (testSystem.currentTest) {
                                    delay = ""+testSystem.currentTest.steps[testSystem.stepIndex].delay
                                }
                                debugLog2("ElevatorTested update changing to "+testSystem.TESTSTATE_AWAITING_COMPLETION+" after a final step delay of "+delay+" seconds")
                                if (testSystem.elevatorManager) {
                                    debugLog2 ("\n-- update: "+(testSystem.elevatorManager.state+" "+(testSystem.elevatorManager.up?"UP":"DOWN")+" PREV:"+testSystem.elevatorManager.prevFloor+" CURRENT:"+testSystem.elevatorManager.currentFloor+" NEXT:"+testSystem.elevatorManager.nextFloor+"\nRequests="+JSON.stringify(testSystem.elevatorManager.requestedFloors)))
                                }
                                // current test has ended, switch to waiting for all the motion to complete and final door close/STOPPED
                                testSystem.waitingMode = testSystem.TESTSTATE_AWAITING_COMPLETION
                                // testSystem.delayCountdown = testSystem.DELAY_FOR_COMPLETION // should be plenty long enough for 
                                // Set the AWAITING COMPLETION to be the delay listed for after the last step.
                                // testSystem.delayCountdown = testSystem.testScripts[testSystem.testIndex].steps[testSystem.testScripts[testSystem.testIndex].steps.length-1].delay 
                                testSystem.delayCountdown = testSystem.DELAY_FOR_COMPLETION
                                testSystem.delaying = true
                            }
                            break
                        case testSystem.TESTSTATE_AWAITING_COMPLETION:
                            let message:string = "ElevatorTested update "+testSystem.waitingMode+" timed out after "+testSystem.DELAY_FOR_COMPLETION+" seconds"
                            debugLog2(message)
                            // we have waited testSystem.DELAY_FOR_COMPLETION seconds without receiving indication that elevator has stopped.
                            // probably an error
                            testSystem.processEndOfTest(message)
                            break
                    }
                    testSystem.busy--
                }
            }
        }

    }
    
}



let testScripts:ElevatorTestScript[] = []

////////////////////////////
// NOTES about Test SCripts:
// 1. the delay for each step occurs after the goto/call method is executed, before the next step.
// 2. it is ok for buttons to be rapidly pressed, like with delays of only 0.1 second after them
// 3. However, you can provide, in the delay of the last step, at least enough time for the elevator to complete its movement to final location
//    If enough time isn't provided in the final delay for the test to complete, there will be another delay used of
//    this.DELAY_FOR_COMPLETION to see if it can complete.
// 4. After defining an "actual" result sequence, observe the test and if the behavior is different, but correct, change the actuals.
//    For estimating the final delay, calculate the entire durationlk using 3 secs/floor for travel, and 8 for a door open, hold, and close sequence.
//    Then make sure that the final delay accounts for the time that isn't already included in the delays of earlier steps.
////////////////////////////

testScripts.push(
    {
        name:"Test0",
        level:2,
        steps:[
            {floor:0, method: 2, delay:14.5}, // Be sure it is idle on 0 to start, by calling it to 0 and waiting long enough for it to come down from 5 and then cycle the door
        ],
        expected:[0]
    }
)


testScripts.push(
    {
        name:"Test1a - 4s",
        level:2,
        steps:[
            {floor:0, method: 2, delay:5}, // Be sure it is idle on 0 to start
                                            // two peiple get in, one requests floor 1.  
            {floor:1, method:0,delay:7},  // wait long enough for it to have closed and started moving up, but not halfway yet
                                            // the second person, after a few seconds, request to bo back to floor 0
            {floor:0, method:0,delay:1}, // this call to 0 should get recorded, but it doesn't.
        ],
        expected:[0,1,0]
    }
)

testScripts.push(
    {
        name:"Test1b - 6s",
        level:2,
        steps:[
            {floor:0, method: 2, delay:2}, // Be sure it is idle on 0 to start
            {floor:1, method:0,delay:6},  // wait long enough for it to have closed and started moving up, but not halfway yet
            {floor:0, method:0,delay:0.1}, // this call to 0 should get recorded, but it doesn't.
        ],
        expected:[0,1,0]
    }
)


testScripts.push(
    {
        name:"Test1c - 8s",
        level:2,
        steps:[
            {floor:0, method: 2, delay:2}, // Be sure it is idle on 0 to start
            {floor:1, method:0,delay:8},  // wait long enough for it to have closed and started moving up, but not halfway yet
            {floor:0, method:0,delay:14}, // this call to 0 should get recorded, but it doesn't.
        ],
        expected:[0,1,0]
    }
)

testScripts.push(
    {
        name:"Test2",
        level:2,
        steps:[
            {floor:0, method: 2, delay:0.1}, // Be sure it is idle on 0 to start.
            {floor:1, method:0,delay:0.1}, // three passengers get in, one requests 1, one requests 5.
            {floor:5, method:0,delay:8},   // after 8 seconds of movement, 
            {floor:0, method:0,delay:35},  // the third passenger requests to go back to floor 0.
            // expected Open doors at 0, 1, 5, 0
            // actual   1, jumps to 0, 5
        ],
        expected:[0,1,5,0]
    }
)


testScripts.push(
    {
        name:"Test3",
        level:2,
        steps:[
            // Be sure it is idle on 0 to start
            //{floor:0, method:2,delay:0.1}, // call down at 1  // including this eliminates the immediate initial jump to 1
            {floor:1, method:1,delay:0.1}, // call down at 1
            {floor:2, method:2,delay:0.1}, // call up at 2
            {floor:3, method:1,delay:0.1}, // call down at 3
            {floor:4, method:2,delay:0.1}, // call up at 4
            {floor:5, method:1,delay:0.1}, // call down at 5
            {floor:0, method:0,delay:57}, // goto 0
            
            // expected up: (don't opendoors on 0), 2, 4, 5, down 3, 1, 0
            // actual:  immediately jumps up to 1 open/cose, 2, 4, jumps to 5, 3
        ],
        expected:[2,4,5,3,1,0]
    }
)

testScripts.push(
    {
        name:"Test4",
        level:2,
        steps:[
            // Be sure it is idle on 0 to start
            {floor:5, method:1,delay:0.1}, // call down at 5
            {floor:1, method:2,delay:0.1}, // call up at 1
            {floor:4, method:1,delay:0.1}, // call down at 4
            {floor:3, method:2,delay:0.1}, // call up at 3
            {floor:2, method:1,delay:0.1}, // call down at 2
            {floor:0, method:0,delay:20}, // goto 0
        
           
            // expected: up 1, 3, 5, 4, 2, 0 
            // 1st actual: jump 5, jump 1,  3,  jump 4, 2  FIXED
            // 2nd actual: runs ok once, but then won't run a socond time   FIXED [request-rework fe89846

        ],
        expected:[1,3,5,4,2,0]
    }
)


testScripts.push(
    {
        name:"Test5",
        level:2,
        steps:[
            // Be sure it is idle on 0 to start
            {floor:5, method:0,delay:0.1}, // goto 5
            {floor:4, method:0,delay:0.1}, // goto 4
            {floor:3, method:0,delay:0.1}, // goto 3
            {floor:2, method:0,delay:0.1}, // goto 2
            {floor:1, method:0,delay:0.1}, // goto 1
            {floor:0, method:0,delay:20}, // goto 0
            // expected:  1, 2, 3, 4, 5, 0
        ],
        expected:[1,2,3,4,5,0]
    }
)


let elevatorTester = new ElevatorTestSystem()



// This is an example of how two mutually-dependent modules can avoid dependency cycles.
// Have module A import module B. 
//   In this case ElevatorTester (A) uses exports from ElevatorManager (B).
// This will typically be because A needs much from B, but B should be largely ignorant of A.
// 1. Have B set up an exported array of its class instantiaion instances
// 2. Have A pass a call back to a method on B   The callback should have just one parameter of type B.
// 3. Have B make a simple callback to any such methods it is handed, just sending its "this" as the parameter.
// 4. Have A process that callback by storing the B's this in A's class variables.
// 5. Now A can call methods on instance(s) of B, for example to register an event listener.
// 6. Data and effects can flow from B to A using Event listeners or a MessageBus

/**
 * 
 * @param elevatorManager 
 */
export let elevatorTesterIntializer:ElevatorDependent = ((elevatorManager:ElevatorManager) => {
    elevatorTester.setElevatorManager(elevatorManager)
})

/**
 * Here is where we find one or more elevator manager instances, 
 * and call a method on it that will call the above function with the instance ptoiner of that ElevatorManager
 */
if (theElevatorManagers && theElevatorManagers.length > 0) {
    theElevatorManagers[0].injectDependency(elevatorTesterIntializer)
}

// let guestBook:GuestBook|undefined = undefined

// ////////////// DCLPlayer  //////////////////
// let em = new EventManager()
// em.addListener(DCLPlayerUserDataEvent, null, ({dclPlayer}) => {
//     // debugLog2("userData =", dclPlayer.userData)
//     // debugLog2("camera.position =", Camera.instance.position)
//     // debugLog2("realm =", dclPlayer.realm)
//     // Now take actions that should not be taken until dclPlayer has had ist fields instialized
//     configureScene()
// })
// let dclPlayer = new DCLPlayer(em, 1, false)

// function configureScene() {
//     guestBook = new GuestBook(dclPlayer)
// }