// @internal
export function completeSubject(instance: any, prop: symbol) {
  if (instance[prop]) {
    instance[prop].next();
    instance[prop].complete();
    // We also have to re-assign this property thus in the future
    // we will be able to create new subject on the same instance.
    instance[prop] = undefined;
  }
}

// @internal
export function getSymbol<T>(method?: keyof T): symbol {
  if (typeof method === 'string') {
    return Symbol(`__unsubscribe__${method}`);
  } else {
    return Symbol('__unsubscribe__');
  }
}
