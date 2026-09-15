import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TimeRangeContextProvider, UrlStateProvider } from '@grafana/scenes2';

import { HomePage } from './pages/HomePage';
import { PanelGridLayoutDemoPage } from './pages/PanelGridLayoutDemoPage';
import { SinglePanelDemoPage } from './pages/SinglePanelDemoPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <UrlStateProvider>
          <TimeRangeContextProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/panel-grid-layout-demo"
                element={<PanelGridLayoutDemoPage />}
              />
              <Route
                path="/single-panel-demo"
                element={<SinglePanelDemoPage />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TimeRangeContextProvider>
        </UrlStateProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
