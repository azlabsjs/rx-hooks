import { Observable } from 'rxjs';

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
