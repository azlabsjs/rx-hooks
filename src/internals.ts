import {
  distinctUntilChanged,
  from,
  Observable,
  ObservableInput,
  Subject,
  takeUntil,
  tap,
  observeOn,
  animationFrameScheduler,
  of,
  isObservable,
  asyncScheduler,
} from 'rxjs';
import { RecordKey, SourceArgType, UnknownType } from './types';

function arrayPad<T extends Array<UnknownType>>(
  arr: T,
  size: number,
  fill = undefined
) {
  return arr.concat(Array(size - arr.length).fill(fill)) as T;
}

//#region internal.ts

// @internal
function completeSubjectOnInstance(instance: UnknownType, prop: symbol) {
  if (instance[prop]) {
    instance[prop].next();
    instance[prop].complete();
    // We also have to re-assign this property thus in the future
    // we will be able to create new subject on the same instance.
    instance[prop] = undefined;
  }
}

// @internal
function getSymbol<T>(method?: keyof T): symbol {
  if (typeof method === 'string') {
    return Symbol(`__unsubscribe__${method}`);
  } else {
    return Symbol('__unsubscribe__');
  }
}

//@internal
export function getSafeProperty<T>(objWithPropertyToExtract: T): string {
  for (const key in objWithPropertyToExtract) {
    if (objWithPropertyToExtract[key] === (getSafeProperty as UnknownType)) {
      return key;
    }
  }
  throw Error('Could not find renamed property on target object.');
}
export const __NG_PIPE_DEF__ = getSafeProperty({ ɵpipe: getSafeProperty });

/** @internal */
export interface NgPipeType extends NonNullable<unknown> {
  ɵpipe: UnknownType;
}

export function isPipe(target: UnknownType): target is NgPipeType {
  return !!target[__NG_PIPE_DEF__];
}

//@internal
export function createSubjectOnInstance(instance: UnknownType, symbol: symbol) {
  if (!instance[symbol]) {
    instance = Object.defineProperty(instance, symbol, {
      value: new Subject<void>(),
      // We make the subject writable to make it possible to unset it
      // value when completeSubjectOnInstance() is called
      writable: true,
      configurable: false,
    });
  }
  return instance;
}

export function createCompletableInstance(
  symbol: symbol,
  callback: ((...args: UnknownType) => unknown) | undefined
) {
  let instance = (...values: UnknownType) => {
    if (callback && typeof callback === 'function') {
      callback(...values);
    }
    completeSubjectOnInstance(instance, symbol);
  };
  instance = Object.defineProperty(instance, 'complete', {
    value: (...args: UnknownType) => {
      instance(...args);
    },
  });
  return instance;
}

// @internal
function wrapClassMethod(instance: UnknownType, method: string, symbol: symbol) {
  const original: (...args: UnknownType) => unknown | null | undefined =
    instance[method] || undefined;
  return (...args: UnknownType) => {
    if (null !== original && typeof original !== 'undefined') {
      original(...args);
    }
    // Run observable cleanup after class destruction
    completeSubjectOnInstance(instance, symbol);
    // Reset the method back after calls
    instance[method] = original;
  };
}

// @internal
function decorateClassMethod<T extends Record<keyof T, UnknownType> = UnknownType>(
  instance: T,
  symbol: symbol,
  method?: keyof T
) {
  if (typeof method === 'string') {
    instance[method] = wrapClassMethod(instance, method, symbol) as UnknownType;
  } else if (isPipe(instance)) {
    wrapPipe(instance, symbol);
  } else {
    wrapInjectable(instance, symbol);
  }
  return instance;
}

// @internal
function wrapPipe(type: NgPipeType, symbol: symbol) {
  const def = type.ɵpipe;
  def['onDestroy'] = wrapClassMethod(def, 'onDestroy', symbol);
}

// @internal
function wrapInjectable(type: UnknownType, symbol: symbol): void {
  type['ngOnDestroy'] = wrapClassMethod(type, 'ngOnDestroy', symbol);
}

// @internal
export function createEffect<
  T,
  TInstance = Record<RecordKey, UnknownType>,
  TObservable extends unknown[] = unknown[]
>(
  source:
    | ObservableInput<T>
    | ((...value: SourceArgType<typeof args, TObservable>) => void),
  args?:
    | ((...p: unknown[]) => unknown)
    | [TInstance]
    | [TInstance, keyof TInstance]
    | [TInstance, keyof TInstance, Observable<TObservable> | TObservable]
    | [TInstance, Observable<TObservable> | TObservable]
    | Observable<TObservable>,
  deps?: Observable<TObservable> | TObservable
) {
  const isArgsTuple = Array.isArray(args);
  // eslint-disable-next-line prefer-const
  let [instance, method, _deps, callback] = isArgsTuple
    ? [...arrayPad(args, 3), undefined]
    : isObservable(args)
    ? [undefined, undefined, args, undefined]
    : [undefined, undefined, deps, args ?? (() => undefined)];

  const __deps = Array.isArray(_deps)
    ? of(_deps)
    : (_deps as Observable<TObservable>);

  // Create a
  const symbol = getSymbol<TInstance>(method as keyof TInstance);
  if (typeof instance === 'undefined' || instance === null) {
    // If the instance is undefined, we assume method is used
    // outside the scope of a class therefore it must be completed
    // manually  by the developper
    instance = createCompletableInstance(symbol, callback) as UnknownType as TInstance;
  }
  instance = createSubjectOnInstance(instance, symbol);
  if (isArgsTuple && typeof instance !== 'undefined') {
    // **Note**
    // Implementation support angular component, injectable and directive
    // class ngOnDestroy be default
    instance = decorateClassMethod(instance, symbol, method as keyof TInstance);
  }
  if (instance === null || typeof instance === 'undefined') {
    return;
  }
  const internal$: Observable<unknown> =
    typeof source === 'function'
      ? __deps.pipe(
          distinctUntilChanged(),
          tap((state) => source(...state)),
          observeOn(
            typeof requestAnimationFrame === 'function'
              ? animationFrameScheduler
              : asyncScheduler
          )
        )
      : from(source);
  internal$
    .pipe(takeUntil((instance as UnknownType)[symbol as UnknownType] as Subject<void>))
    .subscribe();
  // Creates a completable object which when call
  // will unsubscribe from the internal observable
  return callback ? (instance as UnknownType) : undefined;
}
//#endregion internal.ts
