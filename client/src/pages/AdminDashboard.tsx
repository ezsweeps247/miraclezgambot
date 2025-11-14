import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploadZone } from "@/components/ImageUploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  CreditCard, 
  FileText, 
  LogOut, 
  Search,
  RefreshCw,
  DollarSign,
  UserPlus,
  Settings,
  Shield,
  Activity,
  Eye,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Bot,
  MessageSquare,
  Power,
  Send,
  MinusCircle,
  PlusCircle,
  Link,
  Edit,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Gift,
  Ticket,
  LinkIcon,
  History as HistoryIcon,
  Download,
  AlertTriangle,
  AlertOctagon,
  Wallet,
  Calendar,
  Trophy,
  Crown,
  Star,
  Award,
  Lock,
  Tag
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  telegram_id?: string;
  created_at: string;
  available: number;
  locked: number;
  total_bets: number;
  total_profit: number;
  kyc_verified?: boolean;
  risk_level?: string;
  is_in_self_exclusion?: boolean;
  self_exclusion_until?: string;
}

interface GameSettings {
  id: number;
  game_name: string;
  rtp: number;
  min_bet: number;
  max_bet: number;
  is_enabled: boolean;
  updated_at: string;
}

interface GameplayHistory {
  id: string;
  game: string;
  amount: number;
  profit: number;
  payout: number;
  multiplier?: number;
  createdAt: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
}

interface KYCData {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  telegramId?: string;
  createdAt: string;
  kycVerified: boolean;
  kycRequiredAt?: string;
  riskLevel?: string;
  referralCode?: string;
  referredBy?: string;
  isInSelfExclusion: boolean;
  selfExclusionUntil?: string;
  selfExclusionType?: string;
  balance: number;
  lockedBalance: number;
  stats: {
    total_bets: number;
    total_wagered: number;
    total_profit: number;
    total_deposits: number;
    total_withdrawals: number;
  };
}

interface AdminInfo {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  createdAt: string;
}

interface DashboardStats {
  total_users: number;
  new_users_24h: number;
  active_users_24h: number;
  banned_users: number;
  bets_24h: number;
  volume_24h: number;
  net_profit: number;
  total_revenue: number;
  total_payouts: number;
  operational_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
}

interface UsersData {
  users: User[];
  totalPages: number;
  currentPage: number;
  totalUsers: number;
}

interface GameplayData {
  gameplay: GameplayHistory[];
  totalPages: number;
  currentPage: number;
}

interface BotConfig {
  token?: string;
  isConfigured: boolean;
  isActive: boolean;
  hasToken?: boolean;
  tokenPrefix?: string;
}

interface FooterLink {
  id: number;
  section: 'support' | 'platform' | 'policy' | 'community';
  title: string;
  url: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Modal states
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [kycModalOpen, setKYCModalOpen] = useState(false);
  const [gameplayModalOpen, setGameplayModalOpen] = useState(false);
  const [rtpModalOpen, setRTPModalOpen] = useState(false);
  const [botTokenModalOpen, setBotTokenModalOpen] = useState(false);
  const [chatMessageModalOpen, setChatMessageModalOpen] = useState(false);
  
