let domainQueue = [];
let activeWindows = [];
let stopTask = false;
let intervalTime = 0;  // 默认窗口打开时间间隔为0.5秒
let currentEngine = ''; // 记录当前使用的搜索引擎
let openedWindows = []; // 用于存储打开的窗口对象和对应的域名
let archiveYear = new Date().getFullYear(); // 获取当前年份，用于时光机
let tasksCompleted = false; // 新增：任务完成标志

function startBatchOpening() {
    stopTask = false;  // 重置终止标志
    tasksCompleted = false;  // 重置任务完成标志
    const maxWindows = parseInt(document.getElementById('maxWindows').value, 10);
    currentEngine = document.querySelector('input[name="engine"]:checked').value;

    console.log("Current engine selected:", currentEngine);

    // 更新状态显示
    appendStatus(`${getCurrentTime()} 状态：${getEngineName(currentEngine)}任务开始`);

    // 获取并去重用户输入的域名列表
    const { cleanedDomains, hadDuplicates } = deduplicateDomains(document.getElementById('domains').value.split('\n').map(domain => domain.trim()).filter(domain => domain !== ''));

    // 更新输入框内容为去重后的域名列表
    document.getElementById('domains').value = cleanedDomains.join('\n');

    if (hadDuplicates) {
        appendStatus(`${getCurrentTime()} 状态：任务域名已去重`);
    }

    domainQueue = cleanedDomains;

    if (currentEngine === 'direct') {
        processDirectBatch(maxWindows);
    } else {
        processBatch(maxWindows, currentEngine);
    }
}

function deduplicateDomains(domains) {
    const initialLength = domains.length;
    const cleanedDomains = [...new Set(domains)]; // 使用 Set 自动去重
    const hadDuplicates = cleanedDomains.length < initialLength;
    return { cleanedDomains, hadDuplicates };
}

function stopBatchOpening() {
    stopTask = true;  // 设置终止标志
    domainQueue = []; // 清空任务队列

    console.log("Task has been stopped.");

    // 更新状态显示
    appendStatus(`${getCurrentTime()} 状态：任务终止`);
}

function clearDomains() {
    document.getElementById('domains').value = ''; // 清空输入框内容
    appendStatus(`${getCurrentTime()} 状态：内容已清除`);
}

function processDirectBatch(maxWindows) {
    if (!stopTask && activeWindows.length < maxWindows && domainQueue.length > 0) {
        const domain = domainQueue.shift();
        openDirectly(domain, maxWindows);
        setTimeout(() => processDirectBatch(maxWindows), intervalTime);  // 添加时间间隔
    } else {
        checkCompletion(); // 检查是否所有任务都完成
    }
}

function openDirectly(domain, maxWindows) {
    const url = `http://www.${domain}`;
    const newWindow = window.open(url, '_blank');

    if (newWindow) {
        activeWindows.push(newWindow);
        openedWindows.push({ window: newWindow, domain: domain }); // 记录窗口对象和对应的域名

        // 监听窗口加载完成或关闭事件
        const interval = setInterval(() => {
            if (newWindow.closed) {
                clearInterval(interval);
                activeWindows = activeWindows.filter(win => win !== newWindow);
                openedWindows = openedWindows.filter(item => item.window !== newWindow); // 删除已关闭的窗口
                
                // 检查是否有未执行的任务，如果有则继续执行
                if (domainQueue.length > 0) {
                    openDirectly(domainQueue.shift(), maxWindows);
                } else {
                    checkCompletion(); // 如果没有任务则检查是否所有任务完成
                }
            }
        }, 1000);
    } else {
        processDirectBatch(maxWindows);
    }
}

function processBatch(maxWindows, engine) {
    if (!stopTask && activeWindows.length < maxWindows && domainQueue.length > 0) {
        const domain = domainQueue.shift();
        openSite(domain, engine, maxWindows);
        setTimeout(() => processBatch(maxWindows, engine), intervalTime);  // 添加时间间隔
    } else {
        checkCompletion(); // 检查是否所有任务都完成
    }
}

function openSite(domain, engine, maxWindows) {
    const urls = {
        'baidu': 'https://www.baidu.com/s?wd=site%3A',
        'm_baidu': 'https://m.baidu.com/ssid=08d569756a74696b68757a45/s?word=site%3A',
        'sogou': 'https://sogou.com/web?query=site%3A',
        'so': 'https://www.so.com/s?ie=utf-8&fr=360sou_newhome&src=sug-local&nlpv=pcsug1_dt42&q=site%3A',
        'shenma': 'https://quark.sm.cn/s?q=',
        'google': 'https://www.google.com/search?q=site%3A',
        'wayback': `https://web.archive.org/web/${archiveYear}0000000000*/`
    };

    //const url = engine === 'shenma' || engine === 'google' || engine === 'wayback'
    //            ? `${urls[engine]}${domain}`
    //            : `${urls[engine]}${domain}`;
	 const url = engine === 'shenma' 
                ? `${urls[engine]}${domain}%2F&safe=1&by=submit&snum=10`
                : `${urls[engine]}${domain}`;
	
    const newWindow = window.open(url, '_blank');

    if (newWindow) {
        activeWindows.push(newWindow);
        openedWindows.push({ window: newWindow, domain: domain }); // 记录窗口对象和对应的域名

        // 监听窗口加载完成或关闭事件
        const interval = setInterval(() => {
            if (newWindow.closed) {
                clearInterval(interval);
                activeWindows = activeWindows.filter(win => win !== newWindow);
                openedWindows = openedWindows.filter(item => item.window !== newWindow); // 删除已关闭的窗口

                // 检查是否有未执行的任务，如果有则继续执行
                if (domainQueue.length > 0) {
                    openSite(domainQueue.shift(), engine, maxWindows);
                } else {
                    checkCompletion(); // 如果没有任务则检查是否所有任务完成
                }
            }
        }, 0);
    } else {
        processBatch(maxWindows, engine);
    }
}

function checkCompletion() {
    // 只有在任务队列为空且任务未完成的情况下更新状态
    if (domainQueue.length === 0 && !tasksCompleted) {
        tasksCompleted = true;  // 标记任务为完成
        appendStatus(`${getCurrentTime()} 状态：所有任务已完成`);
    }
}

function copyDomainsToClipboard() {
    const openDomains = openedWindows.filter(item => !item.window.closed).map(item => item.domain);

    if (openDomains.length > 0) {
        const textToCopy = openDomains.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            appendStatus(`${getCurrentTime()} 状态：域名已复制到剪贴板`);
        }).catch(err => {
            appendStatus(`${getCurrentTime()} 状态：复制到剪贴板失败`);
        });
    } else {
        appendStatus(`${getCurrentTime()} 状态：没有找到可复制的域名`);
    }
}

function getCurrentTime() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

function appendStatus(message) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerText += `\n${message}`;
}

function getEngineName(engine) {
    switch(engine) {
        case 'baidu': return '百度';
        case 'm_baidu': return '移动百度';
        case 'sogou': return '搜狗';
        case 'so': return '360搜索';
        case 'shenma': return '神马搜索';
        case 'google': return '谷歌';
        case 'wayback': return '时光机';
        case 'direct': return '直接打开域名';
        default: return '未知';
    }
}
