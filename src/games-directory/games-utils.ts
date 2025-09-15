import { Vector3, Quaternion } from '@dcl/sdk/math'

export function getRandomHexColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Circle configuration
// Note: All positions are calculated relative to origin (0,0,0) since planes are children of parent entities
// The actual world position is controlled by the parent entity transform in factory.ts
// Radius is now passed from museumConfig.ts, no default needed

// Calculate position on circle given angle in degrees and radius
// 0° = North (12 o'clock), 90° = East (3 o'clock), 180° = South (6 o'clock), 270° = West (9 o'clock)
export function getPositionOnCircle(angleDegrees: number, radius: number): Vector3 {
  // Adjust so 0° points North instead of East by subtracting 90°
  const adjustedAngle = angleDegrees - 90
  const angleRadians = (adjustedAngle * Math.PI) / 180
  const x = radius * Math.cos(angleRadians)
  const z = radius * Math.sin(angleRadians)
  return Vector3.create(x, 0, z) // Relative to origin
}

// Calculate position on both horizontal and vertical circles
// Horizontal: 0° = North (12 o'clock), 90° = East (3 o'clock), etc.
// Vertical: 0° = level, positive = up, negative = down
export function getPositionOnCurvedGrid(
  horizontalAngleDegrees: number, 
  verticalAngleDegrees: number, 
  radius: number
): Vector3 {
  // Adjust horizontal angle so 0° points North instead of East
  const adjustedHorizontal = horizontalAngleDegrees - 90
  const hAngleRad = (adjustedHorizontal * Math.PI) / 180
  const vAngleRad = (verticalAngleDegrees * Math.PI) / 180
  
  // Calculate position considering both angles
  // Vertical angle affects Y position and reduces the horizontal radius
  const horizontalRadius = radius * Math.cos(vAngleRad)
  const x = horizontalRadius * Math.cos(hAngleRad)
  const y = radius * Math.sin(vAngleRad)
  const z = horizontalRadius * Math.sin(hAngleRad)
  
  return Vector3.create(x, y, z) // Relative to origin
}

// Calculate rotation to face the center of the circle
export function getRotationFacingCenter(position: Vector3): Quaternion {
  // When planes are children of a parent entity, they should face the origin (0,0,0) in local space
  // This is because their positions are relative to the parent
  const localCenter = Vector3.create(0, 0, 0)
  
  // Calculate direction from position to local center
  const direction = Vector3.subtract(localCenter, position)
  // Normalize the direction
  const normalizedDir = Vector3.normalize(direction)
  
  // Calculate horizontal angle (yaw)
  const yaw = Math.atan2(normalizedDir.x, normalizedDir.z)
  
  // Calculate vertical angle (pitch)
  const horizontalDistance = Math.sqrt(normalizedDir.x * normalizedDir.x + normalizedDir.z * normalizedDir.z)
  const pitch = Math.atan2(-normalizedDir.y, horizontalDistance)
  
  // Create quaternion rotation
  return Quaternion.fromEulerDegrees(pitch * 180 / Math.PI, yaw * 180 / Math.PI, 0)
}

