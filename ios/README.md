# Wellio iOS App - Apple Health Integration

This is the native iOS companion app for Wellio that enables Apple Health integration via the ROOK SDK. Clients use this app to authorize access to their HealthKit data, which is then synced to the Wellio platform for their coaches.

## Overview

The Wellio iOS app provides:
- **Apple Health/HealthKit Integration**: Secure access to nutrition, workout, and body metrics data
- **Connection Request Flow**: Coaches send invites via web app, clients approve on iPhone
- **Automatic Data Sync**: ROOK SDK handles extraction and transmission to backend webhooks
- **Privacy-First Design**: Granular permissions, transparent data usage, client control

## Architecture

### Components
- **WellioApp.swift**: Main app entry point and configuration
- **RookService.swift**: ROOK SDK initialization and data sync management
- **ConnectionRequestManager.swift**: Handles connection request lifecycle and API communication
- **ContentView.swift**: Main navigation and tab interface
- **ConnectionRequestView.swift**: Connection approval and status UI
- **SettingsView.swift**: HealthKit permissions and account management

### Integration Flow
1. Coach sends connection request from web app
2. Client receives deep link: `wellio://connection-request/{inviteCode}`
3. Client opens link on iPhone, launching Wellio app
4. App displays request details and permissions
5. Client approves, triggering HealthKit authorization
6. ROOK SDK extracts data and sends to backend via webhooks
7. Coach sees synced data in web dashboard

## Prerequisites

### Development Requirements
- macOS 13.0+ (Ventura or later)
- Xcode 15.0+
- Apple Developer Account (for testing on device)
- iPhone or iPad running iOS 16.0+

### Backend Requirements
- ROOK API credentials configured in backend
- Webhook endpoint receiving and verifying ROOK data
- Connection request API endpoints operational

## Setup Instructions

### 1. Install Xcode
Download Xcode from the Mac App Store or Apple Developer website.

### 2. Open the Project
```bash
cd ios
open Wellio.xcodeproj
```

### 3. Configure Bundle Identifier
1. Select the Wellio project in Xcode
2. Go to "Signing & Capabilities" tab
3. Update the Bundle Identifier to match your Apple Developer account (e.g., `com.yourcompany.wellio`)

### 4. Configure Backend API URL
Edit `ConnectionRequestManager.swift` and update the API base URL:

```swift
// Update this to your backend URL
private let baseURL = "https://your-backend.replit.app"
```

For local development, you can use your Replit development URL or ngrok tunnel.

### 5. Add HealthKit Capability
The project should already have HealthKit enabled. To verify:
1. Select the Wellio target
2. Go to "Signing & Capabilities"
3. Ensure "HealthKit" capability is present
4. If missing, click "+ Capability" and add HealthKit

### 6. Verify Info.plist Permissions
The following permissions should already be configured in `Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Wellio needs access to your health data to provide personalized coaching insights. Your coach will see nutrition, workout, and body metrics to help you achieve your fitness goals.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>Wellio may write workout and nutrition data to your Apple Health app.</string>

<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>wellio</string>
        </array>
    </dict>
</array>
```

### 7. Build and Run
1. Connect your iPhone via USB
2. Select your device in Xcode (top toolbar)
3. Click the Run button (▶️) or press `Cmd+R`
4. Trust the developer certificate on your iPhone when prompted

## Testing the Integration

### End-to-End Flow Test

1. **In Wellio Web App** (as coach):
   - Navigate to Client Data Logs
   - Select a client
   - Click "Send Apple Health Request"
   - Copy the invite link

2. **On iPhone** (as client):
   - Paste the invite link in Safari or Notes
   - Tap the link to open Wellio app
   - Review the connection request
   - Tap "Approve & Connect"
   - Grant HealthKit permissions when prompted

