import { useState } from 'react';
import { Bell, X, TrendingUp, Eye, AlertTriangle, CheckCircle, Video, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface Notification {
    id: string;
    type: 'trend' | 'competitor' | 'warning' | 'success' | 'video';
    title: string;
    message: string;
    time: string;
    read: boolean;
    actionUrl?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'trend',
        title: 'Tendência Explosiva!',
        message: '"Caso Diddy" está bombando (+450% em 24h). Considere criar conteúdo.',
        time: '5 min atrás',
        read: false,
    },
    {
        id: '2',
        type: 'competitor',
        title: 'Novo vídeo detectado',
        message: 'Fatos Desconhecidos postou: "Os 10 SEGREDOS que a NASA esconde"',
        time: '2 horas atrás',
        read: false,
    },
    {
        id: '3',
        type: 'warning',
        title: 'Queda de performance',
        message: 'Seu canal "Mistérios Dark" teve -15% views esta semana.',
        time: '5 horas atrás',
        read: false,
    },
    {
        id: '4',
        type: 'success',
        title: 'Meta atingida!',
        message: 'Seu canal "Curiosidades BR" atingiu 10K inscritos.',
        time: '1 dia atrás',
        read: true,
    },
    {
        id: '5',
        type: 'video',
        title: 'Conteúdo aprovado',
        message: 'O vídeo "A Verdade sobre o Titanic" está pronto para upload.',
        time: '2 dias atrás',
        read: true,
    },
];

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'trend':
            return <Flame className="w-4 h-4 text-orange-500" />;
        case 'competitor':
            return <Eye className="w-4 h-4 text-blue-500" />;
        case 'warning':
            return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        case 'success':
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'video':
            return <Video className="w-4 h-4 text-purple-500" />;
        default:
            return <Bell className="w-4 h-4" />;
    }
};

const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
        case 'trend':
            return 'bg-orange-500/10';
        case 'competitor':
            return 'bg-blue-500/10';
        case 'warning':
            return 'bg-yellow-500/10';
        case 'success':
            return 'bg-green-500/10';
        case 'video':
            return 'bg-purple-500/10';
        default:
            return 'bg-muted';
    }
};

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [open, setOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const removeNotification = (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Notificações</h3>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                {unreadCount} novas
                            </Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                            Marcar todas como lidas
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Bell className="w-10 h-10 mb-3 opacity-50" />
                            <p className="text-sm">Nenhuma notificação</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-muted/50 transition-colors cursor-pointer group relative",
                                        !notification.read && "bg-primary/5"
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                            getNotificationBg(notification.type)
                                        )}>
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "font-medium text-sm",
                                                    !notification.read && "text-foreground",
                                                    notification.read && "text-muted-foreground"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeNotification(notification.id);
                                                    }}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground/70 mt-2">
                                                {notification.time}
                                            </p>
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-3 border-t border-border">
                    <Button variant="ghost" className="w-full text-sm h-9">
                        Ver todas as notificações
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
