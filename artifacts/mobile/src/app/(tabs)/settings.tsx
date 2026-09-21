import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { setBaseUrl } from "@workspace/api-client-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { resolveApiBaseUrl } from "@/lib/api";
import { colors, radii, space, type } from "@/theme/tokens";

export default function SettingsScreen() {
  const { settings, updateSettings } = useWorkout();
  const [rest, setRest] = useState(String(settings.restSeconds));
  const [apiUrl, setApiUrl] = useState(settings.apiBaseUrl || resolveApiBaseUrl());

  useEffect(() => {
    setRest(String(settings.restSeconds));
  }, [settings.restSeconds]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Settings</Text>
      <Text style={styles.sub}>
        Charcoal + lime — same tokens as web Today and iOS. Hub auth sync lands next.
      </Text>

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
        <Text style={styles.tokenLine}>accent #C6F135 · bg #0A0A0B · card #141416</Text>
        <Text style={styles.tokenLine}>radius 12 · Outfit + Inter (match lyfta-exercises)</Text>
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
    marginBottom: space.lg,
    lineHeight: 20,
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
