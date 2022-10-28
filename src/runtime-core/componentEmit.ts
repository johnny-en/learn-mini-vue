import { camelize, toHandlerKey } from "../shared/index";

export function emit(instance, event, ...args) {
  const { props } = instance;

  /**
   * 转换 event
   * add -> onAdd | add-foo -> onAddFoo
   *  */
  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  if (handler) {
    handler(...args);
  }
}
