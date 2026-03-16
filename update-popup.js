// update-popup.js — 独立的更新弹窗模块
// 每次发版只需在 UPDATE_LOG 数组头部添加一条新记录即可

const UPDATE_LOG = [
    {
        version: '2026.03.17',
        date: '2026-03-17',
        sections: [
            {
                title: '🐛 Bug 修复',
                items: [
                    '修复无法保存主屏幕预设的问题',
                    '修复小红书发现页和关注页生成情况同步，生成按钮状态不自动更新',
                    '修复小红书笔记详情页生成评论时，切换笔记仍显示“生成中”',
                    '修复发送图片时ai不读取图片内容',
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
