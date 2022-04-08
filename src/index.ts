import { memoize } from '@iazlabs/functional';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  scan,
  startWith,
  takeUntil,
} from 'rxjs/operators';
import { completeSubject, getSymbol } from './internals';
import {
  JsFunction,
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
 * **Note**
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
 * **Note**
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
 * {@see useEffect} tries to abstract away subsription and unsubscription
 * flows of RxJS observables by using completable function that when
 * called will internally unsubscribe from the observable.
 * 
 * **Note**
 * As the API is experimental, you should use it at your own risk.😁
 * 
 * ```js
 * // Create an observable that increment the count
 * // after each seconds
 * const subject$ = useRxEffect(
    interval(1000).pipe(
      tap(() => ++count),
      tap(() => console.log(count))
    ),
    () => {
      console.log('Calling ... Destructor');
    }
  );

  // Complete the observable after 5 seconds
    interval(5000)
    .pipe(
      first(),
      // Call complete to trigger unsubscribe event on the observable
      tap(() => subject$.complete())
    )
    .subscribe();
 * ```
 * 
 * **Note**
 * You are not required to call the `complete()` method on the result
 * of the `useRxEffect` call, for API calls or observable that may run
 * only once.
 * 
 * ```js
 * // The example below uses rxjs fetch wrapper to make an http request
 * useRxEffect(
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
  )
 * ```
 * 
 * The function takes as argument a destruction function that should be run to
 * cleanup resources when the observable complete or unsubscribe
 * 
 * @param source 
 * @param destruct 
 */
export function useRxEffect<T>(source: Observable<T>, destruct?: JsFunction) {
  const symbol = getSymbol();
  const instance = {
    [symbol]: new Subject<void>(),
  };
  // TODO: Subscribe to the side uffect
  source.pipe(takeUntil(instance[symbol as any])).subscribe();
  function _subject(...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    if (destruct && typeof destruct === 'function') {
      destruct(...args);
    }
    completeSubject(instance, symbol);
  }
  return Object.defineProperty(_subject, 'complete', {
    value: () => {
      _subject();
    },
  }) as any as JsFunction &
    Pick<{ complete: (...args: any[]) => unknown }, 'complete'>;
}
