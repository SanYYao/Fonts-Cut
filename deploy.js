// deploy.js - R2 批量上传工具
require('dotenv').config()
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

// 🟢 配置 R2 客户端
const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const DIST_DIR = path.resolve(__dirname, 'dist')

// 递归获取所有文件
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file))
    }
  })

  return arrayOfFiles
}

async function upload() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ 找不到 dist 目录，请先运行 batch-split.js')
    return
  }

  console.log('📦 开始扫描 dist 目录...')
  const files = getAllFiles(DIST_DIR)
  console.log(`🔍 发现 ${files.length} 个文件，准备上传 R2...`)
  console.log('------------------------------------------------')

  let successCount = 0

  for (const filePath of files) {
    // 计算 R2 中的存储路径 (Key)
    // 例如: E:\fonts-cut\dist\Tangyuan\v1.0\result.css -> Tangyuan/v1.0/result.css
    const relativePath = path.relative(DIST_DIR, filePath)
    // Windows 的反斜杠 \ 需要替换成 /
    const objectKey = relativePath.split(path.sep).join('/')

    const fileContent = fs.readFileSync(filePath)
    const contentType = mime.lookup(filePath) || 'application/octet-stream'

    console.log(`🚀 Uploading: ${objectKey} [${contentType}]`)

    try {
      await S3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: fileContent,
          ContentType: contentType,
          // 🔥 关键：直接设置浏览器缓存 1 年，极致性能！
          CacheControl: 'public, max-age=31536000, immutable',
        })
      )
      successCount++
    } catch (e) {
      console.error(`❌ Upload Failed: ${objectKey}`, e)
    }
  }

  console.log('------------------------------------------------')
  console.log(`🎉 全部完成！成功上传: ${successCount} / ${files.length}`)
}

upload()
