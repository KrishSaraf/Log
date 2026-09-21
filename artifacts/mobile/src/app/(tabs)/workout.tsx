import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { colors, radii, space, type } from "@/theme/tokens";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WorkoutTab() {
  const router = useRouter();
  const { active, history, startWorkout, hydrated } = useWorkout();

  if (!hydrated) {
    return <View style={styles.screen} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Workout</Text>
      <Text style={styles.sub}>
        One-handed logging. Prefills last session. Rest timer after every set.
      </Text>

      {active ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>In progress</Text>
          <Text style={styles.activeName}>{active.name}</Text>
          <Text style={styles.activeMeta}>
            {active.exercises.length} exercises · started {formatDate(active.startedAt)}
          </Text>
          <PrimaryButton title="Continue session" onPress={() => router.push("/active")} />
        </View>
      ) : (
        <PrimaryButton
          title="Start workout"
          onPress={async () => {
            await startWorkout();
            router.push("/active");
          }}
        />
      )}

      <Text style={styles.section}>History</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>
          Finished sessions stay on-device for now. Prefills unlock after your first save.
          {/* TODO: POST /api/workouts when mobile sync lands on api-server */}
        </Text>
      ) : (
        history.map((session) => {
          const sets = session.exercises.reduce(
            (n, ex) => n + ex.sets.filter((s) => s.completed).length,
            0,
          );
          return (
            <View key={session.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyName}>{session.name}</Text>
                <Text style={styles.historyMeta}>
                  {formatDate(session.finishedAt ?? session.startedAt)} · {sets} sets
                </Text>
              </View>
              <Text style={styles.historyCount}>{session.exercises.length}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.screen, paddingBottom: 80, gap: space.md },
  brand: {
    fontFamily: type.display,
    fontSize: 32,
    color: colors.foreground,
  },
  sub: {
    fontFamily: type.body,
    fontSize: 15,
    color: colors.mutedForeground,
    marginBottom: space.sm,
  },
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: space.lg,
    gap: space.sm,
  },
  activeLabel: {
    fontFamily: type.bodyMed,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  activeName: {
    fontFamily: type.displaySemi,
    fontSize: 22,
    color: colors.foreground,
  },
  activeMeta: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: space.sm,
  },
  section: {
    fontFamily: type.displaySemi,
    fontSize: 18,
    color: colors.foreground,
    marginTop: space.lg,
  },
  empty: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    minHeight: 64,
  },
  historyName: {
    fontFamily: type.bodySemi,
    fontSize: 16,
    color: colors.foreground,
  },
  historyMeta: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  historyCount: {
    fontFamily: type.display,
    fontSize: 24,
    color: colors.primary,
  },
});
