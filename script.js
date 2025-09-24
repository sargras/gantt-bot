// 全局变量
let currentGantt = null;
let speechRecognizer = null;
let isListening = false;
let currentViewMode = 'Week';
let projectData = {
    name: '我的项目',
    tasks: []
};

// 智能指令库
const commandExamples = {
    create: [
        "创建网站开发项目，三周时间",
        "新建移动应用计划，明天开始",
        "开始营销活动项目，工期一个月"
    ],
    add: [
        "添加测试任务，需要5天时间",
        "在开发后加入代码评审环节",
        "项目最后添加用户培训"
    ],
    edit: [
        "把开发时间延长到10天",
        "将测试提前两天开始",
        "调整设计阶段为7天"
    ],
    delete: [
        "删除文档编写任务",
        "取消性能测试环节",
        "去掉最后的验收阶段"
    ]
};

// 设备检测
function detectPlatform() {
    const ua = navigator.userAgent;
    if (/Windows/.test(ua)) return { name: 'Windows', icon: '🪟', type: 'desktop' };
    if (/Macintosh/.test(ua)) return { name: 'Mac', icon: '🍎', type: 'desktop' };
    if (/iPad/.test(ua)) return { name: 'iPad', icon: '📱', type: 'mobile' };
    if (/iPhone/.test(ua)) return { name: 'iPhone', icon: '📱', type: 'mobile' };
    if (/Android/.test(ua)) return { name: 'Android', icon: '📱', type: 'mobile' };
    return { name: '未知设备', icon: '💻', type: 'desktop' };
}

// 初始化
function init() {
    const platform = detectPlatform();
    document.getElementById('platformIndicator').textContent = 
        `${platform.icon} ${platform.name}`;
    
    showDeviceGuide(platform);
    setupEventListeners();
    
    // 只有桌面端初始化语音识别
    if (platform.type === 'desktop') {
        initSpeechRecognition();
    }
    
    // 加载示例项目
    setTimeout(loadSampleProject, 500);
}

// 显示设备指南
function showDeviceGuide(platform) {
    const guide = document.getElementById('deviceGuide');
    
    if (platform.type === 'mobile') {
        guide.innerHTML = `
            <div class="mobile-voice-guide">
                <strong>📱 移动端语音输入指南</strong>
                <div class="guide-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div>点击输入框</div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div>点击键盘🎤图标</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div>开始说话</div>
                    </div>
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    说话后文字会自动填入，点击"执行指令"即可生成甘特图
                </div>
            </div>
        `;
    } else {
        guide.innerHTML = `
            <div class="guide-item">
                <span class="guide-icon">🎤</span>
                <div>
                    <strong>桌面端语音输入</strong>
                    <div>点击语音按钮，允许麦克风权限后直接说话</div>
                </div>
            </div>
        `;
    }
}

// 语音输入处理（统一入口）
function handleVoiceInput() {
    const platform = detectPlatform();
    
    if (platform.type === 'mobile') {
        // 移动端：引导使用自带语音输入
        showToast('请点击上方输入框，使用键盘的麦克风图标进行语音输入', 'info');
        document.getElementById('textInput').focus();
    } else {
        // 桌面端：使用Web Speech API
        toggleVoiceRecognition();
    }
}

// 语音识别初始化（仅桌面端）
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showToast('浏览器不支持语音识别', 'warning');
        return false;
    }

    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;
    speechRecognizer.lang = 'zh-CN';

    speechRecognizer.onstart = function() {
        isListening = true;
        updateVoiceUI(true, "🎤 正在聆听...");
        document.getElementById('recordingDot').classList.add('recording');
    };

    speechRecognizer.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('textInput').value = transcript;
        updateVoiceUI(false, "✅ 识别成功");
        document.getElementById('recordingDot').classList.remove('recording');
        
        showToast('语音识别完成！', 'success');
        setTimeout(processCommand, 500);
    };

    speechRecognizer.onerror = function(event) {
        isListening = false;
        updateVoiceUI(false, "❌ 识别失败");
        document.getElementById('recordingDot').classList.remove('recording');
        showToast('语音识别错误: ' + event.error, 'error');
    };

    speechRecognizer.onend = function() {
        isListening = false;
        document.getElementById('recordingDot').classList.remove('recording');
    };

    return true;
}

