// =======================================================================
// ===               EPhone 游戏大厅 (Game Hall) 协调脚本              ===
// =======================================================================
// 此文件负责初始化共享工具函数、管理游戏大厅入口，
// 各游戏的具体逻辑已拆分到 apps/gamehall/ 目录下的独立文件中。

window.GameHall = {};

document.addEventListener('DOMContentLoaded', () => {
    const GH = window.GameHall;

    // =====================================================================
    // ===                    共享变量 & 模态框                           ===
    // =====================================================================

    let modalOverlay,
        modalConfirmBtn,
        modalCancelBtn,
        modalResolve = null;
    modalOverlay = document.getElementById('custom-modal-overlay');
    modalConfirmBtn = document.getElementById('custom-modal-confirm');
    modalCancelBtn = document.getElementById('custom-modal-cancel');

    // =====================================================================
    // ===                    共享工具函数                                ===
    // =====================================================================

    function addLongPressListener(element, callback) {
        let pressTimer;
        const startPress = e => {
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

    /**
     * 将Markdown文本安全地渲染为HTML
     * @param {string} markdownText - 原始的Markdown文本
     * @returns {string} - 处理和净化后的安全HTML字符串
     */
    function renderMarkdown(markdownText) {
        if (!markdownText) return '';
        let processedText = markdownText.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler">$1</span>');
        let rawHtml = marked.parse(processedText, { gfm: true, breaks: true });
        let sanitizedHtml = DOMPurify.sanitize(rawHtml);
        return sanitizedHtml;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function findLastIndex(array, predicate) {
        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i], i, array)) {
                return i;
            }
        }
        return -1;
    }

    function simpleSimilarity(str1, str2) {
        const set1 = new Set(str1.split(''));
        const set2 = new Set(str2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
    }

    function hideCustomModal() {
        modalOverlay.classList.remove('visible');
        modalConfirmBtn.classList.remove('btn-danger');
        if (modalResolve) modalResolve(null);
    }

    GH.sleep = sleep;
    GH.renderMarkdown = renderMarkdown;
    GH.findLastIndex = findLastIndex;
    GH.simpleSimilarity = simpleSimilarity;
    GH.addLongPressListener = addLongPressListener;
    GH.hideCustomModal = hideCustomModal;

    // =====================================================================
    // ===                 游戏大厅入口 & 模块初始化                      ===
    // =====================================================================

    document.getElementById('game-hall-grid').addEventListener('click', e => {
        const gameCard = e.target.closest('.game-card');
        if (!gameCard) return;

        const gameId = gameCard.dataset.game;
        if (gameId === 'werewolf') {
            GH.werewolf.openSetup();
        } else if (gameId === 'sea-turtle-soup') {
            GH.seaTurtleSoup.openSetup();
        } else if (gameId === 'script-kill') {
            GH.scriptKill.openSetup();
        } else if (gameId === 'guess-what') {
            GH.guessWhat.openSetup();
        } else if (gameId === 'ludo') {
            GH.ludo.openSetup();
        } else if (gameId === 'undercover') {
            GH.undercover.openSetup();
        } else {
            alert(`"${gameCard.querySelector('.game-title').textContent}"还在开发中，敬请期待！`);
        }
    });

    if (GH.werewolf) GH.werewolf.initEvents();
    if (GH.seaTurtleSoup) GH.seaTurtleSoup.initEvents();
    if (GH.scriptKill) GH.scriptKill.initEvents();
    if (GH.guessWhat) GH.guessWhat.initEvents();
    if (GH.ludo) GH.ludo.initEvents();
    if (GH.undercover) GH.undercover.initEvents();

    if (GH.ludo && GH.ludo.migrateDefaultQuestions) {
        GH.ludo.migrateDefaultQuestions();
    }
});
