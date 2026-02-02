// settings.js - 处理所有设置相关的逻辑

// ===================================================================
// 1. 全局配置常量
// ===================================================================
// --- Moved Helpers to Global Scope to fix ReferenceErrors ---

/**
 * 通用文件上传并压缩处理函数
 * @param {File} file - 用户选择的文件
 * @returns {Promise<string>} - 返回压缩后的Base64字符串
 */
window.handleImageUploadAndCompress = async function (file) {
    const base64Url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Check if state is available, otherwise default to 0.7
    const quality = (window.state && window.state.globalSettings && window.state.globalSettings.imageCompressionQuality) || 0.7;
    console.log(`准备压缩图片，质量: ${quality}`);

    // Assuming compressImage is hoisted from the bottom of settings.js
    if (typeof compressImage === 'function') {
        const compressedBase64 = await compressImage(base64Url, quality);
        console.log(`图片压缩完成。原始大小: ${base64Url.length}, 压缩后大小: ${compressedBase64.length}`);
        return compressedBase64;
    } else {
        console.warn('compressImage function not found, returning original.');
        return base64Url;
    }
};

/**
 * 文件上传绑定通用函数
 * @param {string} inputId - 文件输入框ID
 * @param {function} callback - 处理完成后的回调函数，接收 Base64 字符串
 */
window.setupFileUpload = function (inputId, callback) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const compressedDataUrl = await window.handleImageUploadAndCompress(file);
                callback(compressedDataUrl);
            } catch (error) {
                console.error(`处理文件 ${file.name} 失败:`, error);
                alert(`处理图片失败: ${error.message}`);
            } finally {
                event.target.value = null;
            }
        }
    });
};

const STICKER_REGEX = /^(data:image\/)|(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico|tiff))|(https?:\/\/.*(?:catbox|postimg|imgbb|sinaimg|telegraph|wx[1-4])\..*)/i;

window.BLOCKED_API_SITES = ['api.pisces.ink', 'aiapi.qzz.io'];

window.THEME_CSS_TEMPLATE = `
/*
  EPhone 美化代码模板
  使用方法:
  1. 修改下面的颜色代码或图片URL。
  2. 不需要修改的部分可以删除或保持不变。
  3. 颜色代码格式为 #RRGGBB (例如 #FFFFFF 是白色)。
  4. 图片URL需要是网络直链。
*/

/* === 1. 手机壳与刘海颜色 === */
#phone-frame {
  background-color: #f0f0f0; /* 手机壳颜色 */
}
.notch {
  background-color: #1a1a1a; /* 顶部“刘海”颜色 */
}
        #clock-container {  color: white;  }


/* === 1.5. 全局主题色 (重要！) === */
/* 这个颜色决定了大部分按钮、链接和高亮文本的颜色。*/
:root {
  --accent-color: #007bff; /* 默认是蓝色 */
}

/* === 2. 聊天界面顶部和底部的图片按钮替换 === */
/* “一起听”按钮 (正常状态) */
#listen-together-btn img[src*="8kYShvrJ/90-UI-2.png"] {
  content: url('在这里粘贴你的“正常状态”图片URL');
}
/* “一起听”按钮 (播放中状态) */
#listen-together-btn img[src*="D0pq6qS2/E30078-DC-8-B99-4-C01-AFDA-74728-DBF7-BEA.png"] {
  content: url('在这里粘贴你的“播放中”图片URL');
}
/* “聊天设置”按钮 */
#chat-settings-btn img {
  content: url('https://i.postimg.cc/bvPq64cv/CCA834-BA-5-A90-408-D-94-FA-7-EE156-B6-A765.png');
}
/* “触发API回复”按钮 */
#wait-reply-btn img {
  content: url('https://i.postimg.cc/q72zq80N/ECE92-BBC-BE57-48-E9-BB2-C-345-B6019-C4-B2.png');
}
/* “发送”按钮 (设为图片形式) */
#send-btn {
  background-image: url('在这里粘贴你的发送按钮图片URL');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  width: 50px; /* 根据你的图片调整宽度 */
}

/* “重新生成回复”按钮 */
#reroll-btn {
    background-color: rgba(255, 255, 255, 0.6);
    color: var(--text-primary); /* 使用全局主题的主文本颜色 */
}

/* === 3. 顶部栏与底部栏颜色 === */
.header, .qzone-header {
  background-color: rgba(240, 240, 240, 0.8); /* 顶部栏背景色 (带一点透明) */
  color: #333333; /* 顶部栏文字颜色 */
}
#chat-list-bottom-nav {
  background-color: rgba(245, 245, 245, 0.85); /* 底部导航栏背景色 */
}
.nav-item {
  color: #8a8a8a; /* 底部导航栏未选中项的颜色 */
}
.nav-item.active {
  color: #007bff; /* 底部导航栏选中项的颜色 */
}

/* === 4. 各界面背景色 === */
#chat-list-screen, #qzone-screen .qzone-content, #memories-view {
  background-color: #f0f2f5 !important; /* 列表页主背景色 */
}

/* === 5. 聊天输入区底部功能栏SVG图标替换 === */
/* 提示: 你需要将你的SVG代码转换为URL编码格式。
   可以使用在线工具搜索 "SVG to Data URI" 来完成转换。
   然后替换掉下面的 url('...') 部分。 */

.chat-action-icon-btn {
  background-color: rgba(255, 255, 255, 0.5); /* 图标按钮的背景色 */
  border: 1px solid rgba(0,0,0,0.05); /* 图标按钮的边框 */
}

/* 表情面板(+)按钮 */
#open-sticker-panel-btn svg { display: none; /* 隐藏原始SVG */ }
#open-sticker-panel-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 发送照片(旧)按钮 */
#send-photo-btn svg { display: none; /* 隐藏原始SVG */ }
#send-photo-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 上传图片(新)按钮 */
#upload-image-btn svg { display: none; }
#upload-image-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: black;"><path d="M21 3.5H3C2.44772 3.5 2 3.94772 2 4.5V19.5C2 20.0523 2.44772 20.5 3 20.5H21C21.5523 20.5 22 20.0523 22 19.5V4.5C22 3.94772 21.5523 3.5 21 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 13.5C17.6046 13.5 18.5 12.6046 18.5 11.5C18.5 10.3954 17.6046 9.5 16.5 9.5C15.3954 9.5 14.5 10.3954 14.5 11.5C14.5 12.6046 15.3954 13.5 16.5 13.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 14.5L18 10.5L10.3333 18.5M12.5 16L9 12.5L2 19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 转账(￥)按钮 */
#transfer-btn svg { display: none; }
#transfer-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L12 12L17 4M12 12V20M8 10H16M8 13H16"></path></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 语音按钮 */
#voice-message-btn svg { display: none; }
#voice-message-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v4"/><path d="M8 23h8"/></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 外卖按钮 */
#send-waimai-request-btn svg { display: none; }
#send-waimai-request-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 视频通话按钮 */
#video-call-btn svg { display: none; }
#video-call-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 群视频通话按钮 */
#group-video-call-btn svg { display: none; }
#group-video-call-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 投票按钮 */
#send-poll-btn svg { display: none; }
#send-poll-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h10"/><path d="M6 6h.01"/><path d="M8 12h10"/><path d="M6 12h.01"/><path d="M8 18h10"/><path d="M6 18h.01"/></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 分享链接按钮 */
#share-link-btn svg { display: none; }
#share-link-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}

/* 发送定位按钮 (已修复) */
#send-location-btn svg { display: none; } /* 隐藏按钮内部原始的SVG图标 */
#send-location-btn {
  background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>');
  background-size: 60%;
  background-position: center;
  background-repeat: no-repeat;
}


/* === 6. 更多界面背景色 === */
/* 适用于所有设置、编辑、选择等二级页面 */
#api-settings-screen,
#font-settings-screen,
#wallpaper-screen,
#world-book-screen,
#world-book-editor-screen,
#contact-picker-screen,
#member-management-screen,
#album-screen,
#album-photos-screen,
#call-history-screen,
#chat-search-screen,
#browser-screen {
  /* 这里不再设置背景色，让它自然继承夜间模式的颜色 */
}


/* === 7. 回忆卡片美化 === */
.memory-card {
  background-color: #fffaf0 !important; /* 卡片主背景色 */
  border-left-color: #ffb74d !important; /* 左侧装饰条颜色 */
  box-shadow: 0 2px 6px rgba(0,0,0,0.07) !important;
}
.memory-card .header .author {
  color: #d98100 !important; /* 作者/标题文字颜色 */
}
.memory-card .header .date {
  color: #a1887f !important; /* 日期文字颜色 */
}
.memory-card .content {
  color: #5d4037 !important; /* 内容文字颜色 */
}
`;

window.DEFAULT_APP_ICONS = {
    'world-book': 'https://i.postimg.cc/HWf1JKzn/IMG-6435.jpg',
    qq: 'https://i.postimg.cc/MTC3Tkw8/IMG-6436.jpg',
    'api-settings': 'https://i.postimg.cc/MK8rJ8t7/IMG-6438.jpg',
    wallpaper: 'https://i.postimg.cc/T1j03pQr/IMG-6440.jpg',
    font: 'https://i.postimg.cc/pXxk1JXk/IMG-6442.jpg',
    'check-phone': 'https://i.postimg.cc/RVwpwr0r/IMG-8348.jpg',
    weibo: 'https://i.postimg.cc/PqBY5wBq/weibo-icon.png',
    forum: 'https://i.postimg.cc/pr0T3WfC/douban-icon.png',
    'lovers-space': 'https://i.postimg.cc/d1wZ39xW/lovers-space-icon.png',
    'game-hall': 'https://i.postimg.cc/P5gL5z2g/game-controller-icon.png',
    'x-social': 'https://i.postimg.cc/8P1H0vQ8/x-logo.png',
    taobao: 'https://i.postimg.cc/k47tXg1j/taologo.png',
    'date-a-live': 'https://i.postimg.cc/Kjdss1j9/1761142686734.png',
    'tukey-accounting': 'https://i.postimg.cc/k4fZKVXP/tu-tu.png',
    'kk-checkin': 'https://i.postimg.cc/MGwrL0nf/kitty.png',
    studio: 'https://i.postimg.cc/W3sLz11s/clapperboard-icon.png',
};

window.DEFAULT_APP_LABELS = {
    qq: 'QQ',
    'world-book': '世界书',
    'api-settings': 'API设置',
    wallpaper: '外观设置',
    font: '字体',
    'check-phone': '查手机',
    weibo: '微博',
    forum: '圈子',
    'lovers-space': '情侣空间',
    'game-hall': '游戏大厅',
    'x-social': 'X社交',
    taobao: '桃宝',
    'date-a-live': '约会大作战',
    'tukey-accounting': '兔兔记账',
    'kk-checkin': 'kk查岗',
    studio: 'lrq小剧场',
};

// ===================================================================
// 2. 辅助函数定义 (全局暴露)
// ===================================================================

window.applyGlobalWallpaper = function () {
    const homeScreen = document.getElementById('home-screen');
    const wallpaper = state.globalSettings.wallpaper;
    if (wallpaper && wallpaper.startsWith('data:image')) homeScreen.style.backgroundImage = `url(${wallpaper})`;
    else if (wallpaper) homeScreen.style.backgroundImage = wallpaper;
}

window.applyLockscreenWallpaper = function () {
    const lockScreen = document.getElementById('lock-screen');
    const wallpaper = state.globalSettings.lockscreenWallpaper;
    if (wallpaper && wallpaper.startsWith('data:image')) {
        lockScreen.style.backgroundImage = `url(${wallpaper})`;
    } else if (wallpaper) {
        lockScreen.style.backgroundImage = wallpaper;
    }
}

window.applyThemeCss = function (cssCode) {
    const styleTag = document.getElementById('custom-theme-style');
    if (styleTag) {
        styleTag.innerHTML = cssCode || '';
    }
}

window.applyAppIcons = function () {
    if (!state.globalSettings.appIcons) return;

    for (const iconId in state.globalSettings.appIcons) {
        const imgElement = document.getElementById(`icon-img-${iconId}`);
        if (imgElement) {
            imgElement.src = state.globalSettings.appIcons[iconId];
        }
    }
}

window.applyAppLabels = function () {
    const appLabels = state.globalSettings.appLabels || {};
    // 注意：这里使用 window.DEFAULT_APP_LABELS
    for (const appId in window.DEFAULT_APP_LABELS) {
        if (window.DEFAULT_APP_LABELS.hasOwnProperty(appId)) {
            const defaultName = window.DEFAULT_APP_LABELS[appId];
            const customName = appLabels[appId] || defaultName;

            // 这个选择器会同时找到主屏幕和Dock栏上的所有图标
            const icons = document.querySelectorAll(`.desktop-app-icon [id="icon-img-${appId}"]`);

            icons.forEach(iconImg => {
                const appIconContainer = iconImg.closest('.desktop-app-icon');
                if (appIconContainer) {
                    const labelElement = appIconContainer.querySelector('.label');
                    if (labelElement) {
                        labelElement.textContent = customName;
                    }
                }
            });
        }
    }
}

window.renderIconSettings = function () {
    const grid = document.getElementById('icon-settings-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 这里复用 DEFAULT_APP_LABELS 作为显示的名称
    const appLabels = window.DEFAULT_APP_LABELS;
    const currentIcons = state.globalSettings.appIcons || {};

    // 修改为遍历 DEFAULT_APP_LABELS，确保只显示当前系统支持的App
    for (const iconId in appLabels) {
        if (!appLabels.hasOwnProperty(iconId)) continue;

        // 优先使用用户设置的图标，如果没有则使用默认图标
        const iconUrl = currentIcons[iconId] || window.DEFAULT_APP_ICONS[iconId] || 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg';
        const labelText = appLabels[iconId];

        const item = document.createElement('div');
        item.className = 'icon-setting-item';

        item.dataset.iconId = iconId;

        item.innerHTML = `
            <img class="icon-preview" src="${iconUrl}" alt="${labelText}">
            <button class="change-icon-btn">更换</button>
        `;
        grid.appendChild(item);
    }
}

window.renderAppNameSettings = function () {
    const grid = document.getElementById('icon-rename-grid'); // Fixed ID to match index.html
    if (!grid) return;
    grid.innerHTML = '';

    const appLabels = window.DEFAULT_APP_LABELS; // 使用全局常量
    const customLabels = state.globalSettings.appLabels || {};

    for (const appId in appLabels) {
        if (appLabels.hasOwnProperty(appId)) {
            const defaultName = appLabels[appId];
            const currentName = customLabels[appId] || defaultName;

            const item = document.createElement('div');
            item.className = 'app-name-setting-item';
            item.innerHTML = `
          <label style="display:block; margin-bottom:5px; font-weight:bold; font-size:13px; color:#555;">${defaultName}</label>
          <input type="text" id="rename-input-${appId}" class="app-rename-input" data-appid="${appId}" value="${currentName}">
      `;
            grid.appendChild(item);
        }
    }
}

/**
 * 处理图标上传的核心逻辑
 * @param {string} iconId - App的唯一标识符
 */
window.handleIconUpload = function (iconId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await window.handleImageUploadAndCompress(file);
            if (!state.globalSettings.appIcons) {
                state.globalSettings.appIcons = {};
            }
            state.globalSettings.appIcons[iconId] = base64;

            // 刷新显示
            window.renderIconSettings();
            // 实时应用
            window.applyAppIcons();

            alert('图标已更新！记得保存设置哦。');
        } catch (error) {
            console.error('更换图标失败:', error);
            alert('更换图标失败: ' + error.message);
        }
    };
    input.click();
};

window.saveAppLabels = function () {
    const inputs = document.querySelectorAll('.app-rename-input');
    if (!state.globalSettings.appLabels) {
        state.globalSettings.appLabels = {};
    }

    inputs.forEach(input => {
        const appId = input.dataset.appid;
        const newName = input.value.trim();
        const defaultName = window.DEFAULT_APP_LABELS[appId];

        if (newName && newName !== defaultName) {
            state.globalSettings.appLabels[appId] = newName;
        } else {
            // 如果名字是空的，或者和默认名字一样，就删除这个键，节省空间
            delete state.globalSettings.appLabels[appId];
        }
    });
}

window.resetAppNamesToDefault = async function () {
    // 1. 弹出确认框，防止误操作
    const confirmed = await showCustomConfirm('恢复默认名称', '确定要将所有App的名称恢复为默认设置吗？此操作不可撤销。', { confirmButtonClass: 'btn-danger' });

    if (confirmed) {
        // 2. 清空存储自定义名称的对象
        state.globalSettings.appLabels = {};

        // 3. 将更改保存到数据库
        await db.globalSettings.put(state.globalSettings);

        // 4. 立即应用更改到UI
        window.applyAppLabels(); // 更新主屏幕上App的显示名称
        window.renderAppNameSettings(); // 刷新外观设置页面的输入框，显示回默认名

        // 5. 给出成功提示
        await showCustomAlert('操作成功', '所有App名称已恢复为默认。');
    }
}

window.loadThemeCssToEditor = function () {
    const editor = document.getElementById('theme-css-editor');
    if (editor) {
        editor.value = state.globalSettings.activeCustomCss || window.THEME_CSS_TEMPLATE;
    }
}

window.loadThemesToDropdown = async function () {
    const selector = document.getElementById('theme-selector');
    selector.innerHTML = '<option value="">-- 选择方案或新建 --</option>'; // 默认选项
    const themes = await db.themes.toArray();
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.name;
        if (state.globalSettings.activeThemeId === theme.id) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

window.loadHomeScreenPresetsToDropdown = async function () {
    const selector = document.getElementById('home-screen-preset-selector');
    if (!selector) return;

    // 清空现有选项，只保留默认提示
    selector.innerHTML = '<option value="">-- 选择布局方案 --</option>';

    // 从数据库加载所有预设
    const presets = await db.homeScreenPresets.toArray();

    // 如果没有预设，可以加个提示或者什么都不做
    if (presets.length === 0) {
        // console.log("没有保存的主屏幕布局预设");
        return;
    }

    // 遍历并添加选项
    presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        selector.appendChild(option);
    });
}

// ===================================================================
// 3. API 相关逻辑 (NovelAI, Minimax, etc)
// ===================================================================

window.fetchMinimaxSpeechModels = function () {
    const modelSelect = document.getElementById('minimax-speech-model-select');
    if (!modelSelect) return;
    modelSelect.innerHTML = ''; // 清空旧选项

    // 从文档中获取的完整模型列表
    const models = ['speech-2.6-hd', 'speech-2.6-turbo', 'speech-02-hd', 'speech-02-turbo', 'speech-01-hd', 'speech-01-turbo'];

    models.forEach((modelId) => {
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = modelId;
        modelSelect.appendChild(option);
    });

    // 自动选中当前已保存的模型，如果没有则使用一个推荐的默认值
    modelSelect.value = state.apiConfig.minimaxSpeechModel || 'speech-01-turbo';

    alert('Minimax 语音模型列表已更新！');
}

window.loadNovelAISettings = function () {
    // 1. 加载基础开关和凭证 (从localStorage)
    const storedEnabled = localStorage.getItem('novelai-enabled');
    const enabled = storedEnabled === 'true'; //只有明确为'true'才是开启
    const model = localStorage.getItem('novelai-model') || 'nai-diffusion-3';
    const apiKey = localStorage.getItem('novelai-api-key') || '';

    const naiSwitch = document.getElementById('novelai-switch');
    if (naiSwitch) {
        naiSwitch.checked = enabled;
        // 触发change事件以更新UI显示，或者手动更新
        const detailsDiv = document.getElementById('novelai-details');
        if (detailsDiv) detailsDiv.style.display = enabled ? 'block' : 'none';
    }

    const modelSelect = document.getElementById('novelai-model');
    if (modelSelect) modelSelect.value = model;

    const apiKeyInput = document.getElementById('novelai-api-key');
    if (apiKeyInput) apiKeyInput.value = apiKey;

    // 2. 加载高级参数 (从localStorage的JSON对象)
    const settings = getNovelAISettings();
    const resolutionInput = document.getElementById('nai-resolution');
    if (resolutionInput) resolutionInput.value = settings.resolution;

    const stepsInput = document.getElementById('nai-steps');
    if (stepsInput) stepsInput.value = settings.steps;

    const cfgInput = document.getElementById('nai-cfg-scale');
    if (cfgInput) cfgInput.value = settings.cfg_scale;
    document.getElementById('nai-sampler').value = settings.sampler;
    document.getElementById('nai-seed').value = settings.seed;
    document.getElementById('nai-uc-preset').value = settings.uc_preset;
    document.getElementById('nai-quality-toggle').checked = settings.quality_toggle;
    document.getElementById('nai-smea').checked = settings.smea;
    document.getElementById('nai-smea-dyn').checked = settings.smea_dyn;
    document.getElementById('nai-default-positive').value = settings.default_positive;
    document.getElementById('nai-default-negative').value = settings.default_negative;
    document.getElementById('nai-cors-proxy').value = settings.cors_proxy;
    document.getElementById('nai-custom-proxy-url').value = settings.custom_proxy_url || '';

    // 显示/隐藏自定义代理输入框
    const customProxyGroup = document.getElementById('nai-custom-proxy-group');
    customProxyGroup.style.display = settings.cors_proxy === 'custom' ? 'block' : 'none';
}

