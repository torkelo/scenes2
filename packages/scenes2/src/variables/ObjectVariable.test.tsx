import { screen, render } from '@testing-library/react';

import { useInterpolator } from './interpolation/useInterpolator';
import { ObjectVariable } from './ObjectVariable';

describe('ObjectVariable', () => {
  it('defines an object variable', () => {
    const obj = { foo: 'bar', baz: 42 };

    render(
      <ObjectVariable name="test" value={obj}>
        <EvalExpression id="expr" expr="${test.foo}" />
      </ObjectVariable>,
    );

    expect(screen.getByTestId(`expr`)).toHaveTextContent('bar');
  });
});

export function EvalExpression({ id, expr }: { id: string; expr: string }) {
  return <div data-testid={id}>{useInterpolator(expr)}</div>;
}
