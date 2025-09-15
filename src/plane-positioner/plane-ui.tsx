import {
  engine,
  Transform,
  Material,
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, Label, ReactEcsRenderer, UiEntity, Input } from '@dcl/sdk/react-ecs'
import { Cube, PlacedPlane } from './plane-components'
import { createCube, createPlane, createPreviewPlane } from './plane-factory'
import { setTextColor ,getPlaneEmission, setTextOutlineColor,getTextFontSize,getPlaneOpacity,logPlayerTransformValues, lastLoggedTransform, getHoveredPlaneName, getHoveredPlaneEntity, setHoveredPlaneName, setHoveredPlaneEntity, adjustPlaneScale, adjustPlaneEmission, adjustPlaneOpacity, setPlaneAlbedoColor, setPlaneEmissionColor, toggleMaterialColorPicker, toggleEmissionColorPicker, getMaterialColorPickerState, getEmissionColorPickerState, commonColors, toggleTextControls, getTextControlsState, addTextToPlane, getTextEntitiesForPlane, updatePlaneText, updateTextFontSize, updateTextFont, availableFonts, renamePlane, removeTextFromPlaneParent, setPlaneTexture, toggleSnapping, getSnappingEnabled, saveSceneState, findNearestClusterForNewPlane, toggleCreateTemplate, getCreateTemplateState, setTemplateName, getTemplateName, createTemplate, getTemplates, createTemplatePreview, clearTemplatePreview, placeTemplate, adjustPlanePositionWithSnapping, adjustPlaneRotationWithSnapping, getHoveredSnapTarget, startTemplateCreation, isCreatingTemplate, getSelectedPlanesCount, finishTemplateCreation, cancelTemplateCreation } from './plane-utils'
import { PreviewPlane } from './plane-components'

// Tab state management
let currentTab: 'plane' | 'edit' | 'text' | 'image' | 'delete' | 'template' = 'plane'
let currentEditTab: 'plane' | 'color' = 'plane'
let templateName: string = ''

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}

const TabButton = ({ 
  label, 
  isActive, 
  onClick, 
  isDelete = false 
}: { 
  label: string
  isActive: boolean
  onClick: () => void
  isDelete?: boolean
}) => (
  <Button
    uiTransform={{ 
      width: 80, 
      height: 30, 
      margin: '0 5px 0 0' 
    }}
    value={label}
    variant={isActive ? 'primary' : 'secondary'}
    fontSize={11}
    color={isDelete ? Color4.create(0.8, 0.2, 0.2, 1) : (!isActive && !isDelete ? Color4.create(0.9, 0.3, 0.3, 1) : undefined)}
    onMouseDown={onClick}
  />
)

