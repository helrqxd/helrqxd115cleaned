// qzone.js - QQ动态(Qzone)功能模块

// 定义全局变量
window.activePostId = null;
window.activeAlbumId = null;
// const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'; // Moved to main-app.js


let photoViewerState = {
    isOpen: false,
    photos: [],
    currentIndex: -1,
};

// 滑动删除相关的状态
let swipeState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    activeContainer: null,
    swipeDirection: null,
    isClick: true,
};

// 工具函数：长按事件监听
function addLongPressListener(element, callback) {
    let pressTimer;
    const startPress = (e) => {
        // e.preventDefault(); // 可能会阻止点击，视情况而定
        pressTimer = window.setTimeout(() => callback(e), 500);
    };
    const cancelPress = () => clearTimeout(pressTimer);

    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchstart', startPress, { passive: true });

    element.addEventListener('mouseup', cancelPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchend', cancelPress);
    element.addEventListener('touchmove', cancelPress);
}

// ===================================================================
// 核心页面渲染函数
// ===================================================================

function renderQzoneScreen() {
    if (window.state && window.state.qzoneSettings) {
        const settings = window.state.qzoneSettings;
        document.getElementById('qzone-nickname').textContent = settings.nickname;
        document.getElementById('qzone-avatar-img').src = settings.avatar;
        document.getElementById('qzone-banner-img').src = settings.banner;
    }
}
window.renderQzoneScreen = renderQzoneScreen;
window.renderQzoneScreenProxy = renderQzoneScreen;

async function saveQzoneSettings() {
    if (window.db && window.state.qzoneSettings) {
        await window.db.qzoneSettings.put(window.state.qzoneSettings);
    }
}
window.saveQzoneSettings = saveQzoneSettings;

function formatPostTimestamp(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffSeconds = Math.floor((now - date) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if (now.getFullYear() === year) {
        return `${month}-${day} ${hours}:${minutes}`;
    } else {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
}
window.formatPostTimestamp = formatPostTimestamp;

async function renderQzonePosts() {
    const postsListEl = document.getElementById('qzone-posts-list');
    if (!postsListEl) return;

    const [posts, favorites] = await Promise.all([
        window.db.qzonePosts.orderBy('timestamp').reverse().toArray(),
        window.db.favorites.where('type').equals('qzone_post').toArray()
    ]);

    const favoritedPostIds = new Set(favorites.map((fav) => fav.content.id));

    postsListEl.innerHTML = '';

    if (posts.length === 0) {
        postsListEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 30px 0;">这里空空如也，快来发布第一条说说吧！</p>';
        return;
    }

    const userSettings = window.state.qzoneSettings;
    const allAiCharacterNames = new Set(
        Object.values(window.state.chats)
            .filter((chat) => !chat.isGroup)
            .map((chat) => chat.name)
    );

    posts.forEach((post) => {
        const postContainer = document.createElement('div');
        postContainer.className = 'qzone-post-container';
        postContainer.dataset.postId = post.id;

        const postEl = document.createElement('div');
        postEl.className = 'qzone-post-item';

        let authorAvatar = '',
            authorNickname = '',
            commentAvatar = userSettings.avatar;

        if (post.authorId === 'user') {
            authorAvatar = userSettings.avatar;
            authorNickname = userSettings.nickname;
        } else if (window.state.chats[post.authorId]) {
            const authorChat = window.state.chats[post.authorId];
            authorAvatar = authorChat.settings.aiAvatar || window.defaultAvatar;
            authorNickname = authorChat.name;
        } else {
            authorAvatar = window.defaultAvatar;
            authorNickname = '{{char}}';
        }

        let contentHtml = '';
        const publicTextHtml = post.publicText ? `<div class="post-content">${post.publicText.replace(/\n/g, '<br>')}</div>` : '';

        if (post.type === 'shuoshuo') {
            contentHtml = `<div class="post-content" style="margin-bottom: 10px;">${post.content.replace(/\n/g, '<br>')}</div>`;
        } else if (post.type === 'image_post' && post.imageUrl) {
            contentHtml = publicTextHtml ? `${publicTextHtml}<div style="margin-top:10px;"><img src="${post.imageUrl}" class="chat-image"></div>` : `<img src="${post.imageUrl}" class="chat-image">`;
        } else if (post.type === 'text_image') {
            contentHtml = publicTextHtml ? `${publicTextHtml}<div style="margin-top:10px;"><img src="https://i.postimg.cc/KYr2qRCK/1.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}"></div>` : `<img src="https://i.postimg.cc/KYr2qRCK/1.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}">`;
        } else if (post.type === 'realimag') {
            const imageUrls = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
            if (imageUrls.length > 0) {
                const imageCount = imageUrls.length;
                let imagesHtml = `<div class="post-images-grid grid-${imageCount}">`;
                imageUrls.forEach((url, index) => {
                    imagesHtml += `<img src="${url}" class="realimag-image" alt="图片${index + 1}" loading="lazy" onerror="this.src='https://i.postimg.cc/KYr2qRCK/1.jpg'; this.alt='图片加载失败';">`;
                });
                imagesHtml += '</div>';
                contentHtml = publicTextHtml ? `${publicTextHtml}${imagesHtml}` : imagesHtml;
            }
        } else if (post.type === 'naiimag') {
            const imageUrls = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
            if (imageUrls.length > 0) {
                const imageCount = imageUrls.length;
                let imagesHtml = `<div class="post-images-grid grid-${imageCount}">`;
                imageUrls.forEach((url, index) => {
                    imagesHtml += `<img src="${url}" class="naiimag-image" alt="图片${index + 1}" loading="lazy" onerror="this.src='https://i.postimg.cc/KYr2qRCK/1.jpg'; this.alt='图片加载失败';">`;
                });
                imagesHtml += '</div>';
                contentHtml = publicTextHtml ? `${publicTextHtml}${imagesHtml}` : imagesHtml;
            }
        }

        let likesHtml = '';
        if (post.likes && post.likes.length > 0) {
            likesHtml = `<div class="post-likes-section"><svg class="like-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span>${post.likes.join('、')} 觉得很赞</span></div>`;
        }

        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            const commentsToShow =
                post.areCommentsVisible === false
                    ? post.comments.filter(
                        (comment) =>
                            comment.commenterName === userSettings.nickname ||
                            allAiCharacterNames.has(comment.commenterName)
                    )
                    : post.comments;

            if (commentsToShow.length > 0) {
                commentsHtml = '<div class="post-comments-container">';
                commentsToShow.forEach((comment) => {
                    const originalIndex = post.comments.indexOf(comment);
                    let replyHtml = '';
                    if (comment.replyTo) {
                        replyHtml = `<span class="reply-text">回复</span> <span class="reply-target-name">${comment.replyTo}</span>`;
                    }
                    commentsHtml += `
                                    <div class="comment-item" data-commenter-name="${comment.commenterName}">
                                        <span class="commenter-name">${comment.commenterName}</span>${replyHtml}:
                                        <span class="comment-text"> ${comment.text}</span>
                                        <span class="comment-delete-btn" data-comment-index="${originalIndex}">×</span>
                                    </div>`;
                });
                commentsHtml += '</div>';
            }
        }

        const commentsAndFooterHtml = `
                        ${commentsHtml}
                        <div class="post-footer">
                            <div class="comment-section">
                                <img src="${commentAvatar}" class="comment-avatar">
                                <input type="text" class="comment-input" placeholder="友善的评论是交流的起点">
                                <div class="at-mention-popup"></div>
                            </div>
                            <button class="comment-send-btn">发送</button>
                        </div>
                    `;

        const userNickname = window.state.qzoneSettings.nickname;
        const isLikedByUser = post.likes && post.likes.includes(userNickname);
        const isFavoritedByUser = favoritedPostIds.has(post.id);

        postEl.innerHTML = `
                        <div class="post-header"><img src="${authorAvatar}" class="post-avatar"><div class="post-info"><span class="post-nickname">${authorNickname}</span><span class="post-timestamp">${formatPostTimestamp(post.timestamp)}</span></div>
                            <div class="post-actions-btn">…</div>
                        </div>
                        <div class="post-main-content">${contentHtml}</div>
                        <div class="post-feedback-icons">
                            <span class="action-icon like ${isLikedByUser ? 'active' : ''}"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span>
                            <span class="action-icon favorite ${isFavoritedByUser ? 'active' : ''}"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></span>
                            <span class="action-icon summon-npc" data-post-id="${post.id}" data-author-id="${post.authorId}" title="召唤NPC评论"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
                            </div>
                        ${likesHtml}
                        ${commentsAndFooterHtml}
                    `;

        const deleteAction = document.createElement('div');
        deleteAction.className = 'qzone-post-delete-action';
        deleteAction.innerHTML = '<span>删除</span>';

        postContainer.appendChild(postEl);
        postContainer.appendChild(deleteAction);

        const commentSection = postContainer.querySelector('.comment-section');
        if (commentSection) {
            commentSection.addEventListener('touchstart', (e) => e.stopPropagation());
            commentSection.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        postsListEl.appendChild(postContainer);

        const commentInput = postContainer.querySelector('.comment-input');
        if (commentInput) {
            const popup = postContainer.querySelector('.at-mention-popup');
            commentInput.addEventListener('input', () => {
                const value = commentInput.value;
                const atMatch = value.match(/@([\p{L}\w]*)$/u);
                if (atMatch) {
                    const namesToMention = new Set();
                    const authorNickname = postContainer.querySelector('.post-nickname')?.textContent;
                    if (authorNickname) namesToMention.add(authorNickname);
                    postContainer.querySelectorAll('.commenter-name').forEach((nameEl) => {
                        namesToMention.add(nameEl.textContent.replace(':', ''));
                    });
                    namesToMention.delete(window.state.qzoneSettings.nickname);
                    popup.innerHTML = '';
                    if (namesToMention.size > 0) {
                        const searchTerm = atMatch[1];
                        namesToMention.forEach((name) => {
                            if (name.toLowerCase().includes(searchTerm.toLowerCase())) {
                                const item = document.createElement('div');
                                item.className = 'at-mention-item';
                                item.textContent = name;
                                item.addEventListener('mousedown', (e) => {
                                    e.preventDefault();
                                    const newText = value.substring(0, atMatch.index) + `@${name} `;
                                    commentInput.value = newText;
                                    popup.style.display = 'none';
                                    commentInput.focus();
                                });
                                popup.appendChild(item);
                            }
                        });
                        popup.style.display = popup.children.length > 0 ? 'block' : 'none';
                    } else {
                        popup.style.display = 'none';
                    }
                } else {
                    popup.style.display = 'none';
                }
            });
            commentInput.addEventListener('blur', () => {
                setTimeout(() => {
                    popup.style.display = 'none';
                }, 200);
            });
        }
    });
}
window.renderQzonePosts = renderQzonePosts;

async function renderFollowingFeed() {
    const feedListEl = document.getElementById('weibo-following-feed-list');
    if (!feedListEl) return;

    const allPosts = await window.db.qzonePosts.orderBy('timestamp').reverse().toArray();
    const followingPosts = allPosts.filter((post) => post.authorId !== 'user');

    feedListEl.innerHTML = '';

    if (followingPosts.length === 0) {
        feedListEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 30px 0;">你关注的人还没有发布任何动态哦。</p>';
        return;
    }
    // 实现逻辑待补充，暂时保持为空
}
window.renderFollowingFeed = renderFollowingFeed;

// ===================================================================
// 发布器相关函数
// ===================================================================

function resetCreatePostModal() {
    document.getElementById('post-public-text').value = '';
    document.getElementById('post-image-preview').src = '';
    document.getElementById('post-image-description').value = '';
    document.getElementById('post-image-preview-container').classList.remove('visible');
    document.getElementById('post-image-desc-group').style.display = 'none';
    document.getElementById('post-local-image-input').value = '';
    document.getElementById('post-hidden-text').value = '';

    const imageModeBtn = document.getElementById('switch-to-image-mode');
    const textImageModeBtn = document.getElementById('switch-to-text-image-mode');
    const imageModeContent = document.getElementById('image-mode-content');
    const textImageModeContent = document.getElementById('text-image-mode-content');

    imageModeBtn.classList.add('active');
    textImageModeBtn.classList.remove('active');
    imageModeContent.classList.add('active');
    textImageModeContent.classList.remove('active');
}
window.resetCreatePostModal = resetCreatePostModal;

async function openQZonePublisher(mode) {
    resetCreatePostModal();
    const modal = document.getElementById('create-post-modal');
    modal.dataset.mode = mode;
    document.getElementById('create-post-modal-title').textContent = '发布动态';

    if (mode === 'shuoshuo') {
        modal.querySelector('.post-mode-switcher').style.display = 'none';
        modal.querySelector('#image-mode-content').style.display = 'none';
        modal.querySelector('#text-image-mode-content').style.display = 'none';
        modal.querySelector('#post-public-text').placeholder = '分享新鲜事...';
    } else {
        modal.querySelector('.post-mode-switcher').style.display = 'flex';
        modal.querySelector('#image-mode-content').classList.add('active');
        modal.querySelector('#text-image-mode-content').classList.remove('active');
        modal.querySelector('#post-public-text').placeholder = '分享新鲜事...（非必填的公开文字）';
    }

    document.getElementById('post-comments-toggle-group').style.display = 'block';

    const visibilityGroup = document.getElementById('post-visibility-group');
    const groupsContainer = document.getElementById('post-visibility-groups');
    const visibilityRadios = document.querySelectorAll('input[name="visibility"]');

    visibilityGroup.style.display = 'block';
    groupsContainer.innerHTML = '';

    const groups = await window.db.qzoneGroups.toArray();
    if (groups.length > 0) {
        groups.forEach((group) => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${group.id}"> ${group.name}`;
            groupsContainer.appendChild(label);
        });
    } else {
        groupsContainer.innerHTML = '<p style="color: #8a8a8a; font-size: 13px;">还没有创建任何好友分组哦。</p>';
    }

    visibilityRadios[0].checked = true;
    groupsContainer.style.display = 'none';

    visibilityRadios.forEach((radio) => {
        radio.onchange = function () {
            groupsContainer.style.display = this.value === 'groups' ? 'block' : 'none';
        };
    });

    modal.classList.add('visible');
}
window.openQZonePublisher = openQZonePublisher;

// ===================================================================
// 动态操作菜单和编辑
// ===================================================================

function showPostActions(postId) {
    window.activePostId = postId;
    document.getElementById('post-actions-modal').classList.add('visible');
}
window.showPostActions = showPostActions;

function hidePostActions() {
    document.getElementById('post-actions-modal').classList.remove('visible');
    window.activePostId = null;
}
window.hidePostActions = hidePostActions;

async function openPostEditor() {
    if (!window.activePostId) return;

    const postIdToEdit = window.activePostId;
    const post = await window.db.qzonePosts.get(postIdToEdit);
    if (!post) return;

    hidePostActions();

    const modal = document.getElementById('create-post-modal');
    modal.dataset.mode = 'edit';
    modal.dataset.editingPostId = postIdToEdit;

    modal.querySelector('.post-mode-switcher').style.display = 'none';
    document.getElementById('post-public-text').value = post.publicText || (post.type === 'shuoshuo' ? post.content : '');

    if (post.type === 'image_post') {
        document.getElementById('image-mode-content').classList.add('active');
        document.getElementById('text-image-mode-content').classList.remove('active');
        document.getElementById('post-image-preview-container').classList.add('visible');
        document.getElementById('post-image-preview').src = post.imageUrl;
        document.getElementById('post-image-desc-group').style.display = 'block';
        document.getElementById('post-image-description').value = post.imageDescription;
    } else if (post.type === 'text_image') {
        document.getElementById('image-mode-content').classList.remove('active');
        document.getElementById('text-image-mode-content').classList.add('active');
        document.getElementById('post-hidden-text').value = post.hiddenContent;
    } else {
        document.getElementById('image-mode-content').classList.remove('active');
        document.getElementById('text-image-mode-content').classList.remove('active');
    }

    document.getElementById('post-comments-toggle').checked = post.areCommentsVisible !== false;
    modal.classList.add('visible');
}
window.openPostEditor = openPostEditor;

async function saveEditedPost(postId, newRawContent) {
    const post = await window.db.qzonePosts.get(postId);
    if (!post) return;
    const trimmedContent = newRawContent.trim();
    try {
        const parsed = JSON.parse(trimmedContent);
        post.type = parsed.type || 'image_post';
        post.publicText = parsed.publicText || '';
        post.imageUrl = parsed.imageUrl || '';
        post.imageDescription = parsed.imageDescription || '';
        post.hiddenContent = parsed.hiddenContent || '';
        post.content = '';
    } catch (e) {
        post.type = 'shuoshuo';
        post.content = trimmedContent;
        post.publicText = '';
        post.imageUrl = '';
        post.imageDescription = '';
        post.hiddenContent = '';
    }
    await window.db.qzonePosts.put(post);
    await renderQzonePosts();
    await window.showCustomAlert('成功', '动态已更新！');
}
window.saveEditedPost = saveEditedPost;

async function copyPostContent() {
    if (!window.activePostId) return;
    const post = await window.db.qzonePosts.get(window.activePostId);
    if (!post) return;

    let textToCopy = post.content || post.publicText || post.hiddenContent || post.imageDescription || '（无文字内容）';

    try {
        await navigator.clipboard.writeText(textToCopy);
        await window.showCustomAlert('复制成功', '动态内容已复制到剪贴板。');
    } catch (err) {
        await window.showCustomAlert('复制失败', '无法访问剪贴板。');
    }

    hidePostActions();
}
window.copyPostContent = copyPostContent;

// ===================================================================
// NPC 召唤和评论功能
// ===================================================================

async function handleNpcSummonClick(postId, authorId) {
    const post = await window.db.qzonePosts.get(postId);
    if (!post) {
        alert('找不到该动态！');
        return;
    }
    if (authorId === 'user') {
        await handleUserPostCommentTrigger(post);
    } else {
        await handleCharPostCommentTrigger(post, authorId);
    }
}
window.handleNpcSummonClick = handleNpcSummonClick;

async function handleCharPostCommentTrigger(post, authorId) {
    const authorChar = window.state.chats[authorId];
    if (!authorChar || !authorChar.npcLibrary || authorChar.npcLibrary.length === 0) {
        alert(`角色“${authorChar.name}”还没有自己的NPC朋友哦！`);
        return;
    }
    await generateNpcCommentsForPost(post, authorChar.npcLibrary, authorChar);
}

async function handleUserPostCommentTrigger(post) {
    const modal = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('custom-modal-title');
    const modalBody = document.getElementById('custom-modal-body');
    const modalConfirmBtn = document.getElementById('custom-modal-confirm');
    const modalCancelBtn = document.getElementById('custom-modal-cancel');

    modalTitle.textContent = '选择要召唤的NPC';

    const charsWithNpcs = Object.values(window.state.chats).filter((chat) => !chat.isGroup && chat.npcLibrary && chat.npcLibrary.length > 0);

    if (charsWithNpcs.length === 0) {
        alert('当前没有任何角色拥有NPC库。');
        return;
    }

    let optionsHtml = '<div style="text-align: left;">';
    optionsHtml += `<label style="display: block; padding: 5px;"><input type="radio" name="npc_summon_choice" value="all" checked> 召唤所有人</label>`;
    charsWithNpcs.forEach((char) => {
        optionsHtml += `<label style="display: block; padding: 5px;"><input type="radio" name="npc_summon_choice" value="${char.id}"> 只召唤 ${char.name} 的朋友</label>`;
    });
    optionsHtml += '</div>';

    modalBody.innerHTML = optionsHtml;
    modalConfirmBtn.textContent = '确认召唤';
    modalCancelBtn.style.display = 'block';
    modal.classList.add('visible');

    modalConfirmBtn.onclick = async () => {
        const selectedValue = document.querySelector('input[name="npc_summon_choice"]:checked').value;
        let npcsToSummon = [];
        let ownerChar = null;

        if (selectedValue === 'all') {
            charsWithNpcs.forEach((char) => {
                npcsToSummon.push(...char.npcLibrary);
            });
        } else {
            const selectedChar = window.state.chats[selectedValue];
            if (selectedChar) {
                npcsToSummon = selectedChar.npcLibrary;
                ownerChar = selectedChar;
            }
        }
        modal.classList.remove('visible');
        if (npcsToSummon.length > 0) {
            await generateNpcCommentsForPost(post, npcsToSummon, ownerChar);
        } else {
            alert('没有找到可用的NPC。');
        }
    };
    modalCancelBtn.onclick = () => modal.classList.remove('visible');
}

async function generateNpcCommentsForPost(post, npcsToComment, ownerChar = null) {
    await window.showCustomAlert('请稍候...', '正在召唤NPC们前来围观评论...');
    const { proxyUrl, apiKey, model } = window.state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
        alert('请先配置API！');
        return;
    }
    const postContent = (post.content || post.publicText || post.hiddenContent || '(图片动态)').substring(0, 150);
    const existingComments = (post.comments || []).slice(-3).map((c) => `${c.commenterName}: ${c.text}`).join('\n');
    const shuffledNpcs = [...npcsToComment].sort(() => 0.5 - Math.random());
    const selectedNpcs = shuffledNpcs.slice(0, 5);
    const npcList = selectedNpcs.map((npc) => `- ${npc.name} (人设: ${npc.persona})`).join('\n');
    const authorName = post.authorId === 'user' ? window.state.qzoneSettings.nickname : window.state.chats[post.authorId]?.name || '未知作者';

    let ownerContext = '';
    if (ownerChar) {
        ownerContext = `
			# NPC归属与关系 (重要背景)
			- 你将要扮演的这些NPC都是角色“${ownerChar.name}”的朋友或关联人物。
			- “${ownerChar.name}”的人设是: ${ownerChar.settings.aiPersona}
			- 你在发表评论时，需要体现出你(作为NPC)与“${ownerChar.name}”的关系，并以此视角来看待动态作者“${authorName}”。
			`;
    }

    const systemPrompt = `
			# 任务
			你是一个多角色扮演AI。现在有一条动态需要你扮演指定的NPC角色进行评论或回复。

			${ownerContext}

			# 动态信息
			- 作者: ${authorName}
			- 内容摘要: ${postContent}...
			- 最近的评论 (你可以回复他们):
			${existingComments || '(暂无评论)'}

			# 你需要扮演的NPC列表 (及他们的人设)
			${npcList}

			# 核心规则
			1.  你【必须】从上面的NPC列表中，选择1到3个最合适的角色进行评论或回复。
			2.  评论/回复内容【必须】严格符合该NPC的人设和口吻，并与动态内容或已有评论相关。
			3.  你的回复【必须且只能】是一个严格的JSON数组，每个对象代表一条评论或回复。
			4.  格式: \`[{"commenterName": "NPC名字", "commentText": "评论内容", "replyTo": "(可选)被回复者名字"}]\`

			现在，请开始生成评论或回复。
			`;

    try {
        let isGemini = proxyUrl === GEMINI_API_URL;
        let messagesForApi;
        if (isGemini) {
            messagesForApi = [{ role: 'user', content: systemPrompt }];
        } else {
            messagesForApi = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '请根据你在system prompt中读到的信息生成评论。' },
            ];
        }
        let geminiConfig = window.toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini, window.state.apiConfig.temperature);

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
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const aiResponseContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(/^```json\s*|```$/g, '').trim();

        let newComments;
        if (aiResponseContent.includes('"chatResponse"')) {
            newComments = JSON.parse(aiResponseContent).chatResponse;
        } else {
            newComments = JSON.parse(aiResponseContent);
        }

        if (Array.isArray(newComments) && newComments.length > 0) {
            const postToUpdate = await window.db.qzonePosts.get(post.id);
            if (!postToUpdate) throw new Error('在数据库中找不到要更新的帖子！');
            if (!postToUpdate.comments) postToUpdate.comments = [];

            newComments.forEach((comment) => {
                if (comment.commenterName && comment.commentText) {
                    postToUpdate.comments.push({
                        commenterName: comment.commenterName,
                        text: comment.commentText,
                        timestamp: Date.now(),
                        replyTo: comment.replyTo || null,
                    });
                }
            });
            await window.db.qzonePosts.put(postToUpdate);
            await renderQzonePosts();
            alert(`成功召唤了 ${newComments.length} 位NPC进行了评论！`);
        } else {
            alert('AI似乎没有生成任何评论，请重试。');
        }
    } catch (error) {
        console.error('NPC评论生成出错:', error);
        alert('生成评论时出错: ' + error.message);
    }
}
window.generateNpcCommentsForPost = generateNpcCommentsForPost;

