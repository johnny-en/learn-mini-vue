import { isObject, isOn } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用 patch 方法

  patch(vnode, container);
}

function patch(vnode: any, container: any) {
  if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
    // if vnode -> element -> 处理 element
    processElement(vnode, container);
  } else if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // if vnode -> 组件 -> 处理组件
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  const el = (vnode.el = document.createElement(vnode.type));

  // 处理 children: string | array
  const { children, shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el);
  }

  // 处理 props
  const { props } = vnode;
  for (const key in props) {
    const value = props[key];
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else {
      el.setAttribute(key, value);
    }
  }

  container.append(el);
}

function mountChildren(children: any[], container: any) {
  children.forEach((vnode) => {
    patch(vnode, container);
  });
}

function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container: any) {
  const instance = createComponentInstance(initialVNode);
  setupComponent(instance);
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container: any) {
  const subTree = instance.render.call(instance.proxy);

  patch(subTree, container);

  // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
  initialVNode.el = subTree.el;
}
