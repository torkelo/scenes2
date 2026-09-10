import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { StrictMode, useEffect, useState } from 'react';
import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { UrlStateProvider, useUrlSync } from './UrlStateContext';

/** The shape a consumer declares, which is what its keys and writes go by. */
interface Filters {
  query?: string;
  page?: number;
}

const keys = ['query', 'page'] as const;
let stateUpdates = 0;

/**
 * Mirrors the claimed keys into state, so a readout shows what `onChange` was
 * last handed rather than what the query string holds.
 */
function ShowFilters({ name = 'outer' }: { name?: string }) {
  const [state, update] = useUrlSync<Filters>(keys, (values) => {
    return {
      query: values.query,
      page: values.page ? parseInt(values.page) : undefined,
    };
  });

  useEffect(() => {
    stateUpdates++;
  }, [state]);

  return (
    <div>
      <div data-testid={`${name}-state`}>{JSON.stringify(state)}</div>
      <button onClick={() => update({ query: 'cpu' })}>
        {`${name} set query`}
      </button>
      <button onClick={() => update({ query: undefined })}>
        {`${name} clear query`}
      </button>
      <button
        onClick={() => {
          update({ query: 'cpu', page: 2 });
        }}
      >
        {`${name} set both`}
      </button>
    </div>
  );
}

/** Changes the query string the way the rest of the app would. */
function GoTo({ search }: { search: string }) {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate({ search })}>{`go to ${search}`}</button>
  );
}

function renderInRouter(entry: string, children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <UrlStateProvider>{children}</UrlStateProvider>
    </MemoryRouter>,
  );
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function readState(name = 'outer') {
  return JSON.parse(screen.getByTestId(`${name}-state`).textContent ?? '');
}

describe('useUrlSync', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    stateUpdates = 0;
  });

  describe('with a provider', () => {
    it('Should init state onmount', () => {
      renderInRouter('/?query=cpu&page=3', <ShowFilters />);

      expect(readState()).toEqual({ query: 'cpu', page: 3 });
      expect(stateUpdates).toEqual(1);
    });

    it('leaves out a key the query string has no value for', () => {
      renderInRouter('/?page=3', <ShowFilters />);

      expect(readState()).toEqual({ page: 3 });
    });

    it('calls fromUrl callback again when the location changes', () => {
      renderInRouter(
        '/',
        <>
          <ShowFilters />
          <GoTo search="?query=mem&page=1" />
        </>,
      );

      expect(readState()).toEqual({});

      click('go to ?query=mem&page=1');

      expect(readState()).toEqual({ query: 'mem', page: 1 });
      expect(stateUpdates).toEqual(2);
    });

    it('removes a key written as undefined', () => {
      renderInRouter('/?query=cpu&page=3', <ShowFilters />);

      click('outer clear query');

      expect(readState()).toEqual({ page: 3 });
    });

    //   it.only('stacks two writes made in the same tick', () => {
    //     renderInRouter('/', <ShowFilters />);

    //     click('outer set both');

    //     expect(readValues()).toEqual({ query: 'cpu', page: '2' });
    //   });

    //   it('leaves the query string alone until a write', () => {
    //     renderInRouter('/?unrelated=1', <ShowFilters />);

    //     expect(readValues()).toEqual({});
    //   });

    //   it('gives the keys it asked for to the first consumer only', () => {
    //     renderInRouter(
    //       '/',
    //       <>
    //         <ShowFilters />
    //         <ShowFilters name="inner" />
    //       </>,
    //     );

    //     expect(readKeys()).toEqual({ query: 'query', page: 'page' });
    //     expect(readKeys('inner')).toEqual({ query: 'query2', page: 'page2' });
    //   });

    //   it('keeps two consumers on their own keys', () => {
    //     renderInRouter(
    //       '/?query=cpu&query2=mem',
    //       <>
    //         <ShowFilters />
    //         <ShowFilters name="inner" />
    //       </>,
    //     );

    //     expect(readValues()).toEqual({ query: 'cpu' });
    //     expect(readValues('inner')).toEqual({ query: 'mem' });

    //     click('inner set query');

    //     expect(readValues()).toEqual({ query: 'cpu' });
    //     expect(readValues('inner')).toEqual({ query: 'cpu' });
    //   });

    //   it('shares a registry passed to the provider', () => {
    //     const registry = new UrlStateRegistry();

    //     render(
    //       <MemoryRouter>
    //         <UrlStateProvider registry={registry}>
    //           <ShowFilters />
    //         </UrlStateProvider>
    //       </MemoryRouter>,
    //     );

    //     expect(registry.claim('other', ['query'])).toEqual({ query: 'query2' });
    //   });

    //   it('gives out the same keys under StrictMode', () => {
    //     render(
    //       <StrictMode>
    //         <MemoryRouter>
    //           <UrlStateProvider>
    //             <ShowFilters />
    //             <ShowFilters name="inner" />
    //           </UrlStateProvider>
    //         </MemoryRouter>
    //       </StrictMode>,
    //     );

    //     expect(readKeys()).toEqual({ query: 'query', page: 'page' });
    //     expect(readKeys('inner')).toEqual({ query: 'query2', page: 'page2' });
    //   });
    // });

    // describe('without a provider', () => {
    //   it('keeps the values in React state', () => {
    //     render(<ShowFilters />);

    //     expect(readValues()).toEqual({});

    //     click('outer set query');

    //     expect(readValues()).toEqual({ query: 'cpu' });
    //   });

    //   it('leaves the query string alone', () => {
    //     window.history.replaceState(null, '', '/?query=disk');
    //     render(<ShowFilters />);

    //     click('outer set query');

    //     expect(new URL(window.location.href).search).toBe('?query=disk');
    //     expect(readValues()).toEqual({ query: 'cpu' });
    //   });

    //   it('gives every consumer the keys it asked for', () => {
    //     render(
    //       <>
    //         <ShowFilters />
    //         <ShowFilters name="inner" />
    //       </>,
    //     );

    //     expect(readKeys()).toEqual({ query: 'query', page: 'page' });
    //     expect(readKeys('inner')).toEqual({ query: 'query', page: 'page' });
    //   });

    //   it('keeps two consumers from seeing each other', () => {
    //     render(
    //       <>
    //         <ShowFilters />
    //         <ShowFilters name="inner" />
    //       </>,
    //     );

    //     click('inner set query');

    //     expect(readValues()).toEqual({});
    //     expect(readValues('inner')).toEqual({ query: 'cpu' });
    //   });
  });
});
