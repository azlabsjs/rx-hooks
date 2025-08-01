import { BehaviorSubject, Observable, ObservableInput } from 'rxjs';
import { createEffect } from './internals';
import {
  CreateEffectType,
  RecordKey,
  SetStateFunctionType,
  SourceArgType,
  UnknownType,
  UseReducerReturnType,
  UseStateReturnType,
} from './types';

/** @internal */
type ReducerFnType<T, A> = (state: T, action: A) => T;

// @internal - Function to update state object
// Mutate or update the state of value wrapped by the useRxState()
// function. It does not insure immutability by default
// there for developer should develop with immutability in mind
function useStateReducer<S>(state: S, action: SetStateFunctionType<S> | S): S {
  return typeof action === 'function'
    ? (action as SetStateFunctionType<S>)(state)
    : action;
}

/**
 * {@see useRxState} is an experimental but working implementation of redux
 * useState hooks for angular local component state management
 * 
 * **Warning**
 * As the API is experimental, you should use it at your own risk.😁
 * 
 * **Note:**
 * By default, we maintains only the last produced state value in cache, but the
 * function takes a bufferSize as second parameter to allow developper to configure
 * how many state changes should be retains before flushing old states
 * 
 * ```js
 *  const [car, setCar] = useRxState({
        brand: 'Ford',
        model: 'Mustang',
        year: '1964',
        color: 'red',
    });

    state.pipe(tap(console.log)).subscribe();
    car.pipe(tap(console.log)).subscribe();
    setState([1, 23, 5, 6, 7]);
    setState([1, 23, 5, 6, 7, 10]);

    setCar((previousState) => {
        return { ...previousState, color: 'blue' };
    });
    setCar((previousState) => {
        return { ...previousState, brand: 'DWaggen' };
    });

    // Creating an infinite state observable
    const [state, setState] = useRxState([], Infinity);
 * ```
 * 
 * 
 * @param initial 
 * @returns 
 */
export function useRxState<T = UnknownType>(
  initial: T,
  init?: ((_initial: unknown) => T | Promise<T>) | null,
  debug?: true
) {
  return useRxReducer(useStateReducer, initial, init, debug) as [
    ...UseStateReturnType<T>,
    T[],
  ];
}

/**
 * {@see useRxReducer} is an experimental but yet working implementation
 * of react useReducer() hooks, for managing local state in angular components.
 * 
 * **Note:**
 * As the API is experimental, you should use it at your own risk.😁
 * 
 * ```js
 * const [state2, dispatch] = useRxReducer(
    (state, action: { type: string; payload?: any }) => {
        switch (action.type) {
        case 'push':
            return [...state, action.payload];
        case 'pop':
            return state.slice(0, state.length - 1);
        default:
            return state;
        }
    },
    []
    );

    dispatch({ type: 'push', payload: 1 });
    dispatch({ type: 'push', payload: 2 });
 * ```
 * 
 * @param reducer 
 * @param initial 
 * @returns 
 */
export function useRxReducer<T, ActionType = UnknownType>(
  reducer: ReducerFnType<T, ActionType>,
  initial: T,
  init?: ((_initial: unknown) => T | Promise<T>) | null,
  debug?: true
) {
  let _lastVal: T = initial;
  const _changes: T[] = [];
  let resolving = false;
  let cachedReducers: ((p: T) => T)[] = [];

  // Start the observale with the initial reducer function so that the first
  // value is provided to first listener
  const _state$ = new BehaviorSubject<T>(_lastVal);

  // We log the initial state of the component
  if (debug) {
    _changes.push(_lastVal);
  }
  // Case initial function has never been called
  // we call the initial function with the privided initial value
  const handleInit = async () => {
    if (!init) {
      return;
    }
    const result = init(_lastVal);
    const isPromise =
      typeof result === 'object' &&
      (result as Promise<UnknownType>)['then'] &&
      typeof (result as Promise<UnknownType>)['then'] === 'function';
    if (!isPromise) {
      _lastVal = result as T;
      _state$.next(_lastVal);
      if (debug) {
        _changes.push(_lastVal);
      }
      return;
    }
    resolving = true;
    const awaited: T = await result;
    if (cachedReducers.length > 0) {
      _lastVal = cachedReducers.reduce(function (carry, reducer) {
        carry = reducer(carry);
        // Push the change of each reducer to the stack to keep track of all changes
        if (debug) {
          _changes.push(carry);
        }
        return carry;
      }, awaited);
      _state$.next(_lastVal);
    } else {
      _lastVal = awaited;
      _state$.next(_lastVal);
      if (debug) {
        _changes.push(_lastVal);
      }
    }
    // Reset resolving state after the promise is resolved
    cachedReducers = [];
    resolving = false;
  };

  /**  @description Action dispatcher */
  const dispatch = (action: ActionType) => {
    // Case we are resolving the initial value, we add the reducer to the
    // list of of cachedReducers
    if (resolving) {
      cachedReducers.push((s) => reducer(s, action));
      return;
    }
    // The we call the reducer to reduce state and set
    // the last state to the result of the reducer
    _lastVal = reducer(_lastVal, action);
    if (debug) {
      _changes.push(_lastVal);
    }
    // Then we notify the observable of a state update so that listeners
    // get the last emitted value
    _state$.next(_lastVal);
  };

  // Call handle init to call initialization function
  // We assume initialization can return a promise
  // therefore we execute it inside an async hook
  handleInit();

  return [_state$.asObservable(), dispatch, _changes] as [
    ...UseReducerReturnType<T, ActionType>,
    T[],
  ];
}

