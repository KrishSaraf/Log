export type ExerciseRecord = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  level: string;
};

export type ExerciseQuery = {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  page?: number;
};

export type ExerciseFilters = {
  bodyParts: string[];
  equipment: string[];
};

export function exerciseImages(exercise: Pick<ExerciseRecord, "gifUrl" | "images">) {
  if (exercise.images.length > 0) return exercise.images;
  return exercise.gifUrl ? [exercise.gifUrl] : [];
}
