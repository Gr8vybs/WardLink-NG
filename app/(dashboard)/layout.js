'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  ClipboardList,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { syncEngine } from '@/lib/offline/sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export default function DashboardLayout({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const saved = localStorage.getItem('wardlink_last_sync');
    if (saved) setLastSync(new Date(saved));

    const checkPending = async () => {
      const { db } = await import('@/lib/offline/db');
      const count = await db.patients.where('syncStatus').equals('pending').count();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncEngine.triggerSync();
      if (result.success) {
        const saved = localStorage.getItem('wardlink_last_sync');
        if (saved) setLastSync(new Date(saved));
        setPendingCount(0);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  // In the navItems array, keep handover as is:
  const navItems = [
    { href: '/', label: 'Dashboard', icon: Activity },
    { href: '/patients', label: 'Patients', icon: Users },
    { href: '/handover', label: 'Handover', icon: ClipboardList }, // This goes to list
    { href: '/settings', label: 'Settings', icon: Settings },
  ];


  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#1a1a2e] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out",
        isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm">
                WL
              </span>
              WardLink NG
            </h1>
            <p className="text-xs text-gray-400 mt-1">Hospital Ward Management</p>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Connection Status */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span>Offline</span>
                </>
              )}
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full glass-input border-white/20 hover:bg-white/10"
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            isLoading={isSyncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {lastSync && (
            <p className="text-xs text-gray-500 text-center">
              Last sync: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors w-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-sm font-medium">
              DR
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-white">Dr. User</p>
              <p className="text-xs text-gray-500">General Ward</p>
            </div>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <div className="sticky top-0 z-30 bg-[#0f0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
            <button onClick={toggleSidebar} className="text-white p-2 hover:bg-white/10 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-white">WardLink NG</span>
            <div className="w-10" /> {/* Spacer for balance */}
          </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}