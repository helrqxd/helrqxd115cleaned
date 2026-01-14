// apps/QQ/favorites.js
// QQ收藏功能模块

// 常量定义 (改用 IIFE 包装避免污染全局，或者直接依赖全局定义)
// 为了解决 "Identifier has already been declared" 错误，我们将此文件逻辑包裹在 IIFE 中

(function () {

    // 局部常量定义
    const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
    const defaultMyGroupAvatar = 'https://i.postimg.cc/cLPP10Vm/4.jpg';
    const defaultGroupMemberAvatar = 'https://i.postimg.cc/VkQfgzGJ/1.jpg';


    // 模块内部状态
    let isFavoritesSelectionMode = false;
    let selectedFavorites = new Set();
    let allFavoriteItems = [];

    /**
     * 渲染过滤后的收藏列表
     * @param {Array} items - 收藏项数组
     */
    function displayFilteredFavorites(items) {
        const listEl = document.getElementById('favorites-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        if (items.length === 0) {
            const searchTerm = document.getElementById('favorites-search-input').value;
            const message = searchTerm ? '未找到相关收藏' : '你的收藏夹是空的，<br>快去动态或聊天中收藏喜欢的内容吧！';
            listEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">${message}</p>`;
            return;
        }

        for (const item of items) {
            const card = document.createElement('div');
            card.className = 'favorite-item-card';
            card.dataset.favid = item.id;

            // 如果在选择模式下，且该项已被选中，则添加selected类
            if (isFavoritesSelectionMode && selectedFavorites.has(item.id)) {
                card.classList.add('selected');
            }

            let headerHtml = '',
                contentHtml = '',
                sourceText = '',
                footerHtml = '';

            if (item.type === 'qzone_post') {
                const post = item.content;
                sourceText = '来自动态';
                let authorAvatar = defaultAvatar,
                    authorNickname = '未知用户';

                if (post.authorId === 'user') {
                    if (window.state.qzoneSettings) {
                        authorAvatar = window.state.qzoneSettings.avatar;
                        authorNickname = window.state.qzoneSettings.nickname;
                    }
                } else if (window.state.chats[post.authorId]) {
                    authorAvatar = window.state.chats[post.authorId].settings.aiAvatar;
                    authorNickname = window.state.chats[post.authorId].name;
                }

                headerHtml = `<img src="${authorAvatar}" class="avatar"><div class="info"><div class="name">${authorNickname}</div></div>`;

                const publicTextHtml = post.publicText ? `<div class="post-content">${post.publicText.replace(/\n/g, '<br>')}</div>` : '';
                if (post.type === 'shuoshuo') {
                    contentHtml = `<div class="post-content">${post.content.replace(/\n/g, '<br>')}</div>`;
                } else if (post.type === 'image_post' && post.imageUrl) {
                    contentHtml = publicTextHtml ? `${publicTextHtml}<div style="margin-top:10px;"><img src="${post.imageUrl}" class="chat-image"></div>` : `<img src="${post.imageUrl}" class="chat-image">`;
                } else if (post.type === 'text_image') {
                    contentHtml = publicTextHtml ? `${publicTextHtml}<div style="margin-top:10px;"><img src="https://i.postimg.cc/KYr2qRCK/1.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}"></div>` : `<img src="https://i.postimg.cc/KYr2qRCK/1.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}">`;
                } else if (post.type === 'realimag') {
                    // RealImag真实图片动态渲染（支持多图布局）
                    const imageUrls = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

                    if (imageUrls.length > 0) {
                        const imageCount = imageUrls.length;
                        let imagesHtml = '';

                        // 使用统一的多图布局（包括单张图片）
                        imagesHtml = `<div class="post-images-grid grid-${imageCount}">`;
                        imageUrls.forEach((url, index) => {
                            imagesHtml += `<img src="${url}" class="realimag-image" alt="图片${index + 1}" loading="lazy" onerror="this.src='https://i.postimg.cc/KYr2qRCK/1.jpg'; this.alt='图片加载失败';">`;
                        });
                        imagesHtml += '</div>';

                        contentHtml = publicTextHtml ? `${publicTextHtml}${imagesHtml}` : imagesHtml;
                    }
                } else if (post.type === 'naiimag') {
                    // NovelAI图片动态渲染（支持多图布局，最多2张）
                    const imageUrls = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

                    if (imageUrls.length > 0) {
                        const imageCount = imageUrls.length;
                        let imagesHtml = '';

                        // 使用统一的多图布局（包括单张图片）
                        imagesHtml = `<div class="post-images-grid grid-${imageCount}">`;
                        imageUrls.forEach((url, index) => {
                            imagesHtml += `<img src="${url}" class="naiimag-image" alt="图片${index + 1}" loading="lazy" onerror="this.src='https://i.postimg.cc/KYr2qRCK/1.jpg'; this.alt='图片加载失败';">`;
                        });
                        imagesHtml += '</div>';

                        contentHtml = publicTextHtml ? `${publicTextHtml}${imagesHtml}` : imagesHtml;
                    }
                }

                // 1. 构造点赞区域的HTML
                let likesHtml = '';
                // 检查 post 对象中是否存在 likes 数组并且不为空
                if (post.likes && post.likes.length > 0) {
                    // 如果存在，就创建点赞区域的 div
                    likesHtml = `
                            <div class="post-likes-section">
                                <svg class="like-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                <span>${post.likes.join('、')} 觉得很赞</span>
                            </div>`;
                }

                // 2. 构造评论区域的HTML
                let commentsHtml = '';
                // 检查 post 对象中是否存在 comments 数组并且不为空
                if (post.comments && post.comments.length > 0) {
                    // 如果存在，就创建评论容器，并遍历每一条评论
                    commentsHtml = '<div class="post-comments-container">';
                    post.comments.forEach((comment) => {
                        commentsHtml += `
                                <div class="comment-item">
                                    <span class="commenter-name">${comment.commenterName}:</span>
                                    <span class="comment-text">${comment.text}</span>
                                </div>`;
                    });
                    commentsHtml += '</div>';
                }

                // 3. 将点赞和评论的HTML组合到 footerHtml 中
                footerHtml = `${likesHtml}${commentsHtml}`;
            } else if (item.type === 'chat_message') {
                const msg = item.content;
                const chat = window.state.chats[item.chatId];
                if (!chat) continue;

                sourceText = `来自与 ${chat.name} 的聊天`;
                const isUser = msg.role === 'user';
                let senderName, senderAvatar;

                if (isUser) {
                    // 用户消息
                    senderName = chat.isGroup ? chat.settings.myNickname || '我' : '我';
                    senderAvatar = chat.settings.myAvatar || (chat.isGroup ? defaultMyGroupAvatar : defaultAvatar);
                } else {
                    // AI/成员消息
                    if (chat.isGroup) {
                        const member = chat.members.find((m) => m.originalName === msg.senderName);

                        // 如果找到了成员信息，就用他的“群昵称”；如果没找到，就还是用消息里的名字作为备用。
                        const senderDisplayName = member ? member.groupNickname : msg.senderName || '未知成员';

                        senderAvatar = member ? member.avatar : defaultGroupMemberAvatar;
                        senderName = senderDisplayName; // 使用处理后的显示名称
                    } else {
                        // 单聊的逻辑保持不变
                        senderName = chat.name;
                        senderAvatar = chat.settings.aiAvatar || defaultAvatar;
                    }
                }

                headerHtml = `<img src="${senderAvatar}" class="avatar"><div class="info"><div class="name">${senderName}</div></div>`;

                if (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content)) {
                    contentHtml = `<img src="${msg.content}" class="sticker-image" style="max-width: 80px; max-height: 80px;">`;
                } else if (Array.isArray(msg.content) && msg.content[0]?.type === 'image_url') {
                    contentHtml = `<img src="${msg.content[0].image_url.url}" class="chat-image">`;
                } else {
                    const messageText = String(msg.content || '');
                    // 侦测格式：[sticker:名字]
                    const stickerMatch = messageText.match(/\[sticker:\s*(.+?)\s*\]/i);

                    if (stickerMatch) {
                        // 如果匹配成功，提取出名字
                        const stickerName = stickerMatch[1].trim();
                        // 在所有可能的表情库里查找（用户的、角色的专属、角色的通用）
                        const allStickers = [...window.state.userStickers, ...window.state.charStickers, ...(chat.settings.stickerLibrary || [])];
                        const foundSticker = allStickers.find((s) => s.name === stickerName);

                        if (foundSticker) {
                            // 如果找到了，就显示图片！
                            contentHtml = `<img src="${foundSticker.url}" alt="${foundSticker.name}" class="sticker-image">`;
                        } else {
                            // 如果没找到，就还是按普通文字显示
                            contentHtml = messageText.replace(/\n/g, '<br>');
                        }
                    } else {
                        // 如果不匹配，就是普通的文本消息
                        contentHtml = messageText.replace(/\n/g, '<br>');
                    }
                }
            }

            card.innerHTML = `
                    <div class="fav-card-header">${headerHtml}<div class="source">${sourceText}</div></div>
                    <div class="fav-card-content">${contentHtml}</div>
                    ${footerHtml}`;

            listEl.appendChild(card);
        }
    }

    /**
     * 负责准备数据并触发渲染
     */
    async function renderFavoritesScreen() {
        // 1. 从数据库获取最新数据并缓存
        if (window.db && window.db.favorites) {
            allFavoriteItems = await window.db.favorites.orderBy('timestamp').reverse().toArray();
        } else {
            allFavoriteItems = [];
        }

        // 2. 清空搜索框并隐藏清除按钮
        const searchInput = document.getElementById('favorites-search-input');
        const clearBtn = document.getElementById('favorites-search-clear-btn');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        // 3. 显示所有收藏项
        displayFilteredFavorites(allFavoriteItems);
    }

    // 初始化收藏模块的事件监听器
    function initFavoritesModule() {
        // 收藏搜索功能
        const searchInput = document.getElementById('favorites-search-input');
        const searchClearBtn = document.getElementById('favorites-search-clear-btn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();

                // 控制清除按钮显示
                if (searchTerm.length > 0) {
                    searchClearBtn.style.display = 'block';
                } else {
                    searchClearBtn.style.display = 'none';
                }

                const filteredItems = allFavoriteItems.filter((item) => {
                    let contentToSearch = '';
                    let authorToSearch = '';

                    if (item.type === 'qzone_post') {
                        // 动态：搜索正文、作者昵称
                        const post = item.content;
                        contentToSearch = (post.content || '') + (post.publicText || '');

                        if (post.authorId === 'user') {
                            if (window.state.qzoneSettings) authorToSearch = window.state.qzoneSettings.nickname;
                        } else if (window.state.chats[post.authorId]) {
                            authorToSearch = window.state.chats[post.authorId].name;
                        } else {
                            authorToSearch = '未知用户';
                        }
                    } else if (item.type === 'chat_message') {
                        // 聊天记录：搜索消息内容、发送者
                        const msg = item.content;
                        const chat = window.state.chats[item.chatId];
                        if (chat) {
                            if (typeof msg.content === 'string') {
                                contentToSearch = msg.content;
                            }
                            // 发送者名字较为复杂，这里简化搜索逻辑，搜索聊天对象名或“我”
                            authorToSearch = chat.name + (chat.isGroup ? ' 群' : '');
                        }
                    }

                    // 同时搜索内容和作者，并且不区分大小写
                    return contentToSearch.toLowerCase().includes(searchTerm) || authorToSearch.toLowerCase().includes(searchTerm);
                });

                displayFilteredFavorites(filteredItems);
            });
        }

        // 清除按钮的点击事件
        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                searchClearBtn.style.display = 'none';
                displayFilteredFavorites(allFavoriteItems);
            });
        }

        // 为聊天界面的批量收藏按钮绑定事件
        const selectionFavoriteBtn = document.getElementById('selection-favorite-btn');
        if (selectionFavoriteBtn) {
            selectionFavoriteBtn.addEventListener('click', async () => {
                // 需要获取全局的selectedMessages
                // 注意：selectedMessages 是在 main-app.js 中定义的全局变量
                // 我们假设在 favorites.js 中无法直接访问 main-app.js 的非window变量
                // 但是DOM元素事件是共享的。 
                // 修正：main-app.js 中的 selectedMessages 是一个 Set，如果没有暴露到 window，我们这里无法获取。
                // 因此，我们必须假设 selectedMessages 已经被暴露到了 window.selectedMessages，或者我们保留这段逻辑在 main-app.js 并只调用 helper？
                // 考虑到用户要求“全部事件监听器”都整理移动，说明 main-app.js 中应该不再保留相关逻辑。
                // 这是一个潜在问题。我们需要在 main-app.js 移除的地方，把 selectedMessages 暴露给 window。

                // 暂时假设 window.selectedMessages 可用，或者使用 document.querySelectorAll 获取选中态
                // 更好的方式是查找 DOM 中被选中的消息气泡

                const selectedBubbles = document.querySelectorAll('.message-bubble.multiselect-selected');
                const timestampsToFavorite = Array.from(selectedBubbles).map(el => parseInt(el.closest('.chat-message').dataset.timestamp));

                if (timestampsToFavorite.length === 0) return;

                const chat = window.state.chats[window.state.activeChatId];
                if (!chat) return;

                const favoritesToAdd = [];

                for (const timestamp of timestampsToFavorite) {
                    // 使用索引查询避免重复 (需要 async await)
                    const existing = await window.db.favorites.where('originalTimestamp').equals(timestamp).first();

                    if (!existing) {
                        const messageToSave = chat.history.find((msg) => msg.timestamp === timestamp);
                        if (messageToSave) {
                            favoritesToAdd.push({
                                type: 'chat_message',
                                content: messageToSave,
                                chatId: window.state.activeChatId,
                                timestamp: Date.now(), // 这是收藏操作发生的时间
                                originalTimestamp: messageToSave.timestamp, // 保存原始消息的时间戳到新字段
                            });
                        }
                    }
                }

                if (favoritesToAdd.length > 0) {
                    await window.db.favorites.bulkAdd(favoritesToAdd);
                    // 更新全局收藏缓存
                    if (window.db.favorites) {
                        allFavoriteItems = await window.db.favorites.orderBy('timestamp').reverse().toArray();
                    }
                    if (window.showCustomAlert) await window.showCustomAlert('收藏成功', `已成功收藏 ${favoritesToAdd.length} 条消息。`);
                } else {
                    if (window.showCustomAlert) await window.showCustomAlert('提示', '选中的消息均已收藏过。');
                }

                // 退出选择模式 (需调用全局函数 exitSelectionMode)
                if (window.exitSelectionMode) window.exitSelectionMode();
            });
        }

        // 收藏页面的"编辑"按钮事件
        const favoritesEditBtn = document.getElementById('favorites-edit-btn');
        const favoritesView = document.getElementById('favorites-view');
        const favoritesActionBar = document.getElementById('favorites-action-bar');
        const mainBottomNav = document.getElementById('chat-list-bottom-nav'); // 获取主导航栏
        const favoritesList = document.getElementById('favorites-list'); // 获取收藏列表

        if (favoritesEditBtn) {
            favoritesEditBtn.addEventListener('click', () => {
                isFavoritesSelectionMode = !isFavoritesSelectionMode;
                if (favoritesView) favoritesView.classList.toggle('selection-mode', isFavoritesSelectionMode);

                if (isFavoritesSelectionMode) {
                    // --- 进入编辑模式 ---
                    favoritesEditBtn.textContent = '完成';
                    if (favoritesActionBar) favoritesActionBar.style.display = 'block'; // 显示删除操作栏
                    if (mainBottomNav) mainBottomNav.style.display = 'none'; // 隐藏主导航栏
                    if (favoritesList) favoritesList.style.paddingBottom = '80px'; // 给列表底部增加空间
                } else {
                    // --- 退出编辑模式 ---
                    favoritesEditBtn.textContent = '编辑';
                    if (favoritesActionBar) favoritesActionBar.style.display = 'none'; // 隐藏删除操作栏
                    if (mainBottomNav) mainBottomNav.style.display = 'flex'; // 恢复主导航栏
                    if (favoritesList) favoritesList.style.paddingBottom = ''; // 恢复列表默认padding

                    // 退出时清空所有选择
                    selectedFavorites.clear();
                    document.querySelectorAll('.favorite-item-card.selected').forEach((card) => card.classList.remove('selected'));
                    const deleteBtn = document.getElementById('favorites-delete-selected-btn');
                    if (deleteBtn) deleteBtn.textContent = `删除 (0)`;
                }
            });
        }

        // 收藏列表的点击选择事件 (事件委托)
        if (favoritesList) {
            favoritesList.addEventListener('click', (e) => {
                const target = e.target;
                const card = target.closest('.favorite-item-card');

                // 处理文字图点击，这段逻辑要放在最前面，保证任何模式下都生效
                if (target.tagName === 'IMG' && target.dataset.hiddenText) {
                    const hiddenText = target.dataset.hiddenText;
                    if (window.showCustomAlert) showCustomAlert('图片内容', hiddenText.replace(/<br>/g, '\n'));
                    return; // 处理完就退出，不继续执行选择逻辑
                }

                // 如果不在选择模式，则不执行后续的选择操作
                if (!isFavoritesSelectionMode) return;

                // --- 以下是原有的选择逻辑，保持不变 ---
                if (!card) return;

                const favId = parseInt(card.dataset.favid);
                if (isNaN(favId)) return;

                // 切换选择状态
                if (selectedFavorites.has(favId)) {
                    selectedFavorites.delete(favId);
                    card.classList.remove('selected');
                } else {
                    selectedFavorites.add(favId);
                    card.classList.add('selected');
                }

                // 更新底部删除按钮的计数
                const deleteBtn = document.getElementById('favorites-delete-selected-btn');
                if (deleteBtn) deleteBtn.textContent = `删除 (${selectedFavorites.size})`;
            });
        }

        // 收藏页面批量删除按钮事件
        const deleteSelectedBtn = document.getElementById('favorites-delete-selected-btn');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', async () => {
                if (selectedFavorites.size === 0) return;

                let confirmed = true;
                if (window.showCustomConfirm) {
                    confirmed = await window.showCustomConfirm('确认删除', `确定要从收藏夹中移除这 ${selectedFavorites.size} 条内容吗？`, { confirmButtonClass: 'btn-danger' });
                }

                if (confirmed) {
                    const idsToDelete = [...selectedFavorites];
                    if (window.db && window.db.favorites) {
                        await window.db.favorites.bulkDelete(idsToDelete);
                    }
                    if (window.showCustomAlert) await window.showCustomAlert('删除成功', '选中的收藏已被移除。');

                    // 从前端缓存中也移除被删除的项
                    allFavoriteItems = allFavoriteItems.filter((item) => !idsToDelete.includes(item.id));

                    // 使用更新后的缓存，立即重新渲染列表
                    displayFilteredFavorites(allFavoriteItems);

                    // 最后，再退出编辑模式
                    if (favoritesEditBtn) favoritesEditBtn.click(); // 模拟点击"完成"按钮来退出编辑模式
                }
            });
        }
    }

    // 暴露给全局
    window.renderFavoritesScreen = renderFavoritesScreen;
    window.initFavoritesModule = initFavoritesModule;
    window.exitFavoritesSelectionMode = function () {
        if (isFavoritesSelectionMode) {
            const favoritesEditBtn = document.getElementById('favorites-edit-btn');
            if (favoritesEditBtn) {
                favoritesEditBtn.click();
            } else {
                // Fallback if button not found, though clicking button handles UI best
                isFavoritesSelectionMode = false;
                selectedFavorites.clear();
                const favoritesView = document.getElementById('favorites-view');
                if (favoritesView) favoritesView.classList.remove('selection-mode');
            }
        }
    };
    // 暴露 displayFilteredFavorites 供调试或外部调用 (可选)
    window.displayFilteredFavorites = displayFilteredFavorites;

})(); // 结束 IIFE
