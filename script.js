// 全局变量
let currentGantt = null;
let speechRecognizer = null;
let isListening = false;
let currentViewMode = 'Week';
let projectData = {
    name: '我的项目',
    tasks: []
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
    console.log('初始化智能甘特图助手...');
    const platform = detectPlatform();
    document.getElementById('platformIndicator').textContent = 
        `${platform.icon} ${platform.name}`;
    
    showDeviceGuide(platform);
    setupEventListeners();
    
    // 只有桌面端初始化语音识别
    if (platform.type === 'desktop') {
        console.log('桌面设备，初始化语音识别...');
        initSpeechRecognition();
    } else {
        console.log('移动设备，使用原生语音输入...');
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
    console.log('语音按钮被点击');
    const platform = detectPlatform();
    
    if (platform.type === 'mobile') {
        // 移动端：引导使用自带语音输入
        console.log('移动设备，引导使用原生输入法');
        showToast('请点击上方输入框，然后使用键盘的麦克风图标进行语音输入', 'info');
        document.getElementById('textInput').focus();
    } else {
        // 桌面端：使用Web Speech API
        console.log('桌面设备，启动语音识别');
        toggleVoiceRecognition();
    }
}

// 语音识别初始化（仅桌面端）
function initSpeechRecognition() {
    console.log('初始化语音识别...');
    
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('浏览器不支持语音识别');
        showToast('您的浏览器不支持语音识别功能', 'error');
        updateVoiceUI(false, "❌ 不支持语音");
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    try {
        speechRecognizer = new SpeechRecognition();
        console.log('语音识别器创建成功');
        
        speechRecognizer.continuous = false;
        speechRecognizer.interimResults = false;
        speechRecognizer.lang = 'zh-CN';
        speechRecognizer.maxAlternatives = 1;

        speechRecognizer.onstart = function() {
            console.log('语音识别开始');
            isListening = true;
            updateVoiceUI(true, "🎤 正在聆听...");
            document.getElementById('recordingDot').classList.add('recording');
            showToast('正在聆听，请说话...', 'info');
        };

        speechRecognizer.onresult = function(event) {
            console.log('语音识别结果:', event);
            const transcript = event.results[0][0].transcript;
            console.log('识别文本:', transcript);
            
            document.getElementById('textInput').value = transcript;
            updateVoiceUI(false, "✅ 识别成功");
            document.getElementById('recordingDot').classList.remove('recording');
            
            showToast('语音识别完成！', 'success');
            setTimeout(processCommand, 500);
        };

        speechRecognizer.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            isListening = false;
            updateVoiceUI(false, "❌ 识别失败");
            document.getElementById('recordingDot').classList.remove('recording');
            
            let errorMsg = "语音识别错误";
            switch(event.error) {
                case 'no-speech': errorMsg = "没有检测到语音"; break;
                case 'audio-capture': errorMsg = "无法访问麦克风"; break;
                case 'not-allowed': errorMsg = "麦克风权限被拒绝"; break;
                case 'network': errorMsg = "网络错误"; break;
                default: errorMsg = `识别错误: ${event.error}`;
            }
            
            showToast(errorMsg, 'error');
        };

        speechRecognizer.onend = function() {
            console.log('语音识别结束');
            isListening = false;
            document.getElementById('recordingDot').classList.remove('recording');
            if (!document.getElementById('voiceStatus').textContent.includes('成功')) {
                updateVoiceUI(false, "准备就绪");
            }
        };

        return true;
    } catch (error) {
        console.error('语音识别初始化失败:', error);
        showToast('语音识别初始化失败', 'error');
        return false;
    }
}

// 切换语音识别（仅桌面端）
function toggleVoiceRecognition() {
    console.log('切换语音识别状态, 当前状态:', isListening);
    
    if (!speechRecognizer) {
        console.log('语音识别器未初始化，尝试初始化...');
        if (!initSpeechRecognition()) {
            showToast('语音识别初始化失败', 'error');
            return;
        }
    }

    if (isListening) {
        console.log('停止语音识别');
        speechRecognizer.stop();
    } else {
        console.log('开始语音识别');
        try {
            // 检查麦克风权限
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {
                    console.log('麦克风权限已获得');
                    stream.getTracks().forEach(track => track.stop()); // 停止流以释放资源
                    speechRecognizer.start();
                })
                .catch(function(error) {
                    console.error('麦克风权限被拒绝:', error);
                    showToast('请允许麦克风权限以使用语音输入', 'error');
                    updateVoiceUI(false, "❌ 需要权限");
                });
        } catch (error) {
            console.error('启动语音识别失败:', error);
            showToast('启动语音识别失败: ' + error.message, 'error');
        }
    }
}

