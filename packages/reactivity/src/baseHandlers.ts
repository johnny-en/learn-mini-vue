import { extend, isObject } from "@guide-mini-vue/shared";
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

    if (!isReadonly) {
      // get 的时候进行依赖收集
      track(target, key);
    }

    if (isObject(result)) {
      // 响应式对象内的嵌套对象依然是 proxy 对象
      return isReadonly ? readonly(result) : reactive(result);
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
