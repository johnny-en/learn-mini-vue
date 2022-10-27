import { extend, isObject } from "../shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

function getter(isReadonly = false, isShallow = false) {
  return function get(target, key) {
    const result = Reflect.get(target, key);

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }

    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    if (isShallow) {
      return result;
    }

    if (isObject(result)) {
      return isReadonly ? readonly(result) : reactive(result);
    }

    if (!isReadonly) {
      // 收集依赖
      track(target, key);
    }
    return result;
  };
}

function setter() {
  return function set(target, key, value) {
    const result = Reflect.set(target, key, value);
    // 触发依赖
    trigger(target, key);
    return result;
  };
}

export const mutableHandlers = createMutableHandlers();
function createMutableHandlers() {
  return {
    get: getter(),
    set: setter(),
  };
}

export const readonlyHandlers = createReadonlyHandlers();
function createReadonlyHandlers() {
  return {
    get: getter(true),
    set(target, key, value) {
      console.warn(`The [${key}] set on failed, target is an readonly`);
      return true;
    },
  };
}

export const shallowReadonlyHandlers = createShallowReadonlyHandlers();
function createShallowReadonlyHandlers() {
  return extend({}, readonlyHandlers, {
    get: getter(true, true),
  });
}
