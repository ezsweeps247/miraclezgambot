import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { TelegramThemeProvider } from "@/contexts/TelegramThemeContext";
import { GameModeProvider } from "@/contexts/GameModeContext";
import JurisdictionBanner from "@/components/jurisdiction-banner";
import DailyLoginModal from "@/components/DailyLoginModal";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Slots from "@/pages/slots";
import Mines from "@/pages/mines";
import Keno from "@/pages/keno";
import Plinko from "@/pages/plinko";
import Limbo from "@/pages/limbo";
import Blackjack from "@/pages/blackjack";
import Roulette from "@/pages/roulette";
import Hilo from "@/pages/hilo";
import MiraclezDice from "@/pages/miraclez-dice";
import Miracoaster from "@/pages/miracoaster";
import TowerDefense from "@/pages/tower-defense";
import Enigma from "@/pages/enigma";
import FundoraBlox from "@/pages/fundora-blox";
import FundoraBloxGame from "@/pages/fundora-blox-game";
import CoinFlip from "@/pages/coinflip";
import Wallet from "@/pages/wallet";
import Crypto from "@/pages/crypto";
import CashoutPage from "@/pages/cashout";
import Bonus from "@/pages/bonus";
import KycPage from "@/pages/kyc";
import ResponsibleGaming from "@/pages/responsible-gaming";
import SelfExclusion from "@/pages/self-exclusion";
import TermsPage from "@/pages/terms";
import PurchasePage from "@/pages/purchase";
import SweepstakesRulesPage from "@/pages/sweepstakes-rules";
import PrivacyPage from "@/pages/privacy";
import ProvablyFairPage from "@/pages/provably-fair";
import HelpPage from "@/pages/help";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import AffiliatePage from "@/pages/affiliate";
import DashboardPage from "@/pages/dashboard";
import VIPPage from "@/pages/vip";
import RecentGames from "@/pages/recent";
import FavoriteGames from "@/pages/favorites";
import LatestReleases from "@/pages/latest";
import ChallengesPage from "@/pages/challenges";
import OriginalsPage from "@/pages/originals";
import LiveDealerPage from "@/pages/live-dealer";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import Jurisdiction from "@/pages/jurisdiction";
import GeoBlockingDashboard from "@/pages/geo-blocking-dashboard";
import RedeemCode from "@/pages/RedeemCode";
import ComingSoon from "@/pages/coming-soon";
import UserProfile from "@/pages/user-profile";
import EditAvatar from "@/pages/edit-avatar";
import Settings from "@/pages/settings";
import Transactions from "@/pages/transactions";
import Vault from "@/pages/vault";
import Rakeback from "@/pages/rakeback";
import Layout from "@/components/layout";
import WebLogin from "@/pages/web-login";
import WebRegister from "@/pages/web-register";
import Auth from "@/pages/auth";
import TelegramError from "@/pages/TelegramError";

