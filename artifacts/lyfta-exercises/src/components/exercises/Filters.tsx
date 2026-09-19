import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FiltersProps {
  search: string;
  setSearch: (v: string) => void;
  selectedBodyPart: string;
  setSelectedBodyPart: (v: string) => void;
  selectedEquipment: string;
  setSelectedEquipment: (v: string) => void;
  bodyParts: string[];
  equipment: string[];
}

export function Filters({
  search, setSearch,
  selectedBodyPart, setSelectedBodyPart,
  selectedEquipment, setSelectedEquipment,
  bodyParts, equipment
}: FiltersProps) {
  
  return (
    <div className="sticky top-[64px] z-40 bg-background/90 backdrop-blur-xl border-b border-white/5 py-4 space-y-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-white/40" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
            placeholder="Search exercises by name..."
          />
        </div>

        {/* Body Parts */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50 px-1">Target Muscle Group</div>
          <div className="flex overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2">
            <FilterPill 
              active={!selectedBodyPart} 
              onClick={() => setSelectedBodyPart("")}
            >
              All Parts
            </FilterPill>
            {bodyParts.map(bp => (
              <FilterPill 
                key={bp} 
                active={selectedBodyPart === bp} 
                onClick={() => setSelectedBodyPart(selectedBodyPart === bp ? "" : bp)}
              >
                {bp}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50 px-1">Equipment Needed</div>
          <div className="flex overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2">
            <FilterPill 
              active={!selectedEquipment} 
              onClick={() => setSelectedEquipment("")}
            >
              All Equipment
            </FilterPill>
            {equipment.map(eq => (
              <FilterPill 
                key={eq} 
                active={selectedEquipment === eq} 
                onClick={() => setSelectedEquipment(selectedEquipment === eq ? "" : eq)}
              >
                {eq}
              </FilterPill>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 capitalize",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/25 border border-primary/50" 
          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5"
      )}
    >
      {children}
    </button>
  );
}
