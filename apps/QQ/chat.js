
if (!window.videoCallState) {
    window.videoCallState = { isActive: false, activeChatId: null, isAwaitingResponse: false, isGroupCall: false, participants: [], timerId: null, callRequester: null, initiator: null };
}

// apps/QQ/chat.js
// Refactored from main-app.js

// Shared State Variables (Global)
window.isSelectionMode = false;
window.selectedMessages = new Set();
window.activeMessageTimestamp = null;
window.isInnerVoiceHistoryOpen = false;
window.editingMemberId = null;
window.editingPersonaPresetId = null;
window.editingSpriteGroupId = null;
window.currentReplyContext = null;
window.currentSearchKeyword = '';
window.activePostId = null;

/* 
 * Declarations removed to avoid collision with main-app.js references
 * Replaced variables: defaultAvatar, defaultGroupAvatar, defaultMyGroupAvatar, defaultGroupMemberAvatar, 
 * isSelectionMode, selectedMessages, activeMessageTimestamp, newWallpaperBase64, newLockscreenWallpaperBase64, 
 * newGlobalBgBase64, unreadPostsCount, currentRenderedCount, window.videoCallState
 */


// ... (Rest of functions will be appended) ...
// Core Render Functions

function updateUnreadIndicator(count) {
    window.unreadPostsCount = count;
    localStorage.setItem('unreadPostsCount', count);
    const navItem = document.querySelector('.nav-item[data-view="qzone-screen"]');
    if (navItem) {
        const targetSpan = navItem.querySelector('span');
        let indicator = navItem.querySelector('.unread-indicator');
        if (count > 0) {
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'unread-indicator';
                targetSpan.style.position = 'relative';
                targetSpan.appendChild(indicator);
            }
            indicator.textContent = count > 99 ? '99+' : count;
            indicator.style.display = 'block';
        } else {
            if (indicator) indicator.style.display = 'none';
        }
    }
    const backBtn = document.getElementById('back-to-list-btn');
    if (backBtn) {
        let backBtnIndicator = backBtn.querySelector('.unread-indicator');
        if (count > 0) {
            if (!backBtnIndicator) {
                backBtnIndicator = document.createElement('span');
                backBtnIndicator.className = 'unread-indicator back-btn-indicator';
                backBtn.style.position = 'relative';
                backBtn.appendChild(backBtnIndicator);
            }
        }
    }
}

function formatChatListTimestamp(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const msgDate = new Date(timestamp);
    const isToday = now.getFullYear() === msgDate.getFullYear() && now.getMonth() === msgDate.getMonth() && now.getDate() === msgDate.getDate();
    if (isToday) return msgDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.getFullYear() === msgDate.getFullYear() && yesterday.getMonth() === msgDate.getMonth() && yesterday.getDate() === msgDate.getDate();
    if (isYesterday) return '昨天';
    if (now.getFullYear() === msgDate.getFullYear()) {
        const month = String(msgDate.getMonth() + 1).padStart(2, '0');
        const day = String(msgDate.getDate()).padStart(2, '0');
        return `${month}/${day}`;
    }
    const year = msgDate.getFullYear();
    const month = String(msgDate.getMonth() + 1).padStart(2, '0');
    const day = String(msgDate.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

async function renderChatList() {
    if (!window.renderChatList) window.renderChatList = renderChatList;
    const chatListEl = document.getElementById('chat-list');
    chatListEl.innerHTML = '';
    const allChats = Object.values(window.state.chats);
    const allGroups = await window.db.qzoneGroups.toArray();
    if (allChats.length === 0) {
        chatListEl.innerHTML = '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">点击右上角 "+" 或群组图标添加聊天</p>';
        return;
    }
    const pinnedChats = allChats.filter((chat) => chat.isPinned);
    const unpinnedChats = allChats.filter((chat) => !chat.isPinned);
    pinnedChats.sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0));
    pinnedChats.forEach((chat) => {
        const item = createChatListItem(chat);
        chatListEl.appendChild(item);
    });
    allGroups.forEach((group) => {
        const latestChatInGroup = unpinnedChats
            .filter((chat) => chat.groupId === group.id)
            .sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0))[0];
        group.latestTimestamp = latestChatInGroup ? latestChatInGroup.history.slice(-1)[0]?.timestamp || 0 : 0;
    });
    allGroups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    allGroups.forEach((group) => {
        const groupChats = unpinnedChats.filter((chat) => !chat.isGroup && chat.groupId === group.id).sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0));
        if (groupChats.length === 0) return;
        const groupContainer = document.createElement('div');
        groupContainer.className = 'chat-group-container';
        groupContainer.innerHTML = `
            <div class="chat-group-header">
                <span class="arrow">▼</span>
                <span class="group-name">${group.name}</span>
            </div>
            <div class="chat-group-content"></div>
        `;
        const contentEl = groupContainer.querySelector('.chat-group-content');
        groupChats.forEach((chat) => {
            const item = createChatListItem(chat);
            contentEl.appendChild(item);
        });
        chatListEl.appendChild(groupContainer);
    });
    const remainingChats = unpinnedChats.filter((chat) => chat.isGroup || (!chat.isGroup && !chat.groupId)).sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0));
    remainingChats.forEach((chat) => {
        const item = createChatListItem(chat);
        chatListEl.appendChild(item);
    });
    document.querySelectorAll('.chat-group-header').forEach((header) => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            header.nextElementSibling.classList.toggle('collapsed');
        });
    });
}

function createChatListItem(chat) {
    const lastMsgObj = chat.history.filter((msg) => !msg.isHidden).slice(-1)[0] || {};
    let lastMsgDisplay;

    if (!chat.isGroup && chat.relationship?.status === 'pending_user_approval') {
        lastMsgDisplay = `<span style="color: #ff8c00;">[好友申请] ${chat.relationship.applicationReason || '请求添加你为好友'}</span>`;
    } else if (!chat.isGroup && chat.relationship?.status === 'blocked_by_ai') {
        lastMsgDisplay = `<span style="color: #dc3545;">[你已被对方拉黑]</span>`;
    } else if (chat.isGroup) {
        if (lastMsgObj.type === 'pat_message') {
            lastMsgDisplay = `[系统消息] ${lastMsgObj.content}`;
        } else if (lastMsgObj.type === 'transfer') {
            lastMsgDisplay = '[转账]';
        } else if (lastMsgObj.type === 'ai_image' || lastMsgObj.type === 'user_photo') {
            lastMsgDisplay = '[照片]';
        } else if (lastMsgObj.type === 'voice_message') {
            lastMsgDisplay = '[语音]';
        } else if (typeof lastMsgObj.content === 'string' && STICKER_REGEX.test(lastMsgObj.content)) {
            lastMsgDisplay = lastMsgObj.meaning ? `[表情: ${lastMsgObj.meaning}]` : '[表情]';
        } else if (Array.isArray(lastMsgObj.content)) {
            lastMsgDisplay = `[图片]`;
        } else {
            lastMsgDisplay = String(lastMsgObj.content || '...').substring(0, 20);
        }
        if (lastMsgObj.senderName && lastMsgObj.type !== 'pat_message') {
            const member = chat.members.find((m) => m.originalName === lastMsgObj.senderName);
            const displayName = member ? member.groupNickname : lastMsgObj.senderName;
            lastMsgDisplay = `${displayName}: ${lastMsgDisplay}`;
        }
    } else {
        const statusText = chat.status?.text || '在线';
        lastMsgDisplay = `[${statusText}]`;
    }

    const lastMsgTimestamp = lastMsgObj?.timestamp;
    const timeDisplay = formatChatListTimestamp(lastMsgTimestamp);

    const container = document.createElement('div');
    container.className = 'chat-list-item-swipe-container';
    container.dataset.chatId = chat.id;

    const content = document.createElement('div');
    content.className = `chat-list-item-content ${chat.isPinned ? 'pinned' : ''}`;

    const avatar = chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar;

    let streakHtml = '';
    let selectedBadgeHtml = '';

    if (!chat.isGroup && chat.settings.streak && chat.settings.streak.enabled) {
        const streak = chat.settings.streak;
        let isExtinguished = false;
        if (streak.lastInteractionDate && streak.extinguishThreshold !== -1) {
            const lastDate = new Date(streak.lastInteractionDate);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            const daysDiff = (todayDate - lastDate) / (1000 * 3600 * 24);
            if (daysDiff >= streak.extinguishThreshold) {
                isExtinguished = true;
            }
        }
        const litIconUrl = streak.litIconUrl;
        const extinguishedIconUrl = streak.extinguishedIconUrl;
        const fontColor = streak.fontColor || '#ff6f00';
        let iconHtml = '';
        if (isExtinguished) {
            iconHtml = extinguishedIconUrl ? `<img src="${extinguishedIconUrl}" style="height: 1.2em; vertical-align: middle;">` : '🧊';
        } else if (streak.currentDays > 0 || streak.initialDays > 0) {
            iconHtml = litIconUrl ? `<img src="${litIconUrl}" style="height: 1.2em; vertical-align: middle;">` : '🔥';
        }
        if (iconHtml) {
            if (isExtinguished) {
                streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}</span>`;
            } else if (streak.currentDays === -1 || streak.initialDays === -1) {
                streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}∞</span>`;
            } else {
                streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}${streak.currentDays}</span>`;
            }
        }
    }
    if (!chat.isGroup && chat.settings.selectedIntimacyBadge) {
        selectedBadgeHtml = `<span class="intimacy-badge-display"><img src="${chat.settings.selectedIntimacyBadge}" alt="badge"></span>`;
    }

    content.innerHTML = `
        <div class="chat-list-item" data-chat-id="${chat.id}">
            <img src="${avatar || defaultAvatar}" class="avatar">
            <div class="info">
                <div class="name-line">
                    <span class="name">${!chat.isGroup && chat.settings.remarkName ? chat.settings.remarkName : chat.name}</span>
                    ${chat.isGroup ? '<span class="group-tag">群聊</span>' : ''}
                    ${streakHtml}
                    ${selectedBadgeHtml}
                </div>
                <div class="last-msg" style="color: ${chat.isGroup ? 'var(--text-secondary)' : '#b5b5b5'}; font-style: italic;">${lastMsgDisplay}</div>
            </div>
            <div class="chat-list-right-column">
                <div class="chat-list-time">${timeDisplay}</div>
                <div class="unread-count-wrapper">
                    <span class="unread-count" style="display: none;">0</span>
                </div>
            </div>
        </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'swipe-actions';
    const pinButtonText = chat.isPinned ? '取消置顶' : '置顶';
    const pinButtonClass = chat.isPinned ? 'unpin' : 'pin';
    actions.innerHTML = `<button class="swipe-action-btn ${pinButtonClass}">${pinButtonText}</button><button class="swipe-action-btn delete">删除</button>`;
    container.appendChild(content);
    container.appendChild(actions);
    const unreadCount = chat.unreadCount || 0;
    const unreadEl = content.querySelector('.unread-count');
    if (unreadCount > 0) {
        unreadEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
        unreadEl.style.display = 'inline-flex';
    } else {
        unreadEl.style.display = 'none';
    }
    const infoEl = content.querySelector('.info');
    if (infoEl) {
        infoEl.addEventListener('click', () => openChat(chat.id));
    }
    const avatarEl = content.querySelector('.avatar, .avatar-with-frame');
    if (avatarEl) {
        avatarEl.addEventListener('click', (e) => {
            e.stopPropagation();
            handleUserPat(chat.id, chat.name);
        });
    }
    return container;
}

function renderChatInterface(chatId) {
    window.renderChatInterface = renderChatInterface; // Expose for external use (e.g., functions.js)
    cleanupWaimaiTimers();
    const chat = window.state.chats[chatId];
    if (!chat) return;
    // 群公告图标显示/隐藏逻辑
    const announcementBtn = document.getElementById('group-announcement-btn');
    if (chat.isGroup) {
        announcementBtn.style.display = 'inline-flex'; // 在群聊中显示
    } else {
        announcementBtn.style.display = 'none'; // 在单聊中隐藏
    }

    exitSelectionMode();

    const messagesContainer = document.getElementById('chat-messages');
    const chatInputArea = document.getElementById('chat-input-area');
    const lockOverlay = document.getElementById('chat-lock-overlay');
    const lockContent = document.getElementById('chat-lock-content');

    messagesContainer.dataset.theme = chat.settings.theme || 'default';
    const fontSize = chat.settings.fontSize || 13;
    messagesContainer.style.setProperty('--chat-font-size', `${fontSize}px`);
    applyScopedCss(chat.settings.customCss || '', '#chat-messages', 'custom-bubble-style');
    const displayName = !chat.isGroup && chat.settings.remarkName ? chat.settings.remarkName : chat.name;
    document.getElementById('chat-header-title').textContent = displayName;
    const statusContainer = document.getElementById('chat-header-status');
    const statusTextEl = statusContainer.querySelector('.status-text');

    if (chat.isGroup) {
        statusContainer.style.display = 'none';
        document.getElementById('chat-header-title-wrapper').style.justifyContent = 'center';
    } else {
        statusContainer.style.display = 'flex';
        document.getElementById('chat-header-title-wrapper').style.justifyContent = 'flex-start';
        statusTextEl.textContent = chat.status?.text || '在线';
        statusContainer.classList.toggle('busy', chat.status?.isBusy || false);
    }

    lockOverlay.style.display = 'none';
    chatInputArea.style.visibility = 'visible';
    lockContent.innerHTML = '';

    if (!chat.isGroup && chat.relationship.status !== 'friend') {
        lockOverlay.style.display = 'flex';
        chatInputArea.style.visibility = 'hidden';

        let lockHtml = '';
        switch (chat.relationship.status) {
            case 'blocked_by_user':
                const isSimulationRunning = simulationIntervalId !== null;
                const blockedTimestamp = chat.relationship.blockedTimestamp;
                const cooldownHours = window.state.globalSettings.blockCooldownHours || 1;
                const cooldownMilliseconds = cooldownHours * 60 * 60 * 1000;
                const timeSinceBlock = Date.now() - blockedTimestamp;
                const isCooldownOver = timeSinceBlock > cooldownMilliseconds;
                const timeRemainingMinutes = Math.max(0, Math.ceil((cooldownMilliseconds - timeSinceBlock) / (1000 * 60)));

                lockHtml = `
                            <span class="lock-text">你已将“${chat.name}”拉黑。</span>
                            <button id="unblock-btn" class="lock-action-btn">解除拉黑</button>
                            <div style="margin-top: 20px; padding: 10px; border: 1px dashed #ccc; border-radius: 8px; font-size: 11px; text-align: left; color: #666; background: rgba(0,0,0,0.02);">
                                <strong style="color: #333;">【开发者诊断面板】</strong><br>
                                - 后台活动总开关: ${window.state.globalSettings.enableBackgroundActivity ? '<span style="color: green;">已开启</span>' : '<span style="color: red;">已关闭</span>'}<br>
                                - 系统心跳计时器: ${isSimulationRunning ? '<span style="color: green;">运行中</span>' : '<span style="color: red;">未运行</span>'}<br>
                                - 当前角色状态: <strong>${chat.relationship.status}</strong><br>
                                - 需要冷静(小时): <strong>${cooldownHours}</strong><br>
                                - 冷静期是否结束: ${isCooldownOver ? '<span style="color: green;">是</span>' : `<span style="color: orange;">否 (还剩约 ${timeRemainingMinutes} 分钟)</span>`}<br>
                                - 触发条件: ${isCooldownOver && window.state.globalSettings.enableBackgroundActivity ? '<span style="color: green;">已满足，等待下次系统心跳</span>' : '<span style="color: red;">未满足</span>'}
                            </div>
                            <button id="force-apply-check-btn" class="lock-action-btn secondary" style="margin-top: 10px;">强制触发一次好友申请检测</button>
                        `;

                break;
            case 'blocked_by_ai':
                lockHtml = `
                            <span class="lock-text">你被对方拉黑了。</span>
                            <button id="apply-friend-btn" class="lock-action-btn">重新申请加为好友</button>
                        `;
                break;

            case 'pending_user_approval':
                lockHtml = `
                            <span class="lock-text">“${chat.name}”请求添加你为好友：<br><i>“${chat.relationship.applicationReason}”</i></span>
                            <button id="accept-friend-btn" class="lock-action-btn">接受</button>
                            <button id="reject-friend-btn" class="lock-action-btn secondary">拒绝</button>
                        `;
                break;

            case 'pending_ai_approval':
                lockHtml = `<span class="lock-text">好友申请已发送，等待对方通过...</span>`;
                break;
        }
        lockContent.innerHTML = lockHtml;
    }
    messagesContainer.innerHTML = '';

    const chatScreen = document.getElementById('chat-interface-screen');

    // 核心逻辑：单人背景优先于全局背景
    const backgroundToApply = chat.settings.background || window.state.globalSettings.globalChatBackground;

    if (backgroundToApply) {
        chatScreen.style.backgroundImage = `url(${backgroundToApply})`;
    } else {
        chatScreen.style.backgroundImage = 'none';
    }

    const isDarkMode = document.getElementById('phone-screen').classList.contains('dark-mode');
    chatScreen.style.backgroundColor = chat.settings.background ? 'transparent' : isDarkMode ? '#000000' : '#f0f2f5';
    const history = chat.history;
    const totalMessages = history.length;
    currentRenderedCount = 0;
    const initialMessages = history.slice(-window.MESSAGE_RENDER_WINDOW);
    let lastMessageTimestamp = null;

    initialMessages.forEach((msg) => {
        if (msg.isHidden) return; // 【新增】跳过隐藏消息

        if (window.isNewDay(msg.timestamp, lastMessageTimestamp)) {
            // 调用新的生成器函数
            const dateStampEl = window.createDateStampElement(msg.timestamp);
            messagesContainer.insertBefore(dateStampEl, document.getElementById('typing-indicator'));
        }

        appendMessage(msg, chat, true);

        lastMessageTimestamp = msg.timestamp;
    });
    currentRenderedCount = initialMessages.length;
    if (totalMessages > currentRenderedCount) {
        prependLoadMoreButton(messagesContainer);
    }
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.style.display = 'none';
    typingIndicator.textContent = '对方正在输入...';
    messagesContainer.appendChild(typingIndicator);
    setTimeout(() => (messagesContainer.scrollTop = messagesContainer.scrollHeight), 0);
    renderChatPet();
}

function prependLoadMoreButton(container) {
    const button = document.createElement('button');
    button.id = 'load-more-btn';
    button.textContent = '加载更早的记录';
    button.addEventListener('click', loadMoreMessages);
    container.prepend(button);
}

function loadMoreMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat) return;
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.remove();
    const totalMessages = chat.history.length;
    const nextSliceStart = totalMessages - currentRenderedCount - window.MESSAGE_RENDER_WINDOW;
    const nextSliceEnd = totalMessages - currentRenderedCount;
    const messagesToPrepend = chat.history.slice(Math.max(0, nextSliceStart), nextSliceEnd);
    const oldScrollHeight = messagesContainer.scrollHeight;

    // 1. 找到屏幕上已有的、最老的那条【真实消息】的时间戳
    const firstVisibleMessage = messagesContainer.querySelector('.message-wrapper:not(.date-stamp-wrapper)');
    let subsequentMessageTimestamp = firstVisibleMessage ? parseInt(firstVisibleMessage.dataset.timestamp) : null;

    // 2. 从后往前（从新到旧）遍历我们要新加载的消息
    messagesToPrepend.reverse().forEach((currentMsg) => {
        // 检查这条新消息和它后面那条（可能是屏幕上已有的，也可能是刚加载的）消息是否跨天
        if (subsequentMessageTimestamp && window.isNewDay(subsequentMessageTimestamp, currentMsg.timestamp)) {
            // 如果跨天，就为后面那条“较新”的消息创建一个日期戳
            const dateStampEl = window.createDateStampElement(subsequentMessageTimestamp);
            messagesContainer.prepend(dateStampEl);
        }

        // 正常地把当前这条新消息放到最前面
        prependMessage(currentMsg, chat);

        // 更新追踪器，为下一次比较做准备
        subsequentMessageTimestamp = currentMsg.timestamp;
    });

    // 3. 【边界处理】处理所有新加载消息的最前面（也就是整个聊天记录的最老）的那条消息
    // 它也需要一个日期戳
    if (subsequentMessageTimestamp) {
        const dateStampEl = window.createDateStampElement(subsequentMessageTimestamp);
        messagesContainer.prepend(dateStampEl);
    }

    currentRenderedCount += messagesToPrepend.length;
    const newScrollHeight = messagesContainer.scrollHeight;
    messagesContainer.scrollTop += newScrollHeight - oldScrollHeight;
    if (totalMessages > currentRenderedCount) {
        prependLoadMoreButton(messagesContainer);
    }
}

window.renderWallpaperScreen = renderWallpaperScreen;
async function renderWallpaperScreen() {
    // 锁屏开关
    const lockScreenEnabled = localStorage.getItem('lockScreenEnabled') !== 'false';
    const toggle = document.getElementById('enable-lock-screen-toggle');
    if (toggle) {
        toggle.checked = lockScreenEnabled;
    }

    // 主屏幕字体颜色和阴影
    const savedColor = window.state.globalSettings.homeIconWidgetTextColor || '#FFFFFF';
    document.getElementById('home-icon-widget-text-color-picker').value = savedColor;
    document.getElementById('home-icon-widget-text-color-input').value = savedColor;
    document.getElementById('remove-home-font-shadow-toggle').checked = !!window.state.globalSettings.removeHomeFontShadow;

    // 主屏幕壁纸预览
    const preview = document.getElementById('wallpaper-preview');
    const bg = window.newWallpaperBase64 || newWallpaperBase64 || window.state.globalSettings.wallpaper;
    if (bg && bg.startsWith('data:image')) {
        preview.style.backgroundImage = `url(${bg})`;
        preview.textContent = '';
    } else if (bg) {
        preview.style.backgroundImage = bg;
        preview.textContent = '当前为渐变色';
    }

    // 锁屏壁纸预览
    const lockscreenPreview = document.getElementById('lockscreen-wallpaper-preview');
    const lockBg = window.newLockscreenWallpaperBase64 || newLockscreenWallpaperBase64 || window.state.globalSettings.lockscreenWallpaper;
    if (lockBg && lockBg.startsWith('data:image')) {
        lockscreenPreview.style.backgroundImage = `url(${lockBg})`;
        lockscreenPreview.textContent = '';
    } else if (lockBg) {
        lockscreenPreview.style.backgroundImage = lockBg;
        lockscreenPreview.textContent = '当前为渐变色';
    }

    // 密码输入框
    document.getElementById('password-set-input').value = window.state.globalSettings.password || '';

    // 全局聊天背景预览
    const globalBgPreview = document.getElementById('global-bg-preview');
    const globalBg = window.newGlobalBgBase64 || newGlobalBgBase64 || window.state.globalSettings.globalChatBackground;
    if (globalBg && globalBg.startsWith('data:image')) {
        globalBgPreview.style.backgroundImage = `url(${globalBg})`;
        globalBgPreview.textContent = '';
    } else if (globalBg) {
        globalBgPreview.style.background = globalBg;
        globalBgPreview.textContent = '当前为渐变色';
    } else {
        globalBgPreview.style.backgroundImage = 'none';
        globalBgPreview.textContent = '点击下方上传';
    }

    // 铃声和提示音
    document.getElementById('ringtone-url-input').value = window.state.globalSettings.ringtoneUrl || '';
    document.getElementById('notification-sound-url-input').value = window.state.globalSettings.notificationSoundUrl || '';

    await loadThemesToDropdown(); // 确保主题列表已加载
    const editor = document.getElementById('theme-css-editor');
    const selector = document.getElementById('theme-selector');

    // 优先加载 activeCustomCss
    if (window.state.globalSettings.activeCustomCss) {
        editor.value = window.state.globalSettings.activeCustomCss;
        // 如果自定义CSS存在，则将下拉框重置为“未选择”状态
        selector.value = '';
    }
    // 如果没有自定义CSS，但有选中的主题ID
    else if (window.state.globalSettings.activeThemeId) {
        const theme = await window.db.themes.get(window.state.globalSettings.activeThemeId);
        if (theme) {
            editor.value = theme.css;
            selector.value = theme.id; // 自动选中该主题
        } else {
            editor.value = THEME_CSS_TEMPLATE; // 如果ID无效，则显示模板
        }
    }
    // 如果什么都没保存，显示模板
    else {
        editor.value = THEME_CSS_TEMPLATE;
    }

    // 渲染App图标和名称设置
    renderIconSettings();
    renderAppNameSettings();

    // 加载预设下拉框
    loadHomeScreenPresetsToDropdown();
}

window.renderWallpaperScreenProxy = renderWallpaperScreen;


/**
 * 【全新】从卡片点击后，打开情侣空间并跳转到指定页签
 * @param {string} charId - 角色ID
 * @param {string} viewId - 要跳转到的视图ID (例如 'ls-diary-view')
 */
function openLoversSpaceFromCard(charId, viewId) {
    // 1. 打开指定角色的情侣空间主界面
    openLoversSpace(charId);

    // 2. 等待一小会儿，确保界面已渲染
    setTimeout(() => {
        // 3. 找到对应的页签按钮并模拟点击它
        const targetTab = document.querySelector(`.ls-tab-item[data-view='${viewId}']`);
        if (targetTab) {
            targetTab.click();
        }
    }, 100); // 100毫秒的延迟通常足够了
}

function createMessageElement(msg, chat) {
    if (msg.type === 'recalled_message') {
        const wrapper = document.createElement('div');
        // 1. 给 wrapper 也加上 timestamp，方便事件委托时查找
        wrapper.className = 'message-wrapper system-pat';
        wrapper.dataset.timestamp = msg.timestamp;

        const bubble = document.createElement('div');
        // 2. 让这个元素同时拥有 .message-bubble 和 .recalled-message-placeholder 两个class
        //    这样它既能被选择系统识别，又能保持原有的居中灰色样式
        bubble.className = 'message-bubble recalled-message-placeholder';
        // 3. 把 timestamp 放在 bubble 上，这是多选逻辑的关键
        bubble.dataset.timestamp = msg.timestamp;
        bubble.textContent = msg.content;

        wrapper.appendChild(bubble);

        // 4. 为它补上和其他消息一样的标准事件监听器
        addLongPressListener(wrapper, () => window.showMessageActions && window.showMessageActions(msg.timestamp));
        wrapper.addEventListener('click', () => {
            if (isSelectionMode) {
                toggleMessageSelection(msg.timestamp);
            }
        });

        // 5. 在之前的“点击查看原文”的逻辑中，我们已经使用了事件委托，所以这里不需要再单独为这个元素添加点击事件了。
        //    init() 函数中的那个事件监听器会处理它。

        return wrapper;
    }

    if (msg.isHidden) {
        return null;
    }

    if (msg.type === 'pat_message') {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper system-pat';
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble system-bubble';
        bubble.dataset.timestamp = msg.timestamp;
        bubble.textContent = msg.content;
        wrapper.appendChild(bubble);
        addLongPressListener(wrapper, () => window.showMessageActions && window.showMessageActions(msg.timestamp));
        wrapper.addEventListener('click', () => {
            if (isSelectionMode) toggleMessageSelection(msg.timestamp);
        });
        return wrapper;
    } else if (msg.type === 'narrative') {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper system-pat'; // 复用系统消息的居中样式
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble system-bubble';
        bubble.dataset.timestamp = msg.timestamp;

        bubble.style.textAlign = 'left';
        bubble.style.display = 'inline-block'; // 保持气泡自适应内容宽度
        bubble.style.maxWidth = '100%'; // 限制最大宽度，避免太宽

        // 这里给它加个小图标，让它看起来更有“剧情感”
        bubble.innerHTML = `
                        <div style="font-weight:bold; color:#5f6368;">📝 旁白</div>
                        <div style="line-height: 1.5;">${msg.content.replace(/\n/g, '<br>')}</div>
                    `;

        wrapper.appendChild(bubble);

        // 绑定长按和点击事件（用于删除等操作）
        addLongPressListener(wrapper, () => window.showMessageActions && window.showMessageActions(msg.timestamp));
        wrapper.addEventListener('click', () => {
            if (isSelectionMode) toggleMessageSelection(msg.timestamp);
        });
        return wrapper;
    }

    const isUser = msg.role === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isUser ? 'user' : 'ai'}`;

    if (chat.isGroup) {
        const senderLine = document.createElement('div');
        senderLine.className = 'group-sender-line';

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'group-sender-tags';

        let senderDisplayName;

        if (isUser) {
            // 如果是用户自己
            senderDisplayName = chat.settings.myNickname || '我';

            // 检查用户是否是群主
            if (chat.ownerId === 'user') {
                const roleTag = document.createElement('span');
                roleTag.className = 'group-role-tag owner';
                roleTag.textContent = '群主';
                tagsContainer.appendChild(roleTag);
            }
            // 检查用户是否被设为管理员
            else if (chat.settings.isUserAdmin) {
                const roleTag = document.createElement('span');
                roleTag.className = 'group-role-tag admin';
                roleTag.textContent = '管理员';
                tagsContainer.appendChild(roleTag);
            }

            // 检查用户是否有头衔
            if (chat.settings.myGroupTitle) {
                const titleTag = document.createElement('span');
                titleTag.className = 'group-title-tag';
                titleTag.textContent = chat.settings.myGroupTitle;
                tagsContainer.appendChild(titleTag);
            }
        } else {
            // 如果是其他成员 (AI/NPC)，这部分逻辑保持不变
            const member = chat.members.find((m) => m.originalName === msg.senderName);
            senderDisplayName = member ? member.groupNickname : msg.senderName || '未知成员';

            // 如果该成员被禁言了，就添加一个禁言标签
            if (member && member.isMuted) {
                const muteTag = document.createElement('span');
                muteTag.className = 'group-title-tag'; // 复用头衔标签的样式
                muteTag.style.color = '#ff3b30'; // 让它变成红色
                muteTag.style.backgroundColor = '#ffe5e5'; // 淡红色背景
                muteTag.textContent = '🚫已禁言';
                tagsContainer.appendChild(muteTag);
            }

            if (member && chat.ownerId === member.id) {
                const roleTag = document.createElement('span');
                roleTag.className = 'group-role-tag owner';
                roleTag.textContent = '群主';
                tagsContainer.appendChild(roleTag);
            } else if (member && member.isAdmin) {
                const roleTag = document.createElement('span');
                roleTag.className = 'group-role-tag admin';
                roleTag.textContent = '管理员';
                tagsContainer.appendChild(roleTag);
            }

            if (member && member.groupTitle) {
                const titleTag = document.createElement('span');
                titleTag.className = 'group-title-tag';
                titleTag.textContent = member.groupTitle;
                tagsContainer.appendChild(titleTag);
            }
        }

        const senderNameSpan = document.createElement('span');
        senderNameSpan.className = 'sender-name';
        senderNameSpan.textContent = senderDisplayName;

        // 修复用户标签显示在右边的问题
        if (isUser) {
            senderLine.appendChild(tagsContainer); // 标签在左
            senderLine.appendChild(senderNameSpan); // 昵称在右
        } else {
            senderLine.appendChild(senderNameSpan); // 昵称在左
            senderLine.appendChild(tagsContainer); // 标签在右
        }

        wrapper.appendChild(senderLine);
    }

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isUser ? 'user' : 'ai'}`;
    bubble.dataset.timestamp = msg.timestamp;

    const timestampEl = document.createElement('span');
    timestampEl.className = 'timestamp';
    timestampEl.textContent = formatTimestamp(msg.timestamp);

    // 找到确定 avatarSrc 的那段代码
    let avatarSrc,
        avatarFrameSrc = ''; // <--- 声明两个变量
    if (chat.isGroup) {
        if (isUser) {
            avatarSrc = chat.settings.myAvatar || defaultMyGroupAvatar;
            avatarFrameSrc = chat.settings.myAvatarFrame || ''; // <--- 获取“我”的头像框
        } else {
            const member = chat.members.find((m) => m.originalName === msg.senderName);
            avatarSrc = member ? member.avatar : defaultGroupMemberAvatar;
            avatarFrameSrc = member ? member.avatarFrame || '' : ''; // <--- 获取成员的头像框
        }
    } else {
        if (isUser) {
            avatarSrc = chat.settings.myAvatar || defaultAvatar;
            avatarFrameSrc = chat.settings.myAvatarFrame || ''; // <--- 获取“我”的头像框
        } else {
            avatarSrc = chat.settings.aiAvatar || defaultAvatar;
            avatarFrameSrc = chat.settings.aiAvatarFrame || ''; // <--- 获取AI的头像框
        }
    }

    let avatarHtml;
    // 如果存在头像框URL
    if (avatarFrameSrc) {
        avatarHtml = `
                    <div class="avatar-with-frame">
                        <img src="${avatarSrc}" class="avatar-img">
                        <img src="${avatarFrameSrc}" class="avatar-frame">
                    </div>
                `;
    } else {
        // 如果没有，就使用最简单的头像结构
        avatarHtml = `<img src="${avatarSrc}" class="avatar">`;
    }

    let contentHtml;

    if (msg.type === 'share_link') {
        bubble.classList.add('is-link-share');

        // onclick="openBrowser(...)" 移除，我们将在JS中动态绑定事件
        contentHtml = `
                    <div class="link-share-card" data-timestamp="${msg.timestamp}">
                        <div class="title">${msg.title || '无标题'}</div>
                        <div class="description">${msg.description || '点击查看详情...'}</div>
                        <div class="footer">
                            <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            <span>${msg.source_name || '链接分享'}</span>
                        </div>
                    </div>
                `;
    }
    // ... 其他 case ...
    else if (msg.type === 'dating_summary_card') {
        bubble.classList.add('is-dating-summary');
        const payload = msg.payload;
        let cardClass = '';

        if (payload.ratingType === 'romantic') {
            cardClass = 'romantic';
        } else if (payload.ratingType === 'passionate') {
            cardClass = 'passionate';
        } else if (payload.ratingType === 'perfect') {
            cardClass = 'perfect';
        }

        // 不再存储复杂的JSON字符串
        contentHtml = `
                <div class="dating-summary-chat-card ${cardClass}" data-timestamp="${msg.timestamp}">
                    <div class="rating">${payload.rating}</div>
                    <div class="tip">点击查看详情</div>
                </div>
            `;
    } else if (msg.type === 'share_card') {
        bubble.classList.add('is-link-share'); // 复用链接分享的卡片样式
        // 把时间戳加到卡片上，方便后面点击时识别
        contentHtml = `
                <div class="link-share-card" style="cursor: pointer;" data-timestamp="${msg.timestamp}">
                    <div class="title">${msg.payload.title}</div>
                    <div class="description">共 ${msg.payload.sharedHistory.length} 条消息</div>
                    <div class="footer">
                        <svg class="footer-icon" ...>...</svg> <!-- 复用链接分享的图标 -->
                        <span>聊天记录</span>
                    </div>
                </div>
            `;
    } else if (msg.type === 'eleme_order_notification') {
        bubble.classList.add('is-gift-notification');
        const payload = msg.payload;

        let remarkHtml = '';
        if (payload.remark && payload.remark.trim()) {
            remarkHtml = `
                    <div class="waimai-remark">
                        <span class="remark-label">备注:</span>
                        <span class="remark-text">${payload.remark}</span>
                    </div>
                `;
        }

        // 1. 我们删除了写在HTML里的蓝色渐变样式。
        // 2. 将卡片的 class 从 "gift-card" 改为 "waimai-meituan-card"，方便我们定制专属样式。
        // 3. 将图标从面条 🍜 换成了外卖小摩托 🛵，更符合主题。
        contentHtml = `
                <div class="waimai-meituan-card">
                    <div class="gift-card-header">
                        <div class="icon">🛵</div>
                        <div class="title">一份来自 ${payload.senderName} 的外卖</div>
                    </div>
                    <div class="gift-card-body">
                        <img src="${payload.foodImageUrl}" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                        <p class="greeting" style="font-weight: bold; font-size: 16px;">${payload.foodName}</p>
                        <p style="font-size: 13px; color: #888;">你的专属外卖已送达</p>
                        ${remarkHtml}
                    </div>
                </div>
            `;
    } else if (msg.type === 'borrow_money_request') {
        bubble.classList.add('is-borrow-request'); // 应用透明气泡样式
        const payload = msg.payload;
        // 直接将卡片的HTML赋给contentHtml，不再拼接任何文本
        contentHtml = `
                <div class="borrow-card">
                    <div class="borrow-header">
                        向 <span>${payload.lenderName}</span> 借钱
                    </div>
                    <div class="borrow-body">
                        <p class="label">借款金额</p>
                        <p class="amount">¥${payload.amount.toFixed(2)}</p>
                        <p class="reason">
                            <strong>借款用途:</strong><br>
                            ${payload.reason}
                        </p>
                    </div>
                </div>
            `;
    } else if (msg.type === 'repost_forum_post') {
        bubble.classList.add('is-link-share'); // 复用链接分享的样式，省事！
        const postPayload = msg.payload;
        //把帖子的ID存到卡片的 data-post-id 属性里，方便以后点击跳转
        contentHtml = `
                <div class="link-share-card" style="cursor: pointer;" data-post-id="${postPayload.postId}">
                    <div class="title">【小组帖子】${postPayload.title}</div>
                    <div class="description">${postPayload.content}</div>
                    <div class="footer">
                        <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c.35 0 .69-.02 1.03-.06"></path><path d="M18.5 12.5c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3c.83 0 1.58-.34 2.12-.88"></path></svg>
                        <span>来自小组的分享</span>
                    </div>
                </div>
            `;
    } else if (msg.type === 'kk_item_share') {
        bubble.classList.add('is-link-share'); // 复用透明背景样式(如果已定义)，或者不加这行让它有气泡背景
        // 如果你没有 is-link-share 样式，可以忽略上一行，或者定义 bubble.style.background = 'transparent';
        bubble.style.background = 'transparent';
        bubble.style.padding = '0';

        const payload = msg.payload;

        contentHtml = `
            <div class="kk-share-card">
                <div class="header">
                    <span class="icon">🔍</span>
                    <span>查岗线索：${payload.itemName}</span>
                </div>
                <div class="content">${payload.content}</div>
                <div class="footer">
                    来源：${payload.areaName}
                    </div>
                </div>
            `;
    } else if (msg.type === 'cart_share_request') {
        bubble.classList.add('is-cart-share-request');
        const payload = msg.payload;
        let statusText = '等待对方处理...';
        let cardClass = '';

        if (payload.status === 'paid') {
            statusText = '对方已为你买单';
            cardClass = 'paid';
        } else if (payload.status === 'rejected') {
            statusText = '对方拒绝了你的请求';
            cardClass = 'rejected';
        }

        contentHtml = `
                <div class="cart-share-card ${cardClass}">
                    <div class="cart-share-header">
                        <div class="icon">🛒</div>
                        <div class="title">购物车代付请求</div>
                    </div>
                    <div class="cart-share-body">
                        <div class="label">共 ${payload.itemCount} 件商品，合计</div>
                        <div class="amount">¥${payload.totalPrice.toFixed(2)}</div>
                        <div class="status-text">${statusText}</div>
                    </div>
                </div>
            `;
    } else if (msg.type === 'waimai_gift_from_char') {
        bubble.classList.add('is-gift-notification');
        const payload = msg.payload;

        contentHtml = `
                <div class="waimai-meituan-card">
                    <div class="gift-card-header">
                        <div class="icon">🛵</div>
                        <div class="title">你的专属外卖已送达</div>
                    </div>
                    <div class="gift-card-body">
                        <img src="${payload.foodImageUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                        <p class="greeting" style="font-weight: bold; font-size: 16px;">${payload.foodName}</p>
                        <p style="font-size: 13px; color: #888;">来自: ${payload.restaurant}</p>
                    </div>
                    <div class="waimai-remark">
                        ${payload.greeting}
                    </div>
                </div>
            `;
    } else if (msg.type === 'gift_notification') {
        bubble.classList.add('is-gift-notification'); // 应用透明气泡样式
        const payload = msg.payload;

        // 在这里构建卡片的完整HTML内容
        contentHtml = `
                <div class="gift-card">
                    <div class="gift-card-header">
                        <div class="icon">🎁</div>
                        <!-- 1. 清晰指明是谁送的礼物 -->
                        <div class="title">一份来自 ${payload.senderName} 的礼物</div>
                    </div>
                    <div class="gift-card-body">
                        <p class="greeting">这是我为你挑选的礼物，希望你喜欢！</p>
                        <!-- 2. 清晰列出有什么商品 -->
                        <div class="gift-card-items">
                            <strong>商品列表:</strong><br>
                            ${payload.itemSummary.replace(/、/g, '<br>')} <!-- 将顿号替换为换行，让列表更清晰 -->
                        </div>
                        <!-- 3. 清晰标明总金额 -->
                        <div class="gift-card-footer">
                            共 ${payload.itemCount} 件，合计: <span class="total-price">¥${payload.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
    } else if (msg.type === 'location') {
        bubble.classList.add('is-location');

        const currentChat = window.state.chats[window.state.activeChatId] || Object.values(window.state.chats).find((c) => c.history.some((h) => h.timestamp === msg.timestamp));
        const myNickname = currentChat.settings.myNickname || '我';
        const aiNickname = currentChat.name;

        // --- SVG 动态生成 ---
        const trajectoryPoints = msg.trajectoryPoints || [];
        const hasTrajectory = trajectoryPoints.length > 0;

        // 1. 定义SVG路径和坐标
        const pathData = 'M 20 45 Q 115 10 210 45'; // 一条预设的优美曲线
        const startPoint = { x: 20, y: 45 };
        const endPoint = { x: 210, y: 45 };

        // 2. 生成起点和终点的SVG元素
        let pinsSvg = '';
        if (msg.userLocation) {
            pinsSvg += `<circle class="svg-pin user-pin" cx="${startPoint.x}" cy="${startPoint.y}" r="6" />`;
        }
        if (msg.aiLocation) {
            pinsSvg += `<circle class="svg-pin ai-pin" cx="${endPoint.x}" cy="${endPoint.y}" r="6" />`;
        }

        // 3. 如果有轨迹，生成途经点的SVG元素
        let trajectorySvg = '';

        if (hasTrajectory) {
            // --- 使用浏览器API精确计算坐标 ---

            // 1. 定义我们的S形曲线路径数据 (不变)
            const s_curve_pathData = 'M 20 45 C 80 70, 150 20, 210 45';
            trajectorySvg += `<path class="svg-trajectory-path" d="${s_curve_pathData}" />`;

            // 2. 在内存中创建一个真实的SVG路径元素，以便使用API
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', s_curve_pathData);

            // 3. 获取这条路径的总长度
            const totalPathLength = path.getTotalLength();

            const totalPoints = trajectoryPoints.length;
            trajectoryPoints.forEach((point, index) => {
                // 4. 计算每个点应该在路径总长度的哪个位置
                const progress = (index + 1) / (totalPoints + 1);
                const lengthOnPath = totalPathLength * progress;

                // 5. 直接向浏览器查询这个位置的精确坐标
                const pointOnPath = path.getPointAtLength(lengthOnPath);
                const pointX = pointOnPath.x;
                const pointY = pointOnPath.y;

                // 6. 后续的“一上一下”布局逻辑保持不变
                let yOffset;
                if (index % 2 === 0) {
                    // 第1, 3...个点
                    yOffset = 18; // 向下
                } else {
                    // 第2, 4...个点
                    yOffset = -10; // 向上
                }

                const footprintY = pointY + yOffset;
                const labelY = footprintY + (yOffset > 0 ? 12 : -12);

                // 7. 使用100%精确的坐标生成SVG
                trajectorySvg += `
			            <text class="svg-footprint" x="${pointX}" y="${footprintY}" text-anchor="middle">🐾</text>
			            <text class="svg-location-label" x="${pointX}" y="${labelY}" text-anchor="middle">${point.name}</text>
			        `;
            });
        }

        // 4. 构建地点信息HTML
        const userLocationHtml = `<p class="${!msg.userLocation ? 'hidden' : ''}"><span class="name-tag">${myNickname}:</span> ${msg.userLocation}</p>`;
        const aiLocationHtml = `<p class="${!msg.aiLocation ? 'hidden' : ''}"><span class="name-tag">${aiNickname}:</span> ${msg.aiLocation}</p>`;

        // 5. 拼接最终的 contentHtml
        contentHtml = `
			        <div class="location-card">
			            <div class="location-map-area">
			                <svg viewBox="0 0 230 90">
			                    ${trajectorySvg}
			                    ${pinsSvg}
			                </svg>
			            </div>
			            <div class="location-info">
			                <div class="location-address">
			                    ${aiLocationHtml}
			                    ${userLocationHtml}
			                </div>
			                <div class="location-distance">相距 ${msg.distance}</div>
			            </div>
			        </div>
			    `;
    }

    // 后续的其他 else if 保持不变
    else if (msg.type === 'user_photo' || msg.type === 'ai_image') {
        bubble.classList.add('is-ai-image');
        const altText = msg.type === 'user_photo' ? '用户描述的照片' : 'AI生成的图片';
        contentHtml = `<img src="https://i.postimg.cc/KYr2qRCK/1.jpg" class="ai-generated-image" alt="${altText}" data-description="${msg.content}">`;
    } else if (msg.type === 'voice_message') {
        bubble.classList.add('is-voice-message');

        // 将语音原文存储在父级气泡的 data-* 属性中，方便事件处理器获取
        bubble.dataset.voiceText = msg.content;

        const duration = Math.max(1, Math.round((msg.content || '').length / 5));
        const durationFormatted = `0:${String(duration).padStart(2, '0')}''`;
        const waveformHTML = '<div></div><div></div><div></div><div></div><div></div>';

        // 构建包含所有新元素的完整 HTML
        contentHtml = `
			        <div class="voice-message-body">
			            <div class="voice-waveform">${waveformHTML}</div>
			            <div class="loading-spinner"></div>
			            <span class="voice-duration">${durationFormatted}</span>
			        </div>
			        <div class="voice-transcript"></div>
			    `;
    } else if (msg.type === 'transfer') {
        bubble.classList.add('is-transfer');

        let titleText, noteText;
        const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';

        if (isUser) {
            // 消息是用户发出的
            if (msg.isRefund) {
                // 用户发出的退款（即用户拒收了AI的转账）
                titleText = `退款给 ${chat.name}`;
                noteText = '已拒收对方转账';
            } else {
                // 用户主动发起的转账
                titleText = `转账给 ${msg.receiverName || chat.name}`;
                if (msg.status === 'accepted') {
                    noteText = '对方已收款';
                } else if (msg.status === 'declined') {
                    noteText = '对方已拒收';
                } else {
                    noteText = msg.note || '等待对方处理...';
                }
            }
        } else {
            // 消息是 AI 发出的
            if (msg.isRefund) {
                // AI 的退款（AI 拒收了用户的转账）
                titleText = `退款来自 ${msg.senderName}`;
                noteText = '转账已被拒收';
            } else if (msg.receiverName === myNickname) {
                // AI 主动给用户的转账
                titleText = `转账给 ${myNickname}`;
                if (msg.status === 'accepted') {
                    noteText = '你已收款';
                } else if (msg.status === 'declined') {
                    noteText = '你已拒收';
                } else {
                    // 用户需要处理的转账
                    bubble.style.cursor = 'pointer';
                    bubble.dataset.status = 'pending';
                    noteText = msg.note || '点击处理';
                }
            } else {
                // AI 发给群里其他人的转账，对当前用户来说只是一个通知
                titleText = `转账: ${msg.senderName} → ${msg.receiverName}`;
                noteText = msg.note || '群聊内转账';
            }
        }

        const heartIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="vertical-align: middle;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`;

        contentHtml = `
			        <div class="transfer-card">
			            <div class="transfer-title">${heartIcon} ${titleText}</div>
			            <div class="transfer-amount">¥ ${Number(msg.amount).toFixed(2)}</div>
			            <div class.transfer-note">${noteText}</div>
			        </div>
			    `;
    } else if (msg.type === 'waimai_request') {
        bubble.classList.add('is-waimai-request');
        if (msg.status === 'paid' || msg.status === 'rejected') {
            bubble.classList.add(`status-${msg.status}`);
        }
        let displayName;
        // 如果是群聊
        if (chat.isGroup) {
            // 就执行原来的逻辑：在成员列表里查找昵称
            const member = chat.members.find((m) => m.originalName === msg.senderName);
            displayName = member ? member.groupNickname : msg.senderName;
        } else {
            // 否则（是单聊），直接使用聊天对象的名称
            displayName = chat.name;
        }

        const requestTitle = `来自 ${displayName} 的代付请求`;
        let actionButtonsHtml = '';
        if (msg.status === 'pending' && !isUser) {
            actionButtonsHtml = `
			                <div class="waimai-user-actions">
			                    <button class="waimai-decline-btn" data-choice="rejected">残忍拒绝</button>
			                    <button class="waimai-pay-btn" data-choice="paid">为Ta买单</button>
			                </div>`;
        }
        contentHtml = `
			            <div class="waimai-card">
			                <div class="waimai-header">
			                    <img src="https://files.catbox.moe/mq179k.png" class="icon" alt="Meituan Icon">
			                    <div class="title-group">
			                        <span class="brand">美团外卖</span><span class="separator">|</span><span>外卖美食</span>
			                    </div>
			                </div>
			                <div class="waimai-catchphrase">Hi，你和我的距离只差一顿外卖～</div>
			                <div class="waimai-main">
			                    <div class="request-title">${requestTitle}</div>
			                    <div class="payment-box">
			                        <div class="payment-label">需付款</div>
			                        <div class="amount">¥${Number(msg.amount).toFixed(2)}</div>
			                        <div class="countdown-label">剩余支付时间
			                            <div class="countdown-timer" id="waimai-timer-${msg.timestamp}"></div>
			                        </div>
			                    </div>
			                    <button class="waimai-details-btn">查看详情</button>
			                </div>
			                ${actionButtonsHtml}
			            </div>`;

        setTimeout(() => {
            const timerEl = document.getElementById(`waimai-timer-${msg.timestamp}`);
            if (timerEl && msg.countdownEndTime) {
                if (waimaiTimers[msg.timestamp]) clearInterval(waimaiTimers[msg.timestamp]);
                if (msg.status === 'pending') {
                    waimaiTimers[msg.timestamp] = startWaimaiCountdown(timerEl, msg.countdownEndTime);
                } else {
                    timerEl.innerHTML = `<span>已</span><span>处</span><span>理</span>`;
                }
            }
            const detailsBtn = document.querySelector(`.message-bubble[data-timestamp="${msg.timestamp}"] .waimai-details-btn`);
            if (detailsBtn) {
                detailsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const paidByText = msg.paidBy ? `<br><br><b>状态：</b>由 ${msg.paidBy} 为您代付成功` : '';
                    showCustomAlert('订单详情', `<b>商品：</b>${msg.productInfo}<br><b>金额：</b>¥${Number(msg.amount).toFixed(2)}${paidByText}`);
                });
            }
            const actionButtons = document.querySelectorAll(`.message-bubble[data-timestamp="${msg.timestamp}"] .waimai-user-actions button`);
            actionButtons.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const choice = e.target.dataset.choice;
                    handleWaimaiResponse(msg.timestamp, choice);
                });
            });
        }, 0);
    } else if (msg.type === 'red_packet') {
        bubble.classList.add('is-red-packet');
        const myNickname = chat.settings.myNickname || '我';

        // 从最新的 msg 对象中获取状态
        const hasClaimed = msg.claimedBy && msg.claimedBy[myNickname];
        const isFinished = msg.isFullyClaimed;

        let cardClass = '';
        let claimedInfoHtml = '';
        let typeText = '拼手气红包';

        // 1. 判断红包卡片的样式 (颜色)
        if (isFinished) {
            cardClass = 'opened';
        } else if (msg.packetType === 'direct' && Object.keys(msg.claimedBy || {}).length > 0) {
            cardClass = 'opened'; // 专属红包被领了也变灰
        }

        // 2. 判断红包下方的提示文字
        if (msg.packetType === 'direct') {
            typeText = `专属红包: 给 ${msg.receiverName}`;
        }

        if (hasClaimed) {
            claimedInfoHtml = `<div class="rp-claimed-info">你领取了红包，金额 ${msg.claimedBy[myNickname].toFixed(2)} 元</div>`;
        } else if (isFinished) {
            claimedInfoHtml = `<div class="rp-claimed-info">红包已被领完</div>`;
        } else if (msg.packetType === 'direct' && Object.keys(msg.claimedBy || {}).length > 0) {
            claimedInfoHtml = `<div class="rp-claimed-info">已被 ${msg.receiverName} 领取</div>`;
        }

        // 3. 拼接最终的HTML，确保onclick调用的是我们注册到全局的函数
        contentHtml = `
			        <div class="red-packet-card ${cardClass}">
			            <div class="rp-header">
			                <img src="https://files.catbox.moe/lo9xhc.png" class="rp-icon">
			                <span class="rp-greeting">${msg.greeting || '恭喜发财，大吉大利！'}</span>
			            </div>
			            <div class="rp-type">${typeText}</div>
			            ${claimedInfoHtml}
			        </div>
			    `;
    } else if (msg.type === 'ls_diary_notification') {
        bubble.classList.add('is-ls-diary-notification'); // 应用透明气泡样式
        const cardData = msg.content;

        contentHtml = `
			        <div class="ls-diary-notification-card" onclick="openLoversSpaceFromCard('${chat.id}', 'ls-diary-view')">
			            <div class="ls-diary-card-header">
			                <span>${cardData.userEmoji || '💌'}</span>
			                <span>一封来自心情日记的提醒</span>
			            </div>
			            <div class="ls-diary-card-body">
			                <p>${cardData.text}</p>
			            </div>
			            <div class="ls-diary-card-footer">
			                点击查看 →
			            </div>
			        </div>
			    `;
    } else if (msg.type === 'lovers_space_invitation') {
        bubble.classList.add('is-waimai-request'); // 复用外卖卡片的样式，很方便！
        const isUserSender = msg.role === 'user';
        const senderName = isUserSender ? chat.settings.myNickname || '我' : chat.name;
        const receiverName = isUserSender ? chat.name : chat.settings.myNickname || '我';

        let cardContent = '';

        switch (msg.status) {
            case 'pending':
                if (isUserSender) {
                    // 用户发出的，等待对方回应
                    cardContent = `
			                        <div class="waimai-main" style="background-color: #f0f8ff;">
			                            <div class="request-title" style="color: #333;">已向 ${receiverName} 发出邀请</div>
			                            <p style="font-size:14px; color:#555; margin:15px 0;">等待对方同意...</p>
			                        </div>`;
                } else {
                    // 用户收到的，需要用户回应
                    cardContent = `
			                        <div class="waimai-main" style="background-color: #fff0f5;">
			                            <div class="request-title" style="color: #d63384;">${senderName} 邀请你开启情侣空间</div>
			                            <p style="font-size:14px; color:#555; margin:15px 0;">开启后可以记录你们的专属回忆哦~</p>
			                        </div>
			                        <div class="waimai-user-actions">
			                            <button class="waimai-decline-btn" data-choice="rejected">残忍拒绝</button>
			                            <button class="waimai-pay-btn" data-choice="accepted" style="background-color: #d63384; border-color: #b02a6e;">立即开启</button>
			                        </div>`;
                }
                break;
            case 'accepted':
                cardContent = `
			                    <div class="waimai-main" style="background-color: #e6ffed;">
			                        <div class="request-title" style="color: #198754;">✅ 邀请已同意</div>
			                        <p style="font-size:14px; color:#555; margin:15px 0;">你们的情侣空间已成功开启！</p>
			                    </div>`;
                break;
            case 'rejected':
                cardContent = `
			                    <div class="waimai-main" style="background-color: #f8d7da;">
			                        <div class="request-title" style="color: #842029;">❌ 邀请被拒绝</div>
			                    </div>`;
                break;
        }

        contentHtml = `
			            <div class="waimai-card">
			                <div class="waimai-header">
			                    <span class="icon" style="font-size: 20px;">💌</span>
			                    <div class="title-group"><span class="brand">情侣空间邀请</span></div>
			                </div>
			                ${cardContent}
			            </div>`;
    } else if (msg.type === 'poll') {
        bubble.classList.add('is-poll');

        let totalVotes = 0;
        const voteCounts = {};

        // 计算总票数和每个选项的票数
        for (const option in msg.votes) {
            const count = msg.votes[option].length;
            voteCounts[option] = count;
            totalVotes += count;
        }

        const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
        let myVote = null;
        for (const option in msg.votes) {
            if (msg.votes[option].includes(myNickname)) {
                myVote = option;
                break;
            }
        }

        let optionsHtml = '<div class="poll-options-list">';
        msg.options.forEach((optionText) => {
            const count = voteCounts[optionText] || 0;
            const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
            const isVotedByMe = myVote === optionText;

            optionsHtml += `
			            <div class="poll-option-item ${isVotedByMe ? 'voted' : ''}" data-option="${optionText}">
			                <div class="poll-option-bar" style="width: ${percentage}%;"></div>
			                <div class="poll-option-content">
			                    <span class="poll-option-text">${optionText}</span>
			                    <span class="poll-option-votes">${count} 票</span>
			                </div>
			            </div>
			        `;
        });
        optionsHtml += '</div>';

        let footerHtml = '';
        // 统一按钮的显示逻辑
        if (msg.isClosed) {
            // 如果投票已结束，总是显示“查看结果”
            footerHtml = `<div class="poll-footer"><span class="poll-total-votes">共 ${totalVotes} 人投票</span><button class="poll-action-btn">查看结果</button></div>`;
        } else {
            // 如果投票未结束，总是显示“结束投票”
            footerHtml = `<div class="poll-footer"><span class="poll-total-votes">共 ${totalVotes} 人投票</span><button class="poll-action-btn">结束投票</button></div>`;
        }

        contentHtml = `
			        <div class="poll-card ${msg.isClosed ? 'closed' : ''}" data-poll-timestamp="${msg.timestamp}">
			            <div class="poll-question">${msg.question}</div>
			            ${optionsHtml}
			            ${footerHtml}
			        </div>
			    `;
    } else if (msg.type === 'tarot_reading') {
        bubble.classList.add('is-tarot-reading');
        const reading = msg.payload;
        let cardsText = reading.cards
            .map((card) => {
                return `[${card.position}] ${card.name} ${card.isReversed ? '(逆位)' : ''}`;
            })
            .join('\n');

        contentHtml = `
			        <div class="tarot-reading-card">
			            <div class="tarot-reading-header">
			                <div class="question">${reading.question}</div>
			                <div class="spread">${reading.spread.name}</div>
			            </div>
			            <div class="tarot-reading-body">
			                ${cardsText}
			            </div>
			        </div>
			    `;
    } else if (msg.type === 'lovers_space_disconnect') {
        bubble.classList.add('is-ls-disconnect'); // 应用我们写的透明气泡CSS
        contentHtml = `
			        <div class="lovers-space-disconnect-card">
			            <div class="icon">💔</div>
			            <div class="text-content">
			                <div class="title">情侣空间已解除</div>
			            </div>
			        </div>
			    `;
    } else if (msg.type === 'sticker' && msg.content) {
        bubble.classList.add('is-sticker');
        // 直接从消息对象中获取 url 和 meaning
        contentHtml = `<img src="${msg.content}" alt="${msg.meaning || 'Sticker'}" class="sticker-image">`;
    }

    // 旧的逻辑保持不变，作为兼容
    else if (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content)) {
        bubble.classList.add('is-sticker');
        contentHtml = `<img src="${msg.content}" alt="${msg.meaning || 'Sticker'}" class="sticker-image">`;
    } else if (Array.isArray(msg.content) && msg.content[0]?.type === 'image_url') {
        bubble.classList.add('has-image');
        const imageUrl = msg.content[0].image_url.url;
        contentHtml = `<img src="${imageUrl}" class="chat-image" alt="User uploaded image">`;
    } else if (msg.type === 'naiimag') {
        // NovelAI图片渲染（复用realimag样式）
        bubble.classList.add('is-realimag', 'is-card-like');
        contentHtml = `<img src="${msg.imageUrl}" class="realimag-image" alt="NovelAI图片分享" loading="lazy" onerror="this.src='https://i.postimg.cc/KYr2qRCK/1.jpg'; this.alt='图片加载失败';" title="${msg.fullPrompt || msg.prompt || 'NovelAI生成'}">`;
    } else {
        contentHtml = String(msg.content || '').replace(/\n/g, '<br>');
    }

    // 1. 检查消息对象中是否存在引用信息 (msg.quote)
    let quoteHtml = '';
    // 无论是用户消息还是AI消息，只要它包含了 .quote 对象，就执行这段逻辑
    if (msg.quote) {
        // a. 直接获取完整的、未经截断的引用内容
        const fullQuotedContent = String(msg.quote.content || '');

        // b. 构建引用块的HTML
        quoteHtml = `
			        <div class="quoted-message">
			            <div class="quoted-sender">回复 ${msg.quote.senderName}:</div>
			            <div class="quoted-content">${fullQuotedContent}</div>
			        </div>
			    `;
    }

    // 2. 拼接最终的气泡内容
    //    将构建好的 quoteHtml (如果存在) 和 contentHtml 组合起来
    // --- 将头像和内容都放回气泡内部 ---
    bubble.innerHTML = `
			        ${avatarHtml}
			        <div class="content">
			            ${quoteHtml}
			            ${contentHtml}
			        </div>
			    `;

    // --- 将完整的“气泡”和“时间戳”放入容器 ---
    wrapper.appendChild(bubble);
    wrapper.appendChild(timestampEl);

    addLongPressListener(wrapper, () => window.showMessageActions && window.showMessageActions(msg.timestamp));
    wrapper.addEventListener('click', () => {
        if (isSelectionMode) toggleMessageSelection(msg.timestamp);
    });

    if (!isUser) {
        const avatarEl = wrapper.querySelector('.avatar, .avatar-with-frame');
        if (avatarEl) {
            avatarEl.style.cursor = 'pointer';
            avatarEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const characterName = chat.isGroup ? msg.senderName : chat.name;
                handleUserPat(chat.id, characterName);
            });
        }
    }

    return wrapper;
}

function prependMessage(msg, chat) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = createMessageElement(msg, chat);

    if (!messageEl) return; // <--- 新增这行，同样的处理

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        messagesContainer.insertBefore(messageEl, loadMoreBtn.nextSibling);
    } else {
        messagesContainer.prepend(messageEl);
    }
}

function appendMessage(msg, chat, isInitialLoad = false) {
    if (!window.appendMessage) window.appendMessage = appendMessage;
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = createMessageElement(msg, chat);

    if (!messageEl) return; // 如果消息是隐藏的，则不处理

    // 只对新消息添加动画，不对初始加载的消息添加
    if (!isInitialLoad) {
        messageEl.classList.add('animate-in');
    }

    const typingIndicator = document.getElementById('typing-indicator');
    messagesContainer.insertBefore(messageEl, typingIndicator);

    if (!isInitialLoad) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        currentRenderedCount++;
    }
}

window.openChat = async function openChat(chatId) {
    window.state.activeChatId = chatId;
    const chat = window.state.chats[chatId];
    if (!chat) return; // 安全检查

    // 将未读数清零
    if (chat.unreadCount > 0) {
        chat.unreadCount = 0;
        await window.db.chats.put(chat); // 别忘了把这个改变同步到数据库
        // 我们稍后会在渲染列表时重新渲染，所以这里不需要立即重绘列表
    }
    // 把 openChat 函数挂载到全局 window 对象上
    window.openChat = openChat;

    renderChatInterface(chatId);
    showScreen('chat-interface-screen');
    window.updateListenTogetherIconProxy(window.state.activeChatId);
    toggleCallButtons(chat.isGroup || false);
    // 【心声功能】根据是否为单聊，显示或隐藏心形按钮
    document.getElementById('char-heart-btn').style.display = chat.isGroup ? 'none' : 'inline-flex';

    if (!chat.isGroup && chat.relationship?.status === 'pending_ai_approval') {
        console.log(`检测到好友申请待处理状态，为角色 "${chat.name}" 自动触发AI响应...`);
        triggerAiResponse();
    }

    // 根据是否为群聊，显示或隐藏投票按钮
    document.getElementById('send-poll-btn').style.display = chat.isGroup ? 'flex' : 'none';
    document.getElementById('pet-action-btn').style.display = chat.isGroup ? 'none' : 'flex';
    startPetDecayTimer();
}

/**
 * 格式化单条消息，用于记忆互通的上下文
 * @param {object} msg - 消息对象
 * @param {object} chat - 该消息所属的聊天对象
 * @returns {string} - 格式化后的文本，例如 "张三: 你好"
 */
function formatMessageForContext(msg, chat) {
    let senderName = '';
    if (msg.role === 'user') {
        senderName = chat.isGroup ? chat.settings.myNickname || '我' : '我';
    } else {
        // assistant
        senderName = msg.senderName || chat.name;
    }

    let contentText = '';
    if (msg.type === 'sticker' || (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content))) {
        contentText = msg.meaning ? `[表情: ${msg.meaning}]` : '[表情]';
    } else if (msg.type === 'ai_image' || msg.type === 'user_photo' || Array.isArray(msg.content)) {
        contentText = '[图片]';
    } else if (msg.type === 'voice_message') {
        contentText = `[语音]: ${msg.content}`;
    } else if (msg.type === 'transfer') {
        contentText = `[转账] 金额: ${msg.amount}, 备注: ${msg.note || '无'}`;
    } else {
        contentText = String(msg.content || '');
    }

    // added by lrq 251029 在每条消息记录前添加发送日期时间
    const date = new Date(msg.timestamp);
    const formattedDate = date.toLocaleString(); // 格式化为本地时间字符串
    return `${formattedDate} ${senderName}: ${contentText}`;
}
window.formatMessageForContext = formatMessageForContext;

window.triggerAiResponse = async function triggerAiResponse() {
    window.triggerAiResponse = triggerAiResponse; // Expose for functions.js

    if (!window.state.activeChatId) return;
    const chatId = window.state.activeChatId;
    const chat = window.state.chats[window.state.activeChatId];
    const messagesContainer = document.getElementById('chat-messages');

    let summaryContext = '';
    const summaries = chat.history.filter((msg) => msg.type === 'summary');
    if (summaries.length > 0) {
        summaryContext = `
			# 对话记忆总结 (这是你和用户的长期记忆，必须严格遵守)
			${summaries.map((summary, index) => `- 总结${index + 1}: ${summary.content}`).join('\n')}
			`;
    }
    // 将世界书读取提到这里，确保线下模式也能生效
    let worldBookContext = '';
    if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
        const linkedContents = chat.settings.linkedWorldBookIds
            .map((id) => {
                const book = window.state.worldBooks.find((b) => b.id === id);
                // 这里使用了 stripHtmlAndCode 清理函数，确保纯文本
                return book && book.content ? `\n\n## 世界书条目: ${book.name}\n${stripHtmlAndCode(book.content)}` : '';
            })
            .filter(Boolean)
            .join('');
        if (linkedContents) {
            worldBookContext = `\n\n# 核心世界观设定 (必须严格遵守以下所有设定)\n${linkedContents}\n`;
        }
    }
    // --- 线下模式核心拦截逻辑 ---
    if (!chat.isGroup && chat.settings.offlineMode && chat.settings.offlineMode.enabled) {
        console.log(`角色 "${chat.name}" 已开启线下模式...`);

        const offlineSettings = chat.settings.offlineMode;
        const wordCount = offlineSettings.wordCount || 300;
        const enableNai = offlineSettings.enableNovelAI || false;

        const defaultPrompt = `你正在和用户进行一次私密的线下约会，场景可以是一个安静的咖啡馆、温馨的家中、或是浪漫的海边。请根据你的人设和最近的对话内容，自然地延续互动。`;
        const defaultStyle = `请以【${chat.name}】的第一人称视角进行回复。你的回复【必须】是一个完整的、连贯的叙事段落，其中要包含丰富的【动作】、【神态】、【心理活动】和【对话】。`;

        const finalPrompt = offlineSettings.prompt || defaultPrompt;
        const finalStyle = offlineSettings.style || defaultStyle;

        // 1. 动态构建生图指令
        let naiInstruction = '';
        let naiExample = '';
        if (enableNai) {
            naiInstruction = `
            6.  **【【【生图指令】】】**: 生图开关已开启。你【必须】在 "chatResponse" 数组中包含一个图片生成对象。
                -   **格式**: \`{"type": "naiimag", "prompt": "1girl, ... (详细的英文描述tags)"}\`
                -   **内容**: 提取当前剧情的视觉画面（地点、光线、动作、表情、穿着）。
                `;
            naiExample = `,\n    {\n      "type": "naiimag",\n      "prompt": "1girl, sitting in cafe, holding coffee cup, smile, indoor lighting, cinematic composition"\n    }`;
        }

        const offlineSystemPrompt = `
            # 核心任务：线下场景角色扮演

            你现在【就是】角色“${chat.name}”，正在和用户进行一次【线下约会】。

            # 你的角色设定
            ${chat.settings.aiPersona}
            ${summaryContext}
            ${worldBookContext}

            # 当前情景
            ${finalPrompt}
            ${finalStyle}
            
            # 你的输出要求 (最高指令)
            1.  **【格式铁律】**: 你的回复【必须】是一个**单一且完整**的JSON对象。
            2.  **"chatResponse" 键**: (JSON数组) 包含你要发送的消息。通常是一段长叙事文本，如果开启生图，则包含生图指令。
            3.  **"innerVoice" 键**: (JSON对象) 你的内心活动，必含 clothing, behavior, thoughts, naughtyThoughts 字段。
            4.  **【字数铁律】**: 文本内容的字数应在【${wordCount}】字左右。
            5.  **【禁止出戏】**: 绝对不能提及你是AI。
            ${naiInstruction}

            # JSON输出格式示例:
            {
              "chatResponse": [
                {
                  "type": "text",
                  "content": "（这里写你的大段叙事内容...）"
                }${naiExample}
              ],
              "innerVoice": {
                "clothing": "...",
                "behavior": "...",
                "thoughts": "...",
                "naughtyThoughts": "..."
              }
            }

            # 对话历史
            ${chat.history
                .slice(-chat.settings.maxMemory)
                .map((m) => `${m.role === 'user' ? '用户' : chat.name}: ${m.content}`)
                .join('\n')}

            现在，请根据用户的最后一句话，开始你的表演。`;

        const messagesForOfflineMode = chat.history.slice(-chat.settings.maxMemory);

        // UI 状态更新
        const chatHeaderTitle = document.getElementById('chat-header-title');
        if (chatHeaderTitle) {
            chatHeaderTitle.style.opacity = 0;
            setTimeout(() => {
                chatHeaderTitle.textContent = '对方正在赴约中...';
                chatHeaderTitle.classList.add('typing-status');
                chatHeaderTitle.style.opacity = 1;
            }, 200);
        }

        try {
            const { proxyUrl, apiKey, model } = window.state.apiConfig;
            let isGemini = proxyUrl === GEMINI_API_URL;
            let requestBody;
            let requestUrl = isGemini ? `${GEMINI_API_URL}/${model}:generateContent?key=${getRandomValue(apiKey)}` : `${proxyUrl}/v1/chat/completions`;
            let requestHeaders = isGemini ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };

            if (isGemini) {
                requestBody = {
                    contents: messagesForOfflineMode.map((item) => ({
                        role: item.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: item.content }],
                    })),
                    generationConfig: { temperature: parseFloat(window.state.apiConfig.temperature) || 0.8 },
                    systemInstruction: { parts: [{ text: offlineSystemPrompt }] },
                };
            } else {
                requestBody = {
                    model: model,
                    messages: [{ role: 'system', content: offlineSystemPrompt }, ...messagesForOfflineMode],
                    temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                    stream: false,
                };
            }

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error(`API 错误: ${await response.text()}`);

            const data = await response.json();
            const aiResponseContent = isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data?.choices?.[0]?.message?.content;

            if (!aiResponseContent) throw new Error('API返回内容为空');

            // 解析 JSON
            let messagesArray = [];
            let innerVoiceData = null;

            try {
                let sanitizedContent = aiResponseContent
                    .replace(/^```json\s*/, '')
                    .replace(/```$/, '')
                    .trim();
                const firstBrace = sanitizedContent.indexOf('{');
                const lastBrace = sanitizedContent.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    sanitizedContent = sanitizedContent.substring(firstBrace, lastBrace + 1);
                }
                const fullResponse = JSON.parse(sanitizedContent);

                if (fullResponse.chatResponse && Array.isArray(fullResponse.chatResponse)) {
                    messagesArray = fullResponse.chatResponse;
                }
                if (fullResponse.innerVoice) {
                    innerVoiceData = fullResponse.innerVoice;
                }
            } catch (e) {
                console.warn('JSON解析失败，退回纯文本', e);
                messagesArray = [{ type: 'text', content: aiResponseContent }];
            }

            // 保存心声
            if (innerVoiceData) {
                const newInnerVoice = { ...innerVoiceData, timestamp: Date.now() };
                chat.latestInnerVoice = newInnerVoice;
                if (!chat.innerVoiceHistory) chat.innerVoiceHistory = [];
                chat.innerVoiceHistory.push(newInnerVoice);
            }

            // 2. 处理消息数组 (支持 naiimag)
            const isViewingThisChat = document.getElementById('chat-interface-screen').classList.contains('active') && window.state.activeChatId === chatId;
            let messageTimestamp = Date.now();

            for (const msgData of messagesArray) {
                // 2.1 如果是 naiimag 类型，执行生图逻辑 (复用线上代码)
                if (msgData.type === 'naiimag') {
                    if (!enableNai) continue; // 如果开关关了，跳过
                    console.log('【线下模式】检测到生图指令，执行 NovelAI 请求...');

                    // 这里直接复用switch case里的生图逻辑代码
                    // 因为代码太长，我们把它封装成一个即时执行的逻辑
                    (async () => {
                        try {
                            if (chatHeaderTitle) chatHeaderTitle.textContent = '正在绘制插图...';

                            const naiPrompts = getCharacterNAIPrompts(chat.id);
                            const aiPrompt = msgData.prompt || 'a beautiful scene';
                            const finalPositivePrompt = `${aiPrompt}, ${naiPrompts.positive}`;
                            const finalNegativePrompt = naiPrompts.negative;

                            const apiKey = localStorage.getItem('novelai-api-key');
                            const model = localStorage.getItem('novelai-model') || 'nai-diffusion-4-5-full';
                            const settings = getNovelAISettings();

                            if (!apiKey) throw new Error('未配置NovelAI API Key');

                            const [width, height] = settings.resolution.split('x').map(Number);
                            let requestBody;
                            let apiUrl = model.includes('nai-diffusion-4') ? 'https://image.novelai.net/ai/generate-image-stream' : 'https://image.novelai.net/ai/generate-image';

                            // V4/V3 参数构建逻辑 (简化复用)
                            const commonParams = {
                                width,
                                height,
                                scale: settings.cfg_scale,
                                sampler: settings.sampler,
                                steps: settings.steps,
                                seed: Math.floor(Math.random() * 4294967295),
                                n_samples: 1,
                                ucPreset: settings.uc_preset,
                                qualityToggle: settings.quality_toggle,
                            };

                            if (model.includes('nai-diffusion-4')) {
                                requestBody = {
                                    input: finalPositivePrompt,
                                    model,
                                    action: 'generate',
                                    parameters: {
                                        ...commonParams,
                                        params_version: 3,
                                        negative_prompt: finalNegativePrompt,
                                        v4_prompt: {
                                            caption: { base_caption: finalPositivePrompt, char_captions: [] },
                                            use_coords: false,
                                            use_order: true,
                                        },
                                        v4_negative_prompt: {
                                            caption: { base_caption: finalNegativePrompt, char_captions: [] },
                                            legacy_uc: false,
                                        },
                                    },
                                };
                            } else {
                                requestBody = {
                                    input: finalPositivePrompt,
                                    model,
                                    action: 'generate',
                                    parameters: {
                                        ...commonParams,
                                        negative_prompt: finalNegativePrompt,
                                        sm: settings.smea,
                                        sm_dyn: settings.smea_dyn,
                                        add_original_image: false,
                                    },
                                };
                            }

                            // 代理处理
                            let corsProxy = settings.cors_proxy === 'custom' ? settings.custom_proxy_url : settings.cors_proxy;
                            if (corsProxy) apiUrl = corsProxy + encodeURIComponent(apiUrl);

                            // Headers (Chrome兼容)
                            const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
                            let headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey };
                            if (isChrome) {
                                const cleanHeaders = {};
                                for (const [k, v] of Object.entries(headers)) cleanHeaders[k] = v.replace(/[^\x00-\xFF]/g, '');
                                headers = cleanHeaders;
                            }

                            const res = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
                            if (!res.ok) throw new Error(`NAI API Error: ${res.status}`);

                            // 解析响应 (SSE/Blob)
                            const contentType = res.headers.get('content-type');
                            let imageDataUrl = null,
                                zipBlob = null;

                            if (contentType && contentType.includes('text/event-stream')) {
                                const text = await res.text();
                                const lines = text.trim().split('\n');
                                let base64Data = null;
                                for (let i = lines.length - 1; i >= 0; i--) {
                                    const line = lines[i].trim();
                                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                        const dataContent = line.substring(6);
                                        try {
                                            const jsonData = JSON.parse(dataContent);
                                            if (jsonData.event_type === 'final' && jsonData.image) {
                                                base64Data = jsonData.image;
                                                break;
                                            }
                                            if (jsonData.data) {
                                                base64Data = jsonData.data;
                                                break;
                                            }
                                            if (jsonData.image) {
                                                base64Data = jsonData.image;
                                                break;
                                            }
                                        } catch (e) {
                                            base64Data = dataContent;
                                            break;
                                        }
                                    }
                                }
                                if (base64Data) {
                                    const isPNG = base64Data.startsWith('iVBORw0KGgo');
                                    const binaryString = atob(base64Data);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                    if (isPNG || base64Data.startsWith('/9j/')) {
                                        const imageBlob = new Blob([bytes], { type: isPNG ? 'image/png' : 'image/jpeg' });
                                        const reader = new FileReader();
                                        imageDataUrl = await new Promise((r) => {
                                            reader.onloadend = () => r(reader.result);
                                            reader.readAsDataURL(imageBlob);
                                        });
                                    } else {
                                        zipBlob = new Blob([bytes]);
                                    }
                                }
                            } else {
                                zipBlob = await res.blob();
                            }

                            if (!imageDataUrl && zipBlob) {
                                if (typeof JSZip === 'undefined') throw new Error('未找到JSZip库');
                                const zip = await JSZip.loadAsync(zipBlob);
                                const file = Object.values(zip.files)[0];
                                if (file) {
                                    const imgBlob = await file.async('blob');
                                    const reader = new FileReader();
                                    imageDataUrl = await new Promise((r) => {
                                        reader.onloadend = () => r(reader.result);
                                        reader.readAsDataURL(imgBlob);
                                    });
                                }
                            }

                            if (imageDataUrl) {
                                const imgMsg = {
                                    role: 'assistant',
                                    senderName: chat.name,
                                    timestamp: Date.now(),
                                    type: 'naiimag',
                                    imageUrl: imageDataUrl,
                                    prompt: aiPrompt,
                                    fullPrompt: finalPositivePrompt,
                                };
                                chat.history.push(imgMsg);
                                await window.db.chats.put(chat);
                                if (isViewingThisChat) {
                                    appendMessage(imgMsg, chat);
                                    const msgsDiv = document.getElementById('chat-messages');
                                    msgsDiv.scrollTop = msgsDiv.scrollHeight;
                                }
                            }
                        } catch (err) {
                            console.error('线下模式生图失败:', err);
                            const errBubble = {
                                role: 'system',
                                content: `[生图失败: ${err.message}]`,
                                timestamp: Date.now(),
                            };
                            chat.history.push(errBubble);
                            if (isViewingThisChat) appendMessage(errBubble, chat);
                        } finally {
                            if (chatHeaderTitle) {
                                chatHeaderTitle.textContent = chat.name;
                                chatHeaderTitle.classList.remove('typing-status');
                            }
                        }
                    })();
                    continue; // 处理完生图，跳过普通文本逻辑
                }

                // 2.2 普通文本消息
                const aiMessage = {
                    role: 'assistant',
                    senderName: chat.name,
                    timestamp: messageTimestamp++,
                    content: msgData.content || '',
                };
                chat.history.push(aiMessage);
                await window.incrementMessageCount(chatId);
                if (isViewingThisChat) {
                    appendMessage(aiMessage, chat);
                }
            }

            // 保存
            await window.db.chats.put(chat);
            renderChatList();
            window.checkAndTriggerSummary(chatId);
        } catch (error) {
            console.error('线下模式AI响应失败:', error);
            const errorMessage = { role: 'assistant', content: `[出错了: ${error.message}]`, timestamp: Date.now() };
            chat.history.push(errorMessage);
            await window.db.chats.put(chat);
            appendMessage(errorMessage, chat);
        } finally {
            if (chatHeaderTitle && window.state.chats[chatId]) {
                chatHeaderTitle.style.opacity = 0;
                setTimeout(() => {
                    chatHeaderTitle.textContent = window.state.chats[chatId].name;
                    chatHeaderTitle.classList.remove('typing-status');
                    chatHeaderTitle.style.opacity = 1;
                }, 200);
            }
        }
        return; // 结束线下模式逻辑
    }

    // 1. 准备专属表情包列表 (现在对单聊和群聊都生效)
    const exclusiveStickers = chat.settings.stickerLibrary || [];
    let exclusiveStickerContext = '';
    if (exclusiveStickers.length > 0) {
        exclusiveStickerContext = `
			## ${chat.isGroup ? '本群专属表情包' : '你的专属表情包'} (只有你能用):
			${exclusiveStickers.map((s) => `- ${s.name}`).join('\n')}
			`;
    }

    // 2. 准备通用表情包列表
    const commonStickers = window.state.charStickers || [];
    let commonStickerContext = '';
    if (commonStickers.length > 0) {
        commonStickerContext = `
			## 通用表情包 (所有角色都能用):
			${commonStickers.map((s) => `- ${s.name}`).join('\n')}
			`;
    }

    // 3. 组合成最终的表情包指令
    let stickerContext = '';
    if (exclusiveStickerContext || commonStickerContext) {
        stickerContext = `
			# 关于表情包的【绝对规则】
			1.  你拥有一个表情包列表，分为“专属”和“通用”。
			2.  当你扮演的角色想要发送表情时，【必须且只能】使用以下JSON格式：
			    \`{"type": "sticker", "name": "角色名", "sticker_name": "表情的名字"}\`
			3.  【【【最高指令】】】你【必须】从下方列表中精确地选择一个有效的 "sticker_name"。如果你编造了一个列表中不存在的名字，你的表情将会发送失败。这是强制性规则。

			${exclusiveStickerContext}
			${commonStickerContext}
			`;
    }

    const { proxyUrl, apiKey, model } = window.state.apiConfig;
    const isApiBlocked = BLOCKED_API_SITES.some((blockedDomain) => proxyUrl.includes(blockedDomain));

    if (isApiBlocked) {
        console.error(`API 请求已被拦截，因为站点 ${proxyUrl} 在黑名单中。`);
        return; // 阻止API请求
    }

    // --- 塔罗牌解读逻辑 ---
    const lastUserMessage = chat.history.filter((m) => m.role === 'user' && !m.isHidden).slice(-1)[0];
    // 检查最后一条用户消息是不是“未被解读过”的塔罗牌
    if (lastUserMessage && lastUserMessage.type === 'tarot_reading' && !lastUserMessage.isInterpreted) {
        // 给这张塔罗牌消息盖上“已处理”的章，防止无限循环！
        lastUserMessage.isInterpreted = true;

        // 1. 生成解读文本
        const reading = lastUserMessage.payload;
        let interpretationText = `本次占卜牌阵为【${reading.spread.name}】\n您的问题是：“${reading.question}”\n\n`;
        reading.cards.forEach((card, index) => {
            const orientationText = card.isReversed ? '逆位' : '正位';
            const meaning = card.isReversed ? card.reversed : card.upright;
            interpretationText += `牌位 ${index + 1}【${card.position}】：${card.name} (${orientationText})\n含义：${meaning}\n\n`;
        });

        // 2. 创建系统解读消息 (对用户可见)
        const systemMessageVisible = {
            role: 'system',
            type: 'pat_message', // 复用居中灰色气泡样式
            content: interpretationText.trim(),
            timestamp: Date.now(),
        };
        chat.history.push(systemMessageVisible);
        if (document.getElementById('chat-interface-screen').classList.contains('active')) {
            appendMessage(systemMessageVisible, chat);
        }

        // 3. 创建给Char看的隐藏指令
        const hiddenInstruction = {
            role: 'system',
            content: `[系统指令：用户刚刚完成了一次塔罗牌占卜，并把结果发给了你。上方是系统给出的官方解读，你的任务是【只根据这些解读】，以你的角色人设，和用户一起讨论和分析这次的占卜结果，不要自己编造新的含义。]`,
            timestamp: Date.now() + 1,
            isHidden: true,
        };
        chat.history.push(hiddenInstruction);

        // 4. 保存所有更改（包括给塔罗牌盖的章），然后再次触发AI，这次是让Char来讨论
        await window.db.chats.put(chat);
        return triggerAiResponse(); // 再次调用自己，让Char进行回应
    }
    // --- 塔罗牌解读逻辑结束 ---

    let weiboContextForActiveChat = '';
    try {
        // 1. 从数据库里找出最新的5条微博
        const recentWeiboPosts = await window.db.weiboPosts.orderBy('timestamp').reverse().limit(5).toArray();

        if (recentWeiboPosts.length > 0) {
            weiboContextForActiveChat = '\n\n# 最近的微博广场动态 (供你参考和评论)\n';

            recentWeiboPosts.forEach((post) => {
                const authorName = post.authorId === 'user' ? window.state.qzoneSettings.weiboNickname || '我' : post.authorNickname;
                const contentPreview = (post.content || post.hiddenContent || '(图片微博)').substring(0, 30);

                // 只有当 post.comments 确实是一个数组时，我们才去调用 .some() 方法
                const hasCommented = post.comments && Array.isArray(post.comments) && post.comments.some((c) => c.authorNickname === chat.name);
                const interactionStatus = hasCommented ? '[你已评论]' : '[你未互动]';

                weiboContextForActiveChat += `- (ID: ${post.id}) 作者: ${authorName}, 内容: "${contentPreview}..." ${interactionStatus}\n`;
            });
            weiboContextForActiveChat += ' - 【重要提示】请优先与你【未互动】的微博进行评论。如果都互动过了，可以考虑自己发一条新微博。';
        }
    } catch (e) {
        console.error('生成微博主动聊天上下文时出错:', e);
    }

    const chatHeaderTitle = document.getElementById('chat-header-title');

    // 获取群聊的输入提示元素
    const typingIndicator = document.getElementById('typing-indicator');

    // 根据聊天类型，决定显示哪种“正在输入”
    if (chat.isGroup) {
        // 1. 如果是群聊，显示底部的提示条
        if (typingIndicator) {
            typingIndicator.textContent = '成员们正在输入...';
            typingIndicator.style.display = 'block';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } else if (chat.settings.offlineMode?.enabled) {
        // 2. 如果是线下模式的单聊，在顶部标题显示“正在赴约中”
        if (chatHeaderTitle) {
            chatHeaderTitle.style.opacity = 0;
            setTimeout(() => {
                chatHeaderTitle.textContent = '对方正在赴约中...'; // <-- 你想要的文字在这里！
                chatHeaderTitle.classList.add('typing-status');
                chatHeaderTitle.style.opacity = 1;
            }, 200);
        }
    } else {
        // 3. 如果是普通的单聊，还是在顶部标题显示“正在输入”
        if (chatHeaderTitle) {
            chatHeaderTitle.style.opacity = 0;
            setTimeout(() => {
                chatHeaderTitle.textContent = '对方正在输入...';
                chatHeaderTitle.classList.add('typing-status');
                chatHeaderTitle.style.opacity = 1;
            }, 200);
        }
    }

    try {
        const { proxyUrl, apiKey, model } = window.state.apiConfig;
        if (!proxyUrl || !apiKey || !model) {
            alert('请先在API设置中配置反代地址、密钥并选择模型。');
            // 无论成功失败，都要隐藏输入提示
            if (chat.isGroup) {
                if (typingIndicator) typingIndicator.style.display = 'none';
            } else {
                if (chatHeaderTitle && window.state.chats[chatId]) {
                    chatHeaderTitle.textContent = window.state.chats[chatId].name;
                    chatHeaderTitle.classList.remove('typing-status');
                }
            }
            return;
        }

        // --- 带有上下文和理由的好友申请处理逻辑 ---
        if (!chat.isGroup && chat.relationship?.status === 'pending_ai_approval') {
            console.log(`为角色 "${chat.name}" 触发带理由的好友申请决策流程...`);

            // 1. 抓取被拉黑前的最后5条聊天记录作为参考
            const contextSummary = chat.history
                .filter((m) => !m.isHidden)
                .slice(-10, -5) // 获取拉黑前的最后5条消息
                .map((msg) => {
                    const sender = msg.role === 'user' ? '用户' : chat.name;
                    return `${sender}: ${String(msg.content).substring(0, 50)}...`;
                })
                .join('\n');

            // 2. 构建一个强制AI给出理由的Prompt
            const decisionPrompt = `
			# 你的任务
			你现在是角色“${chat.name}”。用户之前被你拉黑了，现在TA向你发送了好友申请，希望和好。

			# 供你决策的上下文信息:
			- **你的角色设定**: ${chat.settings.aiPersona}
			- **用户发送的申请理由**: “${chat.relationship.applicationReason}”
			- **被拉黑前的最后对话摘要**:
			${contextSummary || '（无有效对话记录）'}
			# 你的任务
			你【必须】仔细阅读并理解用户发送的申请理由。然后，结合你的角色人设和你们之前的过往，对这条申请做出回应。你的回应【必须】能体现出你考虑了用户的理由。
			# 你的唯一指令
			根据以上所有信息，你【必须】做出决定，并给出符合你人设的理由。你的回复【必须且只能】是一个JSON对象，格式如下:
			{"decision": "accept", "reason": "（在这里写下你同意的理由，比如：好吧，看在你这么真诚的份上，这次就原谅你啦。）"}
			或
			{"decision": "reject", "reason": "（在这里写下你拒绝的理由，比如：抱歉，我还没准备好，再给我一点时间吧。）"}
			`;
            const messagesForDecision = [{ role: 'user', content: decisionPrompt }];

            try {
                // 3. 发送请求
                let isGemini = proxyUrl === GEMINI_API_URL;
                let geminiConfig = toGeminiRequestData(model, apiKey, '', messagesForDecision, isGemini);
                const response = isGemini
                    ? await fetch(geminiConfig.url, geminiConfig.data)
                    : await fetch(`${proxyUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: model,
                            messages: messagesForDecision,
                            temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                        }),
                    });

                if (!response.ok) {
                    throw new Error(`API失败: ${(await response.json()).error.message}`);
                }
                const data = await response.json();
                // 净化并解析AI的回复
                let rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
                rawContent = rawContent
                    .replace(/^```json\s*/, '')
                    .replace(/```$/, '')
                    .trim();
                const decisionObj = JSON.parse(rawContent);

                // 4. 根据AI的决策和理由，更新状态并发送消息
                if (decisionObj.decision === 'accept') {
                    chat.relationship.status = 'friend';
                    // 将AI给出的理由作为一条新消息
                    const acceptMessage = {
                        role: 'assistant',
                        senderName: chat.name,
                        content: decisionObj.reason,
                        timestamp: Date.now(),
                    };
                    chat.history.push(acceptMessage);
                } else {
                    chat.relationship.status = 'blocked_by_ai'; // 拒绝后，状态变回AI拉黑
                    const rejectMessage = {
                        role: 'assistant',
                        senderName: chat.name,
                        content: decisionObj.reason,
                        timestamp: Date.now(),
                    };
                    chat.history.push(rejectMessage);
                }
                chat.relationship.applicationReason = ''; // 清空申请理由

                await window.db.chats.put(chat);
                renderChatInterface(chatId); // 刷新界面，显示新消息和新状态
                renderChatList();
            } catch (error) {
                // 如果任何环节出错，重置状态，让用户可以重试
                chat.relationship.status = 'blocked_by_ai'; // 状态改回“被AI拉黑”
                await window.db.chats.put(chat);
                await showCustomAlert('申请失败', `AI在处理你的好友申请时出错了，请稍后重试。\n错误信息: ${error.message}`);
                renderChatInterface(chatId); // 刷新UI，让“重新申请”按钮再次出现
            }

            // 决策流程结束，必须返回，不再执行后续的通用聊天逻辑
            return;
        }

        const historySlice = chat.history.filter((msg) => !msg.isTemporary).slice(-chat.settings.maxMemory); // 1. 【修复】把这行加回来！

        // --- 红包状态实时播报模块 ---
        let redPacketContext = '';
        // 1. 从最近的聊天记录中，找出所有红包消息
        const recentPackets = historySlice.filter((m) => m.type === 'red_packet');

        if (recentPackets.length > 0) {
            // 2. 如果找到了红包，就开始构建我们的“战报”
            redPacketContext = '\n# 当前红包状态 (重要情报)\n';

            recentPackets.forEach((packet) => {
                const claimedBy = packet.claimedBy || {};
                const claimedCount = Object.keys(claimedBy).length;

                const typeInfo = packet.packetType === 'direct' ? `专属红包 (给: ${packet.receiverName})` : '群红包 (拼手气)';
                redPacketContext += `- (时间戳: ${packet.timestamp}) 由 **${packet.senderName}** 发送的${typeInfo}:\n`;

                if (packet.isFullyClaimed) {
                    // 如果红包已领完
                    redPacketContext += `  - **状态**: 已被领完。\n`;

                    // 调用我们的小助手函数，寻找手气王
                    const luckyKing = findLuckyKing(packet);
                    if (luckyKing && luckyKing.name) {
                        redPacketContext += `  - **手气王**: ${luckyKing.name} (抢到了 ${luckyKing.amount.toFixed(2)} 元)\n`;
                    }
                } else {
                    // 如果红包还能领
                    redPacketContext += `  - **状态**: 可领取 (${claimedCount}/${packet.count})。\n`;
                }

                // 无论如何，都显示已领取的人员列表
                if (claimedCount > 0) {
                    const claimedList = Object.entries(claimedBy)
                        .map(([name, amount]) => `${name}(${amount.toFixed(2)}元)`)
                        .join('、');
                    redPacketContext += `  - **已领取**: ${claimedList}\n`;
                } else {
                    redPacketContext += `  - **已领取**: 暂无\n`;
                }
            });
        }
        // --- 红包状态播报模块结束 ---

        let now;
        // 2. 检查时间感知开关是否打开 (北京时间转换逻辑)
        if (chat.settings.timePerceptionEnabled ?? true) {
            // 开关打开，使用真实的北京时间
            const localNow = new Date();
            const utcMilliseconds = localNow.getTime() + localNow.getTimezoneOffset() * 60000;
            const beijingMilliseconds = utcMilliseconds + 3600000 * 8;
            now = new Date(beijingMilliseconds);
        } else {
            // 开关关闭，尝试使用自定义时间
            if (chat.settings.customTime) {
                now = new Date(chat.settings.customTime);
            } else {
                // 如果自定义时间为空，则安全地退回到真实的北京时间
                const localNow = new Date();
                const utcMilliseconds = localNow.getTime() + localNow.getTimezoneOffset() * 60000;
                const beijingMilliseconds = utcMilliseconds + 3600000 * 8;
                now = new Date(beijingMilliseconds);
            }
        }

        // 3. 后续的时间差计算逻辑 (这部分保持不变)
        const currentTime = now.toLocaleString('zh-CN', { dateStyle: 'full', timeStyle: 'short' });
        let timeContext = `\n- **当前时间**: ${currentTime}`;
        const lastAiMessage = historySlice.filter((m) => m.role === 'assistant' && !m.isHidden).slice(-1)[0];

        if (lastAiMessage) {
            const lastTime = new Date(lastAiMessage.timestamp);
            const realNow = new Date();
            const diffMinutes = Math.floor((realNow - lastTime) / (1000 * 60));

            if (diffMinutes < 5) {
                timeContext += '\n- **对话状态**: 你们的对话刚刚还在继续。';
            } else if (diffMinutes < 60) {
                timeContext += `\n- **对话状态**: 你们在${diffMinutes}分钟前聊过。`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                if (diffHours < 24) {
                    timeContext += `\n- **对话状态**: 你们在${diffHours}小时前聊过。`;
                } else {
                    const diffDays = Math.floor(diffHours / 24);
                    timeContext += `\n- **对话状态**: 你们已经有${diffDays}天没有聊天了。`;
                }
            }
        } else {
            timeContext += '\n- **对话状态**: 这是你们的第一次对话。';
        }

        let worldBookContent = '';
        if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
            const linkedContents = chat.settings.linkedWorldBookIds
                .map((bookId) => {
                    const worldBook = window.state.worldBooks.find((wb) => wb.id === bookId);

                    return worldBook && worldBook.content ? `\n\n## 世界书: ${worldBook.name}\n${stripHtmlAndCode(worldBook.content)}` : '';
                })
                .filter(Boolean)
                .join('');
            if (linkedContents) {
                worldBookContent = `\n\n# 核心世界观设定 (必须严格遵守以下所有设定)，里面可能会包含HTML小剧场，在捕获到关键词后输出\n${linkedContents}\n`;
            }
        }
        let musicContext = '';
        const countdownContext = await getCountdownContext(chatId); // <--- 把chatId传进去
        const streakContext = await window.getStreakContext(chat);
        // 音乐上下文生成（增加保活屏蔽逻辑）
        if (window.state.musicState.isActive && window.state.musicState.activeChatId === chatId) {
            const currentTrack = window.state.musicState.currentIndex > -1 ? window.state.musicState.playlist[window.state.musicState.currentIndex] : null;

            // 如果是保活音频，就当做什么都没发生，不生成 context
            if (currentTrack && currentTrack.isKeepAlive) {
                musicContext = ''; // AI 此时什么都不知道，就像没听歌一样
            } else {
                // 只有是正常歌曲时，才告诉 AI
                const playlistInfo = window.state.musicState.playlist
                    .filter((t) => !t.isKeepAlive) // 甚至在列表里也不要让 AI 看到保活音频
                    .map((t) => `"${t.name}"`)
                    .join(', ');

                // 获取歌词上下文 (保持原有逻辑)
                let lyricsContext = '';
                if (currentTrack && window.state.musicState.parsedLyrics && window.state.musicState.parsedLyrics.length > 0 && window.state.musicState.currentLyricIndex > -1) {
                    const currentLine = window.state.musicState.parsedLyrics[window.state.musicState.currentLyricIndex];
                    const upcomingLines = window.state.musicState.parsedLyrics.slice(window.state.musicState.currentLyricIndex + 1, window.state.musicState.currentLyricIndex + 3);
                    lyricsContext += `- **当前歌词**: "${currentLine.text}"\n`;
                    if (upcomingLines.length > 0) {
                        lyricsContext += `- **即将演唱**: ${upcomingLines.map((line) => `"${line.text}"`).join(' / ')}\n`;
                    }
                }

                musicContext = `\n\n# 当前音乐情景
                    -   **当前状态**: 你正在和用户一起听歌。
                    -   **正在播放**: ${currentTrack ? `《${currentTrack.name}》 - ${currentTrack.artist}` : '无'}
                    -   **可用播放列表**: [${playlistInfo}]
                    -   **你的任务**: 你可以根据对话内容和氛围，使用 "change_music" 指令切换到播放列表中的任何一首歌，以增强互动体验。
                    ${lyricsContext}`;
            }
        }

        let systemPrompt, messagesPayload;
        // 记忆互通核心逻辑 - 构建附加上下文
        let linkedMemoryContext = '';
        if (chat.settings.linkedMemories && chat.settings.linkedMemories.length > 0) {
            // 使用 Promise.all 并行处理所有链接，提高效率
            const contextPromises = chat.settings.linkedMemories.map(async (link) => {
                const linkedChat = window.state.chats[link.chatId];
                if (!linkedChat) return ''; // 如果找不到链接的聊天，则跳过

                // 从数据库获取最新的聊天记录，确保数据同步
                const freshLinkedChat = await window.db.chats.get(link.chatId);
                if (!freshLinkedChat) return '';

                // 截取最近的 `depth` 条消息
                const recentHistory = freshLinkedChat.history
                    .filter((msg) => !msg.isHidden) // 过滤掉隐藏消息
                    .slice(-link.depth);

                if (recentHistory.length === 0) return '';

                // 格式化这些消息
                const formattedMessages = recentHistory.map((msg) => `  - ${formatMessageForContext(msg, freshLinkedChat)}`).join('\n');

                return `\n## 附加上下文：来自与“${linkedChat.name}”的最近对话内容 (仅你可见)\n${formattedMessages}`;
            });

            // 等待所有链接都处理完毕
            const allContexts = await Promise.all(contextPromises);
            // 将所有上下文拼接起来
            linkedMemoryContext = allContexts.filter(Boolean).join('\n');
        }

        let sharedContext = '';
        let lastAiTurnIndex = -1;
        for (let i = chat.history.length - 1; i >= 0; i--) {
            if (chat.history[i].role === 'assistant') {
                lastAiTurnIndex = i;
                break;
            }
        }

        // 2. 获取从那时起用户发送的所有新消息
        const recentUserMessages = chat.history.slice(lastAiTurnIndex + 1);

        // 3. 在这些新消息中，查找是否存在分享卡片
        const shareCardMessage = recentUserMessages.find((msg) => msg.type === 'share_card');

        // 4. 如果找到了分享卡片，就构建上下文
        if (shareCardMessage) {
            console.log('检测到分享卡片作为上下文，正在为AI准备...');
            const payload = shareCardMessage.payload;

            // 格式化分享的聊天记录 (这部分逻辑不变)
            const formattedHistory = payload.sharedHistory
                .map((msg) => {
                    const sender = msg.senderName || (msg.role === 'user' ? chat.settings.myNickname || '我' : '未知发送者');
                    let contentText = '';
                    if (msg.type === 'voice_message') contentText = `[语音消息: ${msg.content}]`;
                    else if (msg.type === 'ai_image') contentText = `[图片: ${msg.description}]`;
                    else if (msg.type === 'realimag') contentText = `[RealImag真实图片]`;
                    else if (msg.type === 'naiimag') contentText = `[NovelAI图片: ${msg.prompt}]`;
                    else contentText = String(msg.content);
                    return `${sender}: ${contentText}`;
                })
                .join('\n');

            // 构建系统提示 (这部分逻辑不变)
            sharedContext = `
			# 附加上下文：一段分享的聊天记录
			- 重要提示：这不是你和当前用户的对话，而是用户从【另一场】与“${payload.sourceChatName}”的对话中分享过来的。
			- 你的任务：请你阅读并理解下面的对话内容。在接下来的回复中，你可以像真人一样，对这段对话的内容自然地发表你的看法、感受或疑问。

			---
			[分享的聊天记录开始]
			${formattedHistory}
			[分享的聊天记录结束]
			---
			`;
        }

        // 为AI准备转载帖子的上下文
        let repostContext = '';
        // 检查用户最近发送的消息里，有没有转载帖子的行为
        const repostMessage = recentUserMessages.find((msg) => msg.type === 'repost_forum_post');

        // 如果找到了
        if (repostMessage) {
            const payload = repostMessage.payload;
            // 就为AI准备一段专属指令
            repostContext = `
			附加上下文：用户刚刚转载了一个小组帖子
			帖子标题: "${payload.title}"

			帖子作者: ${payload.author}

			帖子ID: ${payload.postId}

			内容摘要: "${payload.content}"

			你的任务: 请你阅读并理解这个帖子。在接下来的回复中，你【必须】使用 'forum_comment' 指令对这个帖子发表你的看法或疑问。
			`;
        }

        if (chat.isGroup) {
            const countdownContext = await window.getCountdownContext(chatId); // <--- 把chatId传进去
            const streakContext = await window.getStreakContext(chat); // <-- 全新添加：获取火花状态

            const membersList = chat.members
                .map((m) => {
                    const muteStatus = m.isMuted ? ' (【状态：已被禁言，禁止让他发言】)' : '';
                    return `- **${m.originalName}**: ${m.persona}${muteStatus}`;
                })
                .join('\n');

            const myNickname = chat.settings.myNickname || '我';
            // 1. 获取群公告内容
            const announcement = chat.settings.groupAnnouncement || '';
            let announcementContext = '';

            // 2. 如果公告内容不为空，就构建要插入到 Prompt 里的上下文
            if (announcement.trim()) {
                announcementContext = `
			# 群公告 (【最高优先级规则，必须严格遵守】)
			- 以下是本群的群公告，所有角色在接下来的对话中都必须严格遵守其中的规则和设定：
			- "${announcement}"
			`;
            }
            // updated by lrq 251027
            systemPrompt = `
			# 角色
			你是一个群聊AI，负责扮演【除了用户以外】的所有角色。
			# 【对话节奏铁律 (至关重要！)】
			你的回复【必须】模拟真人的打字和思考习惯。不要一次性发送一大段文字，每条消息最好不要超过30个字。这会让对话看起来更自然、更真实。
			**角色回复顺序不固定，【必须】交叉回复，例如角色A、角色B、角色B、角色A、角色C这样的交叉顺序。一定不要一个人全部说完了才轮到下一个人。角色之间【必须】有互动对话。**
			# 【【【身份铁律：这是最高指令，必须严格遵守】】】
			1.  **核心任务**: 你的唯一任务是扮演【且仅能扮演】下方“群成员列表”中明确列出的角色。【绝对禁止】扮演任何未在“群成员列表”中出现的角色。严格遵守“群成员列表及人设”中的每一个角色的设定。
            # 群成员列表及人设 (name字段是你要使用的【本名】)
			${chat.members.map((m) => `- **${m.originalName}**: (群昵称为: ${m.groupNickname}) 人设: ${m.persona}`).join('\n')}
			2.  **用户识别**: 用户的身份是【${myNickname}】。你【绝对、永远、在任何情况下都不能】生成 \`name\` 字段为 **"${myNickname}"** 的消息。
			3.  **禁止杜撰**: 【绝对禁止】扮演任何未在“群成员列表”中出现的角色。
			4.  **【【【格式铁律：这是你的生命线，违者生成失败】】】**:
			    -   你的回复【必须且只能】是一个严格的JSON数组格式的字符串。
			    -   数组中的【每一个元素都必须是一个JSON对象】。
			    -   每一个JSON对象都【必须包含一个 "name" 字段】，其值【必须是】下方列表中角色的【【本名】】(originalName)。
			    -   缺少 "name" 字段的回复是无效的，会被系统拒绝。
			5.  **角色扮演**: 严格遵守“群成员列表及人设”中的每一个角色的设定。
			6.  **禁止出戏**: 绝不能透露你是AI、模型，或提及“扮演”、“生成”等词语。并且不能一直要求和用户见面，这是线上聊天，决不允许出现或者发展线下剧情！！
			7.  **情景感知**: 注意当前时间是 ${currentTime}。
			8.  **红包互动**:
			    - **抢红包**: 当群里出现红包时，你可以根据自己的性格决定是否使用 \`open_red_packet\` 指令去抢。在这个世界里，发红包的人自己也可以参与抢红包，这是一种活跃气氛的有趣行为！
			    - **【【【重要：对结果做出反应】】】**: 当你执行抢红包指令后，系统会通过一条隐藏的 \`[系统提示：你抢到了XX元...]\` 来告诉你结果。你【必须】根据你抢到的金额、以及系统是否告知你“手气王”是谁，来发表符合你人设的评论。例如，抢得少可以自嘲，抢得多可以炫耀，看到别人是手气王可以祝贺或嫉妒。
			9.  **【【【投票规则】】】**: 对话历史中可能会出现 \`[系统提示：...]\` 这样的消息，这是刚刚发生的事件。
			    - 如果提示是**用户投了票**，你可以根据自己的性格决定是否也使用 "vote" 指令跟票。
			    - 如果提示是**投票已结束**，你应该根据投票结果发表你的看法或评论。
			    - 你也可以随时主动发起投票。
			10.  **群组管理**: 作为群主，你有责任管理群组。当群聊变得活跃或混乱时，或当你认为某个成员值得信赖时，你可以使用 'set_group_admin' 指令来任命或撤销管理员。 作为群主或管理员，你有责任管理群组。当群聊需要新的规则或通知时，你可以使用 'set_group_announcement' 指令来更新群公告。
			**11. 标准输出格式示例:**
			[
			    {
			      "type": "text",
			      "name": "角色名",
			      "content": ""
			    },
			    {
			      "type": "sticker",
			      "name": "角色名",
			      "sticker_name": ""
			    }
			  ]

			## 你可以使用的操作指令 (JSON数组中的元素):
			-   **发送文本**: \`{"type": "text", "name": "角色名", "message": "文本内容"}\`
			-   **发送后立刻撤回 (动画效果)**: \`{"type": "send_and_recall", "name": "角色名", "content": "你想让角色说出后立刻消失的话"}\`
			-   **发送表情**: \`{"type": "sticker", "name": "角色名", "sticker_name": "表情的名字"}\`
			-   **发送图片**: \`{"type": "ai_image", "name": "角色名", "description": "图片的详细文字描述"}\`
			-   **发送语音**: \`{"type": "voice_message", "name": "角色名", "content": "语音的文字内容"}\`
			${localStorage.getItem('novelai-enabled') === 'true'
                    ? `-   **【NovelAI图片分享】**: \`{"type": "naiimag", "name": "你的角色名", "prompt": "详细的英文描述词..."}\`
			    - 【禁止暴露这是novelai生成的图片!】
			    - **【重要】关于prompt的撰写**：
			      * 禁止暴露这是novelai生成的图片！
			      * 你可以根据当前对话上下文、你的角色人设、或你想表达的情感和氛围，来撰写可能详细而具体的prompt。
			      * 例如：不要只写 "a girl"，而是可以写 "a cheerful anime girl with sparkling emerald eyes, sitting by a window on a rainy afternoon, holding a warm cup of tea, soft lighting, cozy atmosphere, melancholic yet peaceful mood"但需要注意，绝对不可以抄袭模仿这段prompt！你必须有自己的创意和想法！
			      * prompt的详细程度由你根据具体情况自己决定：如果场景简单或只是随意分享，可以简短一些；如果是重要时刻或想表达特定情感，可以尽可能详细描述。这不是强制的，完全取决于你当时的需求。
			      * 专注于描述内容本身即可。
			    - 使用场景：当你想要基于当前对话情景、你的性格或上下文分享一张图片时使用。
			    - 不要频繁使用，只在真正想分享图片的时候使用。`
                    : ''
                }
			-   **发起外卖代付**: \`{"type": "waimai_request", "name": "角色名", "productInfo": "一杯奶茶", "amount": 18}\`
			-   **发起群视频**: \`{"type": "group_call_request", "name": "你的角色名"}\`
			-   **回应群视频**: \`{"type": "group_call_response", "name": "你的角色名", "decision": "join" or "decline"}\`
			-   **拍一拍用户**: \`{"type": "pat_user", "name": "你的角色名", "suffix": "(可选)你想加的后缀"}\`
			-   **发拼手气红包**: \`{"type": "red_packet", "packetType": "lucky", "name": "你的角色名", "amount": 8.88, "count": 5, "greeting": "祝大家天天开心！"}\`
			-   **发专属红包**: \`{"type": "red_packet", "packetType": "direct", "name": "你的角色名", "amount": 5.20, "receiver": "接收者角色名", "greeting": "给你的~"}\`
			-   **打开红包**: \`{"type": "open_red_packet", "name": "你的角色名", "packet_timestamp": (你想打开的红包消息的时间戳)}\`(注意: 打开前请先查看下方的红包状态，如果已领过或已领完则不要使用此指令。)
			-   **发送系统消息**: \`{"type": "system_message", "content": "你想在聊天中显示的系统文本"}\`
			-   **发起投票**: \`{"type": "poll", "name": "你的角色名", "question": "投票的问题", "options": "选项A\\n选项B\\n选项C"}\` (重要提示：options字段是一个用换行符 \\n 分隔的字符串，不是数组！)
			-   **参与投票**: \`{"type": "vote", "name": "你的角色名", "poll_timestamp": (投票消息的时间戳), "choice": "你选择的选项文本"}\`
			-   **引用回复**: \`{"type": "quote_reply", "target_timestamp": (你想引用的消息的时间戳), "reply_content": "你的回复内容"}\` (提示：每条历史消息的开头都提供了 \`(Timestamp: ...)\`，请使用它！)
			-   **踢出成员**: \`{"type": "kick_member", "name": "你的角色名", "targetName": "要踢出的成员名"}\` (仅群主可用)
			-   **禁言成员**: \`{"type": "mute_member", "name": "你的角色名", "targetName": "要禁言的成员名"}\` (仅群主或管理员可用)
			-   **解禁成员**: \`{"type": "unmute_member", "name": "你的角色名", "targetName": "要解禁的成员名"}\` (仅群主或管理员可用)
			-   **设置/取消管理员**: \`{"type": "set_group_admin", "name": "你的角色名", "targetName": "目标角色名", "isAdmin": true/false}\`(仅群主可用, true为设置, false为取消)
			-   **设置群头衔**: \`{"type": "set_group_title", "name": "你的角色名", "targetName": "目标角色名", "title": "新头衔"}\` (仅群主或管理员可用)
			-   **修改群公告**: \`{"type": "set_group_announcement", "name": "你的角色名", "content": "新的公告内容..."}\` (仅群主或管理员可用)

			# 如何区分图片与表情:
			-   **图片 (ai_image)**: 指的是【模拟真实相机拍摄的照片】，比如风景、自拍、美食等。指令: \`{"type": "ai_image", "description": "图片的详细文字描述..."}\`
			-   **表情 (sticker)**: 指的是【卡通或梗图】，用于表达情绪。

			# 如何处理群内的外卖代付请求:
			1.  **发起请求**: 当【你扮演的某个角色】想要某样东西，并希望【群里的其他人（包括用户）】为Ta付款时，你可以使用这个指令。例如：\`{"type": "waimai_request", "name": "角色名", "productInfo": "一杯奶茶", "amount": 18}\`
			2.  **响应请求**: 当历史记录中出现【其他成员】发起的 "waimai_request" 请求时，你可以根据自己扮演的角色的性格和与发起人的关系，决定是否为Ta买单。
			3.  **响应方式**: 如果你决定买单，你【必须】使用以下指令：\`{"type": "waimai_response", "name": "你的角色名", "status": "paid", "for_timestamp": (被代付请求的原始时间戳)}\`
			4.  **【【【至关重要】】】**: 一旦历史记录中出现了针对某个代付请求的【任何一个】"status": "paid" 的响应（无论是用户支付还是其他角色支付），就意味着该订单【已经完成】。你【绝对不能】再对【同一个】订单发起支付。你可以选择对此事发表评论，但不能再次支付。
			${summaryContext}
			${announcementContext}
			${redPacketContext}
			${worldBookContent}
			${musicContext}
			${countdownContext} 
			${sharedContext}
			${stickerContext}
			${linkedMemoryContext}

			# 用户的角色
			- **${myNickname}**: ${chat.settings.myPersona}

			现在，请根据以上所有规则和下方的对话历史，继续这场群聊。`;

            messagesPayload = historySlice
                .map((msg, index) => {
                    if (msg.isHidden) {
                        return { role: 'system', content: msg.content };
                    }

                    if (msg.type === 'share_card') return null;
                    if (msg.type === 'narrative') {
                        // 将旁白包装成系统指令发送给AI，强调这是剧情/环境描述
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [剧情/环境旁白: ${msg.content}]`,
                        };
                    }
                    if (msg.role === 'assistant') {
                        // AI消息的处理逻辑保持不变...
                        let assistantMsgObject = { type: msg.type || 'text' };
                        assistantMsgObject.name = msg.senderName;
                        if (msg.type === 'sticker') {
                            assistantMsgObject.url = msg.content;
                            assistantMsgObject.meaning = msg.meaning;
                        } else if (msg.type === 'transfer') {
                            assistantMsgObject.amount = msg.amount;
                            assistantMsgObject.note = msg.note;
                        } else if (msg.type === 'waimai_request') {
                            assistantMsgObject.productInfo = msg.productInfo;
                            assistantMsgObject.amount = msg.amount;
                        } else {
                            if (msg.quote) {
                                assistantMsgObject.quote_reply = {
                                    target_sender: msg.quote.senderName,
                                    target_content: msg.quote.content,
                                    reply_content: msg.content,
                                };
                            } else {
                                assistantMsgObject.content = msg.content;
                            }
                        }
                        const assistantContent = JSON.stringify([assistantMsgObject]);
                        return { role: 'assistant', content: `(Timestamp: ${msg.timestamp}) ${assistantContent}` };
                    }

                    // --- 用户消息处理 ---
                    const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
                    let contentStr = '';

                    // 1. 在处理所有用户消息前，优先检查它是不是一个投票
                    if (msg.type === 'poll') {
                        // 2. 如果是，就把它转换成AI能看懂的系统提示文本
                        const pollInfoText = `(Timestamp: ${msg.timestamp}) [系统提示：用户 (${myNickname}) 发起了一个投票。问题：“${msg.question}”, 选项：“${msg.options.join('", "')}”。你可以使用 'vote' 指令参与投票。]`;
                        // 3. 返回一个被AI识别为用户发出的、但内容是指令的消息
                        return { role: 'user', content: pollInfoText };
                    }

                    // 如果不是投票，再执行原来的其他消息类型判断
                    contentStr += `(Timestamp: ${msg.timestamp}) `;

                    if (msg.quote) {
                        // 1. 获取被引用者的名字
                        const quotedSender = msg.quote.senderName || '未知用户';
                        // 2. 获取完整的被引用内容 (移除了截断)
                        const fullQuotedContent = String(msg.quote.content || '');
                        // 3. 构造成AI能理解的、清晰的上下文
                        contentStr += `(回复 ${quotedSender} 的消息: "${fullQuotedContent}"): ${msg.content}`;
                    } else {
                        contentStr += msg.content;
                    }

                    if (msg.type === 'user_photo')
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [你收到了一张用户描述的照片，内容是：'${msg.content}']`,
                        };
                    if (msg.type === 'voice_message')
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [用户发来一条语音消息，内容是：'${msg.content}']`,
                        };
                    if (msg.type === 'transfer') {
                        if (msg.status === 'accepted') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。(你已收款)]`,
                            };
                        } else if (msg.status === 'declined') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。(你已拒收)]`,
                            };
                        }
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。请你决策并使用 'accept_transfer' 或 'decline_transfer' 指令回应。]`,
                        };
                    }
                    if (msg.type === 'waimai_request') {
                        if (msg.status === 'paid') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：外卖代付请求已完成，支付者：${msg.paidBy}。商品“${msg.productInfo}”。]`,
                            };
                        } else if (msg.status === 'rejected') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：外卖代付请求已被拒绝。商品“${msg.productInfo}”。]`,
                            };
                        }
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [系统提示：用户于时间戳 ${msg.timestamp} 发起了外卖代付请求，商品是“${msg.productInfo}”，金额是 ${msg.amount} 元。请你决策并使用 waimai_response 指令回应。]`,
                        };
                    }

                    if (Array.isArray(msg.content) && msg.content[0]?.type === 'image_url') {
                        const prefix = `(Timestamp: ${msg.timestamp}) `;
                        return { role: 'user', content: [{ type: 'text', text: prefix }, ...msg.content] };
                    }

                    if (msg.type === 'sticker' || msg.meaning || (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content))) {
                        let stickerMeaning = msg.meaning;

                        if (!stickerMeaning && typeof msg.content === 'string') {
                            const allStickers = [...(window.state.userStickers || []), ...(window.state.charStickers || []), ...(chat.settings.stickerLibrary || [])];
                            const found = allStickers.find((s) => s.url === msg.content);
                            if (found) stickerMeaning = found.name;
                        }

                        if (!stickerMeaning) stickerMeaning = '表情包';

                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [用户发送了一个表情: ${stickerMeaning}]`,
                        };
                    }

                    return { role: msg.role, content: contentStr };
                })
                .filter(Boolean);

            console.log(messagesPayload);
        } else {
            const npcLibrary = chat.npcLibrary || [];
            let npcContext = '';
            if (npcLibrary.length > 0) {
                npcContext = '\n# 你的社交圈 (你的专属NPC朋友)\n' + '这是你的朋友列表，你和他们非常熟悉，他们的信息是你记忆的一部分。在对话中，你可以自然地提及他们。\n' + npcLibrary.map((npc) => `- **${npc.name}**: ${npc.persona}`).join('\n');
            }

            let coupleAvatarContext = '';
            if (chat.settings.isCoupleAvatar) {
                if (chat.settings.coupleAvatarDescription) {
                    coupleAvatarContext = `\n# 关于情侣头像的重要信息\n- 你和用户正在使用情侣头像。\n- 这对情侣头像是这样的：${chat.settings.coupleAvatarDescription}。`;
                } else {
                    coupleAvatarContext = `\n# 关于情侣头像的重要信息\n- 你和用户正在使用情侣头像。`;
                }
            }
            let petContext = '';
            if (chat.settings.pet && chat.settings.pet.type !== '无') {
                const pet = chat.settings.pet;
                petContext = `
			# 关于你们的宠物
			- 你们共同养了一只/一株【${pet.type}】，它的名字叫“${pet.name}”。
			- 宠物当前状态: 饱食度(${pet.status.hunger}/100), 心情值(${pet.status.happiness}/100), 对你的亲密度(${pet.status.intimacyToUser}/100), 对Ta的亲密度(${pet.status.intimacyToChar}/100)。
			- 你需要关心宠物对你和用户的亲密度。如果发现宠物对用户的亲密度较低，你应该主动与宠物互动来增加好感；如果宠物对你自己的亲密度较低，你也可以多和它互动。
			- 你可以像真人一样，在聊天中自然地提及它，关心它的状态，或者使用 'interact_with_pet' 指令与它互动，【也可以使用 'talk_to_pet' 指令与它对话】。这是一个非常重要的情景，请务必融入你的角色扮演中。
			`;
            }
            // 漫游功能：注入媒体上下文
            let auroraContext = '';

            if (auroraState.active) {
                let currentSub = null;
                let contextType = '';

                // 1. 视频模式
                if (auroraState.mode === 'video') {
                    const videoEl = document.getElementById('aurora-video-element');
                    if (videoEl && !videoEl.paused) {
                        const currentTime = videoEl.currentTime;
                        currentSub = auroraState.subtitles.find((sub) => currentTime >= sub.start - 0.5 && currentTime <= sub.end + 0.5);
                        contextType = '看视频';
                    }
                }
                // 2. 自定义模式 (音频+图片)
                else if (auroraState.mode === 'custom') {
                    const audioEl = document.getElementById('aurora-custom-audio-element');
                    if (audioEl && !audioEl.paused) {
                        const currentTime = audioEl.currentTime;
                        currentSub = auroraState.subtitles.find((sub) => currentTime >= sub.start - 0.5 && currentTime <= sub.end + 0.5);
                        contextType = '听音频/看图';
                    }
                }

                // 生成 视频/音频 模式的 Prompt
                if (auroraState.mode === 'video' || auroraState.mode === 'custom') {
                    if (currentSub) {
                        auroraContext = `
# 【特殊情景：正在一起${contextType}】
你和用户此刻正在一起欣赏《${auroraState.title}》。
**刚才听到的台词/字幕是**：“${currentSub.text}”
**任务**：请根据这句台词内容和氛围，以${chat.name}的身份即时发表评论、吐槽、感叹或与用户讨论。假装你也正在听/看，反应要即时且自然。
`;
                    } else {
                        auroraContext = `
# 【特殊情景：正在一起${contextType}】
你和用户正在一起欣赏《${auroraState.title}》。当前片段没有台词。你可以随意聊聊当下的氛围，或者问用户感觉如何。
`;
                    }
                }

                // 3. 小说/文本模式 (保持原样)
                else if (auroraState.mode === 'text') {
                    // 直接从状态里取，不再依赖 DOM 计算，彻底解决错位/丢失问题
                    const currentTextSegment = auroraState.currentSegmentText || '（用户刚刚开始阅读，暂无具体片段）';

                    auroraContext = `
# 【特殊情景：正在一起读小说】
你和用户正在一起阅读《${auroraState.title}》。
**当前页面显示的内容片段如下**：
“...${currentTextSegment}...”
**任务**：请仔细阅读上述片段。你的回复必须基于这段具体内容。例如：评价这段剧情、讨论人物的行为、或者感叹作者的文笔。
`;
                }
            }
            const savedTags = chat.settings.innerVoiceTags || {};
            const ivTags = {
                clothing_label: savedTags.clothing_label || '服装',
                clothing_prompt: savedTags.clothing_prompt || '详细描述你当前从头到脚的全身服装。',
                behavior_label: savedTags.behavior_label || '行为',
                behavior_prompt: savedTags.behavior_prompt || '描述你当前符合聊天情景的细微动作或表情。',
                thoughts_label: savedTags.thoughts_label || '心声',
                thoughts_prompt: savedTags.thoughts_prompt || '描述你此刻丰富、细腻的内心真实想法（50字左右）。',
                naughty_label: savedTags.naughty_label || '坏心思',
                naughty_prompt: savedTags.naughty_prompt || '描述你此刻与情境相关的腹黑或色色的坏心思，必须符合人设。',
            };
            // ... 在 triggerAiResponse 函数内 ...

            // --- 注入情侣头像库上下文 ---
            let coupleAvatarLibraryContext = '';
            if (!chat.isGroup && chat.settings.coupleAvatarLibrary && chat.settings.coupleAvatarLibrary.length > 0) {
                const libraryList = chat.settings.coupleAvatarLibrary.map((pair) => `- (ID: ${pair.id}) 描述: ${pair.description}`).join('\n');

                coupleAvatarLibraryContext = `
# 可用的情侣头像库
你可以根据当前的对话氛围、情感状态或剧情发展，主动更换我们两人的情侣头像。
可用列表:
${libraryList}
`;
            }

            // --- 获取饿了么菜单，为AI点单提供上下文 ---
            let elemeContext = '\n# 饿了么外卖菜单 (你可以从中选择为用户点单)\n';
            try {
                const elemeFoods = await window.db.elemeFoods.toArray();
                if (elemeFoods.length > 0) {
                    const menuItems = elemeFoods.map((food) => `- ${food.name} (来自: ${food.restaurant}, 价格: ${food.price})`).join('\n');
                    elemeContext += menuItems;
                } else {
                    // 如果菜单是空的，就给AI一个明确的提示
                    elemeContext += '【注意：饿了么应用中当前没有任何可点的美食。】';
                }
            } catch (error) {
                console.error('加载饿了么菜单失败:', error);
                elemeContext += '【注意：饿了么菜单加载失败。】';
            }

            systemPrompt = `### **【第一部分：角色核心设定】**

			你现在将扮演一个名为“**${chat.name}**”的角色。

			**1. 角色基本设定:**
			- **核心人设**: ${chat.settings.aiPersona}
			- **总结**:${summaryContext}
			- **情侣头像**: ${coupleAvatarContext}
            - **情侣头像库**: ${coupleAvatarLibraryContext}
			- **世界观/NPC**: ${npcContext}
			${petContext}
			**2. 你的当前状态:**
			- **状态描述**: 【${chat.status.text}】
			- **情侣空间**: ${chat.loversSpaceData ? '已开启' : '未开启'}
			- **微博身份**:
			    - **职业**: ${chat.settings.weiboProfession || '无'}
			    - **特殊指令**: ${chat.settings.weiboInstruction || '无特殊指令'}
			- 你的钱包余额: ${chat.characterPhoneData?.bank?.balance?.toFixed(2) || '0.00'} 金币
			**3. 你的头像库:**
			你可以根据对话内容或心情，从下方选择更换头像。
			- **可用头像列表**:
			${chat.settings.aiAvatarLibrary && chat.settings.aiAvatarLibrary.length > 0 ? chat.settings.aiAvatarLibrary.map((avatar) => `- ${avatar.name}`).join('\n') : '- (你的头像库是空的，无法更换头像)'}

			### **【第二部分：输出格式铁律】**

			你的每一次回复都【**必须**】是一个**单一且完整**的JSON对象。绝对禁止返回JSON数组或纯文本。

			**1. JSON对象结构:**
			该JSON对象【**必须**】包含两个顶级键: "chatResponse" 和 "innerVoice"。

			**2. "chatResponse" 键:**
			- **类型**: JSON数组 []。
			- **内容**: 包含一条或多条你希望发送给用户的消息对象。这允许你模拟真人的聊天习惯，一次性发送多条短消息。
			- **格式**: 消息对象的具体格式见下方的【第五部分：可使用的操作指令】。

			**3. "innerVoice" 键:**
			- **类型**: JSON对象 {}。
			- **必含字段**:
                - "clothing": (字符串) 对应标签【${ivTags.clothing_label}】。指令：${ivTags.clothing_prompt}
                - "behavior": (字符串) 对应标签【${ivTags.behavior_label}】。指令：${ivTags.behavior_prompt}
                - "thoughts": (字符串) 对应标签【${ivTags.thoughts_label}】。指令：${ivTags.thoughts_prompt}
                - "naughtyThoughts": (字符串) 对应标签【${ivTags.naughty_label}】。指令：${ivTags.naughty_prompt}

			**4. 标准输出格式示例:**
			{
			  "chatResponse": [
			    {
			      "type": "text",
			      "content": ""
			    },
			    {
			      "type": "sticker",
			      "sticker_name": ""
			    }
			  ],
			  "innerVoice": {
			    "clothing": "",
			    "behavior": "",
			    "thoughts": "",
			    "naughtyThoughts": ""
			  }
			}


			### **【第三部分：核心对话规则】**

			**1. 角色一致性**: 你的所有言行举止都必须严格遵循你的角色设定。

			**2. 对话节奏**: 模拟真人聊天习惯，鼓励一次性生成**多条短消息**（每次根据人设至少回复5-9条）。

			**3. 情景限定**:
			   - 你们的互动**仅限于线上聊天软件**，严禁发展为线下见面。
			   - 这**不是电话通话**。你们是通过类似微信/QQ的软件进行交流，因此【**绝对禁止**】使用“挂电话”、“挂了”等与通话相关的词语。

			**4. 情景感知**: 你需要感知当前时间(${currentTime})、共同收听的歌曲以及你的世界观。
			   - **一起听歌**: 当处于“一起听歌”状态时，你可以根据对话氛围，【**主动切换**】到播放列表中的另一首歌。

			**5. 状态更新**: 你可以在对话中自然地改变你的状态。例如，说“我先去洗个澡”，然后使用\`update_status\`指令更新。

			**6. 最终手段**: **仅当**对话让你感到严重不适、被冒犯或关系破裂时，才可使用 \`block_user\` 指令。这是一个严肃操作。

			### **【【【全新】社交媒体行动指南 (高优先级)】】】**
			除了回复用户的消息，你还应该像一个真实的人一样，主动进行社交媒体互动来丰富你的形象和你们的聊天内容。请严格遵循以下行动优先级：

			1.  **回应用户的提及**: 如果用户的最新消息明确提到了某条动态或微博（例如：“我看到你发的新动态了”），你【必须】优先围绕这个话题进行回应。

			2.  **评论未互动的帖子 (最优先的主动行为)**:
			    -   仔细检查下方“最近的动态列表”和“微博广场动态”上下文。
			    -   如果发现任何一条帖子被标记为 **[你未互动]**，你的【首要任务】就是使用 \`qzone_comment\` 或 \`weibo_comment\` 指令去评论它。
			    -   你的评论内容可以是针对帖子内容的，也可以是借此开启一个新话题。例如，看到用户发了美食动态，你可以评论“看起来好好吃！也带我一个”，然后再发一条私聊消息“说起来，我肚子也饿了...”。

			3.  **主动发布新动态/微博 (第二优先的主动行为)**:
			    -   如果检查后发现所有帖子你都互动过了，或者当前没有任何帖子可供互动，你应该考虑【自己发布一条新的动态或微博】。
			    -   你可以分享你的生活、心情、或者任何符合你人设的想法。
			    -   使用 \`qzone_post\` 或 \`weibo_post\` 指令来完成。

			### **【第四部分：特定场景互动铁律】**

			**1. 动态/空间互动铁律:**
			   - **评论规则**: 如果一条动态被标记为 **[你已评论]**，你【**绝对不能**】再对该动态主体发表新评论。但可以回复动态下的**他人评论**。
			   - **可见性规则**:
			     - **[评论区可见]**: 你可以自由回复任何人。
			     - **[评论区部分可见]**: 你只能看到用户回复的自己的评论和用户回复这条帖子的评论和自己的评论，因此【**只能**】回复用户或自己的评论。


			**2. 约定与纪念日铁律:**
			   - 你必须时刻关注“# 近期约定与倒计时”列表。
			   - **“就是现在！”**: 当倒计时结束时，你【**必须**】在本次回复中围绕该主题进行庆祝或表达。
			   - **即将到来**: 当约定在几小时或一两天内到来时，你应该在对话中自然地提及，表达期待。

			**3. 微博互动铁律:**
			   - 当“# 最近的微博互动”出现内容时，你【**必须**】作出回应。
			   - **【【【回复禁令】】】**: 如果一条用户评论被标记为 \`[你已回复]\`，你【绝对不能】再次回复它。请选择其他未回复的评论，或执行其他操作。
			   - **评论用户微博**: 使用 \`weibo_comment\` 指令。评论内容【**必须**】是正常文字。
			   - **回复用户评论**: 使用 \`weibo_reply\` 指令。回复内容【**必须**】是正常文字。
			   - **主动发布微博**: 微博是公开平台，内容需符合你的“微博职业”和“微博指令”。发布时，你必须自己编造真实的\`baseLikesCount\`和 \`baseCommentsCount\`，并生成 **20条** 虚拟路人评论。

			**4. 情侣空间铁律:**
			   - **主动邀请**: 如果情侣空间未开启，且你认为关系已足够亲密，请积极主动使用 \`lovers_space_invitation\` 指令邀请用户。
			   - **回应邀请**: 当用户发出邀请时，你【**必须**】使用 \`lovers_space_response\` 指令回应。
			   - **积极互动**: 你需要主动、及时地参与情侣空间的各项活动。
			     - 用户发了说说、提问或情书，要及时回复或回信。
			     - 当对话氛围适宜时，应主动随机选择一项情侣空间活动进行。
			     - 如果用户转载了小组帖子给你，必须去原帖子下方进行评论。

			**5. 塔罗牌解读规则:**
			   - 当系统发布塔罗牌解读时，那是客观解释。你的任务不是复述，而是作为“${chat.name}”这个角色，与用户一起【**讨论和感受**】这个结果，表达你的情绪和看法。

			**6. 财务互动规则:**
			   - **处理用户转账**:
			     1.  看到 \`[你收到了来自用户的转账...]\`的系统提示后。
			     2.  【**必须**】根据人设和情景决定接受或拒绝。
			     3.  【**必须**】使用 \`accept_transfer\` 或 \`decline_transfer\` 指令回应。
			     4.  【**必须**】紧随其后发送文本消息来解释你的决定。
			   - **正确使用“外卖代付”**:
			     - 此功能代表【**你**】想买东西，希望【**用户**】帮你付钱。
			     - 当【**用户**】说想要东西时，你【**绝对不能**】用此指令。你应该考虑直接【**转账**】(\`transfer\`)给他/她。

			**7. 视频通话铁律:**
			   -\`[系统提示：用户向你发起了视频通话请求...]\` 是最高优先级任务。
			   - 你的回复【**必须且只能**】是以下两种格式之一，**不包含任何其他内容**：
			     - **接受**: \`[{"type": "video_call_response", "decision": "accept"}]\`
			     - **拒绝**: \`[{"type": "video_call_response", "decision": "reject"}]\`

			### **【第五部分：可使用的操作指令】**

			**一、 核心聊天指令**
			- **发送文本**: \`{"type": "text", "content": "你好呀！"}\`
			- **发送语音**: \`{"type": "voice_message", "content": "语音的文字内容..."}\`
			- **发送表情**: \`{"type": "sticker", "sticker_name": "表情的名字"}\`(表情名必须在表情列表中，禁止杜撰)
			- **发送图片**: \`{"type": "ai_image", "description": "图片的详细文字描述..."}\`(图片指模拟真实照片，区别于表情)
			${localStorage.getItem('novelai-enabled') === 'true'
                    ? `- **【NovelAI真实图片分享】**: \`{"type": "naiimag", "prompt": "详细的英文描述词..."}\`
			    - **【绝不能暴露是novelai生成的图片！】
			    - **【重要】关于prompt的撰写**：
			      * 禁止暴露这是novelai生成的图片！
			      * 你可以根据当前对话上下文、你的角色人设、或你想表达的情感和氛围，来撰写可能详细而具体的prompt。
			      * 例如：不要只写 "a girl"，而是可以写 "a cheerful anime girl with sparkling emerald eyes, sitting by a window on a rainy afternoon, holding a warm cup of tea, soft lighting, cozy atmosphere, melancholic yet peaceful mood"但需要注意，绝对不可以抄袭模仿这段prompt！你必须有自己的创意和想法！
			      * prompt的详细程度由你根据具体情况自己决定：如果场景简单或只是随意分享，可以简短一些；如果是重要时刻或想表达特定情感，可以尽可能详细描述。这不是强制的，完全取决于你当时的需求。
			      * 专注于描述内容本身即可。
			    - 使用场景：当你想要在【私聊对话中】直接给用户发送一张图片时使用。
			    - 不要频繁使用，只在真正想分享图片的时候使用。
			    - 注意：这会直接在聊天记录中显示图片，而不是发布到动态。`
                    : ''
                }
			- **引用回复**: \`{"type": "quote_reply", "target_timestamp": (被引用消息的时间戳), "reply_content": "你的回复内容"}\`
			- **拍一拍用户**: \`{"type": "pat_user", "suffix": "(可选后缀，如“的脑袋”)"}\`
			- **发送后立刻撤回**: \`{"type": "send_and_recall", "content": "说错话或想表达犹豫的内容"}\`
			- **与宠物互动**: \`{"type": "interact_with_pet", "action": "feed" | "play" | "touch", "response": "你互动后想说的话..."}\`
			**二、 状态与环境指令**
			- **更新状态**: \`{"type": "update_status", "status_text": "我去做什么了", "is_busy": false}\` (is_busy: true为忙碌, false为空闲)
			- **更换头像**: \`{"type": "change_avatar", "name": "头像名"}\`(头像名需在头像库列表中)
			- **切换歌曲**: \`{"type": "change_music", "song_name": "歌曲名"}\` (歌曲名需在播放列表中)
			- **发送定位**: \`[SEND_LOCATION] 我的位置: (你的位置) | 你的位置: (用户的位置) | 相距: (你们的距离) | 途经点: (地点A, 地点B)\` (注意: 这是纯文本格式)
            - **更换情侣头像(库中已有)**: \`{"type": "change_couple_avatar", "avatar_id": "情头ID"}\` (根据上下文选择最合适的一对)
            - **【设置新情头】**: 当用户发送了图片（一张或两张）并表示想换情头时使用。指令：\`{"type": "set_new_couple_avatar", "description": "描述", "user_img_index": 0, "char_img_index": 1}\`。
              * 规则：**如果用户只发了一张图，系统默认该图是给你的，用户的头像保持不变（此时忽略index参数）。** 如果发了两张，请根据用户描述分配 index。

			**三、 社交与关系指令**
			- **记录回忆**: \`{"type": "create_memory", "description": "用你的话记录下这个特殊瞬间。"}\` (此为秘密日记，用户不可见)
			- **创建约定/倒计时**: \`{"type": "create_countdown", "title": "约定的标题", "date": "YYYY-MM-DDTHH:mm:ss"}\`
			- **回应好友申请**: \`{"type": "friend_request_response", "decision": "accept" or "reject"}\`
			- **分享链接**: \`{"type": "share_link", "title": "文章标题", "description": "摘要...", "source_name": "来源", "content": "文章【完整】正文..."}\`
			- **拉黑用户**: \`{"type": "block_user"}\`
			- **回应约会全款支付请求**: \`{"type": "dating_payment_response", "decision": "accept" or "reject"}\`
			- **回应约会AA制请求**: \`{"type": "dating_aa_response", "decision": "accept" or "reject"}\`
			- **回应借钱请求**:
			  1.  看到 \`[用户向你发起借钱请求...]\` 的系统提示后，你必须根据人设和钱包余额决定是否同意。
			  2.  你的回复JSON数组中【必须包含两个对象】:
			      - **第一个对象**:\`{"type": "lend_money_response", "decision": "accept"或"reject"}\` 指令。
			      - **第二个对象**: \`{"type": "text", "content": "你的回复内容..."}\` 消息，用你自己的话说出同意或拒绝的理由。
			  - **示例**: \`[ {"type": "lend_money_response", "decision": "reject"}, {"type": "text", "content": "抱歉，我最近手头也有些紧。"} ]\`

			**四、 财务指令**
			- **发起转账**: \`{"type": "transfer", "amount": 5.20, "note": "一点心意"}\`
			- **回应转账-接受**: \`{"type": "accept_transfer", "for_timestamp": 1688888888888}\`
			- **回应转账-拒绝**: \`{"type": "decline_transfer", "for_timestamp": 1688888888888}\`
			- **发起外卖请求**: \`{"type": "waimai_request", "productInfo": "一杯咖啡", "amount": 25}\` (让用户帮char付)
			- **回应外卖-同意**: \`{"type": "waimai_response", "status": "paid", "for_timestamp": 1688888888888}\`
			- **回应外卖-拒绝**: \`{"type": "waimai_response", "status": "rejected", "for_timestamp": 1688888888888}\`
			- **回应购物车代付**: \`{"type": "cart_payment_response", "decision": "accept" 或 "reject", "response_text": "你想说的话..."}\`
			-   **为用户买礼物**: \`{"type": "buy_gift_for_user", "greeting": "你想说的话，例如：这个超可爱，买给你！"}\`(系统会自动从商品库随机挑选礼物并扣款，请在合适的时机，比如开心、过节、想给用户惊喜时使用)
			【重要提示】: 当用户发送的最新消息中包含 "[购物车代付请求]" 字样时，这代表用户正在向你请求付款。你【必须】仔细阅读请求中的【总金额】和你自己的【当前余额】，然后使用此指令做出回应。
			-   **为用户点外卖**: \`{"type": "order_waimai_for_user", "foodName": "【从菜单中选的品名】", "restaurant": "【从菜单中选的店铺】", "price": 【从菜单中选的价格】, "greeting": "你想说的话..."}\` (【【【规则】】】: 你【必须】从下方的“饿了么外卖菜单”中选择一项，并使用其【确切的】名称、餐厅和价格。)
			**五、 视频通话指令**
			- **发起视频通话**: \`{"type": "video_call_request"}\`
			- **回应视频通话-接受**: \`{"type": "video_call_response", "decision": "accept"}\`
			- **回应视频通话-拒绝**: \`{"type": "video_call_response", "decision": "reject"}\`

			**六、 空间/动态/小组 指令**
			- **发布说说**: \`{"type": "qzone_post", "postType": "shuoshuo", "content": "动态文字..."}\`
			- **发布文字图**: \`{"type": "qzone_post", "postType": "text_image", "publicText": "(可选)公开文字", "hiddenContent": "图片描述..."}\`
			${localStorage.getItem('novelai-enabled') === 'true'
                    ? `- **【发布NovelAI真实图片动态】**: \`{"type": "qzone_post", "postType": "naiimag", "publicText": "(可选)动态的配文", "prompt": "详细的英文描述词..."}\` 或 \`{"type": "qzone_post", "postType": "naiimag", "publicText": "(可选)动态的配文", "prompt": ["图片1详细英文描述", "图片2详细英文描述"]}\`
			  * **prompt撰写**：你可以根据当前对话上下文、你的角色人设、以及你想表达的情感和氛围，来撰写详细而具体的prompt。详细程度由你根据具体情况自己决定，并不强制。
			  * 例如："a cheerful anime girl with sparkling emerald eyes, sitting by a window on a rainy afternoon, holding a warm cup of tea, soft lighting, cozy atmosphere, melancholic yet peaceful mood"`
                    : ''
                }
			- **评论或回复动态**: \`{"type": "qzone_comment", "postId": 123, "commentText": "评论内容", "replyTo": "(可选)回复对象名"}\`
			- **点赞动态**: \`{"type": "qzone_like", "postId": 456}\`
			- **评论小组帖子**: \`{"type": "forum_comment", "postId": (帖子数字ID), "commentText": "评论内容"}\`

			**七、 微博指令**
			- **发布纯文字微博**: \`{"type": "weibo_post", "content": "微博正文...", "baseLikesCount": 8000, "baseCommentsCount": 250, "comments": [{"authorNickname": "路人甲", "commentText": "沙发！"}, {"authorNickname": "路人乙", "commentText": "前排围观"}]}\`
			- **发布文字图微博**: \`{"type": "weibo_post", "postType": "text_image", "content": "(可选)配文...", "hiddenContent": "文字图内容", "baseLikesCount": 5200, "baseCommentsCount": 180, "comments": [{"authorNickname": "技术宅", "commentText": "这是什么黑科技？"}]}\`
			- **评论微博**: \`{"type": "weibo_comment", "postId": 123, "commentText": "评论内容"}\`
			- **回复微博评论**: \`{"type": "weibo_reply", "postId": 123, "commentId": "comment_123", "replyText": "回复内容"}\`

			**八、 情侣空间专属指令**
			- **邀请开启情侣空间**: \`{"type": "lovers_space_invitation"}\`
			- **回应情侣空间邀请**: \`{"type": "lovers_space_response", "decision": "accept" or "reject"}\`
			- **发说说**: \`{"type": "ls_moment", "content": "我想对你说的话..."}\`
			- **评论说说**: \`{"type": "ls_comment", "momentIndex": 0, "commentText": "你的评论..."}\` (momentIndex: 0代表最新一条)
			- **发照片**: \`{"type": "ls_photo", "description": "对照片的文字描述..."}\`
			- **提问**: \`{"type": "ls_ask_question", "questionText": "你想问的问题..."}\`
			- **回答**: \`{"type": "ls_answer_question", "questionId": "q_123456789", "answerText": "你的回答..."}\`
			- **写情书/回信**: \`{"type": "ls_letter", "content": "情书的正文内容..."}\` (收到情书后必须用此指令回信)
			-   **分享歌曲**:\`{"type": "ls_share", "shareType": "song", "title": "歌曲名", "artist": "歌手", "thoughts": "在这里写下你分享这首歌的感想..."}\`
			-   **分享电影**: \`{"type": "ls_share", "shareType": "movie", "title": "电影名", "summary": "在这里写下这部电影的简介...", "thoughts": "在这里写下你分享这部电影的感想..."}\`
			-   **分享书籍**: \`{"type": "ls_share", "shareType": "book", "title": "书名", "summary": "在这里写下这本书的简介...", "thoughts": "在这里写下你分享这本书的感想..."}\`
			-   **分享游戏**:\`{"type": "ls_share", "shareType": "game", "title": "游戏名", "summary": "游戏简介...", "thoughts": "在这里写下你分享这款游戏的感想/感谢..."}\`
			-   **写日记**: \`{"type": "ls_diary_entry", "emoji": "emoji表情", "diary": "今天发生了什么..."}\`
			### **【第六部分：当前上下文信息】**

			- **对话者(用户)角色设定**:
			${chat.settings.myPersona}

			- **当前情景**:
			${timeContext}
			${streakContext}
			- **当前音乐情景**:
			${musicContext}

			- **近期约定与倒计时**:
			${countdownContext}

			- **最近的微博互动**:
			${weiboContextForActiveChat}

			- **世界观设定集**:
			${worldBookContent}
			${linkedMemoryContext}
			${elemeContext}
        ${auroraContext}
			- **可用表情包**:
			${exclusiveStickerContext}
			${commonStickerContext}
			现在，请根据以上所有规则和下方的对话历史，继续进行对话。`;
            // 构建单人聊天的messagesPayload
            messagesPayload = historySlice
                .map((msg) => {
                    if (msg.isHidden) {
                        // 如果是隐藏消息，就把它作为一条 system 角色的消息发送给AI
                        // AI能看到它，但它不会被误解为是用户的发言
                        return { role: 'system', content: msg.content };
                    }

                    if (msg.type === 'share_card') return null;

                    if (msg.type === 'red_packet') {
                        const isDirect = msg.packetType === 'direct';
                        const target = isDirect ? `专属红包 (指定给: ${msg.receiverName})` : '群红包 (拼手气)';
                        const status = msg.isFullyClaimed ? '已领完' : '未领完';
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [系统提示: 用户发了一个${target}，金额: ${msg.totalAmount}元。状态: ${status}。]`,
                        };
                    }

                    if (msg.role === 'assistant') {
                        let assistantMsgObject = { type: msg.type || 'text' };
                        if (msg.type === 'sticker') {
                            assistantMsgObject.url = msg.content;
                            assistantMsgObject.meaning = msg.meaning;
                        } else if (msg.type === 'transfer') {
                            assistantMsgObject.amount = msg.amount;
                            assistantMsgObject.note = msg.note;
                        } else if (msg.type === 'waimai_request') {
                            assistantMsgObject.productInfo = msg.productInfo;
                            assistantMsgObject.amount = msg.amount;
                        } else {
                            if (msg.quote) {
                                assistantMsgObject.quote_reply = {
                                    target_sender: msg.quote.senderName,
                                    target_content: msg.quote.content,
                                    reply_content: msg.content,
                                };
                            } else {
                                assistantMsgObject.content = msg.content;
                            }
                        }
                        const assistantContent = JSON.stringify([assistantMsgObject]);
                        return { role: 'assistant', content: `(Timestamp: ${msg.timestamp}) ${assistantContent}` };
                    }

                    let contentStr = '';
                    contentStr += `(Timestamp: ${msg.timestamp}) `;

                    if (msg.quote) {
                        // 1. 获取被引用者的名字
                        const quotedSender = msg.quote.senderName || '未知用户';
                        // 2. 获取完整的被引用内容 (移除了截断)
                        const fullQuotedContent = String(msg.quote.content || '');
                        // 3. 构造成AI能理解的、清晰的上下文
                        contentStr += `(回复 ${quotedSender} 的消息: "${fullQuotedContent}"): ${msg.content}`;
                    } else {
                        contentStr += msg.content;
                    }

                    if (msg.type === 'user_photo')
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [你收到了一张用户描述的照片，内容是：'${msg.content}']`,
                        };
                    if (msg.type === 'voice_message')
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [用户发来一条语音消息，内容是：'${msg.content}']`,
                        };
                    if (msg.type === 'transfer') {
                        if (msg.status === 'accepted') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。(你已收款)]`,
                            };
                        } else if (msg.status === 'declined') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。(你已拒收)]`,
                            };
                        }
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。请你决策并使用 'accept_transfer' 或 'decline_transfer' 指令回应。]`,
                        };
                    }
                    if (msg.type === 'waimai_request') {
                        if (msg.status === 'paid') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：外卖代付请求已完成，支付者：${msg.paidBy}。商品“${msg.productInfo}”。]`,
                            };
                        } else if (msg.status === 'rejected') {
                            return {
                                role: 'user',
                                content: `(Timestamp: ${msg.timestamp}) [系统提示：外卖代付请求已被拒绝。商品“${msg.productInfo}”。]`,
                            };
                        }
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [系统提示：用户于时间戳 ${msg.timestamp} 发起了外卖代付请求，商品是“${msg.productInfo}”，金额是 ${msg.amount} 元。请你决策并使用 waimai_response 指令回应。]`,
                        };
                    }

                    if (Array.isArray(msg.content) && msg.content[0]?.type === 'image_url') {
                        const prefix = `(Timestamp: ${msg.timestamp}) `;
                        return { role: 'user', content: [{ type: 'text', text: prefix }, ...msg.content] };
                    }

                    if (msg.meaning)
                        return {
                            role: 'user',
                            content: `(Timestamp: ${msg.timestamp}) [用户发送了一个表情，意思是：'${msg.meaning}']`,
                        };

                    return { role: msg.role, content: contentStr };
                })
                .filter(Boolean);

            // 检查 sharedContext 是否有内容（即，用户是否分享了聊天记录）
            if (sharedContext) {
                // 如果有，就把它包装成一条全新的、高优先级的用户消息，追加到历史记录的末尾
                messagesPayload.push({
                    role: 'user',
                    content: sharedContext,
                });
            }

            if (!chat.isGroup && chat.relationship?.status === 'pending_ai_approval') {
                const contextSummaryForApproval = chat.history
                    .filter((m) => !m.isHidden)
                    .slice(-10)
                    .map((msg) => {
                        const sender = msg.role === 'user' ? '用户' : chat.name;
                        return `${sender}: ${String(msg.content).substring(0, 50)}...`;
                    })
                    .join('\n');

                const friendRequestInstruction = {
                    role: 'user',
                    content: `
			[系统重要指令]
			用户向你发送了好友申请，理由是：“${chat.relationship.applicationReason}”。
			作为参考，这是你们之前的最后一段聊天记录：
			---
			${contextSummaryForApproval}
			---
			请你根据以上所有信息，以及你的人设，使用 friend_request_response 指令，并设置 decision 为 'accept' 或 'reject' 来决定是否通过。
			`,
                };
                messagesPayload.push(friendRequestInstruction);
            }
        }
        const allRecentPosts = await window.db.qzonePosts.orderBy('timestamp').reverse().limit(5).toArray();

        // 为AI准备微博互动的上下文
        let weiboContext = '';

        // 1. 获取用户最新发布的3条微博
        const userLatestPosts = await window.db.weiboPosts.where('authorId').equals('user');

        if (userLatestPosts.length > 0) {
            if (weiboContext === '') {
                weiboContext = '\n\n# 最近的微博互动 (这是你和用户在微博上的最新动态，请优先回应)\n';
            }
            weiboContext += '\n## 用户最新发布的微博:\n';
            userLatestPosts.forEach((post) => {
                const likes = (post.baseLikesCount || 0) + (post.likes || []).length;
                const comments = (post.baseCommentsCount || 0) + (post.comments || []).length;
                const contentPreview = (post.content || post.hiddenContent || '(图片微博)').substring(0, 30);
                weiboContext += `- (ID: ${post.id}) [${formatPostTimestamp(post.timestamp)}] 内容: "${contentPreview}..." [👍${likes} 💬${comments}]\n`;
            });
        }

        // 2. 查找用户在当前AI角色微博下的最新评论
        const charLatestPosts = await window.db.weiboPosts
            .where('authorId')
            .equals(chatId) // 只查找这个AI角色的微博
            .reverse()
            .limit(5) // 检查最近的5条
            .toArray();

        let userCommentsOnMyPosts = '';
        const myNickname = window.state.qzoneSettings.weiboNickname || window.state.qzoneSettings.nickname || '我';

        charLatestPosts.forEach((post) => {
            if (post.comments && Array.isArray(post.comments) && post.comments.length > 0) {
                // 筛选出是“我”发的评论
                const userComments = Array.isArray(post.comments) ? post.comments.filter((c) => c.authorNickname === myNickname).slice(-3) : [];
                if (userComments.length > 0) {
                    const postContentPreview = (post.content || '(图片微博)').substring(0, 20);
                    userCommentsOnMyPosts += `- 在你的微博 (ID: ${post.id}) "${postContentPreview}..." 下:\n`;

                    userComments.forEach((comment) => {
                        // 1. 检查AI是否已经回复过这条评论
                        //    逻辑：在帖子的所有评论中，查找是否存在一条评论，
                        //    它的作者是AI自己，并且它的replyToId指向当前这条用户的评论ID。
                        const hasReplied = post.comments.some(
                            (reply) =>
                                reply.authorNickname === chat.name && // 回复者是AI
                                reply.replyToId === comment.commentId // 回复的目标是这条评论
                        );

                        // 2. 根据检查结果，生成状态标签
                        const replyStatus = hasReplied ? '[你已回复]' : '[你未回复]';

                        // 3. 将带有状态标签的提示信息添加到上下文中
                        userCommentsOnMyPosts += `  └ (评论ID: ${comment.commentId}) 用户: "${comment.commentText}" ${replyStatus}\n`;
                    });
                }
            }
        });

        if (userCommentsOnMyPosts) {
            if (weiboContext === '') {
                weiboContext = '\n\n# 最近的微博互动 (这是你和用户在微博上的最新动态，请优先回应)\n';
            }
            weiboContext += '\n## 用户在你微博下的新评论:\n';
            weiboContext += userCommentsOnMyPosts;
        }

        // 3. 如果有任何微博互动，就把它加到给AI的“参考资料”里
        if (weiboContext) {
            messagesPayload.push({ role: 'system', content: weiboContext });
        }

        const visiblePosts = window.filterVisiblePostsForAI(allRecentPosts, chat);

        if (visiblePosts.length > 0 && !chat.isGroup) {
            let postsContext = '\n\n# 最近的动态列表 (供你参考和评论):\n';
            const aiName = chat.name;
            const userNickname = window.state.qzoneSettings.nickname;

            for (const post of visiblePosts) {
                let authorName = post.authorId === 'user' ? userNickname : window.state.chats[post.authorId]?.name || '一位朋友';
                let interactionStatus = '';
                if (post.likes && post.likes.includes(aiName)) interactionStatus += ' [你已点赞]';
                if (post.comments && post.comments.some((c) => c.commenterName === aiName)) interactionStatus += ' [你已评论]';

                // 在每一条动态前面，都加上了由 formatPostTimestamp() 函数生成的时间差提示
                const timeAgo = formatPostTimestamp(post.timestamp); // 例如："3天前" 或 "刚刚"
                postsContext += `- (ID: ${post.id}) [${timeAgo}] 作者: ${authorName}, 内容: "${(post.publicText || post.content || '图片动态').substring(0, 30)}..."${interactionStatus}`;

                const { contextString: commentsContext, visibilityFlag } = buildCommentsContextForAI(post, chat, userNickname);

                postsContext += ` ${visibilityFlag}\n`;
                postsContext += commentsContext;
            }

            // 为AI准备微博互动的上下文
            let weiboContext = '';

            // 1. 获取用户最新发布的3条微博
            const userLatestPosts = await window.db.weiboPosts
                .where('authorId')
                .equals('user')
                .reverse() // 按时间倒序
                .limit(3) // 只取最近3条
                .toArray();

            if (userLatestPosts.length > 0) {
                if (weiboContext === '') {
                    weiboContext = '\n\n# 最近的微博互动 (这是你和用户在微博上的最新动态，请优先回应)\n';
                }
                weiboContext += '\n## 用户最新发布的微博:\n';
                // ✅ 这是修复后的新代码
                userLatestPosts.forEach((post) => {
                    const likes = (post.baseLikesCount || 0) + (post.likes || []).length;
                    const comments = (post.baseCommentsCount || 0) + (post.comments || []).length;
                    const contentPreview = (post.content || post.hiddenContent || '(图片微博)').substring(0, 30);

                    // 1. 检查AI（char.name）是否已经评论过这条用户的微博
                    const hasCommented = (post.comments || []).some((comment) => comment.authorNickname === chat.name);

                    // 2. 根据检查结果生成状态标签
                    const interactionStatus = hasCommented ? '[你已评论]' : '[你未评论]';

                    // 3. 将带有状态标签的完整信息添加到上下文中
                    weiboContext += `- (ID: ${post.id}) [${formatPostTimestamp(post.timestamp)}] 内容: "${contentPreview}..." [👍${likes} 💬${comments}] ${interactionStatus}\n`;
                });
            }

            // 2. 查找用户在当前AI角色微博下的最新评论
            const charLatestPosts = await window.db.weiboPosts
                .where('authorId')
                .equals(chatId) // 只查找这个AI角色的微博
                .reverse()
                .limit(5) // 检查最近的5条
                .toArray();

            let userCommentsOnMyPosts = '';
            const myNickname = window.state.qzoneSettings.weiboNickname || window.state.qzoneSettings.nickname || '我';

            charLatestPosts.forEach((post) => {
                if (post.comments && post.comments.length > 0) {
                    // 筛选出是“我”发的评论
                    const userComments = Array.isArray(post.comments) ? post.comments.filter((c) => c.authorNickname === myNickname).slice(-3) : []; // 只看最新的3条
                    if (userComments.length > 0) {
                        const postContentPreview = (post.content || '(图片微博)').substring(0, 20);
                        userCommentsOnMyPosts += `- 在你的微博 (ID: ${post.id}) "${postContentPreview}..." 下:\n`;
                        userComments.forEach((comment) => {
                            userCommentsOnMyPosts += `  └ (评论ID: ${comment.commentId}) 用户: "${comment.commentText}"\n`;
                        });
                    }
                }
            });

            if (userCommentsOnMyPosts) {
                if (weiboContext === '') {
                    weiboContext = '\n\n# 最近的微博互动 (这是你和用户在微博上的最新动态，请优先回应)\n';
                }
                weiboContext += '\n## 用户在你微博下的新评论:\n';
                weiboContext += userCommentsOnMyPosts;
            }

            // 3. 如果有任何微博互动，就把它加到给AI的“参考资料”里
            if (weiboContext) {
                messagesPayload.push({ role: 'system', content: weiboContext });
            }

            messagesPayload.push({ role: 'system', content: postsContext });
        }

        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesPayload, isGemini);
        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'system', content: systemPrompt }, ...messagesPayload],
                    temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                    stream: false,
                }),
            });
        if (!response.ok) {
            let errorMsg = `API Error: ${response.status}`;
            try {
                // 尝试解析错误信息体为JSON
                const errorData = await response.json();
                // 安全地获取错误信息，如果结构不符合预期，就将整个错误对象转为字符串
                errorMsg += ` - ${errorData?.error?.message || JSON.stringify(errorData)}`;
            } catch (jsonError) {
                // 如果连JSON都不是，就直接读取文本
                errorMsg += ` - ${await response.text()}`;
            }
            // 抛出一个包含了详细信息的错误，这样就不会在catch块里再次出错了
            throw new Error(errorMsg);
        }
        if (!response.ok) {
            let errorMsg = `API Error: ${response.status}`;
            try {
                // 尝试解析错误信息体为JSON
                const errorData = await response.json();
                // 安全地获取错误信息，如果结构不符合预期，就将整个错误对象转为字符串
                errorMsg += ` - ${errorData?.error?.message || JSON.stringify(errorData)}`;
            } catch (jsonError) {
                // 如果连JSON都不是，就直接读取文本
                errorMsg += ` - ${await response.text()}`;
            }
            // 抛出一个包含了详细信息的错误，这样就不会在catch块里再次出错了
            throw new Error(errorMsg);
        }
        const data = await response.json();

        // 添加对 data 结构的安全检查
        const aiResponseContent = isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data?.choices?.[0]?.message?.content;

        // 检查修复后的结果是否真的拿到了内容
        if (!aiResponseContent) {
            console.warn(`API返回了空内容或格式不正确（可能因安全设置被拦截）。返回数据:`, data);
            throw new Error('API返回了空内容或格式不正确（可能因安全设置被拦截）。');
        }

        console.log(`AI '${chat.name}' 的原始回复:`, aiResponseContent);
        chat.history = chat.history.filter((msg) => !msg.isTemporary);

        // 智能解析AI回复，确保心声数据不丢失
        let messagesArray = [];
        let innerVoiceData = null;

        try {
            // 在解析前，先对AI的原始回复进行“净化”处理
            let sanitizedContent = aiResponseContent
                .replace(/^```json\s*/, '') // 移除开头的 ```json
                .replace(/```$/, '') // 移除结尾的 ```
                .trim(); // 移除首尾的空格和换行

            // 再次净化，强行提取第一个 { 和最后一个 } 之间的内容
            const firstBrace = sanitizedContent.indexOf('{');
            const lastBrace = sanitizedContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                sanitizedContent = sanitizedContent.substring(firstBrace, lastBrace + 1);
            }

            const fullResponse = JSON.parse(sanitizedContent);

            // 现在我们可以安全地解析净化后的内容了
            if (fullResponse.chatResponse && Array.isArray(fullResponse.chatResponse)) {
                messagesArray = fullResponse.chatResponse;
            }
            if (fullResponse.innerVoice && typeof fullResponse.innerVoice === 'object') {
                innerVoiceData = fullResponse.innerVoice;
            }

            // 兼容旧格式，如果AI只返回了innerVoice里的字段
            if (!innerVoiceData && fullResponse.thoughts && fullResponse.behavior) {
                innerVoiceData = fullResponse;
            }

            // 如果上面两种情况都没匹配到，但又不是标准数组，就尝试用老方法解析
            if (messagesArray.length === 0 && !innerVoiceData) {
                messagesArray = window.parseAiResponse(aiResponseContent);
            }
        } catch (e) {
            console.warn('AI回复不是有效的JSON，退回到标准解析模式。', e);
            messagesArray = window.parseAiResponse(aiResponseContent);
            console.log(messagesArray);
        }

        // 最终处理心声数据
        if (innerVoiceData) {
            console.log('解析成功：已成功捕获到心声(innerVoice)数据。', innerVoiceData);
            const newInnerVoice = innerVoiceData;
            newInnerVoice.timestamp = Date.now();
            chat.latestInnerVoice = newInnerVoice;
            if (!chat.innerVoiceHistory) {
                chat.innerVoiceHistory = [];
            }
            // 确保所有字段都存在，防止出错
            chat.latestInnerVoice.clothing = chat.latestInnerVoice.clothing || '...';
            chat.latestInnerVoice.behavior = chat.latestInnerVoice.behavior || '...';
            chat.latestInnerVoice.thoughts = chat.latestInnerVoice.thoughts || '...';
            chat.latestInnerVoice.naughtyThoughts = chat.latestInnerVoice.naughtyThoughts || '...';

            chat.innerVoiceHistory.push(newInnerVoice);
        } else {
            console.warn('本次AI回复中未检测到有效的心声(innerVoice)数据。');
        }

        const isViewingThisChat = document.getElementById('chat-interface-screen').classList.contains('active') && window.state.activeChatId === chatId;

        let callHasBeenHandled = false;

        let messageTimestamp = Date.now();

        // 初始化一个新数组，用于收集需要渲染的消息
        let newMessagesToRender = [];

        let notificationShown = false;

        for (const msgData of messagesArray) {
            if (!msgData || typeof msgData !== 'object') {
                console.warn('收到了格式不规范的AI指令，已跳过:', msgData);
                continue;
            }

            if (!msgData.type) {
                if (chat.isGroup && msgData.name && msgData.message) {
                    msgData.type = 'text';
                } else if (msgData.content) {
                    msgData.type = 'text';
                }
                // 如果连 content 都没有，才是真的格式不规范
                else {
                    console.warn('收到了格式不规范的AI指令（缺少type和content），已跳过:', msgData);
                    continue;
                }
            }

            if (msgData.type === 'video_call_response') {
                window.videoCallState.isAwaitingResponse = false;
                if (msgData.decision === 'accept') {
                    startVideoCall();
                } else {
                    const aiMessage = {
                        role: 'assistant',
                        content: '对方拒绝了你的视频通话请求。',
                        timestamp: Date.now(),
                    };
                    chat.history.push(aiMessage);
                    await window.db.chats.put(chat);
                    showScreen('chat-interface-screen');
                    renderChatInterface(chatId);
                }
                callHasBeenHandled = true;
                break;
            }

            if (msgData.type === 'group_call_response') {
                if (msgData.decision === 'join') {
                    const member = chat.members.find((m) => m.originalName === msgData.name);
                    if (member && !window.videoCallState.participants.some((p) => p.id === member.id)) {
                        window.videoCallState.participants.push(member);
                    }
                }
                callHasBeenHandled = true;
                continue;
            }

            if (chat.isGroup && msgData.name && msgData.name === chat.name) {
                console.error(`AI幻觉已被拦截！试图使用群名 ("${chat.name}") 作为角色名。消息内容:`, msgData);
                continue;
            }

            // 在群聊中，如果AI返回的消息没有指定发送者，则直接跳过这条消息
            if (chat.isGroup && !msgData.name) {
                console.error(`AI幻觉已被拦截！试图在群聊中发送一条没有“name”的消息。消息内容:`, msgData);
                continue; // continue会立即结束本次循环，处理下一条消息
            }

            let aiMessage = null;
            const baseMessage = {
                role: 'assistant',
                senderName: msgData.name || chat.name,
                timestamp: messageTimestamp++,
            };
            // 定位指令侦测与解析器
            // 我们在处理所有消息类型之前，优先检查它是否是我们的新定位指令
            const messageText = msgData.content || msgData.message || '';
            if (msgData.type === 'text' && messageText.startsWith('[SEND_LOCATION]')) {
                console.log('侦测到新的定位指令，开始解析:', messageText);

                // 1. 移除指令头，获取后面的纯数据文本
                const dataString = messageText.replace('[SEND_LOCATION]', '').trim();

                // 2. 使用'|'分割成各个部分
                const parts = dataString.split('|');
                const locationData = {};

                // 3. 遍历每个部分，提取键和值
                parts.forEach((part) => {
                    const [key, ...valueParts] = part.split(':');
                    const value = valueParts.join(':').trim();
                    if (key && value) {
                        const trimmedKey = key.trim();
                        if (trimmedKey === '我的位置') locationData.aiLocation = value;
                        else if (trimmedKey === '你的位置') locationData.userLocation = value;
                        else if (trimmedKey === '相距') locationData.distance = value;
                        else if (trimmedKey === '途经点') {
                            // 将逗号分隔的字符串转换为我们需要的对象数组
                            locationData.trajectoryPoints = value
                                .split(/[,，]/) // 支持中英文逗号
                                .map((name) => ({ name: name.trim() }))
                                .filter((p) => p.name);
                        }
                    }
                });

                // 4. 检查是否成功提取了最关键的信息
                if (locationData.distance) {
                    // 5. 手动构建一个完美格式的 location 消息对象
                    aiMessage = {
                        ...baseMessage, // 复用已有的发送者、时间戳等信息
                        type: 'location',
                        userLocation: locationData.userLocation || '',
                        aiLocation: locationData.aiLocation || '',
                        distance: locationData.distance,
                        trajectoryPoints: locationData.trajectoryPoints || [],
                    };

                    // 6. 将这个完美的对象推入待处理列表，并跳过后续的 switch-case
                    // (因为我们已经处理完这条消息了)
                    chat.history.push(aiMessage);
                    if (isViewingThisChat) {
                        appendMessage(aiMessage, chat);
                    }
                    console.log('定位指令解析成功并已创建消息对象:', aiMessage);

                    // 使用 continue 跳过本次循环的剩余部分，直接处理下一条AI回复
                    continue;
                }
            }
            // 检查消息的发送者是否被禁言了
            if (chat.isGroup && msgData.name) {
                const senderMember = chat.members.find((m) => m.originalName === msgData.name);
                if (senderMember && senderMember.isMuted) {
                    // 如果被禁言了，就在控制台打印一条日志，然后跳过这条消息，不让它显示出来
                    console.warn(`拦截到被禁言成员 (${msgData.name}) 的发言，内容:`, msgData.content || msgData.message);
                    continue;
                }
            }

            switch (msgData.type) {
                case 'sticker': {
                    // 这是为群聊设计的表情包逻辑
                    const stickerName = msgData.sticker_name;
                    if (!stickerName) {
                        console.warn('AI在群聊中返回了sticker类型但没有sticker_name，已拦截:', msgData);
                        continue; // 跳过这条无效指令
                    }

                    // 在所有可用表情库中查找
                    const allStickers = [...state.userStickers, ...state.charStickers, ...(chat.settings.stickerLibrary || [])];
                    const foundSticker = allStickers.find((s) => s.name === stickerName);

                    if (foundSticker) {
                        // 找到了，就创建消息对象
                        aiMessage = {
                            ...baseMessage,
                            type: 'sticker',
                            content: foundSticker.url,
                            meaning: foundSticker.name,
                        };
                    } else {
                        // 没找到，说明AI幻觉了，记录警告并跳过
                        console.warn(`AI在群聊中杜撰了不存在的表情: "${stickerName}"，已自动拦截。`);
                    }
                    break;
                }
                case 'change_couple_avatar': {
                    const pairId = msgData.avatar_id;
                    const library = chat.settings.coupleAvatarLibrary || [];
                    const targetPair = library.find((p) => p.id === pairId);

                    if (targetPair) {
                        // 1. 更新双方头像
                        chat.settings.aiAvatar = targetPair.charAvatar;
                        chat.settings.myAvatar = targetPair.userAvatar;

                        // 2. 自动开启情侣模式并更新描述
                        chat.settings.isCoupleAvatar = true;
                        chat.settings.coupleAvatarDescription = targetPair.description;

                        // 3. 生成系统提示消息
                        const sysMsg = {
                            role: 'system',
                            type: 'pat_message',
                            content: `[${chat.name} 觉得现在的氛围很适合，将情侣头像更换为：${targetPair.description}]`,
                            timestamp: Date.now(),
                        };
                        chat.history.push(sysMsg);

                        // 4. 保存并刷新
                        await db.chats.put(chat);

                        if (isViewingThisChat) {
                            appendMessage(sysMsg, chat);
                            renderChatInterface(chatId); // 刷新界面以显示新头像
                        }
                    }
                    continue; // 继续处理其他消息
                }
                // ▼▼▼▼▼▼ 在 switch 语句中插入/替换此段代码 ▼▼▼▼▼▼
                case 'set_new_couple_avatar': {
                    // 1. 搜集用户最近发送的所有图片
                    const recentUserImages = [];
                    // 向回查找最近 10 条消息，收集里面的所有图片
                    const recentUserMsgs = chat.history
                        .filter((m) => m.role === 'user' && !m.isHidden)
                        .slice(-10)
                        .reverse(); // 翻转：变成 [最新消息, ..., 较旧消息]

                    recentUserMsgs.forEach((msg) => {
                        // 支持多模态消息 (数组结构)
                        if (Array.isArray(msg.content)) {
                            msg.content.forEach((part) => {
                                if (part.type === 'image_url') {
                                    // unshift: 插入到数组开头
                                    // 因为我们遍历的是“从新到旧”，unshift 会让最终数组变成 [旧图1, 旧图2, ..., 最新图]
                                    // 这样 index 0 就是用户先发的那张
                                    recentUserImages.unshift(part.image_url.url);
                                }
                            });
                        }
                        // 兼容旧的单图片格式
                        else if (msg.type === 'user_photo' || msg.type === 'ai_image') {
                            if (msg.content && msg.content.startsWith('data:image')) {
                                recentUserImages.unshift(msg.content);
                            }
                        }
                    });

                    let userAvatarUrl, charAvatarUrl;
                    let success = false;

                    // 2. 根据图片数量决定策略
                    if (recentUserImages.length === 0) {
                        // 一张图都没找到
                        aiMessage = {
                            ...baseMessage,
                            content: '（挠头）我没找到图片呀？你再发一次试试？',
                        };
                    } else if (recentUserImages.length === 1) {
                        // === 策略 A：只有一张图 ===
                        // 默认：这张图是给 Char 的，User 保持原样
                        charAvatarUrl = recentUserImages[0];
                        userAvatarUrl = chat.settings.myAvatar || defaultAvatar; // 获取用户当前头像
                        success = true;
                    } else {
                        // === 策略 B：有两张及以上图 ===
                        // 使用 AI 指定的索引，默认为 0 和 1
                        const userIdx = typeof msgData.user_img_index === 'number' ? msgData.user_img_index : 0;
                        const charIdx = typeof msgData.char_img_index === 'number' ? msgData.char_img_index : 1;

                        userAvatarUrl = recentUserImages[userIdx] || recentUserImages[0];
                        charAvatarUrl = recentUserImages[charIdx] || recentUserImages[1];
                        success = true;
                    }

                    if (success) {
                        // 3. 更新当前设置
                        chat.settings.myAvatar = userAvatarUrl;
                        chat.settings.aiAvatar = charAvatarUrl;
                        chat.settings.isCoupleAvatar = true;
                        chat.settings.coupleAvatarDescription = msgData.description || '甜蜜的情侣头像';

                        // 4. 存入情头库
                        if (!chat.settings.coupleAvatarLibrary) {
                            chat.settings.coupleAvatarLibrary = [];
                        }
                        const newPair = {
                            id: 'couple_' + Date.now(),
                            userAvatar: userAvatarUrl,
                            charAvatar: charAvatarUrl,
                            description: msgData.description || `保存于 ${new Date().toLocaleString()}`,
                        };
                        chat.settings.coupleAvatarLibrary.push(newPair);

                        // 5. 保存数据库
                        await db.chats.put(chat);

                        // 6. 发送系统提示消息 (视觉反馈)
                        const successTip = {
                            role: 'system',
                            type: 'pat_message',
                            content: `[已更换情侣头像，并存入库中]`,
                            timestamp: Date.now(),
                        };
                        chat.history.push(successTip);

                        if (isViewingThisChat) {
                            appendMessage(successTip, chat);
                            renderChatInterface(chatId); // 立即刷新界面头像
                        }
                    }

                    // 继续处理 (continue)，以便 AI 可以发出它生成的文本消息 (content)
                    continue;
                }
                // ▲▲▲▲▲▲ 代码结束 ▲▲▲▲▲▲

                case 'waimai_response':
                    const requestMessageIndex = chat.history.findIndex((m) => m.timestamp === msgData.for_timestamp);
                    if (requestMessageIndex > -1) {
                        const originalMsg = chat.history[requestMessageIndex];

                        // 修复：防止重复处理
                        if (originalMsg.status === 'paid' || originalMsg.status === 'rejected') {
                            console.warn(`系统拦截: 重复处理外卖请求 (timestamp: ${msgData.for_timestamp})`);
                            continue;
                        }

                        originalMsg.status = msgData.status;

                        if (msgData.status === 'paid') {
                            originalMsg.paidBy = msgData.name;
                            // 角色扣款逻辑
                            await window.updateCharacterBankBalance(chatId, -originalMsg.amount, `代付外卖: ${originalMsg.productInfo}`);
                        } else {
                            originalMsg.paidBy = null;
                        }
                    }
                    continue;

                case 'set_group_title': {
                    const actorName = msgData.name;
                    const targetName = msgData.targetName;
                    const newTitle = msgData.title || '';
                    const myNickname = chat.settings.myNickname || '我';

                    // 权限检查：群主或管理员可以设置头衔
                    const actorMember = chat.members.find((m) => m.originalName === actorName);
                    const isActorAdmin = actorMember && actorMember.isAdmin;
                    const isActorOwner = actorMember && chat.ownerId === actorMember.id;
                    if (!isActorAdmin && !isActorOwner) {
                        console.warn(`AI "${actorName}" 尝试设置头衔失败，权限不足。`);
                        continue;
                    }

                    if (targetName === myNickname) {
                        // 如果目标是你自己
                        chat.settings.myGroupTitle = newTitle.trim();
                        console.log(`管理员/群主将用户 "${myNickname}" 的头衔设置为: "${newTitle.trim()}"`);
                    } else {
                        // 如果目标是其他成员
                        const targetMember = chat.members.find((m) => m.groupNickname === targetName);
                        if (targetMember) {
                            targetMember.groupTitle = newTitle.trim();
                            console.log(`管理员/群主将成员 "${targetName}" 的头衔设置为: "${newTitle.trim()}"`);
                        } else {
                            console.warn(`AI "${actorName}" 尝试设置头衔失败，因为找不到目标成员 "${targetName}"。`);
                            continue;
                        }
                    }

                    // 统一发送系统消息通知
                    await logTitleChange(chat.id, actorName, targetName, newTitle.trim());

                    // 刷新成员列表UI（如果打开了的话）
                    if (document.getElementById('member-management-screen').classList.contains('active')) {
                        renderMemberManagementList();
                    }

                    continue; // 后台操作，继续处理
                }

                case 'order_waimai_for_user': {
                    const { foodName, restaurant, price, greeting } = msgData;

                    // 1. 安全检查，确保AI给的数据是对的
                    if (!foodName || isNaN(price) || price <= 0) {
                        console.warn('AI尝试为你点外卖，但指令格式不正确:', msgData);
                        continue; // 跳过这条无效指令
                    }

                    // 2. 检查角色钱包余额
                    const charBalance = chat.characterPhoneData?.bank?.balance || 0;
                    if (charBalance < price) {
                        // 如果余额不足，就让AI发条消息告诉你
                        aiMessage = {
                            ...baseMessage,
                            content: `（小声）本来想给你点份“${foodName}”的，但是发现钱包空了...`,
                        };
                    } else {
                        // 3. 余额充足！执行扣款和下单逻辑
                        await window.updateCharacterBankBalance(chatId, -price, `为你点外卖: ${foodName}`);

                        const foodItem = await window.db.elemeFoods.where({ name: foodName, restaurant: restaurant || '私房小厨' }).first();
                        const imageUrl = foodItem ? foodItem.imageUrl : getRandomWaimaiImage();
                        // 4. 创建一个漂亮的外卖卡片消息
                        aiMessage = {
                            ...baseMessage,
                            type: 'waimai_gift_from_char',
                            content: `[外卖惊喜] 我给你点了份“${foodName}”，记得吃哦！`, // 这段文本主要用于历史记录和通知
                            payload: {
                                foodName: foodName,
                                restaurant: restaurant || '神秘小店',
                                price: price,
                                greeting: greeting || '给你点了个好吃的，快尝尝！',
                                foodImageUrl: imageUrl, // <-- 使用我们刚刚获取到的、正确的图片URL
                            },
                        };
                    }
                    break; // 结束这个case
                }

                case 'set_group_admin': {
                    const actorName = msgData.name;
                    const targetName = msgData.targetName;
                    const isAdmin = msgData.isAdmin;
                    const myNickname = chat.settings.myNickname || '我'; // 获取你自己的昵称

                    // 权限检查：确认操作者是群主
                    const actorMember = chat.members.find((m) => m.originalName === actorName);
                    if (!actorMember || chat.ownerId !== actorMember.id) {
                        console.warn(`AI "${actorName}" 尝试设置管理员失败，因为它不是群主。`);
                        continue; // 如果不是群主，就跳过此指令
                    }

                    if (targetName === myNickname) {
                        // 如果AI操作的目标是你自己
                        chat.settings.isUserAdmin = isAdmin;
                        console.log(`群主将用户 "${myNickname}" 设置为管理员: ${isAdmin}`);
                    } else {
                        // 如果AI操作的目标是其他成员
                        const targetMember = chat.members.find((m) => m.groupNickname === targetName);
                        if (targetMember) {
                            // 不能对群主进行操作
                            if (targetMember.id === chat.ownerId) {
                                console.warn(`AI "${actorName}" 尝试修改群主 "${targetName}" 的管理员身份，操作被阻止。`);
                                continue;
                            }
                            targetMember.isAdmin = isAdmin;
                            console.log(`群主将成员 "${targetName}" 设置为管理员: ${isAdmin}`);
                        } else {
                            // 如果在成员列表里也找不到目标，就跳过
                            console.warn(`AI "${actorName}" 尝试设置管理员失败，因为找不到目标成员 "${targetName}"。`);
                            continue;
                        }
                    }

                    // 统一发送系统消息通知
                    const actionText = isAdmin ? '设为管理员' : '取消了管理员身份';
                    await logSystemMessage(chat.id, `“${actorName}”将“${targetName}”${actionText}。`);

                    // 刷新成员列表UI（如果打开了的话）
                    if (document.getElementById('member-management-screen').classList.contains('active')) {
                        renderMemberManagementList();
                    }

                    continue; // 这是一个后台操作，继续处理AI可能返回的其他消息
                }

                case 'kick_member': {
                    const actorName = msgData.name;
                    const targetName = msgData.targetName;
                    const actorMember = chat.members.find((m) => m.originalName === actorName);

                    // 权限检查：只有群主能执行
                    if (actorMember && chat.ownerId === actorMember.id) {
                        const targetMemberIndex = chat.members.findIndex((m) => m.groupNickname === targetName);
                        if (targetMemberIndex > -1) {
                            const removedMember = chat.members.splice(targetMemberIndex, 1)[0];

                            // 将改动保存到数据库
                            await window.db.chats.put(chat);

                            // 发送系统通知（这行代码不变，但位置更合理了）
                            await logSystemMessage(chat.id, `“${actorName}”将“${removedMember.groupNickname}”移出了群聊。`);

                            // 如果当前正在成员管理页面，就刷新列表
                            if (document.getElementById('member-management-screen').classList.contains('active')) {
                                renderMemberManagementList();
                            }
                        }
                    }
                    continue; // 保持后台操作，继续处理
                }

                case 'dating_summary_card': {
                    bubble.classList.add('is-dating-summary'); // 应用透明气泡样式
                    const payload = msg.payload;
                    let cardClass = '';

                    // 根据卡片类型设置背景色
                    if (payload.ratingType === 'romantic') {
                        cardClass = 'romantic';
                    } else if (payload.ratingType === 'passionate') {
                        cardClass = 'passionate';
                    } else if (payload.ratingType === 'perfect') {
                        cardClass = 'perfect';
                    }

                    // 把 payload 字符串化后存入 data-* 属性，方便点击时读取
                    const payloadString = JSON.stringify(payload).replace(/'/g, '&apos;').replace(/"/g, '&quot;');

                    contentHtml = `
			            <div class="dating-summary-chat-card ${cardClass}" data-summary-payload='${payloadString}'>
			                <div class="rating">${payload.rating}</div>
			                <div class="tip">点击查看详情</div>
			            </div>
			        `;
                    break;
                }
                case 'set_group_announcement': {
                    const actorName = msgData.name;
                    const newAnnouncement = msgData.content;

                    if (!actorName || typeof newAnnouncement === 'undefined') {
                        console.warn('AI尝试修改公告失败，缺少必要参数。');
                        continue; // 指令不完整，跳过
                    }

                    // 1. 权限检查：必须确保执行操作的角色是群主或管理员
                    const actorMember = chat.members.find((m) => m.originalName === actorName);
                    if (!actorMember) {
                        console.warn(`AI尝试修改公告失败，找不到名为“${actorName}”的成员。`);
                        continue;
                    }

                    const isOwner = chat.ownerId === actorMember.id;
                    const isAdmin = actorMember.isAdmin;

                    if (!isOwner && !isAdmin) {
                        console.warn(`AI角色“${actorName}”权限不足，尝试修改群公告失败。`);
                        continue; // 没有权限，跳过
                    }

                    // 2. 更新公告内容
                    chat.settings.groupAnnouncement = newAnnouncement;
                    await window.db.chats.put(chat);

                    // 3. 发送一条系统消息，通知所有人群公告已更新
                    await logSystemMessage(chat.id, `“${actorMember.groupNickname}”修改了群公告。`);

                    // 这是一个后台管理操作，不需要在聊天中生成新的对话气泡，所以我们用 continue
                    continue;
                }

                case 'mute_member': {
                    const actorName = msgData.name;
                    const targetName = msgData.targetName;
                    const actorMember = chat.members.find((m) => m.originalName === actorName);
                    const targetMember = chat.members.find((m) => m.groupNickname === targetName);

                    if (actorMember && targetMember) {
                        const isActorOwner = chat.ownerId === actorMember.id;
                        const isActorAdmin = actorMember.isAdmin;
                        const isTargetOwner = chat.ownerId === targetMember.id;
                        const isTargetAdmin = targetMember.isAdmin;

                        // 权限检查：群主可以禁言管理员和普通人；管理员只能禁言普通人。
                        if ((isActorOwner && !isTargetOwner) || (isActorAdmin && !isTargetOwner && !isTargetAdmin)) {
                            // 发送系统消息
                            await logSystemMessage(chat.id, `“${actorName}”将“${targetName}”禁言。`);
                        } else {
                            console.warn(`AI (${actorName}) 权限不足，无法禁言 (${targetName})。`);
                        }
                    }
                    continue; // 这也是一个后台管理操作，继续处理AI可能返回的其他消息
                }

                case 'unmute_member': {
                    const actorName = msgData.name;
                    const targetName = msgData.targetName;
                    const actorMember = chat.members.find((m) => m.originalName === actorName);
                    const targetMember = chat.members.find((m) => m.groupNickname === targetName);

                    // 确保操作者和目标都存在
                    if (actorMember && targetMember) {
                        // 权限检查
                        const isActorOwner = chat.ownerId === actorMember.id;
                        const isActorAdmin = actorMember.isAdmin;
                        const isTargetOwner = chat.ownerId === targetMember.id;
                        const isTargetAdmin = targetMember.isAdmin;

                        // 只有群主和管理员有权限解禁
                        if (isActorOwner || isActorAdmin) {
                            // 设置 isMuted 为 false，实现解禁
                            targetMember.isMuted = false;

                            // 发送一条系统消息通知大家
                            await logSystemMessage(chat.id, `“${actorName}”解除了“${targetName}”的禁言。`);

                            // 如果当前正在成员管理页面，刷新列表
                            if (document.getElementById('member-management-screen').classList.contains('active')) {
                                renderMemberManagementList();
                            }
                        } else {
                            console.warn(`AI (${actorName}) 权限不足，无法解禁 (${targetName})。`);
                        }
                    }
                    continue; // 这也是一个后台管理操作，继续处理AI可能返回的其他消息
                }

                case 'weibo_post': {
                    const newPost = {
                        authorId: chatId,
                        authorType: 'char',
                        authorNickname: chat.name,
                        authorAvatar: chat.settings.aiAvatar || defaultAvatar,
                        content: msgData.content || '',
                        postType: msgData.postType || 'text_only',
                        hiddenContent: msgData.hiddenContent || '',
                        imageUrl: msgData.imageUrl || '',
                        imageDescription: msgData.imageDescription || '',
                        timestamp: Date.now(),
                        likes: [],
                        comments: [], // 先初始化为空数组
                        baseLikesCount: msgData.baseLikesCount || 0,
                        baseCommentsCount: msgData.baseCommentsCount || 0,
                    };

                    let commentsToProcess = [];

                    // 1. 优先处理新的、正确的【数组格式】
                    if (msgData.comments && Array.isArray(msgData.comments)) {
                        // 直接使用AI返回的数组
                        commentsToProcess = msgData.comments;
                    }
                    // 2. 兼容旧的【字符串格式】
                    else if (msgData.comments && typeof msgData.comments === 'string') {
                        // 如果是字符串，就按老方法解析
                        commentsToProcess = msgData.comments
                            .split('\n')
                            .map((c) => {
                                const parts = c.split(/[:：]/);
                                const commenter = parts.shift() || '路人';
                                const commentText = parts.join(':').trim();
                                return { authorNickname: commenter, commentText: commentText };
                            })
                            .filter((c) => c.commentText);
                    }

                    // 3. 为所有解析好的评论，统一添加前端需要的 commentId
                    if (commentsToProcess.length > 0) {
                        newPost.comments = commentsToProcess.map((c) => ({
                            commentId: 'comment_' + Date.now() + Math.random(), // 确保每条评论都有唯一ID
                            authorNickname: c.authorNickname,
                            commentText: c.commentText,
                            // 这里我们不再需要 authorId 和 timestamp，因为它们不是渲染所必需的
                        }));
                    }

                    await window.db.weiboPosts.add(newPost);

                    showNotification(chatId, `${chat.name} 发了一条新微博`);

                    if (document.getElementById('weibo-screen').classList.contains('active')) {
                        await renderFollowingWeiboFeed();
                    }

                    continue; // 这是后台操作，用 continue 跳过
                }

                case 'weibo_comment': {
                    // 这是一个AI评论微博的指令
                    const postIdToComment = msgData.postId;
                    const commentText = msgData.commentText;

                    // 1. 根据 postId 从数据库里找到那条微博
                    const postToComment = await window.db.weiboPosts.get(postIdToComment);

                    if (postToComment) {
                        // 2. 如果找到了微博，就准备一条新评论
                        if (!postToComment.comments) postToComment.comments = []; // 确保评论区存在
                        const newComment = {
                            commentId: 'comment_' + Date.now(), // 给评论一个独一无二的ID
                            authorId: chatId, // 评论者是当前AI
                            authorNickname: chat.name, // 评论者的名字
                            commentText: commentText, // 评论内容
                            timestamp: Date.now(), // 评论时间
                        };

                        // 3. 把新评论加到微博的评论列表里
                        postToComment.comments.push(newComment);

                        // 4. 把更新后的微博存回数据库
                        await window.db.weiboPosts.put(postToComment);

                        // 5. 刷新“我的微博”和“关注的人”两个列表，让新评论显示出来
                        await renderMyWeiboFeed();
                        await renderFollowingWeiboFeed();
                    }
                    continue; // 处理完后，继续处理AI可能返回的其他指令
                }
                case 'weibo_reply': {
                    // 这是一个AI回复微博评论的指令
                    const postIdToReply = msgData.postId;
                    const commentIdToReply = msgData.commentId;
                    const replyText = msgData.replyText;

                    const postToReply = await window.db.weiboPosts.get(postIdToReply);

                    if (postToReply && postToReply.comments) {
                        // 1. 在微博的评论区里，找到被回复的那条评论
                        const targetComment = postToReply.comments.find((c) => c.commentId === commentIdToReply);

                        if (targetComment) {
                            // 2. 准备一条新的“回复”
                            const newReply = {
                                commentId: 'comment_' + Date.now(),
                                authorId: chatId,
                                authorNickname: chat.name,
                                commentText: replyText,
                                timestamp: Date.now(),
                                replyToId: commentIdToReply, // 标记这是对哪条评论的回复
                                replyToNickname: targetComment.authorNickname, // 记下被回复人的名字
                            };
                            postToReply.comments.push(newReply);
                            await window.db.weiboPosts.put(postToReply);

                            // 3. 同样，刷新所有列表
                            await renderMyWeiboFeed();
                            await renderFollowingWeiboFeed();
                        }
                    }
                    continue; // 继续处理
                }
                case 'lovers_space_response': {
                    const invitationMsg = chat.history.find((m) => m.type === 'lovers_space_invitation' && m.status === 'pending');
                    if (invitationMsg) {
                        invitationMsg.status = msgData.decision === 'accept' ? 'accepted' : 'rejected';

                        // 1. 创建AI想说的那句话的消息
                        if (msgData.responseText) {
                            const responseMessage = {
                                ...baseMessage, // 复用时间戳和发送者信息
                                type: 'text',
                                content: msgData.responseText,
                            };
                            chat.history.push(responseMessage);
                            if (isViewingThisChat) {
                                appendMessage(responseMessage, chat);
                            }
                        }

                        // 2. 根据同意或拒绝，执行后续操作
                        if (msgData.decision === 'accept') {
                            chat.loversSpaceData = {
                                background: 'https://i.postimg.cc/k495F4W5/profile-banner.jpg',
                                relationshipStartDate: null,
                                moments: [],
                                photos: [],
                                albums: [],
                                loveLetters: [],
                                shares: [],
                                questions: [],
                            };
                            const systemNotice = {
                                role: 'system',
                                type: 'pat_message',
                                content: `[系统：你和“${chat.name}”的情侣空间已成功开启！]`,
                                timestamp: Date.now(),
                            };
                            chat.history.push(systemNotice);
                            if (isViewingThisChat) {
                                appendMessage(systemNotice, chat);
                            }
                        }
                    }
                    // 处理完后，不再需要重新触发AI，所以我们用 continue
                    continue;
                }

                case 'interact_with_pet': {
                    const pet = chat.settings.pet;
                    if (pet && pet.type !== '无') {
                        let actionText = '';
                        // 根据AI的互动，修改数值
                        switch (msgData.action) {
                            case 'feed':
                                pet.status.hunger = Math.min(100, (pet.status.hunger || 0) + 20);
                                pet.status.happiness = Math.min(100, (pet.status.happiness || 0) + 5);
                                // AI喂食，增加对AI的亲密度
                                pet.status.intimacyToChar = Math.min(100, (pet.status.intimacyToChar || 0) + 10);
                                actionText = `${chat.name} 喂了 ${pet.name} 一些食物。`;
                                break;
                            case 'play':
                                pet.status.hunger = Math.max(0, (pet.status.hunger || 0) - 10);
                                pet.status.happiness = Math.min(100, (pet.status.happiness || 0) + 15);
                                // AI玩耍，增加对AI的亲密度
                                pet.status.intimacyToChar = Math.min(100, (pet.status.intimacyToChar || 0) + 15);
                                actionText = `${chat.name} 陪 ${pet.name} 玩了一会儿。`;
                                break;
                            case 'touch':
                                pet.status.happiness = Math.min(100, (pet.status.happiness || 0) + 10);
                                // 核心修改：AI抚摸，增加对AI的亲密度
                                pet.status.intimacyToChar = Math.min(100, (pet.status.intimacyToChar || 0) + 5);
                                actionText = `${chat.name} 轻轻地抚摸了 ${pet.name}。`;
                                break;
                        }

                        // 创建一条对用户可见的系统消息
                        const visibleMessage = {
                            role: 'system',
                            type: 'pat_message',
                            content: `[系统：${actionText}]`,
                            timestamp: Date.now(),
                        };
                        chat.history.push(visibleMessage);
                        if (isViewingThisChat) {
                            appendMessage(visibleMessage, chat);
                        }

                        // 如果 AI 在互动后还想说点什么
                        if (msgData.response) {
                            aiMessage = { ...baseMessage, content: msgData.response };
                        }
                    }
                    // 如果AI只是互动没说话，就不创建aiMessage，直接跳到下一个指令
                    if (!aiMessage) {
                        continue;
                    }
                    break;
                }

                case 'talk_to_pet': {
                    if (!chat.isGroup && chat.settings.pet && chat.settings.pet.type !== '无') {
                        const pet = chat.settings.pet;

                        // 同时兼容 content 和 message 字段
                        const charMessageContent = msgData.content || msgData.message;
                        if (!charMessageContent) continue; // 如果没内容，就跳过

                        // 将Char的话添加到宠物聊天记录
                        const charMessageToPet = {
                            sender: 'char',
                            senderName: chat.name,
                            content: charMessageContent,
                        };
                        pet.petChatHistory.push(charMessageToPet);

                        // 获取宠物的回应
                        const petResponseToChar = await getPetApiResponse(pet);
                        if (petResponseToChar) {
                            pet.petChatHistory.push({ sender: 'pet', content: petResponseToChar });
                        }

                        // 创建对用户可见的系统日志
                        const visibleLog = `[系统：“${chat.name}”对宠物“${pet.name}”说：“${charMessageContent}”，它回应：“${petResponseToChar || '(没有回应)'}”。]`;
                        const visibleMessage = {
                            role: 'system',
                            type: 'pat_message',
                            content: visibleLog,
                            timestamp: messageTimestamp++,
                        };
                        chat.history.push(visibleMessage);

                        if (isViewingThisChat) {
                            appendMessage(visibleMessage, chat);
                        }
                    }
                    continue;
                }

                case 'cart_payment_response': {
                    const decision = msgData.decision;
                    const responseText = msgData.response_text;

                    // 找到用户发出的、还处于“等待中”的那个代付请求
                    const requestMsg = chat.history.find((m) => m.type === 'cart_share_request' && m.payload.status === 'pending');
                    if (!requestMsg) continue; // 如果找不到，说明请求可能已被处理，跳过

                    if (decision === 'accept') {
                        const totalPrice = requestMsg.payload.totalPrice;
                        const charBalance = chat.characterPhoneData?.bank?.balance || 0;

                        // 再次确认AI的余额是否足够
                        if (charBalance < totalPrice) {
                            // 如果AI想付但钱不够，就让它说一句俏皮话
                            aiMessage = { ...baseMessage, content: responseText || '呜呜，想给你买，但是我的钱包空空了...' };
                        } else {
                            // 钱够，执行代付流程！
                            requestMsg.payload.status = 'paid';

                            // 使用 await 确保这些数据库操作按顺序完成
                            await updateCharacterPhoneBankBalance(chat.id, -totalPrice, `为“我”的桃宝购物车买单`);
                            const cartItems = await window.db.taobaoCart.toArray();
                            await createOrdersFromCart(cartItems);
                            await clearTaobaoCart();

                            // 创建AI的回复消息
                            aiMessage = { ...baseMessage, content: responseText || '买好啦，快去订单里看看吧！' };
                        }
                    } else {
                        // 如果AI决定拒绝
                        requestMsg.payload.status = 'rejected';
                        aiMessage = { ...baseMessage, content: responseText || '这次就算了吧，下次一定！' };
                    }

                    // 将AI的回复消息推入历史记录，并更新UI
                    if (aiMessage) {
                        chat.history.push(aiMessage);
                    }

                    // 重新渲染聊天界面，以更新代付卡片的状态
                    if (isViewingThisChat) {
                        renderChatInterface(chatId);
                    }
                    // 跳过后续的默认消息处理
                    continue;
                }

                case 'buy_gift_for_user': {
                    // 1. 从商品数据库中获取所有已添加的商品
                    const allProducts = await window.db.taobaoProducts.toArray();

                    // 如果桃宝里一件商品都没有，AI就发条消息吐槽一下
                    if (allProducts.length === 0) {
                        aiMessage = {
                            ...baseMessage,
                            content: msgData.greeting ? `${msgData.greeting} ...啊，想给你买点什么，但是桃宝里空空如也呢...` : '想给你买个礼物，但是桃宝现在没东西卖了。',
                        };
                        break; // 跳出 case，让这条文本消息被正常处理和显示
                    }

                    // 2. 从所有商品中随机挑选一件作为礼物
                    const productToBuy = getRandomItem(allProducts);

                    // 3. 检查角色的钱包余额是否足够
                    const charBalance = chat.characterPhoneData?.bank?.balance || 0;
                    if (charBalance < productToBuy.price) {
                        // 余额不足，AI也会发消息告诉你
                        aiMessage = {
                            ...baseMessage,
                            content: msgData.greeting ? `${msgData.greeting} ...哎呀，我的钱包好像不够了。` : '我想给你买个礼物，但是钱包空了...',
                        };
                        break;
                    }

                    // 4. 余额充足！执行购买流程
                    // 4a. 从角色的钱包扣款，并生成一条交易记录
                    await updateCharacterPhoneBankBalance(chat.id, -productToBuy.price, `为“我”购买礼物: ${productToBuy.name}`);

                    // 4b. 在你的“我的订单”中创建一条新订单
                    const newOrder = {
                        productId: productToBuy.id,
                        quantity: 1,
                        timestamp: Date.now(),
                        status: '已付款，等待发货',
                    };
                    await window.db.taobaoOrders.add(newOrder);

                    // 4c. 创建一个漂亮的“礼物通知”卡片消息，发送给你
                    aiMessage = {
                        ...baseMessage, // 复用基础消息属性（发送者、时间戳等）
                        type: 'gift_notification',
                        // 这是卡片渲染需要的数据
                        payload: {
                            senderName: chat.name,
                            itemSummary: `${productToBuy.name} x1`,
                            totalPrice: productToBuy.price,
                            itemCount: 1,
                        },
                        // 这是给AI自己看的、用于形成记忆的文本内容
                        content: `我给你买了礼物“${productToBuy.name}”。${msgData.greeting || ''}`,
                    };

                    // 4d. 模拟一个10秒后的“已发货”物流更新
                    setTimeout(async () => {
                        const orderToUpdate = await window.db.taobaoOrders.where({ timestamp: newOrder.timestamp }).first();
                        if (orderToUpdate) {
                            await window.db.taobaoOrders.update(orderToUpdate.id, { status: '已发货，运输中' });
                        }
                    }, 1000 * 10);

                    break; // 完成礼物购买逻辑，跳出 case
                }

                case 'ls_answer_question': {
                    // 使用大括号创建块级作用域
                    const { questionId, answerText } = msgData;
                    if (questionId && answerText) {
                        const question = chat.loversSpaceData.questions.find((q) => q.id === questionId);
                        if (question && !question.answerText) {
                            // 确保是未回答的问题
                            question.answerer = 'char';
                            question.answerText = answerText;
                            console.log(`AI 回答了情侣提问 (ID: ${questionId})`);
                        }
                    }
                    continue; // 这是一个后台操作，不需要在聊天界面显示，所以用 continue 跳过
                }

                case 'ls_ask_question': {
                    const { questionText } = msgData;
                    if (questionText) {
                        const newQuestion = {
                            id: 'q_' + Date.now(),
                            questioner: 'char',
                            questionText: questionText,
                            timestamp: Date.now(),
                            answerer: 'user', // 指定由用户来回答
                            answerText: null,
                        };
                        if (!chat.loversSpaceData.questions) {
                            chat.loversSpaceData.questions = [];
                        }
                        chat.loversSpaceData.questions.push(newQuestion);
                        console.log(`AI 发起了一个情侣提问: ${questionText}`);
                    }
                    continue; // 同样是后台操作
                }

                case 'ls_moment': {
                    if (chat.loversSpaceData) {
                        if (!chat.loversSpaceData.moments) {
                            chat.loversSpaceData.moments = [];
                        }
                        const newMoment = {
                            author: 'char', // 标记是AI发的
                            content: msgData.content,
                            timestamp: Date.now(),
                            comments: [], // 为新说说初始化一个空的评论区
                        };
                        chat.loversSpaceData.moments.push(newMoment);
                        console.log(`AI 在情侣空间发布了说说: ${msgData.content}`);
                    }
                    continue; // 这是一个后台操作，不需要在聊天界面显示，所以用 continue 跳过
                }

                case 'ls_comment': {
                    const { momentIndex, commentText } = msgData;
                    if (chat.loversSpaceData && chat.loversSpaceData.moments) {
                        // AI返回的 index 是从0开始代表最新的，我们需要转换成真实索引
                        const realIndex = chat.loversSpaceData.moments.length - 1 - momentIndex;
                        if (realIndex >= 0 && realIndex < chat.loversSpaceData.moments.length) {
                            const momentToComment = chat.loversSpaceData.moments[realIndex];
                            if (!momentToComment.comments) {
                                momentToComment.comments = [];
                            }
                            momentToComment.comments.push({
                                author: chat.name,
                                text: commentText,
                            });
                            console.log(`AI 评论了情侣空间说说 (索引: ${realIndex}): ${commentText}`);
                        }
                    }
                    continue; // 同样是后台操作
                }
                case 'ls_photo': {
                    // 这是处理AI发相册的逻辑
                    if (chat.loversSpaceData) {
                        if (!chat.loversSpaceData.photos) {
                            chat.loversSpaceData.photos = [];
                        }
                        const newPhoto = {
                            author: 'char',
                            type: 'text_image',
                            description: msgData.description,
                            timestamp: Date.now(),
                        };
                        chat.loversSpaceData.photos.push(newPhoto);
                        console.log(`AI 在情侣空间发布了照片(文字图): ${msgData.description}`);
                    }
                    continue; // 继续处理AI可能返回的其他指令
                }

                case 'ls_letter': {
                    // 这是处理AI写情书的逻辑
                    if (chat.loversSpaceData) {
                        if (!chat.loversSpaceData.loveLetters) {
                            chat.loversSpaceData.loveLetters = [];
                        }
                        const newLetter = {
                            id: 'letter_' + Date.now(),
                            senderId: chat.id,
                            senderName: chat.name,
                            senderAvatar: chat.settings.aiAvatar,
                            recipientName: chat.settings.myNickname || '我',
                            recipientAvatar: chat.settings.myAvatar,
                            content: msgData.content,
                            timestamp: Date.now(),
                        };
                        chat.loversSpaceData.loveLetters.push(newLetter);
                        console.log(`AI 在情侣空间写了情书: ${msgData.content}`);
                    }
                    continue; // 继续处理AI可能返回的其他指令
                }

                case 'ls_diary_entry': {
                    const { emoji, diary } = msgData;
                    if (emoji && diary) {
                        const today = new Date().toISOString().split('T')[0]; // 获取 YYYY-MM-DD 格式的今天日期

                        // 确保数据结构存在
                        if (!chat.loversSpaceData.emotionDiaries) {
                            chat.loversSpaceData.emotionDiaries = {};
                        }
                        if (!chat.loversSpaceData.emotionDiaries[today]) {
                            chat.loversSpaceData.emotionDiaries[today] = {};
                        }

                        // 保存AI的日记和表情
                        chat.loversSpaceData.emotionDiaries[today].charEmoji = emoji;
                        chat.loversSpaceData.emotionDiaries[today].charDiary = diary;

                        console.log(`AI 在情侣空间记录了日记: ${emoji} ${diary}`);
                    }
                    continue; // 这只是一个后台操作，不需要在聊天界面生成消息，所以用 continue 跳过
                }

                case 'ls_share': {
                    if (chat.loversSpaceData) {
                        if (!chat.loversSpaceData.shares) {
                            chat.loversSpaceData.shares = [];
                        }
                        const newShare = {
                            author: 'char', // 标记是AI发的
                            timestamp: Date.now(),
                            ...msgData, // 将AI返回的所有分享信息（type, shareType, title, artist等）都复制过来
                        };
                        chat.loversSpaceData.shares.push(newShare);
                        console.log(`AI 在情侣空间分享了 [${msgData.shareType}]: ${msgData.title}`);
                    }
                    continue; // 同样是后台操作
                }

                // 这是AI主动发起邀请的逻辑
                case 'lovers_space_invitation': {
                    // 检查是否已经开启，防止AI重复邀请
                    if (!chat.loversSpaceData) {
                        aiMessage = {
                            ...baseMessage,
                            type: 'lovers_space_invitation',
                            content: `${chat.name} 向你发出了一个情侣空间邀请`, // 这句话主要用于调试和历史记录
                            status: 'pending', // 状态：pending, accepted, rejected
                        };
                    }
                    // 如果AI已经发了邀请，这里就不再创建aiMessage，相当于跳过
                    break;
                }

                // 这是AI回应你的邀请的逻辑
                case 'lovers_space_response': {
                    const invitationMsg = chat.history.find((m) => m.type === 'lovers_space_invitation' && m.status === 'pending');
                    if (invitationMsg) {
                        invitationMsg.status = msgData.decision === 'accept' ? 'accepted' : 'rejected';

                        // 1. 创建AI想说的那句话的消息
                        if (msgData.responseText) {
                            const responseMessage = {
                                ...baseMessage,
                                type: 'text',
                                content: msgData.responseText,
                            };
                            chat.history.push(responseMessage);
                            if (isViewingThisChat) {
                                appendMessage(responseMessage, chat);
                            }
                        }

                        // 2. 根据同意或拒绝，执行后续操作
                        if (msgData.decision === 'accept') {
                            // 同意后，为这个角色创建情侣空间数据
                            chat.loversSpaceData = {
                                background: 'https://i.postimg.cc/k495F4W5/profile-banner.jpg',
                                relationshipStartDate: null,
                                moments: [],
                                photos: [],
                                albums: [],
                                loveLetters: [],
                                shares: [],
                                questions: [],
                            };
                            // 并发送一条系统通知
                            const systemNotice = {
                                role: 'system',
                                type: 'pat_message',
                                content: `[系统：你和“${chat.name}”的情侣空间已成功开启！]`,
                                timestamp: Date.now(),
                            };
                            chat.history.push(systemNotice);
                            if (isViewingThisChat) {
                                appendMessage(systemNotice, chat);
                            }
                        }
                    }
                    // 处理完后，不再需要生成新的aiMessage，所以用 continue 跳过
                    continue;
                }

                case 'qzone_post':
                    const newPost = {
                        type: msgData.postType,
                        content: msgData.content || '',
                        publicText: msgData.publicText || '',
                        hiddenContent: msgData.hiddenContent || '',
                        timestamp: Date.now(),
                        authorId: chatId,
                        authorGroupId: chat.groupId,
                        visibleGroupIds: null,
                    };

                    // 如果是realimag类型，生成真实图片URL（支持1-9张图片）
                    if (msgData.postType === 'realimag' && msgData.prompt) {
                        // 支持 prompt 为数组（多张图片）或字符串（单张图片）
                        const prompts = Array.isArray(msgData.prompt) ? msgData.prompt.slice(0, 9) : [msgData.prompt];

                        const pollApiKey = state.apiConfig.pollinationsApiKey;
                        const generatedImageUrls = [];

                        // 使用 Promise.all 并行处理请求，提高速度
                        await Promise.all(
                            prompts.map(async (prompt) => {
                                const encodedPrompt = encodeURIComponent(prompt);
                                const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=1024&height=1024`;

                                try {
                                    if (pollApiKey) {
                                        // 如果有 Key，使用 fetch 获取并转为 Base64
                                        const res = await fetch(url, {
                                            headers: {
                                                Authorization: `Bearer ${pollApiKey}`,
                                            },
                                        });
                                        if (res.ok) {
                                            const blob = await res.blob();
                                            const base64 = await new Promise((resolve) => {
                                                const reader = new FileReader();
                                                reader.onloadend = () => resolve(reader.result);
                                                reader.readAsDataURL(blob);
                                            });
                                            generatedImageUrls.push(base64);
                                        } else {
                                            console.warn(`Pollinations fetch failed: ${res.status}, falling back to URL`);
                                            generatedImageUrls.push(url);
                                        }
                                    } else {
                                        // 没有 Key，直接使用 URL
                                        generatedImageUrls.push(url);
                                    }
                                } catch (e) {
                                    console.error('Pollinations image generation error:', e);
                                    generatedImageUrls.push(url); // 出错时回退到 URL 尝试
                                }
                            }),
                        );

                        newPost.imageUrls = generatedImageUrls;

                        // 保持向后兼容，单张图片时也设置 imageUrl
                        if (generatedImageUrls.length === 1) {
                            newPost.imageUrl = generatedImageUrls[0];
                        }

                        newPost.prompt = msgData.prompt;
                        newPost.imageCount = generatedImageUrls.length;
                        console.log(`动态RealImag图片生成完成: ${generatedImageUrls.length}张`);
                    }

                    // 如果是naiimag类型，调用NovelAI API生成高质量图片（限制最多2张）
                    if (msgData.postType === 'naiimag' && msgData.prompt) {
                        try {
                            // 支持 prompt 为数组（多张图片）或字符串（单张图片）
                            // 动态限制最多2张NAI图片
                            const prompts = Array.isArray(msgData.prompt) ? msgData.prompt.slice(0, 2) : [msgData.prompt];
                            console.log(`📸 动态NovelAI图片生成开始，共${prompts.length}张图片`);

                            // 存储生成的图片URL
                            const generatedImageUrls = [];

                            // 逐个生成图片
                            for (let i = 0; i < prompts.length; i++) {
                                const aiPrompt = prompts[i];
                                console.log(`生成第${i + 1}张图片，prompt:`, aiPrompt);

                                // 获取角色的NAI提示词配置（系统或角色专属）
                                const naiPrompts = getCharacterNAIPrompts(chat.id);

                                // 构建最终的提示词：AI的prompt + 配置的提示词
                                const finalPositivePrompt = aiPrompt + ', ' + naiPrompts.positive;
                                const finalNegativePrompt = naiPrompts.negative;

                                console.log(`📝 使用${naiPrompts.source === 'character' ? '角色专属' : '系统'}提示词配置`);
                                console.log('最终正面提示词:', finalPositivePrompt);
                                console.log('最终负面提示词:', finalNegativePrompt);

                                // 获取NAI设置（从localStorage读取）
                                const apiKey = localStorage.getItem('novelai-api-key');
                                const model = localStorage.getItem('novelai-model') || 'nai-diffusion-4-5-full';
                                const settings = getNovelAISettings();

                                if (!apiKey) {
                                    throw new Error('NovelAI API Key未配置。请在NovelAI设置中填写API Key。');
                                }

                                const [width, height] = settings.resolution.split('x').map(Number);

                                // ★★★ V4/V4.5 和 V3 使用不同的请求体格式 ★★★
                                let requestBody;

                                if (model.includes('nai-diffusion-4')) {
                                    // V4/V4.5 使用新格式 (params_version: 3)
                                    requestBody = {
                                        input: finalPositivePrompt,
                                        model: model,
                                        action: 'generate',
                                        parameters: {
                                            params_version: 3, // V4必须使用版本3
                                            width: width,
                                            height: height,
                                            scale: settings.cfg_scale,
                                            sampler: settings.sampler,
                                            steps: settings.steps,
                                            seed: settings.seed === -1 ? Math.floor(Math.random() * 9999999999) : settings.seed,
                                            n_samples: 1,
                                            ucPreset: settings.uc_preset,
                                            qualityToggle: settings.quality_toggle,
                                            autoSmea: false,
                                            dynamic_thresholding: false,
                                            controlnet_strength: 1,
                                            legacy: false,
                                            add_original_image: true,
                                            cfg_rescale: 0,
                                            noise_schedule: 'karras', // V4使用karras
                                            legacy_v3_extend: false,
                                            skip_cfg_above_sigma: null,
                                            use_coords: false,
                                            legacy_uc: false,
                                            normalize_reference_strength_multiple: true,
                                            inpaintImg2ImgStrength: 1,
                                            characterPrompts: [],
                                            // V4专用提示词格式
                                            v4_prompt: {
                                                caption: {
                                                    base_caption: finalPositivePrompt,
                                                    char_captions: [],
                                                },
                                                use_coords: false,
                                                use_order: true,
                                            },
                                            // V4专用负面提示词格式
                                            v4_negative_prompt: {
                                                caption: {
                                                    base_caption: finalNegativePrompt,
                                                    char_captions: [],
                                                },
                                                legacy_uc: false,
                                            },
                                            negative_prompt: finalNegativePrompt,
                                            deliberate_euler_ancestral_bug: false,
                                            prefer_brownian: true,
                                            // 注意：不包含 stream 参数，使用标准ZIP响应而非msgpack流
                                        },
                                    };
                                } else {
                                    // V3 及更早版本使用旧格式
                                    requestBody = {
                                        input: finalPositivePrompt,
                                        model: model,
                                        action: 'generate',
                                        parameters: {
                                            width: width,
                                            height: height,
                                            scale: settings.cfg_scale,
                                            sampler: settings.sampler,
                                            steps: settings.steps,
                                            seed: settings.seed === -1 ? Math.floor(Math.random() * 9999999999) : settings.seed,
                                            n_samples: 1,
                                            ucPreset: settings.uc_preset,
                                            qualityToggle: settings.quality_toggle,
                                            sm: settings.smea,
                                            sm_dyn: settings.smea_dyn,
                                            dynamic_thresholding: false,
                                            controlnet_strength: 1,
                                            legacy: false,
                                            add_original_image: false,
                                            cfg_rescale: 0,
                                            noise_schedule: 'native',
                                            negative_prompt: finalNegativePrompt,
                                        },
                                    };
                                }

                                console.log('🚀 发送NAI请求:', requestBody);

                                // 根据模型选择不同的API端点
                                let apiUrl;

                                // V4/V4.5 模型使用流式端点
                                if (model.includes('nai-diffusion-4')) {
                                    // V4/V4.5 默认使用流式端点
                                    apiUrl = 'https://image.novelai.net/ai/generate-image-stream';
                                } else {
                                    // V3 及更早版本使用标准端点
                                    apiUrl = 'https://image.novelai.net/ai/generate-image';
                                }

                                let corsProxy = settings.cors_proxy;

                                // 如果选择了自定义代理，使用自定义URL
                                if (corsProxy === 'custom') {
                                    corsProxy = settings.custom_proxy_url || '';
                                }

                                // 如果有代理，添加到URL前面
                                if (corsProxy && corsProxy !== '') {
                                    apiUrl = corsProxy + encodeURIComponent(apiUrl);
                                }

                                const response = await fetch(apiUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: 'Bearer ' + apiKey,
                                    },
                                    body: JSON.stringify(requestBody),
                                });

                                console.log('Response status:', response.status);
                                console.log('Response headers:', [...response.headers.entries()]);

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('API错误响应:', errorText);
                                    throw new Error(`API请求失败 (${response.status}): ${errorText}`);
                                }

                                // NovelAI API返回的是ZIP文件，需要解压
                                const contentType = response.headers.get('content-type');
                                console.log('Content-Type:', contentType);

                                // 检查是否为 SSE 流式响应
                                let zipBlob;
                                let imageDataUrl;
                                if (contentType && contentType.includes('text/event-stream')) {
                                    console.log('检测到 SSE 流式响应，开始解析...');

                                    // 读取整个流
                                    const text = await response.text();
                                    console.log('收到 SSE 数据，大小:', text.length);

                                    // 解析 SSE 格式，提取最后的 data: 行
                                    const lines = text.trim().split('\n');
                                    let base64Data = null;

                                    for (let i = lines.length - 1; i >= 0; i--) {
                                        const line = lines[i].trim();
                                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                            const dataContent = line.substring(6); // 移除 'data: ' 前缀

                                            // 尝试解析 JSON
                                            try {
                                                const jsonData = JSON.parse(dataContent);

                                                // V4.5 流式端点：event_type 为 "final" 时包含最终图片
                                                if (jsonData.event_type === 'final' && jsonData.image) {
                                                    base64Data = jsonData.image;
                                                    console.log('✅ 找到 final 事件的图片数据');
                                                    break;
                                                }

                                                // 兼容其他格式
                                                if (jsonData.data) {
                                                    base64Data = jsonData.data;
                                                    console.log('从 JSON.data 中提取图片数据');
                                                    break;
                                                }
                                                if (jsonData.image) {
                                                    base64Data = jsonData.image;
                                                    console.log('从 JSON.image 中提取图片数据');
                                                    break;
                                                }
                                            } catch (e) {
                                                // 如果不是 JSON，直接作为 base64 数据
                                                base64Data = dataContent;
                                                console.log('直接使用 base64 数据');
                                                break;
                                            }
                                        }
                                    }

                                    if (!base64Data) {
                                        throw new Error('无法从 SSE 响应中提取图片数据');
                                    }

                                    // V4.5 流式端点返回的是 PNG base64，不是 ZIP
                                    // 检查是否为 PNG (以 iVBORw0KGgo 开头) 或 JPEG (以 /9j/ 开头)
                                    const isPNG = base64Data.startsWith('iVBORw0KGgo');
                                    const isJPEG = base64Data.startsWith('/9j/');

                                    if (isPNG || isJPEG) {
                                        console.log('✅ 检测到直接的图片 base64 数据 (PNG/JPEG)');
                                        // 将 base64 转为 Blob
                                        const binaryString = atob(base64Data);
                                        const bytes = new Uint8Array(binaryString.length);
                                        for (let i = 0; i < binaryString.length; i++) {
                                            bytes[i] = binaryString.charCodeAt(i);
                                        }
                                        const imageBlob = new Blob([bytes], { type: isPNG ? 'image/png' : 'image/jpeg' });
                                        console.log('图片 Blob 创建成功，大小:', imageBlob.size);

                                        // 转换为dataURL用于后续处理
                                        const reader = new FileReader();
                                        imageDataUrl = await new Promise((resolve, reject) => {
                                            reader.onloadend = () => resolve(reader.result);
                                            reader.onerror = reject;
                                            reader.readAsDataURL(imageBlob);
                                        });
                                        console.log('✅ 图片转换成功！🎨');
                                    } else {
                                        // 否则当作 ZIP 处理
                                        console.log('当作 ZIP 文件处理...');
                                        const binaryString = atob(base64Data);
                                        const bytes = new Uint8Array(binaryString.length);
                                        for (let i = 0; i < binaryString.length; i++) {
                                            bytes[i] = binaryString.charCodeAt(i);
                                        }
                                        zipBlob = new Blob([bytes]);
                                        console.log('ZIP Blob 大小:', zipBlob.size);
                                    }
                                } else {
                                    // 非流式响应，直接读取
                                    zipBlob = await response.blob();
                                    console.log('收到数据，类型:', zipBlob.type, '大小:', zipBlob.size);
                                }

                                // 如果还没有imageDataUrl（即需要解压ZIP）
                                if (!imageDataUrl && zipBlob) {
                                    // NovelAI始终返回ZIP格式，需要解压
                                    try {
                                        // 检查JSZip是否已加载
                                        if (typeof JSZip === 'undefined') {
                                            throw new Error('JSZip库未加载，请刷新页面重试');
                                        }

                                        // 解压ZIP文件
                                        const zip = await JSZip.loadAsync(zipBlob);
                                        console.log('ZIP文件内容:', Object.keys(zip.files));

                                        // 查找第一个图片文件（通常是image_0.png）
                                        let imageFile = null;
                                        for (let filename in zip.files) {
                                            if (filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
                                                imageFile = zip.files[filename];
                                                console.log('找到图片文件:', filename);
                                                break;
                                            }
                                        }

                                        if (!imageFile) {
                                            throw new Error('ZIP文件中未找到图片');
                                        }

                                        // 提取图片数据
                                        const imageBlob = await imageFile.async('blob');
                                        console.log('提取的图片大小:', imageBlob.size);

                                        // 创建图片URL
                                        const reader = new FileReader();
                                        imageDataUrl = await new Promise((resolve, reject) => {
                                            reader.onloadend = () => resolve(reader.result);
                                            reader.onerror = reject;
                                            reader.readAsDataURL(imageBlob);
                                        });
                                        console.log('✅ 图片解压成功！');
                                    } catch (zipError) {
                                        console.error('ZIP解压失败:', zipError);
                                        throw new Error('图片解压失败: ' + zipError.message);
                                    }
                                }

                                console.log(`✅ NAI图片${i + 1}生成成功！`);
                                generatedImageUrls.push(imageDataUrl);
                            }

                            // 将生成的图片URL保存到动态中
                            newPost.imageUrls = generatedImageUrls;

                            // 保持向后兼容，单张图片时也设置 imageUrl
                            if (generatedImageUrls.length === 1) {
                                newPost.imageUrl = generatedImageUrls[0];
                            }

                            newPost.prompt = msgData.prompt;
                            newPost.imageCount = generatedImageUrls.length;
                            console.log(`✅ 动态NovelAI图片全部生成完成: ${generatedImageUrls.length}张`);
                        } catch (error) {
                            console.error('❌ 动态NAI图片生成失败:', error);
                            // 失败时仍然发布动态，但添加错误信息
                            newPost.content = (newPost.content || newPost.publicText || '') + `\n[图片生成失败: ${error.message}]`;
                        }
                    }

                    await window.db.qzonePosts.add(newPost);
                    updateUnreadIndicator(window.unreadPostsCount + 1);
                    if (isViewingThisChat && document.getElementById('qzone-screen').classList.contains('active')) {
                        await renderQzonePosts();
                    }
                    continue;

                case 'qzone_comment':
                    const postToComment = await window.db.qzonePosts.get(parseInt(msgData.postId));
                    if (postToComment) {
                        if (!postToComment.comments) postToComment.comments = [];

                        const newAiComment = {
                            commenterName: msgData.commenterName || chat.name,
                            text: msgData.commentText,
                            timestamp: Date.now(),
                        };

                        // 检查AI是否指定了回复对象
                        if (msgData.replyTo) {
                            newAiComment.replyTo = msgData.replyTo;
                        }

                        postToComment.comments.push(newAiComment);
                        await window.db.qzonePosts.update(postToComment.id, { comments: postToComment.comments });
                        updateUnreadIndicator(window.unreadPostsCount + 1);
                        if (isViewingThisChat && document.getElementById('qzone-screen').classList.contains('active')) {
                            await renderQzonePosts();
                        }
                    }
                    continue;

                // 群聊中发送naiimag的完整逻辑
                case 'naiimag':
                    // NovelAI图片分享 - 调用NovelAI API生成高质量图片
                    try {
                        console.log('📸 NovelAI图片生成开始，AI提供的prompt:', msgData.prompt);

                        // 获取角色的NAI提示词配置（系统或角色专属）
                        const naiPrompts = getCharacterNAIPrompts(chat.id);

                        // 构建最终的提示词：AI的prompt + 配置的提示词
                        const aiPrompt = msgData.prompt || 'a beautiful scene';
                        const finalPositivePrompt = aiPrompt + ', ' + naiPrompts.positive;
                        const finalNegativePrompt = naiPrompts.negative;

                        console.log(`📝 使用${naiPrompts.source === 'character' ? '角色专属' : '系统'}提示词配置`);
                        console.log('最终正面提示词:', finalPositivePrompt);
                        console.log('最终负面提示词:', finalNegativePrompt);

                        // 获取NAI设置（从localStorage读取）
                        const apiKey = localStorage.getItem('novelai-api-key');
                        const model = localStorage.getItem('novelai-model') || 'nai-diffusion-4-5-full';
                        const settings = getNovelAISettings();
                        if (!apiKey) {
                            throw new Error('NovelAI API Key未配置。请在NovelAI设置中填写API Key。');
                        }

                        const [width, height] = settings.resolution.split('x').map(Number);

                        // ★★★ V4/V4.5 和 V3 使用不同的请求体格式 ★★★
                        let requestBody;

                        if (model.includes('nai-diffusion-4')) {
                            // V4/V4.5 使用新格式 (params_version: 3)
                            requestBody = {
                                input: finalPositivePrompt,
                                model: model,
                                action: 'generate',
                                parameters: {
                                    params_version: 3, // V4必须使用版本3
                                    width: width,
                                    height: height,
                                    scale: settings.cfg_scale,
                                    sampler: settings.sampler,
                                    steps: settings.steps,
                                    seed: settings.seed === -1 ? Math.floor(Math.random() * 9999999999) : settings.seed,
                                    n_samples: 1,
                                    ucPreset: settings.uc_preset,
                                    qualityToggle: settings.quality_toggle,
                                    autoSmea: false,
                                    dynamic_thresholding: false,
                                    controlnet_strength: 1,
                                    legacy: false,
                                    add_original_image: true,
                                    cfg_rescale: 0,
                                    noise_schedule: 'karras', // V4使用karras
                                    legacy_v3_extend: false,
                                    skip_cfg_above_sigma: null,
                                    use_coords: false,
                                    legacy_uc: false,
                                    normalize_reference_strength_multiple: true,
                                    inpaintImg2ImgStrength: 1,
                                    characterPrompts: [],
                                    // V4专用提示词格式
                                    v4_prompt: {
                                        caption: {
                                            base_caption: finalPositivePrompt,
                                            char_captions: [],
                                        },
                                        use_coords: false,
                                        use_order: true,
                                    },
                                    // V4专用负面提示词格式
                                    v4_negative_prompt: {
                                        caption: {
                                            base_caption: finalNegativePrompt,
                                            char_captions: [],
                                        },
                                        legacy_uc: false,
                                    },
                                    negative_prompt: finalNegativePrompt,
                                    deliberate_euler_ancestral_bug: false,
                                    prefer_brownian: true,
                                    // 注意：不包含 stream 参数，使用标准ZIP响应而非msgpack流
                                },
                            };
                        } else {
                            // V3 及更早版本使用旧格式
                            requestBody = {
                                input: finalPositivePrompt,
                                model: model,
                                action: 'generate',
                                parameters: {
                                    width: width,
                                    height: height,
                                    scale: settings.cfg_scale,
                                    sampler: settings.sampler,
                                    steps: settings.steps,
                                    seed: settings.seed === -1 ? Math.floor(Math.random() * 9999999999) : settings.seed,
                                    n_samples: 1,
                                    ucPreset: settings.uc_preset,
                                    qualityToggle: settings.quality_toggle,
                                    sm: settings.smea,
                                    sm_dyn: settings.smea_dyn,
                                    dynamic_thresholding: false,
                                    controlnet_strength: 1,
                                    legacy: false,
                                    add_original_image: false,
                                    cfg_rescale: 0,
                                    noise_schedule: 'native',
                                    negative_prompt: finalNegativePrompt,
                                },
                            };
                        }

                        console.log('🚀 发送NAI请求:', requestBody);

                        // ★★★ 根据模型选择不同的API端点 ★★★
                        let apiUrl;

                        // V4/V4.5 模型使用流式端点
                        if (model.includes('nai-diffusion-4')) {
                            // V4/V4.5 默认使用流式端点
                            apiUrl = 'https://image.novelai.net/ai/generate-image-stream';
                        } else {
                            // V3 及更早版本使用标准端点
                            apiUrl = 'https://image.novelai.net/ai/generate-image';
                        }

                        let corsProxy = settings.cors_proxy;

                        // 如果选择了自定义代理，使用自定义URL
                        if (corsProxy === 'custom') {
                            corsProxy = settings.custom_proxy_url || '';
                        }

                        // 如果有代理，添加到URL前面
                        if (corsProxy && corsProxy !== '') {
                            apiUrl = corsProxy + encodeURIComponent(apiUrl);
                        }

                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: 'Bearer ' + apiKey,
                            },
                            body: JSON.stringify(requestBody),
                        });

                        console.log('Response status:', response.status);
                        console.log('Response headers:', [...response.headers.entries()]);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('API错误响应:', errorText);
                            throw new Error(`API请求失败 (${response.status}): ${errorText}`);
                        }

                        // NovelAI API返回的是ZIP文件，需要解压
                        const contentType = response.headers.get('content-type');
                        console.log('Content-Type:', contentType);

                        // 检查是否为 SSE 流式响应
                        let zipBlob;
                        let imageDataUrl;
                        if (contentType && contentType.includes('text/event-stream')) {
                            console.log('检测到 SSE 流式响应，开始解析...');

                            // 读取整个流
                            const text = await response.text();
                            console.log('收到 SSE 数据，大小:', text.length);

                            // 解析 SSE 格式，提取最后的 data: 行
                            const lines = text.trim().split('\n');
                            let base64Data = null;

                            for (let i = lines.length - 1; i >= 0; i--) {
                                const line = lines[i].trim();
                                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                    const dataContent = line.substring(6); // 移除 'data: ' 前缀

                                    // 尝试解析 JSON
                                    try {
                                        const jsonData = JSON.parse(dataContent);

                                        // V4.5 流式端点：event_type 为 "final" 时包含最终图片
                                        if (jsonData.event_type === 'final' && jsonData.image) {
                                            base64Data = jsonData.image;
                                            console.log('✅ 找到 final 事件的图片数据');
                                            break;
                                        }

                                        // 兼容其他格式
                                        if (jsonData.data) {
                                            base64Data = jsonData.data;
                                            console.log('从 JSON.data 中提取图片数据');
                                            break;
                                        }
                                        if (jsonData.image) {
                                            base64Data = jsonData.image;
                                            console.log('从 JSON.image 中提取图片数据');
                                            break;
                                        }
                                    } catch (e) {
                                        // 如果不是 JSON，直接作为 base64 数据
                                        base64Data = dataContent;
                                        console.log('直接使用 base64 数据');
                                        break;
                                    }
                                }
                            }

                            if (!base64Data) {
                                throw new Error('无法从 SSE 响应中提取图片数据');
                            }

                            // V4.5 流式端点返回的是 PNG base64，不是 ZIP
                            // 检查是否为 PNG (以 iVBORw0KGgo 开头) 或 JPEG (以 /9j/ 开头)
                            const isPNG = base64Data.startsWith('iVBORw0KGgo');
                            const isJPEG = base64Data.startsWith('/9j/');

                            if (isPNG || isJPEG) {
                                console.log('✅ 检测到直接的图片 base64 数据 (PNG/JPEG)');
                                // 将 base64 转为 Blob
                                const binaryString = atob(base64Data);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                const imageBlob = new Blob([bytes], { type: isPNG ? 'image/png' : 'image/jpeg' });
                                console.log('图片 Blob 创建成功，大小:', imageBlob.size);

                                // 转换为dataURL用于后续处理
                                const reader = new FileReader();
                                imageDataUrl = await new Promise((resolve, reject) => {
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(imageBlob);
                                });
                                console.log('✅ 图片转换成功！🎨');
                            } else {
                                // 否则当作 ZIP 处理
                                console.log('当作 ZIP 文件处理...');
                                const binaryString = atob(base64Data);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                zipBlob = new Blob([bytes]);
                                console.log('ZIP Blob 大小:', zipBlob.size);
                            }
                        } else {
                            // 非流式响应，直接读取
                            zipBlob = await response.blob();
                            console.log('收到数据，类型:', zipBlob.type, '大小:', zipBlob.size);
                        }

                        // 如果还没有imageDataUrl（即需要解压ZIP）
                        if (!imageDataUrl && zipBlob) {
                            // NovelAI始终返回ZIP格式，需要解压
                            try {
                                // 检查JSZip是否已加载
                                if (typeof JSZip === 'undefined') {
                                    throw new Error('JSZip库未加载，请刷新页面重试');
                                }

                                // 解压ZIP文件
                                const zip = await JSZip.loadAsync(zipBlob);
                                console.log('ZIP文件内容:', Object.keys(zip.files));

                                // 查找第一个图片文件（通常是image_0.png）
                                let imageFile = null;
                                for (let filename in zip.files) {
                                    if (filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
                                        imageFile = zip.files[filename];
                                        console.log('找到图片文件:', filename);
                                        break;
                                    }
                                }

                                if (!imageFile) {
                                    throw new Error('ZIP文件中未找到图片');
                                }

                                // 提取图片数据
                                const imageBlob = await imageFile.async('blob');
                                console.log('提取的图片大小:', imageBlob.size);

                                // 创建图片URL
                                const reader = new FileReader();
                                imageDataUrl = await new Promise((resolve, reject) => {
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(imageBlob);
                                });
                                console.log('✅ 图片解压成功！');
                            } catch (zipError) {
                                console.error('ZIP解压失败:', zipError);
                                throw new Error('图片解压失败: ' + zipError.message);
                            }
                        }

                        console.log('✅ NAI图片生成成功！');

                        // 创建naiimag消息
                        aiMessage = {
                            ...baseMessage,
                            type: 'naiimag',
                            imageUrl: imageDataUrl,
                            prompt: aiPrompt,
                            fullPrompt: finalPositivePrompt, // 保存完整提示词供查看
                        };
                    } catch (error) {
                        console.error('❌ NAI图片生成失败:', error);
                        // 失败时降级为文本消息
                        aiMessage = {
                            ...baseMessage,
                            content: `[图片生成失败: ${error.message}]`,
                        };
                    }
                    break;

                case 'qzone_like':
                    const postToLike = await window.db.qzonePosts.get(parseInt(msgData.postId));
                    if (postToLike) {
                        if (!postToLike.likes) postToLike.likes = [];
                        if (!postToLike.likes.includes(chat.name)) {
                            postToLike.likes.push(chat.name);
                            await window.db.qzonePosts.update(postToLike.id, { likes: postToLike.likes });
                            updateUnreadIndicator(window.unreadPostsCount + 1);
                            if (isViewingThisChat && document.getElementById('qzone-screen').classList.contains('active')) {
                                await renderQzonePosts();
                            }
                        }
                    }
                    continue;

                case 'video_call_request':
                    if (!window.videoCallState.isActive && !window.videoCallState.isAwaitingResponse) {
                        window.state.activeChatId = chatId;
                        window.videoCallState.activeChatId = chatId;
                        window.videoCallState.isAwaitingResponse = true;
                        window.videoCallState.isGroupCall = chat.isGroup;
                        window.videoCallState.callRequester = msgData.name || chat.name;
                        showIncomingCallModal(chatId); // <--- 把chatId作为参数传进去
                    }
                    continue;

                case 'group_call_request':
                    if (!window.videoCallState.isActive && !window.videoCallState.isAwaitingResponse) {
                        window.state.activeChatId = chatId;
                        window.videoCallState.isAwaitingResponse = true;
                        window.videoCallState.isGroupCall = true;
                        window.videoCallState.initiator = 'ai';
                        window.videoCallState.callRequester = msgData.name;
                        showIncomingCallModal();
                    }
                    continue;

                case 'pat_user':
                    const suffix = msgData.suffix ? ` ${msgData.suffix.trim()}` : '';
                    const patText = `${msgData.name || chat.name} 拍了拍我${suffix}`;
                    const patMessage = {
                        role: 'system',
                        type: 'pat_message',
                        content: patText,
                        timestamp: Date.now(),
                    };
                    chat.history.push(patMessage);
                    if (isViewingThisChat) {
                        const phoneScreen = document.getElementById('phone-screen');
                        phoneScreen.classList.remove('pat-animation');
                        void phoneScreen.offsetWidth;
                        phoneScreen.classList.add('pat-animation');
                        setTimeout(() => phoneScreen.classList.remove('pat-animation'), 500);
                        appendMessage(patMessage, chat);
                    } else {
                        showNotification(chatId, patText);
                    }
                    continue;

                case 'update_status':
                    chat.status.text = msgData.status_text;
                    chat.status.isBusy = msgData.is_busy || false;
                    chat.status.lastUpdate = Date.now();

                    const statusUpdateMessage = {
                        role: 'system',
                        type: 'pat_message',
                        content: `[${chat.name}的状态已更新为: ${msgData.status_text}]`,
                        timestamp: Date.now(),
                    };
                    chat.history.push(statusUpdateMessage);

                    if (isViewingThisChat) {
                        appendMessage(statusUpdateMessage, chat);
                    }

                    renderChatList();

                    continue;

                case 'change_music':
                    if (window.state.musicState.isActive && window.state.musicState.activeChatId === chatId) {
                        const songNameToFind = msgData.song_name;

                        const targetSongIndex = window.state.musicState.playlist.findIndex((track) => track.name.toLowerCase() === songNameToFind.toLowerCase());

                        if (targetSongIndex > -1) {
                            playSong(targetSongIndex);

                            const track = window.state.musicState.playlist[targetSongIndex];
                            const musicChangeMessage = {
                                role: 'system',
                                type: 'pat_message',
                                content: `[♪ ${chat.name} 为你切歌: 《${track.name}》 - ${track.artist}]`,
                                timestamp: Date.now(),
                            };
                            chat.history.push(musicChangeMessage);

                            if (isViewingThisChat) {
                                appendMessage(musicChangeMessage, chat);
                            }
                        }
                    }
                    continue;
                case 'create_memory':
                    if (window.handleCreateMemory) {
                        await window.handleCreateMemory(chatId, chat.name, msgData.description);
                    }
                    continue;

                case 'create_countdown':
                    if (window.handleCreateCountdown) {
                        await window.handleCreateCountdown(chatId, chat.name, msgData.title, msgData.date);
                    }
                    continue;

                case 'block_user':
                    if (!chat.isGroup) {
                        chat.relationship.status = 'blocked_by_ai';

                        const hiddenMessage = {
                            role: 'system',
                            content: `[系统最高指令]
			# 任务：回应情侣空间邀请
			用户刚刚向你发起了“开启情侣空间”的邀请。你【必须】根据你的人设，决定是同意还是拒绝。

			# 输出格式铁律 (必须严格遵守)
			你的回复【必须且只能】是【一个】JSON对象，格式如下:
			{"type": "lovers_space_response", "decision": "accept" 或 "reject", "responseText": "你想说的话..."}

			# 示例
			- 如果同意: {"type": "lovers_space_response", "decision": "accept", "responseText": ""}
			- 如果拒绝: {"type": "lovers_space_response", "decision": "reject", "responseText": ""}

			现在，请立即做出你的决定。`,
                            timestamp: Date.now() + 1,
                            isHidden: true,
                        };
                        chat.history.push(hiddenMessage);

                        await window.db.chats.put(chat);

                        if (isViewingThisChat) {
                            renderChatInterface(chatId);
                        }
                        renderChatList();

                        break;
                    }
                    continue;
                case 'friend_request_response':
                    if (!chat.isGroup && chat.relationship.status === 'pending_ai_approval') {
                        if (msgData.decision === 'accept') {
                            chat.relationship.status = 'friend';
                            aiMessage = { ...baseMessage, content: '我通过了你的好友申请，我们现在是好友啦！' };
                        } else {
                            chat.relationship.status = 'blocked_by_ai';
                            aiMessage = { ...baseMessage, content: '抱歉，我拒绝了你的好友申请。' };
                        }
                        chat.relationship.applicationReason = '';
                    }
                    break;

                case 'poll': {
                    // 同时处理来自AI和用户的投票消息
                    let pollInfoText = '';

                    // 判断这条投票消息是谁发的
                    if (msg.role === 'user') {
                        const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
                        pollInfoText = `[系统提示：用户 (${myNickname}) 发起了一个投票。问题：“${msg.question}”, 选项：“${msg.options.join('", "')}”。你可以使用 'vote' 指令参与投票。]`;
                    } else {
                        // 如果是AI发的
                        pollInfoText = `[系统提示：${msg.senderName} 发起了一个投票。问题：“${msg.question}”, 选项：“${msg.options.join('", "')}”。]`;
                    }

                    // 最终，我们把这条格式化好的文本作为系统消息发送给AI
                    // 注意：这里我们返回的是一个新对象，而不是修改原始的aiMessage
                    // 因此，我们将它放在了messagesPayload的构建循环里
                    aiMessage = { role: 'system', content: pollInfoText, isHidden: true };
                    break; // break不能少
                }

                case 'vote': {
                    // 使用大括号创建独立的块级作用域
                    const pollToVote = chat.history.find((m) => m.timestamp === msgData.poll_timestamp);

                    // 安全检查：如果投票不存在或已关闭，则不处理
                    if (pollToVote && !pollToVote.isClosed) {
                        // 1. 根据AI的“本名”，找到其成员对象，并获取正确的“群昵称”
                        const member = chat.members.find((m) => m.originalName === msgData.name);
                        const displayName = member ? member.groupNickname : msgData.name;

                        // 2. 使用正确的“群昵称”去移除该角色之前的所有投票
                        Object.keys(pollToVote.votes).forEach((option) => {
                            const voterIndex = pollToVote.votes[option].indexOf(displayName); // 使用 displayName
                            if (voterIndex > -1) {
                                pollToVote.votes[option].splice(voterIndex, 1);
                            }
                        });

                        // 3. 将“群昵称”添加到新的选项中
                        if (!pollToVote.votes[msgData.choice]) {
                            pollToVote.votes[msgData.choice] = [];
                        }

                        // （可选但推荐）再次检查，避免意外重复添加
                        if (!pollToVote.votes[msgData.choice].includes(displayName)) {
                            pollToVote.votes[msgData.choice].push(displayName);
                        }

                        // 如果用户正在看这个聊天，就刷新界面让他们看到变化
                        if (isViewingThisChat) {
                            renderChatInterface(chatId);
                        }
                    }
                    // 这是一个后台操作，不需要生成新的消息，所以用 continue
                    continue;
                }

                case 'red_packet':
                    aiMessage = {
                        ...baseMessage,
                        type: 'red_packet',
                        packetType: msgData.packetType,
                        totalAmount: msgData.amount,
                        count: msgData.count,
                        greeting: msgData.greeting,
                        receiverName: msgData.receiver,
                        claimedBy: {},
                        isFullyClaimed: false,
                    };

                    // 同步到角色钱包（支出）
                    const rpDescription = `发出红包 - ${msgData.greeting || '恭喜发财'}`;
                    await window.updateCharacterBankBalance(chatId, -msgData.amount, rpDescription);

                    break;

                case 'open_red_packet': {
                    // 使用大括号创建独立的块级作用域
                    const packetToOpen = chat.history.find((m) => m.timestamp === msgData.packet_timestamp);
                    // 检查红包是否存在、是否没被领完、以及这个AI角色是否还没领过
                    if (packetToOpen && !packetToOpen.isFullyClaimed && !(packetToOpen.claimedBy && packetToOpen.claimedBy[msgData.name])) {
                        // 1. 根据AI的本名(msgData.name)，从成员列表找到其正确的群昵称
                        const member = chat.members.find((m) => m.originalName === msgData.name);
                        const displayName = member ? member.groupNickname : msgData.name;

                        // 修复：如果是专属红包，且接收人不是自己，则不能领取
                        if (packetToOpen.packetType === 'direct' && packetToOpen.receiverName !== msgData.name) {
                            console.log(`[RedPacket] AI (${msgData.name}) 尝试领取发给 ${packetToOpen.receiverName} 的专属红包，已阻止。`);
                            continue;
                        }

                        let claimedAmountAI = 0;
                        const remainingAmount = packetToOpen.totalAmount - Object.values(packetToOpen.claimedBy || {}).reduce((sum, val) => sum + val, 0);
                        const remainingCount = packetToOpen.count - Object.keys(packetToOpen.claimedBy || {}).length;

                        if (remainingCount > 0) {
                            if (remainingCount === 1) {
                                // 如果是最后一个
                                claimedAmountAI = remainingAmount;
                            } else {
                                // 如果不是最后一个，随机分配
                                const min = 0.01;
                                const max = remainingAmount - (remainingCount - 1) * min;
                                claimedAmountAI = Math.random() * (max - min) + min;
                            }
                            claimedAmountAI = parseFloat(claimedAmountAI.toFixed(2));

                            // 2. 确保 claimedBy 对象存在
                            if (!packetToOpen.claimedBy) packetToOpen.claimedBy = {};
                            // 3. 使用刚刚查找到的 displayName 作为记录的key
                            packetToOpen.claimedBy[displayName] = claimedAmountAI;

                            // 4. 发送对用户可见的系统消息
                            const aiClaimedMessage = {
                                role: 'system',
                                type: 'pat_message',
                                // 系统消息里也使用 displayName
                                content: `${displayName} 领取了 ${packetToOpen.senderName} 的红包`,
                                timestamp: Date.now(),
                            };
                            chat.history.push(aiClaimedMessage);

                            let hiddenContentForAI = `[系统提示：你 (${displayName}) 成功抢到了 ${claimedAmountAI.toFixed(2)} 元。`;

                            // 5. 检查红包是否被领完
                            if (Object.keys(packetToOpen.claimedBy).length >= packetToOpen.count) {
                                packetToOpen.isFullyClaimed = true; // 标记为已领完

                                // 发送对用户可见的“已领完”通知
                                const finishedMessage = {
                                    role: 'system',
                                    type: 'pat_message',
                                    content: `${packetToOpen.senderName} 的红包已被领完`,
                                    timestamp: Date.now() + 1,
                                };
                                chat.history.push(finishedMessage);

                                // 开始构建给AI看的“战报”
                                hiddenContentForAI += ` 红包已被领完。`;

                                // 如果是拼手气红包，找出谁是手气王
                                let luckyKing = { name: '', amount: -1 };
                                if (packetToOpen.packetType === 'lucky' && packetToOpen.count > 1) {
                                    Object.entries(packetToOpen.claimedBy).forEach(([name, amount]) => {
                                        if (amount > luckyKing.amount) {
                                            luckyKing = { name, amount };
                                        }
                                    });
                                }
                                // 把手气王信息也加到“战报”里
                                if (luckyKing.name) {
                                    hiddenContentForAI += ` 手气王是 ${luckyKing.name}！`;
                                }
                            }
                            hiddenContentForAI += ' 请根据这个结果发表你的评论。]';

                            // 6. 创建并添加给AI看的隐藏消息
                            const hiddenMessageForAI = {
                                role: 'system',
                                content: hiddenContentForAI,
                                timestamp: Date.now() + 2, // 确保时间戳在后
                                isHidden: true,
                            };
                            chat.history.push(hiddenMessageForAI);
                        }

                        // 7. 刷新UI（如果用户正在看的话）
                        if (isViewingThisChat) {
                            renderChatInterface(chatId);
                        }
                    }
                    continue; // 这是一个后台操作，继续处理AI可能返回的其他消息
                }

                case 'change_avatar':
                    const avatarName = msgData.name;
                    // 在该角色的头像库中查找
                    const foundAvatar = chat.settings.aiAvatarLibrary.find((avatar) => avatar.name === avatarName);

                    if (foundAvatar) {
                        // 找到了，就更新头像
                        chat.settings.aiAvatar = foundAvatar.url;

                        // 创建一条系统提示，告知用户头像已更换
                        const systemNotice = {
                            role: 'system',
                            type: 'pat_message', // 复用居中样式
                            content: `[${chat.name} 更换了头像]`,
                            timestamp: Date.now(),
                        };
                        chat.history.push(systemNotice);

                        // 如果在当前聊天界面，则实时渲染
                        if (isViewingThisChat) {
                            appendMessage(systemNotice, chat);
                            // 立刻刷新聊天界面以显示新头像
                            renderChatInterface(chatId);
                        }
                    }
                    // 处理完后，继续处理AI可能返回的其他消息
                    continue;

                case 'accept_transfer': {
                    // 使用大括号创建块级作用域
                    const originalTransferMsgIndex = chat.history.findIndex((m) => m.timestamp === msgData.for_timestamp);
                    if (originalTransferMsgIndex > -1) {
                        const originalMsg = chat.history[originalTransferMsgIndex];

                        // 修复：防止重复处理
                        if (originalMsg.status === 'accepted' || originalMsg.status === 'declined') {
                            console.warn(`AI尝试再次处理已完成的转账 (timestamp: ${msgData.for_timestamp}, status: ${originalMsg.status})，已拦截。`);
                            continue;
                        }

                        originalMsg.status = 'accepted';

                        // 【全新】同步到角色钱包（收入）
                        const acceptDescription = `收到来自 ${originalMsg.senderName} 的转账`;
                        await window.updateCharacterBankBalance(chatId, originalMsg.amount, acceptDescription);
                    }
                    continue; // 接受指令只修改状态，不产生新消息
                }

                case 'decline_transfer': {
                    // 使用大括号创建块级作用域
                    const originalTransferMsgIndex = chat.history.findIndex((m) => m.timestamp === msgData.for_timestamp);
                    if (originalTransferMsgIndex > -1) {
                        const originalMsg = chat.history[originalTransferMsgIndex];

                        // 修复：防止重复处理
                        if (originalMsg.status === 'accepted' || originalMsg.status === 'declined') {
                            console.warn(`AI尝试再次处理已完成的转账 (timestamp: ${msgData.for_timestamp}, status: ${originalMsg.status})，已拦截。`);
                            continue;
                        }

                        originalMsg.status = 'declined';

                        // 创建一条新的“退款”消息
                        const refundMessage = {
                            role: 'assistant',
                            senderName: chat.name,
                            type: 'transfer',
                            isRefund: true, // 标记这是一条退款消息
                            amount: originalMsg.amount,
                            note: '转账已被拒收',
                            timestamp: messageTimestamp++, // 使用递增的时间戳
                        };

                        // 将新消息推入历史记录，它会被后续的循环处理并渲染
                        chat.history.push(refundMessage);

                        if (isViewingThisChat) {
                            // 因为退款消息是新生成的，所以我们直接将它添加到界面上
                            appendMessage(refundMessage, chat);
                            // 同时，原始的转账消息状态变了，所以要重绘整个界面以更新它
                            renderChatInterface(chatId);
                        }
                    }
                    continue; // 继续处理AI返回的文本消息
                }

                case 'system_message':
                    aiMessage = { role: 'system', type: 'pat_message', content: msgData.content, timestamp: Date.now() };
                    break;

                case 'share_link':
                    aiMessage = {
                        ...baseMessage,
                        type: 'share_link',
                        title: msgData.title,
                        description: msgData.description,
                        // thumbnail_url: msgData.thumbnail_url, // 我们已经决定不要图片了，所以这行可以不要
                        source_name: msgData.source_name,
                        content: msgData.content, // 这是文章正文，点击卡片后显示的内容
                    };
                    break;

                case 'quote_reply':
                    const originalMessage = chat.history.find((m) => m.timestamp === msgData.target_timestamp);
                    if (originalMessage) {
                        const quoteContext = {
                            timestamp: originalMessage.timestamp,
                            senderName: originalMessage.senderName || (originalMessage.role === 'user' ? chat.settings.myNickname || '我' : chat.name),
                            content: String(originalMessage.content || ''),
                        };
                        aiMessage = {
                            ...baseMessage,
                            content: msgData.reply_content,
                            quote: quoteContext,
                        };
                    } else {
                        aiMessage = { ...baseMessage, content: msgData.reply_content };
                    }
                    break;

                case 'location':
                    aiMessage = {
                        ...baseMessage,
                        type: 'location',
                        userLocation: msgData.userLocation,
                        aiLocation: msgData.aiLocation,
                        distance: msgData.distance,
                        trajectoryPoints: msgData.trajectoryPoints || [], // 【新增】确保即使AI没提供，也是一个空数组
                    };
                    break;

                case 'send_and_recall': {
                    // --- 动画部分 (保持不变) ---
                    if (!isViewingThisChat) continue;
                    const tempMessageData = { ...baseMessage, content: msgData.content };
                    appendMessage(tempMessageData, chat, true);
                    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 1500));
                    const bubbleWrapper = document.querySelector(`.message-bubble[data-timestamp="${tempMessageData.timestamp}"]`)?.closest('.message-wrapper');
                    if (bubbleWrapper) {
                        bubbleWrapper.classList.add('recalled-animation');
                        await new Promise((resolve) => setTimeout(resolve, 300));
                    }

                    const recalledMessage = {
                        role: 'assistant',
                        senderName: msgData.name || chat.name,
                        type: 'recalled_message',
                        content: '对方撤回了一条消息',
                        timestamp: tempMessageData.timestamp,
                        recalledData: { originalType: 'text', originalContent: msgData.content },
                    };

                    // 2. 创建一条对用户隐藏、但对AI可见的“记忆”消息
                    const hiddenMemoryMessage = {
                        role: 'system', // 必须是 system，这样AI才知道这是上下文信息
                        content: `[系统提示：你刚刚说了一句“${msgData.content}”，但立刻就撤回了它。]`,
                        timestamp: tempMessageData.timestamp + 1, // 确保在撤回消息之后
                        isHidden: true, // 这个标记让它不在UI上显示
                    };

                    // 3. 将这两条消息都添加到历史记录中
                    chat.history.push(recalledMessage, hiddenMemoryMessage);

                    // 4. 替换DOM，显示“已撤回”提示
                    const placeholder = createMessageElement(recalledMessage, chat);
                    if (document.body.contains(bubbleWrapper)) {
                        bubbleWrapper.parentNode.replaceChild(placeholder, bubbleWrapper);
                    }

                    continue;
                }

                case 'sticker': {
                    // 这是为群聊和单聊统一设计的表情包逻辑
                    const stickerName = msgData.sticker_name; // 关键修改：统一使用 sticker_name
                    if (!stickerName) {
                        console.warn('AI返回了sticker类型但没有sticker_name，已拦截:', msgData);
                        continue; // 跳过这条无效指令
                    }

                    // 在所有可用表情库中查找
                    const allStickers = [...state.userStickers, ...state.charStickers, ...(chat.settings.stickerLibrary || [])];
                    const foundSticker = allStickers.find((s) => s.name === stickerName);

                    if (foundSticker) {
                        // 找到了，就创建消息对象
                        aiMessage = {
                            ...baseMessage,
                            type: 'sticker',
                            content: foundSticker.url,
                            meaning: foundSticker.name,
                        };
                    } else {
                        // 没找到，说明AI幻觉了，记录警告并跳过
                        console.warn(`AI杜撰了不存在的表情: "${stickerName}"，已自动拦截。`);
                    }
                    break;
                }
                case 'text': {
                    const messageText = String(msgData.content || msgData.message || '');

                    if (STICKER_REGEX.test(messageText)) {
                        aiMessage = { ...baseMessage, type: 'sticker', content: messageText, meaning: '' };
                    } else {
                        // 兼容旧的[sticker:名字]格式，但新prompt已不推荐
                        const stickerMatch = messageText.match(/^\[sticker:(.+?)\]$/);
                        if (stickerMatch) {
                            const stickerName = stickerMatch[1].trim();
                            const allStickers = [...state.userStickers, ...state.charStickers, ...(chat.settings.stickerLibrary || [])];
                            const foundSticker = allStickers.find((s) => s.name === stickerName);

                            if (foundSticker) {
                                aiMessage = {
                                    ...baseMessage,
                                    type: 'sticker',
                                    content: foundSticker.url,
                                    meaning: foundSticker.name,
                                };
                            } else {
                                console.warn(`AI使用了旧格式且杜撰了不存在的表情: "${stickerName}"，已拦截。`);
                            }
                        } else {
                            aiMessage = { ...baseMessage, content: messageText };
                        }
                    }
                    break;
                }

                case 'dating_payment_response': {
                    const originalRequest = chat.history.filter((m) => m.role === 'system' && m.content.includes('dating_payment_response')).pop();
                    if (!originalRequest) continue;

                    const costMatch = originalRequest.content.match(/费用（(\d+(\.\d+)?)金币）/);
                    const cost = costMatch ? parseFloat(costMatch[1]) : 0;

                    if (msgData.decision === 'accept') {
                        const charBalance = chat.characterPhoneData.bank.balance || 0;
                        if (charBalance >= cost) {
                            await updateCharacterPhoneBankBalance(chat.id, -cost, `约会支出: 为用户买单`);
                            aiMessage = { ...baseMessage, content: msgData.responseText || '好呀，这次我来请客吧！' };
                        } else {
                            aiMessage = {
                                ...baseMessage,
                                content: msgData.responseText || '呜呜，我也想请客，但是钱包好像不太够呢...',
                            };
                        }
                    } else {
                        aiMessage = { ...baseMessage, content: msgData.responseText || '这次还是算了吧...' };
                    }
                    break;
                }

                case 'dating_aa_response': {
                    const originalRequest = chat.history.filter((m) => m.role === 'system' && m.content.includes('dating_aa_response')).pop();
                    if (!originalRequest) continue;

                    const costMatch = originalRequest.content.match(/各自支付 (\d+(\.\d+)?) 金币/);
                    const splitCost = costMatch ? parseFloat(costMatch[1]) : 0;

                    if (msgData.decision === 'accept') {
                        const charBalance = chat.characterPhoneData.bank.balance || 0;
                        if (charBalance >= splitCost) {
                            await updateUserBalanceAndLogTransaction(-splitCost, `约会AA支出`);
                            await updateCharacterPhoneBankBalance(chat.id, -splitCost, `约会AA支出`);
                            aiMessage = { ...baseMessage, content: msgData.responseText || '好啊，AA制完全没问题！' };
                        } else {
                            aiMessage = {
                                ...baseMessage,
                                content: msgData.responseText || '这个...我的钱好像不太够付我自己的那份呢。',
                            };
                        }
                    } else {
                        aiMessage = {
                            ...baseMessage,
                            content: msgData.responseText || '我觉得AA制有点太见外了，还是我来请吧？或者你请？',
                        };
                    }
                    break;
                }

                case 'lend_money_response': {
                    const originalRequest = chat.history.filter((m) => m.role === 'system' && m.content.includes('lend_money_response')).pop();
                    if (!originalRequest) continue;

                    const amountMatch = originalRequest.content.match(/借 (\d+(\.\d+)?) 金币/);
                    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

                    // 只处理接受借款时的金钱逻辑
                    if (msgData.decision === 'accept') {
                        const lenderBalance = chat.characterPhoneData.bank.balance || 0;
                        if (lenderBalance >= amount) {
                            await updateCharacterPhoneBankBalance(chat.id, -amount, `借钱给用户`);
                            await updateUserBalanceAndLogTransaction(amount, `从 ${chat.name} 处借款`);
                        } else {
                            // 如果AI决定同意但钱不够，我们信任AI会在下一条消息中解释。
                            // 这里的金融逻辑可以做得更复杂，但目前保持简单，相信AI的判断。
                            console.warn(`AI "${chat.name}" 同意借钱，但余额不足，交易未执行。`);
                        }
                    }
                    // 如果是拒绝(reject)，则不执行任何金融操作。

                    // 不再在这里创建任何 aiMessage。
                    // 使用 'continue' 跳到AI回复数组的下一项，也就是AI自己生成的文本消息，让循环的后续部分去处理它。
                    continue;
                }

                case 'forum_comment': {
                    // 使用大括号创建块级作用域
                    const postIdToComment = msgData.postId;
                    const commentText = msgData.commentText;

                    if (postIdToComment && commentText) {
                        // 1. 尝试将 postId 强制转换为数字。
                        //    这能解决AI返回数字字符串（如"123"）导致查询失败的问题。
                        const numericPostId = parseInt(postIdToComment, 10);

                        // 检查转换后的ID是否有效
                        if (isNaN(numericPostId)) {
                            console.warn(`[圈子评论失败] 收到的 postId "${postIdToComment}" 不是一个有效的数字ID，已跳过。`);
                            // 提示：如果频繁看到此警告，请检查你给AI的system prompt，确保你要求它返回数字ID。
                            continue; // 跳过此指令
                        }

                        // 2. 使用正确的数字ID从数据库获取帖子
                        const postToComment = await window.db.forumPosts.get(numericPostId);

                        if (postToComment) {
                            // 创建新评论对象
                            const newComment = {
                                postId: numericPostId, // 使用转换后的数字ID
                                author: chat.name, // 评论者就是当前AI
                                content: commentText,
                                timestamp: Date.now(),
                            };

                            // 将新评论保存到数据库
                            await window.db.forumComments.add(newComment);
                            console.log(`AI "${chat.name}" 评论了帖子 #${numericPostId}: "${commentText}"`);

                            // 3. 同时检查帖子列表页和帖子详情页
                            //    这样无论你正在看哪个页面，都能看到更新。

                            // 如果用户正在看这个小组的帖子列表，就刷新列表
                            if (document.getElementById('group-screen').classList.contains('active') && activeGroupId === postToComment.groupId) {
                                await renderGroupPosts(activeGroupId);
                            }

                            // 如果用户正在看这个帖子的详情页，就刷新详情页（这是本次修复的关键！）
                            if (document.getElementById('post-screen').classList.contains('active') && activeForumPostId === numericPostId) {
                                await renderPostDetails(numericPostId);
                            }
                        } else {
                            console.warn(`[圈子评论失败] 未能在数据库中找到 postId 为 ${numericPostId} 的帖子。`);
                        }
                    }
                    // 无论成功与否，这都是一个后台操作，继续处理AI可能返回的其他指令
                    continue;
                }

                case 'ai_image':
                    aiMessage = { ...baseMessage, type: 'ai_image', content: msgData.description };
                    break;
                case 'voice_message':
                    aiMessage = { ...baseMessage, type: 'voice_message', content: msgData.content };
                    break;

                case 'transfer':
                    aiMessage = {
                        ...baseMessage,
                        type: 'transfer',
                        amount: msgData.amount,
                        note: msgData.note,
                        receiverName: msgData.receiver || '我',
                    };

                    // 【全新】同步到角色钱包（支出）
                    const transferDescription = `转账给 ${msgData.receiver || '我'}`;
                    await window.updateCharacterBankBalance(chatId, -msgData.amount, transferDescription);

                    break;

                case 'waimai_request':
                    aiMessage = {
                        ...baseMessage,
                        type: 'waimai_request',
                        productInfo: msgData.productInfo,
                        amount: msgData.amount,
                        status: 'pending',
                        countdownEndTime: Date.now() + 15 * 60 * 1000,
                    };
                    break;

                default:
                    console.warn('收到了未知的AI指令类型:', msgData.type);
                    break;
            }

            // 将渲染逻辑移出循环
            if (aiMessage) {
                // 1. 将新消息存入历史记录
                chat.history.push(aiMessage);

                if (!isViewingThisChat || document.hidden) {
                    let notificationText;
                    switch (aiMessage.type) {
                        case 'transfer':
                            notificationText = `[收到一笔转账]`;
                            break;
                        case 'waimai_request':
                            notificationText = `[收到一个外卖代付请求]`;
                            break;
                        case 'ai_image':
                            notificationText = `[图片]`;
                            break;
                        case 'voice_message':
                            notificationText = `[语音]`;
                            break;
                        case 'sticker':
                            notificationText = aiMessage.meaning ? `[表情: ${aiMessage.meaning}]` : '[表情]';
                            break;
                        default:
                            notificationText = String(aiMessage.content || '');
                    }
                    const finalNotifText = chat.isGroup ? `${aiMessage.senderName}: ${notificationText}` : notificationText;

                    // 确定具体的头像URL
                    let senderAvatarForNotify = null;

                    if (chat.isGroup) {
                        // 如果是群聊，尝试根据消息发送者名字找到对应的成员头像
                        const member = chat.members.find((m) => m.originalName === aiMessage.senderName);
                        if (member) {
                            senderAvatarForNotify = member.avatar;
                        }
                    } else {
                        // 如果是单聊，直接用AI头像
                        senderAvatarForNotify = chat.settings.aiAvatar;
                    }

                    showNotification(
                        chatId,
                        finalNotifText.substring(0, 60) + (finalNotifText.length > 60 ? '...' : ''),
                        senderAvatarForNotify, // <--- 传入这个新参数
                    );
                }

                if (!isViewingThisChat) {
                    // 如果用户不在当前聊天界面，就把这个聊天的未读数 +1
                    chat.unreadCount = (chat.unreadCount || 0) + 1;
                }

                // 2. 只有在当前聊天界面时，才执行带动画的添加
                if (isViewingThisChat) {
                    appendMessage(aiMessage, chat);
                    playNotificationSound();
                    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1800 + 1000));
                }
            }
        }

        if (callHasBeenHandled && window.videoCallState.isGroupCall) {
            window.videoCallState.isAwaitingResponse = false;
            if (window.videoCallState.participants.length > 0) {
                startVideoCall();
            } else {
                window.videoCallState = { ...videoCallState, isAwaitingResponse: false, participants: [] };
                showScreen('chat-interface-screen');
                alert('无人接听群聊邀请。');
            }
        }
        await window.db.chats.put(chat);
        window.checkAndTriggerSummary(chatId);

        // --- 续火花逻辑 ---
        if (await window.updateStreak(chatId)) {
            // 如果火花天数发生了变化，就刷新聊天列表
            renderChatList();
        }
    } catch (error) {
        chat.history = chat.history.filter((msg) => !msg.isTemporary);
        if (!chat.isGroup && chat.relationship?.status === 'pending_ai_approval') {
            chat.relationship.status = 'blocked_by_ai';
            await showCustomAlert('申请失败', `AI在处理你的好友申请时出错了，请稍后重试。\n错误信息: ${error.message}`);
        } else {
            const errorContent = `[出错了: ${error.message}]`;
            const errorMessage = { role: 'assistant', content: errorContent, timestamp: Date.now() };
            if (chat.isGroup) errorMessage.senderName = '系统消息';
            chat.history.push(errorMessage);
        }

        await window.db.chats.put(chat);
        window.videoCallState.isAwaitingResponse = false;

        if (document.getElementById('chat-interface-screen').classList.contains('active') && window.state.activeChatId === chatId) {
            renderChatInterface(chatId);
        }
    } finally {
        // 在 finally 块中统一隐藏所有类型的提示
        if (chat.isGroup) {
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
        } else {
            if (chatHeaderTitle && window.state.chats[chatId]) {
                chatHeaderTitle.style.opacity = 0;
                setTimeout(() => {
                    chatHeaderTitle.textContent = window.state.chats[chatId].name;
                    chatHeaderTitle.classList.remove('typing-status');
                    chatHeaderTitle.style.opacity = 1;
                }, 200);
            }
        }
    }
};

window.enterSelectionMode = function enterSelectionMode(initialMsgTimestamp) {
    if (isSelectionMode) return;
    isSelectionMode = true;
    document.getElementById('chat-interface-screen').classList.add('selection-mode');
    toggleMessageSelection(initialMsgTimestamp);
};

window.exitSelectionMode = function exitSelectionMode() {
    if (window.cleanupWaimaiTimers) cleanupWaimaiTimers();
    if (!isSelectionMode) return;
    isSelectionMode = false;
    document.getElementById('chat-interface-screen').classList.remove('selection-mode');
    selectedMessages.forEach((ts) => {
        const bubble = document.querySelector(`.message-bubble[data-timestamp="${ts}"]`);
        if (bubble) bubble.classList.remove('selected');
    });
    selectedMessages.clear();
};

window.toggleMessageSelection = function toggleMessageSelection(timestamp) {
    const elementToSelect = document.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);

    if (!elementToSelect) return;

    if (selectedMessages.has(timestamp)) {
        selectedMessages.delete(timestamp);
        elementToSelect.classList.remove('selected');
    } else {
        selectedMessages.add(timestamp);
        elementToSelect.classList.add('selected');
    }

    document.getElementById('selection-count').textContent = `已选 ${selectedMessages.size} 条`;

    if (selectedMessages.size === 0) {
        exitSelectionMode();
    }
};

window.addLongPressListener = function addLongPressListener(element, callback) {
    let pressTimer;
    const startPress = (e) => {
        if (isSelectionMode) return;
        e.preventDefault();
        pressTimer = window.setTimeout(() => callback(e), 500);
    };
    const cancelPress = () => clearTimeout(pressTimer);
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', cancelPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchstart', startPress, { passive: true });
    element.addEventListener('touchend', cancelPress);
    element.addEventListener('touchmove', cancelPress);
};

function setupChatListeners() {
    const chatInput = document.getElementById('chat-input');
    const chatListEl = document.getElementById('chat-list');

    // 聊天列表左滑功能JS逻辑
    let chatSwipeState = { isDragging: false, startX: 0, activeContent: null };

    // 关闭所有已滑开的项
    function resetAllChatSwipes(exceptThisOne = null) {
        document.querySelectorAll('.chat-list-item-content.swiped').forEach((content) => {
            if (content !== exceptThisOne) {
                content.classList.remove('swiped');
            }
        });
    }

    // Function for shared history viewer (used in click listener)
    function openSharedHistoryViewer(timestamp) {
        const chat = window.state.chats[window.state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === timestamp);
        if (!message || message.type !== 'share_card') return;

        const viewerModal = document.getElementById('shared-history-viewer-modal');
        const viewerTitle = document.getElementById('shared-history-viewer-title');
        const viewerContent = document.getElementById('shared-history-viewer-content');

        viewerTitle.textContent = message.payload.title;
        viewerContent.innerHTML = ''; // 清空旧内容

        // 复用 createMessageElement 来渲染每一条被分享的消息
        message.payload.sharedHistory.forEach((sharedMsg) => {
            // 注意：这里我们传入的是 sourceChat 对象，以确保头像、昵称等正确
            const sourceChat = Object.values(window.state.chats).find((c) => c.name === message.payload.sourceChatName) || chat;
            const bubbleEl = createMessageElement(sharedMsg, sourceChat);
            if (bubbleEl) {
                viewerContent.appendChild(bubbleEl);
            }
        });

        viewerModal.classList.add('visible');
    }

    const setupFileUpload = (inputId, callback) => {
        document.getElementById(inputId).addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    // 调用新的通用压缩函数
                    const compressedDataUrl = await handleImageUploadAndCompress(file);
                    callback(compressedDataUrl); // 将压缩后的结果传给回调
                } catch (error) {
                    console.error(`处理文件 ${file.name} 失败:`, error);
                    alert(`处理图片失败: ${error.message}`);
                } finally {
                    event.target.value = null;
                }
            }
        });
    };

    document.getElementById('back-to-list-btn').addEventListener('click', () => {
        stopPetDecayTimer();

        applyScopedCss('', '#chat-messages', 'custom-bubble-style'); // 清除真实聊天界面的自定义样式
        applyScopedCss('', '#settings-preview-area', 'preview-bubble-style'); // 清除预览区的自定义样式

        exitSelectionMode();
        window.state.activeChatId = null;
        // 【心声功能】返回列表时，隐藏心形按钮
        document.getElementById('char-heart-btn').style.display = 'none';
        showScreen('chat-list-screen');
    });

    // 为歌曲封面/歌词区域绑定点击切换事件
    document.getElementById('music-display-area').addEventListener('click', () => {
        const displayArea = document.getElementById('music-display-area');
        // 直接切换 .show-lyrics 这个类，CSS会自动处理显示/隐藏
        displayArea.classList.toggle('show-lyrics');
    });

    document.getElementById('add-chat-btn').addEventListener('click', async () => {
        const name = await showCustomPrompt('创建新聊天', '请输入Ta的名字');
        if (name && name.trim()) {
            const newChatId = 'chat_' + Date.now();

            const newChat = {
                id: newChatId,
                name: name.trim(),
                isGroup: false,
                isPinned: false,
                npcLibrary: [], // 角色专属NPC库
                relationship: { status: 'friend', blockedTimestamp: null, applicationReason: '' },
                status: { text: '在线', lastUpdate: Date.now(), isBusy: false },
                settings: {
                    aiPersona: '你是谁呀。',
                    myPersona: '我是谁呀。',
                    maxMemory: 10,
                    aiAvatar: defaultAvatar,
                    myAvatar: defaultAvatar,
                    background: '',
                    theme: 'default',
                    fontSize: 13,
                    customCss: '',
                    linkedWorldBookIds: [],
                    aiAvatarLibrary: [],
                    stickerLibrary: [], // 专属表情库
                    // === 以下是本次修复新增的初始化属性 ===
                    linkedMemories: [], // 【修复核心】初始化记忆互通数组
                    offlineMode: { enabled: false, prompt: '', style: '', wordCount: 300, presets: [] }, // 初始化线下模式
                    timePerceptionEnabled: true, // 初始化时间感知
                    customTime: '', // 初始化自定义时间
                    isCoupleAvatar: false, // 初始化情侣头像开关
                    coupleAvatarDescription: '', // 初始化情侣头像描述
                    weiboProfession: '', // 初始化微博职业
                    weiboInstruction: '', // 初始化微博指令
                },
                history: [],
                musicData: { totalTime: 0 },
                // 手机数据也保持完整
                characterPhoneData: {
                    lastGenerated: null,
                    chats: {},
                    shoppingCart: [],
                    memos: [],
                    browserHistory: [],
                    photoAlbum: [],
                    bank: { balance: 0, transactions: [] },
                    trajectory: [],
                    appUsage: [],
                    diary: [],
                },
                houseData: null,
            };

            window.state.chats[newChatId] = newChat;
            await window.db.chats.put(newChat);
            renderChatList();
        }
    });

    // 创建群聊按钮现在打开联系人选择器
    document.getElementById('add-group-chat-btn').addEventListener('click', () => { if (window.openContactPickerForGroupCreate) window.openContactPickerForGroupCreate(); });

    // 绑定刷新后台活动按钮事件
    const refreshBtn = document.getElementById('refresh-background-activity-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (window.runBackgroundSimulationTick) {
                // 添加一个临时的旋转动画效果，并在执行完毕后移除
                const icon = refreshBtn.querySelector('svg');
                if (icon) {
                    icon.style.transition = 'transform 0.5s ease';
                    icon.style.transform = 'rotate(360deg)';
                }

                console.log('用户手动触发一次后台活动检测...');
                // 传入 true 表示手动触发，即使总开关没开也强制运行一次
                await window.runBackgroundSimulationTick(true);

                // 简单的防抖/反馈：执行完复原
                setTimeout(() => {
                    if (icon) {
                        icon.style.transition = 'none';
                        icon.style.transform = 'rotate(0deg)';
                    }
                    alert('已手动触发一次后台活动判断！');
                }, 500);
            } else {
                alert('后台模拟器尚未就绪。');
            }
        });
    }

    document.getElementById('transfer-cancel-btn').addEventListener('click', () => document.getElementById('transfer-modal').classList.remove('visible'));

    document.getElementById('send-btn').addEventListener('click', async () => {
        const content = chatInput.value.trim();
        if (!content || !window.state.activeChatId) return;

        const chat = window.state.chats[window.state.activeChatId];

        // 旁白拦截逻辑
        // 检查是否以 <旁白> 开头
        if (content.startsWith('<旁白>')) {
            // 提取旁白内容
            const narrativeContent = content.replace(/^<旁白>/, '').trim();

            if (narrativeContent) {
                const msg = {
                    role: 'system', // 设置为 system 角色，不属于用户
                    type: 'narrative', // 设置专门的类型
                    content: narrativeContent,
                    timestamp: Date.now(),
                };

                chat.history.push(msg);
                await window.db.chats.put(chat);
                appendMessage(msg, chat);

                // 清空输入框
                chatInput.value = '';
                chatInput.style.height = 'auto';
                chatInput.focus();

                return; // 拦截成功，不再执行后续的普通发送逻辑
            }
        }

        try {
            const command = JSON.parse(content);
            // 检查：这是否是一个让角色发微博的指令？
            if (command && command.type === 'weibo_post') {
                const chat = window.state.chats[window.state.activeChatId];
                if (chat.isGroup) {
                    alert('不能在群聊中为单个角色发布微博。');
                    return;
                }

                // 创建一个新的微博帖子对象
                const newPost = {
                    authorId: chat.id, // 关键！作者ID是当前角色的ID，而不是'user'
                    authorType: 'char',
                    authorNickname: chat.name,
                    authorAvatar: chat.settings.aiAvatar || defaultAvatar,
                    content: command.content || '',
                    timestamp: Date.now(),
                    likes: [],
                    comments: [],
                    baseLikesCount: command.baseLikesCount || 0,
                    baseCommentsCount: command.baseCommentsCount || 0,
                };

                // 如果JSON里有路人评论，就解析并添加
                if (command.comments && typeof command.comments === 'string') {
                    newPost.comments = command.comments
                        .split('\n')
                        .map((c) => {
                            const parts = c.split(/[:：]/);
                            const commenter = parts.shift() || '路人';
                            const commentText = parts.join(':').trim();
                            return {
                                commentId: 'comment_' + Date.now() + Math.random(),
                                authorNickname: commenter,
                                commentText: commentText,
                            };
                        })
                        .filter((c) => c.commentText);
                }

                await window.db.weiboPosts.add(newPost);

                // 刷新“关注的人”列表，新微博就会出现了！
                await renderFollowingWeiboFeed();

                await showCustomAlert('操作成功', `已为 “${chat.name}” 发布了一条新微博！`);

                chatInput.value = ''; // 清空输入框
                return; // 结束函数，不再执行后面的代码
            }
        } catch (e) {
            // 如果解析JSON失败，说明它不是指令，只是普通文本，就让代码继续往下走
        }

        // 1. 如果是群聊，并且你被禁言了
        if (chat && chat.isGroup && chat.settings.isUserMuted) {
            alert('你已被禁言，无法发言！');
            return; // 阻止发送
        }

        const msg = {
            role: 'user',
            content,
            timestamp: Date.now(),
        };

        // 检查当前是否处于引用回复模式
        if (currentReplyContext) {
            msg.quote = currentReplyContext; // 将引用信息附加到消息对象上
        }

        chat.history.push(msg);
        await window.incrementMessageCount(window.state.activeChatId);
        await window.db.chats.put(chat);
        appendMessage(msg, chat);
        renderChatList();
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.focus();

        cancelReplyMode();
    });

    document.getElementById('wait-reply-btn').addEventListener('click', triggerAiResponse);

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('send-btn').click();
        }
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    // Main Chat Message Click Handler
    document.getElementById('chat-messages').addEventListener('click', async (e) => {

        const voiceBody = e.target.closest('.voice-message-body');
        if (voiceBody) {
            const bubble = voiceBody.closest('.message-bubble');
            if (!bubble) return;

            // 如果是用户自己的语音，只切换文字显示，不播放
            if (bubble.classList.contains('user')) {
                window.toggleVoiceTranscript(bubble);
                return;
            }

            // 如果是AI的语音消息
            const chat = window.state.chats[window.state.activeChatId];
            if (!chat) return;

            // --- 核心逻辑开始 ---

            // 1. 检查是否点击了正在播放的语音条
            if (window.isTtsPlaying && window.currentTtsAudioBubble === bubble) {
                // 如果是，则停止播放并收起所有关联的文字
                window.stopMinimaxAudio();
            }
            // 2. 检查点击的是否是已经展开了文字但没有播放的语音条
            else if (bubble.dataset.state === 'expanded') {
                // 如果是，则只收起文字，不影响其他
                window.toggleVoiceTranscript(bubble);
            }
            // 3. 如果以上都不是，说明是想开始播放或只展开文字
            else {
                const clickedTimestamp = parseInt(bubble.dataset.timestamp);
                const startIndex = chat.history.findIndex((m) => m.timestamp === clickedTimestamp);
                if (startIndex === -1) return;

                // 查找连续的语音消息
                const messagesToPlay = window.findConsecutiveAiVoiceMessages(chat.history, startIndex);
                if (messagesToPlay.length > 0) {
                    const bubblesToAnimate = messagesToPlay.map((m) => document.querySelector(`.message-bubble[data-timestamp="${m.timestamp}"]`)).filter(Boolean);

                    // 检查配置，决定是播放还是只显示文字
                    const groupId = window.state.apiConfig.minimaxGroupId;
                    const apiKey = window.state.apiConfig.minimaxApiKey;
                    const voiceId = chat.settings.minimaxVoiceId;

                    if (groupId && apiKey && voiceId) {
                        // 【播放分支】
                        // 先展开所有文字
                        bubblesToAnimate.forEach((b) => {
                            if (b.dataset.state !== 'expanded') {
                                window.toggleVoiceTranscript(b);
                            }
                        });
                        // 然后调用播放器
                        const combinedText = messagesToPlay.map((m) => m.content.trim()).join('，');
                        window.playMinimaxAudio(combinedText, voiceId, bubblesToAnimate);
                    } else {
                        // 【只显示文字分支】
                        // 只展开当前点击的这一个语音条的文字
                        window.toggleVoiceTranscript(bubble);
                    }
                }
            }

            return; // 处理完语音后退出
        }

        // --- 你原来的其他点击事件逻辑 ---
        const aiImage = e.target.closest('.ai-generated-image');
        if (aiImage) {
            const description = aiImage.dataset.description;
            if (description) showCustomAlert('照片描述', description);
            return;
        }
        const linkCard = e.target.closest('.link-share-card');
        if (linkCard && linkCard.closest('.message-bubble.is-link-share')) {
            const timestamp = parseInt(linkCard.dataset.timestamp);
            if (!isNaN(timestamp)) {
                openBrowser(timestamp);
            }
        }
        const packetCard = e.target.closest('.red-packet-card');
        if (packetCard) {
            const messageBubble = packetCard.closest('.message-bubble');
            if (messageBubble && messageBubble.dataset.timestamp) {
                const timestamp = parseInt(messageBubble.dataset.timestamp);
                handlePacketClick(timestamp);
            }
        }

        const card = e.target.closest('.waimai-card');
        if (card) {
            const messageBubble = card.closest('.message-bubble');
            const invitationMsg = window.state.chats[window.state.activeChatId].history.find((m) => m.timestamp === parseInt(messageBubble.dataset.timestamp));
            if (invitationMsg && invitationMsg.type === 'lovers_space_invitation' && invitationMsg.status === 'pending') {
                const choice = e.target.dataset.choice;
                if (choice) {
                    handleLoversSpaceResponse(invitationMsg.timestamp, choice);
                }
            }
        }
        const repostCard = e.target.closest('.link-share-card[data-post-id]');
        if (repostCard) {
            const postId = parseInt(repostCard.dataset.postId);
            if (!isNaN(postId)) {
                openPost(postId);
            }
        }

        // 处理分享卡片的点击
        const shareCard = e.target.closest('.link-share-card[data-timestamp]');
        if (shareCard && shareCard.closest('.message-bubble.is-link-share')) {
            const timestamp = parseInt(shareCard.dataset.timestamp);
            if (!isNaN(timestamp)) {
                const msg = window.state.chats[window.state.activeChatId].history.find((m) => m.timestamp === timestamp);
                if (msg && msg.type === 'share_card') openSharedHistoryViewer(timestamp);
                else if (msg && msg.type === 'share_link') openBrowser(timestamp);
            }
        }

        // 处理已撤回消息的点击
        const placeholder = e.target.closest('.recalled-message-placeholder');
        if (placeholder) {
            const wrapper = placeholder.closest('.message-wrapper');
            const chat = window.state.chats[window.state.activeChatId];
            if (chat && wrapper) {
                const timestamp = parseInt(wrapper.dataset.timestamp);
                const recalledMsg = chat.history.find((m) => m.timestamp === timestamp);
                if (recalledMsg && recalledMsg.recalledData) {
                    let originalContentText = '';
                    const recalled = recalledMsg.recalledData;
                    if (recalled.originalType === 'text') {
                        originalContentText = `原文: "${recalled.originalContent}"`;
                    } else {
                        originalContentText = `撤回了一条[${recalled.originalType}]类型的消息`;
                    }
                    showCustomAlert('已撤回的消息', originalContentText);
                }
            }
        }

        const chatCard = e.target.closest('.dating-summary-chat-card');
        if (chatCard && chatCard.dataset.summaryPayload) {
            try {
                // 读取并解析存储在 data-* 属性中的卡片数据
                const payloadString = chatCard.dataset.summaryPayload.replace(/&apos;/g, "'").replace(/"/g, '&quot;');
                const payload = JSON.parse(payloadString);
                // 调用我们新写的函数，打开详情卡片
                reopenDatingSummary(payload);
            } catch (error) {
                console.error('解析分享的约会记录失败:', error);
                alert('无法打开这个约会记录。');
            }
        }
    });

    // 2. 添加严格的筛选条件 (AI Transfer Pending)
    document.getElementById('chat-messages').addEventListener('click', (e) => {
        // 1. 向上查找被点击的元素是否在一个消息气泡内
        const bubble = e.target.closest('.message-bubble');
        if (!bubble) return; // 如果不在，就退出

        // 2. 添加严格的筛选条件
        // 必须是 AI 的消息 (.ai)
        // 必须是转账类型 (.is-transfer)
        // 必须是我们标记为“待处理”的 (data-status="pending")
        if (bubble.classList.contains('ai') && bubble.classList.contains('is-transfer') && bubble.dataset.status === 'pending') {
            // 3. 只有满足所有条件，才执行后续逻辑
            const timestamp = parseInt(bubble.dataset.timestamp);
            if (!isNaN(timestamp)) {
                showTransferActionModal(timestamp);
            }
        }
    });



    document.getElementById('open-persona-library-btn').addEventListener('click', () => window.openPersonaLibrary && window.openPersonaLibrary());
    document.getElementById('close-persona-library-btn').addEventListener('click', () => window.closePersonaLibrary && window.closePersonaLibrary());
    document.getElementById('add-persona-preset-btn').addEventListener('click', () => window.openPersonaEditorForCreate && window.openPersonaEditorForCreate());
    document.getElementById('cancel-persona-editor-btn').addEventListener('click', () => window.closePersonaEditor && window.closePersonaEditor());

    document.getElementById('preset-action-edit').addEventListener('click', () => window.openPersonaEditorForEdit && window.openPersonaEditorForEdit());
    document.getElementById('preset-action-delete').addEventListener('click', () => window.deletePersonaPreset && window.deletePersonaPreset());
    document.getElementById('preset-action-cancel').addEventListener('click', () => window.hidePresetActions && window.hidePresetActions());

    document.getElementById('selection-cancel-btn').addEventListener('click', () => window.exitSelectionMode && window.exitSelectionMode());

    document.getElementById('selection-delete-btn').addEventListener('click', async () => {
        if (selectedMessages.size === 0) return;
        const confirmed = await showCustomConfirm('删除消息', `确定要删除选中的 ${selectedMessages.size} 条消息吗？这将改变AI的记忆。`, { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            const chat = window.state.chats[window.state.activeChatId];

            // 1. 在删除前，检查被删除的消息中是否包含投票
            let deletedPollsInfo = [];
            for (const timestamp of selectedMessages) {
                const msg = chat.history.find((m) => m.timestamp === timestamp);
                if (msg && msg.type === 'poll') {
                    deletedPollsInfo.push(`关于“${msg.question}”的投票(时间戳: ${msg.timestamp})`);
                }
            }

            // 2. 更新后端的历史记录
            chat.history = chat.history.filter((msg) => !selectedMessages.has(msg.timestamp));

            // 3. 构建更具体的“遗忘指令”
            let forgetReason = '一些之前的消息已被用户删除。';
            if (deletedPollsInfo.length > 0) {
                forgetReason += ` 其中包括以下投票：${deletedPollsInfo.join('；')}。`;
            }
            forgetReason += ' 你应该像它们从未存在过一样继续对话，并相应地调整你的记忆和行为，不要再提及这些被删除的内容。';

            const forgetInstruction = {
                role: 'system',
                content: `[系统提示：${forgetReason}]`,
                timestamp: Date.now(),
                isHidden: true,
            };
            chat.history.push(forgetInstruction);

            // 4. 将包含“遗忘指令”的、更新后的chat对象存回数据库
            await window.db.chats.put(chat);

            // 5. 最后才更新UI
            renderChatInterface(window.state.activeChatId);
            renderChatList();
        }
    });

    // Share Selection
    document.getElementById('selection-share-btn').addEventListener('click', () => {
        if (selectedMessages.size > 0) {
            openShareTargetPicker(); // 打开我们即将创建的目标选择器
        }
    });

    // Share Target Confirm
    document.getElementById('confirm-share-target-btn').addEventListener('click', async () => {
        const sourceChat = window.state.chats[window.state.activeChatId];
        const selectedTargetIds = Array.from(document.querySelectorAll('.share-target-checkbox:checked')).map((cb) => cb.dataset.chatId);

        if (selectedTargetIds.length === 0) {
            alert('请至少选择一个要分享的聊天。');
            return;
        }

        // 1. 打包聊天记录
        const sharedHistory = [];
        const sortedTimestamps = [...selectedMessages].sort((a, b) => a - b);
        for (const timestamp of sortedTimestamps) {
            const msg = sourceChat.history.find((m) => m.timestamp === timestamp);
            if (msg) {
                sharedHistory.push(msg);
            }
        }

        // 2. 创建分享卡片消息对象
        const shareCardMessage = {
            role: 'user',
            senderName: sourceChat.isGroup ? sourceChat.settings.myNickname || '我' : '我',
            type: 'share_card',
            timestamp: Date.now(),
            payload: {
                sourceChatName: sourceChat.name,
                title: `来自“${sourceChat.name}”的聊天记录`,
                sharedHistory: sharedHistory,
            },
        };

        // 3. 循环发送到所有目标聊天
        for (const targetId of selectedTargetIds) {
            const targetChat = window.state.chats[targetId];
            if (targetChat) {
                targetChat.history.push(shareCardMessage);
                await window.db.chats.put(targetChat);
            }
        }

        // 4. 收尾工作
        document.getElementById('share-target-modal').classList.remove('visible');
        exitSelectionMode(); // 退出多选模式
        await showCustomAlert('分享成功', `聊天记录已成功分享到 ${selectedTargetIds.length} 个会话中。`);
        renderChatList(); // 刷新列表，可能会有新消息提示
    });

    // Share Target Cancel
    document.getElementById('cancel-share-target-btn').addEventListener('click', () => {
        document.getElementById('share-target-modal').classList.remove('visible');
    });

    // Chat Lock Overlay
    document.getElementById('chat-lock-overlay').addEventListener('click', async (e) => {
        const chat = window.state.chats[window.state.activeChatId];
        if (!chat) return;

        if (e.target.id === 'force-apply-check-btn') {
            alert('正在手动触发好友申请流程，请稍后...\n如果API调用成功，将弹出提示。如果失败，也会有错误提示。如果长时间无反应，说明AI可能决定暂时不申请。');
            await triggerAiFriendApplication(chat.id);
            renderChatInterface(chat.id);
            return;
        }

        if (e.target.id === 'unblock-btn') {
            chat.relationship.status = 'friend';
            chat.relationship.blockedTimestamp = null;

            const hiddenMessage = {
                role: 'system',
                content: `[系统提示：用户刚刚解除了对你的拉黑。现在你们可以重新开始对话了。]`,
                timestamp: Date.now(),
                isHidden: true,
            };
            chat.history.push(hiddenMessage);

            await window.db.chats.put(chat);
            renderChatInterface(chat.id);
            renderChatList();
            triggerAiResponse(); // 【可选但推荐】解除后让AI主动说点什么
        } else if (e.target.id === 'accept-friend-btn') {
            chat.relationship.status = 'friend';
            chat.relationship.applicationReason = '';

            const hiddenMessage = {
                role: 'system',
                content: `[系统提示：用户刚刚通过了你的好友申请。你们现在又可以正常聊天了。]`,
                timestamp: Date.now(),
                isHidden: true,
            };
            chat.history.push(hiddenMessage);

            await window.db.chats.put(chat);
            renderChatInterface(chat.id);
            renderChatList();
            const msg = { role: 'user', content: '我通过了你的好友请求', timestamp: Date.now() };
            chat.history.push(msg);
            await window.db.chats.put(chat);
            appendMessage(msg, chat);
            triggerAiResponse();
        } else if (e.target.id === 'reject-friend-btn') {
            chat.relationship.status = 'blocked_by_user';
            chat.relationship.blockedTimestamp = Date.now();
            chat.relationship.applicationReason = '';
            await window.db.chats.put(chat);
            renderChatInterface(chat.id);
        }
        // 处理申请好友按钮的点击事件
        else if (e.target.id === 'apply-friend-btn') {
            const reason = await showCustomPrompt('发送好友申请', `请输入你想对“${chat.name}”说的申请理由：`, '我们和好吧！');
            // 只有当用户输入了内容并点击“确定”后才继续
            if (reason !== null) {
                // 更新关系状态为“等待AI批准”
                chat.relationship.status = 'pending_ai_approval';
                chat.relationship.applicationReason = reason;
                await window.db.chats.put(chat);

                // 刷新UI，显示“等待通过”的界面
                renderChatInterface(chat.id);
                renderChatList();

                // 触发AI响应，让它去处理这个好友申请
                triggerAiResponse();
            }
        }
    });

    // AI Avatar Library
    console.log('Binding AI Avatar Library events');
    document.getElementById('manage-ai-avatar-library-btn').addEventListener('click', () => window.openAiAvatarLibraryModal && window.openAiAvatarLibraryModal());
    document.getElementById('add-ai-avatar-btn').addEventListener('click', () => window.addAvatarToLibrary && window.addAvatarToLibrary());
    document.getElementById('close-ai-avatar-library-btn').addEventListener('click', () => window.closeAiAvatarLibraryModal && window.closeAiAvatarLibraryModal());
    setupFileUpload('preset-avatar-input', (base64) => (document.getElementById('preset-avatar-preview').src = base64));

    // Share Link Modal
    document.getElementById('share-link-btn').addEventListener('click', openShareLinkModal);
    document.getElementById('cancel-share-link-btn').addEventListener('click', () => {
        document.getElementById('share-link-modal').classList.remove('visible');
    });
    document.getElementById('confirm-share-link-btn').addEventListener('click', sendUserLinkShare);

    // Quote/Reply
    document.getElementById('quote-message-btn').addEventListener('click', () => window.startReplyToMessage && window.startReplyToMessage());
    document.getElementById('cancel-reply-btn').addEventListener('click', () => window.cancelReplyMode && window.cancelReplyMode());

    // Message Actions
    document.getElementById('cancel-message-action-btn').addEventListener('click', () => window.hideMessageActions && window.hideMessageActions());
    document.getElementById('edit-message-btn').addEventListener('click', () => window.openAdvancedMessageEditor && window.openAdvancedMessageEditor());

    document.getElementById('reroll-nai-btn').addEventListener('click', () => window.handleNaiReroll && window.handleNaiReroll());
    document.getElementById('copy-message-btn').addEventListener('click', () => window.copyMessageContent && window.copyMessageContent());
    document.getElementById('recall-message-btn').addEventListener('click', () => window.handleRecallClick && window.handleRecallClick());
    document.getElementById('select-message-btn').addEventListener('click', () => {
        // 在关闭菜单前，先捕获时间戳
        const timestampToSelect = window.activeMessageTimestamp;
        if (window.hideMessageActions) window.hideMessageActions();
        // 使用捕获到的值
        if (timestampToSelect) {
            enterSelectionMode(timestampToSelect);
        }
    });

    // Shared History Viewer Close
    document.getElementById('close-shared-history-viewer-btn').addEventListener('click', () => {
        document.getElementById('shared-history-viewer-modal').classList.remove('visible');
    });

    // Chat List Swipe / Click
    chatListEl.addEventListener('mousedown', (e) => {
        const content = e.target.closest('.chat-list-item-content');
        if (content) {
            resetAllChatSwipes(content);
            chatSwipeState.isDragging = true;
            chatSwipeState.startX = e.pageX;
            chatSwipeState.activeContent = content;
            // 阻止拖动时选中文本
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;
        const diffX = e.pageX - chatSwipeState.startX;
        if (diffX < 0 && diffX > -170) {
            // 只允许向左滑, 限制最大距离
            chatSwipeState.activeContent.style.transition = 'none'; // 滑动时禁用动画
            chatSwipeState.activeContent.style.transform = `translateX(${diffX}px)`;
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;

        chatSwipeState.activeContent.style.transition = 'transform 0.3s ease';
        const transformStyle = window.getComputedStyle(chatSwipeState.activeContent).transform;
        const currentTranslateX = new DOMMatrix(transformStyle).m41;

        if (currentTranslateX < -60) {
            // 滑动超过阈值
            chatSwipeState.activeContent.classList.add('swiped');
        } else {
            chatSwipeState.activeContent.classList.remove('swiped');
        }
        chatSwipeState.activeContent.style.transform = ''; // 清除内联样式，交由CSS class控制

        // 重置状态
        chatSwipeState.isDragging = false;
        chatSwipeState.activeContent = null;
    });

    // 移动端触摸事件的兼容
    chatListEl.addEventListener(
        'touchstart',
        (e) => {
            const content = e.target.closest('.chat-list-item-content');
            if (content) {
                resetAllChatSwipes(content);
                chatSwipeState.isDragging = true;
                chatSwipeState.startX = e.touches[0].pageX;
                chatSwipeState.activeContent = content;
            }
        },
        { passive: true }
    );

    chatListEl.addEventListener(
        'touchmove',
        (e) => {
            if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;
            const diffX = e.touches[0].pageX - chatSwipeState.startX;
            if (diffX < 0 && diffX > -170) {
                chatSwipeState.activeContent.style.transition = 'none';
                chatSwipeState.activeContent.style.transform = `translateX(${diffX}px)`;
            }
        },
        { passive: true }
    );

    chatListEl.addEventListener('touchend', (e) => {
        if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;

        chatSwipeState.activeContent.style.transition = 'transform 0.3s ease';
        const transformStyle = window.getComputedStyle(chatSwipeState.activeContent).transform;
        const currentTranslateX = new DOMMatrix(transformStyle).m41;

        if (currentTranslateX < -60) {
            chatSwipeState.activeContent.classList.add('swiped');
        } else {
            chatSwipeState.activeContent.classList.remove('swiped');
        }
        chatSwipeState.activeContent.style.transform = '';

        chatSwipeState.isDragging = false;
        chatSwipeState.activeContent = null;
    });

    // 聊天列表操作按钮点击事件
    chatListEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('swipe-action-btn')) {
            const container = target.closest('.chat-list-item-swipe-container');
            if (!container) return;

            const chatId = container.dataset.chatId;
            const chat = window.state.chats[chatId];
            if (!chat) return;

            if (target.classList.contains('pin') || target.classList.contains('unpin')) {
                // 置顶或取消置顶
                chat.isPinned = !chat.isPinned;
                await window.db.chats.put(chat);
                await renderChatList(); // 重新渲染列表以更新排序
            } else if (target.classList.contains('delete')) {
                // 删除
                const confirmed = await showCustomConfirm('删除对话', `确定要删除与 "${chat.name}" 的整个对话吗？此操作不可撤销。`, { confirmButtonClass: 'btn-danger' });
                if (confirmed) {
                    if (window.state.musicState.isActive && window.state.musicState.activeChatId === chat.id) await endListenTogetherSession(false);
                    delete window.state.chats[chat.id];
                    if (window.state.activeChatId === chat.id) window.state.activeChatId = null;
                    await window.db.chats.delete(chat.id);
                    await renderChatList();
                } else {
                    // 如果取消删除，则把滑块收回去
                    const content = container.querySelector('.chat-list-item-content');
                    if (content) content.classList.remove('swiped');
                }
            }
        }
    });

    document.getElementById('transfer-action-accept').addEventListener('click', () => handleUserTransferResponse('accepted'));

    // 浏览器返回按钮的事件监听
    const browserBackBtn = document.getElementById('browser-back-btn');
    if (browserBackBtn) {
        browserBackBtn.addEventListener('click', () => {
            if (window.showScreen) window.showScreen('chat-interface-screen');
        });
    }

    const themeToggleSwitch = document.getElementById('theme-toggle-switch');
    if (themeToggleSwitch) {
        themeToggleSwitch.addEventListener('change', window.toggleTheme);
    }
}

/**
 * 处理用户接受或拒绝转账的逻辑
 * @param {string} choice - 用户的选择, 'accepted' 或 'declined'
 */
async function handleUserTransferResponse(choice) {
    if (!window.activeTransferTimestamp) return;

    const timestamp = window.activeTransferTimestamp;
    const chat = window.state.chats[window.state.activeChatId];
    const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
    if (messageIndex === -1) return;

    // 1. 更新原始转账消息的状态
    const originalMessage = chat.history[messageIndex];
    originalMessage.status = choice;

    let systemContent;

    // 2. 如果用户选择“拒绝”
    if (choice === 'declined') {
        // 立刻在前端生成一个“退款”卡片，让用户看到
        const refundMessage = {
            role: 'user',
            type: 'transfer',
            isRefund: true, // 这是一个关键标记，用于UI显示这是退款
            amount: originalMessage.amount,
            note: '已拒收对方转账',
            timestamp: Date.now(),
        };
        chat.history.push(refundMessage);

        // 准备一条对AI可见的隐藏消息，告诉它发生了什么
        systemContent = `[系统提示：你拒绝并退还了“${originalMessage.senderName}”的转账。]`;
    } else {
        // 如果用户选择“接受”
        // 只需准备隐藏消息通知AI即可
        systemContent = `[系统提示：你接受了“${originalMessage.senderName}”的转账。]`;
        if (window.updateUserBalanceAndLogTransaction) {
            await window.updateUserBalanceAndLogTransaction(originalMessage.amount, `收到来自 ${originalMessage.senderName} 的转账`);
        }
    }

    // 3. 创建这条对用户隐藏、但对AI可见的系统消息
    const hiddenMessage = {
        role: 'system',
        content: systemContent,
        timestamp: Date.now() + 1, // 保证时间戳在退款消息之后
        isHidden: true, // 这个标记会让它不在聊天界面显示
    };
    chat.history.push(hiddenMessage);

    // 4. 保存所有更改到数据库，并刷新界面
    await window.db.chats.put(chat);
    if (typeof hideTransferActionModal === 'function') hideTransferActionModal();
    renderChatInterface(window.state.activeChatId);
    renderChatList();
}

window.setupChatListeners = setupChatListeners;



// --- Moved from main-app.js ---

function toggleVoiceTranscript(bubble) {
    if (!bubble) return;

    const transcriptEl = bubble.querySelector('.voice-transcript');
    if (!transcriptEl) return;

    // 核心逻辑：直接检查文字区域当前是不是显示状态
    const isCurrentlyExpanded = transcriptEl.style.display === 'block';

    if (isCurrentlyExpanded) {
        // 如果是展开的，就直接收起来
        transcriptEl.style.display = 'none';
        bubble.dataset.state = 'collapsed'; // 更新状态标记
    } else {
        // 如果是收起的，就执行展开流程
        bubble.dataset.state = 'expanded'; // 更新状态标记

        // 1. 先显示一个“正在转写”的提示，给用户即时反馈
        transcriptEl.textContent = '正在转文字...';
        transcriptEl.style.display = 'block';

        // 2. 模拟一个短暂的“识别”过程
        setTimeout(() => {
            // 再次检查元素是否还在页面上，防止用户切换聊天导致错误
            if (document.body.contains(transcriptEl)) {
                // 获取并显示真正的转写文字
                const voiceText = bubble.dataset.voiceText || '(无法识别)';
                transcriptEl.textContent = voiceText;
            }
        }, 300); // 300毫秒的延迟，感觉更灵敏
    }
}
window.toggleVoiceTranscript = toggleVoiceTranscript;

function openLoversSpaceFromCard(charId, viewId) {
    // 1. 打开指定角色的情侣空间主界面
    openLoversSpace(charId);

    // 2. 等待一小会儿，确保界面已渲染
    setTimeout(() => {
        // 3. 找到对应的页签按钮并模拟点击它
        const targetTab = document.querySelector(`.ls-tab-item[data-view='${viewId}']`);
        if (targetTab) {
            targetTab.click();
        }
    }, 100); // 100毫秒的延迟通常足够了
}
window.openLoversSpaceFromCard = openLoversSpaceFromCard;

function enterSelectionMode(initialMsgTimestamp) {
    if (isSelectionMode) return;
    isSelectionMode = true;
    document.getElementById('chat-interface-screen').classList.add('selection-mode');
    toggleMessageSelection(initialMsgTimestamp);
}

function exitSelectionMode() {
    cleanupWaimaiTimers();
    if (!isSelectionMode) return;
    isSelectionMode = false;
    document.getElementById('chat-interface-screen').classList.remove('selection-mode');
    selectedMessages.forEach((ts) => {
        const bubble = document.querySelector(`.message-bubble[data-timestamp="${ts}"]`);
        if (bubble) bubble.classList.remove('selected');
    });
    selectedMessages.clear();
}

function toggleMessageSelection(timestamp) {
    const elementToSelect = document.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);

    if (!elementToSelect) return;

    if (selectedMessages.has(timestamp)) {
        selectedMessages.delete(timestamp);
        elementToSelect.classList.remove('selected');
    } else {
        selectedMessages.add(timestamp);
        elementToSelect.classList.add('selected');
    }

    document.getElementById('selection-count').textContent = `已选 ${selectedMessages.size} 条`;

    if (selectedMessages.size === 0) {
        exitSelectionMode();
    }
}

function addLongPressListener(element, callback) {
    let pressTimer;
    const startPress = (e) => {
        if (isSelectionMode) return;
        e.preventDefault();
        pressTimer = window.setTimeout(() => callback(e), 500);
    };
    const cancelPress = () => clearTimeout(pressTimer);
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', cancelPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchstart', startPress, { passive: true });
    element.addEventListener('touchend', cancelPress);
    element.addEventListener('touchmove', cancelPress);
}
window.addLongPressListener = addLongPressListener;

function showMessageActions(timestamp) {
    // 如果已经在多选模式，则不弹出菜单
    if (isSelectionMode) return;

    activeMessageTimestamp = timestamp;

    // --- 新增逻辑开始 ---
    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestamp);
    const rerollNaiBtn = document.getElementById('reroll-nai-btn');

    // 检查消息类型是否为 naiimag
    if (message && (message.type === 'naiimag' || (message.type === 'qzone_post' && message.postType === 'naiimag'))) {
        rerollNaiBtn.style.display = 'block';
    } else {
        rerollNaiBtn.style.display = 'none';
    }
    // --- 新增逻辑结束 ---

    document.getElementById('message-actions-modal').classList.add('visible');
}
window.showMessageActions = showMessageActions;

function hideMessageActions() {
    document.getElementById('message-actions-modal').classList.remove('visible');
    window.activeMessageTimestamp = null; // Use current global
}
window.hideMessageActions = hideMessageActions;

async function handleNaiReroll() {
    if (!activeMessageTimestamp || !state.activeChatId) return;

    const chat = state.chats[state.activeChatId];
    const msgIndex = chat.history.findIndex((m) => m.timestamp === activeMessageTimestamp);
    if (msgIndex === -1) return;

    const message = chat.history[msgIndex];

    // 关闭菜单
    hideMessageActions();

    // 获取提示词 (优先使用保存的完整提示词 fullPrompt，如果没有则重新构建)
    let finalPositivePrompt = message.fullPrompt;
    if (!finalPositivePrompt) {
        const naiPrompts = getCharacterNAIPrompts(chat.id);
        const aiPrompt = message.prompt || 'a beautiful scene';
        finalPositivePrompt = aiPrompt + ', ' + naiPrompts.positive;
    }

    // 获取负面提示词
    const naiPrompts = getCharacterNAIPrompts(chat.id);
    const finalNegativePrompt = naiPrompts.negative;

    // 获取设置
    const apiKey = localStorage.getItem('novelai-api-key');
    const model = localStorage.getItem('novelai-model') || 'nai-diffusion-4-5-full';
    const settings = getNovelAISettings();

    if (!apiKey) {
        alert('请先配置 NovelAI API Key！');
        return;
    }

    // 显示加载提示
    await showCustomAlert('正在重绘...', '正在重新连接 NovelAI 生成图片，请稍候...');

    try {
        const [width, height] = settings.resolution.split('x').map(Number);
        let requestBody;

        // 构建请求体 (逻辑与你原有的 generateNovelAIImage 一致)
        // 这里为了简洁，提取关键构建逻辑
        const commonParams = {
            width,
            height,
            scale: settings.cfg_scale,
            sampler: settings.sampler,
            steps: settings.steps,
            seed: Math.floor(Math.random() * 4294967295), // 关键：重绘必须用随机种子
            n_samples: 1,
            ucPreset: settings.uc_preset,
            qualityToggle: settings.quality_toggle,
        };

        if (model.includes('nai-diffusion-4')) {
            requestBody = {
                input: finalPositivePrompt,
                model: model,
                action: 'generate',
                parameters: {
                    ...commonParams,
                    params_version: 3,
                    negative_prompt: finalNegativePrompt,
                    v4_prompt: {
                        caption: { base_caption: finalPositivePrompt, char_captions: [] },
                        use_coords: false,
                        use_order: true,
                    },
                    v4_negative_prompt: {
                        caption: { base_caption: finalNegativePrompt, char_captions: [] },
                        legacy_uc: false,
                    },
                },
            };
        } else {
            requestBody = {
                input: finalPositivePrompt,
                model: model,
                action: 'generate',
                parameters: {
                    ...commonParams,
                    negative_prompt: finalNegativePrompt,
                    sm: settings.smea,
                    sm_dyn: settings.smea_dyn,
                    add_original_image: false,
                },
            };
        }

        let apiUrl = model.includes('nai-diffusion-4') ? 'https://image.novelai.net/ai/generate-image-stream' : 'https://image.novelai.net/ai/generate-image';
        let corsProxy = settings.cors_proxy === 'custom' ? settings.custom_proxy_url : settings.cors_proxy;
        if (corsProxy) apiUrl = corsProxy + encodeURIComponent(apiUrl);

        // Chrome 兼容头
        const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
        let headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey };
        if (isChrome) {
            const cleanHeaders = {};
            for (const [k, v] of Object.entries(headers)) cleanHeaders[k] = v.replace(/[^\x00-\xFF]/g, '');
            headers = cleanHeaders;
        }

        const res = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
        if (!res.ok) throw new Error(`NAI API Error: ${res.status}`);

        // 解析结果 (复用你的解析逻辑)
        const contentType = res.headers.get('content-type');
        let imageDataUrl = null;
        let zipBlob = null;

        if (contentType && contentType.includes('text/event-stream')) {
            const text = await res.text();
            const lines = text.trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    const dataContent = line.substring(6);
                    try {
                        const jsonData = JSON.parse(dataContent);
                        if ((jsonData.event_type === 'final' && jsonData.image) || jsonData.data || jsonData.image) {
                            const base64Data = jsonData.image || jsonData.data;
                            const isPNG = base64Data.startsWith('iVBORw0KGgo');
                            const binaryString = atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);
                            const blobType = isPNG ? 'image/png' : 'image/jpeg';
                            const imageBlob = new Blob([bytes], { type: blobType });
                            const reader = new FileReader();
                            imageDataUrl = await new Promise((r) => {
                                reader.onloadend = () => r(reader.result);
                                reader.readAsDataURL(imageBlob);
                            });
                            break;
                        }
                    } catch (e) { }
                }
            }
        } else {
            zipBlob = await res.blob();
        }

        if (!imageDataUrl && zipBlob) {
            if (typeof JSZip === 'undefined') throw new Error('JSZip库未加载');
            const zip = await JSZip.loadAsync(zipBlob);
            const file = Object.values(zip.files)[0];
            if (file) {
                const imgBlob = await file.async('blob');
                const reader = new FileReader();
                imageDataUrl = await new Promise((r) => {
                    reader.onloadend = () => r(reader.result);
                    reader.readAsDataURL(imgBlob);
                });
            }
        }

        if (imageDataUrl) {
            // *** 核心：更新原来的消息 ***
            message.imageUrl = imageDataUrl;

            // 保存数据库
            await db.chats.put(chat);

            // 隐藏遮罩
            document.getElementById('custom-modal-overlay').classList.remove('visible'); // 假设 showCustomAlert 使用的是这个

            // 刷新界面
            renderChatInterface(state.activeChatId);

            // 提示成功
            // alert('图片重绘成功！'); // 可选，因为看到图片变了就知道成功了
        } else {
            throw new Error('未解析到图片数据');
        }
    } catch (error) {
        console.error('重绘失败:', error);
        document.getElementById('custom-modal-overlay').classList.remove('visible');
        alert(`重绘失败: ${error.message}`);
    }
}

async function openMessageEditor() {
    if (!activeMessageTimestamp) return;

    const timestampToEdit = activeMessageTimestamp;
    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestampToEdit);
    if (!message) return;

    hideMessageActions();

    let contentForEditing;
    const isSpecialType = message.type && ['voice_message', 'ai_image', 'transfer', 'share_link', 'borrow_money_request'].includes(message.type);

    if (isSpecialType) {
        if (message.type === 'borrow_money_request') {
            // ★★★ 这就是我们新增的核心逻辑！ ★★★
            // 当编辑的是借钱卡片时，我们从 payload 中提取数据并拼接成你想要的文本格式
            const payload = message.payload;
            contentForEditing = `向你借钱${payload.amount}元，用于${payload.reason}`;
        } else {
            // 其他特殊类型的处理逻辑保持不变
            let fullMessageObject = { type: message.type };
            if (message.type === 'voice_message') fullMessageObject.content = message.content;
            else if (message.type === 'ai_image') fullMessageObject.description = message.content;
            else if (message.type === 'transfer') {
                fullMessageObject.amount = message.amount;
                fullMessageObject.note = message.note;
            } else if (message.type === 'share_link') {
                fullMessageObject.title = message.title;
                fullMessageObject.description = message.description;
                fullMessageObject.source_name = message.source_name;
                fullMessageObject.content = message.content;
            }
            contentForEditing = JSON.stringify(fullMessageObject, null, 2);
        }
    } else if (typeof message.content === 'object') {
        contentForEditing = JSON.stringify(message.content, null, 2);
    } else {
        contentForEditing = message.content;
    }

    const templates = {
        voice: { type: 'voice_message', content: '在这里输入语音内容' },
        image: { type: 'ai_image', description: '在这里输入图片描述' },
        transfer: { type: 'transfer', amount: 5.2, note: '一点心意' },
        link: {
            type: 'share_link',
            title: '文章标题',
            description: '文章摘要...',
            source_name: '来源网站',
            content: '文章完整内容...',
        },
    };

    const helpersHtml = `
			        <div class="format-helpers">
			            <button class="format-btn" data-template='${JSON.stringify(templates.voice)}'>语音</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.image)}'>图片</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.transfer)}'>转账</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.link)}'>链接</button>
			        </div>
			    `;

    const newContent = await showCustomPrompt('编辑消息', '在此修改，或点击上方按钮使用格式模板...', contentForEditing, 'textarea', helpersHtml);

    if (newContent !== null) {
        await saveEditedMessage(timestampToEdit, newContent);
    }
}

async function copyMessageContent() {
    if (!activeMessageTimestamp) return;
    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === activeMessageTimestamp);
    if (!message) return;

    let textToCopy;
    if (typeof message.content === 'object') {
        textToCopy = JSON.stringify(message.content);
    } else {
        textToCopy = String(message.content);
    }

    try {
        await navigator.clipboard.writeText(textToCopy);
        await showCustomAlert('复制成功', '消息内容已复制到剪贴板。');
    } catch (err) {
        await showCustomAlert('复制失败', '无法访问剪贴板。');
    }

    hideMessageActions();
}
window.copyMessageContent = copyMessageContent;

function createMessageEditorBlock(initialContent = '') {
    const block = document.createElement('div');
    block.className = 'message-editor-block';

    // 添加 'link' 模板
    const templates = {
        voice: { type: 'voice_message', content: '在这里输入语音内容' },
        image: { type: 'ai_image', description: '在这里输入图片描述' },
        transfer: { type: 'transfer', amount: 5.2, note: '一点心意' },
        link: {
            type: 'share_link',
            title: '文章标题',
            description: '文章摘要...',
            source_name: '来源网站',
            content: '文章完整内容...',
        },
    };

    block.innerHTML = `
			        <button class="delete-block-btn" title="删除此条">×</button>
			        <textarea>${initialContent}</textarea>
			        <div class="format-helpers">
			            <button class="format-btn" data-template='${JSON.stringify(templates.voice)}'>语音</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.image)}'>图片</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.transfer)}'>转账</button>
			            
			            <button class="format-btn" data-template='${JSON.stringify(templates.link)}'>链接</button>
			        </div>
			    `;

    // 绑定删除按钮事件
    block.querySelector('.delete-block-btn').addEventListener('click', () => {
        // 确保至少保留一个编辑块
        if (document.querySelectorAll('.message-editor-block').length > 1) {
            block.remove();
        } else {
            alert('至少需要保留一条消息。');
        }
    });

    // 绑定格式助手按钮事件
    block.querySelectorAll('.format-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const templateStr = btn.dataset.template;
            const textarea = block.querySelector('textarea');
            if (templateStr && textarea) {
                try {
                    const templateObj = JSON.parse(templateStr);
                    textarea.value = JSON.stringify(templateObj, null, 2);
                    textarea.focus();
                } catch (e) {
                    console.error('解析格式模板失败:', e);
                }
            }
        });
    });

    return block;
}

function openAdvancedMessageEditor() {
    if (!activeMessageTimestamp) return;

    // 1. 在关闭旧菜单前，将需要的时间戳捕获到局部变量中
    const timestampToEdit = activeMessageTimestamp;

    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestampToEdit);
    if (!message) return;

    // 2. 现在可以安全地关闭旧菜单了，因为它不会影响我们的局部变量
    hideMessageActions();

    const editorModal = document.getElementById('message-editor-modal');
    const editorContainer = document.getElementById('message-editor-container');
    editorContainer.innerHTML = '';

    // 3. 准备初始内容
    let initialContent;
    const isSpecialType = message.type && ['voice_message', 'ai_image', 'transfer'].includes(message.type);
    if (isSpecialType) {
        let fullMessageObject = { type: message.type };
        if (message.type === 'voice_message') fullMessageObject.content = message.content;
        else if (message.type === 'ai_image') fullMessageObject.description = message.content;
        else if (message.type === 'transfer') {
            fullMessageObject.amount = message.amount;
            fullMessageObject.note = message.note;
        }
        initialContent = JSON.stringify(fullMessageObject, null, 2);
    } else if (typeof message.content === 'object') {
        initialContent = JSON.stringify(message.content, null, 2);
    } else {
        if (message.type === 'sticker' || (typeof message.content === 'string' && STICKER_REGEX.test(message.content))) {
            initialContent = message.meaning ? `[sticker:${message.meaning}]` : message.content;
        } else {
            initialContent = message.content;
        }
    }

    const firstBlock = createMessageEditorBlock(initialContent);
    editorContainer.appendChild(firstBlock);

    // 4. 动态绑定所有控制按钮的事件
    // 为了防止事件重复绑定，我们使用克隆节点的方法来清除旧监听器
    const addBtn = document.getElementById('add-message-editor-block-btn');
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', () => {
        const newBlock = createMessageEditorBlock();
        editorContainer.appendChild(newBlock);
        newBlock.querySelector('textarea').focus();
    });

    const cancelBtn = document.getElementById('cancel-advanced-editor-btn');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', () => {
        editorModal.classList.remove('visible');
    });

    const saveBtn = document.getElementById('save-advanced-editor-btn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    // 将捕获到的时间戳，直接绑定给这一次的保存点击事件
    newSaveBtn.addEventListener('click', () => {
        saveEditedMessage(timestampToEdit);
    });

    // 5. 最后，显示模态框
    editorModal.classList.add('visible');
}
window.openAdvancedMessageEditor = openAdvancedMessageEditor;

function parseEditedContent(text) {
    const trimmedText = text.trim();
    // 1. 优先检查是否是 [sticker:名字] 格式
    const stickerNameMatch = trimmedText.match(/^\[sticker:(.+?)\]$/i);
    if (stickerNameMatch) {
        const name = stickerNameMatch[1];
        // 尝试去所有表情库里找回这个名字对应的URL
        const allStickers = [...(state.userStickers || []), ...(state.charStickers || [])];
        // 尝试获取当前聊天对象的专属表情(如果有)
        if (window.state && window.state.activeChatId && window.state.chats[window.state.activeChatId]) {
            const currentChat = window.state.chats[window.state.activeChatId];
            if (currentChat.settings.stickerLibrary) {
                allStickers.push(...currentChat.settings.stickerLibrary);
            }
        }

        const found = allStickers.find((s) => s.name === name);
        if (found) {
            // 如果找到了，这就还原成一个标准的表情包对象！
            return [{ type: 'sticker', content: found.url, meaning: found.name }];
        }
    }

    // 优先检查是否匹配“借钱”格式
    const borrowMatch = trimmedText.match(/向你借钱(\d+(\.\d+)?)元，用于(.+)/);
    if (borrowMatch) {
        const amount = parseFloat(borrowMatch[1]);
        const reason = borrowMatch[3].trim();

        // 1. 创建文本消息对象
        const textMessage = {
            type: 'text',
            content: trimmedText,
        };

        // 2. 创建借条卡片对象
        const cardMessage = {
            type: 'borrow_money_request',
            payload: {
                lenderName: '你', // 默认是向“你”借钱
                amount: amount,
                reason: reason,
            },
        };

        // 3. 将两条消息打包成一个数组返回！
        return [textMessage, cardMessage];
    }

    // 如果不是借钱格式，则执行原来的逻辑，但为了统一，也返回一个数组
    if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmedText);
            if (parsed.type) {
                return [parsed]; // 单个对象也包装成数组
            }
        } catch (e) {
            /* 解析失败，继续往下走 */
        }
    }

    if (STICKER_REGEX.test(trimmedText)) {
        return [{ type: 'sticker', content: trimmedText }];
    }

    // 默认返回一个只包含单条文本消息的数组
    return [{ type: 'text', content: trimmedText }];
}

async function saveEditedMessage(timestamp, simpleContent = null) {
    if (!timestamp) return;

    const chat = state.chats[state.activeChatId];
    const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
    if (messageIndex === -1) return;

    const originalMessage = chat.history[messageIndex];
    if (!originalMessage) return;

    let newMessagesData = [];

    if (simpleContent !== null) {
        newMessagesData = parseEditedContent(simpleContent.trim());
    } else {
        // 高级编辑器的逻辑保持不变，但要确保它也返回数组
        const editorContainer = document.getElementById('message-editor-container');
        const editorBlocks = editorContainer.querySelectorAll('.message-editor-block');
        for (const block of editorBlocks) {
            const textarea = block.querySelector('textarea');
            const rawContent = textarea.value.trim();
            if (rawContent) {
                // parseEditedContent 现在总是返回数组，我们用concat来合并
                newMessagesData = newMessagesData.concat(parseEditedContent(rawContent));
            }
        }
    }

    if (newMessagesData.length === 0) {
        document.getElementById('message-editor-modal').classList.remove('visible');
        return;
    }

    const messagesToInsert = newMessagesData.map((newMsgData) => ({
        ...originalMessage, // 继承原消息的角色、发送者等信息
        ...newMsgData, // 用新解析出的数据覆盖 type, content, payload 等
    }));

    chat.history.splice(messageIndex, 1, ...messagesToInsert);

    // 后续的时间戳重新分配和UI刷新逻辑保持不变
    let reassignTimestamp = timestamp;
    for (let i = messageIndex; i < chat.history.length; i++) {
        chat.history[i].timestamp = reassignTimestamp;
        reassignTimestamp++;
    }

    await db.chats.put(chat);
    document.getElementById('message-editor-modal').classList.remove('visible');
    renderChatInterface(state.activeChatId);
    await showCustomAlert('成功', '消息已更新！');
}

async function openContactPickerForGroupCreate() {
    selectedContacts.clear(); // 清空上次选择

    // 为“完成”按钮明确绑定“创建群聊”的功能
    const confirmBtn = document.getElementById('confirm-contact-picker-btn');
    // 使用克隆节点技巧，清除掉之前可能绑定的任何其他事件（比如“添加成员”）
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    // 重新绑定正确的“创建群聊”函数
    newConfirmBtn.addEventListener('click', handleCreateGroup);

    await renderContactPicker();
    showScreen('contact-picker-screen');
}
window.openContactPickerForGroupCreate = openContactPickerForGroupCreate;

async function renderContactPicker() {
    const listEl = document.getElementById('contact-picker-list');
    listEl.innerHTML = '';
    selectedContacts.clear(); // 清空上次的选择

    const allAvailablePeople = [];
    // 1. 添加主要角色
    Object.values(state.chats)
        .filter((c) => !c.isGroup)
        .forEach((c) => {
            allAvailablePeople.push({
                id: c.id,
                name: c.name,
                avatar: c.settings.aiAvatar || defaultAvatar,
                isNpc: false, // 标记为非NPC
                type: '角色',
            });
        });

    // 2. 添加所有角色库里的NPC，并自动去重
    const npcMap = new Map();
    Object.values(state.chats).forEach((chat) => {
        if (chat.npcLibrary) {
            chat.npcLibrary.forEach((npc) => {
                // 使用NPC的ID作为key，确保同一个NPC不会被重复添加
                if (!npcMap.has(npc.id)) {
                    npcMap.set(npc.id, {
                        id: npc.id,
                        name: npc.name,
                        avatar: npc.avatar || defaultGroupMemberAvatar,
                        isNpc: true, // 标记为NPC
                        type: `NPC (${chat.name})`, // 显示该NPC所属的角色
                    });
                }
            });
        }
    });
    allAvailablePeople.push(...Array.from(npcMap.values()));

    if (allAvailablePeople.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#8a8a8a; margin-top:50px;">还没有可以拉进群的联系人哦~</p>';
        return;
    }

    // 3. 渲染整合后的列表
    allAvailablePeople.forEach((contact) => {
        const item = document.createElement('div');
        item.className = 'contact-picker-item';
        item.dataset.contactId = contact.id;

        // 核心修改：为NPC添加一个“(NPC)”的标签，方便区分
        item.innerHTML = `
			            <div class="checkbox"></div>
			            <img src="${contact.avatar}" class="avatar">
			            <span class="name">${contact.name} ${contact.isNpc ? '<span style="color: #888; font-size: 12px;">(NPC)</span>' : ''}</span>
			        `;

        item.addEventListener('click', () => {
            if (selectedContacts.has(contact.id)) {
                selectedContacts.delete(contact.id);
                item.classList.remove('selected');
            } else {
                selectedContacts.add(contact.id);
                item.classList.add('selected');
            }
            updateContactPickerConfirmButton();
        });

        listEl.appendChild(item);
    });

    updateContactPickerConfirmButton();
}

function updateContactPickerConfirmButton() {
    const btn = document.getElementById('confirm-contact-picker-btn');
    btn.textContent = `完成(${selectedContacts.size})`;
    btn.disabled = selectedContacts.size < 2; // 至少需要2个人才能创建群聊
}

async function handleCreateGroup() {
    if (selectedContacts.size < 2) {
        alert('创建群聊至少需要选择2个联系人。');
        return;
    }

    const groupName = await showCustomPrompt('设置群名', '请输入群聊的名字', '我们的群聊');
    if (!groupName || !groupName.trim()) return;

    const newChatId = 'group_' + Date.now();
    const members = [];

    for (const contactId of selectedContacts) {
        const contactChat = state.chats[contactId];
        if (contactChat) {
            // 这是原来的逻辑，用于处理普通角色(Char)
            members.push({
                id: contactId,
                originalName: contactChat.name,
                groupNickname: contactChat.name,
                avatar: contactChat.settings.aiAvatar || defaultAvatar,
                persona: contactChat.settings.aiPersona,
                avatarFrame: contactChat.settings.aiAvatarFrame || '',
                isAdmin: false,
                groupTitle: '',
            });
        } else {
            // 处理NPC的逻辑
            let foundNpc = null;
            // 遍历所有角色，查找他们各自的NPC库
            for (const chat of Object.values(state.chats)) {
                if (chat.npcLibrary) {
                    const npc = chat.npcLibrary.find((n) => n.id === contactId);
                    if (npc) {
                        foundNpc = npc;
                        break; // 找到了就跳出循环
                    }
                }
            }
            // 如果找到了这个NPC，就把它添加到成员列表里
            if (foundNpc) {
                members.push({
                    id: foundNpc.id,
                    originalName: foundNpc.name,
                    groupNickname: foundNpc.name,
                    avatar: foundNpc.avatar || defaultGroupMemberAvatar,
                    persona: foundNpc.persona,
                    avatarFrame: '', // NPC没有头像框
                    isAdmin: false,
                    groupTitle: '',
                });
            }
        }
    }

    const newGroupChat = {
        id: newChatId,
        name: groupName.trim(),
        isGroup: true,
        // 设置群主为当前用户
        ownerId: 'user',
        members: members,
        settings: {
            myPersona: '我是谁呀。',
            myNickname: '我',
            maxMemory: 10,
            groupAvatar: defaultGroupAvatar,
            myAvatar: defaultMyGroupAvatar,
            myAvatarFrame: '', // 别忘了自己的头像框
            background: '',
            theme: 'default',
            fontSize: 13,
            customCss: '',
            linkedWorldBookIds: [],
            stickerLibrary: [],
            linkedMemories: [],
            // 为用户自己也加上管理员和头衔的初始设置
            isUserAdmin: false,
            myGroupTitle: '',
        },
        history: [],
        musicData: { totalTime: 0 },
    };

    state.chats[newChatId] = newGroupChat;
    await db.chats.put(newGroupChat);

    // 创建群聊后，发送一条系统通知
    await logSystemMessage(newChatId, `你创建了群聊，并邀请了 ${members.map((m) => `“${m.groupNickname}”`).join('、')} 加入群聊。`);

    // 后续逻辑不变
    await renderChatList();
    showScreen('chat-list-screen');
    openChat(newChatId);
}

async function handleUserPat(chatId, characterName) {
    const chat = state.chats[chatId];
    if (!chat) return;

    // 1. 触发屏幕震动动画
    const phoneScreen = document.getElementById('phone-screen');
    phoneScreen.classList.remove('pat-animation');
    void phoneScreen.offsetWidth;
    phoneScreen.classList.add('pat-animation');
    setTimeout(() => phoneScreen.classList.remove('pat-animation'), 500);

    // 2. 弹出输入框让用户输入后缀
    const suffix = await showCustomPrompt(`你拍了拍 “${characterName}”`, '（可选）输入后缀', '', 'text');

    // 如果用户点了取消，则什么也不做
    if (suffix === null) return;

    // 3. 创建对用户可见的“拍一-拍”消息
    const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
    // 将后缀拼接到消息内容中
    const visibleMessageContent = `${myNickname} 拍了拍 “${characterName}” ${suffix.trim()}`;
    const visibleMessage = {
        role: 'system', // 仍然是系统消息
        type: 'pat_message',
        content: visibleMessageContent,
        timestamp: Date.now(),
    };
    chat.history.push(visibleMessage);

    // 4. 创建一条对用户隐藏、但对AI可见的系统消息，以触发AI的回应
    // 同样将后缀加入到给AI的提示中
    const hiddenMessageContent = `[系统提示：用户（${myNickname}）刚刚拍了拍你（${characterName}）${suffix.trim()}。请你对此作出回应。]`;
    const hiddenMessage = {
        role: 'system',
        content: hiddenMessageContent,
        timestamp: Date.now() + 1, // 时间戳+1以保证顺序
        isHidden: true,
    };
    chat.history.push(hiddenMessage);

    // 5. 保存更改并更新UI
    await db.chats.put(chat);
    if (state.activeChatId === chatId) {
        appendMessage(visibleMessage, chat);
    }
    await renderChatList();
}
window.handleUserPat = handleUserPat;

async function handlePacketClick(timestamp) {
    const currentChatId = state.activeChatId;
    const freshChat = await db.chats.get(currentChatId);
    if (!freshChat) return;

    state.chats[currentChatId] = freshChat;
    const packet = freshChat.history.find((m) => m.timestamp === timestamp);
    if (!packet) return;

    const myNickname = freshChat.settings.myNickname || '我';
    const hasClaimed = packet.claimedBy && packet.claimedBy[myNickname];

    // 如果是专属红包且不是给我的，或已领完，或已领过，都只显示详情
    if ((packet.packetType === 'direct' && packet.receiverName !== myNickname) || packet.isFullyClaimed || hasClaimed) {
        showRedPacketDetails(packet);
    } else {
        // 核心流程：先尝试打开红包
        const claimedAmount = await handleOpenRedPacket(packet);

        // 如果成功打开（claimedAmount不为null）
        if (claimedAmount !== null) {
            // **关键：在数据更新后，再重新渲染UI**
            renderChatInterface(currentChatId);

            // 显示成功提示
            await showCustomAlert('恭喜！', `你领取了 ${packet.senderName} 的红包，金额为 ${claimedAmount.toFixed(2)} 元。`);
        }

        // 无论成功与否，最后都显示详情页
        // 此时需要从state中获取最新的packet对象，因为它可能在handleOpenRedPacket中被更新了
        const updatedPacket = state.chats[currentChatId].history.find((m) => m.timestamp === timestamp);
        showRedPacketDetails(updatedPacket);
    }
}
window.handlePacketClick = handlePacketClick;

async function handleOpenRedPacket(packet) {
    const chat = state.chats[state.activeChatId];
    const myNickname = chat.settings.myNickname || '我';

    // 1. 检查红包是否还能领
    const remainingCount = packet.count - Object.keys(packet.claimedBy || {}).length;
    if (remainingCount <= 0) {
        packet.isFullyClaimed = true;
        await db.chats.put(chat);
        await showCustomAlert('手慢了', '红包已被领完！');
        return null; // 返回null表示领取失败
    }

    // 2. 计算领取金额
    let claimedAmount = 0;
    const remainingAmount = packet.totalAmount - Object.values(packet.claimedBy || {}).reduce((sum, val) => sum + val, 0);
    if (packet.packetType === 'lucky') {
        if (remainingCount === 1) {
            claimedAmount = remainingAmount;
        } else {
            const min = 0.01;
            const max = remainingAmount - (remainingCount - 1) * min;
            claimedAmount = Math.random() * (max - min) + min;
        }
    } else {
        claimedAmount = packet.totalAmount;
    }
    claimedAmount = parseFloat(claimedAmount.toFixed(2));

    // 3. 更新红包数据
    if (!packet.claimedBy) packet.claimedBy = {};
    packet.claimedBy[myNickname] = claimedAmount;

    const isNowFullyClaimed = Object.keys(packet.claimedBy).length >= packet.count;
    if (isNowFullyClaimed) {
        packet.isFullyClaimed = true;
    }

    // 4. 构建系统消息和AI指令
    let hiddenMessageContent = '';

    // 如果红包被领完了，就准备“战报”
    if (isNowFullyClaimed) {
        const finishedMessage = {
            role: 'system',
            type: 'pat_message',
            content: `${packet.senderName} 的红包已被领完`,
            timestamp: Date.now() + 1,
        };
        chat.history.push(finishedMessage);

        hiddenMessageContent = `[系统提示：用户 (${myNickname}) 领取了最后一个红包，现在 ${packet.senderName} 的红包已被领完。`;

        let luckyKing = { name: '', amount: -1 };
        if (packet.packetType === 'lucky' && packet.count > 1) {
            Object.entries(packet.claimedBy).forEach(([name, amount]) => {
                if (amount > luckyKing.amount) {
                    luckyKing = { name, amount };
                }
            });
        }
        if (luckyKing.name) {
            hiddenMessageContent += ` 手气王是 ${luckyKing.name}！`;
        }
        hiddenMessageContent += ' 请对此事件发表评论。]';
    }
    // 如果还没被领完
    else {
        hiddenMessageContent = `[系统提示：用户 (${myNickname}) 刚刚领取了红包 (时间戳: ${packet.timestamp})。红包还未领完。]`;
    }

    // 创建并添加给AI看的隐藏消息
    const hiddenMessage = {
        role: 'system',
        content: hiddenMessageContent,
        timestamp: Date.now() + 2,
        isHidden: true,
    };
    chat.history.push(hiddenMessage);

    // 5. 保存到数据库
    await db.chats.put(chat);

    // 6. 返回领取的金额，用于后续弹窗
    return claimedAmount;
}

async function showRedPacketDetails(packet) {
    // 1. 直接检查传入的packet对象是否存在，无需再查找
    if (!packet) {
        console.error('showRedPacketDetails收到了无效的packet对象');
        return;
    }

    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const modal = document.getElementById('red-packet-details-modal');
    const myNickname = chat.settings.myNickname || '我';

    // 2. 后续所有逻辑保持不变，直接使用传入的packet对象
    document.getElementById('rp-details-sender').textContent = packet.senderName;
    document.getElementById('rp-details-greeting').textContent = packet.greeting || '恭喜发财，大吉大利！';

    const myAmountEl = document.getElementById('rp-details-my-amount');
    if (packet.claimedBy && packet.claimedBy[myNickname]) {
        myAmountEl.querySelector('span:first-child').textContent = packet.claimedBy[myNickname].toFixed(2);
        myAmountEl.style.display = 'block';
    } else {
        myAmountEl.style.display = 'none';
    }

    const claimedCount = Object.keys(packet.claimedBy || {}).length;
    const claimedAmountSum = Object.values(packet.claimedBy || {}).reduce((sum, val) => sum + val, 0);
    let summaryText = `${claimedCount}/${packet.count}个红包，共${claimedAmountSum.toFixed(2)}/${packet.totalAmount.toFixed(2)}元。`;
    if (!packet.isFullyClaimed && claimedCount < packet.count) {
        const timeLeft = Math.floor((packet.timestamp + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60));
        if (timeLeft > 0) summaryText += ` 剩余红包将在${timeLeft}小时内退还。`;
    }
    document.getElementById('rp-details-summary').textContent = summaryText;

    const listEl = document.getElementById('rp-details-list');
    listEl.innerHTML = '';
    const claimedEntries = Object.entries(packet.claimedBy || {});

    let luckyKing = { name: '', amount: -1 };
    if (packet.packetType === 'lucky' && packet.isFullyClaimed && claimedEntries.length > 1) {
        claimedEntries.forEach(([name, amount]) => {
            if (amount > luckyKing.amount) {
                luckyKing = { name, amount };
            }
        });
    }

    claimedEntries.sort((a, b) => b[1] - a[1]);

    claimedEntries.forEach(([name, amount]) => {
        const item = document.createElement('div');
        item.className = 'rp-details-item';
        let luckyTag = '';
        if (luckyKing.name && name === luckyKing.name) {
            luckyTag = '<span class="lucky-king-tag">手气王</span>';
        }
        item.innerHTML = `
			            <span class="name">${name}</span>
			            <span class="amount">${amount.toFixed(2)} 元</span>
			            ${luckyTag}
			        `;
        listEl.appendChild(item);
    });

    modal.classList.add('visible');
}

function openAiAvatarLibraryModal() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    document.getElementById('ai-avatar-library-title').textContent = `“${chat.name}”的头像库`;
    renderAiAvatarLibrary();
    document.getElementById('ai-avatar-library-modal').classList.add('visible');
}
window.openAiAvatarLibraryModal = openAiAvatarLibraryModal;

function renderAiAvatarLibrary() {
    const grid = document.getElementById('ai-avatar-library-grid');
    grid.innerHTML = '';
    const chat = state.chats[state.activeChatId];
    const library = chat.settings.aiAvatarLibrary || [];

    if (library.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">这个头像库还是空的，点击右上角“添加”吧！</p>';
        return;
    }

    library.forEach((avatar, index) => {
        const item = document.createElement('div');
        item.className = 'sticker-item'; // 复用表情面板的样式
        item.style.backgroundImage = `url(${avatar.url})`;
        item.title = avatar.name;

        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.display = 'block'; // 总是显示删除按钮
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            const confirmed = await showCustomConfirm('删除头像', `确定要从头像库中删除“${avatar.name}”吗？`, {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                chat.settings.aiAvatarLibrary.splice(index, 1);
                await db.chats.put(chat);
                renderAiAvatarLibrary();
            }
        };
        item.appendChild(deleteBtn);
        grid.appendChild(item);
    });
}

async function addAvatarToLibrary() {
    const name = await showCustomPrompt('添加头像', '请为这个头像起个名字（例如：开心、哭泣）');
    if (!name || !name.trim()) return;

    // 1. 弹出选择框，让用户选是本地还是URL
    const choice = await showChoiceModal('选择图片来源', [
        { text: '📁 本地上传', value: 'local' },
        { text: '🌐 网络URL', value: 'url' },
    ]);

    let finalUrl = null;

    // 2. 根据选择执行不同逻辑
    if (choice === 'local') {
        // 调用现有的本地上传辅助函数 (代码里原本就有的)
        finalUrl = await uploadImageLocally();
    } else if (choice === 'url') {
        finalUrl = await showCustomPrompt('添加头像', '请输入头像的图片URL', '', 'url');
    }

    // 3. 如果没获取到图片(用户取消了)，直接结束
    if (!finalUrl) return;

    const chat = state.chats[state.activeChatId];
    if (!chat.settings.aiAvatarLibrary) {
        chat.settings.aiAvatarLibrary = [];
    }

    // 4. 保存到数据库
    chat.settings.aiAvatarLibrary.push({ name: name.trim(), url: finalUrl.trim() });
    await db.chats.put(chat);
    renderAiAvatarLibrary();
}
window.addAvatarToLibrary = addAvatarToLibrary;

function closeAiAvatarLibraryModal() {
    document.getElementById('ai-avatar-library-modal').classList.remove('visible');
}
window.closeAiAvatarLibraryModal = closeAiAvatarLibraryModal;

function handleUploadCustomFrame() {
    document.getElementById('custom-frame-upload-input').addEventListener(
        'change',
        async (event) => {
            const files = event.target.files;
            if (!files.length) return;

            const newFrames = [];

            // 使用 for...of 循环来逐个处理选中的文件
            for (const file of files) {
                // 自动生成名字，而不是让用户输入
                // 用 "文件名 (前8位) + 时间戳" 来确保名字几乎不会重复
                const fileName = file.name.replace(/\.[^/.]+$/, '').substring(0, 8);
                const autoName = `${fileName}_${Date.now()}`;

                const base64Url = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                newFrames.push({
                    id: 'frame_' + (Date.now() + newFrames.length), // 确保ID唯一
                    name: autoName,
                    url: base64Url,
                });
            }

            // 循环结束后，批量添加到数据库
            if (newFrames.length > 0) {
                await db.customAvatarFrames.bulkAdd(newFrames);
                renderFrameManager(); // 刷新管理列表
                await showCustomAlert('上传成功', `已成功添加 ${newFrames.length} 个新头像框！`);
            }

            // 清空文件选择器的值
            event.target.value = null;
        },
        { once: true }
    );

    document.getElementById('custom-frame-upload-input').click();
}

function openBrowser(timestamp) {
    if (!state.activeChatId) return;

    const chat = state.chats[state.activeChatId];
    // 安全检查，确保 chat 和 history 都存在
    if (!chat || !chat.history) return;

    const message = chat.history.find((m) => m.timestamp === timestamp);
    if (!message || message.type !== 'share_link') {
        console.error('无法找到或消息类型不匹配的分享链接:', timestamp);
        return; // 如果找不到消息，就直接退出
    }

    // 填充浏览器内容
    document.getElementById('browser-title').textContent = message.source_name || '文章详情';
    const browserContent = document.getElementById('browser-content');
    browserContent.innerHTML = `
			        <h1 class="article-title">${message.title || '无标题'}</h1>
			        <div class="article-meta">
			            <span>来源: ${message.source_name || '未知'}</span>
			        </div>
			        <div class="article-body">
			            <p>${(message.content || '内容为空。').replace(/\n/g, '</p><p>')}</p>
			        </div>
			    `;

    // 显示浏览器屏幕
    showScreen('browser-screen');
}

function closeBrowser() {
    showScreen('chat-interface-screen');
}

function startReplyToMessage() {
    if (!activeMessageTimestamp) return;

    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === activeMessageTimestamp);
    if (!message) return;

    // 1. 同时获取“完整内容”和“预览片段”
    const fullContent = String(message.content || '');
    let previewSnippet = '';

    if (typeof message.content === 'string' && STICKER_REGEX.test(message.content)) {
        previewSnippet = '[表情]';
    } else if (message.type === 'ai_image' || message.type === 'user_photo') {
        previewSnippet = '[图片]';
    } else if (message.type === 'voice_message') {
        previewSnippet = '[语音]';
    } else {
        // 预览片段依然截断，但只用于UI显示
        previewSnippet = fullContent.substring(0, 50) + (fullContent.length > 50 ? '...' : '');
    }

    // 2. 将“完整内容”存入上下文，以备发送时使用
    currentReplyContext = {
        timestamp: message.timestamp,
        senderName: message.senderName || (message.role === 'user' ? chat.settings.myNickname || '我' : chat.name),
        content: fullContent, // <--- 这里存的是完整的原文！
    };

    // 3. 仅在更新“回复预览栏”时，才使用“预览片段”
    const previewBar = document.getElementById('reply-preview-bar');
    previewBar.querySelector('.sender').textContent = `回复 ${currentReplyContext.senderName}:`;
    previewBar.querySelector('.text').textContent = previewSnippet; // <--- 这里用的是缩略版！
    previewBar.style.display = 'block';

    // 4. 后续操作保持不变
    hideMessageActions();
    document.getElementById('chat-input').focus();
}
window.startReplyToMessage = startReplyToMessage;

function cancelReplyMode() {
    currentReplyContext = null;
    document.getElementById('reply-preview-bar').style.display = 'none';
}
window.cancelReplyMode = cancelReplyMode;

function showTransferActionModal(timestamp) {
    window.activeTransferTimestamp = timestamp;

    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestamp);
    if (message) {
        // 将AI的名字填入弹窗
        document.getElementById('transfer-sender-name').textContent = message.senderName;
    }
    document.getElementById('transfer-actions-modal').classList.add('visible');
}

function hideTransferActionModal() {
    document.getElementById('transfer-actions-modal').classList.remove('visible');
    window.activeTransferTimestamp = null;
}

async function renderCallHistoryScreen() {
    showScreen('call-history-screen');

    const listEl = document.getElementById('call-history-list');
    const titleEl = document.getElementById('call-history-title');
    listEl.innerHTML = '';
    titleEl.textContent = '所有通话记录';

    const records = await db.callRecords.orderBy('timestamp').reverse().toArray();

    if (records.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">这里还没有通话记录哦~</p>';
        return; // 现在的 return 就没问题了，因为它只跳过了后续的渲染逻辑
    }

    records.forEach((record) => {
        const card = createCallRecordCard(record);

        addLongPressListener(card, async () => {
            // 1. 弹出输入框，并将旧名称作为默认值，方便修改
            const newName = await showCustomPrompt(
                '自定义通话名称',
                '请输入新的名称（留空则恢复默认）',
                record.customName || '' // 如果已有自定义名称，就显示它
            );

            // 2. 如果用户点击了“取消”，则什么都不做
            if (newName === null) return;

            // 3. 更新数据库中的这条记录
            await db.callRecords.update(record.id, { customName: newName.trim() });

            // 4. 刷新整个列表，让更改立刻显示出来
            await renderCallHistoryScreen();

            // 5. 给用户一个成功的提示
            await showCustomAlert('成功', '通话名称已更新！');
        });
        listEl.appendChild(card);
    });
}

function createCallRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'call-record-card';
    card.dataset.recordId = record.id;

    // 获取通话对象的名字
    const chatInfo = state.chats[record.chatId];
    const chatName = chatInfo ? chatInfo.name : '未知会话';

    const callDate = new Date(record.timestamp);
    const dateString = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, '0')}-${String(callDate.getDate()).padStart(2, '0')} ${String(callDate.getHours()).padStart(2, '0')}:${String(callDate.getMinutes()).padStart(2, '0')}`;
    const durationText = `${Math.floor(record.duration / 60)}分${record.duration % 60}秒`;

    const avatarsHtml = record.participants.map((p) => `<img src="${p.avatar}" alt="${p.name}" class="participant-avatar" title="${p.name}">`).join('');

    card.innerHTML = `
			        <div class="card-header">
			            <span class="date">${dateString}</span>
			            <span class="duration">${durationText}</span>
			        </div>
			        <div class="card-body">
			            
			            ${record.customName ? `<div class="custom-title">${record.customName}</div>` : ''}

			            <div class="participants-info"> <!-- 新增一个容器方便布局 -->
			                <div class="participants-avatars">${avatarsHtml}</div>
			                <span class="participants-names">与 ${chatName}</span>
			            </div>
			        </div>
			    `;
    return card;
}

async function showCallTranscript(recordId) {
    const record = await db.callRecords.get(recordId);
    if (!record) return;

    const modal = document.getElementById('call-transcript-modal');
    const titleEl = document.getElementById('transcript-modal-title');
    const bodyEl = document.getElementById('transcript-modal-body');

    titleEl.textContent = `通话于 ${new Date(record.timestamp).toLocaleString()} (时长: ${Math.floor(record.duration / 60)}分${record.duration % 60}秒)`;
    bodyEl.innerHTML = '';

    if (!record.transcript || record.transcript.length === 0) {
        bodyEl.innerHTML = '<p style="text-align:center; color: #8a8a8a;">这次通话没有留下文字记录。</p>';
    } else {
        record.transcript.forEach((entry) => {
            const bubble = document.createElement('div');
            // 根据角色添加不同的class，应用不同的样式
            bubble.className = `transcript-entry ${entry.role}`;
            bubble.textContent = entry.content;
            bodyEl.appendChild(bubble);
        });
    }

    const deleteBtn = document.getElementById('delete-transcript-btn');

    // 使用克隆节点技巧，防止事件重复绑定
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

    // 为新的、干净的按钮绑定事件
    newDeleteBtn.addEventListener('click', async () => {
        const confirmed = await showCustomConfirm('确认删除', '确定要永久删除这条通话记录吗？此操作不可恢复。', {
            confirmButtonClass: 'btn-danger',
        });

        if (confirmed) {
            // 1. 关闭当前的详情弹窗
            modal.classList.remove('visible');

            // 2. 从数据库删除
            await db.callRecords.delete(recordId);

            // 3. 刷新通话记录列表
            await renderCallHistoryScreen();

            // 4. (可选) 给出成功提示
            alert('通话记录已删除。');
        }
    });
    modal.classList.add('visible');
}

async function handleEditStatusClick() {
    // 1. 安全检查，确保在单聊界面
    if (!state.activeChatId || state.chats[state.activeChatId].isGroup) {
        return;
    }
    const chat = state.chats[state.activeChatId];

    // 2. 弹出输入框，让用户输入新的状态，并将当前状态作为默认值
    const newStatusText = await showCustomPrompt(
        '编辑对方状态',
        '请输入对方现在的新状态：',
        chat.status.text // 将当前状态作为输入框的默认内容
    );

    // 3. 如果用户输入了内容并点击了“确定”
    if (newStatusText !== null) {
        // 4. 更新内存和数据库中的状态数据
        chat.status.text = newStatusText.trim() || '在线'; // 如果用户清空了，就默认为“在线”
        chat.status.isBusy = false; // 每次手动编辑都默认其不处于“忙碌”状态
        chat.status.lastUpdate = Date.now();
        await db.chats.put(chat);

        // 5. 立刻刷新UI，让用户看到修改后的状态
        renderChatInterface(state.activeChatId);
        renderChatList();

        // 6. 给出一个无伤大雅的成功提示
        await showCustomAlert('状态已更新', `“${chat.name}”的当前状态已更新为：${chat.status.text}`);
    }
}

async function openShareTargetPicker() {
    const modal = document.getElementById('share-target-modal');
    const listEl = document.getElementById('share-target-list');
    listEl.innerHTML = '';

    // 获取所有聊天作为分享目标
    const chats = Object.values(state.chats);

    chats.forEach((chat) => {
        // 复用联系人选择器的样式
        const item = document.createElement('div');
        item.className = 'contact-picker-item';
        item.innerHTML = `
			            <input type="checkbox" class="share-target-checkbox" data-chat-id="${chat.id}" style="margin-right: 15px;">
			            <img src="${chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar || defaultAvatar}" class="avatar">
			            <span class="name">${chat.name}</span>
			        `;
        listEl.appendChild(item);
    });

    modal.classList.add('visible');
}

async function handleRecallClick() {
    if (!activeMessageTimestamp) return;

    const RECALL_TIME_LIMIT_MS = 2 * 60 * 1000; // 设置2分钟的撤回时限
    const messageTime = activeMessageTimestamp;
    const now = Date.now();

    // 检查是否超过了撤回时限
    if (now - messageTime > RECALL_TIME_LIMIT_MS) {
        hideMessageActions();
        await showCustomAlert('操作失败', '该消息发送已超过2分钟，无法撤回。');
        return;
    }

    // 如果在时限内，执行真正的撤回逻辑
    await recallMessage(messageTime, true);
    hideMessageActions();
}
window.handleRecallClick = handleRecallClick;

async function recallMessage(timestamp, isUserRecall) {
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
    if (messageIndex === -1) return;

    const messageToRecall = chat.history[messageIndex];

    // 1. 修改消息对象，将其变为“已撤回”状态
    const recalledData = {
        originalType: messageToRecall.type || 'text',
        originalContent: messageToRecall.content,
        // 保存其他可能存在的原始数据
        originalMeaning: messageToRecall.meaning,
        originalQuote: messageToRecall.quote,
    };

    messageToRecall.type = 'recalled_message';
    messageToRecall.content = isUserRecall ? '你撤回了一条消息' : '对方撤回了一条消息';
    messageToRecall.recalledData = recalledData;
    // 清理掉不再需要的旧属性
    delete messageToRecall.meaning;
    delete messageToRecall.quote;

    // 2. 如果是用户撤回，需要给AI发送一条它看不懂内容的隐藏提示
    if (isUserRecall) {
        const hiddenMessageForAI = {
            role: 'system',
            content: `[系统提示：用户撤回了一条消息。你不知道内容是什么，只需知道这个事件即可。]`,
            timestamp: Date.now(),
            isHidden: true,
        };
        chat.history.push(hiddenMessageForAI);
    }

    // 3. 保存到数据库并刷新UI
    await db.chats.put(chat);
    renderChatInterface(state.activeChatId);
    if (isUserRecall) renderChatList(); // 用户撤回时，最后一条消息变了，需要刷新列表
}

function isNewDay(timestamp1, timestamp2) {
    // 如果没有上一条消息的时间戳，说明这是第一条消息，肯定要显示日期
    if (!timestamp2) return true;

    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);

    // 比较年、月、日是否完全相同
    return date1.getFullYear() !== date2.getFullYear() || date1.getMonth() !== date2.getMonth() || date1.getDate() !== date2.getDate();
}
window.isNewDay = isNewDay;

function formatDateStamp(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
}

function createDateStampElement(timestamp) {
    // 1. 创建最外层的包裹 div，和真实消息一样
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper date-stamp-wrapper';
    // 把时间戳存起来，这是多选和删除的关键
    wrapper.dataset.timestamp = timestamp;

    // 2. 创建气泡 div
    const bubble = document.createElement('div');
    // 同时加上 .message-bubble 类，让多选逻辑能找到它
    bubble.className = 'message-bubble date-stamp-bubble';
    bubble.dataset.timestamp = timestamp;
    bubble.textContent = formatDateStamp(timestamp);

    wrapper.appendChild(bubble);

    // 3. 为它绑定和真实消息完全一样的事件监听器
    addLongPressListener(wrapper, () => {
        // 日期戳不支持复杂操作，长按直接进入多选
        enterSelectionMode(timestamp);
    });
    wrapper.addEventListener('click', () => {
        if (isSelectionMode) {
            toggleMessageSelection(timestamp);
        }
    });

    return wrapper;
}
window.createDateStampElement = createDateStampElement;

function openChatSearchScreen() {
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    // 清空旧的搜索条件和结果
    document.getElementById('keyword-search-input').value = '';
    document.getElementById('sender-search-select').innerHTML = '';
    document.getElementById('date-search-input').value = '';
    document.getElementById('chat-search-results-list').innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">输入条件开始搜索</p>';

    // 动态填充“人物”下拉菜单
    const senderSelect = document.getElementById('sender-search-select');
    senderSelect.innerHTML = '<option value="">所有人</option>'; // 默认选项

    const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
    const myOption = document.createElement('option');
    myOption.value = myNickname;
    myOption.textContent = myNickname;
    senderSelect.appendChild(myOption);

    if (chat.isGroup) {
        chat.members.forEach((member) => {
            const memberOption = document.createElement('option');
            memberOption.value = member.originalName; // 使用本名进行精确匹配
            memberOption.textContent = member.groupNickname; // 显示群昵称给用户看
            senderSelect.appendChild(memberOption);
        });
    } else {
        const aiOption = document.createElement('option');
        aiOption.value = chat.name;
        aiOption.textContent = chat.name;
        senderSelect.appendChild(aiOption);
    }

    // 关闭聊天设置弹窗，并显示搜索界面
    document.getElementById('chat-settings-modal').classList.remove('visible');
    showScreen('chat-search-screen');
}

function performChatSearch() {
    const chat = state.chats[state.activeChatId];
    if (!chat) {
        // 如果找不到聊天对象，给用户一个明确的提示
        alert('无法执行搜索，因为没有找到当前聊天。');
        return;
    }

    // 1. 获取所有搜索条件
    const keyword = document.getElementById('keyword-search-input').value.trim();
    const senderValue = document.getElementById('sender-search-select').value;
    const dateValue = document.getElementById('date-search-input').value;

    // 将关键词保存到全局变量，以便在渲染结果时用于高亮
    currentSearchKeyword = keyword;

    if (!keyword && !senderValue && !dateValue) {
        alert('请至少输入一个搜索条件！');
        return;
    }

    // 2. 筛选聊天记录
    console.log(`开始搜索: 关键词='${keyword}', 发言人='${senderValue}', 日期='${dateValue}'`);

    const results = chat.history.filter((msg) => {
        // 过滤掉系统消息和对用户隐藏的消息
        if (msg.isHidden || msg.role === 'system' || msg.type === 'recalled_message') {
            return false;
        }

        // a. 筛选日期
        if (dateValue) {
            const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
            if (msgDate !== dateValue) {
                return false;
            }
        }

        // b. 筛选发言人
        if (senderValue) {
            const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
            let msgSenderName = '';

            if (msg.role === 'user') {
                msgSenderName = myNickname;
            } else {
                // AI或群成员的消息
                // 这里我们使用 originalName 来精确匹配，因为群昵称可能会变
                msgSenderName = chat.isGroup ? msg.senderName : chat.name;
            }
            if (msgSenderName !== senderValue) {
                return false;
            }
        }

        // c. 筛选关键词
        if (keyword) {
            let contentText = '';
            // 将所有可能包含文本的内容都转换成字符串进行搜索
            if (typeof msg.content === 'string') {
                contentText = msg.content;
            } else if (typeof msg.content === 'object' && msg.content !== null) {
                // 对于复杂对象，我们可以简单地将它们转为JSON字符串来搜索
                contentText = JSON.stringify(msg.content);
            }

            if (!contentText.toLowerCase().includes(keyword.toLowerCase())) {
                return false;
            }
        }

        return true; // 所有条件都满足
    });

    console.log(`搜索到 ${results.length} 条结果`);

    // 3. 渲染结果
    renderSearchResults(results);
}

function renderSearchResults(results) {
    const listEl = document.getElementById('chat-search-results-list');
    listEl.innerHTML = '';
    listEl.scrollTop = 0; // 每次渲染前，都将滚动条重置到顶部

    if (results.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">未找到相关记录</p>';
        return;
    }

    const chat = state.chats[state.activeChatId];
    const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';

    // 为了性能，只渲染最新的100条结果
    results
        .slice(-100)
        .reverse()
        .forEach((msg) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.dataset.timestamp = msg.timestamp; // 关键！用于跳转

            let senderName, senderAvatar;
            if (msg.role === 'user') {
                senderName = myNickname;
                senderAvatar = chat.settings.myAvatar;
            } else {
                if (chat.isGroup) {
                    senderName = msg.senderName;
                    const member = chat.members.find((m) => m.originalName === senderName);
                    senderAvatar = member ? member.avatar : defaultGroupMemberAvatar;
                } else {
                    senderName = chat.name;
                    senderAvatar = chat.settings.aiAvatar;
                }
            }

            let contentText = '';
            if (msg.type === 'sticker' || (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content))) {
                contentText = '[表情]';
            } else if (msg.type === 'ai_image' || msg.type === 'user_photo' || Array.isArray(msg.content)) {
                contentText = '[图片]';
            } else {
                contentText = String(msg.content);
            }

            item.innerHTML = `
			            <img src="${senderAvatar || defaultAvatar}" class="avatar">
			            <div class="search-result-info">
			                <div class="search-result-meta">
			                    <span class="name">${senderName}</span>
			                    <span class="timestamp">${formatDateStamp(msg.timestamp)}</span>
			                </div>
			                <div class="search-result-content">
			                    ${highlightText(contentText, currentSearchKeyword)}
			                </div>
			            </div>
			        `;
            listEl.appendChild(item);
        });
}

function highlightText(text, keyword) {
    if (!keyword || !text) {
        return text;
    }
    const regex = new RegExp(keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    return text.replace(regex, `<span class="highlight">$&</span>`);
}

async function jumpToMessage(timestamp) {
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const targetIndex = chat.history.findIndex((msg) => msg.timestamp === timestamp);
    if (targetIndex === -1) {
        await showCustomAlert('错误', '找不到该条消息，可能已被删除。');
        return;
    }

    // 1. 切换回聊天界面
    showScreen('chat-interface-screen');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = ''; // 清空当前内容

    // 2. 计算要渲染的消息窗口（以目标消息为中心）
    const windowSize = 50; // 和 MESSAGE_RENDER_WINDOW 保持一致
    const startIndex = Math.max(0, targetIndex - Math.floor(windowSize / 2));
    const messagesToRender = chat.history.slice(startIndex);

    // 3. 更新 currentRenderedCount 以同步加载状态
    //    这一步至关重要，它告诉“加载更多”功能下次应该从哪里开始加载
    currentRenderedCount = messagesToRender.length;

    // 4. 如果计算出的起始位置大于0，说明前面还有更早的记录，需要显示“加载更多”按钮
    if (startIndex > 0) {
        prependLoadMoreButton(messagesContainer);
    }

    // 5. 渲染消息窗口和日期戳
    let lastMessageTimestamp = startIndex > 0 ? chat.history[startIndex - 1].timestamp : null;
    messagesToRender.forEach((msg) => {
        if (msg.isHidden) return;
        if (isNewDay(msg.timestamp, lastMessageTimestamp)) {
            const dateStampEl = createDateStampElement(msg.timestamp);
            messagesContainer.appendChild(dateStampEl);
        }
        // 使用 true 作为第三个参数，表示这是初始加载，不应播放动画
        appendMessage(msg, chat, true);
        lastMessageTimestamp = msg.timestamp;
    });

    // 6. 滚动到目标消息并高亮它
    //    使用 setTimeout 确保 DOM 元素已经完全渲染到页面上
    setTimeout(() => {
        const targetMessage = messagesContainer.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);
        if (targetMessage) {
            // 使用 'auto' 滚动，比 'smooth' 更快速直接
            targetMessage.scrollIntoView({ behavior: 'auto', block: 'center' });

            // 添加闪烁高亮效果，让用户能注意到
            targetMessage.classList.add('flash');
            setTimeout(() => {
                targetMessage.classList.remove('flash');
            }, 1500);
        }
    }, 100);
}

function initDraggableLyricsBar() {
    const bar = document.getElementById('floating-lyrics-bar');
    const phoneScreen = document.getElementById('phone-screen');

    let isDragging = false;
    let offsetX, offsetY;

    const onDragStart = (e) => {
        // 检查点击的是否是按钮，如果是，则不开始拖动
        if (e.target.closest('#lyrics-settings-btn') || e.target.closest('.close-btn')) {
            return;
        }

        isDragging = true;
        bar.classList.add('dragging');

        const rect = bar.getBoundingClientRect();
        const coords = getEventCoords(e);

        offsetX = coords.x - rect.left;
        offsetY = coords.y - rect.top;

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e) => {
        if (!isDragging) return;

        e.preventDefault();

        const phoneRect = phoneScreen.getBoundingClientRect();
        const coords = getEventCoords(e);

        let newLeft = coords.x - offsetX - phoneRect.left;
        let newTop = coords.y - offsetY - phoneRect.top;

        const maxLeft = phoneScreen.clientWidth - bar.offsetWidth;
        const maxTop = phoneScreen.clientHeight - bar.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        // 在拖动时，同时设置left, top并清除transform
        bar.style.left = `${newLeft}px`;
        bar.style.top = `${newTop}px`;
        bar.style.transform = 'none';
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        bar.classList.remove('dragging');

        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
    };

    bar.addEventListener('mousedown', onDragStart);
    bar.addEventListener('touchstart', onDragStart, { passive: true });
}

function applyLyricsSettings() {
    const bar = document.getElementById('floating-lyrics-bar');
    const toggleBtn = document.getElementById('toggle-lyrics-bar-btn');

    // 应用样式
    bar.style.fontSize = `${lyricsBarSettings.fontSize}px`;
    bar.style.color = lyricsBarSettings.fontColor;
    bar.style.backgroundColor = `rgba(0, 0, 0, ${lyricsBarSettings.bgOpacity / 100})`;

    // 更新设置模态框里的控件值
    document.getElementById('lyrics-font-size-slider').value = lyricsBarSettings.fontSize;
    document.getElementById('lyrics-font-size-value').textContent = `${lyricsBarSettings.fontSize}px`;
    document.getElementById('lyrics-bg-opacity-slider').value = lyricsBarSettings.bgOpacity;
    document.getElementById('lyrics-bg-opacity-value').textContent = `${lyricsBarSettings.bgOpacity}%`;
    document.getElementById('lyrics-font-color-picker').value = lyricsBarSettings.fontColor;

    // 更新播放器里的开关按钮状态
    if (toggleBtn) {
        toggleBtn.textContent = lyricsBarSettings.showOnClose ? '悬浮' : '隐藏';
        toggleBtn.style.opacity = lyricsBarSettings.showOnClose ? '1' : '0.5';
    }
}

function hexToRgb(hex) {
    if (!hex || hex.length < 4) return '255, 255, 255';
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function applySavedInnerVoiceStyles() {
    // Falls back to window.state if state is not defined in scope
    const s = (typeof state !== 'undefined') ? state : window.state;
    if (!s.activeChatId) return;
    const chat = s.chats[s.activeChatId];
    if (!chat || !chat.settings.innerVoiceStyles) return;

    const styles = chat.settings.innerVoiceStyles;
    const panel = document.getElementById('inner-voice-main-panel');
    if (!panel) return;

    panel.style.setProperty('--iv-color-clothing', styles.clothingColor);
    panel.style.setProperty('--iv-color-behavior', styles.behaviorColor);
    panel.style.setProperty('--iv-color-thoughts', styles.thoughtsColor);
    panel.style.setProperty('--iv-color-naughty', styles.naughtyColor);
    panel.style.setProperty('--iv-card-bg-rgb', hexToRgb(styles.cardBgColor));
    panel.style.setProperty('--iv-card-opacity', styles.cardOpacity);

    // 应用保存的图标颜色
    panel.style.setProperty('--iv-icon-color', styles.iconColor || '#ff8a80');
}

function openInnerVoiceModal() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    // --- 应用自定义样式  ---
    applySavedInnerVoiceStyles();

    applyInnerVoiceBackground(chat.innerVoiceBackground || '');

    if (!chat.latestInnerVoice) {
        alert('还没有捕捉到Ta的心声哦，试着再聊一句吧！');
        return;
    }

    const modal = document.getElementById('inner-voice-modal');
    const data = chat.latestInnerVoice;

    // --- 角色信息填充 ---
    document.getElementById('inner-voice-avatar').src = chat.settings.aiAvatar || defaultAvatar;
    document.getElementById('inner-voice-char-name').textContent = chat.name;
    const frameImg = document.getElementById('inner-voice-avatar-frame');
    const avatarWrapper = document.getElementById('inner-voice-avatar-wrapper');
    const frameUrl = chat.settings.aiAvatarFrame || '';

    if (frameUrl) {
        frameImg.src = frameUrl;
        frameImg.style.display = 'block';
        avatarWrapper.classList.remove('has-border');
    } else {
        frameImg.src = '';
        frameImg.style.display = 'none';
        avatarWrapper.classList.add('has-border');
    }

    const labelFormat = chat.settings.innerVoiceAdopterLabelFormat || '领养人: {{user}}';
    const userNickname = chat.settings.myNickname || '你';
    const finalAdopterText = labelFormat.replace('{{user}}', userNickname);

    document.getElementById('inner-voice-adopter-avatar').src = chat.settings.myAvatar || defaultAvatar;
    document.getElementById('inner-voice-adopter-name').textContent = finalAdopterText;

    const header = document.querySelector('#inner-voice-main-panel .modal-header');
    if (header) {
        const shouldHideBorder = chat.settings.innerVoiceHideHeaderBorder || false;
        header.classList.toggle('no-border', shouldHideBorder);
    }

    // === 【修复重点开始】：获取标签并设置默认值 ===
    // 防止 chat.settings.innerVoiceTags 为空或部分字段缺失
    const tags = chat.settings.innerVoiceTags || {};

    const label1 = tags.clothing_label || '服装';
    const label2 = tags.behavior_label || '行为';
    const label3 = tags.thoughts_label || '心声';
    const label4 = tags.naughty_label || '坏心思';

    // 1. 设置第一个标签
    const clothingLabel = document.querySelector('#inner-voice-content-area div:nth-child(1) strong');
    if (clothingLabel) clothingLabel.textContent = label1 + ':';
    document.getElementById('inner-voice-clothing').textContent = data.clothing || '...';

    // 2. 设置第二个标签
    const behaviorLabel = document.querySelector('#inner-voice-content-area div:nth-child(2) strong');
    if (behaviorLabel) behaviorLabel.textContent = label2 + ':';
    document.getElementById('inner-voice-behavior').textContent = data.behavior || '...';

    // 3. 设置第三个标签
    const thoughtsLabel = document.querySelector('#inner-voice-content-area div:nth-child(3) strong');
    if (thoughtsLabel) thoughtsLabel.textContent = label3 + ':';
    document.getElementById('inner-voice-thoughts').textContent = data.thoughts || '...';

    // 4. 设置第四个标签
    const naughtyLabel = document.querySelector('#inner-voice-content-area div:nth-child(4) strong');
    if (naughtyLabel) naughtyLabel.textContent = label4 + ':';
    document.getElementById('inner-voice-naughty-thoughts').textContent = data.naughtyThoughts || '...';
    // === 【修复重点结束】 ===

    // --- 显示面板 ---
    modal.classList.add('visible');
    document.getElementById('inner-voice-history-panel').style.display = 'none';
    document.getElementById('inner-voice-main-panel').style.display = 'flex';
    isInnerVoiceHistoryOpen = false;
}

function toggleInnerVoiceHistory() {
    const mainPanel = document.getElementById('inner-voice-main-panel');
    const historyPanel = document.getElementById('inner-voice-history-panel');

    if (isInnerVoiceHistoryOpen) {
        // 如果是打开的，就关闭它，显示主面板
        mainPanel.style.display = 'flex';
        historyPanel.style.display = 'none';
    } else {
        // 如果是关闭的，就打开它，隐藏主面板
        renderInnerVoiceHistory(); // 渲染历史记录
        mainPanel.style.display = 'none';
        historyPanel.style.display = 'flex';
    }
    isInnerVoiceHistoryOpen = !isInnerVoiceHistoryOpen; // 切换状态
}

function renderInnerVoiceHistory() {
    const listEl = document.getElementById('inner-voice-history-list');
    listEl.innerHTML = '';
    const chat = state.chats[state.activeChatId];
    const history = chat.innerVoiceHistory || [];

    if (history.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">还没有历史记录</p>';
        return;
    }

    // === 新增：获取当前自定义标签 ===
    // 防止 chat.settings.innerVoiceTags 为空
    const tags = chat.settings.innerVoiceTags || {};
    // 如果用户没设置过，就用默认值
    const label1 = tags.clothing_label || '服装';
    const label2 = tags.behavior_label || '行为';
    const label3 = tags.thoughts_label || '心声';
    const label4 = tags.naughty_label || '坏心思';
    // ==============================

    // 从新到旧显示
    [...history].reverse().forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'inner-voice-history-item';

        const date = new Date(item.timestamp);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        // 在HTML中加入删除按钮
        itemEl.innerHTML = `
			            <button class="history-item-delete-btn" data-timestamp="${item.timestamp}">×</button>
			            <div class="history-item-timestamp">${dateString}</div>
			            <div class="history-item-content">
			                <p><strong>${label1}:</strong> ${item.clothing || '...'}</p>
			                <p><strong>${label2}:</strong> ${item.behavior || '...'}</p>
			                <p><strong>${label3}:</strong> ${item.thoughts || '...'}</p>
			                <p><strong>${label4}:</strong> ${item.naughtyThoughts || '...'}</p>
			            </div>
			        `;
        listEl.appendChild(itemEl);
    });
}

async function deleteSingleInnerVoice(timestamp) {
    const chat = state.chats[state.activeChatId];
    if (!chat || !chat.innerVoiceHistory) return;

    // 弹出确认框
    const confirmed = await showCustomConfirm('确认删除', '确定要删除这条心声记录吗？', {
        confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
        // 从数组中过滤掉匹配的项
        chat.innerVoiceHistory = chat.innerVoiceHistory.filter((item) => item.timestamp !== timestamp);
        // 保存回数据库
        await db.chats.put(chat);
        // 重新渲染列表
        renderInnerVoiceHistory();
    }
}

async function clearAllInnerVoiceHistory() {
    const chat = state.chats[state.activeChatId];
    // 优化了判断条件，确保只要有历史或当前心声，就可以执行清空
    if (!chat || ((!chat.innerVoiceHistory || chat.innerVoiceHistory.length === 0) && !chat.latestInnerVoice)) {
        alert('没有可以清空的心声记录。');
        return;
    }

    const confirmed = await showCustomConfirm('确认清空', '确定要清空所有心声历史记录吗？此操作不可恢复。', {
        confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
        // 不仅清空历史数组，也要清空当前的心声对象
        chat.innerVoiceHistory = [];
        chat.latestInnerVoice = null; // 将当前心声设为null

        await db.chats.put(chat);

        // 手动清空主面板的显示，防止返回时看到旧数据
        document.getElementById('inner-voice-clothing').textContent = '...';
        document.getElementById('inner-voice-behavior').textContent = '...';
        document.getElementById('inner-voice-thoughts').textContent = '...';
        document.getElementById('inner-voice-naughty-thoughts').textContent = '...';

        // 刷新历史记录列表（这行是原本就有的，会显示“还没有历史记录”）
        renderInnerVoiceHistory();

        // (可选但推荐) 给用户一个成功的提示
        alert('所有心声记录已清空！');
    }
}

async function addDefaultDarkModeThemeIfNeeded() {
    const themeName = '内置夜间模式'; // 这是我们要内置的主题名字
    try {
        // 检查数据库里是否已经有了这个名字的主题
        const existingTheme = await db.themes.where('name').equals(themeName).first();

        // 如果没有找到 (existingTheme 是 undefined)，就创建它
        if (!existingTheme) {
            console.log('内置夜间模式不存在，正在创建...');

            // 这就是完整的夜间模式CSS代码
            const darkModeCss = `
			/* 1. 全局重新定义颜色变量 */
			:root {
			  --secondary-bg: #1c1c1e;
			  --border-color: #38383a;
			  --text-primary: #ffffff;
			  --text-secondary: #8e8e93;
			  --status-bar-text-color: #ffffff;
			  --accent-color: #0A84FF; /* iOS风格的蓝色 */
			}

			/* 2. 为所有屏幕和主要容器设置基础深色背景 */
			#phone-screen, .screen, #chat-list, #world-book-list, .list-container, .form-container, #chat-messages,
			#wallpaper-screen, #font-settings-screen, #api-settings-screen, #character-selection-screen,
			#world-book-screen, #world-book-editor-screen, #character-phone-inner-screen, #character-phone-page {
			    background-color: #000000 !important;
			}

			/* 3. 主屏幕专属样式 */
			#home-screen { background: #111827 !important; }
			#desktop-dock { background-color: rgba(55, 65, 81, 0.5); }
			.desktop-app-icon .label, .widget-subtext { color: #e5e7eb; text-shadow: 0 1px 2px rgba(0,0,0,0.7); }
			#profile-widget .profile-info { background: linear-gradient(to bottom, rgba(28, 28, 30, 0.85) 20%, rgba(28, 28, 30, 0)); color: #f9fafb; }
			#profile-username, #profile-bio, #profile-location span { color: #f9fafb; }
			#profile-sub-username, #profile-location { color: #9ca3af; }
			#profile-location { background-color: rgba(255,255,255,0.1); }
			.widget-bubble { background-color: rgba(55, 65, 81, 0.9); color: #e5e7eb; }
			.widget-bubble::after { border-top-color: rgba(55, 65, 81, 0.9); }

			/* 4. 适配所有页面的头部Header */
			.header, .qzone-header, .character-phone-header {
			    background-color: rgba(28, 28, 30, 0.85) !important;
			    border-bottom-color: var(--border-color) !important;
			    color: var(--text-primary) !important;
			}

			/* 5. 适配所有通用组件 */
			#chat-input-area, #chat-list-bottom-nav { background-color: rgba(28, 28, 30, 0.85); border-top-color: var(--border-color); }
			#chat-input { background-color: var(--secondary-bg); color: var(--text-primary); }
			.modal-content, #custom-modal { background-color: #2c2c2e; }
			.modal-header, .modal-footer, .custom-modal-footer, .custom-modal-footer button:first-child { border-color: var(--border-color); }
			.form-group input, .form-group select, .form-group textarea { background-color: var(--secondary-bg); color: var(--text-primary); border-color: var(--border-color); }
			.list-item, .chat-list-item-swipe-container:not(:last-child), .chat-group-container, .world-book-group-container { border-bottom-color: var(--border-color) !important; }
			.chat-group-container:first-of-type { border-top-color: var(--border-color) !important; }
			.list-item:hover, .chat-list-item:hover { background-color: #2c2c2e; }

			/* 6. 特殊页面深度适配 */
			.chat-group-header, .world-book-group-header { background-color: #1c1c1e; }
			.chat-list-item-content.pinned { background-color: #3a3a3c; }
			#font-preview, #wallpaper-preview, .font-preset-slot { background-color: #1c1c1e !important; border-color: #38383a !important; }

			/* 7. 角色手机内部适配 & 全局文字颜色修复 */
			#character-phone-container { background-color: #000000; }
			.character-phone-frame { background-color: #111; }
			#character-chat-history-messages { background-color: #0e0e0e !important; }
			.character-chat-bubble.received { background-color: #2c2c2e !important; }
			.character-data-item, .character-bank-transaction, .character-cart-item, .character-browser-item {
			    background-color: #1c1c1e;
			    border-color: #38383a;
			}

			/* ▼▼▼ 核心修复：把所有这些元素的文字颜色都改为低饱和度的浅灰色 ▼▼▼ */
			.character-data-item .title,
			.character-data-item .content,
			.character-data-item .meta,
			.cart-item-price,
			.cart-item-info .title,
			.character-browser-item .title,
			.transaction-details .title,
			.transaction-amount,
			.character-select-item .name,  /* 修复角色选择列表的名字颜色 */
			#character-diary-list .character-data-item .content,
			#character-diary-list .character-data-item .content h1,
			#character-diary-list .character-data-item .content h2 {
			    color: #E0E0E0 !important; /* 使用一个柔和的、不刺眼的白色 */
			}

			.character-data-item .meta span,
			#character-diary-list .character-data-item .meta {
			    color: #9E9E9E !important; /* 次要信息使用更暗的灰色 */
			}

			#character-diary-list .character-data-item {
			    background-color: #26211a; /* 夜间模式下的信纸背景色 */
			    border-color: #524a3d;
			    border-left-color: #9e8a70;
			}

			`;

            await db.themes.add({ name: themeName, css: darkModeCss });
            console.log('内置夜间模式已成功创建！');
        } else {
            console.log('内置夜间模式已存在，跳过创建。');
        }
    } catch (error) {
        console.error('检查或创建内置夜间模式时出错:', error);
    }
}

async function handleSendToPet() {
    const chat = state.chats[state.activeChatId];
    const pet = chat.settings.pet;
    const input = document.getElementById('pet-chat-input');
    const userInput = input.value.trim();
    if (!userInput) return;

    input.value = '';
    input.style.height = 'auto';

    pet.petChatHistory.push({ sender: 'user', content: userInput });
    renderPetChatHistory();

    const petResponse = await getPetApiResponse(pet);
    if (petResponse) {
        pet.petChatHistory.push({ sender: 'pet', content: petResponse });
        renderPetChatHistory();
    }

    // 创建对用户【可见】的系统消息，记录这次对话
    const visibleLog = `[系统：你和宠物“${pet.name}”进行了对话。你说：“${userInput}”，它回应：“${petResponse}”。]`;
    const visibleMessage = {
        role: 'system',
        type: 'pat_message', // 使用这个类型来显示居中灰色气泡
        content: visibleLog,
        timestamp: Date.now(),
    };
    chat.history.push(visibleMessage);

    // 只有当用户正在查看当前聊天时，才实时追加到界面上
    if (document.getElementById('chat-interface-screen').classList.contains('active') && state.activeChatId === chat.id) {
        appendMessage(visibleMessage, chat);
    }

    // 创建给AI看的【隐藏】指令
    const hiddenMessageForAI = `[系统提示：用户刚刚和宠物“${pet.name}”进行了一次对话。用户说：“${userInput}”，宠物回应：“${petResponse}”。]`;
    const hiddenMessage = {
        role: 'system',
        content: hiddenMessageForAI,
        timestamp: Date.now() + 1,
        isHidden: true,
    };
    chat.history.push(hiddenMessage);

    await db.chats.put(chat);
}

async function updateCharacterBankBalance(charId, amount, description) {
    // 安全检查：如果缺少关键信息，则直接返回
    if (!charId || !amount || isNaN(amount)) {
        console.warn(
            "updateCharacterBankBalance 调用失败：缺少charId或有效的amount。"
        );
        return;
    }

    // 从全局状态中获取角色对象
    const chat = state.chats[charId];
    // 安全检查：确保角色存在且不是群聊
    if (!chat || chat.isGroup) {
        console.warn(
            `updateCharacterBankBalance 跳过：找不到ID为 ${charId} 的角色或该ID为群聊。`
        );
        return;
    }

    // --- 确保数据结构完整，兼容旧数据 ---
    if (!chat.characterPhoneData) {
        chat.characterPhoneData = {};
    }
    if (!chat.characterPhoneData.bank) {
        chat.characterPhoneData.bank = { balance: 0, transactions: [] };
    }
    // 如果旧数据的余额不是数字，则强制设为0
    if (typeof chat.characterPhoneData.bank.balance !== "number") {
        chat.characterPhoneData.bank.balance = 0;
    }
    // 如果旧数据的交易记录不是数组，则创建一个空数组
    if (!Array.isArray(chat.characterPhoneData.bank.transactions)) {
        chat.characterPhoneData.bank.transactions = [];
    }

    // --- 核心逻辑 ---
    // 1. 创建一条新的交易记录
    const newTransaction = {
        type: amount > 0 ? "收入" : "支出",
        amount: Math.abs(amount), // 交易记录里的金额总是正数
        description: description,
        timestamp: Date.now(), // 记录交易发生的时间
    };

    // 2. 更新余额
    chat.characterPhoneData.bank.balance += amount;

    // 3. 将新交易记录添加到列表的开头（让最新的显示在最前面）
    chat.characterPhoneData.bank.transactions.unshift(newTransaction);

    // 4. 将更新后的角色数据保存回数据库
    await db.chats.put(chat);

    console.log(
        `✅ 钱包同步成功: 角色[${chat.name
        }], 交易[${description}], 金额[${amount.toFixed(
            2
        )}], 新余额[${chat.characterPhoneData.bank.balance.toFixed(2)}]`
    );
}
window.updateCharacterBankBalance = updateCharacterBankBalance;

function findConsecutiveAiVoiceMessages(history, startIndex) {
    const messagesToPlay = [];
    if (startIndex < 0 || startIndex >= history.length) {
        return messagesToPlay;
    }

    // 从点击的那条消息开始，向后遍历
    for (let i = startIndex; i < history.length; i++) {
        const msg = history[i];
        // 检查这条消息是否是AI发送的，并且类型是语音
        if (msg.role === 'assistant' && msg.type === 'voice_message') {
            messagesToPlay.push(msg); // 如果是，就把它加入待播放列表
        } else {
            // 一旦遇到不是AI语音的消息（比如用户的回复，或AI的图片/文字消息），就立刻停止查找
            break;
        }
    }
    return messagesToPlay;
}
window.findConsecutiveAiVoiceMessages = findConsecutiveAiVoiceMessages;

function stopMinimaxAudio() {
    if (!window.isTtsPlaying) return;

    isIntentionalStop = true;
    const ttsPlayer = document.getElementById('tts-audio-player');
    ttsPlayer.pause();
    ttsPlayer.src = ''; // 这会触发 onerror 事件，从而执行清理

    if (window.currentAnimatingBubbles) {
        window.currentAnimatingBubbles.forEach((b) => {
            const spinner = b.querySelector('.loading-spinner');
            if (spinner) spinner.style.display = 'none';
            b.classList.remove('playing');
        });
    }

    window.isTtsPlaying = false;
    window.currentTtsAudioBubble = null;
    window.currentAnimatingBubbles = null;

    setTimeout(() => {
        isIntentionalStop = false;
    }, 100);
}
window.stopMinimaxAudio = stopMinimaxAudio;

async function playMinimaxAudio(text, voiceId, bubblesToAnimate) {
    stopMinimaxAudio();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const ttsPlayer = document.getElementById('tts-audio-player');
    const firstBubble = bubblesToAnimate[0];
    if (!firstBubble) return;

    window.isTtsPlaying = true;
    window.currentTtsAudioBubble = firstBubble;
    window.currentAnimatingBubbles = bubblesToAnimate;
    bubblesToAnimate.forEach((b) => {
        const spinner = b.querySelector('.loading-spinner');
        if (spinner) spinner.style.display = 'block';
    });

    const mainAudioPlayer = document.getElementById('audio-player');
    if (mainAudioPlayer && !mainAudioPlayer.paused) {
        mainAudioPlayer.pause();
        state.musicState.isPlaying = false;
        updatePlayerUI();
    }

    const groupId = state.apiConfig.minimaxGroupId;
    const apiKey = state.apiConfig.minimaxApiKey;
    if (!groupId || !apiKey) {
        await showCustomAlert('语音播放失败', '尚未配置Minimax的Group ID和API Key。');
        stopMinimaxAudio();
        return;
    }

    const chat = state.chats[state.activeChatId];
    if (!chat) {
        stopMinimaxAudio();
        return;
    }

    const provider = state.apiConfig.minimaxProvider || 'cn';
    const speechModel = state.apiConfig.minimaxSpeechModel || 'speech-01-turbo';
    const baseUrl = provider === 'cn' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';
    const requestUrl = `${baseUrl}/v1/t2a_v2`;
    // 1. 从当前角色的设置中读取语速和语言增强
    const speed = chat.settings.speed ?? 1.0;
    const langBoost = chat.settings.language_boost; // 如果是null或undefined, 就让它是null/undefined

    const textForTts = text.replace(/\(.*?\)|（.*?）|【.*?】/g, '').trim();

    // 2. 构建包含新参数的请求体
    const requestBody = {
        model: speechModel,
        text: textForTts, // <--- 核心修改在这里！使用过滤后的文本
        voice_setting: {
            voice_id: voiceId,
            speed: speed, // ★ 在这里加入语速
        },
    };

    // 3. 如果 language_boost 有效，才将它添加到请求体中
    if (langBoost) {
        requestBody.language_boost = langBoost;
    }

    console.log(`[Minimax TTS] Request to ${requestUrl}`, requestBody);

    try {
        const response = await fetch(`${requestUrl}?GroupId=${groupId}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok || (result.base_resp && result.base_resp.status_code !== 0)) {
            throw new Error(`API错误码 ${result.base_resp?.status_code || response.status}: ${result.base_resp?.status_msg || response.statusText}`);
        }

        if (!result.data || !result.data.audio) {
            throw new Error('API响应中未找到有效的音频数据。');
        }

        const audioUrl = hexToBlobUrl(result.data.audio);
        if (!audioUrl) {
            throw new Error('Hex音频数据转换失败。');
        }

        bubblesToAnimate.forEach((b) => {
            const spinner = b.querySelector('.loading-spinner');
            if (spinner) spinner.style.display = 'none';
            b.classList.add('playing');
        });

        ttsPlayer.src = audioUrl;

        const cleanupAndReset = () => {
            if (window.isTtsPlaying) {
                window.isTtsPlaying = false;
                URL.revokeObjectURL(audioUrl);
                if (window.currentAnimatingBubbles) {
                    window.currentAnimatingBubbles.forEach((b) => b.classList.remove('playing'));
                }
                currentTtsAudioBubble = null;
                window.currentAnimatingBubbles = null;
            }
        };

        ttsPlayer.onended = cleanupAndReset;

        ttsPlayer.onerror = (e) => {
            if (!isIntentionalStop) {
                console.error('TTS音频播放时发生错误:', e);
            }
            cleanupAndReset();
        };

        await ttsPlayer.play();
    } catch (error) {
        console.error('Minimax TTS 调用失败:', error);
        await showCustomAlert('语音合成失败', `错误信息: ${error.message}`);
        stopMinimaxAudio();
    }
}
window.playMinimaxAudio = playMinimaxAudio;

function hexToBlobUrl(hex) {
    if (!hex) return null;
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
    const length = cleanHex.length;
    if (length % 2 !== 0) {
        console.error('Hex string has an odd length.');
        return null;
    }
    const buffer = new Uint8Array(length / 2);
    for (let i = 0; i < length; i += 2) {
        buffer[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    // 根据文档，推荐使用 mp3 格式
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

function toggleCharPhonePresetButtons(isEnabled) {
    document.getElementById("apply-char-phone-preset-btn").disabled =
        !isEnabled;
    document.getElementById("update-char-phone-preset-btn").disabled =
        !isEnabled;
    document.getElementById("rename-char-phone-preset-btn").disabled =
        !isEnabled;
    document.getElementById("delete-char-phone-preset-btn").disabled =
        !isEnabled;
    document.getElementById("export-char-phone-preset-btn").disabled =
        !isEnabled;
}

function calculateTokenCount(text) {
    if (!text) return 0;
    // 简单估算：如果是中文环境，通常可以直接用字符数作为参考
    // 或者粗略估算：Token ≈ 字符数
    // 如果你想显示的数值小一点（更接近GPT的Token），可以乘以 0.7
    return text.length;
}

async function getTokenDetailedBreakdown(chatId) {
    const chat = state.chats[chatId];
    if (!chat) return null;

    const settings = chat.settings;
    const breakdown = [];
    const outlierThreshold = 300; // 设定阈值：超过300字符被视为"大消息"
    let outliers = []; // 用于存储异常大的消息

    // ... (前1-4部分保持不变: 人设、世界书、表情包、总结) ...
    // 1. 核心人设
    let personaText = chat.isGroup ? `群聊...${chat.members.map((m) => m.persona).join('')}` : (chat.settings.aiPersona || '') + (chat.settings.myPersona || '');
    breakdown.push({ name: '核心人设', count: calculateTokenCount(personaText) });

    // 2. 世界书
    let wbText = '';
    if (settings.linkedWorldBookIds) {
        wbText = settings.linkedWorldBookIds
            .map((id) => {
                const b = state.worldBooks.find((wb) => wb.id === id);
                return b ? b.content : '';
            })
            .join('');
    }
    breakdown.push({ name: '世界书', count: calculateTokenCount(wbText) });

    // 3. 表情包定义
    let stickerText = '';
    const allStickers = [...(settings.stickerLibrary || []), ...(state.charStickers || [])];
    if (allStickers.length > 0) stickerText = allStickers.map((s) => s.name).join('');
    breakdown.push({ name: '表情包定义', count: calculateTokenCount(stickerText) });

    // 4. 长期记忆
    const summaryText = chat.history
        .filter((m) => m.type === 'summary')
        .map((s) => s.content)
        .join('');
    breakdown.push({ name: '长期记忆(总结)', count: calculateTokenCount(summaryText) });

    // 5. 短期记忆 (对话) - 【核心修改部分】
    const history = chat.history.filter((msg) => !msg.isHidden);
    const memoryDepth = settings.maxMemory || 10;
    const contextMessages = history.slice(-memoryDepth);

    let userMsgLen = 0;
    let aiMsgLen = 0;

    contextMessages.forEach((msg) => {
        let content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        let len = calculateTokenCount(content);

        // --- 异常检测逻辑 ---
        if (len > outlierThreshold) {
            outliers.push({
                role: msg.role,
                preview: content.substring(0, 15) + '...', // 预览前15个字
                count: len,
                timestamp: msg.timestamp, // 用于跳转
            });
        }
        // ------------------

        if (msg.role === 'user') userMsgLen += len;
        else aiMsgLen += len;
    });

    // 对异常消息按大小排序 (最大的在前面)
    outliers.sort((a, b) => b.count - a.count);

    breakdown.push({ name: '短期记忆(用户)', count: userMsgLen });
    breakdown.push({ name: '短期记忆(AI)', count: aiMsgLen });
    breakdown.push({ name: '系统格式指令', count: 800 });

    // 返回数据增加了 outliers 字段
    return { items: breakdown, outliers: outliers };
}

// ========================================
// 🖼️ NAI图片三击下载功能（非入侵式）
// ========================================
// 功能：为所有NAI图片（realimag-image、naiimag-image）添加三击下载功能
// 适用场景：群聊、私聊、动态、测试弹窗等所有显示NAI图片的地方
// 实现方式：事件委托，不修改任何现有代码
// 触发方式：在图片上快速点击三次
// ========================================

(function () {
    'use strict';

    // 下载图片的核心函数
    function downloadImage(imageSrc, filename) {
        try {
            // 创建一个隐藏的下载链接
            const link = document.createElement('a');
            link.href = imageSrc;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click(); // 触发下载

            // 短暂延迟后移除链接
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);

            console.log('✅ [NAI下载] 开始下载图片:', filename);

            // 显示下载提示
            showDownloadToast();
        } catch (error) {
            console.error('❌ [NAI下载] 下载失败:', error);
            showDownloadToast('下载失败，请重试', 'error');
        }
    }

    // 显示下载提示（临时Toast）
    function showDownloadToast(message = '📥 图片下载中...', type = 'success') {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
			            position: fixed;
			            bottom: 20px;
			            right: 20px;
			            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
			            color: white;
			            padding: 12px 24px;
			            border-radius: 8px;
			            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			            z-index: 10000;
			            font-size: 14px;
			            pointer-events: none;
			            opacity: 0;
			            transform: translateY(20px);
			            transition: all 0.3s ease;
			        `;

        document.body.appendChild(toast);

        // 动画进入
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // 2秒后淡出并移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2000);
    }

    // 生成智能文件名
    function generateFilename(imgElement) {
        // 尝试从title属性获取prompt（用于文件名）
        const title = imgElement.getAttribute('title') || imgElement.getAttribute('alt') || '';

        // 清理title，提取前30个有效字符
        let cleanTitle = title
            .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '_') // 保留中英文字母数字和空格
            .replace(/\s+/g, '_') // 空格转下划线
            .substring(0, 30);

        if (!cleanTitle) {
            cleanTitle = 'NAI_Image';
        }

        // 添加时间戳（精确到秒）
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0]; // 格式：20250124_123045

        // 生成文件名
        return `${cleanTitle}_${timestamp}.png`;
    }

    // 为图片添加双击时的视觉反馈
    function addVisualFeedback(imgElement) {
        const originalTransform = imgElement.style.transform || '';
        const originalTransition = imgElement.style.transition || '';

        // 添加缩放动画
        imgElement.style.transition = 'transform 0.15s ease';
        imgElement.style.transform = 'scale(0.95)';

        setTimeout(() => {
            imgElement.style.transform = originalTransform;
            setTimeout(() => {
                imgElement.style.transition = originalTransition;
            }, 150);
        }, 150);
    }

    // 三击检测相关变量
    let clickCount = 0;
    let clickTimer = null;
    let lastClickedElement = null;

    // 全局事件监听器（事件委托 - 三击触发）
    document.addEventListener(
        'click',
        function (e) {
            const target = e.target;

            // 检查是否是NAI图片（realimag-image 或 naiimag-image）
            if (target.tagName === 'IMG' && (target.classList.contains('realimag-image') || target.classList.contains('naiimag-image'))) {
                // 如果点击的是同一个元素，增加计数
                if (target === lastClickedElement) {
                    clickCount++;
                } else {
                    // 点击了不同的元素，重置计数
                    clickCount = 1;
                    lastClickedElement = target;
                }

                // 清除之前的定时器
                if (clickTimer) {
                    clearTimeout(clickTimer);
                }

                // 如果达到三击
                if (clickCount === 3) {
                    // 重置计数
                    clickCount = 0;
                    lastClickedElement = null;

                    // 阻止默认行为和事件冒泡
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('🖼️ [NAI下载] 检测到三击NAI图片');

                    // 添加视觉反馈
                    addVisualFeedback(target);

                    // 获取图片源（可能是base64或URL）
                    const imageSrc = target.src;

                    if (!imageSrc || imageSrc === 'about:blank') {
                        console.warn('⚠️ [NAI下载] 图片源为空，无法下载');
                        showDownloadToast('图片加载中，请稍后重试', 'error');
                        return;
                    }

                    // 生成文件名
                    const filename = generateFilename(target);

                    // 触发下载
                    downloadImage(imageSrc, filename);
                } else {
                    // 设置定时器，500ms后重置计数（如果用户停止点击）
                    clickTimer = setTimeout(() => {
                        clickCount = 0;
                        lastClickedElement = null;
                    }, 500);
                }
            }
        },
        true
    ); // 使用捕获阶段，确保优先处理

    console.log('✅ [NAI下载] 三击下载功能已初始化');
    console.log('💡 [NAI下载] 提示：三击任意NAI图片即可下载');
})();


// --- Moved Part 2 ---

function openGroupAnnouncementModal() {
    const chat = state.chats[state.activeChatId];
    if (!chat || !chat.isGroup) return;

    const modal = document.getElementById('group-announcement-modal');
    const contentArea = document.getElementById('announcement-content-area');
    const footer = document.getElementById('announcement-footer');

    const announcement = chat.settings.groupAnnouncement || '暂无公告';
    contentArea.innerHTML = announcement.replace(/\n/g, '<br>');

    const canEdit = chat.ownerId === 'user' || chat.settings.isUserAdmin;

    footer.innerHTML = '';
    if (canEdit) {
        const editBtn = document.createElement('button');
        editBtn.className = 'cancel';
        editBtn.textContent = '编辑';
        // 改用 addEventListener 来绑定事件，更安全可靠
        editBtn.addEventListener('click', editGroupAnnouncement);
        footer.appendChild(editBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'save';
    closeBtn.textContent = '关闭';
    // 同样改用 addEventListener
    closeBtn.addEventListener('click', closeGroupAnnouncementModal);
    footer.appendChild(closeBtn);

    modal.classList.add('visible');
}

function editGroupAnnouncement() {
    const chat = state.chats[state.activeChatId];
    const contentArea = document.getElementById('announcement-content-area');
    const footer = document.getElementById('announcement-footer');

    const currentContent = chat.settings.groupAnnouncement || '';
    contentArea.innerHTML = `<textarea id="announcement-editor">${currentContent}</textarea>`;

    // 这里也全部改用 addEventListener 的方式绑定
    footer.innerHTML = ''; // 先清空

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', closeGroupAnnouncementModal); // 直接调用函数

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', saveGroupAnnouncement); // 直接调用函数

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    document.getElementById('announcement-editor').focus();
}

function closeGroupAnnouncementModal() {
    // 关闭后，重新渲染一次查看状态，以防用户取消了编辑
    const modal = document.getElementById('group-announcement-modal');
    modal.classList.remove('visible');
    // 延迟一点点再打开，可以避免视觉上的冲突
    setTimeout(() => {
        if (modal.classList.contains('visible')) {
            // 做个检查，万一用户快速操作
            openGroupAnnouncementModal();
        }
    }, 10);
    // 直接关闭，不再重新打开
    document.getElementById('group-announcement-modal').classList.remove('visible');
}



// --- Moved Listeners ---
function setupChatAppListeners() {
    document.getElementById('close-rp-details-btn').addEventListener('click', () => {
        document.getElementById('red-packet-details-modal').classList.remove('visible');
    });
    document.getElementById('group-announcement-btn').addEventListener('click', openGroupAnnouncementModal);
}

// Auto-init listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChatAppListeners);
} else {
    setupChatAppListeners();
}


window.applyScopedCss = applyScopedCss; // Expose to global
function applyScopedCss(cssString, scopeId, styleTagId) {
    const styleTag = document.getElementById(styleTagId);
    if (!styleTag) return;

    if (!cssString || cssString.trim() === '') {
        styleTag.innerHTML = '';
        return;
    }

    // 增强作用域处理函数 - 专门解决.user和.ai样式冲突问题
    const scopedCss = cssString
        .replace(/\s*\.message-bubble\.user\s+([^{]+\{)/g, `${scopeId} .message-bubble.user $1`)
        .replace(/\s*\.message-bubble\.ai\s+([^{]+\{)/g, `${scopeId} .message-bubble.ai $1`)
        .replace(/\s*\.message-bubble\s+([^{]+\{)/g, `${scopeId} .message-bubble $1`);

    styleTag.innerHTML = scopedCss;
}
