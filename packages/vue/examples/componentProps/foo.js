import { h } from "../../dist/guide-mini-vue.esm.js";

export const Foo = {
  render() {
    // 获取 props.count
    return h("div", {}, `foo: ${this.count}`);
  },
  setup(props) {
    // props.count
    console.log(props);

    // props is an shallowReadonly
    props.count++;
    console.log(props);
  },
};
