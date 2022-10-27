import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { publicInstanceProxyHandlers } from "./componentPublicInstance";

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
  };
  return component;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  // initSlots
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  /**
   * 创建代理对象
   * 调用 render 时 call 创建的代理对象，作用域指向这个代理对象
   * 在 render 中，使用 this.xxx 获取 setup 返回的数据对象
   */
  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);

  const Component = instance.type;

  const { setup } = Component;

  if (setup) {
    // 只是首层 props 只读不可修改
    const setupResult = setup(shallowReadonly(instance.props));

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  /**
   * setupResult: function | object
   * function -> component render
   * object -> inject component
   * */
  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;

  if (Component.render) {
    instance.render = Component.render;
  }
}
