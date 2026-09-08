import React from 'react';
import type { ScopedVars } from '@grafana/data';

import { VARIABLE_REGEX } from '../constants';
import {
  VariableContext,
  type InterpolationFormatParameter,
  type VariableContextState,
} from '../types';

export function useInterpolator(
  input: string,
  _scopedVars?: ScopedVars,
  _format?: InterpolationFormatParameter,
): [string, boolean] {
  const context = React.useContext(VariableContext);

  if (!context) {
    return [input, false];
  }

  return React.useMemo(() => {
    return interpolate(input, context);
  }, [input, context]);
}

function interpolate(
  target: string,
  context: VariableContextState<unknown>,
  scopedVars?: ScopedVars,
  _format?: InterpolationFormatParameter,
): [string, boolean] {
  VARIABLE_REGEX.lastIndex = 0;

  let loading = false;

  const result = target.replace(
    VARIABLE_REGEX,
    (match, var1, var2, _fmt2, var3, fieldPath, _fmt3) => {
      const variableName = var1 || var2 || var3;
      //const fmt = fmt2 || fmt3 || format;
      const variable = lookupVariable(variableName, match, scopedVars, context);

      if (!variable) {
        return match;
      }

      if (variable.loading) {
        loading = true;
      }

      return String(variable.getValue(fieldPath) || '');
    },
  );

  return [result, loading];
}

function lookupVariable(
  name: string,
  _match: string,
  _scopedVars: ScopedVars | undefined,
  context: VariableContextState<unknown>,
): VariableContextState<unknown> | undefined {
  let current: VariableContextState<unknown> | undefined = context;

  while (current) {
    if (current.name === name) {
      return current;
    }
    current = current.parent;
  }

  return current;
}
