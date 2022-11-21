import { createRenderer } from "../../dist/guide-mini-vue.esm.js";
import { App } from "./App.js";

let app = new PIXI.Application({
  width: 500,
  height: 500,
  backgroundColor: "#42b983",
});

document.body.appendChild(app.view);

const renderer = createRenderer({
  createElement(type) {
    if (type === "text") {
      const text = new PIXI.Text();
      return text;
    }
  },
  patchProp(el, key, value) {
    el[key] = value;
  },
  insert(el, parent) {
    parent.addChild(el);
  },
});

renderer.createApp(App).mount(app.stage);
