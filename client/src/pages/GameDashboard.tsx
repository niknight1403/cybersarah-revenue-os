import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Coins, 
  Leaf, 
  Zap, 
  BookOpen, 
  Heart, 
  Users,
  Map,
  Building2,
  Swords,
  Globe
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface Civilization {
  id: number;
  name: string;
  leader: string;
  color: string;
  gold: number;
  food: number;
  production: number;
  science: number;
  culture: number;
  happiness: number;
}

interface GameState {
  currentRound: number;
  maxRounds: number;
  status: "active" | "paused" | "finished";
}

export default function GameDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [gameState] = useState<GameState>({
    currentRound: 1,
    maxRounds: 500,
    status: "active",
  });

  const [civilization] = useState<Civilization>({
    id: 1,
    name: "Roman Empire",
    leader: "Julius Caesar",
    color: "#D4AF37",
    gold: 250,
    food: 180,
    production: 120,
    science: 95,
    culture: 75,
    happiness: 45,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="civ-card max-w-md text-center">
          <h1 className="civ-title">Civilization Conquest</h1>
          <p className="text-foreground mb-6">
            Willkommen zu einem epischen Strategiespiel. Melden Sie sich an, um zu beginnen.
          </p>
          <Button className="civ-button-primary w-full">Anmelden</Button>
        </Card>
      </div>
    );
  }

  const roundProgress = (gameState.currentRound / gameState.maxRounds) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header mit Ressourcen */}
      <div className="civ-header sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col gap-4">
            {/* Zivilisations-Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-accent">
                  {civilization.name}
                </h1>
                <p className="text-foreground/80 text-sm sm:text-base">
                  Angeführt von {civilization.leader}
                </p>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-sm">Runde</span>
                <span className="text-accent font-bold text-lg">
                  {gameState.currentRound}/{gameState.maxRounds}
                </span>
              </div>
            </div>

            {/* Runden-Fortschrittsbalken */}
            <div className="w-full">
              <div className="civ-progress">
                <div
                  className="civ-progress-fill"
                  style={{ width: `${roundProgress}%` }}
                />
              </div>
            </div>

            {/* Ressourcen-Leiste */}
            <div className="civ-resource-bar">
              <div className="civ-resource-item">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                <span>Gold:</span>
                <span className="civ-resource-value">{civilization.gold}</span>
              </div>
              <div className="civ-resource-item">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span>Nahrung:</span>
                <span className="civ-resource-value">{civilization.food}</span>
              </div>
              <div className="civ-resource-item">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                <span>Produktion:</span>
                <span className="civ-resource-value">{civilization.production}</span>
              </div>
              <div className="civ-resource-item">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                <span>Wissenschaft:</span>
                <span className="civ-resource-value">{civilization.science}</span>
              </div>
              <div className="civ-resource-item">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                <span>Kultur:</span>
                <span className="civ-resource-value">{civilization.culture}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hauptinhalt */}
      <div className="container py-6 sm:py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 mb-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Map className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Übersicht</span>
              <span className="sm:hidden">Über</span>
            </TabsTrigger>
          <TabsTrigger value="cities" className="text-xs sm:text-sm" onClick={() => navigate("/cities")}>
            <Building2 className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Städte</span>
            <span className="sm:hidden">St.</span>
          </TabsTrigger>
          <TabsTrigger value="units" className="text-xs sm:text-sm" onClick={() => navigate("/units")}>
            <Swords className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Einheiten</span>
            <span className="sm:hidden">Ein.</span>
          </TabsTrigger>
            <TabsTrigger value="tech" className="text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Tech</span>
              <span className="sm:hidden">T</span>
            </TabsTrigger>
            <TabsTrigger value="diplomacy" className="text-xs sm:text-sm">
              <Globe className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Diplomatie</span>
              <span className="sm:hidden">Dip.</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Statistiken</span>
              <span className="sm:hidden">Stat.</span>
            </TabsTrigger>
          </TabsList>

          {/* Übersicht Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="civ-card">
                <h3 className="civ-subtitle">Zivilisations-Status</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>Glück:</span>
                    <span className="text-accent font-bold">
                      {civilization.happiness > 0 ? "+" : ""}{civilization.happiness}
                    </span>
                  </p>
                  <div className="civ-progress">
                    <div
                      className="civ-progress-fill"
                      style={{
                        width: `${Math.min(100, civilization.happiness + 50)}%`,
                      }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="civ-card">
                <h3 className="civ-subtitle">Nächste Ziele</h3>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li>• Neue Stadt gründen</li>
                  <li>• Schrift erforschen</li>
                  <li>• Militär aufbauen</li>
                </ul>
              </Card>

              <Card className="civ-card">
                <h3 className="civ-subtitle">Schnellzugriff</h3>
                <div className="space-y-2">
                  <Button className="civ-button-secondary w-full text-xs sm:text-sm">
                    Nächste Runde
                  </Button>
                  <Button className="civ-button-secondary w-full text-xs sm:text-sm">
                    Spielstand speichern
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Platzhalter für andere Tabs */}
          <TabsContent value="cities">
            <Card className="civ-card text-center py-8">
              <p className="text-foreground/60">Städte-Verwaltung kommt bald...</p>
            </Card>
          </TabsContent>

          <TabsContent value="units">
            <Card className="civ-card text-center py-8">
              <p className="text-foreground/60">Einheiten-Verwaltung kommt bald...</p>
            </Card>
          </TabsContent>

          <TabsContent value="tech">
            <Card className="civ-card text-center py-8">
              <p className="text-foreground/60">Technologiebaum kommt bald...</p>
            </Card>
          </TabsContent>

          <TabsContent value="diplomacy">
            <Card className="civ-card text-center py-8">
              <p className="text-foreground/60">Diplomatiesystem kommt bald...</p>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card className="civ-card text-center py-8">
              <p className="text-foreground/60">Statistiken kommt bald...</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
