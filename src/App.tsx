import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Activity from "./pages/Activity";
import About from "./pages/About";
import GiftLink from "./pages/GiftLink";
import GiftPage from "./pages/GiftPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="gift" element={<GiftLink />} />
          <Route path="gift/:code" element={<GiftPage />} />
          <Route path="activity" element={<Activity />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
