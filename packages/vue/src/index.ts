// mini-vue 出口
export * from "@guide-mini-vue/runtime-dom";
import { baseCompile } from "@guide-mini-vue/compiler-core";
import * as runtimeDom from "@guide-mini-vue/runtime-dom";
import { registerRuntimeCompiler } from "@guide-mini-vue/runtime-dom";

/**
 * 将 template 编译成 render 函数
 */
function compileToFunction(template) {
  const { code } = baseCompile(template);

  /**
   * 因为 render 需要调用 runtime-dom 中的方法
   * 所以将 runtime-dom 做为参数对象传递给这个函数
   */
  const render = new Function("Vue", code)(runtimeDom);
  return render;
}
// 将 compile-core 生成的 render 函数传递给 runtime-core
registerRuntimeCompiler(compileToFunction);
