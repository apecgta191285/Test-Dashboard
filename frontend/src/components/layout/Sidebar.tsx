import { useState } from 'react';
import { useAuthStore, selectUser } from '@/stores/auth-store';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, BarChart3, Users, Zap, Settings, FileText, TrendingUp, Search, ShoppingBag, MessageSquare, Layers } from 'lucide-react';
import { APP_LOGO, APP_TITLE } from '@/const';
import { UserRole } from '@/types/enums';

export function Sidebar() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // ✅ Use Zustand store instead of useAuth()
    const user = useAuthStore(selectUser);
    const logout = useAuthStore((state) => state.logout);
    const [location, setLocation] = useLocation();

    interface NavItem {
        label: string;
        href: string;
        icon: any;
        comingSoon?: boolean;
        adminOnly?: boolean;
    }

    interface NavGroup {
        title: string;
        items: NavItem[];
    }

    const navGroups: NavGroup[] = [
        {
            title: 'Analytics',
            items: [
                { label: 'Overview', href: '/dashboard', icon: BarChart3 },
                { label: 'Campaigns', href: '/campaigns', icon: Zap },
                { label: 'Data Sources', href: '/integrations', icon: Layers },
            ]
        },
        {
            title: 'Intelligence',
            items: [
                { label: 'AI Insights', href: '/ai-insights', icon: Zap, comingSoon: true },
                { label: 'Trend Analysis', href: '/trend-analysis', icon: TrendingUp, comingSoon: true },
                { label: 'SEO & Web', href: '/seo-web-analytics', icon: Search, comingSoon: true },
            ]
        },
        {
            title: 'System',
            items: [
                { label: 'Settings', href: '/settings', icon: Settings },
                { label: 'Reports', href: '/reports', icon: FileText },
                ...(user?.role === UserRole.ADMIN ? [{ label: 'Users', href: '/users', icon: Users }] : []),
            ]
        }
    ];

    const handleLogout = () => {
        logout();
        setLocation('/login');
    };

    return (
        <aside
            className={`${sidebarOpen ? 'w-64' : 'w-20'
                } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col h-screen z-30`}
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
                {sidebarOpen ? (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            R
                        </div>
                        <span className="font-bold text-xl text-slate-800 tracking-tight">RGA<span className="text-indigo-600">.Data</span></span>
                    </div>
                ) : (
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto">
                        R
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`ml-auto ${!sidebarOpen && 'hidden'}`}
                >
                    <Menu className="w-4 h-4" />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                {navGroups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {sidebarOpen && (
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                                {group.title}
                            </div>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location === item.href;

                                if (item.comingSoon) {
                                    return (
                                        <div
                                            key={item.label}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed ${!sidebarOpen && 'justify-center'}`}
                                        >
                                            <Icon size={20} />
                                            {sidebarOpen && (
                                                <>
                                                    {item.label}
                                                    <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Soon</span>
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => setLocation(item.href)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            } ${!sidebarOpen && 'justify-center'}`}
                                        title={!sidebarOpen ? item.label : undefined}
                                    >
                                        <Icon size={20} />
                                        {sidebarOpen && item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-slate-100 bg-white">
                {sidebarOpen && (
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors ${!sidebarOpen && 'justify-center border-0'}`}
                    title="Sign Out"
                >
                    <LogOut size={16} />
                    {sidebarOpen && 'Sign Out'}
                </button>
            </div>
        </aside>
    );
}
