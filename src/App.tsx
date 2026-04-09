import { BrowserRouter, Routes, Route, Outlet } from "react-router";

import Home from "./pages/Home";
import LiveGame from "./pages/LiveGame";
import NotFound from "./pages/NotFound";

export function App() {
  return (
    <BrowserRouter>
      <nav>
        {/* <Link to="/">Home</Link> */}
      </nav>
      <Routes>
        <Route element={<BaseLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/live/:gameId" element={<LiveGame />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function BaseLayout() {
  return (
    <div className="max-width-[1000px] mx-auto my-4">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
}

export default App;
