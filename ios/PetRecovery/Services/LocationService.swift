import CoreLocation
import Foundation

final class LocationService: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationService()

    private let manager = CLLocationManager()

    @Published var currentLocation: CLLocationCoordinate2D?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var error: Error?

    private var onceHandler: ((CLLocationCoordinate2D) -> Void)?
    private var onceWithAccuracyHandler: ((CLLocationCoordinate2D, CLLocationAccuracy) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        authorizationStatus = manager.authorizationStatus
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func requestOnce(completion: @escaping (CLLocationCoordinate2D) -> Void) {
        onceHandler = completion
        if manager.authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else {
            manager.requestLocation()
        }
    }

    // Proximity verification needs the reported GPS accuracy alongside the
    // coordinate — poor accuracy (> 15m) must prompt manual confirmation
    // rather than silently pass/fail (see ProximityVerificationView).
    func requestOnceWithAccuracy(completion: @escaping (CLLocationCoordinate2D, CLLocationAccuracy) -> Void) {
        onceWithAccuracyHandler = completion
        if manager.authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else {
            manager.requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        DispatchQueue.main.async {
            self.currentLocation = location.coordinate
            self.onceHandler?(location.coordinate)
            self.onceHandler = nil
            self.onceWithAccuracyHandler?(location.coordinate, location.horizontalAccuracy)
            self.onceWithAccuracyHandler = nil
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        DispatchQueue.main.async { self.error = error }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async {
            self.authorizationStatus = manager.authorizationStatus
        }
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            if onceHandler != nil || onceWithAccuracyHandler != nil { manager.requestLocation() }
        }
    }
}
