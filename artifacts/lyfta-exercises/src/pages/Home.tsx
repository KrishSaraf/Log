import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { Filters } from "@/components/Filters";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { ExerciseForm } from "@/components/ExerciseForm";
import {
  useListExercises,
  useGetExerciseFilters,
  useDeleteExercise,
} from "@/hooks/use-exercises";
import { Button, EmptyState, Skeleton } from "@/components/primitives";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Home() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 280);
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [target, setTarget] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Exercise | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  const { data: filters } = useGetExerciseFilters();
  const { data, isLoading, isError, refetch, isFetching } = useListExercises({
    search: debouncedSearch || undefined,
    bodyPart: bodyPart || undefined,
    equipment: equipment || undefined,
    target: target || undefined,
    page,
    limit: 24,
  });
  const del = useDeleteExercise();

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Header
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      />

      <Filters
        search={search}
        onSearch={resetPage(setSearch)}
        bodyPart={bodyPart}
        onBodyPart={resetPage(setBodyPart)}
        equipment={equipment}
        onEquipment={resetPage(setEquipment)}
        target={target}
        onTarget={resetPage(setTarget)}
        bodyParts={filters?.bodyParts ?? []}
        equipmentList={filters?.equipment ?? []}
        targets={filters?.targets ?? []}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              Library
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Exercises
            </h1>
          </div>
          {!isLoading && data ? (
            <div className="text-right">
              <div className="font-display text-2xl sm:text-3xl font-extrabold tabular-nums text-accent leading-none">
                {data.total.toLocaleString()}
              </div>
              <div className="mt-1 text-[10px] text-faint uppercase tracking-wider">
                {isFetching ? "Updating…" : "results"}
              </div>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn’t load exercises"
            description="Check that the API is running and the database is seeded."
            action={
              <Button onClick={() => refetch()}>Try again</Button>
            }
          />
        ) : !data?.exercises.length ? (
          <EmptyState
            title="No exercises found"
            description="Try a different search or clear your filters."
            action={
              <Button
                variant="surface"
                onClick={() => {
                  setSearch("");
                  setBodyPart("");
                  setEquipment("");
                  setTarget("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.exercises.map((ex, i) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  index={i}
                  onOpen={setSelected}
                />
              ))}
            </div>

            {data.totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="surface"
                  className="px-3"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <span className="text-sm text-muted tabular-nums">
                  <span className="font-semibold text-foreground">{page}</span>
                  {" / "}
                  {data.totalPages}
                </span>
                <Button
                  variant="surface"
                  className="px-3"
                  disabled={page >= data.totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  aria-label="Next page"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>

      <ExerciseDetail
        exercise={selected}
        onClose={() => setSelected(null)}
        onEdit={(ex) => {
          setSelected(null);
          setEditing(ex);
          setFormOpen(true);
        }}
        onDelete={(ex) => {
          if (!confirm(`Delete “${ex.name}”?`)) return;
          del.mutate(
            { id: ex.id },
            {
              onSuccess: () => setSelected(null),
            },
          );
        }}
      />

      <ExerciseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        exercise={editing}
      />
    </div>
  );
}
