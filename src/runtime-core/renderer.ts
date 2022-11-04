import { effect } from "../reactivity/effect";
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

    patch(null, vnode, container, null);
  }

  /**
   *
   * @param n1 老的 vnode：n1 不存在组件创建，存在组件更新
   * @param n2 新的 vnode
   * @param container
   * @param parentComponent
   */
  function patch(n1, n2: any, container: any, parentComponent) {
    switch (n2.type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (n2.shapeFlag & ShapeFlags.ELEMENT) {
          // if vnode -> element -> 处理 element
          processElement(n1, n2, container, parentComponent);
        } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // if vnode -> 组件 -> 处理组件
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    mountChildren(n2, container, parentComponent);
  }

  function processElement(n1, n2: any, container: any, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }

  function patchElement(n1, n2, contaniner) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);
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
      patch(null, vnode, container, parentComponent);
    });
  }

  function processComponent(n1, n2: any, container: any, parentComponent) {
    mountComponent(n2, container, parentComponent);
  }

  function mountComponent(vnode: any, container: any, parentComponent) {
    const instance = createComponentInstance(vnode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, vnode, container);
  }

  function setupRenderEffect(instance: any, initialVNode, container: any) {
    /**
     * 使用 effect 包裹是因为要在这里做依赖收集操作
     * 因组件 render 函数中的响应对象的 get 操作被触发时，会触发依赖收集
     * 响应对象数据更新时，会触发收集的依赖
     */
    effect(() => {
      if (!instance.isMounted) {
        // 组件初始化
        const subTree = (instance.subTree = instance.render.call(
          instance.proxy
        ));
        console.log("init", subTree);

        patch(null, subTree, container, instance);

        // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
        // 组件更新
        console.log("update");
        const subTree = instance.render.call(instance.proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;

        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
