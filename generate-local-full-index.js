/**
 * generate-local-full-index.js
 * 作用：扫描 R2 上所有的 result.css (包含历史版本 + latest)，
 * 在本地生成 index.css，用于提交到 GitHub。
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// 🛠️ 配置区
const CONFIG = {
    // 你的字体 CDN 域名 (必须是 R2 的公开访问地址)
    domain: 'https://fonts.sanyyao.com',
    // 输出文件名
    outputFile: 'index.css' 
};

// 初始化 R2
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function generate() {
    console.log(`📡 正在连接 R2... 准备拉取全量字体列表`);

    try {
        let allKeys = [];
        let isTruncated = true;
        let continuationToken = undefined;

        // 1. 循环扫描所有文件
        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken
            });
            const response = await R2.send(command);

            if (response.Contents) {
                response.Contents.forEach(item => {
                    // 只要是 result.css 结尾的，统统都要 (不管是不是 latest)
                    if (item.Key.endsWith('result.css')) {
                        allKeys.push(item.Key);
                        process.stdout.write('.'); // 打印进度
                    }
                });
            }
            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }

        console.log(`\n✅ 扫描完毕！共发现 ${allKeys.length} 个字体版本节点。`);

        // 2. 排序 (让同一个家族的字体靠在一起)
        // 排序逻辑：先按家族名排，再按版本号排
        allKeys.sort(); 

        // 3. 生成内容
        let cssContent = `/* SanYYao Fonts Hub - Full Index */\n`;
        cssContent += `/* Generated at: ${new Date().toLocaleString()} */\n`;
        cssContent += `/* Hosted on GitHub, Assets served from R2 */\n\n`;

        let currentFamily = '';

        allKeys.forEach(key => {
            // key 的格式: Dymon/v1.0/result.css
            const parts = key.split('/');
            const familyName = parts[0];
            const version = parts[1];

            // 加个注释隔断，方便阅读
            if (familyName !== currentFamily) {
                cssContent += `\n/* --- ${familyName} --- */\n`;
                currentFamily = familyName;
            }

            // 拼接绝对路径
            const absoluteUrl = `${CONFIG.domain}/${key}`;
            
            // 写入 import
            // 例如: @import url('https://fonts.sanyyao.com/Dymon/v1.0/result.css');
            cssContent += `@import url('${absoluteUrl}');\n`;
        });

        // 4. 写入本地文件
        fs.writeFileSync(CONFIG.outputFile, cssContent);

        console.log("\n------------------------------------------------");
        console.log(`🎉 全量索引已生成: ./${CONFIG.outputFile}`);
        console.log(`📝 包含版本: Latest 及所有历史版本`);
        console.log(`🚀 下一步: git add index.css && git commit -m "Update fonts index" && git push`);
        console.log("------------------------------------------------");

    } catch (err) {
        console.error("💥 失败:", err);
    }
}

generate();