import { hasOwn } from "@guide-mini-vue/shared";

const publicPropertiesMap = {
  $el: (instance) => instance.vnode.el,
  $slots: (instance) => instance.slots,
  $props: (instance) => instance.props,
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