  // Form states
  const [creditAction, setCreditAction] = useState<'add' | 'remove'>('add');
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditCurrency, setCreditCurrency] = useState<'GC' | 'SC'>('GC');
  const [selectedGame, setSelectedGame] = useState<GameSettings | null>(null);
  const [gameplayPage, setGameplayPage] = useState(1);
  const [newBotToken, setNewBotToken] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [messageType, setMessageType] = useState("announcement");
  
  // Footer link states
  const [footerModalOpen, setFooterModalOpen] = useState(false);
  const [selectedFooterLink, setSelectedFooterLink] = useState<FooterLink | null>(null);
  const [footerSection, setFooterSection] = useState<'support' | 'platform' | 'policy' | 'community'>('support');
  const [footerTitle, setFooterTitle] = useState("");
  const [footerUrl, setFooterUrl] = useState("");
  const [footerOrderIndex, setFooterOrderIndex] = useState(0);
  const [footerIsActive, setFooterIsActive] = useState(true);
  
  // Site settings states
  const [siteSettings, setSiteSettings] = useState<{ banner_image?: string }>({});
  
  // Redemption code form states
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemMaxUses, setRedeemMaxUses] = useState("100");
  const [redeemDescription, setRedeemDescription] = useState("");
  const [redeemGCAmount, setRedeemGCAmount] = useState("");
  const [redeemSCAmount, setRedeemSCAmount] = useState("");
  const [redeemPerUserLimit, setRedeemPerUserLimit] = useState("1");
  const [redeemExpiresAt, setRedeemExpiresAt] = useState("");
  const [redeemBonusType, setRedeemBonusType] = useState("");
  const [redeemBonusPercentage, setRedeemBonusPercentage] = useState("");
  const [redeemNotes, setRedeemNotes] = useState("");

  // Enhanced search filters state
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchFirstName, setSearchFirstName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchTelegramId, setSearchTelegramId] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const [filterVipLevel, setFilterVipLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBalanceMin, setFilterBalanceMin] = useState("");
  const [filterBalanceMax, setFilterBalanceMax] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Bulk user actions state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'ban' | 'unban' | 'balance'>('ban');
  const [bulkBalanceAmount, setBulkBalanceAmount] = useState("");
  const [bulkBalanceType, setBulkBalanceType] = useState<'add' | 'subtract'>('add');
  const [bulkBalanceNote, setBulkBalanceNote] = useState("");

  // Fetch bonus stats
  const { data: bonusStats } = useQuery<{
    activeBonuses: number;
    totalClaimed: number;
    totalResets: number;
  }>({
    queryKey: ['/api/admin/bonus-stats'],
    enabled: !isLoading && !authError && activeTab === 'bonuses'
  });

  // Fetch bonus activity  
  const { data: bonusActivity } = useQuery<any[]>({
    queryKey: ['/api/admin/bonus-activity'],
    enabled: !isLoading && !authError && activeTab === 'bonuses'
  });

  // Check admin authentication with better error handling
  useEffect(() => {
    const checkAuth = async () => {
      console.log('[AdminDashboard] Starting auth check...');
      try {
        const token = localStorage.getItem("adminToken");
        console.log('[AdminDashboard] Token exists:', !!token);
        console.log('[AdminDashboard] Token value:', token ? `${token.substring(0, 10)}...` : 'null');
        
        if (!token) {
          console.log('[AdminDashboard] No token found, redirecting to login');
          setLocation("/admin");
          return;
        }
        
        // Verify token is valid by making a test request
        console.log('[AdminDashboard] Verifying token with API...');
        try {
          // Use POST to /api/admin/verify endpoint
          const response = await fetch("/api/admin/verify", {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          
          console.log('[AdminDashboard] API response status:', response.status);
          
          if (!response.ok) {
            if (response.status === 401) {
              console.log('[AdminDashboard] Token invalid (401), clearing and redirecting');
              localStorage.removeItem('adminToken');
              setLocation('/admin');
              return;
            }
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[AdminDashboard] Auth check successful, result:', data);
          setIsLoading(false);
        } catch (error: any) {
          console.error('[AdminDashboard] Auth verification failed:', error);
          setAuthError(error.message || 'Authentication failed');
          
          // Check if it's a network error vs auth error
          if (error.message?.includes('fetch')) {
            console.log('[AdminDashboard] Network error, showing error state');
            setIsLoading(false);
          } else if (error.message?.includes('401')) {
            console.log('[AdminDashboard] Auth failed, redirecting to login');
            localStorage.removeItem('adminToken');
            setLocation('/admin');
          } else {
            console.log('[AdminDashboard] Other error, showing error state');
            setIsLoading(false);
          }
        }
      } catch (error: any) {
        console.error('[AdminDashboard] Unexpected error in checkAuth:', error);
        setAuthError(error.message || 'Authentication error');
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [setLocation]);

  // Fetch admin info - using custom query function for POST request
  const { data: adminInfo, error: adminInfoError, isLoading: adminInfoLoading } = useQuery<AdminInfo>({
    queryKey: ["/api/admin/verify"],
    queryFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token');
      
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          throw new Error('Authentication failed');
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      // Extract admin info from the verify response
      if (data.success && data.admin) {
        return {
          id: data.admin.id,
          username: data.admin.username,
          fullName: data.admin.fullName,
          email: data.admin.email,
          createdAt: data.admin.createdAt
        };
      }
      throw new Error('Invalid response format');
    },
    enabled: !isLoading && !authError,
    retry: 1,
  });

  // Log any admin info error
  useEffect(() => {
    if (adminInfoError) {
      console.error('[AdminDashboard] Admin info error:', adminInfoError);
    }
  }, [adminInfoError]);

  // Fetch dashboard stats - queryClient already handles admin auth
  const { data: stats, error: statsError, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats", {
      dateFrom: dateRange?.from?.toISOString(),
      dateTo: dateRange?.to?.toISOString()
    }],
    enabled: !isLoading && !authError,
    retry: 1,
  });

  // Log any stats error
  useEffect(() => {
    if (statsError) {
      console.error('[AdminDashboard] Stats error:', statsError);
    }
  }, [statsError]);

  // Fetch bot configuration - queryClient handles auth
  const { data: botConfig } = useQuery<BotConfig>({
    queryKey: ["/api/admin/bot-config"],
    enabled: !isLoading && !authError,
  });

  // Build enhanced search query params
  const buildUserQueryParams = () => {
    const params: Record<string, string> = {
      page: currentPage.toString(),
      limit: '20'
    };
    
    // Multi-field search - combine into single search param
    const searchFields = [searchUsername, searchFirstName, searchLastName, searchTelegramId, searchUserId].filter(Boolean);
    if (searchFields.length > 0) {
      params.search = searchFields.join(' ');
    } else if (searchTerm) {
      params.search = searchTerm;
    }
    
    // Filters
    if (filterVipLevel) params.vipLevel = filterVipLevel;
    if (filterStatus) params.status = filterStatus === 'disabled' ? 'banned' : filterStatus;
    if (filterBalanceMin) params.minBalance = filterBalanceMin;
    if (filterBalanceMax) params.maxBalance = filterBalanceMax;
    if (filterDateFrom) params.dateFrom = filterDateFrom;
    if (filterDateTo) params.dateTo = filterDateTo;
    
    return new URLSearchParams(params).toString();
  };

  // Memoize query params to prevent unnecessary cache invalidation
  const userQueryParams = {
    page: currentPage,
    search: [searchUsername, searchFirstName, searchLastName, searchTelegramId, searchUserId, searchTerm].filter(Boolean).join(' '),
    vipLevel: filterVipLevel,
    status: filterStatus === 'disabled' ? 'banned' : filterStatus,
    minBalance: filterBalanceMin,
    maxBalance: filterBalanceMax,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
  };

  // Fetch users - queryClient handles auth
  const { data: usersData, refetch: refetchUsers, isLoading: usersLoading } = useQuery<UsersData>({
    queryKey: ['/api/admin/users', userQueryParams],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users?${buildUserQueryParams()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !isLoading && !authError,
  });

  // Fetch game settings - queryClient handles auth
  const { data: gameSettings, refetch: refetchGameSettings } = useQuery<GameSettings[]>({
    queryKey: ["/api/admin/game-settings"],
    enabled: !isLoading && !authError,
  });

  // Fetch user gameplay history - queryClient handles auth
  const { data: gameplayData } = useQuery<GameplayData>({
    queryKey: [`/api/admin/users/${selectedUser?.id}/gameplay?page=${gameplayPage}&limit=20`],
    enabled: !!selectedUser && gameplayModalOpen,
  });

  // Fetch user KYC data - queryClient handles auth
  const { data: kycData } = useQuery<KYCData>({
    queryKey: [`/api/admin/users/${selectedUser?.id}/kyc`],
    enabled: !!selectedUser && kycModalOpen,
  });

  // Fetch footer links - queryClient handles auth
  const { data: footerLinks, refetch: refetchFooterLinks } = useQuery<FooterLink[]>({
    queryKey: ["/api/admin/footer-links"],
    enabled: !isLoading && !authError,
  });
  
  // Fetch site settings
  const { data: siteSettingsData, refetch: refetchSiteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/site-settings"],
    enabled: !isLoading && !authError,
  });
  
  // Update site settings when data changes
  useEffect(() => {
    if (siteSettingsData) {
      setSiteSettings(siteSettingsData);
    }
  }, [siteSettingsData]);

  // Enable/Disable user mutation - apiRequest handles auth
  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'enable' | 'disable' }) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/users/${userId}/status`,
        { action }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User status updated",
        description: "The user's account status has been changed.",
      });
      refetchUsers();
    },
  });

  // Bulk ban/unban users
  const bulkStatusUpdate = useMutation({
    mutationFn: async ({ userIds, action }: { userIds: string[]; action: 'ban' | 'unban' }) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/users/bulk/status",
        { userIds, action }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk action completed",
        description: `Successfully updated ${data.count} users.`,
      });
      setSelectedUserIds([]);
      setBulkActionModalOpen(false);
      refetchUsers();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to perform bulk action.",
        variant: "destructive",
      });
    },
  });

  // Bulk balance adjustment
  const bulkBalanceAdjust = useMutation({
    mutationFn: async ({ userIds, amount, type, note }: { userIds: string[]; amount: string; type: 'add' | 'subtract'; note: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/users/bulk/balance",
        { userIds, amount: parseFloat(amount), type, note }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk balance adjustment completed",
        description: `Successfully adjusted balance for ${data.count} users.`,
      });
      setSelectedUserIds([]);
      setBulkActionModalOpen(false);
      setBulkBalanceAmount("");
      setBulkBalanceNote("");
      refetchUsers();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to adjust balances.",
        variant: "destructive",
      });
    },
  });

  // Adjust credits mutation - apiRequest handles auth
  const adjustCredits = useMutation({
    mutationFn: async ({ userId, amount, action, reason, currency }: { userId: string; amount: string; action: 'add' | 'remove'; reason: string; currency: 'GC' | 'SC' }) => {
      const endpoint = action === 'add' ? 'recharge' : 'redeem';
      const response = await apiRequest(
        "POST",
        `/api/admin/users/${userId}/${endpoint}`,
        { amount: parseFloat(amount), reason, currency }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust credits');
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Credits adjusted",
        description: data.message || `Successfully ${creditAction === 'add' ? 'added' : 'removed'} credits.`,
      });
      setCreditModalOpen(false);
      setCreditAmount("");
      setCreditReason("");
      setCreditCurrency('GC');
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to adjust credits",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Update RTP mutation - apiRequest handles auth
  const updateRTP = useMutation({
    mutationFn: async ({ gameName, rtp, minBet, maxBet, isEnabled }: { gameName: string; rtp: number; minBet: number; maxBet: number; isEnabled: boolean }) => {
      const response = await apiRequest(
        "PUT",
        `/api/admin/game-settings/${gameName}/rtp`,
        { rtp, minBet, maxBet, isEnabled }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "RTP updated",
        description: "Game settings have been updated successfully.",
      });
      setRTPModalOpen(false);
      refetchGameSettings();
    },
  });

  // Update bot token mutation - apiRequest handles auth
  const updateBotToken = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/bot-config/update",
        { token }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bot token updated",
        description: "The Telegram bot token has been updated successfully.",
      });
      setBotTokenModalOpen(false);
      setNewBotToken("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bot-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update bot token",
        description: error.message || "Invalid bot token",
        variant: "destructive",
      });
    },
  });

  // Toggle all games mutation - apiRequest handles auth
  const toggleAllGames = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/games/toggle-all",
        { enabled }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Games toggled",
        description: "All games have been toggled successfully.",
      });
      refetchGameSettings();
    },
  });

  // Generate random code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create redemption code mutation
  const createRedemptionCode = useMutation({
    mutationFn: async () => {
      const codeToUse = redeemCode.trim() || generateRandomCode();
      const response = await apiRequest(
        "POST",
        "/api/admin/redemption-codes",
        {
          code: codeToUse,
          description: redeemDescription,
          maxUses: parseInt(redeemMaxUses),
          perUserLimit: parseInt(redeemPerUserLimit),
          expiresAt: redeemExpiresAt || null,
          gcAmount: redeemGCAmount ? parseFloat(redeemGCAmount) : null,
          scAmount: redeemSCAmount ? parseFloat(redeemSCAmount) : null,
          bonusType: redeemBonusType || null,
          bonusPercentage: redeemBonusPercentage ? parseFloat(redeemBonusPercentage) : null,
          notes: redeemNotes || null,
          scWageringMultiplier: 0
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Code created successfully",
        description: `Redemption code ${data.code || 'created'} is ready to use.`,
      });
      // Reset form
      setRedeemCode("");
      setRedeemMaxUses("100");
      setRedeemDescription("");
      setRedeemGCAmount("");
      setRedeemSCAmount("");
      setRedeemPerUserLimit("1");
      setRedeemExpiresAt("");
      setRedeemBonusType("");
      setRedeemBonusPercentage("");
      setRedeemNotes("");
      // Refresh code list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/redemption-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create code",
        description: error.message || "Please check all fields and try again",
        variant: "destructive",
      });
    },
  });

  // Send chat message mutation - apiRequest handles auth
  // Banner upload mutation
  const bannerUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('banner', file);
      
      const response = await fetch('/api/admin/site-settings/banner', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload banner');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Banner Updated",
        description: "The home page banner has been updated successfully.",
      });
      refetchSiteSettings();
    },
    onError: (error) => {
      console.error('Banner upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload banner. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleBannerUpload = (file: File) => {
    bannerUploadMutation.mutate(file);
  };
  
  const sendChatMessage = useMutation({
    mutationFn: async ({ message, type }: { message: string; type: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/chat/send-message",
        { message, type }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent to the community chat.",
      });
      setChatMessageModalOpen(false);
      setChatMessage("");
    },
  });

  // Footer link mutations
  const createFooterLink = useMutation({
    mutationFn: async (link: Omit<FooterLink, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest("POST", "/api/admin/footer-links", link);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Footer link created",
        description: "The footer link has been created successfully.",
      });
      setFooterModalOpen(false);
      refetchFooterLinks();
    },
  });

  const updateFooterLink = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FooterLink> & { id: number }) => {
      const response = await apiRequest("PUT", `/api/admin/footer-links/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Footer link updated",
        description: "The footer link has been updated successfully.",
      });
      setFooterModalOpen(false);
      refetchFooterLinks();
    },
  });

  const deleteFooterLink = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/footer-links/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Footer link deleted",
        description: "The footer link has been deleted successfully.",
      });
      refetchFooterLinks();
    },
  });

  const handleLogout = () => {
    console.log('[AdminDashboard] Logging out');
    localStorage.removeItem("adminToken");
    setLocation("/admin");
  };

  const formatCurrency = (cents: number) => {
    return `SC ${(cents / 100).toFixed(2)}`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-white text-[10px] mb-2">Loading admin dashboard...</div>
          <div className="text-gray-400 text-[8px]">Verifying authentication...</div>
        </div>
      </div>
    );
  }

  // Show auth error if any
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[10px] text-red-500">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">{authError}</p>
            <p className="text-[8px] text-gray-400 mb-4">
              If you're seeing this on production, the API might not be accessible.
            </p>
            <Button onClick={() => setLocation('/admin')} className="mt-4">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Check if data is loading after auth
  if (!authError && !isLoading && adminInfoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-white text-[10px] mb-2">Loading dashboard data...</div>
          <div className="text-gray-400 text-[8px]">Fetching admin information...</div>
        </div>
      </div>
    );
  }
  
  // Show data fetch error
  if (adminInfoError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[10px] text-red-500">Data Loading Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">Failed to load admin data</p>
            <p className="text-[8px] text-gray-400 mb-4">
              Error: {adminInfoError.message || 'Unknown error'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => setLocation('/admin')}>
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="w-5 h-5 text-golden" />
            <div>
              <h1 className="text-[10px] font-bold text-white">Admin Dashboard</h1>
              <p className="text-[8px] text-gray-400">Welcome back, {adminInfo?.fullName || adminInfo?.username || 'Admin'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-2">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-500/10 w-full sm:w-auto"
              onClick={() => setChatMessageModalOpen(true)}
              data-testid="button-send-message"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Send Message</span>
              <span className="sm:hidden">Message</span>
            </Button>
            <Button
              variant="outline"
              className={(gameSettings && gameSettings.length > 0 && gameSettings.every((g: GameSettings) => g.is_enabled)) ? "border-orange-500 text-orange-500 w-full sm:w-auto" : "border-green-500 text-green-500 w-full sm:w-auto"}
              onClick={() => toggleAllGames.mutate(!(gameSettings && gameSettings.length > 0 && gameSettings.every((g: GameSettings) => g.is_enabled)))}
              data-testid="button-toggle-all-games"
            >
              <Power className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">{(gameSettings && gameSettings.length > 0 && gameSettings.every((g: GameSettings) => g.is_enabled)) ? "Disable All Games" : "Enable All Games"}</span>
              <span className="sm:hidden">{(gameSettings && gameSettings.length > 0 && gameSettings.every((g: GameSettings) => g.is_enabled)) ? "Disable" : "Enable"}</span>
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10 w-full col-span-2 sm:col-span-1 sm:w-auto"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
            <Button
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hidden sm:inline-flex"
              onClick={() => setBotTokenModalOpen(true)}
              data-testid="button-bot-config"
            >
              <Bot className="w-5 h-5 mr-2" />
              Bot Config
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Side Menu */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT: SIDEBAR NAVIGATION */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <div className="lg:sticky lg:top-6 space-y-3">
                {/* Overview Stack */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Dashboard</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "overview"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab("analytics")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "analytics"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-analytics"
                    >
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Analytics
                    </button>
                  </div>
                </div>

                {/* User Management Stack */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">User Management</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("users")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "users"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Users
                    </button>
                    <button
                      onClick={() => setActiveTab("bonuses")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "bonuses"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <Gift className="w-5 h-5 mr-2" />
                      Bonuses
                    </button>
                    <button
                      onClick={() => setActiveTab("redemption-codes")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "redemption-codes"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <Ticket className="w-5 h-5 mr-2" />
                      Redeem Codes
                    </button>
                  </div>
                </div>

                {/* Game & Finance Stack */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Game & Finance</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("rtp")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "rtp"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <Gamepad2 className="w-5 h-5 mr-2" />
                      Game RTP
                    </button>
                    <button
                      onClick={() => setActiveTab("financial")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "financial"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      Financial
                    </button>
                  </div>
                </div>

                {/* Site Config Stack */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Site Configuration</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("site-settings")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "site-settings"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-2" />
                      Site Settings
                    </button>
                    <button
                      onClick={() => setActiveTab("footer")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "footer"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <LinkIcon className="w-5 h-5 mr-2" />
                      Footer Links
                    </button>
                  </div>
                </div>

                {/* Phase 2: Advanced Operations Stack */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Advanced Operations</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("support-tickets")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "support-tickets"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-support-tickets"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Support Tickets
                    </button>
                    <button
                      onClick={() => setActiveTab("email-campaigns")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "email-campaigns"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-email-campaigns"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Email Campaigns
                    </button>
                    <button
                      onClick={() => setActiveTab("live-games")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "live-games"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-live-games"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Live Games
                    </button>
                    <button
                      onClick={() => setActiveTab("reports")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "reports"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-reports"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Reports
                    </button>
                    <button
                      onClick={() => setActiveTab("security")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "security"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-security"
                    >
                      <Shield className="w-5 h-5 mr-2" />
                      Security
                    </button>
                  </div>
                </div>

                {/* Phase 3: Player Intelligence Stack */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Player Intelligence</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("player-behavior")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "player-behavior"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-player-behavior"
                    >
                      <Activity className="w-5 h-5 mr-2" />
                      Player Behavior
                    </button>
                    <button
                      onClick={() => setActiveTab("risk-management")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "risk-management"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-risk-management"
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Risk Management
                    </button>
                    <button
                      onClick={() => setActiveTab("segmentation")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "segmentation"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-segmentation"
                    >
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Segmentation
                    </button>
                    <button
                      onClick={() => setActiveTab("fraud-detection")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "fraud-detection"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-fraud-detection"
                    >
                      <AlertOctagon className="w-5 h-5 mr-2" />
                      Fraud Detection
                    </button>
                  </div>
                </div>

                {/* Phase 4A: Payment & Transaction Management */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Payment & Transactions</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("withdrawal-queue")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "withdrawal-queue"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-withdrawal-queue"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Withdrawal Queue
                    </button>
                    <button
                      onClick={() => setActiveTab("payment-providers")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "payment-providers"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-payment-providers"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Payment Providers
                    </button>
                    <button
                      onClick={() => setActiveTab("disputes")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "disputes"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-disputes"
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Transaction Disputes
                    </button>
                    <button
                      onClick={() => setActiveTab("crypto-wallets")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "crypto-wallets"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-crypto-wallets"
                    >
                      <Wallet className="w-5 h-5 mr-2" />
                      Crypto Wallets
                    </button>
                  </div>
                </div>

                {/* Phase 4B: Marketing & Growth */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Marketing & Growth</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("promotional-calendar")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "promotional-calendar"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-promotional-calendar"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Promotional Calendar
                    </button>
                    <button
                      onClick={() => setActiveTab("retention-campaigns")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "retention-campaigns"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-retention-campaigns"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Retention Campaigns
                    </button>
                    <button
                      onClick={() => setActiveTab("affiliate-system")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "affiliate-system"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-affiliate-system"
                    >
                      <LinkIcon className="w-5 h-5 mr-2" />
                      Affiliate System
                    </button>
                    <button
                      onClick={() => setActiveTab("tournaments")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "tournaments"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-tournaments"
                    >
                      <Trophy className="w-5 h-5 mr-2" />
                      Tournaments
                    </button>
                  </div>
                </div>

                {/* Phase 4C: Advanced VIP & Personalization */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">VIP & Personalization</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("vip-configuration")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "vip-configuration"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-vip-configuration"
                    >
                      <Crown className="w-5 h-5 mr-2" />
                      VIP Configuration
                    </button>
                    <button
                      onClick={() => setActiveTab("personalized-offers")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "personalized-offers"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-personalized-offers"
                    >
                      <Tag className="w-5 h-5 mr-2" />
                      Personalized Offers
                    </button>
                    <button
                      onClick={() => setActiveTab("high-rollers")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "high-rollers"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-high-rollers"
                    >
                      <Star className="w-5 h-5 mr-2" />
                      High Roller Management
                    </button>
                    <button
                      onClick={() => setActiveTab("loyalty-program")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "loyalty-program"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-loyalty-program"
                    >
                      <Award className="w-5 h-5 mr-2" />
                      Loyalty Program
                    </button>
                  </div>
                </div>

                {/* Phase 4D: Compliance & Security */}
                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                  <div className="text-[8px] font-semibold text-purple-300 mb-2 uppercase">Compliance & Security</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("kyc-workflow")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "kyc-workflow"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-kyc-workflow"
                    >
                      <UserCheck className="w-5 h-5 mr-2" />
                      KYC Workflow
                    </button>
                    <button
                      onClick={() => setActiveTab("regulatory-reporting")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "regulatory-reporting"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-regulatory-reporting"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Regulatory Reporting
                    </button>
                    <button
                      onClick={() => setActiveTab("audit-trail")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "audit-trail"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-audit-trail"
                    >
                      <HistoryIcon className="w-5 h-5 mr-2" />
                      Audit Trail
                    </button>
                    <button
                      onClick={() => setActiveTab("admin-mfa")}
                      className={`w-full flex items-center justify-start h-10 px-3 rounded-lg transition ${
                        activeTab === "admin-mfa"
                          ? "bg-purple-600 text-white"
                          : "bg-[#1a1d1e] text-gray-300 hover:bg-[#2a2d2e]"
                      }`}
                      data-testid="button-tab-admin-mfa"
                    >
                      <Lock className="w-5 h-5 mr-2" />
                      Admin MFA
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* RIGHT: MAIN CONTENT */}
            <div className="flex-1 min-w-0 space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Date Range Filter */}
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-white">Dashboard Overview</h2>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-[300px]"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">Total Users</p>
                      <p className="text-[10px] font-bold text-white">{stats?.total_users || 0}</p>
                    </div>
                    <Users style={{width: '3.5px', height: '3.5px'}} className=" text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">New Users (24h)</p>
                      <p className="text-[10px] font-bold text-white">{stats?.new_users_24h || 0}</p>
                    </div>
                    <UserPlus style={{width: '3.5px', height: '3.5px'}} className=" text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">Active Users (24h)</p>
                      <p className="text-[10px] font-bold text-white">{stats?.active_users_24h || 0}</p>
                    </div>
                    <Activity className="w-5 h-5 text-golden" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">Banned Users</p>
                      <p className="text-[10px] font-bold text-white">{stats?.banned_users || 0}</p>
                    </div>
                    <UserX style={{width: '3.5px', height: '3.5px'}} className=" text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">Bets (24h)</p>
                      <p className="text-[10px] font-bold text-white">{stats?.bets_24h || 0}</p>
                    </div>
                    <Gamepad2 style={{width: '3.5px', height: '3.5px'}} className="text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">Volume (24h)</p>
                      <p className="text-[10px] font-bold text-white">
                        {stats?.volume_24h !== undefined ? formatCurrency(stats.volume_24h) : 'SC 0.00'}
                      </p>
                    </div>
                    <TrendingUp style={{width: '3.5px', height: '3.5px'}} className=" text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400">Net Profit</p>
                      <p className="text-[10px] font-bold text-white">
                        {stats?.net_profit !== undefined ? formatCurrency(stats.net_profit) : 'SC 0.00'}
                      </p>
                    </div>
                    <DollarSign className="w-5 h-5 text-golden" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Revenue, expenses, and profit analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-[8px] text-gray-400">Total Revenue</p>
                        <p className="text-[10px] font-bold text-green-500">
                          {stats?.total_revenue !== undefined ? formatCurrency(stats.total_revenue) : 'SC 0.00'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-[8px] text-gray-400">Total Payouts</p>
                        <p className="text-[10px] font-bold text-red-500">
                          {stats?.total_payouts !== undefined ? formatCurrency(stats.total_payouts) : 'SC 0.00'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-[8px] text-gray-400">Operational Expenses</p>
                        <p className="text-[10px] font-bold text-orange-500">
                          {stats?.operational_expenses !== undefined ? formatCurrency(stats.operational_expenses) : 'SC 0.00'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-[8px] text-gray-400">Net Profit</p>
                        <p className={`text-[10px] font-bold ${(stats?.net_profit ?? 0) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stats?.net_profit !== undefined ? formatCurrency(stats.net_profit) : 'SC 0.00'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[8px] text-gray-400">Total Deposits</p>
                      <p className="text-[10px] font-semibold text-white">
                        {stats?.total_deposits !== undefined ? formatCurrency(stats.total_deposits) : 'SC 0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-400">Total Withdrawals</p>
                      <p className="text-[10px] font-semibold text-white">
                        {stats?.total_withdrawals !== undefined ? formatCurrency(stats.total_withdrawals) : 'SC 0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-400">Processing Fees (Est.)</p>
                      <p className="text-[10px] font-semibold text-white">
                        {stats?.operational_expenses !== undefined ? formatCurrency(stats.operational_expenses) : 'SC 0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-white">Advanced Analytics Dashboard</h2>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-auto"
              />
            </div>

            {/* Key Metrics Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[8px] font-medium text-gray-400">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] font-bold text-white">
                    ${((stats?.total_revenue || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-[8px] text-gray-500 mt-1">GGR</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[8px] font-medium text-gray-400">Total Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] font-bold text-white">
                    ${((stats?.volume_24h || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-[8px] text-gray-500 mt-1">Last 24h Wagered</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[8px] font-medium text-gray-400">Active Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] font-bold text-white">
                    {stats?.active_users_24h || 0}
                  </div>
                  <p className="text-[8px] text-gray-500 mt-1">Last 24h</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[8px] font-medium text-gray-400">Total Bets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] font-bold text-white">
                    {stats?.bets_24h || 0}
                  </div>
                  <p className="text-[8px] text-gray-500 mt-1">Last 24h</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue & Performance Analytics */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Trends</CardTitle>
                  <CardDescription>Daily revenue performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <Activity style={{width: '3.5px', height: '3.5px'}} className=" mr-2" />
                    <span>Revenue chart will display here</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Player Retention</CardTitle>
                  <CardDescription>Cohort retention analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <UserCheck style={{width: '3.5px', height: '3.5px'}} className=" mr-2" />
                    <span>Retention chart will display here</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Game Performance */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Game Performance Analytics</CardTitle>
                <CardDescription>Top performing games by revenue and volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  <span>Game performance chart will display here</span>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Monitoring */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Real-time Monitoring
                </CardTitle>
                <CardDescription>Live platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-[8px] text-gray-400">Live Players</p>
                    <p className="text-[10px] font-bold text-white">{stats?.active_users_24h || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] text-gray-400">Bets/Min</p>
                    <p className="text-[10px] font-bold text-white">
                      {Math.floor((stats?.bets_24h || 0) / (24 * 60))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] text-gray-400">Current Hour Revenue</p>
                    <p className="text-[10px] font-bold text-white">
                      ${((stats?.profit_24h || 0) / 2400).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-purple-500 text-purple-500 hover:bg-purple-500/10"
                onClick={() => {
                  toast({
                    title: "Analytics Export",
                    description: "Analytics export feature coming soon!",
                  });
                }}
                data-testid="button-export-analytics"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Analytics
              </Button>
              <Button
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                onClick={() => window.location.reload()}
                data-testid="button-refresh-analytics"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh Data
              </Button>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and balances</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/export/users', {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
                        },
                      });
                      if (!response.ok) throw new Error('Export failed');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `users-export-${Date.now()}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast({ title: 'Success', description: 'Users exported to CSV successfully' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export users', variant: 'destructive' });
                    }
                  }}
                  data-testid="button-export-users"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-6 space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search style={{width: '3.5px', height: '3.5px'}} className="absolute left-3 top-3 text-gray-400" />
                      <Input
                        placeholder="Quick search by username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-700 border-gray-600"
                        data-testid="input-search-users"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setAdvancedSearchOpen(!advancedSearchOpen)}
                      className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                      data-testid="button-toggle-advanced-search"
                    >
                      {advancedSearchOpen ? 'Hide Filters' : 'Advanced Search'}
                    </Button>
                  </div>

                  {/* Advanced Search Filters */}
                  {advancedSearchOpen && (
                    <div className="p-4 bg-gray-900/50 border border-purple-500/30 rounded-lg space-y-4">
                      <h3 className="text-[8px] font-semibold text-purple-400">Advanced Search Filters</h3>
                      
                      {/* Multi-field Search */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[8px] text-gray-400">Username</Label>
                          <Input
                            placeholder="Search username..."
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-username"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">First Name</Label>
                          <Input
                            placeholder="Search first name..."
                            value={searchFirstName}
                            onChange={(e) => setSearchFirstName(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-firstname"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Last Name</Label>
                          <Input
                            placeholder="Search last name..."
                            value={searchLastName}
                            onChange={(e) => setSearchLastName(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-lastname"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Telegram ID</Label>
                          <Input
                            placeholder="Search Telegram ID..."
                            value={searchTelegramId}
                            onChange={(e) => setSearchTelegramId(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-telegramid"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">User ID</Label>
                          <Input
                            placeholder="Search user ID..."
                            value={searchUserId}
                            onChange={(e) => setSearchUserId(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-userid"
                          />
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-[8px] text-gray-400">VIP Level</Label>
                          <Select value={filterVipLevel} onValueChange={setFilterVipLevel}>
                            <SelectTrigger className="h-8 text-[8px] bg-gray-700 border-gray-600" data-testid="select-filter-viplevel">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="">Any</SelectItem>
                              <SelectItem value="BRONZE">Bronze</SelectItem>
                              <SelectItem value="SILVER">Silver</SelectItem>
                              <SelectItem value="GOLD">Gold</SelectItem>
                              <SelectItem value="PLATINUM">Platinum</SelectItem>
                              <SelectItem value="DIAMOND">Diamond</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Status</Label>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 text-[8px] bg-gray-700 border-gray-600" data-testid="select-filter-status">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="">Any</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="banned">Banned</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Balance Min</Label>
                          <Input
                            type="number"
                            placeholder="Min..."
                            value={filterBalanceMin}
                            onChange={(e) => setFilterBalanceMin(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-balancemin"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Balance Max</Label>
                          <Input
                            type="number"
                            placeholder="Max..."
                            value={filterBalanceMax}
                            onChange={(e) => setFilterBalanceMax(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-balancemax"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Registered From</Label>
                          <Input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-datefrom"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] text-gray-400">Registered To</Label>
                          <Input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            className="h-8 text-[8px] bg-gray-700 border-gray-600"
                            data-testid="input-filter-dateto"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[8px]"
                          onClick={() => {
                            setSearchUsername("");
                            setSearchFirstName("");
                            setSearchLastName("");
                            setSearchTelegramId("");
                            setSearchUserId("");
                            setFilterVipLevel("");
                            setFilterStatus("");
                            setFilterBalanceMin("");
                            setFilterBalanceMax("");
                            setFilterDateFrom("");
                            setFilterDateTo("");
                          }}
                          data-testid="button-clear-filters"
                        >
                          Clear All Filters
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-[8px] bg-purple-600 hover:bg-purple-700"
                          onClick={() => refetchUsers()}
                          data-testid="button-apply-filters"
                        >
                          Apply Filters
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Actions Bar */}
                {selectedUserIds.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg flex justify-between items-center">
                    <span className="text-[8px] text-purple-300">
                      {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-red-500 border-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setBulkActionType('ban');
                          setBulkActionModalOpen(true);
                        }}
                        data-testid="button-bulk-ban"
                      >
                        <UserX style={{width: '3px', height: '3px'}} className="mr-1" />
                        Ban Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-green-500 border-green-500 hover:bg-green-500/10"
                        onClick={() => {
                          setBulkActionType('unban');
                          setBulkActionModalOpen(true);
                        }}
                        data-testid="button-bulk-unban"
                      >
                        <UserCheck style={{width: '3px', height: '3px'}} className="mr-1" />
                        Unban Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-golden border-golden hover:bg-golden/10"
                        onClick={() => {
                          setBulkActionType('balance');
                          setBulkActionModalOpen(true);
                        }}
                        data-testid="button-bulk-balance"
                      >
                        <DollarSign style={{width: '3px', height: '3px'}} className="mr-1" />
                        Adjust Balance
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-gray-400 border-gray-600"
                        onClick={() => setSelectedUserIds([])}
                        data-testid="button-clear-selection"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.length === usersData?.users?.length && usersData?.users?.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds(usersData?.users?.map(u => u.id) || []);
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                            style={{width: '3.5px', height: '3.5px'}} className="cursor-pointer"
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Total Bets</TableHead>
                        <TableHead>Total Profit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.users?.map((user) => (
                        <TableRow key={user.id} className="border-gray-700">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds([...selectedUserIds, user.id]);
                                } else {
                                  setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                }
                              }}
                              style={{width: '3.5px', height: '3.5px'}} className="cursor-pointer"
                              data-testid={`checkbox-user-${user.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.username}
                            {user.kyc_verified && (
                              <Badge className="ml-2 bg-green-600" variant="default">
                                KYC
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-golden font-semibold">
                            {formatCurrency(user.available)}
                          </TableCell>
                          <TableCell>{user.total_bets || 0}</TableCell>
                          <TableCell className={user.total_profit > 0 ? "text-green-500" : "text-red-500"}>
                            {formatCurrency(user.total_profit || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.is_in_self_exclusion ? "secondary" : "default"}
                              className={user.is_in_self_exclusion ? "bg-red-600" : "bg-green-600"}
                            >
                              {user.is_in_self_exclusion ? "Disabled" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.created_at ? format(new Date(user.created_at), "MMM dd, yyyy") : "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className={user.is_in_self_exclusion ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}
                                onClick={() => toggleUserStatus.mutate({ userId: user.id, action: user.is_in_self_exclusion ? 'enable' : 'disable' })}
                                data-testid={`button-toggle-${user.id}`}
                              >
                                {user.is_in_self_exclusion ? <UserCheck style={{width: '3px', height: '3px'}} className="" /> : <UserX style={{width: '3px', height: '3px'}} className="" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-golden border-golden"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setCreditModalOpen(true);
                                }}
                                data-testid={`button-credits-${user.id}`}
                              >
                                <DollarSign style={{width: '3px', height: '3px'}} className="" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-500 border-purple-500"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setGameplayModalOpen(true);
                                  setGameplayPage(1);
                                }}
                                data-testid={`button-gameplay-${user.id}`}
                              >
                                <Gamepad2 style={{width: '3px', height: '3px'}} className="" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-500 border-blue-500"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setKYCModalOpen(true);
                                }}
                                data-testid={`button-kyc-${user.id}`}
                              >
                                <Eye style={{width: '3px', height: '3px'}} className="" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {usersData?.totalPages && usersData.totalPages > 1 && (
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-white">
                      Page {currentPage} of {usersData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(usersData.totalPages || 1, p + 1))}
                      disabled={currentPage === (usersData?.totalPages || 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RTP Tab */}
          <TabsContent value="rtp" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Game RTP Settings</CardTitle>
                <CardDescription>Adjust Return to Player percentages for each game</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(gameSettings || []).map((game: any) => (
                    <Card key={game.id} className="bg-gray-700 border-gray-600">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <h3 className="font-bold text-white">{game.game_name}</h3>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-400">RTP:</span>
                            <span className="text-golden font-semibold">{game.rtp}%</span>
                          </div>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-400">Min Bet:</span>
                            <span className="text-white">₹{game.min_bet}</span>
                          </div>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-400">Max Bet:</span>
                            <span className="text-white">₹{game.max_bet}</span>
                          </div>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-400">Status:</span>
                            <Badge className={game.is_enabled ? "bg-green-600" : "bg-red-600"}>
                              {game.is_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <Button
                            className="w-full bg-golden hover:bg-golden/80 text-black"
                            onClick={() => {
                              setSelectedGame(game);
                              setRTPModalOpen(true);
                            }}
                            data-testid={`button-edit-rtp-${game.game_name}`}
                          >
                            <Settings className="w-5 h-5 mr-2" />
                            Configure
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Footer Management Tab */}
          <TabsContent value="footer" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Footer Management</CardTitle>
                    <CardDescription>
                      Manage footer links and sections for your platform
                    </CardDescription>
                  </div>
                  <Button
                    className="bg-golden hover:bg-golden/80 text-black"
                    onClick={() => {
                      setSelectedFooterLink(null);
                      setFooterTitle("");
                      setFooterUrl("");
                      setFooterSection('support');
                      setFooterOrderIndex(0);
                      setFooterIsActive(true);
                      setFooterModalOpen(true);
                    }}
                    data-testid="button-add-footer-link"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add Footer Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {['support', 'platform', 'policy', 'community'].map(section => {
                  const sectionLinks = footerLinks?.filter(link => link.section === section) || [];
                  return (
                    <div key={section} className="mb-6">
                      <h3 className="text-[10px] font-semibold text-white capitalize mb-3">
                        {section} Section
                      </h3>
                      {sectionLinks.length === 0 ? (
                        <p className="text-gray-400 italic">No links in this section</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-gray-400">Title</TableHead>
                              <TableHead className="text-gray-400">URL</TableHead>
                              <TableHead className="text-gray-400">Order</TableHead>
                              <TableHead className="text-gray-400">Status</TableHead>
                              <TableHead className="text-gray-400">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sectionLinks
                              .sort((a, b) => a.orderIndex - b.orderIndex)
                              .map(link => (
                                <TableRow key={link.id}>
                                  <TableCell className="text-white">{link.title}</TableCell>
                                  <TableCell className="text-gray-300">
                                    {link.url || <span className="text-gray-500 italic">No URL</span>}
                                  </TableCell>
                                  <TableCell className="text-white">{link.orderIndex}</TableCell>
                                  <TableCell>
                                    <Badge className={link.isActive ? "bg-green-600" : "bg-red-600"}>
                                      {link.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedFooterLink(link);
                                          setFooterTitle(link.title);
                                          setFooterUrl(link.url || '');
                                          setFooterSection(link.section);
                                          setFooterOrderIndex(link.orderIndex);
                                          setFooterIsActive(link.isActive);
                                          setFooterModalOpen(true);
                                        }}
                                        data-testid={`button-edit-footer-${link.id}`}
                                      >
                                        <Edit className="w-5 h-5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          if (confirm(`Delete "${link.title}"?`)) {
                                            deleteFooterLink.mutate(link.id);
                                          }
                                        }}
                                        data-testid={`button-delete-footer-${link.id}`}
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Site Settings Tab */}
          <TabsContent value="site-settings" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div>
                  <CardTitle className="text-white">Site Settings</CardTitle>
                  <CardDescription>
                    Configure global site settings and appearance
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Banner Image Management */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-semibold text-white">Home Page Banner</h3>
                  <ImageUploadZone
                    currentImage={siteSettings?.banner_image}
                    onImageSelect={handleBannerUpload}
                    maxSizeMB={5}
                    acceptedFormats={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                  />
                  {bannerUploadMutation.isPending && (
                    <div className="text-[8px] text-gray-400 flex items-center gap-2">
                      <RefreshCw style={{width: '3.5px', height: '3.5px'}} className="animate-spin" />
                      Uploading banner...
                    </div>
                  )}
                  {bannerUploadMutation.isError && (
                    <div className="text-[8px] text-red-500">
                      Failed to upload banner. Please try again.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Bonus Management</CardTitle>
                <CardDescription>View and manage user bonuses and reset history</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-gray-400">Active Bonuses</p>
                          <p className="text-[10px] font-bold text-white">
                            {bonusStats?.activeBonuses || 0}
                          </p>
                        </div>
                        <Gift className="w-5 h-5 text-golden" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-gray-400">Total Bonuses Claimed</p>
                          <p className="text-[10px] font-bold text-white">
                            {bonusStats?.totalClaimed || 0}
                          </p>
                        </div>
                        <Gift style={{width: '3.5px', height: '3.5px'}} className=" text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-gray-400">Total Bonus Resets</p>
                          <p className="text-[10px] font-bold text-white">
                            {bonusStats?.totalResets || 0}
                          </p>
                        </div>
                        <RefreshCw style={{width: '3.5px', height: '3.5px'}} className=" text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Bonus Activity */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-semibold text-white mb-4">Recent Bonus Activity</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-400">User</TableHead>
                          <TableHead className="text-gray-400">Type</TableHead>
                          <TableHead className="text-gray-400">Bonus Type</TableHead>
                          <TableHead className="text-gray-400">Amount</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bonusActivity?.map((activity: any) => (
                          <TableRow key={activity.id} className="border-gray-700">
                            <TableCell className="text-white">
                              {activity.username || 'Anonymous'}
                            </TableCell>
                            <TableCell>
                              {activity.type === 'bonus_claimed' ? (
                                <Badge className="bg-green-500/20 text-green-500">
                                  <Gift style={{width: '3px', height: '3px'}} className="mr-1" />
                                  Claimed
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-500/20 text-purple-500">
                                  <RefreshCw style={{width: '3px', height: '3px'}} className="mr-1" />
                                  Reset
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {activity.bonusType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </TableCell>
                            <TableCell className="text-white">
                              {activity.type === 'bonus_claimed' 
                                ? `$${(activity.bonusAmount || 0).toFixed(2)}`
                                : `Balance: $${(activity.balanceAtReset || 0).toFixed(2)}`}
                            </TableCell>
                            <TableCell>
                              {activity.status && (
                                <Badge className={
                                  activity.status === 'active' ? 'bg-yellow-500/20 text-yellow-500' :
                                  activity.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                  activity.status === 'expired' ? 'bg-red-500/20 text-red-500' :
                                  'bg-gray-500/20 text-gray-500'
                                }>
                                  {activity.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {activity.claimedAt || activity.resetAt 
                                ? format(new Date(activity.claimedAt || activity.resetAt), "MMM dd HH:mm")
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {(!bonusActivity || bonusActivity.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
                        No bonus activity found
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries(['/api/admin/bonus-stats'] as any)}
                    data-testid="button-refresh-bonus-stats"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Refresh Stats
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries(['/api/admin/bonus-activity'] as any)}
                    data-testid="button-refresh-bonus-activity"
                  >
                    <HistoryIcon className="w-5 h-5 mr-2" />
                    Refresh Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redemption Codes Tab */}
          <TabsContent value="redemption-codes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Code Creation Form */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Create Redemption Code</CardTitle>
                  <CardDescription>Generate new redemption codes for users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="redemption-code">Code</Label>
                      <Input
                        id="redemption-code"
                        value={redeemCode}
                        onChange={(e) => setRedeemCode(e.target.value)}
                        placeholder="Enter code (auto-generated if empty)"
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-redemption-code"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-uses">Max Uses</Label>
                      <Input
                        id="max-uses"
                        type="number"
                        value={redeemMaxUses}
                        onChange={(e) => setRedeemMaxUses(e.target.value)}
                        placeholder="100"
                        min="1"
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-max-uses"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={redeemDescription}
                      onChange={(e) => setRedeemDescription(e.target.value)}
                      placeholder="Code description"
                      className="bg-gray-700 border-gray-600"
                      data-testid="input-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gc-amount">Gold Credits Amount</Label>
                      <Input
                        id="gc-amount"
                        type="number"
                        value={redeemGCAmount}
                        onChange={(e) => setRedeemGCAmount(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-gc-amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sc-amount">Sweeps Cash Amount</Label>
                      <Input
                        id="sc-amount"
                        type="number"
                        value={redeemSCAmount}
                        onChange={(e) => setRedeemSCAmount(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-sc-amount"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="per-user-limit">Per User Limit</Label>
                      <Input
                        id="per-user-limit"
                        type="number"
                        value={redeemPerUserLimit}
                        onChange={(e) => setRedeemPerUserLimit(e.target.value)}
                        placeholder="1"
                        min="1"
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-per-user-limit"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expires-at">Expires At (Optional)</Label>
                      <Input
                        id="expires-at"
                        type="datetime-local"
                        value={redeemExpiresAt}
                        onChange={(e) => setRedeemExpiresAt(e.target.value)}
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-expires-at"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bonus-type">Bonus Type</Label>
                      <Select value={redeemBonusType} onValueChange={setRedeemBonusType}>
                        <SelectTrigger className="bg-gray-700 border-gray-600" data-testid="select-bonus-type">
                          <SelectValue placeholder="Select bonus type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="welcome">Welcome</SelectItem>
                          <SelectItem value="loyalty">Loyalty</SelectItem>
                          <SelectItem value="special">Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bonus-percentage">Bonus Percentage</Label>
                      <Input
                        id="bonus-percentage"
                        type="number"
                        value={redeemBonusPercentage}
                        onChange={(e) => setRedeemBonusPercentage(e.target.value)}
                        placeholder="0"
                        min="0"
                        max="500"
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-bonus-percentage"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={redeemNotes}
                      onChange={(e) => setRedeemNotes(e.target.value)}
                      placeholder="Internal notes about this code"
                      className="bg-gray-700 border-gray-600"
                      data-testid="input-notes"
                    />
                  </div>

                  <Button 
                    className="w-full bg-golden hover:bg-golden/90 text-black" 
                    onClick={() => createRedemptionCode.mutate()}
                    disabled={createRedemptionCode.isPending || !redeemDescription || (!redeemGCAmount && !redeemSCAmount)}
                    data-testid="button-create-code"
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    {createRedemptionCode.isPending ? 'Creating...' : 'Create Code'}
                  </Button>
                </CardContent>
              </Card>

              {/* Statistics Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Code Statistics</CardTitle>
                  <CardDescription>Overview of redemption code activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[8px] text-gray-400">Active Codes</p>
                              <p className="text-[10px] font-bold text-white">0</p>
                            </div>
                            <Gift className="w-5 h-5 text-golden" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[8px] text-gray-400">Total Redeemed</p>
                              <p className="text-[10px] font-bold text-white">0</p>
                            </div>
                            <RefreshCw style={{width: '3.5px', height: '3.5px'}} className=" text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[8px] text-gray-400">GC Distributed</p>
                              <p className="text-[10px] font-bold text-golden">0</p>
                            </div>
                            <DollarSign className="w-5 h-5 text-golden" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[8px] text-gray-400">SC Distributed</p>
                              <p className="text-[10px] font-bold text-purple-500">0</p>
                            </div>
                            <DollarSign style={{width: '3.5px', height: '3.5px'}} className=" text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full" 
                      data-testid="button-refresh-stats"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Refresh Statistics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Codes Management Table */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Manage Redemption Codes</CardTitle>
                <CardDescription>View and manage existing redemption codes</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search style={{width: '3.5px', height: '3.5px'}} className="absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search codes..."
                      className="pl-10 bg-gray-700 border-gray-600"
                      data-testid="input-search-codes"
                    />
                  </div>
                </div>

                {/* Codes Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>GC/SC Rewards</TableHead>
                        <TableHead>Used/Max</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-gray-700">
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          No redemption codes found. Create your first code above.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex justify-center">
                  <Button 
                    variant="outline" 
                    data-testid="button-refresh-codes"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Refresh Codes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 2: Support Tickets Tab */}
          <TabsContent value="support-tickets" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Support Tickets Management</CardTitle>
                <CardDescription>View and respond to user support tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Support Tickets System</p>
                  <p className="text-[8px] mt-2">Manage and respond to user support requests</p>
                  <div className="mt-6 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-white">0</p>
                      <p className="text-[8px] text-gray-400">Open Tickets</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-golden">0</p>
                      <p className="text-[8px] text-gray-400">In Progress</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-green-500">0</p>
                      <p className="text-[8px] text-gray-400">Resolved</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 2: Email Campaigns Tab */}
          <TabsContent value="email-campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-white">Email Campaigns</h2>
              <Button className="bg-golden hover:bg-golden/80 text-black" data-testid="button-create-campaign">
                <Plus className="w-5 h-5 mr-2" />
                Create Campaign
              </Button>
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Email Campaign Manager</CardTitle>
                <CardDescription>Create and manage targeted email campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Send className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Email Campaign System</p>
                  <p className="text-[8px] mt-2">Send targeted emails to user segments</p>
                  <div className="mt-6 grid grid-cols-4 gap-4 max-w-3xl mx-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-white">0</p>
                      <p className="text-[8px] text-gray-400">Draft Campaigns</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-blue-500">0</p>
                      <p className="text-[8px] text-gray-400">Scheduled</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-green-500">0</p>
                      <p className="text-[8px] text-gray-400">Sent</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-golden">0%</p>
                      <p className="text-[8px] text-gray-400">Avg Open Rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 2: Live Games Tab */}
          <TabsContent value="live-games" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-white">Live Game Monitoring</h2>
              <Button variant="outline" data-testid="button-refresh-live-games">
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh
              </Button>
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Active Game Sessions</CardTitle>
                <CardDescription>Monitor live gameplay in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Eye className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Real-Time Game Monitoring</p>
                  <p className="text-[8px] mt-2">Track active players and game sessions</p>
                  <div className="mt-6 grid grid-cols-4 gap-4 max-w-3xl mx-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-white">0</p>
                      <p className="text-[8px] text-gray-400">Active Sessions</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-green-500">0</p>
                      <p className="text-[8px] text-gray-400">Players Online</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-golden">SC 0.00</p>
                      <p className="text-[8px] text-gray-400">Total Wagered</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-blue-500">0</p>
                      <p className="text-[8px] text-gray-400">Bets/Minute</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 2: Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <h2 className="text-[10px] font-bold text-white">Advanced Reports</h2>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Generate detailed analytics and custom reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Report Type</Label>
                      <Select data-testid="select-report-type">
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="revenue">Revenue Report</SelectItem>
                          <SelectItem value="user-activity">User Activity Report</SelectItem>
                          <SelectItem value="game-performance">Game Performance Report</SelectItem>
                          <SelectItem value="vip-analysis">VIP Analysis Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date From</Label>
                      <Input type="date" className="bg-gray-700 border-gray-600" data-testid="input-date-from" />
                    </div>
                    <div>
                      <Label>Date To</Label>
                      <Input type="date" className="bg-gray-700 border-gray-600" data-testid="input-date-to" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button className="bg-golden hover:bg-golden/80 text-black" data-testid="button-generate-report">
                      <FileText className="w-5 h-5 mr-2" />
                      Generate Report
                    </Button>
                    <Button variant="outline" data-testid="button-export-report">
                      <Download className="w-5 h-5 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                  <div className="text-center py-12 text-gray-400 border-t border-gray-700 mt-6">
                    <FileText className="w-5 h-5 mx-auto mb-4 opacity-50" />
                    <p className="text-[10px]">No Report Generated</p>
                    <p className="text-[8px] mt-2">Select report type and date range, then click Generate Report</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 2: Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-white">Security & IP Whitelist</h2>
              <Button className="bg-golden hover:bg-golden/80 text-black" data-testid="button-add-ip">
                <Plus className="w-5 h-5 mr-2" />
                Add IP
              </Button>
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>IP Whitelist Management</CardTitle>
                <CardDescription>Manage IP addresses with special access privileges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="IP Address (e.g., 192.168.1.100)" 
                      className="bg-gray-700 border-gray-600" 
                      data-testid="input-ip-address" 
                    />
                    <Input 
                      placeholder="Description" 
                      className="bg-gray-700 border-gray-600" 
                      data-testid="input-ip-description" 
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead>IP Address</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Added By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-gray-700">
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                          <Shield className="w-5 h-5 mx-auto mb-4 opacity-50" />
                          <p>No IP addresses whitelisted yet</p>
                          <p className="text-[8px] mt-2">Add an IP address above to grant special access</p>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 3: Player Behavior Tab */}
          <TabsContent value="player-behavior" className="space-y-4">
            <h2 className="text-[10px] font-bold text-white">Player Behavior Analytics</h2>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Behavior Analytics Dashboard</CardTitle>
                <CardDescription>Track player engagement, patterns, and lifetime value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Activity className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Player Behavior Intelligence</p>
                  <p className="text-[8px] mt-2">Analyze session metrics, betting patterns, and player value</p>
                  <div className="mt-6 grid grid-cols-4 gap-4 max-w-3xl mx-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-white">0</p>
                      <p className="text-[8px] text-gray-400">Total Players</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-golden">SC 0</p>
                      <p className="text-[8px] text-gray-400">Avg LTV</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-purple-500">0</p>
                      <p className="text-[8px] text-gray-400">Whales</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-red-500">0</p>
                      <p className="text-[8px] text-gray-400">High Churn Risk</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 3: Risk Management Tab */}
          <TabsContent value="risk-management" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-white">Risk Management</h2>
              <Button className="bg-golden hover:bg-golden/80 text-black" data-testid="button-create-risk-assessment">
                <Plus className="w-5 h-5 mr-2" />
                New Assessment
              </Button>
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Risk Assessment Dashboard</CardTitle>
                <CardDescription>Monitor and manage player risk profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Risk Monitoring System</p>
                  <p className="text-[8px] mt-2">Track risk scores, flags, and investigations</p>
                  <div className="mt-6 grid grid-cols-4 gap-4 max-w-3xl mx-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-red-500">0</p>
                      <p className="text-[8px] text-gray-400">Critical Risk</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-orange-500">0</p>
                      <p className="text-[8px] text-gray-400">High Risk</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-yellow-500">0</p>
                      <p className="text-[8px] text-gray-400">Under Review</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-white">0</p>
                      <p className="text-[8px] text-gray-400">Total Assessments</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 3: Segmentation Tab */}
          <TabsContent value="segmentation" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-white">Player Segmentation</h2>
              <Button className="bg-golden hover:bg-golden/80 text-black" data-testid="button-assign-segment">
                <Plus className="w-5 h-5 mr-2" />
                Assign Segment
              </Button>
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Player Segments Overview</CardTitle>
                <CardDescription>Categorize players by behavior and value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <TrendingUp className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Segmentation Engine</p>
                  <p className="text-[8px] mt-2">Group players for targeted campaigns and retention</p>
                  <div className="mt-6 grid grid-cols-5 gap-4 max-w-4xl mx-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-green-500">0</p>
                      <p className="text-[8px] text-gray-400">New Players</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-golden">0</p>
                      <p className="text-[8px] text-gray-400">High Rollers</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-purple-500">0</p>
                      <p className="text-[8px] text-gray-400">Whales</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-blue-500">0</p>
                      <p className="text-[8px] text-gray-400">Regulars</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-red-500">0</p>
                      <p className="text-[8px] text-gray-400">At Risk</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 3: Fraud Detection Tab */}
          <TabsContent value="fraud-detection" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-white">Fraud Detection</h2>
              <Button className="bg-golden hover:bg-golden/80 text-black" data-testid="button-create-fraud-alert">
                <Plus className="w-5 h-5 mr-2" />
                Create Alert
              </Button>
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Fraud Alerts & Investigation</CardTitle>
                <CardDescription>Monitor suspicious activities and fraud patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Alert Status</Label>
                      <Select defaultValue="NEW" data-testid="select-alert-status">
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="ALL">All Alerts</SelectItem>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select data-testid="select-severity">
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue placeholder="Filter by severity" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="ALL">All Severities</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" className="w-full" data-testid="button-refresh-alerts">
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="text-center py-12 text-gray-400 border-t border-gray-700">
                    <AlertOctagon className="w-5 h-5 mx-auto mb-4 opacity-50" />
                    <p className="text-[10px]">Fraud Detection System</p>
                    <p className="text-[8px] mt-2">Real-time monitoring of suspicious patterns and behaviors</p>
                    <div className="mt-6 grid grid-cols-5 gap-4 max-w-4xl mx-auto">
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-[10px] font-bold text-white">0</p>
                        <p className="text-[8px] text-gray-400">Total Alerts</p>
                      </div>
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-[10px] font-bold text-blue-500">0</p>
                        <p className="text-[8px] text-gray-400">New</p>
                      </div>
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-[10px] font-bold text-yellow-500">0</p>
                        <p className="text-[8px] text-gray-400">Investigating</p>
                      </div>
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-[10px] font-bold text-red-500">0</p>
                        <p className="text-[8px] text-gray-400">Confirmed</p>
                      </div>
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-[10px] font-bold text-red-600">0</p>
                        <p className="text-[8px] text-gray-400">Critical</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 4A: Payment & Transaction Management Tabs */}
          
          {/* Withdrawal Queue Tab */}
          <TabsContent value="withdrawal-queue" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Withdrawal Queue Management</CardTitle>
                <CardDescription>Review and process pending withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Download className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Withdrawal Queue</p>
                  <p className="text-[8px] mt-2">Manage pending withdrawal requests with priority queue system</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Providers Tab */}
          <TabsContent value="payment-providers" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Payment Provider Status</CardTitle>
                <CardDescription>Monitor payment gateway health and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <CreditCard className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Payment Providers</p>
                  <p className="text-[8px] mt-2">Real-time monitoring of payment gateway status and uptime</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction Disputes Tab */}
          <TabsContent value="disputes" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Transaction Disputes</CardTitle>
                <CardDescription>Manage and resolve transaction disputes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Dispute Management</p>
                  <p className="text-[8px] mt-2">Handle chargebacks, refunds, and transaction disputes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crypto Wallets Tab */}
          <TabsContent value="crypto-wallets" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Crypto Wallet Monitoring</CardTitle>
                <CardDescription>Monitor hot/cold wallet balances and security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Wallet className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Crypto Wallet Monitoring</p>
                  <p className="text-[8px] mt-2">Track balances, transactions, and security across all crypto wallets</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 4B: Marketing & Growth Tabs */}

          {/* Promotional Calendar Tab */}
          <TabsContent value="promotional-calendar" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Promotional Calendar</CardTitle>
                <CardDescription>Schedule and manage promotional campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Campaign Calendar</p>
                  <p className="text-[8px] mt-2">Plan and schedule bonuses, tournaments, and special events</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retention Campaigns Tab */}
          <TabsContent value="retention-campaigns" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Retention Campaigns</CardTitle>
                <CardDescription>Win-back and re-engagement campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Send className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Retention Tools</p>
                  <p className="text-[8px] mt-2">Automated campaigns for inactive players and churn prevention</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Affiliate System Tab */}
          <TabsContent value="affiliate-system" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Affiliate System</CardTitle>
                <CardDescription>Manage affiliate partners and commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <LinkIcon className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Affiliate Management</p>
                  <p className="text-[8px] mt-2">Track referrals, manage tiers, and process commission payouts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Tournament Management</CardTitle>
                <CardDescription>Create and manage competitive tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Trophy className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Tournaments</p>
                  <p className="text-[8px] mt-2">Schedule tournaments, manage prizes, and track leaderboards</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 4C: Advanced VIP & Personalization Tabs */}

          {/* VIP Configuration Tab */}
          <TabsContent value="vip-configuration" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>VIP Tier Configuration</CardTitle>
                <CardDescription>Configure VIP levels, benefits, and requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Crown className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">VIP System Configuration</p>
                  <p className="text-[8px] mt-2">Set wagering requirements, perks, and tier benefits</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personalized Offers Tab */}
          <TabsContent value="personalized-offers" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Personalized Offers</CardTitle>
                <CardDescription>Create targeted offers for individual players</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Tag className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Custom Player Offers</p>
                  <p className="text-[8px] mt-2">Send personalized bonuses and promotions based on player behavior</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* High Rollers Tab */}
          <TabsContent value="high-rollers" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>High Roller Management</CardTitle>
                <CardDescription>VIP management for high-value players</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Star className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">High Roller Profiles</p>
                  <p className="text-[8px] mt-2">Track whale players, assign VIP managers, and manage special perks</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Program Tab */}
          <TabsContent value="loyalty-program" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Loyalty Reward Catalog</CardTitle>
                <CardDescription>Manage loyalty points and reward redemptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Award className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Loyalty Program</p>
                  <p className="text-[8px] mt-2">Configure reward catalog and points redemption system</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 4D: Compliance & Security Tabs */}

          {/* KYC Workflow Tab */}
          <TabsContent value="kyc-workflow" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>KYC Verification Workflow</CardTitle>
                <CardDescription>Review and approve identity verification requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <UserCheck className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">KYC Document Review</p>
                  <p className="text-[8px] mt-2">Process identity documents and approve/reject verification requests</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regulatory Reporting Tab */}
          <TabsContent value="regulatory-reporting" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Regulatory Reporting</CardTitle>
                <CardDescription>Generate compliance reports for regulatory bodies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Compliance Reports</p>
                  <p className="text-[8px] mt-2">Generate AML, transaction, and regulatory compliance reports</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit-trail" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>Complete history of admin actions and system changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <HistoryIcon className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">System Audit Log</p>
                  <p className="text-[8px] mt-2">Immutable record of all administrative actions and changes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin MFA Tab */}
          <TabsContent value="admin-mfa" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Admin Multi-Factor Authentication</CardTitle>
                <CardDescription>Configure 2FA/MFA for admin accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Lock className="w-5 h-5 mx-auto mb-4 opacity-50" />
                  <p className="text-[10px]">Admin Security Settings</p>
                  <p className="text-[8px] mt-2">Enable TOTP, SMS, or app-based 2FA for enhanced security</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            </div>
          </div>
        </Tabs>
      </div>

      {/* Bot Token Modal */}
      <Dialog open={botTokenModalOpen} onOpenChange={setBotTokenModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Update Telegram Bot Token</DialogTitle>
            <DialogDescription>
              Enter the new bot token from BotFather
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Token</Label>
              <p className="text-[8px] text-gray-400 font-mono">
                {botConfig?.hasToken ? botConfig.tokenPrefix : 'No token configured'}
              </p>
            </div>
            <div>
              <Label>New Bot Token</Label>
              <Input
                type="password"
                value={newBotToken}
                onChange={(e) => setNewBotToken(e.target.value)}
                placeholder="Enter bot token..."
                className="bg-gray-700 border-gray-600"
                data-testid="input-bot-token"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBotTokenModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-golden hover:bg-golden/80 text-black"
              onClick={() => {
                if (newBotToken) {
                  updateBotToken.mutate(newBotToken);
                }
              }}
              data-testid="button-save-bot-token"
            >
              Update Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Message Modal */}
      <Dialog open={chatMessageModalOpen} onOpenChange={setChatMessageModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Send Message to Community Chat</DialogTitle>
            <DialogDescription>
              Send an announcement or message to all users in the chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Enter your message..."
                className="bg-gray-700 border-gray-600 h-32"
                data-testid="textarea-chat-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChatMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-golden hover:bg-golden/80 text-black"
              onClick={() => {
                if (chatMessage) {
                  sendChatMessage.mutate({ message: chatMessage, type: messageType });
                }
              }}
              data-testid="button-send-chat-message"
            >
              <Send className="w-5 h-5 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Adjustment Modal */}
      <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Adjust User Credits</DialogTitle>
            <DialogDescription>
              Modify {selectedUser?.username}'s balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={creditAction === 'add' ? 'default' : 'outline'}
                onClick={() => setCreditAction('add')}
                className={creditAction === 'add' ? 'bg-green-600' : ''}
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Add Credits
              </Button>
              <Button
                variant={creditAction === 'remove' ? 'default' : 'outline'}
                onClick={() => setCreditAction('remove')}
                className={creditAction === 'remove' ? 'bg-red-600' : ''}
              >
                <MinusCircle className="w-5 h-5 mr-2" />
                Remove Credits
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={creditCurrency === 'GC' ? 'default' : 'outline'}
                onClick={() => setCreditCurrency('GC')}
                className={`flex-1 ${creditCurrency === 'GC' ? 'bg-golden text-black' : ''}`}
                data-testid="button-select-gc"
              >
                Gold Credits (GC)
              </Button>
              <Button
                variant={creditCurrency === 'SC' ? 'default' : 'outline'}
                onClick={() => setCreditCurrency('SC')}
                className={`flex-1 ${creditCurrency === 'SC' ? 'bg-purple-600' : ''}`}
                data-testid="button-select-sc"
              >
                Sweeps Cash (SC)
              </Button>
            </div>
            <div>
              <Label>Amount ({creditCurrency})</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="0.00"
                className="bg-gray-700 border-gray-600"
                data-testid="input-credit-amount"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Enter reason for adjustment..."
                className="bg-gray-700 border-gray-600"
                data-testid="textarea-credit-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-golden hover:bg-golden/80 text-black"
              onClick={() => {
                if (selectedUser && creditAmount) {
                  adjustCredits.mutate({
                    userId: selectedUser.id,
                    amount: creditAmount,
                    action: creditAction,
                    reason: creditReason,
                    currency: creditCurrency
                  });
                }
              }}
              disabled={adjustCredits.isPending}
              data-testid="button-confirm-credit"
            >
              {adjustCredits.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Data Modal */}
      <Dialog open={kycModalOpen} onOpenChange={setKYCModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC & User Data</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          {kycData && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">User ID</Label>
                  <p className="text-white font-mono text-[8px]">{kycData?.id || ''}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Telegram ID</Label>
                  <p className="text-white">{kycData?.telegramId || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Full Name</Label>
                  <p className="text-white">
                    {kycData?.firstName || ''} {kycData?.lastName || ''}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">KYC Status</Label>
                  <Badge className={kycData?.kycVerified ? "bg-green-600" : "bg-yellow-600"}>
                    {kycData?.kycVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-400">Risk Level</Label>
                  <p className="text-white">{kycData?.riskLevel || 'Low'}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Referral Code</Label>
                  <p className="text-white font-mono">{kycData?.referralCode || 'N/A'}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <h4 className="font-semibold text-white mb-2">Financial Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Current Balance</Label>
                    <p className="text-golden font-semibold">{formatCurrency(kycData?.balance || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Locked Balance</Label>
                    <p className="text-orange-500 font-semibold">{formatCurrency(kycData?.lockedBalance || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Total Deposits</Label>
                    <p className="text-green-500">{formatCurrency(kycData?.stats?.total_deposits || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Total Withdrawals</Label>
                    <p className="text-red-500">{formatCurrency(kycData?.stats?.total_withdrawals || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Total Wagered</Label>
                    <p className="text-white">{formatCurrency(kycData?.stats?.total_wagered || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Total Profit</Label>
                    <p className={(kycData?.stats?.total_profit ?? 0) > 0 ? "text-green-500" : "text-red-500"}>
                      {formatCurrency(kycData?.stats?.total_profit || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modal */}
      <Dialog open={bulkActionModalOpen} onOpenChange={setBulkActionModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Bulk User Action</DialogTitle>
            <DialogDescription>
              Perform action on {selectedUserIds.length} selected user{selectedUserIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bulkActionType === 'ban' && (
              <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400">
                  This will ban all selected users. They will not be able to access the platform.
                </p>
              </div>
            )}
            {bulkActionType === 'unban' && (
              <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400">
                  This will unban all selected users. They will regain access to the platform.
                </p>
              </div>
            )}
            {bulkActionType === 'balance' && (
              <>
                <div className="flex gap-2">
                  <Button
                    variant={bulkBalanceType === 'add' ? 'default' : 'outline'}
                    onClick={() => setBulkBalanceType('add')}
                    className={`flex-1 ${bulkBalanceType === 'add' ? 'bg-green-600' : ''}`}
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add
                  </Button>
                  <Button
                    variant={bulkBalanceType === 'subtract' ? 'default' : 'outline'}
                    onClick={() => setBulkBalanceType('subtract')}
                    className={`flex-1 ${bulkBalanceType === 'subtract' ? 'bg-red-600' : ''}`}
                  >
                    <MinusCircle className="w-5 h-5 mr-2" />
                    Subtract
                  </Button>
                </div>
                <div>
                  <Label>Amount (SC)</Label>
                  <Input
                    type="number"
                    value={bulkBalanceAmount}
                    onChange={(e) => setBulkBalanceAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-700 border-gray-600"
                    data-testid="input-bulk-amount"
                  />
                </div>
                <div>
                  <Label>Note (optional)</Label>
                  <Textarea
                    value={bulkBalanceNote}
                    onChange={(e) => setBulkBalanceNote(e.target.value)}
                    placeholder="Reason for balance adjustment..."
                    className="bg-gray-700 border-gray-600"
                    data-testid="textarea-bulk-note"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkActionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (bulkActionType === 'balance') {
                  if (!bulkBalanceAmount || parseFloat(bulkBalanceAmount) <= 0) {
                    toast({
                      title: "Invalid amount",
                      description: "Please enter a valid amount.",
                      variant: "destructive",
                    });
                    return;
                  }
                  bulkBalanceAdjust.mutate({
                    userIds: selectedUserIds,
                    amount: bulkBalanceAmount,
                    type: bulkBalanceType,
                    note: bulkBalanceNote,
                  });
                } else {
                  bulkStatusUpdate.mutate({
                    userIds: selectedUserIds,
                    action: bulkActionType,
                  });
                }
              }}
              disabled={bulkStatusUpdate.isPending || bulkBalanceAdjust.isPending}
              data-testid="button-confirm-bulk-action"
            >
              {bulkStatusUpdate.isPending || bulkBalanceAdjust.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gameplay History Modal */}
      <Dialog open={gameplayModalOpen} onOpenChange={setGameplayModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gameplay History</DialogTitle>
            <DialogDescription>
              Betting history for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead>Game</TableHead>
                  <TableHead>Bet Amount</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Verify</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameplayData?.gameplay?.map((bet) => (
                  <TableRow key={bet.id} className="border-gray-700">
                    <TableCell className="font-medium">{bet.game}</TableCell>
                    <TableCell>{formatCurrency(bet.amount)}</TableCell>
                    <TableCell className={bet.profit > 0 ? "text-green-500" : "text-red-500"}>
                      {formatCurrency(bet.profit)}
                    </TableCell>
                    <TableCell>{bet.multiplier ? `${bet.multiplier}x` : '-'}</TableCell>
                    <TableCell>{bet.createdAt ? format(new Date(bet.createdAt), "MMM dd HH:mm") : "N/A"}</TableCell>
                    <TableCell>
                      {bet.serverSeedHash && (
                        <Button size="sm" variant="outline" className="text-[8px]">
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {(gameplayData?.totalPages ?? 0) > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGameplayPage((p) => Math.max(1, p - 1))}
                disabled={gameplayPage === 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="px-4 py-2 text-white text-[8px]">
                Page {gameplayPage} of {gameplayData?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGameplayPage((p) => Math.min(gameplayData?.totalPages || 1, p + 1))}
                disabled={gameplayPage === (gameplayData?.totalPages || 1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer Link Modal */}
      <Dialog open={footerModalOpen} onOpenChange={setFooterModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>
              {selectedFooterLink ? 'Edit Footer Link' : 'Add Footer Link'}
            </DialogTitle>
            <DialogDescription>
              {selectedFooterLink ? 'Update the footer link details' : 'Create a new footer link'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section</Label>
              <Select value={footerSection} onValueChange={(value: any) => setFooterSection(value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={footerTitle}
                onChange={(e) => setFooterTitle(e.target.value)}
                placeholder="e.g., Terms of Service"
                className="bg-gray-700 border-gray-600"
                data-testid="input-footer-title"
              />
            </div>
            <div>
              <Label>URL (optional)</Label>
              <Input
                value={footerUrl}
                onChange={(e) => setFooterUrl(e.target.value)}
                placeholder="e.g., /terms or https://example.com"
                className="bg-gray-700 border-gray-600"
                data-testid="input-footer-url"
              />
            </div>
            <div>
              <Label>Order Index</Label>
              <Input
                type="number"
                value={footerOrderIndex}
                onChange={(e) => setFooterOrderIndex(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="bg-gray-700 border-gray-600"
                data-testid="input-footer-order"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={footerIsActive}
                onCheckedChange={setFooterIsActive}
                data-testid="switch-footer-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFooterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-golden hover:bg-golden/80 text-black"
              onClick={() => {
                if (!footerTitle.trim()) {
                  toast({
                    title: "Error",
                    description: "Title is required",
                    variant: "destructive",
                  });
                  return;
                }

                const linkData = {
                  title: footerTitle,
                  url: footerUrl || null,
                  section: footerSection,
                  orderIndex: footerOrderIndex,
                  isActive: footerIsActive,
                };

                if (selectedFooterLink) {
                  updateFooterLink.mutate({ id: selectedFooterLink.id, ...linkData });
                } else {
                  createFooterLink.mutate(linkData as any);
                }
              }}
              data-testid="button-save-footer-link"
            >
              {selectedFooterLink ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RTP Settings Modal */}
      <Dialog open={rtpModalOpen} onOpenChange={setRTPModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Configure {selectedGame?.game_name}</DialogTitle>
            <DialogDescription>
              Adjust game settings and RTP
            </DialogDescription>
          </DialogHeader>
          {selectedGame && (
            <div className="space-y-4">
              <div>
                <Label>RTP Percentage</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    defaultValue={[selectedGame.rtp]}
                    min={80}
                    max={99.99}
                    step={0.01}
                    onValueChange={(value) => {
                      setSelectedGame({ ...selectedGame, rtp: value[0] });
                    }}
                    className="flex-1"
                  />
                  <span className="text-golden font-semibold w-16">{selectedGame.rtp}%</span>
                </div>
              </div>
              <div>
                <Label>Minimum Bet (₹)</Label>
                <Input
                  type="number"
                  value={selectedGame.min_bet}
                  onChange={(e) => setSelectedGame({ ...selectedGame, min_bet: parseFloat(e.target.value) })}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div>
                <Label>Maximum Bet (₹)</Label>
                <Input
                  type="number"
                  value={selectedGame.max_bet}
                  onChange={(e) => setSelectedGame({ ...selectedGame, max_bet: parseFloat(e.target.value) })}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Game Enabled</Label>
                <Switch
                  checked={selectedGame.is_enabled}
                  onCheckedChange={(checked) => setSelectedGame({ ...selectedGame, is_enabled: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRTPModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-golden hover:bg-golden/80 text-black"
              onClick={() => {
                if (selectedGame) {
                  updateRTP.mutate({
                    gameName: selectedGame.game_name,
                    rtp: selectedGame.rtp,
                    minBet: selectedGame.min_bet,
                    maxBet: selectedGame.max_bet,
                    isEnabled: selectedGame.is_enabled
                  });
                }
              }}
              data-testid="button-save-rtp"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}