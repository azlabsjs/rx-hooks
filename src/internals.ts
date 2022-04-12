import { from, ObservableInput, Subject, takeUntil } from 'rxjs';

// @internal
function completeSubjectOnInstance(instance: any, prop: symbol) {
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
    if (objWithPropertyToExtract[key] === (getSafeProperty as any)) {
      return key;
    }
  }
  throw Error('Could not find renamed property on target object.');
}
export const __NG_PIPE_DEF__ = getSafeProperty({ ɵpipe: getSafeProperty });

export interface NgPipeType extends Object {
  ɵpipe: any;
}

export function isPipe(target: any): target is NgPipeType {
  return !!target[__NG_PIPE_DEF__];
}

//@internal
export function createSubjectOnInstance(instance: any, symbol: symbol) {
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
  callback: ((...args: any[]) => unknown) | undefined
) {
  let instance = (...values: unknown[]) => {
    if (callback && typeof callback === 'function') {
      callback(...values);
    }
    completeSubjectOnInstance(instance, symbol);
  };
  instance = Object.defineProperty(instance, 'complete', {
    value: () => {
      instance();
    },
  });
  return instance;
}

// @internal
function wrapClassMethod(instance: any, method: string, symbol: symbol) {
  const original: (...args: any[]) => unknown | null | undefined =
    instance[method] || undefined;
  return (...args: any[]) => {
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
function decorateClassMethod(instance: any, symbol: symbol, method?: string) {
  if (typeof method === 'string') {
    instance[method] = wrapClassMethod(instance, method, symbol);
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
function wrapInjectable(type: any, symbol: symbol): void {
  type['ngOnDestroy'] = wrapClassMethod(type, 'ngOnDestroy', symbol);
}

// @internal
export function createEffect<T>(
  source: ObservableInput<T>,
  args:
    | [Record<string, any>, string]
    | [Record<string, any>]
    | ((...p: any[]) => unknown)
    | undefined
) {
  // eslint-disable-next-line prefer-const
  let [instance, method, callback] = Array.isArray(args)
    ? [...args, undefined]
    : [null, undefined, args ?? (() => undefined)];
  // Create a
  const symbol = getSymbol(method);
  if (typeof instance === 'undefined' || instance === null) {
    // If the instance is undefined, we assume method is used
    // outside the scope of a class therefore it must be completed
    // manually  by the developper
    instance = createCompletableInstance(symbol, callback);
  }
  instance = createSubjectOnInstance(instance, symbol);
  if (Array.isArray(args)) {
    // **Note**
    // Implementation support angular component, injectable and directive
    // class ngOnDestroy be default
    instance = decorateClassMethod(instance, symbol, method);
  }
  if (instance === null || typeof instance === 'undefined') {
    return;
  }
  from(source)
    .pipe(takeUntil(instance[symbol as any] as Subject<void>))
    .subscribe();
  // Creates a completable object which when call
  // will unsubscribe from the internal observable
  return callback ? (instance as any) : undefined;
}
