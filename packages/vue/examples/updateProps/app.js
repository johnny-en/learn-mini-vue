import { h, ref } from "../../dist/guide-mini-vue.esm.js";

export const App = {
  render() {
    return h(
      "div",
      {
        id: "root",
        ...this.props,
      },
      [
        h("div", null, "count:" + this.count),
        h(
          "div",
          null,
          "props:" +
            JSON.stringify(this.props, function (k, v) {
              if (v === undefined) {
                return "undefined";
              }
              return v;
            })
        ),
        h(
          "button",
          {
            onClick: this.onClick,
          },
          "count++"
        ),
        h(
          "button",
          {
            onClick: this.onChangePropsDemo1,
          },
          "props.foo 值修改"
        ),
        h(
          "button",
          {
            onClick: this.onChangePropsDemo2,
          },
          "props.foo 值修改为 undefined"
        ),
        h(
          "button",
          {
            onClick: this.onChangePropsDemo3,
          },
          "props 值修改"
        ),
      ]
    );
  },
  setup() {
    const count = ref(0);
    const onClick = () => {
      count.value++;
    };

    const props = ref({ foo: "foo", bar: "bar" });
    // 值改变了，更新值
    const onChangePropsDemo1 = () => {
      props.value.foo = "foo";
    };
    // 值为 null | undefined 时删除属性
    const onChangePropsDemo2 = () => {
      props.value.foo = undefined;
    };
    // 旧属性不存在，删除属性
    const onChangePropsDemo3 = () => {
      props.value = {
        foo: "foo",
      };
    };

    return {
      count,
      props,
      onClick,
      onChangePropsDemo1,
      onChangePropsDemo2,
      onChangePropsDemo3,
    };
  },
};