window.saveNovelAISettings = function () {
    // 保存API Key和模型等基础配置
    const novelaiEnabled = document.getElementById('novelai-switch').checked;
    const novelaiModel = document.getElementById('novelai-model').value;
    const novelaiApiKey = document.getElementById('novelai-api-key').value.trim();

    localStorage.setItem('novelai-enabled', novelaiEnabled);
    localStorage.setItem('novelai-model', novelaiModel);
    localStorage.setItem('novelai-api-key', novelaiApiKey);
    document.getElementById('novelai-details').style.display = novelaiEnabled ? 'block' : 'none';

    // 保存高级参数配置
    const settings = {
        resolution: document.getElementById('nai-resolution').value,
        steps: parseInt(document.getElementById('nai-steps').value),
        cfg_scale: parseFloat(document.getElementById('nai-cfg-scale').value),
        sampler: document.getElementById('nai-sampler').value,
        seed: parseInt(document.getElementById('nai-seed').value),
        uc_preset: parseInt(document.getElementById('nai-uc-preset').value),
        quality_toggle: document.getElementById('nai-quality-toggle').checked,
        smea: document.getElementById('nai-smea').checked,
        smea_dyn: document.getElementById('nai-smea-dyn').checked,
        default_positive: document.getElementById('nai-default-positive').value,
        default_negative: document.getElementById('nai-default-negative').value,
        cors_proxy: document.getElementById('nai-cors-proxy').value,
        custom_proxy_url: document.getElementById('nai-custom-proxy-url').value,
    };

    localStorage.setItem('novelai-settings', JSON.stringify(settings));
}

window.resetNovelAISettings = function () {
    localStorage.removeItem('novelai-settings');
    loadNovelAISettings();
    alert('已恢复默认设置！');
}

window.getNovelAISettings = function () {
    const defaultSettings = {
        resolution: '1024x1024',
        steps: 28,
        cfg_scale: 5,
        sampler: 'k_euler_ancestral',
        seed: -1,
        uc_preset: 1,
        quality_toggle: true,
        smea: true,
        smea_dyn: false,
        default_positive: 'masterpiece, best quality, 1girl, beautiful, detailed face, detailed eyes, long hair, anime style',
        default_negative: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
        cors_proxy: 'https://corsproxy.io/?',
        custom_proxy_url: '',
    };

    const saved = localStorage.getItem('novelai-settings');
    if (saved) {
        try {
            return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
            return defaultSettings;
        }
    }
    return defaultSettings;
}

window.handleAutoBackupTimer = function () {
    const isAutoBackupEnabled = state.apiConfig.githubAutoBackup;
    const backupIntervalMinutes = state.apiConfig.githubBackupInterval || 30;

    // 清除旧的定时器 (如果存在)
    if (window.autoBackupTimer) {
        clearInterval(window.autoBackupTimer);
        window.autoBackupTimer = null;
        console.log('已停止旧的自动备份定时器');
    }

    if (isAutoBackupEnabled) {
        console.log(`启动自动备份定时器，间隔: ${backupIntervalMinutes} 分钟`);

        // 立即执行一次备份检查/上传 (可选，这里我们只启动定时器)
        // backupToGithub(); 

        window.autoBackupTimer = setInterval(() => {
            console.log('自动备份定时器触发...');
            // 假设 backupToGithub 是全局函数，因为它在 main-app.js 中定义且比较核心
            if (typeof window.backupToGithub === 'function') {
                window.backupToGithub(true); // true 表示静默模式
            } else {
                console.warn('找不到 backupToGithub 函数，无法自动备份');
            }
        }, backupIntervalMinutes * 60 * 1000);
    }
}

// ===================================================================
// 4. 事件监听器初始化函数
// ===================================================================

window.initSettingsListeners = function () {
    console.log('Initializing Settings Listeners...');

    // 0. App图标与名称设置的相关监听 (新增/迁移)
    const iconSettingsGrid = document.getElementById('icon-settings-grid');
    if (iconSettingsGrid) {
        iconSettingsGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('change-icon-btn')) {
                const item = e.target.closest('.icon-setting-item');
                if (item && item.dataset.iconId) {
                    window.handleIconUpload(item.dataset.iconId);
                }
            }
        });
    }

    const iconRenameGrid = document.getElementById('icon-rename-grid');
    if (iconRenameGrid) {
        iconRenameGrid.addEventListener('change', (e) => {
            if (e.target.classList.contains('app-rename-input')) {
                // 实时保存到内存中，点击保存按钮时才写入数据库
                window.saveAppLabels();
            }
        });
    }

    // 0.5 全局聊天背景设置 (补充监听)
    const globalBgUploadInput = document.getElementById('global-bg-upload-input');
    if (globalBgUploadInput) {
        globalBgUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    const dataUrl = await window.handleImageUploadAndCompress(file);
                    window.newGlobalBgBase64 = dataUrl;

                    // 手动更新预览
                    const preview = document.getElementById('global-bg-preview');
                    if (preview) {
                        preview.style.backgroundImage = `url(${dataUrl})`;
                        preview.textContent = '';
                    }
                } catch (err) {
                    alert('背景图片处理失败: ' + err.message);
                }
            }
        });
    }

    const removeGlobalBgBtn = document.getElementById('remove-global-bg-btn');
    if (removeGlobalBgBtn) {
        removeGlobalBgBtn.addEventListener('click', () => {
            window.newGlobalBgBase64 = 'REMOVED'; // 设置一个特殊标记
            const preview = document.getElementById('global-bg-preview');
            if (preview) {
                preview.style.backgroundImage = 'none';
                preview.textContent = '已移除 (保存后生效)';
            }
        });
    }

    const clearAllSingleBgsBtn = document.getElementById('clear-all-single-bgs-btn');
    if (clearAllSingleBgsBtn) {
        clearAllSingleBgsBtn.addEventListener('click', async () => {
            const confirmed = await window.showCustomConfirm('由于该操作不可逆，请确认', '确定要清除所有单人角色的独立聊天背景，并恢复为全局默认背景吗？', {
                confirmButtonClass: 'btn-danger'
            });

            if (confirmed) {
                let count = 0;
                // 遍历所有 activeChats
                for (const chatId in state.chats) {
                    const chat = state.chats[chatId];
                    if (!chat.isGroup && chat.settings && chat.settings.background) {
                        chat.settings.background = ''; // 清空
                        await db.chats.put(chat);
                        count++;
                    }
                }
                alert(`操作成功！已清空 ${count} 个角色的独立背景。`);

                // 如果当前已经打开了某个聊天窗口，且正好它是被清理的对象之一，最好立即刷新一下它的背景
                // 但因为这里是在设置页，用户通常不在聊天界面，所以主要只是提醒一下
            }
        });
    }

    // 1. 外观设置保存
    const wallpaperUploadInput = document.getElementById('wallpaper-upload-input');
    if (wallpaperUploadInput) {
        wallpaperUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const dataUrl = await new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result);
                    reader.onerror = () => rej(reader.error);
                    reader.readAsDataURL(file);
                });
                newWallpaperBase64 = dataUrl; // 注意：newWallpaperBase64 需要在 main-app.js 中暴露，或者在这里定义？
                // newWallpaperBase64 是 main-app.js 的局部变量。这里无法访问。
                // 解决方案：直接存到 globalSettings 的临时变量或者在这里处理渲染预览？
                // 暂时假设 main-app.js 里的变量已经暴露或者我们在这里重新实现 renderWallpaperScreen 的一部分逻辑
                // 由于 renderWallpaperScreen 需要 newWallpaperBase64，我们必须协调。
                // 简单起见，我们在 window 上挂载 newWallpaperBase64
                window.newWallpaperBase64 = dataUrl;
                window.renderWallpaperScreenProxy(); // 调用 main-app.js 暴露的代理
            }
        });
    }

    const saveWallpaperBtn = document.getElementById('save-wallpaper-btn');
    if (saveWallpaperBtn) {
        saveWallpaperBtn.addEventListener('click', async () => {
            let changesMade = false;

            // 保存壁纸
            if (window.newWallpaperBase64) {
                state.globalSettings.wallpaper = window.newWallpaperBase64;
                changesMade = true;
            }

            // 保存锁屏壁纸 (同样假设 newLockscreenWallpaperBase64 暴露了或者同上处理)
            if (window.newLockscreenWallpaperBase64) {
                state.globalSettings.lockscreenWallpaper = window.newLockscreenWallpaperBase64;
                changesMade = true;
            }

            // 保存全局聊天背景
            if (window.newGlobalBgBase64 === 'REMOVED') {
                state.globalSettings.globalChatBackground = '';
                changesMade = true;
            } else if (window.newGlobalBgBase64) {
                state.globalSettings.globalChatBackground = window.newGlobalBgBase64;
                changesMade = true;
            }

            // 保存CSS
            state.globalSettings.activeCustomCss = document.getElementById('theme-css-editor').value;
            const activeThemeSelector = document.getElementById('theme-selector');
            state.globalSettings.activeThemeId = activeThemeSelector.value ? parseInt(activeThemeSelector.value) : null;
            changesMade = true;

            // 保存密码
            const newPassword = document.getElementById('password-set-input').value;
            state.globalSettings.password = newPassword;

            // 保存铃声和提示音
            state.globalSettings.ringtoneUrl = document.getElementById('ringtone-url-input').value.trim();
            state.globalSettings.notificationSoundUrl = document.getElementById('notification-sound-url-input').value.trim();

            // 保存锁屏和状态栏开关状态
            const isLockEnabled = document.getElementById('enable-lock-screen-toggle').checked;
            state.globalSettings.enableLockScreen = isLockEnabled;
            localStorage.setItem('lockScreenEnabled', isLockEnabled);

            // 保存主屏幕字体颜色
            const colorInputVal = document.getElementById('home-icon-widget-text-color-input').value;
            const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
            if (hexRegex.test(colorInputVal)) {
                state.globalSettings.homeIconWidgetTextColor = colorInputVal;
            } else {
                state.globalSettings.homeIconWidgetTextColor = document.getElementById('home-icon-widget-text-color-picker').value;
            }
            state.globalSettings.removeHomeFontShadow = document.getElementById('remove-home-font-shadow-toggle').checked;

            // 保存App名称
            window.saveAppLabels();

            // 写入数据库
            await db.globalSettings.put(state.globalSettings);

            // 应用更改
            if (changesMade) {
                window.applyGlobalWallpaper();
                window.applyLockscreenWallpaper();
                window.applyThemeCss(state.globalSettings.activeCustomCss);
                window.newWallpaperBase64 = null;
                window.newLockscreenWallpaperBase64 = null;
                window.newGlobalBgBase64 = null;
            }
            window.applyAppIcons();
            window.applyAppLabels();

            alert('所有外观设置已保存并应用！');
            showScreen('home-screen');
        });
    }

    // 2. API 设置保存
    const saveApiBtn = document.getElementById('save-api-settings-btn');
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', async () => {
            const proxyUrl = document.getElementById('proxy-url').value.trim();
            const apiKey = document.getElementById('api-key').value.trim();
            const isBlocked = window.BLOCKED_API_SITES.some((blockedDomain) => proxyUrl.includes(blockedDomain));

            if (isBlocked) {
                alert('错误：该 API 站点已被禁用，无法使用。');
                return;
            }

            state.apiConfig.proxyUrl = document.getElementById('proxy-url').value.trim();
            state.apiConfig.apiKey = document.getElementById('api-key').value.trim();
            state.apiConfig.model = document.getElementById('model-select').value;
            state.apiConfig.temperature = parseFloat(document.getElementById('temperature-slider').value);

            // Minimax 设置
            state.apiConfig.minimaxGroupId = document.getElementById('minimax-group-id').value.trim();
            state.apiConfig.minimaxApiKey = document.getElementById('minimax-api-key').value.trim();
            state.apiConfig.minimaxProvider = document.getElementById('minimax-provider-select').value;
            state.apiConfig.minimaxSpeechModel = document.getElementById('minimax-speech-model-select').value;

            // GitHub 备份设置
            state.apiConfig.githubToken = document.getElementById('github-token').value.trim();
            state.apiConfig.githubUsername = document.getElementById('github-username').value.trim();
            state.apiConfig.githubRepo = document.getElementById('github-repo').value.trim();
            state.apiConfig.githubPath = document.getElementById('github-path').value.trim() || 'ephone_backup.json';
            state.apiConfig.githubAutoBackup = document.getElementById('github-auto-backup-switch').checked;
            state.apiConfig.githubBackupMode = document.getElementById('github-backup-mode').value;
            state.apiConfig.githubBackupInterval = parseInt(document.getElementById('github-backup-interval').value) || 30;

            state.apiConfig.pollinationsApiKey = document.getElementById('pollinations-api-key').value.trim();

            window.handleAutoBackupTimer();
            await db.apiConfig.put(state.apiConfig);
            state.globalSettings.enableSystemNotifications = document.getElementById('system-notification-switch').checked;
            console.log('保存系统通知开关状态:', state.globalSettings.enableSystemNotifications);
            state.globalSettings.imageCompressionQuality = parseFloat(document.getElementById('image-quality-slider').value);
            state.globalSettings.enableSystemNotifications = document.getElementById('system-notification-switch').checked;
            const backgroundSwitch = document.getElementById('background-activity-switch');
            const intervalInput = document.getElementById('background-interval-input');
            const newEnableState = backgroundSwitch.checked;
            const oldEnableState = state.globalSettings.enableBackgroundActivity || false;

            if (newEnableState && !oldEnableState) {
                const userConfirmed = confirm('【高费用警告】\n\n' + '您正在启用“后台角色活动”功能。\n\n' + '这会使您的AI角色们在您不和他们聊天时，也能“独立思考”并主动给您发消息或进行社交互动，极大地增强沉浸感。\n\n' + '但请注意：\n' + '这会【在后台自动、定期地调用API】，即使您不进行任何操作。根据您的角色数量和检测间隔，这可能会导致您的API费用显著增加。\n\n' + '您确定要开启吗？');

                if (!userConfirmed) {
                    backgroundSwitch.checked = false;
                    return;
                }
            }

            state.globalSettings.enableBackgroundActivity = newEnableState;
            state.globalSettings.backgroundActivityInterval = parseInt(intervalInput.value) || 60;
            state.globalSettings.blockCooldownHours = parseFloat(document.getElementById('block-cooldown-input').value) || 1;
            await db.globalSettings.put(state.globalSettings);

            // 动态启动/停止模拟器 (需要在 main-app.js 中暴露这两个函数)
            if (typeof window.stopBackgroundSimulation === 'function') window.stopBackgroundSimulation();

            if (state.globalSettings.enableBackgroundActivity) {
                if (typeof window.startBackgroundSimulation === 'function') window.startBackgroundSimulation();
                console.log(`后台活动模拟已启动，间隔: ${state.globalSettings.backgroundActivityInterval}秒`);
            } else {
                console.log('后台活动模拟已停止。');
            }
            const novelaiSwitch = document.getElementById('novelai-switch');
            const novelaiModelInput = document.getElementById('novelai-model');
            const novelaiKeyInput = document.getElementById('novelai-api-key');

            if (novelaiSwitch) {
                localStorage.setItem('novelai-enabled', novelaiSwitch.checked);
            }
            if (novelaiModelInput) {
                localStorage.setItem('novelai-model', novelaiModelInput.value);
            }
            if (novelaiKeyInput) {
                localStorage.setItem('novelai-api-key', novelaiKeyInput.value.trim());
            }

            alert('API设置已保存!');
        });
    }

    // --- 新增：滑块数值实时显示监听器 ---
    const tempSlider = document.getElementById('temperature-slider');
    const tempValue = document.getElementById('temperature-value');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', () => {
            tempValue.textContent = tempSlider.value;
        });
    }

    const qualitySlider = document.getElementById('image-quality-slider');
    const qualityValue = document.getElementById('image-quality-value');
    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
        });
    }

    // 3. 其他 API 相关监听器
    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    if (fetchModelsBtn) {
        fetchModelsBtn.addEventListener('click', async () => {
            const url = document.getElementById('proxy-url').value.trim();
            const key = document.getElementById('api-key').value.trim();
            if (!url || !key) return alert('请先填写反代地址和密钥');
            try {
                let isGemini = url === 'https://generativelanguage.googleapis.com/v1beta/models'; // 硬编码检查，或者从 main-app.js 获取 GEMINI_API_URL
                // 这里为了简单，如果 GEMINI_API_URL 没暴露，就直接写死

                const response = await fetch(isGemini ? `${url}?key=${key}` : `${url}/v1/models`, isGemini ? undefined : { headers: { Authorization: `Bearer ${key}` } });
                if (!response.ok) throw new Error('无法获取模型列表');
                const data = await response.json();
                let models = isGemini ? data.models : data.data;
                if (isGemini) {
                    models = models.map((model) => {
                        const parts = model.name.split('/');
                        return {
                            id: parts.length > 1 ? parts[1] : model.name,
                        };
                    });
                }
                const picker = document.getElementById('fetched-model-list');
                picker.innerHTML = '<option value="">▼ 请选择模型 (点击自动填入上方)</option>';

                models.forEach((model) => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    picker.appendChild(option);
                });

                picker.style.display = 'block';

                alert(`成功拉取 ${models.length} 个模型！\n请点击下方的下拉框选择，选择后会自动填入输入框。`);
            } catch (error) {
                alert(`拉取模型失败: ${error.message}`);
            }
        });
    }

    const fetchMinimaxBtn = document.getElementById('fetch-minimax-speech-models-btn');
    if (fetchMinimaxBtn) {
        fetchMinimaxBtn.addEventListener('click', window.fetchMinimaxSpeechModels);
    }

    // NovelAI 相关
    const naiSwitch = document.getElementById('novelai-switch');
    if (naiSwitch) {
        naiSwitch.addEventListener('change', (e) => {
            const detailsDiv = document.getElementById('novelai-details');
            detailsDiv.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    const naiKeyToggle = document.getElementById('novelai-key-toggle');
    if (naiKeyToggle) {
        naiKeyToggle.addEventListener('click', function () {
            const input = document.getElementById('novelai-api-key');
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '😌';
            } else {
                input.type = 'password';
                this.textContent = '🧐';
            }
        });
    }

    const naiSettingsBtn = document.getElementById('novelai-settings-btn');
    if (naiSettingsBtn) {
        naiSettingsBtn.addEventListener('click', () => {
            window.loadNovelAISettings();
            document.getElementById('novelai-settings-modal').style.display = 'flex';
        });
    }

    const naiCorsProxy = document.getElementById('nai-cors-proxy');
    if (naiCorsProxy) {
        naiCorsProxy.addEventListener('change', (e) => {
            const customProxyGroup = document.getElementById('nai-custom-proxy-group');
            if (e.target.value === 'custom') {
                customProxyGroup.style.display = 'block';
            } else {
                customProxyGroup.style.display = 'none';
            }
        });
    }

    const closeNaiSettings = document.getElementById('close-novelai-settings');
    if (closeNaiSettings) {
        closeNaiSettings.addEventListener('click', () => {
            document.getElementById('novelai-settings-modal').style.display = 'none';
        });
    }

    const saveNaiSettingsBtn = document.getElementById('save-nai-settings-btn');
    if (saveNaiSettingsBtn) {
        saveNaiSettingsBtn.addEventListener('click', () => {
            window.saveNovelAISettings();
            document.getElementById('novelai-settings-modal').style.display = 'none';
            alert('NovelAI设置已保存！');
        });
    }

    const resetNaiSettingsBtn = document.getElementById('reset-nai-settings-btn');
    if (resetNaiSettingsBtn) {
        resetNaiSettingsBtn.addEventListener('click', () => {
            if (confirm('确定要恢复默认设置吗？')) {
                window.resetNovelAISettings();
            }
        });
    }

    const naiTestBtn = document.getElementById('novelai-test-btn');
    if (naiTestBtn) {
        naiTestBtn.addEventListener('click', () => {
            const apiKey = document.getElementById('novelai-api-key').value.trim();
            if (!apiKey) {
                alert('请先填写NovelAI API Key！');
                return;
            }
            document.getElementById('novelai-test-modal').style.display = 'flex';
            document.getElementById('nai-test-result').style.display = 'none';
            document.getElementById('nai-test-error').style.display = 'none';
        });
    }

    // 关闭NovelAI测试弹窗
    const closeNaiTest = document.getElementById('close-novelai-test');
    if (closeNaiTest) {
        closeNaiTest.addEventListener('click', () => {
            document.getElementById('novelai-test-modal').style.display = 'none';
        });
    }

    const closeNaiTestBtn = document.getElementById('close-nai-test-btn');
    if (closeNaiTestBtn) {
        closeNaiTestBtn.addEventListener('click', () => {
            document.getElementById('novelai-test-modal').style.display = 'none';
        });
    }

    // NovelAI生成图像按钮
    // 这里的 generateNovelAIImage 需要在 main-app.js 暴露，或者把那个复杂的函数也移过来
    // 建议：把 generateNovelAIImage 移到 helper 函数区
    // (假设已从 main-app.js 移动了该函数)
    const naiGenerateBtn = document.getElementById('nai-generate-btn');
    if (naiGenerateBtn) {
        naiGenerateBtn.addEventListener('click', async () => {
            if (typeof window.generateNovelAIImage === 'function') {
                await window.generateNovelAIImage(); // 假设我们没有移过来，而是暴露了
                // 如果决定移过来，那么这里直接调
            }
        });
    }

    // NovelAI下载图像按钮
    const naiDownloadBtn = document.getElementById('nai-download-btn');
    if (naiDownloadBtn) {
        naiDownloadBtn.addEventListener('click', () => {
            const img = document.getElementById('nai-result-image');
            const link = document.createElement('a');
            link.href = img.src;
            link.download = 'novelai-generated-' + Date.now() + '.png';
            link.click();
        });
    }

    // 4. 重置App名称
    const resetAppNamesBtn = document.getElementById('reset-app-names-btn');
    if (resetAppNamesBtn) {
        resetAppNamesBtn.addEventListener('click', window.resetAppNamesToDefault);
    }

    // 角色专属NAI提示词弹窗事件监听器
    const charNaiPromptsBtn = document.getElementById('character-nai-prompts-btn');
    if (charNaiPromptsBtn) {
        // 打开角色专属NAI提示词配置弹窗
        charNaiPromptsBtn.addEventListener('click', () => {
            if (!state.activeChatId) return;
            const chat = state.chats[state.activeChatId];

            // 加载当前角色的NAI提示词配置
            const naiSettings = chat.settings.naiSettings || {
                promptSource: 'system',
                characterPositivePrompt: '',
                characterNegativePrompt: '',
            };

            // 严格加载角色配置，不与系统配置混淆
            // 填了就有，没填就为空，绝不使用系统配置填充
            document.getElementById('character-nai-positive').value = naiSettings.characterPositivePrompt || '';
            document.getElementById('character-nai-negative').value = naiSettings.characterNegativePrompt || '';

            document.getElementById('character-nai-prompts-modal').style.display = 'flex';
        });
    }

    // 关闭角色专属NAI提示词弹窗
    const closeCharNaiPrompts = document.getElementById('close-character-nai-prompts');
    if (closeCharNaiPrompts) {
        closeCharNaiPrompts.addEventListener('click', () => {
            document.getElementById('character-nai-prompts-modal').style.display = 'none';
        });
    }

    // 保存角色专属NAI提示词
    const saveCharNaiPromptsBtn = document.getElementById('save-character-nai-prompts-btn');
    if (saveCharNaiPromptsBtn) {
        saveCharNaiPromptsBtn.addEventListener('click', async () => {
            if (!state.activeChatId) return;
            const chat = state.chats[state.activeChatId];

            if (!chat.settings.naiSettings) {
                chat.settings.naiSettings = {
                    promptSource: 'system',
                };
            }

            chat.settings.naiSettings.characterPositivePrompt = document.getElementById('character-nai-positive').value.trim();
            chat.settings.naiSettings.characterNegativePrompt = document.getElementById('character-nai-negative').value.trim();

            console.log('💾 [专属弹窗] 保存角色NAI提示词');
            console.log('   characterPositivePrompt:', chat.settings.naiSettings.characterPositivePrompt);
            console.log('   characterNegativePrompt:', chat.settings.naiSettings.characterNegativePrompt);
            console.log('   promptSource:', chat.settings.naiSettings.promptSource);

            // 保存到数据库
            await db.chats.put(chat);

            document.getElementById('character-nai-prompts-modal').style.display = 'none';
            alert('角色专属NAI提示词已保存！');
        });
    }

    // 清空角色专属NAI提示词配置
    const resetCharNaiPromptsBtn = document.getElementById('reset-character-nai-prompts-btn');
    if (resetCharNaiPromptsBtn) {
        resetCharNaiPromptsBtn.addEventListener('click', () => {
            if (confirm('确定要清空当前角色的NAI提示词配置吗？')) {
                document.getElementById('character-nai-positive').value = '';
                document.getElementById('character-nai-negative').value = '';
            }
        });
    }

    // 群聊角色专属NAI提示词弹窗事件监听器
    const groupCharNaiPromptsBtn = document.getElementById('group-character-nai-prompts-btn');
    if (groupCharNaiPromptsBtn) {
        groupCharNaiPromptsBtn.addEventListener('click', () => {
            if (!state.activeChatId) return;
            const chat = state.chats[state.activeChatId];

            // 加载当前角色的NAI提示词配置
            const naiSettings = chat.settings.naiSettings || {
                promptSource: 'system',
                characterPositivePrompt: '',
                characterNegativePrompt: '',
            };

            // 严格加载角色配置，不与系统配置混淆
            // 填了就有，没填就为空，绝不使用系统配置填充
            document.getElementById('character-nai-positive').value = naiSettings.characterPositivePrompt || '';
            document.getElementById('character-nai-negative').value = naiSettings.characterNegativePrompt || '';

            document.getElementById('character-nai-prompts-modal').style.display = 'flex';
        });
    }

    // 5. 数据备份与恢复监听器
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.addEventListener('click', window.exportBackup);

    const importInput = document.getElementById('import-data-input');
    if (importInput) importInput.addEventListener('change', (e) => window.importBackup(e.target.files[0]));

    const repairBtn = document.getElementById('repair-data-btn');
    if (repairBtn) repairBtn.addEventListener('click', window.repairAllData);

    const githubBtn = document.getElementById('manual-github-backup-btn');
    if (githubBtn) githubBtn.addEventListener('click', () => window.uploadBackupToGitHub(false));

    const gitStreamUploadBtn = document.getElementById('git-stream-upload-btn');
    if (gitStreamUploadBtn) gitStreamUploadBtn.addEventListener('click', () => window.uploadBackupToGitHubStream(false));

    const githubRestoreBtn = document.getElementById('manual-github-restore-btn');
    if (githubRestoreBtn) githubRestoreBtn.addEventListener('click', window.restoreBackupFromGitHub);

    const gitStreamRestoreBtn = document.getElementById('git-stream-restore-btn');
    if (gitStreamRestoreBtn) gitStreamRestoreBtn.addEventListener('click', window.restoreBackupFromGitHubStream);
}

// ===================================================================
// 5. NovelAI 生成逻辑
// ===================================================================

window.generateNovelAIImage = async function () {
    const apiKey = document.getElementById('novelai-api-key').value.trim();
    const model = document.getElementById('novelai-model').value;
    const prompt = document.getElementById('nai-test-prompt').value.trim();

    if (!apiKey) {
        alert('请先配置NovelAI API Key！');
        return;
    }

    if (!prompt) {
        alert('请输入提示词！');
        return;
    }

    const settings = window.getNovelAISettings();
    const negativePrompt = document.getElementById('nai-test-negative').value.trim();

    const statusDiv = document.getElementById('nai-test-status');
    const resultDiv = document.getElementById('nai-test-result');
    const errorDiv = document.getElementById('nai-test-error');
    const generateBtn = document.getElementById('nai-generate-btn');

    statusDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    generateBtn.disabled = true;
    generateBtn.textContent = '生成中...';

    try {
        const [width, height] = settings.resolution.split('x').map(Number);

        // V4/V4.5 和 V3 使用不同的请求体格式
        let requestBody;

        if (model.includes('nai-diffusion-4')) {
            // V4/V4.5 使用新格式 (params_version: 3)
            requestBody = {
                input: prompt,
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
                            base_caption: prompt,
                            char_captions: [],
                        },
                        use_coords: false,
                        use_order: true,
                    },
                    // V4专用负面提示词格式
                    v4_negative_prompt: {
                        caption: {
                            base_caption: negativePrompt,
                            char_captions: [],
                        },
                        legacy_uc: false,
                    },
                    negative_prompt: negativePrompt,
                    deliberate_euler_ancestral_bug: false,
                    prefer_brownian: true,
                    // 注意：不包含 stream 参数，使用标准ZIP响应而非msgpack流
                },
            };
        } else {
            // V3 及更早版本使用旧格式
            requestBody = {
                input: prompt,
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
                    negative_prompt: negativePrompt,
                },
            };
        }

        console.log('📤 发送请求到 NovelAI API');
        console.log('📊 使用模型:', model);
        console.log('📋 请求体:', JSON.stringify(requestBody, null, 2));

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

        // Chrome浏览器专用处理：避免headers中包含非ISO-8859-1字符
        const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
        let fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + apiKey,
            },
            body: JSON.stringify(requestBody),
        };

        // 针对Chrome浏览器：确保所有header值都是纯ASCII
        if (isChrome) {
            console.log('🔧 检测到Chrome浏览器，启用headers兼容性处理');
            const cleanHeaders = {};
            for (const [key, value] of Object.entries(fetchOptions.headers)) {
                // 确保header值只包含ASCII字符（ISO-8859-1兼容）
                cleanHeaders[key] = value.replace(/[^\x00-\xFF]/g, '');
            }
            fetchOptions.headers = cleanHeaders;
        }

        const response = await fetch(apiUrl, fetchOptions);

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
        if (contentType && contentType.includes('text/event-stream')) {
            console.log('检测到 SSE 流式响应，开始解析...');
            statusDiv.textContent = '正在接收流式数据...';

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

                // 直接显示图片
                const imageUrl = URL.createObjectURL(imageBlob);
                document.getElementById('nai-result-image').src = imageUrl;
                statusDiv.style.display = 'none';
                resultDiv.style.display = 'block';
                console.log('✅ 图片显示成功！🎨');
                return;
            }

            // 否则当作 ZIP 处理
            console.log('当作 ZIP 文件处理...');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            zipBlob = new Blob([bytes]);
            console.log('ZIP Blob 大小:', zipBlob.size);
        } else {
            // 非流式响应，直接读取
            zipBlob = await response.blob();
            console.log('收到数据，类型:', zipBlob.type, '大小:', zipBlob.size);
        }

        // NovelAI始终返回ZIP格式，需要解压
        try {
            // 检查JSZip是否已加载
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip库未加载，请刷新页面重试');
            }

            statusDiv.textContent = '正在解压图片...';

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

            // 创建图片URL并显示
            const imageUrl = URL.createObjectURL(imageBlob);
            console.log('生成的图片URL:', imageUrl);

            document.getElementById('nai-result-image').src = imageUrl;
            statusDiv.style.display = 'none';
            resultDiv.style.display = 'block';
        } catch (zipError) {
            console.error('ZIP解压失败:', zipError);
            // 如果解压失败，尝试直接作为图片显示
            console.log('尝试直接作为图片显示...');

            if (zipBlob.type.startsWith('image/')) {
                const imageUrl = URL.createObjectURL(zipBlob);
                document.getElementById('nai-result-image').src = imageUrl;
                statusDiv.style.display = 'none';
                resultDiv.style.display = 'block';
            } else {
                throw new Error('图片格式处理失败: ' + zipError.message);
            }
        }
    } catch (error) {
        console.error('NovelAI生成失败:', error);
        statusDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = '生成失败: ' + error.message;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '生成图像';
    }
}

