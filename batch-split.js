// batch-split.js - SanYYao Fonts Factory (Final Edition)
// 集成：净空构建 + 智能目录分层 + 增量检测 + 循环修复

require('dotenv').config()
const { fontSplit } = require('cn-font-split')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
const path = require('path')
const fs = require('fs')

// 🟢 全局配置
const CONFIG = {
  // 你的 Worker 路由地址
  domain: 'https://fonts.sanyyao.com/use',
}

// 📡 初始化 R2
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
const BUCKET_NAME = process.env.R2_BUCKET_NAME

// 📂 路径定义
const srcDir = path.resolve(__dirname, 'src')
const distDir = path.resolve(__dirname, 'dist')
const SIGNAL_FILE = path.join(__dirname, '.has-new-fonts')

// ==========================================
// 🧹 0. 战场清扫 (Clean Slate Protocol)
// ==========================================
console.log('🧹 正在执行净空行动...')

// 1. 清理暗号文件
if (fs.existsSync(SIGNAL_FILE)) {
  fs.unlinkSync(SIGNAL_FILE)
}

// 2. 🔥 炸毁并重建 dist 目录 (确保只有新货)
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
  console.log('   💥 旧 dist 目录已移除')
}
fs.mkdirSync(distDir)
console.log('   ✅ dist 目录已重置')

// 3. 确保 src 存在
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir)

// ==========================================

// 🔍 关键点：在这里读取文件列表，定义 fonts 变量
const fonts = fs.readdirSync(srcDir).filter(file => /\.(ttf|otf)$/i.test(file))

if (fonts.length === 0) {
  console.log('⚠️  src 目录是空的！')
  process.exit()
}

/**
 * 🕵️‍♂️ 检查 R2 上是否已经存在该版本的 result.css
 */
async function checkRemoteExists(family, subDir) {
  // Key: ZPixel/Standard-v0.4/result.css
  const checkKey = `${family}/${subDir}/result.css`
  try {
    await R2.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: checkKey
    }))
    return true
  } catch (error) {
    return false
  }
}

console.log(`\n🔍 扫描到 ${fonts.length} 个字体文件`)
console.log(`📡 正在连接 R2 进行云端比对...\n`)

async function processFonts() {
  // ✅ 必须用 for...of 才能支持 await 和 continue
  for (const file of fonts) {
    const ext = path.extname(file)
    const filename = path.basename(file, ext) // 例如: "ZPixel-Standard-v0.4"

    // 🌟 1. 核心解析逻辑：抓取第一个 "-"
    const firstHyphenIndex = filename.indexOf('-')
    
    let familyName = filename
    let subDirName = 'v1.0' // 默认兜底

    if (firstHyphenIndex !== -1) {
      // 左边是家族: "ZPixel"
      familyName = filename.substring(0, firstHyphenIndex)
      // 右边全是子目录: "Standard-v0.4"
      subDirName = filename.substring(firstHyphenIndex + 1)
    } else {
      // 如果没有横杠，尝试匹配 v版本号
      const versionMatch = filename.match(/[-_ ]?(v\d+(\.\d+)*)$/i)
      if (versionMatch) {
         familyName = filename.replace(versionMatch[0], '')
         subDirName = versionMatch[1] 
      }
    }

    // 🌟 2. 智能生成 CSS 字体名
    // 从 "Standard-v0.4" 中把 "-v0.4" 拿掉 -> "Standard"
    let styleName = subDirName.replace(/[-_]?v\d+(\.\d+)*$/i, '') 
    if (!styleName) styleName = 'Regular'
    
    // 如果 subDirName 本身就是纯版本号(v1.0)，CSS名就是 Family
    const cssFamilyName = (subDirName.startsWith('v') && subDirName.length < 8) 
        ? familyName 
        : `${familyName}-${styleName}`

    
    // 🕵️‍♂️ 云端查重
    const isUploaded = await checkRemoteExists(familyName, subDirName)
    
    if (isUploaded) {
      console.log(`⏩ [跳过] ${familyName}/${subDirName} (云端已存在)`)
      continue // ✅ 现在这里不会报错了
    }

    // --- 新货逻辑 ---

    // 🚩 插旗
    if (!fs.existsSync(SIGNAL_FILE)) {
        fs.writeFileSync(SIGNAL_FILE, 'true')
    }

    const inputPath = path.join(srcDir, file)
    
    // 📂 3. 构造目录
    const outputDir = path.join(distDir, familyName, subDirName)
    const cdnPrefix = `${CONFIG.domain}/${familyName}/${subDirName}/`

    console.log(`🔪 正在处理: [${filename}]`)
    console.log(`   👉 家族: ${familyName} | 子目录: ${subDirName}`)
    console.log(`   👉 CSS名: ${cssFamilyName}`)

    try {
      await fontSplit({
        input: inputPath,
        outDir: outputDir,
        targetType: 'woff2',
        chunkSize: 70 * 1024,
        css: {
          fontFamily: cssFamilyName,
          fontWeight: '400',
        },
      })

      // 修正 CSS 路径
      const cssPath = path.join(outputDir, 'result.css')
      if (fs.existsSync(cssPath)) {
        let cssContent = fs.readFileSync(cssPath, 'utf-8')
        cssContent = cssContent.replace(/url\("\.\//g, `url("${cdnPrefix}`)
        fs.writeFileSync(cssPath, cssContent)

        // 🔥 Smart Latest 指针
        if (styleName !== 'Regular' && styleName !== subDirName) {
            const smartLatestDir = path.join(distDir, familyName, styleName, 'latest')
            if (!fs.existsSync(smartLatestDir)) fs.mkdirSync(smartLatestDir, { recursive: true })
            fs.copyFileSync(cssPath, path.join(smartLatestDir, 'result.css'))
            console.log(`   ✅ Smart Latest 指针已创建 -> ${familyName}/${styleName}/latest`)
        }
      }

      console.log(`🎉 [${filename}] 切分完成！\n`)
      
    } catch (e) {
      console.error(`❌ [${filename}] 失败:`, e)
    }
  }

  console.log('------------------------------------------------')
  console.log('🏁 切分阶段结束。')
  console.log('------------------------------------------------')
}

processFonts()