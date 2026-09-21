# iOS (legacy SwiftUI)

The SwiftUI app in `Log/` was the original personal companion (SwiftData, HealthKit, LAN sync to `dashboard/`).

**Status: deprecated for new product UI.** Cross-platform development moved to Expo React Native:

```text
artifacts/mobile  (@workspace/mobile)
```

Keep this folder for:

- HealthKit / Apple Watch reference behavior
- Dashboard LAN sync payloads (`Sync/`) until a shared mobile API exists
- Historical comparison while Expo reaches feature parity

Do not invest in new Swift screens for library / workout logging — ship those in `artifacts/mobile`.
