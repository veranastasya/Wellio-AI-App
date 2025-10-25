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

  const appleHealthConnection = connections.find(c => c.deviceType === "apple_health");

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/device-connections", {
      clientId,
      clientName,
      deviceType: "apple_health",
      status: "connected",
      syncEnabled: true,
      dataPermissions: {
        nutrition: true,
        workouts: true,
        checkIns: true,
      },
      connectedAt: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-connections/client", clientId] });
      toast({
        title: "Device Connected",
        description: "Apple Health connected successfully",
      });
      setIsConnecting(false);
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Apple Health",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sync/apple-health", {
      clientId,
      clientName,
      daysToSync: 7,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      
      if (appleHealthConnection) {
        apiRequest("PATCH", `/api/device-connections/${appleHealthConnection.id}`, {
          lastSyncedAt: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/device-connections/client", clientId] });
      }

      toast({
        title: "Sync Complete",
        description: `Synced ${data.nutritionLogsCreated + data.workoutLogsCreated + data.checkInsCreated} entries from Apple Health`,
      });
      setIsSyncing(false);
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync Apple Health data",
        variant: "destructive",
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
        description: "Apple Health has been disconnected",
      });
    },
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate();
  };

  const handleDisconnect = () => {
    if (appleHealthConnection) {
      disconnectMutation.mutate(appleHealthConnection.id);
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
          {appleHealthConnection ? (
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
        {appleHealthConnection ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Apple Health</p>
                {appleHealthConnection.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last synced: {new Date(appleHealthConnection.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  data-testid="button-sync"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" data-testid="button-manage">
                      Manage
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Apple Health</DialogTitle>
                      <DialogDescription>
                        Control what data is synced and manage your connection
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
                          Disconnect Apple Health
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
            <Dialog open={isConnecting} onOpenChange={setIsConnecting}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" data-testid="button-connect">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Connect Apple Health
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Apple Health</DialogTitle>
                  <DialogDescription>
                    Automatically sync nutrition, workout, and check-in data from Apple Health
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
                  <Button onClick={handleConnect} className="w-full" data-testid="button-confirm-connect">
                    Connect and Start Syncing
                  </Button>
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

  return (
    <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-source-${dataSource}`}>
      <Smartphone className="w-3 h-3" />
      {dataSource === "apple_health" ? "Apple Health" : dataSource}
    </Badge>
  );
}
