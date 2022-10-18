import { track, trigger } from "./effect";

export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      const result = Reflect.get(raw, key);

      track(target, key);
      return result;
    },
    set(target, key, value) {
      const result = Reflect.set(raw, key, value);

      // TODO 触发依赖
      trigger(target, key);
      return result;
    },
  });
}
