import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  // 外部的自定义渲染接口
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: HostInsert,
  } = options;

  function render(vnode, container) {
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

  /**
   * 自定义渲染器
   * 将之前在这里处理 dom 的逻辑（创建元素，props，插入元素）抽离出去
   * 对外提供接口，由外部来实现
   */
  function mountElement(vnode: any, container: any, parentComponent) {
    const el = (vnode.el = hostCreateElement(vnode.type));

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
      hostPatchProp(el, key, value);
    }

    HostInsert(el, container);
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

  return {
    createApp: createAppAPI(render),
  };
}
