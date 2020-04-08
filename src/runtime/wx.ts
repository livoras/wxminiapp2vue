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

}
