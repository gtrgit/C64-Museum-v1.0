import { ReactEcs, UiEntity, Label, Button, Input } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { setAudioVolume, toggleAudioPlayback, getAudioState } from './index'

export function AudioControlUI() {
  const audioState = getAudioState()
  const volume = Math.round(audioState.volume * 100)
  const isPlaying = audioState.isPlaying

  const handleVolumeChange = (value: string) => {
    const numValue = parseInt(value) || 0
    const clampedValue = Math.max(0, Math.min(100, numValue))
    setAudioVolume(clampedValue / 100)
  }

  const handleToggle = () => {
    toggleAudioPlayback()
  }

  return (
    <UiEntity
      uiTransform={{
        width: 200,
        height: 120,
        position: { right: '20px', top: '50%' },
        positionType: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
        margin: { top: -60 }
      }}
      uiBackground={{
        color: Color4.create(0.1, 0.1, 0.1, 0.9)
      }}
    >
      <Label
        value="Radio Stream"
        fontSize={16}
        color={Color4.White()}
        uiTransform={{
          width: '100%',
          height: 20,
          margin: { bottom: 10 }
        }}
      />

      <Button
        value={isPlaying ? 'ON' : 'OFF'}
        fontSize={14}
        variant="primary"
        uiTransform={{
          width: '100%',
          height: 30,
          margin: { bottom: 10 }
        }}
        onMouseDown={handleToggle}
        uiBackground={{
          color: isPlaying ? Color4.Green() : Color4.Red()
        }}
      />

      <Label
        value={`Volume: ${volume}%`}
        fontSize={14}
        color={Color4.White()}
        uiTransform={{
          width: '100%',
          height: 20
        }}
      />

      <UiEntity
        uiTransform={{
          width: '100%',
          height: 30,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Button
          value="-"
          fontSize={14}
          variant="secondary"
          uiTransform={{
            width: 30,
            height: 25
          }}
          onMouseDown={() => handleVolumeChange((volume - 10).toString())}
        />

        <Input
          value={volume.toString()}
          fontSize={14}
          placeholder="0-100"
          uiTransform={{
            width: 60,
            height: 25,
            margin: { left: 5, right: 5 }
          }}
          onSubmit={(value) => handleVolumeChange(value)}
        />

        <Button
          value="+"
          fontSize={14}
          variant="secondary"
          uiTransform={{
            width: 30,
            height: 25
          }}
          onMouseDown={() => handleVolumeChange((volume + 10).toString())}
        />
      </UiEntity>
    </UiEntity>
  )
}