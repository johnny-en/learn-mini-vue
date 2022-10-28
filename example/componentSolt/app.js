import { h } from "../../lib/mini-vue.esm.js";
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
        footer: () => [h("div", null, "footer1"), h("div", null, "footer2")],
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
