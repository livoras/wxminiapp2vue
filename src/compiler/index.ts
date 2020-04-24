const path = require("path")
const fs = require("fs")
import { convertWxmlToVueTemplate } from "../convertWxmlToNgTemplate"

const d = path.resolve(process.cwd())

const suid = () => {
  // I generate the UID from two parts here 
  // to ensure the random number provide enough bits.
  var firstPart = (Math.random() * 46656) | 0;
  var secondPart = (Math.random() * 46656) | 0;
  const firsts = ("000" + firstPart.toString(36)).slice(-3);
  const seconds = ("000" + secondPart.toString(36)).slice(-3);
  return 'w' + firsts + seconds;
}

const scopeCssAndHTML = (css: string, html: string) => {
  const uid = suid()
  css = css.replace(/([^\{\}\n]+)(\{[\s\S]*?\})/g, (a, b) => {
    return `[${uid}] ${a}`
  })
  html = `<div ${uid}>${html}</div>`
  html.replace(/(\<[\s\S]+?)\>/g, (a, b) => {
    return `${b} ${uid}>`
  })
  return [css, html]
}

const toh5 = (callback: Function) => {
  if (callback) {
    callback()
  }
}

const getNgc = () => {
  return {
    convertWxmlToVueTemplate,
  }
}

const genMiniJS = (miniApp: MiniAppInfo) => {
  let jsStr = `
const { runtime, wx } = require("wxminiapp2vue");
Object.assign(window, runtime);
Object.assign(window, { wx });
const ngc = require("wxminiapp2vue");
require('./app.js')

window.wxs = {
  ${[...miniApp.wxs.entries()].reduce((s, [key, value]) => {
    return s + `"${key.replace(/\\/g, '/')}": (function() {
      const module = { exports: {} };
      ${value.js};
      return module.exports;
    })(),\n`
  }, '')}
}`;

  const gen = ([name, c]: [string, PageComponent]) => {
    console.log('===>', c.path)
    const p = path.join("dist/styles", c.path)
    const dir = path.dirname(p)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p + ".css", `${c.cssContent}`)
    jsStr += `
/**
 * Path: ${c.path}
 * */
    var link = document.createElement("link");
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = 'dist/styles/${c.path}.css';
    link.media = 'all';
    document.head.appendChild(link);
    `
    jsStr += `ngc.registerTemplate("${c.path}", \`${c.template}\`, ${JSON.stringify(c.wxsDeps)});\n`
    jsStr += `require("${c.path}");\n\n`
    jsStr += `
///////////////////////////////////////////////////////////////////////////
    `
  }
  for (const cc of miniApp.components) {
    gen(cc)
  }
  for (const cc of miniApp.pages) {
    gen(cc)
  }
  fs.writeFileSync("./miniapp.js", jsStr, "utf-8")
}

class PageComponent {
  public absPath = ""
  public path = ""
  public json: any = {}
  public isComponent = false
  public template = ""
  public jsContent = ""
  public cssContent = ""
  public deps = new Map()
  public rawWxs: any[] = []
  public wxsDeps: any = {}

  constructor () {
  }

  load() {
    const ngc = getNgc()
    // console.log(this.path)
    this.path = this.path.replace(/\\/g, '/')
    this.absPath = this.absPath.replace(/\\/g, '/')
    try {
      const wxml = fs.readFileSync(this.absPath + ".wxml", "utf-8")
      const parsedWxml = ngc.convertWxmlToVueTemplate(wxml)
      this.template = parsedWxml.template
      this.rawWxs = parsedWxml.wxs
      this.jsContent = fs.readFileSync(this.absPath + ".js", "utf-8")
      this.cssContent = convertWxssToCss(fs.readFileSync(this.absPath + ".wxss", "utf-8"))

      const [css, template] = scopeCssAndHTML(this.cssContent, this.template)
      this.cssContent = css
      this.template = template
    } catch (e) {
      if (!e.message.match(/ENOENT/)) {
        throw e
      }
    }
  }
}

/** 
 * https://blog.csdn.net/sinat_23076629/article/details/81131472
 * 支不支持 @wxs?
 * */
