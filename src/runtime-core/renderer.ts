import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { shouldUpdateComponent } from "./componentUpdateUtils";
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
       * moved: 新的节点移动的开关
       * maxNewIndexSoFar: 记录新的节点序列的最后一个节点的索引
       *                   当遍历的新节点小于记录的索引时，需要移动节点
       *                   因为索引递增是稳定的节点，不稳定的需要移动
       * ---------------
       * a b (c d e) f g
       *     [3 4 5]
       * a b (e c d) f g
       *     [5 3 4]
       * ---------------
       **/
      let s1 = i;
      let s2 = i;
      let patched = 0;
      let moved = false;
      let maxNewIndexSoFar = 0;
      const toBePatched = e2 - s2 + 1;
      const keyToNewIndexMap = new Map();
      const newIndexToOldIndexMap = new Array(toBePatched);
      // 初始化为 0 , 新值在老的里面不存在
      for (let i = 0; i < toBePatched; i++) {
        newIndexToOldIndexMap[i] = 0;
      }

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
          // 优化
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          /**
           * 设置新节点在老节点中的映射序列
           * ---------------
           * a b (c d e) f g
           *     [3 4 5]
           * a b (e c d) f g
           *     [5 3 4]
           * ---------------
           * i + 1 是因为 i 有可能是 0
           */
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }

      /**
       * 处理移动
       * 执行最长递增子序列函数，获取稳定的节点序列
       * 通过 moved 进行优化，对需要移动的节点，执行 LIS 算法
       */
      const increasingNewIndexSequence = moved
        ? IndexOfLIS(newIndexToOldIndexMap)
        : [];
      let j = increasingNewIndexSequence.length - 1;

      /**
       * 用新节点中的稳定的节点序列与老的节点序列比较，移动不稳定的节点
       * 这里使用倒序来处理
       * 因为插入节点使用的是 insertBefore 要在稳定的节点前插入
       * 有稳定的元素 -> 插入到稳定元素之前
       * 无稳定的元素 -> 插入到父节点的子节点列表的末尾
       * -----------------------------
       *      a b | (c d e) | f g
       *            [0,1,2]
       *      a b | (e d c) | f g
       *            [2,1,0]
       * 稳定的节点 |        | 稳定的节点
       * [0] 最长递增子序列 -> [2,1] 需要移动
       * -----------------------------
       *      a b | (c d e)
       *            [0,1,2]
       *      a b | (e c d)
       *            [2,0,1]
       * [0,1] 最长递增子序列 -> [2] 需要移动
       * 稳定的节点 |
       * -----------------------------
       */
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
        if (newIndexToOldIndexMap[i] === 0) {
          // 创建节点
          // 老节点不存在，新节点存在
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            console.log("移动位置");
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
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
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor);
    } else {
      updateComponent(n1, n2);
    }
  }

  function updateComponent(n1, n2) {
    // 更新组件实现
    const instance = (n2.component = n1.component);
    // prop 的值更新时，更新组件
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }

  function mountComponent(vnode: any, container: any, parentComponent, anchor) {
    // 保存组件实例
    const instance = (vnode.component = createComponentInstance(
      vnode,
      parentComponent
    ));
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
    instance.update = effect(() => {
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
        const { next, vnode } = instance;
        if (next) {
          next.el = vnode.el;

          updateComponentPreRender(instance, next);
        }
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

function updateComponentPreRender(instance, nextVNode) {
  instance.vnode = nextVNode;
  instance.next = null;
  instance.props = nextVNode.props;
}

/**
 * 最长递增子序列(Longest Increasing Subsequence)
 * [10,9,2,5,3,7] -> [2,3,7] 最长递增序列 -> [2,4,5] 最长递增序列的下标
 * 时间复杂度：O(nlog(n))
 * @param nums: number[]
 * @returns: number[] 最长递增子序列的下标
 */
function IndexOfLIS(nums) {
  let n = nums.length;
  if (n === 0) return [];
  let arr: number[] = [];
  arr[0] = 0;
  for (let i = 1; i < n; i++) {
    /**
     * 值为 0 表示不需要移动的节点
     * 因为该节点在老的里没有，新的里面存在，需要新增的节点
     * */
    if (nums[i] === 0) {
      continue;
    }
    if (nums[arr[i - 1]] < nums[i]) {
      arr.push(i);
    } else {
      let l = 0;
      let r = arr.length - 1;
      let flag = -1;
      while (l <= r) {
        let mid = (l + r) >> 1;
        if (nums[arr[mid]] < nums[i]) {
          flag = mid;
          l = mid + 1;
        } else {
          r = mid - 1;
        }
      }
      if (nums[arr[flag + 1]] !== nums[i]) {
        arr[flag + 1] = i;
      }
    }
  }
  return arr;
}
