
import { Vue, i18n } from './init'
import debugRouteMixin from './routes/debugRouteMixin'
import hljs from './hljs'
import demoRouterView from './demoRouterView'
// import './styles/test-customize-style-scheme.scss' // test customize style scheme
import naive from '../src/index'
import '../src/_styles/index.scss'
import '../src/_styles/fonts/Lato.scss'
import '../src/_styles/fonts/FiraCode.scss'
import { routes, childRoutes } from './routes/routes'
import createRouter from './routes/router'

debugRouteMixin(routes, childRoutes)
const router = createRouter(Vue, routes)

naive.setHljs(hljs)

// testing customize style
// naive.styles.light.base.override({
//   derived: {
//     primaryColor: 'rgb(255, 0, 0)',
//     primaryHoverColor: 'rgb(0, 255, 0)',
//     primaryActiveColor: 'rgb(0, 0, 255)'
//   }
// })

Vue.use(naive)

new Vue({
  ...demoRouterView,
  router,
  i18n
}).$mount('#app')
