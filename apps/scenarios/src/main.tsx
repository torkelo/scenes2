import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TimeRangeContextProvider } from '@grafana/scenes2';

import { App } from './App';
import { ThemeProvider } from './providers/ThemeProvider';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Cannot mount the app: #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <TimeRangeContextProvider>
        <App />
      </TimeRangeContextProvider>
    </ThemeProvider>
  </StrictMode>,
);
