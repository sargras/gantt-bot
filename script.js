// 全局变量
let currentGantt = null;
let speechRecognizer = null;
let isListening = false;
let projectData = {
    name: '未命名项目',
    tasks: []
};

// 示例指令库
const examples = [
    "创建网站开发项目，三周时间。第一周需求分析，第二周UI设计，第三周开发测试",
    "添加新产品发布计划，共15天。前5天市场调研，中间5天产品开发，最后5天测试上线",
    "把开发时间延长到10天，测试时间缩短为3天",
    "营销活动策划，下周一开始。3天方案设计，4天内容制作，3天执行推广",
    "添加一个为期2天的技术评审任务，放在开发开始之前"
];

// 初始化语音识别
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showError('您的浏览器不支持语音识别，请使用Chrome或Edge浏览器');
        return false;
    }

    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;
    speechRecognizer.lang = 'zh-CN';

    speechRecognizer.onstart = function() {
        isListening = true;
        updateVoiceUI(true, "🎤 正在聆听...请说话");
    };

    speechRecognizer.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('commandInput').value = transcript;
        updateVoiceUI(false, "✅ 识别完成");
        
        // 自动处理指令
        setTimeout(() => {
            processCommand();
        }, 1000);
    };

    speechRecognizer.onerror = function(event) {
        isListening = false;
        let errorMsg = "识别错误，请重试";
        if (event.error === 'no-speech') errorMsg = "没有检测到语音";
        else if (event.error === 'audio-capture') errorMsg = "无法访问麦克风";
        updateVoiceUI(false, errorMsg);
    };

    speechRecognizer.onend = function() {
        isListening = false;
        if (!document.getElementById('voiceStatus').textContent.includes('完成')) {
            updateVoiceUI(false, "准备就绪");
        }
    };

    return true;
}

