import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HostPage from "./pages/HostPage";
import JoinPage from "./pages/JoinPage";
import SpectatePage from "./pages/SpectatePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/host" element={<HostPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/spectate" element={<SpectatePage />} />
    </Routes>
  );
}
