// update-popup.js — 独立的更新弹窗模块
// 每次发版只需在 UPDATE_LOG 数组头部添加一条新记录即可

const UPDATE_LOG = [
    {
        version: '2026.04.12',
        date: '2026-04-12',
        sections: [
            {
                title: '🐛 Bug 修复',
                items: [
                    '修复聊天火花天数判定不准确，统一使用本地日期计算，每个自然日一轮完整对话即增加火花',
                    '修复约会大作战进入NSFW模式时自动触发回复，导致前一次回复被覆盖',
                ]
            },
            {
                title: '✨ 优化',
                items: [
                    '优化页面长按判定，禁用文本选择，防止触发浏览器默认复制等操作',
                    '⭐ 优化长期记忆精简功能，不再压缩为一句话，保留更多关键信息',
                    '优化小剧场故事页面，仅渲染最近20条记录',
                    '优化小红书所有生成内容prompt，增强限制，严禁路人以聊天角色或用户视角发布笔记或评论',
                    '优化桃宝和约会大作战生图功能，没有Pollinations API key时使用文字图占位',
                    '优化所有自定义提示词调用NovelAI生图，增加自动翻译为英语，提升生图准确度',
                ]
            },
            {
                title: '🚀 新功能',
                items: [
                    '⭐ 游戏大厅新增国王游戏',
                    '⭐ 新增小红书笔记详情页重新生图功能，可自定义提示词调用NovelAI重新生成图片',
                    '新增小红书角色主页设置功能，可手动调整角色小红书号、简介、标签、关注/粉丝数、主页背景',
                    '新增小剧场故事页面长按多选功能，支持批量收藏或删除消息',
                    '新增小剧场"我的收藏"页面，可查看已收藏片段',
                ]
            }
        ]
    },
    {
        version: '2026.04.06',
        date: '2026-04-06',
        sections: [
            {
                title: '🎭 小剧场功能优化（除了玩法全重做了……）',
                items: [
                    '优化主页显示',
                    '新增设置页，可调整气泡颜色',
                    '新增世界书绑定，可以绑定世界书内容作为世界观或文风设定注入上下文',
                    '新增多角色剧本，支持添加多个角色，以及指定自定义角色身份',
                    '新增剧本存档，可以随时存读档不怕丢失记录',
                    '优化故事推进方式，可手动选择下一个行动角色或旁白',
                    '新增自动总结，防止故事过长导致token过大',
                    '新增长按编辑或删除消息',
                    '优化故事结束判定，点击旁白默认触发判定，目标完成后可选择结束或继续故事，继续则不再触发判定，可以随时手动结束',
                ]
            }
        ]
    },
    {
        version: '2026.04.01',
        date: '2026-04-01',
        sections: [
            {
                title: '🐛 Bug 修复',
                items: [
                    '修复群聊投票消息处理错误',
                    '修复桃宝物流状态无法显示',
                    '修复世界书解锁后导入不显示',
                    '修复视频聊天打开摄像头时报错',
                    '修复一起听歌桌面歌词无法移动',
                ]
            },
            {
                title: '✨ 优化',
                items: [
                    '优化视频通话上下文构建，使用与聊天设置一致的条数和格式，添加记忆互通',
                    '优化表情包上传，可以直接选择或添加表情包分类',
                    '优化小红书笔记评论生成，防止ai使用user的视角和口吻',
                    '优化查手机生成聊天，加入可选NPC',
                ]
            },
            {
                title: '🚀 新功能',
                items: [
                    '新增点击视频通话条目可以查看详细通话记录',
                    '新增全局世界书设置',
                    '新增表情包搜索功能',
                    '新增表情包自动匹配，输入表情包名称自动匹配表情包，可以直接点击发送',
                    '新增查手机聊天列表长按删除聊天记录',
                    '新增API设置惩罚参数'
                ]
            }
        ]
    },
    {
        version: '2026.03.19',
        date: '2026-03-19',
        sections: [
            {
                title: '🐛 Bug 修复',
                items: [
                    '修复小红书发布笔记时，部分情况回车键无法提交话题',
                    '修复给char手动新增语音消息时，会造成语音消息连续播放',
                    '修复github无法自动备份',
                ]
            },
            {
                title: '✨ 优化',
                items: [
                    '优化自定义时间，设置后按正常时间流动，加入按照自定义时间计算后台活动的判断',
                    '优化小红书发现页清空功能，可以排除自己发布的笔记',
                    '优化语音消息缓存，将音频数据持久化，即便刷新页面也能正常播放（保存50条消息记录）',
                    '优化lofter世界书选择，添加多选下拉菜单以及世界书分类',
                ]
            },
            {
                title: '🚀 新功能',
                items: [
                    '新增回复条数设置，可设置AI每次回复的消息条数范围，适用于聊天和后台行动',
                    '新增副API配置，可选择应用于哪些功能',
                    '新增发送文字图时可以选择生成图片发送（需要配置 NAI）',
                    '新增上传图片发送时可以使用相机拍照发送',
                ]
            }
        ]
    },
    {
        version: '2026.03.17 v2',
        date: '2026-03-17',
        sections: [
            {
                title: '🐛 Bug 修复',
                items: [
                    '修复无法保存主屏幕预设',
                    '修复小红书不读NPC设定',
                    '修复小红书发现页和关注页生成情况同步，生成按钮状态不自动更新',
                    '修复小红书笔记详情页生成评论时，切换笔记仍显示“生成中”',
                    '修复发送图片时ai不读取图片内容',
                    '修复聊天管理分组按钮没有反应',
                ]
            },
            {
                title: '✨ 优化',
                items: [
                    '优化聊天prompt，加强自定义时间感知',
                    '——聊天记录中已保存的时间戳不会更改，如果更新后仍对自定义时间感知不明显，可以尝试清理聊天记录',
                    '优化图片在请求中的注入方式，大幅度减少token占用和消耗（说人话：可以放心大胆发图片了）',
                    '优化多模态格式下发送图片的token计算，使token数分析更准确',
                ]
            },
            {
                title: '🚀 新功能',
                items: [
                    '新增使用url更换主屏幕应用图标',
                    '新增通过导入文件批量添加表情包，支持txt、csv、md、docx格式',
                    '新增小红书个人主页笔记长按删除',
                    '新增副API配置，可用于记忆总结'
                ]
            }
        ]
    },
    // ↓ 往后追加历史版本即可，最新版本始终在数组第一位
    {
        version: '2026.03.15',
        date: '2026-03-15',
        sections: [
            { 
                title: '🐛 Bug 修复', 
                items: [
                    '修复小红书笔记详情页输入框占位问题，修复评论按钮出界',
                    '修复时间线重开后，空聊天后台活动报错',
                    '修复群聊消息撤回，char名称显示undefined',
                    '修复线下模式上下文构建问题，补充转发消息',
                    '修复聊天窗口收到回复时，char备注名会显示成原名',
                ] 
            },
            { 
                title: '✨ 优化', 
                items: [
                    '优化后台活动prompt，减少跨群聊重复现象',
                    '优化token计算，加入记忆互通聊天记录的token数',
                    '优化记忆互通部分prompt，群聊中能够确认互通的聊天记录归属',
                    '优化聊天语音消息播放，生成后默认加入缓存，再次点击直接播放，不会重新生成了',
                    '优化群视频聊天，读取参与聊天的char的语音设置，有voice id的char可以播放语音',
                    '优化视频聊天 / 小剧场的输入框，只有点击按钮时发送消息，现在可以使用回车键换行',
                ] 
            },
            { 
                title: '🚀 新功能', 
                items: [
                    '新增支持minimax新模型2.8及相关设置',
                    '新增pollinations生图判断，没有api key的情况下小红书不会调用生图，直接使用占位图生成笔记，防止因为生图错误长时间卡住',
                    'tips：现在pollinations取消了免费生图的公用接口，想使用生图需要到官网enter.pollinations.ai注册获取api key，填入设置即可。按现在小手机里的模型计算，每周大概赠送1500次免费额度，绝对够用啦。',
                    '新增小红书设置使用pollinations生图开关，默认开启，可以在设置页中自行调整',
                ] 
            }
        ]
    },
];

