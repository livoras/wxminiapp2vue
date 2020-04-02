import 'vue2-touch-events'

declare const Vue: any
let app
let currentTemplate = ""
let currentName = ""
let pages = new Map<string, { template: string, page: any }>()

const registerPage = (name, template, page) => {
  console.log("Register page --->", name)
  pages.set(name, {
    template, page
  })
}

export const registerTemplate = (name, template) => {
  currentName = name
  currentTemplate = template
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
  registerPage(currentName, currentTemplate, page)
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
        return {...com.data}
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
  const { template, page } = pages.get(url)
  document.getElementById("app").innerHTML = template
  const methods = Object.assign(extractMethods(page), { setData, getHandleMethodEvent, getInputReturn })
  const app = new Vue({
    el: "#app",
    data: page.data,
    methods,
  })
  Object.defineProperty(app, "data", {
    get: () => { return app.$data },
  })
}

export default { Page, getApp, Component, routeTo }