// ===================================================================
// 5. 字体设置相关函数 (从 main-app.js 迁移)
// ===================================================================

/**
 * 【全新】在应用启动时，预加载所有已保存的字体预设
 */
window.loadAllFontPresetsOnStartup = async function loadAllFontPresetsOnStartup() {
    console.log('正在预加载所有字体预设...');
    const presets = await db.fontPresets.toArray();
    if (presets && presets.length > 0) {
        presets.forEach((preset) => {
            // 我们复用已有的 loadFontForPreview 函数来加载每个字体
            loadFontForPreview(preset);
        });
        console.log(`成功预加载了 ${presets.length} 个字体。`);
    }
}

/**
 * 渲染字体预设的10个卡槽
 */
window.renderFontPresets = async function renderFontPresets() {
    const container = document.getElementById('font-preset-container');
    if (!container) return;
    container.innerHTML = ''; // 清空旧内容

    // 1. 从数据库读取所有已保存的预设，并确保它是一个数组
    const presets = (await db.fontPresets.toArray()) || [];

    // 我们不再依赖 presets 的长度来循环，而是无条件地循环10次，创建10个卡槽。
    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'font-preset-slot';

        // 3. 在循环内部，再判断当前索引 i 是否在已保存的 presets 数组中有对应的数据。
        const preset = presets[i];

        if (preset) {
            // 如果这个卡槽有数据，就渲染成“已填充”的样式
            slot.innerHTML = `
                        <div class="font-preview-text" data-preset-id="${preset.id}">Abc 你好</div>
                        <div class="font-preset-info">名称: ${preset.name}</div>
                        <div class="font-preset-actions">
                            <button class="preset-btn apply-btn" data-preset-id="${preset.id}">应用</button>
                            <button class="preset-btn delete-btn delete" data-preset-id="${preset.id}">删除</button>
                        </div>
                    `;
        } else {
            // 如果这个卡槽在数据库中没有对应的数据，就渲染成“空卡槽”的样式
            slot.classList.add('empty');
            slot.innerHTML = `
                        <div class="font-preset-info">卡槽 ${i + 1} 为空</div>
                        <div class="font-preset-actions">
                            <button class="preset-btn secondary upload-url-btn" data-slot-index="${i}">URL上传</button>
                            <button class="preset-btn secondary upload-local-btn" data-slot-index="${i}">本地上传</button>
                        </div>
                    `;
        }
        // 4. 将创建好的卡槽（无论空的还是满的）添加到容器中
        container.appendChild(slot);
    }

    // 5. 预览字体和绑定事件的逻辑保持不变
    presets.forEach((preset) => {
        if (preset) {
            loadFontForPreview(preset);
        }
    });

    addFontPresetButtonListeners();
}

/**
 * 为单个预设加载字体以供预览
 * @param {object} preset - 字体预设对象 {id, name, url}
 */
function loadFontForPreview(preset) {
    const styleId = `font-style-${preset.id}`;
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;

    // 直接创建一条高优先级的CSS规则来应用字体
    style.innerHTML = `
                @font-face {
                    font-family: 'preset-${preset.id}';
                    src: url('${preset.url}');
                    font-display: swap;
                }

                .font-preview-text[data-preset-id="${preset.id}"] {
                    font-family: 'preset-${preset.id}', sans-serif !important;
                }
            `;

    document.head.appendChild(style);
}

/**
 * 为预设卡槽中的所有按钮统一添加事件监听器
 */
function addFontPresetButtonListeners() {
    document.querySelectorAll('.upload-url-btn').forEach((btn) => {
        btn.onclick = () => handleUploadFontUrl(parseInt(btn.dataset.slotIndex));
    });
    document.querySelectorAll('.upload-local-btn').forEach((btn) => {
        btn.onclick = () => handleUploadFontLocal(parseInt(btn.dataset.slotIndex));
    });
    document.querySelectorAll('.apply-btn').forEach((btn) => {
        btn.onclick = () => applyFontPreset(btn.dataset.presetId);
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.onclick = () => deleteFontPreset(btn.dataset.presetId);
    });
}

/**
 * 处理通过URL上传字体
 * @param {number} slotIndex - 卡槽的索引 (0-4)
 */
async function handleUploadFontUrl(slotIndex) {
    const url = await window.showCustomPrompt('字体URL', '请输入字体的网络链接(.ttf, .otf等)');
    if (!url || !url.trim().startsWith('http')) {
        if (url !== null) alert('请输入一个有效的URL！');
        return;
    }
    const name = await window.showCustomPrompt('字体命名', '请为这个字体起个名字');
    if (!name || !name.trim()) {
        if (name !== null) alert('名字不能为空！');
        return;
    }
    await saveFontPreset(slotIndex, name.trim(), url.trim());
}

/**
 * 处理通过本地文件上传字体
 * @param {number} slotIndex - 卡槽的索引 (0-4)
 */
function handleUploadFontLocal(slotIndex) {
    const input = document.getElementById('font-preset-local-upload');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const name = await window.showCustomPrompt('字体命名', '请为这个字体起个名字', file.name.replace(/\.[^/.]+$/, ''));
        if (!name || !name.trim()) {
            if (name !== null) alert('名字不能为空！');
            return;
        }

        // 使用FileReader将字体文件转为Base64 Data URL
        const reader = new FileReader();
        reader.onload = async (event) => {
            await saveFontPreset(slotIndex, name.trim(), event.target.result);
        };

        reader.readAsDataURL(file);
    };
    input.click(); // 触发文件选择框
}
async function saveFontPreset(slotIndex, name, url) {
    try {
        const presets = await db.fontPresets.toArray();
        const newPreset = { id: 'font_' + Date.now(), name, url };
        presets.splice(slotIndex, 0, newPreset);

        // 将 slice(0, 5) 修改为 slice(0, 10)
        const presetsToSave = presets.slice(0, 10);

        await db.transaction('rw', db.fontPresets, async () => {
            await db.fontPresets.clear();
            await db.fontPresets.bulkPut(presetsToSave);
        });

        await window.renderFontPresets();
        alert(`字体 "${name}" 已成功保存到卡槽 ${slotIndex + 1}！`);
    } catch (error) {
        console.error('保存字体预设失败:', error);
        alert(`保存字体失败，数据已自动回滚，你之前的字体数据是安全的。错误: ${error.message}`);
        await window.renderFontPresets();
    }
}

/**
 * 删除一个字体预设
 * @param {string} presetId - 要删除的预设的ID
 */
async function deleteFontPreset(presetId) {
    const preset = await db.fontPresets.get(presetId);
    if (!preset) return;
    const confirmed = await window.showCustomConfirm('确认删除', `确定要删除字体 "${preset.name}" 吗？`, {
        confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
        await db.fontPresets.delete(presetId);

        // 从DOM中移除对应的预览样式
        const styleTag = document.getElementById(`font-style-${presetId}`);
        if (styleTag) styleTag.remove();

        await window.renderFontPresets();
    }
}

/**
 * 应用一个字体预设为全局字体
 * @param {string} presetId - 要应用的预设的ID
 */
async function applyFontPreset(presetId) {
    const preset = await db.fontPresets.get(presetId);
    if (preset) {
        // 调用你已有的全局字体应用函数
        window.applyCustomFont(preset.url, false);
        // 保存到全局设置
        state.globalSettings.fontUrl = preset.url;
        await db.globalSettings.put(state.globalSettings);
        alert(`已将全局字体更换为 "${preset.name}"！`);
    }
}

/**
 * 应用自定义字体 (从 main-app.js 迁移并暴露)
 * @param {string} fontUrl - 字体URL
 * @param {boolean} isPreviewOnly - 是否仅预览
 */
window.applyCustomFont = function applyCustomFont(fontUrl, isPreviewOnly = false) {
    const dynamicFontStyle = document.getElementById('dynamic-font-style');
    if (!dynamicFontStyle) return;

    if (!fontUrl) {
        // 如果没有提供字体链接（比如恢复默认），就清空样式
        dynamicFontStyle.innerHTML = '';
        const previewEl = document.getElementById('font-preview');
        if (previewEl) previewEl.style.fontFamily = '';
        return;
    }

    // 这是一个统一的内部名字
    const fontName = 'custom-user-font';

    // 这是定义字体的样式规则
    const newStyle = `
                @font-face {
                  font-family: '${fontName}';
                  src: url('${fontUrl}');
                  font-display: swap;
                }`;

    if (isPreviewOnly) {
        // 如果只是预览，这个逻辑保持不变
        const previewStyle = document.getElementById('preview-font-style') || document.createElement('style');
        previewStyle.id = 'preview-font-style';
        previewStyle.innerHTML = newStyle;
        if (!document.getElementById('preview-font-style')) document.head.appendChild(previewStyle);

        const previewEl = document.getElementById('font-preview');
        if (previewEl) previewEl.style.fontFamily = `'${fontName}', 'bulangni', sans-serif`;
    } else {
        // 如果是全局应用，就同时定义字体并告诉整个 body 去使用它
        dynamicFontStyle.innerHTML = `
                    ${newStyle}
                    body {
                      font-family: '${fontName}', 'bulangni', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                    }`;
    }
}

/**
 * 恢复默认字体
 */
window.resetToDefaultFont = async function () {
    // 1. 清除全局字体样式
    dynamicFontStyle.innerHTML = '';

    // 2. 更新并保存预设
    state.globalSettings.fontUrl = '';
    await db.globalSettings.put(state.globalSettings);

    // 3. 明确地将全局预览区的字体也恢复为默认
    const globalPreview = document.getElementById('font-preview');
    if (globalPreview) {
        globalPreview.style.fontFamily = ''; // 移除内联样式
    }

    // 4. 应用一下空的字体设置，确保所有地方都恢复
    if (window.applyCustomFont) {
        window.applyCustomFont('', true);
    }

    alert('已恢复默认字体');
}
// ===================================================================
// 外观主题设置逻辑
// ===================================================================

window.activeThemeId = null;

/**
 * 从数据库加载所有主题到下拉选择框
 */
window.loadThemesToDropdown = async function () {
    const selector = document.getElementById('theme-selector');
    if (!selector) return; // Safety check
    selector.innerHTML = '<option value="">-- 选择方案或新建 --</option>'; // 默认选项

    const themes = await db.themes.toArray();
    themes.forEach((theme) => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.name;
        selector.appendChild(option);
    });
}

/**
 * 处理用户从下拉框选择一个主题的逻辑
 */
