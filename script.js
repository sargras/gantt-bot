// 全局变量
let currentGantt = null;
let speechRecognizer = null;
let isListening = false;
let currentViewMode = 'Week';
let projectData = {
    name: '未命名项目',
    tasks: []
};

// 示例指令库
const examples = [
    "创建网站开发项目，三周时间。第一周需求分析，第二周UI设计，第三周开发测试",
    "新产品发布计划，共15天完成。前5天市场调研，中间5天产品开发，最后5天测试上线",
    "营销活动策划，10天时间。3天方案设计，4天内容制作，3天执行推广",
    "把开发时间延长到10天，测试时间缩短为3天",
    "添加技术评审任务，需要2天时间，放在开发开始之前",
    "调整测试阶段为5天时间，增加验收环节",
    "项目下周一开始，工期20天。第一周规划，第二周执行，第三周收尾",
    "明天开始项目，第一周需求设计，第二周开发实施",
    "设置项目从下个月1号开始，总共30天工期",
    "创建移动应用项目，四周时间。设计1周，开发2周，测试1周"
];

// 设备检测和初始化
function detectPlatform() {
    const userAgent = navigator.userAgent;
    let platform = '未知设备';
    let icon = '💻';
    
    if (/Windows/.test(userAgent)) {
        platform = 'Windows';
        icon = '🪟';
    } else if (/Macintosh|Mac OS X/.test(userAgent)) {
        platform = 'Mac';
        icon = '🍎';
    } else if (/iPad/.test(userAgent)) {
        platform = 'iPad';
        icon = '📱';
    } else if (/iPhone/.test(userAgent)) {
        platform = 'iPhone';
        icon = '📱';
    } else if (/Android/.test(userAgent)) {
        platform = 'Android';
        icon = '📱';
    }
    
    return { platform, icon };
}

// 显示设备特定指南
function showDeviceGuide() {
    const { platform, icon } = detectPlatform();
    const guideElement = document.getElementById('deviceGuide');
    
    let guideHTML = '';
    
    if (platform === 'Windows' || platform === 'Mac') {
        guideHTML = `
            <div class="device-guide-item">
                <span class="device-icon">🎤</span>
                <div>
                    <strong>桌面端语音输入：</strong>
                    <div>点击"开始语音输入"按钮，允许麦克风权限后即可使用</div>
                </div>
            </div>
        `;
    } else {
        guideHTML = `
            <div class="device-guide-item">
                <span class="device-icon">📱</span>
                <div>
                    <strong>移动端语音输入：</strong>
                    <div>点击输入框 → 等待键盘弹出 → 点击麦克风图标 🎤 → 开始说话</div>
                </div>
            </div>
        `;
    }
    
    guideElement.innerHTML = guideHTML;
    
    // 更新平台指示器
    document.getElementById('platformIndicator').textContent = `${icon} ${platform}`;
}

// 语音识别初始化
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showToast('您的浏览器不支持语音识别，请使用Chrome或Edge浏览器', 'warning');
        switchToTextInput();
        return false;
    }

    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;
    speechRecognizer.lang = 'zh-CN';

    speechRecognizer.onstart = function() {
        isListening = true;
        updateVoiceUI(true, "🎤 正在聆听...请说话");
        document.getElementById('recordingDot').classList.add('recording');
    };

    speechRecognizer.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('textInput').value = transcript;
        updateVoiceUI(false, "✅ 识别完成");
        document.getElementById('recordingDot').classList.remove('recording');
        
        showToast('语音识别成功！正在生成甘特图...', 'success');
        
        // 自动处理
        setTimeout(() => {
            processInput();
        }, 1000);
    };

    speechRecognizer.onerror = function(event) {
        isListening = false;
        updateVoiceUI(false, "❌ 识别错误");
        document.getElementById('recordingDot').classList.remove('recording');
        
        let errorMsg = "语音识别错误";
        switch(event.error) {
            case 'no-speech': errorMsg = "没有检测到语音"; break;
            case 'audio-capture': errorMsg = "无法访问麦克风"; break;
            case 'not-allowed': errorMsg = "麦克风权限被拒绝"; break;
        }
        
        showToast(errorMsg, 'error');
    };

    speechRecognizer.onend = function() {
        isListening = false;
        document.getElementById('recordingDot').classList.remove('recording');
        if (!document.getElementById('voiceStatus').textContent.includes('完成')) {
            updateVoiceUI(false, "准备就绪");
        }
    };

    return true;
}

