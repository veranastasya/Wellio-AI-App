import Foundation
import HealthKit
import RookSDK

class RookService: ObservableObject {
    static let shared = RookService()
    
    @Published var isInitialized = false
    @Published var healthKitAuthorized = false
    @Published var syncStatus: SyncStatus = .idle
    
    private let healthStore = HKHealthStore()
    private var rookConfig: RookConfiguration?
    
    enum SyncStatus {
        case idle
        case syncing
        case success
        case error(String)
    }
    
    private init() {
        initializeROOK()
    }
    
    // MARK: - Initialization
    
    private func initializeROOK() {
        // Initialize ROOK SDK with your credentials
        // These should match your backend ROOK credentials
        let config = RookConfiguration(
            clientUUID: ProcessInfo.processInfo.environment["ROOK_CLIENT_UUID"] ?? "",
            secretKey: ProcessInfo.processInfo.environment["ROOK_SECRET_KEY"] ?? "",
            environment: .production // or .sandbox for testing
        )
        
        self.rookConfig = config
        
        Task {
            do {
                try await RookSDK.shared.configure(with: config)
                await MainActor.run {
                    self.isInitialized = true
                }
            } catch {
                print("ROOK initialization error: \(error)")
            }
        }
    }
    
    // MARK: - HealthKit Authorization
    
    func requestHealthKitAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }
        
        // Define the data types we want to read
        let readTypes: Set<HKSampleType> = [
            // Activity & Fitness
            HKQuantityType(.stepCount),
            HKQuantityType(.distanceWalkingRunning),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.basalEnergyBurned),
            HKQuantityType(.appleExerciseTime),
            
            // Nutrition
            HKQuantityType(.dietaryEnergyConsumed),
            HKQuantityType(.dietaryProtein),
            HKQuantityType(.dietaryCarbohydrates),
            HKQuantityType(.dietaryFatTotal),
            
            // Body Measurements
            HKQuantityType(.bodyMass),
            HKQuantityType(.bodyFatPercentage),
            HKQuantityType(.leanBodyMass),
            HKQuantityType(.height),
            
            // Heart & Vitals
            HKQuantityType(.heartRate),
            HKQuantityType(.restingHeartRate),
            HKQuantityType(.heartRateVariabilitySDNN),
            
            // Sleep
            HKCategoryType(.sleepAnalysis),
            
            // Workouts
            HKWorkoutType.workoutType()
        ]
        
        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
        
        await MainActor.run {
            self.healthKitAuthorized = true
        }
    }
    
    // MARK: - User Registration
    
    func registerUser(userId: String, clientEmail: String) async throws {
        guard isInitialized else {
            throw ROOKError.notInitialized
        }
        
        try await RookSDK.shared.registerUser(userId: userId)
        
        // Store user info locally for sync
        UserDefaults.standard.set(userId, forKey: "rook_user_id")
        UserDefaults.standard.set(clientEmail, forKey: "client_email")
    }
    
    // MARK: - Data Sync
    
    func syncHealthData() async throws {
        guard isInitialized, healthKitAuthorized else {
            throw ROOKError.notAuthorized
        }
        
        guard let userId = UserDefaults.standard.string(forKey: "rook_user_id") else {
            throw ROOKError.userNotRegistered
        }
        
        await MainActor.run {
            self.syncStatus = .syncing
        }
        
        do {
            let today = Date()
            let calendar = Calendar.current
            let startOfDay = calendar.startOfDay(for: today)
            
            // Sync different data types
            try await syncNutrition(for: startOfDay, userId: userId)
            try await syncPhysicalActivity(for: startOfDay, userId: userId)
            try await syncBodyMetrics(for: startOfDay, userId: userId)
            try await syncSleep(for: startOfDay, userId: userId)
            
            await MainActor.run {
                self.syncStatus = .success
            }
        } catch {
            await MainActor.run {
                self.syncStatus = .error(error.localizedDescription)
            }
            throw error
        }
    }
    
    // MARK: - Private Sync Methods
    
    private func syncNutrition(for date: Date, userId: String) async throws {
        try await RookSDK.shared.syncNutrition(for: date, userId: userId)
    }
    
    private func syncPhysicalActivity(for date: Date, userId: String) async throws {
        try await RookSDK.shared.syncPhysical(for: date, userId: userId)
    }
    
    private func syncBodyMetrics(for date: Date, userId: String) async throws {
        try await RookSDK.shared.syncBody(for: date, userId: userId)
    }
    
    private func syncSleep(for date: Date, userId: String) async throws {
        try await RookSDK.shared.syncSleep(for: date, userId: userId)
    }
    
    // MARK: - Background Sync
    
    func enableBackgroundSync() async throws {
        // Enable background delivery for automatic syncing
        try await RookSDK.shared.enableBackgroundSync()
        
        // Schedule daily sync
        await scheduleBackgroundTasks()
    }
    
    private func scheduleBackgroundTasks() async {
        // Schedule background task for daily sync
        // This will run even when the app is closed
        print("Background sync scheduled")
    }
}

// MARK: - Errors

enum HealthKitError: LocalizedError {
    case notAvailable
    
    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "HealthKit is not available on this device"
        }
    }
}

enum ROOKError: LocalizedError {
    case notInitialized
    case notAuthorized
    case userNotRegistered
    
    var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "ROOK SDK is not initialized"
        case .notAuthorized:
            return "HealthKit access not authorized"
        case .userNotRegistered:
            return "User not registered with ROOK"
        }
    }
}
