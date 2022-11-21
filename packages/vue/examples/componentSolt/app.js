import { h, createTextVNode } from "../../dist/guide-mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
  // template
  render() {
    window.self = this;
    const app = h("div", {}, "app");

    // 具名 & 作用域 slots
    const foo = h(
      Foo,
      {},
      {
        header: ({ title }) => h("div", null, "header " + title),
        footer: () => [h("div", null, "footer"), createTextVNode("哈哈")],
      }
    );

    return h(
      "div",
      {
        id: "root",
      },
      [app, foo]
    );
  },
  setup() {},
};
