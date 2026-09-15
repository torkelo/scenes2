import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { PanelGridLayoutDemoPage } from './pages/PanelGridLayoutDemoPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/panel-grid-layout-demo"
          element={<PanelGridLayoutDemoPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
