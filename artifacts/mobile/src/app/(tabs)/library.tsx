import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useGetExerciseFilters, useListExercises } from "@workspace/api-client-react";
import { ExerciseRow } from "@/components/ExerciseRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { colors, radii, space, type } from "@/theme/tokens";

export default function LibraryScreen() {
  const router = useRouter();
  const { active, startWorkout } = useWorkout();
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<string | undefined>();
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 220);
    return () => clearTimeout(t);
  }, [search]);

  const filtersQuery = useGetExerciseFilters();
  const listQuery = useListExercises({
    search: debounced || undefined,
    bodyPart,
    equipment,
    page: 1,
    limit: 40,
  });

  const bodyParts = filtersQuery.data?.bodyParts ?? [];
  const equipmentList = filtersQuery.data?.equipment ?? [];
  const exercises = listQuery.data?.exercises ?? [];

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#12180A", colors.background]}
        style={styles.heroBleed}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.headerBlock}>
        <Text style={styles.brand}>Library</Text>
        <Text style={styles.tagline}>Find a movement. Log the set.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          placeholderTextColor={colors.faint}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filterBlock}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["All", ...bodyParts]}
          keyExtractor={(item) => `bp-${item}`}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const selected = item === "All" ? !bodyPart : bodyPart === item;
            return (
              <Pressable
                onPress={() => setBodyPart(item === "All" ? undefined : item)}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{item}</Text>
              </Pressable>
            );
          }}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["Any gear", ...equipmentList]}
          keyExtractor={(item) => `eq-${item}`}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const selected = item === "Any gear" ? !equipment : equipment === item;
            return (
              <Pressable
                onPress={() => setEquipment(item === "Any gear" ? undefined : item)}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{item}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {listQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : listQuery.isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Can't reach the API</Text>
          <Text style={styles.errorBody}>
            Start `@workspace/api-server` and set EXPO_PUBLIC_API_URL if needed.
          </Text>
          <PrimaryButton title="Retry" size="md" onPress={() => listQuery.refetch()} />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.count}>
                {listQuery.data?.total ?? 0} exercises
              </Text>
              <PrimaryButton
                title={active ? "Resume workout" : "Start empty workout"}
                size="md"
                onPress={async () => {
                  if (!active) await startWorkout();
                  router.push("/active");
                }}
                style={{ flex: 1 }}
              />
            </View>
          }
          renderItem={({ item, index }) => (
            <ExerciseRow
              exercise={item}
              index={index}
              onPress={() => router.push(`/exercise/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No exercises match those filters.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroBleed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  headerBlock: {
    paddingHorizontal: space.screen,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  brand: {
    fontFamily: type.display,
    fontSize: 34,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: type.body,
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  searchWrap: {
    paddingHorizontal: space.screen,
    marginBottom: space.sm,
  },
  search: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 48,
    paddingHorizontal: space.lg,
    fontFamily: type.body,
    fontSize: 16,
    color: colors.foreground,
  },
  filterBlock: {
    gap: space.sm,
    marginBottom: space.sm,
  },
  chips: {
    paddingHorizontal: space.screen,
    gap: space.sm,
  },
  chip: {
    backgroundColor: colors.muted,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    minHeight: 40,
    justifyContent: "center",
    marginRight: 0,
  },
  chipOn: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: type.bodyMed,
    fontSize: 13,
    color: colors.mutedForeground,
    textTransform: "capitalize",
  },
  chipTextOn: {
    color: colors.primary,
  },
  list: {
    paddingHorizontal: space.screen,
    paddingBottom: 120,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md,
    marginTop: space.sm,
  },
  count: {
    fontFamily: type.bodyMed,
    fontSize: 13,
    color: colors.mutedForeground,
    minWidth: 90,
  },
  empty: {
    fontFamily: type.body,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 40,
  },
  errorBox: {
    margin: space.screen,
    padding: space.lg,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    gap: space.md,
  },
  errorTitle: {
    fontFamily: type.displaySemi,
    fontSize: 18,
    color: colors.foreground,
  },
  errorBody: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
