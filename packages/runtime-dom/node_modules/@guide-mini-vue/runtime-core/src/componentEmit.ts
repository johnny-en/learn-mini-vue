import { camelize, toHandlerKey } from "@guide-mini-vue/shared";

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