// 更新语音界面
function updateVoiceUI(listening, status) {
    console.log('更新语音界面:', { listening, status });
    const button = document.getElementById('voiceButton');
    const statusEl = document.getElementById('voiceStatus');
    const voiceText = document.getElementById('voiceText');
    
    if (listening) {
        button.classList.add('listening');
        voiceText.textContent = '正在聆听...';
        statusEl.textContent = status;
    } else {
        button.classList.remove('listening');
        voiceText.textContent = '点击开始语音输入';
        statusEl.textContent = status;
    }
}

// 修复HTML中的onclick绑定问题
function fixEventBindings() {
    // 确保语音按钮正确绑定
    const voiceButton = document.getElementById('voiceButton');
    if (voiceButton) {
        voiceButton.onclick = handleVoiceInput;
    }
    
    // 确保方法切换按钮正确绑定
    const methodButtons = document.querySelectorAll('.method-btn');
    methodButtons.forEach(btn => {
        const method = btn.textContent.includes('语音') ? 'voice' : 'text';
        btn.onclick = function() { switchInputMethod(method); };
    });
}

// 输入方法切换
function switchInputMethod(method) {
    console.log('切换输入方法:', method);
    document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.input-area').forEach(area => area.classList.remove('active'));
    
    const methodBtn = document.querySelector(`.method-btn[onclick*="${method}"]`);
    if (methodBtn) methodBtn.classList.add('active');
    
    const area = document.getElementById(method + 'Area');
    if (area) area.classList.add('active');
}

// 事件监听器设置
function setupEventListeners() {
    console.log('设置事件监听器...');
    
    // 修复事件绑定
    fixEventBindings();
    
    // 文本输入框回车键支持
    document.getElementById('textInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            processCommand();
        }
    });
    
    // 页面点击事件调试
    document.addEventListener('click', function(e) {
        if (e.target.id === 'voiceButton' || e.target.closest('#voiceButton')) {
            console.log('语音按钮被点击（全局监听）');
        }
    });
    
    // 页面可见性变化时重置语音状态
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isListening) {
            speechRecognizer.stop();
        }
    });
}

// 智能时间解析器
class TimeParser {
    constructor(referenceDate = new Date()) {
        this.referenceDate = referenceDate;
    }
    
    parse(timeExpression) {
        const lowerExpr = timeExpression.toLowerCase();
        
        if (lowerExpr.includes('明天')) {
            const date = new Date(this.referenceDate);
            date.setDate(date.getDate() + 1);
            return date;
        }
        
        if (lowerExpr.includes('下周')) {
            const date = new Date(this.referenceDate);
            const day = date.getDay();
            const daysUntilMonday = day === 0 ? 1 : 8 - day;
            date.setDate(date.getDate() + daysUntilMonday);
            return date;
        }
        
        if (lowerExpr.includes('下个月')) {
            const date = new Date(this.referenceDate);
            date.setMonth(date.getMonth() + 1);
            date.setDate(1);
            return date;
        }
        
        const dateMatch = timeExpression.match(/(\d{4})[年.-]?(\d{1,2})[月.-]?(\d{1,2})/);
        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        return new Date(this.referenceDate);
    }
    
    parseDuration(durationExpr) {
        const lowerExpr = durationExpr.toLowerCase();
        let days = 0;
        
        const dayMatch = lowerExpr.match(/(\d+)\s*天/);
        if (dayMatch) days += parseInt(dayMatch[1]);
        
        const weekMatch = lowerExpr.match(/(\d+)\s*周/);
        if (weekMatch) days += parseInt(weekMatch[1]) * 7;
        
        const chineseNumbers = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
        for (const [cn, num] of Object.entries(chineseNumbers)) {
            if (lowerExpr.includes(cn + '天')) days += num;
            if (lowerExpr.includes(cn + '周')) days += num * 7;
        }
        
        return days > 0 ? days : 7;
    }
}

// 智能指令解析
function parseCommand(text) {
    console.log('解析指令:', text);
    const lowerText = text.toLowerCase();
    
    if (/(创建|新建|开始).*项目/.test(lowerText) || projectData.tasks.length === 0) {
        return parseCreateCommand(text);
    } else if (/(添加|加入|插入).*任务/.test(lowerText)) {
        return parseAddCommand(text);
    } else if (/(删除|取消|去掉).*任务/.test(lowerText)) {
        return parseDeleteCommand(text);
    } else if (/(调整|修改|改变|延长|缩短|提前|推后).*任务/.test(lowerText)) {
        return parseEditCommand(text);
    } else {
        return trySmartParse(text);
    }
}

