import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      /**
       * 将 component -> vnode
       * 所有的逻辑操作都是基于 vnode 做处理
       * */
      const vnode = createVNode(rootComponent);

      render(vnode, rootContainer);
    },
  };
}
