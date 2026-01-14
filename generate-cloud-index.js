/**
 * generate-cloud-index.js (Absolute Path Edition)
 * 作用：远程扫描 R2，只收录 /latest/，并生成带域名的绝对路径索引。
 */
require('dotenv').config();
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

// 🛠️ 配置区：把你的域名填在这
const CDN_ROOT = 'https://fonts.sanyyao.com'; 

// 1. 初始化 R2 客户端
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function missionStart() {
    console.log(`📡 正在连接 R2 卫星... [绝对路径模式]`);

    try {
        let collectedFonts = [];
        let isTruncated = true;
        let continuationToken = undefined;

        console.log("🔍 扫描云端 latest 版本...");

        // 2. 循环扫描
        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken
            });
            const response = await R2.send(command);

            if (response.Contents) {
                response.Contents.forEach(item => {
                    // 过滤器：只抓 latest 版本的 result.css
                    if (item.Key.includes('/latest/') && item.Key.endsWith('result.css')) {
                        const fontName = item.Key.split('/')[0];
                        if (!collectedFonts.includes(fontName)) {
                            collectedFonts.push(fontName);
                            process.stdout.write(`+`);
                        }
                    }
                });
            }
            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }

        console.log(`\n✅ 锁定 ${collectedFonts.length} 款字体。`);

        if (collectedFonts.length === 0) {
            console.log("⚠️ 啥也没扫到，是不是桶里还是空的？");
            return;
        }

        // 3. 生成 CSS 内容 (✨ 关键修改：拼接绝对路径)
        let cssContent = `/* SanYYao Fonts Hub - Absolute Paths */\n`;
        cssContent += `/* Generated at: ${new Date().toLocaleString()} */\n\n`;
        
        collectedFonts.sort().forEach(font => {
            // ❌ 旧写法：@import url('./${font}/latest/result.css');
            // ✅ 新写法：直接带上域名
            const absoluteUrl = `${CDN_ROOT}/${font}/latest/result.css`;
            cssContent += `@import url('${absoluteUrl}');\n`;
        });

        console.log("📦 正在生成并上传 index.css ...");

        // 4. 上传
        const uploadCmd = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: 'index.css',
            Body: cssContent,
            ContentType: 'text/css',
            CacheControl: 'no-cache, no-store, must-revalidate'
        });

        await R2.send(uploadCmd);

        console.log("\n------------------------------------------------");
        console.log(`🚀 任务完成！绝对路径版索引已发布。`);
        console.log(`🔗 检查一下: ${CDN_ROOT}/index.css`);
        console.log("------------------------------------------------");

    } catch (err) {
        console.error("💥 翻车了:", err);
    }
}

missionStart();