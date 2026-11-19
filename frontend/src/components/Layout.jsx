import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SectionNavTabs from './SectionNavTabs';
import AiAssistantDrawer from './ai/AiAssistantDrawer';
import { useAuth } from '../context/AuthContext';
import HeaderPortalContext from '../context/HeaderPortalContext';

const Layout = ({ children, title, breadcrumbs, actions }) => {
  const { user } = useAuth();
  const [headerPortalEl, setHeaderPortalEl] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e) => {
      setIsSidebarOpen(e.matches);
    };

    setIsSidebarOpen(mq.matches);

    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
    } else {
      mq.addListener(handleChange);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handleChange);
      } else {
        mq.removeListener(handleChange);
      }
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--brand-bg, #f8fafc)' }}
      className="h-screen flex overflow-hidden font-sans transition-colors duration-200"
    >
      {/* 1. Left Theme-Responsive Sidebar */}
      <Sidebar 
        role={user?.role} 
        user={user}
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />

      {/* 2. Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Theme-Responsive Header Navbar */}
        <Navbar 
          isSidebarOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar}
          pageTitle={title}
          pageBreadcrumbs={breadcrumbs}
        />

        {/* Horizontal Sub-Navigation Tab Strip */}
        <SectionNavTabs extraActions={actions} portalRef={setHeaderPortalEl} />

        {/* Main Content - Scrollable Canvas */}
        <HeaderPortalContext.Provider value={headerPortalEl}>
          <main
            style={{ backgroundColor: 'var(--brand-bg, #f8fafc)' }}
            className="flex-1 overflow-y-auto compact-ui transition-colors duration-200"
          >
            <div className="p-3 sm:p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </main>
        </HeaderPortalContext.Provider>
      </div>

      {/* Global SES AI Assistant Floating Drawer */}
      <AiAssistantDrawer />
    </div>
  );
};

export default Layout;