// 切换语音识别
function toggleVoiceRecognition() {
    const { platform } = detectPlatform();
    
    // 移动设备使用原生输入法
    if (platform === 'iPad' || platform === 'iPhone' || platform === 'Android') {
        showToast('请使用设备自带的语音输入功能', 'info');
        document.getElementById('textInput').focus();
        return;
    }
    
    if (!speechRecognizer && !initSpeechRecognition()) {
        return;
    }

    if (isListening) {
        speechRecognizer.stop();
    } else {
        try {
            speechRecognizer.start();
        } catch (error) {
            showToast('语音识别启动失败，请刷新页面重试', 'error');
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
        voiceText.textContent = '正在聆听...点击停止';
    } else {
        button.classList.remove('listening');
        voiceText.textContent = '点击开始语音输入';
    }
    statusEl.textContent = status;
}

// 切换到文本输入
function switchToTextInput() {
    document.querySelector('.method-btn[data-method="text"]').click();
}

// 输入方法切换
function setupInputMethods() {
    const methodButtons = document.querySelectorAll('.method-btn');
    const voiceArea = document.querySelector('.voice-area');
    const textArea = document.querySelector('.text-area');
    
    methodButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有active
            methodButtons.forEach(b => b.classList.remove('active'));
            voiceArea.classList.remove('active');
            textArea.classList.remove('active');
            
            // 激活当前
            this.classList.add('active');
            const method = this.dataset.method;
            if (method === 'voice') {
                voiceArea.classList.add('active');
            } else {
                textArea.classList.add('active');
            }
        });
    });
}

// 智能指令解析
function parseCommand(text) {
    console.log('解析指令:', text);
    
    const lowerText = text.toLowerCase();
    let projectName = extractProjectName(text);
    let startDate = extractStartDate(text);
    
    // 检测指令类型
    if (text.includes('创建') || text.includes('新建') || projectData.tasks.length === 0) {
        return parseCreateCommand(text, projectName, startDate);
    } else if (text.includes('添加')) {
        return parseAddCommand(text, startDate);
    } else if (text.includes('延长') || text.includes('缩短') || text.includes('修改') || text.includes('调整')) {
        return parseEditCommand(text);
    } else {
        return parseCreateCommand(text, projectName, startDate);
    }
}

// 提取项目名称
function extractProjectName(text) {
    const patterns = [
        /(创建|新建)(一个)?(.+?)(项目|计划)/,
        /(.+?)(项目|计划)/
    ];
    
    for (let pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[3]) return match[3].trim();
        if (match && match[1]) return match[1].trim();
    }
    
    return '我的项目';
}

// 提取开始日期
function extractStartDate(text) {
    const lowerText = text.toLowerCase();
    const startDate = new Date();
    
    if (lowerText.includes('下周一')) {
        startDate.setDate(startDate.getDate() + (1 + 7 - startDate.getDay()) % 7);
    } else if (lowerText.includes('明天')) {
        startDate.setDate(startDate.getDate() + 1);
    } else if (lowerText.includes('下周')) {
        startDate.setDate(startDate.getDate() + 7);
    } else if (lowerText.includes('下个月')) {
        startDate.setMonth(startDate.getMonth() + 1);
        startDate.setDate(1);
    }
    
    return startDate;
}

// 解析创建指令
function parseCreateCommand(text, projectName, startDate) {
    const tasks = extractTasksWithTime(text, startDate);
    
    projectData = {
        name: projectName,
        tasks: tasks.length > 0 ? tasks : getDefaultTasks(startDate)
    };
    
    return projectData;
}

// 解析添加指令
function parseAddCommand(text, startDate) {
    const newTasks = extractTasksWithTime(text, startDate);
    const lastTask = projectData.tasks[projectData.tasks.length - 1];
    let currentDate = lastTask ? new Date(lastTask.start.getTime() + lastTask.duration * 24 * 60 * 60 * 1000) : new Date();
    
    newTasks.forEach(task => {
        task.start = new Date(currentDate);
        projectData.tasks.push(task);
        currentDate.setDate(currentDate.getDate() + task.duration);
    });
    
    return projectData;
}

// 解析编辑指令
function parseEditCommand(text) {
    const lowerText = text.toLowerCase();
    
    projectData.tasks.forEach(task => {
        if (lowerText.includes('开发') && task.name.includes('开发')) {
            if (lowerText.includes('延长')) task.duration += 2;
            if (lowerText.includes('缩短')) task.duration = Math.max(1, task.duration - 1);
        }
        if (lowerText.includes('测试') && task.name.includes('测试')) {
            if (lowerText.includes('延长')) task.duration += 1;
            if (lowerText.includes('缩短')) task.duration = Math.max(1, task.duration - 1);
        }
        if (lowerText.includes('设计') && task.name.includes('设计')) {
            if (lowerText.includes('延长')) task.duration += 1;
        }
    });
    
    return projectData;
}

