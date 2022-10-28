import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
  // template
  render() {
    window.self = this;
    return h("div", {}, [
      h(Foo, {
        onAdd(a, b) {
          console.log("emit onAdd", a, b);
        },
        onAddFoo() {
          console.log("emit onAddFoo");
        },
      }),
    ]);
  },
  setup() {
    const msg = "mini-vue";
    return {
      msg,
    };
  },
};
