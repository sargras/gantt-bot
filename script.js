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
    if (/Windows/.test(ua)) return { name: 'Windows', icon: '🪟' };
    if (/Macintosh/.test(ua)) return { name: 'Mac', icon: '🍎' };
    if (/iPad/.test(ua)) return { name: 'iPad', icon: '📱' };
    if (/iPhone/.test(ua)) return { name: 'iPhone', icon: '📱' };
    if (/Android/.test(ua)) return { name: 'Android', icon: '📱' };
    return { name: '未知设备', icon: '💻' };
}

// 初始化
function init() {
    const platform = detectPlatform();
    document.getElementById('platformIndicator').textContent = 
        `${platform.icon} ${platform.name}`;
    
    showDeviceGuide(platform);
    setupEventListeners();
    
    if (platform.name === 'Windows' || platform.name === 'Mac') {
        initSpeechRecognition();
    }
}

// 显示设备指南
function showDeviceGuide(platform) {
    const guide = document.getElementById('deviceGuide');
    let html = '';
    
    if (platform.name === 'Windows' || platform.name === 'Mac') {
        html = `
            <div class="guide-item">
                <span class="guide-icon">🎤</span>
                <div>
                    <strong>桌面端语音输入</strong>
                    <div>点击语音按钮，允许麦克风权限后直接说话</div>
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="guide-item">
                <span class="guide-icon">📱</span>
                <div>
                    <strong>移动端语音输入</strong>
                    <div>点击输入框 → 键盘麦克风图标 → 开始说话</div>
                </div>
            </div>
            <div class="guide-item">
                <span class="guide-icon">💡</span>
                <div>
                    <strong>提示</strong>
                    <div>移动端建议使用文本输入，识别更准确</div>
                </div>
            </div>
        `;
    }
    
    guide.innerHTML = html;
}

// 事件监听器设置
function setupEventListeners() {
    // 文本输入框回车键支持
    document.getElementById('textInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            processCommand();
        }
    });
}

// 语音识别初始化
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

// 切换语音识别
function toggleVoiceRecognition() {
    const platform = detectPlatform();
    
    if (platform.name === 'iPad' || platform.name === 'iPhone' || platform.name === 'Android') {
        showToast('请使用设备自带的语音输入功能', 'info');
        document.getElementById('textInput').focus();
        return;
    }

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
    
    document.querySelector(`.method-btn[onclick="switchInputMethod('${method}')"]`).classList.add('active');
    document.getElementById(method + 'Area').classList.add('active');
}

// 智能指令解析
function parseCommand(text) {
    console.log('解析指令:', text);
    const lowerText = text.toLowerCase();
    
    // 检测指令类型
    if (/(创建|新建|开始).*项目/.test(lowerText)) {
        return parseCreateCommand(text);
    } else if (/(添加|加入|插入).*任务/.test(lowerText)) {
        return parseAddCommand(text);
    } else if (/(删除|取消|去掉).*任务/.test(lowerText)) {
        return parseDeleteCommand(text);
    } else if (/(调整|修改|改变|延长|缩短).*任务/.test(lowerText)) {
        return parseEditCommand(text);
    } else {
        return parseCreateCommand(text); // 默认按创建处理
    }
}

// 解析创建项目指令
function parseCreateCommand(text) {
    const projectName = extractProjectName(text) || '我的项目';
    const duration = extractDuration(text) || 21; // 默认3周
    const startDate = new Date();
    
    const tasks = [
        { name: "需求分析", start: new Date(startDate), duration: Math.floor(duration * 0.2) },
        { name: "方案设计", start: new Date(startDate.getTime() + duration * 0.2 * 86400000), duration: Math.floor(duration * 0.3) },
        { name: "开发实施", start: new Date(startDate.getTime() + duration * 0.5 * 86400000), duration: Math.floor(duration * 0.4) },
        { name: "测试验收", start: new Date(startDate.getTime() + duration * 0.9 * 86400000), duration: Math.floor(duration * 0.1) }
    ].filter(task => task.duration > 0);
    
    projectData = { name: projectName, tasks };
    return projectData;
}

