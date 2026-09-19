import ImageIO
import SwiftUI
import UIKit

enum PhotoMemory {
    static let images = NSCache<NSURL, UIImage>()
    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .returnCacheDataElseLoad
        config.urlCache = URLCache.shared
        config.timeoutIntervalForRequest = 20
        config.httpMaximumConnectionsPerHost = 4
        return URLSession(configuration: config)
    }()

    static func image(for url: URL, maxPixel: CGFloat) async -> UIImage? {
        let key = url as NSURL
        if let cached = images.object(forKey: key) { return cached }
        do {
            let (data, _) = try await session.data(from: url)
            guard let image = downsample(data: data, maxPixel: maxPixel) else { return nil }
            images.setObject(image, forKey: key)
            return image
        } catch {
            return nil
        }
    }

    private static func downsample(data: Data, maxPixel: CGFloat) -> UIImage? {
        let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
            return UIImage(data: data)
        }
        let options = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: max(maxPixel, 80),
        ] as CFDictionary
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
            return UIImage(data: data)
        }
        return UIImage(cgImage: cgImage)
    }
}

struct ExercisePhoto: View {
    let url: URL?
    var maxPixel: CGFloat = 480

    var body: some View {
        Rectangle()
            .fill(Palette.surface)
            .overlay {
                if let url {
                    CachedRemoteImage(url: url, maxPixel: maxPixel)
                } else {
                    BarbellPlaceholder()
                }
            }
            .clipped()
            .contentShape(Rectangle())
    }
}

private struct CachedRemoteImage: View {
    let url: URL
    var maxPixel: CGFloat
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                BarbellPlaceholder()
            }
        }
        .task(id: url) {
            if let cached = PhotoMemory.images.object(forKey: url as NSURL) {
                image = cached
                return
            }
            image = await PhotoMemory.image(for: url, maxPixel: maxPixel)
        }
    }
}

struct BarbellPlaceholder: View {
    var body: some View {
        ZStack {
            Palette.bg.opacity(0.65)
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 22, weight: .regular))
                .foregroundStyle(Palette.muted.opacity(0.45))
        }
        .accessibilityHidden(true)
    }
}
