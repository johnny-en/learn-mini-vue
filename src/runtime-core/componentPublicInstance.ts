import { hasOwn } from "../shared/index";

const publicPropertiesMap = {
  $el: (instance) => instance.vnode.el,
};
export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance;

    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    const publicProperties = publicPropertiesMap[key];
    if (publicProperties) {
      return publicProperties(instance);
    }
  },
};
