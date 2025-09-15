import {
  engine,
  Transform,
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { openExternalUrl } from '~system/RestrictedActions'
import { Cube } from './games-components'
import { createCube } from './games-factory'
import { getSelectedPlaneId, getUIVisible, getSelectedGameData, setUIVisible } from './games-state'
import { paginationUIComponent } from './games-pagination-ui'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(combinedUIComponent)
}

const uiComponent = () => {
  const isVisible = getUIVisible()
  const gameData = getSelectedGameData()
  
  if (!isVisible || !gameData) {
    return null
  }
  
  // Format the date to show only year
  const year = gameData.date ? new Date(gameData.date).getFullYear() : 'Unknown'
  
  return (
    <UiEntity
      uiTransform={{
        width: 400,
        height: 828,
        margin: '16px 16px 16px 16px',
        padding: 4,
        positionType: 'absolute',
        position: { right: 16, bottom: 16 }
      }}
      uiBackground={{ color: Color4.White() }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: 16
        }}
      >
        {/* Close button */}
        <UiEntity
          uiTransform={{
            width: 30,
            height: 30,
            positionType: 'absolute',
            position: { right: 10, top: 10 }
          }}
        >
          <Button
            value='X'
            variant='secondary'
            fontSize={16}
            onMouseDown={() => {
              setUIVisible(false)
            }}
            uiTransform={{ width: '100%', height: '100%' }}
          />
        </UiEntity>
        
        {/* Commodore 64 Logo */}
        <UiEntity
          uiTransform={{
            width: 300,  // 2.5x increase from 120px
            height: 30,   // 40% reduction from 120px
            margin: '0 0 2px 0'
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: {
              src: 'images/commodore_64_logo.png',
            },
          }}
        />
        
        {/* Game Thumbnail */}
        <UiEntity
          uiTransform={{
            width: 200,
            height: 150,
            margin: '20 0 8px 0'
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: {
              src: `thumbnails/${gameData.identifier}/__ia_thumb.jpg`,
            },
          }}
        />
        
        {/* Game Title */}
        <Label
          value={gameData.title || 'Unknown Title'}
          fontSize={20}
          color={Color4.Black()}
          uiTransform={{ width: '100%', height: 30, margin: '10 0 8px 0' }}
        />
        
        {/* Game Description */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 210,
            margin: '90px 0 8px 0'
          }}
        >
          <Label
            value={(() => {
              if (!gameData.description) return 'No description available'
              
              // Handle array descriptions
              let description = gameData.description
              if (Array.isArray(gameData.description)) {
                description = gameData.description.join(' ')
              }
              
              // Truncate if too long
              return String(description).length > 1000 ? 
                String(description).substring(0, 1000) + '...' : 
                String(description)
            })()}
            fontSize={14}
            color={Color4.Gray()}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-left'
            textWrap='wrap'
          />
        </UiEntity>
        
        {/* Creator */}
        <Label
          value={`Creator: ${(() => {
            if (!gameData.creator) return 'Unknown'
            if (Array.isArray(gameData.creator)) {
              return gameData.creator.join(', ')
            }
            return gameData.creator
          })()}`}
          fontSize={16}
          color={Color4.Black()}
          uiTransform={{ width: '100%', height: 25, margin: '90px 0 4px 0' }}
        />
        
        {/* Year */}
        <Label
          value={`Year: ${year}`}
          fontSize={16}
          color={Color4.Black()}
          uiTransform={{ width: '100%', height: 25, margin: '5px 0 16px 0' }}
        />
        
        {/* Icon Buttons for External Links */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 50,
            margin: '8px 0 0 0',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Wikipedia Button */}
          {gameData.wikipedia && (
            <UiEntity
              uiTransform={{
                width: 50,
                height: 50,
                margin: '0 5px'
              }}
            >
              <Button
                value=''
                variant='secondary'
                onMouseDown={() => {
                  if (gameData.wikipedia) {
                    openExternalUrl({ url: gameData.wikipedia })
                  }
                }}
                uiTransform={{ width: '100%', height: '100%' }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: 'images/Wikipedia-icon.png'
                  }
                }}
              />
            </UiEntity>
          )}
          
          {/* Manual Button */}
          {gameData.manual && (
            <UiEntity
              uiTransform={{
                width: 50,
                height: 50,
                margin: '0 5px'
              }}
            >
              <Button
                value=''
                variant='secondary'
                onMouseDown={() => {
                  if (gameData.manual) {
                    const manualUrl: string = Array.isArray(gameData.manual) ? gameData.manual[0] : gameData.manual
                    openExternalUrl({ url: manualUrl })
                  }
                }}
                uiTransform={{ width: '100%', height: '100%' }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: 'images/book_icon.png'
                  }
                }}
              />
            </UiEntity>
          )}
          
          {/* Internet Archive Button */}
          {gameData.internetarchive && (
            <UiEntity
              uiTransform={{
                width: 50,
                height: 50,
                margin: '0 5px'
              }}
            >
              <Button
                value=''
                variant='secondary'
                onMouseDown={() => {
                  if (gameData.internetarchive) {
                    openExternalUrl({ url: gameData.internetarchive })
                  }
                }}
                uiTransform={{ width: '100%', height: '100%' }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: 'images/internet-archive-logo.png'
                  }
                }}
              />
            </UiEntity>
          )}
          
          {/* Joystick Button for Software/Games */}
          {gameData.mediatype === 'software' && gameData.internetarchive && (
            <UiEntity
              uiTransform={{
                width: 50,
                height: 50,
                margin: '0 5px'
              }}
            >
              <Button
                value=''
                variant='secondary'
                onMouseDown={() => {
                  if (gameData.internetarchive) {
                    openExternalUrl({ url: gameData.internetarchive })
                  }
                }}
                uiTransform={{ width: '100%', height: '100%' }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: 'images/joystick-icon.png'
                  }
                }}
              />
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

export const combinedUIComponent = () => {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        flexDirection: 'column'
      }}
    >
      {paginationUIComponent()}
      {uiComponent()}
    </UiEntity>
  )
}

function getPlayerPosition() {
  const playerPosition = Transform.getOrNull(engine.PlayerEntity)
  if (!playerPosition) return ' no data yet'
  const { x, y, z } = playerPosition.position
  return `{X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, z: ${z.toFixed(2)} }`
}