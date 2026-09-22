import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WorkoutProvider } from "@/hooks/useWorkout";
import { configureApiClient } from "@/lib/api";
import { colors } from "@/theme/tokens";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    configureApiClient();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <WorkoutProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
              headerTitleStyle: { fontFamily: "Outfit_600SemiBold" },
              contentStyle: { backgroundColor: colors.background },
              animation: "fade_from_bottom",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="exercise/[id]"
              options={{ title: "Exercise", presentation: "card" }}
            />
            <Stack.Screen
              name="active"
              options={{ title: "Active workout", headerShown: false }}
            />
          </Stack>
        </WorkoutProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
