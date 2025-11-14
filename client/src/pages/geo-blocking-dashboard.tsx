import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Globe, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle,
  MapPin,
  BarChart3,
  Filter,
  Search,
  Clock,
  TrendingUp
} from "lucide-react";

interface GeoStats {
  totalCountries: number;
  allowedCount: number;
  restrictedCount: number;
  coverage: {
    allowed: string[];
    restricted: Array<{ country: string; reason: string; }>;
  };
}

interface AccessAttempt {
  id: string;
  timestamp: string;
  ip: string;
  country: string;
  countryCode: string;
  allowed: boolean;
  reason?: string;
  userAgent?: string;
  riskScore: number;
  isVPN: boolean;
}

export default function GeoBlockingDashboard() {
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'allowed' | 'blocked'>('all');

  // Get jurisdiction statistics
  const { data: stats } = useQuery<GeoStats>({
    queryKey: ['/api/jurisdiction/stats'],
  });

  // Mock access attempts data (in real implementation, would fetch from backend)
  const mockAccessAttempts: AccessAttempt[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      ip: '203.0.113.1',
      country: 'United Kingdom',
      countryCode: 'GB',
      allowed: true,
      riskScore: 0.1,
      isVPN: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      ip: '8.8.8.8',
      country: 'United States',
      countryCode: 'US',
      allowed: false,
      reason: 'Online gambling is heavily regulated in the United States',
      riskScore: 0.8,
      isVPN: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      ip: '104.28.0.1',
      country: 'Germany',
      countryCode: 'DE',
      allowed: true,
      riskScore: 0.3,
      isVPN: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  ];

  const filteredAttempts = mockAccessAttempts.filter(attempt => {
    const matchesCountry = !filterCountry || attempt.country.toLowerCase().includes(filterCountry.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'allowed' && attempt.allowed) ||
      (filterStatus === 'blocked' && !attempt.allowed);
    
    return matchesCountry && matchesStatus;
  });

  const getRiskColor = (score: number) => {
    if (score < 0.3) return 'text-green-500';
    if (score < 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskLabel = (score: number) => {
    if (score < 0.3) return 'Low';
    if (score < 0.7) return 'Medium';
    return 'High';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-[10px] font-bold text-white mb-2">Geo-Blocking Dashboard</h1>
        <p className="text-casino-text">
          Real-time monitoring of geographical access controls and security threats
        </p>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium text-casino-text">Total Countries</CardTitle>
              <Globe className=" text-casino-accent"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-white">{stats.totalCountries}</div>
              <p className="text-[8px] text-casino-text">
                In our jurisdiction database
              </p>
            </CardContent>
          </Card>

          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium text-casino-text">Allowed Countries</CardTitle>
              <CheckCircle className=" text-green-500"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-white">{stats.allowedCount}</div>
              <p className="text-[8px] text-casino-text">
                +{Math.round((stats.allowedCount / stats.totalCountries) * 100)}% coverage
              </p>
            </CardContent>
          </Card>

          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium text-casino-text">Restricted Countries</CardTitle>
              <AlertTriangle className=" text-red-500"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-white">{stats.restrictedCount}</div>
              <p className="text-[8px] text-casino-text">
                Legal compliance blocking
              </p>
            </CardContent>
          </Card>

          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium text-casino-text">Active Monitors</CardTitle>
              <Activity className=" text-casino-primary"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-white">24/7</div>
              <p className="text-[8px] text-casino-text">
                Real-time geo-fencing
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-casino-dark">
          <TabsTrigger value="live" className="data-[state=active]:bg-casino-primary">
            Live Access Monitoring
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-casino-primary">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="configuration" className="data-[state=active]:bg-casino-primary">
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Live Monitoring Tab */}
        <TabsContent value="live" className="space-y-6">
          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity style={{width: '3px', height: '3px'}} className="mr-2" />
                Real-Time Access Attempts
              </CardTitle>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Filter by country..."
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="bg-casino-dark border-casino-accent/20 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                    className="bg-casino-primary hover:bg-casino-primary/80"
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'allowed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('allowed')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Allowed
                  </Button>
                  <Button
                    variant={filterStatus === 'blocked' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('blocked')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Blocked
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-casino-dark/50 border border-casino-accent/10"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <MapPin style={{width: '3.5px', height: '3.5px'}} className="text-casino-accent" />
                        <span className="text-white font-medium">
                          {attempt.country} ({attempt.countryCode})
                        </span>
                      </div>
                      
                      <Badge
                        variant={attempt.allowed ? "default" : "destructive"}
                        className={attempt.allowed ? "bg-green-600" : "bg-red-600"}
                      >
                        {attempt.allowed ? 'ALLOWED' : 'BLOCKED'}
                      </Badge>

                      {attempt.isVPN && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                          VPN
                        </Badge>
                      )}

                      <div className="flex items-center space-x-1">
                        <span className="text-casino-text text-[8px]">Risk:</span>
                        <span className={`text-[8px] font-medium ${getRiskColor(attempt.riskScore)}`}>
                          {getRiskLabel(attempt.riskScore)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-[8px] text-casino-text">
                      <div className="flex items-center space-x-1">
                        <Clock style={{width: '3px', height: '3px'}} className="" />
                        <span>{new Date(attempt.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className="font-mono">{attempt.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 style={{width: '3px', height: '3px'}} className="mr-2" />
                  Access Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-casino-text">Total Requests (24h)</span>
                    <span className="text-white font-bold">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-casino-text">Allowed Requests</span>
                    <span className="text-green-500 font-bold">892 (71.5%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-casino-text">Blocked Requests</span>
                    <span className="text-red-500 font-bold">355 (28.5%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-casino-text">VPN Detected</span>
                    <span className="text-yellow-500 font-bold">89 (7.1%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp style={{width: '3px', height: '3px'}} className="mr-2" />
                  Top Blocked Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.coverage.restricted.slice(0, 5).map((country, index) => (
                    <div key={country.country} className="flex justify-between items-center">
                      <span className="text-casino-text">{country.country}</span>
                      <span className="text-red-500 font-mono text-[8px]">
                        {Math.floor(Math.random() * 50 + 10)} attempts
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <Alert>
            <Shield className=""style={{width: '3px', height: '3px'}} />
            <AlertDescription>
              Jurisdiction rules are managed through the legal compliance team. 
              Contact administrators for rule modifications.
            </AlertDescription>
          </Alert>

          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader>
              <CardTitle className="text-white">Current Protection Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-casino-text">VPN Detection</span>
                  <Badge className="bg-green-600">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-casino-text">IP Geolocation</span>
                  <Badge className="bg-green-600">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-casino-text">Real-time Blocking</span>
                  <Badge className="bg-green-600">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-casino-text">Compliance Logging</span>
                  <Badge className="bg-green-600">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}