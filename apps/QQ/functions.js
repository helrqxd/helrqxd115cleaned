// apps/QQ/functions.js - QQ Chat Footer Functions & Extensions

// ===================================================================
// 1. 全局变量定义 (Sticker Related)
// ===================================================================

let isUserStickerSelectionMode = false;
let activeStickerCategoryId = 'uncategorized';
let userStickerCategories = []; // 用于缓存用户的所有分类
let isCharStickerSelectionMode = false;
let selectedCharStickers = new Set();
let selectedUserStickers = new Set();

// ===================================================================
// 2. 表情包核心功能函数
// ===================================================================

/**
 * 渲染表情面板
 */
function renderStickerPanel() {
    const grid = document.getElementById('sticker-grid');
    if (!grid) return; // 防御性检查
    grid.innerHTML = '';

    let stickersToRender;

    if (activeStickerCategoryId === 'uncategorized') {
        // 如果是“未分类”，就筛选出 categoryId 不存在或为空的表情
        stickersToRender = state.userStickers.filter((sticker) => !sticker.categoryId);
    } else {
        // 否则，按具体的分类ID筛选
        stickersToRender = state.userStickers.filter((sticker) => sticker.categoryId === activeStickerCategoryId);
    }

    if (stickersToRender.length === 0) {
        // 根据当前选中的分类，显示不同的提示语
        let message;
        if (activeStickerCategoryId === 'uncategorized') {
            // 如果所有表情都有分类了，这里也会是空的
            message = '没有未分类的表情哦~';
        } else {
            // 如果是在某个具体分类下，但是里面没表情
            message = '这个分类下还没有表情哦~';
        }
        // 如果整个表情库都是空的，给一个初始引导
        if (state.userStickers.length === 0) {
            message = '大人请点击右上角“添加”或“上传”来添加你的第一个表情吧！';
        }

        grid.innerHTML = `<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1;">${message}</p>`;
    } else {
        stickersToRender.forEach((sticker) => {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'sticker-item';

            const imageEl = document.createElement('div');
            imageEl.className = 'sticker-image';
            imageEl.style.backgroundImage = `url(${sticker.url})`;

            const nameEl = document.createElement('span');
            nameEl.className = 'sticker-name';
            nameEl.textContent = sticker.name;
            nameEl.title = sticker.name;

            if (isUserStickerSelectionMode) {
                imageEl.classList.add('in-selection-mode');
                if (selectedUserStickers.has(sticker.id)) {
                    imageEl.classList.add('selected');
                }
                itemContainer.addEventListener('click', () => {
                    imageEl.classList.toggle('selected');
                    if (selectedUserStickers.has(sticker.id)) {
                        selectedUserStickers.delete(sticker.id);
                    } else {
                        selectedUserStickers.add(sticker.id);
                    }
                    const deleteBtn = document.getElementById('delete-selected-user-stickers-btn');
                    deleteBtn.textContent = `删除已选 (${selectedUserStickers.size})`;
                    deleteBtn.disabled = selectedUserStickers.size === 0;

                    const moveBtn = document.getElementById('move-selected-stickers-btn');
                    moveBtn.disabled = selectedUserStickers.size === 0;
                });
            } else {
                itemContainer.addEventListener('click', () => sendSticker(sticker));
                addLongPressListener(imageEl, () => {
                    const existingDeleteBtn = imageEl.querySelector('.delete-btn');
                    if (existingDeleteBtn) return;

                    const deleteBtn = document.createElement('div');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.innerHTML = '&times;';
                    deleteBtn.style.display = 'block';
                    deleteBtn.onclick = async (e) => {
                        e.stopPropagation();
                        const confirmed = await showCustomConfirm('删除表情', `确定要删除表情 "${sticker.name}" 吗？`, {
                            confirmButtonClass: 'btn-danger',
                        });
                        if (confirmed) {
                            await db.userStickers.delete(sticker.id);
                            state.userStickers = state.userStickers.filter((s) => s.id !== sticker.id);
                            renderStickerPanel();
                        }
                    };
                    imageEl.appendChild(deleteBtn);
                    const removeDeleteBtn = () => {
                        if (deleteBtn) deleteBtn.remove();
                        imageEl.removeEventListener('mouseleave', removeDeleteBtn);
                    };
                    imageEl.addEventListener('mouseleave', removeDeleteBtn);
                });
            }

            itemContainer.appendChild(imageEl);
            itemContainer.appendChild(nameEl);
            grid.appendChild(itemContainer);
        });
    }

    // 每次渲染表情列表后，都更新一次分类页签栏
    renderStickerCategories();
}

/**
 * 下发/发送表情
 */
async function sendSticker(sticker) {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    const msg = { role: 'user', content: sticker.url, meaning: sticker.name, timestamp: Date.now() };
    chat.history.push(msg);
    await window.db.chats.put(chat);
    window.checkAndTriggerSummary(window.state.activeChatId);
    window.appendMessage(msg, chat);
    window.renderChatList();
    document.getElementById('sticker-panel').classList.remove('visible');
}

/**
 * 批量添加表情包
 */
async function openBulkAddStickersModal() {
    const placeholder = `在这里粘贴表情包，每行一个，格式如下：\n\n猫猫喝水：https://..../cat.gif\n狗狗摇头：https://..../dog.png\n\n(支持用中文冒号“：”、英文冒号“:”或空格分隔)`;

    const textInput = await showCustomPrompt('批量添加表情(URL)', '一行一个，名称和链接用冒号或空格隔开', '', 'textarea');

    if (!textInput || !textInput.trim()) {
        return;
    }

    const lines = textInput.trim().split('\n');
    const newStickers = [];
    let successCount = 0;
    let errorLines = [];

    lines.forEach((line, index) => {
        line = line.trim();
        if (!line) return;

        let name = '';
        let url = '';
        let splitIndex = -1;

        // 1. 查找 URL 的起始位置
        const httpIndex = line.indexOf('http');
        const dataIndex = line.indexOf('data:image');

        if (httpIndex > -1) {
            splitIndex = httpIndex;
        } else if (dataIndex > -1) {
            splitIndex = dataIndex;
        }

        // 2. 如果找到了 URL 的起始位置
        if (splitIndex > 0) {
            // URL 之前的所有内容都属于名称
            name = line.substring(0, splitIndex).trim();
            // 从 URL 起始位置到末尾的所有内容都属于 URL
            url = line.substring(splitIndex).trim();

            // 3. 清理名称末尾可能存在的分隔符
            if (name.endsWith(':') || name.endsWith('：')) {
                name = name.slice(0, -1).trim();
            }
        } else {
            // 如果找不到 URL，说明格式有问题
            errorLines.push(index + 1);
            return; // 跳过此行
        }

        if (name && (url.startsWith('http') || url.startsWith('data:image'))) {
            newStickers.push({
                id: 'sticker_' + (Date.now() + index),
                url: url,
                name: name,
            });
            successCount++;
        } else {
            errorLines.push(index + 1);
        }
    });

    if (newStickers.length > 0) {
        await db.userStickers.bulkAdd(newStickers);
        state.userStickers.push(...newStickers);
        renderStickerPanel();
    }

    let reportMessage = `批量导入完成！\n\n成功导入：${successCount} 个表情。`;
    if (errorLines.length > 0) {
        reportMessage += `\n失败行号：${errorLines.join(', ')}。\n\n请检查这些行的格式是否正确。`;
    }
    await showCustomAlert('导入报告', reportMessage);
}

/**
 * 批量添加角色表情
 */
async function bulkAddCharStickers(type) {
    const textInput = await showCustomPrompt(`批量添加${type === 'exclusive' ? '专属' : '通用'}表情`, '一行一个，格式：\n猫猫喝水 https://..../cat.gif', '', 'textarea');
    if (!textInput || !textInput.trim()) return;

    const lines = textInput.trim().split('\n');
    const newStickers = [];
    let successCount = 0;

    lines.forEach((line, index) => {
        line = line.trim();
        if (!line) return;

        let name = '';
        let url = '';
        let splitIndex = -1;
        const httpIndex = line.indexOf('http');
        const dataIndex = line.indexOf('data:image');
        if (httpIndex > -1) {
            splitIndex = httpIndex;
        } else if (dataIndex > -1) {
            splitIndex = dataIndex;
        }

        if (splitIndex > 0) {
            name = line.substring(0, splitIndex).trim();
            url = line.substring(splitIndex).trim();
            if (name.endsWith(':') || name.endsWith('：')) {
                name = name.slice(0, -1).trim();
            }
        }

        if (name && (url.startsWith('http') || url.startsWith('data:image'))) {
            const stickerData = { url, name };
            if (type !== 'exclusive') {
                stickerData.id = 'char_sticker_' + (Date.now() + index);
            }
            newStickers.push(stickerData);
            successCount++;
        }
    });

    if (newStickers.length > 0) {
        if (type === 'exclusive') {
            const chat = state.chats[state.activeChatId];
            chat.settings.stickerLibrary.push(...newStickers);
            await db.chats.put(chat);
        } else {
            await db.charStickers.bulkAdd(newStickers);
        }
        await renderCharStickers(type); // 在数据库操作后，统一重新渲染
    }
    await showCustomAlert('导入报告', `成功导入：${successCount} 个表情。`);
}

/**
 * 从本地上传角色表情
 */
async function uploadCharStickersLocal(type) {
    const input = document.getElementById('char-sticker-upload-input'); // 应该长这样
    if (!input) return;
    input.onchange = async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        const stickersToAdd = []; // 先收集所有要添加的表情

        for (const file of files) {
            const name = await showCustomPrompt('为表情命名', '请输入表情名称', file.name.replace(/\.[^/.]+$/, ''));
            if (name && name.trim()) {
                const base64Url = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                const stickerData = { name: name.trim(), url: base64Url };
                if (type !== 'exclusive') {
                    stickerData.id = 'char_sticker_' + Date.now() + Math.random();
                }
                stickersToAdd.push(stickerData);
            }
        }

        if (stickersToAdd.length > 0) {
            if (type === 'exclusive') {
                const chat = state.chats[state.activeChatId];
                chat.settings.stickerLibrary.push(...stickersToAdd);
                await db.chats.put(chat);
            } else {
                await db.charStickers.bulkAdd(stickersToAdd);
            }
            await renderCharStickers(type); // 在数据库操作后，统一重新渲染
            alert(`已成功上传 ${stickersToAdd.length} 个表情！`);
        }

        event.target.value = null;
    };
    input.click();
}

/**
 * 显示指定的角色表情包标签页
 */
function showCharStickerTab(type) {
    // 1. 切换标签按钮的 'active' 状态
    document.querySelectorAll('.char-sticker-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    // 2. 切换内容区域的显示
    document.querySelectorAll('.sticker-tab-content').forEach((content) => {
        content.classList.toggle('active', content.id === `${type}-sticker-content`);
    });

    // 3. 渲染对应标签页的表情
    renderCharStickers(type);
}

/**
 * 渲染角色表情
 */
async function renderCharStickers(type) {
    const isExclusive = type === 'exclusive';
    const gridId = isExclusive ? 'exclusive-sticker-grid' : 'common-sticker-grid';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';

    let stickers = [];
    if (isExclusive) {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        stickers = chat.settings.stickerLibrary || [];
    } else {
        state.charStickers = await db.charStickers.toArray();
        stickers = state.charStickers || [];
    }

    if (stickers.length === 0) {
        grid.innerHTML = `<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1;">这里还是空的哦~</p>`;
        return;
    }

    // 为了正确删除，我们需要原始索引
    const stickersWithIndex = stickers.map((sticker, index) => ({ ...sticker, originalIndex: index }));

    stickersWithIndex.forEach((sticker) => {
        const item = document.createElement('div');
        item.className = 'sticker-item';
        item.style.backgroundImage = `url(${sticker.url})`;
        item.title = sticker.name;

        // 我们使用 URL 作为唯一标识符，因为它在两种库中都是唯一的
        const uniqueId = sticker.url;

        if (isCharStickerSelectionMode) {
            // 【选择模式】下的逻辑
            item.classList.add('in-selection-mode');
            if (selectedCharStickers.has(uniqueId)) {
                item.classList.add('selected');
            }

            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                if (selectedCharStickers.has(uniqueId)) {
                    selectedCharStickers.delete(uniqueId);
                } else {
                    selectedCharStickers.add(uniqueId);
                }
                const deleteBtn = document.getElementById('delete-selected-char-stickers-btn');
                deleteBtn.textContent = `删除已选 (${selectedCharStickers.size})`;
                deleteBtn.disabled = selectedCharStickers.size === 0;
            });
        } else {
            // 【正常模式】下的逻辑（只有删除按钮）
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.display = 'block'; // 默认就显示
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await showCustomConfirm('删除表情', `确定要删除表情 "${sticker.name}" 吗？`, {
                    confirmButtonClass: 'btn-danger',
                });
                if (confirmed) {
                    if (isExclusive) {
                        const chat = state.chats[state.activeChatId];
                        chat.settings.stickerLibrary.splice(sticker.originalIndex, 1);
                        await db.chats.put(chat);
                    } else {
                        await db.charStickers.delete(sticker.id);
                    }
                    await renderCharStickers(type); // 刷新
                }
            };
            item.appendChild(deleteBtn);
        }
        grid.appendChild(item);
    });
}

/**
 * 切换用户表情选择模式
 */
function toggleUserStickerSelectionMode() {
    isUserStickerSelectionMode = !isUserStickerSelectionMode;
    const stickerPanel = document.getElementById('sticker-panel');

    selectedUserStickers.clear();
    // 在这里给父容器添加/移除一个class
    stickerPanel.classList.toggle('selection-mode', isUserStickerSelectionMode);

    document.getElementById('edit-user-stickers-btn').style.display = isUserStickerSelectionMode ? 'none' : 'block';
    document.getElementById('done-user-stickers-btn').style.display = isUserStickerSelectionMode ? 'block' : 'none';
    document.getElementById('sticker-panel-footer').style.display = isUserStickerSelectionMode ? 'flex' : 'none';

    const deleteBtn = document.getElementById('delete-selected-user-stickers-btn');
    deleteBtn.textContent = `删除已选 (0)`;
    deleteBtn.disabled = true;

    const moveBtn = document.getElementById('move-selected-stickers-btn');
    moveBtn.disabled = true;

    renderStickerPanel(); // 这一步会调用 renderStickerCategories，并根据新的模式重新渲染
}

/**
 * 退出用户表情包的选择模式
 */
function exitUserStickerSelectionMode() {
    if (isUserStickerSelectionMode) {
        toggleUserStickerSelectionMode();
    }
}

/**
 * 渲染表情分类列表
 */
