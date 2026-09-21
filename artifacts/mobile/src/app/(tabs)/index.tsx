import { useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { ActivityRings } from "@/components/ActivityRings";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWorkout } from "@/hooks/useWorkout";
import { colors, goals, radii, space, type } from "@/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function greetingForHour(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Tonight";
}

function SoftNutritionRings({
  calories,
  protein,
  size = 112,
}: {
  calories: number;
  protein: number;
  size?: number;
}) {
  const line = Math.max(8, size * 0.14);
  const gap = Math.max(3, size * 0.045);
  const inset = line / 2;
  const cal = useSharedValue(0);
  const pro = useSharedValue(0);

  useEffect(() => {
    cal.value = withTiming(Math.min(1, Math.max(0, calories)), { duration: 900 });
    pro.value = withTiming(Math.min(1, Math.max(0, protein)), { duration: 900 });
  }, [calories, protein, cal, pro]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SoftRing progress={cal} color={colors.move} track="rgba(198,241,53,0.18)" line={line} padding={inset} size={size} />
      <SoftRing
        progress={pro}
        color={colors.exercise}
        track="rgba(143,209,79,0.18)"
        line={line}
        padding={inset + line + gap}
        size={size}
      />
    </Svg>
  );
}

function SoftRing({
  progress,
  color,
  track,
  line,
  padding,
  size,
}: {
  progress: SharedValue<number>;
  color: string;
  track: string;
  line: number;
  padding: number;
  size: number;
}) {
  const r = (size - padding * 2 - line) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const props = useAnimatedProps(() => ({
    strokeDasharray: `${c * progress.value} ${c}`,
  }));

  return (
    <>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={line} />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={line}
        strokeLinecap="round"
        animatedProps={props}
        rotation={-90}
        origin={`${cx}, ${cy}`}
      />
    </>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { active, startWorkout } = useWorkout();
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  // Soft demo progress until HealthKit / hub sync lands on this client.
  const rings = { move: 0.42, exercise: 0.28, stand: 0.55 };
  const nutrition = { calories: 0.35, protein: 0.22 };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#12180A", colors.background]}
        style={styles.heroBleed}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(480).springify()}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.brand}>Log</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(520).springify()}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.sectionTitle}>Today</Text>
              <Text style={styles.sectionSub}>Move · Exercise · Stand</Text>
            </View>
            <ActivityRings
              move={rings.move}
              exercise={rings.exercise}
              stand={rings.stand}
              size={118}
            />
          </View>
          <View style={styles.statRow}>
            <RingStat label="Move" value="—" unit="kcal" tone={colors.move} />
            <RingStat label="Exercise" value="—" unit="min" tone={colors.exercise} />
            <RingStat label="Stand" value="—" unit="hr" tone={colors.stand} />
          </View>
          <Text style={styles.hint}>
            Connect Apple Health on iOS to fill rings — or log from the dashboard.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(140).duration(520).springify()}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1, paddingRight: space.md }}>
              <Text style={styles.sectionTitle}>Nutrition</Text>
              <Text style={styles.sectionSub}>
                Soft targets {goals.calories} kcal · {goals.proteinG}g protein
              </Text>
            </View>
            <SoftNutritionRings
              calories={nutrition.calories}
              protein={nutrition.protein}
              size={96}
            />
          </View>
          <View style={styles.statRow}>
            <RingStat label="Calories" value="—" unit="kcal" tone={colors.move} />
            <RingStat label="Protein" value="—" unit="g" tone={colors.exercise} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(520).springify()}>
          <Text style={styles.blockLabel}>Quick log</Text>
          <View style={styles.actions}>
            <PrimaryButton
              title={active ? "Resume workout" : "Start workout"}
              size="md"
              onPress={async () => {
                if (!active) await startWorkout();
                router.push("/active");
              }}
              style={{ flex: 1 }}
            />
            <Pressable
              style={styles.ghostAction}
              onPress={() => router.push("/(tabs)/library")}
            >
              <Text style={styles.ghostActionText}>Library</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(260).duration(520).springify()}
          style={styles.shortcuts}
        >
          {[
            { title: "Exercise library", sub: "Find a movement", href: "/(tabs)/library" as const },
            { title: "Workout", sub: active ? "In progress" : "Build a session", href: "/(tabs)/workout" as const },
            { title: "Settings", sub: "API · rest · units", href: "/(tabs)/settings" as const },
          ].map((item) => (
            <Pressable
              key={item.title}
              style={styles.shortcut}
              onPress={() => router.push(item.href)}
            >
              <Text style={styles.shortcutTitle}>{item.title}</Text>
              <Text style={styles.shortcutSub}>{item.sub}</Text>
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function RingStat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: tone }]}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
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
    height: 280,
  },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space.sm,
    paddingBottom: 120,
    gap: space.lg,
  },
  greeting: {
    fontFamily: type.bodyMed,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.primary,
  },
  brand: {
    fontFamily: type.display,
    fontSize: 42,
    color: colors.foreground,
    letterSpacing: -1,
    marginTop: 4,
  },
  date: {
    fontFamily: type.body,
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  sectionTitle: {
    fontFamily: type.displaySemi,
    fontSize: 20,
    color: colors.foreground,
  },
  sectionSub: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    gap: space.lg,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontFamily: type.bodyMed,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  statValue: {
    fontFamily: type.displaySemi,
    fontSize: 22,
    color: colors.foreground,
  },
  statUnit: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  hint: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.faint,
    lineHeight: 17,
  },
  blockLabel: {
    fontFamily: type.bodyMed,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.faint,
    marginBottom: space.sm,
  },
  actions: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
  },
  ghostAction: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostActionText: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.foreground,
  },
  shortcuts: {
    gap: space.sm,
  },
  shortcut: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 64,
    justifyContent: "center",
  },
  shortcutTitle: {
    fontFamily: type.bodySemi,
    fontSize: 16,
    color: colors.foreground,
  },
  shortcutSub: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});
