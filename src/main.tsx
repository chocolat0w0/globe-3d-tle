import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";

const App = lazy(() => import("./App"));
const EduApp = lazy(() => import("./edu/EduApp"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/pro"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <App />
            </Suspense>
          }
        />
        <Route
          path="/edu/*"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <EduApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
