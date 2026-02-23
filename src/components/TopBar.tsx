import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoute } from '@/contexts/RouteContext';
import { SavedRoute } from '@/types/route';
import { Play, Pause, Square, Save, FolderOpen, Trash2, Gauge, MousePointer } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { PATTERNS, PatternType } from '@/lib/patterns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function TopBar() {
  const {
    routeName, setRouteName, waypoints,
    simulationState, toggleSimulation, stopSimulation,
    simulationSpeed, setSimulationSpeed,
    saveRoute, getSavedRoutes, loadRoute, deleteRoute, clearRoute,
    activePattern, setActivePattern, patternRadius, setPatternRadius,
    lastPattern, patternMaxAltitude, setPatternMaxAltitude
  } = useRoute();
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  const handleSave = () => {
    if (waypoints.length < 2) { toast.error('Agrega al menos 2 puntos'); return; }
    saveRoute();
    toast.success('Ruta guardada');
  };

  const handleOpenLoad = () => setSavedRoutes(getSavedRoutes());

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-3 shadow-sm">
      <span className="text-xl mr-2">🚁</span>
      
      {/* Herramientas de Patrón */}
      <div className="flex items-center gap-1 border-r border-border pr-3 mr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={activePattern === null ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => setActivePattern(null)}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Punto libre</TooltipContent>
        </Tooltip>

        {(Object.entries(PATTERNS) as [PatternType, typeof PATTERNS[PatternType]][]).map(([key, config]) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={activePattern === key ? 'default' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setActivePattern(activePattern === key ? null : key)}
              >
                <span className="text-lg leading-none">{config.icon}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {(activePattern || lastPattern) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 ml-1 px-2 text-xs font-normal">
                Configurar Patrón
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="start">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Radio</span>
                    <span className="font-medium">{patternRadius} m</span>
                  </div>
                  <Slider
                    value={[patternRadius]}
                    onValueChange={(v) => setPatternRadius(v[0])}
                    min={5}
                    max={2000}
                    step={5}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Altitud Final</span>
                    <span className="font-medium">{patternMaxAltitude} m</span>
                  </div>
                  <Slider
                    value={[patternMaxAltitude]}
                    onValueChange={(v) => setPatternMaxAltitude(v[0])}
                    min={10}
                    max={3000}
                    step={10}
                  />
                </div>
                {activePattern && (
                  <p className="text-[10px] text-center text-primary mt-2 font-medium bg-primary/10 py-1 rounded">
                    Haz clic en el mapa para colocar
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Input
        value={routeName}
        onChange={e => setRouteName(e.target.value)}
        className="h-8 w-40 bg-muted text-sm"
        placeholder="Nombre ruta..."
      />

      <div className="flex items-center gap-1 ml-1">
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

      <div className="ml-auto flex items-center gap-2 border-l border-border pl-3">
        <div className="flex items-center gap-2 mr-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <div className="w-24">
            <Slider
              value={[simulationSpeed]}
              onValueChange={v => setSimulationSpeed(v[0])}
              min={0.25} max={3} step={0.25}
            />
          </div>
          <span className="text-xs w-8 text-right font-mono">{simulationSpeed}x</span>
        </div>
        
        <Button
          size="sm"
          variant={simulationState === 'playing' ? 'secondary' : 'default'}
          onClick={toggleSimulation}
          disabled={waypoints.length < 2}
          className="h-8 px-3"
        >
          {simulationState === 'playing' ? <Pause className="h-3 w-3 mr-1.5" /> : <Play className="h-3 w-3 mr-1.5" />}
          <span className="text-xs font-medium">{simulationState === 'playing' ? 'Pausar' : 'Simular'}</span>
        </Button>
        
        {simulationState !== 'idle' && (
          <Button size="sm" variant="ghost" onClick={stopSimulation} className="h-8 w-8 p-0">
            <Square className="h-3 w-3 fill-current" />
          </Button>
        )}
      </div>
    </header>
  );
}
