import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { initFakeGrafanaRuntime } from './grafana/initFakeGrafanaRuntime';
import { ThemeProvider } from './providers/ThemeProvider';

// Mirrors GrafanaApp.init() running before ReactDOM renders in a real Grafana
// instance: @grafana/scenes2's VizPanel and useDataQuery read services off
// @grafana/runtime, so those need registering before anything below queries
// data or resolves a panel plugin.
initFakeGrafanaRuntime();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Cannot mount the app: #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
