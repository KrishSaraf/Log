import { Search, Plus, Dumbbell } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface NavbarProps {
  onAddClick: () => void;
}

export function Navbar({ onAddClick }: NavbarProps) {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 w-full glass-panel border-x-0 border-t-0"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">
            Krish Workout<span className="text-primary">.</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Custom</span>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-secondary border border-white/10 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop" 
              alt="User Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
