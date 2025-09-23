// 示例指令库
const examples = [
    "创建网站开发项目，下周一开始，三周时间。第一周需求分析，第二周UI设计，第三周开发测试",
    "新产品发布计划，共15天。前5天市场调研，中间5天产品开发，最后5天测试上线",
    "营销活动策划，明天开始。3天方案设计，2天内容制作，3天执行推广",
    "公司年会筹备，下个月一号开始。第一周策划方案，第二周场地预定，第三周节目排练，第四周现场执行",
    "移动应用开发，四周完成。第一周原型设计，第二周前端开发，第三周后端开发，第四周测试上线"
];

// 设置示例指令到输入框
function setExample(index) {
    document.getElementById('commandInput').value = examples[index];
}

// 简单的自然语言解析器
function parseCommand(text) {
    console.log("原始指令：", text);
    
    const lowerText = text.toLowerCase().trim();

    // 1. 提取项目名称
    let projectName = "我的项目";
    const projectMatch = text.match(/(项目|项目名|创建|新建)[：: ]?(.+?)(，|,|\.|$)/);
    if (projectMatch && projectMatch[2]) {
        projectName = projectMatch[2].trim();
    } else {
        const firstPart = text.split(/[，,\.。]/)[0];
        if (firstPart.length > 2 && firstPart.length < 30) {
            projectName = firstPart;
        }
    }

    // 2. 解析时间信息
    let startDate = new Date();
    
    if (lowerText.includes('下周一')) {
        startDate = getNextMonday();
    } else if (lowerText.includes('明天')) {
        startDate.setDate(startDate.getDate() + 1);
    } else if (lowerText.includes('下周')) {
        startDate.setDate(startDate.getDate() + 7);
    } else if (lowerText.includes('下月') || lowerText.includes('下个月')) {
        startDate.setMonth(startDate.getMonth() + 1);
    }

    // 3. 解析任务
    const tasks = [];
    let currentDate = new Date(startDate);

    // 智能任务分割
    const taskSections = text.split(/[，,。\.；;]/).filter(section => section.trim().length > 0);
    
    for (let section of taskSections) {
        if (section.includes('项目') || section.includes('创建') || section.length < 3) continue;
        
        let duration = 3; // 默认3天
        let taskName = section.trim();
        
        // 提取时间信息
        const timeMatch = section.match(/(\d+)[天日周]|第[一二三四五六七八九十]+[周天]|([一二三四五六七八九十]+)[天日周]/);
        if (timeMatch) {
            if (timeMatch[1]) {
                duration = parseInt(timeMatch[1]);
                if (section.includes('周')) duration *= 7;
            } else {
                const chineseNumbers = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
                for (let char of timeMatch[0]) {
                    if (chineseNumbers[char]) {
                        duration = chineseNumbers[char];
                        if (section.includes('周')) duration *= 7;
                        break;
                    }
                }
            }
            // 从任务名中移除时间信息
            taskName = taskName.replace(timeMatch[0], '').trim();
        }
        
        if (taskName && taskName.length > 1) {
            tasks.push({
                name: taskName,
                start: new Date(currentDate),
                duration: Math.max(1, duration) // 至少1天
            });
            
            currentDate.setDate(currentDate.getDate() + duration);
        }
    }

    // 如果没解析出任务，使用关键词匹配
    if (tasks.length === 0) {
        const keywords = [
            { key: '需求', name: '需求分析' }, { key: '设计', name: 'UI设计' },
            { key: '开发', name: '程序开发' }, { key: '测试', name: '测试验收' },
            { key: '调研', name: '市场调研' }, { key: '策划', name: '方案策划' },
            { key: '制作', name: '内容制作' }, { key: '推广', name: '推广执行' }
        ];
        
        let currentDateBackup = new Date(startDate);
        
        keywords.forEach(keyword => {
            if (lowerText.includes(keyword.key)) {
                tasks.push({
                    name: keyword.name,
                    start: new Date(currentDateBackup),
                    duration: 5
                });
                currentDateBackup.setDate(currentDateBackup.getDate() + 5);
            }
        });
    }

    // 如果仍然没有任务，提供示例
    if (tasks.length === 0) {
        projectName = "示例项目";
        const today = new Date();
        tasks.push(
            { name: "需求分析和规划", start: today, duration: 3 },
            { name: "UI/UX 设计", start: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), duration: 5 },
            { name: "程序开发", start: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000), duration: 7 }
        );
    }

    return { project: projectName, tasks: tasks };
}

// 获取下周一
function getNextMonday() {
    const result = new Date();
    const day = result.getDay();
    const diff = day === 0 ? 1 : (8 - day) % 7;
    result.setDate(result.getDate() + diff);
    return result;
}

// 主处理函数
function processCommand() {
    const commandText = document.getElementById('commandInput').value.trim();
    const errorDiv = document.getElementById('errorMessage');

    if (!commandText) {
        errorDiv.textContent = "请输入指令！点击示例文本可以快速填充。";
        return;
    }
    
    errorDiv.textContent = "";
    
    try {
        const ganttData = parseCommand(commandText);
        generateGanttChart(ganttData);
    } catch (error) {
        errorDiv.textContent = `解析出错：${error.message}`;
        console.error(error);
    }
}

// 生成甘特图
function generateGanttChart(data) {
    const container = document.getElementById('gantt-container');
    container.innerHTML = `<h3>📊 项目：${data.project}</h3>`;
    
    if (data.tasks.length === 0) {
        container.innerHTML += '<p>未能解析出具体任务，请尝试更清晰的指令</p>';
        return;
    }

    const tasks = data.tasks.map((task, index) => ({
        id: `Task-${index}`,
        name: task.name,
        start: task.start.toISOString().split('T')[0],
        end: new Date(task.start.getTime() + task.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: Math.min(30, Math.floor(Math.random() * 30)) // 随机进度
    }));

    // 创建甘特图
    const gantt = new Gantt(container, tasks, {
        view_mode: 'Week',
        language: 'zh',
        on_click: function(task) {
            console.log('任务点击:', task);
        }
    });
}

// 页面加载时初始化示例轮播
document.addEventListener('DOMContentLoaded', function() {
    console.log("甘特图助手已加载");
    
    // 示例指令轮播
    let exampleIndex = 0;
    const exampleElement = document.querySelector('.examples h3');
    const originalText = exampleElement.textContent;
    
    setInterval(() => {
        exampleElement.textContent = `💡 示例：${examples[exampleIndex]}`;
        exampleIndex = (exampleIndex + 1) % examples.length;
    }, 4000);
});