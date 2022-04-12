import { memoize } from '@iazlabs/functional';
import { ObservableInput, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, filter, scan, startWith } from 'rxjs/operators';
import { createEffect } from './internals';
import {
  SetStateFunctionType,
  UseReducerReturnType,
  UseStateReturnType,
} from './types';

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
export function useRxState<T = any>(initial: T, bufferSize = 1) {
  return useRxReducer(
    useStateReducer,
    initial,
    bufferSize
  ) as UseStateReturnType<T>;
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
export function useRxReducer<T, ActionType = any>(
  reducer: (state: T, action: ActionType) => unknown,
  initial: T,
  bufferSize = Infinity
) {
  // We create an infinite or a buffered replay subject so that late
  // subscribers can access previously emitted value by the
  // observer
  const _action$ = new ReplaySubject<ActionType>(bufferSize);
  // Provides a memoization implementation arround the inital
  // if the initial value is a function type
  const _initial = (
    typeof initial === 'function' ? memoize(initial as any) : initial
  ) as any;

  /**
   * @description Action dispatcher
   */
  const dispatch = (action: ActionType) => {
    _action$.next(action);
  };

  const state = _action$.pipe(
    startWith(typeof _initial === 'function' ? _initial() : _initial),
    filter((state) => typeof state !== 'undefined' && state !== null),
    scan((state, action) => {
      return reducer(state as T, action as ActionType) as T;
    }),
    distinctUntilChanged()
  );

  return [state, dispatch] as UseReducerReturnType<T, ActionType>;
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
 * @param destructor 
 */

export function useRxEffect<T>(
  source: ObservableInput<T>,
  destructor?: [object, string] | [object]
) {
  createEffect(source, destructor);
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
  // Comple the effect after 5 seconds
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
 * @param onDestroy
 * @returns
 */
export function useCompletableRxEffect<T>(
  source: ObservableInput<T>,
  onDestroy?: (...p: any[]) => unknown
) {
  return createEffect(source, onDestroy) as ((...args: any[]) => unknown) &
    Pick<{ complete: (...args: any[]) => unknown }, 'complete'>;
}