// 切换语音识别（仅桌面端）
function toggleVoiceRecognition() {
    if (!speechRecognizer && !initSpeechRecognition()) return;

    if (isListening) {
        speechRecognizer.stop();
    } else {
        try {
            speechRecognizer.start();
        } catch (error) {
            showToast('请刷新页面后重试', 'error');
        }
    }
}

// 更新语音界面
function updateVoiceUI(listening, status) {
    const button = document.getElementById('voiceButton');
    const statusEl = document.getElementById('voiceStatus');
    const voiceText = document.getElementById('voiceText');
    
    if (listening) {
        button.classList.add('listening');
        voiceText.textContent = '正在聆听...';
    } else {
        button.classList.remove('listening');
        voiceText.textContent = '点击开始语音输入';
    }
    statusEl.textContent = status;
}

// 输入方法切换
function switchInputMethod(method) {
    document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.input-area').forEach(area => area.classList.remove('active'));
    
    const methodBtn = document.querySelector(`.method-btn[onclick="switchInputMethod('${method}')"]`);
    if (methodBtn) methodBtn.classList.add('active');
    
    const area = document.getElementById(method + 'Area');
    if (area) area.classList.add('active');
}

// 智能时间解析器
class TimeParser {
    constructor(referenceDate = new Date()) {
        this.referenceDate = referenceDate;
    }
    
    parse(timeExpression) {
        const lowerExpr = timeExpression.toLowerCase();
        
        // 相对时间解析
        if (lowerExpr.includes('明天')) {
            const date = new Date(this.referenceDate);
            date.setDate(date.getDate() + 1);
            return date;
        }
        
        if (lowerExpr.includes('下周')) {
            const date = new Date(this.referenceDate);
            // 找到下周一
            const day = date.getDay();
            const daysUntilMonday = day === 0 ? 1 : 8 - day;
            date.setDate(date.getDate() + daysUntilMonday);
            return date;
        }
        
        if (lowerExpr.includes('下个月')) {
            const date = new Date(this.referenceDate);
            date.setMonth(date.getMonth() + 1);
            date.setDate(1); // 设置为下个月1号
            return date;
        }
        
        // 绝对时间解析 (简单版本)
        const dateMatch = timeExpression.match(/(\d{4})[年.-]?(\d{1,2})[月.-]?(\d{1,2})/);
        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // 默认返回当前时间
        return new Date(this.referenceDate);
    }
    
    parseDuration(durationExpr) {
        const lowerExpr = durationExpr.toLowerCase();
        let days = 0;
        
        // 解析天数
        const dayMatch = lowerExpr.match(/(\d+)\s*天/);
        if (dayMatch) {
            days += parseInt(dayMatch[1]);
        }
        
        // 解析周数
        const weekMatch = lowerExpr.match(/(\d+)\s*周/);
        if (weekMatch) {
            days += parseInt(weekMatch[1]) * 7;
        }
        
        // 解析中文数字
        const chineseNumbers = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
        for (const [cn, num] of Object.entries(chineseNumbers)) {
            if (lowerExpr.includes(cn + '天')) {
                days += num;
            }
            if (lowerExpr.includes(cn + '周')) {
                days += num * 7;
            }
        }
        
        return days > 0 ? days : 7; // 默认1周
    }
}

// 智能指令解析
function parseCommand(text) {
    console.log('解析指令:', text);
    const lowerText = text.toLowerCase();
    
    // 检测指令类型
    if (/(创建|新建|开始).*项目/.test(lowerText) || projectData.tasks.length === 0) {
        return parseCreateCommand(text);
    } else if (/(添加|加入|插入).*任务/.test(lowerText)) {
        return parseAddCommand(text);
    } else if (/(删除|取消|去掉).*任务/.test(lowerText)) {
        return parseDeleteCommand(text);
    } else if (/(调整|修改|改变|延长|缩短|提前|推后).*任务/.test(lowerText)) {
        return parseEditCommand(text);
    } else {
        // 尝试智能推断
        return trySmartParse(text);
    }
}

// 尝试智能推断指令类型
function trySmartParse(text) {
    const timeParser = new TimeParser();
    
    // 如果包含时间信息，尝试作为添加任务处理
    if (text.match(/(\d+[天周]|[一二三四五六七八九十][天周])/)) {
        return parseAddCommand("添加" + text);
    }
    
    // 默认作为创建项目处理
    return parseCreateCommand(text);
}

