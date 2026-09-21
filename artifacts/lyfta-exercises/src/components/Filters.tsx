import { Search, X } from "lucide-react";
import { Chip, Input } from "@/components/primitives";

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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
        {label}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {children}
      </div>
    </div>
  );
}

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
  const hasFilters = !!(search || bodyPart || equipment || target);

  return (
    <div className="sticky top-16 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or muscle…"
            className="pl-11 pr-11 rounded-xl py-3.5"
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

        <Row label="Body part">
          <Chip active={!bodyPart} onClick={() => onBodyPart("")}>
            All
          </Chip>
          {bodyParts.map((bp) => (
            <Chip
              key={bp}
              active={bodyPart === bp}
              onClick={() => onBodyPart(bodyPart === bp ? "" : bp)}
            >
              {bp}
            </Chip>
          ))}
        </Row>

        <Row label="Equipment">
          <Chip active={!equipment} onClick={() => onEquipment("")}>
            All
          </Chip>
          {equipmentList.map((eq) => (
            <Chip
              key={eq}
              active={equipment === eq}
              onClick={() => onEquipment(equipment === eq ? "" : eq)}
            >
              {eq}
            </Chip>
          ))}
        </Row>

        <Row label="Target muscle">
          <Chip active={!target} onClick={() => onTarget("")}>
            All
          </Chip>
          {targets.map((t) => (
            <Chip
              key={t}
              active={target === t}
              onClick={() => onTarget(target === t ? "" : t)}
            >
              {t}
            </Chip>
          ))}
        </Row>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              onSearch("");
              onBodyPart("");
              onEquipment("");
              onTarget("");
            }}
            className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Clear all filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
