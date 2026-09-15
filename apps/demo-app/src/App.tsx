import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { PluginPropsContext } from './utils/utils.plugin';
import { DemoHome } from 'components/DemoHome';
import { PanelGridLayoutDemo } from 'components/PanelGridLayoutDemo';
import { VariablesDemo } from 'components/VariablesDemo';
import { ROUTES } from './constants';

function App(props: AppRootProps) {
  return (
    <PluginPropsContext.Provider value={props}>
      <Routes>
        <Route path={ROUTES.PanelGridLayoutDemo} element={<PanelGridLayoutDemo />} />
        <Route path={ROUTES.VariablesDemo} element={<VariablesDemo />} />
        <Route path="*" element={<DemoHome />} />
      </Routes>
    </PluginPropsContext.Provider>
  );
}

export default App;
