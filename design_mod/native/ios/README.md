# iPhone depth capture handoff

The web scanner detects iPhone/iPad and the optional `window.webkit.messageHandlers.formaDepth` handler. A plain browser opens the rear-camera photo picker. An embedded native web view uses the handler to start a real scene-depth session. Device identity is not treated as proof of LiDAR hardware support.

`FormaDepthBridge.swift` is source for a future iOS host, not a packaged or installed app. Add it to an iOS 14+ app target using Swift 5 language mode. Retain a bridge instance alongside the web view:

```swift
depthBridge = FormaDepthBridge(webView: webView, allowedURL: studioURL)
```

Set `NSCameraUsageDescription` in the app's Info.plist, for example “Capture depth for your replacement car part.” Load the FORMA site from `studioURL`; only main-frame messages from that exact origin are accepted. Call `depthBridge.detach()` when closing the screen. A physical phone needs a reachable HTTPS studio URL; the desktop's localhost address is not reachable as localhost on a phone.

The native adapter checks `supportsFrameSemantics(.sceneDepth)`, starts the camera session, and returns one packed depth frame with camera calibration and pose. It handles unsupported hardware, session failure, cancellation and timeout. A native live camera preview and multi-view capture screen remain future work.

Messages carry an action, request identifier, vehicle identifier and part identifier. Responses use the `forma-depth-result` event with the same request identifier and either `error` or `scan`. Depth values are Float32 little-endian metres, row-packed and Base64-encoded; calibration corresponds to the camera image resolution included in the response. Invalid sensor values may be present and must be filtered by reconstruction.

The returned scan reaches `DemoAstraReconstruction` in the current demo. That adapter still generates a fixture preview and does not infer CAD from real depth. Replace it with the server reconstruction workflow when implementing that feature. No scan is uploaded by this bridge.

## Official references checked 2026-09-13

- https://developer.apple.com/documentation/arkit/arconfiguration/supportsframesemantics(_:)
- https://developer.apple.com/documentation/arkit/arframe/scenedepth
- https://developer.apple.com/documentation/ARKit/displaying-a-point-cloud-using-scene-depth
- https://developer.apple.com/documentation/webkit/wkscriptmessagehandler
- https://developer.apple.com/documentation/webkit/wkwebview/
- https://developer.apple.com/videos/play/wwdc2020/10611/

Web flow validation can run on desktop; compiling this source requires Xcode and hardware validation requires a LiDAR-equipped iPhone/iPad.
