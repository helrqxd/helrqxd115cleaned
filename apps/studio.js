// studio.js

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // 1. 全局变量
    // ===================================================================
    let activeStudioScriptId = null;
    let activeStudioPlay = null;
    let currentSaveId = null;
    let editorCharacters = [];

    // ===================================================================
    // 1.5 多存档保存系统
    // ===================================================================
    const STUDIO_SAVES_KEY = 'studioPlaySaves';

    function getAllStudioSaves() {
        try {
            const saved = localStorage.getItem(STUDIO_SAVES_KEY);
            if (saved) return JSON.parse(saved);
            const legacySaved = localStorage.getItem('studioPlaySavedProgress');
            if (legacySaved) {
                const legacyData = JSON.parse(legacySaved);
                const migrated = [{
                    id: 'migrated_' + Date.now(),
                    scriptName: legacyData.script?.name || '未知剧本',
                    scriptId: legacyData.script?.id,
                    savedAt: Date.now(),
                    messageCount: legacyData.history?.filter(m => m.role !== 'system').length || 0,
                    playData: legacyData,
                }];
                localStorage.setItem(STUDIO_SAVES_KEY, JSON.stringify(migrated));
                localStorage.removeItem('studioPlaySavedProgress');
                return migrated;
            }
            return [];
        } catch (e) {
            console.error('加载小剧场存档失败:', e);
            return [];
        }
    }

    function buildPlaySnapshot() {
        if (!activeStudioPlay) return { error: new Error('无进行中的演绎') };
        const script = activeStudioPlay.script;
        if (script && script.id == null && activeStudioScriptId != null) {
            script.id = activeStudioScriptId;
        }
        try {
            const snapshot = JSON.parse(JSON.stringify(activeStudioPlay));
            if (snapshot.script && snapshot.script.id == null && activeStudioScriptId != null) {
                snapshot.script.id = activeStudioScriptId;
            }
            if (snapshot.characters) {
                snapshot.characters.forEach(char => {
                    delete char.avatarSrc;
                    if (char.chatId) delete char.persona;
                });
            }
            return { snapshot };
        } catch (e) {
            return { error: e };
        }
    }

    /** @returns {boolean} */
    function saveStudioPlayProgress() {
        if (!activeStudioPlay) return false;
        if (!currentSaveId) {
            currentSaveId = 'save_' + Date.now();
        }
        const built = buildPlaySnapshot();
        if (built.error) {
            console.error('小剧场存档序列化失败:', built.error);
            return false;
        }
        try {
            const saves = getAllStudioSaves();
            const scriptId = built.snapshot.script?.id ?? activeStudioScriptId;
            const saveEntry = {
                id: currentSaveId,
                scriptName: built.snapshot.script?.name || activeStudioPlay.script?.name || '未知剧本',
                scriptId,
                savedAt: Date.now(),
                messageCount: activeStudioPlay.history.filter(m => m.role !== 'system').length,
                playData: built.snapshot,
            };
            const existingIndex = saves.findIndex(s => s.id === currentSaveId);
            if (existingIndex >= 0) {
                saves[existingIndex] = saveEntry;
            } else {
                saves.push(saveEntry);
            }
            localStorage.setItem(STUDIO_SAVES_KEY, JSON.stringify(saves));
            return true;
        } catch (e) {
            console.error('保存小剧场进度失败:', e);
            return false;
        }
    }

    function deleteStudioSave(saveId) {
        try {
            const saves = getAllStudioSaves();
            const filtered = saves.filter(s => s.id !== saveId);
            localStorage.setItem(STUDIO_SAVES_KEY, JSON.stringify(filtered));
        } catch (e) {
            console.error('删除小剧场存档失败:', e);
        }
    }

    // ===================================================================
    // 1.6 数据兼容工具
    // ===================================================================
    function normalizeScriptCharacters(script) {
        if (script.characters && script.characters.length > 0) return script;
        script.characters = [];
        if (script.character1_identity) {
            script.characters.push({ label: '人物1', identity: script.character1_identity });
        }
        if (script.character2_identity) {
            script.characters.push({ label: '人物2', identity: script.character2_identity });
        }
        if (script.characters.length === 0) {
            script.characters.push({ label: '人物1', identity: '' }, { label: '人物2', identity: '' });
        }
        return script;
    }

    function normalizePlayData(playData) {
        if (playData.characters && playData.characters.length > 0) return playData;
        const chars = [];
        const userIdx = (playData.userRole || 1) === 1 ? 0 : 1;
        const aiIdx = userIdx === 0 ? 1 : 0;
        const labels = ['人物1', '人物2'];
        const names = [playData.role1Name || '角色1', playData.role2Name || '角色2'];
        const identities = [
            playData.userRole === 1 ? (playData.userPersona || '') : (playData.aiIdentity || ''),
            playData.userRole === 1 ? (playData.aiIdentity || '') : (playData.userPersona || ''),
        ];
        for (let i = 0; i < 2; i++) {
            const isUser = i === userIdx;
            chars.push({
                label: labels[i],
                identity: identities[i],
                name: names[i],
                chatId: isUser ? (playData.userIdentityValue !== 'user' ? playData.userIdentityValue : null) : (playData.aiChatId || null),
                persona: null,
                isUser: isUser,
                avatarSrc: null,
            });
        }
        playData.characters = chars;
        playData.userCharIndex = userIdx;
        return playData;
    }

    // ===================================================================
    // 2. DOM 元素获取
    // ===================================================================
    const studioAppIcon = document.getElementById('studio-app-icon');
    const studioAppIconPage3 = document.getElementById('studio-app-icon-page3');
    const addScriptBtn = document.getElementById('add-studio-script-btn');
    const backFromEditorBtn = document.getElementById('back-from-studio-editor');
    const saveScriptBtn = document.getElementById('save-studio-script-btn');
    const scriptListEl = document.getElementById('studio-script-list');
    const editorTitle = document.getElementById('studio-editor-title');
    const nameInput = document.getElementById('studio-name-input');
    const bgInput = document.getElementById('studio-background-input');
    const goalInput = document.getElementById('studio-goal-input');
    const roleSelectionModal = document.getElementById('studio-role-selection-modal');
    const playMessagesEl = document.getElementById('studio-play-messages');
    const playInput = document.getElementById('studio-play-input');
    const sendPlayActionBtn = document.getElementById('send-studio-play-action-btn');
    const exitPlayBtn = document.getElementById('exit-studio-play-btn');
    const rerollPlayBtn = document.getElementById('reroll-studio-play-btn');
    const summaryModal = document.getElementById('studio-summary-modal');
    const novelModal = document.getElementById('studio-novel-share-modal');
    const aiGenerateScriptBtn = document.getElementById('ai-generate-script-btn');
    const importScriptBtn = document.getElementById('import-studio-script-btn');
    const importInput = document.getElementById('studio-import-input');
    const exportScriptBtn = document.getElementById('export-studio-script-btn');
    const studioSavesListEl = document.getElementById('studio-saves-list');

    // ===================================================================
    // 3. 导航函数
    // ===================================================================
    function showStudioScreen() { showScreen('studio-screen'); }

    async function showStudioScriptsScreen() {
        await renderStudioScriptList();
        showScreen('studio-scripts-screen');
    }

    function showStudioSavesScreen() {
        renderStudioSavesList();
        showScreen('studio-saves-screen');
    }

    // ===================================================================
    // 4. 剧本列表 & 存档列表
    // ===================================================================
    async function renderStudioScriptList() {
        if (!scriptListEl) return;
        const scripts = await db.studioScripts.toArray();
        scriptListEl.innerHTML = '';
        if (scripts.length === 0) {
            scriptListEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">还没有剧本，点击右上角创建一个吧！</p>';
            return;
        }
        scripts.forEach(script => {
            const s = normalizeScriptCharacters(script);
            const item = document.createElement('div');
            item.className = 'studio-script-item';
            const charCount = s.characters.length;
            item.innerHTML = `
                <div class="title">${s.name || '未命名剧本'}</div>
                <div class="goal">🎯 ${s.storyGoal || '暂无目标'}</div>
                <div class="goal" style="margin-top:4px;">👥 ${charCount} 个人物</div>
            `;
            item.addEventListener('click', () => openRoleSelection(s.id));
            addLongPressListener(item, () => openStudioEditor(s.id));
            scriptListEl.appendChild(item);
        });
    }

    function renderStudioSavesList() {
        if (!studioSavesListEl) return;
        const saves = getAllStudioSaves();
        studioSavesListEl.innerHTML = '';
        if (saves.length === 0) {
            studioSavesListEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">暂无存档，开始一段新的演绎吧！</p>';
            return;
        }
        saves.sort((a, b) => b.savedAt - a.savedAt);
        saves.forEach(save => {
            const item = document.createElement('div');
            item.className = 'studio-script-item';
            const saveDate = new Date(save.savedAt);
            item.innerHTML = `
                <div class="title">📜 ${save.scriptName || '未知剧本'}</div>
                <div class="goal">💬 已进行 ${save.messageCount || 0} 轮对话</div>
                <div class="goal" style="font-size: 12px; margin-top: 6px;">保存于: ${saveDate.toLocaleString()}</div>
            `;
            item.addEventListener('click', () => resumeStudioSave(save.id));
            addLongPressListener(item, async () => {
                const confirmed = await showCustomConfirm('删除存档', `确定要删除剧本《${save.scriptName}》的存档吗？`, { confirmButtonClass: 'btn-danger' });
                if (confirmed) { deleteStudioSave(save.id); renderStudioSavesList(); }
            });
            studioSavesListEl.appendChild(item);
        });
    }

    function resumeStudioSave(saveId) {
        const saves = getAllStudioSaves();
        const save = saves.find(s => s.id === saveId);
        if (!save) { alert('找不到该存档！'); return; }
        activeStudioPlay = normalizePlayData(save.playData);
        currentSaveId = save.id;
        const sid = save.playData?.script?.id ?? save.scriptId;
        if (sid != null) activeStudioScriptId = sid;
        renderStudioPlayScreen();
        renderActionButtons();
        showScreen('studio-play-screen');
    }

    // ===================================================================
    // 5. 剧本编辑器 (支持动态人物)
    // ===================================================================
    function renderCharacterFields(characters) {
        const container = document.getElementById('studio-characters-container');
        if (!container) return;
        container.innerHTML = '';
        characters.forEach((char, idx) => {
            const group = document.createElement('div');
            group.className = 'form-group studio-char-field-group';
            const canDelete = characters.length > 2;
            group.innerHTML = `
                <div class="studio-field-header">
                    <label>人物${idx + 1} 身份背景</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button type="button" class="studio-ai-optimize-btn" data-field="character" data-char-idx="${idx}">✦ AI优化</button>
                        ${canDelete ? `<span class="studio-remove-char-btn" data-idx="${idx}">删除</span>` : ''}
                    </div>
                </div>
                <textarea class="studio-char-identity-input" rows="3" data-idx="${idx}"
                    placeholder="描述该人物的身份、与他人的关系、秘密任务等...">${char.identity || ''}</textarea>
            `;
            container.appendChild(group);
        });
        container.querySelectorAll('.studio-remove-char-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                syncEditorCharactersFromDOM();
                editorCharacters.splice(idx, 1);
                renderCharacterFields(editorCharacters);
            });
        });
        container.querySelectorAll('.studio-ai-optimize-btn').forEach(btn => {
            btn.addEventListener('click', () => aiOptimizeField(btn.dataset.field, parseInt(btn.dataset.charIdx)));
        });
    }

    function syncEditorCharactersFromDOM() {
        document.querySelectorAll('.studio-char-identity-input').forEach((input, idx) => {
            if (editorCharacters[idx]) {
                editorCharacters[idx].identity = input.value;
            }
        });
    }

    async function openStudioEditor(scriptId = null) {
        activeStudioScriptId = scriptId;
        const deleteBtn = document.getElementById('delete-studio-script-btn');
        const exportBtn = document.getElementById('export-studio-script-btn');
        const openingRemarkInput = document.getElementById('studio-opening-remark-input');

        if (scriptId) {
            editorTitle.textContent = '编辑剧本';
            const script = normalizeScriptCharacters(await db.studioScripts.get(scriptId));
            nameInput.value = script.name || '';
            bgInput.value = script.storyBackground || '';
            goalInput.value = script.storyGoal || '';
            openingRemarkInput.value = script.openingRemark || '';
            editorCharacters = script.characters.map(c => ({ ...c }));
            deleteBtn.style.display = 'block';
            if (exportBtn) exportBtn.style.display = 'block';
        } else {
            editorTitle.textContent = '新增剧本';
            nameInput.value = '';
            bgInput.value = '';
            goalInput.value = '';
            openingRemarkInput.value = '';
            editorCharacters = [
                { label: '人物1', identity: '' },
                { label: '人物2', identity: '' },
            ];
            deleteBtn.style.display = 'none';
            if (exportBtn) exportBtn.style.display = 'none';
        }
        renderCharacterFields(editorCharacters);
        showScreen('studio-editor-screen');
    }

    async function saveStudioScript() {
        syncEditorCharactersFromDOM();
        const characters = editorCharacters.map((c, i) => ({
            label: `人物${i + 1}`,
            identity: (c.identity || '').trim(),
        }));
        const hasEmptyChar = characters.some(c => !c.identity);
        const scriptData = {
            name: nameInput.value.trim() || '未命名剧本',
            storyBackground: bgInput.value.trim(),
            storyGoal: goalInput.value.trim(),
            openingRemark: document.getElementById('studio-opening-remark-input').value.trim(),
            characters: characters,
            character1_identity: characters[0]?.identity || '',
            character2_identity: characters[1]?.identity || '',
        };
        if (!scriptData.name || !scriptData.storyBackground || !scriptData.storyGoal || hasEmptyChar) {
            alert('剧本名称、故事背景、故事目标及所有人物身份均为必填项！');
            return;
        }
        if (activeStudioScriptId) {
            await db.studioScripts.update(activeStudioScriptId, scriptData);
        } else {
            activeStudioScriptId = await db.studioScripts.add(scriptData);
        }
        alert('剧本已保存！');
        showStudioScriptsScreen();
    }

    // ===================================================================
    // 6. AI 辅助生成剧本 (支持动态人物)
    // ===================================================================
    async function generateScriptWithAI() {
        syncEditorCharactersFromDOM();
        await showCustomAlert('请稍候', 'AI剧本娘正在奋笔疾书中...');

        const existingName = nameInput.value.trim();
        const existingBg = bgInput.value.trim();
        const existingGoal = goalInput.value.trim();
        const existingOpening = document.getElementById('studio-opening-remark-input').value.trim();
        const charCount = editorCharacters.length;

        let charInfoText = '';
        editorCharacters.forEach((c, i) => {
            charInfoText += `- 人物${i + 1}身份背景: ${c.identity?.trim() || '(待生成)'}\n`;
        });

        let charJsonExample = '';
        for (let i = 0; i < charCount; i++) {
            charJsonExample += `    {"label": "人物${i + 1}", "identity": "该人物的身份背景描述..."}${i < charCount - 1 ? ',' : ''}\n`;
        }

        const systemPrompt = `
    # 你的角色
    你是一位才华横溢、想象力丰富的剧本创作大师。

    # 你的任务
    根据下方用户提供的【已有信息】，创作或补完一个引人入胜的戏剧剧本。

    # 已有信息
    - 剧本名称: ${existingName || '(待生成)'}
    - 故事背景: ${existingBg || '(待生成)'}
    - 故事目标: ${existingGoal || '(待生成)'}
    - 开场白: ${existingOpening || '(待生成)'}
    ${charInfoText}

    # 输出要求 (【【【最高指令，必须严格遵守】】】)
    1. 你的回复【必须且只能】是一个完整的、严格的JSON对象。
    2. JSON必须包含: "name", "background", "goal", "openingRemark", "characters"。
    3. "characters"是一个数组，包含恰好${charCount}个人物对象，每个对象有"label"和"identity"。
    4. 为所有标记为【(待生成)】的字段生成内容。
    5. 不能给人物起名字，用身份指代。生成人物时重点在身份和背景。

    # JSON输出格式:
    {
    "name": "剧本名称",
    "background": "故事背景描述",
    "goal": "故事目标",
    "openingRemark": "开场白",
    "characters": [
    ${charJsonExample}]
    }

    现在，请开始创作。`;

        try {
            const responseText = await getApiResponse(systemPrompt);
            const sanitizedText = responseText.replace(/^```json\s*|```$/g, '').trim();
            const parsedData = (window.repairAndParseJSON || JSON.parse)(sanitizedText);

            if (!existingName && parsedData.name) nameInput.value = parsedData.name;
            if (!existingBg && parsedData.background) bgInput.value = parsedData.background;
            if (!existingGoal && parsedData.goal) goalInput.value = parsedData.goal;
            if (!existingOpening && parsedData.openingRemark) {
                document.getElementById('studio-opening-remark-input').value = parsedData.openingRemark;
            }
            if (parsedData.characters && Array.isArray(parsedData.characters)) {
                parsedData.characters.forEach((pc, i) => {
                    if (editorCharacters[i] && !editorCharacters[i].identity?.trim() && pc.identity) {
                        editorCharacters[i].identity = pc.identity;
                    }
                });
                renderCharacterFields(editorCharacters);
            }
            await showCustomAlert('完成！', '剧本已由AI填充完毕！');
        } catch (error) {
            console.error('AI生成剧本失败:', error);
            await showCustomAlert('生成失败', `发生错误: ${error.message}`);
        }
    }

    // ===================================================================
    // 6.5 AI 单栏目优化
    // ===================================================================
    async function aiOptimizeField(fieldType, charIdx) {
        syncEditorCharactersFromDOM();
        const currentName = nameInput.value.trim();
        const currentBg = bgInput.value.trim();
        const currentGoal = goalInput.value.trim();
        const currentOpening = document.getElementById('studio-opening-remark-input').value.trim();

        let charSummary = '';
        editorCharacters.forEach((c, i) => {
            charSummary += `  - 人物${i + 1}: ${c.identity?.trim() || '(暂未填写)'}\n`;
        });

        const contextBlock = `
【剧本信息概览】
- 剧本名称: ${currentName || '(未填写)'}
- 故事背景: ${currentBg || '(未填写)'}
- 故事目标: ${currentGoal || '(未填写)'}
- 开场白: ${currentOpening || '(未填写)'}
- 人物列表:
${charSummary}`.trim();

        let fieldLabel, currentValue, inputEl, instruction;

        switch (fieldType) {
            case 'name':
                fieldLabel = '剧本名称';
                currentValue = currentName;
                inputEl = nameInput;
                instruction = '请根据故事背景和目标，生成一个更加吸引人、富有意境的剧本名称。名称应简短有力，5-15字为宜。';
                break;
            case 'background':
                fieldLabel = '故事背景';
                currentValue = currentBg;
                inputEl = bgInput;
                instruction = '请根据剧本名称、目标和人物信息，优化或扩写故事背景。要求描述生动具体，包含时代、地点、氛围等关键要素，让读者能迅速进入故事世界。150-300字为宜。';
                break;
            case 'goal':
                fieldLabel = '故事目标';
                currentValue = currentGoal;
                inputEl = goalInput;
                instruction = '请根据故事背景和人物设定，优化故事目标。目标应清晰具体、有悬念感，能让玩家理解需要达成什么条件。50-150字为宜。';
                break;
            case 'opening':
                fieldLabel = '开场白';
                currentValue = currentOpening;
                inputEl = document.getElementById('studio-opening-remark-input');
                instruction = '请根据整体剧本信息，创作或优化一段引人入胜的开场白。开场白应营造氛围、引入场景，使用文学化的叙述手法，让玩家代入感倍增。100-250字为宜。';
                break;
            case 'character':
                fieldLabel = `人物${charIdx + 1} 身份背景`;
                currentValue = editorCharacters[charIdx]?.identity?.trim() || '';
                inputEl = document.querySelector(`.studio-char-identity-input[data-idx="${charIdx}"]`);
                instruction = `请根据故事背景、目标和其他人物信息，优化或扩写人物${charIdx + 1}的身份背景描述。要求包含该人物的核心身份、性格特点、与故事的关系、可能隐藏的秘密等，使其丰满立体。不要给人物起名字，用身份指代。80-200字为宜。`;
                break;
            default:
                return;
        }

        if (!inputEl) return;

        const btn = document.querySelector(`.studio-ai-optimize-btn[data-field="${fieldType}"]${fieldType === 'character' ? `[data-char-idx="${charIdx}"]` : ''}`);
        const originalText = btn?.textContent;
        if (btn) { btn.textContent = '优化中...'; btn.disabled = true; }

        const systemPrompt = `# 你的角色
你是一位才华横溢的剧本创作助手。

# 你的任务
用户正在编辑一部剧本，现在需要你优化其中的【${fieldLabel}】栏目。

${contextBlock}

# 当前需要优化的栏目
- 栏目: ${fieldLabel}
- 当前内容: ${currentValue || '(空白，需要生成)'}

# 优化要求
${instruction}

# 输出要求 (【最高指令】)
1. 你的回复必须且只能是优化后的【${fieldLabel}】内容纯文本。
2. 不要输出JSON，不要输出解释，不要输出任何前缀或后缀标记。
3. 直接输出最终内容即可。`;

        try {
            const result = await getApiResponse(systemPrompt);
            const cleanedResult = result.replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
            inputEl.value = cleanedResult;
            if (fieldType === 'character' && editorCharacters[charIdx]) {
                editorCharacters[charIdx].identity = cleanedResult;
            }
            inputEl.style.height = 'auto';
            inputEl.style.height = inputEl.scrollHeight + 'px';
        } catch (error) {
            console.error(`AI优化${fieldLabel}失败:`, error);
            await showCustomAlert('优化失败', `发生错误: ${error.message}`);
        } finally {
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
        }
    }

    // ===================================================================
    // 7. 导出 / 导入
    // ===================================================================
    async function exportCurrentScript() {
        if (!activeStudioScriptId) { alert('请先保存剧本后再导出！'); return; }
        const script = await db.studioScripts.get(activeStudioScriptId);
        if (!script) { alert('找不到剧本数据。'); return; }
        const exportData = { type: 'EPhone_Studio_Script', version: 2, data: script };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `[剧本]${script.name}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('剧本导出成功！');
    }

    function handleScriptImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async e => {
            try {
                const json = JSON.parse(e.target.result);
                if (json.type !== 'EPhone_Studio_Script' || !json.data) {
                    if (!json.name || !json.storyBackground) throw new Error('文件格式不正确。');
                    json.data = json;
                }
                const scriptData = normalizeScriptCharacters(json.data);
                scriptData.id = Date.now();
                scriptData.name = scriptData.name + ' (导入)';
                await db.studioScripts.add(scriptData);
                await renderStudioScriptList();
                alert(`剧本《${scriptData.name}》导入成功！`);
            } catch (error) {
                alert(`导入失败: ${error.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }

    // ===================================================================
    // 8. 角色分配 (动态多人物)
    // ===================================================================
    async function openRoleSelection(scriptId) {
        const script = normalizeScriptCharacters(await db.studioScripts.get(scriptId));
        if (!script) return;
        activeStudioScriptId = scriptId;

        const body = document.getElementById('studio-role-assignment-body');
        const aiChars = Object.values(window.state.chats).filter(chat => !chat.isGroup);

        const userNickname = window.state?.qzoneSettings?.nickname || '我';
        const userPersona = window.state?.qzoneSettings?.weiboUserPersona || '';

        let html = '';
        script.characters.forEach((char, idx) => {
            const aiOptions = aiChars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            html += `
            <div class="studio-role-assign-item" data-idx="${idx}">
                <div class="studio-role-assign-header"><strong>${char.label}</strong></div>
                <p class="role-description">${char.identity || '暂无描述'}</p>
                <span class="studio-role-assign-label">选择角色身份:</span>
                <select class="studio-role-identity-select" data-idx="${idx}">
                    <option value="" disabled selected>请选择...</option>
                    <option value="__user__" data-persona="${escape(userPersona)}">${userNickname} (我)</option>
                    ${aiOptions}
                    <option value="__custom__">自定义姓名</option>
                </select>
                <input type="text" class="studio-role-custom-name" data-idx="${idx}"
                    placeholder="输入自定义姓名..." style="margin-top:8px;display:none;" />
                <label class="studio-role-user-check">
                    <input type="checkbox" class="studio-role-is-user" data-idx="${idx}" ${idx === 0 ? 'checked' : ''} />
                    由我扮演
                </label>
            </div>`;
        });
        body.innerHTML = html;

        body.querySelectorAll('.studio-role-identity-select').forEach(select => {
            const customInput = body.querySelector(`.studio-role-custom-name[data-idx="${select.dataset.idx}"]`);
            const updateVisibility = () => {
                customInput.style.display = select.value === '__custom__' ? 'block' : 'none';
            };
            select.addEventListener('change', updateVisibility);
        });

        body.querySelectorAll('.studio-role-is-user').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    body.querySelectorAll('.studio-role-is-user').forEach(other => {
                        if (other !== cb) other.checked = false;
                    });
                }
            });
        });

        roleSelectionModal.classList.add('visible');
    }

    // ===================================================================
    // 9. 开始演绎
    // ===================================================================
    async function startStudioPlay() {
        const script = normalizeScriptCharacters(await db.studioScripts.get(activeStudioScriptId));
        if (!script) {
            alert('找不到剧本数据，请返回剧本列表重试。');
            return;
        }
        if (script.id == null && activeStudioScriptId != null) {
            script.id = activeStudioScriptId;
        }
        const body = document.getElementById('studio-role-assignment-body');
        const selects = body.querySelectorAll('.studio-role-identity-select');
        const customInputs = body.querySelectorAll('.studio-role-custom-name');
        const userChecks = body.querySelectorAll('.studio-role-is-user');

        // 验证所有角色都已分配
        for (let i = 0; i < selects.length; i++) {
            const val = selects[i].value;
            if (!val) {
                alert(`请为「${script.characters[i].label}」选择角色身份！`);
                return;
            }
            if (val === '__custom__' && !customInputs[i].value.trim()) {
                alert(`请为「${script.characters[i].label}」输入自定义姓名！`);
                return;
            }
        }

        const characters = [];
        let userCharIndex = -1;

        const userNickname = window.state?.qzoneSettings?.nickname || '我';
        const userAvatar = window.state?.qzoneSettings?.avatar || null;
        const userPersona = window.state?.qzoneSettings?.weiboUserPersona || '';

        script.characters.forEach((scriptChar, idx) => {
            const selectValue = selects[idx].value;
            const isCustom = selectValue === '__custom__';
            const isUserIdentity = selectValue === '__user__';
            const isUser = userChecks[idx].checked;

            let name, chatId, persona, avatarSrc;
            if (isCustom) {
                name = customInputs[idx].value.trim();
                chatId = null;
                persona = null;
                avatarSrc = null;
            } else if (isUserIdentity) {
                name = userNickname;
                chatId = null;
                persona = userPersona;
                avatarSrc = userAvatar;
            } else {
                const chat = window.state.chats[selectValue];
                name = chat ? chat.name : '未知';
                chatId = selectValue;
                persona = chat?.settings?.aiPersona || '';
                avatarSrc = chat?.settings?.aiAvatar || null;
            }
            if (isUser) userCharIndex = idx;

            characters.push({
                label: scriptChar.label,
                identity: scriptChar.identity,
                name, chatId, persona, isUser, avatarSrc,
            });
        });

        if (userCharIndex === -1) { alert('请至少选择一个角色由你扮演！'); return; }

        const nameSet = new Set(characters.map(c => c.name));
        if (nameSet.size !== characters.length) { alert('角色名称不能重复！'); return; }

        activeStudioPlay = {
            script, characters, userCharIndex,
            history: [],
            storyGoalReached: false,
        };

        activeStudioPlay.history.push({ role: 'system', content: `【故事背景】\n${script.storyBackground}` });
        if (script.openingRemark) {
            activeStudioPlay.history.push({ role: 'system', content: `【开场白】\n${script.openingRemark}` });
        }

        currentSaveId = 'save_' + Date.now();
        saveStudioPlayProgress();

        roleSelectionModal.classList.remove('visible');
        renderStudioPlayScreen();
        renderActionButtons();
        showScreen('studio-play-screen');
    }

    // ===================================================================
    // 10. 演绎界面渲染
    // ===================================================================
    function renderStudioPlayScreen() {
        if (!activeStudioPlay) return;
        document.getElementById('studio-play-title').textContent = activeStudioPlay.script.name;
        playMessagesEl.innerHTML = '';
        activeStudioPlay.history.forEach(msg => {
            playMessagesEl.appendChild(createPlayMessageElement(msg));
        });
        playMessagesEl.scrollTop = playMessagesEl.scrollHeight;
    }

    function renderActionButtons() {
        const container = document.getElementById('studio-action-buttons');
        if (!container || !activeStudioPlay) return;
        container.innerHTML = '';

        const narBtn = document.createElement('button');
        narBtn.className = 'studio-action-chip studio-action-narration';
        narBtn.textContent = '旁白';
        narBtn.addEventListener('click', () => triggerNarration());
        container.appendChild(narBtn);

        activeStudioPlay.characters.forEach((char, idx) => {
            if (char.isUser) return;
            const btn = document.createElement('button');
            btn.className = 'studio-action-chip';
            btn.textContent = char.name;
            btn.addEventListener('click', () => triggerCharacterResponse(idx));
            container.appendChild(btn);
        });
    }

    function getCharacterAvatar(char) {
        const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
        if (!char) return defaultAvatar;
        if (char.avatarSrc) return char.avatarSrc;
        if (char.chatId && window.state.chats[char.chatId]) {
            return window.state.chats[char.chatId].settings?.aiAvatar || defaultAvatar;
        }
        if (char.isUser) {
            return window.state?.qzoneSettings?.avatar || defaultAvatar;
        }
        return defaultAvatar;
    }

    function getCharacterFromMessage(msg) {
        if (!activeStudioPlay) return null;
        if (msg.charIdx !== undefined && activeStudioPlay.characters[msg.charIdx]) {
            return activeStudioPlay.characters[msg.charIdx];
        }
        if (msg.role === 'user') return activeStudioPlay.characters.find(c => c.isUser);
        if (msg.role === 'assistant') return activeStudioPlay.characters.find(c => !c.isUser);
        return null;
    }

    function createPlayMessageElement(msg) {
        const wrapper = document.createElement('div');

        if (msg.role === 'system') {
            wrapper.className = 'message-wrapper studio-system';
            wrapper.innerHTML = `<div class="message-bubble studio-system-bubble">${msg.content.replace(/\n/g, '<br>')}</div>`;
        } else {
            const isUser = msg.role === 'user';
            wrapper.className = `message-wrapper ${isUser ? 'user' : 'ai'}`;
            const char = getCharacterFromMessage(msg);
            const avatarSrc = getCharacterAvatar(char);
            const charName = msg.charName || char?.name || (isUser ? '你' : 'AI');

            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${isUser ? 'user' : 'ai'}`;
            bubble.innerHTML = `
                <img src="${avatarSrc}" class="avatar">
                <div class="content">
                    <div class="studio-char-name">${charName}</div>
                    ${msg.content.replace(/\n/g, '<br>')}
                </div>`;
            wrapper.appendChild(bubble);
        }
        return wrapper;
    }

    // ===================================================================
    // 11. 用户输入 & 刷新
    // ===================================================================
    async function handleUserPlayAction() {
        const content = playInput.value.trim();
        if (!content) return;
        const userChar = activeStudioPlay.characters[activeStudioPlay.userCharIndex];
        const userMessage = {
            role: 'user', content,
            charIdx: activeStudioPlay.userCharIndex,
            charName: userChar.name,
        };
        activeStudioPlay.history.push(userMessage);
        saveStudioPlayProgress();
        playInput.value = '';
        playInput.style.height = 'auto';
        playMessagesEl.appendChild(createPlayMessageElement(userMessage));
        playMessagesEl.scrollTop = playMessagesEl.scrollHeight;
    }

    async function handleRerollPlay() {
        if (!activeStudioPlay || activeStudioPlay.history.length < 2) {
            alert('还没有足够的内容来刷新哦。');
            return;
        }
        const lastMsg = activeStudioPlay.history[activeStudioPlay.history.length - 1];
        if (lastMsg && lastMsg.role !== 'user') {
            const removedMsg = activeStudioPlay.history.pop();
            saveStudioPlayProgress();
            renderStudioPlayScreen();
            renderActionButtons();
            if (removedMsg.role === 'system' && (removedMsg.content.includes('【旁白】') || removedMsg.content.includes('【结局】'))) {
                await triggerNarration();
            } else if (removedMsg.charIdx !== undefined) {
                await triggerCharacterResponse(removedMsg.charIdx);
            }
        }
    }

    // ===================================================================
    // 12. 角色对话触发 (多角色核心)
    // ===================================================================
    function formatHistoryForPrompt(history) {
        return history.map(h => {
            if (h.role === 'system') return `【旁白/系统】: ${h.content}`;
            const name = h.charName || (h.role === 'user' ? '用户' : 'AI');
            return `【${name}】: ${h.content}`;
        }).join('\n');
    }

    function buildCharacterListText(characters) {
        return characters.map(c =>
            `- ${c.name}（${c.label}）: ${c.identity}`
        ).join('\n');
    }

    async function triggerCharacterResponse(charIdx) {
        const char = activeStudioPlay.characters[charIdx];
        const { script, characters, history } = activeStudioPlay;

        const hasLinkedAI = char.chatId && window.state.chats[char.chatId];
        const linkedChat = hasLinkedAI ? window.state.chats[char.chatId] : null;
        const personaText = hasLinkedAI ? linkedChat.settings.aiPersona : (char.persona || '');

        const basePersonaBlock = personaText
            ? `\n    # 你的核心性格 (Base Personality)\n    ${personaText}\n    *其中性格部分是你的本质，你的行为和说话方式的根源，与身份背景或世界观有关的信息在演绎时需要被忽略。*\n`
            : '';

        const indicator = createTypingIndicator(`${char.name} 正在行动...`);
        playMessagesEl.appendChild(indicator);
        playMessagesEl.scrollTop = playMessagesEl.scrollHeight;

        const systemPrompt = `
    你正在进行一场名为《${script.name}》的戏剧角色扮演。

    # 故事背景
    ${script.storyBackground}

    # 所有角色
    ${buildCharacterListText(characters)}

    # 你的身份
    你扮演的角色是【${char.name}】（${char.label}）。
    你的身份背景：${char.identity}
    ${basePersonaBlock}
    # 规则
    1.  ${hasLinkedAI ? '【表演核心】你必须将你的"核心性格"与"剧本身份"深度结合进行演绎。' : '你需要完全按照上述身份背景进行演绎。'}
    2.  你的所有行动和对话都必须以第一人称进行，以【${char.name}】的视角。
    3.  你的回复应该是描述性的，包含动作、对话和心理活动，用【】包裹非对话内容。
    4.  一切描写务必符合故事背景所在的世界观。
    5.  绝对不要提及你是AI或模型，也不要提起自己是在"角色扮演"。
    6.  对话中请使用其他角色的真实名字称呼他们。

    # 故事目标
    ${script.storyGoal}

    # 对话历史
    ${formatHistoryForPrompt(history)}

    现在，请以【${char.name}】的身份继续表演。`;

        try {
            const aiContent = await getApiResponse(systemPrompt);
            const aiMessage = {
                role: 'assistant', content: aiContent,
                charIdx, charName: char.name,
            };
            activeStudioPlay.history.push(aiMessage);
            playMessagesEl.appendChild(createPlayMessageElement(aiMessage));
            saveStudioPlayProgress();
            indicator.remove();
        } catch (error) {
            console.error('小剧场AI回应失败:', error);
            const errMsg = { role: 'assistant', content: `[AI出错了: ${error.message}]`, charIdx, charName: char.name };
            playMessagesEl.appendChild(createPlayMessageElement(errMsg));
        } finally {
            indicator.remove();
            playMessagesEl.scrollTop = playMessagesEl.scrollHeight;
        }
    }

    // ===================================================================
    // 13. 旁白生成 (含结局判定 + 全角色上下文)
    // ===================================================================
    async function triggerNarration() {
        const { script, history, characters, storyGoalReached } = activeStudioPlay;

        const narrationTypingIndicator = createTypingIndicator('故事发展中...');
        playMessagesEl.appendChild(narrationTypingIndicator);
        playMessagesEl.scrollTop = playMessagesEl.scrollHeight;

        const endCheckInstruction = storyGoalReached ? `
    # 【特殊指令：故事目标已完成】
    故事目标已被达成，但用户选择继续演绎。不需要再判定结局，只需要生成旁白推进剧情。
    不要再返回JSON结束信号。` : `
    # 【第一任务：结局判定 (最高优先级)】
    1. 仔细阅读上方的【故事目标】。
    2. 审视【对话历史】，判断角色的行动是否已明确达成【故事目标】。
    3. 如果【故事目标已达成】且剧情已完整，回复【必须且只能】是一个JSON：
       {"isEnd": true, "narration": "总结性的结局旁白..."}
    4. 如果【故事目标未达成】或剧情尚在发展中，继续执行旁白生成任务。`;

        const narrationPrompt = `
    # 你的任务
    你是一个掌控故事节奏的"地下城主"(DM)或"旁白"。

    # 剧本设定
    - 剧本名: ${script.name}
    - 故事背景: ${script.storyBackground}
    - 故事目标: ${script.storyGoal}

    # 所有角色
    ${buildCharacterListText(characters)}

    # 对话历史
    ${formatHistoryForPrompt(history)}

    ${endCheckInstruction}

    # 【${storyGoalReached ? '主要' : '第二'}任务：旁白生成】
    1. **保持中立**: 以第三人称客观视角描述，不带任何角色的主观情绪。
    2. **推进剧情**: 引入新事件、新线索、环境变化或意想不到的转折。
    3. **使用正确的角色名字**: 在提及角色时，务必使用上方【所有角色】列表中的名字。
    4. **控制节奏**: 不要过快让角色达成目标，制造波折和悬念。
    5. **简短精悍**: 几句话即可。
    6. **禁止对话**: 回复【只能是旁白描述】，不能包含角色对话。

    现在，请开始你的工作。`;

        try {
            const responseText = await getApiResponse(narrationPrompt);

            if (!storyGoalReached) {
                try {
                    const parsedResponse = (window.repairAndParseJSON || JSON.parse)(responseText);
                    if (parsedResponse.isEnd === true && parsedResponse.narration) {
                        const finalNarration = { role: 'system', content: `【结局】\n${parsedResponse.narration}` };
                        activeStudioPlay.history.push(finalNarration);
                        playMessagesEl.appendChild(createPlayMessageElement(finalNarration));
                        saveStudioPlayProgress();

                        setTimeout(async () => {
                            const choice = await showChoiceModal('故事目标已完成', [
                                { text: '🎉 结束故事', value: 'end' },
                                { text: '▶️ 继续演绎', value: 'continue' },
                            ]);
                            if (choice === 'end') {
                                endStudioPlay(true);
                            } else if (choice === 'continue') {
                                activeStudioPlay.storyGoalReached = true;
                                saveStudioPlayProgress();
                            }
                        }, 800);
                        return;
                    }
                } catch (e) { /* 普通旁白 */ }
            }

            if (responseText) {
                const narrationMessage = { role: 'system', content: `【旁白】\n${responseText}` };
                activeStudioPlay.history.push(narrationMessage);
                playMessagesEl.appendChild(createPlayMessageElement(narrationMessage));
                saveStudioPlayProgress();
            }
        } catch (error) {
            console.error('旁白生成失败:', error);
            const errMsg = { role: 'system', content: `[旁白生成失败: ${error.message}]` };
            playMessagesEl.appendChild(createPlayMessageElement(errMsg));
        } finally {
            narrationTypingIndicator.remove();
            playMessagesEl.scrollTop = playMessagesEl.scrollHeight;
        }
    }

    // ===================================================================
    // 14. 结束 / 小说 / 分享
    // ===================================================================
    function endStudioPlay(isSuccess = false) {
        if (currentSaveId) { deleteStudioSave(currentSaveId); currentSaveId = null; }
        document.getElementById('studio-summary-title').textContent = isSuccess ? '演绎成功！' : '演绎结束';
        document.getElementById('studio-summary-content').textContent = `故事目标：${activeStudioPlay.script.storyGoal}`;
        summaryModal.classList.add('visible');
    }

    async function generateNovelFromPlay() {
        await showCustomAlert('请稍候', '正在将你们的演绎过程创作成小说...');
        const { script, history, characters } = activeStudioPlay;
        const charListText = buildCharacterListText(characters);
        const nameListText = characters.map(c => c.name).join('、');

        const systemPrompt = `
    # 你的任务
    你是一位出色的小说家。请根据下面的剧本设定和对话历史，将这段角色扮演改编成一篇引人入胜的短篇小说。

    # 剧本设定
    - 剧本名: ${script.name}
    - 故事背景: ${script.storyBackground}
    - 故事目标: ${script.storyGoal}

    # 所有角色
    ${charListText}

    # 对话历史
    ${formatHistoryForPrompt(history)}

    # 写作要求
    1. 使用第三人称叙事。
    2. 请在小说中使用角色的具体名字（${nameListText}）来称呼他们。
    3. 保持故事的连贯性和逻辑性。
    4. 丰富人物的心理活动和环境描写。
    5. 小说内容要完整、精彩，字数在1000字以上。`;

        try {
            const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('studio');
            const isGemini = proxyUrl === 'https://generativelanguage.googleapis.com/v1beta/models';
            const requestData = isGemini
                ? window.toGeminiRequestData(model, apiKey, systemPrompt, [{ role: 'user', content: '请开始创作' }], true)
                : {
                    url: `${proxyUrl}/v1/chat/completions`,
                    data: {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model,
                            messages: [{ role: 'user', content: systemPrompt }],
                            ...window.buildModelParams(window.state.apiConfig),
                        }),
                    },
                };
            const response = await fetch(requestData.url, requestData.data);
            if (!response.ok) throw new Error(`API错误: ${await response.text()}`);
            const result = await response.json();
            const novelText = isGemini ? result.candidates[0].content.parts[0].text : result.choices[0].message.content;

            await db.studioHistory.add({
                scriptName: script.name,
                storyGoal: script.storyGoal,
                novelContent: novelText,
                timestamp: Date.now(),
                participants: characters.map(c => c.name),
            });

            document.getElementById('studio-novel-content').textContent = novelText;
            novelModal.classList.add('visible');
            summaryModal.classList.remove('visible');
        } catch (error) {
            console.error('生成小说失败:', error);
            await showCustomAlert('生成失败', `发生错误: ${error.message}`);
        }
    }

    async function shareNovel() {
        const novelText = document.getElementById('studio-novel-content').textContent;
        if (!novelText || !activeStudioPlay) return;

        const linkedChars = activeStudioPlay.characters.filter(c => c.chatId && !c.isUser);
        if (linkedChars.length === 0) { alert('没有可分享的AI角色。'); return; }

        let targetChatId;
        if (linkedChars.length === 1) {
            targetChatId = linkedChars[0].chatId;
        } else {
            const choice = await showChoiceModal('选择分享对象',
                linkedChars.map(c => ({ text: c.name, value: c.chatId }))
            );
            if (!choice) return;
            targetChatId = choice;
        }

        const chat = window.state.chats[targetChatId];
        if (!chat) return;
        const confirmed = await showCustomConfirm('确认分享', `确定要将这篇小说分享给"${chat.name}"吗？`);
        if (confirmed) {
            chat.history.push({
                role: 'user', type: 'share_link',
                title: `我们共同演绎的小说：《${activeStudioPlay.script.name}》`,
                description: '点击查看我们共同创作的故事！',
                source_name: '小剧场',
                content: novelText,
                timestamp: window.getUserMessageTimestamp(chat),
            });
            await db.chats.put(chat);
            novelModal.classList.remove('visible');
            alert('分享成功！');
            openChat(targetChatId);
        }
    }

    // ===================================================================
    // 15. 故事记录
    // ===================================================================
    async function openStudioHistoryScreen() {
        await renderStudioHistoryList();
        showScreen('studio-history-screen');
    }

    async function renderStudioHistoryList() {
        const listEl = document.getElementById('studio-history-list');
        if (!listEl) return;
        const records = await db.studioHistory.orderBy('timestamp').reverse().toArray();
        listEl.innerHTML = '';
        if (records.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">还没有完成过任何故事哦。</p>';
            return;
        }
        records.forEach(record => {
            const item = document.createElement('div');
            item.className = 'studio-script-item';
            const recordDate = new Date(record.timestamp);
            const participantsText = Array.isArray(record.participants)
                ? record.participants.join(', ')
                : `${record.participants?.role1 || '?'}, ${record.participants?.role2 || '?'}`;

            item.innerHTML = `
                <div class="title">${record.scriptName}</div>
                <div class="goal" style="margin-top:5px;">🎭 参与者: ${participantsText}</div>
                <div class="goal" style="font-size:12px;margin-top:8px;">记录于: ${recordDate.toLocaleString()}</div>
            `;
            item.addEventListener('click', () => viewStudioHistoryDetail(record.id));
            addLongPressListener(item, async () => {
                const confirmed = await showCustomConfirm('删除记录', '确定要删除这条故事记录吗？', { confirmButtonClass: 'btn-danger' });
                if (confirmed) await deleteStudioHistory(record.id);
            });
            listEl.appendChild(item);
        });
    }

    async function viewStudioHistoryDetail(recordId) {
        const record = await db.studioHistory.get(recordId);
        if (!record) { alert('找不到该条记录！'); return; }
        document.getElementById('studio-novel-content').textContent = record.novelContent;
        const footer = novelModal.querySelector('.modal-footer');
        footer.innerHTML = `<button class="save" id="close-history-view-btn" style="width:100%">关闭</button>`;
        document.getElementById('close-history-view-btn').addEventListener('click', () => novelModal.classList.remove('visible'));
        novelModal.classList.add('visible');
    }

    async function deleteStudioHistory(recordId) {
        await db.studioHistory.delete(recordId);
        await renderStudioHistoryList();
        alert('故事记录已删除。');
    }

    // ===================================================================
    // 16. 工具函数
    // ===================================================================
    function createTypingIndicator(text) {
        const indicator = document.createElement('div');
        indicator.className = 'message-wrapper studio-indicator';
        indicator.innerHTML = `<div class="message-bubble studio-system-bubble" style="opacity: 0.8;">${text}</div>`;
        return indicator;
    }

    async function getApiResponse(systemPrompt) {
        const studioCfg = window.getApiConfigForFunction('studio');
        const { proxyUrl, apiKey, model } = studioCfg;
        const isGemini = proxyUrl === 'https://generativelanguage.googleapis.com/v1beta/models';
        const modelParams = window.buildModelParams(studioCfg);

        const messagesForApi = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '请开始你的表演。' },
        ];

        const requestData = isGemini
            ? window.toGeminiRequestData(model, apiKey, systemPrompt,
                [{ role: 'user', content: '请开始你的表演。' }], true, modelParams.temperature)
            : {
                url: `${proxyUrl}/v1/chat/completions`,
                data: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({ model, messages: messagesForApi, ...modelParams }),
                },
            };

        const response = await fetch(requestData.url, requestData.data);
        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} - ${await response.text()}`);
        }
        const result = await response.json();
        const aiContent = isGemini
            ? result?.candidates?.[0]?.content?.parts?.[0]?.text
            : result?.choices?.[0]?.message?.content;
        if (!aiContent) throw new Error('API返回了空内容，可能触发了安全策略。');
        return aiContent.trim();
    }

    // ===================================================================
    // 17. 事件监听器
    // ===================================================================
    if (studioAppIcon) studioAppIcon.addEventListener('click', showStudioScreen);
    if (studioAppIconPage3) studioAppIconPage3.addEventListener('click', showStudioScreen);

    const studioMenuScripts = document.getElementById('studio-menu-scripts');
    const studioMenuSaves = document.getElementById('studio-menu-saves');
    const studioMenuHistory = document.getElementById('studio-menu-history');
    if (studioMenuScripts) studioMenuScripts.addEventListener('click', showStudioScriptsScreen);
    if (studioMenuSaves) studioMenuSaves.addEventListener('click', showStudioSavesScreen);
    if (studioMenuHistory) studioMenuHistory.addEventListener('click', openStudioHistoryScreen);

    const backFromScriptsBtn = document.getElementById('back-from-studio-scripts');
    if (backFromScriptsBtn) backFromScriptsBtn.addEventListener('click', showStudioScreen);
    const backFromSavesBtn = document.getElementById('back-from-studio-saves');
    if (backFromSavesBtn) backFromSavesBtn.addEventListener('click', showStudioScreen);
    const backFromHistoryBtn = document.getElementById('back-from-studio-history');
    if (backFromHistoryBtn) backFromHistoryBtn.addEventListener('click', showStudioScreen);

    if (addScriptBtn) addScriptBtn.addEventListener('click', () => openStudioEditor(null));
    if (backFromEditorBtn) backFromEditorBtn.addEventListener('click', showStudioScriptsScreen);
    if (saveScriptBtn) saveScriptBtn.addEventListener('click', saveStudioScript);
    if (aiGenerateScriptBtn) aiGenerateScriptBtn.addEventListener('click', generateScriptWithAI);

    const addCharBtn = document.getElementById('add-studio-character-btn');
    if (addCharBtn) {
        addCharBtn.addEventListener('click', () => {
            syncEditorCharactersFromDOM();
            editorCharacters.push({ label: `人物${editorCharacters.length + 1}`, identity: '' });
            renderCharacterFields(editorCharacters);
        });
    }

    document.querySelectorAll('#studio-editor-screen > .form-container > .form-group .studio-ai-optimize-btn').forEach(btn => {
        btn.addEventListener('click', () => aiOptimizeField(btn.dataset.field));
    });

    if (roleSelectionModal) {
        document.getElementById('cancel-role-selection-btn').addEventListener('click', () => roleSelectionModal.classList.remove('visible'));
        document.getElementById('confirm-role-selection-btn').addEventListener('click', startStudioPlay);
    }

    if (exitPlayBtn) {
        exitPlayBtn.addEventListener('click', async () => {
            const choice = await showChoiceModal('退出演绎', [
                { text: '💾 保存进度并退出', value: 'save' },
                { text: '🚪 不保存直接退出', value: 'discard' },
            ]);
            if (choice === 'save') {
                const ok = saveStudioPlayProgress();
                if (!ok) {
                    await showCustomAlert('保存失败', '进度未能写入本地存储（可能空间不足或数据异常），请查看控制台日志。');
                    return;
                }
                activeStudioPlay = null;
                currentSaveId = null;
                showStudioScreen();
            } else if (choice === 'discard') {
                if (currentSaveId) { deleteStudioSave(currentSaveId); currentSaveId = null; }
                activeStudioPlay = null;
                showStudioScreen();
            }
        });
    }

    if (rerollPlayBtn) rerollPlayBtn.addEventListener('click', handleRerollPlay);
    if (sendPlayActionBtn) sendPlayActionBtn.addEventListener('click', handleUserPlayAction);

    if (summaryModal) {
        document.getElementById('generate-novel-btn').addEventListener('click', generateNovelFromPlay);
        document.getElementById('close-studio-summary-btn').addEventListener('click', () => {
            summaryModal.classList.remove('visible');
            activeStudioPlay = null; currentSaveId = null;
            showStudioScreen();
        });
    }

    if (novelModal) {
        document.getElementById('share-novel-btn').addEventListener('click', shareNovel);
        document.getElementById('close-novel-share-btn').addEventListener('click', () => {
            novelModal.classList.remove('visible');
            activeStudioPlay = null; currentSaveId = null;
            showStudioScreen();
        });
    }

    if (importScriptBtn) importScriptBtn.addEventListener('click', () => importInput.click());
    if (importInput) importInput.addEventListener('change', handleScriptImport);
    if (exportScriptBtn) exportScriptBtn.addEventListener('click', exportCurrentScript);

    const deleteScriptBtn = document.getElementById('delete-studio-script-btn');
    if (deleteScriptBtn) {
        deleteScriptBtn.addEventListener('click', async () => {
            if (!activeStudioScriptId) return;
            const script = await db.studioScripts.get(activeStudioScriptId);
            const scriptName = script ? script.name : '此剧本';
            const confirmed = await showCustomConfirm('确认删除', `确定要永久删除剧本《${scriptName}》吗？`, { confirmButtonClass: 'btn-danger' });
            if (confirmed) {
                await db.studioScripts.delete(activeStudioScriptId);
                activeStudioScriptId = null;
                alert('剧本已删除。');
                showStudioScriptsScreen();
            }
        });
    }
});
