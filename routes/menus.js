/*
 * @Descripttion: js
 * @Version: 1.0
 * @Author: name
 * @Date: 2024-12-19 19:45:32
 * @LastEditors: name
 * @LastEditTime: 2024-12-22 21:03:28
 */
const router=require('koa-router')()
const util=require('../utils/util')
const Menu=require('../models/menuSchema')
const { get } = require('mongoose')

router.prefix('/menu')

// 菜单列表查询
router.get('/list',async(ctx)=>{
  // ctx.request.query 写错成 ctx.request.body
  const { menuName,menuState} =ctx.request.query
  const params={}
  if(menuName) params.menuName=menuName
  if(menuState) params.menuState=menuState
  let rootList=await Menu.find(params)||[]
  const permissionList=util.getTreeMenu(rootList,null,[])
  ctx.body=util.success(permissionList)
})



// 菜单编辑、删除、新增功能
router.post('/operate',async(ctx)=>{
  const { _id,action,...params } =ctx.request.body
  let res,info
  try {
    if(action == 'add'){
      res=await Menu.create(params)
      info='创建成功'
    }else if(action== 'edit'){
      params.updateTime=new Date()
      res=await Menu.findByIdAndUpdate(_id,params)
      info='编辑成功'
    }else{
      // findByIdAndRemove 弃用  使用findByIdAndDelete 
      res=await Menu.findByIdAndDelete(_id)
      await Menu.deleteMany({parentId:{$all:[_id]}})
      info='删除成功'
    }
    ctx.body=util.success('',info)
  } catch (error) {
    ctx.body=util.fail(error.stack)
  }
})


module.exports=router