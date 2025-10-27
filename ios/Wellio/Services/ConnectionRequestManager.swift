import Foundation
import SwiftUI

class ConnectionRequestManager: ObservableObject {
    @Published var pendingRequest: ConnectionRequest?
    @Published var isProcessing = false
    @Published var error: String?
    
    private let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://your-replit-url.repl.co"
    
    struct ConnectionRequest: Codable, Identifiable {
        let id: String
        let clientId: String
        let clientName: String
        let clientEmail: String
        let deviceType: String
        let status: String
        let requestedAt: String
        let expiresAt: String
        let inviteCode: String
    }
    
    // MARK: - Fetch Pending Request
    
    func fetchPendingRequest(for email: String) async throws {
        let urlString = "\(apiBaseURL)/api/connection-requests/pending?email=\(email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let request = try JSONDecoder().decode(ConnectionRequest.self, from: data)
        
        await MainActor.run {
            self.pendingRequest = request
        }
    }
    
    // MARK: - Process Invite Code
    
    func processInviteCode(_ code: String) {
        Task {
            await MainActor.run {
                self.isProcessing = true
                self.error = nil
            }
            
            do {
                try await fetchRequestByInviteCode(code)
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isProcessing = false
                }
            }
        }
    }
    
    private func fetchRequestByInviteCode(_ code: String) async throws {
        let urlString = "\(apiBaseURL)/api/connection-requests/by-code/\(code)"
        
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let request = try JSONDecoder().decode(ConnectionRequest.self, from: data)
        
        await MainActor.run {
            self.pendingRequest = request
            self.isProcessing = false
        }
    }
    
    // MARK: - Approve Request
    
    func approveRequest(_ request: ConnectionRequest) async throws {
        await MainActor.run {
            self.isProcessing = true
            self.error = nil
        }
        
        // Step 1: Request HealthKit authorization
        try await RookService.shared.requestHealthKitAuthorization()
        
        // Step 2: Register user with ROOK
        try await RookService.shared.registerUser(
            userId: request.clientId,
            clientEmail: request.clientEmail
        )
        
        // Step 3: Update request status on server
        try await updateRequestStatus(request.id, status: "approved")
        
        // Step 4: Perform initial sync
        try await RookService.shared.syncHealthData()
        
        // Step 5: Enable background sync
        try await RookService.shared.enableBackgroundSync()
        
        // Step 6: Mark as connected
        try await updateRequestStatus(request.id, status: "connected")
        
        await MainActor.run {
            self.pendingRequest = nil
            self.isProcessing = false
        }
    }
    
    // MARK: - Reject Request
    
    func rejectRequest(_ request: ConnectionRequest) async throws {
        await MainActor.run {
            self.isProcessing = true
            self.error = nil
        }
        
        try await updateRequestStatus(request.id, status: "rejected")
        
        await MainActor.run {
            self.pendingRequest = nil
            self.isProcessing = false
        }
    }
    
    // MARK: - Private Methods
    
    private func updateRequestStatus(_ requestId: String, status: String) async throws {
        let urlString = "\(apiBaseURL)/api/connection-requests/\(requestId)/status"
        
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["status": status]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }
}
