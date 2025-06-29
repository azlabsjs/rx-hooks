/* eslint-disable @typescript-eslint/no-unused-vars */
import { interval, lastValueFrom , of, Subject } from 'rxjs'; //
import { first, tap, take, takeUntil } from 'rxjs/operators'; //
import {
  useCompletableRxEffect,
  useRxEffect,
  useRxReducer,
  useRxState,
} from '../src';
import { UnknownType } from '../src/types';

jest.setTimeout(10000);

const testResponse: { [index: string]: UnknownType }[] = JSON.parse(
  `[{
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipitnsuscipit recusandae consequuntur expedita et cumnreprehenderit molestiae ut ut quas totamnnostrum rerum est autem sunt rem eveniet architecto"
    },
    {
    "userId": 1,
    "id": 2,
    "title": "qui est esse",
    "body": "est rerum tempore vitaensequi sint nihil reprehenderit dolor beatae ea dolores nequenfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendisnqui aperiam non debitis possimus qui neque nisi nulla"
    }]`
);

describe('Test hooks implementation', () => {
  it('states should check that changes contains all state changes', async () => {
    const [state, setState, changes] = useRxState<number[]>([], null, true);
    const _done$ = new Subject<void>();

    setState([1, 2, 4, 5]);
    setState([1, 2, 5]);
    setState([1, 23, 5, 6]);

    state.pipe(takeUntil(_done$)).subscribe();

    await lastValueFrom(
      interval(1000).pipe(
        first(),
        tap(() => {
          expect(changes[0]).toEqual([]);
          expect(changes[1]).toEqual([1, 2, 4, 5]);
          expect(changes[2]).toEqual([1, 2, 5]);
          expect(changes[3]).toEqual([1, 23, 5, 6]);
          _done$.next();
        })
      )
    );
  });

  it('states should contains all changes on the local state object', async () => {
    const changes: object[] = [];
    const [car, setCar] = useRxState({
      brand: 'Ford',
      model: 'Mustang',
      year: '1964',
      color: 'red',
    });
    const _done$ = new Subject<void>();

    car
      .pipe(
        tap((state) => changes.push(state)),
        takeUntil(_done$)
      )
      .subscribe();

    setCar((previousState) => {
      return { ...previousState, color: 'blue' };
    });
    setCar((previousState) => {
      return { ...previousState, model: 'DWaggen' };
    });

    await lastValueFrom(
      interval(1000).pipe(
        first(),
        tap(() => {
          expect(changes[0]).toEqual({
            brand: 'Ford',
            model: 'Mustang',
            year: '1964',
            color: 'red',
          });
          expect(changes[1]).toEqual({
            brand: 'Ford',
            model: 'Mustang',
            year: '1964',
            color: 'blue',
          });
          expect(changes[2]).toEqual({
            brand: 'Ford',
            model: 'DWaggen',
            year: '1964',
            color: 'blue',
          });
          _done$.next();
        })
      )
    );
  });

  it('changes should contains all state changes', async () => {
    const [_, dispatch, changes] = useRxReducer(
      (state, action: { type: string; payload?: UnknownType }) => {
        switch (action.type) {
          case 'push':
            return [...state, action.payload];
          case 'pop':
            return state.slice(0, state.length - 1);
          default:
            return state;
        }
      },
      [] as object[],
      null,
      true
    );

    dispatch({ type: 'push', payload: 1 });
    dispatch({ type: 'push', payload: 2 });
    dispatch({ type: 'push', payload: 4 });
    dispatch({ type: 'pop' });

    await lastValueFrom(
      interval(1000).pipe(
        first(),
        tap(() => {
          expect(changes[0]).toEqual([]);
          expect(changes[1]).toEqual([1]);
          expect(changes[2]).toEqual([1, 2]);
          expect(changes[3]).toEqual([1, 2, 4]);
          expect(changes[4]).toEqual([1, 2]);
        })
      )
    );
  });

  it('should internally subscribe and unsubscribe when complete is called on the result of it calls', async () => {
    const subject$ = new Subject<number>();
    let localState = 0;
    const values: number[] = [];
    // In the effect we cache values produced by the subject into
    // values list variable
    const effect$ = useCompletableRxEffect(
      subject$.asObservable().pipe(
        tap((state) => {
          // We complete the observable internally by calling complete
          // when localState variable value equals 10
          if (state === 10) {
            effect$('Running comple effect...');
          }
          localState = state;
          values.push(localState);
        })
      ),
      (arg: string) => {
        // Test if the argments is passed to the completed function
        expect(arg).toEqual('Running comple effect...');
      }
    );
    let increment = 0;
    interval(10)
      .pipe(
        take(100),
        tap(() => {
          ++increment;
          subject$.next(increment);
        })
      )
      .subscribe();
    // We simulate a wait from 7 seconds before we assert to make sure
    // the complete is successfully run
    await lastValueFrom(
      interval(2000).pipe(
        first(),
        tap(() => {
          expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        })
      )
    );
  });

  it('rxEffect should invoke even if user does not call subscribe method', async () => {
    new (class {
      constructor() {
        useRxEffect(
          of(testResponse).pipe(
            tap((state) => expect(Array.isArray(state)).toBe(true))
          )
        );
      }

      public ngOnDestroy() {
        console.log('Completing....');
      }
    })();
    await lastValueFrom(interval(2000).pipe(first()));
  });

  it('rxEffect should run when dependencies changes', async () => {
    const subject2$ = new Subject<[string, Record<string, unknown>]>();
    useCompletableRxEffect(
      (path: string, options?: Record<string, unknown>) => {
        expect(path).toEqual('api/v1/posts');
        expect(options).toEqual({
          _query: {
            where: ['comments', ['My comments']],
          },
        });
      },
      [() => console.log('completed'), subject2$]
    );
    subject2$.next([
      'api/v1/posts',
      {
        _query: {
          where: ['comments', ['My comments']],
        },
      },
    ]);
    await lastValueFrom(interval(1000).pipe(first()));
  });

  it('it should force reducer to wait for initialization to complete', async () => {
    const [_, dispatch, changes] = useRxReducer(
      (state, action: { type: string; payload?: UnknownType }) => {
        switch (action.type) {
          case 'push':
            return [...state, action.payload];
          case 'pop':
            return state.slice(0, state.length - 1);
          default:
            return state;
        }
      },
      [] as number[],
      () => {
        return new Promise<number[]>((resolve) => {
          setTimeout(() => resolve([9, 13, 18]), 1000);
        });
      },
      true
    );

    dispatch({ type: 'push', payload: 1 });
    dispatch({ type: 'push', payload: 2 });
    dispatch({ type: 'push', payload: 4 });
    dispatch({ type: 'pop' });

    await lastValueFrom(
      interval(1500).pipe(
        first(),
        tap(() => {
          expect(changes[0]).toEqual([]);
          expect(changes[1]).toEqual([9, 13, 18, 1]);
          expect(changes[2]).toEqual([9, 13, 18, 1, 2]);
          expect(changes[3]).toEqual([9, 13, 18, 1, 2, 4]);
          expect(changes[4]).toEqual([9, 13, 18, 1, 2]);
        })
      )
    );
  });
});
