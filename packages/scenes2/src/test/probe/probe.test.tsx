import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';

import { UrlKeyManager } from '../../url/UrlKeyMapper';
import { UrlStateProvider, useUrlSync } from '../../url/UrlStateContext';

const keys = ['query', 'page'] as const;
const log: string[] = [];

class Logged extends UrlKeyManager {
  claim(
    owner: string,
    k: readonly string[],
    previous?: Readonly<Record<string, string>>,
  ) {
    const out = super.claim(owner, k, previous);
    log.push(
      `claim(${owner}${previous ? ', prev' : ''}) -> ${JSON.stringify(out)}`,
    );
    return out;
  }
  release(owner: string) {
    log.push(`release(${owner})`);
    super.release(owner);
  }
}

function C({ children }: { children?: ReactNode }) {
  const [state] = useUrlSync<{ query?: string; page?: string }>(keys);
  return (
    <>
      {JSON.stringify(state)}
      {children}
    </>
  );
}

it('probe', () => {
  const registry = new Logged();
  const tree = (withInner: boolean) => (
    <MemoryRouter initialEntries={['/?query=a&query2=b']}>
      <UrlStateProvider registry={registry}>
        <C>{withInner ? <C /> : null}</C>
      </UrlStateProvider>
    </MemoryRouter>
  );

  const { rerender, container } = render(tree(true), { reactStrictMode: true });
  log.push('--- unmount inner ---');
  rerender(tree(false));
  log.push('--- third claims ---');
  const third = registry.claim('third', keys);

  console.log(
    'LOG:\n' +
      log.join('\n') +
      '\nthird=' +
      JSON.stringify(third) +
      '\ndom=' +
      container.textContent,
  );
  expect(true).toBe(true);
});