/**
 * {@see useRxEffect} tries to abstract away subsription and unsubscription
 * flows of RxJS observables in Javascript classes with destructor method.
 * 
 * Developpers must provide an observable input as first argument and a tuple of class
 * instance and destructor method as second argument. Example usage is as below.
 * 
 * ```js
    class JSClass {
      private effect$ = useRxEffect(
        interval(1000).pipe(
          take(10),
          tap((state) => console.log('Effect 1:', state))
        ),
        [this, 'destroy']
      );

      public destroy() {
        console.log('Completing....');
      }
    }

 * ```
 * 
 * **Note:**
 * Implementation support angular components, injectables and directives
 * class ngOnDestroy methods be default. Therefore developper does not have
 * to explicitly specify the detroy method
 * 
 * **Note:**
 * As the API is experimental, you should use it at your own risk.😁
 * 
 * ```ts
 * 
 *  import {Component, OnDestroy} from '@angular/core';
 * 
    Component({...})
    class DummyComponent implements OnDestroy {
      private effect$ = useRxEffect(
        interval(1000).pipe(
          take(10),
          tap((state) => console.log('Effect 1:', state))
        ),
        [this]
      );

      private effect2$ = useRxEffect(
        interval(2000).pipe(
          take(10),
          tap((state) => console.log('Effect 2:', state))
        ),
        [this]
      );

      public ngOnDestroy() {
        console.log('Completing....');
      }
    }

 * ```
 * 
 * 
 * 
 * @param source 
 * @param destroy 
 */

export function useRxEffect<
  T,
  TInstance = Record<RecordKey, UnknownType>,
  TObservable extends unknown[] = unknown[],
>(
  source:
    | ObservableInput<T>
    | ((...value: SourceArgType<typeof destroy, TObservable>) => void),
  destroy?:
    | [TInstance]
    | [TInstance, keyof TInstance]
    | [TInstance, keyof TInstance, Observable<TObservable> | TObservable]
    | [TInstance, Observable<TObservable> | TObservable]
    | Observable<TObservable>
) {
  createEffect(source, destroy);
}

/**
 * {@see useCompletableRxEffect} provides a functional interface arround rxjs
 * observable `complete` and `unsubscribe` method by returning a callable object
 * that complete the wrapped observable input.
 * 
 * **Note:**
 * Prefer use of {@see useRxEffect} when in class scope in which allow you pass
 * unsubscription method as second argment and abtract away calling `complete()`
 * method or invoking the effect to complete it.
 * 
 * 
 * ```js
 * // The example below uses rxjs fetch wrapper to make an http request
 * effect$ = useCompletableRxEffect(
    fromFetch('https://jsonplaceholder.typicode.com/posts').pipe(
      switchMap((response) => {
        if (response.ok) {
          // OK return data
          return response.json();
        } else {
          // Server is returning a status requiring the client to try something else.
          return of({ error: true, message: `Error ${response.status}` });
        }
      }),
      tap(console.log)
    )
  );
  // Completing the observable
  effect$.complete();
  // Or by simply invoking the effect
  effect$();

 * ```
 * 
 * The function takes as last argument an optional destruction function that should be run to
 * cleanup resources when the observable complete or unsubscribe
 * ```ts
 * const effect$ = useCompletableRxEffect(
      interval(1000).pipe(
          tap(() => ++count),
          tap(() => console.log(count))
      ),
      () => {
          // Cleanup resources
          console.log('Completing....');
      }
  );
  // Complete the effect after 5 seconds
  interval(5000)
  .pipe(
    first(),
    tap(() => effect$())
  )
  .subscribe();

 * ```
 * 
 * **Note:**
 * You are not required to call the `complete()` method on the result
 * of the `useRxEffect` call, for API calls or observable that may run
 * only once.
 * 
 * **Note:**
 * As the API is experimental, you should use it at your own risk.😁
 *
 * @param source
 * @param complete
 * @returns
 */
export function useCompletableRxEffect<
  T,
  TObservable extends unknown[] = unknown[],
>(
  source:
    | ObservableInput<T>
    | ((...value: SourceArgType<typeof complete, TObservable>) => void),
  complete:
    | ((...p: UnknownType[]) => unknown)
    | [(...p: UnknownType[]) => unknown, Observable<TObservable> | TObservable]
) {
  const completeType = typeof complete;
  const deps =
    completeType === 'function'
      ? []
      : ((complete as UnknownType[])[1] ?? undefined);
  const _complete =
    completeType === 'function' ? complete : (complete as UnknownType[])[0];
  return createEffect(
    source,
    _complete,
    deps as UnknownType
  ) as CreateEffectType;
}
