import { isObject } from "../shared/index";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";
import { targetMap } from "./effect_variable";

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

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

function creatActiveObject(target: any, baseHandlers) {
  if (!isObject(target)) {
    console.warn(`target: ${target} must be an object`);
    return target;
  }
  return new Proxy(target, baseHandlers);
}
