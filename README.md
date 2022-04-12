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

## `useCompletableRxEffect`

`useCompletableRxEffect` utility function allow developper with less knownledge of rxjs API to listen to observables changes without externally subscribing to the observable. It provides developper with a synchronous API for performing side effects.

`useCompletableRxEffect` will internally subscribe to observable on the behalf of the developper, and return a `complete` method, which when called will unsubscribe to the observable.

```js
import {
    useCompletableRxEffect
} from '@iazlabs/rx-hooks';
import {
    interval
} from 'rxjs';
import {
    tap
} from 'rxjs/operators';
// Create an observable that increment the count
// after each seconds
const subject$ = useCompletableRxEffect(
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
You are not required to call the `complete()` method on the result of the `useCompletableRxEffect` call, for API calls or observable that may run only once.

```js
import {
    useCompletableRxEffect
} from '@iazlabs/rx-hooks';
import {
    fromFetch
} from 'rxjs';
import {
    switchMap
} from 'rxjs/operators';

// The example below uses rxjs fetch wrapper to make an http request
useCompletableRxEffect(
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
    useCompletableRxEffect
} from '@iazlabs/rx-hooks';
import {
    fromFetch
} from 'rxjs';
import {
    switchMap
} from 'rxjs/operators';

// The example below uses rxjs fetch wrapper to make an http request
useCompletableRxEffect(
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

**Note**
Prefer use of {@see useRxEffect} when in class scope in which allow you pass unsubscription method as second argment and abtract away calling `complete()` method or invoking the effect to complete it.

## `useRxEffect`

{@see useRxEffect} tries to abstract away subsription and unsubscription flows of RxJS observables in Javascript classes with destructor method.

Developpers must provide an observable input as first argument and a tuple of class instance and destructor method as second argument. Example usage is as below.

```js
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

    *
```

**Note**
Implementation support angular components, injectables and directives class ngOnDestroy methods be default. Therefore developper does not have to explicitly specify the detroy method.

**Note**
As the API is experimental, you should use it at your own risk.😁

```ts
import {Component, OnDestroy} from '@angular/core';

@Component({...})
class DummyComponent implements OnDestroy {
    private effect$ = useRxEffect(
        interval(1000).pipe(
            take(10),
            tap((state) => console.log('Effect 1:', state))
        ),
        [this] // Argument tells the to complete or unsubscribe from observable
        // When the component `ngOnDestroy` method is invoke
    );

    private effect2$ = useRxEffect(
        fromFetch('https://jsonplaceholder.typicode.com/posts')
        .pipe(
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
    ); // Runs only once and does not unsubscribe 

    public ngOnDestroy() {
        console.log('Completing....');
    }
}

```