async function renderStickerCategories() {
    const tabsContainer = document.getElementById('sticker-category-tabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = ''; // 清空旧的标签
    const categories = await db.userStickerCategories.orderBy('name').toArray();
    userStickerCategories = categories; // 更新全局缓存

    // 1. 渲染“未分类”按钮（这个按钮没有删除功能）
    const uncategorizedBtn = document.createElement('button');
    uncategorizedBtn.className = 'sticker-category-btn';
    uncategorizedBtn.textContent = '未分类';
    uncategorizedBtn.dataset.categoryId = 'uncategorized';
    if (activeStickerCategoryId === 'uncategorized') {
        uncategorizedBtn.classList.add('active');
    }
    tabsContainer.appendChild(uncategorizedBtn);

    // 2. 渲染所有自定义分类
    for (const category of categories) {
        const btn = document.createElement('button');
        btn.className = 'sticker-category-btn';
        // 将ID和名称都存储在父按钮上，方便事件委托获取
        btn.dataset.categoryId = category.id;
        btn.dataset.categoryName = category.name;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = category.name;
        btn.appendChild(nameSpan);

        // 如果是当前激活的分类，添加高亮
        if (activeStickerCategoryId === category.id) {
            btn.classList.add('active');
        }

        // 只在编辑模式下，才创建和添加删除按钮
        if (isUserStickerSelectionMode) {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'sticker-category-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = `删除分类 "${category.name}"`; // 增加悬浮提示
            btn.appendChild(deleteBtn);
        }

        tabsContainer.appendChild(btn);
    }
}

/**
 * 打开移动表情分类模态框
 */
async function openStickerCategoryModal() {
    if (selectedUserStickers.size === 0) {
        alert('请先选择要移动的表情包！');
        return;
    }

    const modal = document.getElementById('sticker-category-modal');
    const listEl = document.getElementById('sticker-category-list');
    const inputEl = document.getElementById('new-sticker-category-input');
    listEl.innerHTML = '';
    inputEl.value = '';

    const categories = await db.userStickerCategories.toArray();
    if (categories.length > 0) {
        categories.forEach((cat) => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="radio" name="sticker_category_select" value="${cat.id}"> ${cat.name}`;
            listEl.appendChild(label);
        });
    } else {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">还没有任何分类。</p>';
    }

    modal.classList.add('visible');
}

/**
 * 确认移动表情
 */
async function handleMoveStickers() {
    const newCategoryName = document.getElementById('new-sticker-category-input').value.trim();
    const selectedRadio = document.querySelector('input[name="sticker_category_select"]:checked');

    let targetCategoryId = null;

    if (newCategoryName) {
        try {
            // 检查分类是否已存在
            let existingCategory = await db.userStickerCategories.where('name').equalsIgnoreCase(newCategoryName).first();
            if (existingCategory) {
                targetCategoryId = existingCategory.id;
            } else {
                targetCategoryId = await db.userStickerCategories.add({ name: newCategoryName });
            }
        } catch (error) {
            alert('创建新分类失败，可能是名称重复或数据库错误。');
            return;
        }
    } else if (selectedRadio) {
        targetCategoryId = parseInt(selectedRadio.value);
    } else {
        alert('请选择一个分类或创建一个新分类！');
        return;
    }

    try {
        const stickerIdsToMove = Array.from(selectedUserStickers);
        const stickers = await db.userStickers.bulkGet(stickerIdsToMove);

        stickers.forEach((sticker) => {
            if (sticker) {
                sticker.categoryId = targetCategoryId;
            }
        });

        await db.userStickers.bulkPut(stickers);

        // 更新内存中的 state.userStickers
        stickers.forEach((updatedSticker) => {
            const index = state.userStickers.findIndex((s) => s.id === updatedSticker.id);
            if (index > -1) {
                state.userStickers[index].categoryId = targetCategoryId;
            }
        });

        document.getElementById('sticker-category-modal').classList.remove('visible');
        exitUserStickerSelectionMode(); // 退出编辑模式
        alert(`成功移动 ${stickerIdsToMove.length} 个表情！`);
    } catch (error) {
        console.error('移动表情失败:', error);
        alert('移动表情时出现错误: ' + error.message);
    }
}

/**
 * 删除表情分类
 */
async function handleDeleteStickerCategory(categoryId, categoryName) {
    if (isNaN(categoryId) || !categoryName) {
        alert('执行删除失败：传入的分类ID或名称无效！');
        return;
    }

    // 弹窗让用户选择如何处理分类下的表情
    const choice = await showChoiceModal(`删除分类 "${categoryName}"`, [
        { text: '仅删除分类 (表情移至“未分类”)', value: 'delete_category_only' },
        { text: '删除分类及所有表情 (不可恢复)', value: 'delete_all' },
    ]);

    if (!choice) return; // 如果用户点击了取消，则不执行任何操作

    try {
        if (choice === 'delete_category_only') {
            // 找到该分类下的所有表情
            const stickersToUpdate = state.userStickers.filter((s) => s.categoryId === categoryId);

            if (stickersToUpdate.length > 0) {
                // 将它们的分类ID设为 null 或 undefined，表示未分类
                stickersToUpdate.forEach((sticker) => {
                    sticker.categoryId = null;
                });
                await db.userStickers.bulkPut(stickersToUpdate);
            }
            // 从数据库删除分类本身
            await db.userStickerCategories.delete(categoryId);
        } else if (choice === 'delete_all') {
            // 找到该分类下的所有表情ID
            const stickerIdsToDelete = state.userStickers.filter((s) => s.categoryId === categoryId).map((s) => s.id);

            if (stickerIdsToDelete.length > 0) {
                // 从数据库批量删除这些表情
                await db.userStickers.bulkDelete(stickerIdsToDelete);
            }
            // 从数据库删除分类本身
            await db.userStickerCategories.delete(categoryId);
        }

        // 不论哪种方式，都需要从前端的 state 缓存中移除或更新数据
        state.userStickers = await db.userStickers.toArray();

        // 如果删除的是当前正在查看的分类，就切换回“未分类”
        if (activeStickerCategoryId === categoryId) {
            activeStickerCategoryId = 'uncategorized';
        }

        // 重新渲染整个表情面板（这会自动刷新分类和表情列表）
        renderStickerPanel();

        await showCustomAlert('操作成功', `分类 "${categoryName}" 已成功删除。`);
    } catch (error) {
        console.error('删除分类时出错:', error);
        alert(`操作失败，发生数据库错误: ${error.message}`);
    }
}

/**
 * 批量删除用户表情
 */
async function handleBulkDeleteUserStickers() {
    if (selectedUserStickers.size === 0) return;

    const confirmed = await showCustomConfirm('确认删除', `确定要删除选中的 ${selectedUserStickers.size} 个表情吗？`, { confirmButtonClass: 'btn-danger' });

    if (confirmed) {
        const idsToDelete = Array.from(selectedUserStickers);
        await db.userStickers.bulkDelete(idsToDelete);

        // 更新 State
        state.userStickers = state.userStickers.filter(s => !idsToDelete.includes(s.id));

        selectedUserStickers.clear();

        // 更新UI
        const deleteBtn = document.getElementById('delete-selected-user-stickers-btn');
        if (deleteBtn) {
            deleteBtn.textContent = `删除已选 (0)`;
            deleteBtn.disabled = true;
        }

        renderStickerPanel();
        await showCustomAlert('删除成功', `已删除 ${idsToDelete.length} 个表情。`);
    }
}

/**
 * 批量删除角色表情
 */
async function handleBulkDeleteCharStickers() {
    if (selectedCharStickers.size === 0) return;

    const confirmed = await showCustomConfirm('确认删除', `确定要删除选中的 ${selectedCharStickers.size} 个表情吗？`, { confirmButtonClass: 'btn-danger' });

    if (confirmed) {
        const activeTab = document.querySelector('#char-sticker-manager-screen .frame-tab.active');
        const type = activeTab && activeTab.id === 'sticker-tab-exclusive' ? 'exclusive' : 'common';

        const uniqueIdsToDelete = Array.from(selectedCharStickers);

        if (type === 'exclusive') {
            const chat = state.chats[state.activeChatId];
            // 使用 filter 移除
            chat.settings.stickerLibrary = chat.settings.stickerLibrary.filter(s => !uniqueIdsToDelete.includes(s.url));
            await db.chats.put(chat);
        } else {
            // 对于通用表情，我们需要找到 ID
            // 这里实际上 uniqueId 用的是 url。但是 db.delete 需要 ID。
            // 所以我们需要先找到对应的 ID
            const stickers = await db.charStickers.toArray();
            const idsToDelete = stickers.filter(s => uniqueIdsToDelete.includes(s.url)).map(s => s.id);
            await db.charStickers.bulkDelete(idsToDelete);
        }

        selectedCharStickers.clear();
        const deleteBtn = document.getElementById('delete-selected-char-stickers-btn');
        if (deleteBtn) {
            deleteBtn.textContent = `删除已选 (0)`;
            deleteBtn.disabled = true;
        }

        renderCharStickers(type);
        await showCustomAlert('删除成功', `已删除 ${uniqueIdsToDelete.length} 个表情。`);
    }
}

/** 切换角色表情选择模式 */
function toggleCharStickerSelectionMode() {
    isCharStickerSelectionMode = !isCharStickerSelectionMode;
    const screen = document.getElementById('char-sticker-manager-screen');

    // 清空选择集并更新UI
    selectedCharStickers.clear();
    screen.classList.toggle('selection-mode', isCharStickerSelectionMode);

    document.getElementById('edit-char-stickers-btn').style.display = isCharStickerSelectionMode ? 'none' : 'block';
    document.getElementById('done-char-stickers-btn').style.display = isCharStickerSelectionMode ? 'block' : 'none';
    document.getElementById('char-sticker-footer').style.display = isCharStickerSelectionMode ? 'block' : 'none';
    document.getElementById('delete-selected-char-stickers-btn').textContent = `删除已选 (0)`;
    document.getElementById('delete-selected-char-stickers-btn').disabled = true;

    // 重新渲染当前激活的页签
    const activeTab = document.querySelector('#char-sticker-manager-screen .frame-tab.active');
    if (activeTab) {
        renderCharStickers(activeTab.id === 'sticker-tab-exclusive' ? 'exclusive' : 'common');
    }
}


/**
 * 退出角色表情包的选择模式
 */
function exitCharStickerSelectionMode() {
    if (isCharStickerSelectionMode) {
        toggleCharStickerSelectionMode();
    }
}

// ===================================================================
// 3. 初始化事件监听器
// ===================================================================

window.openCharStickerManager = openCharStickerManager; // Expose to global
async function openCharStickerManager() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    // 根据聊天类型显示不同的标题
    const titleEl = document.getElementById('sticker-manager-title');
    if (titleEl) {
        if (chat.isGroup) {
            titleEl.textContent = `“${chat.name}”的群表情`;
        } else {
            titleEl.textContent = `“${chat.name}”的表情包`;
        }
    }

    // 默认显示专属表情
    const exclusiveTab = document.getElementById('sticker-tab-exclusive');
    if (exclusiveTab) exclusiveTab.click();

    await renderCharStickers('exclusive');
    await renderCharStickers('common');

    if (typeof showScreen === 'function') {
        showScreen('char-sticker-manager-screen');
    }
}

function initQQStickerFunctions() {
    console.log('Initializing QQ Sticker Functions...');

    // 监听分类标签页的点击（事件委托）
    const tabsContainer = document.getElementById('sticker-category-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('.sticker-category-btn');
            const deleteBtn = e.target.closest('.sticker-category-delete-btn');

            if (!btn) return;

            // 优先处理删除按钮点击
            if (deleteBtn) {
                e.stopPropagation(); // 阻止冒泡，避免触发分类切换
                const categoryId = parseInt(btn.dataset.categoryId);
                const categoryName = btn.dataset.categoryName;
                handleDeleteStickerCategory(categoryId, categoryName);
                return;
            }

            // 处理分类切换
            const categoryId = btn.dataset.categoryId === 'uncategorized' ? 'uncategorized' : parseInt(btn.dataset.categoryId);
            activeStickerCategoryId = categoryId;
            renderStickerPanel(); // 重新渲染面板
        });
    }

    // 1. 打开/关闭表情面板
    const stickerPanel = document.getElementById('sticker-panel');
    const openBtn = document.getElementById('open-sticker-panel-btn');
    const closeBtn = document.getElementById('close-sticker-panel-btn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (stickerPanel) {
                renderStickerPanel();
                stickerPanel.classList.add('visible');
            }
        });
    }

    if (closeBtn && stickerPanel) {
        closeBtn.addEventListener('click', () => {
            if (typeof exitUserStickerSelectionMode === 'function') {
                exitUserStickerSelectionMode();
            }
            stickerPanel.classList.remove('visible');
        });
    }

    // 2. 添加/上传 表情按钮
    const addStickerBtn = document.getElementById('add-sticker-btn');
    if (addStickerBtn) {
        addStickerBtn.addEventListener('click', openBulkAddStickersModal);
    }

    const uploadStickerBtn = document.getElementById('upload-sticker-btn');
    if (uploadStickerBtn) {
        uploadStickerBtn.addEventListener('click', () => {
            const input = document.getElementById('sticker-upload-input');
            if (input) input.click();
        });
    }

    // 3. 监听表情上传 input
    const stickerUploadInput = document.getElementById('sticker-upload-input');
    if (stickerUploadInput) {
        stickerUploadInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files.length) return;

            const newStickers = [];
            let canceled = false;

            // 使用 for...of 循环来逐个处理选中的文件
            for (const file of files) {
                if (canceled) break; // 如果用户中途取消了，就跳出循环

                // 为每个文件生成一个临时的本地预览URL
                const previewUrl = URL.createObjectURL(file);

                const name = await showCustomPrompt(
                    `为表情命名 (${newStickers.length + 1}/${files.length})`,
                    '请输入表情名称',
                    file.name.replace(/\.[^/.]+$/, ''),
                    'text',
                    `<img src="${previewUrl}" style="max-width: 100px; max-height: 100px; margin-bottom: 10px; border-radius: 8px;">`
                );

                URL.revokeObjectURL(previewUrl);

                if (name && name.trim()) {
                    const base64Url = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });

                    newStickers.push({
                        id: 'sticker_' + (Date.now() + newStickers.length),
                        url: base64Url,
                        name: name.trim(),
                    });
                } else if (name === null) {
                    const confirmCancel = await showCustomConfirm('确认取消', '确定要取消剩余表情的上传吗？');
                    if (confirmCancel) {
                        canceled = true;
                    }
                } else {
                    alert('表情名不能为空！');
                }
            }

            if (newStickers.length > 0) {
                await db.userStickers.bulkAdd(newStickers);
                state.userStickers.push(...newStickers);
                renderStickerPanel();
                await showCustomAlert('上传成功', `已成功添加 ${newStickers.length} 个新表情！`);
            }
            event.target.value = null;
        });
    }

    // 4. 编辑模式相关按钮
    const editUserStickersBtn = document.getElementById('edit-user-stickers-btn');
    if (editUserStickersBtn) {
        editUserStickersBtn.addEventListener('click', toggleUserStickerSelectionMode);
    }
    const doneUserStickersBtn = document.getElementById('done-user-stickers-btn');
    if (doneUserStickersBtn) {
        doneUserStickersBtn.addEventListener('click', exitUserStickerSelectionMode);
    }

    // 5. 移动表情到分类
    const moveBtn = document.getElementById('move-selected-stickers-btn');
    if (moveBtn) {
        moveBtn.addEventListener('click', openStickerCategoryModal);
    }

    // 6. 删除选中
    const deleteBtn = document.getElementById('delete-selected-user-stickers-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleBulkDeleteUserStickers);
    }

    // 7. 移动分类模态框确认/取消
    const confirmMoveBtn = document.getElementById('confirm-move-sticker-btn');
    if (confirmMoveBtn) {
        confirmMoveBtn.addEventListener('click', handleMoveStickers);
    }
    const cancelMoveBtn = document.getElementById('cancel-move-sticker-btn');
    if (cancelMoveBtn) {
        cancelMoveBtn.addEventListener('click', () => {
            document.getElementById('sticker-category-modal').classList.remove('visible');
        });
    }

    // 8. 角色表情包管理相关（专属/通用）
    const addExclusiveBtn = document.getElementById('add-exclusive-sticker-btn');
    if (addExclusiveBtn) addExclusiveBtn.addEventListener('click', () => bulkAddCharStickers('exclusive'));

    const uploadExclusiveBtn = document.getElementById('upload-exclusive-sticker-btn');
    if (uploadExclusiveBtn) uploadExclusiveBtn.addEventListener('click', () => uploadCharStickersLocal('exclusive'));

    const addCommonBtn = document.getElementById('add-common-sticker-btn');
    if (addCommonBtn) addCommonBtn.addEventListener('click', () => bulkAddCharStickers('common'));

    const uploadCommonBtn = document.getElementById('upload-common-sticker-btn');
    if (uploadCommonBtn) uploadCommonBtn.addEventListener('click', () => uploadCharStickersLocal('common'));

    const editCharBtn = document.getElementById('edit-char-stickers-btn');
    if (editCharBtn) editCharBtn.addEventListener('click', toggleCharStickerSelectionMode);

    const doneCharBtn = document.getElementById('done-char-stickers-btn');
    if (doneCharBtn) doneCharBtn.addEventListener('click', toggleCharStickerSelectionMode); // Toggle off

    const deleteCharBtn = document.getElementById('delete-selected-char-stickers-btn');
    if (deleteCharBtn) deleteCharBtn.addEventListener('click', handleBulkDeleteCharStickers);

    // 9. 角色表情包标签页切换
    const stickerTabExclusive = document.getElementById('sticker-tab-exclusive');
    const stickerTabCommon = document.getElementById('sticker-tab-common');
    const stickerContentExclusive = document.getElementById('sticker-content-exclusive');
    const stickerContentCommon = document.getElementById('sticker-content-common');

    if (stickerTabExclusive && stickerTabCommon && stickerContentExclusive && stickerContentCommon) {
        stickerTabExclusive.addEventListener('click', () => {
            stickerTabExclusive.classList.add('active');
            stickerTabCommon.classList.remove('active');
            stickerContentExclusive.classList.add('active');
            stickerContentCommon.classList.remove('active');
            // 切换时如果处于选择模式，需要重新渲染
            if (typeof isCharStickerSelectionMode !== 'undefined' && isCharStickerSelectionMode) {
                renderCharStickers('exclusive');
            }
        });

        stickerTabCommon.addEventListener('click', () => {
            stickerTabCommon.classList.add('active');
            stickerTabExclusive.classList.remove('active');
            stickerContentCommon.classList.add('active');
            stickerContentExclusive.classList.remove('active');
            // 切换时如果处于选择模式，需要重新渲染
            if (typeof isCharStickerSelectionMode !== 'undefined' && isCharStickerSelectionMode) {
                renderCharStickers('common');
            }
        });
    }

    // 10. 管理角色表情包入口
    const chatSettingsModal = document.getElementById('chat-settings-modal');
    if (chatSettingsModal) {
        chatSettingsModal.addEventListener('click', (e) => {
            if (e.target.id === 'manage-char-stickers-btn') {
                chatSettingsModal.classList.remove('visible');
                openCharStickerManager();
            }
        });
    }

    const backFromStickerManagerBtn = document.getElementById('back-from-sticker-manager');
    if (backFromStickerManagerBtn) {
        backFromStickerManagerBtn.addEventListener('click', () => {
            if (typeof exitCharStickerSelectionMode === 'function') {
                exitCharStickerSelectionMode();
            }
            if (typeof showScreen === 'function') {
                showScreen('chat-interface-screen');
            }
            const chatSettingsBtn = document.getElementById('chat-settings-btn');
            if (chatSettingsBtn) chatSettingsBtn.click();
        });
    }

}

// 自动执行初始化（等待DOM加载）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initQQStickerFunctions();
        initQQChatExtensions();
    });
} else {
    initQQStickerFunctions();
    initQQChatExtensions();
}

// ===================================================================
// 4. QQ 聊天扩展功能 (重新回复等)
// ===================================================================

/**
 * 智能查找AI上一轮回复的所有消息
 * @param {Array} history - 完整的聊天历史记录
 * @returns {Array} - 一个包含了上一轮AI所有消息对象的数组
 */
function findLastAiTurnMessages(history) {
    const turnMessages = [];
    let lastMessageIndex = history.length - 1;

    // 从最后一条消息开始，向前查找
    for (let i = lastMessageIndex; i >= 0; i--) {
        const message = history[i];

        // 如果是AI的消息，就把它加入我们的“待删除列表”
        if (message.role === 'assistant') {
            turnMessages.unshift(message); // 使用 unshift 保持原始顺序
        }
        // 一旦遇到非AI的消息（用户的或系统的），说明AI的这一轮回复已经结束了，立刻停止查找
        else {
            break;
        }
    }
    return turnMessages;
}

/**
 * “重roll”按钮被点击时的主处理函数
 */
async function handleRerollClick() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];

    // 1. 调用我们的智能查找函数，找出需要删除的消息
    const messagesToReroll = findLastAiTurnMessages(chat.history);

    // 2. 如果没找到（比如最后一条是用户发的），就提示并退出
    if (messagesToReroll.length === 0) {
        alert('请在AI回复后使用此功能。');
        return;
    }

    // 3. 从聊天记录中过滤掉这些旧消息
    const timestampsToReroll = new Set(messagesToReroll.map((m) => m.timestamp));
    chat.history = chat.history.filter((msg) => !timestampsToReroll.has(msg.timestamp));

    // 4. 保存更新后的聊天记录到数据库
    await db.chats.put(chat);

    // 5. 刷新聊天界面，让旧消息瞬间消失
    if (typeof window.renderChatInterface === 'function') {
        window.renderChatInterface(state.activeChatId);
    } else if (typeof renderChatInterface === 'function') {
        renderChatInterface(state.activeChatId);
    }

    // 6. 触发一次新的AI响应
    if (typeof window.triggerAiResponse === 'function') {
        window.triggerAiResponse();
    } else if (typeof triggerAiResponse === 'function') {
        triggerAiResponse();
    }
}

function initQQChatExtensions() {
    console.log('Initializing QQ Chat Extensions...');
    const rerollBtn = document.getElementById('reroll-btn');
    if (rerollBtn) {
        rerollBtn.removeEventListener('click', handleRerollClick);
        rerollBtn.addEventListener('click', handleRerollClick);
    }

    // 绑定"编辑原始输出"按钮
    const editRawBtn = document.getElementById('edit-raw-output-btn');
    if (editRawBtn) {
        editRawBtn.removeEventListener('click', handleEditRawOutputClick);
        editRawBtn.addEventListener('click', handleEditRawOutputClick);
    }

    // 绑定原始输出编辑器弹窗按钮
    const closeBtn = document.getElementById('close-raw-output-editor-btn');
    const cancelBtn = document.getElementById('cancel-raw-output-edit-btn');
    const applyBtn = document.getElementById('apply-raw-output-edit-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeRawOutputEditorModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeRawOutputEditorModal);
    if (applyBtn) applyBtn.addEventListener('click', applyRawOutputEdit);
}

// ===================================
// 编辑AI原始输出 (Edit Raw AI Output) Feature
// ===================================

/**
 * 健壮的JSON解析器 — 参考 lofter.js 的 repairAndParseJSON
 * 处理控制字符、未转义的双引号、尾部逗号等AI常见输出问题
 */
function repairAndParseJSON_raw(text) {
    let jsonStr = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '').trim();

    // 提取JSON对象或JSON数组
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (objMatch && arrMatch) {
        // 取最先出现的那个
        jsonStr = objMatch.index <= arrMatch.index ? objMatch[0] : arrMatch[0];
    } else if (objMatch) {
        jsonStr = objMatch[0];
    } else if (arrMatch) {
        jsonStr = arrMatch[0];
    }

    // 第一次尝试：直接解析
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        // 解析失败，进行修复
    }

    // 修复策略：遍历字符串，修复控制字符 + 未转义的双引号
    let repaired = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < jsonStr.length; i++) {
        const ch = jsonStr[i];

        if (escaped) {
            repaired += ch;
            escaped = false;
            continue;
        }

        if (ch === '\\' && inString) {
            repaired += ch;
            escaped = true;
            continue;
        }

        if (ch === '"') {
            if (!inString) {
                inString = true;
                repaired += ch;
            } else {
                // 在字符串内遇到引号 → 判断是结构性闭合引号还是内容中的引号
                let j = i + 1;
                while (j < jsonStr.length && (jsonStr[j] === ' ' || jsonStr[j] === '\t' || jsonStr[j] === '\r' || jsonStr[j] === '\n')) {
                    j++;
                }
                const nextNonWs = j < jsonStr.length ? jsonStr[j] : '';

                if (nextNonWs === ',' || nextNonWs === '}' || nextNonWs === ']' || nextNonWs === ':' || nextNonWs === '') {
                    inString = false;
                    repaired += ch;
                } else {
                    repaired += '\\"';
                }
            }
            continue;
        }

        if (inString) {
            const code = ch.charCodeAt(0);
            if (code === 10) {
                repaired += '\\n';
            } else if (code === 13) {
                repaired += '\\r';
            } else if (code === 9) {
                repaired += '\\t';
            } else if (code === 8) {
                repaired += '\\b';
            } else if (code === 12) {
                repaired += '\\f';
            } else if (code < 32) {
                repaired += '\\u' + code.toString(16).padStart(4, '0');
            } else {
                repaired += ch;
            }
        } else {
            repaired += ch;
        }
    }

    // 第二次尝试
    try {
        return JSON.parse(repaired);
    } catch (e2) {
        // 继续修复
    }

    // 第三次尝试：移除尾部逗号后再解析
    try {
        const noTrailing = repaired.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(noTrailing);
    } catch (e3) {
        console.error('JSON修复后仍无法解析，原始内容前500字符:', jsonStr.substring(0, 500));
        return null;
    }
}
// 暴露到全局，供 main-app.js / chat.js / background.js 使用
window.repairAndParseJSON = repairAndParseJSON_raw;

/**
 * 打开原始输出编辑器
 */
function handleEditRawOutputClick() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    // 找到最后一轮AI消息
    const lastAiTurnMessages = findLastAiTurnMessages(chat.history);
    if (lastAiTurnMessages.length === 0) {
        alert('请在AI回复后使用此功能。');
        return;
    }

    // 从chat对象上读取原始输出
    const rawOutput = chat._lastRawAiOutput;
    if (!rawOutput) {
        alert('未找到本轮回复的AI原始输出。\n（仅支持本次会话中产生的回复，历史记录中的旧消息可能不包含原始输出。）');
        return;
    }

    // 尝试用健壮的解析器格式化JSON以便于阅读
    let displayText = rawOutput;
    try {
        const parsed = repairAndParseJSON_raw(rawOutput);
        if (parsed) {
            displayText = JSON.stringify(parsed, null, 2);
        }
    } catch (e) {
        // 如果解析失败，直接显示原始文本
        displayText = rawOutput;
    }

    const textarea = document.getElementById('raw-output-textarea');
    textarea.value = displayText;
    document.getElementById('raw-output-editor-modal').classList.add('visible');
}

/**
 * 关闭原始输出编辑器
 */
function closeRawOutputEditorModal() {
    document.getElementById('raw-output-editor-modal').classList.remove('visible');
}

/**
 * 应用编辑后的原始输出
 */
async function applyRawOutputEdit() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const editedContent = document.getElementById('raw-output-textarea').value.trim();
    if (!editedContent) {
        alert('内容不能为空。');
        return;
    }

    // 1. 找到本轮AI消息并删除
    const lastAiTurnMessages = findLastAiTurnMessages(chat.history);
    if (lastAiTurnMessages.length === 0) {
        alert('未找到需要替换的AI消息。');
        return;
    }

    const timestampsToRemove = new Set(lastAiTurnMessages.map((m) => m.timestamp));
    chat.history = chat.history.filter((msg) => !timestampsToRemove.has(msg.timestamp));

    // 2. 解析编辑后的内容（使用健壮的JSON解析器）
    let messagesArray = [];
    let innerVoiceData = null;

    try {
        const fullResponse = repairAndParseJSON_raw(editedContent);

        if (fullResponse) {
            if (fullResponse.chatResponse && Array.isArray(fullResponse.chatResponse)) {
                messagesArray = fullResponse.chatResponse;
            }
            if (fullResponse.innerVoice && typeof fullResponse.innerVoice === 'object') {
                innerVoiceData = fullResponse.innerVoice;
            }

            // 兼容旧格式
            if (!innerVoiceData && fullResponse.thoughts && fullResponse.behavior) {
                innerVoiceData = fullResponse;
            }

            if (messagesArray.length === 0 && !innerVoiceData) {
                messagesArray = window.parseAiResponse(editedContent);
            }
        } else {
            messagesArray = window.parseAiResponse(editedContent);
        }
    } catch (e) {
        messagesArray = window.parseAiResponse(editedContent);
    }

    // 3. 处理心声
    if (innerVoiceData) {
        const newInnerVoice = { ...innerVoiceData };
        newInnerVoice.timestamp = Date.now();
        chat.latestInnerVoice = newInnerVoice;
        if (!chat.innerVoiceHistory) chat.innerVoiceHistory = [];
        chat.latestInnerVoice.clothing = chat.latestInnerVoice.clothing || '...';
        chat.latestInnerVoice.behavior = chat.latestInnerVoice.behavior || '...';
        chat.latestInnerVoice.thoughts = chat.latestInnerVoice.thoughts || '...';
        chat.latestInnerVoice.naughtyThoughts = chat.latestInnerVoice.naughtyThoughts || '...';
        chat.innerVoiceHistory.push(newInnerVoice);
    }

    // 4. 构建新的消息对象
    let messageTimestamp = Date.now();

    for (const msgData of messagesArray) {
        if (!msgData || typeof msgData !== 'object') continue;

        // 自动补全 type
        if (!msgData.type) {
            if (chat.isGroup && msgData.name && msgData.message) {
                msgData.type = 'text';
            } else if (msgData.content) {
                msgData.type = 'text';
            } else {
                continue;
            }
        }

        // 跳过非聊天消息类型（如 innervoice 已处理）
        if (msgData.type === 'innervoice') continue;

        let aiMessage = null;
        const currentTimestamp = messageTimestamp++;
        const baseMessage = {
            role: 'assistant',
            senderName: msgData.name || chat.name,
            timestamp: currentTimestamp,
        };

        switch (msgData.type) {
            case 'text':
                aiMessage = { ...baseMessage, content: String(msgData.content || msgData.message || '') };
                break;

            case 'sticker': {
                const stickerName = msgData.sticker_name;
                const allStickers = [...(window.state.charStickers || []), ...(chat.settings.stickerLibrary || [])];
                const foundSticker = allStickers.find((s) => s.name === stickerName);
                if (foundSticker) {
                    aiMessage = { ...baseMessage, type: 'sticker', content: foundSticker.url, meaning: foundSticker.name };
                } else {
                    // 找不到表情则作为纯文本显示
                    aiMessage = { ...baseMessage, content: `[表情: ${stickerName}]` };
                }
                break;
            }

            case 'ai_image':
                aiMessage = { ...baseMessage, type: 'ai_image', description: msgData.description || msgData.content, content: msgData.description || msgData.content };
                break;

            case 'voice_message':
                aiMessage = { ...baseMessage, type: 'voice_message', content: String(msgData.content || '') };
                break;

            case 'narrative':
                aiMessage = { ...baseMessage, type: 'narrative', content: String(msgData.content || '') };
                break;

            case 'transfer':
                aiMessage = {
                    ...baseMessage,
                    type: 'transfer',
                    amount: msgData.amount || 0,
                    note: msgData.note || '',
                    receiverName: msgData.receiver || '我',
                    status: 'pending',
                };
                break;

            default:
                // 默认作为文本处理
                if (msgData.content || msgData.message) {
                    aiMessage = { ...baseMessage, content: String(msgData.content || msgData.message || '') };
                }
                break;
        }

        if (aiMessage) {
            chat.history.push(aiMessage);
        }
    }

    // 5. 保存编辑后的原始输出到chat对象并刷新
    chat._lastRawAiOutput = editedContent;
    await db.chats.put(chat);
    closeRawOutputEditorModal();

    if (typeof window.renderChatInterface === 'function') {
        window.renderChatInterface(state.activeChatId);
    } else if (typeof renderChatInterface === 'function') {
        renderChatInterface(state.activeChatId);
    }

    console.log('[编辑原始输出] 已成功应用修改并重新渲染。');
}

// Expose to window for external access
window.handleEditRawOutputClick = handleEditRawOutputClick;
window.closeRawOutputEditorModal = closeRawOutputEditorModal;
window.applyRawOutputEdit = applyRawOutputEdit;

// ===================================
// 快捷回复 (Quick Replay) Feature
// Moved from main-app.js
// ===================================

/**
 * 打开快捷回复弹窗
 */
function openQuickReplyModal() {
    renderQuickReplyList();
    document.getElementById('quick-reply-modal').classList.add('visible');
}

/**
 * 渲染快捷回复列表 (带编辑功能)
 */
function renderQuickReplyList() {
    const listEl = document.getElementById('quick-reply-list');
    listEl.innerHTML = '';

    const replies = state.globalSettings.quickReplies || [];

    if (replies.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">列表为空，点击右上角 "+" 添加。</p>';
        return;
    }

    replies.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'quick-reply-item';

        // 兼容处理
        let type = typeof item === 'string' ? 'text' : item.type;
        let content = typeof item === 'string' ? item : item.content;

        // 标签生成
        let typeBadge = '';
        if (type === 'voice_message') typeBadge = '<span style="background:#4CAF50; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:5px;">语音</span>';
        else if (type === 'ai_image') typeBadge = '<span style="background:#FF9800; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:5px;">图片</span>';
        else if (type === 'transfer') typeBadge = '<span style="background:#E91E63; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:5px;">转账</span>';
        else if (type === 'waimai_request') typeBadge = '<span style="background:#2196F3; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:5px;">外卖</span>';

        div.innerHTML = `
  <!-- 左侧：点击发送区域 -->
  <div class="quick-reply-content" style="flex:1; display:flex; align-items:center; overflow:hidden; cursor:pointer;" title="点击发送">
    ${typeBadge}
    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${content}</span>
  </div>
  
  <!-- 右侧：操作按钮区域 -->
  <div class="quick-reply-actions">
    <!-- 编辑图标 (铅笔) -->
    <span class="quick-reply-action-btn btn-edit" title="编辑" data-index="${index}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    </span>
    <!-- 删除图标 (垃圾桶) -->
    <span class="quick-reply-action-btn btn-delete" title="删除" data-index="${index}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    </span>
  </div>
`;

        // 绑定事件：发送
        div.querySelector('.quick-reply-content').addEventListener('click', () => {
            sendQuickReply(item);
        });

        // 绑定事件：编辑
        div.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发发送
            editQuickReply(index);
        });

        // 绑定事件：删除
        div.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发发送
            deleteQuickReply(index);
        });

        listEl.appendChild(div);
    });
}
/**
 * 编辑快捷回复 (支持修改类型和内容)
 */
async function editQuickReply(index) {
    const item = state.globalSettings.quickReplies[index];

    // 1. 获取旧内容，作为默认值填充
    const oldContent = typeof item === 'string' ? item : item.content;

    const newType = await window.showChoiceModal('编辑 - 选择类型', [
        { text: '📝 普通文本', value: 'text' },
        { text: '🎤 语音消息', value: 'voice_message' },
        { text: '🖼️ 图片描述', value: 'ai_image' },
        { text: '💸 转账 (备注)', value: 'transfer' },
        { text: '🍔 外卖 (商品名)', value: 'waimai_request' },
    ]);

    if (!newType) return; // 如果用户取消选择类型，则停止

    // 3. 根据选择的类型设置提示语
    let promptTitle = '编辑内容';
    let promptDesc = '请输入回复内容...';

    if (newType === 'voice_message') {
        promptTitle = '编辑语音内容';
        promptDesc = '输入语音转换的文字内容';
    } else if (newType === 'ai_image') {
        promptTitle = '编辑图片描述';
        promptDesc = '输入图片的画面描述';
    } else if (newType === 'transfer') {
        promptTitle = '编辑转账备注';
        promptDesc = '输入转账的备注文字';
    } else if (newType === 'waimai_request') {
        promptTitle = '编辑外卖商品';
        promptDesc = '输入想吃的商品名称';
    }

    // 4. 第二步：弹出输入框，并填入旧内容供修改
    const newContent = await window.showCustomPrompt(promptTitle, promptDesc, oldContent);

    // 5. 保存逻辑
    if (newContent !== null && newContent.trim()) {
        // 直接覆盖旧对象
        state.globalSettings.quickReplies[index] = {
            type: newType,
            content: newContent.trim(),
        };

        await db.globalSettings.put(state.globalSettings);
        renderQuickReplyList(); // 刷新列表
        // alert('修改成功！'); // 可选提示
    }
}

/**
 * 发送快捷回复 (自动识别类型并渲染)
 */
async function sendQuickReply(item) {
    if (!state.activeChatId) return;

    const chat = state.chats[state.activeChatId];
    const modal = document.getElementById('quick-reply-modal');
    const chatInput = document.getElementById('chat-input');

    // 关闭弹窗
    modal.classList.remove('visible');

    // 1. 解析数据
    let type = 'text';
    let content = '';

    if (typeof item === 'string') {
        content = item;
    } else {
        type = item.type;
        content = item.content;
    }

    // 2. 如果是普通文本，走标准流程 (填入输入框并点击发送)
    // 这样可以保留引用回复等文本特有的功能
    if (type === 'text') {
        chatInput.value = content;
        document.getElementById('send-btn').click();
        return;
    }

    // 3. 如果是特殊类型，手动构造消息对象并发送
    // 这样可以避开输入框，直接生成对应的富文本卡片

    const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
    const msg = {
        role: 'user',
        timestamp: Date.now(),
    };

    if (type === 'voice_message') {
        msg.type = 'voice_message';
        msg.content = content;
    } else if (type === 'ai_image') {
        // 用户发送的图片描述，系统内部通常标记为 user_photo
        msg.type = 'user_photo';
        msg.content = content;
    } else if (type === 'transfer') {
        // 转账逻辑：需要扣款
        const amount = 52.0; // 快捷转账默认金额，也可改为从 item 中读取更复杂的配置
        if ((state.globalSettings.userBalance || 0) < amount) {
            alert('余额不足，无法发送快捷转账！');
            return;
        }
        // 扣款
        await updateUserBalanceAndLogTransaction(-amount, `快捷转账给 ${chat.name}`);

        msg.type = 'transfer';
        msg.amount = amount;
        msg.note = content; // 备注
        msg.senderName = myNickname;
        msg.receiverName = chat.isGroup ? '群聊' : chat.name;
    } else if (type === 'waimai_request') {
        // 外卖请求
        msg.type = 'waimai_request';
        msg.productInfo = content; // 商品名
        msg.amount = 20; // 默认金额
        msg.senderName = myNickname;
        msg.status = 'pending';
        msg.countdownEndTime = Date.now() + 15 * 60 * 1000;
    }

    // 4. 保存并渲染
    chat.history.push(msg);
    await db.chats.put(chat);

    // 渲染到界面
    window.appendMessage(msg, chat);
    window.renderChatList();

    // 滚动到底部
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 添加新的快捷回复 (带类型选择)
 */
async function addNewQuickReply() {
    // 1. 先让用户选择类型
    const type = await window.showChoiceModal('选择消息类型', [
        { text: '📝 普通文本', value: 'text' },
        { text: '🎤 语音消息', value: 'voice_message' },
        { text: '🖼️ 图片描述', value: 'ai_image' },
        { text: '💸 转账 (备注)', value: 'transfer' },
        { text: '🍔 外卖 (商品名)', value: 'waimai_request' },
    ]);

    if (!type) return; // 用户取消

    // 2. 根据类型设置提示语
    let promptTitle = '输入内容';
    let promptDesc = '请输入回复内容...';

    if (type === 'voice_message') {
        promptTitle = '添加语音';
        promptDesc = '输入语音转换的文字内容';
    } else if (type === 'ai_image') {
        promptTitle = '添加图片';
        promptDesc = '输入图片的画面描述';
    } else if (type === 'transfer') {
        promptTitle = '添加转账备注';
        promptDesc = '输入转账的备注文字 (默认52元)';
    } else if (type === 'waimai_request') {
        promptTitle = '添加外卖';
        promptDesc = '输入想吃的商品名称 (默认20元)';
    }

    // 3. 弹出输入框
    const content = await window.showCustomPrompt(promptTitle, promptDesc);

    if (content && content.trim()) {
        if (!state.globalSettings.quickReplies) state.globalSettings.quickReplies = [];

        // 保存为对象结构
        state.globalSettings.quickReplies.push({
            type: type,
            content: content.trim(),
        });

        await db.globalSettings.put(state.globalSettings);
        renderQuickReplyList();
    }
}

/**
 * 删除快捷回复
 */
async function deleteQuickReply(index) {
    // 不需要弹窗确认，提升操作效率，或者保留确认看你喜好
    // const confirmed = await showCustomConfirm('确认删除', '确定要删除吗？', {confirmButtonClass: 'btn-danger'});
    // if (confirmed) { ... }

    state.globalSettings.quickReplies.splice(index, 1);
    await db.globalSettings.put(state.globalSettings);
    renderQuickReplyList();
}

/**
 * 导出快捷回复
 */
function exportQuickReplies() {
    const replies = state.globalSettings.quickReplies || [];
    const blob = new Blob([JSON.stringify(replies, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EPhone-QuickReplies-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 导入快捷回复
 */
function importQuickReplies(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if (!state.globalSettings.quickReplies) state.globalSettings.quickReplies = [];

                // 简单的数据清洗，兼容旧的字符串数组
                const cleanedData = data.map((item) => {
                    if (typeof item === 'string') return { type: 'text', content: item };
                    return item;
                });

                // 合并
                state.globalSettings.quickReplies.push(...cleanedData);

                await db.globalSettings.put(state.globalSettings);
                renderQuickReplyList();
                alert(`成功导入 ${cleanedData.length} 条快捷回复。`);
            } else {
                alert('文件格式不正确。');
            }
        } catch (error) {
            alert('导入失败：' + error.message);
        }
    };
    reader.readAsText(file);
}

function initQuickReplyFeatures() {
    const quickReplyBtn = document.getElementById('quick-reply-btn');
    if (!quickReplyBtn) return; // 避免页面元素不存在报错

    quickReplyBtn.addEventListener('click', openQuickReplyModal);

    const addBtn = document.getElementById('add-quick-reply-btn');
    if (addBtn) addBtn.addEventListener('click', addNewQuickReply);

    const closeBtn = document.getElementById('close-quick-reply-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('quick-reply-modal').classList.remove('visible');
    });

    const exportBtn = document.getElementById('export-quick-reply-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportQuickReplies);

    const importBtn = document.getElementById('import-quick-reply-btn');
    if (importBtn) importBtn.addEventListener('click', () => {
        document.getElementById('import-quick-reply-input').click();
    });

    const importInput = document.getElementById('import-quick-reply-input');
    if (importInput) importInput.addEventListener('change', (e) => {
        importQuickReplies(e.target.files[0]);
        e.target.value = null;
    });
}

// 自动初始化
document.addEventListener('DOMContentLoaded', initQuickReplyFeatures);

// ===================================================================
// X. 图片/照片发送功能 (从 main-app.js 迁移)
// ===================================================================

function initPhotoFunctions() {
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const sendPhotoBtn = document.getElementById('send-photo-btn');

    if (uploadImageBtn && imageUploadInput) {
        // 绑定点击事件代理
        // 这里假设 removeEventListener 不会被调用，或者之前的监听器已经被垃圾回收/不复存在
        uploadImageBtn.addEventListener('click', () => {
            if (imageUploadInput) imageUploadInput.click();
        });

        // 绑定文件选择变化事件
        imageUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file || !window.state.activeChatId) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Url = e.target.result;
                const chat = window.state.chats[window.state.activeChatId];
                const msg = {
                    role: 'user',
                    content: [{ type: 'image_url', image_url: { url: base64Url } }],
                    timestamp: Date.now(),
                };
                if (chat.history) chat.history.push(msg);
                if (window.db && window.db.chats) await window.db.chats.put(chat);

                if (window.appendMessage) window.appendMessage(msg, chat);
                if (window.renderChatList) window.renderChatList();
            };
            reader.readAsDataURL(file);
            event.target.value = null;
        });
    }

    if (sendPhotoBtn) {
        sendPhotoBtn.addEventListener('click', async () => {
            if (!window.state.activeChatId) return;

            const promptFunc = window.showCustomPrompt;
            if (!promptFunc) return;

            const description = await promptFunc('发送照片', '请用文字描述您要发送的照片：');
            if (description && description.trim()) {
                const chat = window.state.chats[window.state.activeChatId];
                const msg = { role: 'user', type: 'user_photo', content: description.trim(), timestamp: Date.now() };

                if (chat.history) chat.history.push(msg);
                if (window.db && window.db.chats) await window.db.chats.put(chat);

                if (window.appendMessage) window.appendMessage(msg, chat);
                if (window.renderChatList) window.renderChatList();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initPhotoFunctions);

// ===================================================================
// Transfer Functions (Moved from main-app.js)
// ===================================================================

function handlePaymentButtonClick() {
    if (!window.state || !window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    if (chat.isGroup) {
        if (window.openRedPacketModal) {
            window.openRedPacketModal();
        } else {
            console.error('openRedPacketModal is not defined. Ensure main-app.js is loaded.');
        }
    } else {
        // 单聊保持原样，打开转账弹窗
        document.getElementById('transfer-modal').classList.add('visible');
    }
}

async function sendUserTransfer() {
    if (!window.state || !window.state.activeChatId) return;

    const amountInput = document.getElementById('transfer-amount');
    const noteInput = document.getElementById('transfer-note');
    const amount = parseFloat(amountInput.value);
    const note = noteInput.value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert('请输入有效的金额！');
        return;
    }

    // 检查余额是否足够
    // Access globalSettings carefully
    const settings = window.state.globalSettings || {};
    if ((settings.userBalance || 0) < amount) {
        alert('余额不足！');
        return;
    }

    const chat = window.state.chats[window.state.activeChatId];
    const senderName = chat.isGroup ? chat.settings.myNickname || '我' : '我';
    const receiverName = chat.isGroup ? '群聊' : chat.name;

    // 调用新函数扣款并记录
    if (window.updateUserBalanceAndLogTransaction) {
        await window.updateUserBalanceAndLogTransaction(-amount, `转账给 ${receiverName}`);
    }

    const msg = {
        role: 'user',
        type: 'transfer',
        amount: amount,
        note: note,
        senderName,
        receiverName,
        timestamp: Date.now(),
    };

    if (chat.history) {
        chat.history.push(msg);
    }

    if (window.db && window.db.chats) {
        await window.db.chats.put(chat);
    }

    if (window.appendMessage) window.appendMessage(msg, chat);
    if (window.renderChatList) window.renderChatList();

    document.getElementById('transfer-modal').classList.remove('visible');
    amountInput.value = '';
    noteInput.value = '';
}


// ===================================================================
// Red Packet Functions (Group & Direct - Moved from main-app.js)
// ===================================================================

/**
 * 打开并初始化发红包模态框
 */
function openRedPacketModal() {
    const modal = document.getElementById('red-packet-modal');
    if (!window.state || !window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];

    // 清理输入框
    document.getElementById('rp-group-amount').value = '';
    document.getElementById('rp-group-count').value = '';
    document.getElementById('rp-group-greeting').value = '';
    document.getElementById('rp-direct-amount').value = '';
    document.getElementById('rp-direct-greeting').value = '';
    document.getElementById('rp-group-total').textContent = '¥ 0.00';
    document.getElementById('rp-direct-total').textContent = '¥ 0.00';

    // 填充专属红包的接收人列表
    const receiverSelect = document.getElementById('rp-direct-receiver');
    receiverSelect.innerHTML = '';
    if (chat.members) {
        chat.members.forEach((member) => {
            const option = document.createElement('option');
            // 使用 originalName 作为提交给AI的值，因为它独一无二
            option.value = member.originalName;
            // 使用 groupNickname 作为显示给用户看的值
            option.textContent = member.groupNickname;
            receiverSelect.appendChild(option);
        });
    }

    // 默认显示拼手气红包页签
    document.getElementById('rp-tab-group').click();

    modal.classList.add('visible');
}
// Expose specific function to window required by main-app.js
window.openRedPacketModal = openRedPacketModal;

/**
 * 发送群红包（拼手气）
 */
async function sendGroupRedPacket() {
    if (!window.state || !window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    const amount = parseFloat(document.getElementById('rp-group-amount').value);
    const count = parseInt(document.getElementById('rp-group-count').value);
    const greeting = document.getElementById('rp-group-greeting').value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert('请输入有效的总金额！');
        return;
    }
    if (isNaN(count) || count <= 0) {
        alert('请输入有效的红包个数！');
        return;
    }
    if (amount / count < 0.01) {
        alert('单个红包金额不能少于0.01元！');
        return;
    }

    const myNickname = (chat.settings && chat.settings.myNickname) ? chat.settings.myNickname : '我';

    // 扣除余额逻辑
    if (window.updateUserBalanceAndLogTransaction) {
        // 尝试从全局设置获取余额进行检查
        const settings = window.state.globalSettings || {};
        if ((settings.userBalance || 0) < amount) {
            alert('余额不足！');
            return;
        }
        await window.updateUserBalanceAndLogTransaction(-amount, '发送拼手气红包');
    }

    const newPacket = {
        role: 'user',
        senderName: myNickname,
        type: 'red_packet',
        packetType: 'lucky', // 'lucky' for group, 'direct' for one-on-one
        timestamp: Date.now(),
        totalAmount: amount,
        count: count,
        greeting: greeting || '恭喜发财，大吉大利！',
        claimedBy: {}, // { name: amount }
        isFullyClaimed: false,
    };

    if (chat.history) chat.history.push(newPacket);
    if (window.db && window.db.chats) await window.db.chats.put(chat);

    if (window.appendMessage) window.appendMessage(newPacket, chat);
    if (window.renderChatList) window.renderChatList();
    document.getElementById('red-packet-modal').classList.remove('visible');
}

/**
 * 发送专属红包
 */
async function sendDirectRedPacket() {
    if (!window.state || !window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    const amount = parseFloat(document.getElementById('rp-direct-amount').value);
    const receiverName = document.getElementById('rp-direct-receiver').value;
    const greeting = document.getElementById('rp-direct-greeting').value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert('请输入有效的金额！');
        return;
    }
    if (!receiverName) {
        alert('请选择一个接收人！');
        return;
    }

    const myNickname = (chat.settings && chat.settings.myNickname) ? chat.settings.myNickname : '我';

    // 扣除余额逻辑
    if (window.updateUserBalanceAndLogTransaction) {
        // 尝试从全局设置获取余额进行检查
        const settings = window.state.globalSettings || {};
        if ((settings.userBalance || 0) < amount) {
            alert('余额不足！');
            return;
        }
        // 获取显示用的接收人名称
        let receiverDisplayName = receiverName;
        const receiverMember = chat.members.find(m => m.originalName === receiverName);
        if (receiverMember) {
            receiverDisplayName = receiverMember.groupNickname || receiverMember.name;
        }
        await window.updateUserBalanceAndLogTransaction(-amount, `发送专属红包给 ${receiverDisplayName}`);
    }

    const newPacket = {
        role: 'user',
        senderName: myNickname,
        type: 'red_packet',
        packetType: 'direct',
        timestamp: Date.now(),
        totalAmount: amount,
        count: 1,
        greeting: greeting || '给你准备了一个红包',
        receiverName: receiverName, // 核心字段
        claimedBy: {},
        isFullyClaimed: false,
    };

    if (chat.history) chat.history.push(newPacket);
    if (window.db && window.db.chats) await window.db.chats.put(chat);

    if (window.appendMessage) window.appendMessage(newPacket, chat);
    if (window.renderChatList) window.renderChatList();
    document.getElementById('red-packet-modal').classList.remove('visible');
}

function initRedPacketFunctions() {
    // 2. 红包模态框内部的控制按钮
    const cancelRpBtn = document.getElementById('cancel-red-packet-btn');
    if (cancelRpBtn) {
        cancelRpBtn.addEventListener('click', () => {
            const modal = document.getElementById('red-packet-modal');
            if (modal) modal.classList.remove('visible');
        });
    }

    const sendGroupPacketBtn = document.getElementById('send-group-packet-btn');
    if (sendGroupPacketBtn) {
        sendGroupPacketBtn.addEventListener('click', sendGroupRedPacket);
    }

    const sendDirectPacketBtn = document.getElementById('send-direct-packet-btn');
    if (sendDirectPacketBtn) {
        sendDirectPacketBtn.addEventListener('click', sendDirectRedPacket);
    }

    // 3. 红包模态框的页签切换逻辑
    const rpTabGroup = document.getElementById('rp-tab-group');
    const rpTabDirect = document.getElementById('rp-tab-direct');
    const rpContentGroup = document.getElementById('rp-content-group');
    const rpContentDirect = document.getElementById('rp-content-direct');

    if (rpTabGroup && rpTabDirect && rpContentGroup && rpContentDirect) {
        rpTabGroup.addEventListener('click', () => {
            rpTabGroup.classList.add('active');
            rpTabDirect.classList.remove('active');
            rpContentGroup.style.display = 'block';
            rpContentDirect.style.display = 'none';
        });
        rpTabDirect.addEventListener('click', () => {
            rpTabDirect.classList.add('active');
            rpTabGroup.classList.remove('active');
            rpContentDirect.style.display = 'block';
            rpContentGroup.style.display = 'none';
        });
    }

    // 4. 实时更新红包金额显示
    const rpGroupAmount = document.getElementById('rp-group-amount');
    if (rpGroupAmount) {
        rpGroupAmount.addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value) || 0;
            const display = document.getElementById('rp-group-total');
            if (display) display.textContent = `¥ ${amount.toFixed(2)}`;
        });
    }

    const rpDirectAmount = document.getElementById('rp-direct-amount');
    if (rpDirectAmount) {
        rpDirectAmount.addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value) || 0;
            const display = document.getElementById('rp-direct-total');
            if (display) display.textContent = `¥ ${amount.toFixed(2)}`;
        });
    }
}

document.addEventListener('DOMContentLoaded', initRedPacketFunctions);

function initTransferFunctions() {
    // 监听转账按钮
    const transferBtn = document.getElementById('transfer-btn');
    if (transferBtn) {
        transferBtn.addEventListener('click', handlePaymentButtonClick);
    }

    // 监听确认转账按钮
    const transferConfirmBtn = document.getElementById('transfer-confirm-btn');
    if (transferConfirmBtn) {
        transferConfirmBtn.addEventListener('click', sendUserTransfer);
    }
}

document.addEventListener('DOMContentLoaded', initTransferFunctions);

function initVoiceMessageFunctions() {
    const voiceMessageBtn = document.getElementById('voice-message-btn');
    if (voiceMessageBtn) {
        voiceMessageBtn.addEventListener('click', async () => {
            if (!window.state.activeChatId) return;
            const text = await window.showCustomPrompt('发送语音', '请输入你想说的内容：');
            if (text && text.trim()) {
                const chat = window.state.chats[window.state.activeChatId];
                const msg = { role: 'user', type: 'voice_message', content: text.trim(), timestamp: Date.now() };
                chat.history.push(msg);
                await window.db.chats.put(chat);

                if (typeof window.appendMessage === 'function') {
                    window.appendMessage(msg, chat);
                }

                if (typeof window.renderChatList === 'function') {
                    window.renderChatList();
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initVoiceMessageFunctions);

/* ==========================================================================
   Waimai (Food Delivery) Payment Functions
   ========================================================================== */

// 1. Global Waimai Variables
window.waimaiTimers = {};

// 2. Cleanup Waimai Timers
window.cleanupWaimaiTimers = function () {
    for (const timestamp in window.waimaiTimers) {
        clearInterval(window.waimaiTimers[timestamp]);
    }
    window.waimaiTimers = {};
};

// 3. Start Waiting Countdown
window.startWaimaiCountdown = function (element, endTime) {
    const timerId = setInterval(() => {
        const now = Date.now();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(timerId);
            element.innerHTML = '<span>已</span><span>超</span><span>时</span>';
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const minStr = String(minutes).padStart(2, '0');
        const secStr = String(seconds).padStart(2, '0');

        element.innerHTML = `<span>${minStr.charAt(0)}</span><span>${minStr.charAt(1)}</span> : <span>${secStr.charAt(0)}</span><span>${secStr.charAt(1)}</span>`;
    }, 1000);
    return timerId;
};

// 4. Handle Waimai Response (Pay/Reject)
window.handleWaimaiResponse = async function (originalTimestamp, choice) {
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat) return;

    const messageIndex = chat.history.findIndex((m) => m.timestamp === originalTimestamp);
    if (messageIndex === -1) return;

    // 1. 更新内存中原始消息的状态
    const originalMessage = chat.history[messageIndex];
    originalMessage.status = choice;

    // 2. 获取当前用户的昵称，并构建对AI更清晰的系统消息
    let systemContent;
    const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';

    if (choice === 'paid') {
        originalMessage.paidBy = myNickname; // 记录是“我”付的钱
        systemContent = `[系统提示：你 (${myNickname}) 为 ${originalMessage.senderName} 的外卖订单（时间戳: ${originalTimestamp}）完成了支付。此订单已关闭，其他成员不能再支付。]`;
    } else {
        systemContent = `[系统提示：你 (${myNickname}) 拒绝了 ${originalMessage.senderName} 的外卖代付请求（时间戳: ${originalTimestamp}）。]`;
    }

    // 3. 创建一条新的、对用户隐藏的系统消息，告知AI结果
    const systemNote = {
        role: 'system',
        content: systemContent,
        timestamp: Date.now(),
        isHidden: true,
    };
    chat.history.push(systemNote);

    // 4. 将更新后的数据保存到数据库，并立刻重绘UI
    await window.db.chats.put(chat);
    if (typeof window.renderChatInterface === 'function') {
        window.renderChatInterface(window.state.activeChatId);
    }

    // 5. 只有在支付成功后，才触发一次AI响应，让它感谢你
    if (choice === 'paid' && typeof window.triggerAiResponse === 'function') {
        window.triggerAiResponse();
    }
};

// 5. Initialization Function for Event Listeners
window.initWaimaiListeners = function () {
    const waimaiModal = document.getElementById('waimai-request-modal');
    const sendBtn = document.getElementById('send-waimai-request-btn');
    const cancelBtn = document.getElementById('waimai-cancel-btn');
    const confirmBtn = document.getElementById('waimai-confirm-btn');

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (waimaiModal) waimaiModal.classList.add('visible');
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (waimaiModal) waimaiModal.classList.remove('visible');
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!window.state.activeChatId) return;

            const productInfoInput = document.getElementById('waimai-product-info');
            const amountInput = document.getElementById('waimai-amount');

            const productInfo = productInfoInput.value.trim();
            const amount = parseFloat(amountInput.value);

            if (!productInfo) {
                alert('请输入商品信息！');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('请输入有效的代付金额！');
                return;
            }

            const chat = window.state.chats[window.state.activeChatId];
            const now = Date.now();

            const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';

            const msg = {
                role: 'user',
                senderName: myNickname,
                type: 'waimai_request',
                productInfo: productInfo,
                amount: amount,
                status: 'pending',
                countdownEndTime: now + 15 * 60 * 1000,
                timestamp: now,
            };

            chat.history.push(msg);

            // 那一大段代码已经被删除了

            await window.db.chats.put(chat);

            if (typeof window.appendMessage === 'function') {
                window.appendMessage(msg, chat);
            }
            if (typeof window.renderChatList === 'function') {
                window.renderChatList();
            }

            productInfoInput.value = '';
            amountInput.value = '';
            if (waimaiModal) waimaiModal.classList.remove('visible');
        });
    }
};

// Initialize when functions.js loads/DOM ready
document.addEventListener('DOMContentLoaded', window.initWaimaiListeners);

// ===================================================================
// Video Call Functions (Moved from main-app.js)
// ===================================================================

window.videoCallState = {
    isActive: false,
    isAwaitingResponse: false,
    isGroupCall: false,
    activeChatId: null,
    initiator: null,
    startTime: null,
    participants: [],
    isUserParticipating: true,
    callHistory: [],
    preCallContext: '',
};

window.callTimerInterval = null;

window.toggleCallButtons = function (isGroup) {
    const vBtn = document.getElementById('video-call-btn');
    const gBtn = document.getElementById('group-video-call-btn');
    if (vBtn) vBtn.style.display = isGroup ? 'none' : 'flex';
    if (gBtn) gBtn.style.display = isGroup ? 'flex' : 'none';
}

/**
 * 用户点击“发起视频通话”或“发起群视频”按钮
 */
window.handleInitiateCall = async function () {
    if (!window.state.activeChatId || window.videoCallState.isActive || window.videoCallState.isAwaitingResponse) return;

    const chat = window.state.chats[window.state.activeChatId];
    window.videoCallState.isGroupCall = chat.isGroup;
    window.videoCallState.isAwaitingResponse = true;
    window.videoCallState.initiator = 'user';
    window.videoCallState.activeChatId = chat.id;
    window.videoCallState.isUserParticipating = true;

    // 1. 显示“正在呼叫”界面
    if (chat.isGroup) {
        document.getElementById('outgoing-call-avatar').src = chat.settings.myAvatar || 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        document.getElementById('outgoing-call-name').textContent = chat.settings.myNickname || '我';
    } else {
        document.getElementById('outgoing-call-avatar').src = chat.settings.aiAvatar || 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
        document.getElementById('outgoing-call-name').textContent = chat.name;
    }
    document.querySelector('#outgoing-call-screen .caller-text').textContent = chat.isGroup ? '正在呼叫所有成员...' : '正在呼叫...';
    if (window.showScreen) window.showScreen('outgoing-call-screen');

    // 在发起通话时，提前准备好通话前的聊天记录上下文
    window.videoCallState.preCallContext = chat.history
        .slice(-20) // 获取最近20条消息
        .map((msg) => `${msg.role === 'user' ? chat.settings.myNickname || '我' : msg.senderName || chat.name}: ${String(msg.content).substring(0, 50)}...`)
        .join('\n');

    // 2. 重新构建一个信息更丰富、指令更明确的API请求
    try {
        const { proxyUrl, apiKey, model } = window.state.apiConfig;
        if (!proxyUrl || !apiKey || !model) {
            throw new Error('API未配置，无法发起通话。');
        }

        let systemPromptForCall;
        if (chat.isGroup) {
            systemPromptForCall = `
        # 你的任务
        你是一个群聊AI，负责扮演【除了用户以外】的所有角色。
        用户 (${chat.settings.myNickname || '我'}) 刚刚发起了群视频通话。
        你的任务是根据每个角色的性格和最近的聊天内容，决定他们是否要加入通话。

        # 核心规则
        1.  **决策**: 每个角色都必须独立决策。
        2.  **格式**: 你的回复【必须】是一个JSON数组，每个对象代表一个角色的决策，格式为：\`{"type": "group_call_response", "name": "【角色的本名】", "decision": "join"}\` 或 \`{"type": "group_call_response", "name": "【角色的本名】", "decision": "decline"}\`。
        3.  **倾向性**: 在没有特殊理由的情况下，你的角色们通常乐于加入群聊。

        # 角色列表与人设
        ${chat.members.map((m) => `- **${m.originalName}**: ${m.persona}`).join('\n')}

        # 通话前的聊天摘要
        ${window.videoCallState.preCallContext}
        `;
        } else {
            systemPromptForCall = `
        # 你的任务
        你正在扮演角色 "${chat.name}"。用户 (${chat.settings.myNickname || '我'}) 刚刚向你发起了视频通话请求。
        你的任务是根据你的人设和我们最近的聊天内容，决定是否接受。

        # 核心规则
        1.  **决策**: 你必须做出 "accept" (接受) 或 "reject" (拒绝) 的决定。
        2.  **格式**: 你的回复【必须且只能】是一个JSON数组，其中包含一个对象，格式为：\`[{"type": "video_call_response", "decision": "accept"}]\` 或 \`[{"type": "video_call_response", "decision": "reject"}]\`。
        3.  **倾向性**: 作为一个友好的AI伴侣，在没有特殊理由（比如在之前的对话中明确表示了不想被打扰或正在忙）的情况下，你【应该优先选择接受】通话。

        # 你的人设
        ${chat.settings.aiPersona}

        # 通话前的聊天摘要
        ${window.videoCallState.preCallContext}
        `;
        }

        const messagesForApi = [{ role: 'user', content: '请根据你在系统指令中读到的规则，立即做出你的决策。' }];

        let isGemini = proxyUrl === 'https://generativelanguage.googleapis.com/v1beta/models';
        let geminiConfig = window.toGeminiRequestData(model, apiKey, systemPromptForCall, messagesForApi, isGemini);

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'system', content: systemPromptForCall }, ...messagesForApi],
                    temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 错误 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const aiResponseContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(/```json\s*|```/gi, '').trim();
        const robustParse = window.repairAndParseJSON || JSON.parse;
        const responseArray = robustParse(aiResponseContent) || [];

        if (chat.isGroup) {
            responseArray.forEach((action) => {
                if (action.type === 'group_call_response' && action.decision === 'join') {
                    const member = chat.members.find((m) => m.originalName === action.name);
                    if (member) window.videoCallState.participants.push(member);
                }
            });
            if (window.videoCallState.participants.length > 0) {
                window.startVideoCall();
            } else {
                throw new Error('群里没有人接听你的通话邀请。');
            }
        } else {
            const decision = responseArray[0];
            if (decision.type === 'video_call_response' && decision.decision === 'accept') {
                window.startVideoCall();
            } else {
                throw new Error('对方拒绝了你的视频通话请求。');
            }
        }
    } catch (error) {
        console.error('发起通话失败:', error);
        if (window.showCustomAlert) await window.showCustomAlert('呼叫失败', error.message);
        window.videoCallState.isAwaitingResponse = false;
        if (window.showScreen) window.showScreen('chat-interface-screen');
    }
}

