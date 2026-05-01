import { BrowserRouter, Routes, Route, Outlet } from "react-router";

import Home from "./pages/Home";
import LiveGame from "./pages/LiveGame";
import NotFound from "./pages/NotFound";
import { LinkButton } from "./components/ui/LinkButton";
import BattingStatsPage from "./pages/BattingStats";
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridProvider } from 'ag-grid-react';

const modules = [AllCommunityModule];

export function App() {
  return (
    <BrowserRouter>
      <nav className="flex items-center justify-start gap-5 px-10 py-2 font-mono">
        <p className="font-bold">Gurleen's Baseball App</p>
        <div className="flex items-center gap-4">
          <LinkButton href="/">Scores</LinkButton>
          <LinkButton href="/stats/batting">Batting</LinkButton>
        </div>
      </nav>
      <Routes>
        <Route element={<BaseLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/live/:gameId" element={<LiveGame />} />
          <Route path="/stats/batting" element={<BattingStatsPage />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function BaseLayout() {
  return (
    <div className="max-width-[1000px] mx-auto">
      <div className="w-full">
        <AgGridProvider modules={modules}>
          <Outlet />
        </AgGridProvider>
      </div>
    </div>
  );
}

export default App;
