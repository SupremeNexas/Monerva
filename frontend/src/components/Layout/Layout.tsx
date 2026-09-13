import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TransactionMenu from '../Transactions/TransactionMenu';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useToast } from '../UI/Toast';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  return (
    <div className="min-h-screen flex bg-transparent relative">
      {/* Background Graphic matching Landing page */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png"
          alt="Workspace backdrop sky canvas"
          className="w-full h-full object-cover opacity-60 scale-105"
        />
        {/* Soft overlay mask for contrast */}
        <div className="absolute inset-0 bg-[#f8f9ff]/60" />
      </div>

      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main layout context */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 relative z-10
          ${collapsed ? 'md:pl-16' : 'md:pl-64'}
        `}
      >
        {/* Top Header navbar */}
        <Header setMobileOpen={setMobileOpen} collapsed={collapsed} />

        {/* Transaction Multi-button Menu — fixed to viewport right edge */}
        {location.pathname !== '/dashboard' && <TransactionMenu />}

        {/* Inner page content container */}
        <main className="flex-1 px-6 pt-20 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
export default Layout;
