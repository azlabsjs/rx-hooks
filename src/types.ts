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

/**
 * Provides type declaration for setState<T> for useRxState hook
 */
export type SetStateType<T> = (state: T | SetStateFunctionType<T>) => void;

/**
 * Provides dispatch<T> type declaration for useRxeducer hook
 */
export type DispatchType<T> = (action: T) => void;

/**
 * State component is an interface that might be implemented by MVVM component
 * that might provides a local state manegement API using RxJS observables.
 *
 * @example
 * class MyComponent implements StateComponentType<T> {
 *    state$: Observable<T>;
 *    setState$: SetStateType<T>;
 *
 *    constructor() {
 *      this.state.pipe(...).subscribe();
 *    }
 *
 *    updateState<T>(state: T) {
 *      this.setState(state);
 *    }
 * }
 */
export interface StateComponentType<T> {
  /**
   * Actual observed state of the component
   */
  readonly state$: Observable<T>;

  /**
   * Provides a functional interface for updating component state
   */
  readonly setState$: SetStateType<T>;
}


/**
 * MVVM component state management using dispatch callable to pushing update event
 * to component store, to update it state. It works seamlessly like StateComponentType but
 * allows developper to provide a more complex reducer function.
 *
 * @example
 * class MyComponent implements ReducerComponentType<T> {
 *    state$: Observable<T>;
 *    dispatch$: DispatchType<ActionType>;
 *
 *    constructor() {
 *      this.state.pipe(...).subscribe();
 *    }
 *
 *    updateState<T>(state: T) {
 *      this.dispatch$({...});
 *    }
 * }
 */
export interface ReducerComponentType<T, ActionType> {
  /**
   * Actual observed component 
   */
  readonly state$: Observable<T>;

  /**
   * Action dispatcher property declaration
   * 
   * @example
   * class MyClass implements ReducerComponentType<T, Action> {
   *  
   *  updateState() {
   *    this.dispath$({...});
   *  }
   * }
   */
  readonly dispatch$: DispatchType<ActionType>;

}