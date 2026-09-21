import { Link } from "wouter";
import { Button } from "@/components/primitives";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 font-display text-6xl font-extrabold text-accent tabular-nums">
        404
      </p>
      <h1 className="mb-3 font-display text-2xl font-bold">Page not found</h1>
      <p className="mb-8 max-w-sm text-muted">
        That route doesn’t exist in the Krish Workout library.
      </p>
      <Link href="/">
        <Button>Back to exercises</Button>
      </Link>
    </div>
  );
}
