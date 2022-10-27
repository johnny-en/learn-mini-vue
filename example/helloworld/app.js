import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
  // template
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        class: ["skyblue", "root"],
        onClick(e) {
          console.log("click", e);
        },
        onMouseup() {
          console.log("mouseup");
        },
      },
      [h(Foo, { count: 1 })]
      // `hello ${this.msg}`
    );
  },
  setup() {
    const msg = "mini-vue";
    return {
      msg,
    };
  },
};
