import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export function Layout() {
  const [collapsed] = useLocalStorage('sidebar', false);

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main
        className="flex flex-1 flex-col min-h-screen bg-slate-100 transition-[margin-left] duration-200"
        style={{ marginLeft: collapsed ? '4rem' : '16rem' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
