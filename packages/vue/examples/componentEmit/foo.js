import { h } from "../../dist/guide-mini-vue.esm.js";

export const Foo = {
  render() {
    return h(
      "button",
      {
        onClick: this.add,
      },
      "add"
    );
  },
  setup(props, { emit }) {
    const add = () => {
      console.log("emit add");
      emit("add", 1, 2);
      emit("add-foo");
    };
    return {
      add,
    };
  },
};
