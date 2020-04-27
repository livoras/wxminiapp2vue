
import wxApi = require("weixin-js-sdk")

const axios = require('axios');

export const wx = {

  showToast(opt) {
    alert(opt.title)
  },

  showModal(opt) {
    alert(`title: ${opt.title}, content: ${opt.content}`)
  },

  showLoading(opt) {
    alert(opt)
  },

  getStorageSync: (key: string) => {
    return localStorage.getItem(key)
  },

  setStorageSync: (key: string, data: any) => {
    localStorage.setItem(key, data)
  },

  removeStorageSync: (key: string) => {
    localStorage.removeItem(key)
  },

  getStorage: (opt) => {
    const getStorage = new Promise((resolve, reject) => {
      try {
        const value = localStorage.getItem(opt.key)
        resolve({ data: value, errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    operateStorage(opt, getStorage)
  },

  setStorage: (opt) => {
    const setStorage = new Promise((resolve, reject) => {
      try {
        localStorage.setItem(opt.key, opt.data)
        resolve({ errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    operateStorage(opt, setStorage)
  },

  removeStorage: (opt) => {
    const removeStorage = new Promise((resolve, reject) => {
      try {
        localStorage.removeItem(opt.key)
        resolve({ errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    operateStorage(opt, removeStorage)
  },

  navigateTo: (opt) => {
    wxApi.miniProgram.navigateTo(opt)
  },

  navigateBack: (opt) => {
    wxApi.miniProgram.navigateBack(opt)
  },

  reLaunch: (opt) => {
    wxApi.miniProgram.reLaunch(opt)
  },

  redirectTo: (opt) => {
    wxApi.miniProgram.redirectTo(opt)
  },

  canIUse: (functionName) => {
    if (this[functionName]) {
      return true
    }
    return false
  },

  getSystemInfoSync: () => {
    return {
      SDKVersion: "2.10.4",
      batteryLevel: 100,
      benchmarkLevel: 1,
      brand: "devtools",
      devicePixelRatio: 3,
      fontSizeSetting: 16,
      language: "zh",
      model: "iPhone X",
      pixelRatio: 3,
      platform: "devtools",
      safeArea: {
        bottom: 812,
        height: 768,
        left: 0,
        right: 375,
        top: 44,
        width: 375,
      },
      screenHeight: 812,
      screenWidth: 375,
      statusBarHeight: 44,
      system: "iOS 10.0.1",
      version: "7.0.4",
      windowHeight: 812,
      windowWidth: 375,
    }
  },

  request: (options) => {
    const { url, method, header, data, success, fail } = options
    axios({
      url, method, data,
      headers: {
        ...header,
        Authorization: "eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjExMCwiZXhwIjoxNTg4MzAyNjc5fQ.pj61S9LA8ASDYxYBaApT6nx8bLNPeRe8p228h2BfTHc",
      },
      baseURL: process.env.NODE_ENV === "dev"
        ? "http://mina.test.office.qunjielong.com/"
        : "https://apipro.qunjielong.com/",
    })
      .then((res) => {
        const { data, status, headers } = res
        success({
          data,
          statusCode: status,
          header: headers,
        })
      })
      .catch((err) => {
        fail(err.response || {})
      })
  }
}

const operateStorage = function (opt, fuc) {
  const sucCallback = opt.success
  const failCallback = opt.fail
  const completeCallback = opt.complete
  fuc
    .then((res) => { if (sucCallback) { sucCallback(res) } })
    .catch((e) => { if (failCallback) { failCallback(e) } })
    .then(() => { if (completeCallback) { completeCallback() } })

}