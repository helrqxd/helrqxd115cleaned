// cphone.js - 查手机功能模块

// 全局变量声明
let activeCharacterPhoneId = null;
let newAppWallpaperBase64 = null;
let activeCharPhonePresetId = null; // 角色手机外观预设ID

/**
 * 【全新】一个专门清除HTML标签和代码的函数
 * @param {string} text - 包含HTML或代码的原始文本
 * @returns {string} - 清理后的纯文本
 */
function stripHtmlAndCode(text) {
    if (!text || typeof text !== 'string') {
        return ''; // 如果输入为空或不是字符串，返回空字符串
    }
    // 1. 移除所有HTML标签 (例如 <b>, <div>)
    let cleanedText = text.replace(/<\/?[^>]+(>|$)/g, '');

    // 2. 移除所有Markdown代码块 (例如 ```code``` 或 `code`)
    cleanedText = cleanedText.replace(/```[\s\S]*?```/g, ''); // 移除多行代码块
    cleanedText = cleanedText.replace(/`[^`]*`/g, ''); // 移除行内代码

    // 3. 将HTML实体 (例如 &lt; &gt;) 转换回正常字符 (< >)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanedText;

    return tempDiv.textContent || tempDiv.innerText || '';
}

// APP 定义
const CHAR_PHONE_APPS = [
    {
        id: "chat",
        name: "微信",
        screen: "character-chat-list-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#4CAF50"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.94 1.28 5.58 3.34 7.42c-.22 1.4-.89 3.1-1.25 3.82c-.36.72.48 1.39 1.05.94c.82-.67 2.43-1.88 3.3-2.58C9.44 21.78 10.68 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm3.5 10.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>`,
    },
    {
        id: "cart",
        name: "购物车",
        screen: "character-shopping-cart-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#F44336"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2s-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2s2-.9 2-2s-.9-2-2-2zm-15-14h3.27l.94 2H20c.69 0 1.25.56 1.25 1.25c0 .09-.02.18-.04.27l-3.58 6.49c-.25.44-.73.74-1.26.74H8.52l-.94-2H4.27V4H2V2h3.27z"/></svg>`,
    },
    {
        id: "memos",
        name: "备忘录",
        screen: "character-memos-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#FFC107"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    },
    {
        id: "browser",
        name: "浏览器",
        screen: "character-browser-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#2196F3"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1.5-12.5l3 7.5 7.5-3-7.5-3z"/></svg>`,
    },
    {
        id: "album",
        name: "相册",
        screen: "character-album-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#8BC34A"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>`,
    },
    {
        id: "bank",
        name: "钱包",
        screen: "character-bank-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#E91E63"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
    },
    {
        id: "trajectory",
        name: "足迹",
        screen: "character-trajectory-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#795548"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
    },
    {
        id: "app_usage",
        name: "使用记录",
        screen: "character-app-usage-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#607D8B"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8zm.5-13H11v6l5.25 3.15l.75-1.23l-4.5-2.67z"/></svg>`,
    },
    {
        id: "diary",
        name: "日记",
        screen: "character-diary-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#009688"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83l3.75 3.75 1.83-1.83z"/></svg>`,
    },
    {
        id: "appearance",
        name: "外观设置",
        screen: "character-phone-appearance-screen",
        svg: `<svg viewBox="0 0 24 24" fill="#9C27B0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.17 14.34c-.21.21-.46.32-.71.32s-.5-.11-.71-.32l-1.41-1.41c-.2-.2-.31-.45-.31-.71 0-.26.11-.51.31-.71l1.41-1.41c.2-.2.45-.31.71-.31s.51.11.71.31l1.41 1.41c.4.4.4 1.04 0 1.41l-1.41 1.41zm3.34-5.34c-.21.21-.46.32-.71.32s-.5-.11-.71-.32L11.41 8.5c-.2-.2-.31-.45-.31-.71 0-.26.11-.51.31-.71l1.41-1.41c.2-.2.45-.31.71-.31s.51.11.71.31l1.41 1.41c.4.4.4 1.04 0 1.41l-1.41 1.41zm3.34 5.34c-.21.21-.46.32-.71.32s-.5-.11-.71-.32l-1.41-1.41c-.4-.4-.4-1.04 0-1.41l1.41-1.41c.2-.2.45-.31.71-.31s.51.11.71.31l1.41 1.41c.2.2.31.45.31.71 0 .26-.11.51-.31.71l-1.41 1.41z"/></svg>`,
    },
];

// --- 工具函数 ---

/**
 * 【辅助函数】将时长字符串（如“2.5小时”）转换为分钟数
 */
function parseDurationToMinutes(durationString) {
    if (!durationString) return 0;
    const num = parseFloat(durationString) || 0;
    if (durationString.includes("小时") || durationString.includes("h")) {
        return num * 60;
    }
    // 默认单位是分钟
    return num;
}

function formatMinutesToDuration(totalMinutes) {
    if (totalMinutes < 1) return '不到1分钟';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0 && minutes > 0) {
        return `${hours}小时${minutes}分钟`;
    } else if (hours > 0) {
        return `${hours}小时`;
    } else {
        return `${minutes}分钟`;
    }
}

function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return -1; // 错误或无效输入返回-1

    let hours = 0;
    let minutes = 0;

    // 匹配 "HH:mm" 或 "H:mm" 格式
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
    } else {
        // 如果不是标准格式，尝试匹配中文描述
        const numMatch = timeStr.match(/(\d+)/);
        const num = numMatch ? parseInt(numMatch[0], 10) : -1;

        if (num !== -1) {
            if (timeStr.includes('下午') || timeStr.includes('晚上')) {
                // 下午1点(13点)到晚上11点(23点)
                if (num < 12) {
                    hours = num + 12;
                } else {
                    hours = num; // 如果已经是24小时制如“晚上20点”，直接使用
                }
            } else {
                // 早上或上午
                hours = num;
            }
        } else {
            return -1; // 无法解析
        }
    }

    // 处理特殊情况，如晚上12点应为0点
    if ((timeStr.includes('晚上') || timeStr.includes('凌晨')) && hours === 12) {
        hours = 0;
    }
    // 处理下午12点应为12点
    if ((timeStr.includes('下午') || timeStr.includes('中午')) && hours === 24) {
        hours = 12;
    }

    return hours * 60 + minutes;
}

/**
 * 将Markdown文本安全地渲染为HTML
 * @param {string} markdownText - 原始的Markdown文本
 * @returns {string} - 处理和净化后的安全HTML字符串
 */
function renderMarkdown(markdownText) {
    if (!markdownText) return "";

    // 1. 支持自定义的“遮挡/剧透”语法 ||spoiler||
    // 我们在 marked.js 处理之前，手动把 ||text|| 替换成带特定class的HTML标签
    let processedText = markdownText.replace(
        /\|\|(.*?)\|\|/g,
        '<span class="spoiler">$1</span>'
    );

    // 2. 使用 marked.js 将Markdown转换为HTML
    // gfm: true 开启GitHub风格的Markdown，支持删除线等
    // breaks: true 让回车符也能变成<br>，更符合聊天习惯
    let rawHtml = marked.parse(processedText, {
        gfm: true,
        breaks: true,
    });

    // 3. 使用 DOMPurify 清洗HTML，防止XSS攻击
    let sanitizedHtml = DOMPurify.sanitize(rawHtml);

    return sanitizedHtml;
}

// --- 核心功能函数 ---

async function openCharacterSelectionScreen() {
    await renderCharacterSelectionScreen();
    showScreen("character-selection-screen");
}

/**
 * 渲染角色选择列表
 */
async function renderCharacterSelectionScreen() {
    const listEl = document.getElementById("character-selection-list");
    listEl.innerHTML = "";
    const characters = Object.values(state.chats).filter(
        (chat) => !chat.isGroup
    );

    if (characters.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">还没有可以查看的角色</p>';
        return;
    }

    characters.forEach((char) => {
        const item = document.createElement("div");
        item.className = "character-select-item";
        item.dataset.chatId = char.id;
        item.innerHTML = `
        <img src="${char.settings.aiAvatar || defaultAvatar}" alt="${char.name}">
        <span class="name">${char.name}</span>
    `;
        listEl.appendChild(item);
    });
}

/**
 * 将指定的App内壁纸应用到角色手机屏幕
 */
function applyCharPhoneAppWallpaper() {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    const innerScreen = document.querySelector(
        ".character-phone-inner-screen"
    );
    if (!innerScreen || !chat) return;

    const appWallpaperUrl = chat.characterPhoneData.appWallpaper;

    if (appWallpaperUrl) {
        innerScreen.style.backgroundImage = `url(${appWallpaperUrl})`;
        innerScreen.classList.add("has-app-wallpaper");
    } else {
        innerScreen.style.backgroundImage = "none";
        innerScreen.classList.remove("has-app-wallpaper");
    }
}

/**
 * 处理角色手机App内壁纸的更换和移除
 * @param {string} newUrl - 新的壁纸URL，如果为空字符串则表示移除
 */
async function handleCharPhoneAppWallpaperChange(newUrl) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    chat.characterPhoneData.appWallpaper = newUrl;
    await db.chats.put(chat);

    // 立即应用壁纸
    applyCharPhoneAppWallpaper();

    // 刷新设置页面的预览
    renderCharPhoneAppearanceScreen();

    alert(newUrl ? "App 内壁纸已更新！" : "App 内壁纸已移除！");
}

function openCharacterPhone(chatId) {
    activeCharacterPhoneId = chatId;
    const chat = state.chats[chatId];
    if (!chat) return;

    document.getElementById(
        "character-phone-owner-name"
    ).textContent = `${chat.name}的手机`;

    const phoneHomeScreen = document.getElementById(
        "character-phone-screen"
    );
    const wallpaperUrl = chat.characterPhoneData.wallpaper;
    const isDarkMode = document
        .getElementById("phone-screen")
        .classList.contains("dark-mode");

    if (wallpaperUrl) {
        phoneHomeScreen.style.backgroundImage = `url(${wallpaperUrl})`;
        phoneHomeScreen.style.backgroundColor = "transparent";
        phoneHomeScreen.style.backgroundSize = "cover";
        phoneHomeScreen.style.backgroundPosition = "center";
    } else {
        phoneHomeScreen.style.backgroundImage = "none";
        phoneHomeScreen.style.backgroundColor = isDarkMode
            ? "#000000"
            : "#f0f2f5";
    }

    // --- 渲染小组件图片 ---
    const widgets = chat.characterPhoneData.widgets || {};
    document.getElementById("char-phone-widget-img-1").src =
        widgets.widget1_url || "";
    document.getElementById("char-phone-widget-img-2").src =
        widgets.widget2_url || "";

    renderCharacterAppGrid();

    showScreen("character-phone-container");
    showCharacterPhonePage("character-phone-screen");
    applyCharPhoneAppWallpaper();
}

function renderCharacterAppGrid() {
    const gridEl = document.getElementById("character-app-grid");
    gridEl.innerHTML = "";
    if (!activeCharacterPhoneId) return;

    const chat = state.chats[activeCharacterPhoneId];
    const customIcons = chat.characterPhoneData.appIcons || {};

    CHAR_PHONE_APPS.forEach((app) => {
        const iconEl = document.createElement("div");
        iconEl.className = "app-icon";

        const customIconUrl = customIcons[app.id];

        let iconBgStyle =
            "display: flex; justify-content: center; align-items: center; padding: 12px;";
        let iconHtml;

        if (customIconUrl) {
            // 如果有自定义图标URL...
            // 1. 覆盖掉 .icon-bg 的样式，移除内边距和背景色
            iconBgStyle = "padding: 0; background-color: transparent;";
            // 2. iconHtml 直接变成一个带有圆角的图片
            iconHtml = `<img src="${customIconUrl}" style="width:100%; height:100%; object-fit:cover; border-radius: 18px;">`;
        } else {
            // 否则，使用默认的SVG
            iconHtml = app.svg;
        }

        iconEl.innerHTML = `
        <div class="icon-bg" style="${iconBgStyle}">
            ${iconHtml}
        </div>
        <span class="label">${app.name}</span>
    `;

        iconEl.addEventListener("click", () => {
            if (app.id === "appearance") {
                openCharPhoneAppearanceSettings();
            } else {
                switch (app.id) {
                    case "chat":
                        renderCharacterChatList();
                        break;
                    case "cart":
                        renderCharacterShoppingCart();
                        break;
                    case "memos":
                        renderCharacterMemos();
                        break;
                    case "browser":
                        renderCharacterBrowser();
                        break;
                    case "album":
                        renderCharacterPhotoAlbum();
                        break;
                    case "bank":
                        renderCharacterBank();
                        break;
                    case "trajectory":
                        renderCharacterTrajectory();
                        break;
                    case "app_usage":
                        renderCharacterAppUsage();
                        break;
                    case "diary":
                        renderCharacterDiary();
                        break;
                }
                showCharacterPhonePage(app.screen);
            }
        });
        gridEl.appendChild(iconEl);
    });
}

/**
 * 打开生成聊天对象的选择弹窗
 */
