# Package documentation

The package propose a React functional component like hooks for creating local states, side effects, etc ... for javascript application using rxjs library.
It's just a utility package for developper coming from reate world to have some kind of same concept in frameworks using rxjs like angular.

## `useRxState` hook

`useRxState` is an implementation of react `useState` hooks for rxjs based framework like angular for component local state management. The API tries to be similar to react `useState` hook.

**Warning**
As the API is experimental, you should use it at your own risk.😁

**Note**
By default, we maintains only the last produced state value in cache, but the
function takes a bufferSize as second parameter to allow developper to configure
how many state changes should be retains before flushing old states

```js
 const [car, setCar] = useRxState({
     brand: 'Ford',
     model: 'Mustang',
     year: '1964',
     color: 'red',
 });

 // Subscribe to the state to get the changes when
 // setCar() is called.
 state.pipe(tap(console.log)).subscribe();
 car.pipe(tap(console.log)).subscribe();
 setState([1, 23, 5, 6, 7]);
 setState([1, 23, 5, 6, 7, 10]);

 setCar((previousState) => {
     return {
         ...previousState,
         color: 'blue'
     };
 });
 setCar((previousState) => {
     return {
         ...previousState,
         brand: 'DWaggen'
     };
 });

 // Creating an infinite state observable
 // Using Infinity as second parameter, the `useState` will cache
 // all state changes so that late subscribers get all changes before
 // and after subscription
 const [state, setState] = useRxState([], Infinity);
```

**Note**
Using Infinity as second parameter, the `useState` will cache all state changes so that late subscribers get all changes before and after subscription.

## `useRxReducer` hook

`useRxReducer` can be used for complex state manipulation logic. It takes in the initial state value with a state reducer function that update state each time an action is dispatch.

For example:

```js
const [state2, dispatch] = useRxReducer(
    (state, action: {
        type: string;payload ? : any
    }) => {
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

// Subscribe to state changes
state.subscribe(change => console.log(change));

// Dispatch an action to update the state
dispatch({
    type: 'push',
    payload: 1
});
dispatch({
    type: 'push',
    payload: 2
});
```

## `useRxEffect`

`useRxEffect` utility function allow developper with less knownledge of rxjs API to listen to observables changes without externally subscribing to the observable. It provides developper with a synchronous API for performing side effects.

`useRxEffect` will internally subscribe to observable on the behalf of the developper, and return a `complete` method, which when called will unsubscribe to the observable.

```js
import {
    useRxEffect
} from '@iazlabs/rx-hooks';
import {
    interval
} from 'rxjs';
import {
    tap
} from 'rxjs/operators';
// Create an observable that increment the count
// after each seconds
const subject$ = useRxEffect(
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
```

**Note**
You are not required to call the `complete()` method on the result of the `useRxEffect` call, for API calls or observable that may run only once.

```js
import {
    useRxEffect
} from '@iazlabs/rx-hooks';
import {
    fromFetch
} from 'rxjs';
import {
    switchMap
} from 'rxjs/operators';

// The example below uses rxjs fetch wrapper to make an http request
useRxEffect(
    fromFetch('https://jsonplaceholder.typicode.com/posts').pipe(
        switchMap((response) => {
            if (response.ok) {
                // OK return data
                return response.json();
            } else {
                // Server is returning a status requiring the client to try something else.
                return of({
                    error: true,
                    message: `Error ${response.status}`
                });
            }
        }),
        tap(console.log)
    )
)
```

**Note**
The function takes as argument a destruction function that should be run to cleanup resources when the observable complete or unsubscribe.

```js
import {
    useRxEffect
} from '@iazlabs/rx-hooks';
import {
    fromFetch
} from 'rxjs';
import {
    switchMap
} from 'rxjs/operators';

// The example below uses rxjs fetch wrapper to make an http request
useRxEffect(
    fromFetch('https://jsonplaceholder.typicode.com/posts').pipe(
        switchMap((response) => {
            if (response.ok) {
                // OK return data
                return response.json();
            } else {
                // Server is returning a status requiring the client to try something else.
                return of({
                    error: true,
                    message: `Error ${response.status}`
                });
            }
        }),
        tap(console.log)
    ),
    () => {
        // Execute when complete is called by the developper
    }
)
```
