import { track, trigger } from "./effect";

function getter(isReadonly = false) {
  return function get(target, key) {
    const result = Reflect.get(target, key);
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

const get = getter();
const set = setter();
export const mutableHandlers = {
  get,
  set,
};

const readonlyGet = getter(true);
export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`The ${key} set on failed, target is readonly`);
    return true;
  },
};