// ===================================================================
// 相册功能函数
// ===================================================================

async function renderAlbumList() {
    const albumGrid = document.getElementById('album-grid-page');
    // 注意：原代码中有个 ID 叫 album-list, 但在 renderAlbumList 中使用了 album-grid-page，
    // 我们需要确保 HTML 中存在这个元素。如果是新版布局，需要 main-app 配合。
    if (!albumGrid) {
        console.warn('Empty album grid element, trying fallback');
        const fallback = document.getElementById('album-list');
        if (fallback) {
            // 临时处理，如果 DOM ID 没改过来
            fallback.innerHTML = '';
        }
        return;
    }

    const albums = await window.db.qzoneAlbums.orderBy('createdAt').reverse().toArray();
    albumGrid.innerHTML = '';

    if (albums.length === 0) {
        albumGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); margin-top: 50px;">你还没有创建任何相册哦~</p>';
        return;
    }

    albums.forEach((album) => {
        const albumItem = document.createElement('div');
        albumItem.className = 'album-item';
        const coverUrl = album.coverUrl || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
        albumItem.innerHTML = `
            <div class="album-cover" style="background-image: url(${coverUrl});"></div>
            <div class="album-info">
                <p class="album-name">${album.name}</p>
                <p class="album-count">${album.photoCount || 0} 张</p>
            </div>
        `;

        albumItem.addEventListener('click', () => {
            openAlbum(album.id);
        });

        // 绑定长按删除
        addLongPressListener(albumItem, async () => {
            const confirmed = await window.showCustomConfirm('删除相册', `确定要删除相册《${album.name}》吗？此操作将同时删除相册内的所有照片，且无法恢复。`, { confirmButtonClass: 'btn-danger' });
            if (confirmed) {
                await window.db.qzonePhotos.where('albumId').equals(album.id).delete();
                await window.db.qzoneAlbums.delete(album.id);
                await renderAlbumList();
                alert('相册已成功删除。');
            }
        });
        albumGrid.appendChild(albumItem);
    });
}
window.renderAlbumList = renderAlbumList;

