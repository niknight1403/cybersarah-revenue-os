import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import RevenueAgents from "@/pages/RevenueAgents";
import RevenueApprovals from "@/pages/RevenueApprovals";
import AutonomyTasks from "@/pages/AutonomyTasks";
import HaraCenter from "@/pages/HaraCenter";
import InfluenceCenter from "@/pages/InfluenceCenter";
import ProductMarketing from "@/pages/ProductMarketing";
import ComplianceCenter from "@/pages/ComplianceCenter";
import RevenueCheckout from "@/pages/RevenueCheckout";
import RevenueHome from "@/pages/RevenueHome";
import RevenueSystem from "@/pages/RevenueSystem";
import RevenueGrowth from "@/pages/RevenueGrowth";
import PlayStorePolicy from "@/pages/PlayStorePolicy";
import HaraOnboarding from "@/pages/HaraOnboarding";
import LoopIntelligence from "@/pages/LoopIntelligence";
import TradingPanel from "@/pages/TradingPanel";
import GlobalRevenueLoops from "@/components/GlobalRevenueLoops";
import Paywall from "@/components/Paywall";
import AccountSettings from "@/pages/AccountSettings";
import RevenueWorkspace from "@/pages/RevenueWorkspace";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) { return <DashboardLayout>{children}</DashboardLayout>; }
function WorkspaceRoute() { return <ProtectedRoute><RevenueWorkspace /></ProtectedRoute>; }
function AgentsRoute() { return <ProtectedRoute><RevenueAgents /></ProtectedRoute>; }
function ApprovalsRoute() { return <ProtectedRoute><RevenueApprovals /></ProtectedRoute>; }
function SystemRoute() { return <ProtectedRoute><RevenueSystem /></ProtectedRoute>; }
function GrowthRoute() { return <ProtectedRoute><RevenueGrowth /></ProtectedRoute>; }
function HaraRoute() { return <ProtectedRoute><HaraCenter /></ProtectedRoute>; }
function HaraOnboardingRoute() { return <ProtectedRoute><HaraOnboarding /></ProtectedRoute>; }
function LoopIntelligenceRoute() { return <ProtectedRoute><LoopIntelligence /></ProtectedRoute>; }
function TradingRoute() { return <ProtectedRoute><TradingPanel /></ProtectedRoute>; }
function GlobalRevenueLoopsRoute() { return <ProtectedRoute><GlobalRevenueLoops /></ProtectedRoute>; }
function PaywallRoute() { return <ProtectedRoute><Paywall /></ProtectedRoute>; }
function AccountRoute() { return <ProtectedRoute><AccountSettings /></ProtectedRoute>; }
function InfluenceRoute() { return <ProtectedRoute><InfluenceCenter /></ProtectedRoute>; }
function TasksRoute() { return <ProtectedRoute><AutonomyTasks /></ProtectedRoute>; }
function ProductMarketingRoute() { return <ProtectedRoute><ProductMarketing /></ProtectedRoute>; }
function ComplianceRoute() { return <ProtectedRoute><ComplianceCenter /></ProtectedRoute>; }

function Router() { return <Switch><Route path="/" component={RevenueHome} /><Route path="/privacy" component={() => <PlayStorePolicy kind="privacy" />} /><Route path="/terms" component={() => <PlayStorePolicy kind="terms" />} /><Route path="/account-deletion" component={() => <PlayStorePolicy kind="deletion" />} /><Route path="/checkout" component={RevenueCheckout} /><Route path="/hara" component={HaraRoute} /><Route path="/onboarding" component={HaraOnboardingRoute} /><Route path="/loop-intelligence" component={LoopIntelligenceRoute} /><Route path="/trading" component={TradingRoute} /><Route path="/revenue-loops" component={GlobalRevenueLoopsRoute} /><Route path="/paywall" component={PaywallRoute} /><Route path="/account" component={AccountRoute} /><Route path="/influence" component={InfluenceRoute} /><Route path="/tasks" component={TasksRoute} /><Route path="/marketing" component={ProductMarketingRoute} /><Route path="/compliance" component={ComplianceRoute} /><Route path="/app" component={WorkspaceRoute} /><Route path="/agents" component={AgentsRoute} /><Route path="/approvals" component={ApprovalsRoute} /><Route path="/growth" component={GrowthRoute} /><Route path="/system" component={SystemRoute} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
