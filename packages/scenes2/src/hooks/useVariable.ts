import React from 'react';

import { VariableContext, type VariableContextState } from '../variables/types';

export function useVariable(name: string): VariableContextState {
  let ctx = React.useContext(VariableContext);

  if (!ctx) {
    throw new Error(`VariableContext not found`);
  }

  while (ctx) {
    if (ctx.name === name) {
      return ctx;
    }

    ctx = ctx?.parent;
  }

  throw new Error(`Variable ${name} found`);
}
