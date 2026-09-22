import { Link } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/primitives";

export function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-0.5">
          <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Krish Workout
          </span>
          <span className="text-accent text-2xl font-extrabold leading-none">.</span>
        </Link>
        <Button variant="surface" onClick={onAdd} className="gap-1.5 px-3 sm:px-4">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add exercise</span>
        </Button>
      </div>
    </header>
  );
}
