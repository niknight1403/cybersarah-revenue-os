import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import RevenueAgents from "@/pages/RevenueAgents";
import RevenueApprovals from "@/pages/RevenueApprovals";
import RevenueHome from "@/pages/RevenueHome";
import RevenueSystem from "@/pages/RevenueSystem";
import RevenueGrowth from "@/pages/RevenueGrowth";
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

function Router() { return <Switch><Route path="/" component={RevenueHome} /><Route path="/app" component={WorkspaceRoute} /><Route path="/agents" component={AgentsRoute} /><Route path="/approvals" component={ApprovalsRoute} /><Route path="/growth" component={GrowthRoute} /><Route path="/system" component={SystemRoute} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
