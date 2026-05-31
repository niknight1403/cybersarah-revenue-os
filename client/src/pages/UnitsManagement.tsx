import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Heart, Zap, Users, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface Unit {
  id: number;
  type: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  experience: number;
  status: "active" | "fortified" | "healing";
}

const UNIT_TYPES = {
  warrior: { name: "Krieger", attack: 8, defense: 5, health: 25, cost: 50 },
  scout: { name: "Späher", attack: 4, defense: 2, health: 15, cost: 30 },
  archer: { name: "Bogenschütze", attack: 6, defense: 3, health: 20, cost: 40 },
  cavalry: { name: "Kavallerie", attack: 10, defense: 6, health: 30, cost: 80 },
  catapult: { name: "Katapult", attack: 12, defense: 2, health: 20, cost: 100 },
};

export default function UnitsManagement() {
  const [units, setUnits] = useState<Unit[]>([
    {
      id: 1,
      type: "warrior",
      x: 5,
      y: 3,
      health: 25,
      maxHealth: 25,
      experience: 45,
      status: "active",
    },
    {
      id: 2,
      type: "scout",
      x: 7,
      y: 2,
      health: 12,
      maxHealth: 15,
      experience: 20,
      status: "active",
    },
    {
      id: 3,
      type: "archer",
      x: 5,
      y: 4,
      health: 20,
      maxHealth: 20,
      experience: 35,
      status: "fortified",
    },
  ]);

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(units[0]?.id || null);

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  const getUnitInfo = (type: string) => {
    return UNIT_TYPES[type as keyof typeof UNIT_TYPES] || { name: type, attack: 0, defense: 0, health: 0, cost: 0 };
  };

  const handleDeleteUnit = (id: number) => {
    setUnits(units.filter(u => u.id !== id));
    if (selectedUnitId === id) {
      setSelectedUnitId(units[0]?.id || null);
    }
  };

  const handleHealUnit = (id: number) => {
    setUnits(units.map(u => (u.id === id ? { ...u, health: u.maxHealth, status: "healing" } : u)));
  };

  const healthPercentage = selectedUnit ? (selectedUnit.health / selectedUnit.maxHealth) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="civ-title">Einheitenverwaltung</h1>
          <p className="text-foreground/70">Verwalten Sie Ihre Militäreinheiten und deren Positionen</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Einheiten-Liste */}
          <div className="lg:col-span-1">
            <Card className="civ-card">
              <h2 className="civ-subtitle">Ihre Einheiten ({units.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {units.map(unit => {
                  const info = getUnitInfo(unit.type);
                  const isSelected = selectedUnitId === unit.id;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-accent/20 border-accent"
                          : "bg-card/50 border-accent/20 hover:border-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{info.name}</p>
                          <p className="text-xs text-foreground/60">
                            Position: ({unit.x}, {unit.y})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-accent">
                            {unit.health}/{unit.maxHealth}
                          </p>
                          <p className="text-xs text-foreground/60">
                            {unit.status === "active" && "Aktiv"}
                            {unit.status === "fortified" && "Befestigt"}
                            {unit.status === "healing" && "Heilend"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button className="civ-button-secondary w-full mt-4 text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Neue Einheit
              </Button>
            </Card>
          </div>

          {/* Einheiten-Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedUnit ? (
              <>
                {/* Basis-Info */}
                <Card className="civ-card">
                  <h2 className="civ-subtitle">
                    {getUnitInfo(selectedUnit.type).name} (ID: {selectedUnit.id})
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-foreground/60">Typ</p>
                      <p className="font-semibold text-foreground">{selectedUnit.type}</p>
                    </div>
                    <div>
                      <p className="text-foreground/60">Status</p>
                      <p className="font-semibold text-accent">
                        {selectedUnit.status === "active" && "Aktiv"}
                        {selectedUnit.status === "fortified" && "Befestigt"}
                        {selectedUnit.status === "healing" && "Heilend"}
                      </p>
                    </div>
                    <div>
                      <p className="text-foreground/60">Position</p>
                      <p className="font-semibold text-foreground">
                        ({selectedUnit.x}, {selectedUnit.y})
                      </p>
                    </div>
                    <div>
                      <p className="text-foreground/60">Erfahrung</p>
                      <p className="font-semibold text-foreground">{selectedUnit.experience}</p>
                    </div>
                  </div>
                </Card>

                {/* Gesundheit */}
                <Card className="civ-card">
                  <h3 className="civ-subtitle">Gesundheit</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-foreground/70">Gesundheit</span>
                        <span className="text-sm font-bold text-accent">
                          {selectedUnit.health}/{selectedUnit.maxHealth}
                        </span>
                      </div>
                      <div className="civ-progress">
                        <div
                          className="civ-progress-fill"
                          style={{ width: `${healthPercentage}%` }}
                        />
                      </div>
                    </div>
                    {healthPercentage < 100 && (
                      <Button
                        className="civ-button-secondary w-full text-sm"
                        onClick={() => handleHealUnit(selectedUnit.id)}
                      >
                        Heilen
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Statistiken */}
                <Card className="civ-card">
                  <h3 className="civ-subtitle">Statistiken</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/50 mb-2">
                        <Swords className="w-5 h-5 text-red-500 mx-auto" />
                      </div>
                      <p className="text-xs text-foreground/60">Angriff</p>
                      <p className="font-bold text-foreground">
                        {getUnitInfo(selectedUnit.type).attack}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/50 mb-2">
                        <Heart className="w-5 h-5 text-blue-500 mx-auto" />
                      </div>
                      <p className="text-xs text-foreground/60">Verteidigung</p>
                      <p className="font-bold text-foreground">
                        {getUnitInfo(selectedUnit.type).defense}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/50 mb-2">
                        <Zap className="w-5 h-5 text-green-500 mx-auto" />
                      </div>
                      <p className="text-xs text-foreground/60">Bewegung</p>
                      <p className="font-bold text-foreground">3</p>
                    </div>
                  </div>
                </Card>

                {/* Aktionen */}
                <div className="grid grid-cols-2 gap-3">
                  <Button className="civ-button-secondary text-sm">Bewegen</Button>
                  <Button className="civ-button-secondary text-sm">Befestigen</Button>
                  <Button
                    className="civ-button-secondary text-sm col-span-2"
                    onClick={() => handleDeleteUnit(selectedUnit.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Auflösen
                  </Button>
                </div>
              </>
            ) : (
              <Card className="civ-card text-center py-12">
                <p className="text-foreground/60">Wählen Sie eine Einheit aus, um Details anzuzeigen</p>
              </Card>
            )}
          </div>
        </div>

        {/* Verfügbare Einheitstypen */}
        <div className="mt-8">
          <h2 className="civ-title mb-4">Verfügbare Einheitstypen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(UNIT_TYPES).map(([key, unit]) => (
              <Card key={key} className="civ-card text-center">
                <h3 className="font-semibold text-foreground mb-2">{unit.name}</h3>
                <div className="space-y-1 text-xs text-foreground/70 mb-3">
                  <p>Angriff: <span className="text-accent font-bold">{unit.attack}</span></p>
                  <p>Verteidigung: <span className="text-accent font-bold">{unit.defense}</span></p>
                  <p>Gesundheit: <span className="text-accent font-bold">{unit.health}</span></p>
                  <p>Kosten: <span className="text-accent font-bold">{unit.cost}</span></p>
                </div>
                <Button className="civ-button-secondary w-full text-xs">Rekrutieren</Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
