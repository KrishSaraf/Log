import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { Exercise } from "@workspace/api-client-react";
import { colors, radii, space, type } from "@/theme/tokens";

type Props = {
  exercise: Exercise;
  onPress: () => void;
  index?: number;
};

export function ExerciseRow({ exercise, onPress, index = 0 }: Props) {
  const frames = exercise.images?.length
    ? exercise.images
    : exercise.gifUrl
      ? [exercise.gifUrl]
      : [];
  const [frame, setFrame] = useState(0);
  const playing = useRef(true);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => {
      if (!playing.current) return;
      setFrame((f) => (f + 1) % frames.length);
    }, 700);
    return () => clearInterval(id);
  }, [frames.length]);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          playing.current = true;
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={exercise.name}
      >
        <View style={styles.thumbWrap}>
          {frames[frame] ? (
            <Image source={{ uri: frames[frame] }} style={styles.thumb} resizeMode="contain" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}
        </View>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={2}>
            {exercise.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {exercise.bodyPart} · {exercise.equipment}
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ExerciseHeroMedia({ exercise }: { exercise: Exercise }) {
  const frames = exercise.images?.length
    ? exercise.images
    : exercise.gifUrl
      ? [exercise.gifUrl]
      : [];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), 650);
    return () => clearInterval(id);
  }, [frames.length, exercise.id]);

  return (
    <Animated.View entering={FadeIn} style={styles.hero}>
      {frames[frame] ? (
        <Image source={{ uri: frames[frame] }} style={styles.heroImg} resizeMode="contain" />
      ) : (
        <Text style={styles.heroEmpty}>No demo</Text>
      )}
      {frames.length > 1 ? (
        <Text style={styles.frameLabel}>
          {frame + 1}/{frames.length}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
    minHeight: 76,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.ink,
    overflow: "hidden",
  },
  thumb: {
    width: 56,
    height: 56,
  },
  thumbEmpty: {
    backgroundColor: colors.muted,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: type.displayMed,
    fontSize: 16,
    color: colors.foreground,
  },
  sub: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textTransform: "capitalize",
  },
  chev: {
    fontFamily: type.displaySemi,
    fontSize: 22,
    color: colors.faint,
    paddingHorizontal: 4,
  },
  hero: {
    height: 280,
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  heroEmpty: {
    fontFamily: type.bodyMed,
    color: colors.faint,
  },
  frameLabel: {
    position: "absolute",
    bottom: 10,
    right: 12,
    fontFamily: type.bodyMed,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
