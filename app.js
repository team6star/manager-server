/*
 * @Descripttion: js
 * @Version: 1.0
 * @Author: name
 * @Date: 2024-12-03 15:23:00
 * @LastEditors: name
 * @LastEditTime: 2024-12-04 21:46:23
 */
const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const log4js=require('./utils/log4j')
const index = require('./routes/index')
const users = require('./routes/users')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// 错误
// app.use(()=>{
//   ctx.body='hello'
// })
// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  // const ms = new Date() - start
  // console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
  // 测试log4js
  log4js.info(`log output`)
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  // console.error('server error', err, ctx)
  log4js.error(`${err.stack}`)
});

module.exports = app
