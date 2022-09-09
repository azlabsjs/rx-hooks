import { Observable, ObservableInput } from 'rxjs';

// @internal Internal type definition of function for modifying
// component state
export type SetStateFunctionType<T> = (state: T) => T;

// @internal Internal type definition of {@see useRxState} hook
export type UseStateReturnType<T> = readonly [
  Observable<T>,
  (state: T | SetStateFunctionType<T>) => void
];

//@internal Internal type definition of {@see useRxReducer} hook
export type UseReducerReturnType<T, ActionType> = readonly [
  Observable<T>,
  (state: ActionType) => unknown
];

//@internal Internal Javascript function type definitions
export type JsFunction<T = unknown> = (...args: any[]) => T | (() => T);

// @internal
export type RecordKey = string | number | symbol;
export type DependenciesType<TObservableType> =
  | ObservableInput<TObservableType>
  | unknown;
// @internal
export type SourceArgType<
  T,
  TObservable extends unknown[]
> = T extends Observable<TObservable> ? TObservable : never;

export type CreateEffectType = ((...args: any[]) => unknown) &
  Pick<{ complete: (...args: any[]) => unknown }, 'complete'>;