const NumberInput = ({ 
  label, 
  value, 
  onDecrease, 
  onIncrease 
}: { 
  label: string
  value?: number
  onDecrease: () => void
  onIncrease: () => void
}) => (
  <UiEntity
    uiTransform={{
      width: '100%',
      height: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '2px 0'
    }}
  >
    <Label
      value={label}
      fontSize={12}
      uiTransform={{ width: 60, height: 30 }}
      textAlign='middle-left'
      color={Color4.Black()}
    />
    <UiEntity
      uiTransform={{
        width: 120,
        height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Button
        uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
        value='-'
        variant='secondary'
        fontSize={12}
        onMouseDown={onDecrease}
      />
      <Input
        uiTransform={{ width: 50, height: 25, margin: '0 2px' }}
        value={value?.toFixed(2) || '0.00'}
        fontSize={10}
      />
      <Button
        uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
        value='+'
        variant='secondary'
        fontSize={12}
        onMouseDown={onIncrease}
      />
    </UiEntity>
  </UiEntity>
)

const ColorPicker = ({ 
  title, 
  onColorSelect 
}: { 
  title: string
  onColorSelect: (hex: string) => void
}) => (
  <UiEntity
    uiTransform={{
      width: '100%',
      height: 90,
      flexDirection: 'column',
      alignItems: 'center',
      margin: '10px 0'
    }}
  >
    <Label
      value={title}
      fontSize={14}
      uiTransform={{ width: '100%', height: 25, margin: '0 0 5px 0' }}
      textAlign='middle-center'
      color={Color4.Black()}
    />
    <UiEntity
      uiTransform={{
        width: '105%',
        height: 60,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'center'
      }}
    >
      {commonColors.map((color, index) => {
        const r = parseInt(color.hex.substring(0, 2), 16)
        const g = parseInt(color.hex.substring(2, 4), 16)
        const b = parseInt(color.hex.substring(4, 6), 16)
        
        return (
          <UiEntity
            key={index}
            uiTransform={{ width: 35, height: 25, margin: 1 }}
            uiBackground={{ color: Color4.create(r / 255, g / 255, b / 255, 1) }}
            onMouseDown={() => onColorSelect(color.hex)}
          >
            <Label
              value={color.name}
              fontSize={8}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
              color={Color4.create(0.7, 0.7, 0.7, 1)}
            />
          </UiEntity>
        )
      })}
    </UiEntity>
  </UiEntity>
)

export const uiComponent = () => {
  const isPlaneSelected = !!getHoveredPlaneName()
  
  return (
    <UiEntity
      uiTransform={{
        width: 495,
        height: 400,
        padding: 0,
        positionType: 'absolute',
        position: { top: 16, left: '50%' },
        margin: '0 0 0 -247.5px'
      }}
      uiBackground={{ color: Color4.create(0.9, 0.9, 0.9, 0.95) }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column'
        }}
      >
        {/* Tab Headers */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '2px'
          }}
          uiBackground={{ color: Color4.create(0.8, 0.8, 0.8, 1) }}
        >
          <TabButton
            label="Plane"
            isActive={currentTab === 'plane'}
            onClick={() => currentTab = 'plane'}
          />
          {isPlaneSelected && (
            <UiEntity
              uiTransform={{
                width: 'auto',
                height: '100%',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <TabButton
                label="Edit"
                isActive={currentTab === 'edit'}
                onClick={() => currentTab = 'edit'}
              />
              <TabButton
                label="Text"
                isActive={currentTab === 'text'}
                onClick={() => currentTab = 'text'}
              />
              <TabButton
                label="Images"
                isActive={currentTab === 'image'}
                onClick={() => currentTab = 'image'}
              />
              <TabButton
                label="Delete"
                isActive={currentTab === 'delete'}
                onClick={() => currentTab = 'delete'}
                isDelete={true}
              />
            </UiEntity>
          )}
        </UiEntity>

        {/* Tab Content */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 360,
            padding: 15,
            flexDirection: 'column'
          }}
          uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
        >
          {/* Plane Tab */}
          {currentTab === 'plane' && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start'
              }}
            >
              {/* Generate and Place buttons */}
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  margin: '0 0 15px 0'
                }}
              >
                <Button
                  uiTransform={{ width: 120, height: 35, margin: '0 10px 0 0' }}
                  value='Generate Plane'
                  variant='secondary'
                  fontSize={12}
                  onMouseDown={() => {
                    const existingPreviews = [...engine.getEntitiesWith(PreviewPlane)]
                    existingPreviews.forEach(([entity]) => engine.removeEntity(entity))
                    createPreviewPlane()
                  }}
                />
                <Button
                  uiTransform={{ width: 100, height: 35, margin: '0 10px 0 0' }}
                  value='Place Plane'
                  variant='primary'
                  fontSize={12}
                  onMouseDown={() => {
                    const previewEntities = [...engine.getEntitiesWith(PreviewPlane, Transform)]
                    if (previewEntities.length > 0) {
                      const [previewEntity, _, previewTransform] = previewEntities[0]
                      
                      // Adjust Z position if snapping is enabled
                      let adjustedPosition = previewTransform.position
                      if (getSnappingEnabled()) {
                        adjustedPosition = {
                          x: previewTransform.position.x,
                          y: previewTransform.position.y,
                          z: previewTransform.position.z + 0.18  // Adjust to -0.02 offset from target (preview is at -0.2, so +0.18 = -0.02)
                        }
                      }
                      
                      // Get snap parent ID if snapping is enabled
                      let snapParentId = 0
                      if (getSnappingEnabled()) {
                        const snapTarget = getHoveredSnapTarget()
                        if (snapTarget) {
                          const snapTargetPlane = PlacedPlane.getOrNull(snapTarget)
                          if (snapTargetPlane) {
                            snapParentId = snapTargetPlane.id
                            console.log(`Snapping new plane to parent ID: ${snapParentId}`)
                          }
                        }
                      }
                      
                      const newPlaneEntity = createPlane({
                        position: adjustedPosition,
                        rotation: previewTransform.rotation,
                        scale: previewTransform.scale
                      }, snapParentId)
                      
                      // Automatically select the newly placed plane
                      const planeComponent = PlacedPlane.getOrNull(newPlaneEntity)
                      if (planeComponent) {
                        setHoveredPlaneName(planeComponent.name)
                        setHoveredPlaneEntity(newPlaneEntity)
                        
                        // Find and assign nearest cluster
                        const nearestClusterId = findNearestClusterForNewPlane(adjustedPosition, 5.0)
                        if (nearestClusterId) {
                          const mutablePlaneComponent = PlacedPlane.getMutable(newPlaneEntity)
                          mutablePlaneComponent.localKnnClusterId = nearestClusterId
                          console.log(`Assigned new plane ${planeComponent.name} (ID: ${planeComponent.id}) to cluster ${nearestClusterId}`)
                        } else {
                          // If no nearby cluster exists, this plane becomes its own cluster center
                          const mutablePlaneComponent = PlacedPlane.getMutable(newPlaneEntity)
                          mutablePlaneComponent.localKnnClusterId = planeComponent.id
                          console.log(`New plane ${planeComponent.name} (ID: ${planeComponent.id}) created as new cluster center`)
                        }
                      }
                      
                      engine.removeEntity(previewEntity)
                    }
                  }}
                />
                <Button
                  uiTransform={{ width: 100, height: 35 }}
                  value={`Snapping: ${getSnappingEnabled() ? 'ON' : 'OFF'}`}
                  variant={getSnappingEnabled() ? 'primary' : 'secondary'}
                  fontSize={12}
                  color={getSnappingEnabled() ? undefined : Color4.create(0.8, 0.2, 0.2, 1)}
                  onMouseDown={() => {
                    toggleSnapping()
                  }}
                />
                <Button
                  uiTransform={{ width: 100, height: 35, margin: '0 0 0 10px' }}
                  value='Templates'
                  variant={(currentTab as string) === 'template' ? 'primary' : 'secondary'}
                  fontSize={12}
                  onMouseDown={() => {
                    currentTab = 'template' as any
                    clearTemplatePreview()
                  }}
                />
              </UiEntity>

              {/* Plane Name Section */}
              {isPlaneSelected && (
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: 60,
                    flexDirection: 'column',
                    margin: '0 0 15px 0'
                  }}
                >
                  <Label
                    value={`Name: ${getHoveredPlaneName()}`}
                    fontSize={14}
                    uiTransform={{ width: '100%', height: 25, margin: '0 0 5px 0' }}
                    textAlign='middle-left'
                    color={Color4.Black()}
                  />
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <Label
                      value='Rename Plane:'
                      fontSize={12}
                      uiTransform={{ width: 100, height: 30, margin: '0 10px 0 0' }}
                      textAlign='middle-left'
                      color={Color4.Black()}
                    />
                    <Input
                      uiTransform={{ width: 200, height: 35 }}
                      placeholder='Enter new Name here...'
                      fontSize={12}
                      value=''
                      onChange={(value) => {
                        const entity = getHoveredPlaneEntity()
                        if (entity && value.trim()) {
                          renamePlane(entity, value.trim())
                        }
                      }}
                    />
                  </UiEntity>

                  {/* Template Name Input (only show when create template is active) */}
                  {getCreateTemplateState() && (
                    <UiEntity
                      uiTransform={{
                        width: '100%',
                        height: 40,
                        flexDirection: 'row',
                        alignItems: 'center',
                        margin: '10px 0 0 0'
                      }}
                    >
                      <Label
                        value='Template Name:'
                        fontSize={12}
                        uiTransform={{ width: 120, height: 30, margin: '0 10px 0 0' }}
                        textAlign='middle-left'
                        color={Color4.Black()}
                      />
                      <Input
                        uiTransform={{ width: 150, height: 35, margin: '0 10px 0 0' }}
                        placeholder='Enter template name...'
                        fontSize={12}
                        value={getTemplateName()}
                        onChange={(value) => {
                          setTemplateName(value)
                        }}
                      />
                      <Button
                        uiTransform={{ width: 80, height: 35 }}
                        value='Create'
                        variant='primary'
                        fontSize={12}
                        onMouseDown={() => {
                          const templateName = getTemplateName().trim()
                          const selectedEntity = getHoveredPlaneEntity()
                          if (templateName && selectedEntity) {
                            createTemplate(templateName, selectedEntity)
                          }
                        }}
                      />
                    </UiEntity>
                  )}
                </UiEntity>
              )}

              {/* Pointer Events */}
              {isPlaneSelected && (
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: 40,
                    flexDirection: 'row',
                    alignItems: 'center',
                    margin: '0 0 15px 0'
                  }}
                >
                  <Button
                    uiTransform={{ width: 100, height: 35, margin: '0 10px 0 0' }}
                    value='Pointer Out'
                    variant='secondary'
                    fontSize={12}
                    onMouseDown={() => {
                      console.log('Pointer Out event')
                    }}
                  />
                  <Button
                    uiTransform={{ width: 100, height: 35 }}
                    value='Pointer Over'
                    variant='secondary'
                    fontSize={12}
                    onMouseDown={() => {
                      console.log('Pointer Over event')
                    }}
                  />
                  {isCreatingTemplate() ? (
                    <UiEntity
                      uiTransform={{
                        width: 400,
                        height: 70,
                        flexDirection: 'column',
                        margin: '0 0 0 10px'
                      }}
                    >
                      <Label
                        value={`Template Mode: ${getSelectedPlanesCount()} planes selected`}
                        fontSize={10}
                        uiTransform={{ width: '100%', height: 20 }}
                        textAlign='middle-left'
                        color={Color4.create(0.2, 0.8, 0.2, 1)}
                      />
                      <UiEntity
                        uiTransform={{
                          width: '100%',
                          height: 50,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Input
                          uiTransform={{ width: 200, height: 30 }}
                          placeholder='Template Name'
                          fontSize={10}
                          value={templateName}
                          onChange={(value) => {
                            templateName = value
                          }}
                        />
                        <Button
                          uiTransform={{ width: 70, height: 30, margin: '0 5px' }}
                          value='Finish'
                          variant='primary'
                          fontSize={9}
                          color={Color4.create(0.2, 0.6, 0.8, 1)}
                          onMouseDown={() => {
                            const name = templateName.trim() || `Template_${Date.now()}`
                            templateName = ''
                            finishTemplateCreation(name)
                          }}
                        />
                        <Button
                          uiTransform={{ width: 70, height: 30 }}
                          value='Cancel'
                          variant='secondary'
                          fontSize={9}
                          color={Color4.create(0.8, 0.2, 0.2, 1)}
                          onMouseDown={() => {
                            templateName = ''
                            cancelTemplateCreation()
                          }}
                        />
                      </UiEntity>
                    </UiEntity>
                  ) : (
                    <Button
                      uiTransform={{ width: 120, height: 35, margin: '0 0 0 10px' }}
                      value='Create Template'
                      variant='secondary'
                      fontSize={10}
                      onMouseDown={() => {
                        templateName = ''
                        startTemplateCreation()
                      }}
                    />
                  )}
                </UiEntity>
              )}

              {/* Save */}
              <Button
                uiTransform={{ width: 120, height: 35 }}
                value='Save'
                variant='primary'
                fontSize={12}
                color={Color4.create(0.2, 0.6, 0.8, 1)}
                onMouseDown={() => {
                  saveSceneState().catch(error => {
                    console.error('Failed to save scene state:', error)
                  })
                }}
              />
            </UiEntity>
          )}

          {/* Edit Tab */}
          {currentTab === 'edit' && isPlaneSelected && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'column'
              }}
            >
              {/* Sub-tabs for Edit */}
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 35,
                  flexDirection: 'row',
                  alignItems: 'center',
                  margin: '0 0 15px 0'
                }}
              >
                <Button
                  uiTransform={{ width: 80, height: 30, margin: '0 5px 0 0' }}
                  value='Edit Plane'
                  variant={currentEditTab === 'plane' ? 'primary' : 'secondary'}
                  fontSize={11}
                  onMouseDown={() => currentEditTab = 'plane'}
                />
                <Button
                  uiTransform={{ width: 80, height: 30 }}
                  value='Edit Color'
                  variant={currentEditTab === 'color' ? 'primary' : 'secondary'}
                  fontSize={11}
                  onMouseDown={() => currentEditTab = 'color'}
                />
              </UiEntity>

              {/* Edit Plane Content */}
              {currentEditTab === 'plane' && (
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: 280,
                    flexDirection: 'column'
                  }}
                >
                  <Label
                    value='Position'
                    fontSize={14}
                    uiTransform={{ width: '100%', height: 25, margin: '0 0 5px 0' }}
                    textAlign='middle-left'
                    color={Color4.Black()}
                  />
                  
                  {/* X Position */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    {/* Coarse decrease (-0.1) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='-'
                      variant='secondary'
                      fontSize={11}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'x', -0.1)
                        }
                      }}
                    />
                    {/* Fine decrease (-0.01) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='--'
                      variant='secondary'
                      fontSize={9}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'x', -0.01)
                        }
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const pos = entity ? Transform.getOrNull(entity)?.position : null
                        return `X: ${pos?.x?.toFixed(2) || '0.00'}`
                      })()}
                      fontSize={11}
                      uiTransform={{ width: 80, height: 25, margin: '0 1px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    {/* Fine increase (+0.01) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='++'
                      variant='secondary'
                      fontSize={9}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'x', 0.01)
                        }
                      }}
                    />
                    {/* Coarse increase (+0.1) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='+'
                      variant='secondary'
                      fontSize={11}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'x', 0.1)
                        }
                      }}
                    />
                  </UiEntity>

                  {/* Y Position */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    {/* Coarse decrease (-0.1) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='-'
                      variant='secondary'
                      fontSize={11}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'y', -0.1)
                        }
                      }}
                    />
                    {/* Fine decrease (-0.01) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='--'
                      variant='secondary'
                      fontSize={9}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'y', -0.01)
                        }
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const pos = entity ? Transform.getOrNull(entity)?.position : null
                        return `Y: ${pos?.y?.toFixed(2) || '0.00'}`
                      })()}
                      fontSize={11}
                      uiTransform={{ width: 80, height: 25, margin: '0 1px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    {/* Fine increase (+0.01) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='++'
                      variant='secondary'
                      fontSize={9}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'y', 0.01)
                        }
                      }}
                    />
                    {/* Coarse increase (+0.1) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='+'
                      variant='secondary'
                      fontSize={11}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'y', 0.1)
                        }
                      }}
                    />
                  </UiEntity>

                  {/* Z Position */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    {/* Coarse decrease (-0.1) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='-'
                      variant='secondary'
                      fontSize={11}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'z', -0.1)
                        }
                      }}
                    />
                    {/* Fine decrease (-0.01) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='--'
                      variant='secondary'
                      fontSize={9}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'z', -0.01)
                        }
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const pos = entity ? Transform.getOrNull(entity)?.position : null
                        return `Z: ${pos?.z?.toFixed(2) || '0.00'}`
                      })()}
                      fontSize={11}
                      uiTransform={{ width: 80, height: 25, margin: '0 1px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    {/* Fine increase (+0.01) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='++'
                      variant='secondary'
                      fontSize={9}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'z', 0.01)
                        }
                      }}
                    />
                    {/* Coarse increase (+0.1) */}
                    <Button
                      uiTransform={{ width: 25, height: 25, margin: '0 1px' }}
                      value='+'
                      variant='secondary'
                      fontSize={11}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlanePositionWithSnapping(entity, 'z', 0.1)
                        }
                      }}
                    />
                  </UiEntity>

                  <Label
                    value='Rotation'
                    fontSize={14}
                    uiTransform={{ width: '100%', height: 25, margin: '15px 0 5px 0' }}
                    textAlign='middle-left'
                    color={Color4.Black()}
                  />

                  {/* X Rotation */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlaneRotationWithSnapping(entity, 'x', -0.1)
                        }
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const rot = entity ? Transform.getOrNull(entity)?.rotation : null
                        return `X: ${rot?.x?.toFixed(2) || '0.00'}`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlaneRotationWithSnapping(entity, 'x', 0.1)
                        }
                      }}
                    />
                  </UiEntity>

                  {/* Y Rotation */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlaneRotationWithSnapping(entity, 'y', -0.1)
                        }
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const rot = entity ? Transform.getOrNull(entity)?.rotation : null
                        return `Y: ${rot?.y?.toFixed(2) || '0.00'}`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlaneRotationWithSnapping(entity, 'y', 0.1)
                        }
                      }}
                    />
                  </UiEntity>

                  {/* Z Rotation */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlaneRotationWithSnapping(entity, 'z', -0.1)
                        }
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const rot = entity ? Transform.getOrNull(entity)?.rotation : null
                        return `Z: ${rot?.z?.toFixed(2) || '0.00'}`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          adjustPlaneRotationWithSnapping(entity, 'z', 0.1)
                        }
                      }}
                    />
                  </UiEntity>

                  <Label
                    value='Scale'
                    fontSize={14}
                    uiTransform={{ width: '100%', height: 25, margin: '15px 0 5px 0' }}
                    textAlign='middle-left'
                    color={Color4.Black()}
                  />

                  {/* Width Scale */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneScale(entity, -0.1, 0)
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const scale = entity ? Transform.getOrNull(entity)?.scale : null
                        return `Width: ${scale?.x?.toFixed(2) || '1.00'}`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneScale(entity, 0.1, 0)
                      }}
                    />
                  </UiEntity>

                  {/* Height Scale */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneScale(entity, 0, -0.1)
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        const scale = entity ? Transform.getOrNull(entity)?.scale : null
                        return `Height: ${scale?.y?.toFixed(2) || '1.00'}`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneScale(entity, 0, 0.1)
                      }}
                    />
                  </UiEntity>
                </UiEntity>
              )}

              {/* Edit Color Content */}
              {currentEditTab === 'color' && (
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: 280,
                    flexDirection: 'column'
                  }}
                >
                  {/* Emissions Control */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0 10px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneEmission(entity, -1)
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          // You'll need to add a function to your utils to get current emission value
                          // For now, this is a placeholder - replace with actual getter function
                           const emission = getPlaneEmission(entity) || 0
                          return `Emissions: ${emission.toFixed(2)}`
                        }
                        return `Emissions: 0.00`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneEmission(entity, 1)
                      }}
                    />
                  </UiEntity>

                  {/* Opacity Control */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0 10px 0'
                    }}
                  >
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='-'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneOpacity(entity, -0.1)
                      }}
                    />
                    <Label
                      value={(() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) {
                          const opacity = getPlaneOpacity(entity)
                          return `Opacity: ${opacity.toFixed(2)}`
                        }
                        return `Opacity: 1.00`
                      })()}
                      fontSize={12}
                      uiTransform={{ width: 120, height: 25, margin: '0 2px' }}
                      textAlign='middle-center'
                      color={Color4.Black()}
                      uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                    />
                    <Button
                      uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                      value='+'
                      variant='secondary'
                      fontSize={12}
                      onMouseDown={() => {
                        const entity = getHoveredPlaneEntity()
                        if (entity) adjustPlaneOpacity(entity, 0.1)
                      }}
                    />
                  </UiEntity>

                  <ColorPicker
                    title='Material Color Picker'
                    onColorSelect={(hex) => {
                      const entity = getHoveredPlaneEntity()
                      if (entity) setPlaneAlbedoColor(entity, hex)
                    }}
                  />

                  <ColorPicker
                    title='Emission Color Picker'
                    onColorSelect={(hex) => {
                      const entity = getHoveredPlaneEntity()
                      if (entity) setPlaneEmissionColor(entity, hex)
                    }}
                  />
                </UiEntity>
              )}
            </UiEntity>
          )}

          {/* Text Tab */}
          {currentTab === 'text' && isPlaneSelected && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'column'
              }}
            >
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  margin: '0 0 15px 0'
                }}
              >
                <Button
                  uiTransform={{ width: 65, height: 30, margin: '0 5px 0 0' }}
                  value='Add Text'
                  variant='primary'
                  fontSize={10}
                  onMouseDown={() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      addTextToPlane(entity, 'Sample Text')
                    }
                  }}
                />
                <Button
                  uiTransform={{ width: 80, height: 30, margin: '0 5px 0 0' }}
                  value='Remove as Child'
                  variant='secondary'
                  fontSize={9}
                  onMouseDown={() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      const textEntities = getTextEntitiesForPlane(entity)
                      if (textEntities.length > 0) {
                        removeTextFromPlaneParent(textEntities[0])
                      }
                    }
                  }}
                />
                <Button
                  uiTransform={{ width: 70, height: 30 }}
                  value='Delete Text'
                  variant='secondary'
                  fontSize={10}
                  onMouseDown={() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      const textEntities = getTextEntitiesForPlane(entity)
                      if (textEntities.length > 0) {
                        engine.removeEntity(textEntities[0])
                      }
                    }
                  }}
                />
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 70,
                  flexDirection: 'row',
                  alignItems: 'center',
                  margin: '0 0 15px 0'
                }}
              >
                <Label
                  value='Text'
                  fontSize={12}
                  uiTransform={{ width: 60, height: 44, margin: '0 10px 0 0' }}
                  textAlign='middle-left'
                  color={Color4.Black()}
                />
                <Input
                  uiTransform={{ width: '80%', height: 44 }}
                  placeholder='Enter Text here...'
                  fontSize={12}
                  value='Enter Text here...'
                  color={Color4.Black()}
                  onChange={(value) => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      const existingTextEntities = getTextEntitiesForPlane(entity)
                      if (value.trim()) {
                        if (existingTextEntities.length > 0) {
                          updatePlaneText(existingTextEntities[0], value)
                        } else {
                          addTextToPlane(entity, value)
                        }
                      } else if (existingTextEntities.length > 0) {
                        engine.removeEntity(existingTextEntities[0])
                      }
                    }
                  }}
                />
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  margin: '0 0 15px 0'
                }}
              >
                <Label
                  value='Font:'
                  fontSize={12}
                  uiTransform={{ width: 40, height: 30, margin: '0 10px 0 0' }}
                  textAlign='middle-left'
                  color={Color4.Black()}
                />
                {availableFonts.map((font, index) => (
                  <Button
                    key={index}
                    uiTransform={{ width: 80, height: 25, margin: '0 5px 0 0' }}
                    value={font}
                    variant='secondary'
                    fontSize={10}
                    onMouseDown={() => {
                      const entity = getHoveredPlaneEntity()
                      if (entity) {
                        const textEntities = getTextEntitiesForPlane(entity)
                        if (textEntities.length > 0) {
                          updateTextFont(textEntities[0], font)
                        }
                      }
                    }}
                  />
                ))}
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '2px 0 15px 0'
                }}
              >
                <Button
                  uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                  value='-'
                  variant='secondary'
                  fontSize={12}
                  onMouseDown={() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      const textEntities = getTextEntitiesForPlane(entity)
                      if (textEntities.length > 0) {
                        updateTextFontSize(textEntities[0], -0.1)
                      }
                    }
                  }}
                />
                <Label
                  value={(() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      const textEntities = getTextEntitiesForPlane(entity)
                      if (textEntities.length > 0) {
                        const fontSize = getTextFontSize(textEntities[0])
                        return `Size: ${fontSize.toFixed(2)}`
                      }
                    }
                    return `Size: 1.00`
                  })()}
                  fontSize={12}
                  uiTransform={{ width: 100, height: 25, margin: '0 2px' }}
                  textAlign='middle-center'
                  color={Color4.Black()}
                  uiBackground={{ color: Color4.create(0.95, 0.95, 0.95, 1) }}
                />
                <Button
                  uiTransform={{ width: 30, height: 25, margin: '0 2px' }}
                  value='+'
                  variant='secondary'
                  fontSize={12}
                  onMouseDown={() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity) {
                      const textEntities = getTextEntitiesForPlane(entity)
                      if (textEntities.length > 0) {
                        updateTextFontSize(textEntities[0], 0.1)
                      }
                    }
                  }}
                />
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  margin: '0 0 15px 0'
                }}
              >
                <Label
                  value='URL Link'
                  fontSize={12}
                  uiTransform={{ width: 80, height: 44, margin: '0 10px 0 0' }}
                  textAlign='middle-left'
                  color={Color4.Black()}
                />
                <Input
                  uiTransform={{ width: '80%', height: 44 }}
                  placeholder='www.'
                  fontSize={12}
                  value='www.'
                />
              </UiEntity>

              <ColorPicker
                title='Text Color Picker'
                onColorSelect={(hex) => {
                  const entity = getHoveredPlaneEntity()
                  if (entity) {
                    const textEntities = getTextEntitiesForPlane(entity)
                    if (textEntities.length > 0) {
                      setTextColor(textEntities[0], hex)
                    }
                  }
                }}
              />

              <ColorPicker
                title='Text Outline Color Picker'
                onColorSelect={(hex) => {
                  const entity = getHoveredPlaneEntity()
                  if (entity) {
                    const textEntities = getTextEntitiesForPlane(entity)
                    if (textEntities.length > 0) {
                      setTextOutlineColor(textEntities[0], hex)
                    }
                  }
                }}
              />
            </UiEntity>
          )}

          {/* Image Tab */}
          {currentTab === 'image' && isPlaneSelected && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'column'
              }}
            >
              {/* Display current loaded image */}
              {(() => {
                const entity = getHoveredPlaneEntity()
                if (entity && PlacedPlane.has(entity)) {
                  const planeComponent = PlacedPlane.get(entity)
                  if (planeComponent.currentImage) {
                    return (
                      <UiEntity
                        uiTransform={{
                          width: '100%',
                          height: 30,
                          margin: '0 0 15px 0'
                        }}
                      >
                        <Label
                          value={`Loaded Image: ${planeComponent.currentImage}`}
                          fontSize={14}
                          uiTransform={{ width: '100%', height: 30 }}
                          textAlign='middle-center'
                          color={Color4.create(0.2, 0.6, 0.2, 1)}
                        />
                      </UiEntity>
                    )
                  }
                }
                return null
              })()}

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  margin: '0 0 15px 0'
                }}
              >
                <Button
                  uiTransform={{ width: 80, height: 30, margin: '0 10px 0 0' }}
                  value='Add Image'
                  variant='primary'
                  fontSize={12}
                  onMouseDown={() => {
                    console.log('Add Image')
                  }}
                />
                <Button
                  uiTransform={{ width: 80, height: 30 }}
                  value='Delete Image'
                  variant='secondary'
                  fontSize={12}
                  onMouseDown={() => {
                    const entity = getHoveredPlaneEntity()
                    if (entity && PlacedPlane.has(entity)) {
                      const planeComponent = PlacedPlane.getMutable(entity)
                      planeComponent.currentImage = ''
                      // Remove texture from material
                      const material = Material.getMutable(entity)
                      if (material.material?.$case === 'pbr') {
                        material.material.pbr.texture = undefined
                        material.material.pbr.emissiveTexture = undefined
                      }
                    }
                  }}
                />
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 50,
                  flexDirection: 'column',
                  margin: '0 0 15px 0'
                }}
              >
                <Label
                  value='/images/'
                  fontSize={12}
                  uiTransform={{ width: '100%', height: 20, margin: '0 0 0px 0' }}
                  textAlign='middle-left'
                  color={Color4.Black()}
                />
                <Input
                  uiTransform={{ width: '100%', height: 45 }}
                  placeholder='name.png'
                  fontSize={12}
                  value=''
                  onSubmit={(value) => {
                    const entity = getHoveredPlaneEntity()
                    if (entity && value.trim()) {
                      setPlaneTexture(entity, value.trim())
                    }
                  }}
                />
              </UiEntity>

              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 50,
                  flexDirection: 'column'
                }}
              >
                <Label
                  value='URL Link'
                  fontSize={12}
                  uiTransform={{ width: '100%', height: 20, margin: '0 0 0px 0' }}
                  textAlign='middle-left'
                  color={Color4.Black()}
                />
                <Input
                  uiTransform={{ width: '100%', height: 45 }}
                  placeholder='www.'
                  fontSize={12}
                  value=''
                />
              </UiEntity>
            </UiEntity>
          )}

          {/* Delete Tab */}
          {currentTab === 'delete' && isPlaneSelected && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Label
                value={`Delete ${getHoveredPlaneName()}?`}
                fontSize={16}
                uiTransform={{ width: '100%', height: 40, margin: '0 0 20px 0' }}
                textAlign='middle-center'
                color={Color4.Black()}
              />
              <Button
                uiTransform={{ width: 120, height: 40 }}
                value='Confirm Delete'
                variant='primary'
                fontSize={14}
                color={Color4.create(0.8, 0.2, 0.2, 1)}
                onMouseDown={() => {
                  const entity = getHoveredPlaneEntity()
                  if (entity) {
                    engine.removeEntity(entity)
                    currentTab = 'plane' // Switch back to plane tab after deletion
                  }
                }}
              />
            </UiEntity>
          )}

          {/* Template Tab */}
          {(currentTab as string) === 'template' && (
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                flexDirection: 'column'
              }}
            >
              <Label
                value='Available Templates'
                fontSize={16}
                uiTransform={{ width: '100%', height: 30, margin: '0 0 15px 0' }}
                textAlign='middle-center'
                color={Color4.Black()}
              />

              {getTemplates().length === 0 ? (
                <Label
                  value='No templates created yet. Select a plane and use "Create Template" to get started.'
                  fontSize={12}
                  uiTransform={{ width: '100%', height: 60 }}
                  textAlign='middle-center'
                  color={Color4.create(0.5, 0.5, 0.5, 1)}
                />
              ) : (
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: '100%',
                    flexDirection: 'column',
                    overflow: 'scroll'
                  }}
                >
                  {getTemplates().map(template => (
                    <UiEntity key={template.id}
                      uiTransform={{
                        width: '100%',
                        height: 50,
                        flexDirection: 'row',
                        alignItems: 'center',
                        margin: '0 0 10px 0'
                      }}
                    >
                      <Button
                        uiTransform={{ width: '70%', height: 40 }}
                        value={template.name}
                        variant='secondary'
                        fontSize={12}
                        color={Color4.create(0.8, 0.2, 0.2, 1)}
                        onMouseDown={() => {
                          createTemplatePreview(template.id)
                          console.log(`Selected template: ${template.name}`)
                        }}
                      />
                      <Label
                        value={`${template.planes.length} planes`}
                        fontSize={10}
                        uiTransform={{ width: '30%', height: 40, margin: '0 0 0 10px' }}
                        textAlign='middle-left'
                        color={Color4.create(0.6, 0.6, 0.6, 1)}
                      />
                    </UiEntity>
                  ))}
                </UiEntity>
              )}

              {/* Place Template Button */}
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '15px 0 0 0'
                }}
              >
                <Button
                  uiTransform={{ width: 120, height: 40 }}
                  value='Place Template'
                  variant='primary'
                  fontSize={12}
                  color={Color4.create(0.2, 0.6, 0.8, 1)}
                  onMouseDown={() => {
                    placeTemplate()
                  }}
                />
              </UiEntity>
            </UiEntity>
          )}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

function getPlayerPosition() {
  const playerPosition = Transform.getOrNull(engine.PlayerEntity)
  if (!playerPosition) return ' no data yet'
  const { x, y, z } = playerPosition.position
  return `{X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, z: ${z.toFixed(2)} }`
}