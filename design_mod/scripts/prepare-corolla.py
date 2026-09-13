import struct,json,numpy as np
from collections import defaultdict
from pathlib import Path
src=Path('/Users/lmt/Downloads/toyota-corolla-2020/source/MDL13625_reversed.glb')
b=src.read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);blob=b[28+n:]
def accessor(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];sz={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];return np.frombuffer(blob,dtype=dt,count=a['count']*sz,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,sz)
components=[]
for mi,m in enumerate(doc['meshes']):
 for pi,p in enumerate(m['primitives']):
  pos=accessor(p['attributes']['POSITION']);tri=accessor(p['indices']).reshape(-1,3)
  _,weld=np.unique(np.round(pos,4),axis=0,return_inverse=True);weld=np.arange(len(pos)) if mi==4 else weld;parent=list(range(int(weld.max())+1))
  def root(x):
   while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
   return x
  for t in weld[tri]:
   a=root(t[0]);parent[root(t[1])]=a;parent[root(t[2])]=a
  groups=defaultdict(list)
  for ti,t in enumerate(tri):groups[root(weld[t[0]])].append(ti)
  for ts in groups.values():
   points=pos[tri[ts].flatten()];lo=points.min(0);hi=points.max(0)
   components.append(dict(mi=mi,pi=pi,ts=ts,lo=lo.tolist(),hi=hi.tolist(),center=((hi+lo)/2).tolist()))
# Preserve original indexed paint islands, which follow the source panel seams.
# Classify connected details into visual assemblies without cutting triangles.
def region(x,y,z):
 side='Right' if x>0 else 'Left'
 if z>18: return 'Front bumper'
 if z< -19: return 'Rear bumper'
 if y>13.6:return 'Roof panel'
 if abs(x)<6.9 and z>10 and y>8:return 'Hood'
 if abs(x)<6.9 and z< -14 and y>8:return 'Trunk lid'
 if abs(x)>6:
  if z>9:return side+' front fender'
  if z< -13:return side+' rear quarter'
  if y<3:return side+' rocker'
  return side+(' front door' if z> -2 else ' rear door')
 return 'Body structure'
def classify(c,idx):
 x,y,z=c['center'];sx,sy,sz=np.array(c['hi'])-c['lo'];side='Right' if x>0 else 'Left'
 if abs(x)>6 and y<6.6 and sy<6.6 and sz<6.6 and min(abs(z-13.83),abs(z+13.17))<3.3:
  wheel=side+(' front' if z>0 else ' rear')
  return wheel+(' tire' if sy>5.5 else ' wheel' if sy>3 else ' brake')
 if abs(x)>8.8 and y>8:return side+' mirror'
 if c['mi']==1:
  if z>16:return side+' headlamp'
  if z< -18:return 'Rear lamps'
  if abs(x)>5:return side+(' front glass' if z> -2 else ' rear glass')
  if y>14:return 'Sunroof'
  return 'Windshield' if z>0 else 'Rear windshield'
 if c['mi']==2:
  return side+' headlamp' if z>16 else 'Rear lamps' if z< -18 else region(x,y,z)
 if c['mi']==4 and y>13.6:return 'Roof panel'
 if c['mi']==4:
  if sz>25:return 'Body structure'
  if z< -16 and y>9 and sx>10:return 'Trunk lid'
  return region(x,y,z)
 if z>18:return side+' headlamp' if y>6 and abs(x)>2 else 'Front grille' if y<6 and abs(x)<5.5 else 'Front bumper'
 if z< -19:return 'Rear lamps' if y>8.7 else 'Rear bumper'
 if c['mi']==0 and y>10:return 'Windshield' if z>0 else 'Rear windshield'
 if c['mi']==3 and abs(x)<6 and y>5:return 'Cabin interior'
 if abs(x)>6 and y>8:return region(x,y,z)
 return 'Chassis & underbody'
buckets=defaultdict(lambda:defaultdict(list))
for ci,c in enumerate(components):
 p=doc['meshes'][c['mi']]['primitives'][c['pi']];tri=accessor(p['indices']).reshape(-1,3);pos=accessor(p['attributes']['POSITION'])
 buckets[classify(c,ci)][(c['mi'],c['pi'])].extend(c['ts'])
newblob=bytearray(blob);meshes=[];nodes=[]
for name,prims in buckets.items():
 out=[]
 for (mi,pi),ts in prims.items():
  p=dict(doc['meshes'][mi]['primitives'][pi]);indices=accessor(p['indices']).reshape(-1,3)[ts].astype('<u4').flatten()
  while len(newblob)%4:newblob.append(0)
  vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(newblob),'byteLength':indices.nbytes,'target':34963});newblob.extend(indices.tobytes());ai=len(doc['accessors']);doc['accessors'].append({'bufferView':vi,'componentType':5125,'count':len(indices),'type':'SCALAR'});p['indices']=ai;out.append(p)
 meshes.append({'name':name,'primitives':out});nodes.append({'name':name,'mesh':len(meshes)-1})
doc['meshes']=meshes;doc['nodes']=nodes+[{'name':'Corolla','children':list(range(len(nodes))),'scale':[.1,.1,.1]}];doc['scenes']=[{'nodes':[len(nodes)]}];doc['scene']=0;doc['buffers']=[{'byteLength':len(newblob)}]
jb=json.dumps(doc,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);newblob.extend(b'\0'*((-len(newblob))%4));out=struct.pack('<III',0x46546c67,2,12+8+len(jb)+8+len(newblob))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(newblob),0x004e4942)+newblob
folder=Path(__file__).resolve().parents[1]/'public/assets';folder.mkdir(exist_ok=True);(folder/'corolla-exploded.glb').write_bytes(out)
print('Wrote',len(nodes),'assemblies',len(out),'bytes')
