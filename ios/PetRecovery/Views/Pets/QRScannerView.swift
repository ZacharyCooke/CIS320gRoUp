import SwiftUI
import AVFoundation

/// Extracts the public profile token from a scanned string. Accepts either a
/// full URL (…/p/<token>) or a bare token.
func extractProfileToken(from decoded: String) -> String? {
    let trimmed = decoded.trimmingCharacters(in: .whitespacesAndNewlines)
    if let range = trimmed.range(of: "/p/") {
        let tail = trimmed[range.upperBound...]
        let token = tail.prefix { $0 != "/" && $0 != "?" && $0 != "#" }
        return token.isEmpty ? nil : String(token)
    }
    if trimmed.count >= 8, trimmed.allSatisfy({ $0.isLetter || $0.isNumber || $0 == "-" }) {
        return trimmed
    }
    return nil
}

struct QRScannerView: View {
    var onScanned: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var cameraError: String?

    var body: some View {
        NavigationStack {
            ZStack {
                if let error = cameraError {
                    Text(error).foregroundStyle(.red).padding().accessibilityLabel("Error: \(error)")
                } else {
                    QRScannerRepresentable(
                        onScanned: handleScan,
                        onError: { cameraError = $0 }
                    )
                    .ignoresSafeArea()
                    .accessibilityHidden(true)
                    VStack {
                        Spacer()
                        Text("Point your camera at a pet's QR code")
                            .padding()
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .padding(.bottom, 40)
                            .accessibilityLabel("Point your camera at a pet's QR code. If you can't see the code to aim the camera, ask someone nearby for help, or look up the pet's profile URL directly.")
                    }
                }
            }
            .navigationTitle("Scan QR")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func handleScan(_ value: String) {
        guard let token = extractProfileToken(from: value) else { return }
        dismiss()
        onScanned(token)
    }
}

private struct QRScannerRepresentable: UIViewControllerRepresentable {
    var onScanned: (String) -> Void
    var onError: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onScanned: onScanned)
    }

    func makeUIViewController(context: Context) -> ScannerViewController {
        let controller = ScannerViewController()
        controller.coordinator = context.coordinator
        controller.onError = onError
        return controller
    }

    func updateUIViewController(_ controller: ScannerViewController, context: Context) {}

    final class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
        private let onScanned: (String) -> Void
        private var didScan = false

        init(onScanned: @escaping (String) -> Void) {
            self.onScanned = onScanned
        }

        func metadataOutput(
            _ output: AVCaptureMetadataOutput,
            didOutput metadataObjects: [AVMetadataObject],
            from connection: AVCaptureConnection
        ) {
            guard !didScan,
                  let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
                  let value = object.stringValue else { return }
            didScan = true
            onScanned(value)
        }
    }
}

private final class ScannerViewController: UIViewController {
    var coordinator: QRScannerRepresentable.Coordinator?
    var onError: ((String) -> Void)?
    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        configureSession()
    }

    private func configureSession() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            onError?("Unable to access camera. Check permissions in Settings.")
            return
        }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            onError?("Unable to start QR scanner.")
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(coordinator, queue: .main)
        output.metadataObjectTypes = [.qr]

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.addSublayer(layer)
        previewLayer = layer

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.session.stopRunning()
            }
        }
    }
}
