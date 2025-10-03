import { inputSystem, InputAction } from '@dcl/sdk/ecs'

// Track if an input field is focused
let isInputFocused = false

export function setInputFocused(focused: boolean) {
  isInputFocused = focused
}

export function getInputFocused(): boolean {
  return isInputFocused
}

// Prevent chat from opening when typing in input fields
export function inputHandlerSystem(dt: number) {
  // DISABLED: This was causing player movement issues
  // The input button workaround is sufficient for now
  // TODO: Implement proper input focus detection without interfering with player controls
  return
}