import { screen, render } from '@testing-library/react';

import { useInterpolator } from './interpolation/useInterpolator';
import { TestVariable } from './TestVariable';

describe('TestVariable', () => {
  it('Defines a test variable', () => {
    render(
      <TestVariable name="test" value={'foo'} label="Foo">
        <EvalExpression id="expr" expr="${test}" />
      </TestVariable>,
    );

    expect(screen.getByTestId(`expr`)).toHaveTextContent('foo');
  });
});

export function EvalExpression({ id, expr }: { id: string; expr: string }) {
  return <div data-testid={id}>{useInterpolator(expr)}</div>;
}
