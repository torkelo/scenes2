import React from 'react';

import { VariableContext, type VariableContextState } from '../variables/types';

export function useVariable<T = unknown>(
  name: string,
): VariableContextState<T> {
  let ctx = React.useContext(VariableContext);

  if (!ctx) {
    throw new Error(`VariableContext not found`);
  }

  while (ctx) {
    if (ctx.name === name) {
      return ctx as VariableContextState<T>;
    }

    ctx = ctx?.parent;
  }

  throw new Error(`Variable ${name} found`);
}
