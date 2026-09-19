import type { Metadata } from "next";

import { ExerciseLibrary } from "@/components/workouts/exercise-library";
import {
  getExerciseFilters,
  listExercises,
  type ExerciseFilters,
  type ExerciseListResult,
  type ExerciseQuery,
} from "@/lib/exercises";
import { safely } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Library" };

type SearchParams = {
  q?: string | string[];
  bodyPart?: string | string[];
  equipment?: string | string[];
  page?: string | string[];
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseQuery(params: SearchParams): ExerciseQuery {
  const pageRaw = Number(first(params.page));
  return {
    search: first(params.q)?.trim() || undefined,
    bodyPart: first(params.bodyPart)?.trim() || undefined,
    equipment: first(params.equipment)?.trim() || undefined,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

const EMPTY_LIST: ExerciseListResult = {
  items: [],
  total: 0,
  page: 1,
  totalPages: 1,
};

const EMPTY_FILTERS: ExerciseFilters = { bodyParts: [], equipment: [] };

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = parseQuery(await searchParams);

  const [list, filters] = await Promise.all([
    safely(() => listExercises(query), null, "exercise library"),
    safely(() => getExerciseFilters(), EMPTY_FILTERS, "exercise filters"),
  ]);

  const data = list ?? EMPTY_LIST;

  return (
    <ExerciseLibrary
      items={data.items}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      filters={filters}
      query={query}
      loadFailed={list === null}
    />
  );
}
