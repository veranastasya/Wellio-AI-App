import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  Smartphone,
  Globe,
  MessageSquare,
  Clock,
  Settings2,
  TestTube2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChannelConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  available: boolean;
  tooltip: string;
}

interface ReminderSettingsProps {
  onSettingsChange?: (settings: {
    channels: Record<string, boolean>;
    frequency: number;
    quietHoursEnabled: boolean;
  }) => void;
}

export function ReminderSettings({ onSettingsChange }: ReminderSettingsProps) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      id: "sms",
      name: "SMS",
      icon: Smartphone,
      enabled: false,
      available: false,
      tooltip: "SMS notifications require phone number setup",
    },
    {
      id: "push",
      name: "Web Push",
      icon: Globe,
      enabled: true,
      available: true,
      tooltip: "Browser push notifications",
    },
    {
      id: "inapp",
      name: "In-App",
      icon: MessageSquare,
      enabled: true,
      available: true,
      tooltip: "Notifications within the app",
    },
  ]);
  const [maxPerDay, setMaxPerDay] = useState([4]);
  const [frequency, setFrequency] = useState("moderate");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [testingSending, setTestingSending] = useState(false);

  const handleChannelToggle = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId && ch.available
          ? { ...ch, enabled: !ch.enabled }
          : ch
      )
    );
  };

  const handleTestNotification = async () => {
    setTestingSending(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast({
      title: "Test Notification Sent",
      description: "A test notification was sent to all enabled channels.",
    });
    
    setTestingSending(false);
  };

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case "minimal":
        return "1-2 reminders per day, only critical triggers";
      case "moderate":
        return "3-4 reminders per day, important triggers";
      case "active":
        return "5-6 reminders per day, most triggers";
      case "aggressive":
        return "Up to 10 reminders per day, all triggers";
      default:
        return "";
    }
  };

  const enabledChannelCount = channels.filter((ch) => ch.enabled).length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Reminder Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Notification Channels</h4>
            <Badge variant="outline" className="text-xs">
              {enabledChannelCount} active
            </Badge>
          </div>
          
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <Tooltip key={channel.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      channel.enabled && channel.available
                        ? "bg-primary/5 border-primary/20"
                        : channel.available
                        ? "bg-card hover-elevate"
                        : "bg-muted/50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        channel.enabled && channel.available
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          channel.enabled && channel.available
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{channel.name}</span>
                        {!channel.available && (
                          <p className="text-xs text-muted-foreground">Not available</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => handleChannelToggle(channel.id)}
                      disabled={!channel.available}
                      data-testid={`toggle-channel-${channel.id}`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{channel.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Reminder Frequency</h4>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger data-testid="select-frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {getFrequencyDescription(frequency)}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Daily Limit</h4>
            <Badge variant="secondary" className="text-xs">
              Max {maxPerDay[0]} per day
            </Badge>
          </div>
          <Slider
            value={maxPerDay}
            onValueChange={setMaxPerDay}
            min={1}
            max={10}
            step={1}
            className="w-full"
            data-testid="slider-max-per-day"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Quiet Hours</p>
              <p className="text-xs text-muted-foreground">10 PM - 8 AM</p>
            </div>
          </div>
          <Switch
            checked={quietHoursEnabled}
            onCheckedChange={setQuietHoursEnabled}
            data-testid="toggle-quiet-hours"
          />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm flex-1">
            Next reminder in: <strong>3 hours</strong>
          </span>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleTestNotification}
          disabled={testingSending || enabledChannelCount === 0}
          data-testid="button-test-notification"
        >
          {testingSending ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <TestTube2 className="w-4 h-4 mr-2" />
              Send Test Notification
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
