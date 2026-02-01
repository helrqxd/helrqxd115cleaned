document.addEventListener('DOMContentLoaded', () => {
    console.log('XHS App Script Loaded');

    /* =========================================
        1. 核心变量与选择器
       ========================================= */
    const xhsAppIcon = document.getElementById('xhs-app-icon');
    const xhsScreen = document.getElementById('xhs-screen');

    // 底部导航
    const bottomNavItems = document.querySelectorAll('#xhs-screen .xhs-bottom-nav .xhs-nav-item');
    const createBtn = document.querySelector('#xhs-screen .xhs-bottom-nav .xhs-create-btn');
    const createView = document.getElementById('xhs-create-view');

    // 视图
    const views = {
        home: document.getElementById('xhs-home-view'),
        message: document.getElementById('xhs-message-view'),
        profile: document.getElementById('xhs-profile-view'),
        noteDetail: document.getElementById('xhs-note-detail-view'), // 详情页视图
        video: null
    };

    // 顶部导航
    const topTabItems = document.querySelectorAll('.xhs-top-tabs .tab-item');
    const feeds = {
        discover: document.getElementById('xhs-discover-feed'),
        follow: document.getElementById('xhs-follow-feed'),
        local: null
    };

    // 顶部按钮
    const homeBackBtn = document.querySelector('#xhs-home-view .xhs-back-btn');
    const homeSearchIcon = document.querySelector('#xhs-home-view .xhs-search-icon');
    const searchView = document.getElementById('xhs-search-view');

    // 刷新按钮
    const refreshBtn = document.getElementById('xhs-refresh-btn');
    const deleteAllBtn = document.getElementById('xhs-delete-all-btn'); // 新增：删除所有按钮
    // 详情页返回按钮
    const detailBackBtn = document.getElementById('xhs-detail-back-btn');

    // 个人中心相关
    const profileMenuBtn = document.getElementById('xhs-profile-menu-btn');
    const profileSettingsModal = document.getElementById('xhs-profile-settings-modal');
    const appSettingsBtn = document.getElementById('xhs-app-settings-btn');
    const appSettingsModal = document.getElementById('xhs-app-settings-modal');
    const bioTextEl = document.getElementById('xhs-my-bio');

    // 自动刷新定时器
    let xhsAutoRefreshTimer = null;

    function startXhsAutoRefresh() {
        if (xhsAutoRefreshTimer) {
            clearInterval(xhsAutoRefreshTimer);
            xhsAutoRefreshTimer = null;
        }

        // 预防 state 未初始化导致的 Uncaught TypeError
        if (!window.state || !window.state.xhsSettings) {
            // 环境未准备好，延迟重试
            console.warn('[XHS] State not ready, retrying auto refresh in 2s...');
            setTimeout(startXhsAutoRefresh, 2000);
            return;
        }

        const s = window.state.xhsSettings;
        if (s && s.enableAutoRefresh) {
            const interval = (s.autoRefreshInterval || 60) * 1000;
            console.log(`[XHS] 开启自动刷新，间隔: ${interval}ms`);
            xhsAutoRefreshTimer = setInterval(async () => {
                console.log("[XHS] 自动刷新触发");
                const success = await generateXhsNotes(true);

                if (success) {
                    const screen = document.getElementById('xhs-screen');
                    // 如果不在小红书界面，显示通知
                    if (!screen || !screen.classList.contains('active')) {
                        showXhsNotification("小红书", "发现页有新的内容更新啦！");
                    }
                }
            }, interval);
        }
    }
    /* =========================================
        2. 工具函数：时间格式化 & 长按 & 弹窗
       ========================================= */

    // 将时间戳格式化为 "MM-DD HH:mm"
    function formatXhsDate(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return `${m}-${day} ${h}:${min}`;
    }

    // ★ 小红书专用通知
    function showXhsNotification(title, message) {
        if (window.playNotificationSound) window.playNotificationSound();

        const bar = document.getElementById("notification-bar");
        if (!bar) return;

        const avatarEl = document.getElementById("notification-avatar");
        const contentEl = document.getElementById("notification-content");

        // 使用小红书图标
        if (avatarEl) avatarEl.src = "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/cc/13/20/cc13205d-308c-5633-d956-2960d0c75476/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/230x0w.webp";

        if (contentEl) {
            contentEl.querySelector(".name").textContent = title;
            contentEl.querySelector(".message").textContent = message;
        }

        const newBar = bar.cloneNode(true);
        bar.parentNode.replaceChild(newBar, bar);

        newBar.addEventListener("click", () => {
            if (window.showScreen) {
                window.showScreen('xhs-screen');
                // 尝试切换到首页
                const homeTab = document.querySelector('#xhs-screen .xhs-bottom-nav .xhs-nav-item:first-child');
                if (homeTab) homeTab.click();
            }
            newBar.classList.remove("visible");
        });

        newBar.classList.add("visible");

        setTimeout(() => {
            newBar.classList.remove("visible");
        }, 5000);
    }

    // 自定义确认弹窗
    function showXhsConfirm(message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'xhs-confirm-modal';

        modal.innerHTML = `
            <div class="xhs-confirm-content">
                <div class="xhs-confirm-message">
                    ${message}
                </div>
                <div class="xhs-confirm-actions">
                    <button id="xhs-confirm-cancel" class="xhs-confirm-btn xhs-confirm-cancel">取消</button>
                    <div class="xhs-confirm-divider"></div>
                    <button id="xhs-confirm-ok" class="xhs-confirm-btn xhs-confirm-ok">删除</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 动画
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });

        const close = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 200);
        };

        modal.querySelector('#xhs-confirm-cancel').onclick = close;
        modal.querySelector('#xhs-confirm-ok').onclick = () => {
            close();
            onConfirm();
        };
    }

    // 绑定长按事件 (区分点击和长按)
    function bindLongPress(element, onLongPress, onClick, enableEffect = true) {
        let timer;
        let isLongPress = false;
        let isScrolling = false;
        let startX, startY;

        const start = (e) => {
            isLongPress = false;
            isScrolling = false;
            // 记录触摸起始位置，用于判断滑动
            if (e.touches) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            timer = setTimeout(() => {
                if (isScrolling) return;

                isLongPress = true;
                if (enableEffect) {
                    if (navigator.vibrate) navigator.vibrate(50); // 震动反馈
                    // 添加按压效果
                    element.style.transform = 'scale(0.95)';
                    element.style.transition = 'transform 0.1s';
                }

                onLongPress();

                if (enableEffect) {
                    // 恢复按压效果
                    setTimeout(() => {
                        element.style.transform = '';
                    }, 200);
                }
            }, 600); // 600ms 判定为长按
        };

        const cancel = () => {
            clearTimeout(timer);
            if (enableEffect) {
                element.style.transform = ''; // 恢复样式
            }
        };

        const move = (e) => {
            if (!startX) return;
            let x, y;
            if (e.touches) {
                x = e.touches[0].clientX;
                y = e.touches[0].clientY;
            } else {
                x = e.clientX;
                y = e.clientY;
            }

            // 如果移动超过 10px，视为滑动，取消长按
            if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) {
                isScrolling = true;
                cancel();
            }
        };

        // 触摸事件
        element.addEventListener('touchstart', start, { passive: true });
        element.addEventListener('touchend', (e) => {
            cancel();
            if (!isLongPress && !isScrolling && onClick) {
                // 阻止点击穿透：如果触发了自定义点击事件，阻止默认的 click 事件
                if (e.cancelable) e.preventDefault();
                onClick(e); // 如果不是长按，触发点击
            }
        });
        element.addEventListener('touchmove', move, { passive: true });

        // 鼠标事件 (PC调试用)
        element.addEventListener('mousedown', start);
        element.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) move(e);
        });
        element.addEventListener('mouseup', (e) => {
            cancel();
            if (!isLongPress && !isScrolling && onClick) {
                onClick(e);
            }
        });
        element.addEventListener('mouseleave', cancel);
    }

    /* =========================================
        3. 数据渲染逻辑 (Profile & Settings)
       ========================================= */

    window.renderXhsProfile = function () {
        if (!window.state || !window.state.xhsSettings) return;
        const s = window.state.xhsSettings;

        // 如果缺少字段则初始化
        if (!s.likedNoteIds) s.likedNoteIds = [];
        if (!s.collectedNoteIds) s.collectedNoteIds = [];
        if (!s.collectionFolders) {
            s.collectionFolders = [
                { id: 'default', name: '默认收藏夹', cover: '', noteIds: [] }
            ];
        }

        // 基础信息
        const avatarEl = document.getElementById('xhs-my-avatar');
        if (avatarEl) avatarEl.src = s.avatar || "https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg";
        const nameEl = document.getElementById('xhs-my-name');
        if (nameEl) nameEl.textContent = s.nickname || "MOMO";
        const idEl = document.getElementById('xhs-my-id-display');
        if (idEl) idEl.textContent = s.xhsId || "123456789";
        const bioEl = document.getElementById('xhs-my-bio');
        if (bioEl) bioEl.textContent = s.desc || "点击编辑简介，让大家更了解你";

        // 数据统计
        const followEl = document.getElementById('xhs-stat-follow');
        if (followEl) followEl.textContent = s.followCount || "0";
        const fansEl = document.getElementById('xhs-stat-fans');
        if (fansEl) fansEl.textContent = s.fansCount || "0";
        const likesEl = document.getElementById('xhs-stat-likes');
        if (likesEl) likesEl.textContent = s.likesCount || "0";

        // 渲染标签
        const tagsContainer = document.getElementById('xhs-my-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            const tags = s.tags || ["双子座", "广东"];
            tags.forEach(tag => {
                const tagEl = document.createElement('div');
                tagEl.className = 'xhs-tag';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });
        }

        // 绑定标签页切换事件
        const tabs = document.querySelectorAll('.xhs-profile-tab');
        tabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', () => {
                const target = newTab.dataset.tab;
                switchXhsProfileTab(target);
            });
        });

        // 初始渲染当前激活的标签页
        const activeTab = document.querySelector('.xhs-profile-tab.active');
        if (activeTab) {
            switchXhsProfileTab(activeTab.dataset.tab);
        } else {
            switchXhsProfileTab('notes');
        }
    };

    window.switchXhsProfileTab = function (tabName) {
        document.querySelectorAll('.xhs-profile-tab').forEach(t => {
            if (t.dataset.tab === tabName) t.classList.add('active');
            else t.classList.remove('active');
        });

        document.getElementById('xhs-my-notes-grid').style.display = 'none';
        document.getElementById('xhs-my-collections-grid').style.display = 'none';
        document.getElementById('xhs-my-likes-grid').style.display = 'none';

        if (tabName === 'notes') {
            document.getElementById('xhs-my-notes-grid').style.display = 'block';
        } else if (tabName === 'collects') {
            document.getElementById('xhs-my-collections-grid').style.display = 'block';
        } else if (tabName === 'likes') {
            document.getElementById('xhs-my-likes-grid').style.display = 'block';
        }

        renderXhsProfileContent(tabName);
    };

    async function syncCollectionCover(folder) {
        let changed = false;
        if (!folder.noteIds) folder.noteIds = [];

        // 1. 清理无效ID（已删除的笔记）
        if (window.db && window.db.xhsNotes) {
            const validIds = [];
            for (const id of folder.noteIds) {
                const note = await window.db.xhsNotes.get(id);
                if (note) validIds.push(id);
            }

            if (validIds.length !== folder.noteIds.length) {
                folder.noteIds = validIds;
                changed = true;
            }
        }

        // 2. 根据最后一条有效笔记更新封面
        if (folder.noteIds.length === 0) {
            if (folder.cover !== '') {
                folder.cover = '';
                changed = true;
            }
        } else {
            const lastId = folder.noteIds[folder.noteIds.length - 1];
            if (window.db && window.db.xhsNotes) {
                const note = await window.db.xhsNotes.get(lastId);
                if (note && folder.cover !== note.imageUrl) {
                    folder.cover = note.imageUrl;
                    changed = true;
                }
            }
        }
        return changed;
    }

    window.renderXhsProfileContent = async function (tabName) {
        if (!window.db || !window.db.xhsNotes) return;
        const s = window.state.xhsSettings;
        const allNotes = await window.db.xhsNotes.toArray();

        if (tabName === 'notes') {
            const container = document.getElementById('xhs-my-notes-grid');
            container.innerHTML = '';
            const myNotes = allNotes.filter(n => n.authorName === s.nickname);

            if (myNotes.length === 0) {
                container.classList.remove('xhs-waterfall');
                container.classList.add('xhs-grid-empty-container');
                container.innerHTML = '<div class="xhs-empty-state"><p>发布你的第一篇笔记吧</p></div>';
                if (container.parentElement) container.parentElement.classList.add('xhs-no-scroll');
                return;
            }
            if (container.parentElement) container.parentElement.classList.remove('xhs-no-scroll');

            // 使用新的瀑布流渲染
            renderWaterfall(container, myNotes, createXhsCard);

        } else if (tabName === 'collects') {
            const container = document.getElementById('xhs-my-collections-grid');
            container.innerHTML = '';
            const folders = s.collectionFolders || [];

            // 渲染前同步封面
            let settingsChanged = false;
            for (const folder of folders) {
                if (await syncCollectionCover(folder)) {
                    settingsChanged = true;
                }
            }
            if (settingsChanged) {
                await saveXhsSettings({});
            }

            if (folders.length === 0) {
                container.classList.remove('xhs-waterfall');
                container.classList.add('xhs-grid-empty-container');
                container.innerHTML = '<div class="xhs-empty-state"><p>还没有创建收藏夹</p></div>';
                if (container.parentElement) container.parentElement.classList.add('xhs-no-scroll');
                return;
            }
            if (container.parentElement) container.parentElement.classList.remove('xhs-no-scroll');

            // 使用新的瀑布流渲染 (文件夹列表)
            renderWaterfall(container, folders, (folder) => {
                const folderEl = document.createElement('div');
                folderEl.className = 'xhs-collection-folder';

                if (folder.cover) {
                    folderEl.style.backgroundImage = `url(${folder.cover})`;
                } else {
                    folderEl.innerHTML = '<div class="xhs-collection-folder-empty">无封面</div>';
                }

                const nameEl = document.createElement('div');
                nameEl.textContent = folder.name;
                nameEl.className = 'xhs-collection-folder-name';
                folderEl.appendChild(nameEl);

                const countEl = document.createElement('div');
                countEl.textContent = `${folder.noteIds.length} 篇`;
                countEl.className = 'xhs-collection-folder-count';
                folderEl.appendChild(countEl);

                // 长按重命名或删除
                bindLongPress(folderEl, () => {
                    if (folder.id === 'default') {
                        const toast = document.createElement('div');
                        toast.textContent = '默认收藏夹不可修改';
                        toast.className = 'xhs-toast';
                        document.body.appendChild(toast);
                        setTimeout(() => document.body.removeChild(toast), 2000);
                        return;
                    }

                    // 显示操作菜单
                    const overlay = document.createElement('div');
                    overlay.className = 'xhs-menu-overlay';

                    const menu = document.createElement('div');
                    menu.className = 'xhs-menu-box';

                    const title = document.createElement('div');
                    title.textContent = `管理收藏夹: ${folder.name}`;
                    title.className = 'xhs-menu-title';
                    menu.appendChild(title);

                    const renameBtn = document.createElement('button');
                    renameBtn.textContent = '重命名';
                    renameBtn.className = 'xhs-menu-btn xhs-menu-btn-rename';
                    renameBtn.onclick = async () => {
                        const newName = prompt('请输入新名称', folder.name);
                        if (newName && newName.trim() !== '') {
                            folder.name = newName.trim();
                            await saveXhsSettings({});
                            window.renderXhsProfileContent('collects');
                        }
                        document.body.removeChild(overlay);
                    };
                    menu.appendChild(renameBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除收藏夹';
                    deleteBtn.className = 'xhs-menu-btn xhs-menu-btn-delete';
                    deleteBtn.onclick = async () => {
                        if (confirm(`确定要删除收藏夹 "${folder.name}" 吗？\n里面的笔记不会被删除。`)) {
                            const idx = s.collectionFolders.indexOf(folder);
                            if (idx > -1) {
                                s.collectionFolders.splice(idx, 1);

                                // 重新计算已收藏的笔记ID
                                const allCollected = new Set();
                                s.collectionFolders.forEach(f => f.noteIds.forEach(id => allCollected.add(id)));
                                s.collectedNoteIds = Array.from(allCollected);

                                await saveXhsSettings({});
                                window.renderXhsProfileContent('collects');
                            }
                        }
                        document.body.removeChild(overlay);
                    };
                    menu.appendChild(deleteBtn);

                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = '取消';
                    cancelBtn.className = 'xhs-menu-btn-cancel';
                    cancelBtn.onclick = () => document.body.removeChild(overlay);
                    menu.appendChild(cancelBtn);

                    overlay.appendChild(menu);
                    overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
                    document.body.appendChild(overlay);

                }, () => renderCollectionDetail(folder, allNotes));

                return folderEl;
            });

        } else if (tabName === 'likes') {
            const container = document.getElementById('xhs-my-likes-grid');
            container.innerHTML = '';
            // 反转以显示最新内容
            const likedIds = (s.likedNoteIds || []).slice().reverse();
            const noteMap = new Map(allNotes.map(n => [n.id, n]));
            const likedNotes = [];

            likedIds.forEach(id => {
                if (noteMap.has(id)) likedNotes.push(noteMap.get(id));
            });

            if (likedNotes.length === 0) {
                container.classList.remove('xhs-waterfall');
                container.classList.add('xhs-grid-empty-container');
                container.innerHTML = '<div class="xhs-empty-state"><p>还没有赞过笔记哦</p></div>';
                if (container.parentElement) container.parentElement.classList.add('xhs-no-scroll');
                return;
            }
            if (container.parentElement) container.parentElement.classList.remove('xhs-no-scroll');

            // 使用新的瀑布流渲染
            renderWaterfall(container, likedNotes, createXhsCard);
        }
    };

    function createXhsCard(note) {
        const card = document.createElement('div');
        card.className = 'xhs-card';
        card.dataset.noteId = note.id;

        const likeCount = note.stats && note.stats.likes ? note.stats.likes : 0;

        // 检查是否已点赞
        const s = window.state.xhsSettings;
        const isLiked = s && s.likedNoteIds && s.likedNoteIds.includes(note.id);
        const heartFill = isLiked ? '#ff2442' : 'none';
        const heartStroke = isLiked ? '#ff2442' : '#666';

        card.innerHTML = `
            <div class="xhs-card-img-wrap">
                <img src="${note.imageUrl}" class="xhs-card-img" loading="lazy">
            </div>
            <div class="xhs-card-footer">
                <div class="xhs-card-title">${note.title}</div>
                <div class="xhs-card-user">
                    <div class="xhs-user-info-mini">
                        <img src="${note.authorAvatar}" class="xhs-avatar-mini">
                        <span>${note.authorName}</span>
                    </div>
                    <div class="xhs-like-wrap">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span>${likeCount}</span>
                    </div>
                </div>
            </div>
        `;

        card.onclick = () => openXhsNoteDetail(note);
        return card;
    }

    function renderCollectionDetail(folder, allNotes) {
        const container = document.getElementById('xhs-my-collections-grid');
        // 移除主容器的瀑布流类，允许头部占据全宽
        container.classList.remove('xhs-waterfall');

        // 重置容器样式，确保 Header 和内容上下排列
        container.className = 'xhs-collection-detail-container';
        container.style.cssText = ''; // 清除可能存在的内联样式

        container.innerHTML = '';

        // 1. 固定头部
        const header = document.createElement('div');
        header.className = 'xhs-collection-header';
        header.innerHTML = `<span class="xhs-collection-back-btn">🔙</span> <b class="xhs-collection-title">${folder.name}</b>`;
        header.querySelector('span').onclick = () => switchXhsProfileTab('collects');
        container.appendChild(header);

        // 2. 滚动区域 (填充剩余空间)
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'xhs-collection-scroll-wrapper';
        container.appendChild(scrollWrapper);

        // 3. 瀑布流容器 (放入滚动区域)
        const notesGrid = document.createElement('div');
        scrollWrapper.appendChild(notesGrid);

        // 反转ID列表以显示最新内容
        const noteIds = (folder.noteIds || []).slice().reverse();
        const noteMap = new Map(allNotes.map(n => [n.id, n]));
        const notes = [];

        noteIds.forEach(id => {
            if (noteMap.has(id)) notes.push(noteMap.get(id));
        });

        if (notes.length === 0) {
            // 清空瀑布流容器，直接在滚动区域显示空状态
            notesGrid.style.display = 'none';
            scrollWrapper.classList.add('xhs-no-scroll');
            const empty = document.createElement('div');
            empty.className = 'xhs-empty-state';
            empty.innerHTML = '<p>收藏夹为空</p>';
            scrollWrapper.appendChild(empty);
        } else {
            scrollWrapper.classList.remove('xhs-no-scroll');
            // 使用新的瀑布流渲染
            renderWaterfall(notesGrid, notes, createXhsCard);
        }
    } window.toggleXhsLike = async function (noteId) {
        if (!window.state.xhsSettings) return;
        const s = window.state.xhsSettings;
        if (!s.likedNoteIds) s.likedNoteIds = [];

        const index = s.likedNoteIds.indexOf(noteId);
        let isLiked = false;

        if (index > -1) {
            s.likedNoteIds.splice(index, 1);
            isLiked = false;
        } else {
            s.likedNoteIds.push(noteId);
            isLiked = true;
        }

        await saveXhsSettings({}); // 保存设置

        // 更新笔记统计数据
        if (window.db && window.db.xhsNotes) {
            const note = await window.db.xhsNotes.get(noteId);
            if (note) {
                if (!note.stats) note.stats = { likes: 0, collects: 0, comments: 0 };
                note.stats.likes += isLiked ? 1 : -1;
                if (note.stats.likes < 0) note.stats.likes = 0;
                await window.db.xhsNotes.put(note);

                // 更新UI
                const likeCountEl = document.getElementById('xhs-detail-like-count');
                if (likeCountEl) likeCountEl.textContent = note.stats.likes;
            }
        }

        // 更新按钮样式
        const btn = document.getElementById('xhs-detail-like-btn');
        if (btn) {
            const svg = btn.querySelector('svg');
            if (isLiked) {
                svg.setAttribute('fill', '#ff2442');
                svg.setAttribute('stroke', '#ff2442');
            } else {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', '#333');
            }
        }
    };

    window.renderCollectionModal = async function (noteId) {
        const modal = document.getElementById('xhs-collection-modal');
        const list = document.getElementById('xhs-collection-list');
        const createBtn = document.getElementById('xhs-create-collection-btn');
        const closeBtn = modal.querySelector('.close-btn');

        modal.style.display = 'block';
        modal.style.zIndex = '2000'; // 确保在详情页(z-index: 1000)之上

        const renderList = () => {
            list.innerHTML = '';
            const folders = window.state.xhsSettings.collectionFolders || [];

            folders.forEach(folder => {
                const item = document.createElement('div');
                item.className = 'xhs-collection-item';

                const cover = folder.cover ? `<img src="${folder.cover}" class="xhs-collection-cover-img">` : `<div class="xhs-collection-cover-placeholder"></div>`;

                const isCollected = folder.noteIds.includes(noteId);
                const checkMark = isCollected ? '<span class="xhs-collection-checkmark">✔</span>' : '';

                item.innerHTML = `
                    ${cover}
                    <div class="xhs-collection-info">
                        <div class="xhs-collection-name">${folder.name}</div>
                        <div class="xhs-collection-count">${folder.noteIds.length} 篇</div>
                    </div>
                    ${checkMark}
                `;

                item.onclick = async () => {
                    if (isCollected) {
                        // 从文件夹移除
                        const idx = folder.noteIds.indexOf(noteId);
                        if (idx > -1) folder.noteIds.splice(idx, 1);
                    } else {
                        // 添加到文件夹
                        folder.noteIds.push(noteId);
                    }

                    // 更新封面逻辑：始终使用最后收藏的笔记图片
                    if (folder.noteIds.length > 0) {
                        const lastId = folder.noteIds[folder.noteIds.length - 1];
                        if (window.db && window.db.xhsNotes) {
                            const note = await window.db.xhsNotes.get(lastId);
                            if (note) folder.cover = note.imageUrl;
                        }
                    } else {
                        folder.cover = '';
                    }

                    // 更新全局收藏ID列表
                    const s = window.state.xhsSettings;
                    const allCollected = new Set();
                    s.collectionFolders.forEach(f => f.noteIds.forEach(id => allCollected.add(id)));
                    s.collectedNoteIds = Array.from(allCollected);

                    await saveXhsSettings({});

                    // 更新笔记统计数据
                    if (window.db && window.db.xhsNotes) {
                        const note = await window.db.xhsNotes.get(noteId);
                        if (note) {
                            // 检查是否在任何文件夹中
                            const newInAny = s.collectionFolders.some(f => f.noteIds.includes(noteId));
                            const inOthers = s.collectionFolders.some(f => f !== folder && f.noteIds.includes(noteId));

                            let delta = 0;
                            if (isCollected) { // 从此文件夹移除
                                if (!inOthers) delta = -1; // 仅在此文件夹中，现在不在任何文件夹中。
                            } else { // 添加到此文件夹
                                if (!inOthers) delta = 1; // 原本不在任何文件夹中，现在在此文件夹中。
                            }

                            if (delta !== 0) {
                                note.stats.collects += delta;
                                if (note.stats.collects < 0) note.stats.collects = 0;
                                await window.db.xhsNotes.put(note);
                            }

                            // 更新UI
                            const collectCountEl = document.getElementById('xhs-detail-collect-count');
                            if (collectCountEl) collectCountEl.textContent = note.stats.collects;

                            // 更新按钮样式
                            const btn = document.getElementById('xhs-detail-collect-btn');
                            if (btn) {
                                const svg = btn.querySelector('svg');
                                if (newInAny) {
                                    svg.setAttribute('fill', '#ffb400');
                                    svg.setAttribute('stroke', '#ffb400');
                                } else {
                                    svg.setAttribute('fill', 'none');
                                    svg.setAttribute('stroke', '#333');
                                }
                            }
                        }
                    }

                    renderList();
                };

                list.appendChild(item);
            });
        };

        renderList();

        createBtn.onclick = async () => {
            const name = prompt("请输入收藏夹名称");
            if (name) {
                window.state.xhsSettings.collectionFolders.push({
                    id: Date.now().toString(),
                    name: name,
                    cover: '',
                    noteIds: []
                });
                await saveXhsSettings({});
                renderList();
            }
        };

        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        // 点击外部关闭弹窗
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    };

    async function saveXhsSettings(newSettings) {
        if (!window.state) window.state = {};
        if (!window.state.xhsSettings) window.state.xhsSettings = {};

        window.state.xhsSettings = { ...window.state.xhsSettings, ...newSettings };
        if (window.db && window.db.xhsSettings) {
            await window.db.xhsSettings.put(window.state.xhsSettings);
        }
        // 仅在个人主页显示时重新渲染
        if (document.getElementById('xhs-profile-view').style.display !== 'none') {
            window.renderXhsProfile();
        }
    }

    /* =========================================
        4. 核心功能：加载与显示笔记 (修改后)
       ========================================= */

    async function deleteXhsNote(noteId) {
        if (!window.db || !window.db.xhsNotes) return;

        // 1. 从数据库删除
        await window.db.xhsNotes.delete(noteId);

        // 2. 更新设置（点赞、收藏）
        if (window.state && window.state.xhsSettings) {
            const s = window.state.xhsSettings;
            let changed = false;

            // 从点赞列表中移除
            if (s.likedNoteIds) {
                const idx = s.likedNoteIds.indexOf(noteId);
                if (idx > -1) {
                    s.likedNoteIds.splice(idx, 1);
                    changed = true;
                }
            }

            // 从全局收藏ID列表中移除
            if (s.collectedNoteIds) {
                const idx = s.collectedNoteIds.indexOf(noteId);
                if (idx > -1) {
                    s.collectedNoteIds.splice(idx, 1);
                    changed = true;
                }
            }

            // 从收藏夹中移除
            if (s.collectionFolders) {
                for (const folder of s.collectionFolders) {
                    const idx = folder.noteIds.indexOf(noteId);
                    if (idx > -1) {
                        folder.noteIds.splice(idx, 1);
                        changed = true;

                        // 如果需要更新封面（为简单起见，始终刷新为最后一项）
                        if (folder.noteIds.length > 0) {
                            const lastId = folder.noteIds[folder.noteIds.length - 1];
                            const note = await window.db.xhsNotes.get(lastId);
                            if (note) folder.cover = note.imageUrl;
                        } else {
                            folder.cover = '';
                        }
                    }
                }
            }

            if (changed) {
                await saveXhsSettings({});
            }
        }

        // 3. 刷新视图
        loadXhsNotes(); // 刷新发现页
        if (document.getElementById('xhs-profile-view').style.display !== 'none') {
            window.renderXhsProfile(); // 刷新个人主页（包括统计数据）
        }
    }

    async function loadXhsNotes() {
        if (!window.db || !window.db.xhsNotes) return;

        // 获取所有笔记
        let notes = await window.db.xhsNotes.toArray();

        // 过滤掉搜索生成的临时笔记，不显示在主页
        notes = notes.filter(n => !n.isSearchResult);

        // 排序：未读(isNew=true)在前，然后按时间倒序
        notes.sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            return b.timestamp - a.timestamp;
        });

        renderXhsFeed(notes);
    }

    // 瀑布流渲染辅助函数 (双列 Flex，横向排序：左-右-左-右)
    function renderWaterfall(container, items, renderItemFn) {
        container.innerHTML = '';
        container.classList.add('xhs-waterfall');
        container.style.display = 'flex';
        container.style.height = 'auto';
        container.style.flexDirection = 'row';

        const leftCol = document.createElement('div');
        leftCol.className = 'xhs-waterfall-column';
        const rightCol = document.createElement('div');
        rightCol.className = 'xhs-waterfall-column';

        container.appendChild(leftCol);
        container.appendChild(rightCol);

        items.forEach((item, index) => {
            const el = renderItemFn(item);
            if (el) {
                // 偶数左边，奇数右边 (0->Left, 1->Right)
                if (index % 2 === 0) {
                    leftCol.appendChild(el);
                } else {
                    rightCol.appendChild(el);
                }
            }
        });
    }

    function renderXhsFeed(notes) {
        if (!feeds.discover) return;

        feeds.discover.innerHTML = '';

        if (!notes || notes.length === 0) {
            // 切换为 Flex 布局以居中
            feeds.discover.classList.remove('xhs-waterfall');
            feeds.discover.classList.add('xhs-grid-empty-container');
            feeds.discover.style.cssText = ''; // 清除内联样式

            feeds.discover.innerHTML = `
                <div class="xhs-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="xhs-empty-icon">
                        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path>
                        <path d="M12 8v4"></path>
                        <path d="M12 16h.01"></path>
                    </svg>
                    <p>暂无笔记</p>
                    <p class="xhs-text-refresh">点击右上角刷新图标生成内容</p>
                </div>
            `;
            if (feeds.discover.parentElement) feeds.discover.parentElement.classList.add('xhs-no-scroll');
            return;
        }
        if (feeds.discover.parentElement) feeds.discover.parentElement.classList.remove('xhs-no-scroll');

        // 使用新的瀑布流渲染
        renderWaterfall(feeds.discover, notes, (note) => {
            const card = document.createElement('div');
            card.className = 'xhs-card';
            card.dataset.noteId = note.id;

            // 绑定长按和点击事件
            bindLongPress(
                card,
                // 长按：删除
                () => {
                    showXhsConfirm("确定删除这条笔记吗？", async () => {
                        await deleteXhsNote(note.id);
                    });
                },
                // 点击：打开详情
                () => {
                    openXhsNoteDetail(note);
                }
            );

            const realCommentCount = note.comments ? note.comments.length : 0;
            const likeCount = note.stats && note.stats.likes ? note.stats.likes : 0;

            // 检查是否已点赞
            const s = window.state.xhsSettings;
            const isLiked = s && s.likedNoteIds && s.likedNoteIds.includes(note.id);
            const heartFill = isLiked ? '#ff2442' : 'none';
            const heartStroke = isLiked ? '#ff2442' : '#666';

            // 新内容标记
            const newMarkerHtml = note.isNew ? '<div class="xhs-new-marker">NEW</div>' : '';

            card.innerHTML = `
                <div class="xhs-card-img-wrap xhs-card-img-wrap-ratio">
                    <img src="${note.imageUrl}" class="xhs-card-img xhs-card-img-abs" loading="lazy">
                    ${newMarkerHtml}
                </div>
                <div class="xhs-card-footer">
                    <div class="xhs-card-title">${note.title}</div>
                    <div class="xhs-card-user">
                        <div class="xhs-user-info-mini">
                            <img src="${note.authorAvatar}" class="xhs-avatar-mini">
                            <span>${note.authorName}</span>
                        </div>
                        <div class="xhs-like-wrap">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            <span>${likeCount}</span>
                        </div>
                    </div>
                </div>
            `;
            return card;
        });
    }

    /* =========================================
        5. AI 生成笔记核心逻辑 (保留优化后的时间逻辑)
       ========================================= */

    async function buildXhsGenerationPrompt(character) {
        let charRequirement = "";
        let memoryContext = "";
        let worldBookContext = "";

        if (character) {
            charRequirement = `
            【必选要求】：
            生成的笔记列表中，**必须**有一条笔记是由角色“${character.name}”发布的。
            该角色的设定是：${character.settings.aiPersona}...
            请模仿该角色的语气、口吻和兴趣爱好来撰写这条笔记的内容和标题。
            这条笔记的 "isCharacter" 字段必须为 true，"authorName" 必须为 "${character.name}"。
            `;

            // 1. 角色记忆 (Chat Memory)
            if (window.state.xhsSettings?.enableChatMemory) {
                const chat = window.state.chats[character.id];
                if (chat && chat.history) {
                    const limit = chat.settings?.maxMemory || 20;
                    const recentMsgs = chat.history.slice(-limit);
                    const formattedMsgs = recentMsgs.map(m => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`).join('\n');

                    let linkedMsgs = "";
                    if (chat.settings?.linkedMemories) {
                        const linkDepth = chat.settings.linkMemoryDepth || 5;
                        chat.settings.linkedMemories.forEach(link => {
                            const linkedChat = window.state.chats[link.chatId];
                            if (linkedChat && linkedChat.history) {
                                const lMsgs = linkedChat.history.slice(-linkDepth);
                                linkedMsgs += `\n【关联记忆 (${linkedChat.name})】:\n` + lMsgs.map(m => `${m.role === 'user' ? '用户' : linkedChat.name}: ${m.content}`).join('\n');
                            }
                        });
                    }

                    memoryContext = `
                    【角色记忆与近期经历】：
                    以下是该角色最近的聊天记录，请参考这些内容来决定笔记的主题、心情或提到的事件。
                    ${formattedMsgs}
                    ${linkedMsgs}
                    `;
                }
            }
        } else {
            charRequirement = `（当前未指定特定角色，所有笔记均由随机路人发布）`;
        }

        // 2. 世界书 (World Book)
        const linkedBookIds = window.state.xhsSettings?.linkedWorldBooks;
        if (linkedBookIds && linkedBookIds.length > 0) {
            let booksContent = "";
            let allBooks = window.state.worldBooks || [];
            if (allBooks.length === 0 && window.db && window.db.worldBooks) {
                allBooks = await window.db.worldBooks.toArray();
                window.state.worldBooks = allBooks;
            }

            linkedBookIds.forEach(id => {
                // 确保 ID 类型匹配 (字符串 vs 数字)
                const book = allBooks.find(b => String(b.id) === String(id));
                if (book) {
                    booksContent += `\n《${book.name}》设定:\n${book.content ? book.content.substring(0, 1000) : ''}\n`;
                }
            });

            if (booksContent) {
                worldBookContext = `
                【世界观设定 (World Book)】：
                请确保生成的笔记内容符合以下世界观设定：
                ${booksContent}
                `;
            }
        }

        return `
        你是一个熟练的小红书内容创作者。请生成一个包含 3 到 6 条“小红书笔记”数据的 JSON 对象。

        ${charRequirement}
        ${memoryContext}
        ${worldBookContext}

        【通用要求】：
        1. 其余笔记由随机的“路人”用户发布（请编造多样化的网名）。
        2. 内容风格必须极度符合小红书特点：
            - 标题党，吸引眼球，使用“绝绝子”、“yyds”、“家人”、“集美”等流行语（适度）。
            - 适当使用 Emoji 表情符号（🌟✨💖🔥等）。
            - 相关的 Hashtag 标签（如 #OOTD #探店 #日常）。
            - 语气轻松、活泼、真实。
            - 笔记正文内容"content"字段当中【绝对不允许】包含任何tag标签，无论是否存在于"tag"字段中。
        3. "imagePrompt": 为每条笔记生成一个简短的、描述性的**英文**图片提示词，用于AI生图（例如 "delicious matcha latte art, cozy cafe, realistic"）请注意提示词当中【绝对不允许】出现【人物】。
        4. "stats": 随机生成合理的点赞数（likes）和收藏数（collects）。
        5. "comments": 为每条笔记生成 2-3 条精彩的模拟评论（包含评论者名字和内容）。
        
        【JSON 返回格式（严格遵守）】：
        {
            "notes": [
            {
                "authorName": "Name",
                "isCharacter": true/false, 
                "title": "笔记标题",
                "content": "笔记正文内容...",
                "tags": ["#tag1", "#tag2"],
                "imagePrompt": "english description for visual",
                "stats": { "likes": 123, "collects": 45 },
                "comments": [
                    { "user": "路人A", "text": "评论内容" },
                    { "user": "路人B", "text": "评论内容" }
                ],
                "location": "城市, 地点"
            }
            ]
        }
        请只返回 JSON 数据，不要包含 markdown 代码块标记。
        `;
    }

    async function generateXhsNotes(isAuto = false) {
        if (!refreshBtn && !isAuto) return false;

        if (refreshBtn) refreshBtn.classList.add('spinning');

        try {
            const { proxyUrl, apiKey, model, temperature } = window.state.apiConfig; // 获取 temperature
            if (!proxyUrl || !apiKey || !model) {
                if (!isAuto) alert("请先配置 API 设置！");
                if (refreshBtn) refreshBtn.classList.remove('spinning');
                return false;
            }

            let selectedChar = null;
            const allowedPosters = window.state.xhsSettings?.allowedPosters || [];
            const availableChars = Object.values(window.state.chats).filter(c => !c.isGroup);

            let candidates = availableChars;
            if (allowedPosters.length > 0) {
                candidates = availableChars.filter(c => allowedPosters.includes(c.id));
            }

            if (candidates.length > 0) {
                const randIndex = Math.floor(Math.random() * candidates.length);
                selectedChar = candidates[randIndex];
            }

            const prompt = await buildXhsGenerationPrompt(selectedChar);

            let responseData;
            let isGemini = proxyUrl.includes("googleapis");
            const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8; // 使用配置的 temperature，默认 0.8

            if (isGemini) {
                const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp } // Gemini 需要放在 generationConfig 中
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const json = await res.json();
                responseData = json.candidates[0].content.parts[0].text;
            } else {
                const res = await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt }],
                        temperature: requestTemp // 使用配置的 temperature
                    })
                });
                const json = await res.json();
                responseData = json.choices[0].message.content;
            }

            console.log("[XHS] Raw AI Response:", responseData);

            // 更稳健的 JSON 提取逻辑
            let cleanJson = responseData;
            const jsonMatch = responseData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanJson = jsonMatch[0];
            } else {
                cleanJson = responseData.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            let result;
            try {
                result = JSON.parse(cleanJson);
            } catch (err) {
                console.error("[XHS] JSON Parse Error:", err);
                console.error("[XHS] Cleaned JSON:", cleanJson);
                throw new Error("AI 返回的数据格式不正确");
            }

            if (result && result.notes && Array.isArray(result.notes)) {
                console.log(`[XHS] Generated ${result.notes.length} notes`);
                const now = Date.now();

                await Promise.all(result.notes.map(async (note) => {
                    // 时间逻辑：生成过去24小时内的随机时间戳
                    const randomOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
                    note.timestamp = now - randomOffset;
                    note.dateStr = formatXhsDate(note.timestamp);
                    note.isNew = true; // 标记为新内容

                    // 头像
                    if (note.isCharacter && selectedChar) {
                        note.authorAvatar = selectedChar.settings.aiAvatar || "https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg";
                        note.authorName = selectedChar.name;
                    } else {
                        note.authorAvatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(note.authorName)}`;
                    }

                    // 配图
                    let promptForImage = note.imagePrompt;
                    if (!promptForImage) {
                        // 如果没有提示词，使用标题作为兜底，并确保是英文以获得更好效果
                        promptForImage = `aesthetic lifestyle photo, ${note.title}, high quality, 4k`;
                    }
                    // 使用全局合并后的生图函数
                    note.imageUrl = await window.generatePollinationsImage(promptForImage, {
                        width: 832,
                        height: 1216,
                        nologo: true,
                        model: 'flux'
                    });
                    console.log("[XHS] Image URL generated:", note.imageUrl);

                    // 评论时间逻辑
                    if (note.comments && Array.isArray(note.comments)) {
                        note.comments.forEach(c => {
                            const timeRange = now - note.timestamp;
                            const commentOffset = Math.floor(Math.random() * timeRange);
                            c.timestamp = note.timestamp + commentOffset;
                            c.dateStr = formatXhsDate(c.timestamp);
                        });
                        note.comments.sort((a, b) => a.timestamp - b.timestamp);
                    }
                }));

                // 保存到数据库
                if (window.db && window.db.xhsNotes) {
                    await window.db.xhsNotes.bulkAdd(result.notes);
                }

                loadXhsNotes();
                return true;
            }
            return false;

        } catch (e) {
            console.error("生成笔记失败:", e);
            if (!isAuto) alert("生成笔记失败，请检查网络或配置。\n" + e.message);
            return false;
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('spinning');
        }
    }

    // 新增：搜素笔记生成逻辑
    async function generateXhsSearchNotes(query) {
        try {
            const { proxyUrl, apiKey, model, temperature } = window.state.apiConfig; // 获取 temperature
            if (!proxyUrl || !apiKey || !model) {
                alert("请先在设置中配置API Key");
                return false;
            }

            const prompt = `
            你是一个熟练的小红书内容创作者。请根据搜索关键词【${query}】生成 6 条完全不同的小红书笔记。

            【内容风格要求】：
            1. **标题党**：必须足够吸引眼球，使用“绝绝子”、“yyds”、“家人们”、“集美”、“避雷”、“种草”、“真香”等小红书流行语，可以适当夸张。
            2. **Emoji丰富**：适当搭配 Emoji 表情符号，让文本看起来活泼、年轻、有视觉冲击力。
            3. **真实感**：语气必须轻松、真实，像是在分享生活经验、真心推荐或者疯狂吐槽，避免AI味。
            4. **标签Tag**：每条笔记必须包含 3-5 个热门且相关的 Hashtag 标签（如 #OOTD #探店 #日常 #xx攻略）。
            5. **内容结构**：逻辑清晰，可以分点陈述（1️⃣ 2️⃣ 3️⃣），或者使用“谁懂啊...”等句式。
            6. **排版**：可以适当换行和空行，保持阅读舒适度。
            7. **笔记正文内容"content"字段当中【绝对不允许】包含任何tag标签**，无论是否存在于"tag"字段中。

            【生成要求】：
            1. 必须生成 6 条笔记。
            2. 内容必须与搜索关键词【${query}】紧密相关，但切入点要多样化（例如：不同的场景、不同的情感、不同的评价、不同的受众角度、正反面评价）。
            3. 作者名字要随机多样，像真实的网友昵称（不要叫“小红书助手”之类的）。
            4. "isCharacter" 设为 false。
            5. "imagePrompt": 为每条笔记生成一个简短的、描述性的英文图片提示词，用于AI生图。即使关键词是中文，提示词也必须翻译成英文。提示词中【绝对不允许】出现【人物】（person, girl, man, people等），重点描述物体、场景、氛围、光线、构图。
            6. "stats": 随机生成合理的点赞数和收藏数。
            7. "comments": 每条笔记生成 2-3 条精彩评论，评论要真实互动，有短有长，也可以带emoji。

            【JSON 返回格式（严格遵守）】：
            {
                "notes": [
                {
                    "authorName": "Name",
                    "isCharacter": false, 
                    "title": "笔记标题",
                    "content": "笔记正文内容...",
                    "tags": ["#tag1", "#tag2"],
                    "imagePrompt": "english description for visual",
                    "stats": { "likes": 123, "collects": 45 },
                    "comments": [
                        { "user": "路人A", "text": "评论内容" },
                        { "user": "路人B", "text": "评论内容" },
                        ...
                    ],
                    "location": "城市, 地点"
                }
                ]
            }
            请只返回 JSON 数据，不要包含 markdown 代码块标记。
            `;

            let responseData;
            let isGemini = proxyUrl.includes("googleapis");
            const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8; // 使用配置的 temperature

            if (isGemini) {
                const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp } // Gemini 配置
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const json = await res.json();
                responseData = json.candidates[0].content.parts[0].text;
            } else {
                const res = await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt }],
                        temperature: requestTemp // 使用配置的 temperature
                    })
                });
                const json = await res.json();
                responseData = json.choices[0].message.content;
            }

            let cleanJson = responseData;
            const jsonMatch = responseData.match(/\{[\s\S]*\}/);
            if (jsonMatch) cleanJson = jsonMatch[0];
            else cleanJson = responseData.replace(/```json/g, '').replace(/```/g, '').trim();

            let result;
            try {
                result = JSON.parse(cleanJson);
            } catch (err) {
                console.error("Search JSON Parse Error", err);
                return false;
            }

            if (result && result.notes && Array.isArray(result.notes)) {
                const now = Date.now();

                await Promise.all(result.notes.map(async (note) => {
                    note.id = (Date.now() + Math.random()).toString(36);

                    // 优化时间逻辑：生成过去168小时内的随机时间，避免全部是“刚刚”
                    const randomOffset = Math.floor(Math.random() * 168 * 60 * 60 * 1000);
                    note.timestamp = now - randomOffset;
                    note.dateStr = formatXhsDate(note.timestamp);

                    note.isNew = true;
                    // 标记为搜索结果，主页加载时过滤掉
                    note.isSearchResult = true;
                    if (!note.authorAvatar) {
                        note.authorAvatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(note.authorName)}`;
                    }

                    let promptForImage = note.imagePrompt || `aesthetic photo, ${note.title}, high quality`;
                    note.imageUrl = await window.generatePollinationsImage(promptForImage, {
                        width: 832, height: 1216, nologo: true, model: 'flux'
                    });

                    if (note.comments) {
                        note.comments.forEach(c => {
                            // 评论时间：在笔记发布后到现在的随机时间
                            const timeRange = now - note.timestamp;
                            const commentOffset = Math.floor(Math.random() * timeRange);
                            c.timestamp = note.timestamp + commentOffset;
                            c.dateStr = formatXhsDate(c.timestamp);
                        });
                        // 按时间排序
                        note.comments.sort((a, b) => a.timestamp - b.timestamp);
                    }
                }));

                // 将搜索结果保存到数据库，以便点击查看详情
                if (window.db && window.db.xhsNotes) {
                    await window.db.xhsNotes.bulkPut(result.notes);
                }

                // 渲染到搜索结果区域
                const resultsContainer = document.getElementById('xhs-search-results');
                if (resultsContainer) {
                    renderWaterfall(resultsContainer, result.notes, (note) => {
                        const card = createXhsCard(note);
                        // 确保点击能打开
                        card.onclick = () => openXhsNoteDetail(note);
                        return card;
                    });

                    // 修复滚动：强制 height:100% 配合 flex:1 (flex-shrink会自动调整)，去除margin防止遮挡
                    resultsContainer.style.height = '100%';
                    resultsContainer.style.flex = '1';
                    resultsContainer.style.overflowY = 'auto';
                    resultsContainer.style.marginBottom = '0';
                    resultsContainer.style.paddingBottom = '150px'; // 增加底部留白，确保最后的内容不被遮挡
                }
                return true;
            }
            return false;
        } catch (e) {
            console.error("搜索生成失败", e);
            return false;
        }
    }

    function openXhsNoteDetail(note) {
        if (!views.noteDetail) return;

        // 记录当前笔记ID，用于返回时更新列表状态
        views.noteDetail.dataset.currentNoteId = note.id;

        // 如果是新内容，标记为已读并更新数据库
        if (note.isNew) {
            note.isNew = false;
            if (window.db && window.db.xhsNotes) {
                window.db.xhsNotes.put(note).then(() => {
                    // 更新列表中的显示（可选，或者等下次刷新）
                    const card = document.querySelector(`.xhs-card[data-note-id="${note.id}"]`);
                    if (card) {
                        const marker = card.querySelector('.xhs-new-marker');
                        if (marker) marker.remove();
                    }
                });
            }
        }

        // 填充详情页数据
        document.getElementById('xhs-detail-title').textContent = note.title;
        document.getElementById('xhs-detail-desc').innerHTML = note.content.replace(/\n/g, '<br>');
        document.getElementById('xhs-detail-name').textContent = note.authorName;
        document.getElementById('xhs-detail-avatar').src = note.authorAvatar;

        // 数据统计
        document.getElementById('xhs-detail-like-count').textContent = note.stats ? note.stats.likes : 0;
        document.getElementById('xhs-detail-collect-count').textContent = note.stats ? note.stats.collects : 0;

        // 评论数
        const updateCommentCount = () => {
            let count = 0;
            if (note.comments) {
                count = note.comments.length;
                note.comments.forEach(c => {
                    if (c.replies) count += c.replies.length;
                });
            }
            document.getElementById('xhs-detail-comment-icon-count').textContent = count;
            document.getElementById('xhs-detail-comment-count').textContent = count;
        };
        updateCommentCount();

        // 日期和地点
        document.getElementById('xhs-detail-date').textContent = note.dateStr || "刚刚";
        document.getElementById('xhs-detail-location').textContent = note.location || "未知地点";

        // 标签
        const tagsContainer = document.getElementById('xhs-detail-tags');
        tagsContainer.innerHTML = '';
        if (note.tags) {
            note.tags.forEach(tag => {
                const span = document.createElement('span');
                span.textContent = tag.startsWith('#') ? tag : '#' + tag;
                tagsContainer.appendChild(span);
            });
        }

        // 图片
        const mediaWrap = document.getElementById('xhs-detail-images');
        mediaWrap.innerHTML = `<img src="${note.imageUrl}" class="xhs-media-img">`;

        // 绑定点赞和收藏按钮事件
        const likeBtn = document.getElementById('xhs-detail-like-btn');
        const collectBtn = document.getElementById('xhs-detail-collect-btn');

        // 初始状态
        const s = window.state.xhsSettings;
        const isLiked = s.likedNoteIds && s.likedNoteIds.includes(note.id);
        const isCollected = s.collectionFolders && s.collectionFolders.some(f => f.noteIds.includes(note.id));

        if (likeBtn) {
            const svg = likeBtn.querySelector('svg');
            if (isLiked) {
                svg.setAttribute('fill', '#ff2442');
                svg.setAttribute('stroke', '#ff2442');
            } else {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', '#333');
            }
            // 移除旧的事件监听器
            const newLikeBtn = likeBtn.cloneNode(true);
            likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
            newLikeBtn.onclick = () => toggleXhsLike(note.id);
        }

        if (collectBtn) {
            const svg = collectBtn.querySelector('svg');
            if (isCollected) {
                svg.setAttribute('fill', '#ffb400');
                svg.setAttribute('stroke', '#ffb400');
            } else {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', '#333');
            }
            // 移除旧的事件监听器
            const newCollectBtn = collectBtn.cloneNode(true);
            collectBtn.parentNode.replaceChild(newCollectBtn, collectBtn);
            newCollectBtn.onclick = () => renderCollectionModal(note.id);
        }

        // 评论输入相关逻辑
        const commentInput = document.getElementById('xhs-comment-input');
        const sendBtn = document.getElementById('xhs-comment-send-btn');
        let replyingToCommentId = null; // 当前正在回复的评论ID (一级评论ID)
        let replyingToUser = null; // 当前正在回复的用户名
        let replyingToSubId = null; // 当前正在回复的子评论ID (楼中楼)

        if (commentInput && sendBtn) {
            // 重置输入框
            commentInput.value = '';
            commentInput.placeholder = '说点什么...';
            sendBtn.style.display = 'none';
            replyingToCommentId = null;
            replyingToSubId = null;

            commentInput.oninput = () => {
                sendBtn.style.display = commentInput.value.trim() ? 'block' : 'none';
            };

            // 发送评论
            sendBtn.onclick = async () => {
                const text = commentInput.value.trim();
                if (!text) return;

                const mySettings = window.state.xhsSettings;
                const myName = mySettings.nickname || "我";
                const myAvatar = mySettings.avatar || "https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg";

                const newComment = {
                    id: Date.now().toString(),
                    user: myName,
                    avatar: myAvatar,
                    text: text,
                    timestamp: Date.now(),
                    dateStr: formatXhsDate(Date.now()),
                    likes: 0,
                    isLiked: false,
                    isMine: true
                };

                if (replyingToCommentId) {
                    // 是回复评论
                    const parentComment = note.comments.find(c => c.id === replyingToCommentId);
                    if (parentComment) {
                        if (!parentComment.replies) parentComment.replies = [];

                        // 如果是回复楼中楼，自动添加前缀
                        if (replyingToSubId && replyingToUser) {
                            newComment.text = `回复 @${replyingToUser}：${text}`;
                        }

                        parentComment.replies.push(newComment);
                    }
                } else {
                    // 是新的一级评论
                    if (!note.comments) note.comments = [];
                    note.comments.push(newComment);
                }

                // 保存并刷新
                if (window.db && window.db.xhsNotes) {
                    await window.db.xhsNotes.put(note);
                }

                renderComments();
                updateCommentCount();

                // 重置输入框
                commentInput.value = '';
                commentInput.placeholder = '说点什么...';
                sendBtn.style.display = 'none';
                replyingToCommentId = null;
                replyingToSubId = null;
            };
        }

        // 渲染评论列表
        const renderComments = () => {
            const commentList = document.getElementById('xhs-detail-comment-list');
            commentList.innerHTML = '';

            if (note.comments && note.comments.length > 0) {
                note.comments.forEach(c => {
                    // 确保有ID
                    if (!c.id) c.id = Math.random().toString(36).substr(2, 9);
                    if (typeof c.likes === 'undefined') c.likes = Math.floor(Math.random() * 100);
                    if (typeof c.isLiked === 'undefined') c.isLiked = false;

                    const cItem = document.createElement('div');
                    cItem.className = 'xhs-comment-item';
                    const cDate = c.dateStr || "刚刚";

                    const heartFill = c.isLiked ? '#ff2442' : 'none';
                    const heartStroke = c.isLiked ? '#ff2442' : '#ccc';
                    const likeColor = c.isLiked ? '#ff2442' : '#999';

                    // 头像处理
                    let avatarUrl = c.avatar;
                    if (!avatarUrl) {
                        avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(c.user)}`;
                    }

                    cItem.innerHTML = `
                        <img src="${avatarUrl}" class="avatar xhs-no-pointer">
                        <div class="content-wrap">
                            <div class="user-name">${c.user}</div>
                            <div class="text">${c.text}</div>
                            <div class="meta">
                                <span>${cDate}</span>
                                <div class="xhs-flex-center-gap comment-like-btn" style="cursor: pointer;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <span style="color: ${likeColor}">${c.likes}</span>
                                </div>
                            </div>
                            <div class="xhs-sub-comments"></div>
                        </div>
                    `;

                    // 绑定点赞事件
                    const likeBtn = cItem.querySelector('.comment-like-btn');
                    likeBtn.onclick = async (e) => {
                        e.stopPropagation();
                        c.isLiked = !c.isLiked;
                        c.likes = c.isLiked ? c.likes + 1 : c.likes - 1;

                        // 更新UI
                        const svg = likeBtn.querySelector('svg');
                        const span = likeBtn.querySelector('span');

                        if (c.isLiked) {
                            svg.setAttribute('fill', '#ff2442');
                            svg.setAttribute('stroke', '#ff2442');
                            span.style.color = '#ff2442';
                        } else {
                            svg.setAttribute('fill', 'none');
                            svg.setAttribute('stroke', '#ccc');
                            span.style.color = '#999';
                        }
                        span.textContent = c.likes;

                        // 保存到数据库
                        if (window.db && window.db.xhsNotes) {
                            await window.db.xhsNotes.put(note);
                        }
                    };

                    // 绑定长按事件：删除评论 (如果是自己的)；点击事件：回复
                    bindLongPress(cItem,
                        // 长按
                        () => {
                            if (c.isMine) {
                                showXhsConfirm("确定删除这条评论吗？", async () => {
                                    const index = note.comments.indexOf(c);
                                    if (index > -1) {
                                        note.comments.splice(index, 1);
                                        if (window.db && window.db.xhsNotes) await window.db.xhsNotes.put(note);
                                        renderComments();
                                        updateCommentCount();
                                    }
                                });
                            }
                        },
                        // 点击
                        (e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            replyingToCommentId = c.id;
                            replyingToUser = c.user;
                            replyingToSubId = null; // 点击主评论，不视为楼中楼回复
                            if (commentInput) {
                                commentInput.placeholder = `回复 @${c.user}...`;
                                commentInput.focus();
                            }
                        }
                    );                    // 渲染子评论 (回复)
                    if (c.replies && c.replies.length > 0) {
                        const subContainer = cItem.querySelector('.xhs-sub-comments');
                        c.replies.forEach(reply => {
                            const rItem = document.createElement('div');
                            rItem.className = 'xhs-sub-comment-item';

                            let rAvatar = reply.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(reply.user)}`;
                            const rHeartFill = reply.isLiked ? '#ff2442' : 'none';
                            const rHeartStroke = reply.isLiked ? '#ff2442' : '#ccc';
                            const rLikeColor = reply.isLiked ? '#ff2442' : '#999';

                            rItem.innerHTML = `
                                <img src="${rAvatar}" class="avatar xhs-no-pointer">
                                <div class="content-wrap">
                                    <div class="user-name">${reply.user}</div>
                                    <div class="text">${reply.text}</div>
                                    <div class="meta">
                                        <span>${reply.dateStr || "刚刚"}</span>
                                        <div class="xhs-flex-center-gap sub-comment-like-btn" style="cursor: pointer;">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="${rHeartFill}" stroke="${rHeartStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                            <span style="color: ${rLikeColor}">${reply.likes || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            `;

                            // 子评论点赞
                            const rLikeBtn = rItem.querySelector('.sub-comment-like-btn');
                            rLikeBtn.onclick = async (e) => {
                                e.stopPropagation();
                                reply.isLiked = !reply.isLiked;
                                reply.likes = reply.isLiked ? (reply.likes || 0) + 1 : (reply.likes || 0) - 1;

                                const svg = rLikeBtn.querySelector('svg');
                                const span = rLikeBtn.querySelector('span');
                                if (reply.isLiked) {
                                    svg.setAttribute('fill', '#ff2442');
                                    svg.setAttribute('stroke', '#ff2442');
                                    span.style.color = '#ff2442';
                                } else {
                                    svg.setAttribute('fill', 'none');
                                    svg.setAttribute('stroke', '#ccc');
                                    span.style.color = '#999';
                                }
                                span.textContent = reply.likes;
                                if (window.db && window.db.xhsNotes) await window.db.xhsNotes.put(note);
                            };

                            // 绑定长按事件：删除子评论 (如果是自己的)；点击事件：回复
                            bindLongPress(rItem,
                                // 长按
                                () => {
                                    if (reply.isMine) {
                                        showXhsConfirm("确定删除这条回复吗？", async () => {
                                            const index = c.replies.indexOf(reply);
                                            if (index > -1) {
                                                c.replies.splice(index, 1);
                                                if (window.db && window.db.xhsNotes) await window.db.xhsNotes.put(note);
                                                renderComments();
                                                updateCommentCount();
                                            }
                                        });
                                    }
                                },
                                // 点击
                                (e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    replyingToCommentId = c.id; // 依然回复到主评论下
                                    replyingToUser = reply.user;
                                    replyingToSubId = reply.id; // 标记为回复楼中楼
                                    if (commentInput) {
                                        commentInput.placeholder = `回复 @${reply.user}...`;
                                        commentInput.focus();
                                    }
                                },
                                false // 禁止特效
                            ); subContainer.appendChild(rItem);
                        });
                    }

                    commentList.appendChild(cItem);
                });
            } else {
                commentList.innerHTML = '<p class="xhs-empty-state-sm">暂无评论，快来抢沙发~</p>';
            }
        };

        renderComments();
        views.noteDetail.style.zIndex = '1000'; // 确保在搜索页之上
        views.noteDetail.style.display = 'flex';
    }

    // 绑定事件
    if (refreshBtn) {
        refreshBtn.addEventListener('click', generateXhsNotes);
    }

    if (detailBackBtn) {
        detailBackBtn.addEventListener('click', async () => {
            if (views.noteDetail) {
                views.noteDetail.style.display = 'none';

                // 返回时更新首页卡片状态
                const noteIdStr = views.noteDetail.dataset.currentNoteId;
                if (noteIdStr && window.db && window.db.xhsNotes) {
                    // 尝试获取最新笔记数据 (兼容数字ID和字符串ID)
                    let note = await window.db.xhsNotes.get(noteIdStr);
                    if (!note && !isNaN(Number(noteIdStr))) {
                        note = await window.db.xhsNotes.get(Number(noteIdStr));
                    }

                    if (note) {
                        const card = document.querySelector(`.xhs-card[data-note-id="${noteIdStr}"]`);
                        if (card) {
                            const likeCount = note.stats && note.stats.likes ? note.stats.likes : 0;
                            const s = window.state.xhsSettings;
                            const isLiked = s && s.likedNoteIds && s.likedNoteIds.includes(note.id);
                            const heartFill = isLiked ? '#ff2442' : 'none';
                            const heartStroke = isLiked ? '#ff2442' : '#666';

                            const likeWrap = card.querySelector('.xhs-like-wrap');
                            if (likeWrap) {
                                likeWrap.innerHTML = `
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <span>${likeCount}</span>
                                `;
                            }
                        }
                    }
                }
            }
        });
    }

    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            showXhsConfirm("确定要清空所有笔记吗？此操作不可恢复！", async () => {
                if (window.db && window.db.xhsNotes) {
                    try {
                        await window.db.xhsNotes.clear();

                        // 重置相关设置
                        if (window.state && window.state.xhsSettings) {
                            const s = window.state.xhsSettings;
                            s.likedNoteIds = [];
                            s.collectedNoteIds = [];
                            if (s.collectionFolders) {
                                s.collectionFolders.forEach(f => f.noteIds = []);
                            }
                            await saveXhsSettings({});
                        }

                        // 刷新界面
                        loadXhsNotes();
                        if (window.renderXhsProfile) window.renderXhsProfile();

                        alert("所有笔记已清空");
                    } catch (e) {
                        console.error(e);
                        alert("清空失败: " + e.message);
                    }
                }
            });
        });
    }

    /* =========================================
        6. 页面交互逻辑 (切换、搜索、发布)
       ========================================= */
    if (xhsAppIcon) {
        xhsAppIcon.addEventListener('click', () => {
            if (window.showScreen) {
                window.showScreen('xhs-screen');
                window.renderXhsProfile();
                loadXhsNotes();
            } else {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                if (xhsScreen) xhsScreen.classList.add('active');
            }
        });
    }

    function hideAllMainViews() {
        Object.values(views).forEach(view => {
            if (view && view !== views.noteDetail) view.style.display = 'none';
        });
        const videoPlaceholder = document.getElementById('xhs-video-view-placeholder');
        if (videoPlaceholder) videoPlaceholder.style.display = 'none';
    }

    bottomNavItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            bottomNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            hideAllMainViews();

            if (index === 0) {
                if (views.home) views.home.style.display = 'flex';
                loadXhsNotes();
            } else if (index === 1) {
                // 视频页占位
                let videoView = document.getElementById('xhs-video-view-placeholder');
                if (!videoView) {
                    videoView = document.createElement('div');
                    videoView.id = 'xhs-video-view-placeholder';
                    videoView.className = 'xhs-view';
                    videoView.style.height = '100%';
                    videoView.style.display = 'flex';
                    videoView.style.justifyContent = 'center';
                    videoView.style.alignItems = 'center';
                    videoView.style.backgroundColor = '#000';
                    videoView.innerHTML = '<div class="xhs-video-placeholder"><h2>沉浸式视频</h2><p>功能开发中...</p></div>';
                    document.getElementById('xhs-view-container').appendChild(videoView);
                }
                videoView.style.display = 'flex';
            } else if (index === 2) {
                if (views.message) views.message.style.display = 'block';
            } else if (index === 3) {
                if (views.profile) {
                    views.profile.style.display = 'flex';
                    window.renderXhsProfile();
                }
            }
        });
    });

    topTabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            topTabItems.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.target;
            if (feeds.discover) feeds.discover.style.display = 'none';
            if (feeds.follow) feeds.follow.style.display = 'none';
            if (target === 'discover') {
                if (feeds.discover) feeds.discover.style.display = '';
            } else if (target === 'follow') {
                if (feeds.follow) feeds.follow.style.display = '';
            }
        });
    });

    if (homeBackBtn) {
        homeBackBtn.addEventListener('click', () => {
            if (window.showScreen) window.showScreen('home-screen');
        });
    }

    if (homeSearchIcon && searchView) {
        homeSearchIcon.addEventListener('click', () => {
            searchView.classList.add('active');
            searchView.style.display = 'block';
            const input = document.getElementById('xhs-search-input');
            if (input) setTimeout(() => input.focus(), 100);
        });

        const searchBackBtn = searchView.querySelector('.xhs-search-header svg');
        const doSearchBtn = searchView.querySelector('.xhs-search-header span:last-child');
        const searchInput = document.getElementById('xhs-search-input');

        if (searchBackBtn) {
            searchBackBtn.removeAttribute('onclick');
            searchBackBtn.addEventListener('click', () => {
                searchView.classList.remove('active');
                searchView.style.display = 'none';
            });
        }
        if (doSearchBtn) {
            doSearchBtn.removeAttribute('onclick');
            doSearchBtn.addEventListener('click', async () => {
                const val = searchInput ? searchInput.value.trim() : '';
                if (!val) {
                    alert('请输入搜索内容');
                    return;
                }

                const resultsContainer = document.getElementById('xhs-search-results');
                if (resultsContainer) {
                    // 暂时清除瀑布流样式以居中显示Loading
                    resultsContainer.classList.remove('xhs-waterfall');
                    resultsContainer.style.display = 'flex';
                    resultsContainer.style.flexDirection = 'column';
                    resultsContainer.style.justifyContent = 'center';
                    resultsContainer.style.alignItems = 'center';
                    resultsContainer.style.height = '100%';

                    resultsContainer.innerHTML = `
                        <div class="xhs-loading-state" style="text-align: center;">
                            <svg class="xhs-loading-spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff2442" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                            <p style="margin-top: 15px; font-size: 15px; font-weight: 500; color: #333;">正在挖掘宝藏笔记...</p>
                            <p style="margin-top: 5px; font-size: 12px; color: #999;">AI 正在创作中，请耐心等待 10-20 秒</p>
                        </div>
                    `;
                }

                const success = await generateXhsSearchNotes(val);
                if (!success && resultsContainer) {
                    resultsContainer.innerHTML = '<div class="xhs-empty-state"><p>生成失败，请稍后重试</p></div>';
                }
            });
        }
    }

    if (createBtn && createView) {
        createBtn.onclick = () => {
            createView.classList.add('active');
            createView.style.display = 'block';
            const editorMain = createView.querySelector('.xhs-editor-main');
            if (editorMain) {
                editorMain.style.backgroundImage = 'none';
                editorMain.innerHTML = '<div class="xhs-empty-state"><p>点击上传图片或输入文字</p></div>';
            }
        };

        const closeSpan = createView.querySelector('.header span:first-child');
        if (closeSpan) {
            closeSpan.onclick = () => {
                createView.classList.remove('active');
                createView.style.display = 'none';
            };
        }
        const publishSpan = createView.querySelector('.header span:last-child');
        if (publishSpan) {
            publishSpan.onclick = () => {
                publishSpan.textContent = '发布中...';
                publishSpan.style.opacity = '0.5';
                setTimeout(() => {
                    alert('✨ 笔记发布成功！');
                    createView.classList.remove('active');
                    createView.style.display = 'none';
                    publishSpan.textContent = '发布';
                    publishSpan.style.opacity = '1';
                }, 800);
            };
        }
        const editorMain = createView.querySelector('.xhs-editor-main');
        if (editorMain) {
            editorMain.onclick = () => {
                editorMain.innerHTML = '';
                editorMain.style.backgroundImage = 'url("https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png")';
                editorMain.style.backgroundSize = 'contain';
                editorMain.style.backgroundRepeat = 'no-repeat';
                editorMain.style.backgroundPosition = 'center';
            };
        }
    }

    /* =========================================
        7. 个人设置逻辑 (左上角菜单)
       ========================================= */

    if (profileMenuBtn) {
        profileMenuBtn.addEventListener('click', () => {
            if (!window.state || !window.state.xhsSettings) return;
            const s = window.state.xhsSettings;
            // 填充个人资料设置
            document.getElementById('xhs-settings-avatar-preview').src = s.avatar;
            document.getElementById('xhs-settings-nickname').value = s.nickname;
            document.getElementById('xhs-settings-id').value = s.xhsId;
            document.getElementById('xhs-settings-fans').value = s.fansCount;
            document.getElementById('xhs-settings-tags').value = (s.tags || []).join(' ');
            document.getElementById('xhs-settings-persona').value = s.persona || "";
            profileSettingsModal.classList.add('visible');
        });
    }

    const pSaveBtn = document.getElementById('xhs-settings-save-btn');
    const pCancelBtn = document.getElementById('xhs-settings-cancel-btn');
    if (pCancelBtn) pCancelBtn.onclick = () => profileSettingsModal.classList.remove('visible');
    if (pSaveBtn) pSaveBtn.onclick = () => {
        const newSettings = {
            avatar: document.getElementById('xhs-settings-avatar-preview').src,
            nickname: document.getElementById('xhs-settings-nickname').value,
            xhsId: document.getElementById('xhs-settings-id').value,
            fansCount: document.getElementById('xhs-settings-fans').value,
            tags: document.getElementById('xhs-settings-tags').value.trim().split(/\s+/),
            persona: document.getElementById('xhs-settings-persona').value
        };
        saveXhsSettings(newSettings);
        profileSettingsModal.classList.remove('visible');
    };

    const avatarInput = document.getElementById('xhs-settings-avatar-input');
    const changeAvatarBtn = document.getElementById('xhs-settings-change-avatar-btn');
    if (changeAvatarBtn && avatarInput) {
        changeAvatarBtn.onclick = () => avatarInput.click();
        avatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file && window.handleImageUploadAndCompress) {
                const base64 = await window.handleImageUploadAndCompress(file);
                document.getElementById('xhs-settings-avatar-preview').src = base64;
            }
        };
    }

    const selectPersonaBtn = document.getElementById('xhs-settings-select-persona-btn');
    const personaPickerModal = document.getElementById('xhs-persona-picker-modal');
    if (selectPersonaBtn) {
        selectPersonaBtn.onclick = () => {
            const listEl = document.getElementById('xhs-persona-picker-list');
            listEl.innerHTML = '';
            const presets = window.state.personaPresets || [];
            if (presets.length === 0) {
                listEl.innerHTML = '<p class="xhs-empty-state">人设库为空。</p>';
            } else {
                presets.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'contact-picker-item';
                    item.innerHTML = `<img src="${p.avatar}" class="avatar"><div class="xhs-flex-1"><div class="name">人设 ${p.id.substring(0, 4)}...</div><div class="xhs-text-desc">${p.persona.substring(0, 20)}...</div></div>`;
                    item.onclick = () => {
                        document.getElementById('xhs-settings-avatar-preview').src = p.avatar;
                        document.getElementById('xhs-settings-persona').value = p.persona;
                        personaPickerModal.classList.remove('visible');
                    };
                    listEl.appendChild(item);
                });
            }
            personaPickerModal.classList.add('visible');
        };
    }
    document.getElementById('xhs-persona-picker-cancel').onclick = () => personaPickerModal.classList.remove('visible');

    if (bioTextEl) {
        bioTextEl.addEventListener('click', async () => {
            const currentBio = bioTextEl.textContent;
            if (window.showCustomPrompt) {
                const newBio = await window.showCustomPrompt("编辑简介", "请输入新的个人简介", currentBio);
                if (newBio !== null) saveXhsSettings({ desc: newBio });
            }
        });
    }

    /* =========================================
        8. 应用全局设置逻辑 (右上角设置)
       ========================================= */

    if (appSettingsBtn) {
        appSettingsBtn.addEventListener('click', async () => {
            if (!window.state || !window.state.xhsSettings) return;
            const s = window.state.xhsSettings;

            document.getElementById('xhs-toggle-memory').checked = s.enableChatMemory !== false;
            document.getElementById('xhs-toggle-autopost').checked = s.enableAutoPost === true;

            const refreshToggle = document.getElementById('xhs-toggle-refresh');
            refreshToggle.checked = s.enableAutoRefresh !== false;

            const refreshIntervalRow = document.getElementById('xhs-refresh-interval-row');
            const refreshIntervalInput = document.getElementById('xhs-refresh-interval-input');
            if (refreshIntervalRow && refreshIntervalInput) {
                refreshIntervalInput.value = s.autoRefreshInterval || 60;
                refreshIntervalRow.style.display = refreshToggle.checked ? 'flex' : 'none';
                refreshToggle.onchange = () => {
                    refreshIntervalRow.style.display = refreshToggle.checked ? 'flex' : 'none';
                };
            }

            document.getElementById('xhs-toggle-fans-flux').checked = s.enableFansFluctuation !== false;
            document.getElementById('xhs-toggle-dm').checked = s.enableDMs !== false;

            // 加载分组和分类数据
            let allGroups = [];
            let allWbCategories = [];
            try {
                if (window.db) {
                    if (window.db.qzoneGroups) allGroups = await window.db.qzoneGroups.toArray();
                    if (window.db.worldBookCategories) allWbCategories = await window.db.worldBookCategories.toArray();
                }
            } catch (e) { console.error("加载分组失败:", e); }

            const posterListEl = document.getElementById('xhs-poster-list');
            posterListEl.innerHTML = '<p class="xhs-loading-text">加载中...</p>';

            const allCandidates = [];
            const chatsMap = window.state.chats || {};

            Object.values(chatsMap).forEach(chat => {
                if (!chat.isGroup) {
                    // 查找分组名称
                    const group = allGroups.find(g => g.id === chat.groupId);
                    const groupName = group ? group.name : '角色';

                    // 角色头像
                    const charAvatar = chat.avatar || chat.settings?.aiAvatar || "https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg";

                    allCandidates.push({
                        id: chat.id,
                        name: chat.name,
                        type: groupName,
                        avatar: charAvatar
                    });

                    if (chat.npcLibrary) {
                        chat.npcLibrary.forEach(npc => {
                            allCandidates.push({
                                id: npc.id,
                                name: npc.name,
                                type: `${chat.name}的NPC`,
                                avatar: npc.avatar || "https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg"
                            });
                        });
                    }
                }
            });

            const savedAllowed = new Set((s.allowedPosters || []).map(id => String(id)));

            posterListEl.innerHTML = '';
            if (allCandidates.length === 0) {
                posterListEl.innerHTML = '<div class="xhs-empty-state">暂无可用角色，请在聊天列表创建。</div>';
            } else {
                allCandidates.forEach(candidate => {
                    const div = document.createElement('div');
                    div.className = 'contact-picker-item xhs-poster-item'; // 复用查手机的样式类
                    div.dataset.value = candidate.id;

                    if (savedAllowed.has(String(candidate.id))) {
                        div.classList.add('selected');
                    }

                    div.innerHTML = `
                        <div class="checkbox"></div>
                        <img src="${candidate.avatar}" class="avatar">
                        <div style="display:flex; flex-direction:column;">
                            <span class="name">${candidate.name}</span>
                            <span style="font-size:12px; color:#888;">${candidate.type}</span>
                        </div>
                    `;

                    div.onclick = () => {
                        div.classList.toggle('selected');
                    };
                    posterListEl.appendChild(div);
                });
            }

            const wbListEl = document.getElementById('xhs-worldbook-list');
            wbListEl.innerHTML = '<p class="xhs-loading-text">加载中...</p>';

            let allBooks = window.state.worldBooks || [];
            try {
                if (window.db && window.db.worldBooks) {
                    const dbBooks = await window.db.worldBooks.toArray();
                    if (dbBooks && dbBooks.length > 0) {
                        allBooks = dbBooks;
                        window.state.worldBooks = dbBooks;
                    }
                }
            } catch (e) {
                console.error("加载世界书失败:", e);
            }

            const savedBooks = new Set((s.linkedWorldBooks || s.linkedWorldBookIds || []).map(id => String(id)));

            wbListEl.innerHTML = '';
            if (allBooks.length === 0) {
                wbListEl.innerHTML = '<div class="xhs-empty-state">暂无世界书，请先在世界书APP中添加。</div>';
            } else {
                allBooks.forEach(book => {
                    const div = document.createElement('div');
                    div.className = 'contact-picker-item xhs-wb-item';
                    div.dataset.value = book.id;

                    if (savedBooks.has(String(book.id))) {
                        div.classList.add('selected');
                    }

                    // 查找分类名称
                    const category = allWbCategories.find(c => c.id === book.categoryId);
                    const categoryName = category ? category.name : '世界书设定';

                    // 世界书不显示封面
                    div.innerHTML = `
                        <div class="checkbox"></div>
                        <div style="display:flex; flex-direction:column;">
                            <span class="name">${book.name}</span>
                            <span style="font-size:12px; color:#888;">${categoryName}</span>
                        </div>
                    `;

                    div.onclick = () => {
                        div.classList.toggle('selected');
                    };
                    wbListEl.appendChild(div);
                });
            } appSettingsModal.classList.add('visible');
        });
    }

    // 保存全局配置
    const appSettingsSaveBtn = document.getElementById('xhs-app-settings-save');
    const appSettingsCancelBtn = document.getElementById('xhs-app-settings-cancel');

    if (appSettingsCancelBtn) {
        appSettingsCancelBtn.onclick = () => appSettingsModal.classList.remove('visible');
    }

    if (appSettingsSaveBtn) {
        appSettingsSaveBtn.onclick = () => {
            const newConfig = {
                enableChatMemory: document.getElementById('xhs-toggle-memory').checked,
                enableAutoPost: document.getElementById('xhs-toggle-autopost').checked,
                enableAutoRefresh: document.getElementById('xhs-toggle-refresh').checked,
                autoRefreshInterval: parseInt(document.getElementById('xhs-refresh-interval-input').value) || 60,
                enableFansFluctuation: document.getElementById('xhs-toggle-fans-flux').checked,
                enableDMs: document.getElementById('xhs-toggle-dm').checked,
                allowedPosters: Array.from(document.querySelectorAll('.xhs-poster-item.selected')).map(el => el.dataset.value),
                linkedWorldBooks: Array.from(document.querySelectorAll('.xhs-wb-item.selected')).map(el => el.dataset.value)
            };

            saveXhsSettings(newConfig);
            startXhsAutoRefresh();
            appSettingsModal.classList.remove('visible');
            alert('小红书应用配置已保存！');
        };
    }

    // 初始化自动刷新
    setTimeout(startXhsAutoRefresh, 1000);
});