function openChatGenerationModal() {
    const listEl = document.getElementById("chat-gen-list");
    listEl.innerHTML = "";

    if (!activeCharacterPhoneId) return;
    const currentChat = state.chats[activeCharacterPhoneId];

    // 1. 重置 UI 状态
    const randomCheckbox = document.getElementById(
        "chat-gen-random-checkbox"
    );
    randomCheckbox.checked = true; // 默认随机
    listEl.style.opacity = "0.5";
    listEl.style.pointerEvents = "none";

    // 2. 收集所有可选项 (NPC + 其他主角)
    const options = [];

    // A. 当前角色的 NPC 库
    if (currentChat.npcLibrary) {
        currentChat.npcLibrary.forEach((npc) => {
            options.push({
                type: "NPC",
                name: npc.name,
                persona: npc.persona,
                avatar: npc.avatar || defaultGroupMemberAvatar,
            });
        });
    }

    // B. 其他主角 (state.chats 里的单聊角色，排除自己)
    Object.values(state.chats).forEach((otherChat) => {
        if (!otherChat.isGroup && otherChat.id !== currentChat.id) {
            options.push({
                type: "角色",
                name: otherChat.name,
                persona: otherChat.settings.aiPersona,
                avatar: otherChat.settings.aiAvatar || defaultAvatar,
            });
        }
    });

    if (options.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; padding:20px; color:#888;">暂无可选角色/NPC，请使用随机模式。</p>';
    } else {
        options.forEach((opt) => {
            const item = document.createElement("div");
            item.className = "contact-picker-item"; // 复用现有的样式
            // 将人设经过简单处理存入 dataset (避免太长或有特殊字符)
            const safePersona = (opt.persona || "").replace(/"/g, "&quot;");

            item.innerHTML = `
                <input type="checkbox" data-name="${opt.name}" data-persona="${safePersona}" style="margin-right: 10px;">
                <img src="${opt.avatar}" class="avatar">
                <div style="display:flex; flex-direction:column;">
                    <span class="name">${opt.name}</span>
                    <span style="font-size:12px; color:#888;">${opt.type}</span>
                </div>
            `;

            // 点击整行触发 checkbox
            item.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT") {
                    const cb = item.querySelector("input");
                    cb.checked = !cb.checked;
                }
            });

            listEl.appendChild(item);
        });
    }

    document
        .getElementById("chat-gen-selector-modal")
        .classList.add("visible");
}

/**
 * 为“查手机”功能单独生成某一项数据的通用函数
 * @param {string} dataType - 要生成的数据类型 (例如: 'diary', 'chats', 'shoppingCart')
 */
async function generateCharacterPhoneDataSegment(
    dataType,
    specificTargets = null
) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    const dataTypeMap = {
        chats: {
            description: `2到5段你与【不同的】NPC朋友们的【全新的或接续上文的】聊天记录。`,
            jsonStructure: `"chats": [\n    {\n      "contactName": "【NPC朋友A的名字】",\n      "messages": [\n        {"sender": "【联系人名A】", "content": "消息内容1..."},\n        {"sender": "${chat.name}", "content": "你的回复1..."}\n      ]\n    },\n    {\n      "contactName": "【NPC朋友B的名字】",\n      "messages": [\n        {"sender": "【联系人名B】", "content": "消息内容1..."},\n        {"sender": "${chat.name}", "content": "你的回复1..."}\n      ]\n    }\n  ]`,
        },
        shoppingCart: {
            description: "3到5件你最近加入购物车的新商品。",
            jsonStructure: `"shoppingCart": [\n    {"name": "商品名1", "price": 123.45, "store": "店铺名"},\n    {"name": "商品名2", "price": 67.89, "store": "店铺名"}\n  ]`,
        },
        memos: {
            description: "2到3篇你新写的简短备忘录。",
            jsonStructure: `"memos": [\n    {"title": "备忘录标题1", "content": "备忘录详细内容1..."},\n    {"title": "备忘录标题2", "content": "备忘录详细内容2..."}\n  ]`,
        },
        browserHistory: {
            description: "2到3条你最近的浏览器搜索记录或浏览的文章。",
            jsonStructure: `"browserHistory": [\n    {"query": "搜索标题1", "result": "模拟文章内容1..."},\n    {"query": "搜索标题2", "result": "模拟文章内容2..."}\n  ]`,
        },
        photoAlbum: {
            description: "2到3张你“拍摄”的新照片的文字描述（用于文字生图）。",
            jsonStructure: `"photoAlbum": [\n    {"hiddenContent": "对新照片画面1的详细文字描述..."},\n    {"hiddenContent": "对新照片画面2的详细文字描述..."}\n  ]`,
        },
        bank: {
            description: "3到5条你最近的银行交易记录（收入或支出）。",
            jsonStructure: `"bank": {\n    "transactions": [\n      {"type": "收入或支出", "amount": 123.45, "description": "交易描述1"},\n      {"type": "收入或支出", "amount": 67.89, "description": "交易描述2"}\n    ]\n  }`,
        },
        trajectory: {
            description: "2到3条你最近的行动轨迹记录。",
            jsonStructure: `"trajectory": [\n    {"time": "时间段1", "location": "地点1", "activity": "干了什么事1"},\n    {"time": "时间段2", "location": "地点2", "activity": "干了什么事2"}\n  ]`,
        },
        appUsage: {
            description: "3到5条你最近的应用使用记录。",
            jsonStructure: `"appUsage": [\n    {"appName": "应用名1", "duration": "使用时长1"},\n    {"appName": "应用名2", "duration": "使用时长2"}\n  ]`,
        },
        diary: {
            description: `一篇全新的日记。`,
            jsonStructure: `"diary": [\n    {"timestamp": ${Date.now()}, "content": "【用Markdown语法写一篇符合人设和情景的新日记】"}\n  ]`,
        },
    };

    const dataTypeInfo = dataTypeMap[dataType];
    if (!dataTypeInfo) {
        console.error("请求了无效的数据生成类型:", dataType);
        return;
    }

    // 动态修改dataTypeInfo，以适应不同情况
    let finalDataTypeInfo = { ...dataTypeInfo };

    // --- 特殊处理：指定了聊天对象 ---
    // 只有当 dataType 是 'chats' 且 specificTargets 存在时才触发
    let specificPromptInject = "";

    if (
        dataType === "chats" &&
        specificTargets &&
        specificTargets.length > 0
    ) {
        // [修复] 确保所有目标都有人设，如果是空的则尝试重新从state.chats查找
        specificTargets.forEach(t => {
            if (!t.persona || t.persona.trim() === "") {
                const foundChat = Object.values(state.chats).find(c => c.name === t.name);
                if (foundChat) {
                    t.persona = foundChat.settings?.aiPersona || foundChat.settings?.persona || "";
                }
            }
        });

        // 1. 修改任务描述
        const targetNames = specificTargets.map((t) => t.name).join("、");
        finalDataTypeInfo.description = `你与指定联系人【${targetNames}】的聊天记录。`;

        // 2. 构建强制性 Prompt 上下文
        specificPromptInject = `
                        # 【【【指定生成指令】】】
                        用户指定了你必须生成与以下角色的对话。你【必须】为列表中的**每一位**角色生成一段独立的对话，不能遗漏，也不能编造列表以外的人。

                        # 指定角色列表
                        ${specificTargets
                .map((t) => `- **${t.name}**: ${t.persona}`)
                .join("\n")}

                        # 格式要求
                        请在返回的 JSON "chats" 数组中，严格按照上述指定的 "contactName" 生成对应的聊天记录。
                    `;
        // 3. 修改 JSON 结构提示，引导AI生成正确的数量
        finalDataTypeInfo.jsonStructure =
            `"chats": [\n` +
            specificTargets
                .map(
                    (t) =>
                        `    { "contactName": "${t.name}", "messages": [\n        {"sender": "${t.name}", "content": "消息内容1..."},\n        {"sender": "${chat.name}", "content": "你的回复1..."}\n] }`
                )
                .join(",\n") +
            `\n  ]`;
    }

    if (dataType === "bank") {
        const hasExistingTransactions =
            chat.characterPhoneData?.bank?.transactions?.length > 0;

        if (!hasExistingTransactions) {
            // 如果是第一次生成，就修改指令，要求AI提供初始余额
            finalDataTypeInfo.description =
                "一个符合你人设的【初始银行余额】，以及3到5条初始交易记录。";
            finalDataTypeInfo.jsonStructure = `"bank": {\n    "balance": 12345.67,\n    "transactions": [\n      {"type": "收入或支出", "amount": 123.45, "description": "交易描述1"}\n    ]\n  }`;
        } else {
            // 如果是后续生成，就告诉AI当前余额，只要求新交易
            const currentBalance = (
                chat.characterPhoneData.bank.balance || 0
            ).toFixed(2);
            finalDataTypeInfo.description = `3到5条【全新的】银行交易记录（收入或支出）。【提示：你当前的余额是 ${currentBalance} 元，请在此基础上生成合理的交易】`;
            // 此时的JSON结构不需要balance字段
            finalDataTypeInfo.jsonStructure = `"bank": {\n    "transactions": [\n      {"type": "收入或支出", "amount": 123.45, "description": "交易描述1"}\n    ]\n  }`;
        }
    }

    showGenerationOverlay("正在同步Ta的手机数据...");

    try {
        const userNickname = state.qzoneSettings.nickname || "我";
        const persona = (chat.settings.aiPersona || "").substring(0, 4000);
        // updated by lrq 251028 修改最大记忆条数
        const maxMemory = chat.settings.maxMemory || 20;
        const recentHistory = chat.history
            .slice(-maxMemory)
            .map((msg) => {
                const sender = msg.role === "user" ? userNickname : chat.name;
                return `${sender}: ${msg.content}`;
            })
            .join("\n");

        // added by lrq 251028 添加记忆互通的聊天记录作为参考
        let linkedMemoryContext = "";
        if (
            chat.settings.linkedMemories &&
            chat.settings.linkedMemories.length > 0
        ) {
            const contextPromises = chat.settings.linkedMemories.map(
                async (link) => {
                    const linkedChat = state.chats[link.chatId];
                    if (!linkedChat) return "";

                    const freshLinkedChat = await db.chats.get(link.chatId);
                    if (!freshLinkedChat) return "";

                    const recentHistory = freshLinkedChat.history
                        .filter((msg) => !msg.isHidden)
                        .slice(-link.depth);

                    if (recentHistory.length === 0) return "";

                    const formattedMessages = recentHistory
                        .map(
                            (msg) =>
                                `  - ${formatMessageForContext(msg, freshLinkedChat)}`
                        )
                        .join("\n");

                    return `\n## 附加上下文：来自与“${linkedChat.name}”的最近对话内容 (仅你可见)\n${formattedMessages}`;
                }
            );

            const allContexts = await Promise.all(contextPromises);
            linkedMemoryContext = allContexts.filter(Boolean).join("\n");
        }

        let worldBookContext = "";
        if (
            chat.settings.linkedWorldBookIds &&
            chat.settings.linkedWorldBookIds.length > 0
        ) {
            worldBookContext =
                "--- 世界观设定 (必须严格遵守) ---\n" +
                chat.settings.linkedWorldBookIds
                    .map((id) => {
                        const book = state.worldBooks.find((b) => b.id === id);
                        return book ? `[${book.name}]: ${book.content}` : "";
                    })
                    .join("\n\n");
        }

        const npcLibrary = chat.npcLibrary || [];
        let npcContext = "";
        // 如果有指定对象，就【不使用】默认的 NPC 随机列表，避免混淆
        if (!specificPromptInject) {
            // 只有在随机模式（specificPromptInject 为空）时，才提供默认 NPC 列表供 AI 随机选
            if (npcLibrary.length > 0) {
                npcContext =
                    "# 你的专属NPC好友列表 (你必须从中随机选择2-3位朋友进行对话)\n" +
                    npcLibrary
                        .map((npc) => `- **${npc.name}**: ${npc.persona}`)
                        .join("\n");
            } else {
                npcContext =
                    "# 你的专属NPC好友列表\n(你当前没有专属NPC，请虚构2-3个普通朋友并生成对话)";
            }
        }
        else {
            npcContext = specificPromptInject;
        }

        let npcChatHistoryContext = "";
        const existingNpcChats = Object.entries(
            chat.characterPhoneData.chats || {}
        ).filter(
            ([name, chatData]) =>
                chatData.history && chatData.history.length > 0
        );
        if (existingNpcChats.length > 0) {
            npcChatHistoryContext +=
                "\n\n# 已有的聊天记录摘要 (请在此基础上继续对话)\n";
            existingNpcChats.forEach(([contactName, chatData]) => {
                const recentMessages = chatData.history
                    .slice(-5)
                    .map((msg) => `  - ${msg.sender}: ${msg.content}`)
                    .join("\n");
                npcChatHistoryContext += `\n## 你和“${contactName}”的最近对话:\n${recentMessages}\n`;
            });
        }

        // 使用修改后的 finalDataTypeInfo 来构建Prompt
        const prompt = `
                        # 任务
                        你现在是角色 "${chat.name}"。请根据你的信息和最近的聊天记录，【只生成一项】你手机中的新数据。
                        具体任务是：生成${finalDataTypeInfo.description}

                        # 【【【情景一致性铁律】】】
                        你生成的所有数据（尤其是"trajectory"行动轨迹）**必须**与“最近聊天记录摘要”中提到的最新情景保持绝对一致。
                        当生成 "bank" 数据时，你的交易记录【绝对不能】包含与用户("${userNickname}")的转账或收款。所有交易都应是你与其他NPC或商家的。
                        # 【【【绝对禁止事项】】】
                        在生成 "chats" 数据时，**绝对不允许**让用户（${userNickname}）出现在你与其他NPC的对话中。


                        # 【【【重要指令：关于聊天记录生成】】】
                        - 你正在创作一段对话。提供的聊天记录是上下文，你【绝对不能】重复或改写其中的任何内容。你的生成必须从【全新的、下一条】消息开始。
                        - 如果指定了对话对象，你【必须】为列表中的【每一个NPC】都生成一段与你（${chat.name}）的对话。
                        - 如果列表为空，你可以虚构2-3个普通朋友并生成对话。
                        - 你必须为每个联系人生成一段【至少包含5条消息】的对话。
                        - 对话内容应该自然流畅，可以包含连续发言、表情包和表情符号等，以体现真实感。
                        - 不要只生成一问一答的机械式对话。
                        -   **【【【绝对禁止重复铁律】】】**: 你生成的 "messages"数组中，【绝对不能】包含我提供给你的上下文里的任何一条消息。你的第一条消息必须是对话历史中最后一条消息的【下一条】。
                        # 你的信息
                        - 你的名字: ${chat.name}
                        - 你的人设: ${persona}
                        ${worldBookContext}
                        # 和${userNickname}的最近聊天记录摘要
                        ${recentHistory}
                        ${linkedMemoryContext}
                        ${npcContext}
                        ${npcChatHistoryContext}

                        # JSON输出格式 (必须严格遵守，只包含你被要求的那个键)
                        {
                        ${finalDataTypeInfo.jsonStructure}
                        }
                        `;
        console.log("prompt:", prompt);
        const { proxyUrl, apiKey, model } = state.apiConfig;
        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(
            model,
            apiKey,
            prompt,
            [{ role: "user", content: prompt }],
            isGemini
        );

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: parseFloat(state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) {
            let errorMsg = `API请求失败: ${response.status
                } - ${await response.text()}`;
            throw new Error(errorMsg);
        }

        const data = await response.json();
        const aiResponseContent = (
            isGemini
                ? data.candidates[0].content.parts[0].text
                : data.choices[0].message.content
        ).replace(/^```json\s*|```$/g, "");

        const newData = JSON.parse(aiResponseContent);

        let phoneData = chat.characterPhoneData;
        phoneData.lastGenerated = Date.now();
        let updateSuccess = false;

        if (newData && newData[dataType]) {
            if (dataType === "bank" && newData.bank.transactions) {
                if (!phoneData.bank)
                    phoneData.bank = { balance: 0, transactions: [] };
                if (typeof phoneData.bank.balance !== "number")
                    phoneData.bank.balance = 0;
                (newData.bank.transactions || []).forEach((transaction) => {
                    const amount = parseFloat(transaction.amount);
                    if (!isNaN(amount)) {
                        if (transaction.type === "收入")
                            phoneData.bank.balance += amount;
                        else if (transaction.type === "支出")
                            phoneData.bank.balance -= amount;
                    }
                });
                phoneData.bank.transactions.push(
                    ...(newData.bank.transactions || [])
                );
                if (typeof newData.bank.balance === "number") {
                    phoneData.bank.balance = newData.bank.balance;
                }
                updateSuccess = true;
            } else if (dataType === "chats" && newData.chats) {
                newData.chats.forEach((newChat) => {
                    if (!newChat.messages) return;
                    const contactName = newChat.contactName;
                    if (
                        phoneData.chats[contactName] &&
                        phoneData.chats[contactName].history
                    ) {
                        phoneData.chats[contactName].history.push(
                            ...newChat.messages
                        );
                    } else {
                        phoneData.chats[contactName] = {
                            avatar: newChat.avatar,
                            history: newChat.messages,
                        };
                    }
                });
                updateSuccess = true;
            } else if (
                dataType === "appUsage" &&
                Array.isArray(newData.appUsage)
            ) {
                const usageMap = new Map();
                (phoneData.appUsage || []).forEach((item) => {
                    usageMap.set(
                        item.appName,
                        (usageMap.get(item.appName) || 0) +
                        parseDurationToMinutes(item.duration)
                    );
                });
                newData.appUsage.forEach((item) => {
                    usageMap.set(
                        item.appName,
                        (usageMap.get(item.appName) || 0) +
                        parseDurationToMinutes(item.duration)
                    );
                });
                const mergedUsage = [];
                for (const [appName, totalMinutes] of usageMap.entries()) {
                    mergedUsage.push({
                        appName: appName,
                        duration: formatMinutesToDuration(totalMinutes),
                    });
                }
                phoneData.appUsage = mergedUsage;
                updateSuccess = true;
            } else if (Array.isArray(phoneData[dataType])) {
                phoneData[dataType].push(...(newData[dataType] || []));
                updateSuccess = true;
            }
        }

        if (!updateSuccess) {
            throw new Error(
                `AI返回的JSON中缺少'${dataType}'字段或格式不正确。`
            );
        }

        await db.chats.put(chat);
        alert(
            `“${chat.name}”的${dataTypeMap[dataType].description.split("。")[0]
            }已更新！`
        );

        switch (dataType) {
            case "chats":
                renderCharacterChatList();
                break;
            case "shoppingCart":
                renderCharacterShoppingCart();
                break;
            case "memos":
                renderCharacterMemos();
                break;
            case "browserHistory":
                renderCharacterBrowser();
                break;
            case "photoAlbum":
                renderCharacterPhotoAlbum();
                break;
            case "bank":
                renderCharacterBank();
                break;
            case "trajectory":
                renderCharacterTrajectory();
                break;
            case "appUsage":
                renderCharacterAppUsage();
                break;
            case "diary":
                renderCharacterDiary();
                break;
        }
    } catch (error) {
        console.error(`生成角色手机数据(${dataType})失败:`, error);
        await showCustomAlert(
            "生成失败",
            `发生了一个错误：\n\n${error.message}`
        );
    } finally {
        document
            .getElementById("generation-overlay")
            .classList.remove("visible");
    }
}