window.handleThemeSelection = async function () {
    const selector = document.getElementById('theme-selector');
    const editor = document.getElementById('theme-css-editor');
    activeThemeId = selector.value ? parseInt(selector.value) : null;

    if (activeThemeId) {
        const theme = await db.themes.get(activeThemeId);
        editor.value = theme.css;
    } else {
        // 如果选择“-”，就加载模板
        editor.value = window.THEME_CSS_TEMPLATE;
    }
    // 立即应用选中的或模板代码，让用户看到效果
    window.applyThemeCss(editor.value);
}

/**
 * 保存当前编辑区的内容到当前选中的主题
 */
window.saveCurrentTheme = async function () {
    if (!activeThemeId) {
        alert('请先选择一个方案，或使用“另存为”来创建新方案');
        return;
    }
    const cssCode = document.getElementById('theme-css-editor').value;
    await db.themes.update(activeThemeId, { css: cssCode });
    alert('当前方案已保存！');
}

/**
 * 将当前编辑区的内容另存为一个新主题
 */
window.saveAsNewTheme = async function () {
    const themeName = await showCustomPrompt('保存新方案', '请输入新方案的名称');
    if (!themeName || !themeName.trim()) {
        if (themeName !== null) alert('方案名称不能为空');
        return;
    }
    const cssCode = document.getElementById('theme-css-editor').value;
    const newTheme = { name: themeName.trim(), css: cssCode };
    const newId = await db.themes.add(newTheme);

    // 刷新下拉框并自动选中新保存的方案
    await window.loadThemesToDropdown();
    document.getElementById('theme-selector').value = newId;
    activeThemeId = newId;

    alert(`方案 "${themeName}" 已成功保存！`);
}

/**
                 * 打开清除角色CSS的管理菜单
                 */
async function openCharCssManager() {
    const choice = await showChoiceModal('清理角色气泡样式', [
        { text: '🧹 一键清除所有角色的CSS', value: 'clear_all' },
        { text: '🔍 选择特定角色清除', value: 'select_char' },
    ]);

    if (!choice) return;

    if (choice === 'clear_all') {
        await clearAllCharsCustomCss();
    } else if (choice === 'select_char') {
        await openCharCssSelector();
    }
}

/**
 * 清除所有单聊角色的自定义CSS
 */
async function clearAllCharsCustomCss() {
    // 检查是否有任何角色设置了CSS
    let hasAny = false;
    for (const chatId in state.chats) {
        const chat = state.chats[chatId];
        if (!chat.isGroup && chat.settings && chat.settings.customCss) {
            hasAny = true;
            break;
        }
    }

    if (!hasAny) {
        alert('当前没有任何角色设置了自定义CSS，无需清理。');
        return;
    }

    const confirmed = await showCustomConfirm('确认全清', '确定要清除【所有】角色的自定义气泡样式(CSS)吗？\n此操作将使所有角色恢复默认或全局样式，且不可恢复。', { confirmButtonClass: 'btn-danger' });

    if (!confirmed) return;

    let count = 0;
    for (const chatId in state.chats) {
        const chat = state.chats[chatId];
        if (!chat.isGroup && chat.settings && chat.settings.customCss) {
            chat.settings.customCss = ''; // 清空
            count++;
            await db.chats.put(chat);
        }
    }

    // 如果当前正在聊天的角色被清除了，刷新一下界面
    if (state.activeChatId && !state.chats[state.activeChatId].isGroup) {
        renderChatInterface(state.activeChatId);
    }

    alert(`已清除 ${count} 个角色的自定义样式。`);
}

/**
 * 打开选择器，勾选要清除的角色
 */
async function openCharCssSelector() {
    // 1. 筛选出所有设置了customCss的角色
    const chatsWithCss = Object.values(state.chats).filter((c) => !c.isGroup && c.settings && c.settings.customCss);

    if (chatsWithCss.length === 0) {
        alert('当前没有任何角色设置了自定义CSS。');
        return;
    }

    // 2. 复用现有的自定义模态框来显示列表
    const modal = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('custom-modal-title');
    const modalBody = document.getElementById('custom-modal-body');
    const confirmBtn = document.getElementById('custom-modal-confirm');
    const cancelBtn = document.getElementById('custom-modal-cancel');

    modalTitle.textContent = '选择要清除样式的角色';
    modalBody.innerHTML = '<div id="css-char-list" style="max-height: 300px; overflow-y: auto; text-align: left;"></div>';

    const listEl = document.getElementById('css-char-list');

    // 3. 生成列表
    chatsWithCss.forEach((chat) => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; padding:10px; border-bottom:1px solid #eee; cursor:pointer;';
        item.innerHTML = `
            <input type="checkbox" class="css-clear-checkbox" value="${chat.id}" style="margin-right:10px; transform: scale(1.2);">
            <img src="${chat.settings.aiAvatar || defaultAvatar}" style="width:30px; height:30px; border-radius:50%; margin-right:10px; object-fit: cover;">
            <div style="flex:1;">
                <div style="font-weight:bold;">${chat.name}</div>
                <div style="font-size:10px; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 150px;">
                    ${chat.settings.customCss.substring(0, 30).replace(/\n/g, '')}...
                </div>
            </div>
        `;
        // 点击行即可勾选
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const cb = item.querySelector('input');
                cb.checked = !cb.checked;
            }
        });
        listEl.appendChild(item);
    });

    // 4. 设置按钮样式和事件
    confirmBtn.textContent = '清除选中';
    confirmBtn.classList.add('btn-danger');
    cancelBtn.style.display = 'block';

    // 克隆按钮以移除旧的监听器
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.css-clear-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('请至少选择一个角色。');
            return;
        }

        const ids = Array.from(selectedCheckboxes).map((cb) => cb.value);
        for (const id of ids) {
            const chat = state.chats[id];
            if (chat) {
                chat.settings.customCss = ''; // 清空
                await db.chats.put(chat);
            }
        }

        modal.classList.remove('visible');
        confirmBtn.classList.remove('btn-danger'); // 恢复样式

        // 如果当前聊天的角色被清除了，刷新界面
        if (state.activeChatId && ids.includes(state.activeChatId)) {
            renderChatInterface(state.activeChatId);
        }

        alert(`已清除 ${ids.length} 个角色的样式。`);
    });

    // 显示模态框
    modal.classList.add('visible');
}

/**
 * 重命名当前选中的主题
 */
window.renameSelectedTheme = async function () {
    if (!activeThemeId) {
        alert('请先选择一个要重命名的方案');
        return;
    }
    const currentTheme = await db.themes.get(activeThemeId);
    const newName = await showCustomPrompt('重命名方案', '请输入新的名称', currentTheme.name);
    if (newName && newName.trim()) {
        await db.themes.update(activeThemeId, { name: newName.trim() });
        await window.loadThemesToDropdown();
        document.getElementById('theme-selector').value = activeThemeId;
        alert('重命名成功！');
    }
}

/**
 * 删除当前选中的主题
 */
window.deleteSelectedTheme = async function () {
    if (!activeThemeId) {
        alert('请先选择一个要删除的方案');
        return;
    }
    const confirmed = await showCustomConfirm('确认删除', `确定要删除方案 "${document.getElementById('theme-selector').selectedOptions[0].textContent}" 吗？`, { confirmButtonClass: 'btn-danger' });
    if (confirmed) {
        await db.themes.delete(activeThemeId);
        activeThemeId = null;
        await window.loadThemesToDropdown();
        // 恢复到模板样式
        document.getElementById('theme-css-editor').value = window.THEME_CSS_TEMPLATE;
        window.applyThemeCss(window.THEME_CSS_TEMPLATE);
        alert('方案已删除');
    }
}
// ===================================================================
// 主屏幕预设管理 (HomeScreen Presets)
// ===================================================================

window.activeHomePresetId = null;

window.toggleHomePresetButtons = function (isEnabled) {
    const applyBtn = document.getElementById('apply-home-preset-btn');
    if (applyBtn) applyBtn.disabled = !isEnabled;
    const updateBtn = document.getElementById('update-home-preset-btn');
    if (updateBtn) updateBtn.disabled = !isEnabled;
    const renameBtn = document.getElementById('rename-home-preset-btn');
    if (renameBtn) renameBtn.disabled = !isEnabled;
    const deleteBtn = document.getElementById('delete-home-preset-btn');
    if (deleteBtn) deleteBtn.disabled = !isEnabled;
    const exportBtn = document.getElementById('export-home-preset-btn');
    if (exportBtn) exportBtn.disabled = !isEnabled;
}

/**
 * 加载预设到下拉框
 */
window.loadHomeScreenPresetsToDropdown = async function () {
    const selector = document.getElementById('home-preset-selector');
    if (!selector) return;
    selector.innerHTML = '<option value="">-- 请选择一个预设 --</option>';
    const presets = await db.homeScreenPresets.toArray();
    presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        selector.appendChild(option);
    });
    window.activeHomePresetId = null; // 重置选择
    window.toggleHomePresetButtons(false); // 默认禁用按钮
}

/**
 * 当用户从下拉框选择一个预设时
 */
window.handleHomePresetSelection = function () {
    const selector = document.getElementById('home-preset-selector');
    window.activeHomePresetId = selector.value ? parseInt(selector.value) : null;
    // 只有当用户确实选择了一个预设时，才启用相关按钮
    window.toggleHomePresetButtons(!!window.activeHomePresetId);
}

window.applySelectedHomeScreenPreset = async function () {
    if (!window.activeHomePresetId) {
        alert('请先从下拉框中选择一个要应用的预设');
        return;
    }
    const preset = await db.homeScreenPresets.get(window.activeHomePresetId);
    if (preset && preset.data) {
        // 将预设数据加载到全局状态
        state.globalSettings.widgetData = preset.data;

        if (preset.data.wallpaper) {
            state.globalSettings.wallpaper = preset.data.wallpaper;
        }
        if (preset.data.appIcons) {
            state.globalSettings.appIcons = { ...preset.data.appIcons };
        }

        // 检查预设中是否有appLabels数据，如果有，就加载
        if (preset.data.appLabels) {
            state.globalSettings.appLabels = { ...preset.data.appLabels };
        } else {
            // 如果这个旧的预设里没有保存App名字，就清空当前的自定义名字，以恢复默认
            state.globalSettings.appLabels = {};
        }

        // 保存所有更新到数据库
        await db.globalSettings.put(state.globalSettings);

        // 依次应用所有设置
        if (window.applyGlobalWallpaper) window.applyGlobalWallpaper();
        if (window.applyAppIcons) window.applyAppIcons();
        if (window.applyAppLabels) window.applyAppLabels();

        // applyWidgetData is likely global in main-app.js or moved to window
        if (typeof window.applyWidgetData === 'function') {
            window.applyWidgetData();
        } else if (typeof applyWidgetData === 'function') {
            applyWidgetData();
        }

        alert(`已成功应用预设 "${preset.name}"！`);
        if (typeof showScreen === 'function') showScreen('home-screen');
    }
}

/**
 * 渲染主屏幕个人资料卡的头像框 (Optional helper moved?)
 * It was in the block.
 */
window.renderHomeScreenProfileFrame = function () {
    // 1. 获取保存的头像框URL
    const frameUrl = state.globalSettings.homeAvatarFrame || '';
    // 2. 找到头像框的img元素
    const frameImg = document.getElementById('profile-avatar-frame');
    if (frameImg) {
        // 3. 如果URL存在，就显示头像框
        if (frameUrl) {
            frameImg.src = frameUrl;
            frameImg.style.display = 'block';
        } else {
            // 4. 如果URL为空（即选择了“无”），就隐藏头像框
            frameImg.src = '';
            frameImg.style.display = 'none';
        }
    }
}

/**
 * 保存当前的主屏幕设置为一个新的预设
 */
window.saveCurrentHomeScreenAsPreset = async function () {
    if (window.saveAppLabels) window.saveAppLabels();

    // showCustomPrompt is likely global
    let promptFunc = window.showCustomPrompt || showCustomPrompt;

    const presetName = await promptFunc('保存预设', '请为这个主屏幕美化方案起个名字：');
    if (!presetName || !presetName.trim()) {
        if (presetName !== null) alert('名字不能为空');
        return;
    }

    // 核心：构建一个包含所有主屏幕元素的完整数据对象
    const presetData = {
        // --- 个人资料卡片 ---
        'profile-banner-img': document.getElementById('profile-banner-img').src,
        'profile-avatar-img': document.getElementById('profile-avatar-img').src,
        homeAvatarFrame: document.getElementById('profile-avatar-frame').src, // 保存头像框
        'profile-username': document.getElementById('profile-username').textContent,
        'profile-sub-username': document.getElementById('profile-sub-username').textContent,
        'profile-bio': document.getElementById('profile-bio').textContent,
        'profile-location': document.getElementById('profile-location').innerHTML,

        // --- 第一页小组件 ---
        'widget-bubble-1': document.getElementById('widget-bubble-1').textContent,
        'widget-image-1': document.getElementById('widget-image-1').src,
        'widget-subtext-1': document.getElementById('widget-subtext-1').textContent,
        'widget-bubble-2': document.getElementById('widget-bubble-2').textContent,
        'widget-image-2': document.getElementById('widget-image-2').src,
        'widget-subtext-2': document.getElementById('widget-subtext-2').textContent,

        // --- 第二页小组件 ---
        'widget-image-3': document.getElementById('widget-image-3').src,
        'second-page-bubble': document.getElementById('second-page-bubble').textContent,
        'flat-capsule-bubble': document.getElementById('flat-capsule-bubble').textContent,
        'circular-bubble': document.getElementById('circular-bubble').textContent,
        'widget-image-4': document.getElementById('widget-image-4').src,
        'avatar-subtitle': document.getElementById('avatar-subtitle').textContent,
        'bubble-top-left': document.getElementById('bubble-top-left').textContent,
        'bubble-top-right': document.getElementById('bubble-top-right').textContent,
        'bubble-bottom-left': document.getElementById('bubble-bottom-left').textContent,
        'bubble-bottom-right': document.getElementById('bubble-bottom-right').textContent,
        'new-widget-avatar': document.getElementById('new-widget-avatar').src,
        'new-widget-text-1': document.getElementById('new-widget-text-1').textContent,
        'new-widget-text-2': document.getElementById('new-widget-text-2').textContent,
        'new-widget-text-3': document.getElementById('new-widget-text-3').textContent,
        'widget-month-display': document.getElementById('widget-month-display').textContent,
        'music-rect-img': document.getElementById('music-rect-img').src,
        'music-record-img': document.getElementById('music-record-img').src,
        'music-text-line': document.getElementById('music-text-line').textContent,

        // --- App图标和壁纸 ---
        appIcons: { ...state.globalSettings.appIcons },
        appLabels: { ...state.globalSettings.appLabels },
        wallpaper: state.globalSettings.wallpaper,
    };

    // 保存到数据库
    await db.homeScreenPresets.add({ name: presetName.trim(), data: presetData });
    await window.loadHomeScreenPresetsToDropdown(); // 刷新下拉列表
    alert(`预设 "${presetName.trim()}" 已保存！`);
}

window.updateSelectedHomeScreenPreset = async function () {
    if (window.saveAppLabels) window.saveAppLabels();

    if (!window.activeHomePresetId) {
        alert('请先选择一个要更新的预设');
        return;
    }

    const currentPreset = await db.homeScreenPresets.get(window.activeHomePresetId);
    if (!currentPreset) return;

    let confirmFunc = window.showCustomConfirm || showCustomConfirm;
    const confirmed = await confirmFunc('确认更新', `确定要用当前的主屏幕布局覆盖预设 "${currentPreset.name}" 吗？`, { confirmButtonClass: 'btn-danger' });

    if (confirmed) {
        // 构建与保存时完全相同的完整数据对象
        const presetData = {
            'profile-banner-img': document.getElementById('profile-banner-img').src,
            'profile-avatar-img': document.getElementById('profile-avatar-img').src,
            homeAvatarFrame: document.getElementById('profile-avatar-frame').src,
            'profile-username': document.getElementById('profile-username').textContent,
            'profile-sub-username': document.getElementById('profile-sub-username').textContent,
            'profile-bio': document.getElementById('profile-bio').textContent,
            'profile-location': document.getElementById('profile-location').innerHTML,
            'widget-bubble-1': document.getElementById('widget-bubble-1').textContent,
            'widget-image-1': document.getElementById('widget-image-1').src,
            'widget-subtext-1': document.getElementById('widget-subtext-1').textContent,
            'widget-bubble-2': document.getElementById('widget-bubble-2').textContent,
            'widget-image-2': document.getElementById('widget-image-2').src,
            'widget-subtext-2': document.getElementById('widget-subtext-2').textContent,
            'widget-image-3': document.getElementById('widget-image-3').src,
            'second-page-bubble': document.getElementById('second-page-bubble').textContent,
            'flat-capsule-bubble': document.getElementById('flat-capsule-bubble').textContent,
            'circular-bubble': document.getElementById('circular-bubble').textContent,
            'widget-image-4': document.getElementById('widget-image-4').src,
            'avatar-subtitle': document.getElementById('avatar-subtitle').textContent,
            'bubble-top-left': document.getElementById('bubble-top-left').textContent,
            'bubble-top-right': document.getElementById('bubble-top-right').textContent,
            'bubble-bottom-left': document.getElementById('bubble-bottom-left').textContent,
            'bubble-bottom-right': document.getElementById('bubble-bottom-right').textContent,
            'new-widget-avatar': document.getElementById('new-widget-avatar').src,
            'new-widget-text-1': document.getElementById('new-widget-text-1').textContent,
            'new-widget-text-2': document.getElementById('new-widget-text-2').textContent,
            'new-widget-text-3': document.getElementById('new-widget-text-3').textContent,
            'widget-month-display': document.getElementById('widget-month-display').textContent,
            'music-rect-img': document.getElementById('music-rect-img').src,
            'music-record-img': document.getElementById('music-record-img').src,
            'music-text-line': document.getElementById('music-text-line').textContent,
            appIcons: { ...state.globalSettings.appIcons },
            appLabels: { ...state.globalSettings.appLabels },
            wallpaper: state.globalSettings.wallpaper,
        };

        await db.homeScreenPresets.update(window.activeHomePresetId, { data: presetData });
        let alertFunc = window.showCustomAlert || showCustomAlert;
        await alertFunc('成功', `预设 "${currentPreset.name}" 已更新！`);
    }
}

/**
 * 重命名选中的预设
 */
window.renameSelectedHomeScreenPreset = async function () {
    if (!window.activeHomePresetId) return;
    const currentPreset = await db.homeScreenPresets.get(window.activeHomePresetId);
    let promptFunc = window.showCustomPrompt || showCustomPrompt;
    const newName = await promptFunc('重命名', '请输入新的名称：', currentPreset.name);
    if (newName && newName.trim()) {
        await db.homeScreenPresets.update(window.activeHomePresetId, { name: newName.trim() });
        await window.loadHomeScreenPresetsToDropdown();
        document.getElementById('home-preset-selector').value = window.activeHomePresetId;
        alert('重命名成功！');
    }
}

/**
 * 删除选中的预设
 */
window.deleteSelectedHomeScreenPreset = async function () {
    if (!window.activeHomePresetId) return;
    const currentPreset = await db.homeScreenPresets.get(window.activeHomePresetId);
    let confirmFunc = window.showCustomConfirm || showCustomConfirm;
    const confirmed = await confirmFunc('确认删除', `确定要删除预设 "${currentPreset.name}" 吗？`, {
        confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
        await db.homeScreenPresets.delete(window.activeHomePresetId);
        await window.loadHomeScreenPresetsToDropdown(); // 这会自动重置选择并禁用按钮
        alert('预设已删除');
    }
}

/**
 * 导出选中的预设
 */
window.exportHomeScreenPreset = async function () {
    if (!window.activeHomePresetId) return;
    const preset = await db.homeScreenPresets.get(window.activeHomePresetId);
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name}-HomeScreen.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导入预设文件
 */
window.importHomeScreenPreset = function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // 简单验证一下文件内容是不是我们需要的格式
            if (data.name && data.data) {
                await db.homeScreenPresets.add({ name: `${data.name} (导入)`, data: data.data });
                await window.loadHomeScreenPresetsToDropdown();
                alert(`预设 "${data.name}" 导入成功！`);
            } else {
                alert('导入失败：文件格式不正确');
            }
        } catch (error) {
            alert(`导入失败：文件解析错误 ${error.message}`);
        }
    };
    reader.readAsText(file);
}

/**
 * 渲染 API 设置界面 (从main-app.js 迁移)
 */
