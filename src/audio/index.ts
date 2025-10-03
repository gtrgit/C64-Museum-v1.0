import { engine, AudioStream, Entity } from '@dcl/sdk/ecs'

let audioStreamEntity: Entity | null = null
let currentVolume = 0.2
let isPlaying = true

export function setupAudioStream() {
  audioStreamEntity = engine.addEntity()

  AudioStream.create(audioStreamEntity, {
    url: 'https://kohina.brona.dk/icecast/stream.ogg',
    playing: isPlaying,
    volume: currentVolume,
  })

  return audioStreamEntity
}

export function setAudioVolume(volume: number) {
  currentVolume = Math.max(0, Math.min(1, volume))
  if (audioStreamEntity && AudioStream.has(audioStreamEntity)) {
    const audioStream = AudioStream.getMutable(audioStreamEntity)
    audioStream.volume = currentVolume
  }
}

export function toggleAudioPlayback() {
  isPlaying = !isPlaying
  if (audioStreamEntity && AudioStream.has(audioStreamEntity)) {
    const audioStream = AudioStream.getMutable(audioStreamEntity)
    audioStream.playing = isPlaying
  }
  return isPlaying
}

export function getAudioState() {
  return {
    volume: currentVolume,
    isPlaying: isPlaying
  }
}