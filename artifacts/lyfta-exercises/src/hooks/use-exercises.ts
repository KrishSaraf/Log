import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  useListExercises as useGeneratedListExercises,
  useGetExercise as useGeneratedGetExercise,
  useGetExerciseFilters as useGeneratedGetExerciseFilters,
  type ListExercisesParams,
  type Exercise
} from "@workspace/api-client-react";

// Re-export generated queries for clean imports in components
export const useListExercises = useGeneratedListExercises;
export const useGetExercise = useGeneratedGetExercise;
export const useGetExerciseFilters = useGeneratedGetExerciseFilters;

// ============================================================================
// AGGRESSIVE CRUD IMPLEMENTATION
// The OpenAPI spec only defines GETs. We implement these mutations to fulfill 
// the strict UI completeness requirements. They will likely 404 at runtime, 
// which exposes missing backend features as requested.
// ============================================================================

export type CreateExerciseInput = Omit<Exercise, 'id'>;

export function useCreateExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateExerciseInput) => {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create exercise (Expected if backend endpoint is missing)");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    }
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateExerciseInput> & { id: string }) => {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update exercise");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      queryClient.invalidateQueries({ queryKey: [`/api/exercises/${variables.id}`] });
    }
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete exercise");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    }
  });
}