window.renderApiSettings = function () {
    if (!state.apiConfig) return;

    // 渲染 API 预设下拉框
    if (window.renderApiPresetSelector) {
        window.renderApiPresetSelector();
    }

    // 1. 通用 API 设置
    const proxyInput = document.getElementById('proxy-url');
    if (proxyInput) proxyInput.value = state.apiConfig.proxyUrl || '';

    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) apiKeyInput.value = state.apiConfig.apiKey || '';

    // Pollinations Key 回显
    const polliKeyInput = document.getElementById('pollinations-api-key');
    if (polliKeyInput) polliKeyInput.value = state.apiConfig.pollinationsApiKey || '';

    // 模型选择
    const modelSelect = document.getElementById('model-select');
    if (modelSelect && state.apiConfig.model) {
        if (modelSelect.tagName === 'SELECT') {
            // 如果当前下拉框里没有这个值，临时加进去，避免显示为空
            let exists = false;
            // 确保 options 存在且是集合 (防御性编程)
            if (modelSelect.options) {
                for (let i = 0; i < modelSelect.options.length; i++) {
                    if (modelSelect.options[i].value === state.apiConfig.model) {
                        exists = true;
                        break;
                    }
                }
            }

            if (!exists) {
                const option = document.createElement('option');
                option.value = state.apiConfig.model;
                option.textContent = state.apiConfig.model;
                modelSelect.appendChild(option);
            }
            modelSelect.value = state.apiConfig.model;
        } else {
            // 如果是 input 框，直接赋值
            modelSelect.value = state.apiConfig.model;
        }
    }

    // 温度
    const temp = typeof state.apiConfig.temperature !== 'undefined' ? state.apiConfig.temperature : 0.8;
    const tempSlider = document.getElementById('temperature-slider');
    if (tempSlider) tempSlider.value = temp;
    const tempValue = document.getElementById('temperature-value');
    if (tempValue) tempValue.textContent = temp;

    // 2. Minimax 设置
    const minimaxGroup = document.getElementById('minimax-group-id');
    if (minimaxGroup) minimaxGroup.value = state.apiConfig.minimaxGroupId || '';

    const minimaxKey = document.getElementById('minimax-api-key');
    if (minimaxKey) minimaxKey.value = state.apiConfig.minimaxApiKey || '';

    const minimaxProvider = document.getElementById('minimax-provider-select');
    if (minimaxProvider) minimaxProvider.value = state.apiConfig.minimaxProvider || 'minimax';

    // Minimax 语音模型
    const speechModelSelect = document.getElementById('minimax-speech-model-select');
    if (speechModelSelect && state.apiConfig.minimaxSpeechModel) {
        if (speechModelSelect.tagName === 'SELECT') {
            let exists = false;
            if (speechModelSelect.options) {
                for (let i = 0; i < speechModelSelect.options.length; i++) {
                    if (speechModelSelect.options[i].value === state.apiConfig.minimaxSpeechModel) {
                        exists = true;
                        break;
                    }
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = state.apiConfig.minimaxSpeechModel;
                option.textContent = state.apiConfig.minimaxSpeechModel;
                speechModelSelect.appendChild(option);
            }
            speechModelSelect.value = state.apiConfig.minimaxSpeechModel;
        } else {
            speechModelSelect.value = state.apiConfig.minimaxSpeechModel;
        }
    }

    // 3. GitHub 备份设置
    const ghToken = document.getElementById('github-token');
    if (ghToken) ghToken.value = state.apiConfig.githubToken || '';

    const ghUser = document.getElementById('github-username');
    if (ghUser) ghUser.value = state.apiConfig.githubUsername || '';

    const ghRepo = document.getElementById('github-repo');
    if (ghRepo) ghRepo.value = state.apiConfig.githubRepo || '';

    const ghPath = document.getElementById('github-path');
    if (ghPath) ghPath.value = state.apiConfig.githubPath || 'ephone_backup.json';

    const ghAuto = document.getElementById('github-auto-backup-switch');
    if (ghAuto) ghAuto.checked = !!state.apiConfig.githubAutoBackup;

    const ghMode = document.getElementById('github-backup-mode');
    if (ghMode) ghMode.value = state.apiConfig.githubBackupMode || 'full';

    const ghInterval = document.getElementById('github-backup-interval');
    if (ghInterval) ghInterval.value = state.apiConfig.githubBackupInterval || 30;

    // 4. 图片压缩质量 (属于 globalSettings)
    if (state.globalSettings) {
        const quality = typeof state.globalSettings.imageCompressionQuality !== 'undefined' ? state.globalSettings.imageCompressionQuality : 0.8;
        const qualitySlider = document.getElementById('image-quality-slider');
        if (qualitySlider) qualitySlider.value = quality;

        const qualityValue = document.getElementById('image-quality-value');
        if (qualityValue) qualityValue.textContent = quality;

        // 5. 后台活动模拟
        const bgSwitch = document.getElementById('background-activity-switch');
        if (bgSwitch) {
            bgSwitch.checked = !!state.globalSettings.enableBackgroundActivity;
            // 初始化时同步显示状态
            if (typeof window.renderBackgroundFrequencySelector === 'function') {
                window.renderBackgroundFrequencySelector();
            }
        }

        const bgInterval = document.getElementById('background-interval-input');
        if (bgInterval) bgInterval.value = state.globalSettings.backgroundActivityInterval || 60;

        const blockCooldown = document.getElementById('block-cooldown-input');
        if (blockCooldown) blockCooldown.value = state.globalSettings.blockCooldownHours || 1;
    }

    // 6. 加载 NovelAI 设置 (如果函数存在)
    if (typeof window.loadNovelAISettings === 'function') {
        window.loadNovelAISettings();
    }

    const sysNotifSwitch = document.getElementById('system-notification-switch');

    // ★★★【修改点2：重写开关加载与交互逻辑】★★★
    const oldSysSwitch = document.getElementById('system-notification-switch');
    if (oldSysSwitch) {
        // 1. 使用克隆大法，彻底移除所有之前可能重复绑定的事件监听器
        const newSysSwitch = oldSysSwitch.cloneNode(true);
        oldSysSwitch.parentNode.replaceChild(newSysSwitch, oldSysSwitch);

        // 2. 读取保存的状态
        const savedNotifState = state.globalSettings.enableSystemNotifications;
        const hasPerm = 'Notification' in window && Notification.permission === 'granted';

        // 3. 智能判断开关状态：
        // - 如果有保存的记录，就严格听记录的（是true就是true，是false就是false）
        // - 如果从没保存过（undefined），但浏览器已经有权限，默认开启
        if (typeof savedNotifState !== 'undefined') {
            newSysSwitch.checked = savedNotifState;
        } else {
            newSysSwitch.checked = hasPerm;
        }

        // 4. 绑定新的、唯一的点击事件
        newSysSwitch.addEventListener('change', async (e) => {
            if (e.target.checked) {
                // --- 用户想开启 ---
                if (!('Notification' in window)) {
                    alert('抱歉，设备不支持系统通知。');
                    e.target.checked = false;
                } else if (Notification.permission === 'granted') {
                    // 已有权限，直接开启成功
                    if (typeof window.sendSystemNotification === 'function') {
                        window.sendSystemNotification('EPhone', {
                            body: '系统通知已开启！别忘了点击底部的【保存】按钮哦。',
                        });
                    } else {
                        new Notification('EPhone', {
                            body: '系统通知已开启！别忘了点击底部的【保存】按钮哦。',
                        });
                    }
                } else if (Notification.permission !== 'denied') {
                    // 请求权限
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        if (typeof window.sendSystemNotification === 'function') {
                            window.sendSystemNotification('EPhone', {
                                body: '权限获取成功！请点击【保存】。',
                            });
                        } else {
                            new Notification('EPhone', {
                                body: '权限获取成功！请点击【保存】。',
                            });
                        }
                    } else {
                        e.target.checked = false;
                        alert('权限被拒绝，无法开启。');
                    }
                } else {
                    // 之前被永久拒绝
                    e.target.checked = false;
                    alert('权限已被拒绝。请去手机/浏览器设置中手动开启通知权限。');
                }
            } else {
            }
        });
    }

    // 系统弹窗测试按钮逻辑
    const testNotifBtn = document.getElementById('test-system-notification-btn');
    if (testNotifBtn) {
        // 移除旧的监听器 (如果为了避免重复绑定)
        const newTestBtn = testNotifBtn.cloneNode(true);
        testNotifBtn.parentNode.replaceChild(newTestBtn, testNotifBtn);

        newTestBtn.addEventListener('click', async () => {
            // 1. 检查支持性
            if (!('Notification' in window)) {
                alert('您的设备/浏览器不支持系统通知。');
                return;
            }

            // 2. 检查权限状态
            if (Notification.permission === 'granted') {
                // 已有权限，直接发送
                try {
                    // 使用 main-app.js 中定义的兼容函数
                    if (typeof window.sendSystemNotification === 'function') {
                        window.sendSystemNotification('系统弹窗测试', {
                            body: '这是一条测试通知。如果您能看到它，说明配置成功！',
                            icon: 'https://i.postimg.cc/Kj8JnRcp/267611-CC01-F8-A3-B4910-A2-C2-FFDE479-DC.jpg',
                            silent: true, // 最好保持静音，免得和网页音效冲突
                        });
                    } else {
                        // 备用：如果函数还没加载（极少情况），回退到旧方式
                        new Notification('系统弹窗测试', {
                            body: '这是一条测试通知。',
                            icon: 'https://i.postimg.cc/Kj8JnRcp/267611-CC01-F8-A3-B4910-A2-C2-FFDE479-DC.jpg',
                            silent: true,
                        });
                    }

                    // 同时播放通知音效 (如果有)
                    if (typeof window.playNotificationSound === 'function') {
                        window.playNotificationSound();
                    }
                    // 提示用户
                    // alert('测试通知已发送，请查看系统通知栏。'); 
                    // (可选：不弹alert打断体验，或者用toast)
                } catch (e) {
                    alert('发送失败，错误信息: ' + e.message);
                }
            } else if (Notification.permission !== 'denied') {
                // 3. 还没有权限，尝试请求
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification('系统弹窗测试', {
                        body: '权限获取成功！这是测试通知。',
                        icon: 'https://i.postimg.cc/Kj8JnRcp/267611-CC01-F8-A3-B4910-A2-C2-FFDE479-DC.jpg',
                    });
                } else {
                    alert('您拒绝了通知权限。');
                }
            } else {
                // 4. 权限已被永久拒绝
                alert('通知权限已被拒绝。请前往手机系统设置或浏览器设置中手动开启通知权限。');
            }
        });
    }

}

// ===================================================================
// 8. 数据备份与恢复 (Backup & Restore)
// ===================================================================

window.getDeviceCode = function () {
    let code = localStorage.getItem('device_code');
    if (!code) {
        code = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_code', code);
    }
    return code;
};

window.exportBackup = async function () {
    try {
        const backupData = await window.getFullBackupData();
        const blob = new Blob([backupData], { type: 'application/json' }); // getFullBackupData returns string
        const url = URL.createObjectURL(blob);
        const link = Object.assign(document.createElement('a'), {
            href: url,
            download: `EPhone-Full-Backup-${new Date().toISOString().split('T')[0]}.json`,
        });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await showCustomAlert('导出成功', '已成功导出所有数据！');
    } catch (error) {
        console.error('导出数据时出错:', error);
        await showCustomAlert('导出失败', `发生了一个错误: ${error.message}`);
    }
};

window.getFullBackupData = async function () {
    const backupData = {
        version: 1,
        timestamp: Date.now(),
        deviceCode: window.getDeviceCode(),
    };

    const [chats, worldBooks, userStickers, charStickers, apiConfig, globalSettings, personaPresets, musicLibrary, qzoneSettings, qzonePosts, qzoneAlbums, qzonePhotos, favorites, qzoneGroups, memories, worldBookCategories, callRecords, customAvatarFrames, themes, apiPresets, bubbleStylePresets, fontPresets, homeScreenPresets, datingScenes, datingPresets, datingSpriteGroups, datingSprites, datingHistory, pomodoroSessions, ludoQuestionBanks, ludoQuestions, scriptKillScripts, taobaoProducts, taobaoOrders, taobaoCart, userWalletTransactions, userStickerCategories] = await Promise.all([
        db.chats.toArray(), db.worldBooks.toArray(), db.userStickers.toArray(), db.charStickers.toArray(), db.apiConfig.get('main'), db.globalSettings.get('main'), db.personaPresets.toArray(), db.musicLibrary.get('main'), db.qzoneSettings.get('main'), db.qzonePosts.toArray(), db.qzoneAlbums.toArray(), db.qzonePhotos.toArray(), db.favorites.toArray(), db.qzoneGroups.toArray(), db.memories.toArray(), db.worldBookCategories.toArray(), db.callRecords.toArray(), db.customAvatarFrames.toArray(), db.themes.toArray(), db.apiPresets.toArray(), db.bubbleStylePresets.toArray(), db.fontPresets.toArray(), db.homeScreenPresets.toArray(), db.datingScenes.toArray(), db.datingPresets.toArray(), db.datingSpriteGroups.toArray(), db.datingSprites.toArray(), db.datingHistory.toArray(), db.pomodoroSessions.toArray(), db.ludoQuestionBanks.toArray(), db.ludoQuestions.toArray(), db.scriptKillScripts.toArray(), db.taobaoProducts.toArray(), db.taobaoOrders.toArray(), db.taobaoCart.toArray(), db.userWalletTransactions.toArray(), db.userStickerCategories.toArray()
    ]);

    Object.assign(backupData, {
        chats, worldBooks, userStickers, charStickers, apiConfig, globalSettings, personaPresets, musicLibrary, qzoneSettings, qzonePosts, qzoneAlbums, qzonePhotos, favorites, qzoneGroups, memories, worldBookCategories, callRecords, customAvatarFrames, themes, apiPresets, bubbleStylePresets, fontPresets, homeScreenPresets, datingScenes, datingPresets, datingSpriteGroups, datingSprites, datingHistory, pomodoroSessions, ludoQuestionBanks, ludoQuestions, scriptKillScripts, taobaoProducts, taobaoOrders, taobaoCart, userWalletTransactions, userStickerCategories,
    });

    // 如果在主屏幕，尝试获取完整的 homeScreenState (optional, omitted here as per original logic's simplified return)

    return JSON.stringify(backupData, null, 2);
};

window.importBackup = async function (file) {
    if (!file) return;
    const confirmed = await showCustomConfirm('严重警告！', '导入备份将完全覆盖您当前的所有数据，包括聊天、设置等。此操作不可撤销！您确定要继续吗？', { confirmButtonClass: 'btn-danger' });
    if (!confirmed) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) { await table.clear(); }

            const arrayTables = ['chats', 'worldBooks', 'userStickers', 'charStickers', 'personaPresets', 'qzonePosts', 'qzoneAlbums', 'qzonePhotos', 'favorites', 'qzoneGroups', 'memories', 'worldBookCategories', 'callRecords', 'customAvatarFrames', 'themes', 'apiPresets', 'bubbleStylePresets', 'fontPresets', 'homeScreenPresets', 'datingScenes', 'datingPresets', 'datingSpriteGroups', 'datingSprites', 'datingHistory', 'pomodoroSessions', 'ludoQuestionBanks', 'ludoQuestions', 'scriptKillScripts', 'taobaoProducts', 'taobaoOrders', 'taobaoCart', 'userWalletTransactions', 'userStickerCategories'];

            for (const tableName of arrayTables) {
                if (Array.isArray(data[tableName]) && db[tableName]) {
                    let itemsToPut = data[tableName];
                    if (tableName === 'worldBooks') {
                        itemsToPut.forEach(book => {
                            if (Array.isArray(book.content)) {
                                book.content = book.content.map(entry => {
                                    const parts = [];
                                    if (entry.comment) parts.push(`[备注: ${entry.comment}]`);
                                    if (entry.keys?.length) parts.push(`[关键词: ${entry.keys.join(', ')}]`);
                                    parts.push(entry.content);
                                    return parts.join('\n');
                                }).join('\n\n---\n\n');
                            }
                        });
                    }
                    const validItems = itemsToPut.filter(item => item && (typeof item.id === 'number' || typeof item.id === 'string'));
                    if (validItems.length) await db[tableName].bulkPut(validItems);
                }
            }

            const objectTables = ['apiConfig', 'globalSettings', 'musicLibrary', 'qzoneSettings', 'xhsSettings'];
            for (const tableName of objectTables) {
                if (data[tableName] && db[tableName]) await db[tableName].put(data[tableName]);
            }
        });

        if (data.homeScreenState) {
            const settings = (await db.globalSettings.get('main')) || { id: 'main' };
            settings.widgetData = data.homeScreenState;
            if (data.homeScreenState.wallpaper) settings.wallpaper = data.homeScreenState.wallpaper;
            if (data.homeScreenState.appIcons) settings.appIcons = data.homeScreenState.appIcons;
            await db.globalSettings.put(settings);
        }

        await showCustomAlert('导入成功', '所有数据已成功恢复！应用即将刷新。');
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error('导入出错:', error);
        await showCustomAlert('导入失败', `错误: ${error.message}`);
    }
};

window.uploadSingleFile = async function (user, repo, path, token, contentBase64, isAuto = false, force = false) {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;
    let sha = null;
    try {
        const getRes = await fetch(apiUrl, { method: 'GET', headers: { Authorization: `token ${token}` } });
        if (getRes.ok) sha = (await getRes.json()).sha;
    } catch (e) { }

    const body = { message: `Backup ${new Date().toLocaleString()}`, content: contentBase64 };
    if (sha) body.sha = sha;

    const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GitHub API Error: ${errText}`);
    }
};

window.uploadBackupToGitHub = async function (isAuto = false) {
    let { githubToken, githubUsername, githubRepo, githubPath } = state.apiConfig;
    if (!githubToken || !githubUsername || !githubRepo) {
        if (!isAuto) alert('请先在 API 设置中配置 GitHub！');
        return;
    }
    githubToken = githubToken.trim();
    githubUsername = githubUsername.trim();
    githubRepo = githubRepo.trim().replace(/\/$/, '').split('/').pop().replace('.git', '');
    githubPath = (githubPath || 'ephone_backup.json').trim();

    if (!isAuto) await showCustomAlert('准备中...', '正在打包并计算文件大小...');

    try {
        const rawJson = await window.getFullBackupData();
        const backupObj = JSON.parse(rawJson);
        if (backupObj.apiConfig) {
            backupObj.apiConfig.apiKey = '';
            backupObj.apiConfig.githubToken = '';
            backupObj.apiConfig.minimaxApiKey = '';
        }
        const jsonContent = JSON.stringify(backupObj, null, 2);
        const fullBase64 = btoa(unescape(encodeURIComponent(jsonContent)));
        const totalSize = fullBase64.length;
        const CHUNK_SIZE = 45 * 1024 * 1024;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

        if (totalChunks === 1) {
            await window.uploadSingleFile(githubUsername, githubRepo, githubPath, githubToken, fullBase64, isAuto);
        } else {
            if (!isAuto) await showCustomAlert('文件较大', `将分为 ${totalChunks} 个部分上传...`);
            for (let i = 0; i < totalChunks; i++) {
                const chunk = fullBase64.substring(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, totalSize));
                const partName = `${githubPath}.${String(i + 1).padStart(3, '0')}`;
                await window.uploadSingleFile(githubUsername, githubRepo, partName, githubToken, chunk, isAuto);
            }
            const infoContent = btoa(JSON.stringify({ total_parts: totalChunks, timestamp: Date.now() }));
            await window.uploadSingleFile(githubUsername, githubRepo, `${githubPath}.meta`, githubToken, infoContent, isAuto);
        }

        console.log('GitHub 备份完成');
        if (!isAuto) await showCustomAlert('上传成功', '备份已上传 (Key 已移除)。');
    } catch (error) {
        console.error('备份失败:', error);
        if (!isAuto) await showCustomAlert('上传失败', error.message);
    }
};

window.uploadBackupToGitHubStream = async function (isAuto = false) {
    let { githubToken, githubUsername, githubRepo, githubPath } = state.apiConfig;
    if (!githubToken || !githubUsername || !githubRepo) {
        alert('请配置 GitHub！');
        return;
    }
    githubToken = githubToken.trim();
    githubUsername = githubUsername.trim();
    githubRepo = githubRepo.trim().replace(/\/$/, '').split('/').pop().replace('.git', '');
    let basePath = (githubPath || 'ephone_backup').trim().replace('.json', '');

    if (!isAuto) {
        const confirmed = await showCustomConfirm('开始流式上传', '将把数据拆分为多个文件上传。\n确定要开始吗？');
        if (!confirmed) return;
    }

    const loadingOverlay = document.getElementById('generation-overlay');
    const loadingText = loadingOverlay.querySelector('p');
    if (!isAuto) loadingOverlay.classList.add('visible');

    const CHUNK_SIZE = 15 * 1024 * 1024;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const uploadWithRetry = async (path, content, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                await window.uploadSingleFile(githubUsername, githubRepo, path, githubToken, content, true);
                return;
            } catch (error) {
                if (i === retries - 1) throw error;
                await sleep(2000);
            }
        }
    };

    try {
        const tablesToExport = db.tables.map(t => t.name);
        const singleObjects = ['apiConfig', 'globalSettings', 'musicLibrary', 'qzoneSettings'];
        const allTasks = [...tablesToExport.map(name => ({ type: 'table', name })), ...singleObjects.map(name => ({ type: 'object', name }))];

        for (let i = 0; i < allTasks.length; i++) {
            const task = allTasks[i];
            let data = null;
            if (task.type === 'table') {
                loadingText.textContent = `[${i + 1}/${allTasks.length}] 读取: ${task.name}...`;
                await sleep(50);
                data = await db[task.name].toArray();
            } else {
                data = await db[task.name].get('main');
                if (data && task.name === 'apiConfig') {
                    data.apiKey = ''; data.githubToken = ''; data.minimaxApiKey = '';
                }
            }
            if (!data) continue;

            const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
            const fileName = `${basePath}_${task.name}.json`;

            if (contentBase64.length > CHUNK_SIZE) {
                const totalChunks = Math.ceil(contentBase64.length / CHUNK_SIZE);
                for (let c = 0; c < totalChunks; c++) {
                    loadingText.textContent = `上传 ${task.name} 分片 ${c + 1}/${totalChunks}...`;
                    const chunk = contentBase64.substring(c * CHUNK_SIZE, Math.min((c + 1) * CHUNK_SIZE, contentBase64.length));
                    const partName = `${fileName}.${String(c + 1).padStart(3, '0')}`;
                    await uploadWithRetry(partName, chunk);
                    await sleep(1000);
                }
                const meta = btoa(JSON.stringify({ split: true, totalChunks, originalSize: contentBase64.length }));
                await uploadWithRetry(`${fileName}.meta`, meta);
            } else {
                loadingText.textContent = `上传: ${task.name}...`;
                await uploadWithRetry(fileName, contentBase64);
                await sleep(500);
            }
        }

        const masterMeta = { type: 'stream_backup_v2', timestamp: Date.now(), tables: tablesToExport, configs: singleObjects };
        await uploadWithRetry(`${basePath}_master_meta.json`, btoa(unescape(encodeURIComponent(JSON.stringify(masterMeta)))));

        if (!isAuto) await showCustomAlert('上传完成', '所有数据已流式上传成功！');
        else showNotification(state.activeChatId || 'system', 'GitHub 自动备份已完成 ✅');
    } catch (error) {
        console.error('流式上传失败:', error);
        if (!isAuto) await showCustomAlert('上传失败', error.message);
        else showNotification(state.activeChatId || 'system', 'GitHub 自动备份失败 ❌');
    } finally {
        loadingOverlay.classList.remove('visible');
    }
};

window.restoreBackupFromGitHub = async function () {
    let { githubToken, githubUsername, githubRepo, githubPath } = state.apiConfig;
    if (!githubToken || !githubUsername || !githubRepo) { alert('Api Config Missing!'); return; }

    if (!(await showCustomConfirm('高能预警', '即将覆盖所有数据！确定继续？', { confirmButtonClass: 'btn-danger' }))) return;

    githubToken = githubToken.trim();
    githubUsername = githubUsername.trim();
    githubRepo = githubRepo.trim().replace(/\/$/, '').split('/').pop().replace('.git', '');
    githubPath = (githubPath || 'ephone_backup.json').trim();

    await showCustomAlert('正在连接...', '正在检查...');

    try {
        let finalBase64String = '';
        let metaData = null;
        try {
            const metaRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${githubPath}.meta`, { headers: { Authorization: `token ${githubToken}` } });
            if (metaRes.ok) metaData = JSON.parse(atob((await metaRes.json()).content.replace(/\s/g, '')));
        } catch (e) { }

        if (metaData && metaData.total_parts) {
            const modalTitle = document.getElementById('custom-modal-title');
            for (let i = 1; i <= metaData.total_parts; i++) {
                if (modalTitle) modalTitle.textContent = `下载分片 ${i}/${metaData.total_parts}...`;
                const partRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${githubPath}.${String(i).padStart(3, '0')}`, { headers: { Authorization: `token ${githubToken}` } });
                const partJson = await partRes.json();

                const blobUrl = `https://api.github.com/repos/${githubUsername}/${githubRepo}/git/blobs/${partJson.sha}`;
                const blobRes = await fetch(blobUrl, { headers: { Authorization: `token ${githubToken}` } });
                finalBase64String += (await blobRes.json()).content.replace(/\s/g, '');
            }
        } else {
            const res = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${githubPath}`, { headers: { Authorization: `token ${githubToken}` } });
            if (!res.ok) throw new Error(res.status);
            const json = await res.json();
            if (json.content) finalBase64String = json.content.replace(/\s/g, '');
            else {
                const blobRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/git/blobs/${json.sha}`, { headers: { Authorization: `token ${githubToken}` } });
                finalBase64String = (await blobRes.json()).content.replace(/\s/g, '');
            }
        }

        if (document.getElementById('custom-modal-title')) document.getElementById('custom-modal-title').textContent = '正在解析...';

        const binaryString = atob(finalBase64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const jsonString = new TextDecoder('utf-8').decode(bytes);

        const virtualFile = new File([jsonString], 'restore.json', { type: 'application/json' });
        hideCustomModal();
        await window.importBackup(virtualFile);
    } catch (e) {
        await showCustomAlert('恢复失败', e.message + (e.message.includes('403') ? ' (Check Token)' : ''));
    }
};

