import { extend } from "../shared";
import {
  activeEffect,
  setActiveEffect,
  shouldTrack,
  setShouldTrack,
  targetMap,
} from "./effect_variable";

export class ReactiveEffect {
  private _fn: any;
  public scheduler?: Function;
  public onStop?: Function;
  deps = [];
  active = true;

  constructor(fn, scheduler) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    // 执行 stop 后不在进行收集依赖
    if (!this.active) {
      return this._fn();
    }

    // 收集依赖
    setShouldTrack(true);
    setActiveEffect(this);

    const result = this._fn();
    setShouldTrack(false);

    return result;
  }

  stop() {
    if (this.active) {
      cleanUpEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false; // 记录 effect 是否完成清除，防止重复执行
    }
  }
}

function cleanUpEffect(effect) {
  effect.deps.forEach((dep: any) => dep.delete(effect));
  effect.deps.length = 0;
}

export function isTracking() {
  return shouldTrack() && activeEffect() !== undefined;
}

export function track(target, key) {
  if (!isTracking()) return;

  let depsMap = targetMap().get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap().set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  trackEffects(dep);
}

export function trackEffects(dep) {
  if (dep.has(activeEffect())) return;
  dep.add(activeEffect());
  activeEffect().deps.push(dep);
}

export function trigger(target, key) {
  const depsMap = targetMap().get(target);
  const dep = depsMap.get(key);
  triggerEffect(dep);
}

export function triggerEffect(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options);
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
