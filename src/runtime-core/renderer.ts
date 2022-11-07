import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  // 外部的自定义渲染接口
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container) {
    // 调用 patch 方法

    patch(null, vnode, container, null, null);
  }

  /**
   *
   * @param n1 老的 vnode：n1 不存在组件创建，存在组件更新
   * @param n2 新的 vnode
   * @param container
   * @param parentComponent
   */
  function patch(n1, n2: any, container: any, parentComponent, anchor) {
    switch (n2.type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (n2.shapeFlag & ShapeFlags.ELEMENT) {
          // if vnode -> element -> 处理 element
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // if vnode -> 组件 -> 处理组件
          processComponent(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processFragment(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    mountChildren(n2.children, container, parentComponent, anchor);
  }

  function processElement(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }

  function patchElement(n1, n2, contaniner, parentComponent, anchor) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);

    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    /**
     * 挂载 el 是在创建元素 mountElement 阶段赋值的
     * 在 setupRenderEffect 进入更新阶段时，新的 vnode.el 还未有赋值
     * 所以在这给 新的 vnode.el 赋值
     * */
    const el = (n2.el = n1.el);

    patchChildren(n1, n2, el, parentComponent, anchor);
    patchPorps(el, oldProps, newProps);
  }

  function patchChildren(n1: any, n2: any, container, parentComponent, anchor) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧节点是数组，新节点是文本 (array -> text)
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 删除旧的 children
        unmountChildren(c1);
      }
      // 旧节点是数组 (array -> text) | 旧节点的文本 !== 新节点的文本 (text -> text)
      if (c1 !== c2) {
        // 更新 children -> text
        hostSetElementText(container, c2);
      }
    } else {
      // 旧节点是文本，新节点是数组 (text -> array)
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "");
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // 旧节点是数组，新节点是数组 (array -> array)
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  // 双端对比 diff
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length;
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    function isSomeVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 1 左侧比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];

      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }

    // 2 右侧比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];

      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }

      e1--;
      e2--;
    }

    if (i > e1) {
      if (i <= e2) {
        // 新的比老的多，创建新增的节点
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 删除节点
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      /**
       * 中间对比
       * s1，s2: 中间区间的起始位置
       * patched：已经处理新节点的数量
       * toBePatched: 记录新节点需要处理的数量
       **/
      let s1 = i;
      let s2 = i;
      let patched = 0;
      const toBePatched = e2 - s2 + 1;
      const keyToNewIndexMap = new Map();

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];

        // 当老节点大与新节点数量，并且新节点已经处理完成，直接删除老节点
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }

        let newIndex;
        if (prevChild.key != null) {
          // 使用 key 快速查找老节点是否存在于新节点中
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        if (newIndex === undefined) {
          hostRemove(prevChild.el);
        } else {
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      hostRemove(el);
    }
  }

  function patchPorps(el, oldProps: any, newProps: any) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];

        if (prevProp !== newProps) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }

      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  /**
   * 自定义渲染器
   * 将之前在这里处理 dom 的逻辑（创建元素，props，插入元素）抽离出去
   * 对外提供接口，由外部来实现
   */
  function mountElement(vnode: any, container: any, parentComponent, anchor) {
    const el = (vnode.el = hostCreateElement(vnode.type));

    // 处理 children: string | array
    const { children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent, anchor);
    }

    // 处理 props
    const { props } = vnode;
    for (const key in props) {
      const value = props[key];
      hostPatchProp(el, key, null, value);
    }

    hostInsert(el, container, anchor);
  }

  function mountChildren(
    children: any,
    container: any,
    parentComponent,
    anchor
  ) {
    children.forEach((vnode) => {
      patch(null, vnode, container, parentComponent, anchor);
    });
  }

  function processComponent(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    mountComponent(n2, container, parentComponent, anchor);
  }

  function mountComponent(vnode: any, container: any, parentComponent, anchor) {
    const instance = createComponentInstance(vnode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, vnode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVNode,
    container: any,
    anchor
  ) {
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

        patch(null, subTree, container, instance, anchor);

        // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
        // 组件更新
        console.log("update");
        const subTree = instance.render.call(instance.proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;

        patch(prevSubTree, subTree, container, instance, anchor);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