window.restoreBackupFromGitHubStream = async function () {
    let { githubToken, githubUsername, githubRepo, githubPath } = state.apiConfig;
    if (!githubToken) { alert('No Config'); return; }

    githubFolder = githubPath || 'ephone_backup';
    let basePath = githubFolder.trim().replace('.json', '');

    if (!(await showCustomConfirm('确认流式恢复', '覆盖当前所有数据！确定？', { confirmButtonClass: 'btn-danger' }))) return;

    const loadingOverlay = document.getElementById('generation-overlay');
    const loadingText = loadingOverlay.querySelector('p');
    loadingOverlay.classList.add('visible');

    try {
        const tablesToImport = db.tables.map(t => t.name);
        // Also single objects
        const singleObjects = ['apiConfig', 'globalSettings', 'musicLibrary', 'qzoneSettings'];
        const allTasks = [...tablesToImport.map(name => ({ type: 'table', name })), ...singleObjects.map(name => ({ type: 'object', name }))];

        loadingText.textContent = '清空数据库...';
        for (const table of db.tables) await table.clear();

        const downloadAndMerge = async (taskName) => {
            const fileName = `${basePath}_${taskName}.json`;
            const metaUrl = `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${fileName}.meta`;
            let isSplit = false; let splitInfo = null;
            try {
                const m = await fetch(metaUrl, { headers: { Authorization: `token ${githubToken}` } });
                if (m.ok) { splitInfo = JSON.parse(atob((await m.json()).content.replace(/\s/g, ''))); isSplit = true; }
            } catch (e) { }

            let finalBase = '';
            if (isSplit) {
                for (let i = 1; i <= splitInfo.totalChunks; i++) {
                    const pName = `${fileName}.${String(i).padStart(3, '0')}`;
                    const pRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${pName}`, { headers: { Authorization: `token ${githubToken}` } });
                    // Handle blob logic if needed, simplified here assuming small parts or standard content
                    const pj = await pRes.json();
                    if (pj.content) finalBase += pj.content.replace(/\s/g, '');
                    else {
                        const blobRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/git/blobs/${pj.sha}`, { headers: { Authorization: `token ${githubToken}` } });
                        finalBase += (await blobRes.json()).content.replace(/\s/g, '');
                    }
                }
            } else {
                const fRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${fileName}`, { headers: { Authorization: `token ${githubToken}` } });
                if (fRes.status === 404) return null;
                const fj = await fRes.json();
                if (fj.content) finalBase = fj.content.replace(/\s/g, '');
                else {
                    const blobRes = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/git/blobs/${fj.sha}`, { headers: { Authorization: `token ${githubToken}` } });
                    finalBase = (await blobRes.json()).content.replace(/\s/g, '');
                }
            }

            const binary = atob(finalBase);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return JSON.parse(new TextDecoder('utf-8').decode(bytes));
        };

        for (const task of allTasks) {
            loadingText.textContent = `正在恢复: ${task.name}...`;
            try {
                const data = await downloadAndMerge(task.name);
                if (data) {
                    if (task.type === 'object') {
                        if (task.name === 'apiConfig') {
                            if (!data.apiKey) data.apiKey = state.apiConfig.apiKey;
                            if (!data.githubToken) data.githubToken = state.apiConfig.githubToken;
                        }
                        await db[task.name].put(data);
                    } else if (Array.isArray(data)) {
                        await db[task.name].bulkPut(data);
                    }
                }
            } catch (e) {
                console.warn(`Skipped ${task.name}`, e);
            }
        }
        await showCustomAlert('恢复完成', '应用即将刷新。');
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        console.error(e);
        await showCustomAlert('失败', e.message);
    } finally {
        loadingOverlay.classList.remove('visible');
    }
};

