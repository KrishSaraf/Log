"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarbellIcon,
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";

import { EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseCard } from "@/components/workouts/exercise-card";
import { ExerciseDetail } from "@/components/workouts/exercise-detail";
import type {
  ExerciseFilters,
  ExerciseQuery,
  ExerciseRecord,
} from "@/lib/exercise-display";
import { cn } from "@/lib/utils";

function libraryHref(next: ExerciseQuery) {
  const params = new URLSearchParams();
  const search = next.search?.trim();
  if (search) params.set("q", search);
  if (next.bodyPart) params.set("bodyPart", next.bodyPart);
  if (next.equipment) params.set("equipment", next.equipment);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/workouts/library?${qs}` : "/workouts/library";
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1 text-xs capitalize transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "border-lime-line bg-lime-quiet font-medium text-text"
          : "border-line text-text-muted hover:border-line-strong hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

export function ExerciseLibrary({
  items,
  total,
  page,
  totalPages,
  filters,
  query,
  loadFailed,
}: {
  items: ExerciseRecord[];
  total: number;
  page: number;
  totalPages: number;
  filters: ExerciseFilters;
  query: ExerciseQuery;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query.search ?? "");
  const [selected, setSelected] = useState<ExerciseRecord | null>(null);

  useEffect(() => {
    setSearch(query.search ?? "");
  }, [query.search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = search.trim();
      const current = query.search?.trim() ?? "";
      if (next === current) return;
      router.replace(
        libraryHref({
          search: next || undefined,
          bodyPart: query.bodyPart,
          equipment: query.equipment,
          page: 1,
        }),
        { scroll: false },
      );
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, query.search, query.bodyPart, query.equipment, router]);

  function setFilter(patch: Partial<ExerciseQuery>) {
    router.replace(
      libraryHref({
        search: query.search,
        bodyPart: query.bodyPart,
        equipment: query.equipment,
        page: 1,
        ...patch,
      }),
      { scroll: false },
    );
  }

  function goToPage(nextPage: number) {
    router.replace(
      libraryHref({
        search: query.search,
        bodyPart: query.bodyPart,
        equipment: query.equipment,
        page: nextPage,
      }),
      { scroll: false },
    );
  }

  const filteredEmpty = !loadFailed && items.length === 0;
  const hasActiveFilters = Boolean(
    query.search?.trim() || query.bodyPart || query.equipment,
  );

  return (
    <div className="space-y-5">
      <div className="relative">
        <MagnifyingGlassIcon
          size={16}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-faint"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
          aria-label="Search exercises by name"
          className="h-9 pl-8"
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="label-caps">Body part</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterChip
              active={!query.bodyPart}
              onClick={() => setFilter({ bodyPart: undefined })}
            >
              All
            </FilterChip>
            {filters.bodyParts.map((part) => (
              <FilterChip
                key={part}
                active={query.bodyPart === part}
                onClick={() =>
                  setFilter({
                    bodyPart: query.bodyPart === part ? undefined : part,
                  })
                }
              >
                {part}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="label-caps">Equipment</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterChip
              active={!query.equipment}
              onClick={() => setFilter({ equipment: undefined })}
            >
              All
            </FilterChip>
            {filters.equipment.map((item) => (
              <FilterChip
                key={item}
                active={query.equipment === item}
                onClick={() =>
                  setFilter({
                    equipment: query.equipment === item ? undefined : item,
                  })
                }
              >
                {item}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-text-muted">
          {loadFailed ? (
            "Couldn't load exercises"
          ) : (
            <>
              <span className="num text-text">{total.toLocaleString()}</span>
              {` ${total === 1 ? "exercise" : "exercises"}`}
            </>
          )}
        </p>
      </div>

      {loadFailed ? (
        <EmptyState
          icon={BarbellIcon}
          title="Couldn't load exercises"
          description="Try again in a moment."
        />
      ) : filteredEmpty ? (
        <EmptyState
          icon={BarbellIcon}
          title="No exercises match"
          description={
            hasActiveFilters
              ? "Try a different name, body part, or equipment."
              : "The library is empty right now."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onOpen={setSelected}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <CaretLeftIcon />
              </Button>
              <p className="text-sm text-text-muted">
                Page <span className="num text-text">{page}</span> of{" "}
                <span className="num text-text">{totalPages}</span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <CaretRightIcon />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ExerciseDetail exercise={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
