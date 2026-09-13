import {watch} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Vite imports temporary config files. Node's recursive module watcher follows
// those too, creating restart loops. Watch only our backend's source directory.
export function shouldRestartServer(filename){
  const name=String(filename||'');
  return !name.includes('/')&&!name.includes('\\')&&(name.endsWith('.mjs')||name==='package.json'||name==='vite.config.js');
}
function start(){
  const root=fileURLToPath(new URL('../',import.meta.url));
  let child=null,timer=null,stopping=false,restarting=false;
  const launch=()=>{
    child=spawn(process.execPath,['server.mjs'],{cwd:root,env:process.env,stdio:'inherit'});
    child.on('error',error=>{console.error('Cannot start studio:',error.message);});
    child.on('exit',code=>{
      child=null;
      if(stopping)return;
      if(restarting){restarting=false;launch();}
      else console.error(`Studio stopped (${code??'signal'}). Save a backend source file to restart.`);
    });
  };
  const watcher=watch(root,(_event,filename)=>{
    if(stopping||!shouldRestartServer(filename))return;
    clearTimeout(timer);timer=setTimeout(()=>{
      if(stopping)return;
      console.log('Backend source changed. Reloading studio…');
      if(child){restarting=true;child.kill('SIGTERM');}else launch();
    },200);
  });
  const stop=()=>{stopping=true;clearTimeout(timer);watcher.close();child?.kill('SIGTERM');};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  launch();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))start();
