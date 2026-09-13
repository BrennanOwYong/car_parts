import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: ReconstructionModel
    @State private var showingCamera = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("CarPart CAD").font(.largeTitle.bold())
                    Text("Photo → Astra → official evidence → LiDAR when needed → CAD").foregroundStyle(.secondary)
                    Text(model.stage).font(.headline)

                    Button { showingCamera = true } label: {
                        Label(model.photo == nil ? "Take part photo" : "Retake part photo", systemImage: "camera")
                    }.buttonStyle(.borderedProminent).disabled(model.isWorking)

                    if model.isWorking { ProgressView() }
                    if let error = model.errorMessage { Text(error).foregroundStyle(.red).font(.caption) }

                    if let vehicle = model.vehicle {
                        GroupBox("Vehicle candidate") {
                            VStack(alignment: .leading, spacing: 8) {
                                TextField("Make", text: $model.vehicleMake).textFieldStyle(.roundedBorder)
                                TextField("Model", text: $model.vehicleModel).textFieldStyle(.roundedBorder)
                                TextField("Year", text: $model.vehicleYear).textFieldStyle(.roundedBorder).keyboardType(.numberPad)
                                Text("Photo confidence: \(Int(vehicle.confidence * 100))%. Confirm before lookup.").font(.caption)
                                Button(model.confirmedVehicle ? "Vehicle confirmed" : "Confirm or use Astra result") {
                                    Task { await model.confirmVehicle() }
                                }.disabled(model.confirmedVehicle || model.isWorking)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    if model.confirmedVehicle, let result = model.astraResult {
                        if model.needsLiDAR {
                            GroupBox("Astra") {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(result.userMessage)
                                    NavigationLink { LiDARCaptureView() } label: {
                                        Label(model.scanCaptured ? "Scan requested geometry again" : "Capture requested geometry", systemImage: "viewfinder")
                                    }.buttonStyle(.borderedProminent)
                                }
                            }
                        } else if result.cadPayload != nil {
                            GroupBox("Generated CAD") {
                                VStack(alignment: .leading) {
                                    Text("Exact required dimensions were matched to the internal evidence record.").font(.caption).foregroundStyle(.secondary)
                                    if let file = model.cadFileURL {
                                        ShareLink(item: file) { Label("Share CAD file", systemImage: "square.and.arrow.up") }
                                            .buttonStyle(.borderedProminent)
                                    }
                                }.frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                }.padding()
            }
            .navigationTitle("Reconstruction")
            .sheet(isPresented: $showingCamera) { PhotoPicker { image in Task { await model.analyzePhoto(image) } } }
        }
    }
}
