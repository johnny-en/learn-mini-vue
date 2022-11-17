import { parse } from "@babel/core";
import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}
/**
 *
 * @param ancestors 祖先元素栈
 * @returns
 */
function parseChildren(context, ancestors): any {
  const nodes: any = [];

  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;
    if (s.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }
  return nodes;
}

function isEnd(context, ancestors) {
  // 结束标签
  const s = context.source;
  if (s.startsWith("</")) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }
  // sources 为空时
  return !context.source;
}

function parseText(context: any) {
  let endIndex = context.source.length;
  let endTokens = ["<", "{{"];

  // 查找 source 是否还包含有其他的类型
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    // 从左 -> 右处理找到的类型，所以 index < endIndex
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }

  // 获取 content
  const content = parseTextData(context, endIndex);

  // console.log("-----parseText context.source-----", content, context);
  return {
    type: NodeTypes.TEXT,
    content: content,
  };
}

function parseTextData(context: any, length) {
  const content = context.source.slice(0, length);

  // 清除处理完成的代码 context.source
  advanceBy(context, length);
  return content;
}

function parseElement(context: any, ancestors) {
  // 解析 tag
  const element: any = parseTag(context, TagType.Start);
  ancestors.push(element);
  // 解析 tag 后，source 可能还包含子级，所以，再次调用 parseChildren
  element.children = parseChildren(context, ancestors);
  ancestors.pop();

  // console.log("----- clear endTag -----", element.tag, context.source);
  // 清除结束节点
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`缺少结束标签:${element.tag}`);
  }

  // console.log("-----parseElement context.source-----", context.source);
  return element;
}

function startsWithEndTagOpen(source: any, tag: any) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

// 解析 <div></div>
function parseTag(context: any, type: TagType) {
  // 匹配 <[a-z] | </[a-z]
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  // 清除处理完成的代码 context.source
  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
  };
}

// 解析插值 {{xxx}} 表达式
function parseInterpolation(context): any {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  // 获取代表式 xxx 的长度
  const rawContentLength = closeIndex - openDelimiter.length;
  // 获取 xxx}}
  advanceBy(context, openDelimiter.length);
  // 获取 xxx 并且清除处理完成的 xxx
  const rawContent = parseTextData(context, rawContentLength);
  const content = rawContent.trim();
  // 此时 context.source = "}}" 清除 context.source = ""
  advanceBy(context, closeDelimiter.length);

  // console.log("-----parseInterpolation context.source-----", context.source);
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
    type: NodeTypes.ROOT,
  };
}

function createParserContext(content: string): any {
  return {
    source: content,
  };
}
