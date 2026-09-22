import { render } from '@testing-library/react';
import { useContext } from 'react';

import { CacheProvider } from '../caching/CacheContext';
import { TimeRangeContextProvider } from '../time/TimeRangeContext';
import { UrlStateProvider } from '../url/UrlStateContext';
import { AdhocFiltersContext, AdhocFiltersProvider } from './AdhocFilters';

interface ScenarioProps {}

function renderScenario(props: Partial<ScenarioProps> = {}) {
  return render(
    <CacheProvider>
      <UrlStateProvider>
        <TimeRangeContextProvider>
          <AdhocFiltersProvider>
            <PrintFilters />
          </AdhocFiltersProvider>
        </TimeRangeContextProvider>
      </UrlStateProvider>
    </CacheProvider>,
  );
}

function PrintFilters() {
  const context = useContext(AdhocFiltersContext);

  return <div>{JSON.stringify(context?.filters)}</div>;
}

describe('AdhocFiltersProvider', () => {
  describe('test', () => {
    it('Fined adhocfilter context', () => {
      renderScenario();
    });
  });
});