// 解析创建项目指令（增强时间识别）
function parseCreateCommand(text) {
    const timeParser = new TimeParser();
    const projectName = extractProjectName(text) || '我的项目';
    const duration = timeParser.parseDuration(text) || 21;
    const startDate = timeParser.parse(text);
    
    // 智能任务分配
    const tasks = createSmartTasks(startDate, duration, projectName);
    
    projectData = { 
        name: projectName, 
        tasks: tasks,
        startDate: startDate,
        totalDuration: duration
    };
    
    return projectData;
}

// 创建智能任务分配
function createSmartTasks(startDate, totalDuration, projectType) {
    let taskTemplates = [];
    
    // 根据项目类型选择不同的任务模板
    if (projectType.includes('网站') || projectType.includes('Web')) {
        taskTemplates = [
            { name: "需求分析", ratio: 0.15 },
            { name: "UI/UX设计", ratio: 0.20 },
            { name: "前端开发", ratio: 0.30 },
            { name: "后端开发", ratio: 0.25 },
            { name: "测试上线", ratio: 0.10 }
        ];
    } else if (projectType.includes('APP') || projectType.includes('应用')) {
        taskTemplates = [
            { name: "需求调研", ratio: 0.10 },
            { name: "原型设计", ratio: 0.15 },
            { name: "UI设计", ratio: 0.20 },
            { name: "开发实现", ratio: 0.40 },
            { name: "测试发布", ratio: 0.15 }
        ];
    } else {
        // 通用模板
        taskTemplates = [
            { name: "规划阶段", ratio: 0.20 },
            { name: "执行阶段", ratio: 0.60 },
            { name: "收尾阶段", ratio: 0.20 }
        ];
    }
    
    const tasks = [];
    let currentDate = new Date(startDate);
    
    taskTemplates.forEach(template => {
        const duration = Math.max(1, Math.floor(totalDuration * template.ratio));
        tasks.push({
            name: template.name,
            start: new Date(currentDate),
            duration: duration
        });
        
        currentDate.setDate(currentDate.getDate() + duration);
    });
    
    return tasks;
}

// 解析添加任务指令（增强时间识别）
function parseAddCommand(text) {
    const timeParser = new TimeParser();
    const taskName = extractTaskName(text) || '新任务';
    const duration = timeParser.parseDuration(text) || 5;
    
    // 确定插入位置
    let insertIndex = projectData.tasks.length; // 默认插入到最后
    let afterTask = null;
    
    // 检查是否指定了插入位置
    if (text.includes('后') || text.includes('之后')) {
        for (let i = 0; i < projectData.tasks.length; i++) {
            if (text.includes(projectData.tasks[i].name) || 
                text.includes(projectData.tasks[i].name.substring(0, 2))) {
                afterTask = projectData.tasks[i];
                insertIndex = i + 1;
                break;
            }
        }
    }
    
    // 计算开始时间
    let startDate;
    if (afterTask) {
        const afterEndDate = new Date(afterTask.start);
        afterEndDate.setDate(afterEndDate.getDate() + afterTask.duration);
        startDate = afterEndDate;
    } else {
        if (projectData.tasks.length > 0) {
            const lastTask = projectData.tasks[projectData.tasks.length - 1];
            startDate = new Date(lastTask.start);
            startDate.setDate(startDate.getDate() + lastTask.duration);
        } else {
            startDate = new Date();
        }
    }
    
    const newTask = {
        name: taskName,
        start: startDate,
        duration: duration
    };
    
    // 插入新任务
    projectData.tasks.splice(insertIndex, 0, newTask);
    
    // 重新计算后续任务的开始时间
    recalculateTaskTimeline();
    
    return projectData;
}

// 重新计算任务时间线
function recalculateTaskTimeline() {
    for (let i = 1; i < projectData.tasks.length; i++) {
        const prevTask = projectData.tasks[i - 1];
        const currentTask = projectData.tasks[i];
        
        const prevEndDate = new Date(prevTask.start);
        prevEndDate.setDate(prevEndDate.getDate() + prevTask.duration);
        
        // 如果当前任务开始时间早于前一个任务结束时间，进行调整
        if (currentTask.start < prevEndDate) {
            currentTask.start = new Date(prevEndDate);
        }
    }
}

