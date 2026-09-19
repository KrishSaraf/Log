import { Link } from "wouter";
import { Dumbbell } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
        <Dumbbell className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-6xl font-display font-bold text-white mb-4 tracking-tighter">404</h1>
      <p className="text-xl text-white/50 mb-8 font-medium">This workout routine doesn't exist.</p>
      <Link 
        href="/" 
        className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all"
      >
        Back to Library
      </Link>
    </div>
  );
}
