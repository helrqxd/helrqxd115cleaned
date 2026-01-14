(function () {
    // --- 模块私有状态 ---
    let isWorldBookEditMode = false;
    let selectedWorldBooks = new Set();
    let editingWorldBookId = null;

    // --- 外部依赖 (通过 init 注入) ---
    let db;
    let addLongPressListener;
    let showCustomConfirm;
    let showCustomAlert;
    let showChoiceModal;
    let showCustomPrompt;
    let showScreen;
    let toggleUserStickerSelectionMode; // Some other toggles if needed?
    // Note: window.state is used directly

    const WorldBookModule = {
        init: function (dependencies) {
            db = dependencies.db;
            addLongPressListener = dependencies.addLongPressListener;
            showCustomConfirm = dependencies.showCustomConfirm;
            showCustomAlert = dependencies.showCustomAlert;
            showChoiceModal = dependencies.showChoiceModal;
            showCustomPrompt = dependencies.showCustomPrompt;
            showScreen = dependencies.showScreen;

            // 初始化事件监听
            setupEventListeners();
        },

        // 导出供外部调用的函数
        renderWorldBookScreen: renderWorldBookScreen,
        saveWorldBookEntriesFromArray: saveWorldBookEntriesFromArray,
        parseAndSaveWorldBooks: parseAndSaveWorldBooks, // 如果需要
        renderCategoryListInManager: renderCategoryListInManager,
        addNewCategory: addNewCategory,
        deleteCategory: deleteCategory,
    };

    // 暴露给全局
    window.WorldBookModule = WorldBookModule;

    // --- 核心逻辑函数 ---

    /**
     * 渲染世界书主页
     */
    async function renderWorldBookScreen() {
        const listEl = document.getElementById('world-book-list');
        listEl.innerHTML = '';

        // 1. 同时获取所有书籍和所有分类
        const [books, categories] = await Promise.all([db.worldBooks.toArray(), db.worldBookCategories.orderBy('name').toArray()]);

        window.state.worldBooks = books; // 确保内存中的数据是同步的

        if (books.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">点击右上角 "+" 创建你的第一本世界书</p>';
            return;
        }

        // 2. 将书籍按 categoryId 分组
        const groupedBooks = books.reduce((acc, book) => {
            const key = book.categoryId || 'uncategorized';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(book);
            return acc;
        }, {});

        // 3. 优先渲染已分类的书籍
        categories.forEach((category) => {
            const booksInCategory = groupedBooks[category.id];
            if (booksInCategory && booksInCategory.length > 0) {
                const groupContainer = createWorldBookGroup(category.name, booksInCategory);
                listEl.appendChild(groupContainer);
            }
        });

        // 4. 最后渲染未分类的书籍
        const uncategorizedBooks = groupedBooks['uncategorized'];
        if (uncategorizedBooks && uncategorizedBooks.length > 0) {
            const groupContainer = createWorldBookGroup('未分类', uncategorizedBooks);
            listEl.appendChild(groupContainer);
        }

        // 5. 为所有分组标题添加折叠事件
        document.querySelectorAll('.world-book-group-header').forEach((header) => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                header.nextElementSibling.classList.toggle('collapsed');
            });
        });
    }

    /**
     * 【辅助函数】创建一个分类的分组DOM
     */
    function createWorldBookGroup(groupName, books) {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'world-book-group-container';

        groupContainer.innerHTML = `
            <div class="world-book-group-header">
                <span class="arrow">▼</span>
                <span class="group-name">${groupName}</span>
            </div>
            <div class="world-book-group-content"></div>
        `;

        const headerEl = groupContainer.querySelector('.world-book-group-header');
        const contentEl = groupContainer.querySelector('.world-book-group-content');

        // 默认给头部和内容区都加上 collapsed 类
        headerEl.classList.add('collapsed');
        contentEl.classList.add('collapsed');

        books.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        books.forEach((book) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.dataset.bookId = book.id;
            item.innerHTML = `<div class="item-title">${book.name}</div><div class="item-content">${(book.content || '暂无内容...').substring(0, 50)}</div>`;

            // 编辑模式下的样式处理 (如果正在编辑模式渲染)
            if (isWorldBookEditMode) {
                item.classList.add('selection-mode'); // 确保样式一致
                if (selectedWorldBooks.has(book.id)) {
                    item.classList.add('selected');
                }
            }

            // 点击事件由 handleWorldBookListClick 统一代理，这里不再绑定 click

            addLongPressListener(item, async () => {
                const confirmed = await showCustomConfirm('删除世界书', `确定要删除《${book.name}》吗？此操作不可撤销。`, { confirmButtonClass: 'btn-danger' });
                if (confirmed) {
                    await db.worldBooks.delete(book.id);
                    state.worldBooks = state.worldBooks.filter((wb) => wb.id !== book.id);
                    renderWorldBookScreen();
                }
            });
            contentEl.appendChild(item);
        });

        return groupContainer;
    }

    async function openWorldBookEditor(bookId) {
        editingWorldBookId = bookId;
        const [book, categories] = await Promise.all([db.worldBooks.get(bookId), db.worldBookCategories.toArray()]);
        if (!book) return;

        document.getElementById('world-book-editor-title').textContent = book.name;
        document.getElementById('world-book-name-input').value = book.name;
        document.getElementById('world-book-content-input').value = book.content;

        // 填充分类下拉菜单
        const selectEl = document.getElementById('world-book-category-select');
        selectEl.innerHTML = '<option value="">-- 未分类 --</option>'; // 默认选项
        categories.forEach((cat) => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (book.categoryId === cat.id) {
                option.selected = true; // 选中当前分类
            }
            selectEl.appendChild(option);
        });

        showScreen('world-book-editor-screen');
    }

    /**
     * 切换世界书的编辑模式
     */
    async function toggleWorldBookEditMode() {
        isWorldBookEditMode = !isWorldBookEditMode;

        const screen = document.getElementById('world-book-screen');
        const listEl = document.getElementById('world-book-list');
        const editBtn = document.getElementById('toggle-world-book-edit-mode-btn');
        const manageBtn = document.getElementById('manage-categories-in-edit-mode-btn');
        const addBtn = document.getElementById('add-world-book-btn');
        const importBtn = document.getElementById('import-world-book-btn');

        const deleteBtn = document.getElementById('world-book-delete-selected-btn');

        screen.classList.toggle('selection-mode', isWorldBookEditMode);
        listEl.classList.toggle('selection-mode', isWorldBookEditMode);

        if (isWorldBookEditMode) {
            editBtn.textContent = '完成';
            manageBtn.style.display = 'inline-block';
            deleteBtn.style.display = 'inline-flex'; // 让删除按钮显示
            addBtn.style.display = 'none';
            importBtn.style.display = 'none';
        } else {
            editBtn.textContent = '编辑模式';
            manageBtn.style.display = 'none';
            deleteBtn.style.display = 'none'; // 让删除按钮隐藏
            addBtn.style.display = 'inline-block';
            importBtn.style.display = 'inline-block';
            selectedWorldBooks.clear();
            updateWorldBookDeleteButton();
        }

        await renderWorldBookScreen();
    }

    /**
     * 处理世界书列表项的点击事件（兼容普通模式和编辑模式）
     */
    function handleWorldBookListClick(e) {
        const item = e.target.closest('.list-item');
        if (!item) return;

        const bookId = item.dataset.bookId;
        if (!bookId) return;

        if (isWorldBookEditMode) {
            // 编辑模式：处理选择/取消选择
            item.classList.toggle('selected');
            if (selectedWorldBooks.has(bookId)) {
                selectedWorldBooks.delete(bookId);
            } else {
                selectedWorldBooks.add(bookId);
            }
            updateWorldBookDeleteButton();
        } else {
            // 普通模式：打开编辑器
            openWorldBookEditor(bookId);
        }
    }

    /**
     * 更新头部删除按钮的状态和计数
     */
    function updateWorldBookDeleteButton() {
        const deleteBtn = document.getElementById('world-book-delete-selected-btn');
        const countSpan = document.getElementById('world-book-delete-count');
        const count = selectedWorldBooks.size;

        // 更新按钮旁边的数字
        if (count > 0) {
            countSpan.textContent = `(${count})`;
        } else {
            countSpan.textContent = '';
        }

        // 切换按钮的禁用状态
        deleteBtn.disabled = count === 0;
    }

    /**
     * 处理批量删除世界书的逻辑
     */
    async function handleBulkDeleteWorldBooks() {
        if (selectedWorldBooks.size === 0) return;

        const confirmed = await showCustomConfirm('确认删除', `确定要永久删除选中的 ${selectedWorldBooks.size} 本世界书吗？此操作不可恢复。`, { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            const idsToDelete = Array.from(selectedWorldBooks);
            await db.worldBooks.bulkDelete(idsToDelete);

            state.worldBooks = state.worldBooks.filter((wb) => !idsToDelete.includes(wb.id));

            // 退出编辑模式
            await toggleWorldBookEditMode();

            await showCustomAlert('删除成功', `${idsToDelete.length} 本世界书已删除。`);
        }
    }

    /**
     * 从SillyTavern的 world_entries 或 character_book.entries 数组直接创建世界书
     */
    async function saveWorldBookEntriesFromArray(entriesArray, categoryId) {
        const newBooks = [];

        for (const entry of entriesArray) {
            const entryName = entry.comment && entry.comment.trim() ? entry.comment.trim() : entry.keys && entry.keys.length > 0 ? entry.keys.join(', ') : '未命名条目';

            if (entryName !== '未命名条目' && entry.content && (typeof entry.enabled === 'undefined' || entry.enabled)) {
                newBooks.push({
                    id: 'wb_' + Date.now() + Math.random(),
                    name: entryName,
                    content: entry.content,
                    categoryId: categoryId,
                });
            }
        }

        if (newBooks.length > 0) {
            await db.worldBooks.bulkAdd(newBooks);
            const allBooks = await db.worldBooks.toArray();
            state.worldBooks = allBooks;
            console.log(`成功导入 ${newBooks.length} 个世界书条目到分类ID: ${categoryId}`);
        }
    }

    /**
     * 解析 world_info (string) 和 data.world (string)
     */
    async function parseAndSaveWorldBooks(worldString, categoryId) {
        // 如果无法确定实现，这里暂时空置或提供基本的解析
        // 假设 worldString 是 JSON 字符串
        try {
            let data = JSON.parse(worldString);
            // 如果是数组
            if (Array.isArray(data)) {
                await saveWorldBookEntriesFromArray(data, categoryId);
            } else if (data && typeof data === 'object') {
                // 可能是 map 或者 { entries: [] }
                if (data.entries) {
                    await saveWorldBookEntriesFromArray(data.entries, categoryId);
                } else {
                    // 尝试作为单个对象或字典处理
                    const entries = Object.values(data);
                    await saveWorldBookEntriesFromArray(entries, categoryId);
                }
            }
        } catch (e) {
            console.error("解析世界书字符串失败", e);
        }
    }

    // --- 分类管理相关 ---

    async function renderCategoryListInManager() {
        const listEl = document.getElementById('existing-categories-list');
        const categories = await db.worldBookCategories.toArray();
        listEl.innerHTML = '';
        if (categories.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">还没有任何分类</p>';
        }
        categories.forEach((cat) => {
            const item = document.createElement('div');
            item.className = 'existing-group-item';
            item.innerHTML = `
                <span class="group-name">${cat.name}</span>
                <span class="delete-group-btn" data-id="${cat.id}">×</span>
            `;
            // 绑定删除事件
            item.querySelector('.delete-group-btn').addEventListener('click', () => deleteCategory(cat.id));
            listEl.appendChild(item);
        });
    }

    async function addNewCategory() {
        const input = document.getElementById('new-category-name-input');
        const name = input.value.trim();
        if (!name) {
            alert('分类名不能为空！');
            return;
        }
        const existing = await db.worldBookCategories.where('name').equals(name).first();
        if (existing) {
            alert(`分类 "${name}" 已经存在了！`);
            return;
        }
        await db.worldBookCategories.add({ name });
        input.value = '';
        await renderCategoryListInManager();
    }

    async function deleteCategory(categoryId) {
        // 确保 ID 类型正确
        categoryId = parseInt(categoryId);
        const category = await db.worldBookCategories.get(categoryId);
        if (!category) return;

        const choice = await showChoiceModal(`删除分类 "${category.name}"`, [
            { text: '删除分类及其所有世界书', value: 'delete_all' },
            { text: '仅删除分类 (书变为未分类)', value: 'delete_category_only' },
        ]);

        if (!choice) return;

        if (choice === 'delete_all') {
            const confirmed = await showCustomConfirm('危险操作', `你确定要永久删除分类 "${category.name}" 以及其中的【所有】世界书吗？此操作无法恢复！`, { confirmButtonClass: 'btn-danger' });
            if (!confirmed) return;

            const booksToDelete = await db.worldBooks.where('categoryId').equals(categoryId).toArray();
            const bookIdsToDelete = booksToDelete.map((book) => book.id);
            if (bookIdsToDelete.length > 0) {
                await db.worldBooks.bulkDelete(bookIdsToDelete);
                state.worldBooks = state.worldBooks.filter((wb) => !bookIdsToDelete.includes(wb.id));
            }
            await db.worldBookCategories.delete(categoryId);
            await showCustomAlert('删除成功', `分类 "${category.name}" 及其下的所有世界书已被删除。`);
        } else if (choice === 'delete_category_only') {
            const booksToUpdate = await db.worldBooks.where('categoryId').equals(categoryId).toArray();
            if (booksToUpdate.length > 0) {
                for (const book of booksToUpdate) {
                    book.categoryId = null;
                }
                await db.worldBooks.bulkPut(booksToUpdate);
                booksToUpdate.forEach((updatedBook) => {
                    const bookInState = state.worldBooks.find((wb) => wb.id === updatedBook.id);
                    if (bookInState) bookInState.categoryId = null;
                });
            }
            await db.worldBookCategories.delete(categoryId);
            await showCustomAlert('删除成功', `分类 "${category.name}" 已被删除。`);
        }

        await renderCategoryListInManager();
        await renderWorldBookScreen();
    }

    // 打开分类管理器弹窗
    function openCategoryManager() {
        renderCategoryListInManager();
        document.getElementById('world-book-category-manager-modal').classList.add('visible');
    }

    function setupEventListeners() {
        // 1. PIN解锁与导入逻辑
        document.getElementById('import-world-book-btn').addEventListener('click', async () => {
            const unlockKey = 'is_world_book_import_unlocked';
            const isUnlocked = localStorage.getItem(unlockKey) === 'true';

            if (isUnlocked) {
                document.getElementById('world-book-import-input').click();
                return;
            }

            // 获取设备码
            let deviceCode = "Unknown";
            if (window.getDeviceCode) {
                deviceCode = window.getDeviceCode();
            }

            const modalHtmlContent = `
                <p style="margin-bottom: 15px;">请前往取PIN网站，使用下面的设备码获取PIN。</p>
                <div style="background: #eee; padding: 10px; border-radius: 6px; margin-bottom: 15px; user-select: all; cursor: copy;" title="点击复制设备码">
                    <strong>设备码:</strong> <span id="device-code-to-copy">${deviceCode}</span>
                </div>
                <p id="copy-device-code-feedback" style="height: 15px; font-size: 12px; color: green;"></p>
            `;

            const userPin = await showCustomPrompt('功能解锁', '请在此输入获取到的PIN码...', '', 'text', modalHtmlContent);
            if (userPin === null) return;

            // 假设 window.generatePinFromDeviceCode 存在
            const correctPin = window.generatePinFromDeviceCode ? window.generatePinFromDeviceCode(deviceCode) : "0000";
            if (userPin.trim().toUpperCase() === correctPin) {
                localStorage.setItem(unlockKey, 'true');
                await showCustomAlert('解锁成功！', '导入功能已解锁，此设备无需再次输入PIN码。');
                document.getElementById('world-book-import-input').click();
            } else {
                await showCustomAlert('解锁失败', 'PIN码错误，请重新获取或输入。');
            }
        });

        document.getElementById('world-book-import-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImportSillyTavernWorldBook(file);
            }
            e.target.value = null;
        });

        document.getElementById('toggle-world-book-edit-mode-btn').addEventListener('click', toggleWorldBookEditMode);

        document.getElementById('manage-categories-in-edit-mode-btn').addEventListener('click', openCategoryManager);

        document.getElementById('world-book-list').addEventListener('click', handleWorldBookListClick);

        document.getElementById('world-book-delete-selected-btn').addEventListener('click', handleBulkDeleteWorldBooks);

        document.getElementById('add-world-book-btn').addEventListener('click', async () => {
            const name = await showCustomPrompt('创建世界书', '请输入书名');
            if (name && name.trim()) {
                const newBook = { id: 'wb_' + Date.now(), name: name.trim(), content: '' };
                await db.worldBooks.add(newBook);
                state.worldBooks.push(newBook);
                renderWorldBookScreen();
                openWorldBookEditor(newBook.id);
            }
        });

        document.getElementById('save-world-book-btn').addEventListener('click', async () => {
            if (!editingWorldBookId) return;
            const book = state.worldBooks.find((wb) => wb.id === editingWorldBookId);
            if (book) {
                const newName = document.getElementById('world-book-name-input').value.trim();
                if (!newName) {
                    alert('书名不能为空！');
                    return;
                }
                book.name = newName;
                book.content = document.getElementById('world-book-content-input').value;

                const categoryId = document.getElementById('world-book-category-select').value;
                book.categoryId = categoryId ? parseInt(categoryId) : null;

                await db.worldBooks.put(book);
                document.getElementById('world-book-editor-title').textContent = newName;
                editingWorldBookId = null;
                renderWorldBookScreen();
                showScreen('world-book-screen');
            }
        });

        // 分类管理器内部的按钮监听
        const addCatBtn = document.getElementById('add-new-category-btn');
        if (addCatBtn) addCatBtn.addEventListener('click', addNewCategory);

        const closeCatBtn = document.getElementById('close-category-manager-btn');
        if (closeCatBtn) closeCatBtn.addEventListener('click', () => {
            document.getElementById('world-book-category-manager-modal').classList.remove('visible');
            renderWorldBookScreen(); // 刷新以反映可能的变更
        });
    }

    /**
     * 处理SillyTavern格式的世界书导入
     * (从 main-app.js 移植)
     */
    async function handleImportSillyTavernWorldBook(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonStr = e.target.result;
                const data = JSON.parse(jsonStr);

                // 尝试解析
                const newCategoryName = file.name.replace('.json', '').replace('.jsonl', '');
                const newCategory = { name: newCategoryName };
                const newCategoryId = await db.worldBookCategories.add(newCategory);

                // 几种可能的格式
                if (Array.isArray(data)) {
                    // 可能是 entries 数组
                    await saveWorldBookEntriesFromArray(data, newCategoryId);
                } else if (data.entries && Array.isArray(data.entries)) {
                    await saveWorldBookEntriesFromArray(data.entries, newCategoryId);
                } else {
                    // 尝试作为单个对象字典
                    const entries = Object.values(data).filter(item => typeof item === 'object');
                    if (entries.length > 0) {
                        await saveWorldBookEntriesFromArray(entries, newCategoryId);
                    } else {
                        throw new Error("无法识别的文件格式");
                    }
                }

                await showCustomAlert('导入成功', `已导入世界书 "${newCategoryName}"`);
                renderWorldBookScreen();

            } catch (error) {
                console.error(error);
                await showCustomAlert('导入失败', '无法解析该文件，请确认是有效的SillyTavern世界书格式。');
            }
        };
        reader.readAsText(file);
    }

})();
