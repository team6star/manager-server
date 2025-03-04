/*
 * @Descripttion: js
 * @Version: 1.0
 * @Author: name
 * @Date: 2024-12-03 15:23:00
 * @LastEditors: name
 * @LastEditTime: 2024-12-23 16:30:08
 */
/**
 * 用户管理模块
 */
const router = require('koa-router')()
const User=require('./../models/userSchema')
const Menu=require('./../models/menuSchema')
const Role=require('./../models/roleSchema')
const Counter=require('../models/counterSchema')
const util=require('../utils/util')
const jwt=require('jsonwebtoken')
const md5=require('md5')
// 设置路由前缀为 /users
router.prefix('/users')

// ./login 路径写错了
// koa2语法
// 登录接口，处理用户登录请求
router.post('/login',async(ctx)=>{
  try {
    // 从请求体中获取用户名和密码
    const {userName,userPwd}=ctx.request.body
    /**
     * 查询数据库，匹配用户名和密码，并返回指定字段
     * 返回数据库指定字段，有三种方式
     * 1.'userId userName userEmail state role deptId roleList'
     * 2.{userId:1,_id:0}
     * 3.select('userId')
     */
    // 查询数据库，查找与用户名和密码匹配的用户记录
    const res=await User.findOne({
      userName,
      // 疏忽 也需要使用md5进行验证
      userPwd:md5(userPwd)
    },'userId userName userEmail state role deptId roleList')
   

    // 如果查询到用户
    if(res){
       // 获取查询结果的数据部分
    const data=res._doc
    // token设置
    // 使用用户的详细信息作为 payload，密钥为 'imooc'，过期时间为 1 小时
    const token=jwt.sign({
      data
    },'imooc',{expiresIn:'1h'})
      // 将生成的 token 添加到返回的数据中
      data.token=token
      // 返回成功响应，包含用户数据和 token
      ctx.body=util.success(data)
    }else{
      // 如果未找到用户，返回失败响应，提示账号或密码不正确
      ctx.body=util.fail('账号或密码不正确')
    }
  } catch (error) {
    // 如果发生错误，返回失败响应，包含错误信息
    ctx.body=util.fail(error.msg)
  }
})
// 用户列表
router.get('/list',async(ctx)=>{
  const {userId,userName,state}=ctx.request.query
  const {page,skipIndex}= util.pager(ctx.request.query)
  let params={}
  if(userId)params.userId=userId
  if(userName)params.userName=userName
  if(state &&state!='0')params.state=state
  try {
    // 根据条件查询所有的用户列表
    const query=User.find(params,{userPwd:0,_id:0})
    const list= await query.skip(skipIndex).limit(page.pageSize)

    const total=await User.countDocuments(params)

    ctx.body=util.success({
      page:{
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body=util.fail(`查询异常:${error.stack}`)
  }
})

// 获取全量用户列表
router.get('/all/list',async(ctx)=>{
  try {
    const list=await User.find({},'userId userName userEmail')
    ctx.body=util.success(list)
  } catch (error) {
    ctx.body=util.fail(error.stack)
  }
})
// 用户删除/批量删除
router.post('/delete',async(ctx)=>{
  // 待删除的用户Id数组
  const {userIds}=ctx.request.body
  // User.updateMany({$or:[{usrId:10001},{usrId:10002}]})
  // const res=await User.updateMany({userId:{$in:userIds}},{state:2})
  // res.nModified 获取不到
  const res = await User.updateMany({ userId: { $in: userIds } }, { state: 2 })   
  if(res.modifiedCount){
    ctx.body=util.success(res,`共删除成功${res.modifiedCount}条`)
      return
    } 
    ctx.body=util.fail('删除失败')
  
  // console.log('userIds=>',userIds)
  console.log('=>',res,res.modifiedCount)
  // ctx.body=util.fail('删除失败')
})

// 用户新增/编辑
router.post('/operate',async(ctx)=>{
  const {userId,userName,userEmail,mobile,job,state,roleList,deptId,action}=ctx.request.body
  if(action =='add'){
    if(!userName ||!userEmail||!deptId){
      ctx.body=util.fail('参数错误',util.CODE.PARAM_ERROR)
      return
    }
    const res=await User.findOne({$or:[{userName},{userEmail}]},'_id userName userEmail')  
    if(res){
      ctx.body=util.fail(`系统监测到有重复的用户，信息如下：${res.userName}-${res.userEmail}`)
    }else{
      const doc=await Counter.findOneAndUpdate({_id:'userId'},{$inc:{sequence_value:1}},{new:true})
      try {
        const user=new User({
          userId:doc.sequence_value,
          userName,
          userPwd: md5('123456'),
          userEmail,
          role:1,//默认普通用户
          roleList,
          job,
          state,
          deptId,
          mobile
        })
        user.save()
        ctx.body=util.success('','用户创建成功')
      } catch (error) {
        ctx.body=util.fail(error.stack,'用户创建失败')
      }
    }
  }else{
    if(!deptId){
      ctx.body=util.fail('部门不能为空',util.CODE.PARAM_ERROR)
      return
    }
    try {
      const res =await User.findOneAndUpdate({userId},{mobile,job,state,roleList,deptId})
      ctx.body=util.success('','更新成功')
    } catch (error) {
      ctx.body=util.fail(error.stack,'更新失败')
    }
  }
})

// 获取用户对应的权限菜单
router.get('/getPermissionList',async(ctx)=>{
  let authorization=ctx.request.headers.authorization
  let {data}=util.decoded(authorization)
  let menuList=await getMenuList(data.role,data.roleList)
  let actionList=getActionList(JSON.parse(JSON.stringify(menuList)))
  ctx.body=util.success({menuList,actionList})
})

async function getMenuList(userRole,roleKeys){
  let rootList=[]
  if(userRole == 0){
    rootList=await Menu.find({})||[]
  }else{
    // 根据用户拥有的角色，获取权限列表
    //先查找用户对应的角色有那些
   let roleList= await Role.find({_id:{$in:roleKeys}})
   let permissionList=[]
   roleList.map(role=>{
    let {checkedKeys,halfCheckedKeys}=role.permissionList
    permissionList=permissionList.concat([...checkedKeys,...halfCheckedKeys])
   })
   permissionList=[...new Set(permissionList)]
   rootList=await Menu.find({_id:{$in:permissionList}})
  }
  return util.getTreeMenu(rootList,null,[])
 
}
function getActionList(list){
  const actionList=[]
  const deep = (arr) => {
    while (arr.length) {
      let item = arr.pop()
      if ( item.action) {
       item.action.map(action=>{
        actionList.push(action.menuCode)
       })
      } if (item.children && !item.action) {
        deep(item.children)
      }
    }
  }
  deep(list)
  return actionList
}
// 导出路由器实例，以便在其他地方使用
module.exports = router
