import { Routes, Route } from "react-router-dom";
import WorldMap from "./views/WorldMap";
import ClientView from "./views/ClientView";
import TwinChat from "./views/TwinChat";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldMap />} />
      <Route path="/client/:id" element={<ClientView />} />
      <Route path="/client/:id/twin" element={<TwinChat />} />
    </Routes>
  );
}
