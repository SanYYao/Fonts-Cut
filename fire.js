/**
 * fire.js - SanYYao Fonts Hub 总指挥官 💂‍♂️
 * 逻辑：增量检测 -> 只有在发现新字体时才触发上传和索引更新
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SIGNAL_FILE = path.join(__dirname, '.has-new-fonts');

// 🎨 控制台颜色工具
const color = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function runStep(name, command, args) {
    console.log(`${color.cyan}⚡️ [Executing]: ${name}...${color.reset}`);
    const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
    
    if (result.status !== 0) {
        console.error(`${color.red}❌ ${name} 挂了！任务终止。${color.reset}`);
        process.exit(1);
    }
}

async function missionStart() {
    console.log(`${color.green}🔥 Fire in the hole! 任务序列启动...${color.reset}\n`);

    // 1. 运行侦察兵 (切分)
    runStep('Batch Split', 'npm', ['run', 'split']);

    // 2. 检查暗号
    if (fs.existsSync(SIGNAL_FILE)) {
        console.log(`\n${color.green}🚩 侦察兵回报：发现新物资！全军出击！${color.reset}\n`);
        
        // 3. 按顺序执行后续任务
        runStep('Deploy to R2', 'npm', ['run', 'deploy']);
        runStep('Cloud Index', 'npm', ['run', 'index']);
        runStep('Local Full Index', 'npm', ['run', 'latest-index']);

        // 4. 打扫战场 (删除暗号)
        fs.unlinkSync(SIGNAL_FILE);
        
        console.log(`\n${color.green}✅ 所有战术动作已完成。收队！${color.reset}`);
    } else {
        console.log(`\n${color.yellow}😴 侦察兵回报：前线无战事 (无新字体)。${color.reset}`);
        console.log(`${color.yellow}🛑 任务序列已中断，节省了 R2 请求费用。${color.reset}`);
    }
}

missionStart();