window.startVideoCall = function () {
    const chat = state.chats[videoCallState.activeChatId];
    if (!chat) return;

    // 提取通话前的最后20条消息作为上下文
    videoCallState.preCallContext = chat.history
        .slice(-20)
        .map((msg) => `${msg.role === 'user' ? chat.settings.myNickname || '我' : msg.senderName || chat.name}: ${String(msg.content).substring(0, 50)}...`)
        .join('\n');

    // 1. 检查是否启用了可视化界面
    if (chat.settings.visualVideoCallEnabled) {
        // --- 启动【新】的可视化界面 ---
        videoCallState.isActive = true;
        videoCallState.isAwaitingResponse = false;
        videoCallState.startTime = Date.now();
        videoCallState.callHistory = [];

        // 标记当前大屏是谁 (false代表大屏是对方，小屏是我)
        videoCallState.isUserMain = false;
        // 【新增】标记当前摄像头方向 ('user'前置, 'environment'后置)
        videoCallState.facingMode = 'user';

        const visualInterface = document.getElementById('visual-call-interface');
        const textInterface = document.getElementById('text-call-interface');

        visualInterface.style.display = 'flex';
        textInterface.style.display = 'none';

        // 1. 设置对方的画面 (始终是图片/动图)
        const mainImg = document.querySelector('#video-main-view img');
        const mainVideo = document.querySelector('#video-main-view video');

        if (mainImg) mainImg.style.display = 'block';
        if (mainVideo) mainVideo.style.display = 'none';
        if (mainImg) mainImg.src = chat.settings.charVideoImage || defaultAvatar;

        // 2. 设置我的画面 (根据设置决定是图片还是摄像头)
        const pipImg = document.querySelector('#video-pip-view img');
        const pipVideo = document.querySelector('#video-pip-view video');
        const flipBtn = document.getElementById('flip-real-camera-btn');

        if (chat.settings.useRealCamera) {
            // --- 使用摄像头模式 ---
            if (pipImg) pipImg.style.display = 'none';
            if (pipVideo) pipVideo.style.display = 'block';

            // 显示翻转按钮
            if (flipBtn) flipBtn.style.display = 'block';

            // 请求摄像头权限 (默认前置)
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices
                    .getUserMedia({ video: { facingMode: 'user' }, audio: false })
                    .then((stream) => {
                        if (pipVideo) {
                            pipVideo.srcObject = stream;
                            // 前置摄像头通常需要镜像
                            pipVideo.style.transform = 'scaleX(-1)';
                        }
                        window.localCameraStream = stream;
                    })
                    .catch((err) => {
                        console.error('无法启动摄像头:', err);
                        alert('无法启动摄像头，已切换回图片模式。');
                        // 失败回退
                        if (pipVideo) pipVideo.style.display = 'none';
                        if (pipImg) pipImg.style.display = 'block';
                        if (pipImg) pipImg.src = chat.settings.userVideoImage || defaultAvatar;
                        if (flipBtn) flipBtn.style.display = 'none';
                    });
            } else {
                alert('当前浏览器不支持摄像头调用。');
            }
        } else {
            // --- 使用图片模式 ---
            if (pipVideo) pipVideo.style.display = 'none';
            if (flipBtn) flipBtn.style.display = 'none'; // 隐藏翻转按钮

            // 停止旧流
            if (window.localCameraStream) {
                window.localCameraStream.getTracks().forEach((track) => track.stop());
                window.localCameraStream = null;
            }
            if (pipImg) pipImg.style.display = 'block';
            if (pipImg) pipImg.src = chat.settings.userVideoImage || defaultAvatar;
        }

        // 清空旧气泡
        document.getElementById('video-call-messages-visual').innerHTML = `<em>正在接通...</em>`;
        showScreen('video-call-screen');

        if (callTimerInterval) clearInterval(callTimerInterval);
        callTimerInterval = setInterval(updateCallTimer, 1000);
        updateCallTimer();

        triggerAiInCallAction();
    } else {
        // --- 启动【旧】的纯文字界面 (保持不变) ---
        videoCallState.isActive = true;
        videoCallState.isAwaitingResponse = false;
        videoCallState.startTime = Date.now();
        videoCallState.callHistory = [];

        const visualInterface = document.getElementById('visual-call-interface');
        const textInterface = document.getElementById('text-call-interface');
        visualInterface.style.display = 'none';
        textInterface.style.display = 'flex';

        updateParticipantAvatars();
        document.getElementById('video-call-main').innerHTML = `<em>${videoCallState.isGroupCall ? '群聊已建立...' : '正在接通...'}</em>`;
        showScreen('video-call-screen');

        document.getElementById('user-speak-btn').style.display = videoCallState.isUserParticipating ? 'block' : 'none';
        document.getElementById('join-call-btn').style.display = videoCallState.isUserParticipating ? 'none' : 'block';

        if (callTimerInterval) clearInterval(callTimerInterval);
        callTimerInterval = setInterval(updateCallTimer, 1000);
        updateCallTimer();

        triggerAiInCallAction();
    }
}


/**
 * 结束视频通话
 */
window.endVideoCall = async function () {
    // 1. 隐藏界面元素
    document.getElementById('visual-call-interface').style.display = 'none';
    document.getElementById('text-call-interface').style.display = 'none'; // 确保旧界面也隐藏
    document.getElementById('video-call-floating-bubble').style.display = 'none';

    if (!videoCallState.isActive) return;

    // ==========================================
    // 【核心新增】关闭摄像头流，释放硬件资源
    // ==========================================
    if (window.localCameraStream) {
        window.localCameraStream.getTracks().forEach((track) => track.stop());
        window.localCameraStream = null;
    }

    // 清空 video 标签的源，防止黑屏残留
    const v1 = document.querySelector('#video-main-view video');
    const v2 = document.querySelector('#video-pip-view video');
    if (v1) v1.srcObject = null;
    if (v2) v2.srcObject = null;
    // ==========================================

    const duration = Math.floor((Date.now() - videoCallState.startTime) / 1000);
    const durationText = `${Math.floor(duration / 60)}分${duration % 60}秒`;
    const endCallText = `通话结束，时长 ${durationText}`;

    const chat = state.chats[videoCallState.activeChatId];
    if (chat) {
        // 保存通话记录到数据库
        const participantsData = [];
        if (videoCallState.isGroupCall) {
            videoCallState.participants.forEach((p) =>
                participantsData.push({
                    name: p.originalName,
                    avatar: p.avatar,
                }),
            );
            if (videoCallState.isUserParticipating) {
                participantsData.unshift({
                    name: chat.settings.myNickname || '我',
                    avatar: chat.settings.myAvatar || defaultMyGroupAvatar,
                });
            }
        } else {
            participantsData.push({
                name: chat.name,
                avatar: chat.settings.aiAvatar || defaultAvatar,
            });
            participantsData.unshift({
                name: '我',
                avatar: chat.settings.myAvatar || defaultAvatar,
            });
        }

        const callRecord = {
            chatId: videoCallState.activeChatId,
            timestamp: Date.now(),
            duration: duration,
            participants: participantsData,
            transcript: [...videoCallState.callHistory],
        };
        await db.callRecords.add(callRecord);

        // 添加结束消息
        let summaryMessage = {
            role: videoCallState.initiator === 'user' ? 'user' : 'assistant',
            content: endCallText,
            timestamp: Date.now(),
        };

        if (chat.isGroup && summaryMessage.role === 'assistant') {
            summaryMessage.senderName = videoCallState.callRequester || chat.members[0]?.originalName || chat.name;
        }

        chat.history.push(summaryMessage);

        // 触发AI总结
        const callTranscriptForAI = videoCallState.callHistory.map((h) => `${h.role === 'user' ? chat.settings.myNickname || '我' : h.role}: ${h.content}`).join('\n');

        const hiddenReportInstruction = {
            role: 'system',
            content: `[系统指令：视频通话刚刚结束。请你根据完整的通话文字记录（见下方），以你的角色口吻，向用户主动发送几条【格式为 {"type": "text", "content": "..."} 的】消息，来自然地总结这次通话的要点、确认达成的约定，或者表达你的感受。这很重要，能让用户感觉你记得通话内容。]\n---通话记录开始---\n${callTranscriptForAI}\n---通话记录结束---`,
            timestamp: Date.now() + 1,
            isHidden: true,
        };
        chat.history.push(hiddenReportInstruction);

        await db.chats.put(chat);
    }

    // 重置状态
    clearInterval(callTimerInterval);
    callTimerInterval = null;
    videoCallState = {
        isActive: false,
        isAwaitingResponse: false,
        isGroupCall: false,
        activeChatId: null,
        initiator: null,
        startTime: null,
        participants: [],
        isUserParticipating: true,
        callHistory: [],
        preCallContext: '',
        isUserMain: false, // 重置视图状态
    };

    // 返回聊天界面
    if (chat) {
        openChat(chat.id);
        triggerAiResponse();
    }
}