// 解析添加任务指令
function parseAddCommand(text) {
    const taskName = extractTaskName(text) || '新任务';
    const duration = extractDuration(text) || 5;
    const position = text.includes('后') ? 'after' : 'end';
    
    const newTask = {
        name: taskName,
        start: new Date(),
        duration: duration
    };
    
    if (position === 'end' || projectData.tasks.length === 0) {
        projectData.tasks.push(newTask);
    } else {
        // 简单实现：添加到倒数第二个任务后面
        const insertIndex = Math.max(0, projectData.tasks.length - 1);
        projectData.tasks.splice(insertIndex, 0, newTask);
    }
    
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

// 解析编辑任务指令
function parseEditCommand(text) {
    const lowerText = text.toLowerCase();
    const keyword = extractKeyword(text);
    const durationChange = extractDurationChange(text);
    
    projectData.tasks.forEach(task => {
        if (task.name.includes(keyword)) {
            if (durationChange) {
                task.duration = Math.max(1, task.duration + durationChange);
            }
            if (lowerText.includes('提前')) {
                task.start.setDate(task.start.getDate() - 2);
            } else if (lowerText.includes('推迟')) {
                task.start.setDate(task.start.getDate() + 2);
            }
        }
    });
    
    showToast('任务已更新', 'success');
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

function extractDuration(text) {
    const matches = text.match(/(\d+)[天周]|([一二三四五六七八九十])[天周]/);
    if (!matches) return null;
    
    let num = matches[1] ? parseInt(matches[1]) : 
             matches[2] ? ['一','二','三','四','五','六','七','八','九','十'].indexOf(matches[2]) + 1 : 3;
    
    if (text.includes('周')) num *= 7;
    return num;
}

function extractDurationChange(text) {
    if (text.includes('延长')) return 2;
    if (text.includes('缩短')) return -1;
    return 0;
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
        }
    });
}

// 视图模式切换
function changeViewMode(mode) {
    currentViewMode = mode;
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (currentGantt) {
        currentGantt.change_view_mode(mode);
    }
}

// 快速指令
function quickCommand(type) {
    const examples = commandExamples[type];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    document.getElementById('textInput').value = randomExample;
    showToast(`已填充${type}指令示例`, 'info');
}

// 帮助面板
function showHelp() {
    document.getElementById('helpPanel').classList.add('show');
}

function hideHelp() {
    document.getElementById('helpPanel').classList.remove('show');
}

// 工具函数
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

function exportImage() {
    showToast('导出功能开发中...', 'info');
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

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    console.log('智能甘特图助手已初始化');
    
    // 添加示例项目
    setTimeout(() => {
        if (projectData.tasks.length === 0) {
            loadSampleProject();
        }
    }, 1000);
});

// 加载示例项目
function loadSampleProject() {
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
                name: "后端开发",
                start: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000),
                duration: 8
            },
            {
                name: "测试与上线",
                start: new Date(startDate.getTime() + 23 * 24 * 60 * 60 * 1000),
                duration: 4
            }
        ]
    };
    
    updateProjectTitle(projectData.name);
    generateGanttChart(projectData);
}

// 增强的指令处理 - 支持更自然的语言
function enhanceCommandProcessing(text) {
    const lowerText = text.toLowerCase();
    
    // 支持更自然的表达方式
    const enhancedPatterns = {
        // 创建项目
        create: [
            /我想?(创建|新建|开始)(一个)?(.+?)(项目|计划)/,
            /咱们来?做个?(.+?)(项目|计划)/,
            /需要?启动(.+?)项目/
        ],
        
        // 添加任务
        add: [
            /还要?加(一个)?(.+?)(任务|环节)/,
            /再添?加(.+?)进去/,
            /补充(一个)?(.+?)阶段/
        ],
        
        // 编辑任务
        edit: [
            /(.+?)的时间?要?(延长|增加|加)(.+?)(天|周)/,
            /把(.+?)改?为(.+?)(天|周)/,
            /(.+?)提前(.+?)开始/,
            /(.+?)推后(.+?)开始/
        ],
        
        // 删除任务
        delete: [
            /不要(.+?)了/,
            /去掉(.+?)环节/,
            /(.+?)可以?删掉/,
            /取消(.+?)任务/
        ]
    };
    
    // 尝试匹配增强模式
    for (const [type, patterns] of Object.entries(enhancedPatterns)) {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                console.log(`匹配到增强模式: ${type}`, match);
                return processEnhancedCommand(type, match, text);
            }
        }
    }
    
    return null;
}

