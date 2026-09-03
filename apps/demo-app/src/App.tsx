import { AppRootProps } from '@grafana/data';
import { PluginPropsContext } from './utils/utils.plugin';
import { DemoHome } from 'components/DemoHome';

function App(props: AppRootProps) {
  return (
    <PluginPropsContext.Provider value={props}>
      <DemoHome />
    </PluginPropsContext.Provider>
  );
}

export default App;