/**
 * 最小化视频通话
 */
window.minimizeVideoCall = function () {
    if (!window.videoCallState.isActive) return;

    const chat = window.state.chats[window.videoCallState.activeChatId];
    const bubble = document.getElementById('video-call-floating-bubble');
    const avatarImg = document.getElementById('video-floating-avatar');

    // 1. 设置悬浮球头像
    if (chat) {
        const defaultGroupAvatar = 'https://i.postimg.cc/gc3QYCDy/1-NINE7-Five.jpg';
        const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
        const avatarUrl = chat.isGroup ? chat.settings.groupAvatar || defaultGroupAvatar : chat.settings.aiAvatar || defaultAvatar;
        avatarImg.src = avatarUrl;
    }

    // 2. 隐藏视频界面，显示悬浮球
    document.getElementById('video-call-screen').classList.remove('active');
    bubble.style.display = 'block';

    // 3. 返回聊天界面
    if (window.showScreen) window.showScreen('chat-interface-screen');
}

/**
 * 恢复视频通话界面
 */
window.restoreVideoCall = function () {
    const bubble = document.getElementById('video-call-floating-bubble');
    bubble.style.display = 'none';
    if (window.showScreen) window.showScreen('video-call-screen');
}

/**
 * 初始化悬浮球的拖拽功能
 */
window.initVideoBubbleDrag = function () {
    const bubble = document.getElementById('video-call-floating-bubble');
    if (!bubble) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false;

    const onStart = (e) => {
        isDragging = true;
        hasMoved = false;
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        startX = clientX;
        startY = clientY;
        const rect = bubble.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasMoved = true;
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        const maxLeft = window.innerWidth - bubble.offsetWidth;
        const maxTop = window.innerHeight - bubble.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        bubble.style.left = `${newLeft}px`;
        bubble.style.top = `${newTop}px`;
        bubble.style.right = 'auto';
    };

    const onEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (!hasMoved) window.restoreVideoCall();
    };

    bubble.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    bubble.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
}

window.updateParticipantAvatars = function () {
    const grid = document.getElementById('participant-avatars-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const chat = window.state.chats[window.videoCallState.activeChatId];
    if (!chat) return;

    let participantsToRender = [];
    if (window.videoCallState.isGroupCall) {
        participantsToRender = [...window.videoCallState.participants];
        if (window.videoCallState.isUserParticipating) {
            participantsToRender.unshift({
                id: 'user',
                name: chat.settings.myNickname || '我',
                avatar: chat.settings.myAvatar || 'https://i.postimg.cc/cLPP10Vm/4.jpg',
            });
        }
    } else {
        participantsToRender.push({
            id: 'ai',
            name: chat.name,
            avatar: chat.settings.aiAvatar || 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg',
        });
    }

    participantsToRender.forEach((p) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'participant-avatar-wrapper';
        wrapper.dataset.participantId = p.id;
        const displayName = p.groupNickname || p.name;
        wrapper.innerHTML = `<img src="${p.avatar}" class="participant-avatar" alt="${displayName}"><div class="participant-name">${displayName}</div>`;
        grid.appendChild(wrapper);
    });
}

window.handleUserJoinCall = function () {
    if (!window.videoCallState.isActive || window.videoCallState.isUserParticipating) return;
    window.videoCallState.isUserParticipating = true;
    window.updateParticipantAvatars();
    document.getElementById('user-speak-btn').style.display = 'block';
    document.getElementById('join-call-btn').style.display = 'none';
    window.triggerAiInCallAction('[系统提示：用户加入了通话]');
}

window.updateCallTimer = function () {
    if (!window.videoCallState.isActive) return;
    const elapsed = Math.floor((Date.now() - window.videoCallState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const timer1 = document.getElementById('call-timer');
    const timer2 = document.getElementById('visual-call-timer');
    if (timer1) timer1.textContent = timeString;
    if (timer2) timer2.textContent = timeString;
}

window.triggerAiInCallAction = async function (userInput = null) {
    if (!window.videoCallState.isActive) return;

    const chat = window.state.chats[window.videoCallState.activeChatId];
    const { proxyUrl, apiKey, model } = window.state.apiConfig;

    const isVisualMode = chat.settings.visualVideoCallEnabled;
    const callFeed = isVisualMode ? document.getElementById('video-call-messages-visual') : document.getElementById('video-call-main');

    const userNickname = chat.settings.myNickname || '我';

    let worldBookContent = '';
    if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
        const linkedContents = chat.settings.linkedWorldBookIds
            .map((bookId) => {
                const worldBook = window.state.worldBooks.find((wb) => wb.id === bookId);
                return worldBook && worldBook.content ? `\n\n## 世界书: ${worldBook.name}\n${worldBook.content}` : '';
            })
            .filter(Boolean)
            .join('');
        if (linkedContents) {
            worldBookContent = `\n\n# 核心世界观设定 (你必须严格遵守)\n${linkedContents}\n`;
        }
    }

    if (userInput && window.videoCallState.isUserParticipating) {
        if (isVisualMode) {
            const userBubble = document.createElement('div');
            userBubble.className = 'visual-call-bubble user';
            userBubble.textContent = userInput;
            callFeed.appendChild(userBubble);
        } else {
            const userBubble = document.createElement('div');
            userBubble.className = 'call-message-bubble user-speech';
            userBubble.textContent = userInput;
            callFeed.appendChild(userBubble);
        }
        callFeed.scrollTop = callFeed.scrollHeight;
        window.videoCallState.callHistory.push({ role: 'user', content: userInput });
    }

    let inCallPrompt;
    if (window.videoCallState.isGroupCall) {
        const participantNames = window.videoCallState.participants.map((p) => p.originalName);
        if (window.videoCallState.isUserParticipating) {
            participantNames.unshift(userNickname);
        }

        inCallPrompt = `
        # 你的任务
        你是一个群聊AI，负责扮演所有【除了用户以外】的AI角色。你们正在进行一场群聊视频通话。
        你的任务是根据每个角色的性格，生成他们在通话中会说的【第一人称对话】，注意是在视频通话，绝对不能以为是在现实！每次回复的字数多些，50字以上。

        # 核心规则
        1.  **【【【语言铁律】】】**: 无论角色人设是什么国籍或说什么语言，在本次视频通话中，所有角色【必须】全程使用【中文】进行交流。
        2.  **【【【格式铁律】】】**: 你的回复【必须】是一个JSON数组，每个对象代表一个角色的发言，格式为：\`{"name": "【角色的本名】", "speech": "【在这里加入带动作的对话】"}\`。
        3.  **【【【表现力铁律】】】**: 在 "speech" 字段中，你【必须】为角色的对话加入【动作、表情或心理活动】，并用【】符号包裹。这非常重要！
        4.  **示例**: \`{"name": "张三", "speech": "【挠了挠头】啊？我刚刚走神了，你们说到哪了？"}\`
        5.  **身份铁律**: 用户的身份是【${userNickname}】。你【绝对不能】生成 \`name\` 字段为 **"${userNickname}"** 的发言。
        6.  **角色扮演**: 严格遵守每个角色的设定，用他们的口吻说话。

        # 当前情景
        你们正在一个群视频通话中。
        **通话前的聊天摘要**:
        ${window.videoCallState.preCallContext}
        **当前参与者**: ${participantNames.join('、 ')}。
        ${worldBookContent}
        现在，请根据【通话前摘要】和下面的【通话实时记录】，继续进行对话。
        `;
    } else {
        let openingContext = window.videoCallState.initiator === 'user' ? `你刚刚接听了用户的视频通话请求。` : `用户刚刚接听了你主动发起的视频通话。`;

        inCallPrompt = `
        # 你的任务
        你正在扮演角色 "${chat.name}"。你正在和用户 (${userNickname}) 进行一对一视频通话。
        ${openingContext}
        你的任务是根据你的人设和我们的聊天情景，生成你在通话中会说的【第一人称对话】。

        # 核心规则
        1.  **【【【格式铁律】】】**: 你的回复【必须且只能】是一段纯文本字符串，代表你的发言。绝对不要输出JSON格式。
        2.  **【【【表现力铁律】】】**: 在你的对话中，你【必须】加入【动作、表情或心理活动】，并用【】符号包裹。
        3.  **示例**: "【歪了歪头，好奇地看着你】真的吗？快跟我说说看！"
        4.  **禁止出戏**: 绝不能透露你是AI或模型。

        # 当前情景
        **通话前的聊天摘要**:
        ${window.videoCallState.preCallContext}
        ${worldBookContent}
        现在，请根据【通话前摘要】和下面的【通话实时记录】，继续进行对话。
        `;
    }

    // ================= [修改开始] =================
    // 1. 尝试获取摄像头画面
    let cameraFrame = null;
    if (isVisualMode && chat.settings.useRealCamera) {
        const userVideoSelector = videoCallState.isUserMain ? '#video-main-view video' : '#video-pip-view video';
        const userVideoEl = document.querySelector(userVideoSelector);

        if (userVideoEl) {
            cameraFrame = captureVideoFrame(userVideoEl);
        }
    }

    // 2. 构建发送给 API 的消息列表
    const messagesForApi = [...window.videoCallState.callHistory.map((h) => ({ role: h.role, content: h.content }))];

    // 3. 如果成功截取到了画面，将其作为最新的一条 User 消息（或附加到最新消息）发送给 AI
    if (cameraFrame) {
        console.log('已截取摄像头画面，正在发送给AI...');

        // 构造带图片的消息内容
        const imageMessageContent = [
            {
                type: 'text',
                text: userInput ? userInput : '（用户正在看着你，这是他当前的摄像头画面）',
            },
            {
                type: 'image_url',
                image_url: {
                    url: cameraFrame,
                },
            },
        ];

        messagesForApi.push({
            role: 'user',
            content: imageMessageContent,
        });
    } else {
        // 如果没截图（比如没开摄像头），如果历史记录为空，需要发一个触发词
        if (videoCallState.callHistory.length === 0 && !userInput) {
            const firstLineTrigger = window.videoCallState.initiator === 'user' ? `*你按下了接听键...*` : `*对方按下了接听键...*`;
            messagesForApi.push({ role: 'user', content: firstLineTrigger });
        }
    }

    try {
        let isGemini = proxyUrl === 'https://generativelanguage.googleapis.com/v1beta/models';
        let geminiConfig = window.toGeminiRequestData(model, apiKey, inCallPrompt, messagesForApi, isGemini);
        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'system', content: inCallPrompt }, ...messagesForApi],
                    temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                }),
            });
        if (!response.ok) throw new Error((await response.json()).error.message);

        const data = await response.json();
        const aiResponse = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
        const sanitizedResponse = aiResponse.replace(/!\[.*?\]\(.*?\)|https?:\/\/\S+/gi, '').trim();

        const connectingElement = callFeed.querySelector('em');
        if (connectingElement) connectingElement.remove();

        if (window.videoCallState.isGroupCall) {
            // FIX for Group Call JSON Parsing
            try {
                // Remove markdown code block syntax if present
                const cleanedJson = sanitizedResponse.replace(/```json\s*|```/gi, '').trim();
                const robustParse2 = window.repairAndParseJSON || JSON.parse;
                const turns = robustParse2(cleanedJson);
                if (Array.isArray(turns)) {
                    turns.forEach(turn => {
                        let bubble;
                        if (isVisualMode) {
                            bubble = document.createElement('div');
                            bubble.className = 'visual-call-bubble ai';
                        } else {
                            bubble = document.createElement('div');
                            bubble.className = 'call-message-bubble ai-speech';
                            bubble.innerHTML = `<strong>${turn.name}:</strong> `;
                        }
                        bubble.appendChild(document.createTextNode(turn.speech));
                        callFeed.appendChild(bubble);
                        window.videoCallState.callHistory.push({ role: 'assistant', content: `${turn.name}: ${turn.speech}` });
                    });
                }
            } catch (e) {
                console.error("Failed to parse group call JSON response", e);
            }
        } else {
            let bubble;
            if (isVisualMode) {
                bubble = document.createElement('div');
                bubble.className = 'visual-call-bubble ai';
            } else {
                bubble = document.createElement('div');
                bubble.className = 'call-message-bubble ai-speech';
            }
            bubble.appendChild(document.createTextNode(sanitizedResponse));
            callFeed.appendChild(bubble);
            window.videoCallState.callHistory.push({ role: 'assistant', content: sanitizedResponse });

            // Minimax voice logic (assuming playMinimaxAudio exists or is global)
            // if (typeof playMinimaxAudio === 'function' && ...)
        }

        callFeed.scrollTop = callFeed.scrollHeight;
    } catch (error) {
        const errorBubble = document.createElement('div');
        errorBubble.style.color = '#ff8a80';
        errorBubble.textContent = `[ERROR: ${error.message}]`;
        if (isVisualMode) {
            errorBubble.className = 'visual-call-bubble ai';
        } else {
            errorBubble.className = 'call-message-bubble ai-speech';
        }
        callFeed.appendChild(errorBubble);
        callFeed.scrollTop = callFeed.scrollHeight;
        window.videoCallState.callHistory.push({ role: 'assistant', content: `[ERROR: ${error.message}]` });
    }
}

// Initializer
document.addEventListener('DOMContentLoaded', () => {
    // 绑定视频通话相关按钮
    const videoBtn = document.getElementById('video-call-btn');
    if (videoBtn) videoBtn.addEventListener('click', window.handleInitiateCall);

    const groupVideoBtn = document.getElementById('group-video-call-btn');
    if (groupVideoBtn) groupVideoBtn.addEventListener('click', window.handleInitiateCall);

    const endVideoBtn = document.getElementById('end-video-call-btn');
    if (endVideoBtn) endVideoBtn.addEventListener('click', window.endVideoCall);

    const endVideoBtnText = document.getElementById('end-video-call-btn-text');
    if (endVideoBtnText) endVideoBtnText.addEventListener('click', window.endVideoCall);

    const minimizeBtn = document.getElementById('minimize-video-call-btn');
    if (minimizeBtn) minimizeBtn.addEventListener('click', window.minimizeVideoCall);

    const restoreBubble = document.getElementById('video-call-floating-bubble');
    if (restoreBubble) restoreBubble.addEventListener('click', window.restoreVideoCall);

    const joinBtn = document.getElementById('join-call-btn');
    if (joinBtn) joinBtn.addEventListener('click', window.handleUserJoinCall);

    const userSpeakBtn = document.getElementById('user-speak-btn');
    if (userSpeakBtn) {
        userSpeakBtn.addEventListener('click', async () => {
            if (!window.videoCallState.isActive) return;
            const userAvatar = document.querySelector('.participant-avatar-wrapper[data-participant-id="user"] .participant-avatar');
            if (userAvatar) userAvatar.classList.add('speaking');

            let userInput = null;
            if (window.showCustomPrompt) {
                userInput = await window.showCustomPrompt('你说', '请输入你想说的话...');
            } else {
                userInput = prompt('请输入你想说的话...');
            }

            if (userAvatar) userAvatar.classList.remove('speaking');
            if (userInput && userInput.trim()) {
                window.triggerAiInCallAction(userInput.trim());
            }
        });
    }

    // Initialize bubble drag
    if (typeof window.initVideoBubbleDrag === 'function') window.initVideoBubbleDrag();
});

window.showIncomingCallModal = function (chatId) {
    const chat = window.state.chats[chatId];
    if (!chat) return;

    if (chat.isGroup) {
        const requesterName = window.videoCallState.callRequester || chat.members[0]?.name || '一位成员';
        const defaultGroupAvatar = 'https://i.postimg.cc/gc3QYCDy/1-NINE7-Five.jpg';
        const avatarEl = document.getElementById('caller-avatar');
        if (avatarEl) avatarEl.src = chat.settings.groupAvatar || defaultGroupAvatar;

        const nameEl = document.getElementById('caller-name');
        if (nameEl) nameEl.textContent = chat.name;

        const ct = document.querySelector('.incoming-call-content .caller-text');
        if (ct) ct.textContent = `${requesterName} 邀请你加入群视频`;
    } else {
        const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
        const avatarEl = document.getElementById('caller-avatar');
        if (avatarEl) avatarEl.src = chat.settings.aiAvatar || defaultAvatar;

        const nameEl = document.getElementById('caller-name');
        if (nameEl) nameEl.textContent = chat.name;

        const ct = document.querySelector('.incoming-call-content .caller-text');
        if (ct) ct.textContent = '邀请你视频通话';
    }

    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.add('visible');
    if (window.playRingtone) window.playRingtone();
}

window.hideIncomingCallModal = function () {
    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.remove('visible');
    if (window.stopRingtone) window.stopRingtone();
}

window.switchVideoViews = function () {
    // 切换状态：标记当前谁在主屏幕
    videoCallState.isUserMain = !videoCallState.isUserMain;

    const chat = state.chats[videoCallState.activeChatId];
    if (!chat) return;

    const useCamera = chat.settings.useRealCamera;

    // 获取所有视图元素
    const mainImg = document.querySelector('#video-main-view img');
    const mainVideo = document.querySelector('#video-main-view video');
    const pipImg = document.querySelector('#video-pip-view img');
    const pipVideo = document.querySelector('#video-pip-view video');

    // 准备资源地址
    const charUrl = chat.settings.charVideoImage || defaultAvatar;
    const userUrl = chat.settings.userVideoImage || defaultAvatar;

    // 根据前置/后置决定是否镜像 (前置镜像，后置不镜像)
    const shouldMirror = videoCallState.facingMode === 'user';
    const mirrorStyle = shouldMirror ? 'scaleX(-1)' : 'none';

    // --- 辅助函数：安全播放视频 ---
    const safePlay = (videoEl, stream, transform) => {
        if (!videoEl) return;
        videoEl.srcObject = stream;
        videoEl.muted = true; // 必须静音才能自动播放
        videoEl.style.transform = transform;
        videoEl.style.display = 'block';
        // 强制触发播放
        videoEl.play().catch((e) => console.error('视频播放失败:', e));
    };

    if (videoCallState.isUserMain) {
        // === 状态 A：用户(我)在主大屏，角色(Ta)在小屏 ===

        // 1. 设置小屏 (显示对方 - 始终是图片)
        if (pipVideo) {
            pipVideo.style.display = 'none';
            pipVideo.srcObject = null; // 切断流
        }
        if (pipImg) {
            pipImg.style.display = 'block';
            pipImg.src = charUrl;
        }

        // 2. 设置大屏 (显示我)
        if (useCamera && window.localCameraStream) {
            // 摄像头模式 -> 视频流给大屏
            if (mainImg) mainImg.style.display = 'none';
            // 使用辅助函数强制播放
            safePlay(mainVideo, window.localCameraStream, mirrorStyle);
        } else {
            // 图片模式 -> 图片给大屏
            if (mainVideo) {
                mainVideo.style.display = 'none';
                mainVideo.srcObject = null;
            }
            if (mainImg) {
                mainImg.style.display = 'block';
                mainImg.src = userUrl;
            }
        }
    } else {
        // === 状态 B (默认)：角色(Ta)在主大屏，用户(我)在小屏 ===

        // 1. 设置大屏 (显示对方 - 始终是图片)
        if (mainVideo) {
            mainVideo.style.display = 'none';
            mainVideo.srcObject = null; // 切断流
        }
        if (mainImg) {
            mainImg.style.display = 'block';
            mainImg.src = charUrl;
        }

        // 2. 设置小屏 (显示我)
        if (useCamera && window.localCameraStream) {
            // 摄像头模式 -> 视频流给小屏
            if (pipImg) pipImg.style.display = 'none';
            // 使用辅助函数强制播放
            safePlay(pipVideo, window.localCameraStream, mirrorStyle);
        } else {
            // 图片模式 -> 图片给小屏
            if (pipVideo) {
                pipVideo.style.display = 'none';
                pipVideo.srcObject = null;
            }
            if (pipImg) {
                pipImg.style.display = 'block';
                pipImg.src = userUrl;
            }
        }
    }
}

window.handleVideoCallReroll = async function () {
    if (!window.videoCallState.isActive) return;
    const lastUserSpeechIndex = window.videoCallState.callHistory.findLastIndex((h) => h.role === 'user');
    if (lastUserSpeechIndex > -1) {
        window.videoCallState.callHistory.splice(lastUserSpeechIndex + 1);
    } else {
        window.videoCallState.callHistory = [];
    }
    const chat = window.state.chats[window.videoCallState.activeChatId];
    const isVisualMode = chat.settings.visualVideoCallEnabled;
    const callFeed = isVisualMode ? document.getElementById('video-call-messages-visual') : document.getElementById('video-call-main');
    callFeed.innerHTML = '';
    window.videoCallState.callHistory.forEach((msg) => {
        let bubble;
        if (isVisualMode) {
            bubble = document.createElement('div');
            bubble.className = `visual-call-bubble ${msg.role === 'user' ? 'user' : 'ai'}`;
        } else {
            bubble = document.createElement('div');
            bubble.className = `call-message-bubble ${msg.role === 'user' ? 'user-speech' : 'ai-speech'}`;
        }
        bubble.textContent = msg.content;
        callFeed.appendChild(bubble);
    });
    window.triggerAiInCallAction();
}

window.handleCallControls = function (event) {
    // 找到被点击的那个按钮元素
    const button = event.target.closest('.control-btn');
    if (!button) return; // 如果点击的不是按钮，就什么也不做

    // 根据按钮的ID来执行不同的操作
    switch (button.id) {
        case 'user-speak-btn':
        case 'user-speak-btn-visual':
            // 这里调用你原本处理“用户发言”的函数
            handleUserSpeakInCall(); // 假设你的函数名叫这个
            break;
        case 'hang-up-btn':
        case 'hang-up-btn-visual':
            // 调用你原本处理“挂断”的函数
            endVideoCall();
            break;
        case 'join-call-btn':
            // 调用你原本处理“加入通话”的函数
            handleUserJoinCall();
            break;
        case 'reroll-call-btn':
        case 'reroll-call-btn-text':
            // 调用你原本处理“重roll”的函数
            handleVideoCallReroll();
            break;
        case 'flip-real-camera-btn':
            handleCameraFlip();
            break;
        case 'switch-camera-btn':
            // 调用你原本处理“切换镜头”的函数
            switchVideoViews();
            break;
    }
}

window.setupMoreVideoListeners = function () {
    const cancelBtn = document.getElementById('cancel-call-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        window.videoCallState.isAwaitingResponse = false;
        window.videoCallState.activeChatId = null;
        if (window.showScreen) window.showScreen('chat-interface-screen');
        if (window.stopRingtone) window.stopRingtone();
    });

    // Removed explicit listeners for hang-up buttons to avoid double triggering
    // as they are handled by handleCallControls via event delegation on .video-call-controls

    const textModeControls = document.querySelector('#text-call-interface .video-call-controls');
    if (textModeControls) textModeControls.addEventListener('click', window.handleCallControls);

    const visualModeControls = document.querySelector('#visual-call-interface .video-call-controls');
    if (visualModeControls) visualModeControls.addEventListener('click', window.handleCallControls);

    const acceptBtn = document.getElementById('accept-call-btn');
    if (acceptBtn) acceptBtn.addEventListener('click', async () => {
        if (window.stopRingtone) window.stopRingtone();
        if (window.hideIncomingCallModal) window.hideIncomingCallModal();
        const callerChatId = window.videoCallState.activeChatId;
        if (!callerChatId) return;

        window.state.activeChatId = callerChatId;
        window.videoCallState.initiator = 'ai';
        window.videoCallState.isUserParticipating = true;

        if (window.videoCallState.isGroupCall) {
            const chat = window.state.chats[window.videoCallState.activeChatId];
            const requester = chat.members.find((m) => m.name === window.videoCallState.callRequester);
            if (requester) window.videoCallState.participants = [requester];
            else window.videoCallState.participants = [];
        }

        if (window.startVideoCall) window.startVideoCall();
    });

    const rejectBtn = document.getElementById('decline-call-btn');
    if (rejectBtn) rejectBtn.addEventListener('click', async () => {
        if (window.stopRingtone) window.stopRingtone();
        if (window.hideIncomingCallModal) window.hideIncomingCallModal();

        const callerChatId = window.videoCallState.activeChatId;
        if (callerChatId && window.showNotification) {
            window.showNotification(callerChatId, '你已拒绝通话邀请。');
            const originalActiveChatId = window.state.activeChatId;
            window.state.activeChatId = callerChatId;
            if (window.triggerAiResponse) await window.triggerAiResponse();
            window.state.activeChatId = originalActiveChatId;
        }
        window.videoCallState.isAwaitingResponse = false;
        window.videoCallState.activeChatId = null;

    });
}

document.addEventListener('DOMContentLoaded', () => {
    window.setupMoreVideoListeners();
    if (typeof initPollEventListeners === 'function') {
        initPollEventListeners();
    }
});

/* ==========================================================================================
 *                                   投票功能模块
 * ========================================================================================== */

/**
 * 打开创建投票的模态框并初始化
 */
function openCreatePollModal() {
    const modal = document.getElementById('create-poll-modal');
    const questionInput = document.getElementById('poll-question-input');
    if (questionInput) questionInput.value = '';

    const optionsContainer = document.getElementById('poll-options-container');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        // 默认创建两个空的选项框
        addPollOptionInput();
        addPollOptionInput();
    }

    if (modal) modal.classList.add('visible');
}

/**
 * 在模态框中动态添加一个选项输入框
 */
function addPollOptionInput() {
    const container = document.getElementById('poll-options-container');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'poll-option-input-wrapper';
    wrapper.innerHTML = `
        <input type="text" class="poll-option-input" placeholder="选项内容...">
        <button class="remove-option-btn">-</button>
    `;

    const removeBtn = wrapper.querySelector('.remove-option-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            // 确保至少保留两个选项
            if (container.children.length > 2) {
                wrapper.remove();
            } else {
                alert('投票至少需要2个选项。');
            }
        });
    }

    container.appendChild(wrapper);
}

/**
 * 用户确认发起投票
 */
async function sendPoll() {
    if (!window.state.activeChatId) return;

    const questionInput = document.getElementById('poll-question-input');
    const question = questionInput ? questionInput.value.trim() : '';
    if (!question) {
        alert('请输入投票问题！');
        return;
    }

    const options = Array.from(document.querySelectorAll('.poll-option-input'))
        .map((input) => input.value.trim())
        .filter((text) => text); // 过滤掉空的选项

    if (options.length < 2) {
        alert('请至少输入2个有效的投票选项！');
        return;
    }

    const chat = window.state.chats[window.state.activeChatId];
    // 这里要注意 chat 是否存在，以及 myNickname 的获取
    const myNickname = (chat.isGroup && chat.settings) ? (chat.settings.myNickname || '我') : '我';

    const newPollMessage = {
        role: 'user',
        senderName: myNickname,
        type: 'poll',
        timestamp: Date.now(),
        question: question,
        options: options,
        votes: {}, // 初始投票为空
        isClosed: false,
    };

    chat.history.push(newPollMessage);
    await window.db.chats.put(chat);

    if (window.appendMessage) window.appendMessage(newPollMessage, chat);
    if (window.renderChatList) window.renderChatList();

    const modal = document.getElementById('create-poll-modal');
    if (modal) modal.classList.remove('visible');
}

/**
 * 处理用户投票，并将事件作为隐藏消息存入历史记录
 * @param {number} timestamp - 投票消息的时间戳
 * @param {string} choice - 用户选择的选项文本
 */
