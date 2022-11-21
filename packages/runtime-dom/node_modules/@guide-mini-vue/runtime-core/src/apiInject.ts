import { currentInstance } from "./variable/component";

export function provide(key, value) {
  const instance: any = currentInstance();
  if (instance) {
    let { provides } = instance;
    const parentProvides = instance.parent.provides;

    if (provides === parentProvides) {
      /**
       * 当前组件的 provides 等于父级的 provides 时
       * 将父级的 provides 作为当前组件 provides 的原型
       * */
      provides = instance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  const instance: any = currentInstance();
  if (instance) {
    const parentProvides = instance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
