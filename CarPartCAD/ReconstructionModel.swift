import Foundation
import UIKit
import Combine

@MainActor
final class ReconstructionModel: ObservableObject {
    @Published var photo: UIImage?
    @Published var stage = "Start with a clear photo of the vehicle and part."
    @Published var vehicle: VehicleGuess?
    @Published var confirmedVehicle = false
    @Published var scanCaptured = false
    @Published var cadStatus = "CAD is locked until fit-critical evidence is ready."
    @Published var astraResult: AstraResult?
    @Published var isWorking = false
    @Published var errorMessage: String?
    @Published var vehicleMake = ""
    @Published var vehicleModel = ""
    @Published var vehicleYear = ""
    @Published var cadFileURL: URL?
    private var scanFileURL: URL?

    func analyzePhoto(_ image: UIImage) async {
        photo = image
        errorMessage = nil
        confirmedVehicle = false
        scanCaptured = false
        scanFileURL = nil
        cadFileURL = nil
        isWorking = true
        stage = "Astra is identifying the vehicle and damaged part."
        defer { isWorking = false }
        do {
            let result = try await callAstra(phase: "identify")
            astraResult = result
            vehicle = result.vehicle
            vehicleMake = result.vehicle.make
            vehicleModel = result.vehicle.model
            vehicleYear = result.vehicle.year
            confirmedVehicle = false
            stage = "Astra found \(result.vehicle.year) \(result.vehicle.make) \(result.vehicle.model) and \(result.partName). Confirm or use this result."
        } catch {
            errorMessage = error.localizedDescription
            stage = "Astra request failed. Check the relay address and server."
        }
    }

    func confirmVehicle() async {
        vehicle = VehicleGuess(make: vehicleMake.trimmingCharacters(in: .whitespacesAndNewlines), model: vehicleModel.trimmingCharacters(in: .whitespacesAndNewlines), year: vehicleYear.trimmingCharacters(in: .whitespacesAndNewlines), confidence: vehicle?.confidence ?? 0)
        confirmedVehicle = true
        isWorking = true
        stage = "Astra is searching official sources and generating CAD when dimensions are sufficient."
        defer { isWorking = false }
        do {
            let result = try await callAstra(phase: "research_and_generate")
            try apply(result)
        } catch {
            errorMessage = error.localizedDescription
            stage = "Astra research request failed."
        }
    }

    func submitScan(_ url: URL) async {
        scanFileURL = url
        scanCaptured = true
        errorMessage = nil
        isWorking = true
        stage = "Astra is using the LiDAR mesh to complete the CAD model."
        defer { isWorking = false }
        do {
            let result = try await callAstra(phase: "scan_and_generate")
            try apply(result)
        } catch {
            errorMessage = error.localizedDescription
            stage = "Astra could not process the scan. Capture it again or check the relay."
        }
    }

    var needsLiDAR: Bool {
        confirmedVehicle && astraResult?.outcome == "needs_lidar"
    }

    private func apply(_ result: AstraResult) throws {
        astraResult = result
        if result.outcome == "cad_ready", result.validatedAgainstEvidence, let cad = result.cadPayload {
            let name = result.partName.replacingOccurrences(of: "[^A-Za-z0-9_-]", with: "-", options: .regularExpression)
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(name.isEmpty ? "car-part.scad" : "\(name).scad")
            try cad.write(to: url, atomically: true, encoding: .utf8)
            cadFileURL = url
            cadStatus = "CAD is ready."
        } else {
            cadFileURL = nil
            cadStatus = result.userMessage
        }
        stage = cadStatus
    }

    private func callAstra(phase: String) async throws -> AstraResult {
        guard let image = photo, let data = image.jpegData(compressionQuality: 0.82) else { throw AstraError.invalidImage }
        guard let value = Bundle.main.object(forInfoDictionaryKey: "ASTRA_RELAY_URL") as? String,
              !value.contains("YOUR-LAPTOP-IP"), let url = URL(string: value) else { throw AstraError.relayNotConfigured }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: Any] = [
            "phase": phase,
            "image_base64": data.base64EncodedString(),
            "confirmed_vehicle": confirmedVehicle ? ["make": vehicle?.make ?? "", "model": vehicle?.model ?? "", "year": vehicle?.year ?? ""] : [:],
            "scan_captured": scanCaptured
        ]
        if phase == "scan_and_generate", let scanFileURL {
            body["scan_obj_base64"] = try Data(contentsOf: scanFileURL).base64EncodedString()
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (responseData, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw AstraError.server(String(data: responseData, encoding: .utf8) ?? "Unknown server error")
        }
        return try JSONDecoder().decode(AstraResult.self, from: responseData)
    }
}

enum AstraError: LocalizedError {
    case invalidImage, relayNotConfigured, server(String)
    var errorDescription: String? {
        switch self {
        case .invalidImage: return "The photo could not be encoded."
        case .relayNotConfigured: return "Set ASTRA_RELAY_URL in Info.plist to the laptop relay address."
        case .server(let message): return message
        }
    }
}
