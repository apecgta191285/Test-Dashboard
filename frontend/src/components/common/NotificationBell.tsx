// src/components/common/NotificationBell.tsx
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/services/api-client';
import { useNotificationStore } from '@/stores/notification-store';
import { alertSeverityConfig } from '@/lib/enum-mappers';
import type { Notification } from '@/types/api';
import type { AlertSeverity } from '@/types/enums';

const POLL_INTERVAL = 30 * 1000; // 30 seconds

export function NotificationBell() {
    const queryClient = useQueryClient();
    const { notifications, unreadCount, setNotifications, markAsRead } =
        useNotificationStore();

    // Fetch notifications with polling
    const { isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get('/notifications');
            return response.data.data as Notification[];
        },
        onSuccess: setNotifications,
        refetchInterval: POLL_INTERVAL,
        refetchIntervalInBackground: false,
        retry: false,
        enabled: true,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
        onSuccess: (_, id) => markAsRead(id),
    });

    // Mark all as read
    const markAllMutation = useMutation({
        mutationFn: () => apiClient.patch('/notifications/read-all'),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllMutation.mutate()}
                            className="text-xs"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="p-4 text-center text-muted-foreground">
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const severity = notification.metadata
                                ?.severity as AlertSeverity | undefined;
                            const config = severity ? alertSeverityConfig[severity] : null;

                            return (
                                <div
                                    key={notification.id}
                                    className={`
                    px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer
                    ${!notification.isRead ? 'bg-muted/30' : ''}
                  `}
                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">
                                                    {notification.title}
                                                </span>
                                                {config && (
                                                    <Badge
                                                        className={config.className}
                                                        variant={config.variant}
                                                    >
                                                        {config.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                                {notification.message}
                                            </p>
                                            <span className="text-xs text-muted-foreground mt-1 block">
                                                {formatTime(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </ScrollArea>

                <DropdownMenuSeparator />
                <div className="p-2">
                    <Button variant="ghost" className="w-full" asChild>
                        <a href="/notifications">View all</a>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
