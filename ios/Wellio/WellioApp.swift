import SwiftUI

@main
struct WellioApp: App {
    @StateObject private var rookService = RookService.shared
    @StateObject private var connectionManager = ConnectionRequestManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(rookService)
                .environmentObject(connectionManager)
                .onOpenURL { url in
                    // Handle deep links for connection requests
                    // Format: wellio://connect?code=INVITE_CODE
                    handleDeepLink(url)
                }
        }
    }
    
    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "wellio",
              url.host == "connect",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let inviteCode = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            return
        }
        
        // Handle the invite code
        connectionManager.processInviteCode(inviteCode)
    }
}