/**
 * 处理“查手机”各个APP页面“全部删除”功能的通用函数
 * @param {string} dataType - 要清空的数据类型，例如 'shoppingCart', 'memos', 'bank.transactions'
 */
async function handleClearCharacterDataSegment(dataType) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    // 为不同数据类型设置更人性化的提示文本
    const dataTypeMap = {
        chats: { name: "NPC聊天记录", dataKey: "chats" },
        shoppingCart: { name: "购物车", dataKey: "shoppingCart" },
        memos: { name: "备忘录", dataKey: "memos" },
        browserHistory: { name: "浏览器历史", dataKey: "browserHistory" },
        photoAlbum: { name: "相册", dataKey: "photoAlbum" },
        "bank.transactions": { name: "交易记录", dataKey: "bank" },
        trajectory: { name: "足迹", dataKey: "trajectory" },
        appUsage: { name: "使用记录", dataKey: "appUsage" },
        diary: { name: "日记", dataKey: "diary" },
    };

    const info = dataTypeMap[dataType];
    if (!info) {
        console.error("未知的清空数据类型:", dataType);
        return;
    }

    // 弹出确认框
    const confirmed = await showCustomConfirm(
        `确认清空`,
        `确定要清空“${chat.name}”手机里的所有【${info.name}】吗？此操作不可恢复。`,
        { confirmButtonClass: "btn-danger" }
    );

    if (!confirmed) return;

    try {
        if (dataType === "chats") {
            // 特殊处理：清空所有NPC聊天（不包括和user的）
            chat.characterPhoneData.chats = {};
        } else if (dataType === "bank.transactions") {
            // 特殊处理：清空银行交易记录，【同时将余额归零】
            if (chat.characterPhoneData.bank) {
                chat.characterPhoneData.bank.transactions = [];

                chat.characterPhoneData.bank.balance = 0;
            }
        } else if (chat.characterPhoneData[info.dataKey]) {
            // 通用处理：清空数组
            chat.characterPhoneData[info.dataKey] = [];
        }

        // 保存到数据库
        await db.chats.put(chat);

        // 刷新当前页面
        switch (dataType) {
            case "chats":
                renderCharacterChatList();
                break;
            case "shoppingCart":
                renderCharacterShoppingCart();
                break;
            case "memos":
                renderCharacterMemos();
                break;
            case "browserHistory":
                renderCharacterBrowser();
                break;
            case "photoAlbum":
                renderCharacterPhotoAlbum();
                break;
            case "bank.transactions":
                renderCharacterBank();
                break;
            case "trajectory":
                renderCharacterTrajectory();
                break;
            case "appUsage":
                renderCharacterAppUsage();
                break;
            case "diary":
                renderCharacterDiary();
                break;
        }

        alert(`已成功清空所有${info.name}。`);
    } catch (error) {
        console.error(`清空 ${info.name} 时出错:`, error);
        await showCustomAlert(
            "操作失败",
            `清空时发生错误: ${error.message}`
        );
    }
}

/**
 * 生成角色手机数据
 */
