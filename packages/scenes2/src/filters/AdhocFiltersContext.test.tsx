import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useAdhocFilters } from '../hooks/useAdhocFilters';
import { AdhocFiltersProvider } from './AdhocFiltersContext';
import type { AdHocFilterWithLabels } from './AdhocFiltersContext';

function FiltersProbe() {
  const { filters, onAddFilter, onUpdateFilter, onRemoveFilter } =
    useAdhocFilters();

  return (
    <div>
      <span data-testid="filters">
        {filters.map((f) => `${f.key}${f.operator}${f.value}`).join(',')}
      </span>
      <button
        onClick={() =>
          onAddFilter({ key: 'service', operator: '=', value: 'checkout' })
        }
      >
        add
      </button>
      <button
        onClick={() => {
          const target = filters[0];
          if (target) {
            onUpdateFilter(target, { value: 'cart' });
          }
        }}
      >
        update
      </button>
      <button
        onClick={() => {
          const target = filters[0];
          if (target) {
            onRemoveFilter(target);
          }
        }}
      >
        remove
      </button>
    </div>
  );
}

function renderScenario(initialFilters?: AdHocFilterWithLabels[]) {
  return render(
    <AdhocFiltersProvider initialFilters={initialFilters}>
      <FiltersProbe />
    </AdhocFiltersProvider>,
  );
}

function readFilters() {
  return screen.getByTestId('filters').textContent;
}

afterEach(() => {
  cleanup();
});

describe('AdhocFiltersProvider', () => {
  it('starts with no filters by default', () => {
    renderScenario();

    expect(readFilters()).toBe('');
  });

  it('starts with the given initial filters', () => {
    renderScenario([{ key: 'env', operator: '=', value: 'prod' }]);

    expect(readFilters()).toBe('env=prod');
  });

  it('adds a filter', () => {
    renderScenario();

    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    expect(readFilters()).toBe('service=checkout');
  });

  it('updates a filter in place', () => {
    renderScenario([{ key: 'service', operator: '=', value: 'checkout' }]);

    fireEvent.click(screen.getByRole('button', { name: 'update' }));

    expect(readFilters()).toBe('service=cart');
  });

  it('removes a filter', () => {
    renderScenario([{ key: 'service', operator: '=', value: 'checkout' }]);

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));

    expect(readFilters()).toBe('');
  });
});

describe('useAdhocFilters', () => {
  it('throws without a provider', () => {
    expect(() => render(<FiltersProbe />)).toThrow(
      'AdhocFiltersContext not found',
    );
  });
});
