import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Store, Palette, Mail, ScrollText, Settings } from 'lucide-react';
import { useIsAdmin } from '@/context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, adminOnly: false },
  { to: '/shops', label: 'Shops', icon: Store, adminOnly: true },
  { to: '/designs', label: 'Designs', icon: Palette, adminOnly: false },
  { to: '/invitations', label: 'Invites', icon: Mail, adminOnly: false },
  { to: '/audit-logs', label: 'Logs', icon: ScrollText, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, adminOnly: false },
];

export function BottomNav() {
  const isAdmin = useIsAdmin();
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-gray-200 bg-white px-2 py-1.5 lg:hidden">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
