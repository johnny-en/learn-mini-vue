import { shallowReadonly, proxyRefs } from "@guide-mini-vue/reactivity";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { publicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
import {
  compiler,
  currentInstance,
  setCompiler,
  setCurrentInstance,
} from "./variable/component";

export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    isMounted: false,
    subTree: {},
    next: null, // 下次要更新的 vnode
    emit: () => {},
  };
  component.emit = emit.bind(null, component) as any;
  return component;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children);
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
    setCurrentInstance(instance);
    // 只是首层 props 只读不可修改
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  /**
   * setupResult: function | object
   * function -> 组件的 render 函数
   * object -> 注入到 component 上下文
   * */
  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult);
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;
  const compilerFn = compiler();
  if (compilerFn && !Component.render) {
    if (Component.template) {
      Component.render = compilerFn(Component.template);
    }
  }
  instance.render = Component.render;
}

export function getCurrentInstance() {
  return currentInstance();
}

export function registerRuntimeCompiler(_compiler) {
  setCompiler(_compiler);
}
