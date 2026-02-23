import { RouteProvider } from '@/contexts/RouteContext';
import TopBar from '@/components/TopBar';
import SidePanel from '@/components/SidePanel';
import MapView from '@/components/MapView';
import Viewer3D from '@/components/Viewer3D';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Index = () => {
  return (
    <RouteProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <SidePanel />
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={50} minSize={30}>
              <MapView />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <Viewer3D />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </RouteProvider>
  );
};

export default Index;
