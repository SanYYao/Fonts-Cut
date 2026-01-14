// batch-split.js - SanYYao Fonts Factory (V6.0 增量构建版)
// 能够自动检测 R2，已存在的版本直接跳过，只切新的！

require('dotenv').config() // 读取 .env 里的 R2 密钥
const { fontSplit } = require('cn-font-split')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
const path = require('path')
const fs = require('fs')

// 🟢 全局配置
const CONFIG = {
  domain: 'https://fonts.sanyyao.com',
}

// 📡 初始化 R2 侦察兵
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
const BUCKET_NAME = process.env.R2_BUCKET_NAME

const srcDir = path.resolve(__dirname, 'src')
const distDir = path.resolve(__dirname, 'dist')

if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir)
const fonts = fs.readdirSync(srcDir).filter(file => /\.(ttf|otf)$/i.test(file))

if (fonts.length === 0) {
  console.log('⚠️  src 目录是空的！')
  process.exit()
}

/**
 * 🕵️‍♂️ 检查 R2 上是否已经存在该版本的 result.css
 */
async function checkRemoteExists(family, version) {
  const checkKey = `${family}/${version}/result.css`
  try {
    // HeadObject 极其轻量，只读元数据，不下载文件
    await R2.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: checkKey
    }))
    return true // 没报错说明文件存在
  } catch (error) {
    return false // 报错(404)说明不存在
  }
}

console.log(`🔍 扫描到 ${fonts.length} 个字体文件`)
console.log(`📡 正在连接 R2 进行云端比对...\n`)

async function processFonts() {
  for (const file of fonts) {
    const ext = path.extname(file)
    const filename = path.basename(file, ext)

    let familyName = filename
    let version = 'v1.0'

    // 🔥 1. 智能提取版本号
    const versionMatch = filename.match(/[-_ ]?(v\d+(\.\d+)*)$/i)
    if (versionMatch) {
      version = versionMatch[1]
      familyName = filename.replace(versionMatch[0], '')
    }

    // 🕵️‍♂️ 2. 关键判断：云端查重
    const isUploaded = await checkRemoteExists(familyName, version)
    
    if (isUploaded) {
      // ⏩ 如果 R2 上有了，直接跳过
      console.log(`⏩ [跳过] ${familyName} ${version} (云端已存在)`)
      continue 
    }

    // --- 下面是原本的切分逻辑，只有“新货”才会执行到这里 ---

    const inputPath = path.join(srcDir, file)
    const outputDir = path.join(distDir, familyName, version)
    const latestDir = path.join(distDir, familyName, 'latest')
    const cdnPrefix = `${CONFIG.domain}/${familyName}/${version}/`

    console.log(`🔪 正在处理: [${filename}]`)
    console.log(`   👉 家族: ${familyName} | 版本: ${version}`)

    try {
      // 3. 切分到实体版本目录
      await fontSplit({
        input: inputPath,
        outDir: outputDir,
        targetType: 'woff2',
        chunkSize: 70 * 1024,
        css: {
          fontFamily: familyName,
          fontWeight: '400',
        },
      })

      // 4. 修正 CSS 路径
      const cssPath = path.join(outputDir, 'result.css')
      if (fs.existsSync(cssPath)) {
        let cssContent = fs.readFileSync(cssPath, 'utf-8')
        cssContent = cssContent.replace(/url\("\.\//g, `url("${cdnPrefix}`)
        fs.writeFileSync(cssPath, cssContent)

        // 🔥 5. 复活 Latest 指针
        if (!fs.existsSync(latestDir)) fs.mkdirSync(latestDir, { recursive: true })
        fs.copyFileSync(cssPath, path.join(latestDir, 'result.css'))

        console.log(`   ✅ Latest 指针已更新 -> 指向 ${version}`)
      }

      console.log(`🎉 [${familyName}] 切分完成！准备上传...\n`)
      
    } catch (e) {
      console.error(`❌ [${filename}] 失败:`, e)
    }
  }

  console.log('------------------------------------------------')
  console.log('🏁 任务结束。只有上面显示 "🎉" 的字体是新生成的。')
  console.log('   请检查 dist 目录，并运行 deploy.js 上传这些新兵蛋子。')
  console.log('------------------------------------------------')
}

processFonts()