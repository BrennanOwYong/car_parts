import SwiftUI
import ARKit
import RealityKit
import Combine
import simd

struct LiDARCaptureView: View {
    @EnvironmentObject private var model: ReconstructionModel
    @Environment(\.dismiss) private var dismiss
    @State private var supported = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    @StateObject private var scanner = LiDARScanner()
    @State private var exportError: String?
    @State private var isSubmitting = false

    var body: some View {
        VStack(spacing: 16) {
            Text("Scan the intact part and mating interface").font(.title2.bold())
            Text("Move slowly around every mounting face. Keep the scale target visible.").foregroundStyle(.secondary)
            if supported { LiDARView(scanner: scanner); Text("Captured mesh faces: \(scanner.faceCount)").font(.caption) } else { Text("This iPhone does not report LiDAR scene reconstruction support.").foregroundStyle(.orange) }
            if let exportError { Text(exportError).foregroundStyle(.red).font(.caption) }
            if isSubmitting { ProgressView("Astra is completing the CAD model") }
            Button("Use scan for CAD") {
                do {
                    let url = try scanner.exportOBJ()
                    isSubmitting = true
                    Task {
                        await model.submitScan(url)
                        isSubmitting = false
                        dismiss()
                    }
                } catch {
                    exportError = error.localizedDescription
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(!supported || scanner.faceCount == 0 || isSubmitting)
        }.padding()
    }
}

struct LiDARView: UIViewRepresentable {
    let scanner: LiDARScanner
    func makeUIView(context: Context) -> ARView {
        let view = ARView(frame: .zero)
        let configuration = ARWorldTrackingConfiguration()
        configuration.sceneReconstruction = .mesh
        configuration.environmentTexturing = .automatic
        view.session.delegate = scanner
        view.session.run(configuration)
        return view
    }
    func updateUIView(_ view: ARView, context: Context) {}
}

final class LiDARScanner: NSObject, ObservableObject, ARSessionDelegate {
    @Published private(set) var faceCount = 0
    private var meshAnchors: [UUID: ARMeshAnchor] = [:]
    private let lock = NSLock()

    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { update(anchors) }
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) { update(anchors) }

    private func update(_ anchors: [ARAnchor]) {
        lock.lock()
        for case let anchor as ARMeshAnchor in anchors { meshAnchors[anchor.identifier] = anchor }
        let count = meshAnchors.values.reduce(0) { $0 + $1.geometry.faces.count }
        lock.unlock()
        DispatchQueue.main.async { self.faceCount = count }
    }

    func exportOBJ() throws -> URL {
        lock.lock()
        let anchors = Array(meshAnchors.values)
        lock.unlock()
        guard !anchors.isEmpty else { throw ScanError.empty }
        var lines: [String] = ["# ARKit LiDAR mesh; units are metres"]
        var vertexBase = 1
        for anchor in anchors {
            let geometry = anchor.geometry
            for index in 0..<geometry.vertices.count {
                let address = geometry.vertices.buffer.contents().advanced(by: geometry.vertices.offset + geometry.vertices.stride * index)
                let local = address.assumingMemoryBound(to: SIMD3<Float>.self).pointee
                let world = anchor.transform * SIMD4<Float>(local.x, local.y, local.z, 1)
                lines.append("v \(world.x) \(world.y) \(world.z)")
            }
            for face in 0..<geometry.faces.count {
                var indexes: [Int] = []
                for item in 0..<geometry.faces.indexCountPerPrimitive {
                    let offset = (face * geometry.faces.indexCountPerPrimitive + item) * geometry.faces.bytesPerIndex
                    let address = geometry.faces.buffer.contents().advanced(by: offset)
                    let index = geometry.faces.bytesPerIndex == 2
                        ? Int(address.assumingMemoryBound(to: UInt16.self).pointee)
                        : Int(address.assumingMemoryBound(to: UInt32.self).pointee)
                    indexes.append(index + vertexBase)
                }
                lines.append("f " + indexes.map(String.init).joined(separator: " "))
            }
            vertexBase += geometry.vertices.count
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("car-part-scan.obj")
        try lines.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

enum ScanError: LocalizedError {
    case empty
    var errorDescription: String? { "No LiDAR mesh was captured." }
}

struct PhotoPicker: UIViewControllerRepresentable {
    let onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: PhotoPicker
        init(_ parent: PhotoPicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage { parent.onImage(image) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
