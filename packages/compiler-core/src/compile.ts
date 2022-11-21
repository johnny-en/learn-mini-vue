import { generate } from "./codegen";
import { baseParse } from "./parse";
import { transform } from "./transform";
import { transformText } from "./transforms/tranformText";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";

export function baseCompile(template) {
  const ast: any = baseParse(template);

  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  });
  return generate(ast);
}
