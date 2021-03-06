import { parse, DefaultTreeDocument, DefaultTreeTextNode, DefaultTreeElement, DefaultTreeNode, Attribute } from "parse5"
import { TAGS_MAP } from "./constants"
import { replaceCamelAttribute } from "./runtime/parser-attributes"
interface TreeNode extends DefaultTreeElement {
  attrsMap: Map<string, Attribute>,
  isIf: boolean,
  isElseIf: boolean,
  isElse: boolean,
  nextElseTemplateId: number,
  templateId: number,
}

interface IContext {
  lines: string[],
  ngTemplateCounter: number,
  template: string,
  wxs: any[],
}

export const replaceAttrList: Set<string> = new Set([
  "wx:for-item", "wx:for-index", "confirm-type"
])

export const longTapList: Set<string> = new Set([
  "bindlongtap", "bindlongtap", "bindlongpress", "bind:longpress", "catchlongtap", "catchlongtap", "catchlongpress", "catch:longpress",
])

export const tapList: Set<string> = new Set([
  "bindtap", "bind:tap", "catchtap", "catch:tap"
])

export const commonAttrList: Set<string> = new Set([
  "disabled", "placeholder", "maxlength" ,"autofocus"
])

export const specialAttrList: Set<string> = new Set([
  "focus", "type"
])

export const inputAttrList: Set<string> = new Set([
  "bindinput", "bind:input", "bindblur", "bind:blur", "bindfocus", "bind:focus"
])

export const convertWxmlToVueTemplate = (wxmlString: string): IContext => {
  wxmlString = wxmlString.replace(/\<\s*([^\s\/\>]+)[^\>]+?\/\s*\>/g, (a, b) => {
    return a.replace(/\s*\/>/, '>') + `</${b}>`
  })
  wxmlString = wxmlString.replace(/\<\s*[^\s\/\>]+([^<>]*)\>/g, (a, b) => {
    return b.length && /[A-Z]/g.test(b) ? replaceCamelAttribute(a) : a
  })
  // if (wxmlString.indexOf("product-name") > 0) {
  //   console.log("<--- start", wxmlString, "end --->")
  // }
  const ast = parse(wxmlString) as any
  const ctx = { lines: [], ngTemplateCounter: 0, template: "", wxs: [] }
  const htmlNode = getHtmlNode(ast)
  const fragment: TreeNode[] = preprocessNodes(htmlNode.childNodes[1].childNodes, ctx)
  wxmlFragment2Vue(fragment, ctx)
  ctx.template = ctx.lines.join("")
  return ctx
}

const getHtmlNode = (ast) => {
  for (const node of ast.childNodes) {
    if (node.nodeName === "html") {
      return node
    }
  }
}

const preprocessNodes = (tree: TreeNode[], ctx: IContext): TreeNode[] => {
  let prev: null | TreeNode
  for (const node of tree) {
    node.attrsMap = new Map()
    if (node.attrs) {
      for (const attr of node.attrs) {
        node.attrsMap.set(attr.name, attr)
      }
      if (node.attrsMap.get("wx:if")) {
        node.isIf = true
      } else if (node.attrsMap.get("wx:elif")){
        node.isElseIf = true
      } else if (node.attrsMap.get("wx:else")) {
        node.isElse = true
      }
    }
    if (node.childNodes) {
      preprocessNodes(node.childNodes as TreeNode[], ctx)
    }
    if ((node.isElse || node.isElseIf) && prev) {
      node.templateId = ++ctx.ngTemplateCounter
      prev.nextElseTemplateId = node.templateId
    }
    if (isNormalNode(node)) {
      prev = node
    }
  }
  return tree
}