async function generateCharacterPhoneData() {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    showGenerationOverlay("正在同步Ta的手机数据...");

    try {
        const userNickname = state.qzoneSettings.nickname || "我";

        // 限制人设长度，这是防止503错误的根本方法！
        // 只取人设的前4000个字符，避免整个人设过长导致请求失败。
        const persona = (chat.settings.aiPersona || "").substring(0, 4000);

        const recentHistory = chat.history
            .slice(-chat.settings.maxMemory || 20)
            .map((msg) => {
                const sender = msg.role === "user" ? userNickname : chat.name;
                return `${sender}: ${msg.content}`;
            })
            .join("\n");

        console.log("用于生成手机数据的最近聊天记录:", recentHistory);
        // added by lrq 251028 添加记忆互通的聊天记录作为参考
        let linkedMemoryContext = "";
        if (
            chat.settings.linkedMemories &&
            chat.settings.linkedMemories.length > 0
        ) {
            const contextPromises = chat.settings.linkedMemories.map(
                async (link) => {
                    const linkedChat = state.chats[link.chatId];
                    if (!linkedChat) return "";

                    const freshLinkedChat = await db.chats.get(link.chatId);
                    if (!freshLinkedChat) return "";

                    const recentHistory = freshLinkedChat.history
                        .filter((msg) => !msg.isHidden)
                        .slice(-link.depth);

                    if (recentHistory.length === 0) return "";

                    const formattedMessages = recentHistory
                        .map(
                            (msg) =>
                                `  - ${formatMessageForContext(msg, freshLinkedChat)}`
                        )
                        .join("\n");

                    return `\n## 附加上下文：来自与“${linkedChat.name}”的最近对话内容 (仅你可见)\n${formattedMessages}`;
                }
            );

            const allContexts = await Promise.all(contextPromises);
            linkedMemoryContext = allContexts.filter(Boolean).join("\n");
        }
        console.log(
            "用于生成手机数据的互通聊天记录上下文:",
            linkedMemoryContext
        );
        let worldBookContext = "";
        if (
            chat.settings.linkedWorldBookIds &&
            chat.settings.linkedWorldBookIds.length > 0
        ) {
            worldBookContext =
                "--- 世界观设定 (必须严格遵守) ---\n" +
                chat.settings.linkedWorldBookIds
                    .map((id) => {
                        const book = state.worldBooks.find((b) => b.id === id);
                        return book ? `[${book.name}]: ${book.content}` : "";
                    })
                    .join("\n\n");
        }
        const npcLibrary = chat.npcLibrary || [];
        let npcContext = "";
        if (npcLibrary.length > 0) {
            npcContext =
                '# 你的专属NPC好友列表 (你必须在下方"chats"中为他们生成对话)\n' +
                "这些人是你的好朋友，你和他们非常熟悉。请根据他们的人设，生成符合你们关系的、自然的聊天记录。\n" +
                npcLibrary
                    .map((npc) => `- **${npc.name}**: ${npc.persona}`)
                    .join("\n");
        } else {
            npcContext =
                "# 你的专属NPC好友列表\n(你没有专属NPC，请虚构一些普通朋友)";
        }

        let npcChatHistoryContext = "";
        const existingNpcChats = Object.entries(
            chat.characterPhoneData.chats || {}
        ).filter(
            ([name, chatData]) =>
                chatData.history && chatData.history.length > 0
        );

        if (existingNpcChats.length > 0) {
            npcChatHistoryContext +=
                "\n\n# 已有的聊天记录摘要 (请在此基础上继续对话)\n";
            existingNpcChats.forEach(([contactName, chatData]) => {
                const recentMessages = chatData.history
                    .slice(-5)
                    .map((msg) => `  - ${msg.sender}: ${msg.content}`)
                    .join("\n");
                npcChatHistoryContext += `\n## 你和“${contactName}”的最近对话:\n${recentMessages}\n`;
            });
        }

        // 优化提示词，让AI更好地理解任务，并强调情景一致性
        const prompt = `
        # 任务
        【【【情景一致性铁律】】】：你生成的所有数据（尤其是"trajectory"行动轨迹）**必须**与“最近聊天记录摘要”中提到的最新情景保持绝对一致。如果聊天记录显示你正在上课，你的行动轨迹就必须是在教室；如果聊天记录显示你在咖啡馆，你的行动轨迹就必须是咖啡馆。**绝对不能**仅凭你的人设就生成与聊天记录相矛盾的内容。
        你现在是角色 "${chat.name
            }"。请根据你的人设、世界观、NPC好友列表以及和${userNickname}的最近聊天记录，模拟生成你手机中的各项数据。你需要一次性生成所有数据，并严格按照下面的JSON格式返回。

        # 【【【绝对禁止事项：这是必须遵守的安全红线】】】
        1.  在生成JSON数据，特别是chats字段时，**绝对不允许**创建另一个用户（${userNickname}）的虚拟形象或让他/她出现在你与其他NPC的对话中。
        2.  "bank" 字段中的交易记录【绝对不能】涉及用户("${userNickname}")。所有交易都必须是你与其他NPC、商家或因某些事件（如购物、收到工资）产生的。
        3.  chats字段中，与NPC或朋友的聊天记录，其sender或content**绝对不能**包含${userNickname}的名字或代称。
        4.  所有你生成的聊天对话，都必须严格限制在【你(${chat.name
            })】和【另一位NPC/朋友】这**两个人之间**。**严禁**出现任何形式的第三者，尤其是${userNickname}。

        # 你的信息
        - 你的名字: ${chat.name}
        - 你的人设: ${persona}
        ${worldBookContext}
        # 和${userNickname}的最近聊天记录摘要
        ${recentHistory}
        ${linkedMemoryContext}

        ${npcContext}
        ${npcChatHistoryContext}
        # JSON输出格式 (必须严格遵守，不要添加任何额外说明)
        {
          "chats": [
            {
              "contactName": "【这里填写你给${userNickname}的备注名】"
            },
            {
              "contactName": "【这里必须填写上面NPC列表中的一个名字，或一个虚构朋友名】",
              "messages": [
                {"sender": "【联系人名，严禁填写'${userNickname}'】", "content": "消息内容1..."},
                {"sender": "${chat.name}", "content": "你的回复1..."},
                {"sender": "【联系人名，严禁填写'${userNickname}'】", "content": "消息内容2..."},
                {"sender": "【联系人名，严禁填写'${userNickname}'】", "content": "消息内容3..."},
                {"sender": "${chat.name}", "content": "你的回复2..."}
              ]
            }
          ],
          "shoppingCart": [
            {"name": "商品名", "price": 价格, "store": "店铺名"}
          ],
          "memos": [
            {"title": "备忘录标题", "content": "备忘录详细内容..."}
          ],
          "browserHistory": [
            {"query": "搜索或浏览的标题", "result": "【这里是AI生成的、关于这个搜索标题的模拟文章或网页内容】"}
          ],
          "photoAlbum": [
            {"hiddenContent": "对照片画面的详细文字描述"}
          ],
          "bank": {
            "balance": 银行卡余额(数字),
            "transactions": [
              {"type": "收入或支出", "amount": 金额, "description": "交易描述"}
            ]
          },
          "trajectory": [
            {"time": "时间段", "location": "地点", "activity": "干了什么事"}
          ],
          "appUsage": [
            {"appName": "应用名", "duration": "使用时长"}
          ],
          "diary": [
            {"timestamp": ${Date.now()}, "content": "【今天是${new Date().toLocaleString(
                "zh-CN",
                {
                    dateStyle: "full",
                }
            )}，用Markdown语法写一篇符合人设和今天情景的日记】"}
          ]
        }

        # 【【【重要指令：关于聊天记录生成】】】
        - 你正在续写这段对话。你提供的聊天记录是上下文，你【绝对不能】重复或改写其中的任何内容。你的生成必须从【全新的、下一条】消息开始。
        - 你必须严格遵守本提示词最上方的【绝对禁止事项】。
        - 如果“你的专属NPC好友列表”不为空，你【必须】为列表中的【每一个NPC】都生成一段与你（${chat.name
            }）的对话。
        - 如果列表为空，你可以虚构2-3个普通朋友并生成对话。
        - 你必须为每个联系人生成一段【至少包含5条消息】的对话。
        - 对话内容应该自然流畅，可以包含连续发言、表情包和表情符号等，以体现真实感。
        - 不要只生成一问一答的机械式对话。
        -   **【【【绝对禁止重复铁律】】】**: 你生成的 "messages"数组中，【绝对不能】包含我提供给你的上下文里的任何一条消息。你的第一条消息必须是对话历史中最后一条消息的【下一条】。
        `;

        const { proxyUrl, apiKey, model } = state.apiConfig;
        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(
            model,
            apiKey,
            prompt,
            [{ role: "user", content: prompt }],
            isGemini
        );

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: parseFloat(state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) {
            let errorMsg = `API请求失败，状态码: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += `\n错误信息: ${errorData.error.message}`;
            } catch (e) {
                errorMsg += `\n无法解析错误响应体。`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        const aiResponseContent = (
            isGemini
                ? data.candidates[0].content.parts[0].text
                : data.choices[0].message.content
        ).replace(/^```json\s*|```$/g, "");

        let newData;
        try {
            newData = JSON.parse(aiResponseContent);
        } catch (e) {
            throw new Error(
                `AI返回的不是有效的JSON格式，无法解析。\n原始返回内容:\n${aiResponseContent}`
            );
        }

        let phoneData = chat.characterPhoneData;
        phoneData.lastGenerated = Date.now();

        if (newData.chats) {
            newData.chats.forEach((newChat) => {
                if (!newChat.messages) {
                    const myNickname = userNickname || "我";
                    if (!phoneData.chats[myNickname]) {
                        phoneData.chats[myNickname] = { avatar: "", history: [] };
                    }
                    phoneData.chats[myNickname].remarkName = newChat.contactName;
                } else {
                    const contactName = newChat.contactName;
                    if (
                        phoneData.chats[contactName] &&
                        phoneData.chats[contactName].history
                    ) {
                        console.log(
                            `合并聊天记录: 为 "${contactName}" 追加 ${newChat.messages.length} 条新消息。`
                        );
                        phoneData.chats[contactName].history.push(
                            ...newChat.messages
                        );
                    } else {
                        console.log(`创建新聊天: "${contactName}"`);
                        phoneData.chats[contactName] = {
                            avatar: newChat.avatar,
                            history: newChat.messages,
                        };
                    }
                }
            });
        }

        // 正确处理其他数组类型数据
        if (!phoneData.shoppingCart) phoneData.shoppingCart = [];
        phoneData.shoppingCart.push(...(newData.shoppingCart || []));
        if (!phoneData.memos) phoneData.memos = [];
        phoneData.memos.push(...(newData.memos || []));
        if (!phoneData.browserHistory) phoneData.browserHistory = [];
        phoneData.browserHistory.push(...(newData.browserHistory || []));
        if (!phoneData.photoAlbum) phoneData.photoAlbum = [];
        phoneData.photoAlbum.push(...(newData.photoAlbum || []));
        if (!phoneData.trajectory) phoneData.trajectory = [];
        phoneData.trajectory.push(...(newData.trajectory || []));
        if (!phoneData.diary) phoneData.diary = [];
        phoneData.diary.push(...(newData.diary || []));

        if (newData.appUsage && Array.isArray(newData.appUsage)) {
            const usageMap = new Map();
            // 先加载已有的使用记录
            (phoneData.appUsage || []).forEach((item) => {
                usageMap.set(
                    item.appName,
                    (usageMap.get(item.appName) || 0) +
                    parseDurationToMinutes(item.duration)
                );
            });
            // 再累加新生成的使用记录
            newData.appUsage.forEach((item) => {
                usageMap.set(
                    item.appName,
                    (usageMap.get(item.appName) || 0) +
                    parseDurationToMinutes(item.duration)
                );
            });
            // 重新生成合并后的列表
            const mergedUsage = [];
            for (const [appName, totalMinutes] of usageMap.entries()) {
                mergedUsage.push({
                    appName: appName,
                    duration: formatMinutesToDuration(totalMinutes),
                });
            }
            phoneData.appUsage = mergedUsage;
        }

        if (newData.bank) {
            if (!phoneData.bank)
                phoneData.bank = { balance: 0, transactions: [] };
            if (typeof phoneData.bank.balance !== "number")
                phoneData.bank.balance = 0;

            // 如果AI返回了新的总余额 (通常是第一次生成时)，则以此为准
            if (typeof newData.bank.balance === "number") {
                phoneData.bank.balance = newData.bank.balance;
            }

            if (
                newData.bank.transactions &&
                Array.isArray(newData.bank.transactions)
            ) {
                newData.bank.transactions.forEach((transaction) => {
                    const amount = parseFloat(transaction.amount);
                    if (!isNaN(amount)) {
                        // 只有在AI没有直接提供新余额时，我们才根据交易记录自己计算
                        if (typeof newData.bank.balance !== "number") {
                            if (transaction.type === "收入") {
                                phoneData.bank.balance += amount;
                            } else if (transaction.type === "支出") {
                                phoneData.bank.balance -= amount;
                            }
                        }
                    }
                });
                // 将新交易记录追加到历史记录中
                if (!phoneData.bank.transactions)
                    phoneData.bank.transactions = [];
                phoneData.bank.transactions.push(...newData.bank.transactions);
            }
        }

        await db.chats.put(chat);
        alert("数据已刷新！");
    } catch (error) {
        console.error("生成角色手机数据失败:", error);
        await showCustomAlert(
            "生成失败",
            `发生了一个错误，请检查你的网络、API密钥或模型设置。\n\n详细信息:\n${error.message}`
        );
    } finally {
        document
            .getElementById("generation-overlay")
            .classList.remove("visible");
    }
}

/**
 * 清空角色手机数据
 */
async function clearCharacterPhoneData() {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    const confirmed = await showCustomConfirm(
        "确认清空",
        `确定要清空“${chat.name}”的所有手机数据吗？此操作不可恢复。`,
        { confirmButtonClass: "btn-danger" }
    );
    if (confirmed) {
        // 重置为初始状态
        chat.characterPhoneData = {
            lastGenerated: null,
            chats: {},
            shoppingCart: [],
            memos: [],
            browserHistory: [],
            photoAlbum: [],
            bank: { balance: 0, transactions: [] },
            trajectory: [],
            appUsage: [],
            diary: [], // <--- 在这里新增
        };
        await db.chats.put(chat);
        // 重新渲染APP网格，因为点击APP会读取新数据
        renderCharacterAppGrid();
        alert("数据已清空。");
    }
}

/**
 * 渲染角色手机的聊天列表 (支持透明磨砂分组)
 */
function renderCharacterChatList() {
    const listEl = document.getElementById("character-chat-list");
    const characterChat = state.chats[activeCharacterPhoneId];
    if (!characterChat) return;

    const characterChatData = characterChat.characterPhoneData;
    const realChatHistory = characterChat.history;
    listEl.innerHTML = "";

    const npcContainer = document.createElement("div");
    npcContainer.className = "npc-chat-group"; // 给它一个专属的class名

    // 获取 "我" 的备注名
    const userContactInData = characterChatData.chats
        ? Object.values(characterChatData.chats).find(
            (c) => !c.history || c.history.length === 0
        )
        : null;
    const remarkNameForMe = userContactInData
        ? userContactInData.remarkName
        : "我";

    // 渲染与 "我" 的聊天
    const lastMsg = realChatHistory
        .filter((m) => !m.isHidden)
        .slice(-1)[0] || { content: "..." };
    const myChatItem = document.createElement("div");
    myChatItem.className = "chat-list-item"; // 这个是用户自己的消息，单独处理
    myChatItem.dataset.contactName = remarkNameForMe;
    myChatItem.dataset.isUserChat = "true";
    const myAvatar =
        characterChat.settings.myAvatar || defaultMyGroupAvatar;
    myChatItem.innerHTML = `
                    <img src="${myAvatar}" class="avatar" style="border-radius: 6px;">
                    <div class="info">
                        <span class="name">${remarkNameForMe}</span>
                        <div class="last-msg">${stripHtmlAndCode(
        String(lastMsg.content)
    ).substring(0, 30)}</div>
                    </div>
                `;
    listEl.appendChild(myChatItem);

    // 渲染与其他NPC的聊天
    if (characterChatData.chats) {
        for (const contactName in characterChatData.chats) {
            if (contactName === remarkNameForMe) continue;
            const contact = characterChatData.chats[contactName];
            if (!contact.history || contact.history.length === 0) continue;

            const lastNpcMsg = contact.history.slice(-1)[0] || {
                content: "...",
            };
            const npcChatItem = document.createElement("div");
            npcChatItem.className = "chat-list-item";
            npcChatItem.dataset.contactName = contactName;

            let npcAvatarHtml;
            const npcFromLibrary = (characterChat.npcLibrary || []).find(
                (npc) => npc.name === contactName
            );
            if (npcFromLibrary && npcFromLibrary.avatar) {
                npcAvatarHtml = `<img src="${npcFromLibrary.avatar}" class="avatar" style="border-radius: 6px;">`;
            } else {
                const avatarColors = [
                    "#FFC107",
                    "#4CAF50",
                    "#2196F3",
                    "#F44336",
                    "#9C27B0",
                    "#00BCD4",
                ];
                const npcNameInitial = contactName.slice(-1);
                const colorIndex = contactName.length % avatarColors.length;
                const bgColor = avatarColors[colorIndex];
                npcAvatarHtml = `<div class="avatar" style="border-radius: 6px; background-color: ${bgColor}; color: white; display: flex; justify-content: center; align-items: center; font-size: 18px; font-weight: 500;">${npcNameInitial}</div>`;
            }
            npcChatItem.innerHTML = `${npcAvatarHtml}<div class="info"><span class="name">${contactName}</span><div class="last-msg">${stripHtmlAndCode(
                String(lastNpcMsg.content)
            ).substring(0, 30)}</div></div>`;

            // 将NPC消息添加到新的容器中
            npcContainer.appendChild(npcChatItem);
        }
    }

    // 将包含所有NPC消息的容器一次性添加到列表中
    if (npcContainer.hasChildNodes()) {
        listEl.appendChild(npcContainer);
    }
}

/**
 * 渲染角色手机的具体聊天记录 (分页加载)
 */
function renderCharacterChatHistory(
    contactName,
    isUserChat = false,
    loadOffset = 0
) {
    const MESSAGES_PER_PAGE = 50; // 每次加载50条

    const messagesEl = document.getElementById(
        "character-chat-history-messages"
    );
    const characterChat = state.chats[activeCharacterPhoneId];
    if (!characterChat) {
        console.error("【错误】: 找不到 characterChat 对象！");
        return;
    }

    // --- 准备工作：设置标题和头像 (仅在首次加载时执行) ---
    if (loadOffset === 0) {
        messagesEl.innerHTML = ""; // 首次加载才清空
        let finalContactName = contactName;
        if (isUserChat) {
            const myChatData = characterChat.characterPhoneData.chats["我"];
            // 尝试从手机数据里找AI给用户的备注名
            const userContactInData = characterChat.characterPhoneData.chats
                ? Object.values(characterChat.characterPhoneData.chats).find(
                    (c) => !c.history || c.history.length === 0
                )
                : null;
            finalContactName = userContactInData
                ? userContactInData.remarkName
                : "我";
        }
        document.getElementById("character-chat-with-name").textContent =
            finalContactName;
    }

    // --- 数据源选择 ---
    let fullHistory = [];
    if (isUserChat) {
        fullHistory = characterChat.history.filter((m) => !m.isHidden);
    } else {
        const npcChat = characterChat.characterPhoneData.chats[contactName];
        if (npcChat && npcChat.history) {
            fullHistory = npcChat.history;
        }
    }

    // --- 核心分页逻辑 ---
    const totalMessages = fullHistory.length;
    const startIndex = Math.max(
        0,
        totalMessages - MESSAGES_PER_PAGE - loadOffset
    );
    const endIndex = totalMessages - loadOffset;
    const historyToShow = fullHistory.slice(startIndex, endIndex);

    // --- 移除旧的“加载更多”按钮 ---
    const existingLoader = document.getElementById(
        "load-more-messages-btn"
    );
    if (existingLoader) {
        existingLoader.remove();
    }

    // --- 渲染消息 ---
    const fragment = document.createDocumentFragment(); // 使用文档片段提升性能
    const characterName = characterChat.name;

    // (渲染逻辑与之前版本基本相同，只是添加到了 fragment 中)
    historyToShow.forEach((msg, index) => {
        if (msg.isHidden) return;
        const container = document.createElement("div");
        let sender;
        if (isUserChat) {
            sender = msg.role === "user" ? "我" : characterName;
        } else {
            sender = msg.sender;
        }

        const isSentByCharacter = sender === characterName;
        container.className = `character-chat-bubble-container ${isSentByCharacter ? "sent" : "received"
            }`;

        let avatarHtml = "";
        if (isSentByCharacter) {
            avatarHtml = `<img src="${characterChat.settings.aiAvatar || defaultAvatar
                }" class="character-chat-avatar">`;
        } else {
            if (isUserChat) {
                avatarHtml = `<img src="${characterChat.settings.myAvatar || defaultMyGroupAvatar
                    }" class="character-chat-avatar">`;
            } else {
                const npcData = (characterChat.npcLibrary || []).find(
                    (npc) => npc.name === contactName
                );
                if (npcData && npcData.avatar) {
                    avatarHtml = `<img src="${npcData.avatar}" class="character-chat-avatar">`;
                } else {
                    const avatarColors = [
                        "#FFC107",
                        "#4CAF50",
                        "#2196F3",
                        "#F44336",
                        "#9C27B0",
                        "#00BCD4",
                    ];
                    const npcNameInitial = contactName.slice(-1);
                    const colorIndex = contactName.length % avatarColors.length;
                    const bgColor = avatarColors[colorIndex];
                    avatarHtml = `<div class="character-chat-avatar" style="background-color: ${bgColor}; color: white; display: flex; justify-content: center; align-items: center; font-size: 18px; font-weight: 500;">${npcNameInitial}</div>`;
                }
            }
        }

        let contentHtml = "";
        if (
            typeof msg.content === "string" &&
            STICKER_REGEX.test(msg.content)
        ) {
            contentHtml = `<img src="${msg.content}" class="sticker-image" style="max-height: 100px;">`;
        } else {
            contentHtml = msg.content;
        }
        const bubbleHtml = `<div class="character-chat-bubble">${contentHtml}</div>`;
        const originalIndex = startIndex + index; // 计算在完整历史记录中的真实索引
        container.innerHTML = `${avatarHtml}${bubbleHtml}<button class="item-delete-btn message-delete-btn" data-contact-name="${contactName}" data-index="${originalIndex}" data-is-user-chat="${isUserChat}">×</button>`;
        fragment.appendChild(container);
    });

    // --- 决定是否显示“加载更多”按钮 ---
    if (startIndex > 0) {
        const loadMoreBtn = document.createElement("div");
        loadMoreBtn.id = "load-more-messages-btn";
        loadMoreBtn.textContent = "加载更早的消息";
        loadMoreBtn.style.textAlign = "center";
        loadMoreBtn.style.padding = "10px";
        loadMoreBtn.style.color = "#888";
        loadMoreBtn.style.cursor = "pointer";
        loadMoreBtn.style.fontSize = "12px";
        loadMoreBtn.onclick = () => {
            // 记录当前滚动条位置，以便加载后恢复
            const currentScrollHeight = messagesEl.scrollHeight;
            renderCharacterChatHistory(
                contactName,
                isUserChat,
                loadOffset + MESSAGES_PER_PAGE
            );
            // 加载后，将滚动条定位到之前的位置，避免跳动
            messagesEl.scrollTop =
                messagesEl.scrollHeight - currentScrollHeight;
        };
        messagesEl.prepend(loadMoreBtn); // 将按钮添加到顶部
    }

    messagesEl.prepend(fragment); // 将新消息一次性插入到DOM中

    // --- 滚动条定位 ---
    if (loadOffset === 0) {
        // 首次加载，滚动到底部
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
}