// 切换语音识别
function toggleVoiceRecognition() {
    if (!speechRecognizer && !initSpeechRecognition()) return;

    if (isListening) {
        speechRecognizer.stop();
    } else {
        try {
            speechRecognizer.start();
        } catch (error) {
            showError('语音识别启动失败');
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

// 增强的指令解析器
function parseCommand(text) {
    const lowerText = text.toLowerCase();
    let newTasks = [];
    
    // 检测指令类型
    if (text.includes('创建') || text.includes('新建') || projectData.tasks.length === 0) {
        return parseCreateCommand(text);
    } else if (text.includes('添加')) {
        return parseAddCommand(text);
    } else if (text.includes('延长') || text.includes('缩短') || text.includes('修改')) {
        return parseEditCommand(text);
    } else {
        return parseCreateCommand(text); // 默认按创建处理
    }
}

// 解析创建项目指令
function parseCreateCommand(text) {
    let projectName = extractProjectName(text);
    const tasks = extractTasksWithTime(text);
    
    projectData = {
        name: projectName,
        tasks: tasks.length > 0 ? tasks : getDefaultTasks()
    };
    
    return projectData;
}

// 解析添加任务指令
function parseAddCommand(text) {
    const newTasks = extractTasksWithTime(text);
    projectData.tasks.push(...newTasks);
    return projectData;
}

// 解析编辑任务指令（简化版）
function parseEditCommand(text) {
    const lowerText = text.toLowerCase();
    
    // 简单的编辑逻辑
    projectData.tasks.forEach(task => {
        if (lowerText.includes('开发') && task.name.includes('开发')) {
            if (lowerText.includes('延长')) task.duration += 2;
            if (lowerText.includes('缩短')) task.duration = Math.max(1, task.duration - 1);
        }
        if (lowerText.includes('测试') && task.name.includes('测试')) {
            if (lowerText.includes('延长')) task.duration += 1;
            if (lowerText.includes('缩短')) task.duration = Math.max(1, task.duration - 1);
        }
    });
    
    return projectData;
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

// 提取任务和时间
function extractTasksWithTime(text) {
    const tasks = [];
    let currentDate = new Date();
    const sections = text.split(/[，,。\.；;]/);
    
    const taskKeywords = {
        '需求': '需求分析', '分析': '需求分析',
        '设计': 'UI设计', 'UI': 'UI设计',
        '开发': '程序开发', '编程': '程序开发',
        '测试': '测试验收', '验收': '测试验收',
        '调研': '市场调研', '市场': '市场调研',
        '策划': '方案策划', '方案': '方案策划',
        '制作': '内容制作', '内容': '内容制作',
        '推广': '推广执行', '营销': '营销推广'
    };
    
    sections.forEach(section => {
        if (section.length < 3) return;
        
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
    
    return tasks.length > 0 ? tasks : getDefaultTasks();
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
    
    return 5; // 默认5天
}

// 获取默认任务
function getDefaultTasks() {
    const startDate = new Date();
    return [
        { name: "需求分析", start: new Date(startDate), duration: 3 },
        { name: "方案设计", start: new Date(startDate.getTime() + 3*24*60*60*1000), duration: 4 },
        { name: "开发实施", start: new Date(startDate.getTime() + 7*24*60*60*1000), duration: 7 }
    ];
}

// 主处理函数
function processCommand() {
    const commandText = document.getElementById('commandInput').value.trim();
    
    if (!commandText) {
        showError('请输入指令或使用语音输入');
        return;
    }
    
    clearError();
    
    try {
        const result = parseCommand(commandText);
        updateProjectTitle(result.name);
        generateGanttChart(result);
        showSuccess('甘特图生成成功！');
    } catch (error) {
        showError('指令解析失败，请尝试更清晰的表述');
        console.error(error);
    }
}

// 生成甘特图
function generateGanttChart(data) {
    const container = document.getElementById('gantt-container');
    container.innerHTML = '';
    
    if (!data.tasks || data.tasks.length === 0) {
        container.innerHTML = '<div class="placeholder">没有任务数据</div>';
        return;
    }
    
    const tasks = data.tasks.map((task, index) => ({
        id: `Task-${index}`,
        name: task.name,
        start: task.start.toISOString().split('T')[0],
        end: new Date(task.start.getTime() + task.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: Math.min(30, Math.floor(Math.random() * 30))
    }));
    
    // 保存当前甘特图实例
    currentGantt = new Gantt(container, tasks, {
        view_mode: 'Week',
        language: 'zh',
        on_click: (task) => {
            console.log('任务点击:', task);
        },
        on_date_change: (task, start, end) => {
            console.log('日期修改:', task, start, end);
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
        showSuccess('任务时间已更新');
    }
}

// 更新项目标题
function updateProjectTitle(name) {
    document.getElementById('projectTitle').textContent = `📊 ${name}`;
}

// 工具函数
function setExample(index) {
    document.getElementById('commandInput').value = examples[index];
}

function clearAll() {
    projectData = { name: '未命名项目', tasks: [] };
    document.getElementById('commandInput').value = '';
    document.getElementById('projectTitle').textContent = '📊 项目甘特图';
    const container = document.getElementById('gantt-container');
    container.innerHTML = '<div class="placeholder">等待生成甘特图...</div>';
    showSuccess('已清空所有数据');
}

function addSampleData() {
    setExample(0);
    setTimeout(() => processCommand(), 100);
}

function zoomIn() {
    if (currentGantt) {
        currentGantt.change_view_mode('Day');
    }
}

function zoomOut() {
    if (currentGantt) {
        currentGantt.change_view_mode('Month');
    }
}

function exportImage() {
    alert('导出功能开发中...');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage') || createMessageDiv('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage') || createMessageDiv('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => successDiv.style.display = 'none', 3000);
}

function clearError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
}

function createMessageDiv(id) {
    const div = document.createElement('div');
    div.id = id;
    div.style.padding = '10px';
    div.style.margin = '10px 0';
    div.style.borderRadius = '5px';
    div.style.textAlign = 'center';
    div.style.fontWeight = 'bold';
    
    if (id === 'errorMessage') {
        div.style.background = '#ffeaea';
        div.style.color = '#e74c3c';
    } else {
        div.style.background = '#eaf7ea';
        div.style.color = '#27ae60';
    }
    
    document.querySelector('.control-section').prepend(div);
    return div;
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    initSpeechRecognition();
    console.log('智能甘特图语音助手已初始化');
});