// 解析编辑任务指令（增强时间识别）
function parseEditCommand(text) {
    const timeParser = new TimeParser();
    const lowerText = text.toLowerCase();
    
    // 查找要编辑的任务
    let targetTask = null;
    for (const task of projectData.tasks) {
        if (text.includes(task.name) || 
            text.includes(task.name.substring(0, 2)) ||
            (task.name.includes('开发') && lowerText.includes('开发')) ||
            (task.name.includes('测试') && lowerText.includes('测试')) ||
            (task.name.includes('设计') && lowerText.includes('设计'))) {
            targetTask = task;
            break;
        }
    }
    
    if (!targetTask) {
        showToast('未找到要编辑的任务', 'warning');
        return projectData;
    }
    
    // 处理时间延长/缩短
    if (lowerText.includes('延长') || lowerText.includes('增加') || lowerText.includes('加')) {
        const durationChange = timeParser.parseDuration(text) || 2;
        targetTask.duration += durationChange;
        showToast(`已将"${targetTask.name}"延长${durationChange}天`, 'success');
    }
    else if (lowerText.includes('缩短') || lowerText.includes('减少')) {
        const durationChange = timeParser.parseDuration(text) || 1;
        targetTask.duration = Math.max(1, targetTask.duration - durationChange);
        showToast(`已将"${targetTask.name}"缩短${durationChange}天`, 'success');
    }
    
    // 处理时间提前/推后
    if (lowerText.includes('提前')) {
        const days = timeParser.parseDuration(text) || 2;
        targetTask.start.setDate(targetTask.start.getDate() - days);
        showToast(`已将"${targetTask.name}"提前${days}天开始`, 'success');
    }
    else if (lowerText.includes('推后') || lowerText.includes('推迟')) {
        const days = timeParser.parseDuration(text) || 2;
        targetTask.start.setDate(targetTask.start.getDate() + days);
        showToast(`已将"${targetTask.name}"推后${days}天开始`, 'success');
    }
    
    // 重新计算时间线
    recalculateTaskTimeline();
    
    return projectData;
}

// 解析删除任务指令
function parseDeleteCommand(text) {
    const keyword = extractKeyword(text);
    if (!keyword) {
        showToast('请指定要删除的任务名称', 'warning');
        return projectData;
    }
    
    const originalLength = projectData.tasks.length;
    projectData.tasks = projectData.tasks.filter(task => 
        !task.name.includes(keyword)
    );
    
    if (projectData.tasks.length === originalLength) {
        showToast(`未找到包含"${keyword}"的任务`, 'warning');
    } else {
        showToast(`已删除包含"${keyword}"的任务`, 'success');
    }
    
    return projectData;
}

// 工具函数
function extractProjectName(text) {
    const match = text.match(/(创建|新建|开始)(一个)?(.+?)(项目|计划)/);
    return match ? match[3].trim() : null;
}

function extractTaskName(text) {
    const match = text.match(/(添加|加入|插入)(.+?)(任务|环节|阶段)/);
    return match ? match[2].trim() : null;
}

function extractKeyword(text) {
    const matches = text.match(/(需求|设计|开发|测试|分析|评审|培训|验收)/);
    return matches ? matches[0] : '任务';
}

// 主处理函数
function processCommand() {
    const commandText = document.getElementById('textInput').value.trim();
    
    if (!commandText) {
        showToast('请输入指令内容', 'warning');
        return;
    }
    
    try {
        const result = parseCommand(commandText);
        updateProjectTitle(result.name);
        generateGanttChart(result);
        showToast('指令执行成功！', 'success');
    } catch (error) {
        showToast('指令解析失败: ' + error.message, 'error');
        console.error(error);
    }
}

