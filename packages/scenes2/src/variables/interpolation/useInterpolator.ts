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
): string {
  const context = React.useContext(VariableContext);

  if (!context) {
    return input;
  }

  const interpolated = React.useMemo(() => {
    return interpolate(input, context);
  }, [input, context]);

  return interpolated;
}

function interpolate(
  target: string,
  context: VariableContextState,
  scopedVars?: ScopedVars,
  _format?: InterpolationFormatParameter,
): string {
  VARIABLE_REGEX.lastIndex = 0;

  return target.replace(
    VARIABLE_REGEX,
    (match, var1, var2, _fmt2, var3, fieldPath, _fmt3) => {
      const variableName = var1 || var2 || var3;
      //const fmt = fmt2 || fmt3 || format;
      const variable = lookupVariable(variableName, match, scopedVars, context);

      if (!variable) {
        return match;
      }

      return String(variable.getValue(fieldPath) || '');
    },
  );
}

function lookupVariable(
  name: string,
  _match: string,
  _scopedVars: ScopedVars | undefined,
  context: VariableContextState,
): VariableContextState | undefined {
  let current: VariableContextState | undefined = context;

  while (current) {
    if (current.name === name) {
      return current;
    }
    current = current.parent;
  }

  return current;
}
