import SwiftUI

@main
struct CarPartCADApp: App {
    @StateObject private var model = ReconstructionModel()

    var body: some Scene {
        WindowGroup { ContentView().environmentObject(model) }
    }
}
