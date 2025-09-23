 //////////////////////////////////////////
// SpawnerFunctions
// (c) 2019, 2020 by Carl Fravel
// V2.0 Now adds an EntityName component to entities it creates, with an optional name param added to every spawner function. 
//      Backward compatible with previous version.

import { 
  engine,
  Entity,
  Transform,
  TextShape,
  MeshRenderer,
  MeshCollider,
  GltfContainer, PBGltfContainer,ColliderLayer,
  Schemas,
  pointerEventsSystem, InputAction
} from "@dcl/sdk/ecs"

import {
  Quaternion,
  Vector3
} from "@dcl/sdk/math"

export const SpawnerNameComponent = engine.defineComponent(
	"SpawnerNameComponent",
	{
		name: Schemas.String
	})

export function addNamedEntity(name:string|null):Entity {
  let entity:Entity = engine.addEntity()
  if (name && name.length>0) {
    SpawnerNameComponent.create(entity,{name:name})
  }
  // console.log("ENTITY: name:"+name+"  entityId:"+entity)

  // pointerEventsSystem.onPointerDown(
  //   { 
  //     entity:entity,
  //     opts: {
  //       button: InputAction.IA_POINTER,
  //       hoverText: name?name:"not named",
  //       maxDistance: 16,
  //       showFeedback: true
  //     }
  //   },
  //   ()=>{
  //   }
  // )

  return entity
}

/**
 * 
 * @param xColumns number of repititions across the x dimension of an unrotated plane
 * @param yRows number of repititions on the y dimension of an rotated plane (or on z scene axis if the plane is tipped +90 degrees on x axis) 
 * @returns a uv array suitable for use with a plane
 */
export function getPlaneUVs(xColumns: number, yRows: number) {
  return [
    0, //lower left corner of north side of unrotated plane, 
    0,

    xColumns, //lower right corner of north side of unrotated plane,
    0,

    xColumns, //upper right corner of north side of unrotated plane,
    yRows,

    0, //upper left corner of north side of unrotated plane
    yRows,


    xColumns, // lower right corner of south side of unrotated plane
    0,

    0, // lower left corner of south side of unrotated plane
    0,

    0, // upper left corner of south side of unrotated plane
    yRows,

    xColumns, // upper right corner of south side of unrotated plane
    yRows,
  ]
}


export function spawnEntity(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent?:Entity) {
  // create the entity
  const entity = (name && name.length>0)?addNamedEntity(name):engine.addEntity()
  // set a transform to the entity
  Transform.create(entity, {
    parent:parent, 
    position: {x:x,y:y,z:z},
    rotation: Quaternion.fromEulerDegrees(rx,ry,rz),
    scale: {x:sx, y:sy, z:sz}
  })
  return entity
}

export function spawnBoxX(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent?:Entity) {
  const entity = spawnEntity(x,y,z,rx,ry,rz,sx,sy,sz,name, parent)
  // set how the cube looks and collides
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)
  return entity
}

export function spawnBox(x: number, y: number, z: number, name: string = "", parent:Entity) {
  return spawnBoxX(x,y,z,0,0,0,1,1,1,name,parent)
}

/**
 * 
 * @param x scales the x dimension of the radius
 * @param y height of cylinder or cone //todo sdk7 has it be twice this height
 * @param z scales the y dimention of the radius    x and z must be equal for round cross section.
 * @param rx 
 * @param ry 
 * @param rz 
 * @param sx 
 * @param sy 
 * @param sz 
 * @param radiusBottom 
 * @param radiusTop 
 * @param name 
 * @param parent 
 * @returns 
 */
export function spawnCylinderX(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number,  name: string = "", parent?:Entity, radiusBottom:number=0.5, radiusTop:number=0.5) {
  const entity = spawnEntity(x,y,z,rx,ry,rz,sx,sy/2,sz,name, parent) // todo sdk7 cylinder is twice as high the input y, so for now cutting it in half
  // set a shape to the entity
  MeshRenderer.setCylinder(entity,radiusBottom,radiusTop)
  MeshCollider.setCylinder(entity,radiusBottom, radiusTop)
  return entity
}

export function spawnCylinder(x: number, y: number, z: number, name: string = "", parent?:Entity) {
  return spawnCylinderX(x,y,z,  0,0,0,  1,1,1, name,parent, 0.5, 0.5)
}


