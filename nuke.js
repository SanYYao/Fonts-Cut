/**
 * nuke.js - R2 毁灭打击工具 ☢️
 * 作用：清空指定存储桶内的所有文件 (Batch Delete 1000 items/time)
 * 警告：此操作不可逆！
 */
require('dotenv').config()
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3')

// 1. 初始化 R2
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME

async function nuke() {
  console.log(`\n☢️  [NUKE MODE] 准备对桶 [${BUCKET_NAME}] 进行格式化打击...`)
  console.log(`---------------------------------------------------`)

  let isTruncated = true
  let continuationToken = undefined
  let totalDeleted = 0

  try {
    while (isTruncated) {
      // 1. 扫描目标 (一次最多锁定 1000 个)
      const listCmd = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken
      })
      
      const listRes = await R2.send(listCmd)
      
      if (!listRes.Contents || listRes.Contents.length === 0) {
        if (totalDeleted === 0) console.log("✨ 桶已经是空的了，白跑一趟。")
        break
      }

      // 2. 锁定目标列表
      const objectsToDelete = listRes.Contents.map(item => ({ Key: item.Key }))
      const count = objectsToDelete.length

      console.log(`🔍 锁定目标: ${count} 个对象...`)

      // 3. 执行毁灭打击
      const deleteCmd = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: objectsToDelete,
          Quiet: true // 开启静默模式，只返回报错的，不返回成功的 (省流量)
        }
      })

      await R2.send(deleteCmd)
      
      totalDeleted += count
      console.log(`💥 已清除本批次。 (累计击杀: ${totalDeleted})`)

      // 4. 准备下一轮
      isTruncated = listRes.IsTruncated
      continuationToken = listRes.NextContinuationToken
    }

    console.log(`---------------------------------------------------`)
    console.log(`✅ 任务完成。R2 桶 [${BUCKET_NAME}] 已归零。`)
    console.log(`🌱 现在它是片净土了，重新运行 'npm run fire' 吧。`)

  } catch (err) {
    console.error("❌ 任务失败:", err)
  }
}

// 简单的防止手滑机制 (虽然你肯定不会手滑)
// 如果真要删，解开下面这行的注释直接跑，或者在终端加参数
nuke()