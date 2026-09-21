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
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl } from "@workspace/api-client-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { resolveApiBaseUrl } from "@/lib/api";
import { colors, motion, radii, space, type } from "@/theme/tokens";

type StubConnection = {
  id: string;
  name: string;
  detail: string;
  platform: "ios" | "android" | "any";
  scopes?: string[];
};

const STUB_KEY = "log.connections.stubs";

const HC_SCOPES = ["Steps", "Sleep", "Heart rate", "Weight"] as const;

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
    detail:
      "Mark intent for Android vitals — native read lands next. Nothing leaves the phone yet.",
    platform: "android",
    scopes: [...HC_SCOPES],
  },
  {
    id: "google_fit",
    name: "Google Fit",
    detail: "Legacy Fit fallback when Health Connect is unavailable",
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

function ConnectionRow({
  item,
  on,
  onToggle,
  index,
}: {
  item: StubConnection;
  on: boolean;
  onToggle: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 60).springify()}>
      <Animated.View style={anim}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(motion.pressScale, motion.spring);
          }}
          onPressOut={() => {
            scale.value = withSpring(1, motion.spring);
          }}
          onPress={onToggle}
          style={[styles.connRow, on && styles.connRowOn]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.connName}>{item.name}</Text>
            <Text style={styles.connDetail}>{item.detail}</Text>
            {item.scopes ? (
              <View style={styles.scopeRow}>
                {item.scopes.map((scope) => (
                  <View
                    key={scope}
                    style={[styles.scopeChip, on && styles.scopeChipOn]}
                  >
                    <Text
                      style={[styles.scopeText, on && styles.scopeTextOn]}
                    >
                      {scope}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View style={[styles.badge, on && styles.badgeOn]}>
            <Text style={[styles.badgeText, on && styles.badgeTextOn]}>
              {on ? "Enabled" : item.id === "health_connect" ? "Enable" : "Stub"}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useWorkout();
  const [rest, setRest] = useState(String(settings.restSeconds));
  const [apiUrl, setApiUrl] = useState(settings.apiBaseUrl || resolveApiBaseUrl());
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function toggleStub(id: string) {
    const nextOn = !enabled[id];
    const next = { ...enabled, [id]: nextOn };
    setEnabled(next);
    await AsyncStorage.setItem(STUB_KEY, JSON.stringify(next));
    if (id === "health_connect") {
      setToast(
        nextOn
          ? "Health Connect marked — scopes ready when native read ships"
          : "Health Connect stub cleared",
      );
    }
  }

  const connections = visibleCatalog();
  const isAndroid = Platform.OS === "android";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(420).springify()}>
        <Text style={styles.brand}>Settings</Text>
        <Text style={styles.sub}>
          Charcoal + lime #C6F135 — same tokens as web Today and iOS.
        </Text>
      </Animated.View>

      {toast ? (
        <Animated.View
          entering={FadeInDown.duration(280).springify()}
          style={styles.toast}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}

      <Text style={styles.section}>
        {isAndroid ? "Health Connect" : "Connections"}
      </Text>
      <Text style={styles.sectionHint}>
        {isAndroid
          ? "Enable Health Connect to claim it on this device. Native permission prompts and hub sync land next — no data leaves the phone yet."
          : Platform.OS === "ios"
            ? "Use the native Log app for live HealthKit. Stubs here stay local."
            : "Platform stubs for planning — enable to mark intent on this device."}
      </Text>

      <View style={styles.connList}>
        {connections.map((item, index) => (
          <ConnectionRow
            key={item.id}
            item={item}
            on={!!enabled[item.id]}
            onToggle={() => void toggleStub(item.id)}
            index={index}
          />
        ))}
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
        Display preference only — values are stored in kg.
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
        <Text style={styles.tokenLine}>
          accent #C6F135 · bg #0A0A0B · surface #101012 · card #141416
        </Text>
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
  toast: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.sm,
  },
  toastText: {
    fontFamily: type.bodyMed,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
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
    alignItems: "flex-start",
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
    lineHeight: 16,
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  scopeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.muted,
  },
  scopeChipOn: {
    backgroundColor: "rgba(198, 241, 53, 0.22)",
  },
  scopeText: {
    fontFamily: type.bodyMed,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  scopeTextOn: {
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.muted,
    marginTop: 2,
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
