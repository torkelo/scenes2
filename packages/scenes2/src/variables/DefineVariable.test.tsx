import { screen, render } from '@testing-library/react';

import { DefineVariable } from './DefineVariable';
import { useInterpolator } from './interpolation/useInterpolator';
import { VariableTestQuery } from './VariableTestQuery';

describe('TestVariable', () => {
  it('Simple static variable', () => {
    render(
      <DefineVariable name="test" value={{ value: 'foo', label: 'Foo' }}>
        <EvalExpression id="expr" expr="${test}" />
      </DefineVariable>,
    );

    expect(screen.getByTestId(`expr`)).toHaveTextContent('foo');
  });

  it('Variable with dynamic options', () => {
    render(
      <DefineVariable name="test" value={{ value: 'foo', label: 'Foo' }}>
        <VariableTestQuery name="test" query="A.*" delay={10} />
        <EvalExpression id="expr" expr="${test}" />
      </DefineVariable>,
    );

    expect(screen.getByTestId(`expr`)).toHaveTextContent('foo');
  });
});

export function EvalExpression({ id, expr }: { id: string; expr: string }) {
  return <div data-testid={id}>{useInterpolator(expr)}</div>;
}
