import { Outlet } from 'react-router-dom';
import { SideNav } from '../components/SideNav';

export function DashboardLayout() {
  return (
    // Added 'w-full' and 'mx-auto'
    <div className="w-full max-w-[1400px] mx-auto flex min-h-screen bg-background">
      <SideNav />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
