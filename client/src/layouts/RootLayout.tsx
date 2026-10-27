import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../context/AuthContext';

export function RootLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  function toggleSidebarCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }

  // If user is authenticated and navigating an app portal route
  if (user) {
    return (
      <div className="app-shell">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <div className={`app-main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <TopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="main-content" style={{ padding: '1.5rem 0 3rem' }}>
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Public marketing/auth layout
  const isPublicLanding = location.pathname === '/';

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      {isPublicLanding && <Footer />}
    </div>
  );
}
