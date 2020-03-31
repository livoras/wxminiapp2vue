import { parse, DefaultTreeDocument, DefaultTreeTextNode, DefaultTreeElement, DefaultTreeNode, Attribute } from "parse5"
import { TAGS_MAP } from "./constants"

interface TreeNode extends DefaultTreeElement {
  attrsMap: Map<string, Attribute>,
  isIf: boolean,
  isElseIf: boolean,
  isElse: boolean,
  nextElseTemplateId: number,
  templateId: number,
}

const ELSE_BLOCK_TEMPLSTE_PREFIX = "elseBlock"

const html = `
<view wx:for="{{list}}">
  <!-- 注释 -->
  <view wx:for="{{items}}" wx:if="{{item.isShow}}">
    <span>{{item.name}}</span>
  </view>
  <image src="{{item.avatarUrl}}" />
  <view wx:elif="{{item.isMyName}}">
    {{item.yourname}}
  </view>
  <view wx:else>
    else Data
  </view>
  <input autofocus />
  <view wx:if="{{item.name === 'a'}}"> aaa </view>
</view>
`

interface IContext {
  lines: string[],
  ngTemplateCounter: number,
}

export const convertWxmlToNgTemplate = (wxmlString: string): string => {
  const ast = parse(wxmlString) as any
  const ctx = { lines: [], ngTemplateCounter: 0 }
  const fragment: TreeNode[] = preprocessNodes(ast.childNodes[0].childNodes[1].childNodes, ctx)
  wxmlFragment2angular(fragment, ctx)
  return ctx.lines.join("")
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

export const wxmlFragment2angular = (fragment: TreeNode[], ctx: IContext) => {
  for (const node of fragment) {
    if (!node.nodeName.startsWith("#")) {
      ctx.lines.push(parseWxmlNodeToAngularStartTag(node))
      wxmlFragment2angular(node.childNodes as any, ctx)
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

const parseWxmlNodeToAngularStartTag = (node: TreeNode): string => {
  const tagName = getTagNameByWxmlNode(node)
  const attrsStr = parseWxmlNodeToAttrsString(node)
  const typeAttrStr = getTypeAttrStr(node.nodeName, tagName)
  console.log(tagName, TAGS_MAP)
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
    attrsList.push(parseWxmlAttrToAngularAttrStr(attr, node))
  }
  return attrsList.join(" ")
}

const parseWxmlAttrToAngularAttrStr = (attr: Attribute, node: TreeNode): string => {
  const n = attr.name
  const v = stripDelimiters(attr.value)
  if (n === "wx:for") {
    return `v-for="item in ${stripDelimiters(attr.value)}"`
  } else if (n === "wx:if") {
    return `v-if="${stripDelimiters(attr.value)}"`
  } else if (n === "wx:elif") {
    return `v-else-if="${stripDelimiters(attr.value)}"`
  } else if (n === "wx:else") {
    return `v-else`
  } else if (n === "bindtap") {
    return `v-touch:tap="${v}"`
  } else if (n === "bindinput") {
    return `v-on:input="${v}"`
  } else if (n === "value") {
    return `v-model="${v}"`
  } else if (n === "bindchange") {
    return `v-on:change="${v}"`
  }
  return attr.value ? `${attr.name}="${attr.value}"` : attr.name
} 

const getNgIfElseAttrValue = (attr: Attribute, node: TreeNode): string => {
  return `${stripDelimiters(attr.value)}${node.nextElseTemplateId ? `; else elseBlock${node.nextElseTemplateId}` : ''}`
}

const stripDelimiters = (val: string): string => {
  return val.replace(/(^\{\{)|(\}\}$)/g, '')
}

const isNormalNode = (node: TreeNode): boolean => {
  return !node.nodeName.startsWith("#")
}

const isElseOrIfElseNode = (node: TreeNode): boolean => {
  return node.isElse || node.isElseIf
}

// console.log(convertWxmlToNgTemplate(html))
