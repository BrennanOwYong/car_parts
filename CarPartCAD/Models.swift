import Foundation

struct VehicleGuess: Identifiable, Codable {
    let id = UUID()
    var make: String
    var model: String
    var year: String
    var confidence: Double

    private enum CodingKeys: String, CodingKey { case make, model, year, confidence }
}

struct AstraSource: Identifiable, Codable {
    var id: String { url }
    let title: String
    let url: String
    let official: Bool
}

struct AstraResult: Codable {
    let outcome: String
    let userMessage: String
    let vehicle: VehicleGuess
    let partName: String
    let summary: String
    let dimensionsSufficient: Bool
    let validatedAgainstEvidence: Bool
    let requiredDimensions: [String]
    let dimensionEvidence: [DimensionEvidence]
    let missingDimensions: [String]
    let sources: [AstraSource]
    let cadFormat: String?
    let cadPayload: String?
}

struct DimensionEvidence: Codable {
    let name: String
    let value: String
    let unit: String
    let tolerance: String
    let method: String
    let sourceRef: String
    let exact: Bool
}
