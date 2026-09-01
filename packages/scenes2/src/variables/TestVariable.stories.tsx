import type { Meta, StoryObj } from '@storybook/react';

import { TestVariable } from './TestVariable';
import { useVariable } from './types';

const meta: Meta<typeof TestVariable> = {
  title: 'Scenes2/TestVariable',
  component: TestVariable,
};

export default meta;

type Story = StoryObj<typeof TestVariable>;

export const Basic: Story = {
  render: () => {
    return (
      <TestVariable name="test" value="test">
        <TestVariable name="test2" value="test2">
          <PrintVariable name="test" />
          <PrintVariable name="test2" />
        </TestVariable>
      </TestVariable>
    );
  },
};

function PrintVariable({ name }: { name: string }) {
  const variable = useVariable(name);
  return (
    <div>
      <div>Variable name: {variable?.name}</div>
      <div>Variable value: {variable?.getValue()}</div>
    </div>
  );
}
