import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Crown, Swords, BookOpen, Globe, Users, Zap, Building2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-card/50 to-background">
        <div className="container py-12 sm:py-20 lg:py-28">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-accent/20 border border-accent/50">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-accent">
              Civilization Conquest
            </h1>
            <p className="text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto">
              Bauen Sie ein Imperium auf, erforschen Sie neue Technologien, und führen Sie Ihre Zivilisation zum Sieg. Ein episches rundenbasiertes Strategiespiel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {isAuthenticated ? (
                <>
                  <Button
                    className="civ-button-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                    onClick={() => navigate("/game")}
                  >
                    Zum Spiel
                  </Button>
                  <Button className="civ-button-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    Neue Partie
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="civ-button-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                    onClick={() => window.location.href = getLoginUrl()}
                  >
                    Anmelden & Spielen
                  </Button>
                  <Button className="civ-button-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    Mehr erfahren
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-12 sm:py-16 lg:py-20">
        <h2 className="civ-title text-center mb-12">Spielfeatures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Building2,
              title: "Städteverwaltung",
              description: "Bauen Sie Städte, verwalten Sie die Bevölkerung und optimieren Sie die Produktion.",
            },
            {
              icon: Swords,
              title: "Militärische Strategie",
              description: "Rekrutieren Sie Einheiten, führen Sie Kriege und erobern Sie neue Territorien.",
            },
            {
              icon: BookOpen,
              title: "Technologiebaum",
              description: "Erforschen Sie Technologien und schalten Sie neue Gebäude und Einheiten frei.",
            },
            {
              icon: Globe,
              title: "Diplomatie",
              description: "Verhandeln Sie mit anderen Zivilisationen, bilden Sie Bündnisse oder führen Sie Kriege.",
            },
            {
              icon: Users,
              title: "Multiplayer",
              description: "Spielen Sie gegen andere Spieler oder KI-Gegner in epischen Partien.",
            },
            {
              icon: Zap,
              title: "Rundenbasiert",
              description: "Strategisches Gameplay mit unbegrenzter Zeit zum Planen Ihrer Züge.",
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="civ-card">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/20 border border-accent/50 flex-shrink-0">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-foreground/70">{feature.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-card/50 to-background border-t border-accent/20 py-12 sm:py-16">
        <div className="container text-center space-y-6">
          <h2 className="civ-title">Bereit für die Eroberung?</h2>
          <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
            Starten Sie Ihre Zivilisation heute und werden Sie der größte Herrscher aller Zeiten.
          </p>
          {!isAuthenticated && (
            <Button
              className="civ-button-primary text-lg px-8 py-4"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Jetzt Spielen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


