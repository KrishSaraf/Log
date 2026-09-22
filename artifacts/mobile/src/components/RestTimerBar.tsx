import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { colors, radii, space, type } from "@/theme/tokens";

type Props = {
  endsAt: number;
  onSkip: () => void;
};

export function RestTimerBar({ endsAt, onSkip }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

  useEffect(() => {
    setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    const id = setInterval(() => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining <= 0) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Animated.View entering={FadeInUp.springify()} exiting={FadeOut} style={styles.wrap}>
      <View style={styles.left}>
        <Text style={styles.label}>Rest</Text>
        <Text style={styles.time}>
          {mm}:{ss}
        </Text>
      </View>
      <Pressable onPress={onSkip} style={styles.skip} hitSlop={8}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: space.screen,
    right: space.screen,
    bottom: 24,
    backgroundColor: colors.cardElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
  },
  left: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.md,
  },
  label: {
    fontFamily: type.bodyMed,
    fontSize: 14,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  time: {
    fontFamily: type.display,
    fontSize: 36,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  skip: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    fontFamily: type.bodySemi,
    color: colors.primary,
    fontSize: 15,
  },
});
