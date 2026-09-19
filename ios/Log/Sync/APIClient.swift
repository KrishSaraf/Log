import Foundation

enum APIClient {
    static let baseURLKey = "log.apiBase"
    static let tokenKey = "log.apiToken"

    static var detectedWebsite: String {
        #if targetEnvironment(simulator)
        return "http://127.0.0.1:3001"
        #else
        return "http://192.168.68.64:3001"
        #endif
    }

    static var baseURLString: String {
        let stored = UserDefaults.standard.string(forKey: baseURLKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let raw = stored.isEmpty ? detectedWebsite : stored
        return raw.hasSuffix("/") ? String(raw.dropLast()) : raw
    }

    static var token: String {
        UserDefaults.standard.string(forKey: tokenKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }

    static func setBaseURL(_ value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            UserDefaults.standard.removeObject(forKey: baseURLKey)
        } else {
            UserDefaults.standard.set(trimmed, forKey: baseURLKey)
        }
    }

    static func setToken(_ value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            UserDefaults.standard.removeObject(forKey: tokenKey)
        } else {
            UserDefaults.standard.set(trimmed, forKey: tokenKey)
        }
    }

    static func snapshot() async throws -> SyncSnapshot {
        let data = try await send(method: "GET", path: "/api/sync/snapshot")
        return try SyncSnapshot.decode(from: data)
    }

    @discardableResult
    static func send(
        method: String,
        path: String,
        json: Any? = nil
    ) async throws -> Data {
        guard let url = URL(string: baseURLString + path) else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 18
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("1", forHTTPHeaderField: "X-Log-Dev")

        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue(token, forHTTPHeaderField: "X-Log-Token")
        }

        if let json {
            request.httpBody = try JSONSerialization.data(withJSONObject: json)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.unreachable }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(http.statusCode)
        }
        return data
    }

    /// Tries paths in order; returns the first 2xx JSON object (or empty object).
    static func sendFirstOK(
        method: String,
        paths: [String],
        json: Any? = nil
    ) async -> [String: Any]? {
        for path in paths {
            if let data = try? await send(method: method, path: path, json: json) {
                if data.isEmpty { return [:] }
                if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    return object
                }
                return [:]
            }
        }
        return nil
    }

    static func stringID(from object: [String: Any]?, keys: [String]) -> String? {
        guard let object else { return nil }
        for key in keys {
            if let value = object[key] as? String, !value.isEmpty { return value }
            if let value = object[key] as? NSNumber { return value.stringValue }
        }
        return nil
    }
}

enum APIError: Error {
    case badURL
    case unreachable
    case http(Int)
}
