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
    // ===                    世界书绑定功能                              ===
    // =====================================================================
    const GH_WB_SETTINGS_KEY = 'gameHallWorldBookSettings';

    function getGhWbSettings() {
        try {
            const saved = localStorage.getItem(GH_WB_SETTINGS_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return {};
    }

    function saveGhWbSettings(settings) {
        localStorage.setItem(GH_WB_SETTINGS_KEY, JSON.stringify(settings));
    }

    function getCurrentGhWbScope() {
        const sel = document.getElementById('gh-wb-bind-scope');
        return sel ? sel.value : 'all';
    }

    async function renderGhWbPanel() {
        const panel = document.getElementById('gh-wb-dropdown-panel');
        const header = document.getElementById('gh-wb-dropdown-header');
        if (!panel) return;

        panel.classList.remove('open');
        if (header) header.classList.remove('open');

        const scope = getCurrentGhWbScope();
        const settings = getGhWbSettings();
        const linkedIds = (settings[scope] || []).map(String);

        let allBooks = window.state?.worldBooks || [];
        if (allBooks.length === 0 && window.db && window.db.worldBooks) {
            try {
                allBooks = await window.db.worldBooks.toArray();
                if (window.state) window.state.worldBooks = allBooks;
            } catch (e) { /* ignore */ }
        }

        if (allBooks.length === 0) {
            panel.innerHTML = '<div class="gh-wb-empty">暂无世界书，请先在世界书管理中创建。</div>';
            panel.classList.add('open');
            if (header) header.classList.add('open');
            updateGhWbSummary();
            return;
        }

        let categories = [];
        try {
            if (window.db && window.db.worldBookCategories) {
                categories = await window.db.worldBookCategories.toArray();
            }
        } catch (e) { /* ignore */ }
        buildGhWbPanelContent(categories, allBooks, linkedIds, panel);
        panel.classList.add('open');
        if (header) header.classList.add('open');
    }

    function buildGhWbPanelContent(categories, allBooks, linkedIds, panel) {
        const hasUncategorized = allBooks.some(wb => !wb.categoryId);
        if (hasUncategorized) {
            categories = [...categories, { id: 'uncategorized', name: '未分类' }];
        }

        const booksByCat = allBooks.reduce((acc, wb) => {
            const catId = wb.categoryId || 'uncategorized';
            if (!acc[catId]) acc[catId] = [];
            acc[catId].push(wb);
            return acc;
        }, {});

        panel.innerHTML = '';
        categories.forEach(cat => {
            const booksInCat = booksByCat[cat.id] || [];
            if (booksInCat.length === 0) return;

            const allChecked = booksInCat.every(wb => linkedIds.includes(String(wb.id)));

            const headerEl = document.createElement('div');
            headerEl.className = 'gh-wb-cat-header collapsed';
            headerEl.innerHTML = `
                <span class="gh-wb-cat-arrow">▼</span>
                <input type="checkbox" class="gh-wb-cat-cb" data-cat-id="${cat.id}" ${allChecked ? 'checked' : ''}>
                <span class="gh-wb-cat-name">${cat.name}</span>
                <span class="gh-wb-cat-count">(${booksInCat.length})</span>`;

            const container = document.createElement('div');
            container.className = 'gh-wb-book-container collapsed';
            container.dataset.catId = cat.id;

            booksInCat.forEach(wb => {
                const isChecked = linkedIds.includes(String(wb.id));
                const item = document.createElement('label');
                item.className = 'gh-wb-book-item';
                const globalTag = wb.isGlobal ? '<span class="gh-wb-global-tag">全局</span>' : '';
                item.innerHTML = `<input type="checkbox" class="gh-wb-book-cb" value="${wb.id}" data-cat-id="${cat.id}" ${isChecked ? 'checked' : ''}> <span>${wb.name || '未命名'}</span> ${globalTag}`;
                container.appendChild(item);
            });

            panel.appendChild(headerEl);
            panel.appendChild(container);
        });

        panel.querySelectorAll('.gh-wb-cat-header').forEach(h => {
            h.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                h.classList.toggle('collapsed');
                const catId = h.querySelector('.gh-wb-cat-cb').dataset.catId;
                const cont = panel.querySelector(`.gh-wb-book-container[data-cat-id="${catId}"]`);
                if (cont) cont.classList.toggle('collapsed');
            });
        });

        panel.querySelectorAll('.gh-wb-cat-cb').forEach(catCb => {
            catCb.addEventListener('change', () => {
                const catId = catCb.dataset.catId;
                const cont = panel.querySelector(`.gh-wb-book-container[data-cat-id="${catId}"]`);
                if (cont) cont.querySelectorAll('.gh-wb-book-cb').forEach(cb => { cb.checked = catCb.checked; });
                saveGhWbSelection();
            });
        });

        panel.querySelectorAll('.gh-wb-book-cb').forEach(bookCb => {
            bookCb.addEventListener('change', () => {
                const catId = bookCb.dataset.catId;
                const catCheckbox = panel.querySelector(`.gh-wb-cat-cb[data-cat-id="${catId}"]`);
                const cont = panel.querySelector(`.gh-wb-book-container[data-cat-id="${catId}"]`);
                if (catCheckbox && cont) {
                    const allInCat = cont.querySelectorAll('.gh-wb-book-cb');
                    catCheckbox.checked = [...allInCat].every(cb => cb.checked);
                }
                saveGhWbSelection();
            });
        });

        updateGhWbSummary();
    }

    function updateGhWbSummary() {
        const summaryEl = document.getElementById('gh-wb-dropdown-summary');
        if (!summaryEl) return;
        const panel = document.getElementById('gh-wb-dropdown-panel');
        const checked = panel ? panel.querySelectorAll('.gh-wb-book-cb:checked') : [];
        if (checked.length === 0) {
            summaryEl.textContent = '点击选择世界书...';
        } else {
            const names = [...checked].map(cb => {
                const span = cb.parentElement?.querySelector('span');
                return span ? span.textContent : '';
            }).filter(Boolean);
            summaryEl.textContent = `已选择 ${names.length} 本: ${names.join(', ')}`;
        }
    }

    function saveGhWbSelection() {
        const settings = getGhWbSettings();
        const scope = getCurrentGhWbScope();
        const panel = document.getElementById('gh-wb-dropdown-panel');
        settings[scope] = [];
        if (panel) {
            panel.querySelectorAll('.gh-wb-book-cb:checked').forEach(cb => {
                settings[scope].push(cb.value);
            });
        }
        saveGhWbSettings(settings);
        updateGhWbSummary();
    }

    async function getGameWorldBookContent(gameId) {
        const settings = getGhWbSettings();
        let linkedIds = (settings[gameId] || []).map(String);
        const globalIds = (settings['all'] || []).map(String);
        const mergedIds = [...new Set([...globalIds, ...linkedIds])];
        if (mergedIds.length === 0) return '';

        let allBooks = window.state?.worldBooks || [];
        if (allBooks.length === 0 && window.db && window.db.worldBooks) {
            allBooks = await window.db.worldBooks.toArray();
            if (window.state) window.state.worldBooks = allBooks;
        }

        let content = '';
        mergedIds.forEach(id => {
            const book = allBooks.find(b => String(b.id) === String(id));
            if (!book) return;
            content += `\n【世界书: ${book.name}】\n`;
            if (book.content) content += book.content + '\n';
            if (book.entries && book.entries.length > 0) {
                book.entries.forEach(entry => {
                    if (entry.enabled !== false) {
                        content += `[${entry.keywords?.join(', ') || '条目'}]\n${entry.content}\n`;
                    }
                });
            }
        });

        const globalCtx = window.WorldBookModule?.getGlobalWorldBooksContext(mergedIds) || '';
        if (globalCtx) content += globalCtx;

        return content.trim();
    }

    GH.getGameWorldBookContent = getGameWorldBookContent;

    // 世界书设置按钮事件
    document.getElementById('game-hall-wb-settings-btn')?.addEventListener('click', () => {
        showScreen('game-hall-wb-screen');
        renderGhWbPanel();
    });

    document.getElementById('gh-wb-bind-scope')?.addEventListener('change', () => {
        renderGhWbPanel();
    });

    document.getElementById('gh-wb-dropdown-header')?.addEventListener('click', () => {
        const panel = document.getElementById('gh-wb-dropdown-panel');
        const header = document.getElementById('gh-wb-dropdown-header');
        if (panel) panel.classList.toggle('open');
        if (header) header.classList.toggle('open');
    });

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
        } else if (gameId === 'kings-game') {
            GH.kingsGame.openSetup();
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
    if (GH.kingsGame) GH.kingsGame.initEvents();

    if (GH.ludo && GH.ludo.migrateDefaultQuestions) {
        GH.ludo.migrateDefaultQuestions();
    }
});
