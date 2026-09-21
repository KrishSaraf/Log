import { useQueryClient } from "@tanstack/react-query";
import {
  useListExercises,
  useGetExerciseFilters,
  useCreateExercise as useGeneratedCreate,
  useUpdateExercise as useGeneratedUpdate,
  useDeleteExercise as useGeneratedDelete,
  getListExercisesQueryKey,
  getGetExerciseFiltersQueryKey,
  getGetExerciseQueryKey,
} from "@workspace/api-client-react";

export { useListExercises, useGetExerciseFilters };

function useInvalidateExercises() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: getListExercisesQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetExerciseFiltersQueryKey() });
  };
}

export function useCreateExercise() {
  const invalidate = useInvalidateExercises();
  return useGeneratedCreate({
    mutation: {
      onSuccess: () => invalidate(),
    },
  });
}

export function useUpdateExercise() {
  const invalidate = useInvalidateExercises();
  const qc = useQueryClient();
  return useGeneratedUpdate({
    mutation: {
      onSuccess: (_data, vars) => {
        invalidate();
        void qc.invalidateQueries({ queryKey: getGetExerciseQueryKey(vars.id) });
      },
    },
  });
}

export function useDeleteExercise() {
  const invalidate = useInvalidateExercises();
  return useGeneratedDelete({
    mutation: {
      onSuccess: () => invalidate(),
    },
  });
}