// 处理增强指令
function processEnhancedCommand(type, match, originalText) {
    switch (type) {
        case 'create':
            return processEnhancedCreate(match, originalText);
        case 'add':
            return processEnhancedAdd(match, originalText);
        case 'edit':
            return processEnhancedEdit(match, originalText);
        case 'delete':
            return processEnhancedDelete(match, originalText);
        default:
            return null;
    }
}

// 增强的创建项目处理
function processEnhancedCreate(match, text) {
    let projectName = match[3] || match[1] || '新项目';
    const duration = extractDuration(text) || 21;
    
    // 智能项目名称优化
    if (projectName.includes('网站') || projectName.includes('Web')) {
        projectName = '网站开发项目';
    } else if (projectName.includes('APP') || projectName.includes('应用')) {
        projectName = '移动应用开发';
    } else if (projectName.includes('营销') || projectName.includes('推广')) {
        projectName = '营销推广活动';
    }
    
    return parseCreateCommand(`创建${projectName}项目，${duration}天时间`);
}

// 增强的添加任务处理
function processEnhancedAdd(match, text) {
    const taskName = match[2] || match[1] || '新任务';
    const duration = extractDuration(text) || 5;
    
    // 智能任务名称优化
    let enhancedTaskName = taskName;
    if (taskName.includes('测试')) enhancedTaskName = '测试验收';
    if (taskName.includes('设计')) enhancedTaskName = 'UI/UX设计';
    if (taskName.includes('开发')) enhancedTaskName = '程序开发';
    if (taskName.includes('评审')) enhancedTaskName = '技术评审';
    
    return parseAddCommand(`添加${enhancedTaskName}任务，需要${duration}天`);
}

// 增强的编辑任务处理
function processEnhancedEdit(match, text) {
    const taskKeyword = match[1] || extractKeyword(text);
    const operation = match[2] || '';
    const value = match[3] || '';
    
    let command = '';
    if (operation.includes('延长') || operation.includes('增加')) {
        command = `把${taskKeyword}时间延长${value}天`;
    } else if (operation.includes('提前')) {
        command = `将${taskKeyword}提前开始`;
    } else if (operation.includes('推后')) {
        command = `将${taskKeyword}推后开始`;
    } else {
        command = `调整${taskKeyword}任务`;
    }
    
    return parseEditCommand(command);
}

// 增强的删除任务处理
function processEnhancedDelete(match, text) {
    const taskKeyword = match[1] || extractKeyword(text);
    return parseDeleteCommand(`删除${taskKeyword}任务`);
}

// 智能任务时间分配
function smartTimeAllocation(totalDuration, taskCount) {
    const ratios = [0.2, 0.3, 0.35, 0.15]; // 需求、设计、开发、测试的典型时间比例
    const durations = [];
    
    for (let i = 0; i < taskCount; i++) {
        const ratio = i < ratios.length ? ratios[i] : 1 / taskCount;
        durations.push(Math.max(1, Math.floor(totalDuration * ratio)));
    }
    
    // 调整确保总时长正确
    const total = durations.reduce((sum, dur) => sum + dur, 0);
    const difference = totalDuration - total;
    if (difference !== 0) {
        durations[durations.length - 1] += difference;
    }
    
    return durations;
}

