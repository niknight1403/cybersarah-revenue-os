import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, Cpu, Megaphone, FileText, DollarSign,
  TerminalSquare, TrendingUp, Rocket, Zap, Brain, Settings, Globe,
  Users, Bot, Search, Mail, Clapperboard, Recycle, Target, Menu, X,
  Key, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  // ─── Umsatz (Hauptziel) ─────────────────────────────────────────────────
  { name: "Dashboard", href: "/", icon: LayoutDashboard, gruppe: "umsatz" },
  { name: "Sofort-Start", href: "/sofort-start", icon: Zap, badge: "€€€", gruppe: "umsatz" },
  { name: "HARA", href: "/hara", icon: Bot, badge: "AUTO", gruppe: "umsatz" },
  { name: "Chancen", href: "/chancen", icon: TrendingUp, gruppe: "umsatz" },
  { name: "Expansion", href: "/expansion", icon: Rocket, gruppe: "umsatz" },
  { name: "Finance-Team", href: "/finance-team", icon: Users, badge: "KI", gruppe: "umsatz" },
  // ─── Content & Marketing ────────────────────────────────────────────────
  { name: "Content", href: "/content", icon: FileText, gruppe: "content" },
  { name: "SEO-Empire", href: "/seo-content", icon: Search, badge: "AUTO", gruppe: "content" },
  { name: "KI-Influencer", href: "/influencer", icon: Globe, badge: "AUTO", gruppe: "content" },
  { name: "Faceless-Video", href: "/faceless-video", icon: Clapperboard, gruppe: "content" },
  { name: "Content-Recycling", href: "/content-recycling", icon: Recycle, gruppe: "content" },
  { name: "E-Mail-Listen", href: "/email-listen", icon: Mail, gruppe: "content" },
  { name: "Kampagnen", href: "/kampagnen", icon: Megaphone, gruppe: "content" },
  // ─── System & Finanzen ──────────────────────────────────────────────────
  { name: "Trading AI", href: "/trading", icon: Brain, badge: "KI", gruppe: "system" },
  { name: "Finanzen", href: "/finanzen", icon: DollarSign, gruppe: "system" },
  { name: "Attribution", href: "/attribution", icon: Target, gruppe: "system" },
  { name: "Agenten", href: "/agenten", icon: Cpu, gruppe: "system" },
  { name: "API-Keys", href: "/einstellungen", icon: Key, badge: "NEU", gruppe: "system" },
  { name: "Protokolle", href: "/protokolle", icon: TerminalSquare, gruppe: "system" },
];

// Mobile: Alle Tabs in 2 Reihen — scrollbar
const mobileNavPrimary = [
  { name: "Start", href: "/", icon: LayoutDashboard },
  { name: "Sofort €", href: "/sofort-start", icon: Zap },
  { name: "HARA", href: "/hara", icon: Bot },
  { name: "Chancen", href: "/chancen", icon: TrendingUp },
  { name: "Finance", href: "/finance-team", icon: Users },
];
const mobileNavSecondary = [
  { name: "Content", href: "/content", icon: FileText },
  { name: "SEO", href: "/seo-content", icon: Search },
  { name: "Video", href: "/faceless-video", icon: Clapperboard },
  { name: "API-Keys", href: "/einstellungen", icon: Key },
  { name: "Menü", href: "#menu", icon: Menu },
];

const gruppenLabel: Record<string, string> = {
  umsatz: "💰 Umsatz",
  content: "📱 Content",
  system: "⚙️ System",
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOffen, setSidebarOffen] = useState(false);
  const [aktiveGruppe, setAktiveGruppe] = useState<string | null>(null);
  const [zweiteReihe, setZweiteReihe] = useState(false);

  const gruppen = ["umsatz", "content", "system"] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 lg:w-64 flex-shrink-0 border-r border-border bg-card flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-base tracking-tight">
            <Activity className="h-4 w-4" />
            <span>CyberSarah OS</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {gruppen.map((gruppe) => (
            <div key={gruppe}>
              <button
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setAktiveGruppe(aktiveGruppe === gruppe ? null : gruppe)}
              >
                {gruppenLabel[gruppe]}
                <ChevronRight className={cn("h-3 w-3 transition-transform", aktiveGruppe !== gruppe && "rotate-90")} />
              </button>
              {aktiveGruppe !== gruppe && navigation
                .filter(n => n.gruppe === gruppe)
                .map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.name} href={item.href}>
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.name}
                        {item.badge && (
                          <span className="ml-auto text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              CS
            </div>
            <div className="text-xs min-w-0">
              <p className="font-medium text-foreground truncate">CyberSarah OS</p>
              <p className="text-muted-foreground truncate flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                Autonomer Betrieb
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────── */}
      {sidebarOffen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOffen(false)} />
          <div className="relative w-72 bg-card border-r border-border flex flex-col h-full overflow-y-auto">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Activity className="h-4 w-4" />
                <span>CyberSarah OS</span>
              </div>
              <button onClick={() => setSidebarOffen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex-1 py-2 px-2 space-y-0.5">
              {gruppen.map((gruppe) => (
                <div key={gruppe} className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                    {gruppenLabel[gruppe]}
                  </p>
                  {navigation.filter(n => n.gruppe === gruppe).map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setSidebarOffen(false)}>
                        <div className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}>
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.name}
                          {item.badge && (
                            <span className="ml-auto text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Header */}
        <header className="h-12 md:h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger auf Mobile */}
            <button className="md:hidden" onClick={() => setSidebarOffen(true)}>
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 text-primary font-bold text-sm md:hidden">
              <Activity className="h-4 w-4" />
              <span>CyberSarah OS</span>
            </div>
            <h1 className="hidden md:block text-sm font-medium text-muted-foreground">
              {navigation.find((n) => n.href === location)?.name || "Übersicht"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[10px] md:text-xs font-mono text-muted-foreground">LIVE</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 pb-36 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation (2 Reihen) ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm">
        {/* Reihe 1 */}
        <div className="flex items-stretch h-14 border-b border-border/50">
          {mobileNavPrimary.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_4px_hsl(var(--primary))]")} />
                  <span className="text-[9px] font-medium leading-none">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
        {/* Reihe 2 */}
        <div className="flex items-stretch h-14">
          {mobileNavSecondary.map((item) => {
            const isActive = location === item.href;
            const isMenu = item.href === "#menu";
            return (
              <div key={item.name} className="flex-1">
                {isMenu ? (
                  <button
                    className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground"
                    onClick={() => setSidebarOffen(true)}
                  >
                    <Menu className="h-5 w-5" />
                    <span className="text-[9px] font-medium leading-none">Alle Tabs</span>
                  </button>
                ) : (
                  <Link href={item.href} className="flex-1">
                    <div className={cn(
                      "flex flex-col items-center justify-center h-full gap-1 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_4px_hsl(var(--primary))]")} />
                      <span className="text-[9px] font-medium leading-none">{item.name}</span>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
