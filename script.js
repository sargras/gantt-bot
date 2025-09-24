// 全局变量
let currentGantt = null;
let speechRecognizer = null;
let isListening = false;
let currentViewMode = 'Week';
let projectData = {
    name: '我的项目',
    tasks: []
};

// 语音引导状态
let voiceGuideState = {
    currentStep: 0,
    isGuideOpen: false
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
    loadSampleProject();
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
            </div>
        `;
    } else {
        guide.innerHTML = `
            <div class="guide-item">
                <span class="guide-icon">🎤</span>
                <div>
                    <strong>桌面端语音输入</strong>
                    <div>点击语音按钮开始语音输入流程</div>
                </div>
            </div>
        `;
    }
}

// 语音输入处理 - 打开引导提示框
function handleVoiceInput() {
    console.log('打开语音引导提示框');
    openVoiceGuide();
}

// 打开语音引导提示框
function openVoiceGuide() {
    const modal = document.getElementById('voiceGuideModal');
    modal.classList.add('show');
    voiceGuideState.isGuideOpen = true;
    
    // 重置步骤状态
    resetVoiceGuideSteps();
    
    // 根据设备类型显示不同的内容
    const platform = detectPlatform();
    if (platform.type === 'mobile') {
        showFallbackOption();
    } else {
        hideFallbackOption();
    }
}

// 关闭语音引导提示框
function closeVoiceGuide() {
    const modal = document.getElementById('voiceGuideModal');
    modal.classList.remove('show');
    voiceGuideState.isGuideOpen = false;
    
    // 停止语音识别
    if (speechRecognizer && isListening) {
        speechRecognizer.stop();
    }
}

// 重置引导步骤
function resetVoiceGuideSteps() {
    voiceGuideState.currentStep = 0;
    
    // 重置所有步骤状态
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step${i}`);
        const status = document.getElementById(`step${i}Status`);
        
        step.className = 'step-item';
        if (i === 1) {
            status.textContent = '等待检查...';
        } else {
            status.textContent = i === 4 ? '请说话...' : '等待启动...';
        }
    }
    
    // 重置按钮文本
    document.getElementById('startVoiceBtn').textContent = '开始语音输入';
}

// 显示备用方案
function showFallbackOption() {
    document.getElementById('voiceFallback').style.display = 'block';
}

// 隐藏备用方案
function hideFallbackOption() {
    document.getElementById('voiceFallback').style.display = 'none';
}

// 使用备用方案（移动端）
function useFallbackInput() {
    closeVoiceGuide();
    document.getElementById('textInput').focus();
    showToast('请点击输入框后使用键盘麦克风图标', 'info');
}

// 开始语音处理流程
function startVoiceProcess() {
    console.log('开始语音处理流程');
    voiceGuideState.currentStep = 1;
    updateStep(1, 'active', '检查浏览器支持...');
    
    // 步骤1：检查浏览器支持
    checkBrowserSupport();
}

// 步骤1：检查浏览器支持
function checkBrowserSupport() {
    setTimeout(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            updateStep(1, 'failed', '❌ 浏览器不支持语音识别');
            updateStep(2, 'failed', '无法继续');
            updateStep(3, 'failed', '无法继续');
            showFallbackOption();
            return;
        }
        
        updateStep(1, 'completed', '✅ 浏览器支持语音识别');
        voiceGuideState.currentStep = 2;
        updateStep(2, 'active', '请求麦克风权限...');
        
        // 步骤2：请求麦克风权限
        requestMicrophonePermission();
    }, 1000);
}

// 步骤2：请求麦克风权限
function requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        updateStep(2, 'failed', '❌ 无法访问麦克风');
        showFallbackOption();
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            // 停止流以释放资源
            stream.getTracks().forEach(track => track.stop());
            
            updateStep(2, 'completed', '✅ 麦克风权限已获得');
            voiceGuideState.currentStep = 3;
            updateStep(3, 'active', '初始化语音识别...');
            
            // 步骤3：初始化语音识别
            initializeSpeechRecognition();
        })
        .catch(function(error) {
            console.error('麦克风权限被拒绝:', error);
            updateStep(2, 'failed', '❌ 麦克风权限被拒绝');
            showFallbackOption();
        });
}

