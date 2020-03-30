import 'vue2-touch-events'

declare const Vue: any
let app

const setData = function(obj, callback) {
  Object.assign(this, obj)
  if (typeof callback === 'function') {
    callback()
  }
}

const Page = (page) => {
  const methods = Object.assign(extractMethods(page), { setData })
  const app = new Vue({
    el: "#app",
    data: page.data,
    methods,
  })
  Object.defineProperty(app, "data", {
    get: () => { return app.$data },
    enumerable: false,
  })
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
      func.call(
        this,
        wrapEventToWXEvent(e),
        ...args.slice(1)
      )
    } else {
      func.call(this, ...args)
    }
  }
}

const wrapEventToWXEvent = (e) => {
  return {
    detail: { value: e.target.value },
    target: e.target,
    currentTarget: e.currentTarget,
    original: e,
  }
}

const getApp = () => {
  return app
}

export default { Page, getApp }
