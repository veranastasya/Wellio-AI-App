// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Wellio",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "Wellio",
            targets: ["Wellio"]
        )
    ],
    dependencies: [
        // ROOK SDK for Apple Health integration
        .package(url: "https://github.com/RookeriesDevelopment/rook-ios-sdk.git", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "Wellio",
            dependencies: [
                .product(name: "RookSDK", package: "rook-ios-sdk")
            ]
        )
    ]
)
