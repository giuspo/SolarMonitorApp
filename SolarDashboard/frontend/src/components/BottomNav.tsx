import { NavLink } from 'react-router-dom';
import { Sun, BarChart2, Activity, Calculator } from 'lucide-react';

export default function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      isActive ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 bg-slate-800 border-t border-slate-700 flex justify-around items-center z-50">
      <NavLink to="/" className={linkClass}>
        <Sun className="w-6 h-6" />
        <span className="text-[10px] font-medium">Oggi</span>
      </NavLink>
      <NavLink to="/history" className={linkClass}>
        <BarChart2 className="w-6 h-6" />
        <span className="text-[10px] font-medium">Storico</span>
      </NavLink>
      <NavLink to="/simulator" className={linkClass}>
        <Calculator className="w-6 h-6" />
        <span className="text-[10px] font-medium">Simulatore</span>
      </NavLink>
      <NavLink to="/diagnostics" className={linkClass}>
        <Activity className="w-6 h-6" />
        <span className="text-[10px] font-medium">Diagnostica</span>
      </NavLink>
    </nav>
  );
}