function renderCharacterShoppingCart() {
    const listEl = document.getElementById(
        "character-shopping-cart-list"
    );

    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData
            ?.shoppingCart;

    listEl.innerHTML = "";
    if (!items || items.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">购物车是空的</p>';
        return;
    }
    items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "character-cart-item";
        itemEl.innerHTML = `
        <div class="cart-item-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </div>
        <div class="cart-item-info">
            <div class="title">${item.name}</div>
            <div class="store">${item.store}</div>
        </div>
        <div class="cart-item-price">¥ ${item.price.toFixed(2)}</div>
        <button class="item-delete-btn" data-type="shoppingCart" data-index="${index}">×</button>
    `;
        listEl.appendChild(itemEl);
    });
}

function renderCharacterMemos() {
    const listEl = document.getElementById("character-memos-list");

    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData?.memos;

    listEl.innerHTML = "";
    if (!items || items.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">备忘录是空的</p>';
        return;
    }
    items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "character-data-item";
        itemEl.innerHTML = `
        <div class="title">${item.title}</div>
        <div class="content">${item.content}</div>
        <button class="item-delete-btn" data-type="memos" data-index="${index}">×</button>
    `;
        listEl.appendChild(itemEl);
    });
}

/**
 * 在角色手机内部切换页面
 * @param {string} pageId - 要显示的角色手机页面的ID
 */
function showCharacterPhonePage(pageId) {
    // 1. 找到角色手机内部屏幕的所有页面
    const pages = document.querySelectorAll(".character-phone-page");
    // 2. 隐藏所有页面
    pages.forEach((p) => p.classList.remove("active"));
    // 3. 显示目标页面
    const pageToShow = document.getElementById(pageId);
    if (pageToShow) {
        pageToShow.classList.add("active");
    }
}

function renderCharacterBrowser() {
    const listEl = document.getElementById("character-browser-list");

    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData
            ?.browserHistory;

    listEl.innerHTML = "";
    if (!items || items.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">浏览器历史为空</p>';
        return;
    }
    items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "character-browser-item";
        itemEl.innerHTML = `
        <span class="browser-item-icon">🌐</span>
        <div class="title">${item.query}</div>
        <button class="item-delete-btn" data-type="browserHistory" data-index="${index}">×</button>
    `;
        itemEl.addEventListener("click", (e) => {
            if (e.target.classList.contains("item-delete-btn")) return;
            document.getElementById(
                "character-browser-detail-title"
            ).textContent = item.query;
            document.getElementById(
                "character-browser-detail-content"
            ).innerHTML = (item.result || "AI未生成详细内容。").replace(
                /\n/g,
                "<br>"
            );
            showCharacterPhonePage("character-browser-detail-screen");
        });
        listEl.appendChild(itemEl);
    });
}

function renderCharacterPhotoAlbum() {
    const gridEl = document.getElementById("character-album-grid");

    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData?.photoAlbum;

    gridEl.innerHTML = "";
    if (!items || items.length === 0) {
        gridEl.innerHTML =
            '<p style="grid-column: 1 / -1; text-align:center; color: #8a8a8a; margin-top: 50px;">相册里没有照片</p>';
        return;
    }
    items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "character-album-item";
        itemEl.style.position = "relative";
        itemEl.innerHTML = `
        <img src="https://i.postimg.cc/KYr2qRCK/1.jpg" alt="文字图">
        <button class="item-delete-btn" data-type="photoAlbum" data-index="${index}" style="top: 10px; right: 10px; z-index: 1;">×</button>
    `;
        itemEl.addEventListener("click", (e) => {
            if (e.target.classList.contains("item-delete-btn")) return;
            showCustomAlert("图片内容", item.hiddenContent);
        });
        gridEl.appendChild(itemEl);
    });
}

/**
 * 渲染角色手机 - 银行
 */
