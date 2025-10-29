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
import { Smartphone, RefreshCw, CheckCircle2, XCircle, Clock, Apple, Send, Copy } from "lucide-react";

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

interface ConnectionRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  deviceType: string;
  status: string;
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
  inviteCode: string;
}

interface DeviceConnectionProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
}

export function DeviceConnection({ clientId, clientName, clientEmail }: DeviceConnectionProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const { data: connections = [], isLoading } = useQuery<DeviceConnection[]>({
    queryKey: ["/api/device-connections/client", clientId],
    enabled: !!clientId,
  });

  const { data: connectionRequests = [] } = useQuery<ConnectionRequest[]>({
    queryKey: ["/api/connection-requests/client", clientId],
    enabled: !!clientId,
  });

  const rookConnection = connections.find(c => c.deviceType === "rook");
  const appleHealthConnection = connections.find(c => c.deviceType === "apple_health");
  const appleHealthRequest = connectionRequests.find(r => r.deviceType === "apple_health" && r.status === "pending");

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/rook/connect", {
      clientId,
      clientName,
    }),
    onSuccess: (data: any) => {
      // Open ROOK connection page in a new window
      if (data.connectionUrl) {
        const popup = window.open(data.connectionUrl, '_blank', 'noopener,noreferrer');
        
        // Check if popup was blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // Popup was blocked - show a message with a clickable link
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site, or click the link below to connect",
          });
          
          // Fallback: navigate to the URL directly
          setTimeout(() => {
            window.location.href = data.connectionUrl;
          }, 2000);
        } else {
          toast({
            title: "ROOK Connection Opened",
            description: "Please complete the connection in the new window",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/device-connections/client", clientId] });
      setIsConnecting(false);
    },
    onError: (error: any) => {
      console.error("ROOK connection error:", error);
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

  const sendAppleHealthRequestMutation = useMutation<ConnectionRequest, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/connection-requests", {
        clientId,
        clientName,
        clientEmail,
        deviceType: "apple_health",
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests/client", clientId] });
      const inviteLink = `wellio://connection-request/${data.inviteCode}`;
      
      toast({
        title: "Connection Request Sent",
        description: `Invite code: ${data.inviteCode}. Client should open this link on their iPhone.`,
        duration: 10000,
      });
      
      setIsSendingRequest(false);
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to send Apple Health connection request",
        variant: "destructive",
      });
      setIsSendingRequest(false);
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    connectMutation.mutate();
  };

  const handleSendAppleHealthRequest = () => {
    setIsSendingRequest(true);
    sendAppleHealthRequestMutation.mutate();
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteLink = `wellio://connection-request/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link Copied",
      description: "Share this link with your client to open on their iPhone",
    });
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
      <CardContent className="space-y-4">
        {/* ROOK Wearables Section */}
        {rookConnection ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">ROOK Wearables</p>
              <p className="text-xs text-muted-foreground">Garmin, Fitbit, Oura, Whoop & 400+ devices</p>
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
        ) : (
          <div>
            <Button variant="outline" className="w-full" onClick={handleConnect} data-testid="button-connect" disabled={isConnecting}>
              <Smartphone className="w-4 h-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Wearables (ROOK)"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supports Garmin, Fitbit, Oura, Whoop, and 400+ devices
            </p>
          </div>
        )}

        {/* Apple Health Section - Always visible, independent of ROOK */}
        <div className="pt-4 border-t">
          {appleHealthConnection ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                <Apple className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Apple Health</p>
                <p className="text-xs text-muted-foreground">Connected via iOS app</p>
                {appleHealthConnection.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Last synced: {new Date(appleHealthConnection.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          ) : appleHealthRequest ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                  <Apple className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Apple Health</p>
                  <p className="text-xs text-muted-foreground">Request pending - awaiting client approval</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Invite Code:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">{appleHealthRequest.inviteCode}</code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => copyInviteLink(appleHealthRequest.inviteCode)}
                  data-testid="button-copy-invite"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy Invite Link
                </Button>
                <p className="text-xs text-muted-foreground">
                  Send this link to your client to open on their iPhone
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendAppleHealthRequest}
                disabled={isSendingRequest}
                data-testid="button-send-apple-health-request"
              >
                <Apple className="w-4 h-4 mr-2" />
                {isSendingRequest ? "Sending Request..." : "Send Apple Health Request"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Requires client to approve on their iOS device
              </p>
            </div>
          )}
        </div>
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
