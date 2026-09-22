import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActiveExerciseBlock } from "@/components/ActiveExerciseBlock";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RestTimerBar } from "@/components/RestTimerBar";
import { useWorkout } from "@/hooks/useWorkout";
import { colors, space, type } from "@/theme/tokens";

export default function ActiveWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    active,
    restEndsAt,
    completeSet,
    updateSet,
    addSet,
    removeExercise,
    finishWorkout,
    discardWorkout,
    dismissRest,
  } = useWorkout();

  if (!active) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.empty}>No active workout</Text>
        <PrimaryButton title="Back to library" size="md" onPress={() => router.replace("/")} />
      </View>
    );
  }

  const completedSets = active.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.topBtn}
        >
          <Text style={styles.topBtnText}>Hide</Text>
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.title}>{active.name}</Text>
          <Text style={styles.meta}>{completedSets} sets logged</Text>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert("Discard workout?", "This session will be lost.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: async () => {
                  await discardWorkout();
                  router.replace("/workout");
                },
              },
            ]);
          }}
          hitSlop={12}
          style={styles.topBtn}
        >
          <Text style={[styles.topBtnText, { color: colors.danger }]}>Discard</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: restEndsAt ? 140 : 120 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {active.exercises.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.empty}>Add exercises from the library</Text>
            <PrimaryButton
              title="Browse library"
              size="md"
              onPress={() => router.push("/")}
            />
          </View>
        ) : (
          active.exercises.map((ex) => (
            <ActiveExerciseBlock
              key={ex.id}
              exercise={ex}
              onChangeSet={(setId, patch) => void updateSet(ex.id, setId, patch)}
              onCompleteSet={(setId) => void completeSet(ex.id, setId)}
              onAddSet={() => void addSet(ex.id)}
              onRemove={() => void removeExercise(ex.id)}
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title="Add exercise"
          variant="ghost"
          size="md"
          style={{ flex: 1 }}
          onPress={() => router.push("/")}
        />
        <PrimaryButton
          title="Finish"
          size="md"
          style={{ flex: 1 }}
          disabled={completedSets === 0}
          onPress={() => {
            Alert.alert("Finish workout?", "Save this session to history.", [
              { text: "Keep going", style: "cancel" },
              {
                text: "Finish",
                onPress: async () => {
                  await finishWorkout();
                  router.replace("/workout");
                },
              },
            ]);
          }}
        />
      </View>

      {restEndsAt ? <RestTimerBar endsAt={restEndsAt} onSkip={dismissRest} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center", gap: space.md },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.screen,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  topBtn: { minWidth: 64, minHeight: 44, justifyContent: "center" },
  topBtnText: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  topCenter: { flex: 1, alignItems: "center" },
  title: {
    fontFamily: type.displaySemi,
    fontSize: 18,
    color: colors.foreground,
  },
  meta: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space.md,
  },
  emptyBlock: {
    marginTop: 80,
    alignItems: "center",
    gap: space.lg,
  },
  empty: {
    fontFamily: type.bodyMed,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.screen,
    paddingTop: space.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
