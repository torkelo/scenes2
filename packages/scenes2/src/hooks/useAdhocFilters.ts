import React from 'react';

import { AdhocFiltersContext } from '../filters/AdhocFiltersContext';

export function useAdhocFilters() {
  const ctx = React.useContext(AdhocFiltersContext);

  if (!ctx) {
    throw new Error('AdhocFiltersContext not found');
  }

  return ctx;
}
