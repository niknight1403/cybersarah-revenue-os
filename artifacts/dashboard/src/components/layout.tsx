import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, Cpu, Megaphone, FileText, DollarSign,
  TerminalSquare, TrendingUp, Rocket, Zap, Brain, Globe,
  Users, Bot, Search, Mail, Clapperboard, Recycle, Target, Menu, X,
  Key, MessageCircle, Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, gruppe: "umsatz" },
  { name: "Sofort-Start", href: "/sofort-start", icon: Zap, badge: "€€€", gruppe: "umsatz" },
  { name: "HARA", href: "/hara", icon: Bot, badge: "AUTO", gruppe: "umsatz" },
  { name: "Chancen", href: "/chancen", icon: TrendingUp, gruppe: "umsatz" },
  { name: "Expansion", href: "/expansion", icon: Rocket, gruppe: "umsatz" },
  { name: "Finance-Team", href: "/finance-team", icon: Users, badge: "KI", gruppe: "umsatz" },
  { name: "Content", href: "/content", icon: FileText, gruppe: "content" },
  { name: "SEO-Empire", href: "/seo-content", icon: Search, badge: "AUTO", gruppe: "content" },
  { name: "KI-Influencer", href: "/influencer-hub", icon: Globe, badge: "AUTO", gruppe: "content" },
  { name: "Faceless-Video", href: "/faceless-video", icon: Clapperboard, gruppe: "content" },
  { name: "Content-Recycling", href: "/content-recycling", icon: Recycle, gruppe: "content" },
  { name: "E-Mail-Listen", href: "/email-listen", icon: Mail, gruppe: "content" },
  { name: "Kampagnen", href: "/kampagnen", icon: Megaphone, gruppe: "content" },
  { name: "Trading AI", href: "/trading", icon: Brain, badge: "KI", gruppe: "system" },
  { name: "Finanzen", href: "/finanzen", icon: DollarSign, gruppe: "system" },
  { name: "Attribution", href: "/attribution", icon: Target, gruppe: "system" },
  { name: "Agenten", href: "/agenten", icon: Cpu, gruppe: "system" },
  { name: "Newsletter", href: "/newsletter", icon: Newspaper, badge: "NEU", gruppe: "umsatz" },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageCircle, badge: "NEU", gruppe: "umsatz" },
  { name: "Master-Agent", href: "/master-agent", icon: Brain, badge: "NEU", gruppe: "system" },
  { name: "API-Keys", href: "/einstellungen", icon: Key, badge: "NEU", gruppe: "system" },
  { name: "Protokolle", href: "/protokolle", icon: TerminalSquare, gruppe: "system" },
];

const mobileNavPrimary = [
  { name: "Start", href: "/", icon: LayoutDashboard },
  { name: "Sofort €", href: "/sofort-start", icon: Zap },
  { name: "HARA", href: "/hara", icon: Bot },
  { name: "Mehr", href: "#more", icon: Menu },
];

const mobileNavSecondary = [
  { name: "Content", href: "/content", icon: FileText },
  { name: "SEO", href: "/seo-content", icon: Search },
  { name: "Video", href: "/faceless-video", icon: Clapperboard },
  { name: "Chancen", href: "/chancen", icon: TrendingUp },
  { name: "Finance", href: "/finance-team", icon: Users },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
  { name: "Alle", href: "#all", icon: Menu },
];

const gruppenLabel: Record<string, string> = {
  umsatz: "💰 Umsatz",
  content: "📱 Content",
  system: "⚙️ System",
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOffen, setSidebarOffen] = useState(false);
  const [mehrMenue, setMehrMenue] = useState(false);

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
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-2">
                {gruppenLabel[gruppe]}
              </div>
              {navigation.filter(n => n.gruppe === gruppe).map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
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
      </aside>

      {/* ── Mobile Sidebar (Overlay) ─────────────────────────────────────── */}
      {sidebarOffen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOffen(false)} />
          <div className="relative w-72 bg-card border-r border-border overflow-y-auto animate-slide-right">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Activity className="h-4 w-4" />
                <span>Navigation</span>
              </div>
              <button onClick={() => setSidebarOffen(false)} className="p-2">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <nav className="py-2 px-2">
              {gruppen.map((gruppe) => (
                <div key={gruppe}>
                  <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-2">
                    {gruppenLabel[gruppe]}
                  </div>
                  {navigation.filter(n => n.gruppe === gruppe).map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setSidebarOffen(false)}>
                        <div className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}>
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="font-medium">{item.name}</span>
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
        <header className="h-11 md:h-14 flex items-center justify-between px-3 md:px-6 border-b border-border bg-card/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-1.5 -ml-1" onClick={() => setSidebarOffen(true)}>
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs md:hidden">
              <Activity className="h-3.5 w-3.5" />
              <span>CyberSarah</span>
            </div>
            <h1 className="hidden md:block text-sm font-medium text-muted-foreground">
              {navigation.find((n) => n.href === location)?.name || "Übersicht"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] md:text-xs font-mono text-green-500">LIVE</span>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg mobile-nav">
        {/* Reihe 1: Hauptnavigation */}
        <div className="flex items-stretch h-[52px] border-b border-border/30">
          {mobileNavPrimary.map((item) => {
            const isActive = location === item.href;
            const isMore = item.href === "#more";
            return (
              <div key={item.name} className="flex-1">
                {isMore ? (
                  <button
                    className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-muted-foreground active:text-primary transition-colors"
                    onClick={() => setSidebarOffen(true)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium leading-none">{item.name}</span>
                  </button>
                ) : (
                  <Link href={item.href}>
                    <div className={cn(
                      "flex flex-col items-center justify-center h-full gap-0.5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground active:text-primary"
                    )}>
                      <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
                      <span className={cn("text-[9px] font-medium leading-none", isActive && "font-bold")}>{item.name}</span>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        {/* Reihe 2: Schnellzugriff */}
        <div className="flex items-stretch h-[48px]">
          {mobileNavSecondary.map((item) => {
            const isActive = location === item.href;
            const isAll = item.href === "#all";
            return (
              <div key={item.name} className="flex-1">
                {isAll ? (
                  <button
                    className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-muted-foreground active:text-primary transition-colors"
                    onClick={() => setSidebarOffen(true)}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    <span className="text-[8px] font-medium leading-none">{item.name}</span>
                  </button>
                ) : (
                  <Link href={item.href}>
                    <div className={cn(
                      "flex flex-col items-center justify-center h-full gap-0.5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground active:text-primary"
                    )}>
                      <item.icon className={cn("h-4.5 w-4.5", isActive && "drop-shadow-[0_0_4px_hsl(var(--primary))]")} />
                      <span className="text-[8px] font-medium leading-none">{item.name}</span>
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
