import SwiftUI

struct ConnectionRequestView: View {
    @EnvironmentObject var connectionManager: ConnectionRequestManager
    @State private var isApproving = false
    @State private var isRejecting = false
    @State private var showError = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if let request = connectionManager.pendingRequest {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "person.badge.plus.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)
                        
                        Text("Connection Request")
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Text("Your coach wants to connect")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 32)
                    
                    // Request Details
                    GroupBox {
                        VStack(alignment: .leading, spacing: 16) {
                            DetailRow(label: "Coach", value: request.clientName)
                            DetailRow(label: "Email", value: request.clientEmail)
                            DetailRow(label: "Requested", value: formatDate(request.requestedAt))
                            DetailRow(label: "Expires", value: formatDate(request.expiresAt))
                        }
                    }
                    .padding(.horizontal)
                    
                    // What will be shared
                    GroupBox {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("What will be shared")
                                .font(.headline)
                            
                            PermissionRow(icon: "flame.fill", title: "Nutrition", subtitle: "Calories, macros, meals", color: .orange)
                            PermissionRow(icon: "figure.run", title: "Workouts", subtitle: "Exercise type, duration, intensity", color: .blue)
                            PermissionRow(icon: "scale.3d", title: "Body Metrics", subtitle: "Weight, body fat, measurements", color: .purple)
                            PermissionRow(icon: "moon.zzz.fill", title: "Sleep", subtitle: "Sleep duration and quality", color: .indigo)
                            PermissionRow(icon: "heart.fill", title: "Heart Rate", subtitle: "Heart rate and HRV", color: .red)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Privacy Notice
                    GroupBox {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "lock.shield.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Your data is secure")
                                    .font(.headline)
                                
                                Text("Your health data is encrypted and only shared with your approved coach. You can disconnect at any time.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    // Action Buttons
                    VStack(spacing: 12) {
                        Button {
                            approveRequest(request)
                        } label: {
                            HStack {
                                if isApproving {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Approve & Connect")
                                }
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(isApproving || isRejecting)
                        
                        Button {
                            rejectRequest(request)
                        } label: {
                            HStack {
                                if isRejecting {
                                    ProgressView()
                                } else {
                                    Image(systemName: "xmark.circle")
                                    Text("Decline")
                                }
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .disabled(isApproving || isRejecting)
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
            }
            .padding(.bottom, 32)
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(connectionManager.error ?? "An error occurred")
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return dateString
    }
    
    private func approveRequest(_ request: ConnectionRequestManager.ConnectionRequest) {
        isApproving = true
        
        Task {
            do {
                try await connectionManager.approveRequest(request)
                await MainActor.run {
                    isApproving = false
                }
            } catch {
                await MainActor.run {
                    connectionManager.error = error.localizedDescription
                    showError = true
                    isApproving = false
                }
            }
        }
    }
    
    private func rejectRequest(_ request: ConnectionRequestManager.ConnectionRequest) {
        isRejecting = true
        
        Task {
            do {
                try await connectionManager.rejectRequest(request)
                await MainActor.run {
                    isRejecting = false
                }
            } catch {
                await MainActor.run {
                    connectionManager.error = error.localizedDescription
                    showError = true
                    isRejecting = false
                }
            }
        }
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Permission Row

struct PermissionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
        }
    }
}

struct ConnectionRequestView_Previews: PreviewProvider {
    static var previews: some View {
        ConnectionRequestView()
            .environmentObject(ConnectionRequestManager())
    }
}
