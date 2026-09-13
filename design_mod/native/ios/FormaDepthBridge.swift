import ARKit
import WebKit

// iOS 14+, Swift 5 language mode. Integration and official references: README.md.
// Captures one depth frame. Multi-view fusion and CAD reconstruction are separate.
final class FormaDepthBridge: NSObject, WKScriptMessageHandler, ARSessionDelegate {
    private weak var webView: WKWebView?
    private let allowedURL: URL
    private let session = ARSession()
    private var pending: [String: String]?
    private var timeout: DispatchWorkItem?

    init(webView: WKWebView, allowedURL: URL) {
        self.webView = webView
        self.allowedURL = allowedURL
        super.init()
        session.delegate = self
        session.delegateQueue = DispatchQueue.main
        webView.configuration.userContentController.add(self, name: "formaDepth")
    }

    // Call when the hosting screen closes; the content controller retains handlers.
    func detach() {
        session.pause()
        timeout?.cancel()
        pending = nil
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "formaDepth")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let origin = message.frameInfo.securityOrigin
        let expectedPort = allowedURL.port ?? (allowedURL.scheme == "https" ? 443 : 80)
        let actualPort = origin.port == 0 ? (origin.protocol == "https" ? 443 : 80) : origin.port
        guard message.frameInfo.isMainFrame,
              origin.protocol == allowedURL.scheme, origin.host == allowedURL.host, actualPort == expectedPort,
              let body = message.body as? [String: String], let requestId = body["requestId"] else { return }
        if body["action"] == "cancel" {
            if pending?["requestId"] == requestId { finish(error: "Scan cancelled") }
            return
        }
        guard body["action"] == "capture", body["vehicleId"] != nil, body["partId"] != nil else { return }
        if pending != nil { reply(["requestId": requestId, "error": "A depth scan is already running."]); return }
        pending = body
        guard ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) else {
            finish(error: "This device has no supported LiDAR scanner. Use phone camera instead.")
            return
        }
        let configuration = ARWorldTrackingConfiguration()
        configuration.frameSemantics.insert(.sceneDepth)
        let deadline = DispatchWorkItem { [weak self] in self?.finish(error: "No depth frame received. Check camera access and try again.") }
        timeout = deadline
        DispatchQueue.main.asyncAfter(deadline: .now() + 25, execute: deadline)
        session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    }

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        guard let request = pending, let depth = frame.sceneDepth?.depthMap else { return }
        guard CVPixelBufferGetPixelFormatType(depth) == kCVPixelFormatType_DepthFloat32 else {
            finish(error: "Unsupported depth format."); return
        }
        guard CVPixelBufferLockBaseAddress(depth, .readOnly) == kCVReturnSuccess else { return }
        defer { CVPixelBufferUnlockBaseAddress(depth, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(depth) else { return }
        let width = CVPixelBufferGetWidth(depth), height = CVPixelBufferGetHeight(depth)
        let rowBytes = CVPixelBufferGetBytesPerRow(depth)
        var packed = Data()
        for row in 0..<height {
            packed.append(base.advanced(by: row * rowBytes).assumingMemoryBound(to: UInt8.self), count: width * MemoryLayout<Float32>.size)
        }
        let intrinsics = frame.camera.intrinsics, transform = frame.camera.transform
        let scan: [String: Any] = [
            "vehicleId": request["vehicleId"]!, "partId": request["partId"]!,
            "source": "iphone-lidar", "units": "metres", "encoding": "float32-le-base64",
            "width": width, "height": height, "depthBase64": packed.base64EncodedString(),
            "cameraImageWidth": frame.camera.imageResolution.width,
            "cameraImageHeight": frame.camera.imageResolution.height,
            "intrinsicsColumnMajor": (0..<3).flatMap { column in (0..<3).map { row in Double(intrinsics[column][row]) } },
            "cameraTransformColumnMajor": (0..<4).flatMap { column in (0..<4).map { row in Double(transform[column][row]) } }
        ]
        finish(scan: scan)
    }

    func session(_ session: ARSession, didFailWithError error: Error) { finish(error: error.localizedDescription) }
    func sessionWasInterrupted(_ session: ARSession) { finish(error: "Camera interrupted. Start the scan again.") }

    private func finish(error: String? = nil, scan: [String: Any]? = nil) {
        guard let request = pending else { return }
        pending = nil
        timeout?.cancel()
        timeout = nil
        session.pause()
        var response: [String: Any] = ["requestId": request["requestId"]!]
        if let error = error { response["error"] = error }
        if let scan = scan { response["scan"] = scan }
        reply(response)
    }

    private func reply(_ response: [String: Any]) {
        guard let current = webView?.url,
              current.scheme == allowedURL.scheme, current.host == allowedURL.host,
              (current.port ?? (current.scheme == "https" ? 443 : 80)) == (allowedURL.port ?? (allowedURL.scheme == "https" ? 443 : 80)) else { return }
        webView?.callAsyncJavaScript(
            "window.dispatchEvent(new CustomEvent('forma-depth-result', {detail: response}));",
            arguments: ["response": response], in: nil, in: .page, completionHandler: nil
        )
    }
}