async function handleUserVote(timestamp, choice) {
    if (!window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    const poll = chat.history.find((m) => m.timestamp === timestamp);
    const myNickname = (chat.isGroup && chat.settings) ? (chat.settings.myNickname || '我') : '我';

    // 1. 如果投票不存在或已关闭，直接返回
    if (!poll || poll.isClosed) {
        // 如果是已关闭的投票，则直接显示结果
        if (poll && poll.isClosed) {
            showPollResults(timestamp);
        }
        return;
    }

    // 2. 检查用户是否点击了已经投过的同一个选项
    const isReclickingSameOption = poll.votes[choice] && poll.votes[choice].includes(myNickname);

    // 3. 如果不是重复点击，才执行投票逻辑
    if (!isReclickingSameOption) {
        // 移除旧投票（如果用户改选）
        for (const option in poll.votes) {
            const voterIndex = poll.votes[option].indexOf(myNickname);
            if (voterIndex > -1) {
                poll.votes[option].splice(voterIndex, 1);
            }
        }
        // 添加新投票
        if (!poll.votes[choice]) {
            poll.votes[choice] = [];
        }
        poll.votes[choice].push(myNickname);
    }

    // 4. 现在只处理用户投票事件，不再检查是否结束
    let hiddenMessageContent = null;

    // 只有在用户真正投票或改票时，才生成提示
    if (!isReclickingSameOption) {
        hiddenMessageContent = `[系统提示：用户 (${myNickname}) 刚刚投票给了 “${choice}”。]`;
    }

    // 5. 如果有需要通知AI的事件，则创建并添加隐藏消息
    if (hiddenMessageContent) {
        const hiddenMessage = {
            role: 'system',
            content: hiddenMessageContent,
            timestamp: Date.now(),
            isHidden: true,
        };
        chat.history.push(hiddenMessage);
    }

    // 6. 保存数据并更新UI
    await window.db.chats.put(chat);
    if (window.renderChatInterface) window.renderChatInterface(window.state.activeChatId);
}

/**
 * 用户结束投票，并将事件作为隐藏消息存入历史记录
 * @param {number} timestamp - 投票消息的时间戳
 */
async function endPoll(timestamp) {
    if (!window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    const poll = chat.history.find((m) => m.timestamp === timestamp);
    if (!poll || poll.isClosed) return;

    const confirmed = await window.showCustomConfirm('结束投票', '确定要结束这个投票吗？结束后将无法再进行投票。');
    if (confirmed) {
        poll.isClosed = true;

        const resultSummary = poll.options.map((opt) => `“${opt}”(${poll.votes[opt]?.length || 0}票)`).join('，');
        const hiddenMessageContent = `[系统提示：用户手动结束了投票！最终结果为：${resultSummary}。]`;

        const hiddenMessage = {
            role: 'system',
            content: hiddenMessageContent,
            timestamp: Date.now(),
            isHidden: true,
        };
        chat.history.push(hiddenMessage);

        // 只保存数据和更新UI，不调用 triggerAiResponse()
        await window.db.chats.put(chat);
        if (window.renderChatInterface) window.renderChatInterface(window.state.activeChatId);
    }
}

/**
 * 显示投票结果详情
 * @param {number} timestamp - 投票消息的时间戳
 */
function showPollResults(timestamp) {
    if (!window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    const poll = chat.history.find((m) => m.timestamp === timestamp);
    if (!poll || !poll.isClosed) return;

    let resultsHtml = `<p><strong>${poll.question}</strong></p><hr style="opacity: 0.2; margin: 10px 0;">`;

    if (Object.keys(poll.votes).length === 0) {
        resultsHtml += '<p style="color: #8a8a8a;">还没有人投票。</p>';
    } else {
        poll.options.forEach((option) => {
            const voters = poll.votes[option] || [];
            resultsHtml += `
                <div style="margin-bottom: 15px;">
                    <p style="font-weight: 500; margin: 0 0 5px 0;">${option} (${voters.length}票)</p>
                    <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.5;">
                        ${voters.length > 0 ? voters.join('、 ') : '无人投票'}
                    </p>
                </div>
            `;
        });
    }

    if (window.showCustomAlert) window.showCustomAlert('投票结果', resultsHtml);
}

// 初始化投票功能相关的所有事件监听器
function initPollEventListeners() {
    // 1. 在输入框工具栏添加按钮
    const sendPollBtn = document.getElementById('send-poll-btn');
    if (sendPollBtn) sendPollBtn.addEventListener('click', openCreatePollModal);

    // 2. 投票创建模态框的按钮
    const addOptionBtn = document.getElementById('add-poll-option-btn');
    if (addOptionBtn) addOptionBtn.addEventListener('click', addPollOptionInput);

    const cancelPollBtn = document.getElementById('cancel-create-poll-btn');
    if (cancelPollBtn) cancelPollBtn.addEventListener('click', () => {
        const modal = document.getElementById('create-poll-modal');
        if (modal) modal.classList.remove('visible');
    });

    const confirmPollBtn = document.getElementById('confirm-create-poll-btn');
    if (confirmPollBtn) confirmPollBtn.addEventListener('click', sendPoll);

    // 3. 使用事件委托处理投票卡片内的所有点击事件
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.addEventListener('click', (e) => {
            const pollCard = e.target.closest('.poll-card');
            if (!pollCard) return;

            const timestamp = parseInt(pollCard.dataset.pollTimestamp);
            if (isNaN(timestamp)) return;

            // 点击了选项
            const optionItem = e.target.closest('.poll-option-item');
            if (optionItem && !pollCard.classList.contains('closed')) {
                handleUserVote(timestamp, optionItem.dataset.option);
                return;
            }

            // 点击了动作按钮（结束投票/查看结果）
            const actionBtn = e.target.closest('.poll-action-btn');
            if (actionBtn) {
                if (pollCard.classList.contains('closed')) {
                    showPollResults(timestamp);
                } else {
                    endPoll(timestamp);
                }
                return;
            }

            // 如果是已结束的投票，点击卡片任何地方都可以查看结果
            if (pollCard.classList.contains('closed')) {
                showPollResults(timestamp);
            }
        });
    }
}

// ===================================================================
// 分享链接功能 (Moved from main-app.js)
// ===================================================================

/**
 * 打开“分享链接”的模态框
 */
function openShareLinkModal() {
    if (!window.state || !window.state.activeChatId) return;

    // 清空上次输入的内容
    const titleInput = document.getElementById('link-title-input');
    const descInput = document.getElementById('link-description-input');
    const sourceInput = document.getElementById('link-source-input');
    const contentInput = document.getElementById('link-content-input');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (sourceInput) sourceInput.value = '';
    if (contentInput) contentInput.value = '';

    // 显示模态框
    const modal = document.getElementById('share-link-modal');
    if (modal) modal.classList.add('visible');
}

/**
 * 用户确认分享，创建并发送链接卡片消息
 */
async function sendUserLinkShare() {
    if (!window.state || !window.state.activeChatId) return;

    const titleInput = document.getElementById('link-title-input');
    const title = titleInput ? titleInput.value.trim() : '';

    if (!title) {
        alert('标题是必填项哦！');
        return;
    }

    const descInput = document.getElementById('link-description-input');
    const sourceInput = document.getElementById('link-source-input');
    const contentInput = document.getElementById('link-content-input');

    const description = descInput ? descInput.value.trim() : '';
    const sourceName = sourceInput ? sourceInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    const chat = window.state.chats[window.state.activeChatId];

    // 创建消息对象
    const linkMessage = {
        role: 'user', // 角色是 'user'
        type: 'share_link',
        timestamp: Date.now(),
        title: title,
        description: description,
        source_name: sourceName,
        content: content,
        // 用户分享的链接，我们不提供图片，让它总是显示占位图
        thumbnail_url: null,
    };

    // 将消息添加到历史记录
    chat.history.push(linkMessage);
    if (window.db && window.db.chats) {
        await window.db.chats.put(chat);
    }

    // 渲染新消息并更新列表
    if (typeof window.appendMessage === 'function') {
        window.appendMessage(linkMessage, chat);
    }
    if (typeof window.renderChatList === 'function') {
        window.renderChatList();
    }

    // 关闭模态框
    const modal = document.getElementById('share-link-modal');
    if (modal) modal.classList.remove('visible');
}

// 绑定相关事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 1. 绑定输入框上方“分享链接”按钮的点击事件
    const shareLinkBtn = document.getElementById('share-link-btn');
    if (shareLinkBtn) {
        shareLinkBtn.addEventListener('click', openShareLinkModal);
    }

    // 2. 绑定模态框中“取消”按钮的点击事件
    const cancelBtn = document.getElementById('cancel-share-link-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('share-link-modal');
            if (modal) modal.classList.remove('visible');
        });
    }

    // 3. 绑定模态框中“分享”按钮的点击事件
    const confirmBtn = document.getElementById('confirm-share-link-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', sendUserLinkShare);
    }
});

// -------------------------------------------------------------------
// 4. 定位与途经点功能 (Location & Trajectory)
// -------------------------------------------------------------------

/**
 * 根据距离文本，计算CSS宽度百分比
 * @param {string} distanceText - 距离描述，例如 "500m", "10km", "很近"
 * @returns {number} - 10到90之间的百分比
 */
function calculatePinDistancePercentage(distanceText) {
    if (!distanceText) return 50; // 默认值

    const text = distanceText.toLowerCase();
    // 提取数字部分
    const matches = text.match(/(\d+(\.\d+)?)/);
    const num = matches ? parseFloat(matches[1]) : 0;

    // 根据单位或关键词判断
    if (text.includes('km') || text.includes('公里')) {
        if (num > 1000) return 90;
        if (num > 100) return 80;
        if (num > 10) return 70;
        if (num > 1) return 60;
        return 50;
    } else if (text.includes('m') || text.includes('米')) {
        if (num > 500) return 40;
        if (num > 100) return 30;
        return 20;
    } else if (text.includes('远') || text.includes('不同城市')) {
        return 90;
    } else if (text.includes('附近') || text.includes('隔壁')) {
        return 20;
    } else if (text.includes('近')) {
        return 30;
    }

    return 15; // 如果无法识别，给一个最小的距离
}

/**
 * 在定位模态框中添加一个途经点输入框
 */
function addTrajectoryPointInput(name = '') {
    const container = document.getElementById('trajectory-points-container');
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.innerHTML = `
        <input type="text" class="trajectory-point-input" placeholder="途经点${container.children.length + 1}" value="${name}" style="flex-grow: 1;">
        <button class="remove-option-btn">-</button>
    `;
    div.querySelector('.remove-option-btn').addEventListener('click', () => div.remove());
    container.appendChild(div);
}

/**
 * 发送用户定位
 */
async function sendUserLocation() {
    if (!window.state || !window.state.activeChatId) return;

    const userLocation = document.getElementById('user-location-input').value.trim();
    const aiLocation = document.getElementById('ai-location-input').value.trim();
    const distance = document.getElementById('distance-input').value.trim();

    if (!distance || (!userLocation && !aiLocation)) {
        alert('“我的位置”和“Ta的位置”至少要填写一个，且“相距”为必填项！');
        return;
    }

    const trajectoryPoints = Array.from(document.querySelectorAll('.trajectory-point-input'))
        .map((input) => ({ name: input.value.trim() }))
        .filter((point) => point.name);

    const chat = window.state.chats[window.state.activeChatId];

    // 1. 根据用户输入，构建一条AI能看懂的文本内容
    let contentString = '[SEND_LOCATION]';
    if (userLocation) contentString += ` 我的位置: ${userLocation}`;
    if (aiLocation) contentString += ` | 你的位置: ${aiLocation}`;
    contentString += ` | 相距: ${distance}`;
    if (trajectoryPoints.length > 0) {
        const trajectoryText = trajectoryPoints.map((p) => p.name).join(', ');
        contentString += ` | 途经点: ${trajectoryText}`;
    }

    // 2. 创建消息对象
    const locationMessage = {
        role: 'user',
        type: 'location',
        timestamp: Date.now(),
        userLocation: userLocation,
        aiLocation: aiLocation,
        distance: distance,
        trajectoryPoints: trajectoryPoints,
        content: contentString,
    };

    // 保存和渲染逻辑
    chat.history.push(locationMessage);
    if (window.db && window.db.chats) {
        await window.db.chats.put(chat);
    }

    if (typeof window.appendMessage === 'function') {
        window.appendMessage(locationMessage, chat);
    }
    if (typeof window.renderChatList === 'function') {
        window.renderChatList();
    }

    const modal = document.getElementById('send-location-modal');
    if (modal) modal.classList.remove('visible');
}

// 绑定相关事件监听器 (定位功能)
document.addEventListener('DOMContentLoaded', () => {
    // 1. 绑定定位模态框的取消按钮
    const locationCancelBtn = document.getElementById('location-cancel-btn');
    if (locationCancelBtn) {
        locationCancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('send-location-modal');
            if (modal) modal.classList.remove('visible');
        });
    }

    // 2. 绑定定位模态框的确认按钮
    const locationConfirmBtn = document.getElementById('location-confirm-btn');
    if (locationConfirmBtn) {
        locationConfirmBtn.addEventListener('click', sendUserLocation);
    }

    // 3. 绑定“添加途经点”按钮
    const addTrajectoryBtn = document.getElementById('add-trajectory-point-btn');
    if (addTrajectoryBtn) {
        addTrajectoryBtn.addEventListener('click', () => {
            // 限制最多添加3个途经点
            if (document.querySelectorAll('.trajectory-point-input').length < 3) {
                addTrajectoryPointInput();
            } else {
                alert('最多只能添加3个途经点哦！');
            }
        });
    }

    // 4. 绑定聊天功能栏中的“定位”按钮
    const sendLocationBtn = document.getElementById('send-location-btn');
    if (sendLocationBtn) {
        sendLocationBtn.addEventListener('click', () => {
            const container = document.getElementById('trajectory-points-container');
            if (container) container.innerHTML = ''; // 清空途经点
            const modal = document.getElementById('send-location-modal');
            if (modal) modal.classList.add('visible');
        });
    }
});

// ===================================================================
// 时间轴/存档功能核心函数
// ===================================================================

/**
 * 打开时间轴管理弹窗
 */
function openBranchingModal() {
    if (!window.state.activeChatId) return;
    renderBranchList();
    document.getElementById('branching-modal').classList.add('visible');
}

/**
 * 渲染存档列表
 */
function renderBranchList() {
    const chat = window.state.chats[window.state.activeChatId];
    const listEl = document.getElementById('branch-list');
    listEl.innerHTML = '';

    if (!chat.checkpoints || chat.checkpoints.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">暂无存档记录</p>';
        return;
    }

    // 按时间倒序排列
    const sortedCheckpoints = [...chat.checkpoints].sort((a, b) => b.timestamp - a.timestamp);

    sortedCheckpoints.forEach((cp) => {
        const dateStr = new Date(cp.timestamp).toLocaleString();
        const item = document.createElement('div');
        item.className = 'branch-item';

        // 获取最后一条消息作为预览
        const lastMsg = cp.history.length > 0 ? cp.history[cp.history.length - 1].content : '无记录';
        let previewText = typeof lastMsg === 'string' ? lastMsg.substring(0, 20) : '[特殊消息]';

        // 获取心声预览 (如果有)
        if (cp.latestInnerVoice && cp.latestInnerVoice.thoughts) {
            previewText += ` | 心声: ${cp.latestInnerVoice.thoughts.substring(0, 10)}...`;
        }

        item.innerHTML = `
        <div class="branch-info">
            <div class="branch-name">${cp.name}</div>
            <div class="branch-meta">${dateStr} · ${cp.history.length}条记录</div>
            <div class="branch-meta" style="margin-top:2px; color:#aaa;">${previewText}</div>
        </div>
        <div class="branch-actions">
            <button class="branch-action-btn branch-load" onclick="loadBranchCheckpoint('${cp.id}')">读取</button>
            <button class="branch-action-btn branch-delete" onclick="deleteBranchCheckpoint('${cp.id}')">删除</button>
        </div>
    `;
        listEl.appendChild(item);
    });
}

/**
 * 创建当前进度的存档
 */
async function createBranchCheckpoint() {
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat) return;

    const defaultName = `存档于 ${new Date().toLocaleTimeString()}`;
    const name = await showCustomPrompt('新建存档', '给这个节点起个名字吧', defaultName);

    if (name) {
        const newCheckpoint = {
            id: 'cp_' + Date.now(),
            name: name.trim(),
            timestamp: Date.now(),
            // 1. 保存聊天历史
            history: JSON.parse(JSON.stringify(chat.history)),
            // 2. 保存心声历史
            innerVoiceHistory: JSON.parse(JSON.stringify(chat.innerVoiceHistory || [])),
            // 3. 保存当前心声
            latestInnerVoice: chat.latestInnerVoice ? JSON.parse(JSON.stringify(chat.latestInnerVoice)) : null,
            // 4. 保存角色状态
            status: chat.status ? JSON.parse(JSON.stringify(chat.status)) : {
                text: '在线',
                lastUpdate: Date.now(),
                isBusy: false,
            },
        };

        if (!chat.checkpoints) chat.checkpoints = [];
        chat.checkpoints.push(newCheckpoint);
        await window.db.chats.put(chat);
        renderBranchList();
        alert('存档成功！(包含心声)');
    }
}

/**
 * 读取存档
 */
window.loadBranchCheckpoint = async function (checkpointId) {
    const chat = window.state.chats[window.state.activeChatId];
    const checkpoint = chat.checkpoints.find((cp) => cp.id === checkpointId);

    if (!checkpoint) return;

    const confirmed = await showCustomConfirm('确认读取', `确定要读取存档“${checkpoint.name}”吗？\n\n⚠️ 注意：读取后，当前的未保存进度将会丢失！`, { confirmButtonClass: 'btn-danger' });

    if (confirmed) {
        // 1. 恢复聊天历史
        chat.history = JSON.parse(JSON.stringify(checkpoint.history));

        // 2. 恢复心声历史
        chat.innerVoiceHistory = JSON.parse(JSON.stringify(checkpoint.innerVoiceHistory || []));

        // 3. 恢复当前心声状态
        chat.latestInnerVoice = checkpoint.latestInnerVoice ? JSON.parse(JSON.stringify(checkpoint.latestInnerVoice)) : null;

        // 4. 恢复角色状态
        chat.status = checkpoint.status ? JSON.parse(JSON.stringify(checkpoint.status)) : {
            text: '在线',
            lastUpdate: Date.now(),
            isBusy: false,
        };

        // 5. 重置自动总结计数器，防止因时间线回溯导致总结不再触发
        if (!chat.settings.summary) chat.settings.summary = {};
        chat.settings.summary.lastSummaryIndex = chat.history.length - 1;

        await window.db.chats.put(chat);
        if (typeof window.renderChatInterface === 'function') {
            window.renderChatInterface(window.state.activeChatId); // 刷新聊天界面
        }

        document.getElementById('branching-modal').classList.remove('visible'); // 关闭弹窗
        alert(`已回溯至：${checkpoint.name}`);
    }
};

/**
 * 删除存档
 */
window.deleteBranchCheckpoint = async function (checkpointId) {
    const chat = window.state.chats[window.state.activeChatId];
    const confirmed = await showCustomConfirm('删除存档', '确定要删除这个存档吗？不可恢复。', {
        confirmButtonClass: 'btn-danger',
    });

    if (confirmed) {
        chat.checkpoints = chat.checkpoints.filter((cp) => cp.id !== checkpointId);
        await window.db.chats.put(chat);
        renderBranchList();
    }
};

/**
 * 重开新剧情
 */
async function restartChatBranch() {
    const chat = window.state.chats[window.state.activeChatId];

    const confirmed = await showCustomConfirm('重开新剧情', '确定要清空当前所有聊天记录，开始一条新的故事线吗？\n这也会清空当前的所有心声记录。\n\n⚠️ 建议先点右上角保存当前进度为存档！', { confirmButtonClass: 'btn-danger' });

    if (confirmed) {
        // 1. 清空聊天历史
        chat.history = [];

        // 2. 清空心声历史
        chat.innerVoiceHistory = [];

        // 3. 清空当前心声
        chat.latestInnerVoice = null;

        // 4. 重置角色状态
        chat.status = {
            text: '在线',
            lastUpdate: Date.now(),
            isBusy: false,
        };

        // 5. 重置自动总结计数器
        if (!chat.settings.summary) chat.settings.summary = {};
        chat.settings.summary.lastSummaryIndex = -1;

        await window.db.chats.put(chat);
        if (typeof window.renderChatInterface === 'function') {
            window.renderChatInterface(window.state.activeChatId);
        }
        document.getElementById('branching-modal').classList.remove('visible');

        alert('已重置，新的故事开始了。');
    }
}

// 绑定时间轴/存档功能事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const timelineBtn = document.getElementById('timeline-branch-btn');
    if (timelineBtn) {
        timelineBtn.addEventListener('click', openBranchingModal);
    }

    const modalCloseBtn = document.getElementById('close-branching-modal-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            document.getElementById('branching-modal').classList.remove('visible');
        });
    }

    const createBranchBtn = document.getElementById('create-branch-btn');
    if (createBranchBtn) {
        createBranchBtn.addEventListener('click', createBranchCheckpoint);
    }

    const restartChatBtn = document.getElementById('restart-chat-btn');
    if (restartChatBtn) {
        restartChatBtn.addEventListener('click', restartChatBranch);
    }
});

// ===================================================================
// 塔罗牌占卜功能模块 (Moved from main-app.js)
// ===================================================================

const TAROT_DECK = [
    { name: '愚人', upright: '开始, 天真, 自发性, 自由精神', reversed: '天真, 鲁莽, 承担风险' },
    { name: '魔术师', upright: '显化, 足智多谋, 力量, 灵感行动', reversed: '操纵, 计划不周, 未被利用的天赋' },
    { name: '女祭司', upright: '直觉, 神圣女性, 潜意识, 神秘', reversed: '秘密, 脱离直觉, 压抑的感情' },
    { name: '皇后', upright: '生育, 女性气质, 美丽, 自然, 丰富', reversed: '创造力受阻, 依赖他人' },
    { name: '皇帝', upright: '权威, 父亲形象, 结构, 稳固控制', reversed: '控制欲, 僵化, 缺乏纪律' },
    { name: '教皇', upright: '精神智慧, 宗教信仰, 传统, 制度', reversed: '个人信仰, 挑战传统, 墨守成规' },
    { name: '恋人', upright: '爱, 和谐, 关系, 价值观对齐, 选择', reversed: '不和谐, 失衡, 价值观错位' },
    { name: '战车', upright: '控制, 意志力, 胜利, 断言, 决心', reversed: '缺乏控制和方向, 侵略性' },
    { name: '力量', upright: '力量, 勇气, 同情, 专注, 耐心', reversed: '内在力量, 自我怀疑, 精力不足' },
    { name: '隐士', upright: '灵魂探索, 内省, 孤独, 内在引导', reversed: '孤立, 孤独, 退缩' },
    { name: '命运之轮', upright: '好运, 因果报应, 生命周期, 转折点', reversed: '坏运气, 抵抗改变, 打破循环' },
    { name: '正义', upright: '正义, 公平, 真理, 因果, 法律', reversed: '不公平, 缺乏责任感, 不诚实' },
    { name: '倒吊人', upright: '暂停, 限制, 放手, 牺牲, 新视角', reversed: '拖延, 毫无意义的牺牲, 停滞' },
    { name: '死神', upright: '结束, 改变, 转变, 过渡', reversed: '抵抗改变, 无法前进, 停滞' },
    { name: '节制', upright: '平衡, 适度, 耐心, 目标', reversed: '失衡, 过度, 重新调整' },
    { name: '恶魔', upright: '束缚, 成瘾, 消极, 唯物主义', reversed: '挣脱束缚, 释放, 恢复控制' },
    { name: '高塔', upright: '突变, 剧变, 混乱, 启示, 觉醒', reversed: '避免灾难, 害怕改变' },
    { name: '星星', upright: '希望, 信念, 目标, 更新, 灵性', reversed: '缺乏信念, 绝望, 不专注' },
    { name: '月亮', upright: '幻觉, 恐惧, 焦虑, 潜意识, 直觉', reversed: '释放恐惧, 压抑的情感, 内心困惑' },
    { name: '太阳', upright: '积极, 乐趣, 温暖, 成功, 活力', reversed: '内心幼稚, 过于乐观, 沮丧' },
    { name: '审判', upright: '审判, 重生, 内心召唤, 赦免', reversed: '自我怀疑, 无视召唤' },
    { name: '世界', upright: '完成, 整合, 成就, 旅行', reversed: '寻求个人结束, 走捷径, 拖延' },
    { name: '权杖ACE', upright: '灵感, 新机会, 成长, 潜力', reversed: '缺乏动力, 错过机会, 拖延' },
    { name: '权杖二', upright: '未来规划, 进步, 决策, 离开家', reversed: '恐惧未知, 缺乏规划, 害怕改变' },
    { name: '权杖三', upright: '扩张, 成长, 远见, 海外机会', reversed: '计划受挫, 缺乏远见, 延误' },
    { name: '权杖四', upright: '庆祝, 和谐, 婚姻, 回家, 稳定', reversed: '不和谐, 过渡, 缺乏支持' },
    { name: '权杖五', upright: '冲突, 分歧, 竞争, 紧张', reversed: '冲突避免, 尊重差异' },
    { name: '权杖六', upright: '成功, 公众认可, 胜利, 进步', reversed: '自负, 缺乏认可, 惩罚' },
    { name: '权杖七', upright: '挑战, 竞争, 保护, 坚持', reversed: '放弃, 不知所措, 过度保护' },
    { name: '权杖八', upright: '速度, 行动, 空中旅行, 运动, 快速决策', reversed: '延误, 挫折, 抵制改变' },
    { name: '权杖九', upright: '韧性, 勇气, 坚持, 界限', reversed: '内心挣扎, 偏执, 防御性' },
    { name: '权杖十', upright: '负担, 责任, 努力工作, 压力', reversed: '卸下负担, 委派, 释放' },
    { name: '权杖侍从', upright: '灵感, 想法, 发现, 自由精神', reversed: '不切实际的想法, 拖延, 创造力受阻' },
    { name: '权杖骑士', upright: '能量, 激情, 欲望, 行动, 冒险', reversed: '愤怒, 冲动, 鲁莽' },
    { name: '权杖王后', upright: '勇气, 自信, 独立, 社交蝴蝶', reversed: '自我尊重, 自信, 内向' },
    { name: '权杖国王', upright: '天生的领袖, 远见, 企业家, 荣誉', reversed: '冲动, 仓促, 无情的' },
    { name: '圣杯ACE', upright: '爱, 新关系, 同情, 创造力', reversed: '自我爱, 直觉, 压抑的情感' },
    { name: '圣杯二', upright: '统一的爱, 伙伴关系, 相互吸引', reversed: '分手, 不和谐, 不信任' },
    { name: '圣杯三', upright: '庆祝, 友谊, 创造力, 合作', reversed: "独立, 独处, '三人行'" },
    { name: '圣杯四', upright: '沉思, 断开连接, 冷漠, 重新评估', reversed: '退缩, 孤僻, 错过机会' },
    { name: '圣杯五', upright: '遗憾, 失败, 失望, 悲观主义', reversed: '个人挫折, 自我宽恕, 前进' },
    { name: '圣杯六', upright: '重温过去, 童年记忆, 天真, 喜悦', reversed: '活在过去, 不愿原谅, 缺乏玩乐' },
    { name: '圣杯七', upright: '机会, 选择, 幻想, 幻觉', reversed: '一致性, 幻想, 过多选择' },
    { name: '圣杯八', upright: '失望, 放弃, 退缩, 逃避主义', reversed: '尝试新事物, 冷漠, 恐惧改变' },
    { name: '圣杯九', upright: '满足, 满意, 感激, 愿望成真', reversed: '不满足, 唯物主义, 不满' },
    { name: '圣杯十', upright: '神圣的爱, 和谐关系, 家庭, 一致性', reversed: '脱节, 对齐错误, 挣扎的关系' },
    { name: '圣杯侍从', upright: '创意机会, 直觉信息, 好奇心', reversed: '新的想法, 怀疑, 创造力受阻' },
    { name: '圣杯骑士', upright: '创造力, 浪漫, 魅力, 想象力', reversed: '不切实际, 嫉妒, 情绪波动' },
    { name: '圣杯王后', upright: '富有同情心, 关怀, 直觉, 平静', reversed: '内在感受, 自我照顾, 自爱, 共情' },
    { name: '圣杯国王', upright: '情绪平衡, 同情, 外交', reversed: '自我同情, 内在真理, 情绪不稳定' },
    { name: '宝剑ACE', upright: '突破, 新想法, 头脑清晰, 成功', reversed: '内心清晰, 重新思考一个想法, 混乱' },
    { name: '宝剑二', upright: '艰难的选择, 未知的后果, 僵局', reversed: '优柔寡断, 困惑, 信息过载' },
    { name: '宝剑三', upright: '心碎, 悲伤, 拒绝, 分离', reversed: '释放痛苦, 乐观, 宽恕' },
    { name: '宝剑四', upright: '休息, 放松, 沉思, 恢复', reversed: '精疲力尽, 倦怠, 停滞' },
    { name: '宝剑五', upright: '冲突, 分歧, 竞争, 失败', reversed: '和解, 过去的原谅' },
    { name: '宝剑六', upright: '过渡, 改变, 仪式, 放下', reversed: '个人过渡, 抵抗改变, 未完成的事' },
    { name: '宝剑七', upright: '背叛, 欺骗, 走捷径, 鬼祟', reversed: '冒名顶替综合症, 欺骗, 守秘' },
    { name: '宝剑八', upright: '负面想法, 自我强加的限制, 监禁', reversed: '自我限制的信念, 释放, 思想开放' },
    { name: '宝剑九', upright: '焦虑, 担忧, 恐惧, 抑郁, 噩梦', reversed: '内心挣扎, 深度恐惧, 释放忧虑' },
    { name: '宝剑十', upright: '痛苦的结局, 深度创伤, 背叛, 损失', reversed: '恢复, 抵抗结局, 无法放手' },
    { name: '宝剑侍从', upright: '新想法, 好奇心, 追求真理', reversed: '自言自语, 全能选手, 仓促' },
    { name: '宝剑骑士', upright: '雄心勃勃, 行动导向, 追求目标', reversed: '不安, 冲动, 倦怠' },
    { name: '宝剑王后', upright: '独立的, 无偏见的判断, 清晰的界限', reversed: '过于情绪化, 轻易受影响, 刻薄' },
    { name: '宝剑国王', upright: '精神清晰, 智慧, 权威, 真理', reversed: '安静的力量, 内在真理, 滥用权力' },
    { name: '星币ACE', upright: '显化, 新的财务机会, 繁荣', reversed: '机会丧失, 缺乏规划和远见' },
    { name: '星币二', upright: '多任务, 适应性, 时间管理', reversed: '重新调整优先级, 过度投入' },
    { name: '星币三', upright: '团队合作, 合作, 学习, 实施', reversed: '不和谐, 团队内部冲突, 计划不周' },
    { name: '星币四', upright: '节约, 安全, 保守, 稀缺心态', reversed: '过度消费, 贪婪, 自我保护' },
    { name: '星币五', upright: '财务损失, 贫困, 孤立, 忧虑', reversed: '从财务损失中恢复, 精神贫困' },
    { name: '星币六', upright: '给予, 接受, 分享财富, 慷慨', reversed: '自私, 债务, 单方面给予' },
    { name: '星币七', upright: '长期眼光, 可持续的结果, 投资', reversed: '缺乏长期眼光, 成功受限' },
    { name: '星币八', upright: '学徒, 重复, 掌握, 技能发展', reversed: '自我发展, 完美主义, 部署不当' },
    { name: '星币九', upright: '丰富, 奢华, 自给自足, 财务独立', reversed: '自我价值, 过度投资于工作' },
    { name: '星币十', upright: '财富, 财务安全, 家庭, 遗产', reversed: '财务失败, 负担, 遗产丧失' },
    { name: '星币侍从', upright: '显化, 财务机会, 技能发展', reversed: '缺乏进步, 拖延, 学会新技能' },
    { name: '星币骑士', upright: '努力工作, 生产力, 日常, 保守', reversed: "自我纪律, 无聊, 感觉'卡住'" },
    { name: '星币王后', upright: '养育, 务实, 财务安全, 工作与家庭的平衡', reversed: '财务独立, 自我照顾, 工作与家庭的不平衡' },
    { name: '星币国王', upright: '财富, 商业, 领导力, 安全, 纪律', reversed: '财务不称职, 过时, 固执' },
];

