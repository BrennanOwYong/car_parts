"""Embed Assemble → Explode animation and reference-derived part offsets."""
import json,struct
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/assets/corolla-exploded.glb';b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);blob=bytearray(b[28+n:])
def offset(name):
 side=1 if name.startswith('Right') else -1
 for key,vec in [(' tire',[side*2.15,.15,.3 if 'front' in name else -.3]),(' wheel',[side*1.52,.15,.3 if 'front' in name else -.3]),(' brake',[side*.9,.15,.3 if 'front' in name else -.3]),('mirror',[side*1.8,.65,.2]),('glass',[side*1.4,1.35,.25 if 'front' in name else -.25]),('door',[side*1.8,.05,.4 if 'front' in name else -.4]),('fender',[side*.8,.6,.85]),('quarter',[side*.85,.5,-.8]),('rocker',[side*1.15,.1,0]),('headlamp',[side*.5,.9,1.8])]:
  if key in name:return vec
 return {'Roof panel':[0,1.7,0],'Sunroof':[0,2.2,0],'Hood':[0,1.15,.85],'Trunk lid':[0,1.15,-.85],'Windshield':[0,1.65,.6],'Rear windshield':[0,1.65,-.9],'Front bumper':[0,.1,2.1],'Rear bumper':[0,.1,-2.1],'Front grille':[0,.2,2.55],'Rear lamps':[0,.8,-2.2],'Cabin interior':[0,.9,-.15],'Body structure':[0,.35,0],'Chassis & underbody':[0,-1.25,0]}.get(name,[0,.4,0])
def add(values,typ,count,limits=None):
 while len(blob)%4:blob.append(0)
 data=struct.pack('<'+'f'*len(values),*values);vi=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':len(blob),'byteLength':len(data)});blob.extend(data);ai=len(d['accessors']);a={'bufferView':vi,'componentType':5126,'type':typ,'count':count};a.update(limits or {});d['accessors'].append(a);return ai
clock=add([0,3],'SCALAR',2,{'min':[0],'max':[3]});anim={'name':'Assemble to Explode','samplers':[],'channels':[]}
for i,node in enumerate(d['nodes'][:-1]):
 v=offset(node['name']);node['extras']={'explodeMeters':v,'assemblyType':'visual source geometry'};a=add([0,0,0]+[x*10 for x in v],'VEC3',2);anim['samplers'].append({'input':clock,'output':a,'interpolation':'LINEAR'});anim['channels'].append({'sampler':len(anim['samplers'])-1,'target':{'node':i,'path':'translation'}})
d['animations']=[anim];d['buffers'][0]['byteLength']=len(blob);jb=json.dumps(d,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);blob.extend(b'\0'*((-len(blob))%4));p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(jb)+len(blob))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(blob),0x004e4942)+blob)
print('Embedded 43 animation channels, duration 3 seconds')
