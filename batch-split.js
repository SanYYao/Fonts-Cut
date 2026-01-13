// batch-split.js - SanYYao Fonts Factory (V5.1 最终完全体)
const { fontSplit } = require('cn-font-split')
const path = require('path')
const fs = require('fs')

// 🟢 全局配置
const CONFIG = {
  domain: 'https://fonts.sanyyao.com',
}

const srcDir = path.resolve(__dirname, 'src')
const distDir = path.resolve(__dirname, 'dist')

if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir)
const fonts = fs.readdirSync(srcDir).filter(file => /\.(ttf|otf)$/i.test(file))

if (fonts.length === 0) {
  console.log('⚠️  src 目录是空的！')
  process.exit()
}

console.log(`🔍 发现 ${fonts.length} 个字体文件，智能识别 + Latest 模式启动...\n`)

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

    const inputPath = path.join(srcDir, file)

    // 📂 2. 定义目录结构
    // 实体库: dist/Dymon/v2.2/
    const outputDir = path.join(distDir, familyName, version)
    // 传送门: dist/Dymon/latest/
    const latestDir = path.join(distDir, familyName, 'latest')

    // 🔗 CDN 绝对前缀 (永远指向实体库)
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
        // 替换为 R2 绝对路径
        cssContent = cssContent.replace(/url\("\.\//g, `url("${cdnPrefix}`)
        fs.writeFileSync(cssPath, cssContent)

        // 🔥 5. 复活吧，Latest！
        // 把刚改好的指向 v2.2 的 CSS，复制一份到 latest 文件夹
        if (!fs.existsSync(latestDir)) fs.mkdirSync(latestDir, { recursive: true })
        fs.copyFileSync(cssPath, path.join(latestDir, 'result.css'))

        console.log(`   ✅ Latest 指针已更新 -> 指向 ${version}`)
      }

      console.log(`🎉 [${familyName}] 完成！\n`)
    } catch (e) {
      console.error(`❌ [${filename}] 失败:`, e)
    }
  }
  console.log('------------------------------------------------')
  console.log('📤 上传指南:')
  console.log('请将 dist 下的所有【家族文件夹】(包含 vX.X 和 latest) 拖入 R2。')
  console.log('------------------------------------------------')
}

processFonts()