// 生成甘特图
function generateGanttChart(data) {
    const container = document.getElementById('gantt-container');
    container.innerHTML = '';
    
    if (!data.tasks || data.tasks.length === 0) {
        container.innerHTML = '<div class="placeholder"><div>暂无任务数据</div></div>';
        return;
    }
    
    const tasks = data.tasks.map((task, index) => ({
        id: `Task-${index}`,
        name: task.name,
        start: task.start.toISOString().split('T')[0],
        end: new Date(task.start.getTime() + task.duration * 86400000).toISOString().split('T')[0],
        progress: Math.min(50, Math.floor(Math.random() * 50))
    }));
    
    currentGantt = new Gantt(container, tasks, {
        view_mode: currentViewMode,
        language: 'zh',
        on_click: (task) => {
            showToast(`选中任务: ${task.name}`, 'info');
        },
        on_date_change: (task, start, end) => {
            // 支持拖拽编辑
            handleDragEdit(task.id, start, end);
        }
    });
}

// 处理拖拽编辑
function handleDragEdit(taskId, start, end) {
    const taskIndex = parseInt(taskId.replace('Task-', ''));
    if (projectData.tasks[taskIndex]) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const duration = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
        
        projectData.tasks[taskIndex].start = startDate;
        projectData.tasks[taskIndex].duration = duration;
        
        // 重新计算时间线
        recalculateTaskTimeline();
        
        // 刷新甘特图
        generateGanttChart(projectData);
        showToast('任务时间已更新', 'success');
    }
}

// 导出为图片
function exportAsImage() {
    const ganttContainer = document.getElementById('gantt-container');
    
    html2canvas(ganttContainer, {
        scale: 2, // 提高分辨率
        useCORS: true,
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `甘特图_${projectData.name}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('图片导出成功！', 'success');
    }).catch(error => {
        console.error('导出图片失败:', error);
        showToast('图片导出失败', 'error');
    });
}

// 导出项目数据
function exportProjectData() {
    const data = {
        project: projectData,
        exportTime: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `项目数据_${projectData.name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('项目数据导出成功', 'success');
}

// 导入项目数据
function importProjectData() {
    document.getElementById('fileInput').click();
}

// 处理文件导入
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.project && data.project.tasks) {
                projectData = data.project;
                updateProjectTitle(projectData.name);
                generateGanttChart(projectData);
                showToast('项目数据导入成功', 'success');
            } else {
                showToast('无效的项目文件', 'error');
            }
        } catch (error) {
            showToast('文件解析失败', 'error');
        }
    };
    reader.readAsText(file);
    
    // 清空文件输入
    event.target.value = '';
});

// 其他现有函数保持不变...
function changeViewMode(mode) {
    currentViewMode = mode;
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (currentGantt) {
        currentGantt.change_view_mode(mode);
    }
}

function quickCommand(type) {
    const examples = commandExamples[type];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    document.getElementById('textInput').value = randomExample;
    showToast(`已填充${type}指令示例`, 'info');
}

function showHelp() {
    document.getElementById('helpPanel').classList.add('show');
}

function hideHelp() {
    document.getElementById('helpPanel').classList.remove('show');
}

function updateProjectTitle(name) {
    document.getElementById('projectTitle').textContent = `📊 ${name}`;
}

function clearAll() {
    projectData = { name: '我的项目', tasks: [] };
    document.getElementById('textInput').value = '';
    document.getElementById('gantt-container').innerHTML = `
        <div class="placeholder">
            <div class="placeholder-icon">📈</div>
            <div class="placeholder-text">等待生成甘特图</div>
        </div>
    `;
    showToast('已清空所有数据', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('messageToast');
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type);
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 加载示例项目
function loadSampleProject() {
    if (projectData.tasks.length > 0) return;
    
    const startDate = new Date();
    projectData = {
        name: '示例项目',
        tasks: [
            {
                name: "需求分析与规划",
                start: new Date(startDate),
                duration: 3
            },
            {
                name: "UI/UX 设计",
                start: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
                duration: 5
            },
            {
                name: "前端开发",
                start: new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000),
                duration: 7
            },
            {
                name: "测试与上线",
                start: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000),
                duration: 4
            }
        ]
    };
    
    updateProjectTitle(projectData.name);
    generateGanttChart(projectData);
}

// 事件监听器设置
function setupEventListeners() {
    // 文本输入框回车键支持
    document.getElementById('textInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            processCommand();
        }
    });
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    console.log('智能甘特图助手已初始化');
});

// 响应式调整
window.addEventListener('resize', function() {
    if (currentGantt) {
        setTimeout(() => {
            currentGantt.refresh();
        }, 100);
    }
});