export const wxmlFragment2Vue = (fragment: TreeNode[], ctx: IContext) => {
  for (const node of fragment) {
    if (node.nodeName === "wxs") {
      ctx.wxs.push(node)
    } else if (!node.nodeName.startsWith("#")) {
      ctx.lines.push(parseWxmlNodeToVueStartTag(node))
      wxmlFragment2Vue(node.childNodes as any, ctx)
      ctx.lines.push(getParsedWxmlEndTagName(node))
    } else {
      if (node.nodeName === "#text") {
        ctx.lines.push((node as any).value)
      } else {
        ctx.lines.push(`<!--${(node as any).data}-->`)
      }
    }
  }
}

const parseWxmlNodeToVueStartTag = (node: TreeNode): string => {
  const tagName = getTagNameByWxmlNode(node)
  const attrsStr = parseWxmlNodeToAttrsString(node)
  const typeAttrStr = getTypeAttrStr(node.nodeName, tagName)
  // console.log(tagName, TAGS_MAP)
  return `<${tagName} ${typeAttrStr} ${attrsStr}>`
}

const getTypeAttrStr = (originalNodeName, tagName) => {
  if (originalNodeName === "checkbox") {
    return `type="checkbox"`
  }
  return ""
}

const getIfElseAttr = (node: TreeNode): string => {
  return getNgIfElseAttrValue(node.attrsMap.get("wx:elif"), node)
}

const getParsedWxmlEndTagName = (node: TreeNode): string => {
  return `</${getTagNameByWxmlNode(node)}>`
}

const getTagNameByWxmlNode = (node: TreeNode) => {
  return TAGS_MAP[node.nodeName] || node.nodeName
}

const parseWxmlNodeToAttrsString = (node: TreeNode): string => {
  const attrsList = []
  for (const attr of node.attrs) {
    attrsList.push(parseWxmlAttrToVueAttrStr(attr, node))
  }
  return attrsList.join(" ")
}

const parseWxmlAttrToVueAttrStr = (attr: Attribute, node: TreeNode): string => {
  const n = attr.name
  const v = stripDelimiters(attr.value)
  if (n === "wx:for") {
    const test = parseWxmlWxFor(attr, node)
    return test
  } else if (n === "wx:if") {
    return `v-if="${stripDelimiters(attr.value)}"`
  } else if (n === "wx:elif") {
    return `v-else-if="${stripDelimiters(attr.value)}"`
  } else if (n === "wx:else") {
    return `v-else`
  } else if (tapList.has(n)) {
    return parseWxmlTap(attr, node, n.indexOf("catch") > -1)
  } else if (longTapList.has(n)) {
    return parseWxmlTap(attr, node, n.indexOf("catch") > -1, "longtap")
  } else if (inputAttrList.has(n)) {
    return parseWxmlInput(attr, node)
  } else if (n === "value") {
    const isHasDelimiters = checkIsHasDelimiters(attr.value)
    return isHasDelimiters ? `v-model="${v}"` : `value=${v}`
    // TODO:
  } else if (n === "bindchange") {
    return `v-on:change="${v}"`
  } else if (replaceAttrList.has(n)) {
    return ""
  } else if (commonAttrList.has(n)) {
    return `:${n}="${v}"`
  } else if (specialAttrList.has(n)) {
    return parseWxmlSpecialAttr(attr, node)
  } else if (attr.name.indexOf("bind:") === 0) {
    const functionName = attr.name.replace("bind:", "")
    const dataSetList = getCurrentTargetDataSet(node)
    return `@${functionName}="getComponentMethodEvent(${stripDelimiters(attr.value)}, $event, { ${dataSetList.join(",")} })"`
  }
  return attr.value ? `:${attr.name}="${stripDelimiters(attr.value)}"` : attr.name
}

const parseWxmlWxFor = (attr: Attribute, node: TreeNode) :string => {
  const attrsMap = node.attrsMap
  const itemKeyAttr = attrsMap.get("wx:for-item")
  const indexKeyAttr = attrsMap.get("wx:for-index")
  const wxKeyAttr = attrsMap.get("wx:key")
  const itemStr = itemKeyAttr ? itemKeyAttr.value : "item"
  const indexStr = indexKeyAttr ? indexKeyAttr.value : "index"
  const keyStr = !wxKeyAttr || wxKeyAttr.value === "*this" ? indexStr : `${itemStr}.${wxKeyAttr.value}`
  return `v-for="(${itemStr}, ${indexStr}) in ${stripDelimiters(attr.value)}" :key="${keyStr}"`
}

