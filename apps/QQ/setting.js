
window.initQQSettings = function (dependencies) {
    const {
        state,
        db,
        renderChatInterface,
        renderChatList,
        getTokenDetailedBreakdown,
        showCustomAlert,
        showCustomConfirm,
        applyScopedCss,
        exportChatHistory,
        importChatHistory,
        handleImageUploadAndCompress,
        applyCustomFont,
        // updateSettingsPreview, // Moved internally
        // renderBubblePresetSelector, // Moved internally
        // handlePresetSelectChange, // Moved internally
        // openBubblePresetManager, // Moved internally
        // exportSelectedBubblePreset, // Moved internally
        // importBubblePreset, // Moved internally
        // renderOfflinePresetsSelector, // Moved internally
        // openFrameSelectorModal, // Moved internally
        defaultAvatar,
        defaultGroupAvatar,
        defaultMyGroupAvatar,
        appendMessage,
        openCharStickerManager,
        // openNpcManager, // Moved internally
        // openManualSummaryOptions, // Moved internally
        // openMemberManagementScreen, // Moved internally
        // getEditingMemberId, // Moved internally
        showChoiceModal,
        showCustomPrompt,
        logSystemMessage,
        toGeminiRequestData,
        GEMINI_API_URL,
        addLongPressListener,
        closePersonaEditor,
        toggleInnerVoiceHistory,
        // renderMemberManagementList // Moved internally
    } = dependencies;

    let editingMemberId = null;
    let editingNpcId = null;
    let selectedContacts = new Set();


    // --- Member Management Functions Moved from main-app.js ---

    function openMemberManagementScreen() {
        if (!state.activeChatId || !state.chats[state.activeChatId].isGroup) return;
        renderMemberManagementList();
        window.showScreen('member-management-screen');
    }

    /**
     * 渲染群成员管理列表
     */
    function renderMemberManagementList() {
        const listEl = document.getElementById('member-management-list');
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) {
            listEl.innerHTML = '<p>错误：非群聊无法管理成员。</p>';
            return;
        }
        listEl.innerHTML = ''; // 清空

        // 1. 创建一个包含所有人的完整列表
        const allParticipants = [
            // 把你自己(user)作为一个普通参与者对象放进去
            {
                id: 'user',
                avatar: chat.settings.myAvatar || defaultMyGroupAvatar,
                groupNickname: chat.settings.myNickname || '我',
                // 修复Bug 1：在这里正确地读取你自己的群头衔
                groupTitle: chat.settings.myGroupTitle || '',
            },
            // 使用展开运算符(...)，把其他所有成员也加到这个列表里
            ...(chat.members || []),
        ];

        // 2. (可选但推荐) 对列表进行排序，确保群主永远在最上面，其次是管理员
        allParticipants.sort((a, b) => {
            const isAOwner = a.id === chat.ownerId;
            const isBOwner = b.id === chat.ownerId;
            // 修复Bug 2：在这里正确地判断自己是不是管理员
            const isAAdmin = a.id === 'user' ? chat.settings.isUserAdmin : a.isAdmin;
            const isBAdmin = b.id === 'user' ? chat.settings.isUserAdmin : b.isAdmin;

            if (isAOwner) return -1; // a是群主，排最前
            if (isBOwner) return 1; // b是群主，排最前
            if (isAAdmin && !isBAdmin) return -1; // a是管理员但b不是，a排前
            if (!isAAdmin && isBAdmin) return 1; // b是管理员但a不是，b排前
            return 0; // 其他情况保持原顺序
        });

        // 3. 遍历这个统一的列表，并渲染每一项
        const isCurrentUserOwner = chat.ownerId === 'user';
        allParticipants.forEach((participant) => {
            const participantItem = createMemberManagementItem(participant, chat, isCurrentUserOwner);
            listEl.appendChild(participantItem);
        });
    }

    /**
     * 创建一个成员管理列表项
     */
    function createMemberManagementItem(member, chat) {
        const item = document.createElement('div');
        item.className = 'member-management-item';

        // --- 权限判断 ---
        const isCurrentUserOwner = chat.ownerId === 'user';
        const isCurrentUserAdmin = chat.settings.isUserAdmin;
        const isThisMemberOwner = member.id === chat.ownerId;
        const isThisMemberAdmin = (member.id === 'user' && chat.settings.isUserAdmin) || member.isAdmin;

        // 权限计算：我能对TA做什么？
        const canManageAdmin = isCurrentUserOwner && !isThisMemberOwner; // 只有群主能设置/取消管理员
        const canManageTitle = isCurrentUserOwner || isCurrentUserAdmin; // 管理员和群主都能设置头衔
        const canKick = (isCurrentUserOwner && member.id !== 'user') || (isCurrentUserAdmin && !isThisMemberOwner && !isThisMemberAdmin && member.id !== 'user');
        const canMute = (isCurrentUserOwner && member.id !== 'user') || (isCurrentUserAdmin && !isThisMemberOwner && !isThisMemberAdmin && member.id !== 'user');

        // --- 标签显示 ---
        let roleTag = '';
        if (isThisMemberOwner) {
            roleTag = '<span class="role-tag owner">群主</span>';
        } else if (isThisMemberAdmin) {
            roleTag = '<span class="role-tag admin">管理员</span>';
        }
        const titleText = member.id === 'user' ? chat.settings.myGroupTitle || '' : member.groupTitle || '';
        const titleTag = titleText ? `<span class="title-tag">${titleText}</span>` : '';
        // 如果被禁言，显示一个特殊的标签
        const muteTag = member.isMuted ? '<span class="group-title-tag" style="color: #ff3b30; background-color: #ffe5e5;">🚫已禁言</span>' : '';

        // --- 动态生成按钮HTML ---
        let actionsHtml = '';

        // 用户自己的按钮
        if (member.id === 'user') {
            actionsHtml += `<button class="action-btn" data-action="set-nickname" data-member-id="user">改名</button>`;
            // 用户被禁言时，显示“解除禁言”按钮
            if (member.isMuted) {
                actionsHtml += `<button class="action-btn" data-action="unmute-self" data-member-id="user">解除禁言</button>`;
            }
        }

        // 管理员和群主的操作按钮
        if (canManageTitle) {
            actionsHtml += `<button class="action-btn" data-action="set-title" data-member-id="${member.id}">头衔</button>`;
        }
        if (canManageAdmin) {
            const adminActionText = isThisMemberAdmin ? '取消管理' : '设为管理';
            actionsHtml += `<button class="action-btn" data-action="toggle-admin" data-member-id="${member.id}">${adminActionText}</button>`;
        }
        if (isCurrentUserOwner && member.id !== 'user') {
            actionsHtml += `<button class="action-btn" data-action="transfer-owner" data-member-id="${member.id}">转让</button>`;
        }
        // 禁言/解禁按钮
        if (canMute) {
            const muteButtonText = member.isMuted ? '解禁' : '禁言';
            actionsHtml += `<button class="action-btn" data-action="mute-member" data-member-id="${member.id}">${muteButtonText}</button>`;
        }
        if (canKick) {
            actionsHtml += `<button class="action-btn danger" data-action="remove-member" data-member-id="${member.id}">踢出</button>`;
        }

        // 最终拼接
        item.innerHTML = `
			        <img src="${member.avatar}" class="avatar">
			        <div class="info">
			            <span class="name">${member.groupNickname}</span>
			            <div class="tags">
			                ${roleTag}
			                ${titleTag}
			                ${muteTag}
			            </div>
			        </div>
			        <div class="actions">${actionsHtml}</div>
			    `;
        return item;
    }

    async function handleMuteMember(memberId) {
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) return;

        const isOwner = chat.ownerId === 'user';
        const isAdmin = chat.settings.isUserAdmin;
        let targetMember, targetIsOwner, targetIsAdmin;

        if (memberId === 'user') {
            targetMember = { id: 'user', ...chat.settings };
            targetIsOwner = isOwner;
            targetIsAdmin = isAdmin;
        } else {
            targetMember = chat.members.find((m) => m.id === memberId);
            if (!targetMember) return;
            targetIsOwner = chat.ownerId === memberId;
            targetIsAdmin = targetMember.isAdmin;
        }

        const canMute = (isOwner && !targetIsOwner) || (isAdmin && !targetIsOwner && !targetIsAdmin);

        if (!canMute) {
            alert('你没有权限操作该成员！');
            return;
        }

        if (memberId === 'user') {
            if (typeof chat.settings.isUserMuted === 'undefined') chat.settings.isUserMuted = false;
            chat.settings.isUserMuted = !chat.settings.isUserMuted;
        } else {
            if (typeof targetMember.isMuted === 'undefined') targetMember.isMuted = false;
            targetMember.isMuted = !targetMember.isMuted;
        }

        await db.chats.put(chat);
        renderMemberManagementList();

        const myNickname = chat.settings.myNickname || '我';
        const targetNickname = memberId === 'user' ? chat.settings.myNickname || '我' : targetMember.groupNickname;
        const actionText = (memberId === 'user' ? chat.settings.isUserMuted : targetMember.isMuted) ? '禁言' : '解除禁言';
        await logSystemMessage(chat.id, `“${myNickname}”将“${targetNickname}”${actionText}。`);
    }

    async function handleUserUnmute() {
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.settings.isUserMuted) return;

        const confirmed = await showCustomConfirm('解除禁言', '确定要为自己解除禁言吗？');
        if (confirmed) {
            chat.settings.isUserMuted = false;
            await db.chats.put(chat);
            await logSystemMessage(chat.id, `“${chat.settings.myNickname || '我'}”为自己解除了禁言。`);
            renderMemberManagementList();
        }
    }

    async function handleAddMembersToGroup() {
        if (selectedContacts.size === 0) {
            alert('请至少选择一个要添加的联系人。');
            return;
        }

        const chat = state.chats[state.activeChatId];
        const addedNames = [];

        for (const contactId of selectedContacts) {
            const contactChat = state.chats[contactId];
            if (contactChat) {
                chat.members.push({
                    id: contactId,
                    originalName: contactChat.name,
                    groupNickname: contactChat.name,
                    avatar: contactChat.settings.aiAvatar || defaultAvatar,
                    persona: contactChat.settings.aiPersona,
                    avatarFrame: contactChat.settings.aiAvatarFrame || '',
                    isAdmin: false,
                    groupTitle: '',
                });
                addedNames.push(`“${contactChat.name}”`);
            } else {
                let foundNpc = null;
                for (const c of Object.values(state.chats)) {
                    if (c.npcLibrary) {
                        const npc = c.npcLibrary.find((n) => n.id === contactId);
                        if (npc) {
                            foundNpc = npc;
                            break;
                        }
                    }
                }
                if (foundNpc) {
                    chat.members.push({
                        id: foundNpc.id,
                        originalName: foundNpc.name,
                        groupNickname: foundNpc.name,
                        avatar: foundNpc.avatar || defaultGroupMemberAvatar,
                        persona: foundNpc.persona,
                        avatarFrame: '',
                        isAdmin: false,
                        groupTitle: '',
                    });
                    addedNames.push(`“${foundNpc.name}”`);
                }
            }
        }

        await db.chats.put(chat);
        const myNickname = chat.settings.myNickname || '我';
        await logSystemMessage(chat.id, `“${myNickname}”邀请 ${addedNames.join('、')} 加入了群聊。`);

        if (window.closeScreen) window.closeScreen('contact-picker-screen');
        else document.getElementById('contact-picker-screen').classList.remove('active');

        openMemberManagementScreen();
        if (window.renderGroupMemberSettings) window.renderGroupMemberSettings(chat.members);
    }

    async function handleSetUserNickname() {
        const chat = state.chats[state.activeChatId];
        const oldNickname = chat.settings.myNickname || '我';
        const newNickname = await showCustomPrompt('修改我的群昵称', '请输入新的昵称', oldNickname);
        if (newNickname !== null && newNickname.trim()) {
            chat.settings.myNickname = newNickname.trim();
            await db.chats.put(chat);
            await logSystemMessage(chat.id, `“${oldNickname}”将群昵称修改为“${newNickname.trim()}”`);
            renderMemberManagementList();
        }
    }

    async function handleSetUserTitle() {
        const chat = state.chats[state.activeChatId];
        const oldTitle = chat.settings.myGroupTitle || '';
        const newTitle = await showCustomPrompt('修改我的群头衔', '留空则为取消头衔', oldTitle);
        if (newTitle !== null) {
            chat.settings.myGroupTitle = newTitle.trim();
            await db.chats.put(chat);
            const myNickname = chat.settings.myNickname || '我';
            await logTitleChange(chat.id, myNickname, myNickname, newTitle.trim());
            renderMemberManagementList();
        }
    }

    async function removeMemberFromGroup(memberId) {
        const chat = state.chats[state.activeChatId];
        const isOwner = chat.ownerId === 'user';
        const isAdmin = chat.settings.isUserAdmin;
        const memberToRemove = chat.members.find((m) => m.id === memberId);

        if (!isOwner && !(isAdmin && !memberToRemove.isAdmin && memberToRemove.id !== chat.ownerId)) {
            alert('你没有权限移出该成员！');
            return;
        }

        const memberIndex = chat.members.findIndex((m) => m.id === memberId);
        if (memberIndex === -1) return;

        const memberName = memberToRemove.groupNickname;
        const confirmed = await showCustomConfirm('移出成员', `确定要将“${memberName}”移出群聊吗？`, {
            confirmButtonClass: 'btn-danger',
        });

        if (confirmed) {
            chat.members.splice(memberIndex, 1);
            await db.chats.put(chat);
            const myNickname = chat.settings.myNickname || '我';
            await logSystemMessage(chat.id, `“${myNickname}”将“${memberName}”移出了群聊。`);
            renderMemberManagementList();
        }
    }

    async function openContactPickerForAddMember() {
        selectedContacts.clear();

        const confirmBtn = document.getElementById('confirm-contact-picker-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', handleAddMembersToGroup);

        const listEl = document.getElementById('contact-picker-list');
        listEl.innerHTML = '';

        const chat = state.chats[state.activeChatId];
        const existingMemberIds = new Set(chat.members.map((m) => m.id));
        existingMemberIds.add('user');

        const allAvailablePeople = [];
        Object.values(state.chats)
            .filter((c) => !c.isGroup)
            .forEach((c) => {
                allAvailablePeople.push({
                    id: c.id,
                    name: c.name,
                    avatar: c.settings.aiAvatar || defaultAvatar,
                    isNpc: false,
                });
            });
        const npcMap = new Map();
        Object.values(state.chats).forEach((c) => {
            if (c.npcLibrary) {
                c.npcLibrary.forEach((npc) => {
                    if (!npcMap.has(npc.id)) {
                        npcMap.set(npc.id, {
                            id: npc.id,
                            name: npc.name,
                            avatar: npc.avatar || defaultGroupMemberAvatar,
                            isNpc: true,
                        });
                    }
                });
            }
        });
        allAvailablePeople.push(...Array.from(npcMap.values()));

        const contacts = allAvailablePeople.filter((p) => !existingMemberIds.has(p.id));

        if (contacts.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#8a8a8a; margin-top:50px;">没有更多可以邀请的联系人了。</p>';
        } else {
            contacts.forEach((contact) => {
                const item = document.createElement('div');
                item.className = 'contact-picker-item';
                item.dataset.contactId = contact.id;
                item.innerHTML = `
			                <div class="checkbox"></div>
			                <img src="${contact.avatar}" class="avatar">
			                <span class="name">${contact.name} ${contact.isNpc ? '<span style="color: #888; font-size: 12px;">(NPC)</span>' : ''}</span>
			            `;

                item.addEventListener('click', () => {
                    const checkbox = item.querySelector('.checkbox');
                    const id = item.dataset.contactId;
                    if (selectedContacts.has(id)) {
                        selectedContacts.delete(id);
                        item.classList.remove('selected');
                        checkbox.classList.remove('checked');
                    } else {
                        selectedContacts.add(id);
                        item.classList.add('selected');
                        checkbox.classList.add('checked');
                    }
                    updateContactPickerConfirmButton();
                });
                listEl.appendChild(item);
            });
        }

        updateContactPickerConfirmButton();
        if (window.showScreen) window.showScreen('contact-picker-screen');
    }

    function updateContactPickerConfirmButton() {
        const btn = document.getElementById('confirm-contact-picker-btn');
        btn.textContent = `完成(${selectedContacts.size})`;
        if (selectedContacts.size > 0) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    async function createNewMemberInGroup() {
        const name = await showCustomPrompt('创建新成员', '请输入新成员的名字 (这将是TA的“本名”，不可更改)');
        if (!name || !name.trim()) return;

        const chat = state.chats[state.activeChatId];
        if (chat.members.some((m) => m.originalName === name.trim())) {
            alert(`错误：群内已存在名为“${name.trim()}”的成员！`);
            return;
        }

        const persona = await showCustomPrompt('设置人设', `请输入“${name}”的人设`, '', 'textarea');
        if (persona === null) return;

        const newMember = {
            id: 'npc_' + Date.now(),
            originalName: name.trim(),
            groupNickname: name.trim(),
            avatar: defaultGroupMemberAvatar,
            persona: persona,
            avatarFrame: '',
        };

        chat.members.push(newMember);
        await db.chats.put(chat);

        renderMemberManagementList();
        if (window.renderGroupMemberSettings) window.renderGroupMemberSettings(chat.members);

        alert(`新成员“${name}”已成功加入群聊！`);
    }

    async function handleToggleAdmin(memberId) {
        const chat = state.chats[state.activeChatId];
        if (!chat || chat.ownerId !== 'user') {
            alert('你不是群主，没有权限执行此操作！');
            return;
        }

        let targetNickname;
        let isAdminNow;

        if (memberId === 'user') {
            chat.settings.isUserAdmin = !chat.settings.isUserAdmin;
            targetNickname = chat.settings.myNickname || '我';
            isAdminNow = chat.settings.isUserAdmin;
        } else {
            const member = chat.members.find((m) => m.id === memberId);
            if (!member) return;

            if (member.id === chat.ownerId) {
                alert('不能对群主进行此操作。');
                return;
            }

            member.isAdmin = !member.isAdmin;
            targetNickname = member.groupNickname;
            isAdminNow = member.isAdmin;
        }

        await db.chats.put(chat);
        const actionText = isAdminNow ? '设为管理员' : '取消了管理员身份';
        const myNickname = chat.settings.myNickname || '我';
        await logSystemMessage(chat.id, `“${myNickname}”将“${targetNickname}”${actionText}。`);

        renderMemberManagementList();
    }

    async function handleSetMemberTitle(memberId) {
        const chat = state.chats[state.activeChatId];
        const isOwner = chat.ownerId === 'user';
        const isAdmin = chat.settings.isUserAdmin;

        if (!chat || (!isOwner && !isAdmin)) {
            alert('你不是群主或管理员，没有权限执行此操作！');
            return;
        }

        let targetNickname;
        let oldTitle;

        if (memberId === 'user') {
            targetNickname = chat.settings.myNickname || '我';
            oldTitle = chat.settings.myGroupTitle || '';
        } else {
            const member = chat.members.find((m) => m.id === memberId);
            if (!member) return;
            targetNickname = member.groupNickname;
            oldTitle = member.groupTitle || '';
        }

        const newTitle = await showCustomPrompt(`为“${targetNickname}”设置头衔`, '留空则为取消头衔', oldTitle);

        if (newTitle !== null) {
            const trimmedTitle = newTitle.trim();

            if (memberId === 'user') {
                chat.settings.myGroupTitle = trimmedTitle;
            } else {
                const member = chat.members.find((m) => m.id === memberId);
                if (member) member.groupTitle = trimmedTitle;
            }

            await db.chats.put(chat);
            const myNickname = chat.settings.myNickname || '我';
            await logTitleChange(chat.id, myNickname, targetNickname, trimmedTitle);

            renderMemberManagementList();
        }
    }

    async function handleTransferOwnership(memberId) {
        const chat = state.chats[state.activeChatId];
        const newOwner = chat.members.find((m) => m.id === memberId);
        if (!newOwner) return;

        const oldOwnerNickname = chat.settings.myNickname || '我';
        const confirmed = await showCustomConfirm('转让群主', `你确定要将群主身份转让给“${newOwner.groupNickname}”吗？\n此操作不可撤销，你将失去群主权限。`, { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            chat.ownerId = newOwner.id;
            newOwner.isAdmin = true;
            const message = `“${oldOwnerNickname}”已将群主转让给“${newOwner.groupNickname}”`;
            await logSystemMessage(chat.id, message);
            renderMemberManagementList();
            await showCustomAlert('操作成功', `群主已成功转让给“${newOwner.groupNickname}”。`);
        }
    }

    async function logTitleChange(chatId, actorName, targetName, newTitle) {
        const messageContent = newTitle ? `${actorName} 将“${targetName}”的群头衔修改为“${newTitle}”` : `${actorName} 取消了“${targetName}”的群头衔`;
        await logSystemMessage(chatId, messageContent);
    }
    // Expose logTitleChange
    window.logTitleChange = logTitleChange;

    // --- End Moved Member Management Functions ---

    // --- Moved Functions from main-app.js ---

    /**
     * 打开NPC库管理界面
     */
    function openNpcManager() {
        if (!state.activeChatId || state.chats[state.activeChatId].isGroup) return;
        const chat = state.chats[state.activeChatId];
        document.getElementById('npc-management-title').textContent = `“${chat.name}”的NPC库`;
        renderNpcList();
        window.showScreen('npc-management-screen');
    }

    /**
     * 渲染NPC列表
     */
    function renderNpcList() {
        const listEl = document.getElementById('npc-management-list');
        const chat = state.chats[state.activeChatId];
        const npcLibrary = chat.npcLibrary || [];
        listEl.innerHTML = '';

        if (npcLibrary.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">这里空空如也，点击右上角“+”添加第一个NPC吧！</p>';
            return;
        }

        npcLibrary.forEach((npc) => {
            const item = document.createElement('div');
            item.className = 'chat-list-item';
            item.style.cursor = 'pointer';
            item.innerHTML = `
			            <img src="${npc.avatar || defaultGroupMemberAvatar}" class="avatar">
			            <div class="info">
			                <span class="name">${npc.name}</span>
			                <div class="last-msg">${npc.persona.substring(0, 30)}...</div>
			            </div>
			        `;
            item.addEventListener('click', () => openNpcEditor(npc.id));
            addLongPressListener(item, () => deleteNpc(npc.id, npc.name));
            listEl.appendChild(item);
        });
    }

    async function openNpcEditor(npcId = null) {
        editingNpcId = npcId;
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        let npc = { name: '', persona: '', avatar: defaultGroupMemberAvatar };

        if (npcId) {
            npc = (chat.npcLibrary || []).find((n) => n.id === npcId) || npc;
            document.getElementById('persona-editor-title').textContent = `编辑NPC: ${npc.name}`;
        } else {
            document.getElementById('persona-editor-title').textContent = '添加新NPC';
        }

        document.getElementById('npc-editor-name-input').value = npc.name;
        document.getElementById('preset-avatar-preview').src = npc.avatar;
        document.getElementById('preset-persona-input').value = npc.persona;

        document.getElementById('npc-editor-name-group').style.display = 'block';
        document.getElementById('persona-editor-change-frame-btn').style.display = 'none';

        const saveBtn = document.getElementById('save-persona-preset-btn');
        // Remove old listeners to avoid stacking if any (though standard onclick overwrites)
        saveBtn.onclick = saveNpc;

        document.getElementById('persona-editor-modal').classList.add('visible');
    }

    async function saveNpc() {
        const chat = state.chats[state.activeChatId];
        const name = document.getElementById('npc-editor-name-input').value.trim();
        const persona = document.getElementById('preset-persona-input').value.trim();
        const avatar = document.getElementById('preset-avatar-preview').src;

        if (!name) {
            alert('NPC名字不能为空！');
            return;
        }

        if (!chat.npcLibrary) chat.npcLibrary = [];

        if (editingNpcId) {
            const npc = chat.npcLibrary.find((n) => n.id === editingNpcId);
            if (npc) {
                npc.name = name;
                npc.persona = persona;
                npc.avatar = avatar;
            }
        } else {
            const newNpc = {
                id: 'npc_' + Date.now(),
                name: name,
                persona: persona,
                avatar: avatar,
            };
            chat.npcLibrary.push(newNpc);
        }

        await db.chats.put(chat);
        renderNpcList();
        if (closePersonaEditor) closePersonaEditor();
    }

    async function deleteNpc(npcId, npcName) {
        const confirmed = await showCustomConfirm('删除NPC', `确定要从“${state.chats[state.activeChatId].name}”的NPC库中删除 “${npcName}” 吗？`, { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            const chat = state.chats[state.activeChatId];
            chat.npcLibrary = (chat.npcLibrary || []).filter((n) => n.id !== npcId);
            await db.chats.put(chat);
            renderNpcList();
        }
    }

    function openAiGenerateMembersModal() {
        document.getElementById('ai-member-count-input').value = '3';
        document.getElementById('ai-member-prompt-input').value = '';
        document.getElementById('ai-generate-members-modal').classList.add('visible');
    }

    async function handleGenerateMembers() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) return;

        const count = parseInt(document.getElementById('ai-member-count-input').value);
        const requirements = document.getElementById('ai-member-prompt-input').value.trim();

        if (isNaN(count) || count < 1 || count > 20) {
            alert('请输入1到20之间的有效人数！');
            return;
        }

        document.getElementById('ai-generate-members-modal').classList.remove('visible');
        await showCustomAlert('请稍候...', `AI正在为“${chat.name}”创造 ${count} 位新朋友...`);

        const systemPrompt = `
			# 任务
			你是一个群聊成员生成器。请根据用户的要求，为群聊“${chat.name}”创建${count}个新成员。

			# 用户要求:
			${requirements || '无特殊要求，请自由发挥。'}

			# 核心规则
			1.  你生成的每个成员都必须有独特的名字(name)和鲜明的性格人设(persona)。
			2.  人设描述要生动、具体，能体现出角色的特点。
			3.  【格式铁律】: 你的回复【必须且只能】是一个严格的JSON数组，直接以'['开头, 以']'结尾。数组中的每个元素都是一个代表成员的JSON对象。

			# JSON输出格式示例:
			[
			  {
			    "name": "林风",
			    "persona": "一个阳光开朗的运动系少年，热爱篮球，性格直爽，是团队里的气氛担当。"
			  },
			  {
			    "name": "陈雪",
			    "persona": "文静内向的学霸少女，喜欢读书和画画，心思细腻，不善言辞但观察力敏锐。"
			  }
			]
			`;

        try {
            const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('persona_gen');
            let isGemini = proxyUrl === GEMINI_API_URL;
            let messagesForApi = [{ role: 'user', content: systemPrompt }];
            let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: model, messages: messagesForApi, ...window.buildModelParams(state.apiConfig), temperature: 1.0 }),
                });

            if (!response.ok) throw new Error(`API请求失败: ${response.status} - ${await response.text()}`);

            const data = await response.json();
            const rawContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(/^```json\s*|```$/g, '').trim();
            const robustParse = window.repairAndParseJSON || JSON.parse;
            const newMembersData = robustParse(rawContent);

            if (Array.isArray(newMembersData) && newMembersData.length > 0) {
                const addedNames = [];
                newMembersData.forEach((memberData, index) => {
                    if (memberData.name && memberData.persona) {
                        const newMember = {
                            id: 'npc_' + (Date.now() + index),
                            originalName: memberData.name.trim(),
                            groupNickname: memberData.name.trim(),
                            avatar: defaultGroupMemberAvatar,
                            persona: memberData.persona.trim(),
                            avatarFrame: '',
                            isAdmin: false,
                            groupTitle: '',
                        };
                        chat.members.push(newMember);
                        addedNames.push(`“${newMember.groupNickname}”`);
                    }
                });

                if (addedNames.length > 0) {
                    await db.chats.put(chat);
                    await logSystemMessage(chat.id, `邀请了 ${addedNames.length} 位新成员: ${addedNames.join('、')}加入了群聊。`);
                    await showCustomAlert('生成成功！', `${addedNames.length} 位新成员已加入群聊！`);
                    // Call dependencies' renderMemberManagementList if available, or rely on opening screen
                    if (renderMemberManagementList) renderMemberManagementList();
                } else {
                    throw new Error('AI返回的数据格式不正确，缺少name或persona字段。');
                }
            } else {
                throw new Error('AI返回的数据不是有效的数组。');
            }
        } catch (error) {
            console.error('AI生成群成员失败:', error);
            await showCustomAlert('生成失败', `发生了一个错误：\n${error.message}`);
        }
    }

    // --- End Moved Functions ---

    // Register Listeners for moved functions
    const newNpcBtn = document.getElementById('add-new-npc-btn');
    if (newNpcBtn) {
        // Remove old if needed or just add (if passing references from main is hard, we just add new and remove old in main)
        newNpcBtn.addEventListener('click', () => openNpcEditor(null));
    }
    const backNpcBtn = document.getElementById('back-from-npc-management');
    if (backNpcBtn) {
        backNpcBtn.addEventListener('click', () => {
            if (window.showScreen) window.showScreen('chat-interface-screen');
            document.getElementById('chat-settings-btn').click();
        });
    }

    const aiGenBtn = document.getElementById('ai-generate-members-btn');
    if (aiGenBtn) aiGenBtn.addEventListener('click', openAiGenerateMembersModal);

    const aiGenCancelBtn = document.getElementById('cancel-ai-generate-members-btn');
    if (aiGenCancelBtn) aiGenCancelBtn.addEventListener('click', () => {
        document.getElementById('ai-generate-members-modal').classList.remove('visible');
    });

    const aiGenConfirmBtn = document.getElementById('confirm-ai-generate-members-btn');
    if (aiGenConfirmBtn) aiGenConfirmBtn.addEventListener('click', handleGenerateMembers);

    const chatSettingsModal = document.getElementById('chat-settings-modal');
    const worldBookSelectBox = document.querySelector('.custom-multiselect .select-box');
    const worldBookCheckboxesContainer = document.getElementById('world-book-checkboxes-container');

    function updateWorldBookSelectionDisplay() {
        const checkedBoxes = worldBookCheckboxesContainer.querySelectorAll('input:checked');
        const displayText = document.querySelector('.selected-options-text');
        if (checkedBoxes.length === 0) {
            displayText.textContent = '-- 点击选择 --';
        } else if (checkedBoxes.length > 2) {
            displayText.textContent = `已选择 ${checkedBoxes.length} 项`;
        } else {
            displayText.textContent = Array.from(checkedBoxes)
                .map((cb) => cb.parentElement.textContent.trim())
                .join(', ');
        }
    }

    worldBookSelectBox.addEventListener('click', (e) => {
        e.stopPropagation();
        worldBookCheckboxesContainer.classList.toggle('visible');
        worldBookSelectBox.classList.toggle('expanded');
    });
    document.getElementById('world-book-checkboxes-container').addEventListener('change', updateWorldBookSelectionDisplay);
    window.addEventListener('click', (e) => {
        if (!document.querySelector('.custom-multiselect').contains(e.target)) {
            worldBookCheckboxesContainer.classList.remove('visible');
            worldBookSelectBox.classList.remove('expanded');
        }
    });

    document.getElementById('chat-settings-btn').addEventListener('click', async () => {
        if (!window.state.activeChatId) return;
        const chat = window.state.chats[window.state.activeChatId];
        const isGroup = chat.isGroup;
        document.getElementById('offline-mode-section').style.display = isGroup ? 'none' : 'block';
        document.getElementById('couple-avatar-group').style.display = isGroup ? 'none' : 'block';
        document.getElementById('streak-settings-section').style.display = isGroup ? 'none' : 'block';

        // 计算总消息条数并更新显示
        const totalMessages = chat.history.length;
        const countDisplay = document.getElementById('total-message-count-display');
        if (countDisplay) {
            countDisplay.textContent = `${totalMessages} 条`;
        }

        // --- 修改开始：使用深度分析逻辑来更新主界面的Token显示 ---
        const tokenDisplay = document.getElementById('context-token-count-display');

        const updateTokenDisplay = async () => {
            tokenDisplay.textContent = '计算中...';

            // 复用深度分析的计算逻辑
            const result = await getTokenDetailedBreakdown(state.activeChatId);

            if (result && result.items) {
                const totalCount = result.items.reduce((sum, item) => sum + item.count, 0);
                tokenDisplay.textContent = totalCount.toLocaleString();
            } else {
                tokenDisplay.textContent = '0';
            }
        };

        await updateTokenDisplay();

        // 3. 【关键】移除旧的监听器（防止重复），并添加新的点击监听器
        // 使用 cloneNode 技巧快速清除旧的 event listeners
        const newTokenDisplay = tokenDisplay.cloneNode(true);
        tokenDisplay.parentNode.replaceChild(newTokenDisplay, tokenDisplay);
        newTokenDisplay.addEventListener('click', async () => {
            // 注意：现在返回的是一个对象 { items, outliers }
            const result = await getTokenDetailedBreakdown(state.activeChatId);
            if (!result) return;

            const breakdown = result.items;
            const outliers = result.outliers;

            let total = 0;
            breakdown.forEach((item) => (total += item.count));

            let htmlContent = '<div style="text-align: left; font-size: 13px;">';

            // 1. 渲染正常的进度条 (保持不变)
            const colorMap = {
                '\u6838\u5FC3\u4EBA\u8BBE': '#FF6B6B',
                '\u4E16\u754C\u4E66': '#4ECDC4',
                '\u8868\u60C5\u5305\u5B9A\u4E49': '#FFD93D',
                '\u957F\u671F\u8BB0\u5FC6(\u603B\u7ED3)': '#45B7D1',
                '\u77ED\u671F\u8BB0\u5FC6(\u7528\u6237)': '#96CEB4',
                '\u77ED\u671F\u8BB0\u5FC6(AI)': '#A8E6CF',
                '\u56FE\u7247\u6D88\u606F(\u591A\u6A21\u6001)': '#FF9A76',
                '\u8BB0\u5FC6\u4E92\u901A': '#B39DDB',
                '\u7CFB\u7EDF\u683C\u5F0F\u6307\u4EE4': '#D4A5A5',
            };

            breakdown.forEach((item) => {
                if (item.count > 0) {
                    const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const color = colorMap[item.name] || '#ccc';

                    if (item.imageCount) {
                        htmlContent += '<div style="margin-bottom: 6px;">' +
                            '<div style="display:flex; justify-content:space-between; margin-bottom:2px;">' +
                                '<span>\uD83D\uDDBC\uFE0F ' + item.name + ' <span style="font-size:11px;color:#999;">(' + item.imageCount + '\u5F20)</span></span>' +
                                '<span style="color:#888;">' + item.count + ' (' + percent + '%)</span>' +
                            '</div>' +
                            '<div style="width:100%;background-color:#f0f0f0;height:6px;border-radius:3px;overflow:hidden;">' +
                                '<div style="width:' + percent + '%;background-color:' + color + ';height:100%;"></div>' +
                            '</div>' +
                            '<div style="font-size:11px;color:#999;margin-top:3px;padding-left:2px;">' +
                                '\u2139\uFE0F \u4F30\u7B97\u8303\u56F4: ' + item.tokenLow + ' ~ ' + item.tokenHigh + ' tokens (\u53D6\u4E2D\u503C ' + item.tokenEstimate + ')' +
                                '<br>\u6BCF\u5F20\u56FE\u7247\u7EA6 85(low) ~ 765(high) tokens\uFF0C\u5B9E\u9645\u53D6\u51B3\u4E8E\u6A21\u578B\u548C\u5206\u8FA8\u7387' +
                            '</div>' +
                        '</div>';
                    } else {
                        htmlContent += '<div style="margin-bottom: 6px;">' +
                            '<div style="display:flex; justify-content:space-between; margin-bottom:2px;">' +
                                '<span>' + item.name + '</span>' +
                                '<span style="color:#888;">' + item.count + ' (' + percent + '%)</span>' +
                            '</div>' +
                            '<div style="width:100%;background-color:#f0f0f0;height:6px;border-radius:3px;overflow:hidden;">' +
                                '<div style="width:' + percent + '%;background-color:' + color + ';height:100%;"></div>' +
                            '</div>' +
                        '</div>';
                    }
                }
            });

            // 2. 【新增】渲染异常大消息列表
            if (outliers.length > 0) {
                htmlContent += `<hr style="opacity:0.2; margin:15px 0 10px 0;">`;
                htmlContent += `<div style="color: #ff3b30; font-weight: bold; margin-bottom: 8px;">⚠️ 发现占用较大的消息 (Top ${outliers.length})</div>`;
                htmlContent += `<div style="max-height: 150px; overflow-y: auto; background: #f9f9f9; border-radius: 6px; padding: 5px;">`;

                outliers.forEach((msg) => {
                    const roleTag = msg.role === 'user' ? '<span style="color:#007bff">[我]</span>' : '<span style="color:#28a745">[AI]</span>';
                    // 添加 onclick 调用我们刚刚暴露的 window.jumpToMessage
                    htmlContent += `
                <div onclick="window.jumpToMessage(${msg.timestamp})" 
                     style="display:flex; justify-content:space-between; align-items:center; padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 12px;">
                    <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${roleTag} ${msg.preview}
                    </div>
                    <div style="color: #666; margin-left: 10px; font-family: monospace;">
                        ${msg.count} 字符 &rarr;
                    </div>
                </div>
            `;
                });
                htmlContent += `</div>`;
                htmlContent += `<p style="font-size:11px; color:#aaa; margin-top:4px;">点击即可定位并高亮该消息，您可以选择删除它。</p>`;
            }

            // 3. 底部汇总
            htmlContent += `<hr style="opacity:0.2; margin:10px 0;">
        <div style="text-align:right; font-weight:bold; font-size:15px;">总计: ${total} 字符</div>
    </div>`;

            await showCustomAlert('Token 深度分析', htmlContent);
        });

        // --- 统一显示/隐藏控件 ---

        const videoCallSettingsGroup = document.getElementById('video-call-settings-group');
        const visualCallSwitch = document.getElementById('visual-video-call-switch');
        const imageUploadsDiv = document.getElementById('video-call-image-uploads');
        // --- 加载聊天总结设置 ---
        const summarySettings = chat.settings.summary || {};
        const summaryToggle = document.getElementById('summary-toggle');
        const summaryDetails = document.getElementById('summary-details-container');

        summaryToggle.checked = summarySettings.enabled || false;
        summaryDetails.style.display = summaryToggle.checked ? 'block' : 'none';

        document.querySelector(`input[name="summary-mode"][value="${summarySettings.mode || 'auto'}"]`).checked = true;
        document.getElementById('summary-count-input').value = summarySettings.count || 20;
        document.getElementById('summary-prompt-input').value = summarySettings.prompt || '请你以第三人称的视角，客观、冷静、不带任何感情色彩地总结以下对话的核心事件和信息。禁止进行任何角色扮演或添加主观评论。';

        // 为开关添加实时交互
        summaryToggle.onchange = () => {
            summaryDetails.style.display = summaryToggle.checked ? 'block' : 'none';
        };

        // --- 加载回复条数设置 ---
        const replyCountSettings = chat.settings.replyCount || {};
        const replyCountToggle = document.getElementById('reply-count-toggle');
        const replyCountDetails = document.getElementById('reply-count-details-container');

        replyCountToggle.checked = replyCountSettings.enabled || false;
        replyCountDetails.style.display = replyCountToggle.checked ? 'block' : 'none';

        document.getElementById('reply-count-min-input').value = replyCountSettings.min || 1;
        document.getElementById('reply-count-max-input').value = replyCountSettings.max || 5;

        replyCountToggle.onchange = () => {
            replyCountDetails.style.display = replyCountToggle.checked ? 'block' : 'none';
        };

        if (isGroup) {
            videoCallSettingsGroup.style.display = 'none'; // 群聊不支持，隐藏整个设置区
        } else {
            videoCallSettingsGroup.style.display = 'block'; // 单聊显示

            // 加载当前设置
            visualCallSwitch.checked = chat.settings.visualVideoCallEnabled || false;
            imageUploadsDiv.style.display = visualCallSwitch.checked ? 'block' : 'none';
            document.getElementById('char-video-image-preview').src = chat.settings.charVideoImage || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
            document.getElementById('user-video-image-preview').src = chat.settings.userVideoImage || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
            const voiceAccessSwitch = document.getElementById('video-call-voice-access-switch');
            voiceAccessSwitch.checked = chat.settings.videoCallVoiceAccess || false;

            // 为开关添加实时交互
            visualCallSwitch.onchange = () => {
                imageUploadsDiv.style.display = visualCallSwitch.checked ? 'block' : 'none';
            };
        }
        const realCameraSwitch = document.getElementById('user-real-camera-switch');
        if (realCameraSwitch) {
            realCameraSwitch.checked = chat.settings.useRealCamera || false;
        }

        // --- 线下模式UI渲染 ---
        const offlineModeSettings = chat.settings.offlineMode || { enabled: false, presets: [] }; // 安全获取
        const offlineToggle = document.getElementById('offline-mode-toggle');
        const offlineDetails = document.getElementById('offline-mode-details');

        // 1. 设置开关状态并绑定事件
        offlineToggle.checked = offlineModeSettings.enabled;
        offlineDetails.style.display = offlineToggle.checked ? 'block' : 'none';
        offlineToggle.onchange = () => {
            offlineDetails.style.display = offlineToggle.checked ? 'block' : 'none';
        };

        // 2. 填充输入框
        document.getElementById('offline-prompt-input').value = offlineModeSettings.prompt || '';
        document.getElementById('offline-style-input').value = offlineModeSettings.style || '';
        document.getElementById('offline-word-count-input').value = offlineModeSettings.wordCount || 300;
        // 加载生图开关状态
        document.getElementById('offline-novelai-toggle').checked = offlineModeSettings.enableNovelAI || false;

        // 3. 渲染预设下拉框
        renderOfflinePresetsSelector();

        // 为气泡导入/导出按钮绑定事件
        document.getElementById('export-bubble-preset-btn').addEventListener('click', exportSelectedBubblePreset);

        document.getElementById('import-bubble-preset-btn').addEventListener('click', () => {
            // 点击“导入”按钮时，触发隐藏的文件选择框
            document.getElementById('import-bubble-preset-input').click();
        });

        const importBubblePresetInput = document.getElementById('import-bubble-preset-input');
        //需要克隆节点防止重复绑定
        const newImportBubblePresetInput = importBubblePresetInput.cloneNode(true);
        importBubblePresetInput.parentNode.replaceChild(newImportBubblePresetInput, importBubblePresetInput);

        newImportBubblePresetInput.addEventListener('change', (e) => {
            // 当用户选择了文件后，调用导入函数处理
            importBubblePreset(e.target.files[0]);
            e.target.value = null; // 每次用完后清空，方便下次选择同一个文件
        });


        document.getElementById('chat-name-group').style.display = 'block';
        document.getElementById('minimax-voice-id-group').style.display = isGroup ? 'none' : 'block';
        document.getElementById('my-persona-group').style.display = 'block';
        document.getElementById('my-avatar-group').style.display = 'block';
        document.getElementById('my-group-nickname-group').style.display = isGroup ? 'block' : 'none';
        document.getElementById('group-avatar-group').style.display = isGroup ? 'block' : 'none';
        document.getElementById('group-members-group').style.display = isGroup ? 'block' : 'none';
        document.getElementById('ai-persona-group').style.display = isGroup ? 'none' : 'block';
        document.getElementById('ai-avatar-group').style.display = isGroup ? 'none' : 'block';

        document.getElementById('npc-library-group').style.display = isGroup ? 'none' : 'block';

        // NAI出图设置的显示/隐藏和加载
        const naiCharacterSettingsGroup = document.getElementById('nai-character-settings-group');
        // 检查系统是否启用了NovelAI
        const novelaiEnabled = localStorage.getItem('novelai-enabled') === 'true';
        if (!isGroup && novelaiEnabled) {
            naiCharacterSettingsGroup.style.display = 'block';

            // 加载角色NAI设置
            const naiSettings = chat.settings.naiSettings || {
                promptSource: 'system',
                characterPositivePrompt: '',
                characterNegativePrompt: '',
            };

            // 设置提示词来源选项
            const promptSourceRadios = document.querySelectorAll('input[name="nai-prompt-source"]');
            promptSourceRadios.forEach((radio) => {
                radio.checked = radio.value === naiSettings.promptSource;
            });
        } else {
            naiCharacterSettingsGroup.style.display = 'none';
        }

        // 群聊NAI出图设置的显示/隐藏和加载
        const groupNaiSettingsGroup = document.getElementById('group-nai-settings-group');
        if (isGroup && novelaiEnabled) {
            groupNaiSettingsGroup.style.display = 'block';

            // 加载群聊角色NAI设置
            const groupNaiSettings = chat.settings.naiSettings || {
                promptSource: 'system',
                characterPositivePrompt: '',
                characterNegativePrompt: '',
            };

            // 设置提示词来源选项
            const groupPromptSourceRadios = document.querySelectorAll('input[name="group-nai-prompt-source"]');
            groupPromptSourceRadios.forEach((radio) => {
                radio.checked = radio.value === groupNaiSettings.promptSource;
            });
        } else {
            groupNaiSettingsGroup.style.display = 'none';
        }

        // 根据是否为单聊或群聊，显示表情管理按钮
        const charStickerGroup = document.getElementById('char-sticker-group');
        if (charStickerGroup) {
            // 现在无论是单聊还是群聊，这个按钮都会显示
            charStickerGroup.style.display = 'block';
        }

        // 根据是否为群聊，显示或隐藏微博设置
        document.getElementById('weibo-profession-group').style.display = isGroup ? 'none' : 'block';
        document.getElementById('weibo-instruction-group').style.display = isGroup ? 'none' : 'block';
        // 根据是否为群聊，显示或隐藏“好友分组”区域
        document.getElementById('assign-group-section').style.display = isGroup ? 'none' : 'block';

        // --- 加载表单数据 ---
        document.getElementById('chat-name-input').value = chat.name;
        const remarkGroup = document.getElementById('chat-remark-group');
        const remarkInput = document.getElementById('chat-remark-input');

        if (chat.isGroup) {
            remarkGroup.style.display = 'none'; // 群聊不显示备注设置
        } else {
            remarkGroup.style.display = 'block'; // 单聊显示
            // 如果没有settings对象，初始化它
            if (!chat.settings) chat.settings = {};
            remarkInput.value = chat.settings.remarkName || '';
        }

        document.getElementById('my-persona').value = chat.settings.myPersona;
        document.getElementById('my-avatar-preview').src = chat.settings.myAvatar || (isGroup ? defaultMyGroupAvatar : defaultAvatar);
        document.getElementById('max-memory').value = chat.settings.maxMemory;
        // 记忆互通功能 - UI渲染逻辑
        const memoryLinkSelectBox = document.querySelector('#memory-link-multiselect .select-box');
        const memoryLinkCheckboxesContainer = document.getElementById('memory-link-checkboxes-container');
        memoryLinkCheckboxesContainer.innerHTML = ''; // 清空旧选项

        // 1. 获取除了当前聊天以外的所有聊天
        const otherChats = Object.values(state.chats).filter((c) => c.id !== chat.id);

        // 2. 动态创建带头像的复选框
        otherChats.forEach((otherChat) => {
            const existingLink = chat.settings.linkedMemories.find((link) => link.chatId === otherChat.id);
            const isChecked = existingLink ? 'checked' : '';

            // 根据是群聊还是单聊，获取正确的头像URL
            const avatarUrl = otherChat.isGroup ? otherChat.settings.groupAvatar || defaultGroupAvatar : otherChat.settings.aiAvatar || defaultAvatar;

            const label = document.createElement('label');

            // 构建包含 <img> 标签的新HTML结构
            label.innerHTML = `
                <input type="checkbox" value="${otherChat.id}" ${isChecked}>
                <img src="${avatarUrl}" class="avatar-preview">
                <span>${otherChat.name} ${otherChat.isGroup ? '(群聊)' : ''}</span>
            `;
            memoryLinkCheckboxesContainer.appendChild(label);
        });

        // 3. 更新已选数量的显示和记忆条数
        function updateMemoryLinkDisplay() {
            const checkedBoxes = memoryLinkCheckboxesContainer.querySelectorAll('input:checked');
            const displayText = memoryLinkSelectBox.querySelector('.selected-options-text');
            if (checkedBoxes.length === 0) {
                displayText.textContent = '-- 点击选择 --';
            } else {
                displayText.textContent = `已链接 ${checkedBoxes.length} 个聊天`;
            }
        }

        // 4. 加载记忆条数设置
        // 我们现在从一个独立的设置项加载，确保它总能被正确读取
        document.getElementById('link-memory-depth-input').value = chat.settings.linkMemoryDepth || 5;

        // 5. 绑定事件
        updateMemoryLinkDisplay(); // 初始化显示
        memoryLinkCheckboxesContainer.addEventListener('change', updateMemoryLinkDisplay);
        // 使用克隆节点技巧来防止事件重复绑定
        const newSelectBox = memoryLinkSelectBox.cloneNode(true);
        memoryLinkSelectBox.parentNode.replaceChild(newSelectBox, memoryLinkSelectBox);
        newSelectBox.addEventListener('click', (e) => {
            e.stopPropagation();
            memoryLinkCheckboxesContainer.classList.toggle('visible');
            newSelectBox.classList.toggle('expanded');
        });

        const timeToggle = document.getElementById('time-perception-toggle');
        const customTimeContainer = document.getElementById('custom-time-container');
        const customTimeInput = document.getElementById('custom-time-input');

        // 如果是旧聊天，给一个默认值 true（开启）
        const isTimeEnabled = chat.settings.timePerceptionEnabled ?? true;
        timeToggle.checked = isTimeEnabled;
        customTimeInput.value = chat.settings.customTime || '';

        // 根据开关状态，决定是否显示自定义时间输入框
        customTimeContainer.style.display = isTimeEnabled ? 'none' : 'block';

        const bgPreview = document.getElementById('bg-preview');
        const removeBgBtn = document.getElementById('remove-bg-btn');
        if (chat.settings.background) {
            bgPreview.src = chat.settings.background;
            bgPreview.style.display = 'block';
            removeBgBtn.style.display = 'inline-block';
        } else {
            bgPreview.style.display = 'none';
            removeBgBtn.style.display = 'none';
        }

        if (isGroup) {
            document.getElementById('my-group-nickname-input').value = chat.settings.myNickname || '';
            document.getElementById('group-avatar-preview').src = chat.settings.groupAvatar || defaultGroupAvatar;
            renderGroupMemberSettings(chat.members);
            // 加载群聊后台活动设置 (已移动到下方，统一处理)
        } else {
            document.getElementById('ai-persona').value = chat.settings.aiPersona;
            // 加载当前角色的微博职业和指令
            document.getElementById('weibo-profession-input').value = chat.settings.weiboProfession || '';
            document.getElementById('weibo-instruction-input').value = chat.settings.weiboInstruction || '';
            document.getElementById('ai-avatar-preview').src = chat.settings.aiAvatar || defaultAvatar;
            document.getElementById('minimax-voice-id-input').value = chat.settings.minimaxVoiceId || '';
            // 加载语言增强和语速设置
            const langBoostSelect = document.getElementById('minimax-language-boost-select');
            const speedSlider = document.getElementById('minimax-speed-slider');
            const speedValueDisplay = document.getElementById('minimax-speed-value');

            // 根据聊天类型，决定是否显示这两个新设置
            const showMinimaxSpecificSettings = !isGroup;
            document.getElementById('minimax-language-boost-group').style.display = showMinimaxSpecificSettings ? 'block' : 'none';
            document.getElementById('minimax-speed-group').style.display = showMinimaxSpecificSettings ? 'block' : 'none';

            const pitchSlider = document.getElementById('minimax-pitch-slider');
            const pitchValueDisplay = document.getElementById('minimax-pitch-value');
            const volSlider = document.getElementById('minimax-vol-slider');
            const volValueDisplay = document.getElementById('minimax-vol-value');
            const emotionSelect = document.getElementById('minimax-emotion-select');

            document.getElementById('minimax-pitch-group').style.display = showMinimaxSpecificSettings ? 'block' : 'none';
            document.getElementById('minimax-vol-group').style.display = showMinimaxSpecificSettings ? 'block' : 'none';
            document.getElementById('minimax-emotion-group').style.display = showMinimaxSpecificSettings ? 'block' : 'none';

            if (showMinimaxSpecificSettings) {
                langBoostSelect.value = chat.settings.language_boost || '';

                const speed = chat.settings.speed ?? 1.0;
                speedSlider.value = speed;
                speedValueDisplay.textContent = parseFloat(speed).toFixed(1);

                const pitch = chat.settings.pitch ?? 0;
                pitchSlider.value = pitch;
                pitchValueDisplay.textContent = pitch;

                const vol = chat.settings.vol ?? 1.0;
                volSlider.value = vol;
                volValueDisplay.textContent = parseFloat(vol).toFixed(1);

                emotionSelect.value = chat.settings.emotion || '';
            }

            speedSlider.oninput = () => {
                speedValueDisplay.textContent = parseFloat(speedSlider.value).toFixed(1);
            };
            pitchSlider.oninput = () => {
                pitchValueDisplay.textContent = pitchSlider.value;
            };
            volSlider.oninput = () => {
                volValueDisplay.textContent = parseFloat(volSlider.value).toFixed(1);
            };

            const coupleAvatarToggle = document.getElementById('couple-avatar-toggle');
            const coupleAvatarDescContainer = document.getElementById('couple-avatar-desc-container');
            const coupleAvatarDescInput = document.getElementById('couple-avatar-description');

            coupleAvatarToggle.checked = chat.settings.isCoupleAvatar || false;
            coupleAvatarDescInput.value = chat.settings.coupleAvatarDescription || '';

            coupleAvatarDescContainer.style.display = coupleAvatarToggle.checked ? 'block' : 'none';

            coupleAvatarToggle.onchange = () => {
                coupleAvatarDescContainer.style.display = coupleAvatarToggle.checked ? 'block' : 'none';
            };

            // document.getElementById('group-background-activity-group').style.display = 'none';
            // 如果是单聊，就加载分组列表到下拉框
            const select = document.getElementById('assign-group-select');
            select.innerHTML = '<option value="">未分组</option>'; // 清空并设置默认选项
            const groups = await db.qzoneGroups.toArray();
            groups.forEach((group) => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                // 如果当前好友已经有分组，就默认选中它
                if (chat.groupId === group.id) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }

        // --- 统一处理后台活动设置 (单聊和群聊通用) ---
        const groupActivityGroup = document.getElementById('group-background-activity-group');
        const groupIntervalInput = document.getElementById('group-background-interval-input');

        if (groupActivityGroup && groupIntervalInput) {
            groupActivityGroup.style.display = 'block'; // 显示设置区域

            const bgSettings = chat.settings.backgroundActivity || {};
            groupIntervalInput.value = bgSettings.interval || '';
            const globalInterval = state.globalSettings.backgroundActivityInterval || 10;
            groupIntervalInput.placeholder = `Global Default: ${globalInterval}`;
        }

        const worldBookCheckboxesContainer = document.getElementById('world-book-checkboxes-container');
        worldBookCheckboxesContainer.innerHTML = '';
        const linkedIds = new Set(chat.settings.linkedWorldBookIds || []);

        // 1. 获取所有分类和世界书
        const categories = await db.worldBookCategories.toArray();
        const books = state.worldBooks;

        // 如果存在未分类的书籍，就创建一个“虚拟分类”
        const hasUncategorized = books.some((book) => !book.categoryId);
        if (hasUncategorized) {
            categories.push({ id: 'uncategorized', name: '未分类' });
        }

        // 2. 将书籍按分类ID进行分组
        const booksByCategoryId = books.reduce((acc, book) => {
            const categoryId = book.categoryId || 'uncategorized';
            if (!acc[categoryId]) {
                acc[categoryId] = [];
            }
            acc[categoryId].push(book);
            return acc;
        }, {});

        // 3. 遍历分类，创建带折叠功能的列表
        categories.forEach((category) => {
            const booksInCategory = booksByCategoryId[category.id] || [];
            if (booksInCategory.length > 0) {
                const allInCategoryChecked = booksInCategory.every((book) => linkedIds.has(book.id));

                const header = document.createElement('div');
                header.className = 'wb-category-header';
                header.innerHTML = `
                <span class="arrow">▼</span>
                <input type="checkbox" class="wb-category-checkbox" data-category-id="${category.id}" ${allInCategoryChecked ? 'checked' : ''}>
                <span>${category.name}</span>
            `;

                const bookContainer = document.createElement('div');
                bookContainer.className = 'wb-book-container';
                bookContainer.dataset.containerFor = category.id;

                booksInCategory.forEach((book) => {
                    const isChecked = linkedIds.has(book.id);
                    const label = document.createElement('label');
                    // 给书名包一个span，方便CSS做省略号处理
                    label.innerHTML = `<input type="checkbox" class="wb-book-checkbox" value="${book.id}" data-parent-category="${category.id}" ${isChecked ? 'checked' : ''}> <span class="wb-book-name">${book.name}</span>`;
                    bookContainer.appendChild(label);
                });

                // 默认将所有文件夹设置为折叠状态，保持界面整洁
                header.classList.add('collapsed');
                bookContainer.classList.add('collapsed');

                worldBookCheckboxesContainer.appendChild(header);
                worldBookCheckboxesContainer.appendChild(bookContainer);
            }
        });

        updateWorldBookSelectionDisplay(); // 更新顶部的已选数量显示

        // 加载并更新所有预览相关控件
        const themeRadio = document.querySelector(`input[name="theme-select"][value="${chat.settings.theme || 'default'}"]`);
        if (themeRadio) themeRadio.checked = true;
        const fontSizeSlider = document.getElementById('font-size-slider');
        fontSizeSlider.value = chat.settings.fontSize || 13;
        document.getElementById('font-size-value').textContent = `${fontSizeSlider.value}px`;
        const customCssInput = document.getElementById('custom-css-input');

        // --- 加载火花设置 ---
        const streakSettings = chat.settings.streak || { enabled: false, initialDays: 0, extinguishThreshold: 1 };
        // --- 加载自定义火花图标和颜色设置 ---
        document.getElementById('streak-lit-icon-url').value = streakSettings.litIconUrl || '';
        document.getElementById('streak-extinguished-icon-url').value = streakSettings.extinguishedIconUrl || '';
        document.getElementById('streak-font-color-picker').value = streakSettings.fontColor || '#ff6f00'; // 默认橙色

        const streakToggle = document.getElementById('streak-enabled-toggle');
        const streakDetails = document.getElementById('streak-details-container');
        const initialDaysInput = document.getElementById('streak-initial-days-input');
        const thresholdSelect = document.getElementById('streak-extinguish-threshold-select');

        streakToggle.checked = streakSettings.enabled;
        streakDetails.style.display = streakSettings.enabled ? 'block' : 'none';

        const intimacyBtn = document.getElementById('open-intimacy-panel-btn');
        if (intimacyBtn) {
            intimacyBtn.style.display = streakSettings.enabled ? 'block' : 'none';
        }

        initialDaysInput.value = streakSettings.initialDays || 0;
        thresholdSelect.value = streakSettings.extinguishThreshold || 1;

        // 为开关添加实时交互
        streakToggle.onchange = () => {
            streakDetails.style.display = streakToggle.checked ? 'block' : 'none';
        };

        customCssInput.value = chat.settings.customCss || '';

        updateSettingsPreview();

        renderBubblePresetSelector();
        document.getElementById('bubble-style-preset-select').addEventListener('change', handlePresetSelectChange);
        document.getElementById('manage-bubble-presets-btn').addEventListener('click', openBubblePresetManager);
        document.getElementById('chat-settings-modal').classList.add('visible');
    });

    function renderGroupMemberSettings(members) {
        const container = document.getElementById('group-members-settings');
        container.innerHTML = '';
        members.forEach((member) => {
            const div = document.createElement('div');
            div.className = 'member-editor';
            div.dataset.memberId = member.id;

            // 显示的是 groupNickname
            div.innerHTML = `<img src="${member.avatar}" alt="${member.groupNickname}"><div class="member-name">${member.groupNickname}</div>`;
            div.addEventListener('click', () => openMemberEditor(member.id));
            container.appendChild(div);
        });
    }
    window.renderGroupMemberSettings = renderGroupMemberSettings;

    function openMemberEditor(memberId) {
        editingMemberId = memberId;
        const chat = state.chats[state.activeChatId];
        const member = chat.members.find((m) => m.id === memberId);
        if (!member) return;

        if (typeof member.isMuted === 'undefined') {
            member.isMuted = false; // 为旧数据兼容
        }

        document.getElementById('member-name-input').value = member.groupNickname;
        document.getElementById('member-persona-input').value = member.persona;
        document.getElementById('member-avatar-preview').src = member.avatar;

        // ★★★ 我们在这里为新按钮绑定了点击事件 ★★★
        const changeFrameBtn = document.getElementById('member-editor-change-frame-btn');
        const newChangeFrameBtn = changeFrameBtn.cloneNode(true);
        changeFrameBtn.parentNode.replaceChild(newChangeFrameBtn, changeFrameBtn);

        newChangeFrameBtn.addEventListener('click', () => {
            // 调用头像框选择器，并告诉它我们正在为'member'类型的成员（也就是NPC）设置头像框
            openFrameSelectorModal('member', memberId);
        });

        document.getElementById('member-settings-modal').classList.add('visible');
    }

    document.getElementById('cancel-member-settings-btn').addEventListener('click', () => {
        document.getElementById('member-settings-modal').classList.remove('visible');
        editingMemberId = null;
    });

    document.getElementById('save-member-settings-btn').addEventListener('click', () => {
        if (!editingMemberId) return;
        const chat = state.chats[state.activeChatId];
        const member = chat.members.find((m) => m.id === editingMemberId);

        const newNickname = document.getElementById('member-name-input').value.trim();
        if (!newNickname) {
            alert('群昵称不能为空！');
            return;
        }
        member.groupNickname = newNickname; // 只修改群昵称
        member.persona = document.getElementById('member-persona-input').value;
        member.avatar = document.getElementById('member-avatar-preview').src;

        renderGroupMemberSettings(chat.members);
        document.getElementById('member-settings-modal').classList.remove('visible');
    });

    document.getElementById('reset-theme-btn').addEventListener('click', () => {
        document.getElementById('theme-default').checked = true;
    });

    document.getElementById('cancel-chat-settings-btn').addEventListener('click', () => {
        chatSettingsModal.classList.remove('visible');
    });

    document.getElementById('save-chat-settings-btn').addEventListener('click', async () => {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        const newName = document.getElementById('chat-name-input').value.trim();
        if (!newName) return alert('备注名/群名不能为空！');
        chat.name = newName;

        if (!chat.isGroup) {
            const newRemark = document.getElementById('chat-remark-input').value.trim();
            chat.settings.remarkName = newRemark;
        }

        // 记忆互通功能 - 保存逻辑
        const linkedMemoryCheckboxes = document.querySelectorAll('#memory-link-checkboxes-container input:checked');
        const memoryDepth = parseInt(document.getElementById('link-memory-depth-input').value) || 5;

        chat.settings.linkMemoryDepth = memoryDepth; // 独立保存记忆条数设置

        chat.settings.linkedMemories = Array.from(linkedMemoryCheckboxes).map((checkbox) => ({
            chatId: checkbox.value,
            depth: memoryDepth, // 对所有选中的链接应用相同的深度
        }));

        const selectedThemeRadio = document.querySelector('input[name="theme-select"]:checked');
        chat.settings.theme = selectedThemeRadio ? selectedThemeRadio.value : 'default';

        chat.settings.fontSize = parseInt(document.getElementById('font-size-slider').value);
        chat.settings.customCss = document.getElementById('custom-css-input').value.trim();

        chat.settings.myPersona = document.getElementById('my-persona').value;
        chat.settings.myAvatar = document.getElementById('my-avatar-preview').src;
        const checkedBooks = document.querySelectorAll('#world-book-checkboxes-container input.wb-book-checkbox:checked');
        chat.settings.linkedWorldBookIds = Array.from(checkedBooks).map((cb) => cb.value);

        if (chat.isGroup) {
            chat.settings.myNickname = document.getElementById('my-group-nickname-input').value.trim();
            chat.settings.groupAvatar = document.getElementById('group-avatar-preview').src;
            // 保存群聊后台活动设置 (已移动到下方，统一保存)
        } else {
            chat.settings.aiPersona = document.getElementById('ai-persona').value;
            chat.settings.aiAvatar = document.getElementById('ai-avatar-preview').src;
            chat.settings.minimaxVoiceId = document.getElementById('minimax-voice-id-input').value.trim();
            const langBoost = document.getElementById('minimax-language-boost-select').value;
            chat.settings.language_boost = langBoost ? langBoost : null;
            chat.settings.speed = parseFloat(document.getElementById('minimax-speed-slider').value);
            chat.settings.pitch = parseInt(document.getElementById('minimax-pitch-slider').value) || 0;
            chat.settings.vol = parseFloat(document.getElementById('minimax-vol-slider').value) || 1.0;
            const emotion = document.getElementById('minimax-emotion-select').value;
            chat.settings.emotion = emotion ? emotion : null;

            chat.settings.isCoupleAvatar = document.getElementById('couple-avatar-toggle').checked;
            chat.settings.coupleAvatarDescription = document.getElementById('couple-avatar-description').value.trim();

            // 从输入框读取值并保存
            chat.settings.weiboProfession = document.getElementById('weibo-profession-input').value.trim();
            chat.settings.weiboInstruction = document.getElementById('weibo-instruction-input').value.trim();
            // 保存视频通话设置
            chat.settings.visualVideoCallEnabled = document.getElementById('visual-video-call-switch').checked;
            chat.settings.charVideoImage = document.getElementById('char-video-image-preview').src;
            chat.settings.userVideoImage = document.getElementById('user-video-image-preview').src;
            chat.settings.videoCallVoiceAccess = document.getElementById('video-call-voice-access-switch').checked;
            chat.settings.useRealCamera = document.getElementById('user-real-camera-switch').checked;

            // 保存NAI出图设置
            const novelaiEnabled = localStorage.getItem('novelai-enabled') === 'true';
            if (novelaiEnabled) {
                if (!chat.settings.naiSettings) {
                    chat.settings.naiSettings = {};
                }

                // 根据是否为群聊选择不同的radio按钮组
                const isGroup = chat.isGroup;
                const promptSourceRadio = document.querySelector(isGroup ? 'input[name="group-nai-prompt-source"]:checked' : 'input[name="nai-prompt-source"]:checked');

                chat.settings.naiSettings.promptSource = promptSourceRadio ? promptSourceRadio.value : 'system';
            }

            const selectedGroupId = document.getElementById('assign-group-select').value;
            chat.groupId = selectedGroupId ? parseInt(selectedGroupId) : null;
        }

        // --- 统一保存后台活动设置 ---
        const groupIntervalInput = document.getElementById('group-background-interval-input');

        if (groupIntervalInput) {
            const rawVal = groupIntervalInput.value.trim();
            const groupActivityInterval = rawVal ? parseInt(rawVal) : null;

            // 确保 lastActivityTimestamp 字段存在
            const lastTimestamp = chat.settings.backgroundActivity ? chat.settings.backgroundActivity.lastActivityTimestamp : 0;

            // 如果存在开关元素，读取其状态；否则默认为true（或者根据旧逻辑）
            // 但用户撤销了index.html的修改，所以应该是有开关的 id="group-background-activity-switch"
            const groupActivitySwitch = document.getElementById('group-background-activity-switch');
            const groupActivityEnabled = groupActivitySwitch ? groupActivitySwitch.checked : false;

            chat.settings.backgroundActivity = {
                enabled: groupActivityEnabled,
                interval: groupActivityInterval,
                lastActivityTimestamp: lastTimestamp,
            };
        }

        chat.settings.maxMemory = parseInt(document.getElementById('max-memory').value) || 10;

        chat.settings.timePerceptionEnabled = document.getElementById('time-perception-toggle').checked;
        const newCustomTime = document.getElementById('custom-time-input').value;
        if (newCustomTime && newCustomTime !== chat.settings.customTime) {
            chat.settings.customTimeSetAt = Date.now();
        } else if (!newCustomTime) {
            delete chat.settings.customTimeSetAt;
        }
        chat.settings.customTime = newCustomTime;

        // --- 保存线下模式设置 ---
        if (!chat.settings.offlineMode) chat.settings.offlineMode = {}; // 初始化
        chat.settings.offlineMode.enabled = document.getElementById('offline-mode-toggle').checked;
        chat.settings.offlineMode.prompt = document.getElementById('offline-prompt-input').value.trim();
        chat.settings.offlineMode.style = document.getElementById('offline-style-input').value.trim();
        chat.settings.offlineMode.wordCount = parseInt(document.getElementById('offline-word-count-input').value) || 300;
        // 保存生图开关状态
        chat.settings.offlineMode.enableNovelAI = document.getElementById('offline-novelai-toggle').checked;

        // --- 保存聊天总结设置 ---
        if (!chat.settings.summary) chat.settings.summary = {};
        chat.settings.summary.enabled = document.getElementById('summary-toggle').checked;
        chat.settings.summary.mode = document.querySelector('input[name="summary-mode"]:checked').value;
        chat.settings.summary.count = parseInt(document.getElementById('summary-count-input').value) || 20;
        chat.settings.summary.prompt = document.getElementById('summary-prompt-input').value.trim();

        // --- 保存回复条数设置 ---
        if (!chat.settings.replyCount) chat.settings.replyCount = {};
        chat.settings.replyCount.enabled = document.getElementById('reply-count-toggle').checked;
        const rcMin = parseInt(document.getElementById('reply-count-min-input').value) || 1;
        const rcMax = parseInt(document.getElementById('reply-count-max-input').value) || 5;
        chat.settings.replyCount.min = Math.max(1, rcMin);
        chat.settings.replyCount.max = Math.max(chat.settings.replyCount.min, rcMax);

        const isStreakEnabled = document.getElementById('streak-enabled-toggle').checked;
        const newInitialDays = parseInt(document.getElementById('streak-initial-days-input').value) || 0;
        const newThreshold = parseInt(document.getElementById('streak-extinguish-threshold-select').value);

        const oldStreak = chat.settings.streak || {}; // 安全地获取旧设置

        if (isStreakEnabled) {
            // 检查是否是首次开启
            const isFirstTimeEnabled = !oldStreak.enabled;

            // 只有在首次开启时，才用“初始天数”覆盖“当前天数”。
            // 否则，必须保留用户已经积累的 currentDays 和 lastInteractionDate。
            chat.settings.streak = {
                enabled: true,
                currentDays: isFirstTimeEnabled ? newInitialDays : oldStreak.currentDays,
                lastInteractionDate: isFirstTimeEnabled ? null : oldStreak.lastInteractionDate,
                initialDays: newInitialDays,
                extinguishThreshold: newThreshold,
                litIconUrl: document.getElementById('streak-lit-icon-url').value.trim(),
                extinguishedIconUrl: document.getElementById('streak-extinguished-icon-url').value.trim(),
                fontColor: document.getElementById('streak-font-color-picker').value,
            };
        } else {
            // 如果用户关闭了功能，就重置所有设置
            chat.settings.streak = {
                enabled: false,
                initialDays: 0,
                currentDays: 0,
                extinguishThreshold: 1,
                lastInteractionDate: null,
                litIconUrl: '',
                extinguishedIconUrl: '',
                fontColor: '#ff6f00',
            };
        }

        await db.chats.put(chat);

        applyScopedCss(chat.settings.customCss, '#chat-messages', 'custom-bubble-style');

        chatSettingsModal.classList.remove('visible');
        renderChatInterface(state.activeChatId);
        renderChatList();
    });

    document.getElementById('clear-chat-btn').addEventListener('click', async () => {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        const confirmed = await showCustomConfirm('清空记录', '确定要清空此聊天的【消息和心声】吗？\\n（聊天总结将被保留）', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            // 使用 filter 方法，只保留类型为 'summary' 的消息
            chat.history = chat.history.filter((msg) => msg.type === 'summary');

            // 同时清空心声记录
            if (chat.innerVoiceHistory) {
                chat.innerVoiceHistory = [];
            }
            chat.latestInnerVoice = null;

            await db.chats.put(chat);
            renderChatInterface(state.activeChatId);
            renderChatList();
            chatSettingsModal.classList.remove('visible');

            alert('聊天消息和心声已清空！');
        }
    });

    document.getElementById('export-chat-history-btn').addEventListener('click', exportChatHistory);

    document.getElementById('import-chat-history-btn').addEventListener('click', () => {
        document.getElementById('import-chat-history-input').click();
    });

    document.getElementById('import-chat-history-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            importChatHistory(file);
        }
        event.target.value = null;
    });

    const setupFileUpload = (inputId, callback) => {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    const compressedDataUrl = await handleImageUploadAndCompress(file);
                    callback(compressedDataUrl);
                } catch (error) {
                    console.error(`处理文件 ${file.name} 失败:`, error);
                    alert(`处理图片失败: ${error.message}`);
                } finally {
                    event.target.value = null;
                }
            }
        });
    };
    window.setupFileUpload = setupFileUpload;

    setupFileUpload('ai-avatar-input', (base64) => (document.getElementById('ai-avatar-preview').src = base64));
    setupFileUpload('my-avatar-input', (base64) => (document.getElementById('my-avatar-preview').src = base64));
    setupFileUpload('group-avatar-input', (base64) => (document.getElementById('group-avatar-preview').src = base64));
    setupFileUpload('member-avatar-input', (base64) => (document.getElementById('member-avatar-preview').src = base64));
    setupFileUpload('bg-input', (base64) => {
        if (state.activeChatId) {
            state.chats[state.activeChatId].settings.background = base64;
            const bgPreview = document.getElementById('bg-preview');
            bgPreview.src = base64;
            bgPreview.style.display = 'block';
            document.getElementById('remove-bg-btn').style.display = 'inline-block';
        }
    });

    setupFileUpload('char-video-image-input', (base64) => (document.getElementById('char-video-image-preview').src = base64));
    setupFileUpload('user-video-image-input', (base64) => (document.getElementById('user-video-image-preview').src = base64));

    document.getElementById('remove-bg-btn').addEventListener('click', () => {
        if (state.activeChatId) {
            state.chats[state.activeChatId].settings.background = '';
            const bgPreview = document.getElementById('bg-preview');
            bgPreview.src = '';
            bgPreview.style.display = 'none';
            document.getElementById('remove-bg-btn').style.display = 'none';
        }
    });

    // 使用事件委托来处理所有点击和勾选事件，效率更高
    worldBookCheckboxesContainer.addEventListener('click', (e) => {
        const header = e.target.closest('.wb-category-header');
        // 如果点击的是文件夹头部，并且不是点在复选框上
        if (header && !e.target.matches('input[type="checkbox"]')) {
            const categoryId = header.querySelector('.wb-category-checkbox')?.dataset.categoryId;
            if (categoryId) {
                const bookContainer = worldBookCheckboxesContainer.querySelector(`.wb-book-container[data-container-for="${categoryId}"]`);
                if (bookContainer) {
                    header.classList.toggle('collapsed');
                    bookContainer.classList.toggle('collapsed');
                }
            }
        }
    });

    worldBookCheckboxesContainer.addEventListener('change', (e) => {
        const target = e.target;

        // 如果点击的是分类的“全选”复选框
        if (target.classList.contains('wb-category-checkbox')) {
            const categoryId = target.dataset.categoryId;
            const isChecked = target.checked;
            // 找到这个分类下的所有书籍复选框，并将它们的状态设置为与分类复选框一致
            const bookCheckboxes = worldBookCheckboxesContainer.querySelectorAll(`input.wb-book-checkbox[data-parent-category="${categoryId}"]`);
            bookCheckboxes.forEach((cb) => (cb.checked = isChecked));
        }

        // 如果点击的是单个书籍的复选框
        if (target.classList.contains('wb-book-checkbox')) {
            const categoryId = target.dataset.parentCategory;
            if (categoryId) {
                // 检查它是否属于一个分类
                const categoryCheckbox = worldBookCheckboxesContainer.querySelector(`input.wb-category-checkbox[data-category-id="${categoryId}"]`);
                const allBookCheckboxes = worldBookCheckboxesContainer.querySelectorAll(`input.wb-book-checkbox[data-parent-category="${categoryId}"]`);
                // 检查该分类下是否所有书籍都被选中了
                const allChecked = Array.from(allBookCheckboxes).every((cb) => cb.checked);
                // 同步分类“全选”复选框的状态
                if (categoryCheckbox) categoryCheckbox.checked = allChecked;
            }
        }

        // 每次变更后都更新顶部的已选数量显示
        updateWorldBookSelectionDisplay();
    });

    // --- 迁移的事件监听器 ---

    // 1. 打开角色表情管理
    chatSettingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'manage-char-stickers-btn') {
            chatSettingsModal.classList.remove('visible');
            if (openCharStickerManager) openCharStickerManager();
        }
    });

    // 2. 打开NPC管理
    chatSettingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'manage-npcs-btn') {
            chatSettingsModal.classList.remove('visible');
            if (openNpcManager) openNpcManager();
        }
    });

    // 3. 打开头像框选择 (针对 chat-settings-modal 内部的按钮)
    chatSettingsModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('change-frame-btn')) {
            if (openFrameSelectorModal) openFrameSelectorModal(e.target.dataset.type);
        }
    });

    // 4. 打开手动总结选项
    chatSettingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'manual-summary-btn') {
            chatSettingsModal.classList.remove('visible');
            if (openManualSummaryOptions) openManualSummaryOptions();
        }
    });

    // 5. 拉黑聊天
    const blockChatBtn = document.getElementById('block-chat-btn');
    if (blockChatBtn) {
        blockChatBtn.addEventListener('click', async () => {
            if (!state.activeChatId || state.chats[state.activeChatId].isGroup) return;

            const chat = state.chats[state.activeChatId];
            const confirmed = await showCustomConfirm('确认拉黑', `确定要拉黑“${chat.name}”吗？拉黑后您将无法向其发送消息，直到您将Ta移出黑名单，或等待Ta重新申请好友。`, { confirmButtonClass: 'btn-danger' });

            if (confirmed) {
                chat.relationship.status = 'blocked_by_user';
                chat.relationship.blockedTimestamp = Date.now();

                const hiddenMessage = {
                    role: 'system',
                    content: `[系统提示：你刚刚被用户拉黑了。在对方解除拉黑之前，你无法再主动发起对话，也无法回应。]`,
                    timestamp: Date.now() + 1,
                    isHidden: true,
                };
                chat.history.push(hiddenMessage);

                await db.chats.put(chat);

                chatSettingsModal.classList.remove('visible');
                renderChatInterface(state.activeChatId);
                renderChatList();
            }
        });
    }

    // 6. 管理群成员
    const manageMembersBtn = document.getElementById('manage-members-btn');
    if (manageMembersBtn) {
        manageMembersBtn.addEventListener('click', () => {
            chatSettingsModal.classList.remove('visible');
            if (openMemberManagementScreen) openMemberManagementScreen();
        });
    }

    // 7. 打开“选择”弹窗的按钮 (针对 member-settings-modal)
    const memberSettingsModal = document.getElementById('member-settings-modal');
    if (memberSettingsModal) {
        memberSettingsModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('change-frame-btn')) {
                // Check if getEditingMemberId is available, otherwise try global if it exists (fallback)
                const memberId = (typeof getEditingMemberId === 'function') ? getEditingMemberId() : (typeof editingMemberId !== 'undefined' ? editingMemberId : null);
                if (openFrameSelectorModal) openFrameSelectorModal('member', memberId);
            }
        });
    }

    // --- Data & Functions Moved from main-app.js (Offline/Summary/Streak) ---

    function renderOfflinePresetsSelector() {
        const select = document.getElementById('offline-preset-select');
        const presets = state.offlinePresets || [];
        select.innerHTML = '<option value="">-- 使用自定义输入 --</option>';

        presets.forEach((preset) => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            select.appendChild(option);
        });
    }

    function handleOfflinePresetSelection() {
        const select = document.getElementById('offline-preset-select');
        const selectedId = parseInt(select.value);

        if (selectedId) {
            const preset = state.offlinePresets.find((p) => p.id === selectedId);
            if (preset) {
                document.getElementById('offline-prompt-input').value = preset.prompt;
                document.getElementById('offline-style-input').value = preset.style;
            }
        }
    }

    async function openOfflinePresetManager() {
        const select = document.getElementById('offline-preset-select');
        const selectedId = select.value ? parseInt(select.value) : null;

        const choice = await showChoiceModal('管理线下模式预设', [
            { text: '💾 保存当前为新预设', value: 'save_new' },
            { text: '✏️ 更新选中预设', value: 'update_selected', disabled: !selectedId },
            { text: '🗑️ 删除选中预设', value: 'delete_selected', disabled: !selectedId },
        ]);

        switch (choice) {
            case 'save_new':
                await saveCurrentAsOfflinePreset();
                break;
            case 'update_selected':
                if (selectedId) await updateSelectedOfflinePreset(selectedId);
                break;
            case 'delete_selected':
                if (selectedId) await deleteSelectedOfflinePreset(selectedId);
                break;
        }
    }

    async function saveCurrentAsOfflinePreset() {
        const name = await showCustomPrompt('保存新预设', '请输入预设名称：');

        if (name && name.trim()) {
            const newPreset = {
                name: name.trim(),
                prompt: document.getElementById('offline-prompt-input').value.trim(),
                style: document.getElementById('offline-style-input').value.trim(),
            };
            const newId = await db.offlinePresets.add(newPreset);

            if (!state.offlinePresets) state.offlinePresets = [];
            state.offlinePresets.push({ id: newId, ...newPreset });

            renderOfflinePresetsSelector();
            document.getElementById('offline-preset-select').value = newId;
            alert(`预设 "${name.trim()}" 已保存！`);
        }
    }

    async function updateSelectedOfflinePreset(presetId) {
        const preset = state.offlinePresets.find((p) => p.id === presetId);
        if (!preset) return;

        const confirmed = await showCustomConfirm('确认更新', `确定要用当前内容覆盖预设 "${preset.name}" 吗？`);
        if (confirmed) {
            const updatedData = {
                prompt: document.getElementById('offline-prompt-input').value.trim(),
                style: document.getElementById('offline-style-input').value.trim(),
            };
            await db.offlinePresets.update(presetId, updatedData);
            preset.prompt = updatedData.prompt;
            preset.style = updatedData.style;
            alert('预设已更新！');
        }
    }

    async function deleteSelectedOfflinePreset(presetId) {
        const preset = state.offlinePresets.find((p) => p.id === presetId);
        if (!preset) return;

        const confirmed = await showCustomConfirm('确认删除', `确定要删除预设 "${preset.name}" 吗？`, {
            confirmButtonClass: 'btn-danger',
        });
        if (confirmed) {
            await db.offlinePresets.delete(presetId);
            state.offlinePresets = state.offlinePresets.filter((p) => p.id !== presetId);

            renderOfflinePresetsSelector();
            document.getElementById('offline-prompt-input').value = '';
            document.getElementById('offline-style-input').value = '';
            alert('预设已删除。');
        }
    }

    let isSummarizing = false;

    window.checkAndTriggerSummary = checkAndTriggerSummary;
    async function checkAndTriggerSummary(chatId) {
        if (isSummarizing) return;

        const chat = state.chats[chatId];
        if (!chat || !chat.settings.summary || !chat.settings.summary.enabled) return;

        const summarySettings = chat.settings.summary;
        const lastSummaryIndex = summarySettings.lastSummaryIndex;
        const messagesSinceLastSummary = chat.history.slice(lastSummaryIndex + 1);

        if (messagesSinceLastSummary.length >= summarySettings.count) {
            isSummarizing = true;
            if (summarySettings.mode === 'auto') {
                await performAutomaticSummary(chatId);
            } else {
                await notifyForManualSummary(chatId);
            }
            isSummarizing = false;
        }
    }

    async function performAutomaticSummary(chatId) {
        console.log(`自动总结触发 for chat: ${chatId}`);
        const chat = state.chats[chatId];
        const summarySettings = chat.settings.summary;

        const messagesToSummarize = chat.history.slice(-summarySettings.count);

        try {
            const summaryText = await generateSummary(chatId, messagesToSummarize);
            if (summaryText) {
                await saveSummaryAsMemory(chatId, summaryText);
            }
        } catch (e) {
            console.error('自动总结过程中发生未捕获的错误:', e);
        }
    }

    async function notifyForManualSummary(chatId) {
        console.log(`手动总结提醒触发 for chat: ${chatId}`);

        await showCustomAlert('总结提醒', '对话已达到设定长度，你可以随时在“聊天设置”中点击“立即手动总结”来生成对话记忆。');

        const chat = state.chats[chatId];
        chat.settings.summary.lastSummaryIndex = chat.history.length - 1;
        await db.chats.put(chat);
    }

    async function generateSummary(chatId, specificMessages = null) {
        const chat = state.chats[chatId];
        const summarySettings = chat.settings.summary;

        const { proxyUrl, apiKey, model, temperature } = window.getApiConfigForFunction('summary');

        if (!proxyUrl || !apiKey || !model) {
            throw new Error('API未配置，无法生成总结。');
        }
        let messagesToSummarize;

        if (specificMessages && specificMessages.length > 0) {
            messagesToSummarize = specificMessages;
        } else {
            const lastSummaryIndex = summarySettings.lastSummaryIndex > -1 ? summarySettings.lastSummaryIndex : 0;
            messagesToSummarize = chat.history.slice(lastSummaryIndex + 1);
        }

        const filteredMessagesForSummary = messagesToSummarize.filter((msg) => msg.type !== 'summary');

        if (filteredMessagesForSummary.length === 0) {
            if (!specificMessages) {
                await showCustomAlert('无需总结', '自上次总结以来没有新的对话内容。');
            }
            return null;
        }

        const conversationText = filteredMessagesForSummary
            .map((msg) => {
                const sender = msg.role === 'user' ? (chat.isGroup ? chat.settings.myNickname || '我' : '我') : msg.senderName || chat.name;
                let content = '';
                if (typeof msg.content === 'string') {
                    content = msg.content;
                } else if (Array.isArray(msg.content)) {
                    content = '[图片]';
                } else if (msg.type) {
                    content = `[${msg.type}]`;
                }
                const readableTime = new Date(msg.timestamp).toLocaleString('zh-CN', { hour12: false });
                return `[${readableTime}] ${sender}: ${content}`;
            })
            .join('\n');

        const systemPrompt = summarySettings.prompt + `\n\n重要提示：每条消息开头都有一个 [时间] 标记。你在总结时，【必须】参考这些时间，在总结关键事件时附上对应的时间范围或具体时间点，让总结包含时间线索。\n\n--- 对话开始 ---\n${conversationText}\n--- 对话结束 ---`;

        try {
            if (!specificMessages) {
                await showCustomAlert('正在生成...', 'AI正在努力总结你们的对话，请稍候...');
            }

            const isGemini = proxyUrl === GEMINI_API_URL;
            const messagesForApi = [{ role: 'user', content: systemPrompt }];
            const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: messagesForApi,
                        ...window.buildModelParams(state.apiConfig),
                        temperature: parseFloat(temperature) || 0.3,
                    }),
                });

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const aiContent = isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data?.choices?.[0]?.message?.content;

            if (!aiContent) {
                throw new Error('AI返回了空内容。');
            }

            return aiContent;
        } catch (error) {
            console.error('生成总结失败:', error);
            await showCustomAlert('总结失败', `发生错误: ${error.message}`);
            return null;
        }
    }

    async function saveSummaryAsMemory(chatId, summaryText) {
        const chat = state.chats[chatId];

        const newLastSummaryIndex = chat.history.length - 1;

        const summaryMessage = {
            role: 'system',
            type: 'summary',
            content: summaryText,
            timestamp: Date.now(),
            isHidden: true,
        };

        chat.history.push(summaryMessage);
        chat.settings.summary.lastSummaryIndex = newLastSummaryIndex;

        await db.chats.put(chat);
        console.log(`新的总结已作为记忆保存 for chat: ${chatId}`);
    }

    let editingSummaryTimestamp = null;

    async function openSummaryViewer() {
        const chat = state.chats[state.activeChatId];
        document.getElementById('summary-viewer-title').textContent = `“${chat.name}”的对话记忆`;

        const listEl = document.getElementById('summary-list');
        listEl.innerHTML = '';

        const summaries = chat.history.filter((msg) => msg.type === 'summary');

        if (summaries.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a;">还没有生成过任何总结。</p>';
        } else {
            [...summaries].reverse().forEach((summary) => {
                const card = document.createElement('div');
                card.className = 'summary-item-card';

                card.innerHTML = `
			                <div class="summary-actions">
			                    <button class="concise-summary-btn" data-timestamp="${summary.timestamp}" title="精简总结">✨</button>
			                    <button class="edit-summary-btn" data-timestamp="${summary.timestamp}" title="编辑">✏️</button>
			                    <button class="delete-summary-btn" data-timestamp="${summary.timestamp}" title="删除">🗑️</button>
			                </div>
			                <div class="summary-content">${summary.content.replace(/\n/g, '<br>')}</div>
			                <div class="summary-meta">
			                    <span>生成于: ${new Date(summary.timestamp).toLocaleString('zh-CN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                })}</span>
			                </div>
			            `;
                listEl.appendChild(card);
            });
        }

        document.getElementById('chat-settings-modal').classList.remove('visible');
        document.getElementById('summary-viewer-modal').classList.add('visible');
    }

    async function editSummary(timestamp) {
        const chat = state.chats[state.activeChatId];
        const summary = chat.history.find((msg) => msg.timestamp === timestamp);
        if (!summary) return;

        const newContent = await showCustomPrompt('编辑总结', '修改总结内容:', summary.content, 'textarea');

        if (newContent !== null) {
            summary.content = newContent.trim();
            await db.chats.put(chat);
            openSummaryViewer();
        }
    }

    async function deleteSummary(timestamp) {
        const confirmed = await showCustomConfirm('确认删除', '确定要删除这条总结记忆吗？这可能会影响AI的长期记忆。', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            const chat = state.chats[state.activeChatId];

            chat.history = chat.history.filter((msg) => msg.timestamp !== timestamp);

            const lastRemainingSummary = chat.history.filter((m) => m.type === 'summary').pop();

            let newLastSummaryIndex;

            if (lastRemainingSummary) {
                const lastSummaryMessageIndexInHistory = chat.history.findIndex((m) => m.timestamp === lastRemainingSummary.timestamp);
                newLastSummaryIndex = lastSummaryMessageIndexInHistory > 0 ? lastSummaryMessageIndexInHistory - 1 : -1;
            } else {
                newLastSummaryIndex = -1;
            }

            if (chat.settings.summary) {
                chat.settings.summary.lastSummaryIndex = newLastSummaryIndex;
            }

            await db.chats.put(chat);
            openSummaryViewer();
            await showCustomAlert('操作成功', '总结已删除！');
        }
    }

    async function generateConciseSummary(originalText) {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('summary');
        if (!proxyUrl || !apiKey || !model) {
            throw new Error('API未配置，无法生成精简摘要。');
        }

        const systemPrompt = `请你将以下内容精简为一句话的核心摘要，保留最关键的人物、事件和结论，字数控制在20字以内：\n\n--- 内容开始 ---\n${originalText}\n--- 内容结束 ---`;

        try {
            const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: systemPrompt }],
                    ...window.buildModelParams(state.apiConfig),
                    temperature: parseFloat(state.apiConfig.temperature) || 0.5,
                }),
            });

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('生成精简摘要失败:', error);
            await showCustomAlert('精简失败', `发生错误: ${error.message}`);
            return null;
        }
    }

    async function handleConciseSummary(timestamp) {
        const chat = state.chats[state.activeChatId];
        const summary = chat.history.find((msg) => msg.timestamp === timestamp);
        if (!summary) return;

        await showCustomAlert('请稍候...', 'AI正在努力为您精简内容...');

        const conciseText = await generateConciseSummary(summary.content);

        if (conciseText) {
            summary.content = conciseText.trim();
            await db.chats.put(chat);
            await openSummaryViewer();
            await showCustomAlert('成功', '本条总结已精简！');
        }
    }

    async function handleConciseAllSummaries() {
        const chat = state.chats[state.activeChatId];
        const summaries = chat.history.filter((msg) => msg.type === 'summary');

        if (summaries.length === 0) {
            alert('没有可以精简的总结。');
            return;
        }

        const confirmed = await showCustomConfirm('确认全部精简', `确定要精简全部 ${summaries.length} 条总结吗？此操作会覆盖原始内容且不可恢复。`, { confirmButtonClass: 'btn-danger' });
        if (!confirmed) return;

        await showCustomAlert('请稍候...', `正在批量精简 ${summaries.length} 条总结，这可能需要一些时间...`);

        try {
            for (const summary of summaries) {
                const conciseText = await generateConciseSummary(summary.content);
                if (conciseText) {
                    summary.content = conciseText.trim();
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            await db.chats.put(chat);
            await openSummaryViewer();
            await showCustomAlert('成功', '所有总结都已精简完毕！');
        } catch (error) {
            console.error('批量精简时出错:', error);
        }
    }

    async function triggerManualSummaryNow(mode = 'latest', range = null) {
        if (isSummarizing) {
            alert('正在处理上一个总结任务，请稍候...');
            return;
        }

        const chat = state.chats[state.activeChatId];
        if (!chat) {
            alert('错误：找不到当前聊天，无法总结。');
            return;
        }

        isSummarizing = true;

        try {
            let messagesToSummarize = [];

            if (mode === 'latest') {
                const summarySettings = chat.settings.summary;
                const count = summarySettings && summarySettings.count > 0 ? summarySettings.count : 20;
                messagesToSummarize = chat.history.slice(-count);
                console.log(`手动总结最新 ${count} 条消息...`);
            } else if (mode === 'range' && range) {
                messagesToSummarize = chat.history.slice(range.start - 1, range.end);
                console.log(`手动总结从 ${range.start} 到 ${range.end} 的消息...`);
            } else {
                throw new Error('无效的总结模式或范围。');
            }

            if (messagesToSummarize.length === 0) {
                alert('选定的范围内没有可总结的聊天记录。');
                isSummarizing = false;
                return;
            }

            const summaryText = await generateSummary(state.activeChatId, messagesToSummarize);

            if (summaryText) {
                await saveSummaryAsMemory(state.activeChatId, summaryText);
                await showCustomAlert('总结完成', '新的对话记忆已生成！');
                if (document.getElementById('summary-viewer-modal').classList.contains('visible')) {
                    openSummaryViewer();
                }
            }
        } catch (e) {
            console.error('手动总结过程中发生未捕获的错误:', e);
            await showCustomAlert('错误', '手动总结时发生错误，详情请查看控制台。');
        } finally {
            isSummarizing = false;
        }
    }

    async function openManualSummaryOptions() {
        const choice = await showChoiceModal('手动总结', [
            { text: '总结最新内容', value: 'latest' },
            { text: '总结指定范围', value: 'range' },
        ]);

        if (choice === 'latest') {
            await triggerManualSummaryNow('latest');
        } else if (choice === 'range') {
            await promptForSummaryRange();
        }
    }

    async function promptForSummaryRange() {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const totalMessages = chat.history.length;
        if (totalMessages === 0) {
            alert('聊天记录为空，无法进行总结。');
            return;
        }

        const startStr = await showCustomPrompt('指定范围', `请输入开始的消息序号 (1 - ${totalMessages})`, '1', 'number');
        if (startStr === null) return;

        const startNum = parseInt(startStr);
        if (isNaN(startNum) || startNum < 1 || startNum > totalMessages) {
            alert('请输入有效的开始序号。');
            return;
        }

        const endStr = await showCustomPrompt('指定范围', `请输入结束的消息序号 (${startNum} - ${totalMessages})`, totalMessages, 'number');
        if (endStr === null) return;

        const endNum = parseInt(endStr);
        if (isNaN(endNum) || endNum < startNum || endNum > totalMessages) {
            alert('请输入有效的结束序号。');
            return;
        }

        await triggerManualSummaryNow('range', { start: startNum, end: endNum });
    }

    const SYMBOL_THRESHOLDS = [
        {
            id: 'spark_starter',
            level: 100,
            symbol: 'https://i.postimg.cc/tCRF21C6/3F858229F806087E5A5A9031C588147E.png',
            name: '初识之火',
            description: '这是火花开始的地方，一段新关系的萌芽。',
        },
        {
            id: 'shining_star',
            level: 300,
            symbol: 'https://i.postimg.cc/pd5WwXyP/3C35C33475985C1C85A3F70D26786D74.png',
            name: '星光闪烁',
            description: '你们的关系像星光一样开始闪耀。',
        },
        {
            id: 'burning_passion',
            level: 700,
            symbol: 'https://i.postimg.cc/yNQcnRvT/BD0C0CC3C6692D736014BACE73C07F8E.png',
            name: '热情如火',
            description: '每一次互动都让感情升温。',
        },
        {
            id: 'only_crown',
            level: 1500,
            symbol: 'https://i.postimg.cc/B6jDzvVh/92DD1E30EFEEC589E3BE0FFB630F8B4E.png',
            name: '唯一王冠',
            description: '在彼此的世界里，对方是独一无二的存在。',
        },
        {
            id: 'eternal_diamond',
            level: 5000,
            symbol: 'https://i.postimg.cc/C1RD2KQc/B0E2B3034728540DA4198357D5B8131C.png',
            name: '永恒之钻',
            description: '你们的关系如钻石般坚固而璀璨。',
        },
    ];

    function calculateIntimacy(chat) {
        if (!chat || !chat.settings.streak) return 0;
        const streakDays = chat.settings.streak.currentDays || 0;
        const streakScore = streakDays * 15;
        const stats = chat.interactionStats || {};
        const totalMessages = Object.values(stats).reduce((sum, count) => sum + count, 0);
        const messageScore = totalMessages * 0.2;
        const intimacy = streakScore + messageScore;
        return Math.floor(intimacy);
    }

    async function checkAndUnlockSymbols(chat, intimacyValue) {
        let newUnlock = false;
        if (!chat.unlockedSymbols) chat.unlockedSymbols = [];

        SYMBOL_THRESHOLDS.forEach((threshold) => {
            if (intimacyValue >= threshold.level && !chat.unlockedSymbols.some((s) => s.symbol === threshold.symbol)) {
                chat.unlockedSymbols.push({
                    symbol: threshold.symbol,
                    name: threshold.name,
                    unlockedAt: Date.now(),
                });
                newUnlock = true;
                console.log(`徽章解锁！角色: ${chat.name}, 徽章: ${threshold.name}`);
            }
        });

        if (newUnlock) {
            await db.chats.put(chat);
            const latestUnlock = chat.unlockedSymbols[chat.unlockedSymbols.length - 1];
            await showCustomAlert('新徽章已解锁！', `恭喜你和“${chat.name}”解锁了新的亲密徽章：${latestUnlock.name}`);
        }
        return newUnlock;
    }

    async function openIntimacyPanel(chatId) {
        const chat = state.chats[chatId];
        if (!chat) return;

        const intimacyValue = calculateIntimacy(chat);
        await checkAndUnlockSymbols(chat, intimacyValue);

        document.getElementById('intimacy-score-display').textContent = intimacyValue;
        const today = new Date().toISOString().split('T')[0];
        const todayMsgs = chat.interactionStats?.[today] || 0;
        const totalMsgs = Object.values(chat.interactionStats || {}).reduce((sum, count) => sum + count, 0);
        document.getElementById('intimacy-streak-days').textContent = `${chat.settings.streak?.currentDays || 0} 天`;
        document.getElementById('intimacy-today-msgs').textContent = `${todayMsgs} 条`;
        document.getElementById('intimacy-total-msgs').textContent = `${totalMsgs} 条`;

        const symbolListContainer = document.getElementById('symbol-list-container');
        symbolListContainer.innerHTML = '';

        const noneItem = document.createElement('div');
        noneItem.className = 'symbol-item unlocked';
        if (!chat.settings.selectedIntimacyBadge) {
            noneItem.classList.add('selected');
        }
        noneItem.innerHTML = `<div class="symbol-icon no-badge">🚫</div><div class="symbol-name">不佩戴</div>`;
        noneItem.onclick = () => selectIntimacyBadge(chatId, '');
        symbolListContainer.appendChild(noneItem);

        SYMBOL_THRESHOLDS.forEach((threshold) => {
            const isUnlocked = intimacyValue >= threshold.level;
            const isSelected = chat.settings.selectedIntimacyBadge === threshold.symbol;

            const item = document.createElement('div');
            item.className = `symbol-item ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}`;

            item.innerHTML = `
			            <div class="symbol-icon ${!isUnlocked ? 'not-unlocked' : ''}">
			                <img src="${threshold.symbol}" alt="${threshold.name}">
			            </div>
			            <div class="symbol-name">${threshold.name}</div>
			            <div class="symbol-level">${isUnlocked ? '已解锁' : `${threshold.level}分解锁`}</div>
			        `;

            if (isUnlocked) {
                item.onclick = () => selectIntimacyBadge(chatId, threshold.symbol);
            }

            symbolListContainer.appendChild(item);
        });

        const recordsContainer = document.getElementById('unlocked-symbols-record');
        recordsContainer.innerHTML = '';
        if (chat.unlockedSymbols && chat.unlockedSymbols.length > 0) {
            const sortedRecords = [...chat.unlockedSymbols].sort((a, b) => b.unlockedAt - a.unlockedAt);
            sortedRecords.forEach((record) => {
                const recordItem = document.createElement('div');
                recordItem.className = 'record-item';
                recordItem.innerHTML = `<span class="symbol"><img src="${record.symbol}" style="height:1em; vertical-align:middle;"></span><span>${record.name}</span><span class="date">${new Date(record.unlockedAt).toLocaleDateString()}</span>`;
                recordsContainer.appendChild(recordItem);
            });
        } else {
            recordsContainer.innerHTML = '<p style="text-align:center; color:#999; font-size:13px;">暂无已解锁的徽章</p>';
        }

        document.getElementById('intimacy-panel').classList.add('visible');
    }

    async function selectIntimacyBadge(chatId, symbol) {
        const chat = state.chats[chatId];
        if (!chat) return;

        chat.settings.selectedIntimacyBadge = symbol;

        await db.chats.put(chat);
        await openIntimacyPanel(chatId);
        await renderChatList();
    }

    window.incrementMessageCount = incrementMessageCount;
    async function incrementMessageCount(chatId) {
        const chat = state.chats[chatId];
        if (!chat || chat.isGroup) return;

        const today = new Date().toISOString().split('T')[0];

        if (!chat.interactionStats) {
            chat.interactionStats = {};
        }

        chat.interactionStats[today] = (chat.interactionStats[today] || 0) + 1;

        await db.chats.put(chat);
    }

    // --- Event Listeners for Moved Functions ---

    const offlinePresetSelect = document.getElementById('offline-preset-select');
    if (offlinePresetSelect) offlinePresetSelect.addEventListener('change', handleOfflinePresetSelection);

    const manageOfflinePresetsBtn = document.getElementById('manage-offline-presets-btn');
    if (manageOfflinePresetsBtn) manageOfflinePresetsBtn.addEventListener('click', openOfflinePresetManager);

    const viewSummariesBtn = document.getElementById('view-summaries-btn');
    if (viewSummariesBtn) viewSummariesBtn.addEventListener('click', openSummaryViewer);

    const closeSummaryViewerBtn = document.getElementById('close-summary-viewer-btn');
    if (closeSummaryViewerBtn) {
        closeSummaryViewerBtn.addEventListener('click', () => {
            document.getElementById('summary-viewer-modal').classList.remove('visible');
            document.getElementById('chat-settings-btn').click();
        });
    }

    const summaryList = document.getElementById('summary-list');
    if (summaryList) {
        summaryList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-summary-btn');
            if (editBtn) {
                const timestamp = parseInt(editBtn.dataset.timestamp);
                editSummary(timestamp);
                return;
            }

            const deleteBtn = e.target.closest('.delete-summary-btn');
            if (deleteBtn) {
                const timestamp = parseInt(deleteBtn.dataset.timestamp);
                deleteSummary(timestamp);
                return;
            }

            const conciseBtn = e.target.closest('.concise-summary-btn');
            if (conciseBtn) {
                const timestamp = parseInt(conciseBtn.dataset.timestamp);
                handleConciseSummary(timestamp);
                return;
            }
        });
    }

    const conciseAllSummariesBtn = document.getElementById('concise-all-summaries-btn');
    if (conciseAllSummariesBtn) conciseAllSummariesBtn.addEventListener('click', handleConciseAllSummaries);

    const openIntimacyPanelBtn = document.getElementById('open-intimacy-panel-btn');
    if (openIntimacyPanelBtn) openIntimacyPanelBtn.addEventListener('click', () => openIntimacyPanel(state.activeChatId));

    // --- Moved from main-app.js: Visual Settings, Frame Manager, Bubble Presets ---

    let currentFrameSelection = { type: null, url: '', target: null };

    // Visual Preview Updater
    function updateSettingsPreview() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        const previewArea = document.getElementById('settings-preview-area');
        if (!previewArea) return;

        const selectedTheme = document.querySelector('input[name="theme-select"]:checked')?.value || 'default';
        const fontSize = document.getElementById('font-size-slider').value;
        const customCss = document.getElementById('custom-css-input').value;
        const background = chat.settings.background;

        previewArea.dataset.theme = selectedTheme;
        previewArea.style.setProperty('--chat-font-size', `${fontSize}px`);

        if (background && background.startsWith('data:image')) {
            previewArea.style.backgroundImage = `url(${background})`;
            previewArea.style.backgroundColor = 'transparent';
        } else {
            previewArea.style.backgroundImage = 'none';
            previewArea.style.background = background || '#f0f2f5';
        }

        previewArea.innerHTML = '';

        // Create mock messages for preview
        const aiMsg = { role: 'ai', content: '对方消息预览', timestamp: 1, senderName: chat.name };
        const aiBubble = window.createMessageElement(aiMsg, chat);
        if (aiBubble) previewArea.appendChild(aiBubble);

        const userMsg = { role: 'user', content: '我的消息预览', timestamp: 2 };
        const userBubble = window.createMessageElement(userMsg, chat);
        if (userBubble) previewArea.appendChild(userBubble);

        // Use dependency applyScopedCss
        applyScopedCss(customCss, '#settings-preview-area', 'preview-bubble-style');
    }

    // --- Avatar Frame Logic ---

    async function openFrameSelectorModal(type, targetId = null) {
        const grid = document.getElementById('avatar-frame-grid');
        grid.innerHTML = '';

        currentFrameSelection.type = type;
        currentFrameSelection.target = targetId;

        const chat = state.chats[state.activeChatId];
        let currentFrameUrl = '';
        let previewAvatarUrl = '';

        if (type === 'char-weibo') {
            const pid = window.currentViewingWeiboProfileId;
            if (pid && state.chats[pid]) {
                const charChat = state.chats[pid];
                currentFrameUrl = charChat.settings.weiboAvatarFrame || '';
                previewAvatarUrl = charChat.settings.weiboAvatar || defaultAvatar;
            }
        } else if (type === 'home_profile') {
            currentFrameUrl = state.globalSettings.homeAvatarFrame || '';
            previewAvatarUrl = document.getElementById('profile-avatar-img') ? document.getElementById('profile-avatar-img').src : defaultAvatar;
        } else if (type === 'weibo_profile') {
            currentFrameUrl = state.qzoneSettings.weiboAvatarFrame || '';
            previewAvatarUrl = state.qzoneSettings.weiboAvatar || defaultAvatar;
        } else if (type === 'ai') {
            currentFrameUrl = chat.settings.aiAvatarFrame || '';
            previewAvatarUrl = chat.settings.aiAvatar || defaultAvatar;
        } else if (type === 'my') {
            currentFrameUrl = chat.settings.myAvatarFrame || '';
            previewAvatarUrl = chat.settings.myAvatar || defaultAvatar;
        } else if (type === 'member' && targetId) {
            const member = chat.members.find((m) => m.id === targetId);
            if (member) {
                currentFrameUrl = member.avatarFrame || '';
                previewAvatarUrl = member.avatar || defaultGroupMemberAvatar;
            }
        }

        const customFrames = await db.customAvatarFrames.toArray();
        const builtInFrames = window.avatarFrames || [];

        const frameUrlSet = new Set();
        const allFrames = [...builtInFrames, ...customFrames].filter((frame) => {
            if (!frame.url || !frameUrlSet.has(frame.url)) {
                frameUrlSet.add(frame.url);
                return true;
            }
            return false;
        });

        allFrames.forEach((frame) => {
            const item = createFrameItem(frame, previewAvatarUrl);
            if (currentFrameUrl === frame.url) {
                item.classList.add('selected');
                currentFrameSelection.url = frame.url;
            }
            grid.appendChild(item);
        });

        document.getElementById('avatar-frame-modal').classList.add('visible');
    }

    function createFrameItem(frame, previewAvatarSrc) {
        const item = document.createElement('div');
        item.className = 'frame-item';
        item.title = frame.name;
        item.innerHTML = `
			        <img src="${previewAvatarSrc}" class="preview-avatar">
			        ${frame.url ? `<img src="${frame.url}" class="preview-frame" style="pointer-events: none;">` : ''}
			    `;
        item.addEventListener('click', () => {
            document.querySelectorAll('#avatar-frame-grid .frame-item').forEach((el) => el.classList.remove('selected'));
            item.classList.add('selected');
            currentFrameSelection.url = frame.url;
        });
        return item;
    }

    async function saveSelectedFrames() {
        const { type, url, target } = currentFrameSelection;

        if (type === 'char-weibo') {
            const pid = window.currentViewingWeiboProfileId;
            if (pid && state.chats[pid]) {
                const charChat = state.chats[pid];
                charChat.settings.weiboAvatarFrame = url;
                await db.chats.put(charChat);
                if (window.renderWeiboCharProfile) window.renderWeiboCharProfile(pid);
            }
        } else if (type === 'home_profile') {
            if (!state.globalSettings) state.globalSettings = {};
            state.globalSettings.homeAvatarFrame = url;
            await db.globalSettings.put(state.globalSettings);
            if (window.renderHomeScreenProfileFrame) window.renderHomeScreenProfileFrame();
        } else if (type === 'weibo_profile') {
            if (!state.qzoneSettings) state.qzoneSettings = {};
            state.qzoneSettings.weiboAvatarFrame = url;
            if (window.saveQzoneSettings) await window.saveQzoneSettings();
            if (window.renderWeiboProfile) await window.renderWeiboProfile();
        }
        else {
            const chat = state.chats[state.activeChatId];
            if (!chat) return;

            if (type === 'ai') {
                chat.settings.aiAvatarFrame = url;
            } else if (type === 'my') {
                chat.settings.myAvatarFrame = url;
            } else if (type === 'member' && target) {
                const member = chat.members.find((m) => m.id === target);
                if (member) member.avatarFrame = url;
            }
        }
        document.getElementById('avatar-frame-modal').classList.remove('visible');
    }

    function openFrameManager() {
        renderFrameManager();
        document.getElementById('custom-frame-manager-modal').classList.add('visible');
    }

    async function renderFrameManager() {
        const grid = document.getElementById('custom-frame-grid');
        grid.innerHTML = '';
        const customFrames = await db.customAvatarFrames.toArray();
        if (customFrames.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">你还没有上传过头像框哦~</p>';
            return;
        }
        customFrames.forEach((frame) => {
            const item = document.createElement('div');
            item.className = 'sticker-item';
            item.style.backgroundImage = `url(${frame.url})`;
            item.title = frame.name;

            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await showCustomConfirm('删除头像框', `确定要删除“${frame.name}”吗？`, {
                    confirmButtonClass: 'btn-danger',
                });
                if (confirmed) {
                    await db.customAvatarFrames.delete(frame.id);
                    renderFrameManager();
                }
            };
            item.appendChild(deleteBtn);
            grid.appendChild(item);
        });
    }

    function handleUploadCustomFrame() {
        let uploadBtn = document.getElementById('custom-frame-upload-input');
        if (!uploadBtn) return;

        const newUploadBtn = uploadBtn.cloneNode(true);
        if (uploadBtn.parentNode) uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
        uploadBtn = newUploadBtn;

        uploadBtn.addEventListener(
            'change',
            async (event) => {
                const files = event.target.files;
                if (!files.length) return;

                const newFrames = [];

                for (const file of files) {
                    const fileName = file.name.replace(/\.[^/.]+$/, '').substring(0, 8);
                    const autoName = `${fileName}_${Date.now()}`;

                    const base64Url = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });

                    newFrames.push({
                        id: 'frame_' + (Date.now() + newFrames.length),
                        name: autoName,
                        url: base64Url,
                    });
                }

                if (newFrames.length > 0) {
                    await db.customAvatarFrames.bulkAdd(newFrames);
                    renderFrameManager();
                    await showCustomAlert('上传成功', `已成功添加 ${newFrames.length} 个新头像框！`);
                }

                event.target.value = null;
            }
        );

        uploadBtn.click();
    }

    // --- Bubble Preset Logic ---

    function renderBubblePresetSelector() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const customCssInput = document.getElementById('custom-css-input');

        selectEl.innerHTML = '<option value="">-- 无预设 --</option>';

        if (state.bubbleStylePresets) {
            state.bubbleStylePresets.forEach((preset) => {
                const option = document.createElement('option');
                option.value = preset.id;
                option.textContent = preset.name;
                selectEl.appendChild(option);
            });
        }

        const currentCss = customCssInput.value.trim();
        const matchingPreset = state.bubbleStylePresets ? state.bubbleStylePresets.find((p) => p.css.trim() === currentCss) : null;

        if (matchingPreset) {
            selectEl.value = matchingPreset.id;
        } else {
            selectEl.value = '';
        }
    }

    function handlePresetSelectChange() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const customCssInput = document.getElementById('custom-css-input');
        const selectedId = parseInt(selectEl.value);

        if (selectedId && state.bubbleStylePresets) {
            const selectedPreset = state.bubbleStylePresets.find((p) => p.id === selectedId);
            if (selectedPreset) {
                customCssInput.value = selectedPreset.css;
            }
        }
        updateSettingsPreview();
    }

    async function openBubblePresetManager() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const selectedId = parseInt(selectEl.value);
        const selectedPreset = state.bubbleStylePresets ? state.bubbleStylePresets.find((p) => p.id === selectedId) : null;

        const modal = document.getElementById('preset-actions-modal');
        const footer = modal.querySelector('.custom-modal-footer');

        footer.innerHTML = `
			        <button id="preset-action-save-new">保存</button>
			        <button id="preset-action-update-current" ${!selectedPreset ? 'disabled' : ''}>更新</button>
			        <button id="preset-action-delete-current" class="btn-danger" ${!selectedPreset ? 'disabled' : ''}>删除</button>
			        <button id="preset-action-cancel" style="margin-top: 8px; border-radius: 8px; background-color: #f0f0f0;">取消</button>
			    `;

        document.getElementById('preset-action-save-new').addEventListener('click', saveCurrentCssAsPreset);
        if (selectedPreset) {
            document.getElementById('preset-action-update-current').addEventListener('click', () => updateSelectedPreset(selectedId));
            document.getElementById('preset-action-delete-current').addEventListener('click', () => deleteSelectedPreset(selectedId));
        }
        document.getElementById('preset-action-cancel').addEventListener('click', () => modal.classList.remove('visible'));

        modal.classList.add('visible');
    }

    async function saveCurrentCssAsPreset() {
        const customCssInput = document.getElementById('custom-css-input');
        const css = customCssInput.value.trim();
        if (!css) {
            alert('CSS内容不能为空！');
            return;
        }

        const name = await showCustomPrompt('保存预设', '请为这个气泡样式命名：');
        if (name && name.trim()) {
            const newPreset = { name: name.trim(), css: css };
            const newId = await db.bubbleStylePresets.add(newPreset);

            if (!state.bubbleStylePresets) state.bubbleStylePresets = [];
            state.bubbleStylePresets.push({ id: newId, ...newPreset });

            renderBubblePresetSelector();
            document.getElementById('bubble-style-preset-select').value = newId;
            document.getElementById('preset-actions-modal').classList.remove('visible');
            await showCustomAlert('成功', `预设 "${name.trim()}" 已保存！`);
        }
    }

    async function updateSelectedPreset(presetId) {
        const customCssInput = document.getElementById('custom-css-input');
        const css = customCssInput.value.trim();

        const preset = state.bubbleStylePresets.find((p) => p.id === presetId);
        if (preset) {
            preset.css = css;
            await db.bubbleStylePresets.put(preset);
            document.getElementById('preset-actions-modal').classList.remove('visible');
            await showCustomAlert('成功', `预设 "${preset.name}" 已更新！`);
        }
    }

    async function deleteSelectedPreset(presetId) {
        const preset = state.bubbleStylePresets.find((p) => p.id === presetId);
        if (preset) {
            const confirmed = await showCustomConfirm('确认删除', `确定要删除预设 "${preset.name}" 吗？`, {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                await db.bubbleStylePresets.delete(presetId);
                state.bubbleStylePresets = state.bubbleStylePresets.filter((p) => p.id !== presetId);

                renderBubblePresetSelector();
                document.getElementById('custom-css-input').value = '';
                updateSettingsPreview();

                document.getElementById('preset-actions-modal').classList.remove('visible');
                await showCustomAlert('成功', '预设已删除。');
            }
        }
    }

    async function exportSelectedBubblePreset() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const selectedId = parseInt(selectEl.value);

        if (!selectedId) {
            alert('请先从下拉框中选择一个要导出的预设。');
            return;
        }

        const preset = await db.bubbleStylePresets.get(selectedId);
        if (!preset) {
            alert('找不到选中的预设。');
            return;
        }

        const exportData = {
            presetName: preset.name,
            presetCss: preset.css,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `[EPhone气泡]${preset.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importBubblePreset(file) {
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const customCssInput = document.getElementById('custom-css-input');

        if (fileName.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                if (window.mammoth) {
                    window.mammoth
                        .extractRawText({ arrayBuffer: e.target.result })
                        .then(function (result) {
                            customCssInput.value = result.value;
                            updateSettingsPreview();
                            alert('已从Word提取CSS代码到输入框！(请点击“保存”以存为预设)');
                        })
                        .catch(function (err) {
                            alert('读取Word文件失败');
                        });
                } else {
                    alert('Mammoth library not loaded.');
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        if (fileName.endsWith('.txt') || fileName.endsWith('.css')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                customCssInput.value = e.target.result;
                updateSettingsPreview();
                alert('已读取CSS代码到输入框！(请点击“保存”以存为预设)');
            };
            reader.readAsText(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.presetName && typeof data.presetCss !== 'undefined') {
                    const newPreset = {
                        name: `${data.presetName} (导入)`,
                        css: data.presetCss,
                    };
                    const newId = await db.bubbleStylePresets.add(newPreset);

                    if (!state.bubbleStylePresets) state.bubbleStylePresets = [];
                    state.bubbleStylePresets.push({ id: newId, ...newPreset });

                    renderBubblePresetSelector();
                    document.getElementById('bubble-style-preset-select').value = newId;
                    handlePresetSelectChange();
                    await showCustomAlert('导入成功', `气泡预设 "${newPreset.name}" 已成功导入！`);
                } else {
                    customCssInput.value = e.target.result;
                    updateSettingsPreview();
                    alert('JSON格式不是标准预设，已将内容填入输入框。');
                }
            } catch (error) {
                customCssInput.value = e.target.result;
                updateSettingsPreview();
                alert('已将文件内容填入输入框。');
            }
        };
        reader.readAsText(file);
    }

    // Bind new listeners
    const manageFramesBtn = document.getElementById('manage-custom-frames-btn');
    if (manageFramesBtn) {
        const newBtn = manageFramesBtn.cloneNode(true);
        if (manageFramesBtn.parentNode) manageFramesBtn.parentNode.replaceChild(newBtn, manageFramesBtn);
        newBtn.addEventListener('click', () => {
            document.getElementById('avatar-frame-modal').classList.remove('visible');
            openFrameManager();
        });
    }

    const cancelFrameBtn = document.getElementById('cancel-frame-settings-btn');
    if (cancelFrameBtn) {
        const newBtn = cancelFrameBtn.cloneNode(true);
        if (cancelFrameBtn.parentNode) cancelFrameBtn.parentNode.replaceChild(newBtn, cancelFrameBtn);
        newBtn.addEventListener('click', () => document.getElementById('avatar-frame-modal').classList.remove('visible'));
    }

    const saveFrameBtn = document.getElementById('save-frame-settings-btn');
    if (saveFrameBtn) {
        const newBtn = saveFrameBtn.cloneNode(true);
        if (saveFrameBtn.parentNode) saveFrameBtn.parentNode.replaceChild(newBtn, saveFrameBtn);
        newBtn.addEventListener('click', saveSelectedFrames);
    }

    const uploadFrameBtn = document.getElementById('upload-custom-frame-btn');
    if (uploadFrameBtn) {
        const newBtn = uploadFrameBtn.cloneNode(true);
        if (uploadFrameBtn.parentNode) uploadFrameBtn.parentNode.replaceChild(newBtn, uploadFrameBtn);
        newBtn.addEventListener('click', handleUploadCustomFrame);
    }

    const closeFrameManagerBtn = document.getElementById('close-frame-manager-btn');
    if (closeFrameManagerBtn) {
        const newBtn = closeFrameManagerBtn.cloneNode(true);
        if (closeFrameManagerBtn.parentNode) closeFrameManagerBtn.parentNode.replaceChild(newBtn, closeFrameManagerBtn);
        newBtn.addEventListener('click', () => {
            document.getElementById('custom-frame-manager-modal').classList.remove('visible');
            openFrameSelectorModal(currentFrameSelection.type, currentFrameSelection.target);
        });
    }

    // Expose functions required by main-app.js or other modules
    window.openFrameSelectorModal = openFrameSelectorModal;
    window.renderBubblePresetSelector = renderBubblePresetSelector;
    window.updateSettingsPreview = updateSettingsPreview;

    /* ==========================================================================
       Voice & Video Logic (Moved completely from main-app.js)
       ========================================================================== */

    /**
     * 播放来电铃声
     */
    window.playRingtone = function playRingtone() {
        const ringtonePlayer = document.getElementById('ringtone-player');
        // 优先使用用户在设置中保存的URL，如果没设置，就用我们预设的URL
        const ringtoneUrl = state.globalSettings.ringtoneUrl || 'https://files.catbox.moe/3w7gla.mp3';

        if (ringtonePlayer && ringtoneUrl) {
            ringtonePlayer.src = ringtoneUrl;
            // play() 返回一个 Promise，我们最好用 try...catch 包裹以防止浏览器报错
            const playPromise = ringtonePlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error('铃声播放失败:', error);
                    // 可以在这里给用户一个静音提示，如果需要的话
                });
            }
        }
    }

    /**
     * 停止并重置来电铃声
     */
    window.stopRingtone = function stopRingtone() {
        const ringtonePlayer = document.getElementById('ringtone-player');
        if (ringtonePlayer) {
            ringtonePlayer.pause();
            ringtonePlayer.currentTime = 0; // 将播放进度重置到开头
        }
    }

    /**
     * 播放消息提示音，增加健壮性
     */
    function playNotificationSound() {
        const soundUrl = state.globalSettings.notificationSoundUrl || 'https://laddy-lulu.github.io/Ephone-stuffs/message.mp3';

        // 1. 增加安全检查：如果链接为空，直接返回，不执行任何操作
        if (!soundUrl || !soundUrl.trim()) return;

        try {
            const audio = new Audio(soundUrl);
            audio.volume = 0.7;

            audio.play().catch((error) => {
                // 2. 优化错误提示，现在能更准确地反映问题
                if (error.name === 'NotAllowedError') {
                    console.warn('播放消息提示音失败：用户需要先与页面进行一次交互（如点击）才能自动播放音频。');
                } else {
                    // 对于其他错误（比如我们这次遇到的），直接打印错误详情
                    console.error(`播放消息提示音失败 (${error.name}): ${error.message}`, 'URL:', soundUrl);
                }
            });
        } catch (error) {
            console.error('创建提示音Audio对象时出错:', error);
        }
    }

    // 音频上下文解锁函数
    function unlockAudioContext() {
        const ringtonePlayer = document.getElementById('ringtone-player');
        // 检查播放器是否处于暂停状态，并且我们之前没有成功播放过
        if (ringtonePlayer && ringtonePlayer.paused) {
            // 尝试播放，然后立刻暂停。
            // 这个操作对用户是无感知的，但能告诉浏览器用户已与音频交互。
            ringtonePlayer.play().catch(() => { }); // play() 会返回一个 Promise，我们忽略任何可能发生的错误
            ringtonePlayer.pause();
            console.log("Ringtone audio context unlocked.");
        }
    }

    // Expose needed internal functions globally if they weren't already
    // (playRingtone/stopRingtone are already attached to window above)
    window.playNotificationSound = playNotificationSound;
    window.unlockAudioContext = unlockAudioContext;

    // --- Listeners for Voice & Video Settings ---
    const phoneScreen = document.getElementById('phone-screen');
    if (phoneScreen) {
        // Using 'once' option, so we need to be careful not to re-bind if already bound, 
        // but since we are moving logic, we assume main-app.js will stop binding it.
        phoneScreen.addEventListener('click', unlockAudioContext, { once: true });
    }

    const ringtoneInput = document.getElementById('ringtone-url-input');
    if (ringtoneInput) {
        // Remove old listeners by cloning
        const newRingtoneInput = ringtoneInput.cloneNode(true);
        if (ringtoneInput.parentNode) ringtoneInput.parentNode.replaceChild(newRingtoneInput, ringtoneInput);
        newRingtoneInput.addEventListener('change', async (e) => {
            state.globalSettings.ringtoneUrl = e.target.value;
            await db.globalSettings.put(state.globalSettings);
            // We can maybe play a preview here if desired, but original logic didn't seem to have it explicitly in the snippet I saw.
        });
    }

    const notifInput = document.getElementById('notification-sound-url-input');
    if (notifInput) {
        const newNotifInput = notifInput.cloneNode(true);
        if (notifInput.parentNode) notifInput.parentNode.replaceChild(newNotifInput, notifInput);
        newNotifInput.addEventListener('change', async (e) => {
            state.globalSettings.notificationSoundUrl = e.target.value;
            await db.globalSettings.put(state.globalSettings);
        });
    }

    // --- Visual Beautification (Inner Voice & Weibo Profile) - Moved from main-app.js ---

    /**
     * 当用户点击“更换背景”按钮时，弹出操作菜单
     */
    async function handleInnerVoiceBgChange() {
        const choice = await showChoiceModal('更换心声背景', [
            { text: '上传新背景', value: 'upload' },
            { text: '恢复默认', value: 'reset' },
        ]);

        if (choice === 'upload') {
            // 触发隐藏的文件选择器
            const input = document.getElementById('inner-voice-bg-input');
            if (input) input.click();
        } else if (choice === 'reset') {
            // 调用保存函数并传入空字符串，表示恢复默认
            await saveInnerVoiceBackground('');
        }
    }

    /**
     * 保存新的背景图片URL到【当前角色】
     * @param {string} url - 图片的URL (可以是网络链接或Base64)
     */
    async function saveInnerVoiceBackground(url) {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 1. 将背景URL保存在当前角色的数据中
        chat.innerVoiceBackground = url;

        // 2. 将更新后的整个 chat 对象保存回数据库
        await db.chats.put(chat);

        // 3. 立即应用新的背景
        applyInnerVoiceBackground(url);

        // 4. 给用户一个反馈
        alert(url ? '当前角色背景已更新！' : '当前角色背景已恢复默认。');
    }

    /**
     * 将指定的背景图应用到心声面板上
     * @param {string} url - 图片的URL
     */
    function applyInnerVoiceBackground(url) {
        const panel = document.getElementById('inner-voice-main-panel');
        if (!panel) return;

        if (url) {
            panel.style.backgroundImage = `url(${url})`;
        } else {
            // 如果URL为空，就移除背景图，恢复CSS中定义的默认样式
            panel.style.backgroundImage = 'none';
        }
    }

    // --- Init Listeners for Visual Beautification ---

    // 1. 角色微博编辑弹窗监听
    const charWeiboModal = document.getElementById('char-weibo-editor-modal');
    if (charWeiboModal) {
        const newCharWeiboModal = charWeiboModal.cloneNode(true);
        if (charWeiboModal.parentNode) charWeiboModal.parentNode.replaceChild(newCharWeiboModal, charWeiboModal);

        newCharWeiboModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('change-frame-btn')) {
                const type = e.target.dataset.type;
                const targetId = window.currentViewingWeiboProfileId || currentViewingWeiboProfileId;
                openFrameSelectorModal(type, targetId);
            }
            else if (e.target.id === 'cancel-char-weibo-editor-btn') {
                newCharWeiboModal.classList.remove('visible');
            }
            else if (e.target.id === 'save-char-weibo-editor-btn') {
                if (typeof saveCharWeiboProfile === 'function') {
                    saveCharWeiboProfile();
                } else if (typeof window.saveCharWeiboProfile === 'function') {
                    window.saveCharWeiboProfile();
                }
            }
        });
    }

    // 2. 角色微博图片上传
    if (typeof setupFileUpload === 'function') {
        setupFileUpload('char-weibo-editor-avatar-input', (base64) => {
            const el = document.getElementById('char-weibo-editor-avatar-preview');
            if (el) el.src = base64;
        });
        setupFileUpload('char-weibo-editor-bg-input', (base64) => {
            const el = document.getElementById('char-weibo-editor-bg-preview');
            if (el) el.src = base64;
        });
    }

    // 3. 心声背景更换监听
    const changeInnerVoiceBgBtn = document.getElementById('change-inner-voice-bg-btn');
    if (changeInnerVoiceBgBtn) {
        const newBtn = changeInnerVoiceBgBtn.cloneNode(true);
        if (changeInnerVoiceBgBtn.parentNode) changeInnerVoiceBgBtn.parentNode.replaceChild(newBtn, changeInnerVoiceBgBtn);
        newBtn.addEventListener('click', handleInnerVoiceBgChange);
    }

    const innerVoiceBgInput = document.getElementById('inner-voice-bg-input');
    if (innerVoiceBgInput) {
        const newInput = innerVoiceBgInput.cloneNode(true);
        if (innerVoiceBgInput.parentNode) innerVoiceBgInput.parentNode.replaceChild(newInput, innerVoiceBgInput);

        newInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            await saveInnerVoiceBackground(dataUrl);
            event.target.value = null;
        });
    }

    // Expose functions to window for global usage (e.g. main-app.js needs applyInnerVoiceBackground)
    window.handleInnerVoiceBgChange = handleInnerVoiceBgChange;
    window.saveInnerVoiceBackground = saveInnerVoiceBackground;
    window.applyInnerVoiceBackground = applyInnerVoiceBackground;

    // --- Member Management Event Listeners ---

    const memberManagementList = document.getElementById('member-management-list');
    if (memberManagementList) {
        const newList = memberManagementList.cloneNode(true);
        memberManagementList.parentNode.replaceChild(newList, memberManagementList);

        newList.addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;

            const action = button.dataset.action;
            const memberId = button.dataset.memberId;

            if (!action || !memberId) return;

            if (memberId === 'user') {
                if (action === 'set-nickname') handleSetUserNickname();
                if (action === 'set-title') handleSetUserTitle();
                if (action === 'unmute-self') handleUserUnmute();
                return;
            }

            switch (action) {
                case 'toggle-admin': handleToggleAdmin(memberId); break;
                case 'set-title': handleSetMemberTitle(memberId); break;
                case 'transfer-owner': handleTransferOwnership(memberId); break;
                case 'remove-member': removeMemberFromGroup(memberId); break;
                case 'mute-member': handleMuteMember(memberId); break;
            }
        });
    }

    const backFromMemberBtn = document.getElementById('back-from-member-management');
    if (backFromMemberBtn) {
        // Clone to ensure clean slate
        const newBackBtn = backFromMemberBtn.cloneNode(true);
        backFromMemberBtn.parentNode.replaceChild(newBackBtn, backFromMemberBtn);

        newBackBtn.addEventListener('click', () => {
            // 先恢复底层聊天界面，再显示群设置弹窗，避免白屏
            if (window.showScreen) window.showScreen('chat-interface-screen');
            document.getElementById('chat-settings-modal').classList.add('visible');
        });
    }

    const addExistingContactBtn = document.getElementById('add-existing-contact-btn');
    if (addExistingContactBtn) {
        addExistingContactBtn.addEventListener('click', openContactPickerForAddMember);
    }

    const createNewMemberBtn = document.getElementById('create-new-member-btn');
    if (createNewMemberBtn) {
        createNewMemberBtn.addEventListener('click', createNewMemberInGroup);
    }


};