function trySmartParse(text) {
    const timeParser = new TimeParser();
    if (text.match(/(\d+[天周]|[一二三四五六七八九十][天周])/)) {
        return parseAddCommand("添加" + text);
    }
    return parseCreateCommand(text);
}

// 解析创建项目指令
function parseCreateCommand(text) {
    const timeParser = new TimeParser();
    const projectName = extractProjectName(text) || '我的项目';
    const duration = timeParser.parseDuration(text) || 21;
    const startDate = timeParser.parse(text);
    
    const tasks = createSmartTasks(startDate, duration, projectName);
    
    projectData = { 
        name: projectName, 
        tasks: tasks,
        startDate: startDate,
        totalDuration: duration
    };
    
    return projectData;
}

function createSmartTasks(startDate, totalDuration, projectType) {
    let taskTemplates = [];
    
    if (projectType.includes('网站') || projectType.includes('Web')) {
        taskTemplates = [
            { name: "需求分析", ratio: 0.15 },
            { name: "UI/UX设计", ratio: 0.20 },
            { name: "前端开发", ratio: 0.30 },
            { name: "后端开发", ratio: 0.25 },
            { name: "测试上线", ratio: 0.10 }
        ];
    } else {
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

// 解析添加任务指令
function parseAddCommand(text) {
    const timeParser = new TimeParser();
    const taskName = extractTaskName(text) || '新任务';
    const duration = timeParser.parseDuration(text) || 5;
    
    let insertIndex = projectData.tasks.length;
    let afterTask = null;
    
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
    
    projectData.tasks.splice(insertIndex, 0, newTask);
    recalculateTaskTimeline();
    
    return projectData;
}

function recalculateTaskTimeline() {
    for (let i = 1; i < projectData.tasks.length; i++) {
        const prevTask = projectData.tasks[i - 1];
        const currentTask = projectData.tasks[i];
        
        const prevEndDate = new Date(prevTask.start);
        prevEndDate.setDate(prevEndDate.getDate() + prevTask.duration);
        
        if (currentTask.start < prevEndDate) {
            currentTask.start = new Date(prevEndDate);
        }
    }
}

// 解析编辑任务指令
function parseEditCommand(text) {
    const timeParser = new TimeParser();
    const lowerText = text.toLowerCase();
    
    let targetTask = null;
    for (const task of projectData.tasks) {
        if (text.includes(task.name) || 
            text.includes(task.name.substring(0, 2)) ||
            (task.name.includes('开发') && lowerText.includes('开发')) ||
            (task.name.includes('测试') && lowerText.includes('测试'))) {
            targetTask = task;
            break;
        }
    }
    
    if (!targetTask) {
        showToast('未找到要编辑的任务', 'warning');
        return projectData;
    }
    
    if (lowerText.includes('延长') || lowerText.includes('增加')) {
        const durationChange = timeParser.parseDuration(text) || 2;
        targetTask.duration += durationChange;
        showToast(`已将"${targetTask.name}"延长${durationChange}天`, 'success');
    }
    else if (lowerText.includes('缩短') || lowerText.includes('减少')) {
        const durationChange = timeParser.parseDuration(text) || 1;
        targetTask.duration = Math.max(1, targetTask.duration - durationChange);
        showToast(`已将"${targetTask.name}"缩短${durationChange}天`, 'success');
    }
    
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
        }
    });
}

// 其他功能保持不变...
function changeViewMode(mode) {
    currentViewMode = mode;
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (currentGantt) {
        currentGantt.change_view_mode(mode);
    }
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

function loadSampleProject() {
    if (projectData.tasks.length > 0) return;
    
    const startDate = new Date();
    projectData = {
        name: '示例项目',
        tasks: [
            { name: "需求分析", start: new Date(startDate), duration: 3 },
            { name: "UI设计", start: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000), duration: 5 },
            { name: "开发", start: new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000), duration: 7 },
            { name: "测试", start: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000), duration: 4 }
        ]
    };
    
    updateProjectTitle(projectData.name);
    generateGanttChart(projectData);
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    init();
});

// 响应式调整
window.addEventListener('resize', function() {
    if (currentGantt) {
        setTimeout(() => {
            currentGantt.refresh();
        }, 100);
    }
});

console.log('智能甘特图助手代码加载完成');
