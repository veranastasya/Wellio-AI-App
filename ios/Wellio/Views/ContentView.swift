import SwiftUI

struct ContentView: View {
    @EnvironmentObject var rookService: RookService
    @EnvironmentObject var connectionManager: ConnectionRequestManager
    @State private var email: String = UserDefaults.standard.string(forKey: "client_email") ?? ""
    @State private var showingSettings = false
    
    var body: some View {
        NavigationView {
            ZStack {
                if connectionManager.pendingRequest != nil {
                    ConnectionRequestView()
                } else if rookService.healthKitAuthorized {
                    DashboardView()
                } else {
                    WelcomeView(email: $email)
                }
            }
            .navigationTitle("Wellio")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingSettings = true
                    } label: {
                        Image(systemName: "gear")
                    }
                }
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
        }
    }
}

// MARK: - Welcome View

struct WelcomeView: View {
    @Binding var email: String
    @EnvironmentObject var connectionManager: ConnectionRequestManager
    @State private var isCheckingRequest = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.blue)
            
            Text("Welcome to Wellio")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Connect with your coach to share your health data securely")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal, 32)
            
            VStack(spacing: 16) {
                TextField("Your email", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                    .padding(.horizontal, 32)
                
                Button {
                    checkForPendingRequest()
                } label: {
                    if isCheckingRequest {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Check for Invites")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(email.isEmpty || isCheckingRequest)
            }
            .padding(.top, 16)
            
            Spacer()
            
            Text("You can also open connection links sent to your email")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.bottom, 32)
        }
    }
    
    private func checkForPendingRequest() {
        isCheckingRequest = true
        UserDefaults.standard.set(email, forKey: "client_email")
        
        Task {
            do {
                try await connectionManager.fetchPendingRequest(for: email)
            } catch {
                print("No pending request: \(error)")
            }
            isCheckingRequest = false
        }
    }
}

// MARK: - Dashboard View

struct DashboardView: View {
    @EnvironmentObject var rookService: RookService
    @State private var lastSyncDate: Date?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Sync Status Card
                GroupBox {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "arrow.triangle.2.circlepath.circle.fill")
                                .foregroundColor(.green)
                            Text("Sync Status")
                                .font(.headline)
                            Spacer()
                            syncStatusBadge
                        }
                        
                        if let lastSync = lastSyncDate {
                            Text("Last synced: \(lastSync, style: .relative) ago")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Button {
                            syncNow()
                        } label: {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Sync Now")
                            }
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
                
                // Health Data Overview
                GroupBox {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Connected Data")
                            .font(.headline)
                        
                        DataConnectionRow(icon: "flame.fill", title: "Nutrition", color: .orange)
                        DataConnectionRow(icon: "figure.run", title: "Workouts", color: .blue)
                        DataConnectionRow(icon: "scale.3d", title: "Body Metrics", color: .purple)
                        DataConnectionRow(icon: "moon.zzz.fill", title: "Sleep", color: .indigo)
                    }
                }
                .padding()
                
                // Info Card
                GroupBox {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "info.circle.fill")
                                .foregroundColor(.blue)
                            Text("Background Sync")
                                .font(.headline)
                        }
                        
                        Text("Your health data syncs automatically in the background. Your coach can view your progress in real-time.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
            }
            .padding(.vertical)
        }
    }
    
    private var syncStatusBadge: some View {
        Group {
            switch rookService.syncStatus {
            case .idle:
                Label("Ready", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.green)
            case .syncing:
                ProgressView()
                    .scaleEffect(0.8)
            case .success:
                Label("Success", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.green)
            case .error(let message):
                Label("Error", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }
    
    private func syncNow() {
        Task {
            do {
                try await rookService.syncHealthData()
                lastSyncDate = Date()
            } catch {
                print("Sync error: \(error)")
            }
        }
    }
}

struct DataConnectionRow: View {
    let icon: String
    let title: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            Text(title)
                .font(.subheadline)
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(RookService.shared)
            .environmentObject(ConnectionRequestManager())
    }
}
