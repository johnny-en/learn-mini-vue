import { h } from "../../dist/guide-mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
  // template
  render() {
    window.self = this;
    return h(Foo, { count: 1 });
  },
  setup() {},
};
