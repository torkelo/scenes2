import { BusEventWithPayload } from '@grafana/data';

export class ContextValueChangedEvent<T> extends BusEventWithPayload<{
  newState: T;
  prevState: T;
}> {
  public static readonly type = 'context-value-changed';
}

export type ContextValueChangedEventHandler<TState> = (
  newState: TState,
  prevState: TState,
) => void;

export type Unsubscribable = {
  unsubscribe: () => void;
};
