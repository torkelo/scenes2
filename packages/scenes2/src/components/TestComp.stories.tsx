import type { Meta, StoryObj } from '@storybook/react';

import { TestComp } from './TestComp';

const meta: Meta<typeof TestComp> = {
  title: 'Scenes2/TestComp',
  component: TestComp,
};

export default meta;

type Story = StoryObj<typeof TestComp>;

export const Basic: Story = {};
