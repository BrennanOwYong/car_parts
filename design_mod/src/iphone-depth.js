// Native bridge contract and Apple references: ../native/ios/README.md
export function scanDevice() {
  const iphone = /iPhone/i.test(navigator.userAgent);
  const ipad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return {iphone, ios: iphone || ipad, native: typeof window.webkit?.messageHandlers?.formaDepth?.postMessage === 'function'};
}

export function captureIPhoneDepth({vehicleId, partId, signal}) {
  const bridge=window.webkit?.messageHandlers?.formaDepth;
  if(!bridge) return Promise.reject(new Error('Use phone camera here. LiDAR capture requires the FORMA iPhone app.'));
  return new Promise((resolve,reject)=>{
    const requestId=crypto.randomUUID();
    const stopNative=()=>{try{bridge.postMessage({action:'cancel',requestId});}catch{/* The host may already have closed. */}};
    const finish=(error,scan)=>{clearTimeout(timer);window.removeEventListener('forma-depth-result',receive);signal.removeEventListener('abort',cancel);error?reject(error):resolve(scan);};
    const cancel=()=>{stopNative();finish(new Error('Scan cancelled'));};
    const receive=event=>{
      const result=event.detail;
      if(result?.requestId!==requestId)return;
      if(result.error)return finish(new Error(result.error));
      const scan=result.scan;
      if(scan?.vehicleId!==vehicleId || scan?.partId!==partId || scan?.source!=='iphone-lidar' || !scan.depthBase64 || !scan.width || !scan.height)return finish(new Error('The depth capture was incomplete. Try again.'));
      finish(null,scan);
    };
    const timer=setTimeout(()=>{stopNative();finish(new Error('Scan timed out. Try again or use phone camera.'));},30000);
    window.addEventListener('forma-depth-result',receive);signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted){cancel();return;}
    try{bridge.postMessage({action:'capture',requestId,vehicleId,partId});}catch(error){finish(error);}
  });
}
