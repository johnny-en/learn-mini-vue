import { parse } from "@babel/core";
import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}

function parseChildren(context): any {
  const nodes: any = [];

  let node;
  const s = context.source;
  if (s.startsWith("{{")) {
    node = parseInterpolation(context);
  } else if (s[0] === "<") {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context);
    }
  }
  nodes.push(node);

  return nodes;
}

function parseElement(context: any) {
  // 解析 tag
  const element = parseTag(context, TagType.Start);
  parseTag(context, TagType.End);
  console.log("----------------", context.source);
  return element;
}

// 解析 <div></div>
function parseTag(context: any, type: TagType) {
  // 匹配 <div | </div
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  // 删除处理完成的代码
  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
  };
}

// 解析 {{xxx}} 表达式
function parseInterpolation(context): any {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  // 获取 xxx 的长度
  const rawContentLength = closeIndex - openDelimiter.length;
  // 获取 xxx}}
  advanceBy(context, openDelimiter.length);
  // 获取 xxx
  const rawContent = context.source.slice(0, rawContentLength);
  const content = rawContent.trim();
  // 删除处理完成的 context.source
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return {
    children,
  };
}

function createParserContext(content: string): any {
  return {
    source: content,
  };
}
