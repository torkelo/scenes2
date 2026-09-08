import { isArray } from 'lodash';
import { Combobox, type ComboboxOption, Field } from '@grafana/ui';

import { useVariable } from '../../hooks/useVariable';
import type {
  VariableContextState,
  VariableValue,
} from '../../variables/types';

interface VariableValueSelectProps {
  name: string;
}

export function VariableValueSelect({ name }: VariableValueSelectProps) {
  const variable = useVariable<VariableValue>(name);
  const options =
    variable.options?.map((x) => ({
      value: String(x.value),
      label: x.label ?? String(x.value),
    })) ?? [];

  const onChange = (newValue: ComboboxOption<string>) => {
    variable.onChange({
      value: newValue.value,
      label: newValue.label ?? newValue.value,
    });
  };

  const value = getComboboxValue(variable);

  return (
    <Field label={name} noMargin>
      <Combobox
        loading={variable.loading}
        value={value}
        options={options}
        onChange={onChange}
      />
    </Field>
  );
}

function getComboboxValue(variable: VariableContextState<VariableValue>) {
  if (isArray(variable.value)) {
    throw new Error(
      'VariableValueSelect does not support multi-value variables',
    );
  }

  if (typeof variable.value.value === 'string') {
    return variable.value.value;
  }

  return null;
}
