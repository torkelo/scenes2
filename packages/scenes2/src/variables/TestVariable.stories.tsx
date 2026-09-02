import type { Meta, StoryObj } from '@storybook/react';

import { useInterpolator } from './interpolation/useInterpolator';
import { TestVariable } from './TestVariable';

const meta: Meta<typeof TestVariable> = {
  title: 'Scenes2/TestVariable',
  component: TestVariable,
};

export default meta;

type Story = StoryObj<typeof TestVariable>;

export const Basic: Story = {
  render: () => {
    return (
      <TestVariable name="service" value="" query="A.*" delay={1000}>
        <TestVariable name="pod" value="" query="A.$service.*" delay={2000}>
          <PrintVariable name="service" />
          <PrintVariable name="pod" />
        </TestVariable>
      </TestVariable>
    );
  },
};

function PrintVariable({ name }: { name: string }) {
  const value = useInterpolator(`name=$\{${name}}`);

  return (
    <div>
      <div>{value}</div>
    </div>
  );
}
