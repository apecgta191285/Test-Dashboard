import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface ChecklistItem {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    actionLabel: string;
}

const defaultItems: ChecklistItem[] = [
    {
        id: '1',
        title: 'Connect Google Ads',
        description: 'Import your campaign data to see spending and ROI.',
        completed: true,
        actionLabel: 'Connect'
    },
    {
        id: '2',
        title: 'Connect GA4',
        description: 'Track web traffic and conversion events.',
        completed: true,
        actionLabel: 'Connect'
    },
    {
        id: '3',
        title: 'Set up KPI Targets',
        description: 'Define your monthly goals for alerts.',
        completed: false,
        actionLabel: 'Set Targets'
    },
    {
        id: '4',
        title: 'Invite Team Members',
        description: 'Add your marketing team to the dashboard.',
        completed: false,
        actionLabel: 'Invite'
    }
];

import { dashboardService } from '@/services/dashboard-service';

export function GettingStartedWidget() {
    const [, setLocation] = useLocation();
    const [isOpen, setIsOpen] = useState(true);
    const [status, setStatus] = useState({
        googleAds: false,
        googleAnalytics: false,
        kpiTargets: false,
        teamMembers: false,
    });
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await dashboardService.getOnboardingStatus();
                setStatus(response.data);
            } catch (error) {
                console.error('Failed to fetch onboarding status:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const items: ChecklistItem[] = [
        {
            id: '1',
            title: 'Connect Google Ads',
            description: 'Import your campaign data to see spending and ROI.',
            completed: status.googleAds,
            actionLabel: 'Connect'
        },
        {
            id: '2',
            title: 'Connect GA4',
            description: 'Track web traffic and conversion events.',
            completed: status.googleAnalytics,
            actionLabel: 'Connect'
        },
        {
            id: '3',
            title: 'Set up KPI Targets',
            description: 'Define your monthly goals for alerts.',
            completed: status.kpiTargets,
            actionLabel: 'Set Targets'
        },
        {
            id: '4',
            title: 'Invite Team Members',
            description: 'Add your marketing team to the dashboard.',
            completed: status.teamMembers,
            actionLabel: 'Invite'
        }
    ];

    const completedCount = items.filter(i => i.completed).length;
    const progress = Math.round((completedCount / items.length) * 100);

    if (!isOpen) return null;
    if (isLoading) return null; // Or a skeleton

    // Auto-close if all completed? Maybe not, user might want to see success.

    return (
        <Card className="mb-6 border-indigo-100 overflow-hidden">
            <div className="p-4 border-b border-indigo-50 flex items-center justify-between bg-indigo-50/50">
                <div>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        🚀 Getting Started
                        <span className="text-[10px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            Sprint 1 Setup
                        </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Complete these steps to activate full AI analytics</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                </button>
            </div>

            <CardContent className="p-4">
                {/* Progress Bar */}
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-slate-700">{progress}% Completed</span>
                    <span className="text-slate-400">{completedCount}/{items.length} tasks</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                    <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                            <div className="mt-0.5">
                                {item.completed ? (
                                    <CheckCircle2 size={18} className="text-green-500" />
                                ) : (
                                    <Circle size={18} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                    {item.title}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                            </div>
                            {!item.completed && (
                                <button
                                    onClick={() => {
                                        // Handle navigation based on item.id
                                        if (item.id === '1' || item.id === '2') setLocation('/integrations');
                                        if (item.id === '3') setLocation('/settings');
                                        if (item.id === '4') setLocation('/users');
                                    }}
                                    className="text-xs font-medium text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap"
                                >
                                    {item.actionLabel}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
