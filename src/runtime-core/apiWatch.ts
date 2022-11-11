import { ReactiveEffect } from "../reactivity/effect";
import { queuePreFlushCbs } from "./scheduler";

// 组件渲染之前执行
export function watchEffect(source) {
  function job() {
    effect.run();
  }

  let cleanup;
  function onCleanup(fn) {
    cleanup = effect.onStop = () => {
      fn();
    };
  }

  function getter() {
    if (cleanup) {
      cleanup();
    }
    source(onCleanup);
  }

  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCbs(job);
  });

  effect.run();

  return () => {
    effect.stop();
  };
}
