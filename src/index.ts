import { parse, DefaultTreeDocument, DefaultTreeTextNode, DefaultTreeElement, DefaultTreeNode, Attribute } from "parse5"
import { TAGS_MAP } from "./constants"

const html = `
<view wx:for="{{list}}">
  <!-- 注释 -->
  <view wx:for="{{items}}" wx:if="{{item.isShow}}">
    <span>{{item.name}}</span>
  </view>
  <view wx:elif="{{item.isMyName}}">
    {{item.yourname}}
  </view>
  <view wx:else>
    else Data
  </view>
  <input autofocus />
</view>
`

export const wxml2angular = (wxmlString: string): string => {
}

export const wxml2angular = (wxmlString: string): string => {
  const ast = parse(wxmlString) as any
  const fragment: DefaultTreeElement[] = ast.childNodes[0].childNodes[1].childNodes
  const angularTemplateLines = []
  wxmlFragment2angular(fragment, angularTemplateLines)
  return angularTemplateLines.join("")
}

export const wxmlFragment2angular = (fragment: DefaultTreeElement[], lines: string[]) => {
  for (const node of fragment) {
    if (!node.nodeName.startsWith("#")) {
      lines.push(parseWxmlNodeToAngularStartTag(node))
      wxmlFragment2angular(node.childNodes as any, lines)
      lines.push(getParsedWxmlEndTagName(node))
    } else {
      if (node.nodeName === "#text") {
        lines.push((node as any).value)
      } else {
        lines.push(`<!--${(node as any).data}-->`)
      }
    }
  }
}

const parseWxmlNodeToAngularStartTag = (node: DefaultTreeElement): string => {
  const tagName = getTagNameByWxmlNode(node)
  const attrsStr = parseWxmlNodeToAttrsString(node)
  return `<${tagName} ${attrsStr}>`
}

const getParsedWxmlEndTagName = (node: DefaultTreeElement): string => {
  return `</${getTagNameByWxmlNode(node)}>`
}

const getTagNameByWxmlNode = (node: DefaultTreeElement) => {
  return TAGS_MAP[node.nodeName] || node.nodeName
}

const parseWxmlNodeToAttrsString = (node: DefaultTreeElement): string => {
  const attrsList = []
  const attrsMap = parseWxmlAttrsToAttrsMap(node)
  for (const attr of node.attrs) {
    attrsList.push(parseWxmlAttrToAngularAttrStr(attr, attrsMap))
  }
  return attrsList.join(" ")
}

const parseWxmlAttrsToAttrsMap = (node: DefaultTreeElement): Map<string, Attribute> => {
  const map = new Map()
  for (const attr of node.attrs) {
    map[attr.name] = attr
  }
  return map
}

const parseWxmlAttrToAngularAttrStr = (attr: Attribute, attrsMap: Map<string, Attribute>): string => {
  const n = attr.name
  if (n === "wx:for") {
    return `*ngFor="let item of ${stripDelimiters(attr.value)}"`
  } else if (n === "wx:if") {

  }
  return attr.value ? `${attr.name}=${attr.value}` : attr.name
} 

const stripDelimiters = (val: string): string => {
  return val.replace(/(^\{\{)|(\}\}$)/g, '')
}

console.log(wxml2angular(html))
