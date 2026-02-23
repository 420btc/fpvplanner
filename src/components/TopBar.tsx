import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoute } from '@/contexts/RouteContext';
import { SavedRoute } from '@/types/route';
import { Play, Pause, Square, Save, FolderOpen, Trash2, Gauge } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function TopBar() {
  const {
    routeName, setRouteName, waypoints,
    simulationState, toggleSimulation, stopSimulation,
    simulationSpeed, setSimulationSpeed,
    saveRoute, getSavedRoutes, loadRoute, deleteRoute, clearRoute,
  } = useRoute();
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  const handleSave = () => {
    if (waypoints.length < 2) { toast.error('Agrega al menos 2 puntos'); return; }
    saveRoute();
    toast.success('Ruta guardada');
  };

  const handleOpenLoad = () => setSavedRoutes(getSavedRoutes());

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
      <span className="text-lg font-bold text-primary">🚁</span>
      <Input
        value={routeName}
        onChange={e => setRouteName(e.target.value)}
        className="h-8 w-40 bg-muted text-sm"
      />

      <div className="flex items-center gap-1 ml-2">
        <Button size="sm" variant="ghost" onClick={handleSave} title="Guardar">
          <Save className="h-4 w-4" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="ghost" onClick={handleOpenLoad} title="Cargar">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card">
            <SheetHeader><SheetTitle>Rutas Guardadas</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-2">
              {savedRoutes.length === 0 && <p className="text-sm text-muted-foreground">Sin rutas guardadas</p>}
              {savedRoutes.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded bg-muted p-2">
                  <button className="text-sm text-foreground hover:text-primary text-left flex-1" onClick={() => { loadRoute(r); toast.success('Ruta cargada'); }}>
                    {r.name} <span className="text-muted-foreground text-xs">({r.waypoints.length} pts)</span>
                  </button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { deleteRoute(r.id); setSavedRoutes(prev => prev.filter(x => x.id !== r.id)); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <Button size="sm" variant="ghost" onClick={clearRoute} title="Limpiar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Gauge className="h-3 w-3" />
          <Slider
            value={[simulationSpeed]}
            onValueChange={v => setSimulationSpeed(v[0])}
            min={0.25} max={3} step={0.25}
            className="w-20"
          />
          <span>{simulationSpeed}x</span>
        </div>
        <Button
          size="sm"
          variant={simulationState === 'playing' ? 'secondary' : 'default'}
          onClick={toggleSimulation}
          disabled={waypoints.length < 2}
        >
          {simulationState === 'playing' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span className="ml-1 text-xs">{simulationState === 'playing' ? 'Pausar' : 'Simular'}</span>
        </Button>
        {simulationState !== 'idle' && (
          <Button size="sm" variant="ghost" onClick={stopSimulation}>
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
