import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DayPage } from './pages/DayPage.tsx';
import { CrmPage } from './pages/CrmPage.tsx';
import { ApiDocsPage } from './pages/ApiDocsPage.tsx';
import { PrimersPage } from './pages/PrimersPage.tsx';

// Primer lessons, widgets and the QA page load on demand.
const PrimerUnitPage = lazy(() => import('./pages/PrimerUnitPage.tsx'));
const VerifyPage = lazy(() => import('./pages/VerifyPage.tsx'));
const loading = <div className="empty-state">Loading…</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="day/:dayId" element={<DayPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="api-docs" element={<ApiDocsPage />} />
          <Route path="primers" element={<PrimersPage />} />
          <Route path="primers/:primerId" element={<PrimersPage />} />
          <Route
            path="primers/:primerId/:unit"
            element={
              <Suspense fallback={loading}>
                <PrimerUnitPage />
              </Suspense>
            }
          />
          <Route
            path="verify"
            element={
              <Suspense fallback={loading}>
                <VerifyPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
