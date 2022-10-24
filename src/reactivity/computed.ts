import { extend } from "../shared";
import { ReactiveEffect } from "./effect";

class ComputedRefImpl {
  private _getter: Function;
  private _dirty: boolean = true;
  private _value: any;
  private _effect: ReactiveEffect;
  constructor(getter) {
    this._getter = getter;
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }
  get value() {
    // dirty 缓存 get value 值的锁，当 get value -> dirty false
    // 响应式对象的数据更新 -> 触发 effect 依赖 -> 执行 scheduler -> dirty true
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
