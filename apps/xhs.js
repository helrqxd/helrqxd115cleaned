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
        userProfile: document.getElementById('xhs-user-profile-view'), // 他人主页视图
        video: null
    };

    // z-index管理器 - 确保最新打开的视图始终在最上面
    let currentZIndex = 1000;
    function bringToFront(viewElement) {
        if (viewElement) {
            currentZIndex += 10;
            viewElement.style.zIndex = currentZIndex;
        }
    }

    // 顶部导航
    const topTabItems = document.querySelectorAll('.xhs-top-tabs .tab-item');
    const feeds = {
        discover: document.getElementById('xhs-discover-feed'),
        follow: document.getElementById('xhs-follow-feed'),
        local: null // 附近页占位，按需创建
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

    // 搜索页临时笔记存储（不存入数据库，交互后才持久化）
    const xhsSearchTempNotes = new Map();

    // 获取笔记（优先DB，其次临时存储）
    async function getXhsNote(noteId) {
        if (window.db && window.db.xhsNotes) {
            let note = await window.db.xhsNotes.get(noteId);
            if (!note && !isNaN(noteId)) note = await window.db.xhsNotes.get(Number(noteId));
            if (note) return note;
        }
        return xhsSearchTempNotes.get(noteId) || xhsSearchTempNotes.get(String(noteId)) || null;
    }

    // 持久化搜索临时笔记到数据库
    async function persistSearchNote(noteOrId) {
        const noteId = typeof noteOrId === 'object' ? noteOrId.id : noteOrId;
        const note = typeof noteOrId === 'object' ? noteOrId : xhsSearchTempNotes.get(noteId);
        if (note && note.isSearchTemp) {
            note.isSearchTemp = false;
            if (window.db && window.db.xhsNotes) {
                await window.db.xhsNotes.put(note);
            }
            xhsSearchTempNotes.delete(note.id);
        }
    }

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
            // 间隔单位为分钟，转换为毫秒
            const intervalMinutes = s.autoRefreshInterval || 5;
            const intervalMs = intervalMinutes * 60 * 1000;
            console.log(`[XHS] 开启自动刷新，间隔: ${intervalMinutes}分钟`);

            // 初始化上次更新时间（如果没有记录）
            if (!s.lastAutoRefreshTime) {
                s.lastAutoRefreshTime = Date.now();
                saveXhsSettings({});
            }

            // 每30秒检查一次是否到达更新间隔
            xhsAutoRefreshTimer = setInterval(async () => {
                const now = Date.now();
                const lastTime = window.state.xhsSettings.lastAutoRefreshTime || 0;
                const elapsed = now - lastTime;

                if (elapsed >= intervalMs) {
                    console.log(`[XHS] 自动刷新触发 (距上次更新 ${Math.round(elapsed / 60000)}分钟)`);
                    // 记录本次更新时间
                    window.state.xhsSettings.lastAutoRefreshTime = now;
                    await saveXhsSettings({});

                    const success = await generateXhsNotes(true);

                    if (success) {
                        const screen = document.getElementById('xhs-screen');
                        // 如果不在小红书界面，显示通知
                        if (!screen || !screen.classList.contains('active')) {
                            showXhsNotification("小红书", "发现页有新的内容更新啦！");
                        }
                    }
                }
            }, 30000); // 每30秒检查一次
        }
    }
    /* =========================================
        2. 工具函数：时间格式化 & 长按 & 弹窗
       ========================================= */

    // 工具函数：移除AI响应中的思维链标签（如 <think>...</think>）
    function stripThinkingTags(text) {
        if (!text) return text;
        return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    /**
     * 修复并解析AI返回的JSON字符串
     * AI（特别是Claude Opus）经常在JSON字符串值中输出：
     *  1. 未转义的控制字符（换行、制表符等）
     *  2. 未转义的双引号（如对话中的 "你好"）
     *  3. 尾部逗号（如 {"a":1,}）
     * 导致标准 JSON.parse 失败。此函数会先尝试直接解析，失败后自动修复再解析。
     */
    function repairAndParseJSON(text) {
        // 先去除可能的思维链标签
        text = stripThinkingTags(text);

        // 去除可能的 markdown 代码块标记
        let jsonStr = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '').trim();

        // 提取JSON对象
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
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
                    // 不在字符串内 → 开启字符串
                    inString = true;
                    repaired += ch;
                } else {
                    // 在字符串内遇到引号 → 判断是结构性闭合引号还是内容中的引号
                    // 向后看第一个非空白字符，如果是 JSON 结构符号（, } ] :）则认为是闭合引号
                    let j = i + 1;
                    while (j < jsonStr.length && (jsonStr[j] === ' ' || jsonStr[j] === '\t' || jsonStr[j] === '\r' || jsonStr[j] === '\n')) {
                        j++;
                    }
                    const nextNonWs = j < jsonStr.length ? jsonStr[j] : '';

                    if (nextNonWs === ',' || nextNonWs === '}' || nextNonWs === ']' || nextNonWs === ':' || nextNonWs === '') {
                        // 看起来是真正的闭合引号
                        inString = false;
                        repaired += ch;
                    } else {
                        // 字符串内部的未转义引号 → 转义它
                        repaired += '\\"';
                    }
                }
                continue;
            }

            if (inString) {
                // 在字符串值内部，转义控制字符
                const code = ch.charCodeAt(0);
                if (code === 10) {         // \n
                    repaired += '\\n';
                } else if (code === 13) {  // \r
                    repaired += '\\r';
                } else if (code === 9) {   // \t
                    repaired += '\\t';
                } else if (code === 8) {   // \b
                    repaired += '\\b';
                } else if (code === 12) {  // \f
                    repaired += '\\f';
                } else if (code < 32) {    // 其他控制字符
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
            // 解析失败，进行更激进的修复
        }

        // 第三次尝试：移除尾部逗号后再解析
        try {
            const noTrailing = repaired.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(noTrailing);
        } catch (e3) {
            // 最后兜底
            console.error('[XHS] JSON修复后仍无法解析，原始内容前500字符:', jsonStr.substring(0, 500));
            throw new Error('AI返回的JSON格式无法解析，请重试。错误: ' + e3.message);
        }
    }

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

    // 自定义确认弹窗（删除专用）
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

    // 通用确认弹窗（可自定义确认按钮文字）
    function showXhsConfirmGeneral(message, confirmText, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'xhs-confirm-modal';

        modal.innerHTML = `
            <div class="xhs-confirm-content">
                <div class="xhs-confirm-message">
                    ${message}
                </div>
                <div class="xhs-confirm-actions">
                    <button class="xhs-confirm-btn xhs-confirm-cancel">取消</button>
                    <div class="xhs-confirm-divider"></div>
                    <button class="xhs-confirm-btn xhs-confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });

        const close = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 200);
        };

        modal.querySelector('.xhs-confirm-cancel').onclick = close;
        modal.querySelector('.xhs-confirm-ok').onclick = () => {
            close();
            onConfirm();
        };
    }

    // 绑定长按事件 (区分点击和长按)
    function bindLongPress(element, onLongPress, onClick, enableEffect = true, excludeSelector = null) {
        let timer;
        let isLongPress = false;
        let isScrolling = false;
        let isExcluded = false;
        let startX, startY;

        const start = (e) => {
            // 检查触发源是否属于排除区域（如头像、点赞按钮等）
            isExcluded = excludeSelector && e.target.closest(excludeSelector);
            if (isExcluded) return; // 不拦截，让子元素自行处理

            // 阻止事件冒泡，防止子元素的长按事件触发父元素
            e.stopPropagation();

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
            if (isExcluded) return;
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
            if (isExcluded) { isExcluded = false; return; } // 排除区域不拦截
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
            if (isExcluded) return;
            if (e.buttons === 1) move(e);
        });
        element.addEventListener('mouseup', (e) => {
            if (isExcluded) { isExcluded = false; return; }
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

        // 应用背景设置
        if (typeof applyProfileBackground === 'function') {
            applyProfileBackground();
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
        if (followEl) {
            // 计算实际关注数（已关注的角色主页数量）
            const profiles = s.characterProfiles || {};
            const followedCount = Object.values(profiles).filter(p => p.isFollowed).length;
            followEl.textContent = followedCount || "0";

            // 绑定点击事件打开关注列表 - 整个stat-box区域都可点击（包括数字和"关注"文字）
            const followStatBox = followEl.closest('.stat-box');
            if (followStatBox) {
                followStatBox.style.cursor = 'pointer';
                const newFollowStatBox = followStatBox.cloneNode(true);
                followStatBox.parentNode.replaceChild(newFollowStatBox, followStatBox);
                newFollowStatBox.onclick = () => {
                    openFollowingList();
                };
            }
        }
        const fansEl = document.getElementById('xhs-stat-fans');
        if (fansEl) fansEl.textContent = s.fansCount || "0";

        // 获赞与收藏数使用实际笔记数据统计
        const likesEl = document.getElementById('xhs-stat-likes');
        if (likesEl) {
            // 异步计算实际获赞与收藏数
            (async () => {
                let actualLikesCount = 0;
                if (window.db && window.db.xhsNotes) {
                    const allNotes = await window.db.xhsNotes.toArray();
                    const myName = s.nickname || "MOMO";
                    const myNotes = allNotes.filter(n => n.authorName === myName);
                    myNotes.forEach(note => {
                        if (note.stats) {
                            actualLikesCount += (note.stats.likes || 0) + (note.stats.collects || 0);
                        }
                    });
                }
                likesEl.textContent = actualLikesCount || "0";
            })();
        }

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
            container.className = '';
            container.style.cssText = 'padding: 10px;';
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
            // 如果是临时搜索笔记，先持久化到数据库
            await persistSearchNote(noteId);
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
        bringToFront(modal); // 动态提升z-index

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
                    // 如果是临时搜索笔记，先持久化到数据库
                    await persistSearchNote(noteId);

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

        // 应用背景设置到个人主页
        applyProfileBackground();

        // 仅在个人主页显示时重新渲染
        if (document.getElementById('xhs-profile-view').style.display !== 'none') {
            window.renderXhsProfile();
        }
    }

    // 应用个人主页背景设置
    function applyProfileBackground() {
        const s = window.state?.xhsSettings;
        if (!s) return;

        const profileHeader = document.querySelector('#xhs-profile-view .xhs-profile-header');
        if (!profileHeader) return;

        if (s.profileBgType === 'image' && s.profileBgImage) {
            profileHeader.style.background = `url(${s.profileBgImage}) center/cover no-repeat`;
        } else {
            const color1 = s.profileBgColor1 || '#ff9a9e';
            const color2 = s.profileBgColor2 || '#fecfef';
            profileHeader.style.background = `linear-gradient(180deg, ${color1} 0%, ${color2} 50%, #fff 100%)`;
        }
    }

    /* =========================================
        3.5. 消息通知系统
       ========================================= */

    // 添加通知记录
    async function addXhsNotification(type, data) {
        if (!window.state) window.state = {};
        if (!window.state.xhsSettings) window.state.xhsSettings = {};
        if (!window.state.xhsSettings.notifications) {
            window.state.xhsSettings.notifications = {
                engagement: [], // 点赞收藏记录
                comments: [],   // 评论和@记录
                unreadEngagement: 0, // 未读点赞收藏数
                unreadComments: 0    // 未读评论@数
            };
        }

        const notifications = window.state.xhsSettings.notifications;
        const record = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: type,
            data: data,
            timestamp: data.timestamp || Date.now(),
            isRead: false
        };

        if (type === 'engagement') {
            notifications.engagement.unshift(record);
            // 只有与自己相关的通知才计入未读数（自己笔记的互动 + 自己评论的点赞）
            if (data.isCommentLike || data.isOwnNote) {
                notifications.unreadEngagement += 1;
            }
            // 保持最多100条记录
            if (notifications.engagement.length > 100) {
                notifications.engagement = notifications.engagement.slice(0, 100);
            }
        } else if (type === 'comment' || type === 'mention') {
            notifications.comments.unshift(record);
            // 只有与自己相关的通知才计入未读数（自己笔记的评论 + 回复自己评论的通知）
            if (data.isOwnNote || data.isReplyToComment) {
                notifications.unreadComments += 1;
            }
            // 保持最多100条记录
            if (notifications.comments.length > 100) {
                notifications.comments = notifications.comments.slice(0, 100);
            }
        }

        await saveXhsSettings({});
    }

    // 更新消息页红点（从实际数据计算过滤后的未读数）
    function updateMessageBadges() {
        const notifications = window.state?.xhsSettings?.notifications;
        if (!notifications) return;

        // ★ 从数据中实时计算过滤后的未读数，而非使用累计计数器
        const engagementUnread = (notifications.engagement || []).filter(n => {
            if (n.isRead) return false;
            const d = n.data;
            return d.isCommentLike || d.isOwnNote; // 只计算与自己相关的
        }).length;

        const commentsUnread = (notifications.comments || []).filter(n => {
            if (n.isRead) return false;
            const d = n.data;
            return d.isOwnNote || d.isReplyToComment; // 只计算与自己相关的
        }).length;

        // ★ 新增关注未读数
        const followsUnread = (notifications.follows || []).filter(n => !n.isRead).length;

        // 同步回存，保持计数器一致
        notifications.unreadEngagement = engagementUnread;
        notifications.unreadComments = commentsUnread;
        notifications.unreadFollows = followsUnread;

        const likesBadge = document.getElementById('xhs-likes-badge');
        const commentsBadge = document.getElementById('xhs-comments-badge');
        const followsBadge = document.getElementById('xhs-follows-badge');

        if (likesBadge) {
            if (engagementUnread > 0) {
                likesBadge.textContent = engagementUnread > 99 ? '99+' : engagementUnread;
                likesBadge.style.display = 'flex';
            } else {
                likesBadge.style.display = 'none';
            }
        }

        if (commentsBadge) {
            if (commentsUnread > 0) {
                commentsBadge.textContent = commentsUnread > 99 ? '99+' : commentsUnread;
                commentsBadge.style.display = 'flex';
            } else {
                commentsBadge.style.display = 'none';
            }
        }

        if (followsBadge) {
            if (followsUnread > 0) {
                followsBadge.textContent = followsUnread > 99 ? '99+' : followsUnread;
                followsBadge.style.display = 'flex';
            } else {
                followsBadge.style.display = 'none';
            }
        }

        // ★ 底部导航栏"消息"按钮红点
        const totalUnread = engagementUnread + commentsUnread + followsUnread;
        const navDot = document.getElementById('xhs-nav-msg-dot');
        if (navDot) {
            navDot.style.display = totalUnread > 0 ? 'block' : 'none';
        }
    }

    // 清除未读计数并标记所有条目为已读
    async function clearUnreadCount(type) {
        if (!window.state?.xhsSettings?.notifications) return;

        const notifications = window.state.xhsSettings.notifications;
        if (type === 'engagement') {
            notifications.unreadEngagement = 0;
            if (notifications.engagement && notifications.engagement.length > 0) {
                notifications.engagement.forEach(n => n.isRead = true);
            }
        } else if (type === 'comments') {
            notifications.unreadComments = 0;
            if (notifications.comments && notifications.comments.length > 0) {
                notifications.comments.forEach(n => n.isRead = true);
            }
        } else if (type === 'follows') {
            notifications.unreadFollows = 0;
            if (notifications.follows && notifications.follows.length > 0) {
                notifications.follows.forEach(n => n.isRead = true);
            }
        }

        await saveXhsSettings({});
        updateMessageBadges();
    }

    // 渲染点赞收藏通知列表
    async function renderLikesCollectsList() {
        const container = document.getElementById('xhs-likes-collects-list');
        if (!container) return;

        // 获取通知列表并过滤已删除笔记的记录
        let notifications = window.state?.xhsSettings?.notifications?.engagement || [];
        if (window.db && window.db.xhsNotes && notifications.length > 0) {
            const validNotifications = [];
            for (const n of notifications) {
                const noteId = n.data?.noteId;
                if (noteId) {
                    // 兼容数字和字符串ID
                    let note = await window.db.xhsNotes.get(noteId);
                    if (!note && !isNaN(noteId)) note = await window.db.xhsNotes.get(Number(noteId));
                    if (note) {
                        // 补充旧数据缺失的isOwnNote字段
                        if (n.data.isOwnNote === undefined) {
                            n.data.isOwnNote = note.isMine === true;
                        }
                        validNotifications.push(n);
                    }
                } else {
                    validNotifications.push(n);
                }
            }
            if (validNotifications.length !== notifications.length) {
                window.state.xhsSettings.notifications.engagement = validNotifications;
                await saveXhsSettings({});
                notifications = validNotifications;
            }
        }

        // ★ 过滤：只保留自己笔记的互动通知 + 自己评论的点赞通知
        notifications = notifications.filter(n => {
            const d = n.data;
            if (d.isCommentLike) return true; // 评论点赞始终显示
            if (d.isOwnNote) return true; // 自己笔记的互动显示
            return false;
        });

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="xhs-notif-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <p>暂无赞和收藏通知</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            const d = n.data;
            const isCommentLike = d.isCommentLike;
            const isUnread = !n.isRead;

            let actionText, descText;
            if (isCommentLike) {
                actionText = `你的评论收到 <span class="xhs-notif-highlight">${d.likesIncrease}</span> 个赞`;
                descText = d.commentText ? `"${d.commentText.substring(0, 40)}${(d.commentText.length || 0) > 40 ? '...' : ''}"` : '';
            } else {
                const parts = [];
                if (d.likesIncrease > 0) parts.push(`<span class="xhs-notif-highlight">${d.likesIncrease}</span> 个赞`);
                if (d.collectsIncrease > 0) parts.push(`<span class="xhs-notif-highlight">${d.collectsIncrease}</span> 个收藏`);
                actionText = `收到 ${parts.join('、')}`;
                descText = d.noteTitle || '';
            }

            return `
                <div class="xhs-notif-item ${isUnread ? 'xhs-notif-unread' : ''}" data-note-id="${d.noteId}" data-notification-id="${n.id}">
                    <div class="xhs-notif-icon-wrap ${isCommentLike ? 'comment-like' : 'note-like'}">
                        ${isCommentLike
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff2442" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
                    : (d.collectsIncrease > 0 && !d.likesIncrease
                        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ffa726" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff2442" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>')
                }
                    </div>
                    <div class="xhs-notif-body">
                        <div class="xhs-notif-action">${actionText}</div>
                        ${descText ? `<div class="xhs-notif-desc">${descText}</div>` : ''}
                        ${(!isCommentLike && d.reason) ? `<div class="xhs-notif-reason">${d.reason}</div>` : ''}
                        <div class="xhs-notif-time">${formatXhsDate(n.timestamp)}</div>
                    </div>
                    <div class="xhs-notif-thumb">
                        <img src="${d.noteCover || 'https://via.placeholder.com/44'}" onerror="this.src='https://via.placeholder.com/44'" />
                    </div>
                </div>
            `;
        }).join('');

        // 绑定点击事件
        container.querySelectorAll('.xhs-notif-item').forEach(item => {
            item.onclick = async () => {
                const rawId = item.dataset.noteId;
                const notificationId = item.dataset.notificationId;

                // 标记为已读
                if (notificationId && window.state?.xhsSettings?.notifications?.engagement) {
                    const notification = window.state.xhsSettings.notifications.engagement.find(n => n.id === notificationId);
                    if (notification && !notification.isRead) {
                        notification.isRead = true;
                        item.classList.remove('xhs-notif-unread');
                        await saveXhsSettings({});
                    }
                }

                if (rawId && window.db && window.db.xhsNotes) {
                    let note = await window.db.xhsNotes.get(rawId);
                    if (!note && !isNaN(rawId)) note = await window.db.xhsNotes.get(Number(rawId));
                    if (note) {
                        // 隐藏当前列表视图
                        const likesView = document.getElementById('xhs-likes-collects-view');
                        if (likesView) likesView.style.display = 'none';
                        openXhsNoteDetail(note);
                    }
                }
            };
        });
    }

    // 渲染评论和@通知列表
    async function renderCommentsAtList() {
        const container = document.getElementById('xhs-comments-at-list');
        if (!container) return;

        // 获取通知列表并过滤已删除笔记/评论的记录
        let notifications = window.state?.xhsSettings?.notifications?.comments || [];
        if (window.db && window.db.xhsNotes && notifications.length > 0) {
            const validNotifications = [];
            for (const n of notifications) {
                const noteId = n.data?.noteId;
                if (noteId) {
                    // 兼容数字和字符串ID
                    let note = await window.db.xhsNotes.get(noteId);
                    if (!note && !isNaN(noteId)) note = await window.db.xhsNotes.get(Number(noteId));
                    if (note) {
                        // 补充旧数据缺失的isOwnNote字段
                        if (n.data.isOwnNote === undefined) {
                            n.data.isOwnNote = note.isMine === true;
                        }
                        // 如果是回复评论，还需要检查原评论是否存在
                        if (n.data.isReplyToComment && n.data.originalCommentId) {
                            let found = false;
                            if (note.comments) {
                                for (const c of note.comments) {
                                    if (c.id === n.data.originalCommentId) { found = true; break; }
                                    if (c.replies) {
                                        for (const r of c.replies) {
                                            if (r.id === n.data.originalCommentId) { found = true; break; }
                                        }
                                    }
                                    if (found) break;
                                }
                            }
                            if (found) validNotifications.push(n);
                        } else {
                            validNotifications.push(n);
                        }
                    }
                } else {
                    validNotifications.push(n);
                }
            }
            if (validNotifications.length !== notifications.length) {
                window.state.xhsSettings.notifications.comments = validNotifications;
                await saveXhsSettings({});
                notifications = validNotifications;
            }
        }

        // ★ 过滤：他人笔记下回复其他人的评论不显示
        // 只保留: 自己笔记的所有评论 + 他人笔记下回复自己的评论
        notifications = notifications.filter(n => {
            const d = n.data;
            if (d.isOwnNote) return true; // 自己笔记的评论全部显示
            if (d.isReplyToComment) return true; // 回复自己评论的通知显示
            return false;
        });

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="xhs-notif-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>暂无评论和@通知</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            const d = n.data;
            const isMention = n.type === 'mention';
            const isUnread = !n.isRead;
            const isReplyToComment = d.isReplyToComment === true;

            let actionText;
            if (isMention) {
                actionText = ' @了你';
            } else if (isReplyToComment) {
                actionText = ' 回复了你的评论';
            } else {
                actionText = ' 评论了你的笔记';
            }

            // 清理评论文本中的"回复 @xxx："前缀用于显示
            let displayText = d.text || '';
            displayText = displayText.replace(/^回复\s*[@＠][^\s：:]+[：:]\s*/, '');
            if (displayText.length > 60) displayText = displayText.substring(0, 60) + '...';

            return `
                <div class="xhs-notif-item xhs-notif-comment ${isUnread ? 'xhs-notif-unread' : ''}" data-note-id="${d.noteId}" data-notification-id="${n.id}">
                    <img class="xhs-notif-avatar" src="${d.userAvatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=default'}" onerror="this.src='https://api.dicebear.com/7.x/notionists/svg?seed=default'" />
                    <div class="xhs-notif-body">
                        <div class="xhs-notif-action">
                            <span class="xhs-notif-username">${d.userName || '匿名用户'}</span>${actionText}
                        </div>
                        <div class="xhs-notif-comment-text">${displayText}</div>
                        <div class="xhs-notif-time">${formatXhsDate(n.timestamp)}</div>
                    </div>
                    ${d.noteCover ? `<div class="xhs-notif-thumb"><img src="${d.noteCover}" onerror="this.style.display='none'" /></div>` : ''}
                </div>
            `;
        }).join('');

        // 绑定点击事件
        container.querySelectorAll('.xhs-notif-item').forEach(item => {
            item.onclick = async () => {
                const rawId = item.dataset.noteId;
                const notificationId = item.dataset.notificationId;

                // 标记为已读
                if (notificationId && window.state?.xhsSettings?.notifications?.comments) {
                    const notification = window.state.xhsSettings.notifications.comments.find(n => n.id === notificationId);
                    if (notification && !notification.isRead) {
                        notification.isRead = true;
                        item.classList.remove('xhs-notif-unread');
                        await saveXhsSettings({});
                    }
                }

                if (rawId && window.db && window.db.xhsNotes) {
                    let note = await window.db.xhsNotes.get(rawId);
                    if (!note && !isNaN(rawId)) note = await window.db.xhsNotes.get(Number(rawId));
                    if (note) {
                        // 隐藏当前列表视图
                        const commentsView = document.getElementById('xhs-comments-at-view');
                        if (commentsView) commentsView.style.display = 'none';
                        openXhsNoteDetail(note);
                    }
                }
            };
        });
    }

    // 初始化消息页面事件
    function initMessagePageEvents() {
        // 点赞收藏按钮
        const likesBtn = document.getElementById('xhs-likes-collects-btn');
        const likesView = document.getElementById('xhs-likes-collects-view');
        const likesBack = document.getElementById('xhs-likes-back');

        if (likesBtn && likesView) {
            likesBtn.onclick = async () => {
                likesView.style.display = 'flex';
                bringToFront(likesView);
                await renderLikesCollectsList();  // 先渲染列表（显示未读高亮）
                // 延迟标记已读，让用户看到未读状态
                setTimeout(async () => {
                    await clearUnreadCount('engagement');
                }, 1500);
            };
        }

        if (likesBack && likesView) {
            likesBack.onclick = () => {
                likesView.style.display = 'none';
            };
        }

        // 评论和@按钮
        const commentsBtn = document.getElementById('xhs-comments-at-btn');
        const commentsView = document.getElementById('xhs-comments-at-view');
        const commentsBack = document.getElementById('xhs-comments-back');

        if (commentsBtn && commentsView) {
            commentsBtn.onclick = async () => {
                commentsView.style.display = 'flex';
                bringToFront(commentsView);
                await renderCommentsAtList();  // 先渲染列表（显示未读高亮）
                // 延迟标记已读，让用户看到未读状态
                setTimeout(async () => {
                    await clearUnreadCount('comments');
                }, 1500);
            };
        }

        if (commentsBack && commentsView) {
            commentsBack.onclick = () => {
                commentsView.style.display = 'none';
            };
        }

        // 新增关注按钮
        const newFollowsBtn = document.getElementById('xhs-new-follows-btn');
        const newFollowsView = document.getElementById('xhs-new-follows-view');
        const newFollowsBack = document.getElementById('xhs-new-follows-back');

        if (newFollowsBtn && newFollowsView) {
            newFollowsBtn.onclick = async () => {
                newFollowsView.style.display = 'flex';
                bringToFront(newFollowsView);
                await renderNewFollowsList();
                setTimeout(async () => {
                    await clearUnreadCount('follows');
                }, 1500);
            };
        }

        if (newFollowsBack && newFollowsView) {
            newFollowsBack.onclick = () => {
                newFollowsView.style.display = 'none';
            };
        }

        // 初始化红点显示
        updateMessageBadges();
    }

    /* =========================================
        3.6. 粉丝数自动浮动系统
       ========================================= */

    // 时间衰减函数：从动作发生开始，2小时内上升到波峰，之后72小时内递减至0
    function fansTimeDecay(actionTimestamp) {
        const now = Date.now();
        const elapsedHours = (now - actionTimestamp) / (3600 * 1000);
        if (elapsedHours < 0 || elapsedHours > 72) return 0;
        // 上升阶段: 0→2小时，线性升至1.0
        if (elapsedHours <= 2) return elapsedHours / 2;
        // 波峰阶段: 2→6小时，维持1.0
        if (elapsedHours <= 6) return 1.0;
        // 递减阶段: 6→72小时，线性降至0
        return Math.max(0, 1.0 - (elapsedHours - 6) / 66);
    }

    /**
     * 计算单个账号的"活力分数"
     * @param {string} authorName - 账号名称
     * @param {boolean} isSelf - 是否为当前用户
     * @returns {Promise<number>} 活力分数
     */
    async function computeAccountVitalityScore(authorName, isSelf) {
        const now = Date.now();
        const THREE_DAYS = 72 * 3600 * 1000;
        let score = 0;

        if (!window.db || !window.db.xhsNotes) return 0;
        const allNotes = await window.db.xhsNotes.toArray();

        // ── 因子1：近3天内发布笔记数 ──
        const authorNotes = allNotes.filter(n =>
            n.authorName === authorName &&
            n.timestamp && (now - n.timestamp) < THREE_DAYS
        );
        for (const note of authorNotes) {
            score += fansTimeDecay(note.timestamp) * 10; // 每篇笔记基础10分
        }

        // ── 因子2：近3天笔记的互动质量（点赞、评论、收藏） ──
        for (const note of authorNotes) {
            const st = note.stats || {};
            const quality = (st.likes || 0) * 1.0 + (st.comments || 0) * 2.5 + (st.collects || 0) * 1.8;
            score += fansTimeDecay(note.timestamp) * quality * 0.3;
        }

        // ── 因子3：近3天活跃度（在笔记下的评论、回复） ──
        for (const note of allNotes) {
            if (!note.comments) continue;
            for (const comment of note.comments) {
                const isTarget = isSelf ? comment.isMine : (comment.user === authorName);
                if (isTarget && comment.timestamp && (now - comment.timestamp) < THREE_DAYS) {
                    score += fansTimeDecay(comment.timestamp) * 3;
                }
                if (comment.replies) {
                    for (const reply of comment.replies) {
                        const isReplyTarget = isSelf ? reply.isMine : (reply.user === authorName);
                        if (isReplyTarget && reply.timestamp && (now - reply.timestamp) < THREE_DAYS) {
                            score += fansTimeDecay(reply.timestamp) * 2;
                        }
                    }
                }
            }
        }

        return score;
    }

    /**
     * 根据活力分数计算粉丝变化量
     * @param {number} score - 活力分数
     * @param {number|string} currentFans - 当前粉丝数
     * @returns {number} 粉丝变化量（正=增、负=减）
     */
    function calculateFansDelta(score, currentFans) {
        const fans = parseInt(currentFans) || 0;
        // 基准线：低于此则粉丝下降，高于则上升
        const baseline = 15;
        const delta = score - baseline;
        // 账号规模因子（粉丝越多，绝对变化越大）
        const scaleFactor = Math.max(0.5, Math.log10(fans + 10) * 0.8);
        // 随机波动因子 (0.7 ~ 1.3)
        const randomFactor = 0.7 + Math.random() * 0.6;

        let change;
        if (delta > 0) {
            // 正面: 粉丝增长
            change = Math.ceil(delta * scaleFactor * randomFactor * 0.5);
        } else if (delta < -5) {
            // 负面: 粉丝减少（力度较轻）
            change = Math.floor(delta * scaleFactor * randomFactor * 0.2);
        } else {
            // 中间地带: 小幅随机波动
            change = Math.round((Math.random() - 0.4) * scaleFactor * 2);
        }

        // 单次变化不超过粉丝总数的5%，且至少 ±1
        const maxChange = Math.max(3, Math.ceil(fans * 0.05));
        change = Math.max(-maxChange, Math.min(maxChange, change));
        // 确保粉丝数不变为负数
        if (fans + change < 0) change = -fans;
        return change;
    }

    /** 根据分数和变化量生成人类可读原因 */
    function generateFluctuationReason(score, delta) {
        if (delta > 0) {
            if (score > 40) return '近期内容质量出色，互动数据亮眼！';
            if (score > 25) return '持续发布优质内容，吸引了新粉丝关注';
            return '保持活跃状态，获得了一些新关注';
        } else if (delta < 0) {
            if (score < 5) return '近期较少活动，部分粉丝取消了关注';
            return '互动数据有所下降，少量粉丝流失';
        }
        return '粉丝数暂无明显变化';
    }

    /** 粉丝浮动定时器引用 */
    let xhsFansFluctuationTimer = null;

    /** 粉丝浮动计算互斥锁，防止并发重复计算 */
    let _fansFluctuationRunning = false;

    /** 将时间戳向下取整到最近的3小时时间点（从0:00开始：0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00） */
    function floorToThreeHours(ts) {
        const d = new Date(ts);
        const hour = d.getHours();
        d.setHours(hour - (hour % 3), 0, 0, 0);
        return d.getTime();
    }

    /**
     * 对单个整点时刻执行一次粉丝增减计算
     * @param {object} s - xhsSettings 引用
     * @param {number} hourTs - 该整点的时间戳
     */
    async function computeFansForOneHour(s, hourTs) {
        const myName = s.nickname || 'MOMO';

        // ═══ 1. 用户自己的粉丝变化 ═══
        const myScore = await computeAccountVitalityScore(myName, true);
        const myFans = parseInt(s.fansCount) || 0;
        const myDelta = calculateFansDelta(myScore, myFans);

        const hourLabel = new Date(hourTs).getHours().toString().padStart(2, '0') + ':00';
        console.log(`[XHS] ${hourLabel} | 活力分: ${myScore.toFixed(1)}, 粉丝: ${myFans}, 变化: ${myDelta}`);

        if (myDelta !== 0) {
            const newFans = Math.max(0, myFans + myDelta);
            s.fansCount = String(newFans);

            const reason = generateFluctuationReason(myScore, myDelta);
            s.notifications.follows.unshift({
                id: hourTs.toString() + Math.random().toString(36).substr(2, 5),
                type: 'fan_change',
                data: {
                    amount: myDelta,
                    newTotal: newFans,
                    oldTotal: myFans,
                    reason: reason,
                    score: Math.round(myScore * 10) / 10
                },
                timestamp: hourTs,
                isRead: false
            });
            s.notifications.unreadFollows = (s.notifications.unreadFollows || 0) + 1;
        }

        // ═══ 2. 已关注角色的粉丝变化（静默更新） ═══
        const profiles = s.characterProfiles || {};
        for (const [authorName, profile] of Object.entries(profiles)) {
            if (!profile.isFollowed) continue;
            const charScore = await computeAccountVitalityScore(authorName, false);
            const charFans = parseInt(profile.fansCount) || 0;
            const charDelta = calculateFansDelta(charScore, charFans);
            if (charDelta !== 0) {
                profile.fansCount = Math.max(0, charFans + charDelta);
            }
        }
    }

    /**
     * 主计算函数：按自然整点计算粉丝浮动
     * - 检查上次计算时间到当前已经跨越了几个整点
     * - 对每个缺失的整点分别执行一次独立计算并生成记录
     * - 用户自己的变化写入"新增关注"通知列表
     * - 已关注账号的变化静默更新
     */
    async function computeAndApplyFansFluctuation() {
        // 互斥锁：防止定时器和初始化并发调用导致重复计算
        if (_fansFluctuationRunning) return;
        _fansFluctuationRunning = true;

        try {
            const s = window.state?.xhsSettings;
            if (!s || !s.enableFansFluctuation) return;

            // 初始化通知结构
            if (!s.notifications) {
                s.notifications = { engagement: [], comments: [], follows: [], unreadEngagement: 0, unreadComments: 0, unreadFollows: 0 };
            }
            if (!s.notifications.follows) {
                s.notifications.follows = [];
                s.notifications.unreadFollows = 0;
            }
            if (!s.fansFluctuationData) {
                s.fansFluctuationData = { lastFluctuationTime: 0 };
            }

            const now = Date.now();
            const THREE_HOURS_MS = 3 * 3600 * 1000;
            const currentSlot = floorToThreeHours(now); // 当前3小时时间点

            // 如果当前时间还没到下一个3小时时间点，不执行
            const lastTime = s.fansFluctuationData.lastFluctuationTime || 0;
            const lastSlot = lastTime > 0 ? floorToThreeHours(lastTime) : 0;

            if (lastSlot >= currentSlot) {
                return; // 当前时间点已计算过
            }

            console.log('[XHS] 开始3小时粉丝浮动计算...');

            // 计算需要补算的时间点列表
            let startSlot;
            if (lastTime === 0) {
                // 首次运行，只计算当前时间点
                startSlot = currentSlot;
            } else {
                // 从上次计算的下一个3小时时间点开始
                startSlot = lastSlot + THREE_HOURS_MS;
            }

            // 限制最多补算24小时（即8个3小时时间点）
            const maxBackfillMs = 24 * 3600 * 1000;
            if (currentSlot - startSlot > maxBackfillMs) {
                startSlot = currentSlot - maxBackfillMs;
                console.log(`[XHS] 超过24小时未计算，只补算最近24小时`);
            }

            // 逐个3小时时间点执行计算
            let slotCount = 0;
            for (let slotTs = startSlot; slotTs <= currentSlot; slotTs += THREE_HOURS_MS) {
                await computeFansForOneHour(s, slotTs);
                slotCount++;
            }

            // 截断通知列表（最多100条）
            if (s.notifications.follows.length > 100) {
                s.notifications.follows = s.notifications.follows.slice(0, 100);
            }

            // 记录本次计算完成时间为当前时间点
            s.fansFluctuationData.lastFluctuationTime = currentSlot;
            await saveXhsSettings({});
            updateMessageBadges();

            console.log(`[XHS] 粉丝浮动完成，共计算 ${slotCount} 个3小时时间点`);
        } finally {
            _fansFluctuationRunning = false;
        }
    }

    /** 启动粉丝浮动定时器（独立于自动刷新） */
    function startFansFluctuationTimer() {
        if (xhsFansFluctuationTimer) {
            clearInterval(xhsFansFluctuationTimer);
            xhsFansFluctuationTimer = null;
        }

        if (!window.state || !window.state.xhsSettings) {
            setTimeout(startFansFluctuationTimer, 2000);
            return;
        }

        if (!window.state.xhsSettings.enableFansFluctuation) {
            console.log('[XHS] 粉丝浮动功能未开启');
            return;
        }

        console.log('[XHS] 启动粉丝浮动定时器（每3小时触发模式）');
        // 每30秒检查一次是否到达新的整点
        xhsFansFluctuationTimer = setInterval(() => {
            computeAndApplyFansFluctuation().catch(e => console.error('[XHS] 粉丝浮动计算出错:', e));
        }, 30000);

        // 启动时立即执行一次（会补算缺失的整点）
        setTimeout(() => {
            computeAndApplyFansFluctuation().catch(e => console.error('[XHS] 粉丝浮动初始计算出错:', e));
        }, 3000);
    }

    // ── 渲染"新增关注"通知列表 ──
    async function renderNewFollowsList() {
        const container = document.getElementById('xhs-new-follows-list');
        if (!container) return;

        const notifications = window.state?.xhsSettings?.notifications?.follows || [];

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="xhs-notif-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    <p>暂无粉丝变动记录</p>
                    <span style="font-size:12px;color:#ccc;margin-top:4px;">开启粉丝数随机浮动后，变动记录将在此展示</span>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            const d = n.data;
            const isGain = d.amount > 0;
            const isUnread = !n.isRead;
            const absAmount = Math.abs(d.amount);

            const actionText = isGain
                ? `新增 <span class="xhs-notif-highlight xhs-fans-gain">+${absAmount}</span> 位粉丝`
                : `减少 <span class="xhs-notif-highlight xhs-fans-loss">${absAmount}</span> 位粉丝`;

            const totalText = `当前粉丝: ${d.newTotal}`;

            return `
                <div class="xhs-notif-item xhs-notif-fan-change ${isUnread ? 'xhs-notif-unread' : ''}" data-notification-id="${n.id}">
                    <div class="xhs-notif-icon-wrap ${isGain ? 'fans-gain' : 'fans-loss'}">
                        ${isGain
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="11" x2="23" y2="11"/></svg>'}
                    </div>
                    <div class="xhs-notif-body">
                        <div class="xhs-notif-action">${actionText}</div>
                        <div class="xhs-notif-desc">${totalText}</div>
                        ${d.reason ? `<div class="xhs-notif-reason">${d.reason}</div>` : ''}
                        <div class="xhs-notif-time">${formatXhsDate(n.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');

        // 点击条目标记已读
        container.querySelectorAll('.xhs-notif-item').forEach(item => {
            item.onclick = async () => {
                const notificationId = item.dataset.notificationId;
                if (notificationId && window.state?.xhsSettings?.notifications?.follows) {
                    const notification = window.state.xhsSettings.notifications.follows.find(n => n.id === notificationId);
                    if (notification && !notification.isRead) {
                        notification.isRead = true;
                        item.classList.remove('xhs-notif-unread');
                        await saveXhsSettings({});
                        updateMessageBadges();
                    }
                }
            };
        });
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

        // 过滤掉搜索生成的临时笔记和关注页笔记，只显示发现页笔记
        notes = notes.filter(n => !n.isSearchResult && n.feedType !== 'follow');

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
        // 只设置必要的flex样式，不覆盖height（保留外部设置）
        container.style.display = 'flex';
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

        // 移除空状态容器类（该类含 overflow:hidden 和 height:100% 会阻止滚动）
        feeds.discover.classList.remove('xhs-grid-empty-container');
        feeds.discover.style.cssText = '';

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
            if (window.state.xhsSettings?.enableChatMemory !== false) {
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
                    booksContent += `\n《${book.name}》设定:\n${book.content || ''}\n`;
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
        6. "publishTime": 每条笔记的发布时间，格式为 "YYYY-MM-DD HH:mm"。当前时间为 ${new Date().toLocaleString('zh-CN')}。请根据笔记内容合理设定发布时间（在过去24小时内）。如果笔记内容与角色聊天记录有关联，发布时间必须在聊天事件之后，符合时间逻辑。
        
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
                "publishTime": "2024-01-15 14:30",
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

            // 只从设置为"允许发笔记"的角色中选取
            // 如果没有设置任何允许发笔记的角色，则不选取任何角色（只生成路人笔记）
            let candidates = [];
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
                // 安全检查：确保 API 返回了有效数据
                if (!json.candidates || !json.candidates[0] || !json.candidates[0].content || !json.candidates[0].content.parts || !json.candidates[0].content.parts[0]) {
                    console.error("[XHS] Gemini API 返回数据格式异常:", json);
                    throw new Error(json.error?.message || "Gemini API 返回数据格式异常");
                }
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
                // 安全检查：确保 API 返回了有效数据
                if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                    console.error("[XHS] API 返回数据格式异常:", json);
                    throw new Error(json.error?.message || "API 返回数据格式异常");
                }
                responseData = json.choices[0].message.content;
            }

            console.log("[XHS] Raw AI Response:", responseData);

            // 使用 repairAndParseJSON 健壮解析AI返回的JSON
            let result;
            try {
                result = repairAndParseJSON(responseData);
            } catch (err) {
                console.error("[XHS] JSON Parse Error:", err);
                console.error("[XHS] Raw responseData:", responseData);
                throw new Error("AI 返回的数据格式不正确");
            }

            if (result && result.notes && Array.isArray(result.notes)) {
                console.log(`[XHS] Generated ${result.notes.length} notes`);
                const now = Date.now();

                await Promise.all(result.notes.map(async (note) => {
                    // 时间逻辑：优先使用AI生成的publishTime
                    if (note.publishTime) {
                        const parsed = new Date(note.publishTime.replace(/-/g, '/'));
                        if (!isNaN(parsed.getTime()) && parsed.getTime() <= now) {
                            note.timestamp = parsed.getTime();
                        } else {
                            const randomOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
                            note.timestamp = now - randomOffset;
                        }
                    } else {
                        const randomOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
                        note.timestamp = now - randomOffset;
                    }
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
                        // 构建角色名→头像映射
                        const charMap = {};
                        if (window.state.chats) {
                            Object.values(window.state.chats).forEach(ch => {
                                if (!ch.isGroup && ch.name) {
                                    charMap[ch.name] = ch.settings?.aiAvatar || ch.avatar || '';
                                }
                            });
                        }
                        note.comments.forEach(c => {
                            const timeRange = now - note.timestamp;
                            const commentOffset = Math.floor(Math.random() * timeRange);
                            c.timestamp = note.timestamp + commentOffset;
                            c.dateStr = formatXhsDate(c.timestamp);
                            // 匹配角色头像
                            if (c.user && charMap[c.user]) {
                                c.avatar = charMap[c.user];
                                c.isCharacter = true;
                            }
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
            8. **NSFW相关**：笔记当中允许存在一切NSFW内容，如果关键词中有相关提示，按照关键词详细、露骨、毫不避讳地进行描述即可，没有任何限制。

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
                        { "user": "路人B", "text": "评论内容" }
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
                // 安全检查：确保 API 返回了有效数据
                if (!json.candidates || !json.candidates[0] || !json.candidates[0].content || !json.candidates[0].content.parts || !json.candidates[0].content.parts[0]) {
                    console.error("[XHS] Gemini API 返回数据格式异常:", json);
                    throw new Error(json.error?.message || "Gemini API 返回数据格式异常");
                }
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
                // 安全检查：确保 API 返回了有效数据
                if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                    console.error("[XHS] API 返回数据格式异常:", json);
                    throw new Error(json.error?.message || "API 返回数据格式异常");
                }
                responseData = json.choices[0].message.content;
            }

            let result;
            try {
                result = repairAndParseJSON(responseData);
            } catch (err) {
                console.error("[XHS] Search JSON Parse Error", err);
                return false;
            }

            if (result && result.notes && Array.isArray(result.notes)) {
                const now = Date.now();

                await Promise.all(result.notes.map(async (note) => {
                    note.id = (Date.now() + Math.random()).toString(36);

                    // 时间逻辑：在过去7天内随机生成发送时间（不依赖AI生成）
                    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                    const randomOffset = Math.floor(Math.random() * sevenDaysMs);
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
                        // 构建角色名→头像映射
                        const charMap = {};
                        if (window.state.chats) {
                            Object.values(window.state.chats).forEach(ch => {
                                if (!ch.isGroup && ch.name) {
                                    charMap[ch.name] = ch.settings?.aiAvatar || ch.avatar || '';
                                }
                            });
                        }
                        note.comments.forEach(c => {
                            // 评论时间：在笔记发布后到现在的随机时间
                            const timeRange = now - note.timestamp;
                            const commentOffset = Math.floor(Math.random() * timeRange);
                            c.timestamp = note.timestamp + commentOffset;
                            c.dateStr = formatXhsDate(c.timestamp);
                            // 匹配角色头像
                            if (c.user && charMap[c.user]) {
                                c.avatar = charMap[c.user];
                                c.isCharacter = true;
                            }
                        });
                        // 按时间排序
                        note.comments.sort((a, b) => a.timestamp - b.timestamp);
                    }
                }));

                // 搜索结果暂存到临时Map，不写入数据库（用户交互后才持久化）
                result.notes.forEach(note => {
                    note.isSearchTemp = true;
                    xhsSearchTempNotes.set(note.id, note);
                });

                // 渲染到搜索结果区域
                const resultsContainer = document.getElementById('xhs-search-results');
                if (resultsContainer) {
                    // 先重置在loading时设置的样式
                    resultsContainer.style.justifyContent = '';
                    resultsContainer.style.alignItems = '';

                    renderWaterfall(resultsContainer, result.notes, (note) => {
                        const card = createXhsCard(note);
                        // 确保点击能打开
                        card.onclick = () => openXhsNoteDetail(note);
                        return card;
                    });

                    // 修复滚动：确保正确的flex布局
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

    // 加载关注页笔记
    async function loadFollowedUsersNotes() {
        const followFeed = feeds.follow;
        if (!followFeed) return;

        // 获取已关注的角色
        const profiles = window.state.xhsSettings?.characterProfiles || {};
        const followedProfiles = Object.entries(profiles).filter(([name, p]) => p.isFollowed);

        if (followedProfiles.length === 0) {
            followFeed.innerHTML = '<div class="xhs-empty-state"><p>还没有关注的人哦~<br>去发现页看看吧！</p></div>';
            return;
        }

        // 从数据库获取关注用户的笔记
        let followNotes = [];
        if (window.db && window.db.xhsNotes) {
            const allNotes = await window.db.xhsNotes.toArray();
            const followedNames = followedProfiles.map(([name]) => name);
            followNotes = allNotes.filter(n => followedNames.includes(n.authorName) && n.feedType === 'follow');
            followNotes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        if (followNotes.length === 0) {
            followFeed.classList.remove('xhs-waterfall');
            followFeed.classList.add('xhs-grid-empty-container');
            followFeed.style.cssText = '';
            followFeed.innerHTML = '<div class="xhs-empty-state"><p>关注的人还没有发布新内容~<br>点击刷新按钮生成新笔记</p></div>';
            if (followFeed.parentElement) followFeed.parentElement.classList.add('xhs-no-scroll');
            return;
        }
        if (followFeed.parentElement) followFeed.parentElement.classList.remove('xhs-no-scroll');

        // 移除空状态容器类（该类含 overflow:hidden 和 height:100% 会阻止滚动）
        followFeed.classList.remove('xhs-grid-empty-container');
        followFeed.style.cssText = '';

        // 使用与发现页相同的瀑布流渲染
        renderWaterfall(followFeed, followNotes, (note) => {
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

            // 兼容 imageUrl 和 images[0] 两种字段
            const coverImage = note.imageUrl || (note.images && note.images[0]) || '';

            card.innerHTML = `
                <div class="xhs-card-img-wrap xhs-card-img-wrap-ratio">
                    <img src="${coverImage}" class="xhs-card-img xhs-card-img-abs" loading="lazy">
                    ${newMarkerHtml}
                </div>
                <div class="xhs-card-footer">
                    <div class="xhs-card-title">${note.title}</div>
                    <div class="xhs-card-user">
                        <div class="xhs-user-info-mini">
                            <img src="${note.authorAvatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(note.authorName)}" class="xhs-avatar-mini">
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

    // 为已关注角色生成笔记
    async function generateFollowedUsersNotes() {
        if (refreshBtn) refreshBtn.classList.add('spinning');

        try {
            const { proxyUrl, apiKey, model, temperature } = window.state.apiConfig;
            if (!proxyUrl || !apiKey || !model) {
                alert("请先配置 API 设置！");
                if (refreshBtn) refreshBtn.classList.remove('spinning');
                return false;
            }

            // 获取已关注的角色
            const profiles = window.state.xhsSettings?.characterProfiles || {};
            const followedProfiles = Object.entries(profiles).filter(([name, p]) => p.isFollowed);

            if (followedProfiles.length === 0) {
                alert("还没有关注任何人哦~");
                if (refreshBtn) refreshBtn.classList.remove('spinning');
                return false;
            }

            // 随机选择4-6个已关注角色生成笔记（如果不够就全部选择）
            const noteCount = Math.min(followedProfiles.length, Math.floor(Math.random() * 3) + 4);
            const shuffled = [...followedProfiles].sort(() => Math.random() - 0.5);
            const selectedProfiles = shuffled.slice(0, noteCount);

            // 获取角色信息用于生成
            const chatsMap = window.state.chats || {};
            const charactersInfo = selectedProfiles.map(([name, profile]) => {
                const chat = Object.values(chatsMap).find(c => c.name === name && !c.isGroup);
                return {
                    name: name,
                    avatar: profile.avatar,
                    bio: profile.bio || '',
                    persona: chat?.settings?.persona || chat?.settings?.aiPersona || '',
                    chatData: chat
                };
            });

            // 构建记忆互通的聊天记录上下文（合并显示多个角色关联同一聊天的情况）
            let memoryContext = "";
            // chatId -> { chat, linkedBy: Set<charName>, isOwn: boolean, limit: number }
            const chatToCharacters = new Map();

            if (window.state.xhsSettings?.enableChatMemory !== false) {
                for (const charInfo of charactersInfo) {
                    if (!charInfo.chatData) continue;
                    const chat = charInfo.chatData;

                    const ownChatLimit = chat.settings?.maxMemory || 20;
                    const linkedChatLimit = chat.settings?.linkMemoryDepth || 5;

                    // 角色自己的聊天记录
                    if (chat.history && chat.history.length > 0) {
                        if (!chatToCharacters.has(chat.id)) {
                            chatToCharacters.set(chat.id, { chat, linkedBy: new Set(), isOwn: true, limit: ownChatLimit });
                        }
                        chatToCharacters.get(chat.id).linkedBy.add(charInfo.name);
                    }

                    // 收集所有链接的记忆互通聊天
                    const collectLinks = (links) => {
                        if (!links || !Array.isArray(links)) return;
                        for (const link of links) {
                            const linkedChatId = link.chatId;
                            if (link.enabled === false) continue;
                            const linkedChat = chatsMap[linkedChatId];
                            if (linkedChat && linkedChat.history && linkedChat.history.length > 0) {
                                if (!chatToCharacters.has(linkedChatId)) {
                                    chatToCharacters.set(linkedChatId, { chat: linkedChat, linkedBy: new Set(), isOwn: false, limit: linkedChatLimit });
                                }
                                chatToCharacters.get(linkedChatId).linkedBy.add(charInfo.name);
                            }
                        }
                    };

                    collectLinks(chat.settings?.linkedMemories);
                    if (chat.settings?.memoryLinks) {
                        collectLinks(chat.settings.memoryLinks.filter(l => l.enabled));
                    }
                }

                // 格式化记忆上下文，合并关联同一聊天的多个角色
                for (const [chatId, info] of chatToCharacters) {
                    const { chat, linkedBy, isOwn, limit } = info;
                    const recentMsgs = chat.history.slice(-limit);
                    const formattedMsgs = recentMsgs.map(m =>
                        `${m.role === 'user' ? '用户' : chat.name}: ${m.content}`
                    ).join('\n');

                    const charNames = Array.from(linkedBy);
                    let label;
                    if (isOwn && charNames.length === 1) {
                        label = `${charNames[0]}的近期聊天`;
                    } else if (charNames.length > 1) {
                        label = `${charNames.join('、')}等关联的"${chat.name}"聊天记录`;
                    } else {
                        label = `${charNames[0]}关联的${chat.name}聊天记录`;
                    }

                    memoryContext += `\n【${label}】:\n${formattedMsgs}\n`;
                }
            }

            // 构建世界书上下文
            let worldBookContext = "";
            const linkedBookIds = window.state.xhsSettings?.linkedWorldBooks;
            if (linkedBookIds && linkedBookIds.length > 0) {
                let allBooks = window.state.worldBooks || [];
                if (allBooks.length === 0 && window.db && window.db.worldBooks) {
                    allBooks = await window.db.worldBooks.toArray();
                    window.state.worldBooks = allBooks;
                }
                let booksContent = "";
                linkedBookIds.forEach(id => {
                    const book = allBooks.find(b => String(b.id) === String(id));
                    if (book) {
                        booksContent += `\n《${book.name}》设定:\n${book.content || ''}\n`;
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

            // 为每个角色获取近期5条笔记作为参考
            if (window.db && window.db.xhsNotes) {
                try {
                    const allNotes = await window.db.xhsNotes.toArray();
                    for (const charInfo of charactersInfo) {
                        const charNotes = allNotes
                            .filter(n => n.authorName === charInfo.name)
                            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                            .slice(0, 5);
                        charInfo.recentNotes = charNotes;
                    }
                } catch (e) {
                    console.warn('获取角色近期笔记失败:', e);
                }
            }

            const prompt = `
你是一个熟练的小红书内容创作者。请为以下已关注的角色各生成1条小红书笔记。

【角色信息】:
${charactersInfo.map((c, i) => `
${i + 1}. ${c.name}
   - 简介: ${c.bio || '无'}
   - 人设: ${c.persona || '无特定人设'}
${c.recentNotes && c.recentNotes.length > 0 ? `   - 近期发布的笔记（作为风格和内容参考，新笔记应延续该角色风格但不要重复主题）:\n${c.recentNotes.map((n, j) => `     ${j + 1}. 【${n.title}】${n.content}`).join('\n')}` : '   - 暂无近期笔记'}
`).join('\n')}

${worldBookContext}

${memoryContext ? `【角色记忆与近期经历（帮助理解角色关系和当前状态，笔记可以基于这些内容但不要直接复制）】:${memoryContext}` : ''}

【通用要求】：
1. 内容风格必须极度符合小红书特点：
   - 标题党，吸引眼球，使用"绝绝子"、"yyds"、"家人"、"集美"等流行语（适度）。
   - 适当使用 Emoji 表情符号（🌟✨💖🔥等）。
   - 相关的 Hashtag 标签（如 #OOTD #探店 #日常）。
   - 语气轻松、活泼、真实。
   - 笔记正文内容"content"字段当中【绝对不允许】包含任何tag标签。
2. "imagePrompt": 为每条笔记生成一个简短的、描述性的**英文**图片提示词，用于AI生图（例如 "delicious matcha latte art, cozy cafe, realistic"）请注意提示词当中【绝对不允许】出现【人物】。
3. "stats": 随机生成合理的点赞数（likes: 100-2000）和收藏数（collects: 50-500）。
4. 每条笔记必须符合该角色的人设和性格特点。
5. 内容真实自然，避免AI味，不要重复聊天记录原文。
6. "publishTime": 每条笔记的发布时间，格式为 "YYYY-MM-DD HH:mm"。当前时间为 ${new Date().toLocaleString('zh-CN')}。请根据笔记内容和聊天记录的时间线，合理设定发布时间（在过去24小时内）。如果笔记内容与聊天记录有关联，发布时间必须在聊天事件之后，符合时间逻辑。

【JSON返回格式（严格遵守）】：
{
    "notes": [
        {
            "authorName": "角色名字",
            "title": "笔记标题",
            "content": "笔记正文内容...",
            "tags": ["#tag1", "#tag2"],
            "imagePrompt": "english description for visual",
            "publishTime": "2024-01-15 14:30",
            "stats": { "likes": 123, "collects": 45 },
            "location": "城市·地点"
        }
    ]
}

请只返回JSON数据，不要包含markdown代码块标记。
`;

            const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.9;
            const isGemini = proxyUrl.includes("googleapis");
            let responseData;

            if (isGemini) {
                const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp }
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const json = await res.json();
                if (!json.candidates?.[0]?.content) throw new Error("API响应格式异常");
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
                        temperature: requestTemp
                    })
                });
                const json = await res.json();
                if (!json.choices?.[0]?.message) throw new Error(json.error?.message || "API响应格式异常");
                responseData = json.choices[0].message.content;
            }

            // 使用 repairAndParseJSON 健壮解析AI返回的JSON
            const result = repairAndParseJSON(responseData);

            if (result && result.notes && Array.isArray(result.notes)) {
                const now = Date.now();
                let savedCount = 0;

                for (let i = 0; i < result.notes.length; i++) {
                    const n = result.notes[i];
                    const charInfo = charactersInfo.find(c => c.name === n.authorName) || charactersInfo[i];
                    if (!charInfo) continue;

                    // 生成封面图
                    let coverUrl = '';
                    if (n.imagePrompt && window.generatePollinationsImage) {
                        try {
                            coverUrl = await window.generatePollinationsImage(n.imagePrompt, 832, 1110);
                        } catch (e) {
                            console.warn('生成封面图失败:', e);
                        }
                    }

                    const noteData = {
                        id: now.toString() + Math.random().toString(36).substr(2, 9) + i,
                        authorName: charInfo.name,
                        authorAvatar: charInfo.avatar,
                        title: n.title || '无标题',
                        content: n.content || '',
                        tags: n.tags || [],
                        images: coverUrl ? [coverUrl] : [],
                        stats: n.stats || { likes: Math.floor(Math.random() * 500 + 100), collects: Math.floor(Math.random() * 100 + 20) },
                        comments: [],
                        timestamp: (() => {
                            if (n.publishTime) {
                                const parsed = new Date(n.publishTime.replace(/-/g, '/'));
                                if (!isNaN(parsed.getTime()) && parsed.getTime() <= now) return parsed.getTime();
                            }
                            return now - i * 60000;
                        })(),
                        dateStr: '',
                        location: n.location || '',
                        isCharacter: true,
                        isNew: true,
                        feedType: 'follow' // 标记为关注页笔记
                    };
                    noteData.dateStr = formatXhsDate(noteData.timestamp);

                    if (window.db && window.db.xhsNotes) {
                        await window.db.xhsNotes.put(noteData);
                        savedCount++;
                    }
                }

                // 刷新关注页
                await loadFollowedUsersNotes();

                // 显示成功提示
                const toast = document.createElement('div');
                toast.textContent = `✨ 成功生成 ${savedCount} 条关注动态`;
                toast.className = 'xhs-toast';
                document.body.appendChild(toast);
                setTimeout(() => document.body.removeChild(toast), 2000);

                return true;
            }
            return false;

        } catch (e) {
            console.error("生成关注页笔记失败:", e);
            alert("生成失败: " + e.message);
            return false;
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('spinning');
        }
    }

    // 渲染笔记到指定feed容器
    function renderNotesToFeed(notes, feedContainer) {
        if (!feedContainer) return;

        // 清空并设置瀑布流布局
        feedContainer.innerHTML = '';
        feedContainer.classList.add('xhs-waterfall');

        // 创建双列布局
        const leftColumn = document.createElement('div');
        leftColumn.className = 'xhs-waterfall-column';
        const rightColumn = document.createElement('div');
        rightColumn.className = 'xhs-waterfall-column';

        notes.forEach((note, idx) => {
            const card = createNoteCard(note);
            if (idx % 2 === 0) {
                leftColumn.appendChild(card);
            } else {
                rightColumn.appendChild(card);
            }
        });

        feedContainer.appendChild(leftColumn);
        feedContainer.appendChild(rightColumn);
    }

    // 创建笔记卡片
    function createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'xhs-card';
        card.dataset.noteId = note.id;

        const s = window.state.xhsSettings;
        const isLiked = s && s.likedNoteIds && s.likedNoteIds.includes(note.id);
        const heartFill = isLiked ? '#ff2442' : 'none';
        const heartStroke = isLiked ? '#ff2442' : '#666';
        const likeCount = note.stats && note.stats.likes ? note.stats.likes : 0;

        card.innerHTML = `
            ${note.images && note.images[0] ? `<img src="${note.images[0]}" class="xhs-card-img" loading="lazy" />` : ''}
            ${note.isNew ? '<div class="xhs-new-marker">NEW</div>' : ''}
            <div class="xhs-card-footer">
                <div class="xhs-card-title">${note.title}</div>
                <div class="xhs-card-user">
                    <div class="xhs-user-info-mini">
                        <img src="${note.authorAvatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(note.authorName)}" class="xhs-avatar-mini" />
                        <span>${note.authorName}</span>
                    </div>
                    <div class="xhs-like-wrap">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span>${likeCount}</span>
                    </div>
                </div>
            </div>
        `;

        // 绑定点击事件
        card.onclick = () => openXhsNoteDetail(note);

        // 绑定长按事件
        bindLongPress(card, () => {
            showXhsConfirm(`确定要删除这条笔记吗？<br><small style="color:#999">"${note.title}"</small>`, async () => {
                if (window.db && window.db.xhsNotes) {
                    await window.db.xhsNotes.delete(note.id);
                    card.remove();
                }
            });
        }, () => {
            openXhsNoteDetail(note);
        });

        return card;
    }

    function openXhsNoteDetail(note) {
        if (!views.noteDetail) return;

        // 记录当前笔记ID，用于返回时更新列表状态
        views.noteDetail.dataset.currentNoteId = note.id;

        // 如果是新内容，标记为已读并更新数据库
        if (note.isNew) {
            note.isNew = false;
            // 临时搜索笔记不写入数据库
            if (!note.isSearchTemp && window.db && window.db.xhsNotes) {
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

        // 处理笔记内容中的@角色，添加超链接样式（与评论保持一致）
        const noteDescEl = document.getElementById('xhs-detail-desc');
        const formattedContent = formatContentWithMentions(note.content);
        noteDescEl.innerHTML = formattedContent;
        bindContentMentionLinks(noteDescEl);

        document.getElementById('xhs-detail-name').textContent = note.authorName;

        const detailAvatarEl = document.getElementById('xhs-detail-avatar');
        detailAvatarEl.src = note.authorAvatar;

        // 为详情页作者头像添加点击事件
        detailAvatarEl.classList.add('xhs-avatar-clickable');
        const newDetailAvatar = detailAvatarEl.cloneNode(true);
        detailAvatarEl.parentNode.replaceChild(newDetailAvatar, detailAvatarEl);
        newDetailAvatar.onclick = (e) => {
            e.stopPropagation();
            openUserProfile(note.authorName, note.authorAvatar);
        };

        // 作者名称也可点击
        const detailNameEl = document.getElementById('xhs-detail-name');
        detailNameEl.style.cursor = 'pointer';
        const newDetailName = detailNameEl.cloneNode(true);
        detailNameEl.parentNode.replaceChild(newDetailName, detailNameEl);
        newDetailName.onclick = (e) => {
            e.stopPropagation();
            openUserProfile(note.authorName, note.authorAvatar);
        };

        // 绑定详情页关注按钮点击事件
        const detailFollowBtn = document.querySelector('#xhs-note-detail-view .follow-btn');
        if (detailFollowBtn) {
            // 检查是否已有主页并更新按钮状态
            const existingProfile = getCharacterProfile(note.authorName);
            updateDetailFollowButton(detailFollowBtn, existingProfile);

            const newDetailFollowBtn = detailFollowBtn.cloneNode(true);
            detailFollowBtn.parentNode.replaceChild(newDetailFollowBtn, detailFollowBtn);
            newDetailFollowBtn.onclick = async (e) => {
                e.stopPropagation();
                await handleDetailFollowClick(note.authorName, note.authorAvatar, newDetailFollowBtn);
            };
        }

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

        // 图片（兼容 imageUrl 和 images[0] 两种字段）
        const mediaWrap = document.getElementById('xhs-detail-images');
        const detailCoverImage = note.imageUrl || (note.images && note.images[0]) || '';
        mediaWrap.innerHTML = `<img src="${detailCoverImage}" class="xhs-media-img">`;

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

                        // 只有回复楼中楼时才添加"回复 @用户"前缀
                        // replyingToSubId 存在表示是回复楼中楼，否则是回复主评论
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

                // 保存并刷新（临时搜索笔记先持久化）
                if (note.isSearchTemp) {
                    note.isSearchTemp = false;
                    xhsSearchTempNotes.delete(note.id);
                }
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
                        <img src="${avatarUrl}" class="avatar xhs-avatar-clickable" data-author-name="${c.user}" data-author-avatar="${avatarUrl}">
                        <div class="content-wrap">
                            <div class="user-name xhs-avatar-clickable" data-author-name="${c.user}" data-author-avatar="${avatarUrl}" style="cursor: pointer;">${c.user}</div>
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

                    // 绑定评论区头像和用户名点击事件
                    const commentAvatar = cItem.querySelector('.avatar');
                    const commentUserName = cItem.querySelector('.user-name');

                    if (commentAvatar) {
                        commentAvatar.onclick = (e) => {
                            e.stopPropagation();
                            openUserProfile(c.user, avatarUrl);
                        };
                    }

                    if (commentUserName) {
                        commentUserName.onclick = (e) => {
                            e.stopPropagation();
                            openUserProfile(c.user, avatarUrl);
                        };
                    }

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

                    // 绑定长按事件：删除评论；点击事件：回复
                    // ★ excludeSelector 排除头像、用户名、点赞按钮，防止手机端点击这些元素时触发回复
                    bindLongPress(cItem,
                        // 长按 - 删除评论
                        () => {
                            showXhsConfirm(`确定删除这条评论吗？<br><small style="color:#999">@${c.user}: "${c.text.substring(0, 20)}${c.text.length > 20 ? '...' : ''}"</small>`, async () => {
                                const index = note.comments.indexOf(c);
                                if (index > -1) {
                                    note.comments.splice(index, 1);
                                    if (window.db && window.db.xhsNotes) await window.db.xhsNotes.put(note);
                                    renderComments();
                                    updateCommentCount();
                                }
                            });
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
                        },
                        true,
                        '.xhs-avatar-clickable, .comment-like-btn'
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
                                <img src="${rAvatar}" class="avatar xhs-avatar-clickable" data-author-name="${reply.user}" data-author-avatar="${rAvatar}">
                                <div class="content-wrap">
                                    <div class="user-name xhs-avatar-clickable" data-author-name="${reply.user}" data-author-avatar="${rAvatar}" style="cursor: pointer;">${reply.user}</div>
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

                            // 子评论头像和用户名点击事件
                            const subAvatar = rItem.querySelector('.avatar');
                            const subUserName = rItem.querySelector('.user-name');

                            if (subAvatar) {
                                subAvatar.onclick = (e) => {
                                    e.stopPropagation();
                                    openUserProfile(reply.user, rAvatar);
                                };
                            }

                            if (subUserName) {
                                subUserName.onclick = (e) => {
                                    e.stopPropagation();
                                    openUserProfile(reply.user, rAvatar);
                                };
                            }

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

                            // 绑定长按事件：删除子评论；点击事件：回复
                            // ★ excludeSelector 排除头像、用户名、点赞按钮
                            bindLongPress(rItem,
                                // 长按 - 只删除该条子评论，不影响主评论
                                () => {
                                    showXhsConfirm(`确定删除这条回复吗？<br><small style="color:#999">@${reply.user}: "${reply.text.substring(0, 20)}${reply.text.length > 20 ? '...' : ''}"</small>`, async () => {
                                        const index = c.replies.indexOf(reply);
                                        if (index > -1) {
                                            c.replies.splice(index, 1);
                                            if (window.db && window.db.xhsNotes) await window.db.xhsNotes.put(note);
                                            renderComments();
                                            updateCommentCount();
                                        }
                                    });
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
                                false, // 禁止特效
                                '.xhs-avatar-clickable, .sub-comment-like-btn'
                            ); subContainer.appendChild(rItem);
                        });
                    }

                    commentList.appendChild(cItem);
                });
            } else {
                commentList.innerHTML = '<p class="xhs-empty-state-sm">暂无评论，快来抢沙发~</p>';
            }

            // 为所有评论文本中的@角色添加超链接样式
            bindMentionLinks();
        };

        // 将笔记正文内容中的@角色转换为可点击的超链接
        function formatContentWithMentions(content) {
            if (!content) return '';
            const mentionPattern = /@([^\s@：:，。！？\n]+)/g;
            // 先处理换行，再处理@角色
            return content
                .replace(/\n/g, '<br>')
                .replace(mentionPattern, '<span class="xhs-mention-link" data-user="$1">@$1</span>');
        }

        // 为笔记内容中的@角色绑定点击事件
        function bindContentMentionLinks(container) {
            if (!container) return;
            container.querySelectorAll('.xhs-mention-link').forEach(link => {
                link.onclick = (e) => {
                    e.stopPropagation();
                    const userName = link.dataset.user;
                    if (userName) {
                        // 智能匹配角色获取用户信息
                        const userInfo = getUserInfo(userName);
                        openUserProfile(userInfo.name, userInfo.avatar);
                    }
                };
            });
        }

        // 将评论文本中的@角色转换为可点击的超链接
        function formatCommentTextWithMentions(text) {
            // 匹配 "回复 @角色：" 或单独的 "@角色"
            const replyPattern = /^(回复\s*)(@[^：:]+)([:：]\s*)/;
            const mentionPattern = /@([^\s@：:]+)/g;

            // 首先处理 "回复 @角色：" 格式
            const replyMatch = text.match(replyPattern);
            if (replyMatch) {
                const prefix = replyMatch[1]; // "回复 "
                const mention = replyMatch[2]; // "@角色"
                const separator = replyMatch[3]; // "："
                const restText = text.substring(replyMatch[0].length);
                const userName = mention.substring(1); // 去掉@符号

                return `<span class="xhs-reply-prefix">${prefix}<span class="xhs-mention-link" data-user="${userName}">${mention}</span>${separator}</span>${restText.replace(mentionPattern, '<span class="xhs-mention-link" data-user="$1">@$1</span>')}`;
            }

            // 处理普通的@角色
            return text.replace(mentionPattern, '<span class="xhs-mention-link" data-user="$1">@$1</span>');
        }

        // 绑定所有@角色超链接的点击事件
        function bindMentionLinks() {
            const commentList = document.getElementById('xhs-detail-comment-list');
            if (!commentList) return;

            // 重新处理所有评论文本，添加超链接
            commentList.querySelectorAll('.text').forEach(textEl => {
                const originalText = textEl.textContent;
                textEl.innerHTML = formatCommentTextWithMentions(originalText);
            });

            // 绑定点击事件
            commentList.querySelectorAll('.xhs-mention-link').forEach(link => {
                link.onclick = (e) => {
                    e.stopPropagation();
                    const userName = link.dataset.user;
                    if (userName) {
                        // 智能匹配角色获取用户信息
                        const userInfo = getUserInfo(userName);
                        openUserProfile(userInfo.name, userInfo.avatar);
                    }
                };
            });
        }

        // 生成评论核心函数
        async function generateCommentsForNote() {
            const generateBtn = document.getElementById('xhs-generate-comments-btn');
            if (generateBtn) {
                generateBtn.classList.add('loading');
                generateBtn.querySelector('span').textContent = '生成中...';
            }

            try {
                const { proxyUrl, apiKey, model, temperature } = window.state.apiConfig;
                if (!proxyUrl || !apiKey || !model) {
                    alert("请先在设置中配置API Key");
                    return;
                }

                const s = window.state.xhsSettings;
                const allowedPosters = s?.allowedPosters || [];
                const availableChars = Object.values(window.state.chats || {}).filter(c => !c.isGroup);
                const myName = s?.nickname || "我";

                // 获取允许发笔记的角色（有人设的角色）
                let characterCandidates = [];
                if (allowedPosters.length > 0) {
                    characterCandidates = availableChars.filter(c => allowedPosters.includes(c.id));
                }

                // 随机选择3个角色
                const shuffledChars = characterCandidates.sort(() => Math.random() - 0.5);
                const selectedChars = shuffledChars.slice(0, 3);

                // ========== 新增：检查笔记是否是用户发布的，以及笔记内容中被@的角色 ==========
                const isFirstComment = !note.comments || note.comments.length === 0;
                const isUserNote = note.isMine === true;
                const noteMentionedCharacters = new Set(); // 笔记内容中被@的角色

                // 从笔记内容中提取@的角色
                if (note.content) {
                    const noteMentions = note.content.match(/@([^\s@：:]+)/g) || [];
                    noteMentions.forEach(m => noteMentionedCharacters.add(m.substring(1)));
                }

                // 如果笔记保存了mentionedCharacters字段，也加入
                if (note.mentionedCharacters && Array.isArray(note.mentionedCharacters)) {
                    note.mentionedCharacters.forEach(name => noteMentionedCharacters.add(name));
                }

                // 分析当前评论区，找出用户发布的未被回复的评论
                const unrepliedUserComments = [];
                const commentMentionedCharacters = new Set(); // 未被回复评论中被@的角色
                const mustReplyByMainAuthor = []; // 楼中楼中没有@任何人的未回复评论，主评论作者必须回复

                if (note.comments && note.comments.length > 0) {
                    note.comments.forEach(c => {
                        // 检查是否是用户的评论且未被回复
                        if (c.isMine) {
                            const hasReply = c.replies && c.replies.length > 0;
                            if (!hasReply) {
                                unrepliedUserComments.push({
                                    type: 'main',
                                    comment: c,
                                    parentId: null
                                });

                                // 【修改】只检查未被回复的评论中的@角色
                                const mentions = extractMentions(c.text);
                                mentions.forEach(name => commentMentionedCharacters.add(name));
                            }
                        }

                        // 检查楼中楼
                        if (c.replies && c.replies.length > 0) {
                            c.replies.forEach(reply => {
                                if (reply.isMine) {
                                    // 检查是否是楼中楼中用户评论的最后一条（后面没有其他人回复）
                                    const replyIndex = c.replies.indexOf(reply);
                                    const hasFollowingReply = c.replies.slice(replyIndex + 1).some(r => !r.isMine);
                                    if (!hasFollowingReply) {
                                        unrepliedUserComments.push({
                                            type: 'reply',
                                            comment: reply,
                                            parentId: c.id,
                                            parentUser: c.user
                                        });

                                        // 【修改】只检查未被回复的评论中的@角色
                                        const mentions = extractMentions(reply.text);
                                        if (mentions.length > 0) {
                                            mentions.forEach(name => commentMentionedCharacters.add(name));
                                        } else {
                                            // 没有@任何人的楼中楼评论，主评论作者必须回复
                                            mustReplyByMainAuthor.push({
                                                comment: reply,
                                                parentId: c.id,
                                                mainAuthor: c.user
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    });
                }

                // 从评论内容中提取@的角色名
                function extractMentions(text) {
                    const matches = text.match(/@([^\s@：:]+)/g) || [];
                    return matches.map(m => m.substring(1)); // 去掉@符号
                }

                // ========== 修改：分别处理笔记@的角色和评论@的角色 ==========
                // 1. 笔记内容中被@的角色（首次评论时必须参与）
                const noteMustCommentCharacters = [];
                if (isUserNote && isFirstComment && noteMentionedCharacters.size > 0) {
                    noteMentionedCharacters.forEach(name => {
                        const char = availableChars.find(c => c.name === name);
                        if (char) {
                            noteMustCommentCharacters.push(char);
                        }
                    });
                }

                // 2. 未被回复的评论中被@的角色（必须回复这些评论）
                const mustReplyCharacters = [];
                commentMentionedCharacters.forEach(name => {
                    const char = availableChars.find(c => c.name === name);
                    if (char) {
                        mustReplyCharacters.push(char);
                    }
                });

                // 3. 楼中楼中没有@任何人的未回复评论，主评论作者必须回复
                const mainAuthorsMustReply = [];
                mustReplyByMainAuthor.forEach(item => {
                    const char = availableChars.find(c => c.name === item.mainAuthor);
                    if (char && !mainAuthorsMustReply.find(c => c.id === char.id)) {
                        mainAuthorsMustReply.push(char);
                    }
                });

                // 4. 【新增】笔记原作者必须在楼中楼回复已有评论
                const noteAuthorName = note.authorName;
                const isNoteByCharacter = !isUserNote;
                let noteAuthorChar = null;
                let noteAuthorUnrepliedComments = []; // 笔记原作者尚未回复的评论

                if (isNoteByCharacter && noteAuthorName && !isFirstComment) {
                    // 查找笔记原作者对应的角色
                    noteAuthorChar = availableChars.find(c => c.name === noteAuthorName);

                    // 找出笔记原作者尚未回复的主评论（非自己发的）
                    if (note.comments && note.comments.length > 0) {
                        note.comments.forEach(c => {
                            if (c.user !== noteAuthorName) {
                                // 检查笔记作者是否已在楼中楼中回复过这条主评论
                                const authorReplied = c.replies && c.replies.some(r => r.user === noteAuthorName);
                                if (!authorReplied) {
                                    noteAuthorUnrepliedComments.push(c);
                                }
                            }
                        });
                    }
                }

                // 构建聊天记录上下文（如果启用）
                let chatMemoryContext = "";
                const processedChatIds = new Set(); // 用于去重聊天记录（包括链接的记忆互通聊天）

                if (s?.enableChatMemory !== false) {
                    const memoryParts = [];

                    // 获取角色的聊天记录（包括链接的记忆互通聊天）
                    const getCharacterMemory = (char) => {
                        const chat = window.state.chats[char.id];
                        if (!chat) return [];

                        const memories = [];

                        // 1. 获取角色自己的聊天记录
                        if (chat.history && chat.history.length > 0 && !processedChatIds.has(char.id)) {
                            processedChatIds.add(char.id);
                            const limit = chat.settings?.maxMemory || 10;
                            const recentMsgs = chat.history.slice(-limit);
                            if (recentMsgs.length > 0) {
                                const formattedMsgs = recentMsgs.map(m =>
                                    `${m.role === 'user' ? myName : char.name}: ${m.content}`
                                ).join('\n');
                                memories.push(`【${char.name}的近期聊天】:\n${formattedMsgs}`);
                            }
                        }

                        // 2. 获取链接的记忆互通聊天记录
                        if (chat.settings?.linkedMemories && Array.isArray(chat.settings.linkedMemories)) {
                            const linkDepth = chat.settings.linkMemoryDepth || 5;
                            for (const link of chat.settings.linkedMemories) {
                                const linkedChatId = link.chatId;
                                // 检查是否已经处理过这个聊天记录
                                if (processedChatIds.has(linkedChatId)) continue;

                                const linkedChat = window.state.chats[linkedChatId];
                                if (linkedChat && linkedChat.history && linkedChat.history.length > 0) {
                                    processedChatIds.add(linkedChatId);
                                    const linkedMsgs = linkedChat.history.slice(-linkDepth);
                                    if (linkedMsgs.length > 0) {
                                        const linkedCharName = linkedChat.name || '未知角色';
                                        const formattedLinkedMsgs = linkedMsgs.map(m =>
                                            `${m.role === 'user' ? myName : linkedCharName}: ${m.content}`
                                        ).join('\n');
                                        memories.push(`【${char.name}关联的${linkedCharName}聊天记录】:\n${formattedLinkedMsgs}`);
                                    }
                                }
                            }
                        }

                        return memories;
                    };

                    // 处理选中的角色
                    for (const char of selectedChars) {
                        const memories = getCharacterMemory(char);
                        if (memories && memories.length > 0) {
                            memoryParts.push(...memories);
                        }
                    }

                    // 处理笔记@的角色（首次评论时必须参与）
                    for (const char of noteMustCommentCharacters) {
                        const memories = getCharacterMemory(char);
                        if (memories && memories.length > 0) {
                            memoryParts.push(...memories);
                        }
                    }

                    // 处理必须回复的角色（未被回复评论中@的角色）
                    for (const char of mustReplyCharacters) {
                        const memories = getCharacterMemory(char);
                        if (memories && memories.length > 0) {
                            memoryParts.push(...memories);
                        }
                    }

                    // 处理主评论作者必须回复的情况
                    for (const char of mainAuthorsMustReply) {
                        const memories = getCharacterMemory(char);
                        if (memories && memories.length > 0) {
                            memoryParts.push(...memories);
                        }
                    }

                    // 处理笔记原作者（楼中楼回复）
                    if (noteAuthorChar) {
                        const memories = getCharacterMemory(noteAuthorChar);
                        if (memories && memories.length > 0) {
                            memoryParts.push(...memories);
                        }
                    }

                    if (memoryParts.length > 0) {
                        chatMemoryContext = `\n【角色聊天记录参考】:\n${memoryParts.join('\n\n')}`;
                    }
                }

                // 构建角色设定上下文
                let characterSettings = "";
                const allCommentingChars = [...selectedChars];

                // 添加笔记@的角色
                noteMustCommentCharacters.forEach(char => {
                    if (!allCommentingChars.find(c => c.id === char.id)) {
                        allCommentingChars.push(char);
                    }
                });

                // 添加必须回复的角色
                mustReplyCharacters.forEach(char => {
                    if (!allCommentingChars.find(c => c.id === char.id)) {
                        allCommentingChars.push(char);
                    }
                });

                // 添加主评论作者必须回复的角色
                mainAuthorsMustReply.forEach(char => {
                    if (!allCommentingChars.find(c => c.id === char.id)) {
                        allCommentingChars.push(char);
                    }
                });

                // 添加笔记原作者（必须楼中楼回复）
                if (noteAuthorChar && !allCommentingChars.find(c => c.id === noteAuthorChar.id)) {
                    allCommentingChars.push(noteAuthorChar);
                }

                if (allCommentingChars.length > 0) {
                    const settingsParts = allCommentingChars.map(char => {
                        const persona = char.settings?.aiPersona || "普通用户";
                        return `- ${char.name}: ${persona}`;
                    });
                    characterSettings = `\n【参与评论的角色设定】:\n${settingsParts.join('\n')}`;
                }

                // 构建角色收藏夹上下文（用于AI判断是否收藏本笔记）
                let collectionContext = "";
                const charCollectionInfos = [];
                const profiles = window.state.xhsSettings?.characterProfiles || {};
                for (const char of allCommentingChars) {
                    const charProfile = profiles[char.name];
                    if (charProfile && charProfile.collectionFolders && charProfile.collectionFolders.length > 0) {
                        const folderList = charProfile.collectionFolders.map(f => `「${f.name}」(${f.noteIds.length}篇)`).join('、');
                        charCollectionInfos.push(`- ${char.name} 的收藏夹: ${folderList}`);
                    } else {
                        charCollectionInfos.push(`- ${char.name}: 暂无收藏夹`);
                    }
                }
                if (charCollectionInfos.length > 0) {
                    collectionContext = `\n【参与评论角色的收藏夹信息】:\n${charCollectionInfos.join('\n')}\n请根据角色性格和笔记内容判断每个角色是否会收藏这篇笔记。如果收藏，指定放入哪个已有收藏夹或新建收藏夹。`;
                }

                // 构建未回复评论列表
                let unrepliedContext = "";
                if (unrepliedUserComments.length > 0) {
                    const unrepliedList = unrepliedUserComments.map((item, idx) => {
                        if (item.type === 'main') {
                            return `${idx + 1}. 主评论(ID:${item.comment.id}): "${item.comment.text}"`;
                        } else {
                            return `${idx + 1}. 楼中楼回复(在${item.parentUser}评论下,ID:${item.comment.id}): "${item.comment.text}"`;
                        }
                    }).join('\n');
                    unrepliedContext = `\n【用户"${myName}"的未被回复的评论（必须回复这些！）】:\n${unrepliedList}`;
                }

                // 构建笔记@角色必须评论的上下文（仅首次评论时）
                let noteMentionContext = "";
                if (noteMustCommentCharacters.length > 0) {
                    noteMentionContext = `\n【笔记内容中@的角色（这些角色必须参与评论，作为主评论）】:\n${noteMustCommentCharacters.map(c => c.name).join('、')}`;
                }

                // 构建未被回复评论中@的角色必须回复的上下文
                let mustReplyContext = "";
                if (mustReplyCharacters.length > 0) {
                    mustReplyContext = `\n【未被回复评论中@的角色（这些角色必须回复对应的评论）】:\n${mustReplyCharacters.map(c => c.name).join('、')}`;
                }

                // 构建主评论作者必须回复的上下文（楼中楼中没有@任何人的评论）
                let mainAuthorMustReplyContext = "";
                if (mustReplyByMainAuthor.length > 0) {
                    const list = mustReplyByMainAuthor.map((item, idx) =>
                        `${idx + 1}. 在主评论(ID:${item.parentId})的楼中楼中，用户评论(ID:${item.comment.id}): "${item.comment.text}" - 主评论作者"${item.mainAuthor}"必须在楼中楼内回复`
                    ).join('\n');
                    mainAuthorMustReplyContext = `\n【楼中楼中没有@任何人的未回复评论（主评论作者必须在楼中楼内回复）】:\n${list}`;
                }

                // 构建现有评论上下文
                let existingCommentsContext = "";
                if (note.comments && note.comments.length > 0) {
                    const commentsList = note.comments.slice(-10).map(c => {
                        let text = `- ${c.user}: "${c.text}"`;
                        if (c.replies && c.replies.length > 0) {
                            const repliesList = c.replies.slice(-3).map(r => `  └ ${r.user}: "${r.text}"`).join('\n');
                            text += '\n' + repliesList;
                        }
                        return text;
                    }).join('\n');
                    existingCommentsContext = `\n【当前评论区已有的评论（用于参考，避免重复）】:\n${commentsList}`;
                }

                // 构建世界书上下文
                let worldBookContext = "";
                const linkedBookIds = window.state.xhsSettings?.linkedWorldBooks;
                if (linkedBookIds && linkedBookIds.length > 0) {
                    let allBooks = window.state.worldBooks || [];
                    if (allBooks.length === 0 && window.db && window.db.worldBooks) {
                        allBooks = await window.db.worldBooks.toArray();
                        window.state.worldBooks = allBooks;
                    }
                    let booksContent = "";
                    linkedBookIds.forEach(id => {
                        const book = allBooks.find(b => String(b.id) === String(id));
                        if (book) {
                            booksContent += `\n《${book.name}》设定:\n${book.content || ''}\n`;
                        }
                    });
                    if (booksContent) {
                        worldBookContext = `\n【世界观设定】:\n请确保生成的评论内容符合以下世界观设定：${booksContent}`;
                    }
                }

                // 构建笔记原作者必须回复的上下文
                let noteAuthorReplyContext = "";
                if (isNoteByCharacter && noteAuthorChar && !isFirstComment) {
                    if (noteAuthorUnrepliedComments.length > 0) {
                        // 优先回复用户的未回复评论
                        const userUnreplied = noteAuthorUnrepliedComments.filter(c => c.isMine);
                        const othersUnreplied = noteAuthorUnrepliedComments.filter(c => !c.isMine);
                        const targetComments = userUnreplied.length > 0 ? userUnreplied : othersUnreplied.slice(0, 2);
                        const list = targetComments.map((c, idx) =>
                            `${idx + 1}. 主评论(ID:${c.id}), 用户"${c.user}": "${c.text}"`
                        ).join('\n');
                        noteAuthorReplyContext = `\n【笔记原作者"${noteAuthorName}"必须回复的评论】:\n${list}`;
                    } else {
                        // 没有未回复的评论，从已有评论中随机选1条回复
                        const nonAuthorComments = (note.comments || []).filter(c => c.user !== noteAuthorName);
                        if (nonAuthorComments.length > 0) {
                            const randomComment = nonAuthorComments[Math.floor(Math.random() * nonAuthorComments.length)];
                            noteAuthorReplyContext = `\n【笔记原作者"${noteAuthorName}"必须回复的评论】:\n1. 主评论(ID:${randomComment.id}), 用户"${randomComment.user}": "${randomComment.text}"`;
                        }
                    }
                }

                // 构建prompt
                const prompt = `
                你是一个小红书评论生成器。请为以下笔记生成评论。

                【笔记信息】:
                - 标题: ${note.title}
                - 内容: ${note.content}
                - 作者: ${note.authorName}
                - 是否首次生成评论: ${isFirstComment ? '是' : '否'}
                ${characterSettings}
                ${collectionContext}
                ${chatMemoryContext}
                ${worldBookContext}
                ${existingCommentsContext}
                ${unrepliedContext}
                ${noteMentionContext}
                ${mustReplyContext}
                ${mainAuthorMustReplyContext}
                ${noteAuthorReplyContext}

                【评论生成规则】:
                1. 生成5条随机评论：从以下角色中选择发评论:
                   - 角色（有人设）: ${selectedChars.map(c => c.name).join('、') || '无'}
                   - 路人用户: 随机生成2个路人网名
   
                2. 评论类型分配（在5条随机评论中）:
                   - 2-3条主评论（直接评论笔记内容，不能包含"回复@"字样）
                   - 2-3条楼中楼回复（回复已有的评论，必须在楼中楼内，笔记首次生成评论时不需要楼中楼回复）

                3. 【重要-主评论格式】主评论是对笔记内容的直接评论，绝对不能出现"回复 @xxx"这种格式。只有楼中楼回复才使用"回复 @xxx"格式。

                4. ${unrepliedUserComments.length > 0 ? `【重要】必须回复用户"${myName}"的所有未被回复的评论！这些回复必须在对应的楼中楼内，不是新的主评论。不计入5条随机评论数量。` : '如果用户有评论未被回复，优先回复用户的评论。'}

                5. ${noteMustCommentCharacters.length > 0 ? `【重要-笔记@角色】笔记内容中@了这些角色（${noteMustCommentCharacters.map(c => c.name).join('、')}），这是首次生成评论，这些角色必须发表主评论（不是楼中楼回复）！不计入5条随机评论数量。评论内容要体现被作者@的感觉，比如"被cue到了"、"你@我干嘛"等互动感，但不要出现"回复 @"格式。` : ''}

                6. ${mustReplyCharacters.length > 0 ? `【重要-回复@角色】用户未被回复的评论中@了这些角色（${mustReplyCharacters.map(c => c.name).join('、')}），这些角色必须在楼中楼内回复对应@他们的评论！不计入5条随机评论数量。` : ''}

                7. ${mustReplyByMainAuthor.length > 0 ? `【重要-主评论作者楼中楼回复】楼中楼中有用户发的未回复且没有@任何角色的评论，主评论的原作者必须在同一楼中楼内回复该评论！具体要求：${mustReplyByMainAuthor.map(item => `"${item.mainAuthor}"必须在其主评论(ID:${item.parentId})的楼中楼内回复用户评论"${item.comment.text}"，格式为"回复 @${myName}：评论内容"`).join('；')}。这些回复必须设置replyToCommentId为对应的主评论ID，不是新的主评论！不计入5条随机评论数量。` : ''}

                8. ${(isNoteByCharacter && noteAuthorChar && !isFirstComment) ? `【重要-笔记原作者楼中楼回复】笔记原作者"${noteAuthorName}"必须以楼中楼回复的方式回复上方指定的评论！回复格式为"回复 @被回复者：评论内容"，设置replyToCommentId为对应的主评论ID。${unrepliedUserComments.filter(c => noteAuthorUnrepliedComments.some(nc => nc.id === c.comment?.id)).length > 0 ? `其中用户"${myName}"的评论必须优先回复！` : ''}笔记原作者的回复不计入5条随机评论数量，且评论内容要符合笔记作者的身份和语气。` : ''}

                9. 楼中楼回复格式规则:
                   - 只有楼中楼回复才使用格式: "回复 @被回复者：评论内容"
                   - 主评论绝对不能使用"回复 @"格式
                   - isMainComment为true时，text中不能有"回复 @"

                10. 评论风格要求:
                   - 符合小红书风格，可使用emoji、网络用语
                   - 有人设的角色要符合其人设特点
                   - 路人评论要多样化，有正面也可以有中性评价
                   - 评论长度适中，有长有短

                11. 互动数据增量：根据本次生成的评论质量和热度，估算应该增加的点赞和收藏数：
                   - 评论越正面热情，互动增量越高
                   - 有角色参与评论时互动通常更活跃
                   - 点赞增量范围：10-100，收藏增量范围：5-30

                12. 收藏判断：对于每个有收藏夹的角色（isCharacter=true的评论者），根据该角色的性格和这篇笔记的内容，判断该角色是否会将这篇笔记收藏。
                   - 不是所有角色都会收藏，要符合角色兴趣
                   - 如果收藏，指定放入哪个已有收藏夹（填写收藏夹名称），或新建一个收藏夹（填写新名称）
                   - 只有有人设的角色才需要判断，路人用户不需要

                【JSON返回格式】:
                {
                    "comments": [
                        {
                            "user": "评论者名字",
                            "text": "评论内容",
                            "isCharacter": true/false,
                            "isMainComment": true/false,
                            "replyToCommentId": "如果是楼中楼回复，填写被回复的主评论ID，否则为null",
                            "replyToUser": "如果是楼中楼回复，填写被回复的用户名，否则为null",
                            "isMustReply": true/false
                        }
                    ],
                    "engagement": {
                        "likesIncrease": 数字(10-100)，依当前笔记质量、互动情况而定，可高可低,
                        "collectsIncrease": 数字(5-30),
                        "reason": "简短说明为什么给这个增量（30字以内）"
                    },
                    "collectionUpdates": [
                        {
                            "user": "角色名",
                            "action": "add_to_existing 或 create_new 或 none",
                            "folderName": "收藏夹名称（action为none时可省略）",
                            "reason": "简短说明为什么收藏或不收藏"
                        }
                    ]
                }

                现有评论的ID列表供参考:
                ${note.comments ? note.comments.map(c => `主评论ID:${c.id}, 用户:${c.user}`).join('\n') : '暂无评论'}

                请只返回JSON数据，不要包含markdown代码块标记。
                `;

                let responseData;
                const isGemini = proxyUrl.includes("googleapis");
                const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.9;

                if (isGemini) {
                    const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const body = {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: requestTemp }
                    };
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const json = await res.json();
                    if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
                        throw new Error("API响应格式异常");
                    }
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
                            temperature: requestTemp
                        })
                    });
                    const json = await res.json();
                    if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                        throw new Error(json.error?.message || "API响应格式异常");
                    }
                    responseData = json.choices[0].message.content;
                }

                // 使用 repairAndParseJSON 健壮解析AI返回的JSON
                const result = repairAndParseJSON(responseData);

                if (result && result.comments && Array.isArray(result.comments)) {
                    const now = Date.now();

                    // 确保note.comments存在
                    if (!note.comments) note.comments = [];

                    // 用于存储新生成的评论以添加通知
                    const newCommentsForNotification = [];

                    // 处理每条生成的评论
                    for (const genComment of result.comments) {
                        // 获取角色头像
                        let avatar;
                        if (genComment.isCharacter) {
                            const char = availableChars.find(c => c.name === genComment.user);
                            avatar = char?.settings?.aiAvatar || char?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(genComment.user)}`;
                        } else {
                            avatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(genComment.user)}`;
                        }

                        const newComment = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            user: genComment.user,
                            avatar: avatar,
                            text: genComment.text,
                            timestamp: now,
                            dateStr: formatXhsDate(now),
                            likes: Math.floor(Math.random() * 50),
                            isLiked: false,
                            isMine: false
                        };

                        if (genComment.isMainComment || !genComment.replyToCommentId) {
                            // 主评论 - 确保不包含"回复 @"格式
                            if (newComment.text.match(/^回复\s*[@＠]/)) {
                                // 移除错误的"回复 @xxx："格式
                                newComment.text = newComment.text.replace(/^回复\s*[@＠][^\s：:]+[：:]\s*/, '');
                            }
                            note.comments.push(newComment);
                            newCommentsForNotification.push({
                                comment: newComment,
                                isReplyToComment: false,
                                originalCommentId: null,
                                originalCommentText: null
                            });
                        } else {
                            // 楼中楼回复
                            const parentComment = note.comments.find(c => c.id === genComment.replyToCommentId);
                            if (parentComment) {
                                if (!parentComment.replies) parentComment.replies = [];
                                // 确保回复格式正确
                                if (genComment.replyToUser && !newComment.text.startsWith('回复')) {
                                    newComment.text = `回复 @${genComment.replyToUser}：${newComment.text}`;
                                }
                                parentComment.replies.push(newComment);

                                // 检查是否是回复用户的评论（楼中楼回复）
                                const myName = window.state.xhsSettings?.nickname || "我";
                                const isReplyToMyComment = genComment.replyToUser === myName || parentComment.isMine;
                                let originalText = parentComment.text;
                                let originalId = parentComment.id;

                                // 如果是回复楼中楼中的用户评论，找到原评论
                                if (genComment.replyToUser === myName && parentComment.replies) {
                                    const myReply = parentComment.replies.find(r => r.isMine && r.user === myName);
                                    if (myReply) {
                                        originalText = myReply.text;
                                        originalId = myReply.id;
                                    }
                                }

                                newCommentsForNotification.push({
                                    comment: newComment,
                                    isReplyToComment: isReplyToMyComment,
                                    originalCommentId: isReplyToMyComment ? originalId : null,
                                    originalCommentText: isReplyToMyComment ? originalText : null
                                });
                            } else {
                                // 如果找不到父评论，作为主评论添加
                                note.comments.push(newComment);
                                newCommentsForNotification.push({
                                    comment: newComment,
                                    isReplyToComment: false,
                                    originalCommentId: null,
                                    originalCommentText: null
                                });
                            }
                        }
                    }

                    // 添加评论通知记录
                    for (const item of newCommentsForNotification) {
                        await addXhsNotification('comment', {
                            noteId: note.id,
                            noteTitle: note.title,
                            noteCover: note.images?.[0] || note.imageUrl || note.cover || '',
                            userName: item.comment.user,
                            userAvatar: item.comment.avatar,
                            text: item.comment.text,
                            timestamp: item.comment.timestamp,
                            isReplyToComment: item.isReplyToComment,
                            originalCommentId: item.originalCommentId,
                            originalCommentText: item.originalCommentText,
                            isOwnNote: note.isMine === true
                        });
                    }

                    // 处理互动数据增量
                    if (result.engagement) {
                        if (!note.stats) note.stats = { likes: 0, collects: 0 };
                        const likesInc = parseInt(result.engagement.likesIncrease) || Math.floor(Math.random() * 30 + 10);
                        const collectsInc = parseInt(result.engagement.collectsIncrease) || Math.floor(Math.random() * 10 + 5);
                        note.stats.likes = (note.stats.likes || 0) + likesInc;
                        note.stats.collects = (note.stats.collects || 0) + collectsInc;

                        // 更新详情页显示
                        const likeCountEl = document.getElementById('xhs-detail-like-count');
                        const collectCountEl = document.getElementById('xhs-detail-collect-count');
                        if (likeCountEl) likeCountEl.textContent = note.stats.likes;
                        if (collectCountEl) collectCountEl.textContent = note.stats.collects;

                        // 添加点赞收藏通知记录
                        await addXhsNotification('engagement', {
                            noteId: note.id,
                            noteTitle: note.title,
                            noteCover: note.images?.[0] || note.imageUrl || note.cover || '',
                            likesIncrease: likesInc,
                            collectsIncrease: collectsInc,
                            reason: result.engagement.reason || '评论互动带来的热度提升',
                            timestamp: now,
                            isOwnNote: note.isMine === true
                        });

                        console.log(`[XHS] 互动增量 - 点赞+${likesInc}, 收藏+${collectsInc}`, result.engagement.reason || '');
                    }

                    // 处理角色收藏夹更新
                    if (result.collectionUpdates && Array.isArray(result.collectionUpdates)) {
                        const charProfiles = window.state.xhsSettings?.characterProfiles || {};
                        let profilesChanged = false;

                        for (const update of result.collectionUpdates) {
                            if (!update.user || update.action === 'none' || !update.action) continue;
                            const charProfile = charProfiles[update.user];
                            if (!charProfile) continue;

                            if (!charProfile.collectionFolders) {
                                charProfile.collectionFolders = [];
                            }

                            const noteIdStr = String(note.id);

                            if (update.action === 'add_to_existing') {
                                const folder = charProfile.collectionFolders.find(f => f.name === update.folderName);
                                if (folder && !folder.noteIds.includes(noteIdStr)) {
                                    folder.noteIds.push(noteIdStr);
                                    // 更新封面
                                    folder.cover = note.imageUrl || (note.images && note.images[0]) || folder.cover;
                                    profilesChanged = true;
                                    console.log(`[XHS] ${update.user} 将笔记收藏到「${folder.name}」: ${update.reason || ''}`);
                                }
                            } else if (update.action === 'create_new' && update.folderName) {
                                // 检查是否已有同名收藏夹
                                const existing = charProfile.collectionFolders.find(f => f.name === update.folderName);
                                if (existing) {
                                    if (!existing.noteIds.includes(noteIdStr)) {
                                        existing.noteIds.push(noteIdStr);
                                        existing.cover = note.imageUrl || (note.images && note.images[0]) || existing.cover;
                                    }
                                } else {
                                    charProfile.collectionFolders.push({
                                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                        name: update.folderName,
                                        noteIds: [noteIdStr],
                                        cover: note.imageUrl || (note.images && note.images[0]) || ''
                                    });
                                }
                                profilesChanged = true;
                                console.log(`[XHS] ${update.user} 新建收藏夹「${update.folderName}」并收藏笔记: ${update.reason || ''}`);
                            }
                        }

                        if (profilesChanged) {
                            await saveXhsSettings({});
                        }
                    }

                    // 给用户点赞数为0或1的评论添加点赞（必须添加，数量接近其他评论平均值）
                    if (note.comments && note.comments.length > 0) {
                        const myName = window.state.xhsSettings?.nickname || "我";
                        const commentLikesNotifications = [];

                        // 计算其他评论的平均点赞数
                        let totalLikes = 0;
                        let commentCount = 0;
                        note.comments.forEach(comment => {
                            if (!comment.isMine && comment.likes > 0) {
                                totalLikes += comment.likes;
                                commentCount++;
                            }
                            if (comment.replies) {
                                comment.replies.forEach(reply => {
                                    if (!reply.isMine && reply.likes > 0) {
                                        totalLikes += reply.likes;
                                        commentCount++;
                                    }
                                });
                            }
                        });
                        const avgLikes = commentCount > 0 ? Math.max(3, Math.round(totalLikes / commentCount)) : 5;

                        // 遍历所有评论，查找用户的评论
                        note.comments.forEach(comment => {
                            // 检查主评论 - 包括likes为undefined、0或1的情况
                            const commentLikes = comment.likes || 0;
                            if (comment.isMine && commentLikes <= 1) {
                                // 必须添加点赞，数量接近平均值（±2波动）
                                const likeIncrease = Math.max(1, avgLikes + Math.floor(Math.random() * 5) - 2);
                                comment.likes = commentLikes + likeIncrease;
                                commentLikesNotifications.push({
                                    commentId: comment.id,
                                    commentText: comment.text,
                                    isReply: false,
                                    parentUser: null,
                                    likeIncrease: likeIncrease
                                });
                            }
                            // 检查楼中楼回复
                            if (comment.replies && comment.replies.length > 0) {
                                comment.replies.forEach(reply => {
                                    const replyLikes = reply.likes || 0;
                                    if (reply.isMine && replyLikes <= 1) {
                                        // 必须添加点赞，数量接近平均值（±2波动）
                                        const likeIncrease = Math.max(1, avgLikes + Math.floor(Math.random() * 5) - 2);
                                        reply.likes = replyLikes + likeIncrease;
                                        commentLikesNotifications.push({
                                            commentId: reply.id,
                                            commentText: reply.text,
                                            isReply: true,
                                            parentUser: comment.user,
                                            likeIncrease: likeIncrease
                                        });
                                    }
                                });
                            }
                        });

                        // 添加评论点赞通知
                        for (const item of commentLikesNotifications) {
                            await addXhsNotification('engagement', {
                                noteId: note.id,
                                noteTitle: note.title,
                                noteCover: note.images?.[0] || note.imageUrl || note.cover || '',
                                likesIncrease: item.likeIncrease,
                                collectsIncrease: 0,
                                isCommentLike: true,
                                commentText: item.commentText,
                                isReply: item.isReply,
                                parentUser: item.parentUser,
                                reason: `你的评论"${item.commentText.substring(0, 20)}${item.commentText.length > 20 ? '...' : ''}"获得了${item.likeIncrease}个赞`,
                                timestamp: now,
                                isOwnNote: note.isMine === true
                            });
                        }

                        if (commentLikesNotifications.length > 0) {
                            console.log(`[XHS] 用户评论获得点赞 - ${commentLikesNotifications.length}条评论`);
                        }
                    }

                    // 更新消息页红点
                    updateMessageBadges();

                    // 保存到数据库（临时搜索笔记先持久化）
                    if (note.isSearchTemp) {
                        note.isSearchTemp = false;
                        xhsSearchTempNotes.delete(note.id);
                    }
                    if (window.db && window.db.xhsNotes) {
                        await window.db.xhsNotes.put(note);
                    }

                    // 重新渲染评论
                    renderComments();
                    updateCommentCount();

                    // 显示成功提示
                    const toast = document.createElement('div');
                    const engagementText = result.engagement ? ` | 点赞+${result.engagement.likesIncrease || 0} 收藏+${result.engagement.collectsIncrease || 0}` : '';
                    toast.textContent = `成功生成 ${result.comments.length} 条评论${engagementText}`;
                    toast.className = 'xhs-toast';
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 2500);
                }

            } catch (e) {
                console.error("生成评论失败:", e);
                alert("生成评论失败: " + e.message);
            } finally {
                if (generateBtn) {
                    generateBtn.classList.remove('loading');
                    generateBtn.querySelector('span').textContent = '生成评论';
                }
            }
        }

        // 绑定生成评论按钮
        const generateCommentsBtn = document.getElementById('xhs-generate-comments-btn');
        if (generateCommentsBtn) {
            const newGenerateBtn = generateCommentsBtn.cloneNode(true);
            generateCommentsBtn.parentNode.replaceChild(newGenerateBtn, generateCommentsBtn);
            newGenerateBtn.onclick = generateCommentsForNote;
        }

        // 绑定分享按钮
        const shareBtn = document.getElementById('xhs-detail-share-btn');
        if (shareBtn) {
            const newShareBtn = shareBtn.cloneNode(true);
            shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
            newShareBtn.onclick = () => showShareModal(note);
        }

        renderComments();
        bringToFront(views.noteDetail); // 动态提升z-index，确保在最上面
        views.noteDetail.style.display = 'flex';
    }

    // 暴露 openXhsNoteDetail 到全局，供其他模块调用
    window.openXhsNoteDetail = openXhsNoteDetail;

    // 显示分享弹窗
    function showShareModal(note) {
        // 创建分享弹窗
        let modal = document.getElementById('xhs-share-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'xhs-share-modal';
        modal.className = 'xhs-modal-overlay';
        modal.innerHTML = `
            <div class="xhs-share-modal-content">
                <div class="xhs-share-header">
                    <span>转发到聊天</span>
                    <span class="xhs-share-close">&times;</span>
                </div>
                <div class="xhs-share-preview">
                    <div class="xhs-share-card">
                        <img class="xhs-share-cover" src="${note.images?.[0] || note.imageUrl || ''}" onerror="this.style.display='none'" />
                        <div class="xhs-share-info">
                            <div class="xhs-share-title">${note.title}</div>
                            <div class="xhs-share-author">
                                <img src="${note.authorAvatar}" class="xhs-share-avatar" />
                                <span>${note.authorName}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="xhs-share-chat-list" id="xhs-share-chat-list">
                    <!-- 聊天列表由JS生成 -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // 关闭按钮
        modal.querySelector('.xhs-share-close').onclick = () => {
            modal.remove();
        };

        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // 加载聊天列表（包含私聊和群聊）
        const chatList = modal.querySelector('#xhs-share-chat-list');
        const chats = Object.values(window.state.chats || {});

        if (chats.length === 0) {
            chatList.innerHTML = '<div class="xhs-empty-state" style="padding: 30px;">暂无可转发的聊天</div>';
            return;
        }

        chatList.innerHTML = chats.map(chat => `
            <div class="xhs-share-chat-item" data-chat-id="${chat.id}">
                <img class="xhs-share-chat-avatar" src="${chat.settings?.aiAvatar || chat.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(chat.name)}" />
                <div class="xhs-share-chat-name">${chat.name}</div>
            </div>
        `).join('');

        // 绑定聊天点击事件
        chatList.querySelectorAll('.xhs-share-chat-item').forEach(item => {
            item.onclick = async () => {
                const chatId = item.dataset.chatId;
                await shareNoteToChat(note, chatId);
                modal.remove();

                // 显示成功提示
                const toast = document.createElement('div');
                toast.textContent = '✨ 已转发到聊天';
                toast.className = 'xhs-toast';
                document.body.appendChild(toast);
                setTimeout(() => document.body.removeChild(toast), 2000);
            };
        });
    }

    // 转发笔记到聊天
    async function shareNoteToChat(note, chatId) {
        const chat = window.state.chats[chatId];
        if (!chat) return;

        // 创建分享卡片消息（使用 chat.history 以兼容 QQ 聊天系统）
        // 保存完整笔记数据，以便点击卡片时可以打开完整详情
        const shareMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            role: 'user',
            content: `[分享小红书笔记] ${note.title}`,
            timestamp: Date.now(),
            type: 'xhs-share',
            shareData: {
                noteId: note.id,
                title: note.title,
                cover: note.images?.[0] || note.imageUrl || '',
                imageUrl: note.imageUrl || '',
                images: note.images || [],
                authorName: note.authorName,
                authorAvatar: note.authorAvatar,
                content: note.content || '', // 保存完整内容，不截断
                stats: note.stats,
                tags: note.tags || [],
                dateStr: note.dateStr || '',
                location: note.location || '',
                comments: note.comments || []
            }
        };

        // 添加到聊天记录（使用 history 以兼容 QQ 聊天系统）
        if (!chat.history) chat.history = [];
        chat.history.push(shareMessage);

        // 保存到数据库
        if (window.db && window.db.chats) {
            await window.db.chats.put(chat);
        }

        // 更新state
        window.state.chats[chatId] = chat;
    }

    // 当前激活的首页Tab（discover/follow）
    let currentHomeTab = 'discover';

    // 绑定事件
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (currentHomeTab === 'follow') {
                // 关注页：为已关注角色生成笔记
                await generateFollowedUsersNotes();
            } else {
                // 发现页：原有逻辑
                await generateXhsNotes();
            }
        });
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
            if (currentHomeTab === 'follow') {
                // 关注页：只清除关注页笔记
                showXhsConfirm("确定要清空关注页的所有笔记吗？", async () => {
                    if (window.db && window.db.xhsNotes) {
                        try {
                            const allNotes = await window.db.xhsNotes.toArray();
                            const followNotes = allNotes.filter(n => n.feedType === 'follow');
                            for (const note of followNotes) {
                                await deleteXhsNote(note.id);
                            }
                            await loadFollowedUsersNotes();

                            const toast = document.createElement('div');
                            toast.textContent = '关注页笔记已清空';
                            toast.className = 'xhs-toast';
                            document.body.appendChild(toast);
                            setTimeout(() => document.body.removeChild(toast), 2000);
                        } catch (e) {
                            console.error(e);
                            alert("清空失败: " + e.message);
                        }
                    }
                });
            } else {
                // 发现页：显示带选项的弹窗
                showXhsDeleteDiscoverConfirm();
            }
        });
    }

    /* =========================================
        6. 页面交互逻辑 (切换、搜索、发布)
       ========================================= */

    // 发现页清空笔记弹窗（带可选项）
    function showXhsDeleteDiscoverConfirm() {
        const modal = document.createElement('div');
        modal.className = 'xhs-confirm-modal';
        modal.innerHTML = `
            <div class="xhs-confirm-content" style="max-width: 320px;">
                <div class="xhs-confirm-message">
                    确定要清空发现页的笔记吗？<br>此操作不可恢复！
                    <div style="margin-top: 15px; text-align: left; font-size: 14px;">
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="xhs-del-followed" style="width: 16px; height: 16px;">
                            <span>同时清除已关注用户的笔记</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="xhs-del-collected" style="width: 16px; height: 16px;">
                            <span>同时清除已收藏的笔记</span>
                        </label>
                    </div>
                </div>
                <div class="xhs-confirm-actions">
                    <button class="xhs-confirm-btn xhs-confirm-cancel">取消</button>
                    <div class="xhs-confirm-divider"></div>
                    <button class="xhs-confirm-btn xhs-confirm-ok">删除</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('visible'));

        const close = () => {
            modal.classList.remove('visible');
            setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
        };

        modal.querySelector('.xhs-confirm-cancel').onclick = close;
        modal.querySelector('.xhs-confirm-ok').onclick = async () => {
            const deleteFollowed = document.getElementById('xhs-del-followed').checked;
            const deleteCollected = document.getElementById('xhs-del-collected').checked;
            close();

            if (window.db && window.db.xhsNotes) {
                try {
                    const s = window.state.xhsSettings;
                    const allNotes = await window.db.xhsNotes.toArray();
                    // 筛选发现页笔记（非搜索、非关注页）
                    const discoverNotes = allNotes.filter(n => !n.isSearchResult && n.feedType !== 'follow');

                    // 获取已关注作者名
                    const profiles = s.characterProfiles || {};
                    const followedNames = new Set(
                        Object.entries(profiles).filter(([_, p]) => p.isFollowed).map(([name]) => name)
                    );
                    // 获取已收藏笔记ID
                    const collectedIds = new Set(s.collectedNoteIds || []);

                    let deletedCount = 0;
                    for (const note of discoverNotes) {
                        const isFollowedAuthor = followedNames.has(note.authorName);
                        const isCollected = collectedIds.has(note.id);

                        // 未勾选 "同时清除已关注" → 保留已关注用户的笔记
                        if (!deleteFollowed && isFollowedAuthor) continue;
                        // 未勾选 "同时清除已收藏" → 保留已收藏笔记
                        if (!deleteCollected && isCollected) continue;

                        await deleteXhsNote(note.id);
                        deletedCount++;
                    }

                    loadXhsNotes();
                    if (window.renderXhsProfile) window.renderXhsProfile();

                    const toast = document.createElement('div');
                    toast.textContent = `已清空 ${deletedCount} 条发现页笔记`;
                    toast.className = 'xhs-toast';
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 2000);
                } catch (e) {
                    console.error(e);
                    alert("清空失败: " + e.message);
                }
            }
        };
    }

    if (xhsAppIcon) {
        xhsAppIcon.addEventListener('click', () => {
            if (window.showScreen) {
                window.showScreen('xhs-screen');
                // 重置到首页发现页
                currentHomeTab = 'discover';
                topTabItems.forEach(t => {
                    t.classList.remove('active');
                    if (t.dataset.target === 'discover') t.classList.add('active');
                });
                if (feeds.discover) feeds.discover.style.display = '';
                if (feeds.follow) feeds.follow.style.display = 'none';
                if (feeds.local) feeds.local.style.display = 'none';
                // 重置底部导航到首页
                bottomNavItems.forEach(nav => nav.classList.remove('active'));
                if (bottomNavItems[0]) bottomNavItems[0].classList.add('active');
                // 隐藏其他视图，显示首页
                hideAllMainViews();
                if (views.home) views.home.style.display = 'flex';
                window.renderXhsProfile();
                loadXhsNotes();
            } else {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                if (xhsScreen) xhsScreen.classList.add('active');
            }
        });
    }

    function hideAllMainViews() {
        // 隐藏所有主视图
        Object.values(views).forEach(view => {
            if (view) view.style.display = 'none';
        });
        // 隐藏视频占位页
        const videoPlaceholder = document.getElementById('xhs-video-view-placeholder');
        if (videoPlaceholder) videoPlaceholder.style.display = 'none';
        // 隐藏赞和收藏列表页
        const likesView = document.getElementById('xhs-likes-collects-view');
        if (likesView) likesView.style.display = 'none';
        // 隐藏评论和@列表页
        const commentsView = document.getElementById('xhs-comments-at-view');
        if (commentsView) commentsView.style.display = 'none';
        // 隐藏新增关注页
        const newFollowsView = document.getElementById('xhs-new-follows-view');
        if (newFollowsView) newFollowsView.style.display = 'none';
        // 隐藏搜索页
        const searchView = document.getElementById('xhs-search-view');
        if (searchView) {
            searchView.classList.remove('active');
            searchView.style.display = 'none';
        }
        // 隐藏创建笔记页
        const createView = document.getElementById('xhs-create-view');
        if (createView) {
            createView.classList.remove('active');
            createView.style.display = 'none';
        }
    }

    bottomNavItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            bottomNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            hideAllMainViews();

            if (index === 0) {
                if (views.home) views.home.style.display = 'flex';
                // 同步顶部分页标签与当前激活的tab
                topTabItems.forEach(t => {
                    t.classList.remove('active');
                    if (t.dataset.target === currentHomeTab) t.classList.add('active');
                });
                if (currentHomeTab === 'follow') {
                    if (feeds.discover) feeds.discover.style.display = 'none';
                    if (feeds.follow) feeds.follow.style.display = '';
                    if (feeds.local) feeds.local.style.display = 'none';
                    loadFollowedUsersNotes();
                } else if (currentHomeTab === 'local') {
                    if (feeds.discover) feeds.discover.style.display = 'none';
                    if (feeds.follow) feeds.follow.style.display = 'none';
                    // 触发tab点击以创建local feed
                    topTabItems.forEach(t => { if (t.dataset.target === 'local') t.click(); });
                } else {
                    if (feeds.discover) feeds.discover.style.display = '';
                    if (feeds.follow) feeds.follow.style.display = 'none';
                    if (feeds.local) feeds.local.style.display = 'none';
                    loadXhsNotes();
                }
            } else if (index === 1) {
                // 视频页占位
                let videoView = document.getElementById('xhs-video-view-placeholder');
                if (!videoView) {
                    videoView = document.createElement('div');
                    videoView.id = 'xhs-video-view-placeholder';
                    videoView.className = 'xhs-view';
                    videoView.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background-color: #000; z-index: 1;';
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
            currentHomeTab = target; // 更新当前激活的tab
            if (feeds.discover) feeds.discover.style.display = 'none';
            if (feeds.follow) feeds.follow.style.display = 'none';
            // 隐藏附近页占位
            if (feeds.local) feeds.local.style.display = 'none';

            // 切换tab时清除共享父容器的滚动锁定（各tab的load函数会按需重新设置）
            const contentArea = document.querySelector('.xhs-content-area');
            if (contentArea) contentArea.classList.remove('xhs-no-scroll');

            if (target === 'discover') {
                if (feeds.discover) feeds.discover.style.display = '';
                loadXhsNotes(); // 重新加载以确保滚动状态正确
            } else if (target === 'follow') {
                if (feeds.follow) feeds.follow.style.display = '';
                // 加载关注页笔记
                loadFollowedUsersNotes();
            } else if (target === 'local') {
                // 附近页 - 显示占位内容
                if (!feeds.local) {
                    const localFeed = document.createElement('div');
                    localFeed.id = 'xhs-local-feed';
                    localFeed.className = 'xhs-grid-empty-container';
                    localFeed.innerHTML = `
                        <div class="xhs-empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="xhs-empty-icon">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <p>开发中，敬请期待</p>
                            <p class="xhs-text-refresh" style="font-size:12px;color:#999">功能即将上线~</p>
                        </div>
                    `;
                    // 插入到 content-area 中
                    const contentArea = feeds.discover ? feeds.discover.parentElement : document.querySelector('.xhs-content-area');
                    if (contentArea) contentArea.appendChild(localFeed);
                    feeds.local = localFeed;
                }
                feeds.local.style.display = '';
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
                // 清除未持久化的搜索临时笔记
                xhsSearchTempNotes.clear();
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
        // 初始化发布笔记功能
        initXhsNoteCreator();
    }

    /* =========================================
        6.1 发布笔记功能完整实现
       ========================================= */
    function initXhsNoteCreator() {
        // 状态管理
        let currentStep = 'step1';
        let coverType = null; // 'text', 'upload', 'ai'
        let coverImageData = null; // Base64或URL
        let selectedTexture = 0;
        let noteTags = [];
        let noteLocation = '';
        let mentionedCharacters = []; // 被@的角色列表
        let cropImageSrc = null;
        let cropScale = 1;
        let cropOffsetX = 0;
        let cropOffsetY = 0;
        let currentCropRatio = 3 / 4;

        // 纹理背景配置（预设渐变）
        const defaultTextures = [
            { name: '渐变紫', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', type: 'gradient' },
            { name: '渐变橙', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', type: 'gradient' },
            { name: '渐变蓝', css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', type: 'gradient' },
            { name: '渐变绿', css: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', type: 'gradient' },
            { name: '渐变粉', css: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', type: 'gradient' },
            { name: '深蓝', css: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)', type: 'gradient' },
            { name: '暖阳', css: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', type: 'gradient' },
            { name: '星空', css: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)', type: 'gradient' },
            { name: '火焰', css: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)', type: 'gradient' },
            { name: '森林', css: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', type: 'gradient' }
        ];

        // 自定义背景存储（从localStorage加载）
        let customTextures = [];
        try {
            const saved = localStorage.getItem('xhs-custom-textures');
            if (saved) customTextures = JSON.parse(saved);
        } catch (e) { }

        // 合并纹理列表
        const getTextures = () => [...defaultTextures, ...customTextures];

        // DOM元素
        const steps = {
            step1: document.getElementById('xhs-create-step1'),
            step2Text: document.getElementById('xhs-create-step2-text'),
            step2Upload: document.getElementById('xhs-create-step2-upload'),
            step2Ai: document.getElementById('xhs-create-step2-ai'),
            step2Crop: document.getElementById('xhs-create-step2-crop'),
            step3: document.getElementById('xhs-create-step3')
        };

        // 切换步骤
        function showStep(stepName) {
            Object.values(steps).forEach(step => {
                if (step) step.classList.remove('active');
            });
            if (steps[stepName]) {
                steps[stepName].classList.add('active');
                currentStep = stepName;
            }
        }

        // 重置状态
        function resetCreator() {
            currentStep = 'step1';
            coverType = null;
            coverImageData = null;
            selectedTexture = 0;
            noteTags = [];
            noteLocation = '';
            mentionedCharacters = [];
            cropImageSrc = null;
            cropScale = 1;
            cropOffsetX = 0;
            cropOffsetY = 0;

            // 重置输入框
            const titleInput = document.getElementById('xhs-text-cover-title-input');
            if (titleInput) titleInput.value = '';
            const noteTitleInput = document.getElementById('xhs-note-title-input');
            if (noteTitleInput) noteTitleInput.value = '';
            const contentInput = document.getElementById('xhs-note-content-input');
            if (contentInput) contentInput.value = '';
            const tagInput = document.getElementById('xhs-tag-input');
            if (tagInput) tagInput.value = '';
            const tagsContainer = document.getElementById('xhs-tags-container');
            if (tagsContainer) tagsContainer.innerHTML = '';
            const locationText = document.getElementById('xhs-location-text');
            if (locationText) {
                locationText.textContent = '点击选择地点';
                locationText.classList.remove('selected');
            }
            const aiPromptInput = document.getElementById('xhs-ai-prompt-input');
            if (aiPromptInput) aiPromptInput.value = '';

            // 重置预览
            const textPreview = document.getElementById('xhs-text-cover-title-preview');
            if (textPreview) textPreview.textContent = '在此输入标题';
            const uploadPreview = document.getElementById('xhs-upload-preview');
            if (uploadPreview) {
                uploadPreview.style.display = 'none';
                uploadPreview.src = '';
            }
            const uploadPlaceholder = document.getElementById('xhs-upload-placeholder');
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
            const aiPreviewImg = document.getElementById('xhs-ai-preview-img');
            if (aiPreviewImg) {
                aiPreviewImg.style.display = 'none';
                aiPreviewImg.src = '';
            }
            const aiPlaceholder = document.getElementById('xhs-ai-preview-placeholder');
            if (aiPlaceholder) aiPlaceholder.style.display = 'flex';
            const urlInput = document.getElementById('xhs-url-input');
            if (urlInput) urlInput.value = '';

            // 更新计数
            updateTitleCount();
            updateContentCount();

            showStep('step1');
        }

        // 打开创建界面
        createBtn.onclick = () => {
            resetCreator();
            createView.classList.add('active');
            createView.style.display = 'block';
            bringToFront(createView);
        };

        // 关闭按钮
        const closeBtn = document.getElementById('xhs-create-close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                createView.classList.remove('active');
                createView.style.display = 'none';
            };
        }

        // 返回按钮
        document.querySelectorAll('.xhs-create-back').forEach(btn => {
            btn.onclick = () => {
                const backTo = btn.dataset.back;
                if (backTo === 'step1') {
                    showStep('step1');
                } else if (backTo === 'step2-upload') {
                    showStep('step2Upload');
                }
            };
        });

        // 内容页返回按钮
        const contentBackBtn = document.getElementById('xhs-content-back');
        if (contentBackBtn) {
            contentBackBtn.onclick = () => {
                if (coverType === 'text') {
                    showStep('step2Text');
                } else if (coverType === 'upload') {
                    showStep('step2Crop');
                } else if (coverType === 'ai') {
                    showStep('step2Ai');
                }
            };
        }

        // === 步骤1: 选择封面类型 ===
        document.querySelectorAll('.xhs-cover-option').forEach(option => {
            option.onclick = () => {
                coverType = option.dataset.type;
                if (coverType === 'text') {
                    initTextureList();
                    showStep('step2Text');
                } else if (coverType === 'upload') {
                    showStep('step2Upload');
                } else if (coverType === 'ai') {
                    showStep('step2Ai');
                }
            };
        });

        // === 步骤2a: 文字图 ===
        function initTextureList() {
            const listEl = document.getElementById('xhs-texture-list');
            if (!listEl) return;
            listEl.innerHTML = '';

            const textures = getTextures();
            textures.forEach((tex, idx) => {
                const item = document.createElement('div');
                item.className = 'xhs-texture-item' + (idx === selectedTexture ? ' active' : '') + (tex.type === 'image' ? ' custom-bg' : '');

                if (tex.type === 'image') {
                    item.style.backgroundImage = `url(${tex.css})`;
                    item.style.backgroundSize = 'cover';
                    item.style.backgroundPosition = 'center';

                    // 长按删除自定义背景
                    bindLongPress(item, () => {
                        showXhsConfirm('确定删除这个自定义背景吗？', () => {
                            deleteCustomTexture(idx - defaultTextures.length);
                        });
                    }, () => {
                        document.querySelectorAll('.xhs-texture-item').forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        selectedTexture = idx;
                        updateTextCoverPreview();
                    }, false);
                } else {
                    item.style.background = tex.css;
                    item.onclick = () => {
                        document.querySelectorAll('.xhs-texture-item').forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        selectedTexture = idx;
                        updateTextCoverPreview();
                    };
                }

                listEl.appendChild(item);
            });

            // 在纹理列表末尾添加上传按钮（方形图标）
            const uploadBtn = document.createElement('div');
            uploadBtn.className = 'xhs-texture-upload-btn';
            uploadBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            `;
            uploadBtn.onclick = () => textureUploadInput.click();
            listEl.appendChild(uploadBtn);

            updateTextCoverPreview();
        }

        // 删除自定义背景
        function deleteCustomTexture(customIdx) {
            if (customIdx >= 0 && customIdx < customTextures.length) {
                customTextures.splice(customIdx, 1);
                localStorage.setItem('xhs-custom-textures', JSON.stringify(customTextures));
                // 如果当前选中的是被删除的，重置为第一个
                if (selectedTexture >= defaultTextures.length + customIdx) {
                    selectedTexture = 0;
                }
                initTextureList();
            }
        }

        // 上传自定义背景（仅使用隐藏的input）
        const textureUploadInput = document.getElementById('xhs-texture-upload-input');

        if (textureUploadInput) {
            textureUploadInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const imageData = ev.target.result;
                    // 添加到自定义背景列表
                    customTextures.push({
                        name: '自定义背景',
                        css: imageData,
                        type: 'image'
                    });
                    localStorage.setItem('xhs-custom-textures', JSON.stringify(customTextures));

                    // 选中新添加的背景
                    selectedTexture = getTextures().length - 1;
                    initTextureList();
                };
                reader.readAsDataURL(file);
                textureUploadInput.value = '';
            };
        }

        function updateTextCoverPreview() {
            const canvas = document.getElementById('xhs-text-cover-canvas');
            const preview = document.getElementById('xhs-text-cover-title-preview');
            const textures = getTextures();
            if (canvas && textures[selectedTexture]) {
                const tex = textures[selectedTexture];
                if (tex.type === 'image') {
                    canvas.style.background = `url(${tex.css}) center/cover no-repeat`;
                } else {
                    canvas.style.background = tex.css;
                }
            }
            const titleInput = document.getElementById('xhs-text-cover-title-input');
            if (preview && titleInput) {
                preview.textContent = titleInput.value || '在此输入标题';
            }
        }

        const textTitleInput = document.getElementById('xhs-text-cover-title-input');
        if (textTitleInput) {
            textTitleInput.oninput = updateTextCoverPreview;
        }

        // 文字图下一步
        const textNextBtn = document.getElementById('xhs-text-cover-next');
        if (textNextBtn) {
            textNextBtn.onclick = async () => {
                const titleInput = document.getElementById('xhs-text-cover-title-input');
                const title = titleInput ? titleInput.value.trim() : '';
                if (!title) {
                    alert('请输入标题文字');
                    return;
                }

                // 生成文字图
                textNextBtn.textContent = '生成中...';
                textNextBtn.style.opacity = '0.5';

                try {
                    const textures = getTextures();
                    const selectedTex = textures[selectedTexture];
                    coverImageData = await generateTextCoverImage(title, selectedTex);
                    goToContentStep(title);
                } catch (e) {
                    console.error('生成文字图失败:', e);
                    alert('生成失败，请重试');
                } finally {
                    textNextBtn.textContent = '下一步';
                    textNextBtn.style.opacity = '1';
                }
            };
        }

        // 生成文字图
        async function generateTextCoverImage(text, texture) {
            const canvas = document.createElement('canvas');
            canvas.width = 832;
            canvas.height = 1110;
            const ctx = canvas.getContext('2d');

            // 根据类型处理背景
            if (texture.type === 'image') {
                // 图片背景
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        // 居中裁剪绘制
                        const imgRatio = img.width / img.height;
                        const canvasRatio = canvas.width / canvas.height;
                        let sx, sy, sw, sh;

                        if (imgRatio > canvasRatio) {
                            sh = img.height;
                            sw = sh * canvasRatio;
                            sx = (img.width - sw) / 2;
                            sy = 0;
                        } else {
                            sw = img.width;
                            sh = sw / canvasRatio;
                            sx = 0;
                            sy = (img.height - sh) / 2;
                        }

                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                        resolve();
                    };
                    img.onerror = () => reject(new Error('加载背景图片失败'));
                    img.src = texture.css;
                });
            } else {
                // 渐变背景
                const gradient = texture.css;
                const gradientMatch = gradient.match(/linear-gradient\((\d+)deg,\s*(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb[a]?\([^)]+\))\s*\d*%?,\s*(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb[a]?\([^)]+\))\s*\d*%?\)/);
                if (gradientMatch) {
                    const angle = parseInt(gradientMatch[1]) || 135;
                    const color1 = gradientMatch[2].trim();
                    const color2 = gradientMatch[3].trim();

                    const rad = (angle - 90) * Math.PI / 180;
                    const x1 = canvas.width / 2 - Math.cos(rad) * canvas.width;
                    const y1 = canvas.height / 2 - Math.sin(rad) * canvas.height;
                    const x2 = canvas.width / 2 + Math.cos(rad) * canvas.width;
                    const y2 = canvas.height / 2 + Math.sin(rad) * canvas.height;

                    const grd = ctx.createLinearGradient(x1, y1, x2, y2);
                    grd.addColorStop(0, color1);
                    grd.addColorStop(1, color2);
                    ctx.fillStyle = grd;
                } else {
                    ctx.fillStyle = '#667eea';
                }
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // 绘制文字
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 自动调整字号
            let fontSize = 80;
            ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;

            // 文字换行处理
            const maxWidth = canvas.width - 120;
            const lines = wrapText(ctx, text, maxWidth);

            // 如果行数太多，减小字号
            while (lines.length > 6 && fontSize > 40) {
                fontSize -= 5;
                ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
                lines.length = 0;
                lines.push(...wrapText(ctx, text, maxWidth));
            }

            const lineHeight = fontSize * 1.4;
            const startY = (canvas.height - lines.length * lineHeight) / 2;

            // 绘制阴影
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            lines.forEach((line, i) => {
                ctx.fillText(line, canvas.width / 2, startY + i * lineHeight + lineHeight / 2);
            });

            return canvas.toDataURL('image/jpeg', 0.9);
        }

        function wrapText(ctx, text, maxWidth) {
            const lines = [];
            let line = '';
            for (let i = 0; i < text.length; i++) {
                const testLine = line + text[i];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line.length > 0) {
                    lines.push(line);
                    line = text[i];
                } else {
                    line = testLine;
                }
            }
            if (line) lines.push(line);
            return lines;
        }

        // === 步骤2b: 上传图片 ===
        const uploadArea = document.getElementById('xhs-upload-area');
        const uploadInput = document.getElementById('xhs-upload-input');
        const uploadPreview = document.getElementById('xhs-upload-preview');
        const uploadPlaceholder = document.getElementById('xhs-upload-placeholder');
        const uploadNextBtn = document.getElementById('xhs-upload-next');

        if (uploadArea && uploadInput) {
            uploadArea.onclick = (e) => {
                if (e.target.closest('#xhs-upload-preview')) return;
                uploadInput.click();
            };

            uploadInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    cropImageSrc = ev.target.result;
                    showUploadPreview(cropImageSrc);
                };
                reader.readAsDataURL(file);
            };
        }

        function showUploadPreview(src) {
            if (uploadPreview && uploadPlaceholder && uploadNextBtn) {
                uploadPreview.src = src;
                uploadPreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
                uploadNextBtn.style.opacity = '1';
            }
        }

        // URL加载
        const urlInput = document.getElementById('xhs-url-input');
        const urlLoadBtn = document.getElementById('xhs-url-load-btn');
        if (urlLoadBtn && urlInput) {
            urlLoadBtn.onclick = async () => {
                const url = urlInput.value.trim();
                if (!url) {
                    alert('请输入图片URL');
                    return;
                }

                urlLoadBtn.textContent = '加载中...';
                urlLoadBtn.disabled = true;

                try {
                    // 直接使用URL
                    cropImageSrc = url;
                    showUploadPreview(url);
                } catch (e) {
                    console.error('加载图片失败:', e);
                    alert('加载失败，请检查URL');
                } finally {
                    urlLoadBtn.textContent = '加载';
                    urlLoadBtn.disabled = false;
                }
            };
        }

        // 上传图片下一步 - 进入裁剪
        if (uploadNextBtn) {
            uploadNextBtn.onclick = () => {
                if (!cropImageSrc) {
                    alert('请先上传图片');
                    return;
                }
                initCropView();
                showStep('step2Crop');
            };
        }

        // === 步骤2c: AI生成 ===
        const aiGenerateBtn = document.getElementById('xhs-ai-generate-btn');
        const aiPromptInput = document.getElementById('xhs-ai-prompt-input');
        const aiPreviewImg = document.getElementById('xhs-ai-preview-img');
        const aiPlaceholder = document.getElementById('xhs-ai-preview-placeholder');
        const aiNextBtn = document.getElementById('xhs-ai-next');

        if (aiGenerateBtn) {
            aiGenerateBtn.onclick = async () => {
                const prompt = aiPromptInput ? aiPromptInput.value.trim() : '';
                if (!prompt) {
                    alert('请输入图片描述');
                    return;
                }

                aiGenerateBtn.classList.add('loading');
                aiGenerateBtn.disabled = true;

                try {
                    const imageUrl = await window.generatePollinationsImage(prompt, {
                        width: 832,
                        height: 1110,
                        nologo: true,
                        model: 'flux'
                    });

                    if (aiPreviewImg && aiPlaceholder) {
                        aiPreviewImg.src = imageUrl;
                        aiPreviewImg.style.display = 'block';
                        aiPlaceholder.style.display = 'none';
                        coverImageData = imageUrl;
                        if (aiNextBtn) aiNextBtn.style.opacity = '1';
                    }
                } catch (e) {
                    console.error('AI生成图片失败:', e);
                    alert('生成失败，请重试');
                } finally {
                    aiGenerateBtn.classList.remove('loading');
                    aiGenerateBtn.disabled = false;
                }
            };
        }

        // AI生成下一步
        if (aiNextBtn) {
            aiNextBtn.onclick = () => {
                if (!coverImageData) {
                    alert('请先生成图片');
                    return;
                }
                goToContentStep();
            };
        }

        // === 步骤2d: 图片裁剪 ===
        let cropImage = null;
        let isDragging = false;
        let startX = 0, startY = 0;
        let imgNaturalWidth = 0, imgNaturalHeight = 0;

        function initCropView() {
            cropImage = document.getElementById('xhs-crop-image');
            if (!cropImage || !cropImageSrc) return;

            cropImage.src = cropImageSrc;
            cropScale = 1;
            cropOffsetX = 0;
            cropOffsetY = 0;

            cropImage.onload = () => {
                imgNaturalWidth = cropImage.naturalWidth;
                imgNaturalHeight = cropImage.naturalHeight;

                // 计算初始缩放，使图片填满裁剪框
                const frame = document.getElementById('xhs-crop-frame');
                const frameWidth = 260;
                const frameHeight = frameWidth / currentCropRatio;
                frame.style.height = frameHeight + 'px';

                const scaleX = frameWidth / imgNaturalWidth;
                const scaleY = frameHeight / imgNaturalHeight;
                cropScale = Math.max(scaleX, scaleY) * 1.2;

                updateCropTransform();
            };

            // 拖动事件
            const container = document.getElementById('xhs-crop-container');
            if (container) {
                container.ontouchstart = container.onmousedown = (e) => {
                    isDragging = true;
                    const point = e.touches ? e.touches[0] : e;
                    startX = point.clientX - cropOffsetX;
                    startY = point.clientY - cropOffsetY;
                    e.preventDefault();
                };

                container.ontouchmove = container.onmousemove = (e) => {
                    if (!isDragging) return;
                    const point = e.touches ? e.touches[0] : e;
                    cropOffsetX = point.clientX - startX;
                    cropOffsetY = point.clientY - startY;
                    updateCropTransform();
                    e.preventDefault();
                };

                container.ontouchend = container.onmouseup = container.onmouseleave = () => {
                    isDragging = false;
                };

                // 双指缩放
                let initialDistance = 0;
                let initialScale = 1;

                container.ontouchstart = (e) => {
                    if (e.touches.length === 2) {
                        initialDistance = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        initialScale = cropScale;
                    } else if (e.touches.length === 1) {
                        isDragging = true;
                        startX = e.touches[0].clientX - cropOffsetX;
                        startY = e.touches[0].clientY - cropOffsetY;
                    }
                    e.preventDefault();
                };

                container.ontouchmove = (e) => {
                    if (e.touches.length === 2) {
                        const currentDistance = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        cropScale = Math.max(0.5, Math.min(3, initialScale * (currentDistance / initialDistance)));
                        updateCropTransform();
                    } else if (e.touches.length === 1 && isDragging) {
                        cropOffsetX = e.touches[0].clientX - startX;
                        cropOffsetY = e.touches[0].clientY - startY;
                        updateCropTransform();
                    }
                    e.preventDefault();
                };
            }
        }

        function updateCropTransform() {
            if (cropImage) {
                cropImage.style.transform = `translate(${cropOffsetX}px, ${cropOffsetY}px) scale(${cropScale})`;
            }
        }

        // 裁剪比例选择
        document.querySelectorAll('.xhs-crop-ratio').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.xhs-crop-ratio').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const ratio = btn.dataset.ratio;
                if (ratio === '3:4') currentCropRatio = 3 / 4;
                else if (ratio === '1:1') currentCropRatio = 1;
                else if (ratio === '4:3') currentCropRatio = 4 / 3;

                const frame = document.getElementById('xhs-crop-frame');
                if (frame) {
                    const frameWidth = 260;
                    frame.style.height = (frameWidth / currentCropRatio) + 'px';
                }
            };
        });

        // 裁剪确认
        const cropNextBtn = document.getElementById('xhs-crop-next');
        if (cropNextBtn) {
            cropNextBtn.onclick = async () => {
                cropNextBtn.textContent = '处理中...';
                cropNextBtn.style.opacity = '0.5';

                try {
                    coverImageData = await performCrop();
                    goToContentStep();
                } catch (e) {
                    console.error('裁剪失败:', e);
                    alert('裁剪失败，请重试');
                } finally {
                    cropNextBtn.textContent = '确认裁剪';
                    cropNextBtn.style.opacity = '1';
                }
            };
        }

        async function performCrop() {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const frameWidth = 260;
                    const frameHeight = frameWidth / currentCropRatio;

                    // 目标尺寸
                    canvas.width = 832;
                    canvas.height = Math.round(832 / currentCropRatio);

                    const ctx = canvas.getContext('2d');

                    // 计算裁剪区域
                    const scaledWidth = img.naturalWidth * cropScale;
                    const scaledHeight = img.naturalHeight * cropScale;

                    // 裁剪框在缩放后图片上的相对位置
                    const cropX = (scaledWidth / 2 - frameWidth / 2 - cropOffsetX) / cropScale;
                    const cropY = (scaledHeight / 2 - frameHeight / 2 - cropOffsetY) / cropScale;
                    const cropW = frameWidth / cropScale;
                    const cropH = frameHeight / cropScale;

                    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                };
                img.onerror = reject;
                img.src = cropImageSrc;
            });
        }

        // === 步骤3: 编辑内容 ===
        function goToContentStep(defaultTitle = '') {
            const finalCoverImg = document.getElementById('xhs-final-cover-img');
            if (finalCoverImg && coverImageData) {
                finalCoverImg.src = coverImageData;
            }

            // 设置默认标题
            const noteTitleInput = document.getElementById('xhs-note-title-input');
            if (noteTitleInput && defaultTitle) {
                noteTitleInput.value = defaultTitle;
                updateTitleCount();
            }

            showStep('step3');
        }

        // 更换封面
        const changeCoverBtn = document.getElementById('xhs-change-cover-btn');
        if (changeCoverBtn) {
            changeCoverBtn.onclick = () => {
                showStep('step1');
            };
        }

        // 标题字数统计
        const noteTitleInput = document.getElementById('xhs-note-title-input');
        function updateTitleCount() {
            const count = noteTitleInput ? noteTitleInput.value.length : 0;
            const countEl = document.getElementById('xhs-title-count-num');
            if (countEl) countEl.textContent = count;
        }
        if (noteTitleInput) {
            noteTitleInput.oninput = updateTitleCount;
        }

        // 内容字数统计
        const noteContentInput = document.getElementById('xhs-note-content-input');
        function updateContentCount() {
            const count = noteContentInput ? noteContentInput.value.length : 0;
            const countEl = document.getElementById('xhs-content-count-num');
            if (countEl) countEl.textContent = count;
        }
        if (noteContentInput) {
            noteContentInput.oninput = () => {
                updateContentCount();
                checkForMentions();
            };
        }

        // 检测@角色
        function checkForMentions() {
            const content = noteContentInput ? noteContentInput.value : '';
            const cursorPos = noteContentInput ? noteContentInput.selectionStart : 0;

            // 检查光标前是否刚输入@
            if (content[cursorPos - 1] === '@') {
                showMentionModal();
            }
        }

        // @角色选择弹窗
        const mentionModal = document.getElementById('xhs-mention-modal');
        const mentionList = document.getElementById('xhs-mention-list');
        const mentionSearch = document.getElementById('xhs-mention-search');
        const mentionModalClose = document.getElementById('xhs-mention-modal-close');

        function showMentionModal() {
            if (!mentionModal) return;
            renderMentionList();
            mentionModal.style.display = 'flex';
        }

        function hideMentionModal() {
            if (mentionModal) mentionModal.style.display = 'none';
        }

        if (mentionModalClose) {
            mentionModalClose.onclick = hideMentionModal;
        }
        if (mentionModal) {
            mentionModal.onclick = (e) => {
                if (e.target === mentionModal) hideMentionModal();
            };
        }

        function renderMentionList(filter = '') {
            if (!mentionList) return;
            mentionList.innerHTML = '';

            const chatsMap = window.state.chats || {};
            const characters = Object.values(chatsMap).filter(c => !c.isGroup);

            const filtered = filter
                ? characters.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
                : characters;

            if (filtered.length === 0) {
                mentionList.innerHTML = '<div class="xhs-empty-state" style="padding: 40px;">暂无角色</div>';
                return;
            }

            filtered.forEach(char => {
                const item = document.createElement('div');
                item.className = 'xhs-mention-item';
                const avatar = char.avatar || char.settings?.aiAvatar || "https://api.dicebear.com/7.x/notionists/svg?seed=" + encodeURIComponent(char.name);
                item.innerHTML = `
                    <img src="${avatar}" alt="${char.name}">
                    <div class="xhs-mention-item-info">
                        <div class="xhs-mention-item-name">${char.name}</div>
                        <div class="xhs-mention-item-desc">${char.settings?.aiPersona?.substring(0, 30) || '角色'}...</div>
                    </div>
                `;
                item.onclick = () => {
                    insertMention(char.name);
                    if (!mentionedCharacters.includes(char.name)) {
                        mentionedCharacters.push(char.name);
                    }
                    hideMentionModal();
                };
                mentionList.appendChild(item);
            });
        }

        if (mentionSearch) {
            mentionSearch.oninput = () => {
                renderMentionList(mentionSearch.value);
            };
        }

        function insertMention(name) {
            if (!noteContentInput) return;
            const content = noteContentInput.value;
            const cursorPos = noteContentInput.selectionStart;

            // 找到@的位置（应该在光标前一位）
            const beforeCursor = content.substring(0, cursorPos);
            const afterCursor = content.substring(cursorPos);

            // 如果@在光标前，替换@为@name
            if (beforeCursor.endsWith('@')) {
                noteContentInput.value = beforeCursor.slice(0, -1) + '@' + name + ' ' + afterCursor;
            } else {
                noteContentInput.value = beforeCursor + name + ' ' + afterCursor;
            }

            noteContentInput.focus();
            const newPos = cursorPos + name.length + 1;
            noteContentInput.setSelectionRange(newPos, newPos);
            updateContentCount();
        }

        // Tag输入 - 支持桌面和移动端
        const tagInput = document.getElementById('xhs-tag-input');
        const tagsContainer = document.getElementById('xhs-tags-container');
        const tagAddBtn = document.getElementById('xhs-tag-add-btn');

        if (tagInput) {
            // 桌面端回车键
            tagInput.onkeydown = (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    addTag(tagInput.value.trim());
                    tagInput.value = '';
                }
            };

            // 移动端软键盘回车/完成键 - 使用 keypress 和 input 事件作为备份
            tagInput.onkeypress = (e) => {
                if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                    e.preventDefault();
                    addTag(tagInput.value.trim());
                    tagInput.value = '';
                }
            };

            // 移动端 IME 输入法确认 - 监听 compositionend 后的回车
            tagInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    if (tagInput.value.trim()) {
                        addTag(tagInput.value.trim());
                        tagInput.value = '';
                    }
                }
            });
        }

        // 添加按钮点击（移动端备用方案）
        if (tagAddBtn) {
            tagAddBtn.onclick = () => {
                if (tagInput && tagInput.value.trim()) {
                    addTag(tagInput.value.trim());
                    tagInput.value = '';
                }
            };
        }

        function addTag(tag) {
            if (!tag || noteTags.includes(tag)) return;
            if (noteTags.length >= 5) {
                alert('最多添加5个话题');
                return;
            }

            // 确保tag以#开头
            if (!tag.startsWith('#')) tag = '#' + tag;
            noteTags.push(tag);
            renderTags();
        }

        function removeTag(tag) {
            const idx = noteTags.indexOf(tag);
            if (idx > -1) {
                noteTags.splice(idx, 1);
                renderTags();
            }
        }

        function renderTags() {
            if (!tagsContainer) return;
            tagsContainer.innerHTML = '';
            noteTags.forEach(tag => {
                const tagEl = document.createElement('div');
                tagEl.className = 'xhs-tag-item';
                tagEl.innerHTML = `
                    <span>${tag}</span>
                    <span class="xhs-tag-remove">×</span>
                `;
                tagEl.querySelector('.xhs-tag-remove').onclick = () => removeTag(tag);
                tagsContainer.appendChild(tagEl);
            });
        }

        // 地点选择
        const locationSection = document.getElementById('xhs-location-section');
        const locationModal = document.getElementById('xhs-location-modal');
        const locationModalClose = document.getElementById('xhs-location-modal-close');
        const locationText = document.getElementById('xhs-location-text');
        const locationInput = document.getElementById('xhs-location-input');
        const locationConfirmBtn = document.getElementById('xhs-location-confirm-btn');

        if (locationSection) {
            locationSection.onclick = () => {
                if (locationModal) locationModal.style.display = 'flex';
            };
        }

        if (locationModalClose) {
            locationModalClose.onclick = () => {
                if (locationModal) locationModal.style.display = 'none';
            };
        }

        if (locationModal) {
            locationModal.onclick = (e) => {
                if (e.target === locationModal) locationModal.style.display = 'none';
            };
        }

        // 手动输入地点确认
        if (locationConfirmBtn && locationInput) {
            locationConfirmBtn.onclick = () => {
                const inputLocation = locationInput.value.trim();
                if (inputLocation) {
                    noteLocation = inputLocation;
                    if (locationText) {
                        locationText.textContent = noteLocation;
                        locationText.classList.add('selected');
                    }
                    locationInput.value = '';
                    if (locationModal) locationModal.style.display = 'none';
                }
            };

            locationInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    locationConfirmBtn.click();
                }
            };
        }

        // 不显示位置选项
        document.querySelectorAll('.xhs-location-item').forEach(item => {
            item.onclick = () => {
                noteLocation = item.dataset.location;
                if (locationText) {
                    if (noteLocation === '不显示位置') {
                        locationText.textContent = '点击选择地点';
                        locationText.classList.remove('selected');
                        noteLocation = '';
                    } else {
                        locationText.textContent = noteLocation;
                        locationText.classList.add('selected');
                    }
                }
                if (locationModal) locationModal.style.display = 'none';
            };
        });

        // 发布按钮
        const publishBtn = document.getElementById('xhs-publish-btn');
        if (publishBtn) {
            publishBtn.onclick = async () => {
                const title = noteTitleInput ? noteTitleInput.value.trim() : '';
                const content = noteContentInput ? noteContentInput.value.trim() : '';

                if (!title) {
                    alert('请填写标题');
                    return;
                }

                if (!coverImageData) {
                    alert('请选择封面图片');
                    return;
                }

                publishBtn.textContent = '发布中...';
                publishBtn.style.opacity = '0.5';

                try {
                    await publishNote(title, content);

                    // 显示成功提示
                    const toast = document.createElement('div');
                    toast.textContent = '✨ 笔记发布成功！';
                    toast.className = 'xhs-toast';
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 2000);

                    // 关闭发布界面
                    createView.classList.remove('active');
                    createView.style.display = 'none';

                    // 刷新首页
                    loadXhsNotes();

                    // 如果在个人主页，刷新
                    if (views.profile && views.profile.style.display !== 'none') {
                        window.renderXhsProfile();
                    }
                } catch (e) {
                    console.error('发布失败:', e);
                    alert('发布失败: ' + e.message);
                } finally {
                    publishBtn.textContent = '发布';
                    publishBtn.style.opacity = '1';
                }
            };
        }

        async function publishNote(title, content) {
            const mySettings = window.state.xhsSettings;
            const myName = mySettings.nickname || "我";
            const myAvatar = mySettings.avatar || "https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg";

            // 提取内容中的@角色
            const mentionMatches = content.match(/@([^\s@]+)/g) || [];
            const contentMentions = mentionMatches.map(m => m.substring(1));
            mentionedCharacters = [...new Set([...mentionedCharacters, ...contentMentions])];

            const note = {
                id: Date.now().toString(),
                authorName: myName,
                authorAvatar: myAvatar,
                isCharacter: false,
                isMine: true, // 标记为用户自己发布的笔记
                title: title,
                content: content,
                tags: noteTags,
                imageUrl: coverImageData,
                location: noteLocation || "未知地点",
                timestamp: Date.now(),
                dateStr: formatXhsDate(Date.now()),
                stats: { likes: 0, collects: 0, comments: 0 },
                comments: [],
                mentionedCharacters: mentionedCharacters, // 保存被@的角色
                isNew: false // 自己发的笔记不标记为新
            };

            // 保存到数据库
            if (window.db && window.db.xhsNotes) {
                await window.db.xhsNotes.add(note);
            }

            return note;
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

            // 填充背景设置
            const bgType = s.profileBgType || 'gradient';
            const bgGradientRadio = document.getElementById('xhs-bg-gradient');
            const bgImageRadio = document.getElementById('xhs-bg-image');
            const bgColor1 = document.getElementById('xhs-bg-color1');
            const bgColor2 = document.getElementById('xhs-bg-color2');
            const bgColor1Text = document.getElementById('xhs-bg-color1-text');
            const bgColor2Text = document.getElementById('xhs-bg-color2-text');
            const bgPreview = document.getElementById('xhs-bg-preview');

            if (bgType === 'image' && s.profileBgImage) {
                bgImageRadio.checked = true;
                bgPreview.style.display = 'block';
                bgPreview.style.backgroundImage = `url(${s.profileBgImage})`;
            } else {
                bgGradientRadio.checked = true;
                bgPreview.style.display = 'none';
            }
            const color1Val = s.profileBgColor1 || '#ff9a9e';
            const color2Val = s.profileBgColor2 || '#fecfef';
            bgColor1.value = color1Val;
            bgColor2.value = color2Val;
            if (bgColor1Text) bgColor1Text.textContent = color1Val;
            if (bgColor2Text) bgColor2Text.textContent = color2Val;

            profileSettingsModal.classList.add('visible');
        });
    }

    // 背景图上传按钮
    const bgUploadBtn = document.getElementById('xhs-bg-upload-btn');
    const bgImageInput = document.getElementById('xhs-bg-image-input');
    if (bgUploadBtn && bgImageInput) {
        bgUploadBtn.onclick = () => bgImageInput.click();
        bgImageInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file && window.handleImageUploadAndCompress) {
                const base64 = await window.handleImageUploadAndCompress(file);
                const bgPreview = document.getElementById('xhs-bg-preview');
                bgPreview.style.display = 'block';
                bgPreview.style.backgroundImage = `url(${base64})`;
                bgPreview.dataset.imageData = base64;
                document.getElementById('xhs-bg-image').checked = true;
            }
        };
    }

    // 颜色选择器实时更新显示值
    const bgColor1Input = document.getElementById('xhs-bg-color1');
    const bgColor2Input = document.getElementById('xhs-bg-color2');
    if (bgColor1Input) {
        bgColor1Input.oninput = (e) => {
            const textEl = document.getElementById('xhs-bg-color1-text');
            if (textEl) textEl.textContent = e.target.value;
        };
    }
    if (bgColor2Input) {
        bgColor2Input.oninput = (e) => {
            const textEl = document.getElementById('xhs-bg-color2-text');
            if (textEl) textEl.textContent = e.target.value;
        };
    }

    // 默认渐变粉色按钮 - 点击恢复默认渐变色
    const bgDefaultSwatch = document.getElementById('xhs-bg-default-swatch');
    if (bgDefaultSwatch) {
        bgDefaultSwatch.onclick = () => {
            const c1 = document.getElementById('xhs-bg-color1');
            const c2 = document.getElementById('xhs-bg-color2');
            const c1Text = document.getElementById('xhs-bg-color1-text');
            const c2Text = document.getElementById('xhs-bg-color2-text');
            if (c1) c1.value = '#ff9a9e';
            if (c2) c2.value = '#fecfef';
            if (c1Text) c1Text.textContent = '#ff9a9e';
            if (c2Text) c2Text.textContent = '#fecfef';
            document.getElementById('xhs-bg-gradient').checked = true;
        };
    }

    const pSaveBtn = document.getElementById('xhs-settings-save-btn');
    const pCancelBtn = document.getElementById('xhs-settings-cancel-btn');
    if (pCancelBtn) pCancelBtn.onclick = () => profileSettingsModal.classList.remove('visible');
    if (pSaveBtn) pSaveBtn.onclick = () => {
        // 获取背景设置
        const bgType = document.getElementById('xhs-bg-image').checked ? 'image' : 'gradient';
        const bgColor1 = document.getElementById('xhs-bg-color1').value;
        const bgColor2 = document.getElementById('xhs-bg-color2').value;
        const bgPreview = document.getElementById('xhs-bg-preview');
        const bgImage = bgPreview.dataset.imageData || window.state.xhsSettings?.profileBgImage || '';

        const newSettings = {
            avatar: document.getElementById('xhs-settings-avatar-preview').src,
            nickname: document.getElementById('xhs-settings-nickname').value,
            xhsId: document.getElementById('xhs-settings-id').value,
            fansCount: document.getElementById('xhs-settings-fans').value,
            tags: document.getElementById('xhs-settings-tags').value.trim().split(/\s+/),
            persona: document.getElementById('xhs-settings-persona').value,
            profileBgType: bgType,
            profileBgColor1: bgColor1,
            profileBgColor2: bgColor2,
            profileBgImage: bgImage
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
            startFansFluctuationTimer();
            appSettingsModal.classList.remove('visible');
            alert('小红书应用配置已保存！');
        };
    }

    // 初始化自动刷新
    setTimeout(startXhsAutoRefresh, 1000);

    // 初始化粉丝浮动定时器
    setTimeout(startFansFluctuationTimer, 2000);

    // 初始化消息页面事件
    setTimeout(initMessagePageEvents, 500);

    /* =========================================
        9. 角色主页功能 (User Profile)
       ========================================= */

    // 角色主页数据存储 (key: authorName, value: profile data)
    // 存储在 xhsSettings.characterProfiles 中

    // 获取角色主页数据
    function getCharacterProfile(authorName) {
        if (!window.state || !window.state.xhsSettings) return null;
        const profiles = window.state.xhsSettings.characterProfiles || {};
        return profiles[authorName] || null;
    }

    // 智能匹配角色 - 根据名称在角色列表中查找匹配的角色
    function findMatchingCharacter(userName) {
        if (!userName) return null;
        const chatsMap = window.state.chats || {};
        const characters = Object.values(chatsMap).filter(c => !c.isGroup);

        // 精确匹配
        let matched = characters.find(c => c.name === userName);
        if (matched) {
            return {
                name: matched.name,
                avatar: matched.settings?.aiAvatar || matched.avatar,
                isCharacter: true,
                chatData: matched
            };
        }

        return null;
    }

    // 获取用户信息（优先从角色列表匹配，其次从主页数据获取）
    function getUserInfo(userName) {
        // 1. 先尝试从角色列表中匹配
        const charMatch = findMatchingCharacter(userName);
        if (charMatch) {
            return {
                name: charMatch.name,
                avatar: charMatch.avatar,
                isCharacter: true
            };
        }

        // 2. 再尝试从已保存的主页数据获取
        const profile = getCharacterProfile(userName);
        if (profile) {
            return {
                name: userName,
                avatar: profile.avatar,
                isCharacter: false
            };
        }

        // 3. 默认返回随机头像
        return {
            name: userName,
            avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(userName)}`,
            isCharacter: false
        };
    }

    // 保存角色主页数据
    async function saveCharacterProfile(authorName, profileData) {
        if (!window.state || !window.state.xhsSettings) return;
        if (!window.state.xhsSettings.characterProfiles) {
            window.state.xhsSettings.characterProfiles = {};
        }
        window.state.xhsSettings.characterProfiles[authorName] = profileData;
        await saveXhsSettings({});
    }

    // 生成角色主页数据 (使用AI)
    async function generateCharacterProfile(authorName, authorAvatar) {
        const { proxyUrl, apiKey, model, temperature } = window.state.apiConfig;
        if (!proxyUrl || !apiKey || !model) {
            alert("请先在设置中配置API Key");
            return null;
        }

        // 获取该角色的笔记数据
        let userNotes = [];
        let totalLikes = 0;
        let totalCollects = 0;
        if (window.db && window.db.xhsNotes) {
            const allNotes = await window.db.xhsNotes.toArray();
            userNotes = allNotes.filter(n => n.authorName === authorName);
            userNotes.forEach(note => {
                if (note.stats) {
                    totalLikes += note.stats.likes || 0;
                    totalCollects += note.stats.collects || 0;
                }
            });
        }

        // 检查是否是聊天角色
        let characterContext = "";
        let accountType = "路人用户";
        const chatsMap = window.state.chats || {};
        const matchedChat = Object.values(chatsMap).find(c => c.name === authorName && !c.isGroup);

        if (matchedChat && matchedChat.settings && matchedChat.settings.aiPersona) {
            accountType = "已知角色";
            characterContext = `
            【角色设定参考】：
            该用户是一个角色扮演角色，设定如下：
            ${matchedChat.settings.aiPersona}
            
            请根据这个角色设定生成符合其性格和背景的小红书个人简介。
            根据角色设定分析其社交属性：
            - 如果是明星/网红/公众人物，粉丝数应较高（10万-1000万）
            - 如果是普通人设定，粉丝数应较为正常（100-5万）
            - 如果是内向/低调性格，粉丝数可以较少
            `;
        } else {
            // 路人用户，根据笔记内容分析
            let notesContext = "";
            if (userNotes.length > 0) {
                const notesTitles = userNotes.slice(0, 5).map(n => n.title).join("、");
                const notesContents = userNotes.slice(0, 3).map(n => n.content).join("\n");
                notesContext = `
                【用户笔记分析】：
                该用户已发布 ${userNotes.length} 篇笔记，笔记标题包括：${notesTitles}
                笔记内容：
                ${notesContents}
                
                请根据笔记内容分析该用户的兴趣爱好、职业、生活方式，生成匹配的个人简介。
                `;
            }

            characterContext = `
            【用户类型】：路人用户（非特定角色）
            用户名称：${authorName}
            ${notesContext}
            
            请根据用户名称和笔记内容（如果有）分析这是什么类型的用户，生成符合其特点的资料。
            路人用户的粉丝数通常在 100-50000 范围内。
            `;
        }

        // 计算建议的数据范围
        const noteCount = userNotes.length;
        let suggestedStats = "";
        if (noteCount > 0) {
            suggestedStats = `
            【已知数据参考】：
            - 已发布笔记数：${noteCount} 篇
            - 笔记总获赞数：${totalLikes}
            - 笔记总收藏数：${totalCollects}
            
            请根据这些数据合理估算粉丝数和获赞收藏数，获赞收藏数应该略高于笔记总点赞数。
            `;
        }

        const prompt = `
        你是一个小红书用户资料生成器。请为用户"${authorName}"生成一个完整的小红书个人主页资料。
        
        ${characterContext}
        
        【要求】：
        1. 生成一个符合小红书风格的个人简介（20-60字），可以包含emoji，体现个性
        2. 生成3-5个个人标签（如星座、城市、职业、爱好等）
        3. 根据角色属性生成合理的：
           - 关注数：通常在 50-2000 范围
           - 粉丝数：根据角色类型调整（普通用户 100-5万，网红/明星 10万-1000万）
        4. 生成一个8-12位的小红书号（纯数字）
        
        注意：不需要生成"获赞与收藏数"，该数据将根据用户实际发布的笔记统计得出。
        
        【JSON返回格式】：
        {
            "bio": "个人简介文字",
            "tags": ["标签1", "标签2", "标签3"],
            "followCount": 数字,
            "fansCount": 数字,
            "xhsId": "小红书号"
        }
        
        请只返回JSON数据，不要包含markdown代码块标记。
        `;

        try {
            let responseData;
            const isGemini = proxyUrl.includes("googleapis");
            const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8;

            if (isGemini) {
                const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp }
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const json = await res.json();
                // 添加错误检查
                if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
                    console.error("[XHS] Gemini API响应异常:", json);
                    throw new Error("API响应格式异常");
                }
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
                        temperature: requestTemp
                    })
                });
                const json = await res.json();
                // 添加错误检查
                if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                    console.error("[XHS] OpenAI API响应异常:", json);
                    throw new Error(json.error?.message || "API响应格式异常");
                }
                responseData = json.choices[0].message.content;
            }

            // 使用 repairAndParseJSON 健壮解析AI返回的JSON
            const result = repairAndParseJSON(responseData);

            // 构建完整的profile数据 - likesCount使用实际笔记统计数据
            const profileData = {
                authorName: authorName,
                avatar: authorAvatar,
                bio: result.bio || "这个人很懒，什么都没写~",
                tags: result.tags || [],
                followCount: result.followCount || Math.floor(Math.random() * 500) + 100,
                fansCount: result.fansCount || Math.floor(Math.random() * 10000) + 1000,
                // 使用实际统计数据，不由AI生成
                likesCount: totalLikes + totalCollects,
                xhsId: result.xhsId || Math.floor(Math.random() * 900000000 + 100000000).toString(),
                isFollowed: false,
                createdAt: Date.now()
            };

            return profileData;
        } catch (e) {
            console.error("生成角色主页失败:", e);
            // 返回默认数据 - likesCount使用实际统计数据
            return {
                authorName: authorName,
                avatar: authorAvatar,
                bio: "这个人很懒，什么都没写~",
                tags: ["小红书用户"],
                followCount: Math.floor(Math.random() * 500) + 100,
                fansCount: Math.floor(Math.random() * 10000) + 1000,
                // 使用实际统计数据
                likesCount: totalLikes + totalCollects,
                xhsId: Math.floor(Math.random() * 900000000 + 100000000).toString(),
                isFollowed: false,
                createdAt: Date.now()
            };
        }
    }

    // 生成角色收藏夹 (使用AI，支持增量更新)
    async function generateCharacterCollections(profile) {
        const { proxyUrl, apiKey, model, temperature } = window.state.apiConfig;
        if (!proxyUrl || !apiKey || !model) {
            alert("请先在设置中配置API Key");
            return null;
        }

        const s = window.state.xhsSettings;
        const authorName = profile.authorName;
        const existingFolders = profile.collectionFolders || [];
        const isUpdate = existingFolders.length > 0;

        // 获取角色人设
        let characterContext = "";
        const chatsMap = window.state.chats || {};
        const matchedChat = Object.values(chatsMap).find(c => c.name === authorName && !c.isGroup);
        if (matchedChat && matchedChat.settings && matchedChat.settings.aiPersona) {
            characterContext = `【角色人物设定】：\n${matchedChat.settings.aiPersona}`;
        }

        // 角色小红书简介
        let bioContext = "";
        if (profile.bio) {
            bioContext = `【小红书个人简介】：${profile.bio}`;
        }
        if (profile.tags && profile.tags.length > 0) {
            bioContext += `\n【个人标签】：${profile.tags.join('、')}`;
        }

        // 获取角色近期笔记
        let notesContext = "";
        if (window.db && window.db.xhsNotes) {
            const allNotes = await window.db.xhsNotes.toArray();
            const authorNotes = allNotes.filter(n => n.authorName === authorName);
            if (authorNotes.length > 0) {
                const recentNotes = authorNotes.slice(-5);
                notesContext = `【${authorName}近期发布的笔记】：\n` +
                    recentNotes.map(n => `- ${n.title}: ${(n.content || '').substring(0, 100)}`).join('\n');
            }
        }

        // 获取角色近期聊天记录（根据设置判断是否启用）
        let chatContext = "";
        if (s?.enableChatMemory !== false && matchedChat && matchedChat.history && matchedChat.history.length > 0) {
            const myName = s?.nickname || "MOMO";
            const limit = matchedChat.settings?.maxMemory || 10;
            const recentMsgs = matchedChat.history.slice(-limit);
            chatContext = `【${authorName}的近期聊天记录】：\n` +
                recentMsgs.map(m => `${m.role === 'user' ? myName : authorName}: ${m.content}`).join('\n');
        }

        // 世界书上下文
        let worldBookContext = "";
        const linkedBookIds = s?.linkedWorldBooks;
        if (linkedBookIds && linkedBookIds.length > 0) {
            let allBooks = window.state.worldBooks || [];
            if (allBooks.length === 0 && window.db && window.db.worldBooks) {
                allBooks = await window.db.worldBooks.toArray();
            }
            let booksContent = "";
            linkedBookIds.forEach(id => {
                const book = allBooks.find(b => String(b.id) === String(id));
                if (book) booksContent += `\n《${book.name}》设定:\n${book.content || ''}\n`;
            });
            if (booksContent) {
                worldBookContext = `【世界观设定】：\n${booksContent}`;
            }
        }

        // 构建已有收藏夹上下文（含笔记详情，供AI参考避免重复）
        let existingContext = "";
        if (isUpdate) {
            let allDbNotes = [];
            if (window.db && window.db.xhsNotes) {
                allDbNotes = await window.db.xhsNotes.toArray();
            }
            const noteMap = new Map(allDbNotes.map(n => [String(n.id), n]));

            const folderDetails = existingFolders.map(f => {
                const notes = (f.noteIds || []).map(id => noteMap.get(String(id))).filter(Boolean);
                return {
                    name: f.name,
                    noteCount: notes.length,
                    existingNotes: notes.map(n => ({ title: n.title, content: (n.content || '').substring(0, 80), author: n.authorName }))
                };
            });

            existingContext = `【角色当前已有的收藏夹及笔记】：\n${JSON.stringify(folderDetails, null, 1)}\n\n注意：你需要在已有收藏夹基础上进行更新。可以为已有收藏夹补充新笔记，也可以创建新收藏夹。请不要生成与已有笔记内容重复的笔记。已有收藏夹的名称请保留不变。`;
        }

        const prompt = `你是一个小红书收藏夹生成器。请根据角色信息为"${authorName}"${isUpdate ? '更新' : '生成'}小红书收藏夹，并为每个收藏夹生成该角色可能会收藏的笔记。

${characterContext}

${bioContext}

${notesContext}

${chatContext}

${worldBookContext}

${existingContext}

【收藏夹要求】：
${isUpdate ? `1. 基于角色当前已有的收藏夹进行更新和补充
2. 可以为已有收藏夹添加新笔记（请使用已有收藏夹的原名称）
3. 也可以创建全新的收藏夹（使用新名称）
4. 不要生成与已有笔记标题或内容重复的笔记
5. 每个收藏夹生成1-3篇新笔记` : `1. 根据角色的性格、兴趣爱好和日常习惯，生成2-4个符合该角色会创建的收藏夹
2. 收藏夹名称要有个性，符合角色特点，像真人会起的名字（如"穿搭灵感库"、"今天吃什么"、"减脂期记录"等）
3. 为每个收藏夹生成2-4篇该角色可能会收藏的笔记`}

【笔记内容风格要求】：
1. 标题必须符合小红书风格：吸引眼球，可以使用"绝绝子"、"yyds"、"家人们"、"集美"、"避雷"、"种草"、"真香"等流行语（适度）。
2. 内容必须符合小红书风格：适当使用 Emoji 表情符号（🌟✨💖🔥等），语气轻松、活泼、真实，像真人分享生活经验。
3. 内容可以分点陈述（1️⃣ 2️⃣ 3️⃣），或使用"谁懂啊..."等句式，可以适当换行。
4. 笔记正文内容"content"字段当中【绝对不允许】包含任何 # tag标签。
5. 每篇笔记包含 3-5 个热门且相关的 Hashtag 标签（如 #OOTD #探店 #日常），放在 "tags" 字段中。
6. 作者名字要随机多样，像真实的小红书网友昵称。
7. "imagePrompt": 为每条笔记生成一个详细的英文图片提示词，用于AI生图。提示词中【绝对不允许】出现【人物】（person, girl, man, people等），重点描述物体、场景、氛围、光线、构图。
8. "stats": 随机生成合理的点赞数（likes）和收藏数（collects）。
9. "comments": 为每条笔记生成 2-3 条精彩的模拟评论（包含评论者名字和内容），评论要真实互动，有短有长，可以带emoji。
10. "location": 笔记的发布地点，格式为"城市, 地点"。

【JSON返回格式（严格遵守）】：
{
    "folders": [
        {
            "name": "收藏夹名称",
            "isExisting": ${isUpdate ? 'true或false' : 'false'},
            "notes": [
                {
                    "title": "笔记标题",
                    "content": "笔记正文内容（100-300字，符合小红书风格）",
                    "authorName": "随机路人作者名",
                    "tags": ["#tag1", "#tag2", "#tag3"],
                    "imagePrompt": "English prompt for image generation, detailed and aesthetic, NO people",
                    "stats": { "likes": 123, "collects": 45 },
                    "comments": [
                        { "user": "路人A", "text": "评论内容" },
                        { "user": "路人B", "text": "评论内容" }
                    ],
                    "location": "城市, 地点"
                }
            ]
        }
    ]
}

${isUpdate ? '说明：isExisting为true表示这是已有的收藏夹（使用原名称，只生成要新增的笔记），isExisting为false表示全新的收藏夹。\n' : ''}请只返回JSON数据，不要包含markdown代码块标记。`;

        try {
            let responseData;
            const isGemini = proxyUrl.includes("googleapis");
            const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8;

            if (isGemini) {
                const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp }
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const json = await res.json();
                if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
                    throw new Error("API响应格式异常");
                }
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
                        temperature: requestTemp
                    })
                });
                const json = await res.json();
                if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                    throw new Error(json.error?.message || "API响应格式异常");
                }
                responseData = json.choices[0].message.content;
            }

            const result = repairAndParseJSON(responseData);

            if (result && result.folders && Array.isArray(result.folders)) {
                const now = Date.now();
                // 以已有收藏夹为基础进行合并
                const mergedFolders = existingFolders.map(f => ({
                    ...f,
                    noteIds: [...(f.noteIds || [])]
                }));

                let newNotesCount = 0;

                for (const genFolder of result.folders) {
                    if (!genFolder.name || !genFolder.notes || genFolder.notes.length === 0) continue;

                    // 为该文件夹的新笔记创建实际笔记对象
                    const newNoteIds = [];
                    for (const genNote of genFolder.notes) {
                        const noteId = Date.now().toString() + Math.random().toString(36).substr(2, 7);
                        const randomOffset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
                        const noteTimestamp = now - randomOffset;

                        let imageUrl = '';
                        const imagePrompt = genNote.imagePrompt || `aesthetic lifestyle photo, ${genNote.title}, high quality, 4k`;
                        if (window.generatePollinationsImage) {
                            try {
                                imageUrl = await window.generatePollinationsImage(imagePrompt, {
                                    width: 832,
                                    height: 1216,
                                    nologo: true,
                                    model: 'flux'
                                });
                            } catch (imgErr) {
                                console.error('[XHS] 收藏夹笔记生图失败:', imgErr);
                            }
                        }

                        const noteObj = {
                            id: noteId,
                            title: genNote.title || '收藏的笔记',
                            content: genNote.content || '',
                            authorName: genNote.authorName || '小红书用户',
                            authorAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(genNote.authorName || 'user')}`,
                            imageUrl: imageUrl,
                            timestamp: noteTimestamp,
                            dateStr: formatXhsDate(noteTimestamp),
                            tags: genNote.tags || [],
                            location: genNote.location || '',
                            stats: genNote.stats && typeof genNote.stats === 'object'
                                ? { likes: genNote.stats.likes || 0, collects: genNote.stats.collects || 0, comments: 0 }
                                : { likes: Math.floor(Math.random() * 500) + 10, collects: Math.floor(Math.random() * 100) + 5, comments: 0 },
                            comments: Array.isArray(genNote.comments)
                                ? genNote.comments.map(c => {
                                    const commentTime = noteTimestamp + Math.floor(Math.random() * (now - noteTimestamp));
                                    return {
                                        user: c.user || '路人',
                                        text: c.text || '',
                                        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(c.user || 'anon')}`,
                                        timestamp: commentTime,
                                        dateStr: formatXhsDate(commentTime)
                                    };
                                })
                                : [],
                            isCollectionNote: true,
                            feedType: 'collection'
                        };
                        // 同步评论计数
                        noteObj.stats.comments = noteObj.comments.length;

                        if (window.db && window.db.xhsNotes) {
                            await window.db.xhsNotes.put(noteObj);
                        }
                        newNoteIds.push(noteId);
                        newNotesCount++;
                    }

                    // 查找是否匹配已有收藏夹（按名称匹配）
                    const existingIdx = mergedFolders.findIndex(f => f.name === genFolder.name);

                    if (existingIdx !== -1) {
                        // 追加新笔记到已有收藏夹
                        mergedFolders[existingIdx].noteIds.push(...newNoteIds);
                        // 更新封面为最新笔记
                        if (newNoteIds.length > 0 && window.db && window.db.xhsNotes) {
                            const lastNote = await window.db.xhsNotes.get(newNoteIds[newNoteIds.length - 1]);
                            if (lastNote && lastNote.imageUrl) {
                                mergedFolders[existingIdx].cover = lastNote.imageUrl;
                            }
                        }
                    } else {
                        // 创建新收藏夹
                        let folderCover = '';
                        if (newNoteIds.length > 0 && window.db && window.db.xhsNotes) {
                            const lastNote = await window.db.xhsNotes.get(newNoteIds[newNoteIds.length - 1]);
                            if (lastNote) folderCover = lastNote.imageUrl || '';
                        }

                        mergedFolders.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            name: genFolder.name,
                            noteIds: newNoteIds,
                            cover: folderCover
                        });
                    }
                }

                return { folders: mergedFolders, newNotesCount };
            }
            return null;
        } catch (e) {
            console.error("生成角色收藏夹失败:", e);
            alert("生成收藏夹失败: " + e.message);
            return null;
        }
    }

    // 显示生成主页确认弹窗
    function showGenerateProfileConfirm(authorName, authorAvatar, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'xhs-generate-profile-modal';

        modal.innerHTML = `
            <div class="xhs-generate-profile-content">
                <div class="xhs-generate-profile-header">
                    <img src="${authorAvatar}" class="xhs-generate-profile-avatar">
                    <div class="xhs-generate-profile-name">${authorName}</div>
                    <div class="xhs-generate-profile-desc">该用户还没有主页，是否为TA生成一个小红书主页？</div>
                </div>
                <div class="xhs-generate-profile-actions">
                    <button class="xhs-generate-profile-btn xhs-generate-profile-cancel">取消</button>
                    <button class="xhs-generate-profile-btn xhs-generate-profile-confirm">生成主页</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });

        const close = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 200);
        };

        modal.querySelector('.xhs-generate-profile-cancel').onclick = close;
        modal.querySelector('.xhs-generate-profile-confirm').onclick = async () => {
            close();
            if (onConfirm) onConfirm();
        };

        // 点击遮罩关闭
        modal.onclick = (e) => {
            if (e.target === modal) close();
        };
    }

    // 打开角色主页
    async function openUserProfile(authorName, authorAvatar) {
        if (!views.userProfile) return;

        // 检查是否是当前用户自己
        const mySettings = window.state.xhsSettings;
        if (mySettings && authorName === mySettings.nickname) {
            // 是自己，切换到个人主页
            const profileTab = document.querySelector('#xhs-screen .xhs-bottom-nav .xhs-nav-item:last-child');
            if (profileTab) profileTab.click();
            return;
        }

        // 检查是否已有主页数据
        let profile = getCharacterProfile(authorName);

        if (!profile) {
            // 没有主页，显示确认弹窗
            showGenerateProfileConfirm(authorName, authorAvatar, async () => {
                // 显示加载状态
                bringToFront(views.userProfile); // 动态提升z-index，确保在最上面
                views.userProfile.style.display = 'flex';
                const scrollArea = views.userProfile.querySelector('.xhs-user-profile-scroll');
                if (scrollArea) {
                    scrollArea.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999;">
                            <div class="xhs-loading-spinner"></div>
                            <p style="margin-top: 15px;">正在生成主页...</p>
                        </div>
                    `;
                }

                // 生成主页数据
                profile = await generateCharacterProfile(authorName, authorAvatar);
                if (profile) {
                    await saveCharacterProfile(authorName, profile);
                    // 重新渲染
                    renderUserProfile(profile);
                }
            });
            return;
        }

        // 已有主页，直接显示
        bringToFront(views.userProfile); // 动态提升z-index，确保在最上面
        views.userProfile.style.display = 'flex';
        renderUserProfile(profile);
    }

    // 渲染角色主页
    async function renderUserProfile(profile) {
        if (!views.userProfile || !profile) return;

        // 恢复原始HTML结构（如果被替换了）
        const scrollArea = views.userProfile.querySelector('.xhs-user-profile-scroll');
        if (!scrollArea || !scrollArea.querySelector('.xhs-user-profile-header')) {
            // 重建HTML结构
            views.userProfile.innerHTML = `
                <div class="xhs-user-profile-topbar">
                    <div class="xhs-user-profile-back" id="xhs-user-profile-back-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </div>
                    <div class="xhs-user-profile-topbar-right">
                        <div class="xhs-user-refresh-btn" id="xhs-user-refresh-btn" style="padding: 8px; cursor: pointer;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </div>
                        <div class="xhs-user-settings-btn" id="xhs-user-settings-btn" style="padding: 8px; cursor: pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="xhs-user-profile-scroll">
                    <div class="xhs-user-profile-header">
                        <div class="xhs-user-avatar-section">
                            <img id="xhs-user-avatar" class="xhs-user-avatar" src="" alt="头像">
                        </div>
                        <div class="xhs-user-info-section">
                            <div class="xhs-user-nickname" id="xhs-user-nickname">用户昵称</div>
                            <div class="xhs-user-xhsid">小红书号：<span id="xhs-user-xhsid">123456789</span></div>
                            <div class="xhs-user-bio" id="xhs-user-bio">这个人很懒，什么都没写~</div>
                            <div class="xhs-user-tags" id="xhs-user-tags"></div>
                        </div>
                        <div class="xhs-user-stats">
                            <div class="xhs-user-stat-item">
                                <div class="xhs-user-stat-num" id="xhs-user-stat-follow">0</div>
                                <div class="xhs-user-stat-label">关注</div>
                            </div>
                            <div class="xhs-user-stat-item">
                                <div class="xhs-user-stat-num" id="xhs-user-stat-fans">0</div>
                                <div class="xhs-user-stat-label">粉丝</div>
                            </div>
                            <div class="xhs-user-stat-item">
                                <div class="xhs-user-stat-num" id="xhs-user-stat-likes">0</div>
                                <div class="xhs-user-stat-label">获赞与收藏</div>
                            </div>
                        </div>
                        <div class="xhs-user-action-btns">
                            <button class="xhs-user-follow-btn" id="xhs-user-follow-btn"><span>+ 关注</span></button>
                            <button class="xhs-user-msg-btn" id="xhs-user-msg-btn"><span>私信</span></button>
                        </div>
                    </div>
                    <div class="xhs-user-profile-tabs">
                        <div class="xhs-user-profile-tab active" data-tab="notes">笔记</div>
                        <div class="xhs-user-profile-tab" data-tab="comments">评论</div>
                        <div class="xhs-user-profile-tab" data-tab="collects">收藏<span class="xhs-user-gen-collections-btn" id="xhs-user-gen-collections-btn" title="生成收藏夹"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff2442" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></span></div>
                    </div>
                    <div class="xhs-user-profile-content">
                        <div id="xhs-user-notes-grid" class="xhs-waterfall" style="padding: 10px;"></div>
                        <div id="xhs-user-comments-grid" class="xhs-waterfall" style="padding: 10px; display: none;"></div>
                        <div id="xhs-user-collects-grid" class="xhs-waterfall" style="padding: 10px; display: none;"></div>
                    </div>
                </div>
            `;

            // 重新绑定返回按钮事件
            bindUserProfileBackBtn();
        }

        // 填充数据
        const avatarEl = views.userProfile.querySelector('#xhs-user-avatar');
        if (avatarEl) avatarEl.src = profile.avatar || "https://api.dicebear.com/7.x/notionists/svg?seed=" + encodeURIComponent(profile.authorName);

        const nicknameEl = views.userProfile.querySelector('#xhs-user-nickname');
        if (nicknameEl) nicknameEl.textContent = profile.authorName;

        const xhsIdEl = views.userProfile.querySelector('#xhs-user-xhsid');
        if (xhsIdEl) xhsIdEl.textContent = profile.xhsId || "123456789";

        const bioEl = views.userProfile.querySelector('#xhs-user-bio');
        if (bioEl) bioEl.textContent = profile.bio || "这个人很懒，什么都没写~";

        // 标签
        const tagsEl = views.userProfile.querySelector('#xhs-user-tags');
        if (tagsEl) {
            tagsEl.innerHTML = '';
            (profile.tags || []).forEach(tag => {
                const tagDiv = document.createElement('div');
                tagDiv.className = 'xhs-tag';
                tagDiv.textContent = tag;
                tagsEl.appendChild(tagDiv);
            });
        }

        // 统计数据
        const followEl = views.userProfile.querySelector('#xhs-user-stat-follow');
        if (followEl) followEl.textContent = formatStatNumber(profile.followCount || 0);

        const fansEl = views.userProfile.querySelector('#xhs-user-stat-fans');
        if (fansEl) fansEl.textContent = formatStatNumber(profile.fansCount || 0);

        // 获赞与收藏数使用实际笔记数据统计
        let actualLikesCount = 0;
        if (window.db && window.db.xhsNotes) {
            const allNotes = await window.db.xhsNotes.toArray();
            const userNotes = allNotes.filter(n => n.authorName === profile.authorName);
            userNotes.forEach(note => {
                if (note.stats) {
                    actualLikesCount += (note.stats.likes || 0) + (note.stats.collects || 0);
                }
            });
        }

        const likesEl = views.userProfile.querySelector('#xhs-user-stat-likes');
        if (likesEl) likesEl.textContent = formatStatNumber(actualLikesCount);

        // 关注按钮状态
        const followBtn = views.userProfile.querySelector('#xhs-user-follow-btn');
        if (followBtn) {
            updateFollowButton(followBtn, profile.isFollowed);

            // 绑定点击事件
            const newFollowBtn = followBtn.cloneNode(true);
            followBtn.parentNode.replaceChild(newFollowBtn, followBtn);
            newFollowBtn.onclick = async () => {
                profile.isFollowed = !profile.isFollowed;
                updateFollowButton(newFollowBtn, profile.isFollowed);
                await saveCharacterProfile(profile.authorName, profile);
            };
        }

        // 私信按钮
        const msgBtn = views.userProfile.querySelector('#xhs-user-msg-btn');
        if (msgBtn) {
            const newMsgBtn = msgBtn.cloneNode(true);
            msgBtn.parentNode.replaceChild(newMsgBtn, msgBtn);
            newMsgBtn.onclick = () => {
                alert('私信功能开发中~');
            };
        }

        // 绑定标签页切换
        const tabs = views.userProfile.querySelectorAll('.xhs-user-profile-tab');
        tabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            newTab.onclick = () => {
                switchUserProfileTab(newTab.dataset.tab, profile);
            };
        });

        // 绑定收藏夹生成按钮
        bindUserProfileGenCollectionsBtn(profile);

        // 绑定刷新按钮
        bindUserProfileRefreshBtn(profile);

        // 绑定设置按钮
        bindUserProfileSettingsBtn(profile);

        // 渲染笔记列表
        switchUserProfileTab('notes', profile);
    }

    // 格式化统计数字
    function formatStatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + 'w';
        }
        return num.toString();
    }

    // 更新关注按钮状态
    function updateFollowButton(btn, isFollowed) {
        if (isFollowed) {
            btn.classList.add('followed');
            btn.innerHTML = '<span>已关注</span>';
        } else {
            btn.classList.remove('followed');
            btn.innerHTML = '<span>+ 关注</span>';
        }
    }

    // 切换角色主页标签页
    async function switchUserProfileTab(tabName, profile) {
        // 更新标签页激活状态
        views.userProfile.querySelectorAll('.xhs-user-profile-tab').forEach(t => {
            if (t.dataset.tab === tabName) t.classList.add('active');
            else t.classList.remove('active');
        });



        // 显示/隐藏内容区域
        const notesGrid = views.userProfile.querySelector('#xhs-user-notes-grid');
        const commentsGrid = views.userProfile.querySelector('#xhs-user-comments-grid');
        const collectsGrid = views.userProfile.querySelector('#xhs-user-collects-grid');

        if (notesGrid) notesGrid.style.display = 'none';
        if (commentsGrid) commentsGrid.style.display = 'none';
        if (collectsGrid) collectsGrid.style.display = 'none';

        // 获取该角色的笔记
        let allNotes = [];
        if (window.db && window.db.xhsNotes) {
            allNotes = await window.db.xhsNotes.toArray();
        }

        if (tabName === 'notes') {
            if (notesGrid) {
                notesGrid.style.display = 'block';
                const userNotes = allNotes.filter(n => n.authorName === profile.authorName);
                renderUserNotesList(notesGrid, userNotes, '还没有发布笔记');
            }
        } else if (tabName === 'comments') {
            if (commentsGrid) {
                commentsGrid.style.display = 'block';
                // 获取该角色的评论
                const userComments = [];
                allNotes.forEach(note => {
                    if (note.comments && note.comments.length > 0) {
                        note.comments.forEach(comment => {
                            if (comment.user === profile.authorName) {
                                userComments.push({
                                    ...comment,
                                    noteId: note.id,
                                    noteTitle: note.title,
                                    noteImage: note.imageUrl || (note.images && note.images[0]) || ''
                                });
                            }
                            // 检查回复
                            if (comment.replies && comment.replies.length > 0) {
                                comment.replies.forEach(reply => {
                                    if (reply.user === profile.authorName) {
                                        userComments.push({
                                            ...reply,
                                            noteId: note.id,
                                            noteTitle: note.title,
                                            noteImage: note.imageUrl || (note.images && note.images[0]) || '',
                                            isReply: true
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                renderUserCommentsList(commentsGrid, userComments, '还没有发表评论');
            }
        } else if (tabName === 'collects') {
            if (collectsGrid) {
                collectsGrid.style.display = 'block';
                renderCharacterCollections(collectsGrid, profile, allNotes);
            }
        }
    }

    // 渲染角色笔记列表
    function renderUserNotesList(container, notes, emptyText) {
        container.innerHTML = '';

        if (!notes || notes.length === 0) {
            container.classList.remove('xhs-waterfall');
            container.innerHTML = `
                <div class="xhs-user-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path>
                        <path d="M12 8v4"></path>
                        <path d="M12 16h.01"></path>
                    </svg>
                    <p>${emptyText}</p>
                </div>
            `;
            return;
        }

        // 使用瀑布流渲染
        renderWaterfall(container, notes, (note) => {
            const card = document.createElement('div');
            card.className = 'xhs-card';
            card.dataset.noteId = note.id;

            const likeCount = note.stats && note.stats.likes ? note.stats.likes : 0;
            const s = window.state.xhsSettings;
            const isLiked = s && s.likedNoteIds && s.likedNoteIds.includes(note.id);
            const heartFill = isLiked ? '#ff2442' : 'none';
            const heartStroke = isLiked ? '#ff2442' : '#666';

            // 兼容 imageUrl 和 images[0] 两种字段
            const coverImage = note.imageUrl || (note.images && note.images[0]) || '';
            card.innerHTML = `
                <div class="xhs-card-img-wrap xhs-card-img-wrap-ratio">
                    <img src="${coverImage}" class="xhs-card-img xhs-card-img-abs" loading="lazy">
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
        });
    }

    // 渲染角色评论列表
    function renderUserCommentsList(container, comments, emptyText) {
        container.innerHTML = '';
        container.classList.remove('xhs-waterfall');

        if (!comments || comments.length === 0) {
            container.innerHTML = `
                <div class="xhs-user-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <p>${emptyText}</p>
                </div>
            `;
            return;
        }

        // 渲染评论列表
        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'xhs-user-comment-item';
            commentItem.innerHTML = `
                <div class="xhs-user-comment-note" data-note-id="${comment.noteId}">
                    <img src="${comment.noteImage}" class="xhs-user-comment-note-img">
                    <span class="xhs-user-comment-note-title">${comment.noteTitle}</span>
                </div>
                <div class="xhs-user-comment-content">
                    ${comment.isReply ? '<span class="xhs-user-comment-reply-tag">回复</span>' : ''}
                    <span class="xhs-user-comment-text">${comment.text}</span>
                </div>
                <div class="xhs-user-comment-meta">
                    <span>${comment.dateStr || '刚刚'}</span>
                    <span>❤ ${comment.likes || 0}</span>
                </div>
            `;

            // 点击跳转到笔记详情
            commentItem.querySelector('.xhs-user-comment-note').onclick = async () => {
                if (window.db && window.db.xhsNotes) {
                    const note = await window.db.xhsNotes.get(comment.noteId);
                    if (note) openXhsNoteDetail(note);
                }
            };

            container.appendChild(commentItem);
        });
    }

    // 渲染角色收藏夹页面（与个人主页相同的瀑布流风格）
    async function renderCharacterCollections(container, profile, allNotes) {
        container.innerHTML = '';
        container.className = '';
        container.style.cssText = 'padding: 10px;';

        const folders = profile.collectionFolders || [];

        if (folders.length === 0) {
            container.classList.remove('xhs-waterfall');
            container.classList.add('xhs-grid-empty-container');
            container.innerHTML = `
                <div class="xhs-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>还没有收藏夹</p>
                    <span style="font-size:12px;color:#aaa;">点击右上角 + 为该角色生成收藏夹</span>
                </div>
            `;
            return;
        }

        container.classList.remove('xhs-grid-empty-container');

        // 构建所有笔记的Map（包括数据库中的笔记）
        const noteMap = new Map(allNotes.map(n => [String(n.id), n]));

        // 使用瀑布流渲染收藏夹卡片（与个人主页风格一致）
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

            // 点击打开收藏夹详情
            folderEl.onclick = () => {
                renderCharacterCollectionDetail(container, folder, profile, allNotes);
            };

            return folderEl;
        });
    }

    // 渲染角色收藏夹详情页（瀑布流，与个人主页风格一致）
    function renderCharacterCollectionDetail(container, folder, profile, allNotes) {
        container.classList.remove('xhs-waterfall');
        container.className = 'xhs-collection-detail-container';
        container.style.cssText = '';
        container.innerHTML = '';

        // 头部
        const header = document.createElement('div');
        header.className = 'xhs-collection-header';
        header.innerHTML = `<span class="xhs-collection-back-btn">🔙</span> <b class="xhs-collection-title">${folder.name}</b>`;
        header.querySelector('span').onclick = () => {
            switchUserProfileTab('collects', profile);
        };
        container.appendChild(header);

        // 滚动区域
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'xhs-collection-scroll-wrapper';
        container.appendChild(scrollWrapper);

        // 瀑布流容器
        const notesGrid = document.createElement('div');
        scrollWrapper.appendChild(notesGrid);

        const noteIds = (folder.noteIds || []).slice().reverse();
        const noteMap = new Map(allNotes.map(n => [String(n.id), n]));
        const notes = noteIds.map(id => noteMap.get(String(id))).filter(Boolean);

        if (notes.length === 0) {
            notesGrid.style.display = 'none';
            scrollWrapper.classList.add('xhs-no-scroll');
            const empty = document.createElement('div');
            empty.className = 'xhs-empty-state';
            empty.innerHTML = '<p>收藏夹为空</p>';
            scrollWrapper.appendChild(empty);
        } else {
            scrollWrapper.classList.remove('xhs-no-scroll');
            renderWaterfall(notesGrid, notes, createXhsCard);
        }
    }

    // 绑定角色收藏夹生成按钮
    function bindUserProfileGenCollectionsBtn(profile) {
        const btn = views.userProfile.querySelector('#xhs-user-gen-collections-btn');
        if (!btn) return;

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.onclick = async (e) => {
            e.stopPropagation(); // 防止触发标签页切换
            const folders = profile.collectionFolders || [];
            const isUpdate = folders.length > 0;
            const action = isUpdate ? '更新' : '生成';
            const desc = isUpdate
                ? `AI将根据角色设定和当前收藏内容，为已有收藏夹补充新笔记，并可能创建新收藏夹。`
                : `AI将根据角色设定生成收藏夹和笔记内容。`;
            showXhsConfirmGeneral(
                `确定要为「${profile.authorName}」${action}收藏夹吗？\n${desc}`,
                action,
                async () => {
                    const collectsGrid = views.userProfile.querySelector('#xhs-user-collects-grid');

                    // 添加半透明遮罩（保留原有内容）
                    let overlay = null;
                    if (collectsGrid) {
                        collectsGrid.style.position = 'relative';
                        overlay = document.createElement('div');
                        overlay.className = 'xhs-collections-loading-overlay';
                        overlay.innerHTML = `
                            <div class="xhs-loading-spinner"></div>
                            <p style="margin-top:12px;font-size:13px;">正在${action}收藏夹...</p>
                        `;
                        collectsGrid.appendChild(overlay);
                    }

                    const genResult = await generateCharacterCollections(profile);

                    // 移除遮罩
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

                    if (genResult) {
                        profile.collectionFolders = genResult.folders;
                        await saveCharacterProfile(profile.authorName, profile);

                        let allNotes = [];
                        if (window.db && window.db.xhsNotes) {
                            allNotes = await window.db.xhsNotes.toArray();
                        }
                        if (collectsGrid) {
                            renderCharacterCollections(collectsGrid, profile, allNotes);
                        }

                        const newFolderCount = genResult.folders.length - folders.length;
                        let toastMsg = isUpdate
                            ? `已更新收藏夹，新增 ${genResult.newNotesCount} 篇笔记` + (newFolderCount > 0 ? `、${newFolderCount} 个新收藏夹` : '')
                            : `成功生成 ${genResult.folders.length} 个收藏夹`;
                        const toast = document.createElement('div');
                        toast.textContent = toastMsg;
                        toast.className = 'xhs-toast';
                        document.body.appendChild(toast);
                        setTimeout(() => document.body.removeChild(toast), 2500);
                    }
                }
            );
        };
    }

    // 绑定角色主页返回按钮和刷新按钮
    function bindUserProfileBackBtn() {
        const backBtn = views.userProfile.querySelector('#xhs-user-profile-back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                views.userProfile.style.display = 'none';
            };
        }
    }

    // 绑定刷新按钮
    function bindUserProfileRefreshBtn(profile) {
        const refreshBtn = views.userProfile.querySelector('#xhs-user-refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = () => {
                // 弹出确认弹窗
                showXhsConfirmGeneral(
                    `确定要重新生成「${profile.authorName}」的主页吗？\n当前的简介、标签等信息将被覆盖。`,
                    '重新生成',
                    async () => {
                        // 添加旋转动画
                        refreshBtn.classList.add('spinning');

                        // 显示加载状态
                        const scrollArea = views.userProfile.querySelector('.xhs-user-profile-scroll');
                        if (scrollArea) {
                            scrollArea.innerHTML = `
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999;">
                                    <div class="xhs-loading-spinner"></div>
                                    <p style="margin-top: 15px;">正在重新生成主页...</p>
                                </div>
                            `;
                        }

                        // 重新生成主页数据
                        const newProfile = await generateCharacterProfile(profile.authorName, profile.avatar);
                        if (newProfile) {
                            // 保留关注状态和收藏夹数据
                            newProfile.isFollowed = profile.isFollowed;
                            if (profile.collectionFolders) {
                                newProfile.collectionFolders = profile.collectionFolders;
                            }
                            await saveCharacterProfile(profile.authorName, newProfile);
                            // 重新渲染
                            renderUserProfile(newProfile);
                        }

                        refreshBtn.classList.remove('spinning');
                    }
                );
            };
        }
    }

    // 绑定设置按钮
    function bindUserProfileSettingsBtn(profile) {
        const settingsBtn = views.userProfile.querySelector('#xhs-user-settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                showUserProfileSettingsModal(profile);
            };
        }
    }

    // 显示角色主页设置弹窗
    function showUserProfileSettingsModal(profile) {
        // 移除已存在的弹窗
        const existingModal = document.getElementById('xhs-user-profile-settings-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'xhs-user-profile-settings-modal';
        modal.className = 'xhs-user-profile-settings-modal';
        modal.innerHTML = `
            <div class="xhs-user-profile-settings-content">
                <div class="xhs-user-profile-settings-header">
                    <span>编辑主页信息</span>
                    <span class="xhs-user-profile-settings-close">×</span>
                </div>
                <div class="xhs-user-profile-settings-body">
                    <div class="xhs-user-profile-settings-item">
                        <label>头像</label>
                        <div class="xhs-user-profile-settings-avatar-wrap">
                            <img id="xhs-user-settings-avatar-preview" src="${profile.avatar || ''}" class="xhs-user-profile-settings-avatar">
                            <input type="file" id="xhs-user-settings-avatar-input" accept="image/*" style="display: none;">
                            <button id="xhs-user-settings-avatar-btn" class="xhs-user-profile-settings-avatar-btn">更换</button>
                        </div>
                    </div>
                    <div class="xhs-user-profile-settings-item">
                        <label>昵称</label>
                        <input type="text" id="xhs-user-settings-nickname" value="${profile.authorName || ''}" placeholder="输入昵称">
                    </div>
                    <div class="xhs-user-profile-settings-item">
                        <label>小红书号</label>
                        <input type="text" id="xhs-user-settings-xhsid" value="${profile.xhsId || ''}" placeholder="输入小红书号">
                    </div>
                    <div class="xhs-user-profile-settings-item">
                        <label>个人简介</label>
                        <textarea id="xhs-user-settings-bio" placeholder="输入个人简介">${profile.bio || ''}</textarea>
                    </div>
                    <div class="xhs-user-profile-settings-item">
                        <label>标签 (空格分隔)</label>
                        <input type="text" id="xhs-user-settings-tags" value="${(profile.tags || []).join(' ')}" placeholder="如：双子座 北京 设计师">
                    </div>
                    <div class="xhs-user-profile-settings-row">
                        <div class="xhs-user-profile-settings-item half">
                            <label>关注数</label>
                            <input type="number" id="xhs-user-settings-follow" value="${profile.followCount || 0}">
                        </div>
                        <div class="xhs-user-profile-settings-item half">
                            <label>粉丝数</label>
                            <input type="number" id="xhs-user-settings-fans" value="${profile.fansCount || 0}">
                        </div>
                    </div>
                    <div class="xhs-user-profile-settings-item">
                        <label>获赞与收藏</label>
                        <input type="number" id="xhs-user-settings-likes" value="${profile.likesCount || 0}">
                    </div>
                </div>
                <div class="xhs-user-profile-settings-footer">
                    <button class="xhs-user-profile-settings-cancel">取消</button>
                    <button class="xhs-user-profile-settings-save">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 动画显示
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });

        const closeModal = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 200);
        };

        // 关闭按钮
        modal.querySelector('.xhs-user-profile-settings-close').onclick = closeModal;
        modal.querySelector('.xhs-user-profile-settings-cancel').onclick = closeModal;

        // 点击遮罩关闭
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // 头像更换
        const avatarBtn = modal.querySelector('#xhs-user-settings-avatar-btn');
        const avatarInput = modal.querySelector('#xhs-user-settings-avatar-input');
        const avatarPreview = modal.querySelector('#xhs-user-settings-avatar-preview');

        avatarBtn.onclick = () => avatarInput.click();
        avatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file && window.handleImageUploadAndCompress) {
                const base64 = await window.handleImageUploadAndCompress(file);
                avatarPreview.src = base64;
            }
        };

        // 保存按钮
        modal.querySelector('.xhs-user-profile-settings-save').onclick = async () => {
            const oldName = profile.authorName;
            const newName = modal.querySelector('#xhs-user-settings-nickname').value.trim();

            const updatedProfile = {
                ...profile,
                avatar: avatarPreview.src,
                authorName: newName || oldName,
                xhsId: modal.querySelector('#xhs-user-settings-xhsid').value.trim(),
                bio: modal.querySelector('#xhs-user-settings-bio').value.trim(),
                tags: modal.querySelector('#xhs-user-settings-tags').value.trim().split(/\s+/).filter(t => t),
                followCount: parseInt(modal.querySelector('#xhs-user-settings-follow').value) || 0,
                fansCount: parseInt(modal.querySelector('#xhs-user-settings-fans').value) || 0,
                likesCount: parseInt(modal.querySelector('#xhs-user-settings-likes').value) || 0
            };

            // 如果昵称改变了，需要删除旧的profile并创建新的
            if (newName && newName !== oldName) {
                // 删除旧的
                if (window.state.xhsSettings.characterProfiles) {
                    delete window.state.xhsSettings.characterProfiles[oldName];
                }
            }

            await saveCharacterProfile(updatedProfile.authorName, updatedProfile);
            closeModal();
            renderUserProfile(updatedProfile);
        };
    }

    // 初始化时绑定返回按钮
    bindUserProfileBackBtn();

    /* =========================================
        10. 关注列表功能
       ========================================= */

    // 打开关注列表页面
    function openFollowingList() {
        // 创建关注列表视图（如果不存在）
        let followingView = document.getElementById('xhs-following-view');
        if (!followingView) {
            followingView = document.createElement('div');
            followingView.id = 'xhs-following-view';
            followingView.className = 'xhs-following-view';
            document.getElementById('xhs-view-container').appendChild(followingView);
        }

        // 渲染关注列表
        renderFollowingList(followingView);

        bringToFront(followingView);
        followingView.style.display = 'flex';
    }

    // 渲染关注列表
    function renderFollowingList(container) {
        const s = window.state.xhsSettings;
        const profiles = s.characterProfiles || {};
        const followedProfiles = Object.values(profiles).filter(p => p.isFollowed);

        container.innerHTML = `
            <div class="xhs-following-header">
                <div class="xhs-following-back-btn" id="xhs-following-back-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div class="xhs-following-title">关注</div>
                <div class="xhs-following-placeholder"></div>
            </div>
            <div class="xhs-following-tabs">
                <div class="xhs-following-tab active" data-tab="following">关注 ${followedProfiles.length}</div>
                <div class="xhs-following-tab" data-tab="fans">粉丝 ${s.fansCount || 0}</div>
            </div>
            <div class="xhs-following-content">
                <div id="xhs-following-list" class="xhs-following-list"></div>
                <div id="xhs-fans-list" class="xhs-fans-list" style="display: none;"></div>
            </div>
        `;

        // 绑定返回按钮
        container.querySelector('#xhs-following-back-btn').onclick = () => {
            container.style.display = 'none';
        };

        // 绑定标签页切换
        const tabs = container.querySelectorAll('.xhs-following-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const followingList = container.querySelector('#xhs-following-list');
                const fansList = container.querySelector('#xhs-fans-list');

                if (tab.dataset.tab === 'following') {
                    followingList.style.display = 'block';
                    fansList.style.display = 'none';
                } else {
                    followingList.style.display = 'none';
                    fansList.style.display = 'block';
                }
            };
        });

        // 渲染关注列表内容
        const listEl = container.querySelector('#xhs-following-list');

        if (followedProfiles.length === 0) {
            listEl.innerHTML = `
                <div class="xhs-following-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" width="60" height="60">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p>暂无关注</p>
                    <span>关注感兴趣的博主，发现更多精彩内容</span>
                </div>
            `;
        } else {
            listEl.innerHTML = '';
            followedProfiles.forEach(profile => {
                const item = document.createElement('div');
                item.className = 'xhs-following-item';
                item.innerHTML = `
                    <img src="${profile.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(profile.authorName)}" class="xhs-following-avatar">
                    <div class="xhs-following-info">
                        <div class="xhs-following-name">${profile.authorName}</div>
                        <div class="xhs-following-bio">${profile.bio || '这个人很懒，什么都没写~'}</div>
                    </div>
                    <button class="xhs-following-action-btn followed" data-author="${profile.authorName}">
                        <span>已关注</span>
                    </button>
                `;

                // 点击头像或名字打开主页
                item.querySelector('.xhs-following-avatar').onclick = () => {
                    container.style.display = 'none';
                    openUserProfile(profile.authorName, profile.avatar);
                };
                item.querySelector('.xhs-following-info').onclick = () => {
                    container.style.display = 'none';
                    openUserProfile(profile.authorName, profile.avatar);
                };

                // 点击关注按钮取消关注
                const actionBtn = item.querySelector('.xhs-following-action-btn');
                actionBtn.onclick = async (e) => {
                    e.stopPropagation();
                    profile.isFollowed = false;
                    await saveCharacterProfile(profile.authorName, profile);
                    // 重新渲染列表
                    renderFollowingList(container);
                    // 更新个人主页的关注数
                    if (window.renderXhsProfile) window.renderXhsProfile();
                };

                listEl.appendChild(item);
            });
        }

        // 渲染粉丝列表（模拟数据）
        const fansListEl = container.querySelector('#xhs-fans-list');
        fansListEl.innerHTML = `
            <div class="xhs-following-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" width="60" height="60">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <p>暂无粉丝</p>
                <span>发布优质内容，吸引更多粉丝关注你</span>
            </div>
        `;
    }

    /* =========================================
        11. 详情页关注按钮功能
       ========================================= */

    // 更新详情页关注按钮状态
    function updateDetailFollowButton(btn, profile) {
        if (!btn) return;

        if (profile && profile.isFollowed) {
            btn.classList.add('followed');
            btn.textContent = '已关注';
        } else {
            btn.classList.remove('followed');
            btn.textContent = '关注';
        }
    }

    // 处理详情页关注按钮点击
    async function handleDetailFollowClick(authorName, authorAvatar, btn) {
        // 检查是否是当前用户自己
        const mySettings = window.state.xhsSettings;
        if (mySettings && authorName === mySettings.nickname) {
            // 是自己，不能关注自己
            const toast = document.createElement('div');
            toast.textContent = '不能关注自己哦~';
            toast.className = 'xhs-toast';
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 2000);
            return;
        }

        // 检查是否已有主页
        let profile = getCharacterProfile(authorName);

        if (!profile) {
            // 没有主页，显示确认弹窗（和点击头像相同）
            showGenerateProfileConfirm(authorName, authorAvatar, async () => {
                // 显示加载状态
                btn.textContent = '...';
                btn.disabled = true;

                // 生成主页数据
                profile = await generateCharacterProfile(authorName, authorAvatar);
                if (profile) {
                    // 直接设为已关注
                    profile.isFollowed = true;
                    await saveCharacterProfile(authorName, profile);

                    // 更新按钮状态
                    updateDetailFollowButton(btn, profile);
                    btn.disabled = false;

                    // 显示提示
                    const toast = document.createElement('div');
                    toast.textContent = '关注成功';
                    toast.className = 'xhs-toast';
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 2000);

                    // 更新个人主页的关注数
                    if (window.renderXhsProfile) window.renderXhsProfile();
                } else {
                    btn.textContent = '关注';
                    btn.disabled = false;
                }
            });
        } else {
            // 已有主页，切换关注状态
            profile.isFollowed = !profile.isFollowed;
            await saveCharacterProfile(authorName, profile);

            // 更新按钮状态
            updateDetailFollowButton(btn, profile);

            // 显示提示
            const toast = document.createElement('div');
            toast.textContent = profile.isFollowed ? '关注成功' : '已取消关注';
            toast.className = 'xhs-toast';
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 2000);

            // 更新个人主页的关注数
            if (window.renderXhsProfile) window.renderXhsProfile();
        }
    }

    // 暴露给全局使用
    window.openXhsUserProfile = openUserProfile;
});
