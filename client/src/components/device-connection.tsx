import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Smartphone, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

interface DeviceConnection {
  id: string;
  clientId: string;
  clientName: string;
  deviceType: string;
  status: string;
  syncEnabled: boolean;
  dataPermissions: {
    nutrition: boolean;
    workouts: boolean;
    checkIns: boolean;
  };
  lastSyncedAt: string | null;
  connectedAt: string;
}

interface DeviceConnectionProps {
  clientId: string;
  clientName: string;
}

export function DeviceConnection({ clientId, clientName }: DeviceConnectionProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: connections = [], isLoading } = useQuery<DeviceConnection[]>({
    queryKey: ["/api/device-connections/client", clientId],
    enabled: !!clientId,
  });

  const rookConnection = connections.find(c => c.deviceType === "rook");

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/rook/connect", {
      clientId,
      clientName,
    }),
    onSuccess: (data: any) => {
      // Open ROOK connection page in a new window
      if (data.connectionUrl) {
        window.open(data.connectionUrl, '_blank', 'noopener,noreferrer');
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/device-connections/client", clientId] });
      toast({
        title: "ROOK Connection Initiated",
        description: "Please complete the connection in the new window",
      });
      setIsConnecting(false);
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to initiate ROOK connection",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => new Promise((resolve) => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-connections/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      setTimeout(resolve, 1000);
    }),
    onSuccess: () => {
      toast({
        title: "Data Refreshed",
        description: "Latest health data loaded from ROOK",
      });
      setIsSyncing(false);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/device-connections/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-connections/client", clientId] });
      toast({
        title: "Device Disconnected",
        description: "ROOK wearables connection has been disconnected",
      });
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    connectMutation.mutate();
  };

  const handleRefresh = () => {
    setIsSyncing(true);
    refreshMutation.mutate();
  };

  const handleDisconnect = () => {
    if (rookConnection) {
      disconnectMutation.mutate(rookConnection.id);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Card data-testid="card-device-connection">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Wearable Integration</CardTitle>
            <CardDescription>Connect devices to automatically sync health data</CardDescription>
          </div>
          {rookConnection ? (
            <Badge variant="default" className="gap-1" data-testid="badge-connected">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1" data-testid="badge-not-connected">
              <XCircle className="w-3 h-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rookConnection ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">ROOK Wearables</p>
                <p className="text-xs text-muted-foreground">Apple Health, Garmin, Fitbit, Oura & 400+ devices</p>
                {rookConnection.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Last data: {new Date(rookConnection.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isSyncing}
                  data-testid="button-sync"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Refreshing..." : "Refresh"}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" data-testid="button-manage">
                      Manage
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage ROOK Connection</DialogTitle>
                      <DialogDescription>
                        Control what data is synced and manage your wearables connection
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-3">
                        <Label>Data Permissions</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Nutrition Data</span>
                            <Switch checked disabled />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Workout Data</span>
                            <Switch checked disabled />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Check-in Data</span>
                            <Switch checked disabled />
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <Button
                          variant="destructive"
                          onClick={handleDisconnect}
                          className="w-full"
                          data-testid="button-disconnect"
                        >
                          Disconnect ROOK
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="outline" className="w-full" onClick={handleConnect} data-testid="button-connect" disabled={isConnecting}>
              <Smartphone className="w-4 h-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Wearables (ROOK)"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supports Apple Health, Garmin, Fitbit, Oura, Whoop, and 400+ devices
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs mt-2">
                  What data will be synced?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ROOK Wearable Connection</DialogTitle>
                  <DialogDescription>
                    Automatically sync nutrition, workout, and check-in data from your wearables
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    <Label>Data to Sync</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Nutrition Data</span>
                        <Switch checked disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Workout Data</span>
                        <Switch checked disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Check-in Data (Weight, Body Fat)</span>
                        <Switch checked disabled />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click "Connect Wearables" to open the ROOK connection page where you can authorize your devices
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Badge component to show data source on log entries
export function DataSourceBadge({ dataSource }: { dataSource: string }) {
  if (dataSource === "manual") {
    return null; // Don't show badge for manual entries
  }

  const sourceLabel = dataSource === "apple_health" ? "Apple Health" : 
                      dataSource === "rook" ? "ROOK" : dataSource;
  
  return (
    <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-source-${dataSource}`}>
      <Smartphone className="w-3 h-3" />
      {sourceLabel}
    </Badge>
  );
}
