import { Combobox, type ComboboxOption, Field } from '@grafana/ui';

import { useVariable } from '../../hooks/useVariable';
import type { VariableContextState } from '../../variables/types';

interface VariableValueSelectProps {
  name: string;
  options: string[];
}

export function VariableValueSelect({
  name,
  options,
}: VariableValueSelectProps) {
  const variable = useVariable(name);

  const comboboxOptions = options.map((x) => ({ value: x, label: x }));
  const onChange = (newValue: ComboboxOption<string>) => {
    variable.changeValueTo(newValue.value);
  };

  const value = getComboboxValue(variable);

  return (
    <Field label={name} noMargin>
      <Combobox value={value} options={comboboxOptions} onChange={onChange} />
    </Field>
  );
}

function getComboboxValue(variable: VariableContextState) {
  if (typeof variable.value === 'string') {
    return variable.value;
  }

  return JSON.stringify(variable.value);
}
