import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetExercise } from "@workspace/api-client-react";
import { ExerciseHeroMedia } from "@/components/ExerciseRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { colors, radii, space, type } from "@/theme/tokens";

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { addExercise, active, startWorkout } = useWorkout();
  const query = useGetExercise(id ?? "missing", {
    // Generated Orval types require full UseQueryOptions; cast for `enabled`.
    query: { enabled: Boolean(id) } as never,
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Exercise not found</Text>
        <PrimaryButton title="Back" size="md" onPress={() => router.back()} />
      </View>
    );
  }

  const exercise = query.data;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ExerciseHeroMedia exercise={exercise} />

      <Text style={styles.name}>{exercise.name}</Text>
      <Text style={styles.meta}>
        {exercise.bodyPart} · {exercise.target} · {exercise.equipment}
      </Text>
      <View style={styles.levelPill}>
        <Text style={styles.levelText}>{exercise.level}</Text>
      </View>

      {exercise.secondaryMuscles?.length ? (
        <>
          <Text style={styles.section}>Also works</Text>
          <Text style={styles.body}>{exercise.secondaryMuscles.join(" · ")}</Text>
        </>
      ) : null}

      <Text style={styles.section}>How to</Text>
      {(exercise.instructions ?? []).map((step, i) => (
        <View key={`${i}-${step.slice(0, 12)}`} style={styles.step}>
          <Text style={styles.stepNum}>{i + 1}</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      <PrimaryButton
        title={active ? "Add to workout" : "Start workout with this"}
        onPress={async () => {
          if (!active) await startWorkout();
          await addExercise({
            exerciseId: exercise.id,
            name: exercise.name,
            bodyPart: exercise.bodyPart,
          });
          router.push("/active");
        }}
        style={{ marginTop: space.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.screen, paddingBottom: 60 },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  error: {
    fontFamily: type.bodyMed,
    color: colors.mutedForeground,
  },
  name: {
    fontFamily: type.display,
    fontSize: 28,
    color: colors.foreground,
    marginTop: space.lg,
  },
  meta: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textTransform: "capitalize",
    marginTop: 6,
  },
  levelPill: {
    alignSelf: "flex-start",
    marginTop: space.md,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  levelText: {
    fontFamily: type.bodySemi,
    fontSize: 12,
    color: colors.primary,
    textTransform: "capitalize",
  },
  section: {
    fontFamily: type.displaySemi,
    fontSize: 16,
    color: colors.foreground,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  body: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textTransform: "capitalize",
  },
  step: {
    flexDirection: "row",
    gap: space.md,
    marginBottom: space.md,
  },
  stepNum: {
    fontFamily: type.display,
    fontSize: 18,
    color: colors.primary,
    width: 28,
  },
  stepText: {
    flex: 1,
    fontFamily: type.body,
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
  },
});
