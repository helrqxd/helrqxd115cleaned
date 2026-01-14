// apps/QQ/memories.js

// Global variable for timers
let activeCountdownTimers = [];

window.clearCountdownTimers = function () {
    activeCountdownTimers.forEach((timerId) => clearInterval(timerId));
    activeCountdownTimers = [];
};

/**
 * 获取并格式化【与当前聊天相关】的约定，生成给AI看的上下文
 * @param {string} chatId - 当前正在聊天的角色ID
 * @returns {Promise<string>} 格式化后的约定信息字符串
 */
window.getCountdownContext = async function (chatId) {
    // 1. 从数据库中找出所有“约定”类型，并且目标日期还没到的记录
    const activeCountdowns = await window.db.memories
        .where('type')
        .equals('countdown')
        .filter(
            (item) =>
                item.targetDate > Date.now() &&
                // 它现在只会查找两种约定：
                // 1. chatId 和当前聊天角色ID匹配的 (AI自己创建的)
                // 2. chatId 为空的 (你，也就是用户创建的全局约定)
                (item.chatId === chatId || item.chatId === null)
        )
        .toArray();

    // 如果没有与当前角色相关的约定，就告诉AI“目前没有”
    if (activeCountdowns.length === 0) {
        return '\n- **近期约定**: 目前没有特别的约定。';
    }

    // 2. 后续的整理报告逻辑保持不变
    let context = '\n# 近期约定与倒计时 (重要参考信息)\n';
    const now = Date.now();

    activeCountdowns.forEach((item) => {
        const diff = item.targetDate - now;
        const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diff / (1000 * 60 * 60));

        let timeText;
        if (diffDays > 1) {
            timeText = `还有 ${diffDays} 天`;
        } else if (diffHours > 0) {
            timeText = `还有 ${diffHours} 小时`;
        } else {
            timeText = '就是现在！';
        }

        context += `- **${item.description}**: ${timeText} (目标: ${new Date(item.targetDate).toLocaleString()})\n`;
    });

    return context;
};