// 提取任务和时间
function extractTasksWithTime(text, startDate) {
    const tasks = [];
    let currentDate = new Date(startDate);
    const sections = text.split(/[，,。\.；;]/);
    
    const taskKeywords = {
        '需求': '需求分析', '分析': '需求分析', '规划': '项目规划',
        '设计': 'UI/UX设计', 'UI': 'UI设计', '界面': '界面设计',
        '开发': '程序开发', '编程': '程序开发', '编码': '编码实现',
        '测试': '测试验收', '验收': '测试验收', '质检': '质量检测',
        '调研': '市场调研', '市场': '市场分析', '研究': '可行性研究',
        '策划': '方案策划', '方案': '方案设计', '计划': '计划制定',
        '制作': '内容制作', '内容': '内容创作', '创作': '内容创作',
        '推广': '推广执行', '营销': '营销推广', '宣传': '宣传推广',
        '部署': '部署上线', '上线': '部署上线', '发布': '产品发布'
    };
    
    sections.forEach(section => {
        if (section.trim().length < 2) return;
        
        // 寻找任务关键词
        let taskName = null;
        for (const [key, value] of Object.entries(taskKeywords)) {
            if (section.includes(key)) {
                taskName = value;
                break;
            }
        }
        
        if (!taskName) return;
        
        // 提取时间
        const duration = extractDuration(section) || 5;
        
        tasks.push({
            name: taskName,
            start: new Date(currentDate),
            duration: duration
        });
        
        currentDate.setDate(currentDate.getDate() + duration);
    });
    
    return tasks;
}

// 提取持续时间
function extractDuration(text) {
    const patterns = [
        /(\d+)[ ]*天/,
        /(\d+)[ ]*周/,
        /([一二三四五六七八九十])[ ]*天/,
        /([一二三四五六七八九十])[ ]*周/
    ];
    
    const chineseNumbers = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
    
    for (let pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            let num = match[1];
            if (isNaN(num)) num = chineseNumbers[num] || 3;
            else num = parseInt(num);
            
            if (text.includes('周')) num *= 7;
            return Math.max(1, num);
        }
    }
    
    return null;
}

// 获取默认任务
function getDefaultTasks(startDate) {
    return [
        { name: "需求分析", start: new Date(startDate), duration: 3 },
        { name: "方案设计", start: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000), duration: 4 },
        { name: "开发实施", start: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000), duration: 7 },
        { name: "测试验收", start: new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000), duration: 3 }
    ];
}

// 主处理函数
function processInput() {
    const commandText = document.getElementById('textInput').value.trim();
    
    if (!commandText) {
        showToast('请输入指令内容', 'warning');
        return;
    }
    
    try {
        const result = parseCommand(commandText);
        updateProjectTitle(result.name);
        generateGanttChart(result);
        showToast('甘特图生成成功！', 'success');
    } catch (error) {
        showToast('指令解析失败，请尝试更清晰的表述', 'error');
        console.error('解析错误:', error);
    }
}

// 生成甘特图
function generateGanttChart(data) {
    const container = document.getElementById('gantt-container');
    container.innerHTML = '';
    
    if (!data.tasks || data.tasks.length === 0) {
        container.innerHTML = '<div class="placeholder"><div class="placeholder-icon">📊</div><div class="placeholder-text">没有任务数据</div></div>';
        return;
    }
    
    const tasks = data.tasks.map((task, index) => ({
        id: `Task-${index}`,
        name: task.name,
        start: task.start.toISOString().split('T')[0],
        end: new Date(task.start.getTime() + task.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: Math.min(30, Math.floor(Math.random() * 30))
    }));
    
    // 创建甘特图实例
    currentGantt = new Gantt(container, tasks, {
        view_mode: currentViewMode,
        language: 'zh',
        on_click: (task) => {
            showToast(`点击任务: ${task.name}`, 'info');
        },
        on_date_change: (task, start, end) => {
            updateTaskDuration(task.id, start, end);
        }
    });
}

// 更新任务持续时间
function updateTaskDuration(taskId, start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    
    const taskIndex = parseInt(taskId.replace('Task-', ''));
    if (projectData.tasks[taskIndex]) {
        projectData.tasks[taskIndex].duration = duration;
        projectData.tasks[taskIndex].start = startDate;
        showToast('任务时间已更新', 'success');
    }
}

// 更新项目标题
function updateProjectTitle(name) {
    document.getElementById('projectTitle').textContent = `📊 ${name}`;
}

// 改变视图模式
