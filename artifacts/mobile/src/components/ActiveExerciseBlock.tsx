import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { LoggedExercise, LoggedSet } from "@/store/workoutStore";
import { colors, radii, space, type } from "@/theme/tokens";

type Props = {
  exercise: LoggedExercise;
  onChangeSet: (setId: string, patch: Partial<Pick<LoggedSet, "reps" | "weightKg">>) => void;
  onCompleteSet: (setId: string) => void;
  onAddSet: () => void;
  onRemove: () => void;
};

export function ActiveExerciseBlock({
  exercise,
  onChangeSet,
  onCompleteSet,
  onAddSet,
  onRemove,
}: Props) {
  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{exercise.name}</Text>
          {exercise.bodyPart ? (
            <Text style={styles.part}>{exercise.bodyPart}</Text>
          ) : null}
        </View>
        <Pressable onPress={onRemove} hitSlop={10}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>

      <View style={styles.colHeaders}>
        <Text style={[styles.colLabel, styles.setCol]}>SET</Text>
        <Text style={[styles.colLabel, styles.numCol]}>KG</Text>
        <Text style={[styles.colLabel, styles.numCol]}>REPS</Text>
        <Text style={[styles.colLabel, styles.doneCol]} />
      </View>

      {exercise.sets.map((set, i) => (
        <View key={set.id} style={[styles.setRow, set.completed && styles.setDone]}>
          <Text style={[styles.setIndex, styles.setCol]}>{i + 1}</Text>
          <TextInput
            style={[styles.input, styles.numCol]}
            keyboardType="decimal-pad"
            value={set.weightKg === 0 ? "" : String(set.weightKg)}
            editable={!set.completed}
            placeholder="0"
            placeholderTextColor={colors.faint}
            onChangeText={(t) => {
              const n = Number(t.replace(",", "."));
              onChangeSet(set.id, { weightKg: Number.isFinite(n) ? n : 0 });
            }}
          />
          <TextInput
            style={[styles.input, styles.numCol]}
            keyboardType="number-pad"
            value={set.reps === 0 ? "" : String(set.reps)}
            editable={!set.completed}
            placeholder="0"
            placeholderTextColor={colors.faint}
            onChangeText={(t) => {
              const n = Number.parseInt(t, 10);
              onChangeSet(set.id, { reps: Number.isFinite(n) ? n : 0 });
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={set.completed ? "Set complete" : "Complete set"}
            disabled={set.completed}
            onPress={() => onCompleteSet(set.id)}
            style={[styles.check, set.completed && styles.checkOn]}
          >
            <Text style={styles.checkMark}>{set.completed ? "✓" : ""}</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={onAddSet} style={styles.addSet}>
        <Text style={styles.addSetText}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: space.md,
    gap: space.md,
  },
  name: {
    fontFamily: type.displaySemi,
    fontSize: 20,
    color: colors.foreground,
  },
  part: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textTransform: "capitalize",
    marginTop: 2,
  },
  remove: {
    fontFamily: type.bodyMed,
    fontSize: 13,
    color: colors.faint,
  },
  colHeaders: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.sm,
  },
  colLabel: {
    fontFamily: type.bodyMed,
    fontSize: 11,
    color: colors.faint,
    letterSpacing: 0.6,
  },
  setCol: { width: 40 },
  numCol: { flex: 1 },
  doneCol: { width: 52 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.sm,
    gap: space.sm,
    minHeight: 52,
  },
  setDone: {
    opacity: 0.55,
  },
  setIndex: {
    fontFamily: type.displayMed,
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  input: {
    backgroundColor: colors.muted,
    borderRadius: radii.sm,
    minHeight: 52,
    paddingHorizontal: space.md,
    fontFamily: type.display,
    fontSize: 28,
    color: colors.foreground,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  check: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: colors.primary,
  },
  checkMark: {
    fontFamily: type.display,
    fontSize: 22,
    color: colors.onPrimary,
  },
  addSet: {
    marginTop: space.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  addSetText: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.primary,
  },
});
