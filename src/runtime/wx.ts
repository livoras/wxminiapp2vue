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