const TAROT_SPREADS = {
    single: { name: '单张牌 - 快速指引', count: 1, positions: ['核心指引'] },
    three_past_present_future: { name: '三张牌 - 过去/现在/未来', count: 3, positions: ['过去', '现在', '未来'] },
    three_situation_challenge_advice: {
        name: '三张牌 - 情境/挑战/建议',
        count: 3,
        positions: ['情境', '挑战', '建议'],
    },
    celtic_cross: {
        name: '凯尔特十字 - 深度分析',
        count: 10,
        positions: ['现状', '挑战', '根基', '过去', '目标', '未来', '自我认知', '外部影响', '希望与恐惧', '最终结果'],
    },
};

let activeTarotReading = null;

if (typeof window !== 'undefined') {
    window.openTarotModal = function () {
        const modal = document.getElementById('tarot-divination-modal');
        if (modal) modal.classList.add('visible');
        const setupView = document.getElementById('tarot-setup-view');
        if (setupView) setupView.style.display = 'block';
        const resultView = document.getElementById('tarot-result-view');
        if (resultView) resultView.style.display = 'none';
        const historyView = document.getElementById('tarot-history-view');
        if (historyView) historyView.style.display = 'none';
        const input = document.getElementById('tarot-question-input');
        if (input) input.value = '';
    }
}

function handleDrawCards() {
    const questionInput = document.getElementById('tarot-question-input');
    const question = questionInput ? questionInput.value.trim() : '';
    const spreadSelect = document.getElementById('tarot-spread-select');
    const spreadType = spreadSelect ? spreadSelect.value : 'single';
    const orientationInput = document.querySelector('input[name="tarot-orientation"]:checked');
    const orientation = orientationInput ? orientationInput.value : 'all_upright';

    if (!question) {
        alert('请输入您的问题或关注点。');
        return;
    }

    const spreadInfo = TAROT_SPREADS[spreadType];
    const deck = [...TAROT_DECK];

    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // 抽牌
    const drawnCardsRaw = deck.slice(0, spreadInfo.count);
    const drawnCards = drawnCardsRaw.map((card, index) => {
        const isReversed = orientation === 'reversed' && Math.random() < 0.5;
        return {
            ...card,
            isReversed: isReversed,
            position: spreadInfo.positions[index],
        };
    });

    activeTarotReading = {
        question: question,
        spread: spreadInfo,
        cards: drawnCards,
        timestamp: Date.now(),
    };

    displayTarotResults(activeTarotReading);
}

function displayTarotResults(reading) {
    const displayEl = document.getElementById('tarot-result-display');
    if (!displayEl) return;
    displayEl.innerHTML = '';

    const questionEl = document.createElement('div');
    questionEl.className = 'tarot-result-question';
    questionEl.textContent = `您的问题是：“${reading.question}”`;
    displayEl.appendChild(questionEl);

    const container = document.createElement('div');
    container.className = 'tarot-spread-container';

    reading.cards.forEach((card) => {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'tarot-card-wrapper';

        cardWrapper.innerHTML = `
                    <div class="tarot-card-position">[${card.position}]</div>
                    <div class="tarot-card-name">${card.name} ${card.isReversed ? '(逆位)' : '(正位)'}</div>
                `;
        container.appendChild(cardWrapper);
    });

    displayEl.appendChild(container);

    document.getElementById('tarot-setup-view').style.display = 'none';
    document.getElementById('tarot-result-view').style.display = 'flex';
}

async function sendTarotReadingToChat() {
    if (!activeTarotReading || (window.state && !window.state.activeChatId)) return;

    // Safety check for state
    if (!window.state || !window.state.chats) return;

    const chat = window.state.chats[window.state.activeChatId];
    if (!chat) return;

    const { proxyUrl, apiKey, model } = window.state.apiConfig || {};

    if (!proxyUrl || !apiKey || !model) {
        alert('请先在API设置中配置好才能触发AI解读哦！');
        return;
    }

    document.getElementById('tarot-divination-modal').classList.remove('visible');
    if (window.showCustomAlert) await window.showCustomAlert('请稍候...', '塔罗师正在为你连接星辰，解读牌面...');

    try {
        const reading = activeTarotReading;

        const cardDetails = reading.cards
            .map((card) => {
                const orientation = card.isReversed ? '逆位' : '正位';
                const meaning = card.isReversed ? card.reversed : card.upright;
                return `- ${card.position}: ${card.name} (${orientation})，象征: ${meaning}`;
            })
            .join('\n');

        const tarotMasterPrompt = `
# 角色
你是一位世界级的塔罗牌解读大师，以深刻的洞察力、清晰的表达和富有同情心的指引而闻名。

# 核心任务
为用户提供一次全面、结构化且易于理解的塔罗牌解读。你的解读必须严格遵循下面的输出结构。

# 输出结构 (必须严格遵守)
你的回答必须包含以下三个部分，并使用Markdown加粗标题来分隔：

1.  **✨ 综合解读 (Overall Interpretation):**
    首先，根据所有牌面的整体感觉，给出一个高度概括的、1-2句话的核心结论或氛围描述。

2.  **🃏 牌面详解 (Card Details):**
    然后，逐一分析每一张牌。对于每一张牌，你必须：
    -   使用格式 \`**[牌位名称] - [牌名] ([正位/逆位])**\` 作为小标题。
    -   详细解释这张牌在这个特定牌位上，是如何回应用户的问题的。
    -   将牌的象征意义与用户的具体情境（问题）紧密结合起来进行分析。

3.  **💡 核心建议 (Key Advice):**
    最后，综合所有牌的信息，为用户提供一个明确、具体、可操作的行动建议或心态指引。

# 指导原则
- **故事性**: 将所有牌的含义编织成一个连贯的叙事，而不是简单地罗列关键词。
- **相关性**: 始终将解读直接与用户提出的具体问题联系起来。
- **清晰易懂**: 避免使用过于神秘或专业的术语。用平实的语言解释复杂的概念。
- **深度而非罗列**: 绝对不要只是重复我提供给你的“象征”关键词。你必须在这些关键词的基础上进行综合、提炼和深化，给出你作为大师的独特见解。

# 占卜信息
- **用户的问题**: "${reading.question}"
- **使用的牌阵**: ${reading.spread.name}
- **抽到的牌及基础含义**:
${cardDetails}

# 最终指令
你的最终输出【只能是】完整的、格式化后的解读文本。不要添加任何“好的，这是你的解读：”之类的对话性开场白。
`;

        const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
        let isGemini = proxyUrl === GEMINI_URL;

        let messagesForApi = [{ role: 'user', content: tarotMasterPrompt }];

        // toGeminiRequestData should be on window, assuming imported
        let geminiConfig;
        if (window.toGeminiRequestData) {
            geminiConfig = window.toGeminiRequestData(model, apiKey, tarotMasterPrompt, messagesForApi, isGemini);
        } else {
            // Fallback if not defined for some reason
            console.error("toGeminiRequestData not found");
            throw new Error("Internal error: toGeminiRequestData missing");
        }

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: messagesForApi,
                    temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) {
            throw new Error(`API请求失败: ${await response.text()}`);
        }

        const data = await response.json();
        const interpretation = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).trim();

        const systemMessageVisible = {
            role: 'system',
            type: 'pat_message',
            content: `🔮 **塔罗牌解读** 🔮\n\n**您的问题**：“${reading.question}”\n\n${interpretation}`,
            timestamp: Date.now(),
        };
        chat.history.push(systemMessageVisible);
        if (window.appendMessage) window.appendMessage(systemMessageVisible, chat);

        const hiddenInstruction = {
            role: 'system',
            content: `[系统指令：刚刚系统为用户进行了一次塔罗牌占卜，解读结果是：“${interpretation}”。现在，请你以角色的身份，和用户一起讨论这个结果。]`,
            timestamp: Date.now() + 1,
            isHidden: true,
        };
        chat.history.push(hiddenInstruction);

        await saveTarotReading(activeTarotReading);
        if (window.db) await window.db.chats.put(chat);
        if (window.renderChatList) window.renderChatList();

        activeTarotReading = null;
    } catch (error) {
        console.error('塔罗牌AI解读失败:', error);
        if (window.showCustomAlert) await window.showCustomAlert('解读失败', `抱歉，连接塔罗师时出现了一点问题：\n\n${error.message}`);
        activeTarotReading = null;
    }
}

async function saveTarotReading(reading) {
    const interpretationText =
        `牌阵: ${reading.spread.name}\n` +
        reading.cards
            .map((card, index) => {
                const orientationText = card.isReversed ? '逆位' : '正位';
                const meaning = card.isReversed ? card.reversed : card.upright;
                return `[${card.position}]: ${card.name} (${orientationText}) - ${meaning}`;
            })
            .join('\n');

    if (window.db) {
        await window.db.tarotReadings.add({
            question: reading.question,
            interpretation: interpretationText,
            timestamp: reading.timestamp,
        });
    }
}

async function openTarotHistory() {
    if (!window.db) return;
    const readings = await window.db.tarotReadings.orderBy('timestamp').reverse().toArray();
    renderTarotHistory(readings);

    const setupView = document.getElementById('tarot-setup-view');
    if (setupView) setupView.style.display = 'none';
    const historyView = document.getElementById('tarot-history-view');
    if (historyView) historyView.style.display = 'flex';
}

function renderTarotHistory(readings) {
    const listEl = document.getElementById('tarot-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (readings.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">还没有占卜历史哦</p>';
        return;
    }
    readings.forEach((reading) => {
        const item = document.createElement('div');
        item.className = 'tarot-history-item';
        item.innerHTML = `
                    <div class="question">${reading.question}</div>
                    <div class="details">${new Date(reading.timestamp).toLocaleString()}</div>
                    <button class="tarot-history-delete-btn" data-id="${reading.id}">×</button>
                `;
        listEl.appendChild(item);
    });
}

async function deleteTarotReading(readingId) {
    let confirmed = false;
    if (window.showCustomConfirm) {
        confirmed = await window.showCustomConfirm('确认删除', '确定要删除这条占卜历史吗？', {
            confirmButtonClass: 'btn-danger',
        });
    } else {
        confirmed = confirm('确定要删除这条占卜历史吗？');
    }

    if (confirmed && window.db) {
        await window.db.tarotReadings.delete(readingId);
        openTarotHistory();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 绑定事件
    const openBtn = document.getElementById('open-tarot-btn');
    if (openBtn) openBtn.addEventListener('click', () => {
        if (typeof window.openTarotModal === 'function') {
            window.openTarotModal();
        } else {
            console.error('openTarotModal not found');
        }
    });

    const closeBtn = document.getElementById('close-tarot-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('tarot-divination-modal');
        if (modal) modal.classList.remove('visible');
    });

    const drawBtn = document.getElementById('draw-tarot-cards-btn');
    if (drawBtn) drawBtn.addEventListener('click', handleDrawCards);

    const backToSetupBtn = document.getElementById('back-to-tarot-setup-btn');
    if (backToSetupBtn) backToSetupBtn.addEventListener('click', () => {
        const resultView = document.getElementById('tarot-result-view');
        const setupView = document.getElementById('tarot-setup-view');
        if (resultView) resultView.style.display = 'none';
        if (setupView) setupView.style.display = 'block';
    });

    const sendBtn = document.getElementById('send-tarot-result-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendTarotReadingToChat);

    const historyBtn = document.getElementById('tarot-history-btn');
    if (historyBtn) historyBtn.addEventListener('click', openTarotHistory);

    const backToMainBtn = document.getElementById('back-to-tarot-main-btn');
    if (backToMainBtn) backToMainBtn.addEventListener('click', () => {
        const historyView = document.getElementById('tarot-history-view');
        const setupView = document.getElementById('tarot-setup-view');
        if (historyView) historyView.style.display = 'none';
        if (setupView) setupView.style.display = 'block';
    });

    const historyList = document.getElementById('tarot-history-list');
    if (historyList) historyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('tarot-history-delete-btn')) {
            const readingId = parseInt(e.target.dataset.id);
            if (!isNaN(readingId)) {
                deleteTarotReading(readingId);
            }
        }
    });
});


// ===================================================================
// Pet Functions (Moved from main-app.js)
// ===================================================================

// 宠物数值衰减相关的全局变量和常量
const PET_DECAY_INTERVAL = 60 * 60 * 1000; // 每60分钟衰减一次
const PET_DECAY_AMOUNT = {
    hunger: 10, // 每次饱食度 -10
    happiness: 5, // 每次心情 -5
};

let petDecayTimer = null; // 用于管理衰减计时器的全局变量
let currentPetData = null; // 用于暂存正在编辑的宠物数据
let isPetDragging = false; // 标记是否正在拖动宠物
let petDragOffset = { x: 0, y: 0 };

/**
 * 确保聊天对象的宠物设置已初始化 (Moved from main-app.js)
 * @param {object} chat - 聊天对象
 */
window.ensurePetSettings = function (chat) {
    // 1. 为所有角色（包括新旧数据）确保有 petAdopted 标志
    if (!chat.isGroup && typeof chat.settings.petAdopted === 'undefined') {
        // 如果 pet 对象已存在，说明是老用户，默认已领养
        if (chat.settings.pet && chat.settings.pet.type !== '无') {
            chat.settings.petAdopted = true;
        } else {
            // 如果没有 pet 对象，说明是新用户或之前就没用宠物，默认未领养
            chat.settings.petAdopted = false;
        }
        console.log(`为角色 "${chat.name}" 初始化了宠物领养状态: ${chat.settings.petAdopted}`);
    }

    // 2. 兼容旧的 pet 对象，确保新字段存在
    if (!chat.isGroup && chat.settings.pet) {
        if (typeof chat.settings.pet.persona === 'undefined') {
            chat.settings.pet.persona = '一只可爱的小宠物，对世界充满好奇。';
        }
        if (!chat.settings.pet.petChatHistory) {
            chat.settings.pet.petChatHistory = [];
        }
        if (!chat.settings.pet.status) {
            chat.settings.pet.status = {
                hunger: 100,
                happiness: 100,
                intimacyToUser: 50,
                intimacyToChar: 50,
                lastUpdated: Date.now(),
            };
        } else {
            if (typeof chat.settings.pet.status.intimacyToUser === 'undefined') chat.settings.pet.status.intimacyToUser = 50;
            if (typeof chat.settings.pet.status.intimacyToChar === 'undefined') chat.settings.pet.status.intimacyToChar = 50;
            if (typeof chat.settings.pet.status.lastUpdated === 'undefined') chat.settings.pet.status.lastUpdated = Date.now();
        }
    }
}


/**
 * 打开宠物主面板（设置与互动）
 */
window.openPetModal = async function () {
    if (!window.state.activeChatId || window.state.chats[window.state.activeChatId].isGroup) {
        alert('只有在单人聊天中才能养宠物哦！');
        return;
    }
    const chat = window.state.chats[window.state.activeChatId];

    // 核心判断：检查是否已领养
    if (!chat.settings.petAdopted) {
        // 如果未领养，弹出确认框
        const confirmed = await window.showCustomConfirm('领养新宠物', `你还没有为“${chat.name}”领养宠物，要现在开启宠物系统吗？`, { confirmText: '现在领养' });

        if (confirmed) {
            // 用户同意领养
            chat.settings.petAdopted = true;
            // 创建一个全新的默认宠物对象
            chat.settings.pet = {
                type: '无',
                name: '',
                image: '🥚',
                persona: '一只可爱的小宠物，对世界充满好奇。',
                petChatHistory: [],
                isCustomImage: false,
                display: { show: false, size: 100, top: '80%', left: '50%' },
                status: {
                    hunger: 100,
                    happiness: 100,
                    intimacyToUser: 50,
                    intimacyToChar: 50,
                    lastUpdated: Date.now(),
                },
            };
            if (window.db && window.db.chats) await window.db.chats.put(chat);
            alert(`恭喜！你已成功为“${chat.name}”开启宠物系统！现在来为它设置一下吧。`);
            // 领养成功后，再次调用本函数，这次会直接进入设置界面
            window.openPetModal();
        }
        // 如果用户取消，则什么也不做
        return;
    }

    // --- 如果已经领养，则执行原来的显示逻辑 ---
    currentPetData = JSON.parse(JSON.stringify(chat.settings.pet));

    const petTypeInput = document.getElementById('pet-type-input');
    if (petTypeInput) petTypeInput.value = currentPetData.type === '无' ? '' : currentPetData.type;

    const petNameInput = document.getElementById('pet-name-input');
    if (petNameInput) petNameInput.value = currentPetData.name;

    const petImageInput = document.getElementById('pet-image-input');
    if (petImageInput) petImageInput.value = currentPetData.image;

    const petDisplayToggle = document.getElementById('pet-display-toggle');
    if (petDisplayToggle) petDisplayToggle.checked = currentPetData.display.show;

    const petSizeSlider = document.getElementById('pet-size-slider');
    if (petSizeSlider) petSizeSlider.value = currentPetData.display.size;

    const petSizeValue = document.getElementById('pet-size-value');
    if (petSizeValue) petSizeValue.textContent = `${currentPetData.display.size}px`;

    const petPersonaInput = document.getElementById('pet-persona-input');
    if (petPersonaInput) petPersonaInput.value = currentPetData.persona || '';

    updatePetPreview();

    const petStatsArea = document.getElementById('pet-stats-area');
    if (currentPetData.type !== '无') {
        if (petStatsArea) petStatsArea.style.display = 'flex';
        updatePetStatusUI(currentPetData);
    } else {
        if (petStatsArea) petStatsArea.style.display = 'none';
    }

    const positionControls = document.getElementById('pet-position-controls');
    if (positionControls) positionControls.style.display = currentPetData.display.show ? 'block' : 'none';

    const petModal = document.getElementById('pet-modal');
    if (petModal) petModal.classList.add('visible');
}

/**
 * 计算并应用宠物的数值衰减
 * @param {object} pet - 宠物对象
 * @returns {boolean} - 如果数值发生了变化，返回 true
 */
function applyPetDecay(pet) {
    if (!pet || !pet.status) return false;

    const now = Date.now();
    const lastUpdated = pet.status.lastUpdated || now;
    const timeElapsed = now - lastUpdated;

    // 计算过去了多少个衰减周期
    const intervalsPassed = Math.floor(timeElapsed / PET_DECAY_INTERVAL);

    if (intervalsPassed > 0) {
        // 计算总共要衰减多少
        const totalHungerDecay = intervalsPassed * PET_DECAY_AMOUNT.hunger;
        const totalHappinessDecay = intervalsPassed * PET_DECAY_AMOUNT.happiness;

        // 应用衰减，确保不低于0
        pet.status.hunger = Math.max(0, pet.status.hunger - totalHungerDecay);
        pet.status.happiness = Math.max(0, pet.status.happiness - totalHappinessDecay);

        // 更新最后更新时间，只加上已经计算过的周期的时间，避免丢失零头时间
        pet.status.lastUpdated = lastUpdated + intervalsPassed * PET_DECAY_INTERVAL;

        console.log(`宠物"${pet.name}"数值衰减: ${intervalsPassed}个周期, 饱食度-${totalHungerDecay}, 心情-${totalHappinessDecay}`);
        return true; // 数值已改变
    }

    return false; // 数值未改变
}

/**
 * 停止当前的宠物衰减计时器
 */
window.stopPetDecayTimer = function () {
    if (petDecayTimer) {
        clearInterval(petDecayTimer);
        petDecayTimer = null;
    }
}

/**
 * 为当前聊天中的宠物启动衰减计时器
 */
window.startPetDecayTimer = function () {
    window.stopPetDecayTimer(); // 先确保停止任何旧的计时器

    const chat = window.state.chats[window.state.activeChatId];
    if (!chat || !chat.settings.pet || chat.settings.pet.type === '无') {
        return; // 如果当前聊天没有宠物，则不启动
    }

    // 使用 setInterval 定期检查并应用衰减
    petDecayTimer = setInterval(async () => {
        const currentChat = window.state.chats[window.state.activeChatId];
        if (!currentChat) {
            // 安全检查，如果聊天已关闭则停止计时器
            window.stopPetDecayTimer();
            return;
        }
        const pet = currentChat.settings.pet;

        if (applyPetDecay(pet)) {
            // 如果数值变化了，更新UI并保存到数据库
            // 只有当宠物面板打开时才需要更新UI
            if (document.getElementById('pet-modal') && document.getElementById('pet-modal').classList.contains('visible')) {
                updatePetStatusUI(pet);
            }
            if (window.db && window.db.chats) await window.db.chats.put(currentChat);
        }
    }, 60 * 1000); // 每分钟检查一次，是否到达了衰减周期
}

/**
 * 更新宠物数值面板的UI显示
 * @param {object} petData - 宠物的数据对象
 */
function updatePetStatusUI(petData) {
    const hunger = petData.status.hunger || 0;
    const happiness = petData.status.happiness || 0;
    // ★★★ 新增：获取亲密度数值 ★★★
    const intimacyToUser = petData.status.intimacyToUser || 0;
    const intimacyToChar = petData.status.intimacyToChar || 0;

    const hungerFill = document.querySelector('#pet-hunger-bar .stat-bar-fill');
    const happinessFill = document.querySelector('#pet-happiness-bar .stat-bar-fill');
    // ★★★ 新增：获取亲密度进度条元素 ★★★
    const intimacyUserFill = document.querySelector('#pet-intimacy-user-bar .stat-bar-fill');
    const intimacyCharFill = document.querySelector('#pet-intimacy-char-bar .stat-bar-fill');

    if (hungerFill) {
        hungerFill.style.width = `${hunger}%`;
        hungerFill.textContent = `${hunger}%`;
    }
    if (happinessFill) {
        happinessFill.style.width = `${happiness}%`;
        happinessFill.textContent = `${happiness}%`;
    }
    // ★★★ 新增：渲染亲密度进度条 ★★★
    if (intimacyUserFill) {
        intimacyUserFill.style.width = `${intimacyToUser}%`;
        intimacyUserFill.textContent = `${intimacyToUser}%`;
    }
    if (intimacyCharFill) {
        intimacyCharFill.style.width = `${intimacyToChar}%`;
        intimacyCharFill.textContent = `${intimacyToChar}%`;
    }
}

/**
 * 在弹窗中更新宠物的预览
 */
function updatePetPreview() {
    const previewDisplay = document.getElementById('pet-preview-display');
    const nameEl = document.getElementById('pet-preview-name');
    const typeEl = document.getElementById('pet-preview-type');

    if (!previewDisplay) return;

    const imageInput = document.getElementById('pet-image-input').value.trim();

    if (imageInput.startsWith('http') || imageInput.startsWith('data:image')) {
        previewDisplay.innerHTML = `<img src="${imageInput}" style="width: 60px; height: 60px; object-fit: contain;">`;
    } else {
        previewDisplay.textContent = imageInput || '🥚';
    }

    if (nameEl) nameEl.textContent = document.getElementById('pet-name-input').value.trim() || '(未命名)';
    if (typeEl) typeEl.textContent = document.getElementById('pet-type-input').value.trim() || '物种';
}

/**
 * 保存宠物设置
 */
async function savePetSettings() {
    const chat = window.state.chats[window.state.activeChatId];

    // 从UI读取数据
    const type = document.getElementById('pet-type-input').value.trim() || '无';
    const name = document.getElementById('pet-name-input').value.trim();
    const image = document.getElementById('pet-image-input').value.trim() || '🥚';

    const newPetSettings = {
        ...currentPetData, // 保留如位置等未在主面板修改的属性
        type: type,
        name: name,
        image: image,
        persona: document.getElementById('pet-persona-input').value.trim(),
        isCustomImage: image.startsWith('http') || image.startsWith('data:image'),
        display: {
            ...currentPetData.display,
            show: document.getElementById('pet-display-toggle').checked,
            size: parseInt(document.getElementById('pet-size-slider').value),
        },
    };

    // 更新到 state 和数据库
    chat.settings.pet = newPetSettings;
    if (window.db && window.db.chats) await window.db.chats.put(chat);

    // 刷新聊天界面上的宠物
    window.renderChatPet();

    document.getElementById('pet-modal').classList.remove('visible');
    currentPetData = null; // 清理临时数据
    alert('宠物信息已保存！');
}

/**
 * 在聊天界面上渲染宠物
 */
window.renderChatPet = function () {
    if (!window.state || !window.state.activeChatId) return;
    const chat = window.state.chats[window.state.activeChatId];
    const petContainer = document.getElementById('chat-pet-container');
    const petEl = document.getElementById('chat-pet');

    if (!chat || chat.isGroup || !chat.settings.petAdopted || !chat.settings.pet || !chat.settings.pet.display.show) {
        if (petEl) petEl.style.display = 'none';
        return;
    }

    const pet = chat.settings.pet;
    if (petEl) {
        petEl.style.display = 'block';

        if (pet.isCustomImage) {
            petEl.innerHTML = `<img src="${pet.image}" alt="${pet.name}">`;
        } else {
            petEl.innerHTML = pet.image;
        }

        // 应用样式
        petEl.style.fontSize = `${pet.display.size}px`;
        petEl.style.width = `${pet.display.size}px`;
        petEl.style.height = `${pet.display.size}px`;
        petEl.style.top = pet.display.top;
        petEl.style.left = pet.display.left;
    }
}

/**
 * 处理用户与宠物的互动
 * @param {string} action - 互动类型, e.g., 'feed', 'play'
 */
async function handlePetInteraction(action) {
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat || !chat.settings.petAdopted || !chat.settings.pet || chat.settings.pet.type === '无') {
        alert('你还没有宠物，或者还没有给它设定种类哦！');
        return;
    }

    const pet = chat.settings.pet;
    let actionText = '';
    const myNickname = chat.settings.myNickname || '我';

    switch (action) {
        case 'feed':
            pet.status.hunger = Math.min(100, pet.status.hunger + 20);
            pet.status.happiness = Math.min(100, pet.status.happiness + 5);
            pet.status.intimacyToUser = Math.min(100, pet.status.intimacyToUser + 10);
            actionText = `${myNickname} 喂了 ${pet.name} 一些食物。`;
            break;
        case 'play':
            pet.status.hunger = Math.max(0, pet.status.hunger - 10);
            pet.status.happiness = Math.min(100, pet.status.happiness + 15);
            pet.status.intimacyToUser = Math.min(100, pet.status.intimacyToUser + 15);
            actionText = `${myNickname} 陪 ${pet.name} 玩了一会儿。`;
            break;
        case 'touch':
            pet.status.happiness = Math.min(100, pet.status.happiness + 10);
            pet.status.intimacyToUser = Math.min(100, pet.status.intimacyToUser + 5);
            actionText = `${myNickname} 轻轻地抚摸了 ${pet.name}。`;
            break;
        case 'chat':
            openPetChat();
            return;
    }

    updatePetStatusUI(pet);
    chat.settings.pet = pet;

    // 创建对用户【可见】的系统消息
    const visibleMessage = {
        role: 'system',
        type: 'pat_message',
        content: `[系统：${actionText}]`,
        timestamp: Date.now(),
    };
    chat.history.push(visibleMessage);

    // 创建给AI看的【隐藏】指令
    const hiddenMessageForAI = {
        role: 'system',
        content: `[系统提示：用户刚刚和宠物“${pet.name}”进行了互动：${actionText}。]`,
        timestamp: Date.now() + 1, // 确保时间戳在后
        isHidden: true,
    };
    chat.history.push(hiddenMessageForAI);

    if (window.db && window.db.chats) await window.db.chats.put(chat);

    if (document.getElementById('chat-interface-screen').classList.contains('active')) {
        if (window.appendMessage) window.appendMessage(visibleMessage, chat);
    }

    document.getElementById('pet-modal').classList.remove('visible');
}

