import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Phone, Calendar, Target, FileText, User, Scale, Ruler, Activity as ActivityIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { getGoalTypeLabel, getActivityLevelLabel } from "@shared/schema";
import { type UnitsPreference, UNITS_LABELS, formatWeight, formatHeight } from "@shared/units";

export default function ClientProfile() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [unitsPreference, setUnitsPreference] = useState<UnitsPreference>("us");

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      setLocation("/client/login");
      return;
    }

    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const response = await apiRequest("GET", "/api/client-auth/me");
      const data = await response.json();
      
      if (!data.client) {
        localStorage.removeItem("clientId");
        localStorage.removeItem("clientEmail");
        setLocation("/client/login");
        return;
      }

      setClientData(data.client);
      if (data.client.unitsPreference) {
        setUnitsPreference(data.client.unitsPreference as UnitsPreference);
      }
    } catch (error) {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-profile-title">My Profile</h1>
          <p className="text-muted-foreground mt-1">View your coaching profile and information</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              <Badge variant={clientData.status === "active" ? "default" : "secondary"}>
                {clientData.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Name</div>
                  <div className="text-base font-medium">{clientData.name}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                  <div className="text-base">{clientData.email}</div>
                </div>

                {clientData.phone && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Phone className="w-4 h-4" />
                      Phone
                    </div>
                    <div className="text-base">{clientData.phone}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    Member Since
                  </div>
                  <div className="text-base">
                    {new Date(clientData.joinedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {clientData.goalType && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      Primary Goal
                    </div>
                    <div className="text-base">{getGoalTypeLabel(clientData.goalType, clientData.goalDescription)}</div>
                  </div>
                )}

                {clientData.lastSession && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      Last Session
                    </div>
                    <div className="text-base">
                      {new Date(clientData.lastSession).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {clientData.notes && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </div>
                <div className="text-base text-muted-foreground whitespace-pre-wrap">
                  {clientData.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(clientData.sex || clientData.age || clientData.weight || clientData.height || clientData.activityLevel || clientData.bodyFatPercentage) && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle>Health Metrics</CardTitle>
                {(clientData.weight || clientData.height) && (
                  <div className="flex-shrink-0">
                    <Select value={unitsPreference} onValueChange={(v) => setUnitsPreference(v as UnitsPreference)}>
                      <SelectTrigger className="w-[140px]" data-testid="select-units-preference">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">{UNITS_LABELS.us}</SelectItem>
                        <SelectItem value="metric">{UNITS_LABELS.metric}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clientData.sex && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <User className="w-4 h-4" />
                      Sex
                    </div>
                    <div className="text-base font-medium capitalize">{clientData.sex.replace('_', ' ')}</div>
                  </div>
                )}

                {clientData.age && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      Age
                    </div>
                    <div className="text-base font-medium">{clientData.age} years</div>
                  </div>
                )}

                {clientData.weight && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Scale className="w-4 h-4" />
                      Weight
                    </div>
                    <div className="text-base font-medium">
                      {formatWeight(clientData.weight, unitsPreference)}
                    </div>
                  </div>
                )}
                
                {clientData.targetWeight && clientData.goalType === "lose_weight" && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      Target Weight
                    </div>
                    <div className="text-base font-medium">
                      {formatWeight(clientData.targetWeight, unitsPreference)}
                    </div>
                  </div>
                )}
                
                {clientData.goalWeight && clientData.goalType === "maintain_weight" && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      Goal Weight
                    </div>
                    <div className="text-base font-medium">
                      {formatWeight(clientData.goalWeight, unitsPreference)}
                    </div>
                  </div>
                )}

                {clientData.height && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Ruler className="w-4 h-4" />
                      Height
                    </div>
                    <div className="text-base font-medium">
                      {formatHeight(clientData.height, unitsPreference)}
                    </div>
                  </div>
                )}

                {clientData.activityLevel && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <ActivityIcon className="w-4 h-4" />
                      Activity Level
                    </div>
                    <div className="text-base font-medium">{getActivityLevelLabel(clientData.activityLevel)}</div>
                  </div>
                )}

                {clientData.bodyFatPercentage && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      Body Fat %
                      <Badge variant="outline" className="ml-1 text-xs">Optional</Badge>
                    </div>
                    <div className="text-base font-medium">{clientData.bodyFatPercentage}%</div>
                  </div>
                )}
                
                {clientData.targetBodyFat && clientData.goalType === "improve_body_composition" && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      Target Body Fat %
                    </div>
                    <div className="text-base font-medium">{clientData.targetBodyFat}%</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{clientData.progressScore}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${clientData.progressScore}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Keep up the great work! Your coach is tracking your progress and will provide personalized guidance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
