import { isOn } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";

export function render(vnode, container) {
  // 调用 patch 方法

  patch(vnode, container, null);
}

function patch(vnode: any, container: any, parentComponent) {
  switch (vnode.type) {
    case Fragment:
      processFragment(vnode, container, parentComponent);
      break;
    case Text:
      processText(vnode, container);
      break;
    default:
      if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
        // if vnode -> element -> 处理 element
        processElement(vnode, container, parentComponent);
      } else if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // if vnode -> 组件 -> 处理组件
        processComponent(vnode, container, parentComponent);
      }
      break;
  }
}

function processText(vnode: any, container: any) {
  const { children } = vnode;
  const textNode = document.createTextNode(children);
  container.append(textNode);
}

function processFragment(vnode: any, container: any, parentComponent) {
  mountChildren(vnode, container, parentComponent);
}

function processElement(vnode: any, container: any, parentComponent) {
  mountElement(vnode, container, parentComponent);
}

function mountElement(vnode: any, container: any, parentComponent) {
  const el = (vnode.el = document.createElement(vnode.type));

  // 处理 children: string | array
  const { children, shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el, parentComponent);
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

function mountChildren(vnode: any, container: any, parentComponent) {
  vnode.children.forEach((vnode) => {
    patch(vnode, container, parentComponent);
  });
}

function processComponent(vnode: any, container: any, parentComponent) {
  mountComponent(vnode, container, parentComponent);
}

function mountComponent(initialVNode: any, container: any, parentComponent) {
  const instance = createComponentInstance(initialVNode, parentComponent);
  setupComponent(instance);
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container: any) {
  const subTree = instance.render.call(instance.proxy);

  patch(subTree, container, instance);

  // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
  initialVNode.el = subTree.el;
}
