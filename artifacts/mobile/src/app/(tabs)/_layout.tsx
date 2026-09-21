import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, type } from "@/theme/tokens";
import { useWorkout } from "@/hooks/useWorkout";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconGlyph, focused && styles.iconFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { active } = useWorkout();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: type.displaySemi, fontSize: 20 },
        headerShadowVisible: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: type.bodyMed, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: ({ focused }) => <TabIcon label="☰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: active ? "In progress" : "Workout",
          tabBarBadge: active ? "●" : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 8 },
          tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon label="⚙" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
  },
  iconGlyph: {
    fontSize: 18,
    color: colors.mutedForeground,
  },
  iconFocused: {
    color: colors.primary,
  },
});
