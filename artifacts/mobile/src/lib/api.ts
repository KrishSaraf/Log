import { Platform } from "react-native";
import { setBaseUrl } from "@workspace/api-client-react";

/**
 * Resolve API base URL for Expo (web / iOS sim / Android emulator / device).
 * Override with EXPO_PUBLIC_API_URL (no trailing slash; paths start with /api).
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  if (Platform.OS === "android") {
    // Android emulator → host loopback
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
}

export function configureApiClient(override?: string | null): void {
  setBaseUrl(override?.replace(/\/+$/, "") || resolveApiBaseUrl());
}
