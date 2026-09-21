import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl } from "@workspace/api-client-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { resolveApiBaseUrl } from "@/lib/api";
import { colors, radii, space, type } from "@/theme/tokens";

type StubConnection = {
  id: string;
  name: string;
  detail: string;
  platform: "ios" | "android" | "any";
};

const STUB_KEY = "log.connections.stubs";

const CATALOG: StubConnection[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    detail: "HealthKit sync lives in the native iOS Log app",
    platform: "ios",
  },
  {
    id: "health_connect",
    name: "Health Connect",
    detail: "Android vitals stub — native read coming soon",
    platform: "android",
  },
  {
    id: "google_fit",
    name: "Google Fit",
    detail: "Legacy Fit streams · placeholder until Health Connect ships",
    platform: "android",
  },
];

function visibleCatalog(): StubConnection[] {
  if (Platform.OS === "android") {
    return CATALOG.filter((c) => c.platform === "android" || c.platform === "any");
  }
  if (Platform.OS === "ios") {
    return CATALOG.filter((c) => c.platform === "ios" || c.platform === "any");
  }
  return CATALOG;
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useWorkout();
  const [rest, setRest] = useState(String(settings.restSeconds));
  const [apiUrl, setApiUrl] = useState(settings.apiBaseUrl || resolveApiBaseUrl());
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRest(String(settings.restSeconds));
  }, [settings.restSeconds]);

  useEffect(() => {
    void AsyncStorage.getItem(STUB_KEY).then((raw) => {
      if (!raw) return;
      try {
        setEnabled(JSON.parse(raw) as Record<string, boolean>);
      } catch {
        /* ignore */
      }
    });
  }, []);

  async function toggleStub(id: string) {
    const next = { ...enabled, [id]: !enabled[id] };
    setEnabled(next);
    await AsyncStorage.setItem(STUB_KEY, JSON.stringify(next));
  }

  const connections = visibleCatalog();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Settings</Text>
      <Text style={styles.sub}>
        Charcoal + lime — same tokens as web Today and iOS. Hub auth sync lands next.
      </Text>

      <Text style={styles.section}>Connections</Text>
      <Text style={styles.sectionHint}>
        {Platform.OS === "android"
          ? "Health Connect stubs on this device. Enabling marks intent — no data leaves the phone yet."
          : Platform.OS === "ios"
            ? "Use the native Log app for live HealthKit. Stubs here stay local."
            : "Platform stubs for planning — enable to mark intent on this device."}
      </Text>
      <View style={styles.connList}>
        {connections.map((item) => {
          const on = !!enabled[item.id];
          return (
            <Pressable
              key={item.id}
              onPress={() => void toggleStub(item.id)}
              style={[styles.connRow, on && styles.connRowOn]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.connName}>{item.name}</Text>
                <Text style={styles.connDetail}>{item.detail}</Text>
              </View>
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={[styles.badgeText, on && styles.badgeTextOn]}>
                  {on ? "Enabled" : "Stub"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Rest timer (seconds)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={rest}
        onChangeText={setRest}
        onBlur={() => {
          const n = Number.parseInt(rest, 10);
          if (Number.isFinite(n) && n >= 15 && n <= 600) {
            void updateSettings({ restSeconds: n });
          } else {
            setRest(String(settings.restSeconds));
          }
        }}
      />

      <Text style={styles.label}>Weight unit</Text>
      <View style={styles.row}>
        {(["kg", "lb"] as const).map((unit) => {
          const on = settings.weightUnit === unit;
          return (
            <Pressable
              key={unit}
              onPress={() => void updateSettings({ weightUnit: unit })}
              style={[styles.unit, on && styles.unitOn]}
            >
              <Text style={[styles.unitText, on && styles.unitTextOn]}>{unit}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Display preference only — values are stored in kg. Lb conversion UI is TODO.
      </Text>

      <Text style={styles.label}>API base URL</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        value={apiUrl}
        onChangeText={setApiUrl}
        placeholder="http://localhost:3000"
        placeholderTextColor={colors.faint}
      />
      <PrimaryButton
        title="Save API URL"
        size="md"
        onPress={async () => {
          const cleaned = apiUrl.replace(/\/+$/, "");
          setBaseUrl(cleaned);
          await updateSettings({ apiBaseUrl: cleaned });
          Alert.alert("Saved", "API base URL updated for this device.");
        }}
      />

      <View style={styles.tokenCard}>
        <Text style={styles.tokenTitle}>Brand tokens</Text>
        <Text style={styles.tokenLine}>accent #C6F135 · bg #0A0A0B · surface #101012 · card #141416</Text>
        <Text style={styles.tokenLine}>radius 12 · Outfit + Inter</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.screen, paddingBottom: 80, gap: space.sm },
  brand: {
    fontFamily: type.display,
    fontSize: 32,
    color: colors.foreground,
  },
  sub: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: space.md,
    lineHeight: 20,
  },
  section: {
    fontFamily: type.displaySemi,
    fontSize: 18,
    color: colors.foreground,
    marginTop: space.sm,
  },
  sectionHint: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: space.sm,
  },
  connList: { gap: space.sm, marginBottom: space.md },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 72,
  },
  connRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  connName: {
    fontFamily: type.bodySemi,
    fontSize: 16,
    color: colors.foreground,
  },
  connDetail: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.muted,
  },
  badgeOn: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontFamily: type.bodyMed,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgeTextOn: {
    color: colors.onPrimary,
  },
  label: {
    fontFamily: type.bodySemi,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: space.md,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 48,
    paddingHorizontal: space.lg,
    fontFamily: type.body,
    fontSize: 16,
    color: colors.foreground,
    marginTop: space.sm,
  },
  row: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  unit: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  unitOn: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unitText: {
    fontFamily: type.displaySemi,
    fontSize: 16,
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },
  unitTextOn: { color: colors.primary },
  hint: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.faint,
    marginTop: 4,
  },
  tokenCard: {
    marginTop: space.xxl,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 6,
  },
  tokenTitle: {
    fontFamily: type.displaySemi,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 4,
  },
  tokenLine: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