/**
 * 打开宠物聊天模态框
 */
function openPetChat() {
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat || !chat.settings.pet || chat.settings.pet.type === '无') {
        alert('先给你的宠物起个名字和种类吧！');
        return;
    }

    // 关闭主设置面板，打开聊天面板
    document.getElementById('pet-modal').classList.remove('visible');
    const chatModal = document.getElementById('pet-chat-modal');
    document.getElementById('pet-chat-title').textContent = `和“${chat.settings.pet.name}”的对话`;
    document.getElementById('pet-chat-input').value = '';

    renderPetChatHistory(); // 渲染历史记录
    chatModal.classList.add('visible');
}

/**
 * 渲染宠物的聊天记录
 */
function renderPetChatHistory() {
    const chat = window.state.chats[window.state.activeChatId];
    const pet = chat.settings.pet;
    const messagesEl = document.getElementById('pet-chat-messages');
    messagesEl.innerHTML = '';

    if (!pet.petChatHistory || pet.petChatHistory.length === 0) {
        messagesEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary);">试着和它打个招呼吧！</p>`;
        return;
    }

    // 获取用户头像
    const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg'; // fallback
    const myAvatar = chat.settings.myAvatar || defaultAvatar;

    pet.petChatHistory.forEach((msg) => {
        const wrapper = document.createElement('div');

        wrapper.className = `message-wrapper ${msg.sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        let avatarSrc = '';
        let avatarHtml = '';

        if (msg.sender === 'user') {
            // 如果是用户发的，使用用户头像
            avatarSrc = myAvatar;
            avatarHtml = `<img src="${avatarSrc}" class="avatar">`;
        } else if (msg.sender === 'char') {
            // 如果是角色(char)发的，就使用角色的头像
            avatarSrc = chat.settings.aiAvatar || defaultAvatar;
            avatarHtml = `<img src="${avatarSrc}" class="avatar">`;
        } else {
            // 剩下的情况就是宠物(pet)自己发的
            avatarSrc = pet.isCustomImage ? pet.image : null;
            if (avatarSrc) {
                // 如果是图片，显示图片
                avatarHtml = `<img src="${avatarSrc}" class="avatar">`;
            } else {
                // 如果是Emoji，直接显示Emoji
                avatarHtml = `<div class="avatar" style="font-size: 28px; text-align: center;">${pet.image}</div>`;
            }
        }

        bubble.innerHTML = `
                    ${avatarHtml}
                    <div class="content">${msg.content.replace(/\n/g, '<br>')}</div>
                `;
        wrapper.appendChild(bubble);
        messagesEl.appendChild(wrapper);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * 处理用户在宠物聊天框中发送消息
 */
async function handleSendToPet() {
    const chat = window.state.chats[window.state.activeChatId];
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
    if (document.getElementById('chat-interface-screen').classList.contains('active') && window.state.activeChatId === chat.id) {
        if (window.appendMessage) window.appendMessage(visibleMessage, chat);
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

    if (window.db && window.db.chats) await window.db.chats.put(chat);
}

/**
 * 为宠物获取API回复
 * @param {object} pet - 宠物对象
 * @returns {Promise<string|null>} - AI生成的宠物回复文本
 */
async function getPetApiResponse(pet) {
    const { proxyUrl, apiKey, model } = window.state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
        alert('请先配置API！');
        return '（我好像断线了...）';
    }

    // 重构对话历史的生成逻辑
    const historyForPet = pet.petChatHistory
        .slice(-6)
        .map((msg) => {
            let senderName;
            if (msg.sender === 'user') {
                senderName = '主人';
            } else if (msg.sender === 'char') {
                senderName = msg.senderName; // 正确获取Char的名字
            } else {
                // 'pet'
                senderName = pet.name;
            }
            return `${senderName}: ${msg.content}`;
        })
        .join('\n');

    const systemPrompt = `你现在正在扮演一只宠物。
        # 你的核心设定
        - 你的种类: ${pet.type}
        - 你的名字: ${pet.name}
        - 你的性格和背景故事: ${pet.persona}

        # 核心规则
        1. 你【必须】完全代入你的角色设定进行回复。
        2. 你的回复应该是简短、可爱的，符合一只宠物的说话方式（例如，使用拟声词、简单的词汇）。
        3. 你的回复【只能是纯文本】，不要包含任何JSON或特殊格式。

        # 最近的对话
        ${historyForPet}

        现在，请根据上面的对话，继续你的回应。`;

    try {
        const messagesForApi = [{ role: 'user', content: '请根据你在系统指令中读到的规则，立即开始你的行动。' }];
        const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
        let isGemini = proxyUrl === GEMINI_API_URL;

        // Ensure toGeminiRequestData is available
        let geminiConfig;
        if (window.toGeminiRequestData) {
            geminiConfig = window.toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini, window.state.apiConfig.temperature);
        } else {
            // Fallback minimal implementation if missing
            geminiConfig = { url: '', data: {} };
        }

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'system', content: systemPrompt }, ...messagesForApi],
                    temperature: parseFloat(window.state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).trim();
    } catch (error) {
        console.error('获取宠物回复失败:', error);
        return '（呜...我好像说不出话了...）';
    }
}

/**
 * 初始化宠物的拖拽功能
 */
function initPetDragging() {
    const petEl = document.getElementById('chat-pet');
    const container = document.getElementById('chat-pet-container');

    const onDragStart = (e) => {
        if (!petEl.style.display || petEl.style.display === 'none') return;
        e.preventDefault();
        isPetDragging = true;

        const rect = petEl.getBoundingClientRect();
        const coords = getEventCoords(e);

        petDragOffset.x = coords.x - rect.left;
        petDragOffset.y = coords.y - rect.top;

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e) => {
        if (!isPetDragging) return;
        e.preventDefault();

        const containerRect = container.getBoundingClientRect();
        const coords = getEventCoords(e);

        let newLeft = coords.x - petDragOffset.x - containerRect.left;
        let newTop = coords.y - petDragOffset.y - containerRect.top;

        // 边界检测
        newLeft = Math.max(0, Math.min(newLeft, container.clientWidth - petEl.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, container.clientHeight - petEl.offsetHeight));

        // 用百分比存储，以适应不同屏幕尺寸
        petEl.style.left = `${(newLeft / container.clientWidth) * 100}%`;
        petEl.style.top = `${(newTop / container.clientHeight) * 100}%`;
    };

    const onDragEnd = async () => {
        if (!isPetDragging) return;
        isPetDragging = false;

        // 拖动结束后，保存新的位置
        const chat = window.state.chats[window.state.activeChatId];
        if (chat && chat.settings.pet) {
            chat.settings.pet.display.top = petEl.style.top;
            chat.settings.pet.display.left = petEl.style.left;
            if (window.db && window.db.chats) await window.db.chats.put(chat);
        }

        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
    };

    if (petEl) {
        petEl.addEventListener('mousedown', onDragStart);
        petEl.addEventListener('touchstart', onDragStart, { passive: true });
    }

    // Helper needed for dragging if not global
    function getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
}


function initPetFunctions() {
    console.log('Initializing Pet Functions...');

    // 1. 绑定输入框上方的宠物图标按钮
    const petActionBtn = document.getElementById('pet-action-btn');
    if (petActionBtn) petActionBtn.addEventListener('click', window.openPetModal);

    // 2. 绑定宠物弹窗内的各种按钮
    const petModalCancelBtn = document.getElementById('pet-modal-cancel-btn');
    if (petModalCancelBtn) petModalCancelBtn.addEventListener('click', () => {
        document.getElementById('pet-modal').classList.remove('visible');
        currentPetData = null; // 取消时也要清理
    });

    const petModalSaveBtn = document.getElementById('pet-modal-save-btn');
    if (petModalSaveBtn) petModalSaveBtn.addEventListener('click', savePetSettings);

    // 3. 实时更新预览
    const petTypeInput = document.getElementById('pet-type-input');
    if (petTypeInput) petTypeInput.addEventListener('input', updatePetPreview);

    const petNameInput = document.getElementById('pet-name-input');
    if (petNameInput) petNameInput.addEventListener('input', updatePetPreview);

    const petImageInput = document.getElementById('pet-image-input');
    if (petImageInput) petImageInput.addEventListener('input', updatePetPreview);

    // 4. “在聊天界面显示”开关的交互
    const petDisplayToggle = document.getElementById('pet-display-toggle');
    if (petDisplayToggle) petDisplayToggle.addEventListener('change', (e) => {
        document.getElementById('pet-position-controls').style.display = e.target.checked ? 'block' : 'none';
    });

    // 5. 尺寸滑块的交互
    const sizeSlider = document.getElementById('pet-size-slider');
    if (sizeSlider) sizeSlider.addEventListener('input', () => {
        document.getElementById('pet-size-value').textContent = `${sizeSlider.value}px`;
    });

    // 6. 绑定更换自定义图片的点击事件
    const petPreviewDisplay = document.getElementById('pet-preview-display');
    if (petPreviewDisplay) petPreviewDisplay.addEventListener('click', () => {
        document.getElementById('pet-custom-image-input').click();
    });

    const petCustomImageInput = document.getElementById('pet-custom-image-input');
    if (petCustomImageInput) petCustomImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // 将图片的Base64链接直接填入输入框
                document.getElementById('pet-image-input').value = event.target.result;
                updatePetPreview(); // 并更新预览
            };
            reader.readAsDataURL(file);
        }
    });

    // 7. 绑定互动按钮 (使用事件委托)
    const petInteractionArea = document.getElementById('pet-interaction-area');
    if (petInteractionArea) petInteractionArea.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.action) {
            handlePetInteraction(e.target.dataset.action);
        }
    });

    // 8. 初始化宠物的拖动功能
    initPetDragging();

    // 宠物聊天功能事件绑定
    const sendToPetBtn = document.getElementById('send-to-pet-btn');
    if (sendToPetBtn) sendToPetBtn.addEventListener('click', handleSendToPet);

    const petChatInput = document.getElementById('pet-chat-input');
    if (petChatInput) petChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (sendToPetBtn) sendToPetBtn.click();
        }
    });

    // 为宠物聊天窗口的“外部”点击添加关闭功能
    const petChatModal = document.getElementById('pet-chat-modal');
    if (petChatModal) {
        petChatModal.addEventListener('click', (e) => {
            if (e.target === petChatModal) {
                // 只有点击灰色遮罩层才关闭
                petChatModal.classList.remove('visible');
            }
        });
    }

    // 为“放生宠物”按钮绑定事件
    const abandonBtn = document.getElementById('pet-abandon-btn');
    if (abandonBtn) {
        abandonBtn.addEventListener('click', async () => {
            if (!window.state.activeChatId) return;

            const confirmed = await window.showCustomConfirm('确认放生', '确定要关闭宠物系统吗？这将会重置所有宠物数据（数值、聊天记录等），但不会删除你的设置。你可以随时重新领养。', { confirmButtonClass: 'btn-danger' });

            if (confirmed) {
                const chat = window.state.chats[window.state.activeChatId];
                chat.settings.petAdopted = false; // 关闭领养状态
                delete chat.settings.pet; // 删除宠物数据对象

                if (window.db && window.db.chats) await window.db.chats.put(chat);

                window.renderChatPet(); // 从聊天界面移除宠物
                const modal = document.getElementById('pet-modal');
                if (modal) modal.classList.remove('visible'); // 关闭弹窗
                alert('宠物已放生，江湖再见！');
            }
        });
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', initPetFunctions);

// ===================================================================
// 漫游共赏 / 极光模式 (Aurora) 功能
// ===================================================================

let auroraState = {
    active: false, // 是否开启
    mode: 'video', // 'video' 或 'text'
    title: '', // 作品名称 (例如 "泰坦尼克号")
    subtitles: [], // 字幕数组 [{start, end, text}]
    textContent: '', // 小说全文
    lastSyncTime: 0, // 上次同步时间，防止过于频繁
    currentBookId: null, // 当前阅读的书籍ID
    currentSegmentText: '' // 当前阅读片段
};

/**
 * 打开漫游设置弹窗
 */
function openAuroraSetupModal() {
    // 1. 清空文本输入
    const titleInput = document.getElementById('aurora-title-input');
    if (titleInput) titleInput.value = '';

    // 2. 清空所有输入框 (包括新加的URL框)
    const idsToClear = ['aurora-video-file', 'aurora-sub-file-video', 'aurora-sub-url-video', 'aurora-text-file', 'aurora-text-url', 'aurora-custom-img', 'aurora-custom-audio', 'aurora-sub-file-custom', 'aurora-sub-url-custom'];

    idsToClear.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // 3. 默认选中视频模式
    const videoRadio = document.querySelector('input[name="aurora-mode"][value="video"]');
    if (videoRadio) videoRadio.checked = true;

    // 4. 切换显示状态
    toggleAuroraInputs();

    // 5. 显示弹窗
    document.getElementById('aurora-setup-modal').classList.add('visible');
}

/**
 * 切换弹窗内的输入显示
 */
function toggleAuroraInputs() {
    const mode = document.querySelector('input[name="aurora-mode"]:checked').value;

    document.getElementById('aurora-video-inputs').style.display = 'none';
    document.getElementById('aurora-text-inputs').style.display = 'none';
    document.getElementById('aurora-custom-inputs').style.display = 'none';

    if (mode === 'video') {
        document.getElementById('aurora-video-inputs').style.display = 'block';
    } else if (mode === 'text') {
        document.getElementById('aurora-text-inputs').style.display = 'block';
    } else if (mode === 'custom') {
        document.getElementById('aurora-custom-inputs').style.display = 'block';
    }
}
/**
 * 确认设置，启动漫游播放器
 * (已支持 URL 导入字幕和TXT)
 */
async function confirmAuroraSetup() {
    const title = document.getElementById('aurora-title-input').value.trim();
    const mode = document.querySelector('input[name="aurora-mode"]:checked').value;

    if (!title) {
        alert('给这次漫游起个名字吧！');
        return;
    }

    // 更新状态
    auroraState = {
        active: true,
        mode: mode,
        title: title,
        subtitles: [],
        textContent: '',
        lastSyncTime: 0,
        currentBookId: null,
        currentSegmentText: ''
    };

    const playerOverlay = document.getElementById('aurora-player-overlay');
    const videoEl = document.getElementById('aurora-video-element');
    const textViewer = document.getElementById('aurora-text-viewer');
    const customViewer = document.getElementById('aurora-custom-viewer');
    const customAudio = document.getElementById('aurora-custom-audio-element');
    const customImg = document.getElementById('aurora-custom-bg-img');

    const statusTitle = document.getElementById('aurora-playing-title');
    const statusInfo = document.getElementById('aurora-info-status');

    // 关闭设置弹窗
    document.getElementById('aurora-setup-modal').classList.remove('visible');

    // 显示播放器
    playerOverlay.style.display = 'flex';
    statusTitle.textContent = `正在漫游:《${title}》`;

    videoEl.style.display = 'none';
    textViewer.style.display = 'none';
    customViewer.style.display = 'none';
    document.getElementById('aurora-save-book-btn').style.display = 'none';
    videoEl.pause();
    customAudio.pause();

    // --- 辅助函数：处理字幕内容 ---
    const handleSubtitleContent = (content) => {
        auroraState.subtitles = parseSRT(content);
        statusInfo.textContent = `字幕已加载`;
        // 如果是视频模式，挂载VTT轨道
        if (mode === 'video') {
            const vttContent = 'WEBVTT\n\n' + content.replace(/,/g, '.');
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'Chinese';
            track.srclang = 'zh';
            track.default = true;
            track.src = URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' }));
            videoEl.innerHTML = '';
            videoEl.appendChild(track);
        }
    };

    if (mode === 'video') {
        const videoFile = document.getElementById('aurora-video-file').files[0];
        const subFile = document.getElementById('aurora-sub-file-video').files[0];
        const subUrl = document.getElementById('aurora-sub-url-video').value.trim();

        if (!videoFile) {
            alert('请选择视频文件！');
            return;
        }

        videoEl.style.display = 'block';
        videoEl.src = URL.createObjectURL(videoFile);

        // 初始不显示控件，点击视频切换显示/隐藏
        videoEl.removeAttribute('controls');
        videoEl.onclick = () => {
            if (videoEl.hasAttribute('controls')) {
                videoEl.removeAttribute('controls');
            } else {
                videoEl.setAttribute('controls', 'controls');
            }
        };

        // 处理字幕 (文件优先，其次URL)
        if (subFile) {
            const reader = new FileReader();
            reader.onload = (e) => handleSubtitleContent(e.target.result);
            reader.readAsText(subFile);
        } else if (subUrl) {
            statusInfo.textContent = '正在下载字幕...';
            fetch(subUrl)
                .then((r) => r.text())
                .then((txt) => handleSubtitleContent(txt))
                .catch(() => (statusInfo.textContent = '字幕下载失败'));
        } else {
            statusInfo.textContent = '无字幕';
        }
    } else if (mode === 'text') {
        const textFile = document.getElementById('aurora-text-file').files[0];
        const textUrl = document.getElementById('aurora-text-url').value.trim();

        if (!textFile && !textUrl) {
            alert('请选择文本文件或输入链接！');
            return;
        }
        document.getElementById('aurora-save-book-btn').style.display = 'inline-block';
        textViewer.style.display = 'block';

        // --- 辅助函数：处理文本Buffer (解码GBK/UTF8) ---
        const processTextBuffer = (buffer) => {
            let text = '';
            try {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                text = decoder.decode(buffer);
            } catch (error) {
                console.log('检测到非UTF-8编码，尝试使用 GB18030 (兼容GBK/ANSI) 解码...');
                try {
                    const decoder = new TextDecoder('gb18030');
                    text = decoder.decode(buffer);
                } catch (err2) {
                    alert('抱歉，无法识别该文件的编码格式。');
                    return;
                }
            }
            auroraState.textContent = text;
            document.getElementById('aurora-text-body').textContent = auroraState.textContent;
            const statusInfo = document.getElementById('aurora-info-status');
            if (statusInfo) statusInfo.textContent = `文档已加载`;
        };

        if (textFile) {
            const reader = new FileReader();
            reader.onload = (e) => processTextBuffer(e.target.result);
            reader.readAsArrayBuffer(textFile);
        } else if (textUrl) {
            const statusInfo = document.getElementById('aurora-info-status');
            if (statusInfo) statusInfo.textContent = '正在下载文档...';

            fetch(textUrl)
                .then((res) => {
                    if (!res.ok) throw new Error('网络错误');
                    return res.arrayBuffer();
                })
                .then((buffer) => processTextBuffer(buffer))
                .catch((err) => {
                    console.error(err);
                    if (statusInfo) statusInfo.textContent = '下载失败';
                    alert('文档下载失败，请检查链接跨域问题。');
                });
        }
    } else if (mode === 'custom') {
        const imgFile = document.getElementById('aurora-custom-img').files[0];
        const audioFile = document.getElementById('aurora-custom-audio').files[0];
        const subFile = document.getElementById('aurora-sub-file-custom').files[0];
        const subUrl = document.getElementById('aurora-sub-url-custom').value.trim();

        if (!imgFile || !audioFile) {
            alert('图片和音频文件都是必填的哦！');
            return;
        }

        customViewer.style.display = 'block';
        customImg.src = URL.createObjectURL(imgFile);
        customAudio.src = URL.createObjectURL(audioFile);

        customAudio.style.opacity = '0';
        customImg.onclick = () => {
            customAudio.style.opacity = customAudio.style.opacity === '0' ? '0.8' : '0';
        };

        // 处理字幕 (文件优先，其次URL)
        if (subFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                handleSubtitleContent(e.target.result);
                // 开启监听
                customAudio.ontimeupdate = () => {
                    const curTime = customAudio.currentTime;
                    const sub = auroraState.subtitles.find((s) => curTime >= s.start && curTime <= s.end);
                    document.getElementById('aurora-custom-subtitle-display').textContent = sub ? sub.text : '';
                };
            };
            reader.readAsText(subFile);
        } else if (subUrl) {
            statusInfo.textContent = '正在下载字幕...';
            fetch(subUrl)
                .then((r) => r.text())
                .then((txt) => {
                    handleSubtitleContent(txt);
                    // 开启监听
                    customAudio.ontimeupdate = () => {
                        const curTime = customAudio.currentTime;
                        const sub = auroraState.subtitles.find((s) => curTime >= s.start && curTime <= s.end);
                        document.getElementById('aurora-custom-subtitle-display').textContent = sub ? sub.text : '';
                    };
                })
                .catch(() => (statusInfo.textContent = '字幕下载失败'));
        } else {
            statusInfo.textContent = '音频无字幕';
        }
    }
}

/**
 * 解析字幕文件 (支持 SRT, VTT, LRC)
 * 自动识别格式并转换为统一的 {start, end, text} 数组
 */
function parseSRT(data) {
    if (!data) return [];

    // 1. 统一换行符
    const normalizedData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    // --- LRC 格式处理逻辑 ---
    // 如果包含 [mm:ss] 且不包含 --> 箭头，则认为是 LRC
    if (/^\[\d{1,2}:\d{1,2}/m.test(normalizedData) && !normalizedData.includes('-->')) {
        console.log('检测到 LRC 格式字幕，正在转换...');
        const lines = normalizedData.split('\n');
        const lrcEntries = [];
        // 匹配 [mm:ss.xx] 或 [mm:ss]
        const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/;

        // 提取所有时间和文本
        for (let line of lines) {
            const match = timeRegex.exec(line);
            if (match) {
                const m = parseInt(match[1], 10);
                const s = parseInt(match[2], 10);
                let ms = 0;
                if (match[3]) {
                    // 补齐毫秒位数，如 .5 -> 500, .05 -> 050
                    ms = parseInt(match[3].padEnd(3, '0'), 10);
                }
                const seconds = m * 60 + s + ms / 1000;
                const text = line.replace(timeRegex, '').trim();
                if (text) {
                    lrcEntries.push({ time: seconds, text: text });
                }
            }
        }

        // 按时间排序
        lrcEntries.sort((a, b) => a.time - b.time);

        // 转换为 {start, end, text} 格式
        // LRC没有结束时间，把下一句的开始时间作为上一句的结束时间
        const result = [];
        for (let i = 0; i < lrcEntries.length; i++) {
            const current = lrcEntries[i];
            const next = lrcEntries[i + 1];
            // 如果是最后一句，默认显示 5 秒
            const endTime = next ? next.time : current.time + 5;

            result.push({
                start: current.time,
                end: endTime,
                text: current.text,
            });
        }
        return result;
    }

    // --- SRT / VTT 格式处理逻辑 (保持原有增强版) ---
    // 支持 VTT 的 "WEBVTT" 头，支持点号或逗号的时间戳
    const pattern = /(\d{1,2}:\d{1,2}:\d{1,2}[.,]\d{1,3}) --> (\d{1,2}:\d{1,2}:\d{1,2}[.,]\d{1,3})(?:[^\n]*)\n([\s\S]*?)(?=\n\n|$|\n\d{1,2}:)/g;

    const subtitles = [];
    let match;

    while ((match = pattern.exec(normalizedData)) !== null) {
        subtitles.push({
            start: timeToSeconds(match[1]),
            end: timeToSeconds(match[2]),
            text: match[3].trim(), // 移除首尾空白
        });
    }

    console.log(`成功解析字幕条数: ${subtitles.length}`);
    return subtitles;
}

/**
 * 时间戳转秒数
 * 兼容 "00:00:00,000" 和 "00:00:00.000"
 */
function timeToSeconds(timeString) {
    if (!timeString) return 0;
    // 将逗号统一替换为点号，方便处理
    const normalized = timeString.replace(',', '.');
    const parts = normalized.split(':');

    // 处理 HH:MM:SS.ms
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 初始化极光播放器的拖拽
 */
function initAuroraDrag() {
    const overlay = document.getElementById('aurora-player-overlay');
    const handle = document.getElementById('aurora-drag-handle');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const startDrag = (e) => {
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;
        const rect = overlay.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
    };

    const onDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - startX;
        const dy = clientY - startY;
        overlay.style.transform = 'none'; // 清除居中
        overlay.style.left = `${initialLeft + dx}px`;
        overlay.style.top = `${initialTop + dy}px`;
    };

    const endDrag = () => {
        isDragging = false;
    };

    if (handle) {
        handle.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);

        handle.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }
}

// 关闭播放器
function closeAuroraPlayer() {
    document.getElementById('aurora-player-overlay').style.display = 'none';
    document.getElementById('aurora-video-element').pause();
    // 也要暂停自定义音频
    const customAudio = document.getElementById('aurora-custom-audio-element');
    if (customAudio) customAudio.pause();

    auroraState.active = false;
}
/* 漫游书架功能核心逻辑 */

// 1. 打开书架界面
async function openAuroraBookshelf() {
    // 关闭设置弹窗
    document.getElementById('aurora-setup-modal').classList.remove('visible');
    // 渲染书架
    await renderBookshelf();
    // 显示书架屏幕
    showScreen('aurora-bookshelf-screen');
}

// 2. 渲染书架
async function renderBookshelf() {
    const container = document.getElementById('bookshelf-container');
    container.innerHTML = '';

    // 从数据库获取所有书籍，按添加时间倒序
    const books = await window.db.auroraBooks.orderBy('addedAt').reverse().toArray();

    if (books.length === 0) {
        container.innerHTML = '<div class="bookshelf-row" style="justify-content:center; align-items:center; color:#8d6e63; font-size:14px;">书架空空如也...</div>';
        return;
    }

    // 分层渲染，每层放 6 本书 (为了美观)
    const booksPerRow = 6;
    for (let i = 0; i < books.length; i += booksPerRow) {
        const rowBooks = books.slice(i, i + booksPerRow);

        const rowDiv = document.createElement('div');
        rowDiv.className = 'bookshelf-row';

        rowBooks.forEach((book) => {
            const bookEl = document.createElement('div');
            // 随机分配一种颜色
            const colorClass = `book-color-${Math.floor(Math.random() * 5) + 1}`;
            bookEl.className = `retro-book ${colorClass}`;
            bookEl.title = book.title; // 鼠标悬停显示全名
            bookEl.innerHTML = `<span class="book-spine-title">${book.title}</span>`;

            // 点击打开书
            bookEl.addEventListener('click', () => loadBookFromShelf(book));

            // 长按删除
            addLongPressListener(bookEl, async () => {
                const confirmed = await showCustomConfirm('移除书籍', `要把《${book.title}》从书架上拿走吗？`, {
                    confirmButtonClass: 'btn-danger',
                });
                if (confirmed) {
                    await window.db.auroraBooks.delete(book.id);
                    await renderBookshelf();
                }
            });

            rowDiv.appendChild(bookEl);
        });

        container.appendChild(rowDiv);
    }

    // 如果最后一行不满，且总书不多，补一个空书架显得更有氛围
    if (books.length % booksPerRow !== 0 || books.length < 4) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'bookshelf-row';
        container.appendChild(emptyRow);
    }
}

// 3. 保存当前正在读的小说到书架
async function saveCurrentNovelToShelf() {
    if (!auroraState.active || auroraState.mode !== 'text' || !auroraState.textContent) {
        alert('没有正在阅读的小说内容！');
        return;
    }

    const title = auroraState.title || '未命名小说';

    // 检查是否已存在
    const existing = await window.db.auroraBooks.where('title').equals(title).first();
    if (existing) {
        alert(`《${title}》已经在书架上了！`);
        return;
    }

    await window.db.auroraBooks.add({
        title: title,
        content: auroraState.textContent,
        addedAt: Date.now(),
    });

    alert(`《${title}》已成功放入书架！`);

    // 隐藏保存按钮，避免重复保存
    document.getElementById('aurora-save-book-btn').style.display = 'none';
}

// 4. 从书架加载书籍并阅读 (已添加进度记忆功能)
function loadBookFromShelf(book) {
    // 更新全局状态
    auroraState = {
        active: true,
        mode: 'text',
        title: book.title,
        subtitles: [],
        textContent: book.content,
        lastSyncTime: 0,
        // ★★★ 新增：记录当前正在读哪本书的ID，以便保存进度
        currentBookId: book.id,
    };

    const playerOverlay = document.getElementById('aurora-player-overlay');
    const statusTitle = document.getElementById('aurora-playing-title');
    const statusInfo = document.getElementById('aurora-info-status');
    const textViewer = document.getElementById('aurora-text-viewer');
    const videoEl = document.getElementById('aurora-video-element');
    const customViewer = document.getElementById('aurora-custom-viewer');
    const saveBtn = document.getElementById('aurora-save-book-btn');

    // UI 切换逻辑
    document.getElementById('aurora-bookshelf-screen').classList.remove('active'); // 退出书架

    if (window.state.activeChatId) {
        showScreen('chat-interface-screen');
    } else {
        showScreen('home-screen');
    }

    playerOverlay.style.display = 'flex'; // 显示播放器

    statusTitle.textContent = `正在漫游:《${book.title}》`;
    statusInfo.textContent = '来自书架';

    videoEl.style.display = 'none';
    customViewer.style.display = 'none';
    textViewer.style.display = 'block';

    document.getElementById('aurora-text-body').textContent = book.content;

    // 因为是从书架打开的，所以隐藏“保存”按钮
    saveBtn.style.display = 'none';

    // 恢复阅读进度
    // 使用 setTimeout 确保文本渲染完成后再滚动
    setTimeout(() => {
        if (book.progress) {
            // progress 是一个 0 到 1 之间的浮点数 (百分比)
            const scrollHeight = textViewer.scrollHeight - textViewer.clientHeight;
            const targetScrollTop = Math.floor(scrollHeight * book.progress);

            textViewer.scrollTop = targetScrollTop;
            console.log(`已恢复阅读进度: ${(book.progress * 100).toFixed(1)}%`);
        } else {
            textViewer.scrollTop = 0; // 如果没有记录，从头开始
        }
    }, 50);
}

// 1. 初始化漫游字号调整
let currentAuroraFontSize = 16;
function initAuroraFontControl() {
    const upBtn = document.getElementById('aurora-font-up');
    const downBtn = document.getElementById('aurora-font-down');
    const textViewer = document.getElementById('aurora-text-viewer');
    const subDisplay = document.getElementById('aurora-custom-subtitle-display');

    // 调整字号的通用函数
    const changeFontSize = (delta) => {
        currentAuroraFontSize = Math.max(10, Math.min(40, currentAuroraFontSize + delta)); // 限制在 10px - 40px

        // 应用到小说文本
        if (textViewer) textViewer.style.fontSize = `${currentAuroraFontSize}px`;

        // 应用到自定义模式字幕
        if (subDisplay) subDisplay.style.fontSize = `${currentAuroraFontSize}px`;
    };

    if (upBtn)
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            changeFontSize(2);
        });
    if (downBtn)
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            changeFontSize(-2);
        });
}

// 2. 初始化手机端触摸缩放
function initAuroraResize() {
    const handle = document.getElementById('aurora-resize-handle');
    const overlay = document.getElementById('aurora-player-overlay');

    if (!handle || !overlay) return;

    let startX, startY, startWidth, startHeight;

    const onTouchStart = (e) => {
        e.preventDefault(); // 防止滚动
        e.stopPropagation();
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(overlay).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(overlay).height, 10);

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    };

    const onTouchMove = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const newWidth = startWidth + (touch.clientX - startX);
        const newHeight = startHeight + (touch.clientY - startY);

        // 设置最小尺寸限制
        if (newWidth > 200) overlay.style.width = `${newWidth}px`;
        if (newHeight > 150) overlay.style.height = `${newHeight}px`;
    };

    const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    };

    handle.addEventListener('touchstart', onTouchStart, { passive: false });

    // 为了兼容电脑鼠标拖拽该角落
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(overlay).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(overlay).height, 10);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);
        if (newWidth > 200) overlay.style.width = `${newWidth}px`;
        if (newHeight > 150) overlay.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
}

function initAuroraListeners() {
    const auroraMediaBtn = document.getElementById('aurora-media-btn');
    if (auroraMediaBtn) auroraMediaBtn.addEventListener('click', openAuroraSetupModal);

    const cancelAuroraSetupBtn = document.getElementById('cancel-aurora-setup');
    if (cancelAuroraSetupBtn) cancelAuroraSetupBtn.addEventListener('click', () => {
        document.getElementById('aurora-setup-modal').classList.remove('visible');
    });

    const confirmAuroraSetupBtn = document.getElementById('confirm-aurora-setup');
    if (confirmAuroraSetupBtn) confirmAuroraSetupBtn.addEventListener('click', confirmAuroraSetup);

    const closeAuroraPlayerBtn = document.getElementById('aurora-close-player');
    if (closeAuroraPlayerBtn) closeAuroraPlayerBtn.addEventListener('click', closeAuroraPlayer);

    // 绑定书架入口按钮
    const openBookshelfBtn = document.getElementById('open-aurora-bookshelf-btn');
    if (openBookshelfBtn) openBookshelfBtn.addEventListener('click', openAuroraBookshelf);

    const backFromBookshelfBtn = document.getElementById('back-from-bookshelf');
    if (backFromBookshelfBtn) backFromBookshelfBtn.addEventListener('click', () => {
        // 1. 隐藏书架屏幕
        document.getElementById('aurora-bookshelf-screen').classList.remove('active');

        // 2. 显式地切换回聊天界面
        if (window.state.activeChatId) {
            showScreen('chat-interface-screen');
        } else {
            showScreen('home-screen');
        }

        // 3. 重新打开设置弹窗 (模仿返回上一级菜单的效果)
        document.getElementById('aurora-setup-modal').classList.add('visible');
    });

    // 绑定保存按钮
    const saveBookBtn = document.getElementById('aurora-save-book-btn');
    if (saveBookBtn) saveBookBtn.addEventListener('click', saveCurrentNovelToShelf);

    // 极光模式切换事件绑定
    // 辅助函数：去掉文件后缀
    const autoFillAuroraTitle = (file) => {
        if (file) {
            // 获取文件名，去掉最后一个点之后的内容
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            document.getElementById('aurora-title-input').value = fileName;
        }
    };

    // 监听视频文件选择
    const auroraVideoFile = document.getElementById('aurora-video-file');
    if (auroraVideoFile) auroraVideoFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            autoFillAuroraTitle(e.target.files[0]);
        }
    });

    // 监听文本文件选择
    const auroraTextFile = document.getElementById('aurora-text-file');
    if (auroraTextFile) auroraTextFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            autoFillAuroraTitle(e.target.files[0]);
        }
    });

    // 漫游阅读进度自动保存 & 实时上下文更新功能
    const textViewer = document.getElementById('aurora-text-viewer');
    let saveProgressTimer = null;

    // 辅助函数：获取当前可视区域的文本
    function updateCurrentReadingContext() {
        if (!auroraState.textContent) return;

        const scrollHeight = textViewer.scrollHeight - textViewer.clientHeight;
        const scrollTop = textViewer.scrollTop;

        // 防止除以0
        const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        const totalLength = auroraState.textContent.length;

        // 计算中心点索引
        const centerIndex = Math.floor(totalLength * scrollPercentage);

        // 截取前后各 500 字，保证上下文足够
        const start = Math.max(0, centerIndex - 500);
        const end = Math.min(totalLength, centerIndex + 500);

        auroraState.currentSegmentText = auroraState.textContent.substring(start, end);

        return scrollPercentage; // 返回进度给下面保存用
    }

    if (textViewer) {
        textViewer.addEventListener('scroll', () => {
            // 1. 实时更新当前阅读片段（无论是否在书架模式）
            const currentProgress = updateCurrentReadingContext();

            // 2. 检查当前是否处于书架阅读模式（用于保存进度到数据库）
            if (!auroraState.active || auroraState.mode !== 'text' || !auroraState.currentBookId) {
                return;
            }

            // 3. 防抖处理：用户停止滚动 0.5 秒后才保存数据库，避免卡顿
            if (saveProgressTimer) clearTimeout(saveProgressTimer);

            saveProgressTimer = setTimeout(async () => {
                // 确保进度在 0 到 1 之间
                const progress = Math.max(0, Math.min(1, currentProgress));

                try {
                    await window.db.auroraBooks.update(auroraState.currentBookId, { progress: progress });
                } catch (error) {
                    console.error('保存阅读进度失败:', error);
                }
            }, 500);
        });
    }

    document.querySelectorAll('input[name="aurora-mode"]').forEach((radio) => {
        radio.addEventListener('change', toggleAuroraInputs);
    });

    const sysNotifSwitch = document.getElementById('system-notification-switch');
    if (sysNotifSwitch) {
        sysNotifSwitch.addEventListener('change', (e) => {
            if (e.target.checked) {
                // 用户尝试开启
                if (!('Notification' in window)) {
                    alert('抱歉，你的设备或浏览器不支持系统通知。');
                    e.target.checked = false;
                } else if (Notification.permission === 'granted') {
                    // 已经是授权状态，无需操作
                    new Notification('EPhone', {
                        body: '测试通知：系统通知功能正常！',
                    });
                } else if (Notification.permission !== 'denied') {
                    // 请求权限
                    Notification.requestPermission().then((permission) => {
                        if (permission === 'granted') {
                            new Notification('EPhone', {
                                body: '成功开启！以后收到消息会有弹窗哦。',
                            });
                        } else {
                            e.target.checked = false;
                            alert('你拒绝了通知权限。如需开启，请在手机系统设置中允许本应用发送通知。');
                        }
                    });
                } else {
                    // 之前被拒绝过
                    alert('权限已被拒绝。请前往手机【设置 -> 通知】中找到本应用，手动开启通知权限。');
                    e.target.checked = false;
                }
            }
        });
    }
    // --- 情侣头像库功能事件 ---

    // 1. 打开管理弹窗
    document.getElementById('manage-couple-avatar-library-btn').addEventListener('click', (e) => {
        // 阻止冒泡防止关闭设置弹窗（视情况而定，这里建议先不关闭设置弹窗，或者层叠显示）
        // 为了体验更好，我们可以先隐藏聊天设置弹窗
        document.getElementById('chat-settings-modal').classList.remove('visible');
        openCoupleAvatarLibraryModal();
    });

    // 2. 关闭管理弹窗 (返回设置)
    document.getElementById('close-couple-avatar-library-btn').addEventListener('click', () => {
        document.getElementById('couple-avatar-library-modal').classList.remove('visible');
        // 重新打开设置弹窗
        document.getElementById('chat-settings-btn').click();
    });

    // 3. 打开添加弹窗
    document.getElementById('add-couple-avatar-btn').addEventListener('click', () => {
        // 清空输入
        document.getElementById('new-couple-my-avatar-preview').src = 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
        document.getElementById('new-couple-char-avatar-preview').src = 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
        document.getElementById('new-couple-desc-input').value = '';
        document.getElementById('new-couple-my-avatar-input').value = '';
        document.getElementById('new-couple-char-avatar-input').value = '';

        document.getElementById('add-couple-avatar-modal').classList.add('visible');
    });

    // 4. 关闭添加弹窗
    document.getElementById('cancel-add-couple-avatar-btn').addEventListener('click', () => {
        document.getElementById('add-couple-avatar-modal').classList.remove('visible');
    });

    // 5. 保存新情头
    document.getElementById('save-couple-avatar-btn').addEventListener('click', async () => {
        const myAvatarSrc = document.getElementById('new-couple-my-avatar-preview').src;
        const charAvatarSrc = document.getElementById('new-couple-char-avatar-preview').src;
        const desc = document.getElementById('new-couple-desc-input').value.trim();

        if (myAvatarSrc.includes('placeholder') || charAvatarSrc.includes('placeholder')) {
            alert('请上传两张头像！');
            return;
        }
        if (!desc) {
            alert('请输入描述，这很重要，AI靠它来选择头像！');
            return;
        }

        const chat = state.chats[state.activeChatId];
        if (!chat.settings.coupleAvatarLibrary) chat.settings.coupleAvatarLibrary = [];

        const newPair = {
            id: 'couple_' + Date.now(),
            userAvatar: myAvatarSrc,
            charAvatar: charAvatarSrc,
            description: desc,
        };

        chat.settings.coupleAvatarLibrary.push(newPair);
        await db.chats.put(chat);

        document.getElementById('add-couple-avatar-modal').classList.remove('visible');
        renderCoupleAvatarLibraryList(); // 刷新列表
        alert('情侣头像添加成功！');
    });

    // 6. 图片上传预览绑定 (复用通用的上传函数)
    setupFileUpload('new-couple-my-avatar-input', (base64) => {
        document.getElementById('new-couple-my-avatar-preview').src = base64;
    });
    setupFileUpload('new-couple-char-avatar-input', (base64) => {
        document.getElementById('new-couple-char-avatar-preview').src = base64;
    });

    // ==========================================
    // ★★★ 新增功能：全局路人头像库逻辑 ★★★
    // ==========================================
    // (已移动到文件底部全局作用域)


    // 5. 【核心工具函数】根据名字获取头像
    // 如果名字相同，尽量返回相同的头像（伪随机）；如果没有库，返回默认。
    window.getAvatarForName = function (name) {
        const lib = window.state.passerbyAvatars || [];
        if (lib.length === 0) return 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg'; // 默认头像

        // 简单的哈希算法，将名字转为数字
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        // 取绝对值并取模
        const index = Math.abs(hash) % lib.length;
        return lib[index].url;
    };

    // 核心函数：打开管理弹窗
    function openCoupleAvatarLibraryModal() {
        if (!state.activeChatId) return;
        renderCoupleAvatarLibraryList();
        document.getElementById('couple-avatar-library-modal').classList.add('visible');
    }

    // 核心函数：渲染列表
    function renderCoupleAvatarLibraryList() {
        const listEl = document.getElementById('couple-avatar-library-list');
        const chat = state.chats[state.activeChatId];
        const library = chat.settings.coupleAvatarLibrary || [];

        listEl.innerHTML = '';

        if (library.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">这里空空如也，快去添加第一对情头吧！</p>';
            return;
        }

        library.forEach((pair, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
            background: #fff; padding: 10px; border-radius: 12px; 
            display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        `;

            item.innerHTML = `
            <div style="display:flex; justify-content:center; gap: 15px; align-items:center;">
                <div style="text-align:center;">
                    <img src="${pair.userAvatar}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:2px solid #eee;">
                    <div style="font-size:10px; color:#666; margin-top:2px;">我</div>
                </div>
                <div style="font-size:20px;">❤️</div>
                <div style="text-align:center;">
                    <img src="${pair.charAvatar}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:2px solid #eee;">
                    <div style="font-size:10px; color:#666; margin-top:2px;">Ta</div>
                </div>
            </div>
            <div style="font-size:13px; color:#333; background:#f9f9f9; padding:8px; border-radius:6px;">
                <strong>描述：</strong>${pair.description}
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="moe-btn-mini apply-pair-btn" style="background:#4caf50; color:white;">应用</button>
                <button class="moe-btn-mini delete-pair-btn" style="background:#ff3b30; color:white;">删除</button>
            </div>
        `;

            // 绑定删除
            item.querySelector('.delete-pair-btn').onclick = async () => {
                if (confirm('确定要删除这对情头吗？')) {
                    chat.settings.coupleAvatarLibrary.splice(index, 1);
                    await db.chats.put(chat);
                    renderCoupleAvatarLibraryList();
                }
            };

            // 绑定手动应用
            item.querySelector('.apply-pair-btn').onclick = async () => {
                chat.settings.aiAvatar = pair.charAvatar;
                chat.settings.myAvatar = pair.userAvatar;
                chat.settings.isCoupleAvatar = true;
                chat.settings.coupleAvatarDescription = pair.description;
                await db.chats.put(chat);

                // 如果聊天界面开着，刷新它
                if (document.getElementById('chat-interface-screen').classList.contains('active')) {
                    renderChatInterface(chat.id);
                }
                alert('已应用此情侣头像！');
            };

            listEl.appendChild(item);
        });
    }

    initAuroraDrag(); // 初始化拖拽
    initAuroraFontControl();
    initAuroraResize();
}