window.repairAllData = async function () {
    const confirmed = await showCustomConfirm('数据修复', '此功能将扫描所有数据，补全缺失的属性并修复错误结构（不会删除聊天记录）。\n\n如果你的界面出现白屏、卡顿或报错，请尝试此操作。\n\n确定要开始修复吗？');

    if (!confirmed) return;

    await showCustomAlert('请稍候...', '正在深度扫描并修复数据结构...');

    try {
        let fixCount = 0;

        // 1. 修复聊天数据 (Chats)
        const allChats = await db.chats.toArray();
        for (const chat of allChats) {
            let needSave = false;

            // 修复基础结构
            if (!chat.history || !Array.isArray(chat.history)) {
                chat.history = [];
                needSave = true;
            }
            if (!chat.settings) {
                chat.settings = {};
                needSave = true;
            }
            if (!chat.status) {
                chat.status = {
                    text: '在线',
                    lastUpdate: Date.now(),
                    isBusy: false,
                };
                needSave = true;
            }

            // 修复群聊成员结构
            if (chat.isGroup) {
                if (!chat.members || !Array.isArray(chat.members)) {
                    chat.members = [];
                    needSave = true;
                }
                chat.members.forEach((m) => {
                    if (!m.originalName && m.name) {
                        m.originalName = m.name;
                        needSave = true;
                    } // 修复旧版名字
                    if (!m.groupNickname) {
                        m.groupNickname = m.originalName || '未知成员';
                        needSave = true;
                    }
                });
            }

            // 修复单聊设置
            if (!chat.isGroup) {
                // 修复关系状态
                if (!chat.relationship) {
                    chat.relationship = { status: 'friend' };
                    needSave = true;
                }

                // 修复手机数据结构 (最容易导致报错的部分)
                if (!chat.characterPhoneData) {
                    chat.characterPhoneData = {};
                    needSave = true;
                }

                const phone = chat.characterPhoneData;
                const phoneDefaults = {
                    chats: {},
                    shoppingCart: [],
                    memos: [],
                    browserHistory: [],
                    photoAlbum: [],
                    bank: { balance: 0, transactions: [] },
                    trajectory: [],
                    appUsage: [],
                    diary: [],
                    widgets: {},
                };

                for (const key in phoneDefaults) {
                    if (!phone[key]) {
                        phone[key] = phoneDefaults[key];
                        needSave = true;
                    }
                }

                // 修复银行余额为NaN的情况
                if (phone.bank && typeof phone.bank.balance !== 'number') {
                    phone.bank.balance = 0;
                    needSave = true;
                }
            }

            // 修复设置中的缺失项
            if (!chat.settings.streak) {
                chat.settings.streak = { enabled: false, currentDays: 0 };
                needSave = true;
            }
            if (!chat.settings.summary) {
                chat.settings.summary = {
                    enabled: false,
                    mode: 'auto',
                    count: 20,
                    lastSummaryIndex: -1,
                };
                needSave = true;
            }

            if (needSave) {
                await db.chats.put(chat);
                fixCount++;
            }
        }

        // 2. 修复全局设置 (Global Settings)
        let globalSettings = await db.globalSettings.get('main');
        if (!globalSettings) {
            globalSettings = { id: 'main' }; // 如果完全丢失，重建
        }

        let globalNeedSave = false;
        if (!globalSettings.appIcons) {
            globalSettings.appIcons = {};
            globalNeedSave = true;
        }
        if (!globalSettings.appLabels) {
            globalSettings.appLabels = {};
            globalNeedSave = true;
        }
        if (!globalSettings.quickReplies || !Array.isArray(globalSettings.quickReplies)) {
            globalSettings.quickReplies = [];
            globalNeedSave = true;
        }
        // 修复余额NaN
        if (typeof globalSettings.userBalance !== 'number' || isNaN(globalSettings.userBalance)) {
            globalSettings.userBalance = 0;
            globalNeedSave = true;
        }

        if (globalNeedSave) {
            await db.globalSettings.put(globalSettings);
            fixCount++;
        }

        // 3. 修复动态设置 (Qzone Settings)
        let qzoneSettings = await db.qzoneSettings.get('main');
        if (!qzoneSettings) {
            await db.qzoneSettings.put({
                id: 'main',
                nickname: '我',
                avatar: 'https://files.catbox.moe/q6z5fc.jpeg',
            });
            fixCount++;
        }

        await showCustomAlert('修复完成', `已检查所有数据，共修复了 ${fixCount} 处潜在问题。\n\n页面即将刷新以应用更改。`);

        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (error) {
        console.error('修复过程中出错:', error);
        alert(`修复失败: ${error.message}\n请截图控制台报错给开发者。`);
    }
};
async function handleCoupleImageSelect(previewImgId, fileInputId) {
    const choice = await showChoiceModal('选择图片来源', [
        { text: '📁 从本地上传', value: 'local' },
        { text: '🌐 使用网络URL', value: 'url' },
    ]);

    if (!choice) return;

    if (choice === 'local') {
        // 触发本地文件选择
        document.getElementById(fileInputId).click();
    } else if (choice === 'url') {
        // 弹出输入框获取URL
        const url = await showCustomPrompt('输入图片链接', '请粘贴以 http 开头的图片地址', '', 'url');
        if (url && url.trim()) {
            document.getElementById(previewImgId).src = url.trim();
        }
    }
}
window.handleCoupleImageSelect = handleCoupleImageSelect;

// 2. 绑定两个上传按钮的点击事件 (使用上面定义的新ID)
document.getElementById('upload-couple-my-btn').addEventListener('click', () => {
    handleCoupleImageSelect('new-couple-my-avatar-preview', 'new-couple-my-avatar-input');
});

document.getElementById('upload-couple-char-btn').addEventListener('click', () => {
    handleCoupleImageSelect('new-couple-char-avatar-preview', 'new-couple-char-avatar-input');
});

// 3. 绑定本地文件选择后的预览 (复用之前的逻辑，保持不变)
// 这里的 setupFileUpload 是你代码里已有的辅助函数
setupFileUpload('new-couple-my-avatar-input', (base64) => {
    document.getElementById('new-couple-my-avatar-preview').src = base64;
});
setupFileUpload('new-couple-char-avatar-input', (base64) => {
    document.getElementById('new-couple-char-avatar-preview').src = base64;
});

// ===================================================================
// 8. 数据清理与重置 (Data Cleaning & Reset)
// ===================================================================

/**
 * 分块导出 (只导出选中的数据)
 */
window.exportChunkedData = async function () {
    await showCustomAlert('请稍候...', '正在打包您选择的数据...');

    const backupData = {
        type: 'EPhoneChunkedBackup',
        version: 3,
        exportedAt: Date.now(),
        contains: [],
        data: {},
    };

    try {
        const appCheckboxes = document.querySelectorAll('.export-app-checkbox:checked');
        const charCheckboxes = document.querySelectorAll('.export-char-checkbox:checked');

        if (appCheckboxes.length === 0 && charCheckboxes.length === 0) {
            alert('请至少选择一项要导出的内容！');
            hideCustomModal();
            return;
        }

        const appsToExportMap = {
            weibo: { tables: ['weiboPosts', 'qzoneSettings'] },
            forum: {
                tables: ['forumGroups', 'forumPosts', 'forumComments', 'forumCategories', 'forumSeries', 'forumChapters'],
            },
            taobao: {
                tables: ['taobaoProducts', 'taobaoOrders', 'taobaoCart', 'userWalletTransactions'],
            },
            worldBooks: { tables: ['worldBooks', 'worldBookCategories'] },

            dateALive: {
                tables: ['datingScenes', 'datingPresets', 'datingSpriteGroups', 'datingSprites', 'datingHistory'],
            },

            tukeyAccounting: {
                tables: ['tukeyAccounts', 'tukeyAccountingGroups', 'tukeyAccountingRecords', 'tukeyAccountingReplies', 'tukeyUserSettings', 'tukeyCustomConfig'],
            },

            studio: {
                tables: ['studioScripts', 'studioHistory'],
            },

            userStickers: {
                tables: ['userStickers', 'userStickerCategories'],
            },
            charStickers: { tables: ['charStickers'] },
            gameData: {
                tables: ['scriptKillScripts', 'ludoQuestionBanks', 'ludoQuestions'],
            },
            appearance: {
                tables: ['themes', 'fontPresets', 'homeScreenPresets', 'customAvatarFrames', 'apiPresets', 'bubbleStylePresets'],
            },
        };

        // 1. 导出选中的App数据
        for (const checkbox of appCheckboxes) {
            const appId = checkbox.value;
            const appInfo = appsToExportMap[appId];
            if (appInfo) {
                backupData.contains.push(appId);
                for (const tableName of appInfo.tables) {
                    backupData.data[tableName] = await db[tableName].toArray();
                    console.log(`已打包App数据表: ${tableName}`);
                }
            }
        }

        // 2. 导出选中的角色数据
        const charIds = Array.from(charCheckboxes).map((cb) => cb.value);
        if (charIds.length > 0) {
            backupData.data.chats = await db.chats.bulkGet(charIds);
            backupData.contains.push(...charIds.map((id) => `character_${id}`));

            // 打包所有与这些角色关联的数据
            const relatedDataTables = ['memories', 'callRecords', 'qzonePosts', 'weiboPosts', 'datingHistory', 'pomodoroSessions'];
            const relatedKey = {
                memories: 'chatId',
                callRecords: 'chatId',
                qzonePosts: 'authorId',
                weiboPosts: 'authorId',
                datingHistory: 'characterId',
                pomodoroSessions: 'chatId',
            };

            for (const tableName of relatedDataTables) {
                const items = await db[tableName].where(relatedKey[tableName]).anyOf(charIds).toArray();
                if (items.length > 0) {
                    if (!backupData.data[tableName]) backupData.data[tableName] = [];
                    // 使用Set去重，防止因多角色关联同一数据而重复打包
                    const existingIds = new Set(backupData.data[tableName].map((i) => i.id));
                    items.forEach((item) => {
                        if (!existingIds.has(item.id)) {
                            backupData.data[tableName].push(item);
                            existingIds.add(item.id);
                        }
                    });
                }
            }
            console.log(`已打包 ${charIds.length} 个角色的核心及关联数据。`);
        }

        // 3. 创建JSON文件并触发下载
        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `EPhone-Partial-Backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await showCustomAlert('导出成功', '已成功导出您选中的数据！');
    } catch (error) {
        console.error('分块导出失败:', error);
        await showCustomAlert('导出失败', `发生错误: ${error.message}`);
    } finally {
        document.getElementById('advanced-transfer-modal').classList.remove('visible');
    }
};

/**
 * 执行补充式导入
 * @param {File} file - 用户选择的JSON文件
 */
window.importChunkedData = async function (file) {
    if (!file) return;

    let data;
    try {
        const text = await file.text();
        data = JSON.parse(text);
    } catch (error) {
        await window.showCustomAlert('导入失败', '文件读取或解析失败，请确保文件是有效的JSON格式。');
        return;
    }

    if (data.type !== 'EPhoneChunkedBackup') {
        const confirmed = await window.showCustomConfirm('文件类型不匹配', '这是一个【全量备份】文件，继续导入将会【覆盖】所有数据！是否要继续？', { confirmButtonClass: 'btn-danger' });
        if (confirmed && window.importBackup) window.importBackup(file);
        return;
    }

    const contentList = data.contains
        .map((item) => {
            const appNameMap = {
                weibo: '微博',
                forum: '圈子',
                taobao: '桃宝',
                worldBooks: '世界书',

                dateALive: '约会大作战数据',

                tukeyAccounting: '兔k记账数据',

                studio: '小剧场数据',

                userStickers: '我的表情包',
                charStickers: '角色通用表情包',
                gameData: '游戏大厅数据',
                appearance: '通用外观预设',
            };
            if (item.startsWith('character_')) {
                const charId = item.replace('character_', '');
                const charData = data.data.chats?.find((c) => c.id === charId);
                return `角色数据：${charData ? charData.name : '未知角色'}`;
            }
            return appNameMap[item] || item;
        })
        .join('\n- ');

    const confirmed = await window.showCustomConfirm('确认导入', `即将导入以下内容：\n\n- ${contentList}\n\n注意：如果现有数据中已存在相同ID的内容（如同名角色），他们的数据将会被导入的数据【完全覆盖】。此操作不可撤销！`);

    if (!confirmed) return;

    await window.showCustomAlert('请稍候...', '正在导入数据，请勿关闭页面...');

    try {
        // 1. 获取导入文件中有哪些数据表
        const tablesInBackup = Object.keys(data.data);

        // 2. 获取当前数据库中实际存在的所有数据表名称
        const validTableNames = db.tables.map((t) => t.name);

        // 3. 找出二者的交集，这才是我们真正需要操作的数据表
        const tablesToUpdate = tablesInBackup.filter((t) => validTableNames.includes(t));

        console.log('即将操作的有效数据表:', tablesToUpdate);

        // 4. 只对这些有效的数据表开启一个数据库事务
        await db.transaction('rw', tablesToUpdate, async () => {
            for (const tableName of tablesToUpdate) {
                if (Array.isArray(data.data[tableName])) {
                    console.log(`正在向表格 "${tableName}" 中补充/覆盖 ${data.data[tableName].length} 条数据...`);
                    await db[tableName].bulkPut(data.data[tableName]);
                }
            }
        });

        // 尝试重新加载数据，如果存在相关函数
        if (window.loadAllDataFromDB) await window.loadAllDataFromDB();
        if (window.renderChatList) await window.renderChatList();

        await window.showCustomAlert('导入成功', '数据已成功补充！应用将刷新以确保所有数据正确加载。');
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error('补充式导入失败:', error);
        await window.showCustomAlert('导入失败', `写入数据库时发生错误: ${error.message}`);
    } finally {
        const modal = document.getElementById('advanced-transfer-modal');
        if (modal) modal.classList.remove('visible');
    }
};

/**
 * 【兼容330】将当前App的数据导出为兼容EPhone 330的格式
 */
window.exportDataFor330 = async function () {
    await window.showCustomAlert('请稍候...', '正在为你准备兼容性备份文件...');

    const backupData = {
        version: 3, // 将版本号强制写为3，让330版本能识别
        timestamp: Date.now(),
        data: {},
    };

    try {
        const [chatsFromDB, worldBooksFromDB, userStickersFromDB, apiConfigFromDB, globalSettingsFromDB, qzonePostsFromDB, qzoneAlbumsFromDB, qzonePhotosFromDB, qzoneSettingsFromDB, personaPresetsFromDB, memoriesFromDB, apiPresetsFromDB, favoritesFromDB, worldBookCategoriesFromDB, callRecordsFromDB, stickerCategoriesFromDB] = await Promise.all([db.chats.toArray(), db.worldBooks.toArray(), db.userStickers.toArray(), db.apiConfig.get('main'), db.globalSettings.get('main'), db.qzonePosts.toArray(), db.qzoneAlbums.toArray(), db.qzonePhotos.toArray(), db.qzoneSettings.get('main'), db.personaPresets.toArray(), db.memories.toArray(), db.apiPresets.toArray(), db.favorites.toArray(), db.worldBookCategories.toArray(), db.callRecords.toArray(), db.userStickerCategories.toArray()]);

        const transformedWorldBooks = worldBooksFromDB.map((book) => {
            const newBookFor330 = { ...book };
            if (typeof newBookFor330.content === 'string' && newBookFor330.content.trim()) {
                newBookFor330.content = [
                    {
                        keys: [book.name],
                        comment: `从 EPhone 导入的条目`,
                        content: book.content,
                        enabled: true,
                    },
                ];
            } else {
                newBookFor330.content = [];
            }
            return newBookFor330;
        });

        const transformedChats = chatsFromDB.map((chat) => {
            if (chat.isGroup) return chat;
            const settingsFor330 = {
                ...chat.settings,
                'ai-persona': chat.settings.aiPersona,
                'my-persona': chat.settings.myPersona,
                'ai-avatar': chat.settings.aiAvatar,
                'my-avatar': chat.settings.myAvatar,
            };
            return { ...chat, settings: settingsFor330 };
        });

        const transformedNpcs = [];
        const npcIdSet = new Set();
        for (const chat of chatsFromDB) {
            if (!chat.isGroup && Array.isArray(chat.npcLibrary)) {
                chat.npcLibrary.forEach((npc) => {
                    if (!npcIdSet.has(npc.id)) {
                        transformedNpcs.push({
                            id: npc.id,
                            name: npc.name,
                            avatar: npc.avatar,
                            persona: npc.persona,
                            associatedWith: [chat.id],
                        });
                        npcIdSet.add(npc.id);
                    } else {
                        const existingNpc = transformedNpcs.find((n) => n.id === npc.id);
                        if (existingNpc) existingNpc.associatedWith.push(chat.id);
                    }
                });
            }
        }

        const transformedQzoneSettings = {
            id: 'main',
            nickname: qzoneSettingsFromDB?.nickname || '你的昵称',
            avatar: qzoneSettingsFromDB?.avatar || 'https://files.catbox.moe/q6z5fc.jpeg',
            banner: qzoneSettingsFromDB?.banner || 'https://files.catbox.moe/r5heyt.gif',
        };

        const transformedDoubanPosts = qzonePostsFromDB
            .filter((p) => p.authorId !== 'user')
            .map((p) => ({
                id: p.id,
                timestamp: p.timestamp,
                groupName: '从动态导入的小组',
                postTitle: (p.publicText || p.content || '无标题').substring(0, 50),
                authorName: state.chats[p.authorId]?.name || '未知作者',
                authorOriginalName: state.chats[p.authorId]?.name || '未知作者',
                content: p.content || p.publicText || '[图片]',
                likesCount: p.likes?.length || 0,
                commentsCount: p.comments?.length || 0,
                comments: (p.comments || []).map((c) => ({ commenter: c.commenterName, text: c.text })),
            }));

        backupData.data = {
            chats: transformedChats,
            npcs: transformedNpcs,
            worldBooks: transformedWorldBooks,
            worldBookCategories: worldBookCategoriesFromDB,
            userStickers: userStickersFromDB,
            stickerCategories: stickerCategoriesFromDB,
            apiConfig: apiConfigFromDB ? [apiConfigFromDB] : [],
            globalSettings: globalSettingsFromDB ? [globalSettingsFromDB] : [],
            qzoneSettings: [transformedQzoneSettings],
            qzonePosts: qzonePostsFromDB,
            qzoneAlbums: qzoneAlbumsFromDB,
            qzonePhotos: qzonePhotosFromDB,
            personaPresets: personaPresetsFromDB,
            memories: memoriesFromDB,
            apiPresets: apiPresetsFromDB,
            favorites: favoritesFromDB,
            doubanPosts: transformedDoubanPosts,
            callRecords: callRecordsFromDB,
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `EPhone-Compatible-Backup-v330-${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await window.showCustomAlert('导出成功', '已成功生成兼容330版本的备份文件！现在你可以去330版本导入它了。');
    } catch (error) {
        console.error('兼容性导出失败:', error);
        await window.showCustomAlert('导出失败', `发生了一个错误: ${error.message}`);
    } finally {
        const modal = document.getElementById('advanced-transfer-modal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }
};

/**
 * 处理并导入来自330版本格式的备份文件
 * @param {File} file - 用户选择的330格式的JSON文件
 */
window.importFrom330Format = async function (file) {
    if (!file) return;

    const confirmed = await window.showCustomConfirm('严重警告！', '您正在从330版本导入数据，这将【完全覆盖】您当前的所有数据！此操作不可撤销！确定要继续吗？', { confirmButtonClass: 'btn-danger' });
    if (!confirmed) return;

    await window.showCustomAlert('请稍候...', '正在解析并转换330版本的数据...');

    try {
        const text = await file.text();
        const importedData = JSON.parse(text);

        if (importedData.version !== 3) {
            throw new Error(`文件版本不匹配！需要版本3，但提供的是版本 ${importedData.version}。`);
        }

        const data330 = importedData.data;

        // 这是一个安全列表，确保我们只操作您数据库中存在的表
        const existingTables = ['chats', 'worldBooks', 'worldBookCategories', 'userStickers', 'userStickerCategories', 'apiConfig', 'globalSettings', 'qzonePosts', 'qzoneAlbums', 'qzonePhotos', 'qzoneSettings', 'personaPresets', 'memories', 'apiPresets', 'favorites', 'musicLibrary', 'callRecords', 'customAvatarFrames', 'themes', 'bubbleStylePresets', 'fontPresets', 'homeScreenPresets', 'weiboPosts', 'forumGroups', 'forumPosts', 'forumComments', 'forumCategories', 'forumSeries', 'forumChapters', 'tarotReadings', 'pomodoroSessions', 'scriptKillScripts', 'taobaoProducts', 'taobaoOrders', 'taobaoCart', 'userWalletTransactions', 'ludoQuestionBanks', 'ludoQuestions', 'datingScenes', 'datingPresets', 'datingSpriteGroups', 'datingSprites', 'datingHistory'];

        await db.transaction('rw', existingTables, async () => {
            for (const tableName of existingTables) {
                if (db[tableName]) {
                    await db[tableName].clear();
                }
            }
            console.log('330导入：已清空共有的数据表，准备导入...');

            // 世界书导入逻辑
            // 不再合并，而是将330的每个词条拆分成独立的世界书条目
            if (data330.worldBooks && Array.isArray(data330.worldBooks)) {
                const allNewWorldBookEntries = []; // 创建一个新数组来收集所有拆分后的条目
                let entryCounter = 0; // 用于生成唯一ID

                // 1. 遍历330的每一个“世界书合集”
                data330.worldBooks.forEach((book_330) => {
                    if (Array.isArray(book_330.content)) {
                        // 2. 遍历合集中的每一个词条
                        book_330.content.forEach((entry) => {
                            entryCounter++;

                            // 3. 为每个词条生成新的独立世界书名称
                            // 优先使用词条的 `keys` 作为名称，其次是 `comment`，最后是自动生成
                            let newName = `导入条目 ${entryCounter}`;
                            if (entry.keys && entry.keys.length > 0) {
                                newName = entry.keys.join(', '); // 用关键词作为新名称
                            } else if (entry.comment) {
                                newName = entry.comment; // 其次用备注作为新名称
                            }

                            // 4. 为每个词条创建一个全新的、独立的世界书对象
                            const newBookEntry = {
                                id: `imported_wb_${Date.now()}_${entryCounter}`, // 生成唯一ID
                                name: newName,
                                content: entry.content || '', // 内容就是词条的内容
                                categoryId: book_330.categoryId || 0, // 继承原合集的分类ID
                                isEnabled: entry.enabled !== false, // 继承启用状态，默认为true
                            };

                            // 5. 将这个全新的独立条目添加到我们的收集中
                            allNewWorldBookEntries.push(newBookEntry);
                        });
                    }
                });

                // 6. 一次性将所有拆分后的新条目写入数据库
                await db.worldBooks.bulkPut(allNewWorldBookEntries);
                console.log(`330导入：成功“拆分”并导入 ${allNewWorldBookEntries.length} 条独立世界书条目。`);
            }
            // 分类信息保持不变，正常导入
            if (data330.worldBookCategories) await db.worldBookCategories.bulkPut(data330.worldBookCategories);

            // 转换并导入【聊天和NPC】
            if (data330.chats && Array.isArray(data330.chats)) {
                const chatsToImport = [...data330.chats];
                const npcs = data330.npcs || [];
                chatsToImport.forEach((chat) => {
                    if (!chat.isGroup) {
                        chat.npcLibrary = [];
                        npcs.forEach((npc) => {
                            if (npc.associatedWith && npc.associatedWith.includes(chat.id)) {
                                chat.npcLibrary.push({ id: npc.id, name: npc.name, persona: npc.persona, avatar: npc.avatar });
                            }
                        });
                    }
                });
                await db.chats.bulkPut(chatsToImport);
                console.log(`330导入：成功转换并导入 ${chatsToImport.length} 个聊天。`);
            }

            // 转换并导入【豆瓣/圈子】数据
            if (data330.doubanPosts && Array.isArray(data330.doubanPosts)) {
                const groupMap = new Map();
                for (const post of data330.doubanPosts) {
                    let groupId;
                    if (groupMap.has(post.groupName)) {
                        groupId = groupMap.get(post.groupName);
                    } else {
                        const newGroup = { name: post.groupName, description: '从330导入的小组', icon: '📖' };
                        groupId = await db.forumGroups.add(newGroup);
                        groupMap.set(post.groupName, groupId);
                    }
                    await db.forumPosts.add({
                        id: post.id,
                        groupId: groupId,
                        title: post.postTitle,
                        content: post.content,
                        authorNickname: post.authorName,
                        timestamp: post.timestamp,
                        lengthType: 'short',
                        likes: post.likesCount || 0,
                    });
                    if (post.comments && post.comments.length > 0) {
                        const commentsToSave = post.comments.map((c) => ({
                            postId: post.id,
                            author: c.commenter,
                            content: c.text,
                            timestamp: Date.now(),
                        }));
                        await db.forumComments.bulkAdd(commentsToSave);
                    }
                }
                console.log(`330导入：成功转换并导入 ${data330.doubanPosts.length} 条圈子帖子。`);
            }

            // 转换并导入单对象设置
            if (data330.apiConfig?.[0]) await db.apiConfig.put(data330.apiConfig[0]);
            if (data330.globalSettings?.[0]) await db.globalSettings.put(data330.globalSettings[0]);
            if (data330.qzoneSettings?.[0]) await db.qzoneSettings.put(data330.qzoneSettings[0]);
            if (data330.musicLibrary?.[0]) await db.musicLibrary.put(data330.musicLibrary[0]);

            // 直接导入其他结构相同的【共有】数据表
            const directImportTables = ['userStickers', 'personaPresets', 'qzonePosts', 'qzoneAlbums', 'qzonePhotos', 'favorites', 'memories', 'callRecords', 'apiPresets', 'stickerCategories', 'customAvatarFrames'];
            for (const tableName of directImportTables) {
                if (data330[tableName] && Array.isArray(data330[tableName]) && db[tableName]) {
                    await db[tableName].bulkPut(data330[tableName]);
                    console.log(`330导入：成功导入 ${data330[tableName].length} 条数据到 ${tableName}。`);
                }
            }
        });

        // 导入成功后刷新页面
        await window.showCustomAlert('导入成功', '来自330版本的数据已成功导入！应用即将刷新以应用所有更改。');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('从330格式导入失败:', error);
        await window.showCustomAlert('导入失败', `文件格式不正确或数据已损坏: ${error.message}`);
    }
};

/**
 * 流式导出函数 (大数据专用)
 * 原理：不再一次性读取所有数据库表到内存，而是逐个表读取、写入，
 * 利用 ReadableStream 和 Response 流式传输给用户，从而极大降低内存占用。
 */
window.exportDataStream = async function () {
    await window.showCustomAlert('请稍候...', '正在准备流式导出，这可能需要一些时间，但不会使浏览器崩溃。');

    // 定义所有需要备份的数据库表名
    const tablesToExport = ['chats', 'apiConfig', 'globalSettings', 'userStickers', 'charStickers', 'worldBooks', 'musicLibrary', 'personaPresets', 'qzoneSettings', 'qzonePosts', 'qzoneAlbums', 'qzonePhotos', 'favorites', 'qzoneGroups', 'memories', 'worldBookCategories', 'callRecords', 'customAvatarFrames', 'themes', 'apiPresets', 'bubbleStylePresets', 'fontPresets', 'homeScreenPresets', 'weiboPosts', 'forumGroups', 'forumPosts', 'forumComments', 'forumCategories', 'forumSeries', 'forumChapters', 'tarotReadings', 'pomodoroSessions', 'scriptKillScripts', 'taobaoProducts', 'taobaoOrders', 'taobaoCart', 'userWalletTransactions', 'userStickerCategories', 'datingScenes', 'datingPresets', 'datingSpriteGroups', 'datingSprites', 'datingHistory'];

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // 1. 写入JSON文件的开头
            controller.enqueue(encoder.encode('{\n'));

            // 2. 添加版本和时间戳元数据
            const metaData = `"version": 1,\n"timestamp": ${Date.now()},\n`;
            controller.enqueue(encoder.encode(metaData));

            // 3. 逐个处理数据库表
            for (let i = 0; i < tablesToExport.length; i++) {
                const tableName = tablesToExport[i];
                console.log(`流式导出：正在处理表 ${tableName}...`);

                try {
                    // 1. 定义哪些表是单个对象的设置表
                    const singleObjectTables = ['apiConfig', 'globalSettings', 'musicLibrary', 'qzoneSettings', 'tukeyUserSettings', 'tukeyCustomConfig', 'tukeyAccountingGroups'];

                    let tableData;
                    // 2. 判断当前表是否是单个对象的设置表
                    if (singleObjectTables.includes(tableName)) {
                        // 如果是，就只获取第一个（也可能是唯一一个）对象
                        tableData = await db[tableName].toCollection().first();
                        // 如果表是空的，first()会返回undefined，JSON.stringify(undefined)会出问题，所以转为null
                        if (tableData === undefined) {
                            tableData = null;
                        }
                    } else {
                        // 如果是普通的多条记录表，就还是获取整个数组
                        tableData = await db[tableName].toArray();
                    }

                    const jsonString = JSON.stringify(tableData);

                    // 写入 "tableName": [...] 或 "tableName": {...}
                    controller.enqueue(encoder.encode(`"${tableName}": ${jsonString}`));

                    // 如果不是最后一个表，就加上逗号和换行符
                    if (i < tablesToExport.length - 1) {
                        controller.enqueue(encoder.encode(',\n'));
                    } else {
                        controller.enqueue(encoder.encode('\n'));
                    }
                } catch (e) {
                    console.error(`流式导出时，处理表 ${tableName} 失败:`, e);
                    // 即使某个表失败，也继续尝试下一个
                }
            }

            // 4. 写入JSON文件的结尾
            controller.enqueue(encoder.encode('}'));

            // 5. 通知流已经结束
            controller.close();
            console.log('流式导出：所有数据写入完成。');
        },
    });

    // 6. 使用 Response 将流包装成可下载的文件
    const response = new Response(stream, {
        headers: { 'Content-Type': 'application/json' },
    });

    // 7. 创建并触发下载链接
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `EPhone-Stream-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 关闭“请稍候”的弹窗
    if (window.hideCustomModal) window.hideCustomModal();
};

/**
 * 一键压缩数据库中所有图片的核心函数
 */
window.compressAllImagesInDB = async function () {
    const confirmed = await window.showCustomConfirm('高风险操作确认', '此操作将扫描并【永久性地】压缩数据库中的【所有静态图片（PNG/JPG等）】。<br><br>【GIF动图会被自动跳过，不会被压缩】。<br><br>压缩是不可逆的，建议在操作前先【导出数据】进行备份！<br><br>确定要继续吗？', { confirmButtonClass: 'btn-danger' });

    if (!confirmed) return;

    const loadingOverlay = document.getElementById('generation-overlay');
    const loadingText = loadingOverlay.querySelector('p');
    loadingText.textContent = '正在全力压缩图片，请耐心等待...';
    loadingOverlay.classList.add('visible');

    try {
        const quality = parseFloat(document.getElementById('image-quality-slider').value) || 0.7;
        const originalTotalSize = await calculateTotalImageSize();
        let itemsProcessed = 0;
        let compressedCount = 0;

        const findAndCompressImagesInObject = async (obj) => {
            let hasCompressed = false;
            for (const key in obj) {
                if (typeof obj[key] === 'string' && obj[key].startsWith('data:image')) {
                    const originalUrl = obj[key];
                    const compressedUrl = await compressImage(originalUrl, quality);
                    if (originalUrl !== compressedUrl) {
                        obj[key] = compressedUrl;
                        hasCompressed = true;
                        compressedCount++; // 记录压缩了多少张图片
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (await findAndCompressImagesInObject(obj[key])) {
                        hasCompressed = true;
                    }
                }
            }
            return hasCompressed;
        };

        const allTables = db.tables.map((table) => table.name);
        for (const tableName of allTables) {
            loadingText.textContent = `正在扫描表: ${tableName}...`;
            const itemsToUpdate = [];
            const allItems = await db[tableName].toArray();

            for (const item of allItems) {
                if (await findAndCompressImagesInObject(item)) {
                    itemsToUpdate.push(item);
                }
                itemsProcessed++;
                if (itemsProcessed % 20 === 0) {
                    loadingText.textContent = `已处理 ${itemsProcessed} 条数据... 压缩了 ${compressedCount} 张图片...`;
                }
            }

            if (itemsToUpdate.length > 0) {
                loadingText.textContent = `正在保存 ${tableName} 的压缩结果...`;
                await db[tableName].bulkPut(itemsToUpdate);
                console.log(`表 ${tableName} 中有 ${itemsToUpdate.length} 条记录的图片被压缩。`);
            }
        }

        loadingOverlay.classList.remove('visible');

        const newTotalSize = await calculateTotalImageSize();
        const savedSize = originalTotalSize - newTotalSize;

        await window.showCustomAlert('压缩完成！', `操作成功！\n原始大小: ${formatBytes(originalTotalSize)}\n压缩后大小: ${formatBytes(newTotalSize)}\n成功为您节省了 ${formatBytes(savedSize)} 的空间！\n\n应用即将刷新以应用所有更改。`);

        setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
        // 出错时也要确保加载动画被隐藏
        loadingOverlay.classList.remove('visible');
        console.error('压缩全部图片时出错:', error);
        await window.showCustomAlert('压缩失败', `发生了一个错误: ${error.message}`);
    }
};

/**
 * 计算Base64字符串的近似文件大小
 */
function getBase64Size(base64Str) {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) return 0;
    const base64 = base64Str.split(',')[1] || base64Str;
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return (base64.length * 3) / 4 - padding;
}

/**
 * 将字节数格式化为易读的字符串 (KB, MB, GB)
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 计算并显示数据库中所有图片的总大小
 */
async function calculateTotalImageSize() {
    const displayEl = document.getElementById('image-data-size-display');
    if (displayEl) displayEl.textContent = '正在计算中...';

    let totalSize = 0;
    const processedUrls = new Set();

    const calculateSize = (url) => {
        if (!url || typeof url !== 'string' || !url.startsWith('data:image') || processedUrls.has(url)) {
            return 0;
        }
        const size = getBase64Size(url);
        processedUrls.add(url);
        return size;
    };

    try {
        const allTables = db.tables.map((table) => table.name);
        for (const tableName of allTables) {
            try {
                const items = await db[tableName].toArray();
                for (const item of items) {
                    const findImagesRecursive = (obj) => {
                        for (const key in obj) {
                            if (typeof obj[key] === 'string') {
                                totalSize += calculateSize(obj[key]);
                            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                                findImagesRecursive(obj[key]);
                            }
                        }
                    };
                    findImagesRecursive(item);
                }
            } catch (e) {
                console.warn(`扫描表 ${tableName} 出错:`, e);
            }
        }

        if (displayEl) displayEl.textContent = `当前图片数据总量约: ${formatBytes(totalSize)}`;
        return totalSize;
    } catch (error) {
        console.error('计算图片大小时出错:', error);
        if (displayEl) displayEl.textContent = '计算失败，请查看控制台。';
        return 0;
    }
}

/**
 * 压缩图片至指定质量并返回Base64
 */
function compressImage(base64Str, quality) {
    return new Promise((resolve, reject) => {
        if (base64Str.startsWith('data:image/gif') || quality >= 1.0 || !base64Str.startsWith('data:image')) {
            resolve(base64Str);
            return;
        }

        const img = new Image();
        img.src = base64Str;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };

        img.onerror = (err) => {
            console.error('图片加载失败，无法压缩:', err);
            reject(new Error('图片加载失败，无法压缩'));
        };
    });
}
// ===================================================================
// 8. 数据清理与重置 (Data Cleaning & Reset)
// ===================================================================

/**
 * 清理所有与已删除角色关联的失效数据
 */
window.clearOrphanedData = async function () {
    // 1. 在执行敏感操作前，先弹窗向用户确认
    const confirmed = await window.showCustomConfirm(
        '确认清理',
        '此操作将扫描并删除所有与【已不存在的角色】关联的数据（如动态、微博、回忆、通话记录等），释放存储空间。\n\n此操作不可撤销，确定要继续吗？',
        { confirmButtonClass: 'btn-danger' }
    );

    // 如果用户点了“取消”，则直接退出
    if (!confirmed) return;

    // 显示一个“处理中”的提示，避免用户以为程序卡死
    await window.showCustomAlert('请稍候...', '正在扫描并清理失效数据...');

    try {
        let totalDeletedCount = 0;

        // 2. 获取所有仍然存在的、有效的角色ID列表
        const validChatIds = new Set((await db.chats.toArray()).map((c) => c.id));
        validChatIds.add('user'); // 'user' (即“我”) 永远是有效的作者

        // 3. 定义我们需要检查的数据库表和它们用来关联角色ID的字段名
        const tablesToCheck = [
            { name: 'qzonePosts', idField: 'authorId', typeName: '动态' },
            { name: 'weiboPosts', idField: 'authorId', typeName: '微博' },
            { name: 'memories', idField: 'chatId', typeName: '回忆/约定' },
            { name: 'callRecords', idField: 'chatId', typeName: '通话记录' },
        ];

        // 4. 遍历每一个需要检查的表
        for (const tableInfo of tablesToCheck) {
            const table = db[tableInfo.name];
            const allItems = await table.toArray();

            // 找出所有作者ID已经不存在的“孤儿”数据
            const idsToDelete = allItems.filter((item) => !validChatIds.has(item[tableInfo.idField])).map((item) => item.id);

            // 如果找到了需要删除的数据
            if (idsToDelete.length > 0) {
                await table.bulkDelete(idsToDelete); // 批量删除，效率更高
                console.log(`从 ${tableInfo.name} 表中清除了 ${idsToDelete.length} 条失效数据。`);
                totalDeletedCount += idsToDelete.length;
            }
        }

        // 5. 根据清理结果，给用户最终的反馈
        if (totalDeletedCount > 0) {
            await window.showCustomAlert('清理完成', `已成功清理 ${totalDeletedCount} 条失效数据！`);
        } else {
            await window.showCustomAlert('扫描完成', '未发现任何可清理的失效数据。');
        }
    } catch (error) {
        console.error('清理失效数据时出错:', error);
        await window.showCustomAlert('操作失败', `清理过程中发生错误: ${error.message}`);
    }
};

/**
 * 全局数据初始化（恢复出厂设置）
 */
window.handleFactoryReset = async function () {
    // 1. 第一重警告
    const confirmed = await window.showCustomConfirm('⚠ 严重警告', '此操作将【彻底清空】所有数据！包括：\n- 所有聊天记录\n- 所有设置与API Key\n- 所有图片、世界书、表情包\n\n数据一旦删除【无法恢复】。确定要继续吗？', { confirmButtonClass: 'btn-danger' });

    if (!confirmed) return;

    // 2. 第二重警告 (使用原生 confirm 防止误触)
    if (confirm('最后一次确认：真的要清空所有数据并重置应用吗？')) {
        try {
            // 显示加载遮罩
            const loadingOverlay = document.getElementById('generation-overlay');
            if (loadingOverlay) {
                loadingOverlay.querySelector('p').textContent = '正在粉碎数据...';
                loadingOverlay.classList.add('visible');
            }

            // A. 清空 IndexedDB 数据库的所有表
            await db.transaction('rw', db.tables, async () => {
                for (const table of db.tables) {
                    await table.clear();
                }
            });

            // B. 清空 LocalStorage (包含主题、部分开关设置等)
            localStorage.clear();

            // C. 成功提示并刷新
            alert('数据已全部初始化，应用将重启。');
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('初始化失败: ' + error.message);
            window.location.reload(); // 即使失败也尝试刷新
        }
    }
};

// ===================================================================
// 9. 高级导入导出功能 (Advanced Import/Export)
// ===================================================================

/**
 * 获取或生成当前设备的唯一设备码 (一致性修复)
 * @returns {string} - 一长串唯一的设备码
 */
window.getDeviceCode = function () {
    const deviceIdKey = 'ephone-device-code';
    let deviceId = localStorage.getItem(deviceIdKey);
    if (!deviceId) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            // Fallback for environments without crypto.randomUUID
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        }
        localStorage.setItem(deviceIdKey, deviceId);
    }
    return deviceId;
};

/**
 * 根据设备码生成对应的PIN码
 * @param {string} deviceCode - 设备码
 * @returns {string} - 6位大写的PIN码
 */
window.generatePinFromDeviceCode = function (deviceCode) {
    if (!deviceCode || deviceCode.length < 6) return 'INVALID';
    // 算法：将设备码反转，取前6位，转大写
    return deviceCode.split('').reverse().join('').substring(0, 6).toUpperCase();
};

/**
 * 打开高级导入导出模态框，并动态生成选项列表
 */
window.openAdvancedTransferModal = async function () {
    const appsListEl = document.getElementById('export-apps-list');
    const charactersListEl = document.getElementById('export-characters-list');
    if (!appsListEl || !charactersListEl) return;

    appsListEl.innerHTML = '';
    charactersListEl.innerHTML = '';

    // 1. 定义可独立导出的App数据及其关联的数据库表
    const appsToExport = [
        { id: 'weibo', name: '微博 (全部帖子/角色资料/粉丝数等)', tables: ['weiboPosts', 'qzoneSettings'] },
        {
            id: 'forum',
            name: '圈子 (小组/帖子/评论/分类/连载)',
            tables: ['forumGroups', 'forumPosts', 'forumComments', 'forumCategories', 'forumSeries', 'forumChapters'],
        },
        {
            id: 'taobao',
            name: '桃宝 (所有商品/订单/购物车/余额记录)',
            tables: ['taobaoProducts', 'taobaoOrders', 'taobaoCart', 'userWalletTransactions'],
        },
        { id: 'worldBooks', name: '世界书 (全部书籍及分类)', tables: ['worldBooks', 'worldBookCategories'] },

        {
            id: 'dateALive',
            name: '约会大作战 (场景/预设/立绘/历史)',
            tables: ['datingScenes', 'datingPresets', 'datingSpriteGroups', 'datingSprites', 'datingHistory'],
        },

        {
            id: 'tukeyAccounting',
            name: '兔k记账 (账户/群聊/账单/设置)',
            tables: ['tukeyAccounts', 'tukeyAccountingGroups', 'tukeyAccountingRecords', 'tukeyAccountingReplies', 'tukeyUserSettings', 'tukeyCustomConfig'],
        },

        {
            id: 'studio',
            name: '小剧场 (所有剧本/演绎记录)',
            tables: ['studioScripts', 'studioHistory'],
        },

        { id: 'userStickers', name: '我的表情包 (包含分类)', tables: ['userStickers', 'userStickerCategories'] },
        { id: 'charStickers', name: '角色通用表情包', tables: ['charStickers'] },
        {
            id: 'gameData',
            name: '游戏大厅数据 (剧本杀/飞行棋题库等)',
            tables: ['scriptKillScripts', 'ludoQuestionBanks', 'ludoQuestions'],
        },
        {
            id: 'appearance',
            name: '通用外观预设 (主题/字体/头像框等)',
            tables: ['themes', 'fontPresets', 'homeScreenPresets', 'customAvatarFrames', 'apiPresets', 'bubbleStylePresets'],
        },
    ];

    appsToExport.forEach((app) => {
        appsListEl.innerHTML += `
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" class="export-app-checkbox" value="${app.id}"> ${app.name}
                    </label>
                `;
    });

    // 2. 加载所有单聊角色
    const characters = Object.values(window.state && window.state.chats ? window.state.chats : {}).filter((chat) => !chat.isGroup);
    if (characters.length === 0) {
        charactersListEl.innerHTML = '<p>没有可导出的角色</p>';
    } else {
        characters.forEach((char) => {
            charactersListEl.innerHTML += `
                        <label style="display: block; margin-bottom: 5px;">
                            <input type="checkbox" class="export-char-checkbox" value="${char.id}"> ${char.name}
                        </label>
                    `;
        });
    }

    // 重置并绑定全选框
    const selectAllCheckbox = document.getElementById('select-all-characters-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;

        // 使用克隆节点技巧，防止事件重复绑定
        const newSelectAllCheckbox = selectAllCheckbox.cloneNode(true);
        selectAllCheckbox.parentNode.replaceChild(newSelectAllCheckbox, selectAllCheckbox);
        newSelectAllCheckbox.addEventListener('change', (e) => {
            document.querySelectorAll('.export-char-checkbox').forEach((cb) => {
                cb.checked = e.target.checked;
            });
        });
    }

    // 3. 显示模态框
    const modal = document.getElementById('advanced-transfer-modal');
    if (modal) modal.classList.add('visible');
};

/**
 * 初始化高级导入导出相关的所有事件监听器
 */
window.initAdvancedImportExportListeners = function () {
    console.log('[Settings] 初始化高级导入导出监听器...');

    // 打开高级导入导出模态框 (UI上的按钮)
    const advTransferBtn = document.getElementById('advanced-transfer-btn');
    if (advTransferBtn) {
        advTransferBtn.addEventListener('click', window.openAdvancedTransferModal);
    }

    // 关闭高级导入导出模态框
    const closeAdvBtn = document.getElementById('close-advanced-transfer-btn');
    if (closeAdvBtn) {
        closeAdvBtn.addEventListener('click', () => {
            const modal = document.getElementById('advanced-transfer-modal');
            if (modal) modal.classList.remove('visible');
        });
    }

    // 导出选中的数据 (分块导出)
    const exportSelBtn = document.getElementById('export-selected-data-btn');
    if (exportSelBtn) {
        exportSelBtn.addEventListener('click', window.exportChunkedData);
    }

    // 补充式导入按钮 (触发文件选择)
    const importChunkBtn = document.getElementById('import-chunked-data-btn');
    if (importChunkBtn) {
        importChunkBtn.addEventListener('click', () => {
            const input = document.getElementById('import-chunked-data-input');
            if (input) input.click();
        });
    }

    // 补充式导入文件选择变化
    const importChunkInput = document.getElementById('import-chunked-data-input');
    if (importChunkInput) {
        importChunkInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                window.importChunkedData(file);
            }
            e.target.value = null; // 清空以便下次选择
        });
    }

    // 兼容330格式导出
    const export330Btn = document.getElementById('export-for-330-btn');
    if (export330Btn) {
        export330Btn.addEventListener('click', window.exportDataFor330);
    }

    // 兼容330格式导入按钮 (触发文件选择)
    const import330Btn = document.getElementById('import-from-330-btn');
    if (import330Btn) {
        import330Btn.addEventListener('click', () => {
            const input = document.getElementById('import-from-330-input');
            if (input) input.click();
        });
    }

    // 兼容330格式导入文件选择变化
    const import330Input = document.getElementById('import-from-330-input');
    if (import330Input) {
        import330Input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                window.importFrom330Format(file);
            }
            e.target.value = null;
        });
    }

    // 压缩图片
    const compressBtn = document.getElementById('compress-all-images-btn');
    if (compressBtn) {
        compressBtn.addEventListener('click', window.compressAllImagesInDB);
    }

    // 流式导出 (大数据导出)
    const streamExportBtn = document.getElementById('export-data-stream-btn');
    if (streamExportBtn) {
        streamExportBtn.addEventListener('click', window.exportDataStream);
    }

    // 恢复出厂设置按钮
    const factoryResetBtn = document.getElementById('factory-reset-btn');
    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', window.handleFactoryReset);
    }

    // 备份到GitHub
    const backupGithubBtn = document.getElementById('backup-to-github-btn');
    if (backupGithubBtn) {
        backupGithubBtn.addEventListener('click', () => window.uploadBackupToGitHubStream(false));
    }

    // 从GitHub恢复
    const restoreGithubBtn = document.getElementById('restore-from-github-btn');
    if (restoreGithubBtn) {
        restoreGithubBtn.addEventListener('click', window.restoreBackupFromGitHubStream);
    }

    // 开始修复数据
    const startRepairBtn = document.getElementById('start-repair-btn');
    if (startRepairBtn) {
        startRepairBtn.addEventListener('click', window.repairAllData);
    }
};

// 注入到现有的 initSettingsListeners 中
if (typeof window.initSettingsListeners === 'function') {
    const originalInit = window.initSettingsListeners;
    window.initSettingsListeners = function () {
        originalInit();
        window.initAdvancedImportExportListeners();
    };
} else {
    window.initSettingsListeners = window.initAdvancedImportExportListeners;
}

// ===================================================================
// 10. QQ Chat Character Presets (Moved from main-app.js)
// ===================================================================

let editingPersonaPresetId = null;
const PRESET_DEFAULT_AVATAR = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg'; // Defined here for local use within this module scope

function renderPersonaLibrary() {
    const grid = document.getElementById('persona-library-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Ensure state.personaPresets exists
    if (!state.personaPresets) state.personaPresets = [];

    if (state.personaPresets.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; margin-top: 20px;">空空如也~ 点击右上角"添加"来创建你的第一个人设预设吧！</p>';
        return;
    }
    state.personaPresets.forEach((preset) => {
        const item = document.createElement('div');
        item.className = 'persona-preset-item';
        item.style.backgroundImage = `url(${preset.avatar})`;
        item.dataset.presetId = preset.id;
        item.addEventListener('click', () => applyPersonaPreset(preset.id));

        // Use global addLongPressListener if available
        if (typeof window.addLongPressListener === 'function') {
            window.addLongPressListener(item, () => showPresetActions(preset.id));
        } else if (typeof addLongPressListener === 'function') {
            addLongPressListener(item, () => showPresetActions(preset.id));
        }

        grid.appendChild(item);
    });
}
window.renderPersonaLibrary = renderPersonaLibrary;

function openPersonaLibrary() {
    const personaLibraryModal = document.getElementById('persona-library-modal');
    renderPersonaLibrary();
    if (personaLibraryModal) personaLibraryModal.classList.add('visible');
}
window.openPersonaLibrary = openPersonaLibrary;

function closePersonaLibrary() {
    const personaLibraryModal = document.getElementById('persona-library-modal');
    if (personaLibraryModal) personaLibraryModal.classList.remove('visible');
}
window.closePersonaLibrary = closePersonaLibrary;

function showPresetActions(presetId) {
    editingPersonaPresetId = presetId;
    const presetActionsModal = document.getElementById('preset-actions-modal');
    if (presetActionsModal) presetActionsModal.classList.add('visible');
}

function hidePresetActions() {
    const presetActionsModal = document.getElementById('preset-actions-modal');
    if (presetActionsModal) presetActionsModal.classList.remove('visible');
    editingPersonaPresetId = null;
}
window.hidePresetActions = hidePresetActions;

function applyPersonaPreset(presetId) {
    const preset = state.personaPresets.find((p) => p.id === presetId);
    if (preset) {
        const avatarPreview = document.getElementById('my-avatar-preview');
        const personaInput = document.getElementById('my-persona');
        if (avatarPreview) avatarPreview.src = preset.avatar;
        if (personaInput) personaInput.value = preset.persona;
    }
    closePersonaLibrary();
}
window.applyPersonaPreset = applyPersonaPreset;

async function savePersonaPreset() {
    const preview = document.getElementById('preset-avatar-preview');
    const input = document.getElementById('preset-persona-input');

    const avatar = preview ? preview.src : PRESET_DEFAULT_AVATAR;
    const persona = input ? input.value.trim() : '';

    if (avatar === PRESET_DEFAULT_AVATAR && !persona) {
        alert('头像和人设不能都为空哦！');
        return;
    }
    if (editingPersonaPresetId) {
        const preset = state.personaPresets.find((p) => p.id === editingPersonaPresetId);
        if (preset) {
            preset.avatar = avatar;
            preset.persona = persona;
            await db.personaPresets.put(preset);
        }
    } else {
        const newPreset = { id: 'preset_' + Date.now(), avatar: avatar, persona: persona };
        await db.personaPresets.add(newPreset);
        state.personaPresets.push(newPreset);
    }
    renderPersonaLibrary();
    closePersonaEditor();
}
window.savePersonaPreset = savePersonaPreset;

function openPersonaEditorForCreate() {
    editingPersonaPresetId = null;

    const title = document.getElementById('persona-editor-title');
    const preview = document.getElementById('preset-avatar-preview');
    const input = document.getElementById('preset-persona-input');

    if (title) title.textContent = '添加人设预设';
    if (preview) preview.src = PRESET_DEFAULT_AVATAR;
    if (input) input.value = '';

    // 根据用户人设模式，显隐特定UI元素
    const nameGroup = document.getElementById('npc-editor-name-group');
    const changeBtn = document.getElementById('persona-editor-change-frame-btn');
    if (nameGroup) nameGroup.style.display = 'none';
    if (changeBtn) changeBtn.style.display = 'inline-block';

    // 直接覆盖保存按钮的 onclick 事件，强制它只执行保存用户人设的函数
    const saveBtn = document.getElementById('save-persona-preset-btn');
    if (saveBtn) saveBtn.onclick = savePersonaPreset;

    const personaEditorModal = document.getElementById('persona-editor-modal');
    if (personaEditorModal) personaEditorModal.classList.add('visible');
}
window.openPersonaEditorForCreate = openPersonaEditorForCreate;

function openPersonaEditorForEdit() {
    // Need access to editingPersonaPresetId. It is module-scoped in this file now.

    const preset = state.personaPresets.find((p) => p.id === editingPersonaPresetId);
    if (!preset) return;

    const title = document.getElementById('persona-editor-title');
    const preview = document.getElementById('preset-avatar-preview');
    const input = document.getElementById('preset-persona-input');

    if (title) title.textContent = '编辑人设预设';
    if (preview) preview.src = preset.avatar;
    if (input) input.value = preset.persona;

    // 根据用户人设模式，显隐特定UI元素
    const nameGroup = document.getElementById('npc-editor-name-group');
    const changeBtn = document.getElementById('persona-editor-change-frame-btn');
    if (nameGroup) nameGroup.style.display = 'none';
    if (changeBtn) changeBtn.style.display = 'inline-block';

    // 直接覆盖保存按钮的 onclick 事件，强制它只执行保存用户人设的函数
    const saveBtn = document.getElementById('save-persona-preset-btn');
    if (saveBtn) saveBtn.onclick = savePersonaPreset;

    const presetActionsModal = document.getElementById('preset-actions-modal');
    if (presetActionsModal) presetActionsModal.classList.remove('visible'); // hide actions

    const personaEditorModal = document.getElementById('persona-editor-modal');
    if (personaEditorModal) personaEditorModal.classList.add('visible');
}
window.openPersonaEditorForEdit = openPersonaEditorForEdit;

async function deletePersonaPreset() {
    // Assuming showCustomConfirm is global.
    const showConfirm = window.showCustomConfirm || showCustomConfirm;

    const confirmed = await showConfirm('删除预设', '确定要删除这个人设预设吗？此操作不可恢复。', {
        confirmButtonClass: 'btn-danger',
    });
    if (confirmed && editingPersonaPresetId) {
        await db.personaPresets.delete(editingPersonaPresetId);
        state.personaPresets = state.personaPresets.filter((p) => p.id !== editingPersonaPresetId);
        hidePresetActions();
        renderPersonaLibrary();
    }
}
window.deletePersonaPreset = deletePersonaPreset;

function closePersonaEditor() {
    const personaEditorModal = document.getElementById('persona-editor-modal');
    if (personaEditorModal) personaEditorModal.classList.remove('visible');
    editingPersonaPresetId = null;
}
window.closePersonaEditor = closePersonaEditor;

