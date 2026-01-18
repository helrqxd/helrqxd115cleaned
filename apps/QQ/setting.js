
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
        updateSettingsPreview,
        renderBubblePresetSelector,
        handlePresetSelectChange,
        openBubblePresetManager,
        exportSelectedBubblePreset,
        importBubblePreset,
        renderOfflinePresetsSelector,
        openFrameSelectorModal,
        defaultAvatar,
        defaultGroupAvatar,
        defaultMyGroupAvatar,
        appendMessage,
        openCharStickerManager,
        openNpcManager,
        openManualSummaryOptions,
        openMemberManagementScreen,
        getEditingMemberId
    } = dependencies;

    // editingMemberId removed (state is managed in main-app.js)

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
                核心人设: '#FF6B6B',
                世界书: '#4ECDC4',
                表情包定义: '#FFD93D',
                '长期记忆(总结)': '#45B7D1',
                '短期记忆(用户)': '#96CEB4',
                '短期记忆(AI)': '#A8E6CF',
                系统格式指令: '#D4A5A5',
            };

            breakdown.forEach((item) => {
                if (item.count > 0) {
                    const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const color = colorMap[item.name] || '#ccc';
                    htmlContent += `
                <div style="margin-bottom: 6px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span>${item.name}</span>
                        <span style="color:#888;">${item.count} (${percent}%)</span>
                    </div>
                    <div style="width: 100%; background-color: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${percent}%; background-color: ${color}; height: 100%;"></div>
                    </div>
                </div>
            `;
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

            if (showMinimaxSpecificSettings) {
                // 加载 language_boost，如果不存在则默认为空（即"无"）
                langBoostSelect.value = chat.settings.language_boost || '';

                // 加载 speed，如果不存在则默认为 1.0
                const speed = chat.settings.speed ?? 1.0; // 使用 ?? 确保即使值为0也能正确处理
                speedSlider.value = speed;
                speedValueDisplay.textContent = parseFloat(speed).toFixed(1);
            }

            // 为语速滑块添加实时更新显示值的事件
            speedSlider.oninput = () => {
                speedValueDisplay.textContent = parseFloat(speedSlider.value).toFixed(1);
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
            chat.settings.language_boost = langBoost ? langBoost : null; // 如果选择"无"(value为空),则保存为null
            chat.settings.speed = parseFloat(document.getElementById('minimax-speed-slider').value);

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
        chat.settings.customTime = document.getElementById('custom-time-input').value;

        // --- 保存线下模式设置 ---
        if (!chat.settings.offlineMode) chat.settings.offlineMode = {}; // 初始化
        chat.settings.offlineMode.enabled = document.getElementById('offline-mode-toggle').checked;
        chat.settings.offlineMode.prompt = document.getElementById('offline-prompt-input').value.trim();
        chat.settings.offlineMode.style = document.getElementById('offline-style-input').value.trim();
        chat.settings.offlineMode.wordCount = parseInt(document.getElementById('offline-word-count-input').value) || 300;
        // 保存生图开关状态
        chat.settings.offlineMode.enableNovelAI = document.getElementById('offline-novelai-toggle').checked;

        // --- 保存聊天总结设置 ---
        if (!chat.settings.summary) chat.settings.summary = {}; // 初始化
        chat.settings.summary.enabled = document.getElementById('summary-toggle').checked;
        chat.settings.summary.mode = document.querySelector('input[name="summary-mode"]:checked').value;
        chat.settings.summary.count = parseInt(document.getElementById('summary-count-input').value) || 20;
        chat.settings.summary.prompt = document.getElementById('summary-prompt-input').value.trim();

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
};
