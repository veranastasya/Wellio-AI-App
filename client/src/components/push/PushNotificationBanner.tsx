import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationBanner() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  if (isSubscribed) {
    return (
      <Card className="border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30">
        <CardContent className="flex items-center justify-between gap-4 py-3 px-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <div>
              <p className="text-sm font-medium text-teal-800 dark:text-teal-200" data-testid="text-push-enabled">
                Push notifications enabled
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400">
                You'll receive updates from your coach
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={unsubscribe}
            disabled={isLoading}
            data-testid="button-disable-push"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <BellOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200" data-testid="text-push-blocked">
              Notifications blocked
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Enable notifications in your browser settings to receive updates
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
      <CardContent className="flex items-center justify-between gap-4 py-3 px-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200" data-testid="text-push-prompt">
              Enable push notifications
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Get instant updates from your coach
            </p>
          </div>
        </div>
        <Button 
          size="sm"
          onClick={subscribe}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-enable-push"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
        </Button>
      </CardContent>
    </Card>
  );
}
