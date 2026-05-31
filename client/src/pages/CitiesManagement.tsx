import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Zap, BookOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface City {
  id: number;
  name: string;
  x: number;
  y: number;
  population: number;
  maxPopulation: number;
  buildings: string[];
  productionQueue: { type: string; item: string; progress: number }[];
}

const BUILDING_TYPES: Record<string, { name: string; food?: number; science?: number; gold?: number; production?: number; culture?: number; defense?: number; cost: number }> = {
  granary: { name: "Speicher", food: 2, cost: 50 },
  library: { name: "Bibliothek", science: 3, cost: 75 },
  market: { name: "Markt", gold: 2, cost: 60 },
  forge: { name: "Schmiede", production: 2, cost: 80 },
  temple: { name: "Tempel", culture: 2, cost: 70 },
  walls: { name: "Stadtmauern", defense: 3, cost: 100 },
};

export default function CitiesManagement() {
  const [cities, setCities] = useState<City[]>([
    {
      id: 1,
      name: "Rom",
      x: 5,
      y: 3,
      population: 8,
      maxPopulation: 10,
      buildings: ["granary", "library", "market"],
      productionQueue: [
        { type: "unit", item: "Warrior", progress: 60 },
      ],
    },
    {
      id: 2,
      name: "Alexandria",
      x: 8,
      y: 5,
      population: 5,
      maxPopulation: 8,
      buildings: ["library", "temple"],
      productionQueue: [
        { type: "building", item: "Bibliothek", progress: 40 },
      ],
    },
  ]);

  const [selectedCityId, setSelectedCityId] = useState<number | null>(cities[0]?.id || null);

  const selectedCity = cities.find(c => c.id === selectedCityId);

  const handleDeleteCity = (id: number) => {
    setCities(cities.filter(c => c.id !== id));
    if (selectedCityId === id) {
      setSelectedCityId(cities[0]?.id || null);
    }
  };

  const handleAddBuilding = (cityId: number, buildingType: string) => {
    setCities(
      cities.map(c =>
        c.id === cityId && !c.buildings.includes(buildingType)
          ? { ...c, buildings: [...c.buildings, buildingType] }
          : c
      )
    );
  };

  const populationPercentage = selectedCity ? (selectedCity.population / selectedCity.maxPopulation) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="civ-title">Städteverwaltung</h1>
          <p className="text-foreground/70">Verwalten Sie Ihre Städte und deren Entwicklung</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Städte-Liste */}
          <div className="lg:col-span-1">
            <Card className="civ-card">
              <h2 className="civ-subtitle">Ihre Städte ({cities.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cities.map(city => {
                  const isSelected = selectedCityId === city.id;
                  return (
                    <button
                      key={city.id}
                      onClick={() => setSelectedCityId(city.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-accent/20 border-accent"
                          : "bg-card/50 border-accent/20 hover:border-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{city.name}</p>
                          <p className="text-xs text-foreground/60">
                            Position: ({city.x}, {city.y})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-accent">
                            {city.population}/{city.maxPopulation}
                          </p>
                          <p className="text-xs text-foreground/60">
                            {city.buildings.length} Gebäude
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button className="civ-button-secondary w-full mt-4 text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Neue Stadt
              </Button>
            </Card>
          </div>

          {/* Stadt-Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCity ? (
              <>
                {/* Basis-Info */}
                <Card className="civ-card">
                  <h2 className="civ-subtitle">{selectedCity.name}</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-foreground/60">Position</p>
                      <p className="font-semibold text-foreground">
                        ({selectedCity.x}, {selectedCity.y})
                      </p>
                    </div>
                    <div>
                      <p className="text-foreground/60">Gebäude</p>
                      <p className="font-semibold text-foreground">{selectedCity.buildings.length}</p>
                    </div>
                  </div>
                </Card>

                {/* Bevölkerung */}
                <Card className="civ-card">
                  <h3 className="civ-subtitle">Bevölkerung</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-foreground/70">Bevölkerung</span>
                        <span className="text-sm font-bold text-accent">
                          {selectedCity.population}/{selectedCity.maxPopulation}
                        </span>
                      </div>
                      <div className="civ-progress">
                        <div
                          className="civ-progress-fill"
                          style={{ width: `${populationPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Produktionswarteschlange */}
                <Card className="civ-card">
                  <h3 className="civ-subtitle">Produktion</h3>
                  <div className="space-y-3">
                    {selectedCity.productionQueue.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-foreground/70">
                            {item.type === "unit" ? "Einheit" : "Gebäude"}: {item.item}
                          </span>
                          <span className="text-sm font-bold text-accent">{item.progress}%</span>
                        </div>
                        <div className="civ-progress">
                          <div
                            className="civ-progress-fill"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Gebäude */}
                <Card className="civ-card">
                  <h3 className="civ-subtitle">Gebäude ({selectedCity.buildings.length})</h3>
                  <div className="space-y-2 mb-4">
                    {selectedCity.buildings.length > 0 ? (
                      selectedCity.buildings.map(building => {
                        const info = BUILDING_TYPES[building as keyof typeof BUILDING_TYPES];
                        return (
                          <div
                            key={building}
                            className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-accent/20"
                          >
                            <span className="text-sm font-semibold text-foreground">{info?.name}</span>
                            <Button
                              className="civ-button-secondary text-xs"
                              onClick={() => {
                                setCities(
                                  cities.map(c =>
                                    c.id === selectedCity.id
                                      ? {
                                          ...c,
                                          buildings: c.buildings.filter(b => b !== building),
                                        }
                                      : c
                                  )
                                );
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-foreground/60">Keine Gebäude</p>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="civ-card text-center py-12">
                <p className="text-foreground/60">Wählen Sie eine Stadt aus, um Details anzuzeigen</p>
              </Card>
            )}
          </div>
        </div>

        {/* Verfügbare Gebäudetypen */}
        <div className="mt-8">
          <h2 className="civ-title mb-4">Verfügbare Gebäude</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {Object.entries(BUILDING_TYPES).map(([key, building]) => (
              <Card key={key} className="civ-card text-center">
                <h3 className="font-semibold text-foreground mb-2 text-sm">{building.name}</h3>
                <div className="space-y-1 text-xs text-foreground/70 mb-3">
                  {building.food && <p>Nahrung: <span className="text-accent font-bold">+{building.food}</span></p>}
                  {building.science && <p>Wissenschaft: <span className="text-accent font-bold">+{building.science}</span></p>}
                  {building.gold && <p>Gold: <span className="text-accent font-bold">+{building.gold}</span></p>}
                  {building.production && <p>Produktion: <span className="text-accent font-bold">+{building.production}</span></p>}
                  {building.culture && <p>Kultur: <span className="text-accent font-bold">+{building.culture}</span></p>}
                  {building.defense && <p>Verteidigung: <span className="text-accent font-bold">+{building.defense}</span></p>}
                  <p>Kosten: <span className="text-accent font-bold">{building.cost}</span></p>
                </div>
                {selectedCity && !selectedCity.buildings.includes(key) && (
                  <Button
                    className="civ-button-secondary w-full text-xs"
                    onClick={() => handleAddBuilding(selectedCity.id, key)}
                  >
                    Bauen
                  </Button>
                )}
                {selectedCity && selectedCity.buildings.includes(key) && (
                  <Button className="civ-button-secondary w-full text-xs opacity-50 cursor-not-allowed">
                    Vorhanden
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
