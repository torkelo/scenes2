import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { TimeRangeContextProvider, UrlStateProvider } from '@grafana/scenes2';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PluginPropsContext } from './utils/utils.plugin';
import { DemoHome } from 'components/DemoHome';
import { PanelGridLayoutDemo } from 'components/PanelGridLayoutDemo';
import { VariablesDemo } from 'components/VariablesDemo';
import { ROUTES } from './constants';

const queryClient = new QueryClient();

function App(props: AppRootProps) {
  return (
    <PluginPropsContext.Provider value={props}>
      <QueryClientProvider client={queryClient}>
        <UrlStateProvider>
          <TimeRangeContextProvider>
            <Routes>
              <Route path={ROUTES.PanelGridLayoutDemo} element={<PanelGridLayoutDemo />} />
              <Route path={ROUTES.VariablesDemo} element={<VariablesDemo />} />
              <Route path="*" element={<DemoHome />} />
            </Routes>
          </TimeRangeContextProvider>
        </UrlStateProvider>
      </QueryClientProvider>
    </PluginPropsContext.Provider>
  );
}

export default App;
