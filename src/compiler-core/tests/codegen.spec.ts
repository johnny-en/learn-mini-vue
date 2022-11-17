import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import { transformText } from "../src/transforms/tranformText";
import { transformElement } from "../src/transforms/transformElement";
import { transformExpression } from "../src/transforms/transformExpression";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hello");

    transform(ast);
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  it("interpolation", () => {
    const ast = baseParse("{{message}}");

    transform(ast, {
      nodeTransforms: [transformExpression],
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  it("element", () => {
    const ast: any = baseParse("<div>hello,{{message}}</div>");

    transform(ast, {
      nodeTransforms: [transformExpression, transformElement, transformText],
    });
    // console.log("----- ast -----", ast, ast.codegenNode.children);
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });
});
