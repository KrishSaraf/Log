import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, motion, radii, space, type } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  title: string;
  variant?: "primary" | "ghost" | "danger";
  size?: "lg" | "md";
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  variant = "primary",
  size = "lg",
  style,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(motion.pressScale, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={[
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        variant === "primary" && styles.primary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        anim,
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          variant === "ghost" && styles.ghostLabel,
          variant === "danger" && styles.dangerLabel,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: space.xl,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: space.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.muted,
  },
  danger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: type.bodySemi,
    fontSize: 17,
    color: colors.onPrimary,
  },
  ghostLabel: {
    color: colors.foreground,
  },
  dangerLabel: {
    color: colors.danger,
  },
});
