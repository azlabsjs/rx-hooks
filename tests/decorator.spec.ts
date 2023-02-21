import {
  first,
  firstValueFrom,
  interval,
  Observable,
  scan,
  Subject,
  takeUntil,
  tap
} from 'rxjs';
import { DispatchType, Reducer, ReducerComponentType, SetStateType, State, StateComponentType } from '../src';

type StateType = {
  articles: unknown[];
  performingAction: boolean;
};

/**
 * Provides basic reducer action type declaration
 */
type ActionType<T = any> = { type: string; payload?: T };

const reducer = (state: StateType, action: ActionType) => {
  switch (action.type) {
    case 'start':
      return { ...state, performingAction: true };
    default:
      return { ...state };
  }
};

@State({
  articles: [] as unknown[],
  performingAction: false,
})
class MyComponent implements StateComponentType<StateType> {
  state$!: Observable<StateType>;
  setState$!: SetStateType<StateType>;

  setArticles(...articles: unknown[]) {
    this.setState$((state) => ({
      ...state,
      articles: [...(state.articles ?? []), ...articles],
    }));
  }

  performAction() {
    this.setState$((state) => ({
      ...state,
      performingAction: true,
    }));
  }
}

@Reducer(reducer, {
  articles: [] as unknown[],
  performingAction: false,
})
class MyReduceComponent implements ReducerComponentType<StateType, ActionType> {
  dispatch$!: DispatchType<ActionType<any>>;
  state$!: Observable<StateType>;

  dispatchStartAction() {
    this.dispatch$({ type: 'start' });
  }
}

describe('Test hooks component decorator', () => {
  let instance: MyComponent;
  let reduceComponentInstance: MyReduceComponent;
  const _destroy$ = new Subject<void>();

  beforeEach(() => {
    instance = new MyComponent();
    reduceComponentInstance = new MyReduceComponent();
  });

  afterEach(() => {
    _destroy$.next();
  });

  it('should test that component has an initial state', async () => {
    await firstValueFrom(
      instance.state$.pipe(
        tap((state) => {
          expect(state.performingAction).toBe(false);
          expect(state.articles).toEqual([]);
        })
      )
    );
  });

  it('should test that setArticles updates the articles array of the component state', async () => {
    let changes: StateType[] = [];
    instance.state$
      .pipe(
        scan((carry, current) => {
          carry = [...carry, current];
          return carry;
        }, changes),
        takeUntil(_destroy$)
      )
      .subscribe((values) => (changes = values));
    instance.setArticles(
      { name: 'Oranges', qt: 29 },
      { name: 'Lemon', qt: 120 }
    );
    instance.setArticles({ name: 'Bananas', qt: 10 });
    expect(true).toBe(true);
    await firstValueFrom(
      interval(1000).pipe(
        first(),
        tap(() => {
          expect(changes[0].articles).toEqual([]);
          expect(changes[1].articles).toEqual([
            { name: 'Oranges', qt: 29 },
            { name: 'Lemon', qt: 120 },
          ]);
          expect(changes[2].articles).toEqual([
            { name: 'Oranges', qt: 29 },
            { name: 'Lemon', qt: 120 },
            { name: 'Bananas', qt: 10 },
          ]);
        })
      )
    );
  });

  it('should test that performAction updates performingAction property of the component state', async () => {
    let changes: StateType[] = [];
    instance.state$
      .pipe(
        scan((carry, current) => {
          carry = [...carry, current];
          return carry;
        }, changes),
        takeUntil(_destroy$)
      )
      .subscribe((values) => (changes = values));
    instance.performAction();
    await firstValueFrom(
      interval(1000).pipe(
        first(),
        tap(() => {
          expect(changes[0].performingAction).toBe(false);
          expect(changes[changes.length - 1].performingAction).toBe(true);
        })
      )
    );
  });

  it('should test that dispatchStartAction updates performingAction property of the component state', async () => {
    let changes: StateType[] = [];
    reduceComponentInstance.state$
      .pipe(
        scan((carry, current) => {
          carry = [...carry, current];
          return carry;
        }, changes),
        takeUntil(_destroy$)
      )
      .subscribe((values) => (changes = values));
    reduceComponentInstance.dispatchStartAction();
    await firstValueFrom(
      interval(1000).pipe(
        first(),
        tap(() => {
          expect(changes[0].performingAction).toBe(false);
          expect(changes[1].performingAction).toBe(true);
        })
      )
    );
  });
});
