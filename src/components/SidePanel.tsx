import { useRoute } from '@/contexts/RouteContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MapPin } from 'lucide-react';

export default function SidePanel() {
  const { waypoints, updateWaypoint, removeWaypoint, totalDistance, minAltitude, maxAltitude } = useRoute();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground mb-2">Información de Ruta</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted p-2">
            <span className="text-muted-foreground">Distancia</span>
            <p className="font-mono text-foreground">{totalDistance > 1000 ? `${(totalDistance / 1000).toFixed(2)} km` : `${totalDistance.toFixed(0)} m`}</p>
          </div>
          <div className="rounded bg-muted p-2">
            <span className="text-muted-foreground">Puntos</span>
            <p className="font-mono text-foreground">{waypoints.length}</p>
          </div>
          <div className="rounded bg-muted p-2">
            <span className="text-muted-foreground">Alt. min</span>
            <p className="font-mono text-foreground">{minAltitude}m</p>
          </div>
          <div className="rounded bg-muted p-2">
            <span className="text-muted-foreground">Alt. max</span>
            <p className="font-mono text-foreground">{maxAltitude}m</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Waypoints</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {waypoints.length === 0 && (
            <p className="text-xs text-muted-foreground p-2 text-center">Haz clic en el mapa para agregar puntos</p>
          )}
          {waypoints.map((wp, i) => (
            <div key={wp.id} className="rounded bg-muted p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  Punto {i + 1}
                </span>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => removeWaypoint(wp.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mb-1">
                {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-12">Alt: {wp.altitude}m</span>
                <Slider
                  value={[wp.altitude]}
                  onValueChange={v => updateWaypoint(wp.id, { altitude: v[0] })}
                  min={5} max={200} step={5}
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
