import 'vue2-touch-events'

declare const Vue: any
let app

const setData = function(obj, callback) {
  Object.assign(this, obj)
  if (typeof callback === 'function') {
    callback()
  }
}

const getHandleMethodEvent = function(name: string, dataset) {
  const that = this
  return function(event) {
    const srcElement = event.srcElement
    const target = event.target
    const changedTouches = event.changedTouches[0] || {}
    const e = {
      currentTarget: {
        dataset,
        id: srcElement.id || "",
        offsetLeft: srcElement.offsetLeft,
        offsetTop: srcElement.offsetTop,
      },
      detail: {
        x: changedTouches.clientX,
        y: changedTouches.clientY,
      },
      target: {
        dataset,
        id: target.id || "",
        offsetLeft: target.offsetLeft,
        offsetTop: target.offsetTop,
      },
      timeStamp: event.timeStamp,
      type: "tap",
      _userTap: true,
    }
    that[name](e)
  }
}

const Page = (page) => {
  const methods = Object.assign(extractMethods(page), { setData, getHandleMethodEvent })
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