3. **Verify in Wellio Web App** (as coach):
   - Refresh the Client Data Logs page
   - Apple Health section should show "Connected"
   - Wait a few minutes for initial sync
   - Check the Nutrition, Workout, and Check-in tabs for synced data

### Manual Testing Checklist

- [ ] App launches successfully
- [ ] Deep links open the app correctly
- [ ] Connection request displays invite code and coach info
- [ ] HealthKit permission prompt appears
- [ ] Approval updates backend status
- [ ] Settings show current connection status
- [ ] Disconnect functionality works
- [ ] Data syncs appear in web dashboard

## ROOK SDK Integration

### Initialization
The ROOK SDK is initialized in `RookService.swift`:

```swift
func initialize() async throws {
    try await rookHealthKit.configure(clientUUID: clientUUID, secretKey: secretKey)
    try await rookHealthKit.requestAllPermissions()
}
```

### Data Synchronization
Data is extracted and sent automatically:

```swift
func syncAllData() async throws {
    try await rookHealthKit.syncYesterdaySummaries()
}
```

The ROOK SDK handles:
- HealthKit data extraction
- Data transformation and formatting
- Secure transmission to ROOK servers
- Webhook delivery to your backend

## Deep Link Handling

The app responds to URLs in the format:
```
wellio://connection-request/{inviteCode}
```

Configured in `WellioApp.swift`:

```swift
.onOpenURL { url in
    connectionManager.handleDeepLink(url)
}
```

## Troubleshooting

### App Won't Build
- Ensure Xcode is up to date
- Clean build folder: Product → Clean Build Folder
- Restart Xcode

### HealthKit Permissions Not Appearing
- Verify HealthKit capability is enabled
- Check Info.plist has usage descriptions
- Ensure running on a physical device (HealthKit doesn't work in simulator)

### Deep Links Not Working
- Verify CFBundleURLSchemes is configured correctly
- Test URL in Safari on device, not simulator
- Check system Settings → Wellio → Open Links

### Data Not Syncing
- Verify ROOK credentials are correct
- Check backend webhook endpoint is accessible
- Review webhook HMAC signature verification
- Check iPhone has health data in Apple Health app

### Connection Request Not Loading
- Verify backend API URL is correct
- Check network connectivity
- Review backend logs for API errors
- Ensure invite code is valid and not expired

## Security Considerations

### Data Privacy
- HealthKit data stays on device until user approves
- ROOK SDK uses end-to-end encryption
- All API communication uses HTTPS
- Webhook signatures verified with HMAC

### Best Practices
- Never log sensitive health data
- Always request minimum necessary permissions
- Provide clear explanations for data usage
- Allow users to disconnect at any time

## Deployment

### TestFlight Distribution
1. Archive the app: Product → Archive
2. Upload to App Store Connect
3. Submit for TestFlight review
4. Invite beta testers via email

### App Store Submission
1. Complete App Store listing in App Store Connect
2. Add screenshots, description, keywords
3. Submit for review
4. Address any rejection feedback
5. Release to App Store once approved

### Important Notes
- HealthKit apps require App Store review
- Be prepared to explain health data usage
- Provide detailed privacy policy
- May take 2-3 days for review

## Configuration

### ROOK Credentials
Update in `RookService.swift`:

```swift
private let clientUUID = "YOUR_ROOK_CLIENT_UUID"
private let secretKey = "YOUR_ROOK_SECRET_KEY"
```

Get these from your ROOK dashboard at https://dashboard.rook.health

### Backend API
Update in `ConnectionRequestManager.swift`:

```swift
private let baseURL = "https://your-production-backend.com"
```

## Support

### Resources
- [ROOK Documentation](https://docs.rook.health)
- [HealthKit Developer Guide](https://developer.apple.com/documentation/healthkit)
- [Apple Deep Linking Guide](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)

### Common Issues
See the Troubleshooting section above or check the backend logs for API-related issues.

## License

This iOS app is part of the Wellio platform and follows the same license as the main project.
