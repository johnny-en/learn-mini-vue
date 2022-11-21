import { h } from "../../dist/guide-mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
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
  setup() {},
};
