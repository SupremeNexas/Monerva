import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  LayoutDashboard, Receipt, Repeat, CreditCard, CalendarClock, Users,
  Wallet, Tags, Settings, LogOut, ChevronLeft, ChevronRight, UserPlus, TrendingUp, ArrowLeftRight,
  Bot, Sparkles, FileText
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assistant', label: 'AI Assistant', icon: Bot, isPro: true },
  { path: '/copilot', label: 'AI Copilot', icon: Sparkles, isPro: true },
  { path: '/documents', label: 'Document Vault', icon: FileText, isPro: true },
  { path: '/income', label: 'Income', icon: TrendingUp },
  { path: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { path: '/expenses', label: 'Transactions', icon: Receipt },
  { path: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { path: '/credit-cards', label: 'Credit Cards', icon: CreditCard },
  { path: '/bills', label: 'Recurring Bills', icon: CalendarClock },
  { path: '/groups', label: 'Shared Groups', icon: Users },
  { path: '/friends', label: 'Friends', icon: UserPlus },
  { path: '/budgets', label: 'Budgets', icon: Wallet },
  { path: '/categories', label: 'Categories', icon: Tags },
  { path: '/workspace-settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ mobileOpen, setMobileOpen, collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: workspaces = [] } = useQuery<any[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.request('/workspaces'),
    enabled: !!user
  });

  const activeWsId = localStorage.getItem('fintech_workspace_id') || '';

  const handleWorkspaceChange = (wsId: string) => {
    localStorage.setItem('fintech_workspace_id', wsId);
    queryClient.invalidateQueries();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:translate-x-0 top-0 bottom-0 left-0 z-50 bg-white border-r border-[#e5eeff] flex flex-col justify-between transition-all duration-200
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex-1 overflow-y-auto" data-lenis-prevent>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#e5eeff]">
            {!collapsed && <span className="font-bold text-[#0b1c30]">Balance</span>}
            <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg hover:bg-[#eff4ff]">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink key={item.path} to={item.path} className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'text-[#45464d] hover:bg-[#eff4ff]'}`}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.isPro && (
                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-indigo-500 text-white uppercase shadow-sm">
                      PRO
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#e5eeff]">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>
    </>
  );
}
export default Sidebar;