// 冲突检测和解决
function detectAndResolveConflicts(tasks) {
    const conflicts = [];
    
    for (let i = 1; i < tasks.length; i++) {
        const prevTask = tasks[i - 1];
        const currentTask = tasks[i];
        
        const prevEnd = new Date(prevTask.start.getTime() + prevTask.duration * 24 * 60 * 60 * 1000);
        const currentStart = currentTask.start;
        
        if (currentStart < prevEnd) {
            conflicts.push({
                task1: prevTask.name,
                task2: currentTask.name,
                overlap: (prevEnd - currentStart) / (24 * 60 * 60 * 1000)
            });
            
            // 自动解决：将当前任务后移
            currentTask.start = new Date(prevEnd);
        }
    }
    
    if (conflicts.length > 0) {
        console.log('检测到时间冲突并自动解决:', conflicts);
        showToast(`自动调整了 ${conflicts.length} 处时间冲突`, 'warning');
    }
    
    return tasks;
}

// 项目时间线优化
function optimizeTimeline(tasks) {
    // 确保任务按时间顺序排列
    tasks.sort((a, b) => a.start - b.start);
    
    // 添加合理的缓冲时间
    for (let i = 1; i < tasks.length; i++) {
        const prevEnd = new Date(tasks[i - 1].start.getTime() + tasks[i - 1].duration * 24 * 60 * 60 * 1000);
        const currentStart = tasks[i].start;
        
        // 如果间隔太小，增加一天缓冲
        const gap = (currentStart - prevEnd) / (24 * 60 * 60 * 1000);
        if (gap < 1) {
            tasks[i].start = new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000);
        }
    }
    
    return tasks;
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
    a.download = `${projectData.name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('项目数据导出成功', 'success');
}

// 导入项目数据
function importProjectData(event) {
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
}

// 键盘快捷键支持
document.addEventListener('keydown', function(e) {
    // Ctrl+Enter 执行指令
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        processCommand();
    }
    
    // Escape 关闭帮助面板
    if (e.key === 'Escape') {
        hideHelp();
    }
    
    // Ctrl+S 导出项目
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        exportProjectData();
    }
});

// 响应式调整
window.addEventListener('resize', function() {
    if (currentGantt) {
        setTimeout(() => {
            currentGantt.refresh();
        }, 100);
    }
});

// 触摸设备优化
if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
    
    // 增加触摸目标的尺寸
    const style = document.createElement('style');
    style.textContent = `
        .touch-device .control-btn,
        .touch-device .method-btn,
        .touch-device .quick-btn {
            min-height: 44px;
            min-width: 44px;
        }
        
        .touch-device .voice-btn {
            padding: 25px 50px;
        }
    `;
    document.head.appendChild(style);
}

// 性能优化：防抖处理
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 防抖的甘特图刷新
const refreshGantt = debounce(() => {
    if (currentGantt) {
        currentGantt.refresh();
    }
}, 250);

// 最终的主处理函数（整合增强功能）
function processCommand() {
    const commandText = document.getElementById('textInput').value.trim();
    
    if (!commandText) {
        showToast('请输入指令内容', 'warning');
        return;
    }
    
    try {
        // 首先尝试增强解析
        let result = enhanceCommandProcessing(commandText);
        
        // 如果增强解析失败，使用基础解析
        if (!result) {
            result = parseCommand(commandText);
        }
        
        // 优化时间线
        result.tasks = optimizeTimeline(result.tasks);
        
        // 检测并解决冲突
        result.tasks = detectAndResolveConflicts(result.tasks);
        
        projectData = result;
        updateProjectTitle(projectData.name);
        generateGanttChart(projectData);
        showToast('指令执行成功！', 'success');
        
    } catch (error) {
        console.error('指令处理错误:', error);
        showToast('指令解析失败，请尝试更清晰的表述', 'error');
    }
}

// 添加导入功能到UI
function addImportFeature() {
    // 检查是否已存在导入按钮
    if (document.querySelector('.import-btn')) return;
    
    const importBtn = document.createElement('button');
    importBtn.className = 'btn-tertiary import-btn';
    importBtn.innerHTML = '📁 导入项目';
    importBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = importProjectData;
        input.click();
    };
    
    // 添加到操作按钮区域
    const actionButtons = document.querySelector('.action-buttons');
    const clearBtn = actionButtons.querySelector('.btn-tertiary');
    actionButtons.insertBefore(importBtn, clearBtn);
}

// 初始化时添加导入功能
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addImportFeature, 1000);
});

console.log('智能甘特图助手代码加载完成');
