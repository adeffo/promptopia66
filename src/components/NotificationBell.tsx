import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell = ({ userId }: NotificationBellProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      fetchNotifications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;

      fetchNotifications();
      toast({
        title: "Alle gelesen",
        description: "Alle Benachrichtigungen wurden als gelesen markiert.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'comment':
        return `${notification.payload?.commenter_name || 'Jemand'} hat deinen Prompt kommentiert`;
      case 'favorite':
        return `${notification.payload?.user_name || 'Jemand'} hat deinen Prompt favorisiert`;
      case 'new_contest':
        return `Neuer Contest: ${notification.payload?.contest_name || 'Nimm teil!'}`;
      case 'contest_winner':
        return `Du hast einen Contest gewonnen! 🎉`;
      default:
        return 'Neue Benachrichtigung';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <h3 className="font-semibold">Benachrichtigungen</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs"
              onClick={markAllAsRead}
            >
              Alle lesen
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/40">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.read_at ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => !notification.read_at && markAsRead(notification.id)}
                >
                  <p className="text-sm mb-1">{getNotificationMessage(notification)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true,
                      locale: de 
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Keine Benachrichtigungen
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
