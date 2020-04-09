import wxApi from "weixin-js-sdk"

export const wx = {

  showToast(opt) {
    alert(opt.title)
    // wxApi.miniProgram
    // wxApi.miniProgram.post
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
    const sucCallback = opt.success
    const failCallback = opt.fail
    const completeCallback = opt.complete
    const localStorageOperate = new Promise((resolve, reject) => {
      try {
        const value = localStorage.getItem(opt.key)
        resolve({ data: value, errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    localStorageOperate
      .then((res) => { if (sucCallback) { sucCallback(res) } })
      .catch((e) => { if (failCallback) { failCallback(e) } })
      .then(() => { if (completeCallback) { completeCallback() } })
  },

  setStorage: (opt) => {
    const sucCallback = opt.success
    const failCallback = opt.fail
    const completeCallback = opt.complete
    const localStorageOperate = new Promise((resolve, reject) => {
      try {
        localStorage.setItem(opt.key, opt.data)
        resolve({ errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    localStorageOperate
      .then((res) => { if (sucCallback) { sucCallback(res) } })
      .catch((e) => { if (failCallback) { failCallback(e) } })
      .then(() => { if (completeCallback) { completeCallback() } })
  },

  removeStorage: (opt) => {
    const sucCallback = opt.success
    const failCallback = opt.fail
    const completeCallback = opt.complete
    const localStorageOperate = new Promise((resolve, reject) => {
      try {
        localStorage.removeItem(opt.key)
        resolve({ errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    localStorageOperate
      .then((res) => { if (sucCallback) { sucCallback(res) } })
      .catch((e) => { if (failCallback) { failCallback(e) } })
      .then(() => { if (completeCallback) { completeCallback() } })
  },

  navigateTo: (opt) => {

  },
}
