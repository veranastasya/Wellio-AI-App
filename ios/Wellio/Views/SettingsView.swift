import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var rookService: RookService
    @State private var showingDisconnectAlert = false
    
    var body: some View {
        NavigationView {
            List {
                // Account Section
                Section("Account") {
                    if let email = UserDefaults.standard.string(forKey: "client_email") {
                        HStack {
                            Text("Email")
                            Spacer()
                            Text(email)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    if let userId = UserDefaults.standard.string(forKey: "rook_user_id") {
                        HStack {
                            Text("User ID")
                            Spacer()
                            Text(userId.prefix(8) + "...")
                                .foregroundColor(.secondary)
                                .font(.caption)
                        }
                    }
                }
                
                // Sync Section
                Section("Sync") {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Background Sync")
                        Spacer()
                        if rookService.healthKitAuthorized {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                    
                    Button {
                        Task {
                            try? await rookService.syncHealthData()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Sync Now")
                        }
                    }
                }
                
                // Health Data Section
                Section("Health Data") {
                    Link(destination: URL(string: "x-apple-health://")!) {
                        HStack {
                            Image(systemName: "heart.text.square.fill")
                            Text("Open Health App")
                            Spacer()
                            Image(systemName: "arrow.up.forward")
                                .font(.caption)
                        }
                    }
                }
                
                // About Section
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("ROOK Status")
                        Spacer()
                        if rookService.isInitialized {
                            Label("Connected", systemImage: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.green)
                        } else {
                            Label("Not Connected", systemImage: "xmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }
                
                // Disconnect Section
                if rookService.healthKitAuthorized {
                    Section {
                        Button(role: .destructive) {
                            showingDisconnectAlert = true
                        } label: {
                            HStack {
                                Image(systemName: "xmark.circle")
                                Text("Disconnect from Coach")
                            }
                        }
                    } footer: {
                        Text("This will stop sharing your health data with your coach. You can reconnect anytime.")
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Disconnect?", isPresented: $showingDisconnectAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Disconnect", role: .destructive) {
                    disconnect()
                }
            } message: {
                Text("Are you sure you want to stop sharing your health data? Your coach will no longer receive updates.")
            }
        }
    }
    
    private func disconnect() {
        // Clear user data
        UserDefaults.standard.removeObject(forKey: "rook_user_id")
        UserDefaults.standard.removeObject(forKey: "client_email")
        
        // TODO: Call API to update connection status
        // This would need to notify the backend that the connection is terminated
        
        dismiss()
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(RookService.shared)
    }
}