// 自动初始化 Aurora 监听器
document.addEventListener('DOMContentLoaded', initAuroraListeners);

/**
 * 当用户点击开关时，切换当前的主题
 */
function toggleTheme() {
    const toggleSwitch = document.getElementById('theme-toggle-switch');
    // 直接根据开关的选中状态来决定新主题
    if (toggleSwitch) {
        const newTheme = toggleSwitch.checked ? 'dark' : 'light';
        if (typeof applyTheme === 'function') {
            applyTheme(newTheme);
        } else if (window.applyTheme) {
            window.applyTheme(newTheme);
        }
    }
}
window.toggleTheme = toggleTheme;


// ==========================================
// ★★★ 全局路人头像库逻辑 (Moved to Global Scope) ★★★
// ==========================================

// 1. 打开管理界面
async function openPasserbyManager() {
    await renderPasserbyGrid();
    document.getElementById('passerby-avatar-manager-modal').classList.add('visible');
}
window.openPasserbyManager = openPasserbyManager;

// 2. 渲染网格
async function renderPasserbyGrid() {
    const grid = document.getElementById('passerby-avatar-grid');
    const countSpan = document.getElementById('passerby-count');
    grid.innerHTML = '';

    // 从数据库获取所有
    const avatars = await db.passerbyAvatars.toArray();
    countSpan.textContent = avatars.length;

    // 更新全局缓存 (重要)
    window.state.passerbyAvatars = avatars;

    if (avatars.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#999;">图库为空，快去添加一些吧！</p>';
        return;
    }

    avatars.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'sticker-item'; // 复用现有的贴纸样式
        div.style.backgroundImage = `url(${item.url})`;
        div.style.borderRadius = '8px';
        div.style.aspectRatio = '1/1';

        // 删除按钮
        const delBtn = document.createElement('div');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.style.display = 'block';
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm('确定删除这张头像吗？')) {
                await db.passerbyAvatars.delete(item.id);
                renderPasserbyGrid();
            }
        };

        div.appendChild(delBtn);
        grid.appendChild(div);
    });
}
window.renderPasserbyGrid = renderPasserbyGrid;

// 3. 处理添加头像 (支持本地多选 和 URL)
async function handleAddPasserbyAvatar() {
    const choice = await showChoiceModal('添加方式', [
        { text: '📁 本地上传 (支持多选)', value: 'local' },
        { text: '🌐 网络图片URL', value: 'url' },
    ]);

    if (!choice) return;

    if (choice === 'local') {
        document.getElementById('passerby-upload-input').click();
    } else if (choice === 'url') {
        const url = await showCustomPrompt('输入URL', '请输入图片链接');
        if (url && url.trim()) {
            await db.passerbyAvatars.add({ url: url.trim() });
            alert('添加成功');
            // 如果管理界面开着，就刷新它
            if (document.getElementById('passerby-avatar-manager-modal').classList.contains('visible')) {
                renderPasserbyGrid();
            }
        }
    }
}
window.handleAddPasserbyAvatar = handleAddPasserbyAvatar;

// 4. 处理本地文件选择
async function handlePasserbyFileChange(event) {
    const files = event.target.files;
    if (!files.length) return;

    // 显示加载提示
    const btn = document.getElementById('add-passerby-avatar-btn');
    const originalText = btn.textContent;
    btn.textContent = '处理中...';

    const newItems = [];
    for (const file of files) {
        // 复用你的图片压缩函数 handleImageUploadAndCompress
        try {
            const base64 = await handleImageUploadAndCompress(file);
            newItems.push({ url: base64 });
        } catch (e) {
            console.error('图片处理失败', e);
        }
    }

    if (newItems.length > 0) {
        await db.passerbyAvatars.bulkAdd(newItems);
        alert(`成功添加 ${newItems.length} 张头像！`);
        // 刷新缓存
        window.state.passerbyAvatars = await db.passerbyAvatars.toArray();
        // 如果管理界面开着，刷新
        if (document.getElementById('passerby-avatar-manager-modal').classList.contains('visible')) {
            renderPasserbyGrid();
        }
    }

    btn.textContent = originalText;
    event.target.value = null; // 清空
}
window.handlePasserbyFileChange = handlePasserbyFileChange;

// ===================================================================
// Character Card Import Functions (Moved from main-app.js)
// ===================================================================

/**
 * Handle user selected character card file
 * @param {File} file - User selected file object
 */
async function handleCharacterImport(file) {
    if (!file) return;

    try {
        let characterData;
        let avatarBase64;

        if (file.name.toLowerCase().endsWith('.png')) {
            // If PNG, call PNG parser
            const result = await parseCharPng(file);
            characterData = result.characterData;
            avatarBase64 = result.avatarBase64;
        } else if (file.name.toLowerCase().endsWith('.json')) {
            // If JSON, call JSON parser
            characterData = await parseCharJson(file);
            // JSON cards usually don't have images, use default avatar
            avatarBase64 = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
        } else {
            alert('不支持的文件格式，请选择 .png 或 .json 文件。');
            return;
        }

        if (characterData) {
            // After successful parsing, create character
            await createCharacterFromData(characterData, avatarBase64);
        }
    } catch (error) {
        console.error('导入角色卡失败:', error);
        alert(`导入失败: ${error.message}`);
    }
}

/**
 * Parse SillyTavern PNG character card, resolve Chinese encoding issues with byte-level operations.
 * @param {File} file - PNG file
 * @returns {Promise<{characterData: object, avatarBase64: string}>}
 */
async function parseCharPng(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const dataView = new DataView(arrayBuffer);

            if (dataView.getUint32(0) !== 0x89504e47 || dataView.getUint32(4) !== 0x0d0a1a0a) {
                return reject(new Error('文件不是一个有效的PNG图片。'));
            }

            let offset = 8;
            let characterJson = null;

            while (offset < dataView.byteLength) {
                const length = dataView.getUint32(offset);
                const type = String.fromCharCode(dataView.getUint8(offset + 4), dataView.getUint8(offset + 5), dataView.getUint8(offset + 6), dataView.getUint8(offset + 7));

                if (type === 'tEXt') {
                    const chunkData = new Uint8Array(arrayBuffer, offset + 8, length);

                    let text = '';
                    for (let i = 0; i < chunkData.length; i++) {
                        text += String.fromCharCode(chunkData[i]);
                    }

                    const keyword = 'chara' + String.fromCharCode(0);
                    if (text.startsWith(keyword)) {
                        const base64Data = text.substring(keyword.length);
                        try {
                            const binaryString = atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const decodedJsonString = new TextDecoder('utf-8').decode(bytes);
                            characterJson = JSON.parse(decodedJsonString);
                            break;
                        } catch (e) {
                            return reject(new Error('解析图片内嵌的角色数据失败，可能是数据损坏。'));
                        }
                    }
                }

                if (type === 'IEND') break;
                offset += 12 + length;
            }

            if (characterJson) {
                const imageReader = new FileReader();
                imageReader.onload = (imgEvent) => {
                    resolve({
                        characterData: characterJson,
                        avatarBase64: imgEvent.target.result,
                    });
                };
                imageReader.onerror = () => reject(new Error('读取图片作为头像失败。'));
                imageReader.readAsDataURL(file);
            } else {
                reject(new Error('在这张PNG图片中没有找到SillyTavern角色数据。'));
            }
        };
        reader.onerror = () => reject(new Error('读取PNG文件失败。'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * [Corrected] Parse JSON character card, force UTF-8 encoding
 * @param {File} file - JSON file
 * @returns {Promise<object>}
 */
async function parseCharJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target.result;
                const textDecoder = new TextDecoder('utf-8');
                const jsonString = textDecoder.decode(arrayBuffer);
                const data = JSON.parse(jsonString);
                resolve(data.data || data);
            } catch (error) {
                reject(new Error('解析JSON文件失败，请检查文件格式或编码。'));
            }
        };
        reader.onerror = () => reject(new Error('读取JSON文件失败。'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Create new character and worldbook from parsed data.
 * @param {object} data - Raw JSON data parsed from card
 * @param {string} avatarBase64 - Character avatar image (Base64)
 */
async function createCharacterFromData(data, avatarBase64) {
    const charData = data.data || data;
    const characterName = charData.name ? charData.name.trim() : '未命名角色';

    const newChatId = 'chat_' + Date.now();

    const newChat = {
        id: newChatId,
        name: characterName,
        isGroup: false,
        isPinned: false,
        history: [],
        unreadCount: 0,
        musicData: { totalTime: 0 },
        npcLibrary: [],
        relationship: { status: 'friend', blockedTimestamp: null, applicationReason: '' },
        status: { text: '在线', lastUpdate: Date.now(), isBusy: false },
        weiboDms: [],
        loversSpaceData: null,
        settings: {
            aiPersona: charData.description || '该角色没有描述。',
            myPersona: '我是谁呀。',
            maxMemory: 10,
            aiAvatar: avatarBase64,
            myAvatar: 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg',
            background: '',
            theme: 'default',
            fontSize: 13,
            customCss: '',
            linkedWorldBookIds: [],
            aiAvatarLibrary: [],
            stickerLibrary: [],
            summary: {
                enabled: false,
                mode: 'auto',
                count: 20,
                prompt: '请你以第三人称的视角，客观、冷静、不带任何感情色彩地总结以下对话的核心事件和信息。禁止进行任何角色扮演或添加主观评论。',
                lastSummaryIndex: -1,
            },
            linkedMemories: [],
            offlineMode: {
                enabled: false,
                prompt: '',
                style: '',
                wordCount: 300,
                presets: [],
            },
            timePerceptionEnabled: true,
            customTime: '',
            isCoupleAvatar: false,
            coupleAvatarDescription: '',
            weiboProfession: '',
            weiboInstruction: '',
            visualVideoCallEnabled: false,
            charVideoImage: '',
            userVideoImage: '',
            videoCallVoiceAccess: false,
            petAdopted: false,
            pet: null,
        },
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
    };

    await window.db.chats.put(newChat);
    window.state.chats[newChatId] = newChat;

    console.log('开始检测世界书数据...');
    let worldBookFound = false;

    if (charData.character_book && charData.character_book.entries && Array.isArray(charData.character_book.entries) && charData.character_book.entries.length > 0) {
        console.log(`检测到最新的 character_book 格式 (${charData.character_book.entries.length}条)，开始导入...`);
        const newCategory = { name: characterName };
        const newCategoryId = await window.db.worldBookCategories.add(newCategory);

        await window.WorldBookModule.saveWorldBookEntriesFromArray(charData.character_book.entries, newCategoryId);
        worldBookFound = true;
    }
    else if (charData.world_entries && Array.isArray(charData.world_entries) && charData.world_entries.length > 0) {
        console.log(`检测到旧版 world_entries 格式 (${charData.world_entries.length}条)，开始导入...`);
        const newCategory = { name: characterName };
        const newCategoryId = await window.db.worldBookCategories.add(newCategory);
        await window.WorldBookModule.saveWorldBookEntriesFromArray(charData.world_entries, newCategoryId);
        worldBookFound = true;
    }
    else if (data.world && typeof data.world === 'string' && data.world.trim()) {
        console.log('检测到外层 world 字段格式，开始导入...');
        const newCategory = { name: characterName };
        const newCategoryId = await window.db.worldBookCategories.add(newCategory);
        await window.WorldBookModule.parseAndSaveWorldBooks(data.world, newCategoryId);
        worldBookFound = true;
    }
    else if (charData.world_info && typeof charData.world_info === 'string' && charData.world_info.trim()) {
        console.log('检测到旧版 world_info 字段格式，开始导入...');
        const newCategory = { name: characterName };
        const newCategoryId = await window.db.worldBookCategories.add(newCategory);
        await window.WorldBookModule.parseAndSaveWorldBooks(charData.world_info, newCategoryId);
        worldBookFound = true;
    }

    if (!worldBookFound) {
        console.log('诊断：在此角色卡中未找到任何可识别的世界书字段。');
    }

    await window.renderChatList();
    await window.showCustomAlert('导入成功！', `角色“${characterName}”已成功创建！`);
}

function initCharacterImportEventListeners() {
    const importBtn = document.getElementById('import-character-card-btn');
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            const unlockKey = 'isCharacterImportUnlocked';

            if (localStorage.getItem(unlockKey) === 'true') {
                document.getElementById('character-card-input').click();
                return;
            }

            const deviceCode = getDeviceCode();

            const modalHtmlContent = `
                    <p style="margin-bottom: 15px;">请前往取PIN网站，使用下面的设备码获取PIN。</p>
                    <div style="background: #eee; padding: 10px; border-radius: 6px; margin-bottom: 15px; user-select: all; cursor: copy;" title="点击复制设备码">
                        <strong>设备码:</strong> <span id="device-code-to-copy">${deviceCode}</span>
                    </div>
                    <p id="copy-device-code-feedback" style="height: 15px; font-size: 12px; color: green;"></p>
                `;

            const userPin = await window.showCustomPrompt(
                '功能解锁',
                '请在此输入获取到的PIN码...',
                '',
                'text',
                modalHtmlContent
            );

            if (userPin === null) return;

            const correctPin = generatePinFromDeviceCode(deviceCode);
            if (userPin.trim().toUpperCase() === correctPin) {
                localStorage.setItem(unlockKey, 'true');
                await window.showCustomAlert('解锁成功！', '导入功能已解锁，此设备无需再次输入PIN码。');
                document.getElementById('character-card-input').click();
            } else {
                await window.showCustomAlert('解锁失败', 'PIN码错误，请重新获取或输入。');
            }
        });
    }

    const customModalBody = document.getElementById('custom-modal-body');
    if (customModalBody) {
        customModalBody.addEventListener('click', (e) => {
            const codeElement = e.target.closest('#device-code-to-copy');
            if (codeElement) {
                const deviceCode = codeElement.textContent;
                const feedbackEl = document.getElementById('copy-device-code-feedback');
                navigator.clipboard
                    .writeText(deviceCode)
                    .then(() => {
                        if (feedbackEl) feedbackEl.textContent = '设备码已复制！';
                        setTimeout(() => {
                            if (feedbackEl) feedbackEl.textContent = '';
                        }, 2000);
                    })
                    .catch((err) => {
                        if (feedbackEl) feedbackEl.textContent = '复制失败，请手动复制。';
                    });
            }
        });
    }

    const input = document.getElementById('character-card-input');
    if (input) {
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                handleCharacterImport(file);
            }
            event.target.value = null;
        });
    }
}

document.addEventListener('DOMContentLoaded', initCharacterImportEventListeners);