// 步骤3：初始化语音识别
function initializeSpeechRecognition() {
    setTimeout(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        try {
            speechRecognizer = new SpeechRecognition();
            speechRecognizer.continuous = false;
            speechRecognizer.interimResults = false;
            speechRecognizer.lang = 'zh-CN';
            speechRecognizer.maxAlternatives = 1;

            // 设置事件处理器
            setupSpeechRecognitionEvents();
            
            updateStep(3, 'completed', '✅ 语音识别准备就绪');
            voiceGuideState.currentStep = 4;
            updateStep(4, 'active', '正在聆听...');
            
            // 步骤4：开始语音识别
            startSpeechRecognition();
        } catch (error) {
            console.error('语音识别初始化失败:', error);
            updateStep(3, 'failed', '❌ 初始化失败');
            showFallbackOption();
        }
    }, 1000);
}

// 设置语音识别事件
function setupSpeechRecognitionEvents() {
    speechRecognizer.onstart = function() {
        console.log('语音识别开始');
        isListening = true;
        updateStep(4, 'active', '🎤 正在聆听，请说话...');
        showRecordingAnimation();
    };

    speechRecognizer.onresult = function(event) {
        console.log('语音识别结果:', event);
        const transcript = event.results[0][0].transcript;
        console.log('识别文本:', transcript);
        
        updateStep(4, 'completed', '✅ 语音识别成功');
        hideRecordingAnimation();
        
        // 将识别结果填入输入框
        document.getElementById('textInput').value = transcript;
        
        // 2秒后自动处理指令并关闭引导
        setTimeout(() => {
            closeVoiceGuide();
            showToast('语音识别完成！正在生成甘特图...', 'success');
            setTimeout(processCommand, 500);
        }, 2000);
    };

    speechRecognizer.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        isListening = false;
        hideRecordingAnimation();
        
        let errorMsg = "语音识别错误";
        switch(event.error) {
            case 'no-speech': errorMsg = "没有检测到语音"; break;
            case 'audio-capture': errorMsg = "无法访问麦克风"; break;
            case 'not-allowed': errorMsg = "麦克风权限被拒绝"; break;
            case 'network': errorMsg = "网络错误"; break;
            default: errorMsg = `识别错误: ${event.error}`;
        }
        
        updateStep(4, 'failed', `❌ ${errorMsg}`);
        showFallbackOption();
    };

    speechRecognizer.onend = function() {
        console.log('语音识别结束');
        isListening = false;
        hideRecordingAnimation();
    };
}

// 开始语音识别
function startSpeechRecognition() {
    try {
        speechRecognizer.start();
    } catch (error) {
        console.error('启动语音识别失败:', error);
        updateStep(4, 'failed', '❌ 启动失败');
        showFallbackOption();
    }
}

// 更新步骤状态
function updateStep(stepNumber, status, message) {
    const step = document.getElementById(`step${stepNumber}`);
    const statusElement = document.getElementById(`step${stepNumber}Status`);
    
    // 移除所有状态类
    step.classList.remove('active', 'completed', 'failed');
    
    // 添加新状态类
    if (status) {
        step.classList.add(status);
    }
    
    // 更新状态消息
    if (message) {
        statusElement.textContent = message;
    }
    
    console.log(`步骤 ${stepNumber}: ${status} - ${message}`);
}

// 显示录音动画
function showRecordingAnimation() {
    const step4Status = document.getElementById('step4Status');
    step4Status.innerHTML = `
        <div class="recording-animation">
            <div>正在录音</div>
            <div class="recording-dots">
                <div class="recording-dot"></div>
                <div class="recording-dot"></div>
                <div class="recording-dot"></div>
            </div>
        </div>
    `;
}

// 隐藏录音动画
function hideRecordingAnimation() {
    const step4Status = document.getElementById('step4Status');
    // 动画会在状态更新时被替换
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
    
    // 点击模态框外部关闭
    document.getElementById('voiceGuideModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeVoiceGuide();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && voiceGuideState.isGuideOpen) {
            closeVoiceGuide();
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

// 智能指令解析（保持原有功能）
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

console.log('智能甘特图助手代码加载完成');
