let app

const Page = (page) => {
  console.log(page)
}

const App = (appInstance) => {
  console.log(appInstance)
}

const getApp = () => {
  return app
}

export default { Page, App, getApp }
