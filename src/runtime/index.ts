import 'vue2-touch-events'
import "./wx"

declare const Vue: any
let app: any = {}
let currentTemplate = ""
let currentName = ""
let pages = new Map<string, { template: string, page: any, wxs: any}>()
let currentWxs = {}

const getUrlQuery = () => {
  const url = window.location.href
  if (!url) { return }
  const querys = url.split("?")[1]
  if (!querys) { return }
  querys.split("&").forEach((param) => {
    const [key, value] = param.split("=")
    wx.setStorage(key, value)
  }, {})
}

const App = (options) => {
  setTimeout(getUrlQuery)
  if (!options) { 
    app = {}
    return
  }
  for (const key in options) {
    const value = options[key]
    if (key === "onLaunch") {
      app[key] = () => {
        value({ scene: 1001 })
      }
    } else {
      app[key] = value
    }
  }
}

const registerPage = (name, template, page, wxs) => {
  // console.log("Register page ->", name)
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

const triggerEvent = function(name, e) {
  // console.log("triggerEvent", name, e)
  this.$emit(name, e)
}

const getHandleMethodEvent = function(name: string, dataset: any) {
  const that = this
  return function(e, ...args) {
    e.dataset = dataset
    that[name](e, ...args)
  }
}

const getComponentMethodEvent = function(name: string, e, dataset) {
  this[name]({
    detail: { value: e },
    dataset: dataset,
  })
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

const extractMethodsAndProps = (obj, result = [{}, {}]) => {
  const methodsAndProps = Object.keys(obj).reduce(([o, p], key) => {
    if (typeof obj[key] === 'function') {
      o[key] = wrapEventFunc(obj[key])
    } else {
      p[key] = obj[key]
    }
    return [o, p]
  }, result)
  if (!obj || !obj.__proto__) {
    return methodsAndProps
  } else {
    return extractMethodsAndProps(obj.__proto__, methodsAndProps)
  }
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
  // console.log("------> Component", cname)
  const props = convertVueComponentProps(com.properties)
  const wxs = currentWxs
  Vue.component(cname, {
    template: t,
    props,
    methods: Object.assign(com.methods || {}, { setData, triggerEvent, getHandleMethodEvent, getInputReturn, getComponentMethodEvent }),
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
    },
    created: function() {
      if (com.created) {
        com.created()
      }
    },
    beforeMount: function() {
      if (com.attached) {
        com.attached()
      }
    },
    mounted: function() {
      if (com.ready) {
        com.ready()
      }
    },
    updated: function() {
      if (com.moved) {
        com.moved()
      }
    },
    destroyed: function() {
      if (com.destroyed) {
        com.destroyed()
      }
    }
  })
}

export const convertVueComponentProps = (props) => {
  if (!props) { return {} }
  return Object.keys(props).reduce((o, key) => {
    const prop = props[key]
    prop.default = prop.value
    delete prop.value
    o[key] = prop
    return o
  }, {})
}

let isFirst = true

export const routeTo = (url) => {
  if (isFirst) {
    app.onLaunch()
    isFirst = false
  }
  const urlObj = getQuery(url)
  const { template, page, wxs: rawWxs } = pages.get(urlObj.realUrl)
  document.getElementById("app").innerHTML = template
  const [pageMethods, props] = extractMethodsAndProps(page)
  const methods = Object.assign(pageMethods, { setData, getHandleMethodEvent, getInputReturn, getComponentMethodEvent })
  const wxs = parseWxs(rawWxs)
  const curPage = new Vue({
    el: "#app",
    data: { ...page.data, ...wxs },
    methods,
    created: function() {
      Object.assign(this, props)
      if (this.onLoad) {
        this.onLoad(urlObj.queryObj)
      }
      if (this.onShow) {
        this.onShow()
      }
    },
    mounted: function() {
      if (this.onReady) {
        this.onReady()
      }
    },
    destroyed: function() {
      if (this.onUnload) {
        this.onUnload()
      }
    }
  })
  Object.defineProperty(curPage, "data", {
    get: () => { return curPage.$data },
  })
}

export const getWxsByPath = (wxsPath: string): any => {
  return ((window as any).wxs[wxsPath])
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

const getRegExp = (regRule: string, decorator?: string) => {
  return decorator
    ? new RegExp(regRule, decorator)
    : new RegExp(regRule)
}

const Behavior = (params) => {}

const getCurrentPages = () => {
  const pages = localStorage.getItem("pages")
  if (pages) {
    return JSON.parse(pages)
  } else {
    return [{
      options: {},
      route: "",
    }]
  }
}

export default { App, Page, getApp, Component, routeTo, getWxsByPath, getRegExp, Behavior, getCurrentPages }
