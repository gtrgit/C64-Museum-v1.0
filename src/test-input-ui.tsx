import { UiEntity, Input, ReactEcs } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

// Test UI component following the exact documentation pattern
export const testInputUI = () => (
  <UiEntity
    uiTransform={{
      width: 400,
      height: 300,
      positionType: 'absolute',
      position: {
        left: '35%',
        top: '40%',
      },
    }}
    uiBackground={{
      color: Color4.Gray(),
    }}
  >
    <Input
      onSubmit={(value) => {
        console.log('TEST: submitted value: ' + value)
        // The documentation doesn't show returning anything
      }}
      fontSize={35}
      placeholder={'type something'}
      placeholderColor={Color4.Black()}
      uiTransform={{
        width: '400px',
        height: '80px',
      }}
    />
  </UiEntity>
)