const parseWxmlTap = (attr: Attribute, node: TreeNode, isStop: boolean = false, type: string = "tap"): string => {
  const dataSetList = getCurrentTargetDataSet(node)
  return `v-touch:${type}${isStop ? '.stop' : ''}="getHandleMethodEvent(${stripDelimiters(attr.value)}, { ${dataSetList.join(",")} })"`
}

const parseWxmlInput = (attr: Attribute, node: TreeNode): string => {
  const v = stripDelimiters(attr.value)
  const n = attr.name
  const attrsMap = node.attrsMap
  const valueAttr = attrsMap.get("value")
  const inputKey = valueAttr ? valueAttr.value : ""
  const type = n.replace(/(bind)(:?)/g, '')
  const realKey = checkIsHasDelimiters(inputKey) && type === 'input' ? stripDelimiters(inputKey) : ""
  const dataSetList = getCurrentTargetDataSet(node)
  return `@${type}="getInputReturn(${v}, '${realKey}', { ${dataSetList.join(",")} }, $event)"`
}

const parseWxmlSpecialAttr = (attr: Attribute, node: TreeNode): string => {
  const n = attr.name
  const v = stripDelimiters(attr.value)
  const attrsMap = node.attrsMap
  if (n === "focus") {
    return `:autofocus="${v}"`
  } else if (n === "password") {
    // TOOD: 暂时不考虑密码类型
  } else if (n === "type" && node.nodeName === "input") { // digit/idcard/number 都用数字键盘 + confirm-type支持search【好像没用】
    const isHasConfirmType = attrsMap.has("confirm-type")
    return `:type="!${v} || ${v} === 'text' ? ${isHasConfirmType && attrsMap.get("confirm-type").value === "search"} ? 'search' : 'text' : 'number'"`
  }
  return ""
}

const getCurrentTargetDataSet = (node: TreeNode): string[] => {
  const attrsMap = node.attrsMap
  const dataSetList = []
  attrsMap.forEach((item, key) => {
    if (!key.indexOf("data-")) {
      dataSetList.push(`${toCamel(key.slice(5))}: ${stripDelimiters(item.value)}`)
    }
  })
  return dataSetList
}

const getNgIfElseAttrValue = (attr: Attribute, node: TreeNode): string => {
  return `${stripDelimiters(attr.value)}${node.nextElseTemplateId ? `; else elseBlock${node.nextElseTemplateId}` : ''}`
}

const checkIsHasDelimiters = (val: string): boolean => {
  return val.search(/(^\{\{)|(\}\}$)/g) > -1
}

const stripDelimiters = (val: string): string => {
  return checkIsHasDelimiters(val) ? val.replace(/(^\{\{)|(\}\}$)/g, '') : `'${val}'`
}

const isNormalNode = (node: TreeNode): boolean => {
  return !node.nodeName.startsWith("#")
}

const isElseOrIfElseNode = (node: TreeNode): boolean => {
  return node.isElse || node.isElseIf
}

const toCamel = (str: string): string => {
  return str.split("-").map((item) => item.toLowerCase()).join("-").replace(/([^-])(?:-+([^-]))/g, function ($0, $1, $2) {
    return $1 + $2.toUpperCase()
  })
}

const toKebab = (str: string): string => {
  let result = str.replace(/[A-Z]/g, function ($0) {
		return "-" + $0.toLowerCase()
  })
  if (result[0] === "-") {
    result = result.slice(1);
  }
  return result
}

// console.log(convertWxmlToNgTemplate(html))

// console.log(replaceCamelAttribute(`<button class="button" bindtap="handleTapButton">`))