function renderCharacterBank() {
    const detailsEl = document.getElementById("character-bank-details");
    // 获取当前角色对象，为后面找备注名做准备
    const characterChat = state.chats[activeCharacterPhoneId];
    if (!characterChat) return;

    const bankData = characterChat.characterPhoneData?.bank;
    detailsEl.innerHTML = "";

    // 获取角色给用户的备注名
    const userContactInData = characterChat.characterPhoneData.chats
        ? Object.values(characterChat.characterPhoneData.chats).find(
            (c) => !c.history || c.history.length === 0
        )
        : null;
    const remarkNameForMe = userContactInData
        ? userContactInData.remarkName
        : "我";

    const balanceCard = document.createElement("div");
    balanceCard.className = "character-bank-balance-card";
    balanceCard.innerHTML = `
    <div class="label">账户余额</div>
    <div class="amount">¥ ${(bankData?.balance || 0).toFixed(2)}</div>
`;
    detailsEl.appendChild(balanceCard);

    if (!bankData?.transactions || bankData.transactions.length === 0) {
        detailsEl.innerHTML +=
            '<p style="text-align:center; color: #8a8a8a; margin-top: 30px;">暂无交易明细</p>';
        return;
    }

    [...bankData.transactions].reverse().forEach((item, index) => {
        const originalIndex = bankData.transactions.length - 1 - index;
        const isIncome = item.type === "收入";
        const itemEl = document.createElement("div");
        itemEl.className = "character-bank-transaction";
        const iconBg = isIncome ? "#4CAF50" : "#E91E63";
        const iconSvg = isIncome
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M7 10h10v4H7z" opacity=".3"/><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1v-5h16v5c0 .55-.45 1-1 1zm1-10H4V7c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v2z"/></svg>`;

        // 用正则表达式 /我/g 全局替换所有“我”字
        const displayDescription = item.description.replace(
            /我/g,
            remarkNameForMe
        );

        itemEl.innerHTML = `
        <div class="transaction-details">
            <div class="transaction-icon" style="background-color: ${iconBg};">${iconSvg}</div>
            <div>
                <div class="title">${displayDescription}</div>
                <div class="meta" style="border:none; padding:0; margin-top:4px;"><span>${item.type
            }</span></div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span class="transaction-amount ${isIncome ? "income" : "expense"
            }">
                ${isIncome ? "+" : "-"} ${item.amount.toFixed(2)}
            </span>
            <button class="item-delete-btn" data-type="bank.transactions" data-index="${originalIndex}">×</button>
        </div>
    `;
        detailsEl.appendChild(itemEl);
    });
}

/**
 * 渲染角色手机 - 行动轨迹
 */
function renderCharacterTrajectory() {
    const listEl = document.getElementById("character-trajectory-list");
    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData?.trajectory;
    listEl.innerHTML = "";
    listEl.classList.add("character-trajectory-list");

    if (!items || items.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">暂无足迹</p>';
        return;
    }

    // 在渲染之前，使用新加的 parseTime 函数对轨迹数组进行排序
    items.sort((a, b) => parseTime(a.time) - parseTime(b.time));

    items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "character-trajectory-item";
        itemEl.innerHTML = `
        <div class="trajectory-item-content">
            <div class="title">${item.activity}</div>
            <div class="meta">
                <span>📍 ${item.location}</span>
                <span style="margin-left: 10px;">🕒 ${item.time}</span>
            </div>
        </div>
        <button class="item-delete-btn" data-type="trajectory" data-index="${index}">×</button>
    `;
        listEl.appendChild(itemEl);
    });
}

/**
 * 渲染角色手机 - APP使用记录
 */
function renderCharacterAppUsage() {
    const listEl = document.getElementById("character-app-usage-list");

    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData?.appUsage;

    listEl.innerHTML = "";
    if (!items || items.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">暂无使用记录</p>';
        return;
    }
    const durationsInMinutes = items.map((item) =>
        parseDurationToMinutes(item.duration)
    );
    const maxDuration = Math.max(...durationsInMinutes);
    items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "character-app-usage-item";
        const durationInMinutes = durationsInMinutes[index];
        const barWidth =
            maxDuration > 0 ? (durationInMinutes / maxDuration) * 100 : 0;
        itemEl.innerHTML = `
        <div class="app-usage-header">
            <span class="name">${item.appName}</span>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="duration">${item.duration}</span>
                <button class="item-delete-btn" data-type="appUsage" data-index="${index}">×</button>
            </div>
        </div>
        <div class="app-usage-bar-container">
            <div class="app-usage-bar" style="width: ${barWidth}%;"></div>
        </div>
    `;
        listEl.appendChild(itemEl);
    });
}

/**
 * 渲染角色的日记列表
 */
function renderCharacterDiary() {
    const listEl = document.getElementById("character-diary-list");

    const items =
        state.chats[activeCharacterPhoneId]?.characterPhoneData?.diary;

    listEl.innerHTML = "";
    if (!items || items.length === 0) {
        listEl.innerHTML =
            '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">日记本还是空的，点击右上角写下第一篇日记吧。</p>';
        return;
    }

    [...items].reverse().forEach((item, index) => {
        const originalIndex = items.length - 1 - index;
        const itemEl = document.createElement("div");
        itemEl.className = "character-data-item";
        const contentHtml = renderMarkdown(item.content);
        itemEl.innerHTML = `
        <div class="content">${contentHtml}</div>
        <div class="meta">
            <span>${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <button class="item-delete-btn" data-type="diary" data-index="${originalIndex}">×</button>
    `;
        listEl.appendChild(itemEl);
    });
}

/**
 * 【日记】独立刷新，生成新的日记条目
 */
async function generateNewDiaryEntry() {
    const userNickname = state.qzoneSettings.nickname || "我";
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    document
        .getElementById("generation-overlay")
        .classList.add("visible");

    try {
        const persona = chat.settings.aiPersona;
        const recentHistory = chat.history
            .slice(-chat.settings.maxMemory || 20)
            .map((msg) => {
                const sender = msg.role === "user" ? userNickname : chat.name;
                return `${sender}: ${msg.content}`;
            })
            .join("\n");
        let linkedMemoryContext = "";
        if (
            chat.settings.linkedMemories &&
            chat.settings.linkedMemories.length > 0
        ) {
            const contextPromises = chat.settings.linkedMemories.map(
                async (link) => {
                    const linkedChat = state.chats[link.chatId];
                    if (!linkedChat) return "";

                    const freshLinkedChat = await db.chats.get(link.chatId);
                    if (!freshLinkedChat) return "";

                    const recentHistory = freshLinkedChat.history
                        .filter((msg) => !msg.isHidden)
                        .slice(-link.depth);

                    if (recentHistory.length === 0) return "";

                    const formattedMessages = recentHistory
                        .map(
                            (msg) =>
                                `  - ${formatMessageForContext(msg, freshLinkedChat)}`
                        )
                        .join("\n");

                    return `\n## 附加上下文：来自与“${linkedChat.name}”的最近对话内容 (仅你可见)\n${formattedMessages}`;
                }
            );

            const allContexts = await Promise.all(contextPromises);
            linkedMemoryContext = allContexts.filter(Boolean).join("\n");
        }
        let worldBookContext = "";
        if (
            chat.settings.linkedWorldBookIds &&
            chat.settings.linkedWorldBookIds.length > 0
        ) {
            worldBookContext =
                "--- 世界观设定 (这是你必须严格遵守的背景) ---\n" +
                chat.settings.linkedWorldBookIds
                    .map((id) => {
                        const book = state.worldBooks.find((b) => b.id === id);
                        return book ? `[${book.name}]: ${book.content}` : "";
                    })
                    .join("\n\n");
        }

        const diaryPrompt = `
    # 任务
    你现在是角色 "${chat.name}"。今天是 ${new Date().toLocaleString("zh-CN", {
            dateStyle: "full",
        })}。请你回顾一下最近和我的聊天，以及你的人设，然后用你的口吻写一篇关于【今天或近期发生事情】的日记。
    这篇日记是你内心的独白，可以记录你的感受、思考、计划或者秘密。
    内容要丰富、有深度，长度在100到300字之间。

    # 【【【重要：格式指令】】】
    你【必须】使用以下Markdown语法来丰富日记的格式，使其更具表现力：
    -   **标题**: 使用 \`#\` 或 \`##\` 来创建大标题和副标题。 (例如: \`# 今天的心情\`)
    -   **粗体**: 使用 \`**文字**\` 来强调重点。 (例如: \`今天真的**非常**开心。\`)
    -   **斜体**: 使用 \`*文字*\` 来表达情绪或内心想法。 (例如: \`*他到底是怎么想的呢...*\`)
    -   **删除线**: 使用 \`~~文字~~\` 来表示划掉或否定的想法。 (例如: \`我决定明天去<s>逛街</s>学习。\`)
    -   **遮挡/剧透**: 使用 \`||文字||\` 来隐藏秘密或悄悄话。 (例如: \`我偷偷准备了一个惊喜，||是一个手织的围巾||。\`)

    你的输出【必须且只能】是日记的正文内容，不要包含任何其他说明或JSON格式。

    # 你的信息
    - 你的名字: ${chat.name}
    - 你的人设: ${persona}
    ${worldBookContext}

    # 最近聊天记录参考
    ${recentHistory}
    ${linkedMemoryContext}
    `;

        const { proxyUrl, apiKey, model } = state.apiConfig;
        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(
            model,
            apiKey,
            diaryPrompt,
            [{ role: "user", content: diaryPrompt }],
            isGemini
        );

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: diaryPrompt }],
                    temperature: parseFloat(state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) {
            let errorMsg = `API请求失败，状态码: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += `\n错误信息: ${errorData.error.message}`;
            } catch (e) {
                errorMsg += `\n无法解析错误响应体。`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        const diaryContent = isGemini
            ? data.candidates[0].content.parts[0].text
            : data.choices[0].message.content;

        const newEntry = {
            timestamp: Date.now(),
            content: diaryContent,
        };

        chat.characterPhoneData.diary.push(newEntry);
        await db.chats.put(chat);

        renderCharacterDiary();
        alert("新日记已生成！");
    } catch (error) {
        console.error("生成日记失败:", error);
        await showCustomAlert(
            "生成失败",
            `发生了一个错误，请检查你的网络、API密钥或模型设置。\n\n详细信息:\n${error.message}`
        );
    } finally {
        document
            .getElementById("generation-overlay")
            .classList.remove("visible");
    }
}

function openCharPhoneAppearanceSettings() {
    renderCharPhoneAppearanceScreen(); // 渲染页面内容
    showCharacterPhonePage("character-phone-appearance-screen"); // 显示页面
    loadCharPhonePresetsToDropdown();
}

/**
 * 渲染角色手机的外观设置页面
 */
function renderCharPhoneAppearanceScreen() {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    // --- 渲染壁纸预览 ---
    const wallpaperPreview = document.getElementById(
        "char-phone-wallpaper-preview"
    );
    const wallpaperUrl = chat.characterPhoneData.wallpaper || "";
    if (wallpaperUrl) {
        wallpaperPreview.style.backgroundImage = `url(${wallpaperUrl})`;
        wallpaperPreview.textContent = "";
    } else {
        wallpaperPreview.style.backgroundImage = "none";
        wallpaperPreview.textContent = "暂无壁纸";
    }
    // --- 渲染App内壁纸预览 ---
    const appWallpaperPreview = document.getElementById(
        "char-phone-app-wallpaper-preview"
    );
    const appWallpaperUrl =
        newAppWallpaperBase64 || chat.characterPhoneData.appWallpaper || "";
    if (appWallpaperUrl) {
        appWallpaperPreview.style.backgroundImage = `url(${appWallpaperUrl})`;
        appWallpaperPreview.textContent = "";
    } else {
        appWallpaperPreview.style.backgroundImage = "none";
        appWallpaperPreview.textContent = "点击下方上传";
    }
    // --- 渲染App图标设置列表 ---
    const iconGrid = document.getElementById(
        "char-phone-icon-settings-grid"
    );
    iconGrid.innerHTML = "";
    const customIcons = chat.characterPhoneData.appIcons || {};

    CHAR_PHONE_APPS.forEach((app) => {
        const customIconUrl = customIcons[app.id];
        // 使用默认图标作为备用
        const currentIconUrl =
            customIconUrl || DEFAULT_APP_ICONS[app.id] || "";
        const currentIconHtml = currentIconUrl
            ? `<img src="${currentIconUrl}" style="width:100%; height:100%; object-fit:cover;">`
            : app.svg;

        const itemEl = document.createElement("div");
        itemEl.className = "icon-setting-item";
        itemEl.dataset.iconId = app.id;
        itemEl.innerHTML = `
        <div class="icon-preview" style="width: 50px; height: 50px; border-radius: 12px; display: flex; justify-content: center; align-items: center; padding: 8px; background: #f0f2f5;">
            ${currentIconHtml}
        </div>
        <span style="font-size: 13px;">${app.name}</span>
        <button class="change-icon-btn" data-icon-id="${app.id}" style="padding: 4px 10px; font-size: 12px; border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 5px; cursor: pointer;">更换</button>
    `;
        iconGrid.appendChild(itemEl);
    });

    // --- 渲染小组件预览 (逻辑不变) ---
    const widgets = chat.characterPhoneData.widgets || {};
    const widgetPreview1 = document.getElementById(
        "char-phone-widget-preview-1"
    );
    const widgetPreview2 = document.getElementById(
        "char-phone-widget-preview-2"
    );

    if (widgets.widget1_url) {
        widgetPreview1.style.backgroundImage = `url(${widgets.widget1_url})`;
        widgetPreview1.textContent = "";
    } else {
        widgetPreview1.style.backgroundImage = "none";
        widgetPreview1.textContent = "点击上传";
    }

    if (widgets.widget2_url) {
        widgetPreview2.style.backgroundImage = `url(${widgets.widget2_url})`;
        widgetPreview2.textContent = "";
    } else {
        widgetPreview2.style.backgroundImage = "none";
        widgetPreview2.textContent = "点击上传";
    }
}

/**
 * 处理角色手机壁纸的更换和移除
 * @param {string} newUrl - 新的壁纸URL，如果为空字符串则表示移除
 */
async function handleCharPhoneWallpaperChange(newUrl) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];

    chat.characterPhoneData.wallpaper = newUrl;
    await db.chats.put(chat);

    // 立即应用壁纸到角色手机主屏幕
    const phoneScreen = document.getElementById("character-phone-screen");
    if (newUrl) {
        phoneScreen.style.backgroundImage = `url(${newUrl})`;
        phoneScreen.style.backgroundColor = "transparent";
    } else {
        phoneScreen.style.backgroundImage = "none";
        const isDarkMode = document
            .getElementById("phone-screen")
            .classList.contains("dark-mode");
        phoneScreen.style.backgroundColor = isDarkMode ? "#000" : "#f0f2f5";
    }

    // 刷新设置页面的预览
    renderCharPhoneAppearanceScreen();
    alert(newUrl ? "壁纸已更新！" : "壁纸已移除！");
}

/**
 * 处理角色手机App图标的更换
 * @param {string} iconId - 要更换的App的ID
 */
async function handleChangeCharPhoneIcon(iconId) {
    if (!activeCharacterPhoneId) return;

    const choice = await showChoiceModal("更换图标", [
        { text: "📁 从本地上传", value: "local" },
        { text: "🌐 使用网络URL", value: "url" },
    ]);

    if (!choice) return;

    let newIconUrl = "";

    if (choice === "local") {
        // 创建一个隐藏的文件输入框
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                newIconUrl = event.target.result;
                await saveIcon(newIconUrl);
            };
            reader.readAsDataURL(file);
        };
        fileInput.click();
    } else if (choice === "url") {
        const url = prompt("请输入图片URL:");
        if (url) {
            await saveIcon(url);
        }
    }

    async function saveIcon(url) {
        const chat = state.chats[activeCharacterPhoneId];
        if (!chat.characterPhoneData.appIcons) {
            chat.characterPhoneData.appIcons = {};
        }
        chat.characterPhoneData.appIcons[iconId] = url;
        await db.chats.put(chat);
        renderCharPhoneAppearanceScreen(); // 刷新预览
        alert("图标已更换！");
    }
}

async function handleCharacterDataDeletion(dataType, index) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    const dataList = chat.characterPhoneData[dataType];
    if (!dataList || !dataList[index]) return;

    const confirmed = await showCustomConfirm(
        "确认删除",
        "确定要删除这条记录吗？",
        { confirmButtonClass: "btn-danger" }
    );
    if (confirmed) {
        dataList.splice(index, 1);
        await db.chats.put(chat);

        // 刷新对应的列表
        switch (dataType) {
            case "shoppingCart":
                renderCharacterShoppingCart();
                break;
            case "memos":
                renderCharacterMemos();
                break;
            case "browserHistory":
                renderCharacterBrowser();
                break;
            case "photoAlbum":
                renderCharacterPhotoAlbum();
                break;
            case "bank.transactions":
                renderCharacterBank();
                break;
            case "trajectory":
                renderCharacterTrajectory();
                break;
            case "appUsage":
                renderCharacterAppUsage();
                break;
            case "diary":
                renderCharacterDiary();
                break;
        }
    }
}

async function handleCharacterChatMessageDeletion(contactName, index) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat) return;

    let chatList;
    let isUserChat = false;

    // 先判断是不是和用户的聊天
    // 逻辑：如果contactName等于"我"（或者用户备注名），则去 chat.history 里找
    const userContactInData = chat.characterPhoneData.chats
        ? Object.values(chat.characterPhoneData.chats).find(
            (c) => !c.history || c.history.length === 0
        )
        : null;
    const remarkNameForMe = userContactInData
        ? userContactInData.remarkName
        : "我";

    if (contactName === remarkNameForMe || contactName === "我") {
        isUserChat = true;
        chatList = chat.history;
    } else {
        // 否则去 NPC 聊天记录里找
        const npcChat = chat.characterPhoneData.chats[contactName];
        if (npcChat && npcChat.history) {
            chatList = npcChat.history;
        }
    }

    if (!chatList || !chatList[index]) return;

    const confirmed = await showCustomConfirm(
        "确认删除",
        "确定要删除这条消息吗？",
        { confirmButtonClass: "btn-danger" }
    );
    if (confirmed) {
        chatList.splice(index, 1); // 删除消息
        await db.chats.put(chat);

        // 刷新聊天界面
        // 注意：这里需要重新计算 loadOffset，或者简单地刷新当前视图
        // 为了简便，我们重新调用 renderCharacterChatHistory，offset设为0
        // (更好的做法是保持当前滚动位置，但这里先简单处理)
        renderCharacterChatHistory(contactName, isUserChat);
    }
}

/**
 * 清除指定类型的角色手机数据
 */
async function clearCharacterPhoneDataSegment(dataType) {
    if (!activeCharacterPhoneId) return;
    const chat = state.chats[activeCharacterPhoneId];
    if (!chat || !chat.characterPhoneData) return;

    const confirmed = await showCustomConfirm(
        "确认清空",
        "确定要清空该项目下的所有数据吗？",
        { confirmButtonClass: "btn-danger" }
    );
    if (!confirmed) return;

    // Modify data
    if (dataType === 'chats') {
        // 清空NPC聊天，但保留基本结构，或者直接置空
        // 注意：这会删除所有与NPC的聊天记录
        chat.characterPhoneData.chats = {};
    } else if (dataType === 'bank') {
        if (chat.characterPhoneData.bank) {
            chat.characterPhoneData.bank.transactions = [];
        }
    } else {
        chat.characterPhoneData[dataType] = [];
    }

    await db.chats.put(chat);

    // Refresh UI
    switch (dataType) {
        case 'chats': renderCharacterChatList(); break;
        case 'shoppingCart': renderCharacterShoppingCart(); break;
        case 'memos': renderCharacterMemos(); break;
        case 'browserHistory': renderCharacterBrowser(); break;
        case 'photoAlbum': renderCharacterPhotoAlbum(); break;
        case 'bank': renderCharacterBank(); break;
        case 'trajectory': renderCharacterTrajectory(); break;
        case 'appUsage': renderCharacterAppUsage(); break;
        case 'diary': renderCharacterDiary(); break;
    }
    alert("已清空！");
}

function populateChatGenList() {
    const list = document.getElementById('chat-gen-list');
    if (!list) return;
    list.innerHTML = '';

    // 筛选出所有可能的聊天对象（排除自己和群组）
    const targets = Object.values(state.chats).filter(c =>
        c.id !== activeCharacterPhoneId && !c.isGroup
    );

    targets.forEach(npc => {
        const item = document.createElement('label');
        item.className = 'chat-gen-option';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.padding = '8px';
        item.style.marginBottom = '5px';
        item.style.border = '1px solid #eee';
        item.style.borderRadius = '5px';
        item.style.cursor = 'pointer';

        // const personaSnippet = (npc.settings?.persona || '').replace(/"/g, '&quot;').substring(0, 100); 
        // 尝试从 npc.settings.aiAvatar 获取头像，如果不存在则使用 npc.avatar (兼容旧数据)，最后使用默认头像
        const avatarUrl = npc.settings?.aiAvatar || npc.avatar || 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg';

        item.innerHTML = `
            <input type="checkbox" data-id="${npc.id}" data-name="${npc.name}" style="margin-right: 10px;">
            <img src="${avatarUrl}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; object-fit: cover;">
            <span>${npc.name}</span>
        `;
        list.appendChild(item);
    });
}

/**
 * 切换角色手机预设按钮的可用状态
 * @param {boolean} isEnabled 
 */
function toggleCharPhonePresetButtons(isEnabled) {
    const ids = [
        'apply-char-phone-preset-btn',
        'update-char-phone-preset-btn',
        'rename-char-phone-preset-btn',
        'delete-char-phone-preset-btn',
        'export-char-phone-preset-btn'
    ];
    ids.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !isEnabled;
    });
}

/**
 * 加载角色手机外观预设到下拉框
 */
async function loadCharPhonePresetsToDropdown() {
    const selector = document.getElementById('char-phone-preset-selector');
    if (!selector) return;

    // 清空现有选项（除了第一个默认选项）
    selector.innerHTML = '<option value="">-- 请选择一个预设 --</option>';

    try {
        const presets = await db.charPhonePresets.toArray();
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            selector.appendChild(option);
        });
    } catch (error) {
        console.error("加载预设失败:", error);
    }

    activeCharPhonePresetId = null;
    toggleCharPhonePresetButtons(false);
}

/**
 * 当用户从下拉框选择一个预设时触发
 */
function handleCharPhonePresetSelection() {
    const selector = document.getElementById('char-phone-preset-selector');
    activeCharPhonePresetId = selector && selector.value ? parseInt(selector.value) : null;
    toggleCharPhonePresetButtons(!!activeCharPhonePresetId);
}

/**
 * 应用选中的角色手机预设
 */
async function applySelectedCharPhonePreset() {
    if (!activeCharPhonePresetId) {
        alert('请先从下拉框中选择一个要应用的预设。');
        return;
    }
    if (!activeCharacterPhoneId) {
        alert('错误：没有找到当前正在操作的角色手机。');
        return;
    }

    try {
        const preset = await db.charPhonePresets.get(activeCharPhonePresetId);
        const chat = state.chats[activeCharacterPhoneId];

        if (preset && preset.data && chat) {
            // 将预设数据深拷贝一份，应用到角色的手机数据上
            chat.characterPhoneData.wallpaper = preset.data.wallpaper || '';
            chat.characterPhoneData.appIcons = { ...window.DEFAULT_APP_ICONS, ...(preset.data.appIcons || {}) };
            chat.characterPhoneData.widgets = { ...(preset.data.widgets || {}) };
            chat.characterPhoneData.appWallpaper = preset.data.appWallpaper || '';

            await db.chats.put(chat);

            // 刷新手机界面以显示新外观
            openCharacterPhone(activeCharacterPhoneId);

            // 刷新外观设置页面，以便预览和数据同步
            renderCharPhoneAppearanceScreen();

            alert(`已成功为“${chat.name}”应用预设: "${preset.name}"！`);
        } else {
            alert('应用预设失败，找不到预设或角色数据。');
        }
    } catch (error) {
        console.error('应用预设出错:', error);
        alert('应用预设出错: ' + error.message);
    }
}

/**
 * 保存当前角色手机的外观设置为一个新的预设
 */
async function saveCurrentCharPhonePreset() {
    if (!activeCharacterPhoneId) return;

    const presetName = await showCustomPrompt('保存预设', '请为这个外观方案起个名字：');
    if (!presetName || !presetName.trim()) {
        if (presetName !== null) alert('名字不能为空！');
        return;
    }

    const chat = state.chats[activeCharacterPhoneId];
    // 从当前角色的数据中提取外观设置
    const presetData = {
        wallpaper: chat.characterPhoneData.wallpaper || '',
        appIcons: { ...(chat.characterPhoneData.appIcons || {}) },
        widgets: { ...(chat.characterPhoneData.widgets || {}) },
        appWallpaper: chat.characterPhoneData.appWallpaper || '',
    };

    await db.charPhonePresets.add({ name: presetName.trim(), data: presetData });
    await loadCharPhonePresetsToDropdown();
    alert(`外观预设 "${presetName.trim()}" 已保存！`);
}

/**
 * 更新当前选中的预设
 */
async function updateSelectedCharPhonePreset() {
    if (!activeCharPhonePresetId || !activeCharacterPhoneId) return;

    const currentPreset = await db.charPhonePresets.get(activeCharPhonePresetId);
    if (!currentPreset) return;

    const confirmed = await showCustomConfirm(
        '确认更新',
        `确定要用当前手机的外观覆盖预设 "${currentPreset.name}" 吗？`,
        { confirmButtonClass: 'btn-danger' },
    );

    if (confirmed) {
        const chat = state.chats[activeCharacterPhoneId];
        const presetData = {
            wallpaper: chat.characterPhoneData.wallpaper || '',
            appIcons: { ...(chat.characterPhoneData.appIcons || {}) },
            widgets: { ...(chat.characterPhoneData.widgets || {}) },
            appWallpaper: chat.characterPhoneData.appWallpaper || '',
        };
        await db.charPhonePresets.update(activeCharPhonePresetId, { data: presetData });
        if (window.showCustomAlert) {
            await showCustomAlert('成功', `预设 "${currentPreset.name}" 已更新！`);
        } else {
            alert(`预设 "${currentPreset.name}" 已更新！`);
        }
    }
}

/**
 * 重命名选中的预设
 */
async function renameSelectedCharPhonePreset() {
    if (!activeCharPhonePresetId) return;
    const currentPreset = await db.charPhonePresets.get(activeCharPhonePresetId);
    const newName = await showCustomPrompt('重命名', '请输入新的名称：', currentPreset.name);
    if (newName && newName.trim()) {
        await db.charPhonePresets.update(activeCharPhonePresetId, { name: newName.trim() });
        await loadCharPhonePresetsToDropdown();
        document.getElementById('char-phone-preset-selector').value = activeCharPhonePresetId;
        alert('重命名成功！');
    }
}

/**
 * 删除选中的预设
 */
async function deleteSelectedCharPhonePreset() {
    if (!activeCharPhonePresetId) return;
    const currentPreset = await db.charPhonePresets.get(activeCharPhonePresetId);
    const confirmed = await showCustomConfirm('确认删除', `确定要删除预设 "${currentPreset.name}" 吗？`, {
        confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
        await db.charPhonePresets.delete(activeCharPhonePresetId);
        await loadCharPhonePresetsToDropdown();
        alert('预设已删除。');
    }
}

/**
 * 导出选中的预设
 */
async function exportCharPhonePreset() {
    if (!activeCharPhonePresetId) return;
    const preset = await db.charPhonePresets.get(activeCharPhonePresetId);
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[CharPhone]${preset.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导入预设文件
 */
function importCharPhonePreset(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.name && data.data) {
                await db.charPhonePresets.add({ name: `${data.name} (导入)`, data: data.data });
                await loadCharPhonePresetsToDropdown();
                alert(`预设 "${data.name}" 导入成功！`);
            } else {
                alert('导入失败：文件格式不正确。');
            }
        } catch (error) {
            alert(`导入失败：文件解析错误。${error.message}`);
        }
    };
    reader.readAsText(file);
}

// --- 事件监听器 ---

document.addEventListener('DOMContentLoaded', () => {

    // 1. 绑定主屏幕上的“查手机”APP图标
    const checkPhoneAppIcon = document.getElementById('check-phone-btn');
    if (checkPhoneAppIcon) {
        checkPhoneAppIcon.addEventListener('click', openCharacterSelectionScreen);
    }

    // 2. 角色选择列表的点击事件 (事件委托)
    document.getElementById('character-selection-list').addEventListener('click', (e) => {
        const item = e.target.closest('.character-select-item');
        if (item && item.dataset.chatId) {
            openCharacterPhone(item.dataset.chatId);
        }
    });

    // 角色手机聊天列表的点击事件 (事件委托)
    document.getElementById('character-chat-list').addEventListener('click', (e) => {
        const item = e.target.closest('.chat-list-item');
        if (item && item.dataset.contactName) {
            const isUserChat = item.dataset.isUserChat === 'true';
            console.log('【诊断日志 2】: 点击了聊天列表项', {
                contactName: item.dataset.contactName,
                isUserChat: isUserChat,
            });

            // 将联系人名字和“身份证”一起传递给渲染函数
            renderCharacterChatHistory(item.dataset.contactName, isUserChat);
            showCharacterPhonePage('character-chat-history-screen');
        }
    });

    // 3. 角色手机顶部的“刷新”和“清空”按钮
    document.getElementById('generate-character-data-btn').addEventListener('click', generateCharacterPhoneData);
    document.getElementById('clear-character-data-btn').addEventListener('click', clearCharacterPhoneData);

    // 角色手机内部统一返回事件监听器
    document.getElementById('character-phone-container').addEventListener('click', (e) => {
        const backBtn = e.target.closest('.back-btn');
        if (!backBtn) return;

        // 检查是返回到角色手机内部页面，还是返回到主屏幕
        if (backBtn.dataset.targetPage) {
            showCharacterPhonePage(backBtn.dataset.targetPage);
        } else if (backBtn.dataset.targetScreen) {
            showScreen(backBtn.dataset.targetScreen);
        }
    });

    // --- 批量绑定各个子页面的生成和清除按钮 ---
    const actionButtons = [
        // 消息列表页
        { id: 'clear-npc-chats-btn', action: () => clearCharacterPhoneDataSegment('chats') },
        {
            id: 'generate-chat-message-btn', action: () => {
                const modal = document.getElementById('chat-gen-selector-modal');
                populateChatGenList();
                modal.classList.add('visible');
            }
        },

        // 购物车页
        { id: 'clear-cart-items-btn', action: () => clearCharacterPhoneDataSegment('shoppingCart') },
        { id: 'generate-cart-item-btn', action: () => generateCharacterPhoneDataSegment('shoppingCart') },

        // 备忘录页
        { id: 'clear-memos-btn', action: () => clearCharacterPhoneDataSegment('memos') },
        { id: 'generate-memo-btn', action: () => generateCharacterPhoneDataSegment('memos') },

        // 浏览器页
        { id: 'clear-browser-history-btn', action: () => clearCharacterPhoneDataSegment('browserHistory') },
        { id: 'generate-browser-history-btn', action: () => generateCharacterPhoneDataSegment('browserHistory') },

        // 相册页
        { id: 'clear-album-photos-btn', action: () => clearCharacterPhoneDataSegment('photoAlbum') },
        { id: 'generate-album-photo-btn', action: () => generateCharacterPhoneDataSegment('photoAlbum') },

        // 钱包/银行页
        { id: 'clear-bank-transactions-btn', action: () => clearCharacterPhoneDataSegment('bank') },
        { id: 'generate-bank-transaction-btn', action: () => generateCharacterPhoneDataSegment('bank') },

        // 足迹页
        { id: 'clear-trajectory-btn', action: () => clearCharacterPhoneDataSegment('trajectory') },
        { id: 'generate-trajectory-btn', action: () => generateCharacterPhoneDataSegment('trajectory') },

        // 屏幕使用时间页
        { id: 'clear-app-usage-btn', action: () => clearCharacterPhoneDataSegment('appUsage') },
        { id: 'generate-app-usage-btn', action: () => generateCharacterPhoneDataSegment('appUsage') },

        // 日记页 (生成按钮已有单独绑定，这里只绑清除)
        { id: 'clear-diary-entries-btn', action: () => clearCharacterPhoneDataSegment('diary') },
    ];

    actionButtons.forEach(btn => {
        const el = document.getElementById(btn.id);
        if (el) {
            // 防止重复绑定，先移除（虽然DOMContentLoaded只跑一次，但保险起见）
            // el.removeEventListener('click', btn.action); // 匿名函数无法移除，这就不用了
            el.addEventListener('click', btn.action);
        }
    });

    // 角色手机日记APP事件监听器
    document.getElementById('character-app-grid').addEventListener('click', (e) => {
        const icon = e.target.closest('.app-icon');
        if (icon && icon.querySelector('.label').textContent === '日记') {
            renderCharacterDiary();
        }
    });
    document.getElementById('generate-diary-entry-btn').addEventListener('click', generateNewDiaryEntry);

    // “查手机”内容单条删除功能事件绑定
    document.getElementById('character-phone-container').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.item-delete-btn');
        if (deleteBtn) {
            // 处理微信消息删除
            if (deleteBtn.classList.contains('message-delete-btn')) {
                const contactName = deleteBtn.dataset.contactName;
                const index = parseInt(deleteBtn.dataset.index);
                if (contactName && !isNaN(index)) {
                    handleCharacterChatMessageDeletion(contactName, index);
                }
            }
            // 处理其他列表删除
            else {
                const dataType = deleteBtn.dataset.type;
                const index = parseInt(deleteBtn.dataset.index);
                if (dataType && !isNaN(index)) {
                    handleCharacterDataDeletion(dataType, index);
                }
            }
        }
    });

    // 查手机-生成聊天选择器事件绑定
    document.getElementById('cancel-chat-gen-btn').addEventListener('click', () => {
        document.getElementById('chat-gen-selector-modal').classList.remove('visible');
    });

    // 随机开关切换时，启用/禁用列表
    document.getElementById('chat-gen-random-checkbox').addEventListener('change', (e) => {
        const list = document.getElementById('chat-gen-list');
        if (e.target.checked) {
            list.style.opacity = '0.5';
            list.style.pointerEvents = 'none';
            // 清空所有勾选
            list.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
        } else {
            list.style.opacity = '1';
            list.style.pointerEvents = 'auto';
        }
    });

    document.getElementById('confirm-chat-gen-btn').addEventListener('click', () => {
        const isRandom = document.getElementById('chat-gen-random-checkbox').checked;
        let selectedTargets = null;

        if (!isRandom) {
            // 如果不是随机，收集选中的对象
            selectedTargets = [];
            document.querySelectorAll('#chat-gen-list input:checked').forEach((checkbox) => {
                const charId = checkbox.dataset.id;
                const charObj = state.chats[charId];
                // 优先读取完整人设 aiPersona, 兼容旧字段 persona
                const fullPersona = charObj?.settings?.aiPersona || charObj?.settings?.persona || "";

                selectedTargets.push({
                    name: checkbox.dataset.name,
                    persona: fullPersona,
                });
            });

            if (selectedTargets.length === 0) {
                alert('请至少选择一个聊天对象，或者开启随机模式。');
                return;
            }
        }

        document.getElementById('chat-gen-selector-modal').classList.remove('visible');
        // 调用生成函数，传入选中的目标（如果是随机则为null）
        generateCharacterPhoneDataSegment('chats', selectedTargets);
    });

    // 角色手机外观设置事件监听器
    document.getElementById('character-phone-container').addEventListener('click', (e) => {
        // 使用事件委托，判断点击的是哪个按钮
        if (e.target.id === 'upload-char-phone-wallpaper-btn') {
            document.getElementById('char-phone-wallpaper-upload-input').click();
        } else if (e.target.id === 'remove-char-phone-wallpaper-btn') {
            handleCharPhoneWallpaperChange(''); // 传入空字符串来移除壁纸
        } else {
            const changeIconButton = e.target.closest('.change-icon-btn');
            if (changeIconButton) {
                const iconId = changeIconButton.dataset.iconId;
                handleChangeCharPhoneIcon(iconId);
            }
        }
    });

    // 监听壁纸文件选择
    document.getElementById('char-phone-wallpaper-upload-input').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const dataUrl = await new Promise((res) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result);
                reader.readAsDataURL(file);
            });
            handleCharPhoneWallpaperChange(dataUrl);
        }
        event.target.value = null; // 清空，以便下次能选择同一个文件
    });

    // 角色手机外观预设功能事件绑定
    document.getElementById('char-phone-preset-selector').addEventListener('change', handleCharPhonePresetSelection);
    document.getElementById('apply-char-phone-preset-btn').addEventListener('click', applySelectedCharPhonePreset);
    document.getElementById('save-char-phone-preset-btn').addEventListener('click', saveCurrentCharPhonePreset);
    document.getElementById('update-char-phone-preset-btn').addEventListener('click', updateSelectedCharPhonePreset);
    document.getElementById('rename-char-phone-preset-btn').addEventListener('click', renameSelectedCharPhonePreset);
    document.getElementById('delete-char-phone-preset-btn').addEventListener('click', deleteSelectedCharPhonePreset);
    document.getElementById('export-char-phone-preset-btn').addEventListener('click', exportCharPhonePreset);
    document.getElementById('import-char-phone-preset-btn').addEventListener('click', () => {
        document.getElementById('import-char-phone-preset-input').click();
    });
    document.getElementById('import-char-phone-preset-input').addEventListener('change', (e) => {
        importCharPhonePreset(e.target.files[0]);
        e.target.value = null; // 清空以便下次能选择同一个文件
    });

    // 角色手机App内壁纸功能事件绑定

    // 监听“上传”按钮的点击，去触发隐藏的文件选择器
    document.getElementById('upload-char-phone-app-wallpaper-btn').addEventListener('click', () => {
        document.getElementById('char-phone-app-wallpaper-upload-input').click();
    });

    // 监听文件选择器的变化
    document.getElementById('char-phone-app-wallpaper-upload-input').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const dataUrl = await new Promise((res) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result);
                reader.readAsDataURL(file);
            });
            // 文件读取成功后，立刻调用处理函数来保存和应用
            handleCharPhoneAppWallpaperChange(dataUrl);
        }
        event.target.value = null; // 清空，以便下次能选择同一个文件
    });

    // 监听“移除”按钮的点击
    document.getElementById('remove-char-phone-app-wallpaper-btn').addEventListener('click', () => {
        // 调用处理函数，并传入空字符串表示移除
        handleCharPhoneAppWallpaperChange('');
    });

    // 角色手机小组件上传功能事件绑定

    // 辅助函数：处理图片上传的通用逻辑
    const handleWidgetUpload = async (widgetKey, inputFileId) => {
        const fileInput = document.getElementById(inputFileId);
        const file = fileInput.files[0];
        if (!file) return;

        const dataUrl = await new Promise((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(file);
        });

        const chat = state.chats[activeCharacterPhoneId];
        if (!chat.characterPhoneData.widgets) {
            chat.characterPhoneData.widgets = {};
        }
        chat.characterPhoneData.widgets[widgetKey] = dataUrl;

        await db.chats.put(chat);
        renderCharPhoneAppearanceScreen(); // 刷新设置页预览
        openCharacterPhone(activeCharacterPhoneId); // 刷新手机主屏幕
        alert('小组件图片已更新！');
        fileInput.value = null; // 清空以便下次选择
    };

    // 辅助函数：处理图片移除的通用逻辑
    const handleWidgetRemove = async (widgetKey) => {
        const chat = state.chats[activeCharacterPhoneId];
        if (chat.characterPhoneData.widgets && chat.characterPhoneData.widgets[widgetKey]) {
            delete chat.characterPhoneData.widgets[widgetKey];
            await db.chats.put(chat);
            renderCharPhoneAppearanceScreen();
            openCharacterPhone(activeCharacterPhoneId);
            alert('小组件图片已移除！');
        }
    };

    // 为四个新按钮绑定事件
    document.getElementById('upload-widget-1-btn').addEventListener('click', () => {
        document.getElementById('char-phone-widget-1-upload-input').click();
    });
    document.getElementById('remove-widget-1-btn').addEventListener('click', () => {
        handleWidgetRemove('widget1_url');
    });
    document.getElementById('char-phone-widget-1-upload-input').addEventListener('change', () => {
        handleWidgetUpload('widget1_url', 'char-phone-widget-1-upload-input');
    });

    document.getElementById('upload-widget-2-btn').addEventListener('click', () => {
        document.getElementById('char-phone-widget-2-upload-input').click();
    });
    document.getElementById('remove-widget-2-btn').addEventListener('click', () => {
        handleWidgetRemove('widget2_url');
    });
    document.getElementById('char-phone-widget-2-upload-input').addEventListener('change', () => {
        handleWidgetUpload('widget2_url', 'char-phone-widget-2-upload-input');
    });

});