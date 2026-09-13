import * as T from 'three';
import {lessonForPart} from './learning-course.mjs';

// Clone the source triangles, normals, and UVs verbatim. No primitive substitute,
// arbitrary cutting plane, or invented hidden component is used for a lesson.
export function sourceParts(model,id){
 const all=model.assemblies.filter(g=>lessonForPart(g.name)===id);
 if(id==='wheels'||id==='brakes'){
  const corner=all.filter(g=>g.name.startsWith('Left front'));
  return corner.length?corner:all;
 }
 return all;
}
export function createSourceStudy(model,id){
 const root=new T.Group();root.name=`${model.vehicleId}:${id}`;
 for(const original of sourceParts(model,id)){
  const g=original.clone(true);g.position.set(0,0,0);
  g.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();}});
  const center=new T.Box3().setFromObject(g,true).getCenter(new T.Vector3());
  // Set a pivot at the actual part center without changing the assembled pose.
  g.children.forEach(o=>o.position.sub(center));g.position.copy(center);
  g.userData={index:root.children.length,base:center.clone(),offset:original.userData.offset.clone(),sourceName:original.name};
  root.add(g);
 }
 root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root,true),center=box.getCenter(new T.Vector3());
 if(!box.isEmpty())root.position.sub(center);
 root.updateMatrixWorld(true);
 return root;
}
export function componentInsight(name,id){
 const notes=[[/tire/i,'The original tire surface, including the tread and sidewall detail present in this car asset. Its hidden carcass, bead wires, and inner liner are not separately modeled.'],[/wheel/i,'The original wheel mesh retains its rim, spoke, and hub detail. Inspect the spoke roots and the clearance around the brake. This is a visualization mesh; dimensions are not certified for manufacture.'],[/brake/i,'The brake geometry supplied with this car. Inspect its visible rotor and caliper surfaces. Only components actually separated in the source can be moved independently; hidden pads and hydraulic passages are not invented.'],[/glass|windshield|sunroof/i,'The source glazing surface with its original curvature. This mesh describes the visible glass; it does not contain separately modeled glass plies or a polymer interlayer.'],[/lamp/i,'The source lamp geometry, retaining the optical and housing detail modeled by the creator. LED chips, circuitry, and internal cooling are not inferred from an exterior surface.'],[/cabin/i,'The original interior mesh retains the seats, controls, and trim included by the creator. Look at the relationship between the seat, steering wheel, and sightlines. Hidden restraint mechanisms are not added.'],[/mirror/i,'The original mirror assembly. Orbit around the housing and reflective face to inspect how it projects beyond the body.'],[/hood|deck|trunk/i,'The original closure panel geometry. Study its curvature, edge transitions, and relationship to the adjoining bodywork. Hinges and latches are shown only if present in the source.'],[/door/i,'The car’s original door geometry. Examine the perimeter, belt line, and curvature. This visual group is not a complete OEM door bill of materials.'],[/chassis|structure/i,'The structural and underbody surfaces present in the source model. The mesh does not establish sheet thickness, material grade, weld locations, or crash performance.']];
 return notes.find(([re])=>re.test(name))?.[1]||'An intact assembly from this car’s detailed source model. Its original surfaces, normals, and texture coordinates are preserved. Separation is for visual study, not a workshop removal sequence.';
}
export function sourceStats(root){let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh&&o.visible){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {triangles,meshes,components:root.children.length};}
