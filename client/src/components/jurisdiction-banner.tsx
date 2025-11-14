import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, AlertTriangle, CheckCircle, Globe, X } from "lucide-react";

interface JurisdictionStatus {
  allowed: boolean;
  location?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
  };
  restrictions?: {
    maxBet?: number;
    maxDeposit?: number;
    requiresKYC?: boolean;
  };
  reason?: string;
}

export default function JurisdictionBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Fetch jurisdiction status
  const { data: jurisdictionStatus, isLoading } = useQuery<JurisdictionStatus>({
    queryKey: ['/api/jurisdiction/status'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't show anything while loading or if dismissed
  if (isLoading || dismissed || !jurisdictionStatus) {
    return null;
  }

  // If access is not allowed, show blocking banner
  if (!jurisdictionStatus.allowed) {
    return (
      <Alert className="border-red-500 bg-red-500/10 mb-4">
        <AlertTriangle style={{width: '3px', height: '3px'}} className="text-red-500" />
        <AlertDescription className="text-[8px] text-red-400">
          <div className="flex items-center justify-between">
            <div>
              <strong>Access Restricted</strong>
              {jurisdictionStatus.location && (
                <span> - {jurisdictionStatus.location.country}</span>
              )}
              <br />
              {jurisdictionStatus.reason}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // If has restrictions, show info banner
  if (jurisdictionStatus.restrictions) {
    return (
      <Alert className="border-yellow-500 bg-yellow-500/10 mb-4">
        <Shield style={{width: '3px', height: '3px'}} className="text-yellow-500" />
        <AlertDescription className="text-yellow-400">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <strong>Jurisdiction Notice</strong>
              {jurisdictionStatus.location && (
                <span> - {jurisdictionStatus.location.country}</span>
              )}
              <div className="mt-1 text-[8px]">
                {jurisdictionStatus.restrictions.maxBet && (
                  <span>Max bet: ${jurisdictionStatus.restrictions.maxBet} • </span>
                )}
                {jurisdictionStatus.restrictions.maxDeposit && (
                  <span>Max deposit: ${jurisdictionStatus.restrictions.maxDeposit} • </span>
                )}
                {jurisdictionStatus.restrictions.requiresKYC && (
                  <span>KYC verification required</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Globe style={{width: '3.5px', height: '3.5px'}} className="mr-1" />
                    Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-casino-card border-casino-accent">
                  <DialogHeader>
                    <DialogTitle className="text-white">Jurisdiction Information</DialogTitle>
                  </DialogHeader>
                  <JurisdictionDetails status={jurisdictionStatus} />
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissed(true)}
              >
                <X style={{width: '3.5px', height: '3.5px'}} className="" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

function JurisdictionDetails({ status }: { status: JurisdictionStatus }) {
  return (
    <div className="space-y-4">
      {/* Location */}
      <Card className="bg-casino-dark border-casino-accent/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-[8px] flex items-center">
            <Globe style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
            Location Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status.location && (
            <div className="grid grid-cols-2 gap-2 text-[8px]">
              <div className="text-casino-text">Country:</div>
              <div className="text-white">{status.location.country}</div>
              <div className="text-casino-text">Region:</div>
              <div className="text-white">{status.location.region}</div>
              <div className="text-casino-text">City:</div>
              <div className="text-white">{status.location.city}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Status */}
      <Card className="bg-casino-dark border-casino-accent/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-[8px] flex items-center">
            <Shield style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
            Access Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {status.allowed ? (
              <>
                <CheckCircle style={{width: '3px', height: '3px'}} className="text-green-500" />
                <Badge className="bg-green-500">ALLOWED</Badge>
              </>
            ) : (
              <>
                <AlertTriangle style={{width: '3px', height: '3px'}} className="text-red-500" />
                <Badge className="bg-red-500">RESTRICTED</Badge>
              </>
            )}
          </div>
          {status.reason && (
            <p className="text-casino-text text-[8px] mt-2">{status.reason}</p>
          )}
        </CardContent>
      </Card>

      {/* Restrictions */}
      {status.restrictions && (
        <Card className="bg-casino-dark border-casino-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-[8px]">Applicable Restrictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {status.restrictions.maxBet && (
              <div className="flex justify-between text-[8px]">
                <span className="text-casino-text">Maximum Bet:</span>
                <span className="text-white">${status.restrictions.maxBet}</span>
              </div>
            )}
            {status.restrictions.maxDeposit && (
              <div className="flex justify-between text-[8px]">
                <span className="text-casino-text">Maximum Deposit:</span>
                <span className="text-white">${status.restrictions.maxDeposit}</span>
              </div>
            )}
            {status.restrictions.requiresKYC && (
              <div className="flex justify-between text-[8px]">
                <span className="text-casino-text">KYC Required:</span>
                <Badge className="bg-yellow-500 text-black">Yes</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Note */}
      <Alert className="border-blue-500 bg-blue-500/10">
        <Shield style={{width: '3px', height: '3px'}} className="text-blue-400" />
        <AlertDescription className="text-blue-300 text-[8px]">
          These restrictions are automatically applied based on your location to ensure compliance with local gambling laws and regulations.
        </AlertDescription>
      </Alert>
    </div>
  );
}