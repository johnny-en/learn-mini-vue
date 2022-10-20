import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw) {
  return creatActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return creatActiveObject(raw, readonlyHandlers);
}

export function shallowReadonly(raw) {
  return creatActiveObject(raw, shallowReadonlyHandlers);
}

export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

function creatActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