export function spawnConeX(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent?:Entity) {
  const entity = spawnEntity(x,y,z,rx,ry,rz,sx,sy/2,sz,name,parent)
  // set a shape to the entity
  MeshRenderer.setCylinder(entity,0.5,0)
  MeshCollider.setCylinder(entity,0.5,0)
  return entity
}

export function spawnCone(x: number, y: number, z: number, name: string = "", parent?:Entity) {
  return spawnConeX(x,y,z, 0,0,0, 1,1,1 ,name,parent)
}



/**
 * 
 * @param gltfPath 
 * @param x 
 * @param y 
 * @param z 
 * @param rx 
 * @param ry 
 * @param rz 
 * @param sx 
 * @param sy 
 * @param sz 
 * @param name 
 * @param parent 
 * @param setCollider // set this to true if you want a Gltf/Glb that has no collider to have one (for both physics and pointer)
 * @returns 
 */
export function spawnGltfX(gltfPath: string, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent:Entity|null=null, setCollider:boolean=false) {
  const entity = parent?spawnEntity(x,y,z,rx,ry,rz,sx,sy,sz,name, parent):spawnEntity(x,y,z,rx,ry,rz,sx,sy,sz,name)
  GltfContainer.create(entity, { 
    src: gltfPath,
    visibleMeshesCollisionMask: setCollider?(ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS):0
  })
  return entity
}

export function spawnGltf(gltfPath: string, x: number, y: number, z: number, name: string = "", parent?:Entity) {
  return spawnGltfX(gltfPath,x,y,z,0,0,0,1,1,1,name,parent)
}

export function spawnPlaneX(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent?:Entity) {
  const entity = spawnEntity(x,y,z,rx,ry,rz,sx,sy,sz,name,parent)
  // set a shape to the entity
  MeshRenderer.setPlane(entity)
  MeshCollider.setPlane(entity)
  return entity
}

export function spawnPlane(x: number, y: number, z: number, name: string = "", parent?:Entity) {
  return spawnPlaneX(x,y,z,0,0,0,1,1,1,name)
}

export function spawnSphereX(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent?:Entity) {
  const entity = spawnEntity(x,y,z,rx,ry,rz,sx,sy,sz,name,parent)
  // set a shape to the entity
  MeshRenderer.setSphere(entity)
  MeshCollider.setSphere(entity)
  return entity
}

export function spawnSphere(x: number, y: number, z: number, name: string = "", parent?:Entity) {
  return spawnSphereX(x,y,z,0,0,0,1,1,1,name)
}

// // todo sdk7 TextShape
// export function spawnTextX(value: string, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, name: string = "", parent?:Entity) {
//   const entity = spawnEntity(x,y,z,rx,ry,rz,sx,sy,sz,name)
//   // set a shape to the entity
//   entity.addComponent(new TextShape(value))
//   return entity
// }

// export function spawnText(value: string, x: number, y: number, z: number, name: string = "", parent?:Entity) {
//   return spawnTextX(value,x, y,z,0,0,0,1,1,1,name)
// }


/**
 * Gets an array of Entities that are children of an entity.
 *
 * @param parent 
 * @returns null if ther are none, or an array of entities if there are any
 */
export function getChildrenOf(parent:Entity):Entity[]|null {
  let children:Entity[]=[]
  for (const [entity, transform] of engine.getEntitiesWith(Transform)) {
   // the properties of meshRenderer and transform are read only
   if (transform.parent == parent) children.push(entity)
  }
  if (children.length==0) {
    return null
  }
  else {
    return children
  }
}

/**
* Sets the TextArea.text of any children of this entity that have a TextArea
* @param parent any children of this entity that have a TextArea component will have the text of that TextArea set
* @param text to this string
* @returns true if any were found and set, else false
*/
export function setChildEntitiesText(parent:Entity, text:string):boolean {
 let success = false
 let iteratable = engine.getEntitiesWith(Transform, TextShape)


 for (const [entity, transform, textShape] of iteratable) {
  // the properties of meshRenderer and transform are read only
   if (transform.parent == parent)  {
     let textShape = TextShape.getMutableOrNull(entity)
     if (textShape) {
       textShape.text = text
       success = true
     }
   }
 }
 return success
}