function Router() {
  return (
    <Switch>
      {/* Web auth routes - no layout wrapper */}
      <Route path="/auth" component={Auth} />
      <Route path="/login" component={WebLogin} />
      <Route path="/register" component={WebRegister} />
      
      {/* Telegram error page - no layout wrapper */}
      <Route path="/telegram-error" component={TelegramError} />
      
      {/* Fundora Blox fullscreen game - dark mobile-optimized version with back button */}
      <Route path="/fundora-blox-game" component={FundoraBloxGame} />
      
      {/* Admin routes - no layout wrapper, must be checked first */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      
      {/* Main app routes with layout - use individual routes instead of nest to avoid conflicts */}
      <Route path="/" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Home />
        </Layout>
      )} />
      <Route path="/slots" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Slots />
        </Layout>
      )} />
      <Route path="/mines" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Mines />
        </Layout>
      )} />
      <Route path="/keno" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Keno />
        </Layout>
      )} />
      <Route path="/plinko" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Plinko />
        </Layout>
      )} />
      <Route path="/limbo" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Limbo />
        </Layout>
      )} />
      <Route path="/blackjack" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Blackjack />
        </Layout>
      )} />
      <Route path="/baccarat" component={() => (
        <Layout>
          <JurisdictionBanner />
          <ComingSoon />
        </Layout>
      )} />
      <Route path="/roulette" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Roulette />
        </Layout>
      )} />
      <Route path="/hilo" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Hilo />
        </Layout>
      )} />
      <Route path="/coinflip" component={() => (
        <CoinFlip />
      )} />
      <Route path="/miraclez-dice" component={() => (
        <Layout>
          <JurisdictionBanner />
          <MiraclezDice />
        </Layout>
      )} />
      <Route path="/dice" component={() => (
        <Layout>
          <JurisdictionBanner />
          <MiraclezDice />
        </Layout>
      )} />
      <Route path="/miracoaster" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Miracoaster />
        </Layout>
      )} />
      <Route path="/crash" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Miracoaster />
        </Layout>
      )} />
      <Route path="/tower-defense" component={() => (
        <Layout>
          <JurisdictionBanner />
          <TowerDefense />
        </Layout>
      )} />
      <Route path="/enigma" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Enigma />
        </Layout>
      )} />
      <Route path="/fundora-blox" component={() => (
        <FundoraBlox />
      )} />
      <Route path="/wallet" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Wallet />
        </Layout>
      )} />
      <Route path="/crypto" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Crypto />
        </Layout>
      )} />
      <Route path="/cashout" component={() => (
        <Layout>
          <JurisdictionBanner />
          <CashoutPage />
        </Layout>
      )} />
      <Route path="/bonus" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Bonus />
        </Layout>
      )} />
      <Route path="/kyc" component={() => (
        <Layout>
          <JurisdictionBanner />
          <KycPage />
        </Layout>
      )} />
      <Route path="/responsible-gaming" component={() => (
        <Layout>
          <JurisdictionBanner />
          <ResponsibleGaming />
        </Layout>
      )} />
      <Route path="/self-exclusion" component={() => (
        <Layout>
          <JurisdictionBanner />
          <SelfExclusion />
        </Layout>
      )} />
      <Route path="/terms" component={() => (
        <Layout>
          <JurisdictionBanner />
          <TermsPage />
        </Layout>
      )} />
      <Route path="/purchase" component={() => (
        <Layout>
          <JurisdictionBanner />
          <PurchasePage />
        </Layout>
      )} />
      <Route path="/redeem-code" component={() => (
        <RedeemCode />
      )} />
      <Route path="/sweepstakes-rules" component={() => (
        <Layout>
          <JurisdictionBanner />
          <SweepstakesRulesPage />
        </Layout>
      )} />
      <Route path="/privacy" component={() => (
        <Layout>
          <JurisdictionBanner />
          <PrivacyPage />
        </Layout>
      )} />
      <Route path="/help" component={() => (
        <Layout>
          <JurisdictionBanner />
          <HelpPage />
        </Layout>
      )} />
      <Route path="/provably-fair" component={() => (
        <Layout>
          <JurisdictionBanner />
          <ProvablyFairPage />
        </Layout>
      )} />
      <Route path="/analytics" component={() => (
        <Layout>
          <JurisdictionBanner />
          <AnalyticsDashboard />
        </Layout>
      )} />
      <Route path="/affiliate" component={() => (
        <Layout>
          <JurisdictionBanner />
          <AffiliatePage />
        </Layout>
      )} />
      <Route path="/vip" component={() => (
        <Layout>
          <JurisdictionBanner />
          <VIPPage />
        </Layout>
      )} />
      <Route path="/recent" component={() => (
        <Layout>
          <JurisdictionBanner />
          <RecentGames />
        </Layout>
      )} />
      <Route path="/favorites" component={() => (
        <Layout>
          <JurisdictionBanner />
          <FavoriteGames />
        </Layout>
      )} />
      <Route path="/latest" component={() => (
        <Layout>
          <JurisdictionBanner />
          <LatestReleases />
        </Layout>
      )} />
      <Route path="/challenges" component={() => (
        <Layout>
          <JurisdictionBanner />
          <ChallengesPage />
        </Layout>
      )} />
      <Route path="/originals" component={() => (
        <Layout>
          <JurisdictionBanner />
          <OriginalsPage />
        </Layout>
      )} />
      <Route path="/games" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Home />
        </Layout>
      )} />
      <Route path="/live-dealer" component={() => (
        <Layout>
          <JurisdictionBanner />
          <LiveDealerPage />
        </Layout>
      )} />
      <Route path="/dashboard" component={() => (
        <Layout>
          <JurisdictionBanner />
          <DashboardPage />
        </Layout>
      )} />
      <Route path="/profile/:userId?" component={({ params }) => (
        <UserProfile params={params} />
      )} />
      <Route path="/user-profile" component={() => (
        <Layout>
          <JurisdictionBanner />
          <UserProfile />
        </Layout>
      )} />
      <Route path="/edit-avatar" component={() => (
        <Layout>
          <JurisdictionBanner />
          <EditAvatar />
        </Layout>
      )} />
      <Route path="/jurisdiction" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Jurisdiction />
        </Layout>
      )} />
      <Route path="/geo-blocking" component={() => (
        <Layout>
          <JurisdictionBanner />
          <GeoBlockingDashboard />
        </Layout>
      )} />
      <Route path="/coming-soon" component={() => (
        <Layout>
          <JurisdictionBanner />
          <ComingSoon />
        </Layout>
      )} />
      <Route path="/blog" component={() => (
        <Layout>
          <JurisdictionBanner />
          <ComingSoon />
        </Layout>
      )} />
      <Route path="/settings" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Settings />
        </Layout>
      )} />
      <Route path="/transactions" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Transactions />
        </Layout>
      )} />
      <Route path="/vault" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Vault />
        </Layout>
      )} />
      <Route path="/rakeback" component={() => (
        <Layout>
          <JurisdictionBanner />
          <Rakeback />
        </Layout>
      )} />
      {/* 404 fallback with layout */}
      <Route component={() => (
        <Layout>
          <JurisdictionBanner />
          <NotFound />
        </Layout>
      )} />
    </Switch>
  );
}

function AppWithDailyLogin() {
  const { shouldShowDailyLogin, setShouldShowDailyLogin } = useAuth();

  return (
    <>
      <Router />
      <DailyLoginModal 
        isOpen={shouldShowDailyLogin} 
        onClose={() => setShouldShowDailyLogin(false)} 
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TelegramThemeProvider>
        <AuthProvider>
          <GameModeProvider>
            <WebSocketProvider>
              <TooltipProvider>
                <Toaster />
                <AppWithDailyLogin />
              </TooltipProvider>
            </WebSocketProvider>
          </GameModeProvider>
        </AuthProvider>
      </TelegramThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
