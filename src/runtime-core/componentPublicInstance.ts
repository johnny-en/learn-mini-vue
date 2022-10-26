const publicPropertiesMap = {
  $el: (instance) => instance.vnode.el,
};
export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState } = instance;
    if (key in setupState) {
      return setupState[key];
    }

    const publicProperties = publicPropertiesMap[key];
    if (publicProperties) {
      return publicProperties(instance);
    }
  },
};
