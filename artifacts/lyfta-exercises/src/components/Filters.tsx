import { useState } from "react";
import { Search, X } from "lucide-react";
import { Chip, Input } from "@/components/primitives";
import { cn } from "@/lib/utils";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  bodyPart: string;
  onBodyPart: (v: string) => void;
  equipment: string;
  onEquipment: (v: string) => void;
  target: string;
  onTarget: (v: string) => void;
  bodyParts: string[];
  equipmentList: string[];
  targets: string[];
}

type Tab = "bodyPart" | "equipment" | "target";

export function Filters({
  search,
  onSearch,
  bodyPart,
  onBodyPart,
  equipment,
  onEquipment,
  target,
  onTarget,
  bodyParts,
  equipmentList,
  targets,
}: Props) {
  const [tab, setTab] = useState<Tab>("bodyPart");
  const activeCount = [bodyPart, equipment, target].filter(Boolean).length;

  const chips =
    tab === "bodyPart"
      ? { allLabel: "All parts", value: bodyPart, set: onBodyPart, items: bodyParts }
      : tab === "equipment"
        ? {
            allLabel: "All equipment",
            value: equipment,
            set: onEquipment,
            items: equipmentList,
          }
        : {
            allLabel: "All muscles",
            value: target,
            set: onTarget,
            items: targets,
          };

  return (
    <div className="sticky top-16 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or muscle…"
            className="pl-11 pr-11 rounded-xl py-3"
            aria-label="Search exercises"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 tap-target flex items-center justify-center rounded-lg text-faint hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              ["bodyPart", "Body"],
              ["equipment", "Gear"],
              ["target", "Muscle"],
            ] as const
          ).map(([id, label]) => {
            const selected =
              id === "bodyPart" ? bodyPart : id === "equipment" ? equipment : target;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-[var(--kw-duration)]",
                  tab === id
                    ? "bg-surface text-foreground"
                    : "text-faint hover:text-muted",
                )}
              >
                {label}
                {selected ? (
                  <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />
                ) : null}
              </button>
            );
          })}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                onBodyPart("");
                onEquipment("");
                onTarget("");
              }}
              className="ml-auto text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Clear ({activeCount})
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <Chip active={!chips.value} onClick={() => chips.set("")}>
            {chips.allLabel}
          </Chip>
          {chips.items.map((item) => (
            <Chip
              key={item}
              active={chips.value === item}
              onClick={() => chips.set(chips.value === item ? "" : item)}
            >
              {item}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
