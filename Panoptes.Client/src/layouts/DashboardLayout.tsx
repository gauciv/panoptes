import { Outlet } from 'react-router-dom';
import { SideNav } from '../components/SideNav';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <SideNav />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
