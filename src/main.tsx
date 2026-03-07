import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.tsx";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const EduApp = lazy(() => import("./edu/EduApp"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<div />}>
              <LandingPage />
            </Suspense>
          }
        />
        <Route path="/pro" element={<App />} />
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