(function () {
    const STORAGE_KEY = 'ephone_update_dismissed_version';
    const CURRENT = UPDATE_LOG[0];
    if (!CURRENT) return;

    let countdownTimer = null;

    function buildSectionHTML(sections) {
        let html = '';
        for (const s of sections) {
            html += `<div class="update-section-title">${s.title}</div><ul>`;
            for (const item of s.items) {
                html += `<li>${item}</li>`;
            }
            html += '</ul>';
        }
        return html;
    }

    function renderCurrentVersion() {
        const versionEl = document.getElementById('update-popup-version');
        const bodyEl = document.getElementById('update-popup-body');
        const headerTitle = document.querySelector('.update-popup-title');
        const headerIcon = document.querySelector('.update-popup-icon');
        const historyBtn = document.getElementById('update-popup-history-btn');
        const backBtn = document.getElementById('update-popup-back-btn');

        headerIcon.textContent = '🎉';
        headerTitle.textContent = '版本更新';
        versionEl.textContent = CURRENT.version;
        bodyEl.innerHTML = buildSectionHTML(CURRENT.sections);
        if (historyBtn) historyBtn.style.display = '';
        if (backBtn) backBtn.style.display = 'none';
    }

    function renderHistory() {
        const bodyEl = document.getElementById('update-popup-body');
        const headerTitle = document.querySelector('.update-popup-title');
        const headerIcon = document.querySelector('.update-popup-icon');
        const versionEl = document.getElementById('update-popup-version');
        const historyBtn = document.getElementById('update-popup-history-btn');
        const backBtn = document.getElementById('update-popup-back-btn');

        headerIcon.textContent = '📋';
        headerTitle.textContent = '更新记录';
        versionEl.textContent = '';
        if (historyBtn) historyBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = '';

        const pastVersions = UPDATE_LOG.slice(1);
        if (pastVersions.length === 0) {
            bodyEl.innerHTML = '<div style="text-align:center;color:#999;padding:30px 0;">暂无历史更新记录</div>';
            return;
        }
        let html = '';
        for (const entry of pastVersions) {
            html += `<div class="update-history-entry">`;
            html += `<div class="update-history-version-tag">${entry.version}</div>`;
            html += buildSectionHTML(entry.sections);
            html += `</div>`;
        }
        bodyEl.innerHTML = html;
    }

    function startCountdown() {
        const closeBtn = document.getElementById('update-popup-close-btn');
        const countdownSpan = document.getElementById('update-popup-countdown');
        const dismissLabel = document.getElementById('update-popup-dismiss-label');
        const dismissCheck = document.getElementById('update-popup-dismiss-check');

        closeBtn.disabled = true;
        dismissLabel.style.display = 'none';
        dismissCheck.checked = false;

        let remaining = 5;
        countdownSpan.textContent = remaining + '秒后可关闭';

        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                countdownSpan.textContent = remaining + '秒后可关闭';
            } else {
                clearInterval(countdownTimer);
                countdownTimer = null;
                countdownSpan.textContent = '我知道了';
                closeBtn.disabled = false;
                dismissLabel.style.display = 'flex';
            }
        }, 1000);
    }

    function closePopup() {
        const overlay = document.getElementById('update-popup-overlay');
        const dismissCheck = document.getElementById('update-popup-dismiss-check');
        if (dismissCheck && dismissCheck.checked) {
            localStorage.setItem(STORAGE_KEY, CURRENT.version);
        }
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        overlay.classList.remove('visible');
    }

    window.showUpdatePopup = function () {
        const dismissed = localStorage.getItem(STORAGE_KEY);
        if (dismissed === CURRENT.version) return;

        const overlay = document.getElementById('update-popup-overlay');
        if (!overlay) return;

        renderCurrentVersion();
        startCountdown();
        overlay.classList.add('visible');
    };

    window.showUpdateHistory = function () {
        const overlay = document.getElementById('update-popup-overlay');
        if (!overlay) return;

        const closeBtn = document.getElementById('update-popup-close-btn');
        const countdownSpan = document.getElementById('update-popup-countdown');
        const dismissLabel = document.getElementById('update-popup-dismiss-label');

        renderCurrentVersion();

        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        closeBtn.disabled = false;
        countdownSpan.textContent = '关闭';
        dismissLabel.style.display = 'none';

        overlay.classList.add('visible');
    };

    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('update-popup-close-btn');
        const historyBtn = document.getElementById('update-popup-history-btn');
        const backBtn = document.getElementById('update-popup-back-btn');

        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (historyBtn) historyBtn.addEventListener('click', renderHistory);
        if (backBtn) backBtn.addEventListener('click', renderCurrentVersion);
    });
})();
