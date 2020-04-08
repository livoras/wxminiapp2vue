import 'vue2-touch-events'

declare const Vue: any
let app
let currentTemplate = ""
let currentName = ""
let pages = new Map<string, { template: string, page: any, wxs: any}>()
let currentWxs = {}

const registerPage = (name, template, page, wxs) => {
  console.log("Register page ->", name)
  pages.set(name, {
    template, page, wxs,
  })
}

export const registerTemplate = (name, template, wxs) => {
  currentName = name
  currentTemplate = template
  currentWxs = wxs
}

const setData = function(obj, callback) {
  Object.assign(this, obj)
  if (typeof callback === 'function') {
    callback()
  }
}

const getHandleMethodEvent = function(name: string, dataset: any) {
  const that = this
  return function(e, ...args) {
    e.dataset = dataset
    that[name](e, ...args)
  }
}

const getInputReturn = function(name: string, key: string, dataset: any ,e: any) {
  e.dataset = dataset
  const returnInput = this[name](e)
  if (!returnInput && returnInput !== "" || !key) { return }
  this.setData({
    [key]: returnInput,
  })
}

const Page = (page) => {
  registerPage(currentName, currentTemplate, page, currentWxs)
}

const extractMethods = (obj) => {
  return Object.keys(obj).reduce((o, key) => {
    if (typeof obj[key] === 'function') {
      o[key] = wrapEventFunc(obj[key])
    }
    return o
  }, {})
}


const wrapEventFunc = (func) => {
  return function (...args) {
    const e = args[0]
    if (e instanceof Event) {
      return func.call(
        this,
        wrapEventToWXEvent(e),
        ...args.slice(1)
      )
    } else {
      return func.call(this, ...args)
    }
  }
}

const wrapEventToWXEvent = (e) => {
  const dataset = e.dataset
  return {
    detail: { value: e.target.value },
    target: {
      dataset,
      id: e.target.id || "",
      offsetLeft: e.target.offsetLeft,
      offsetTop: e.target.offsetTop,
    },
    currentTarget: {
      dataset,
      id: e.currentTarget.id || "",
      offsetLeft: e.currentTarget.offsetLeft,
      offsetTop: e.currentTarget.offsetTop,
    },
    original: e,
    timeStamp: e.timeStamp,
    type: e.type === "touchend" ? "tap" : e.type,
    _userTap: true,
  }
}

const getApp = () => {
  return app
}

export const Component = (com) => {
  const t = currentTemplate
  const caps = currentName.split('/')
  const cname = caps[caps.length - 1]
  console.log("------> Component", cname)
  const props = converVueComponentProps(com.properties)
  const wxs = currentWxs
  Vue.component(cname, {
    template: t,
    props,
    methods: Object.assign(com.methods || {}, { setData, getHandleMethodEvent, getInputReturn }),
    /** TODO:
     * 1. 合并生命周期
     * 2. v-bind 语法：在 2vue 的项目中改
     */
    data: function() {
      /** 兼容 this.data 语法 */
      this.data = new Proxy({}, {
        get: (obj, prop) => {
          return this[prop]
        }
      })
      if (com.data) {
        return {...com.data, ...parseWxs(wxs)}
      }
      return {}
    }
  })
}

export const converVueComponentProps = (props) => {
  if (!props) { return {} }
  return Object.keys(props).reduce((o, key) => {
    const prop = props[key]
    prop.default = prop.value
    delete prop.value
    o[key] = prop
    return o
  }, {})
}

export const routeTo = (url) => {
  const urlObj = getQuery(url)
  const { template, page, wxs: rawWxs } = pages.get(urlObj.realUrl)
  document.getElementById("app").innerHTML = template
  const methods = Object.assign(extractMethods(page), { setData, getHandleMethodEvent, getInputReturn })
  const wxs = parseWxs(rawWxs)
  const curPage = new Vue({
    el: "#app",
    data: { ... page.data, ...wxs },
    methods,
    created: function() {
      this.onLoad(urlObj.queryObj)
      this.onShow()
    }
  })
  Object.defineProperty(curPage, "data", {
    get: () => { return curPage.$data },
  })
}

const parseWxs = (rawWxs) => {
  const wxs = Object.keys(rawWxs).reduce((w, key) => {
    const xs = rawWxs[key]
    if (xs.id) {
      w[key] = (window as any).wxs[xs.id]
    } else {
      w[key] = (new Function(`
        var module = { exports: {} };
        ${xs.js};
        return module.exports
      `))()
    }
    return w
  }, {})
  return wxs
}

const getQuery = (url): { realUrl: string, queryObj: { [x: string]: any}} => {
    const realUrl = url.split("?")[0]
    const queryStr = url.split("?")[1]
    const queryObj = {}
    if (!queryStr) { return { realUrl, queryObj } }
    queryStr.split("&").forEach((item) => {
      const query = item.split("=")
      queryObj[query[0]] = query[1]
    })
    return { realUrl, queryObj }
  }

export default { Page, getApp, Component, routeTo }
