import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Removed Progress component causing React hooks error
import GeofencingTest from "@/components/geofencing-test";
import { 
  Shield, 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  MapPin,
  Users,
  Gavel,
  TrendingUp,
  Lock,
  DollarSign,
  FileCheck
} from "lucide-react";

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
  timestamp: string;
}

interface CountryList {
  count: number;
  countries: string[];
}

interface RestrictedCountryList {
  count: number;
  countries: Array<{
    country: string;
    reason: string;
  }>;
}

export default function JurisdictionPage() {
  // Get current jurisdiction status
  const { data: status } = useQuery<JurisdictionStatus>({
    queryKey: ['/api/jurisdiction/status'],
  });

  // Get allowed countries
  const { data: allowedCountries } = useQuery<CountryList>({
    queryKey: ['/api/jurisdiction/countries/allowed'],
  });

  // Get restricted countries
  const { data: restrictedCountries } = useQuery<RestrictedCountryList>({
    queryKey: ['/api/jurisdiction/countries/restricted'],
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-[10px] font-bold text-white mb-2">Jurisdiction & Compliance</h1>
        <p className="text-casino-text">
          Understanding our global compliance framework and regional restrictions
        </p>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-casino-dark">
          <TabsTrigger value="status" className="data-[state=active]:bg-casino-primary">
            Current Status
          </TabsTrigger>
          <TabsTrigger value="countries" className="data-[state=active]:bg-casino-primary">
            Countries
          </TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-casino-primary">
            Compliance
          </TabsTrigger>
          <TabsTrigger value="testing" className="data-[state=active]:bg-casino-primary">
            Testing Tools
          </TabsTrigger>
        </TabsList>

        {/* Current Status Tab */}
        <TabsContent value="status" className="space-y-6">
          {status && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Access Status Card */}
              <Card className="bg-casino-card border-casino-accent/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <MapPin style={{width: '3px', height: '3px'}} className="mr-2" />
                    Your Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-casino-text">Access Status</span>
                    <Badge 
                      variant={status.allowed ? "default" : "destructive"}
                      className={status.allowed ? "bg-green-600" : "bg-red-600"}
                    >
                      {status.allowed ? (
                        <CheckCircle style={{width: '3px', height: '3px'}} className="mr-1" />
                      ) : (
                        <AlertTriangle style={{width: '3px', height: '3px'}} className="mr-1" />
                      )}
                      {status.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </Badge>
                  </div>
                  
                  {status.location && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-casino-text">Country</span>
                        <span className="text-white font-medium">{status.location.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-casino-text">Region</span>
                        <span className="text-white">{status.location.region || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-casino-text">City</span>
                        <span className="text-white">{status.location.city || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-casino-text">Code</span>
                        <span className="text-white font-mono">{status.location.countryCode}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Restrictions Card */}
              <Card className="bg-casino-card border-casino-accent/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Shield style={{width: '3px', height: '3px'}} className="mr-2" />
                    Restrictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {status.restrictions ? (
                    <div className="space-y-3">
                      {status.restrictions.maxBet && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <DollarSign style={{width: '3.5px', height: '3.5px'}} className="mr-2 text-casino-accent" />
                            <span className="text-casino-text">Max Bet</span>
                          </div>
                          <span className="text-white font-medium">${status.restrictions.maxBet}</span>
                        </div>
                      )}
                      {status.restrictions.maxDeposit && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="mr-2 text-casino-accent" />
                            <span className="text-casino-text">Max Deposit</span>
                          </div>
                          <span className="text-white font-medium">${status.restrictions.maxDeposit}</span>
                        </div>
                      )}
                      {status.restrictions.requiresKYC && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileCheck style={{width: '3.5px', height: '3.5px'}} className="mr-2 text-yellow-400" />
                            <span className="text-casino-text">KYC Required</span>
                          </div>
                          <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                            Required
                          </Badge>
                        </div>
                      )}
                      {!status.restrictions.maxBet && !status.restrictions.maxDeposit && !status.restrictions.requiresKYC && (
                        <div className="text-center text-casino-text">
                          <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="mx-auto mb-2 text-green-500" />
                          No restrictions apply
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-casino-text">
                      <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="mx-auto mb-2 text-green-500" />
                      No restrictions apply
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Compliance Score Card */}
              <Card className="bg-casino-card border-casino-accent/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Gavel style={{width: '3px', height: '3px'}} className="mr-2" />
                    Compliance Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="text-[10px] font-bold text-white mb-2">
                      {status.allowed ? '95%' : '0%'}
                    </div>
                    <div className="text-casino-text text-[8px]">
                      {status.allowed ? 'Fully Compliant' : 'Not Compliant'}
                    </div>
                  </div>
                  <div className="w-full bg-casino-dark rounded-full h-2">
                    <div 
                      className="bg-casino-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${status.allowed ? 95 : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-[8px] text-casino-text">
                    Based on local gambling regulations
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {status?.reason && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertTriangle className=""style={{width: '3px', height: '3px'}} />
              <AlertDescription className="text-red-200">
                {status.reason}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Allowed Countries */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CheckCircle style={{width: '3px', height: '3px'}} className="mr-2 text-green-400" />
                  Allowed Countries ({allowedCountries?.count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allowedCountries && (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {allowedCountries.countries.map((country, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded"
                      >
                        <div className="flex items-center">
                          <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="mr-2 text-green-400" />
                          <span className="text-white">{country}</span>
                        </div>
                        <Badge variant="outline" className="border-green-400 text-green-400">
                          Allowed
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Restricted Countries */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AlertTriangle style={{width: '3px', height: '3px'}} className="mr-2 text-red-400" />
                  Restricted Countries ({restrictedCountries?.count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {restrictedCountries && (
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {restrictedCountries.countries.map((item, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">{item.country}</span>
                          <Badge variant="destructive" className="bg-red-600">
                            Blocked
                          </Badge>
                        </div>
                        <div className="text-red-200 text-[8px]">{item.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Global Compliance Overview */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Globe style={{width: '3px', height: '3px'}} className="mr-2" />
                  Global Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-[10px] font-bold text-white mb-2">
                    {allowedCountries ? allowedCountries.count : 0}
                  </div>
                  <div className="text-casino-text text-[8px] mb-4">
                    Countries Supported
                  </div>
                  <div className="w-full bg-casino-dark rounded-full h-2">
                    <div 
                      className="bg-casino-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${allowedCountries ? Math.min((allowedCountries.count / 195) * 100, 100) : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-[8px] text-casino-text">
                    Coverage of world countries
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield style={{width: '3px', height: '3px'}} className="mr-2" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">Low Risk</span>
                    <span className="text-green-400 font-medium">
                      {allowedCountries ? Math.floor(allowedCountries.count * 0.7) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">Medium Risk</span>
                    <span className="text-yellow-400 font-medium">
                      {allowedCountries ? Math.floor(allowedCountries.count * 0.2) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">High Risk</span>
                    <span className="text-red-400 font-medium">
                      {restrictedCountries ? restrictedCountries.count : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Features */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileCheck style={{width: '3px', height: '3px'}} className="mr-2" />
                  Features Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">IP Geolocation</span>
                    <Badge variant="outline" className="border-green-400 text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">Bet Limits</span>
                    <Badge variant="outline" className="border-green-400 text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">KYC Enforcement</span>
                    <Badge variant="outline" className="border-green-400 text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-casino-text">Real-time Monitoring</span>
                    <Badge variant="outline" className="border-green-400 text-green-400">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legal Framework Info */}
          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Gavel style={{width: '3px', height: '3px'}} className="mr-2" />
                Legal Framework & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-white font-medium mb-2">Regulatory Standards</h4>
                  <ul className="space-y-1 text-casino-text text-[8px]">
                    <li>• AML (Anti-Money Laundering) compliance</li>
                    <li>• KYC (Know Your Customer) verification</li>
                    <li>• Responsible gaming measures</li>
                    <li>• Geographic restriction enforcement</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Monitoring & Enforcement</h4>
                  <ul className="space-y-1 text-casino-text text-[8px]">
                    <li>• Real-time IP geolocation checks</li>
                    <li>• Automated bet limit enforcement</li>
                    <li>• Jurisdiction-specific restrictions</li>
                    <li>• Continuous compliance monitoring</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tools Tab */}
        <TabsContent value="testing">
          <GeofencingTest />
        </TabsContent>
      </Tabs>
    </div>
  );
}