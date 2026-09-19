import AVFoundation
import SwiftUI
import UIKit

enum CameraAccess {
    static var hardwareAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    static func request() async -> Bool {
        guard hardwareAvailable else { return false }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return true
        case .notDetermined:
            return await AVCaptureDevice.requestAccess(for: .video)
        default:
            return false
        }
    }
}

enum MealPhotoJPEG {
    static let maxWidth: CGFloat = 1280
    static let quality: CGFloat = 0.82

    static func make(from image: UIImage) -> Data? {
        normalized(image).jpegData(compressionQuality: quality)
    }

    static func make(from data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        return make(from: image)
    }

    private static func normalized(_ image: UIImage) -> UIImage {
        let width = min(image.size.width, maxWidth)
        let scale = width / max(image.size.width, 1)
        let size = CGSize(
            width: max(1, width.rounded()),
            height: max(1, (image.size.height * scale).rounded())
        )
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}

struct CameraPicker: UIViewControllerRepresentable {
    var onImage: (UIImage) -> Void
    var onCancel: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onImage: onImage, onCancel: onCancel)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.allowsEditing = false
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {
        context.coordinator.onImage = onImage
        context.coordinator.onCancel = onCancel
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        var onImage: (UIImage) -> Void
        var onCancel: () -> Void

        init(onImage: @escaping (UIImage) -> Void, onCancel: @escaping () -> Void) {
            self.onImage = onImage
            self.onCancel = onCancel
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                onImage(image)
            } else {
                onCancel()
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onCancel()
        }
    }
}
