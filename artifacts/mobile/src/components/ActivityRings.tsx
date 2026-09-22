import { useEffect } from "react";
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  move: number;
  exercise: number;
  stand: number;
  size?: number;
};

/** Activity rings — progress 0..1, animated on change. */
export function ActivityRings({ move, exercise, stand, size = 128 }: Props) {
  const line = Math.max(8, size * 0.125);
  const gap = Math.max(2.5, size * 0.04);
  const inset = line / 2;
  const m = useSharedValue(0);
  const e = useSharedValue(0);
  const s = useSharedValue(0);

  useEffect(() => {
    m.value = withTiming(clamp01(move), { duration: 900 });
    e.value = withTiming(clamp01(exercise), { duration: 900 });
    s.value = withTiming(clamp01(stand), { duration: 900 });
  }, [move, exercise, stand, m, e, s]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Ring progress={m} color={colors.move} track="rgba(198,241,53,0.18)" line={line} padding={inset} size={size} />
      <Ring
        progress={e}
        color={colors.exercise}
        track="rgba(143,209,79,0.18)"
        line={line}
        padding={inset + line + gap}
        size={size}
      />
      <Ring
        progress={s}
        color={colors.stand}
        track="rgba(110,200,224,0.18)"
        line={line}
        padding={inset + 2 * (line + gap)}
        size={size}
      />
    </Svg>
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function Ring({
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