async function openAlbum(albumId) {
    window.state.activeAlbumId = albumId;
    await renderAlbumPhotosScreen();
    window.showScreen('album-photos-screen');
}
window.openAlbum = openAlbum;

async function renderAlbumPhotosScreen() {
    if (!window.state.activeAlbumId) return;
    const photosGrid = document.getElementById('photos-grid-page');
    const headerTitle = document.getElementById('album-photos-title');
    const album = await window.db.qzoneAlbums.get(window.state.activeAlbumId);
    if (!album) {
        window.showScreen('album-screen');
        return;
    }
    headerTitle.textContent = album.name;
    const photos = await window.db.qzonePhotos.where('albumId').equals(window.state.activeAlbumId).toArray();
    photosGrid.innerHTML = '';

    // 更新全局状态，供图片查看器使用
    photoViewerState.photos = photos.map((p) => p.url);

    if (photos.length === 0) {
        photosGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); margin-top: 50px;">这个相册还是空的，快上传第一张照片吧！</p>';
        return;
    }

    photos.forEach((photo) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.url}" class="photo-thumb" alt="相册照片">
            <button class="photo-delete-btn" data-photo-id="${photo.id}">×</button>
        `;
        photosGrid.appendChild(photoItem);
    });
}
window.renderAlbumPhotosScreen = renderAlbumPhotosScreen;

// ===================================================================
// 图片查看器
// ===================================================================

async function openPhotoViewer(clickedPhotoUrl) {
    if (!window.state.activeAlbumId) return;

    const photosInAlbum = await window.db.qzonePhotos.where('albumId').equals(window.state.activeAlbumId).toArray();
    photoViewerState.photos = photosInAlbum.map((p) => p.url);

    photoViewerState.currentIndex = photoViewerState.photos.findIndex((url) => url === clickedPhotoUrl);
    if (photoViewerState.currentIndex === -1) return;

    document.getElementById('photo-viewer-modal').classList.add('visible');
    renderPhotoViewer();
    photoViewerState.isOpen = true;
}
window.openPhotoViewer = openPhotoViewer;

function renderPhotoViewer() {
    if (photoViewerState.currentIndex === -1) return;
    const imageEl = document.getElementById('photo-viewer-image');
    const prevBtn = document.getElementById('photo-viewer-prev-btn');
    const nextBtn = document.getElementById('photo-viewer-next-btn');
    imageEl.style.opacity = 0;
    setTimeout(() => {
        imageEl.src = photoViewerState.photos[photoViewerState.currentIndex];
        imageEl.style.opacity = 1;
    }, 100);
    prevBtn.disabled = photoViewerState.currentIndex === 0;
    nextBtn.disabled = photoViewerState.currentIndex === photoViewerState.photos.length - 1;
}

function closePhotoViewer() {
    document.getElementById('photo-viewer-modal').classList.remove('visible');
    photoViewerState.isOpen = false;
    photoViewerState.currentIndex = -1;
    document.getElementById('photo-viewer-image').src = '';
}
window.closePhotoViewer = closePhotoViewer;

function showNextPhoto() {
    if (photoViewerState.currentIndex < photoViewerState.photos.length - 1) {
        photoViewerState.currentIndex++;
        renderPhotoViewer();
    }
}
window.showNextPhoto = showNextPhoto;

function showPrevPhoto() {
    if (photoViewerState.currentIndex > 0) {
        photoViewerState.currentIndex--;
        renderPhotoViewer();
    }
}
window.showPrevPhoto = showPrevPhoto;

// ===================================================================
// 事件绑定 (滑动删除等)
// ===================================================================

function resetAllSwipes(exceptThisOne = null) {
    document.querySelectorAll('.qzone-post-container').forEach((container) => {
        if (container !== exceptThisOne) {
            container.querySelector('.qzone-post-item').classList.remove('swiped');
        }
    });
}

function handleSwipeStart(e) {
    const targetContainer = e.target.closest('.qzone-post-container');
    if (!targetContainer) return;

    // 如果点击的是图片、输入框等，不应该触发滑动
    if (e.target.tagName === 'IMG' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
        return;
    }

    resetAllSwipes(targetContainer);
    swipeState.activeContainer = targetContainer;
    swipeState.isDragging = true;
    swipeState.isClick = true;
    swipeState.swipeDirection = null;
    swipeState.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    swipeState.startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
    swipeState.activeContainer.querySelector('.qzone-post-item').style.transition = 'none';
}

function handleSwipeMove(e) {
    if (!swipeState.isDragging || !swipeState.activeContainer) return;
    const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const currentY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
    const diffX = currentX - swipeState.startX;
    const diffY = currentY - swipeState.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    const clickThreshold = 5;

    if (absDiffX > clickThreshold || absDiffY > clickThreshold) {
        swipeState.isClick = false;
    }

    if (swipeState.swipeDirection === null) {
        if (absDiffX > clickThreshold || absDiffY > clickThreshold) {
            if (absDiffX > absDiffY) {
                swipeState.swipeDirection = 'horizontal';
            } else {
                swipeState.swipeDirection = 'vertical';
            }
        }
    }
    if (swipeState.swipeDirection === 'vertical') {
        handleSwipeEnd(e);
        return;
    }
    if (swipeState.swipeDirection === 'horizontal') {
        e.preventDefault();
        swipeState.currentX = currentX;
        let translation = diffX;
        if (translation > 0) translation = 0;
        if (translation < -90) translation = -90;
        swipeState.activeContainer.querySelector('.qzone-post-item').style.transform = `translateX(${translation}px)`;
    }
}

function handleSwipeEnd(e) {
    if (swipeState.isClick) {
        swipeState.isDragging = false;
        swipeState.activeContainer = null;
        return;
    }
    if (!swipeState.isDragging || !swipeState.activeContainer) return;

    const postItem = swipeState.activeContainer.querySelector('.qzone-post-item');
    postItem.style.transition = 'transform 0.3s ease';

    const finalX = e.type.includes('touchend') ? e.changedTouches[0].pageX : e.pageX;
    const diffX = finalX - swipeState.startX;
    const swipeThreshold = -40;

    if (swipeState.swipeDirection === 'horizontal' && diffX < swipeThreshold) {
        postItem.classList.add('swiped');
        postItem.style.transform = '';
    } else {
        postItem.classList.remove('swiped');
        postItem.style.transform = '';
    }

    swipeState.isDragging = false;
    swipeState.startX = 0;
    swipeState.startY = 0;
    swipeState.currentX = 0;
    swipeState.activeContainer = null;
    swipeState.swipeDirection = null;
    swipeState.isClick = true;
}

function initQzoneEventListeners() {
    const postsList = document.getElementById('qzone-posts-list');

    // 绑定滑动事件
    if (postsList) {
        postsList.addEventListener('mousedown', handleSwipeStart);
        document.addEventListener('mousemove', handleSwipeMove);
        document.addEventListener('mouseup', handleSwipeEnd);
        postsList.addEventListener('touchstart', handleSwipeStart, { passive: false });
        postsList.addEventListener('touchmove', handleSwipeMove, { passive: false });
        postsList.addEventListener('touchend', handleSwipeEnd);

        // 绑定列表点击事件 (委托)
        postsList.addEventListener('click', async (e) => {
            // 注意：这里不要阻断冒泡，否则可能影响 swipeState 的逻辑判断，
            // 但如果处理了具体动作，则应该stopPropagation。
            // e.stopPropagation(); // 暂时去除全局阻止

            const target = e.target;

            // 1. 召唤NPC
            const summonBtn = target.closest('.action-icon.summon-npc');
            if (summonBtn) {
                e.stopPropagation();
                const postId = parseInt(summonBtn.dataset.postId);
                const authorId = summonBtn.dataset.authorId;
                if (!isNaN(postId) && authorId) {
                    handleNpcSummonClick(postId, authorId);
                }
                return;
            }

            // 2. 评论回复
            const commentItem = target.closest('.comment-item');
            if (commentItem && !target.classList.contains('comment-delete-btn') && !target.classList.contains('commenter-name') && !target.classList.contains('reply-target-name')) {
                e.stopPropagation();
                const postContainer = commentItem.closest('.qzone-post-container');
                if (postContainer) {
                    const commenterName = commentItem.dataset.commenterName;
                    const myNickname = window.state.qzoneSettings.nickname;

                    if (commenterName !== myNickname) {
                        const commentInput = postContainer.querySelector('.comment-input');
                        commentInput.placeholder = `回复 ${commenterName}:`;
                        commentInput.dataset.replyTo = commenterName;
                        commentInput.focus();
                    }
                }
                return;
            }

            // 3. 删除评论
            if (target.classList.contains('comment-delete-btn')) {
                e.stopPropagation();
                const postContainer = target.closest('.qzone-post-container');
                if (!postContainer) return;
                const postId = parseInt(postContainer.dataset.postId);
                const commentIndex = parseInt(target.dataset.commentIndex);
                if (isNaN(postId) || isNaN(commentIndex)) return;
                const post = await window.db.qzonePosts.get(postId);
                if (!post || !post.comments || !post.comments[commentIndex]) return;
                const commentText = post.comments[commentIndex].text;
                const confirmed = await window.showCustomConfirm('删除评论', `确定要删除这条评论吗？\n\n“${commentText.substring(0, 50)}...”`, { confirmButtonClass: 'btn-danger' });
                if (confirmed) {
                    post.comments.splice(commentIndex, 1);
                    await window.db.qzonePosts.update(postId, { comments: post.comments });
                    await renderQzonePosts();
                    alert('评论已删除。');
                }
                return;
            }

            // 4. 更多操作(...)
            if (target.classList.contains('post-actions-btn')) {
                e.stopPropagation();
                const container = target.closest('.qzone-post-container');
                if (container && container.dataset.postId) showPostActions(parseInt(container.dataset.postId));
                return;
            }

            // 5. 左滑删除动态按钮
            if (target.closest('.qzone-post-delete-action')) {
                e.stopPropagation();
                const container = target.closest('.qzone-post-delete-action').parentElement; // should be qzone-post-container
                if (!container) return;
                const postIdToDelete = parseInt(container.dataset.postId);
                if (isNaN(postIdToDelete)) return;
                const confirmed = await window.showCustomConfirm('删除动态', '确定要永久删除这条动态吗？', {
                    confirmButtonClass: 'btn-danger',
                });
                if (confirmed) {
                    container.style.transition = 'all 0.3s ease';
                    container.style.transform = 'scale(0.8)';
                    container.style.opacity = '0';
                    setTimeout(async () => {
                        await window.db.qzonePosts.delete(postIdToDelete);
                        // 清理相关通知消息
                        const notificationIdentifier = `(ID: ${postIdToDelete})`;
                        for (const chatId in window.state.chats) {
                            const chat = window.state.chats[chatId];
                            const originalHistoryLength = chat.history.length;
                            chat.history = chat.history.filter((msg) => !(msg.role === 'system' && msg.content.includes(notificationIdentifier)));
                            if (chat.history.length < originalHistoryLength) await window.db.chats.put(chat);
                        }
                        await renderQzonePosts();
                        alert('动态已删除。');
                    }, 300);
                }
                return;
            }

            // 6. 隐形图
            if (target.tagName === 'IMG' && target.dataset.hiddenText) {
                e.stopPropagation();
                window.showCustomAlert('图片内容', target.dataset.hiddenText.replace(/<br>/g, '\n'));
                return;
            }

            // 7. 点赞和收藏图标
            const icon = target.closest('.action-icon');
            if (icon) {
                e.stopPropagation();
                const postContainer = icon.closest('.qzone-post-container');
                if (!postContainer) return;
                const postId = parseInt(postContainer.dataset.postId);
                if (isNaN(postId)) return;
                if (icon.classList.contains('like')) {
                    const post = await window.db.qzonePosts.get(postId);
                    if (!post) return;
                    if (!post.likes) post.likes = [];
                    const userNickname = window.state.qzoneSettings.nickname;
                    const userLikeIndex = post.likes.indexOf(userNickname);
                    if (userLikeIndex > -1) {
                        post.likes.splice(userLikeIndex, 1);
                    } else {
                        post.likes.push(userNickname);
                        icon.classList.add('animate-like');
                        icon.addEventListener('animationend', () => icon.classList.remove('animate-like'), { once: true });
                    }
                    await window.db.qzonePosts.update(postId, { likes: post.likes });
                }
                if (icon.classList.contains('favorite')) {
                    const existingFavorite = await window.db.favorites.where({ type: 'qzone_post', 'content.id': postId }).first();
                    if (existingFavorite) {
                        await window.db.favorites.delete(existingFavorite.id);
                        await window.showCustomAlert('提示', '已取消收藏');
                    } else {
                        const postToSave = await window.db.qzonePosts.get(postId);
                        if (postToSave) {
                            await window.db.favorites.add({ type: 'qzone_post', content: postToSave, timestamp: Date.now() });
                            await window.showCustomAlert('提示', '收藏成功！');
                        }
                    }
                }
                await renderQzonePosts();
                return;
            }

            // 8. 发送评论
            const sendBtn = target.closest('.comment-send-btn');
            if (sendBtn) {
                e.stopPropagation();
                const postContainer = sendBtn.closest('.qzone-post-container');
                if (!postContainer) return;
                const postId = parseInt(postContainer.dataset.postId);
                const commentInput = postContainer.querySelector('.comment-input');
                const commentText = commentInput.value.trim();
                if (!commentText) return alert('评论内容不能为空哦！');
                const post = await window.db.qzonePosts.get(postId);
                if (!post) return;
                if (!post.comments) post.comments = [];

                const newComment = {
                    commenterName: window.state.qzoneSettings.nickname,
                    text: commentText,
                    timestamp: Date.now(),
                };

                if (commentInput.dataset.replyTo) {
                    newComment.replyTo = commentInput.dataset.replyTo;
                }

                post.comments.push(newComment);
                await window.db.qzonePosts.update(postId, { comments: post.comments });
                for (const chatId in window.state.chats) {
                    const chat = window.state.chats[chatId];
                    if (!chat.isGroup) {
                        let aiNotification = `[系统提示：'${window.state.qzoneSettings.nickname}' 在ID为${postId}的动态下发表了评论：“${commentText}”`;
                        if (newComment.replyTo) {
                            aiNotification += ` (这是对'${newComment.replyTo}'的回复)`;
                        }
                        aiNotification += `]`;
                        chat.history.push({ role: 'system', content: aiNotification, timestamp: Date.now(), isHidden: true });
                        await window.db.chats.put(chat);
                    }
                }

                commentInput.value = '';
                commentInput.placeholder = '友善的评论是交流的起点';
                delete commentInput.dataset.replyTo;

                await renderQzonePosts();
                return;
            }
        });
    }

    document.getElementById('qzone-back-btn').addEventListener('click', () => window.switchToChatListView('messages-view'));

    document.getElementById('qzone-nickname').addEventListener('click', async () => {
        const newNickname = await window.showCustomPrompt('修改昵称', '请输入新的昵称', window.state.qzoneSettings.nickname);
        if (newNickname && newNickname.trim()) {
            window.state.qzoneSettings.nickname = newNickname.trim();
            await saveQzoneSettings();
            renderQzoneScreen();
        }
    });

    document.getElementById('qzone-avatar-container').addEventListener('click', () => document.getElementById('qzone-avatar-input').click());
    document.getElementById('qzone-banner-container').addEventListener('click', () => document.getElementById('qzone-banner-input').click());

    document.getElementById('qzone-avatar-input').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const dataUrl = await new Promise((res) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result);
                reader.readAsDataURL(file);
            });
            window.state.qzoneSettings.avatar = dataUrl;
            await saveQzoneSettings();
            renderQzoneScreen();
        }
        event.target.value = null;
    });

    document.getElementById('qzone-banner-input').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const dataUrl = await new Promise((res) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result);
                reader.readAsDataURL(file);
            });
            window.state.qzoneSettings.banner = dataUrl;
            await saveQzoneSettings();
            renderQzoneScreen();
        }
        event.target.value = null;
    });

    document.getElementById('create-shuoshuo-btn').addEventListener('click', () => openQZonePublisher('shuoshuo'));
    document.getElementById('create-post-btn').addEventListener('click', () => openQZonePublisher('complex'));

    // 相册
    document.getElementById('open-album-btn').addEventListener('click', async () => {
        await renderAlbumList();
        window.showScreen('album-screen');
    });

    document.getElementById('album-back-btn').addEventListener('click', () => {
        window.showScreen('chat-list-screen');
        window.switchToChatListView('qzone-screen');
    });

    document.getElementById('album-photos-back-btn').addEventListener('click', () => {
        window.state.activeAlbumId = null;
        window.showScreen('album-screen');
    });

    document.getElementById('album-upload-photo-btn').addEventListener('click', () => document.getElementById('album-photo-input').click());

    document.getElementById('album-photo-input').addEventListener('change', async (event) => {
        if (!window.state.activeAlbumId) return;
        const files = event.target.files;
        if (!files.length) return;

        const album = await window.db.qzoneAlbums.get(window.state.activeAlbumId);

        for (const file of files) {
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            await window.db.qzonePhotos.add({ albumId: window.state.activeAlbumId, url: dataUrl, createdAt: Date.now() });
        }

        const photoCount = await window.db.qzonePhotos.where('albumId').equals(window.state.activeAlbumId).count();
        const updateData = { photoCount };

        if (!album.photoCount || album.coverUrl.includes('placeholder')) {
            const firstPhoto = await window.db.qzonePhotos.where('albumId').equals(window.state.activeAlbumId).first();
            if (firstPhoto) updateData.coverUrl = firstPhoto.url;
        }

        await window.db.qzoneAlbums.update(window.state.activeAlbumId, updateData);
        await renderAlbumPhotosScreen();
        await renderAlbumList();

        event.target.value = null;
        alert('照片上传成功！');
    });

    document.getElementById('photos-grid-page').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.photo-delete-btn');
        const photoThumb = e.target.closest('.photo-thumb');
        if (deleteBtn) {
            e.stopPropagation();
            const photoId = parseInt(deleteBtn.dataset.photoId);
            const confirmed = await window.showCustomConfirm('删除照片', '确定要删除这张照片吗？此操作不可恢复。', {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                await window.db.qzonePhotos.delete(photoId);
                const album = await window.db.qzoneAlbums.get(window.state.activeAlbumId);
                const photoCount = (album.photoCount || 1) - 1;
                const updateData = { photoCount };
                await window.db.qzoneAlbums.update(window.state.activeAlbumId, updateData);
                await renderAlbumPhotosScreen();
                await renderAlbumList();
                alert('照片已删除。');
            }
        } else if (photoThumb) {
            openPhotoViewer(photoThumb.src);
        }
    });

    document.getElementById('photo-viewer-close-btn').addEventListener('click', closePhotoViewer);
    document.getElementById('photo-viewer-next-btn').addEventListener('click', showNextPhoto);
    document.getElementById('photo-viewer-prev-btn').addEventListener('click', showPrevPhoto);

    document.addEventListener('keydown', (e) => {
        if (!photoViewerState.isOpen) return;
        if (e.key === 'ArrowRight') showNextPhoto();
        else if (e.key === 'ArrowLeft') showPrevPhoto();
        else if (e.key === 'Escape') closePhotoViewer();
    });

    document.getElementById('create-album-btn-page').addEventListener('click', async () => {
        const albumName = await window.showCustomPrompt('创建新相册', '请输入相册名称');
        if (albumName && albumName.trim()) {
            await window.db.qzoneAlbums.add({
                name: albumName.trim(),
                coverUrl: 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png',
                photoCount: 0,
                createdAt: Date.now(),
            });
            await renderAlbumList();
            alert(`相册 "${albumName}" 创建成功！`);
        }
    });

    document.getElementById('cancel-create-post-btn').addEventListener('click', () => document.getElementById('create-post-modal').classList.remove('visible'));
    document.getElementById('post-upload-local-btn').addEventListener('click', () => document.getElementById('post-local-image-input').click());
    document.getElementById('post-local-image-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('post-image-preview').src = e.target.result;
                document.getElementById('post-image-preview-container').classList.add('visible');
                document.getElementById('post-image-desc-group').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('post-use-url-btn').addEventListener('click', async () => {
        const url = await window.showCustomPrompt('输入图片URL', '请输入网络图片的链接', '', 'url');
        if (url) {
            document.getElementById('post-image-preview').src = url;
            document.getElementById('post-image-preview-container').classList.add('visible');
            document.getElementById('post-image-desc-group').style.display = 'block';
        }
    });

    document.getElementById('post-remove-image-btn').addEventListener('click', () => resetCreatePostModal());

    const imageModeBtn = document.getElementById('switch-to-image-mode');
    const textImageModeBtn = document.getElementById('switch-to-text-image-mode');
    const imageModeContent = document.getElementById('image-mode-content');
    const textImageModeContent = document.getElementById('text-image-mode-content');
    imageModeBtn.addEventListener('click', () => {
        imageModeBtn.classList.add('active');
        textImageModeBtn.classList.remove('active');
        imageModeContent.classList.add('active');
        textImageModeContent.classList.remove('active');
    });
    textImageModeBtn.addEventListener('click', () => {
        textImageModeBtn.classList.add('active');
        imageModeBtn.classList.remove('active');
        textImageModeContent.classList.add('active');
        imageModeContent.classList.remove('active');
    });

    document.getElementById('confirm-create-post-btn').addEventListener('click', async () => {
        const modal = document.getElementById('create-post-modal');
        const mode = modal.dataset.mode;

        if (mode === 'forum' && window.handleCreateForumPost) {
            await window.handleCreateForumPost();
            return;
        }
        if (mode === 'weibo' && window.handlePublishWeibo) {
            await window.handlePublishWeibo();
            return;
        }

        const editingId = parseInt(modal.dataset.editingPostId);
        const areCommentsVisible = document.getElementById('post-comments-toggle').checked;
        const visibility = document.querySelector('input[name="visibility"]:checked').value;
        let visibleGroupIds = null;
        if (visibility === 'groups') {
            visibleGroupIds = Array.from(document.querySelectorAll('#post-visibility-groups input:checked')).map((cb) => parseInt(cb.value));
            if (visibleGroupIds.length === 0) {
                alert('请至少选择一个可见的分组！');
                return;
            }
        }

        let postData = {};

        if (mode === 'edit') {
            const existingPost = await window.db.qzonePosts.get(editingId);
            if (!existingPost) {
                alert('错误：找不到要编辑的动态！');
                return;
            }
            postData = {
                ...existingPost,
                areCommentsVisible: areCommentsVisible,
                visibleGroupIds: visibleGroupIds,
            };

            if (postData.type === 'shuoshuo') {
                postData.content = document.getElementById('post-public-text').value.trim();
            } else {
                postData.publicText = document.getElementById('post-public-text').value.trim();
                if (postData.type === 'image_post') {
                    postData.imageUrl = document.getElementById('post-image-preview').src;
                    postData.imageDescription = document.getElementById('post-image-description').value.trim();
                } else if (postData.type === 'text_image') {
                    postData.hiddenContent = document.getElementById('post-hidden-text').value.trim();
                }
            }
            await window.db.qzonePosts.put(postData);
        } else {
            const basePostData = {
                timestamp: Date.now(),
                authorId: 'user',
                areCommentsVisible: areCommentsVisible,
                visibleGroupIds: visibleGroupIds,
            };

            if (mode === 'shuoshuo') {
                const content = document.getElementById('post-public-text').value.trim();
                if (!content) return alert('说说内容不能为空哦！');
                postData = { ...basePostData, type: 'shuoshuo', content: content };
            } else {
                const publicText = document.getElementById('post-public-text').value.trim();
                const isImageModeActive = document.getElementById('image-mode-content').classList.contains('active');
                if (isImageModeActive) {
                    const imageUrl = document.getElementById('post-image-preview').src;
                    const imageDescription = document.getElementById('post-image-description').value.trim();
                    if (!imageUrl || !(imageUrl.startsWith('http') || imageUrl.startsWith('data:'))) return alert('请先添加一张图片再发布动态哦！');
                    if (!imageDescription) return alert('请为你的图片添加一个简单的描述（必填，给AI看的）！');
                    postData = { ...basePostData, type: 'image_post', publicText, imageUrl, imageDescription };
                } else {
                    const hiddenText = document.getElementById('post-hidden-text').value.trim();
                    if (!hiddenText) return alert('请输入文字图描述！');
                    postData = { ...basePostData, type: 'text_image', publicText, hiddenContent: hiddenText };
                }
            }
            const newPostId = await window.db.qzonePosts.add(postData);
            postData.id = newPostId;
        }

        let postSummary = postData.content || postData.publicText || postData.imageDescription || postData.hiddenContent || '（无文字内容）';
        postSummary = postSummary.substring(0, 50) + (postSummary.length > 50 ? '...' : '');
        for (const chatId in window.state.chats) {
            const chat = window.state.chats[chatId];
            if (chat.isGroup) continue;
            const historyMessage = {
                role: 'system',
                content: `[系统提示：用户${editingId ? '编辑了' : '发布了'}一条动态(ID: ${editingId || postData.id})，内容摘要是：“${postSummary}”。]`,
                timestamp: Date.now(),
                isHidden: true,
            };
            chat.history.push(historyMessage);
            await window.db.chats.put(chat);
        }

        await renderQzonePosts();
        modal.classList.remove('visible');
        delete modal.dataset.editingPostId;
        delete modal.dataset.mode;
        alert(`动态${editingId ? '编辑' : '发布'}成功！`);
    });

    // 动态操作菜单的按钮事件
    const editPostBtn = document.getElementById('edit-post-btn');
    if (editPostBtn) editPostBtn.addEventListener('click', window.openPostEditor);

    const copyPostBtn = document.getElementById('copy-post-btn');
    if (copyPostBtn) copyPostBtn.addEventListener('click', window.copyPostContent);

    const cancelPostActionBtn = document.getElementById('cancel-post-action-btn');
    if (cancelPostActionBtn) cancelPostActionBtn.addEventListener('click', window.hidePostActions);
}
window.initQzoneEventListeners = initQzoneEventListeners;
