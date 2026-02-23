import { useRoute } from '@/contexts/RouteContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PATTERNS, PatternType } from '@/lib/patterns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MousePointer } from 'lucide-react';

export default function PatternToolbar() {
  const { activePattern, setActivePattern, patternRadius, setPatternRadius, lastPattern } = useRoute();

  return (
    <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1 rounded-lg border border-border bg-card/70 p-1.5 backdrop-blur-sm shadow-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={activePattern === null ? 'default' : 'ghost'}
            className="h-8 w-8 text-xs"
            onClick={() => setActivePattern(null)}
          >
            <MousePointer className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Punto libre</TooltipContent>
      </Tooltip>

      {(Object.entries(PATTERNS) as [PatternType, typeof PATTERNS[PatternType]][]).map(([key, config]) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={activePattern === key ? 'default' : 'ghost'}
              className="h-8 w-8 text-base"
              onClick={() => setActivePattern(activePattern === key ? null : key)}
            >
              {config.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      ))}

      {(activePattern || lastPattern) && (
        <>
          <div className="mt-1 border-t border-border pt-1">
            <p className="text-[10px] text-center text-primary font-medium">
              Clic en mapa
            </p>
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <span className="text-[10px] text-muted-foreground">Radio (m)</span>
            <Input
              type="number"
              min={5}
              max={2000}
              step={5}
              value={patternRadius}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) return;
                setPatternRadius(Math.min(2000, Math.max(5, next)));
              }}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}