const convertWxssToCss = (wxss: string) => {
  let reg = /[\s,:,-]\d*rpx/g
  let remBase = 16;
  let rpxBase = 750
  let dpx = 1
  let res
  let css = wxss
  while(res = reg.exec(css)){
    css = res.input
    let index = res.index
    let rpxPix = res[0]
    let num = +rpxPix.replace('rpx','').trim()
    let remPix = `${dpx * remBase / rpxBase * num}rem`
    css = `${css.slice(0,index)} ${remPix}${css.slice(index+rpxPix.length,css.length)}`
  }
  return css
}

class MiniAppInfo {
  public root: string = ""
  public components = new Map()
  public pages = new Map()
  public wxs = new Map()

  constructor() {
  }

  parseByAppJson(appJson: any) {
    const pages = appJson.pages
    if (appJson.subpackages) {
      for (const subpackage of appJson.subpackages) {
        const root = subpackage.root
        const subpages = subpackage.pages
        for (const p of subpages) {
          pages.push(`${root}/${p}`)
        }
      }
    }
    this.parsePagesByPaths(pages)
  }

  parsePagesByPaths(pages: string[]) {
    for (const page of pages) {
      this.parsePageByPath(page)
    }
  }

  parsePageByPath(page: string) {
    const pageJson = require(path.resolve(page + ".json"))
    const pc = new PageComponent()
    pc.absPath = path.resolve(page)
    pc.path = page
    pc.json = pageJson
    pc.deps = this.parseDeps(pc)
    pc.load()
    this.parseWxsDepsByPc(pc)
    this.pages.set(page, pc)
  }

  parseDeps(pc: PageComponent) {
    const deps = new Map()
    const coms = pc.json.usingComponents
    if (coms) {
      Object.keys(pc.json.usingComponents).forEach((key) => {
        const cp = coms[key]
        const p = cp.startsWith(".")
          ? path.resolve(path.join(path.dirname(pc.absPath), cp))
          : path.resolve(path.join(this.root, cp))
        deps.set(key, this.parseComponentByPath(p))
      })
    }
    return deps
  }

  parseComponentByPath(p: string) {
    const comJson = require(p + ".json")
    const rp = this.replaceDirname(p)
    if (!this.components.has(rp)) {
      const cc = new PageComponent()
      cc.absPath = p
      cc.path = rp
      cc.json = comJson
      cc.deps = this.parseDeps(cc)
      cc.isComponent = true
      cc.load()
      this.parseWxsDepsByPc(cc)
      this.components.set(rp, cc)
    }
    return this.components.get(rp)
  }

  parseWxsDepsByPc(pc: PageComponent) {
    pc.rawWxs.forEach((rawWxs: any) => {
      pc.wxsDeps[rawWxs.attrsMap.get("module").value] = this.parseWxs(rawWxs, pc.absPath)
    })
  }

  parseWxs(rawWxs: any, absPath: string) {
    if (rawWxs.attrsMap.has("src")) {
      const src = rawWxs.attrsMap.get("src")
      const wxsPath = path.resolve(path.join(path.dirname(absPath), src.value))
      const rWxsPath = this.replaceDirname(wxsPath)

      if (!this.wxs.has(rWxsPath)) {
        this.wxs.set(rWxsPath, { js: fs.readFileSync(wxsPath, "utf-8") })
      }

      return { id: rWxsPath, }
    } else {
      return { js: rawWxs.childNodes[0].value, }
    }
  }

  replaceDirname(p: string) {
    return p.replace(this.root, "").replace(/^[\/\\]/g, "")
  }
}

const main = () => {
  let p = process.argv[2]
  if (!path.isAbsolute(p)) {
    p = path.resolve(path.join(process.cwd(), p))
  }
  compile(p)
}

const compile = (p: string): void => {
  const appJson = require(path.join(p, "app.json"))
  const miniApp = new MiniAppInfo()
  miniApp.root = p
  miniApp.parseByAppJson(appJson)
  genMiniJS(miniApp)
}

main()