window.renderMemoriesScreen = async function () {
    const listEl = document.getElementById('memories-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    // 1. 获取所有回忆，并按目标日期（如果是约定）或创建日期（如果是回忆）降序排列
    const allMemories = await window.db.memories.orderBy('timestamp').reverse().toArray();

    if (allMemories.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">这里还没有共同的回忆和约定呢~</p>';
        return;
    }

    // 2. 将未到期的约定排在最前面
    allMemories.sort((a, b) => {
        const aIsActiveCountdown = a.type === 'countdown' && a.targetDate > Date.now();
        const bIsActiveCountdown = b.type === 'countdown' && b.targetDate > Date.now();
        if (aIsActiveCountdown && !bIsActiveCountdown) return -1; // a排前面
        if (!aIsActiveCountdown && bIsActiveCountdown) return 1; // b排前面
        if (aIsActiveCountdown && bIsActiveCountdown) return a.targetDate - b.targetDate; // 都是倒计时，按日期升序
        return 0; // 其他情况保持原序
    });

    // 3. 使用单一循环来处理所有类型的卡片
    allMemories.forEach((item) => {
        let card;
        // 判断1：如果是正在进行的约定
        if (item.type === 'countdown' && item.targetDate > Date.now()) {
            card = createCountdownCard(item);
        }
        // 判断2：其他所有情况（普通回忆 或 已到期的约定）
        else {
            card = createMemoryCard(item);
        }
        listEl.appendChild(card);
    });

    // 4. 启动所有倒计时
    startAllCountdownTimers();
};

/**
 * 创建普通回忆卡片DOM元素
 */
function createMemoryCard(memory) {
    const card = document.createElement('div');
    card.className = 'memory-card';
    const memoryDate = new Date(memory.timestamp);
    const dateString = `${memoryDate.getFullYear()}-${String(memoryDate.getMonth() + 1).padStart(2, '0')}-${String(memoryDate.getDate()).padStart(2, '0')} ${String(memoryDate.getHours()).padStart(2, '0')}:${String(memoryDate.getMinutes()).padStart(2, '0')}`;

    let titleHtml, contentHtml;

    // 对不同类型的回忆进行清晰的区分
    if (memory.type === 'countdown' && memory.targetDate) {
        // 如果是已到期的约定
        titleHtml = `[约定达成] ${memory.description}`;
        contentHtml = `在 ${new Date(memory.targetDate).toLocaleString()}，我们一起见证了这个约定。`;
    } else {
        // 如果是普通的日记式回忆
        titleHtml = memory.authorName ? `${memory.authorName} 的日记` : '我们的回忆';
        contentHtml = memory.description;
    }

    card.innerHTML = `
                <div class="header">
                    <div class="date">${dateString}</div>
                    <div class="author">${titleHtml}</div>
                </div>
                <div class="content">${contentHtml}</div>
            `;

    if (window.addLongPressListener) {
        window.addLongPressListener(card, async () => {
            const confirmed = await window.showCustomConfirm('删除记录', '确定要删除这条记录吗？', {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                await window.db.memories.delete(memory.id);
                window.renderMemoriesScreen();
            }
        });
    } else {
        console.warn('window.addLongPressListener is not defined');
    }
    return card;
}

function createCountdownCard(countdown) {
    const card = document.createElement('div');
    card.className = 'countdown-card';

    // 在使用前，先从 countdown 对象中创建 targetDate 变量
    const targetDate = new Date(countdown.targetDate);

    // 现在可以安全地使用 targetDate 了
    const targetDateString = targetDate.toLocaleString('zh-CN', { dateStyle: 'full', timeStyle: 'short' });

    card.innerHTML = `
                <div class="title">${countdown.description}</div>
                <div class="timer" data-target-date="${countdown.targetDate}">--天--时--分--秒</div>
                <div class="target-date">目标时间: ${targetDateString}</div>
            `;

    if (window.addLongPressListener) {
        window.addLongPressListener(card, async () => {
            const confirmed = await window.showCustomConfirm('删除约定', '确定要删除这个约定吗？', {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                await window.db.memories.delete(countdown.id);
                window.renderMemoriesScreen();
            }
        });
    }
    return card;
}

function startAllCountdownTimers() {
    // 先清除所有可能存在的旧计时器，防止内存泄漏
    activeCountdownTimers.forEach((timerId) => clearInterval(timerId));
    activeCountdownTimers = [];

    document.querySelectorAll('.countdown-card .timer').forEach((timerEl) => {
        const targetTimestamp = parseInt(timerEl.dataset.targetDate);

        let timerId;

        const updateTimer = () => {
            const now = Date.now();
            const distance = targetTimestamp - now;

            if (distance < 0) {
                timerEl.textContent = '约定达成！';
                // 现在 updateTimer 可以正确地找到并清除它自己了
                clearInterval(timerId);
                setTimeout(() => window.renderMemoriesScreen(), 2000);
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timerEl.textContent = `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
        };

        updateTimer(); // 立即执行一次以显示初始倒计时

        timerId = setInterval(updateTimer, 1000);

        // 将有效的计时器ID存入全局数组，以便下次刷新时可以清除
        activeCountdownTimers.push(timerId);
    });
}

// Handlers for AI created messages
window.handleCreateMemory = async function (chatId, chatName, description) {
    const newMemory = {
        chatId: chatId,
        authorName: chatName,
        description: description,
        timestamp: Date.now(),
        type: 'ai_generated',
    };
    await window.db.memories.add(newMemory);

    console.log(`AI "${chatName}" 记录了一条新回忆:`, description);
};

window.handleCreateCountdown = async function (chatId, chatName, title, date) {
    const targetDate = new Date(date);
    if (!isNaN(targetDate) && targetDate > new Date()) {
        const newCountdown = {
            chatId: chatId,
            authorName: chatName,
            description: title,
            timestamp: Date.now(),
            type: 'countdown',
            targetDate: targetDate.getTime(),
        };
        await window.db.memories.add(newCountdown);
        console.log(`AI "${chatName}" 创建了一个新约定:`, title);
    }
};

// Initialization function for event listeners
window.initMemoriesEventListeners = function () {
    // 回忆录相关事件绑定
    // 1. 将“回忆”页签和它的视图连接起来
    const memoriesViewBtn = document.querySelector('.nav-item[data-view="memories-view"]');
    if (memoriesViewBtn) {
        memoriesViewBtn.addEventListener('click', () => {
            // 在切换前，确保"收藏"页面的编辑模式已关闭
            if (window.exitFavoritesSelectionMode) {
                window.exitFavoritesSelectionMode();
            }
            if (window.switchToChatListView) {
                window.switchToChatListView('memories-view');
            }
            window.renderMemoriesScreen(); // 点击时渲染
        });
    }

    // 2. 绑定回忆录界面的返回按钮
    const memoriesBackBtn = document.getElementById('memories-back-btn');
    if (memoriesBackBtn) {
        memoriesBackBtn.addEventListener('click', () => {
            if (window.switchToChatListView) {
                window.switchToChatListView('messages-view');
            }
        });
    }

    // 约定/倒计时功能事件绑定
    const addCountdownBtn = document.getElementById('add-countdown-btn');
    if (addCountdownBtn) {
        addCountdownBtn.addEventListener('click', () => {
            document.getElementById('create-countdown-modal').classList.add('visible');
        });
    }

    const cancelCountdownBtn = document.getElementById('cancel-create-countdown-btn');
    if (cancelCountdownBtn) {
        cancelCountdownBtn.addEventListener('click', () => {
            document.getElementById('create-countdown-modal').classList.remove('visible');
        });
    }

    const confirmCountdownBtn = document.getElementById('confirm-create-countdown-btn');
    if (confirmCountdownBtn) {
        confirmCountdownBtn.addEventListener('click', async () => {
            const title = document.getElementById('countdown-title-input').value.trim();
            const dateValue = document.getElementById('countdown-date-input').value;

            if (!title || !dateValue) {
                alert('请填写完整的约定标题和日期！');
                return;
            }

            const targetDate = new Date(dateValue);
            if (isNaN(targetDate) || targetDate <= new Date()) {
                alert('请输入一个有效的、未来的日期！');
                return;
            }

            const newCountdown = {
                chatId: null, // 用户创建的，不属于任何特定AI
                authorName: '我',
                description: title,
                timestamp: Date.now(),
                type: 'countdown',
                targetDate: targetDate.getTime(),
            };

            await window.db.memories.add(newCountdown);
            document.getElementById('create-countdown-modal').classList.remove('visible');
            window.renderMemoriesScreen();
        });
    }
};
