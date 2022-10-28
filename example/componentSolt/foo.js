import { h, renderSlots } from "../../lib/mini-vue.esm.js";

export const Foo = {
  render() {
    const foo = h("p", {}, "foo");
    const title = "vue";
    return h("div", {}, [
      renderSlots(this.$slots, "header", {
        title,
      }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
  setup() {},
};
