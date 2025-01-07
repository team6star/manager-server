const router=require('koa-router')()
const Role=require('../models/roleSchema')
const util=require('../utils/util')


router.prefix('/roles')

// 查询所有角色列表
router.get('/allList',async (ctx)=>{
  try {
    const list=await Role.find({},'_id roleName')
    ctx.body=util.success(list)
  } catch (error) {
    ctx.body=util.fail(`查询失败：${error.stack}`)
  }
})

// 按页获取角色列表
router.get('/list',async (ctx)=>{
  const {roleName}=ctx.request.query
  const {page,skipIndex}= util.pager(ctx.request.query)
  try {
    let params={}
    if(roleName) params.roleName=roleName
    const query=Role.find(params)
    const list=await query.skip(skipIndex).limit(page.pageSize)
    const total=await Role.countDocuments(params)
    ctx.body=util.success({
      list,
      page:{
        ...page,
       total
      }
    })
  } catch (error) {
    ctx.body=util.fail(`查询失败：${error.stack}`)
  }
})

// 角色操作：创建、编辑和删除
router.post('/operate',async (ctx) => {
  console.log('在解构赋值前打印请求体：', ctx.request.body);
  // const {_id,roleName,remark,action}= ctx.request.body
  const { _id, roleName, remark, action} = ctx.request.body;
  console.log('解构赋值后各个变量情况：', {_id, roleName, remark, action});
  let res,info
  try {
    if(action == 'create'){
      // 创建
      res=await Role.create({roleName,remark})
      info='创建成功'
    }else if(action == 'edit'){
      if(_id){
        let params={roleName,remark}
        params.update=new Date()
        // 编辑
        res=await Role.findByIdAndUpdate(_id,params)
        info='编辑成功'
      }else{
        ctx.body=util.fail('缺少参数params：_id')
        return
      }
    }else {
      if(_id){
        // 删除 findByIdAndRemove已被弃用
        res=await Role.findByIdAndDelete(_id)
        info='删除成功'
      }else{
        ctx.body=util.fail('缺少参数params：_id')
        return
      }
    }
    ctx.body=util.success(res,info)
  } catch (error) {
    ctx.body=util.fail(`操作失败：${error.stack}`)
  }
})

// 权限设置
router.post('/update/permission', async (ctx) => {
  console.log('在解构赋值前打印请求体：', ctx.request.body);
  const { _id, permissionList } = ctx.request.body;
  try {
    let params = { permissionList, update: new Date() }
    let res = await Role.findByIdAndUpdate(_id, params)
    ctx.body = util.success('', "权限设置成功")
  } catch (error) {
    ctx.body = util.fail("权限设置失败")
  }
})


module.exports=router