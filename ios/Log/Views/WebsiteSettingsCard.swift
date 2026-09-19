import SwiftUI
import SwiftData
import UIKit

struct WebsiteSettingsCard: View {
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync

    @State private var address = APIClient.baseURLString
    @State private var code = APIClient.token

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionLabel(text: "WEBSITE")
            Text("On the same Wi-Fi as your computer, Log can keep this phone and the website in step.")
                .font(.system(size: 14))
                .foregroundStyle(Palette.muted)

            field("Website address", text: $address, placeholder: APIClient.detectedWebsite, keyboard: .URL)
            field("Access code", text: $code, placeholder: "Optional", keyboard: .default)

            if let notice = sync.lastNotice {
                Text(notice)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }

            Button(sync.isUpdating ? "Updating…" : "Update now") {
                APIClient.setBaseURL(address)
                APIClient.setToken(code)
                Task { await sync.refresh(context: context) }
            }
            .buttonStyle(BlockButtonStyle())
            .disabled(sync.isUpdating)
        }
    }

    private func field(_ title: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: title.uppercased())
            TextField(placeholder, text: text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(keyboard)
                .font(.system(size: 16))
                .foregroundStyle(Palette.ink)
                .padding(.bottom, 8)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(Palette.line).frame(height: 1)
                }
                .onChange(of: text.wrappedValue) { _, value in
                    if title == "Website address" {
                        APIClient.setBaseURL(value)
                    } else {
                        APIClient.setToken(value)
                    }
                }
        }
    }
}
