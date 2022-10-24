import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用 patch 方法

  patch(vnode, container);
}

function patch(vnode: any, container: any) {
  // if vnode -> 组件 -> 处理组件
  processComponent(vnode, container);

  // if vnode -> element -> 处理 element
}

function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container: any) {
  const instance = createComponentInstance(vnode);
  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance: any, container: any) {
  const subTree = instance.render();

  patch(subTree, container);
}
