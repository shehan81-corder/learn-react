import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DayPage } from './pages/DayPage.tsx';
import { CrmPage } from './pages/CrmPage.tsx';
import { ApiDocsPage } from './pages/ApiDocsPage.tsx';
import { VerifyPage } from './pages/VerifyPage.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="day/:dayId" element={<DayPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="api-docs" element={<ApiDocsPage />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
