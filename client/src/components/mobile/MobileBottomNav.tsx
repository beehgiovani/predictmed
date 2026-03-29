import { useLocation } from "wouter";
import { LayoutDashboard, LogOut, PackageSearch, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Exclusivo do Menu Mobile (Traduzido e Focado)
const mobileNavItems = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/" },
  { icon: PackageSearch, label: "Auditoria", path: "/audit" },
  { icon: Settings, label: "Ajustes", path: "/settings" },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glassmorphism bg-white/80 backdrop-blur-2xl border-t border-slate-200/50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.03)] md:hidden">
      <div className="flex justify-around items-center h-[72px] px-2">
        {mobileNavItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all outline-none"
            >
              <div 
                className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-blue-600 shadow-lg shadow-blue-200 text-white" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                )}
              >
                <item.icon className={cn("w-[22px] h-[22px]", isActive && "animate-in zoom-in-75 duration-300")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span 
                className={cn(
                  "text-[10px] uppercase font-black tracking-widest transition-colors duration-300",
                  isActive ? "text-blue-700" : "text-slate-400"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
