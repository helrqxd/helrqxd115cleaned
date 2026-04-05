// =======================================================================
// ===               剧本杀 (Script Kill) 游戏模块                     ===
// =======================================================================

(function () {
    const GH = window.GameHall;

    let scriptKillGameState = {
        isActive: false, // 游戏是否正在进行
        script: null, // 当前加载的剧本对象
        players: [], // 玩家列表 { id, name, avatar, role, isUser, evidence, persona }
        gamePhase: 'setup', // 游戏阶段: setup, introduction, evidence, discussion, voting, end
        turnIndex: 0, // 当前行动的玩家索引
        gameLog: [], // 游戏日志
        evidenceCounts: {}, // 记录每个玩家已搜证次数
        votes: {}, // 投票记录
        is自由选择: false, // 是否为自由选择角色模式
    };

    let tempGeneratedScriptData = null;
    let editingScriptId = null; // 用于追踪正在编辑的剧本ID
    let currentEditingScriptData = { roles: [], clues: [] }; // 用于暂存正在编辑的剧本数据
    let editingItemIndex = -1; // -1 表示新建，否则为被编辑项的索引

    async function openScriptKillSetup() {
        showScreen('script-kill-setup-screen');

        const scriptSelect = document.getElementById('script-kill-script-select');
        scriptSelect.innerHTML = '<option value="">-- 请选择剧本 --</option>';

        // 1. 遍历我们创建的内置剧本库
        BUILT_IN_SCRIPTS.forEach(script => {
            const option = document.createElement('option');
            option.value = script.id; // value 是剧本的唯一ID
            option.textContent = `【内置】${script.name}`; // 显示的文本
            scriptSelect.appendChild(option);
        });

        // 2. 加载并显示自定义剧本
        const customScripts = await db.scriptKillScripts.toArray();
        customScripts.forEach(script => {
            const option = document.createElement('option');
            option.value = script.id;
            option.textContent = `【自定义】${script.name}`;
            scriptSelect.appendChild(option);
        });


        // 渲染玩家选择列表
        const selectionEl = document.getElementById('script-kill-player-selection');
        selectionEl.innerHTML = '<p>正在加载角色列表...</p>';

        const singleChats = Object.values(state.chats).filter(chat => !chat.isGroup);
        const allNpcs = Object.values(state.chats).flatMap(chat =>
            (chat.npcLibrary || []).map(npc => ({ ...npc, owner: chat.name })),
        );

        let playerOptions = [
            ...singleChats.map(c => ({ id: c.id, name: c.name, avatar: c.settings.aiAvatar, type: '角色' })),
            ...allNpcs.map(n => ({ id: n.id, name: n.name, avatar: n.avatar, type: `NPC (${n.owner})` })),
        ];

        selectionEl.innerHTML = '';
        playerOptions.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item'; // 复用样式
            item.innerHTML = `
            <input type="checkbox" class="script-kill-player-checkbox" value="${player.id}">
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
            <span class="type-tag">${player.type}</span>
        `;
            selectionEl.appendChild(item);
        });
    }


    /**
     * 【剧本杀】显示角色选择弹窗，让用户选择角色
     * @param {string} title - 弹窗标题
     * @param {Array<object>} options - 角色选项数组 [{text, value}]
     * @returns {Promise<number|null>} - 返回用户选择的角色的索引，如果取消则返回null
     */
    async function showRoleSelectionModal(title, options) {
        return new Promise(resolve => {
            const modal = document.getElementById('custom-modal-overlay');
            const modalTitle = document.getElementById('custom-modal-title');
            const modalBody = document.getElementById('custom-modal-body');
            const modalConfirmBtn = document.getElementById('custom-modal-confirm');
            const modalCancelBtn = document.getElementById('custom-modal-cancel');

            modalTitle.textContent = title;

            let optionsHtml = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
            options.forEach((option, index) => {
                optionsHtml += `
                <label style="display: block; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                    <input type="radio" name="role_selection" value="${option.value}" ${index === 0 ? 'checked' : ''}>
                    ${option.text}
                </label>
            `;
            });
            optionsHtml += '</div>';

            modalBody.innerHTML = optionsHtml;
            modalConfirmBtn.textContent = '确认选择';
            modalCancelBtn.style.display = 'block';

            modal.classList.add('visible');

            modalConfirmBtn.onclick = () => {
                const selectedRadio = document.querySelector('input[name="role_selection"]:checked');
                if (selectedRadio) {
                    modal.classList.remove('visible');
                    resolve(parseInt(selectedRadio.value));
                } else {
                    alert('请选择一个角色！');
                }
            };

            modalCancelBtn.onclick = () => {
                modal.classList.remove('visible');
                resolve(null);
            };
        });
    }

    /**
     * 【剧本杀】开始游戏的核心逻辑
     */
    async function startScriptKillGame() {
        const scriptId = document.getElementById('script-kill-script-select').value;
        if (!scriptId) {
            alert('请先选择一个剧本！');
            return;
        }

        let script;

        if (scriptId.startsWith('built_in_')) {
            // 如果是，就调用 getBuiltInScript 函数，并将正确的ID传进去
            script = getBuiltInScript(scriptId);
        } else {
            // 否则，说明是自定义剧本，才去数据库里查找
            script = await db.scriptKillScripts.get(parseInt(scriptId));
        }

        if (!script) {
            alert('加载剧本失败！');
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('.script-kill-player-checkbox:checked');
        const requiredPlayers = script.roles.length - 1;
        if (selectedCheckboxes.length !== requiredPlayers) {
            alert(`此剧本需要您邀请 ${requiredPlayers} 位AI或NPC玩家！`);
            return;
        }

        await showCustomAlert('请稍候...', '正在分配角色，请耐心等待...');

        // 1. 初始化游戏状态
        scriptKillGameState = {
            isActive: true,
            script: script,
            players: [],
            gamePhase: 'start',
            turnIndex: 0,
            gameLog: [],
            evidenceCounts: {},
            votes: {},
            isFreeChoice: document.getElementById('script-kill-free-choice-toggle').checked,
            discussionRound: 1,
            collectedClueIds: new Set(),
        };
        // 2. 收集玩家信息 (这部分不变)
        let invitedPlayers = [];
        selectedCheckboxes.forEach(checkbox => {
            const playerId = checkbox.value;
            const chat = Object.values(state.chats).find(c => c.id === playerId);
            if (chat) {
                invitedPlayers.push({
                    id: chat.id,
                    name: chat.name,
                    avatar: chat.settings.aiAvatar,
                    persona: chat.settings.aiPersona,
                    isUser: false,
                });
            } else {
                for (const c of Object.values(state.chats)) {
                    const npc = (c.npcLibrary || []).find(n => n.id === playerId);
                    if (npc) {
                        invitedPlayers.push({
                            id: npc.id,
                            name: npc.name,
                            avatar: npc.avatar,
                            persona: npc.persona,
                            isUser: false,
                        });
                        break;
                    }
                }
            }
        });
        const userPlayer = {
            id: 'user',
            name: state.qzoneSettings.nickname || '我',
            avatar: state.qzoneSettings.avatar || defaultAvatar,
            isUser: true,
            persona: '一个喜欢探案的普通人',
        };


        const assignedRoles = new Map(); // 使用Map存储 {playerId -> roleObject}
        let remainingRoles = [...script.roles]; // 创建一个可修改的角色列表副本

        if (scriptKillGameState.isFreeChoice) {
            // --- 自由选择模式 (玩家自选，AI随机) ---

            // 3a. 用户先从所有角色中选择一个
            const roleOptions = remainingRoles.map((role, index) => ({
                text: `【${role.name}】: ${role.description.substring(0, 40)}...`,
                value: index,
            }));
            const userChoiceIndex = await showRoleSelectionModal('请选择你的角色', roleOptions);
            if (userChoiceIndex === null) {
                GH.hideCustomModal();
                alert('你取消了角色选择，游戏未开始。');
                return;
            }
            // 从角色池中移除用户选择的角色，并分配给用户
            const userChosenRole = remainingRoles.splice(userChoiceIndex, 1)[0];
            assignedRoles.set(userPlayer.id, userChosenRole);

            // 3b. 将剩余的角色【随机打乱】
            remainingRoles.sort(() => Math.random() - 0.5);
            // 然后【按顺序】分配给AI们
            invitedPlayers.forEach((aiPlayer, index) => {
                assignedRoles.set(aiPlayer.id, remainingRoles[index]);
            });
        } else {
            // --- 随机分配模式 (旧逻辑保持不变) ---
            const allGamePlayers = [userPlayer, ...invitedPlayers];
            allGamePlayers.sort(() => Math.random() - 0.5);
            const shuffledRoles = [...script.roles].sort(() => Math.random() - 0.5);
            allGamePlayers.forEach((player, index) => {
                assignedRoles.set(player.id, shuffledRoles[index]);
            });
        }

        // 4. 组合最终的玩家列表 (这部分不变)
        const allPlayersWithRoles = [userPlayer, ...invitedPlayers].map(player => ({
            ...player,
            role: assignedRoles.get(player.id),
            evidence: [],
        }));
        scriptKillGameState.players = allPlayersWithRoles;

        // 5. 显示身份给用户 (这部分不变)
        const myPlayer = scriptKillGameState.players.find(p => p.isUser);
        GH.hideCustomModal();
        await showCustomAlert(
            `你的角色是：【${myPlayer.role.name}】`,
            `**角色介绍:**\n${myPlayer.role.description}\n\n**你的任务:**\n${myPlayer.role.tasks}`,
        );

        // 6. 切换到游戏界面并开始 (这部分不变)
        showScreen('script-kill-game-screen');
        await processScriptKillTurn();
    }

    /**
     * 【剧本杀】游戏主循环/引擎
     */
    async function processScriptKillTurn() {
        if (!scriptKillGameState.isActive) return;
        renderScriptKillGameScreen();

        switch (scriptKillGameState.gamePhase) {
            case 'start':
                logToScriptKillGame(`游戏开始！剧本：【${scriptKillGameState.script.name}】`, 'system');
                await GH.sleep(1000);
                logToScriptKillGame(`【故事背景】\n${scriptKillGameState.script.storyBackground}`, 'system');
                await GH.sleep(3000);
                logToScriptKillGame('请各位玩家查看自己的角色信息，准备进行自我介绍。', 'system');
                scriptKillGameState.gamePhase = 'introduction';
                await GH.sleep(2000);
                await processScriptKillTurn();
                break;

            case 'introduction':
                logToScriptKillGame('现在开始轮流进行自我介绍。', 'system');
                for (const player of scriptKillGameState.players) {
                    renderScriptKillGameScreen({ speakingPlayerId: player.id });
                    let introduction = player.isUser
                        ? await waitForUserActionSK('轮到你自我介绍了', 'speak', '简单介绍一下你自己和你所扮演的角色...')
                        : await triggerScriptKillAiAction(player.id, 'introduce');
                    logToScriptKillGame({ player: player, speech: introduction }, 'speech');
                    await GH.sleep(1000);
                }
                renderScriptKillGameScreen();
                logToScriptKillGame('自我介绍结束，现在请各位玩家分享自己的时间线。', 'system');
                scriptKillGameState.gamePhase = 'timeline_discussion';
                await GH.sleep(2000);
                await processScriptKillTurn();
                break;

            case 'timeline_discussion':
                logToScriptKillGame('请各位玩家轮流发言，梳理并公开自己的时间线。', 'system');
                await GH.sleep(1500);
                for (const player of scriptKillGameState.players) {
                    renderScriptKillGameScreen({ speakingPlayerId: player.id });
                    let timelineSpeech = player.isUser
                        ? await waitForUserActionSK('轮到你陈述时间线了', 'speak', '请根据你的剧本，详细说明你的行动轨迹...')
                        : await triggerScriptKillAiAction(player.id, 'discuss_timeline');
                    logToScriptKillGame({ player: player, speech: timelineSpeech }, 'speech');
                    await GH.sleep(1000);
                }
                renderScriptKillGameScreen();
                logToScriptKillGame('时间线陈述结束，现在进入【第一轮搜证环节】。', 'system');
                scriptKillGameState.gamePhase = 'evidence_round_1';
                await processScriptKillTurn();
                break;

            case 'evidence_round_1':
                updateActionAreaSK();
                logToScriptKillGame('进入第一轮搜证，每位玩家有【2次】搜证机会。', 'system');
                await GH.sleep(2000);

                // AI 进行第一轮的第1次搜证
                for (const player of scriptKillGameState.players) {
                    if (player.isUser) continue;
                    logToScriptKillGame(`轮到 ${player.role.name} (${player.name}) 进行第1次搜证...`);
                    await GH.sleep(2000);
                    await handleAiSearch(player);
                }
                // AI 进行第一轮的第2次搜证
                for (const player of scriptKillGameState.players) {
                    if (player.isUser) continue;
                    logToScriptKillGame(`轮到 ${player.role.name} (${player.name}) 进行第2次搜证...`);
                    await GH.sleep(2000);
                    await handleAiSearch(player);
                }
                logToScriptKillGame('所有AI搜证完毕，玩家可以继续搜证或结束本环节进入讨论。', 'system');
                break;

            case 'discussion_round_1':
                logToScriptKillGame('第一轮搜证结束，现在进入【第一轮讨论环节】。', 'system');
                updateActionAreaSK();
                break;

            case 'evidence_round_2':
                updateActionAreaSK();
                logToScriptKillGame('第一轮讨论结束，现在进入【第二轮搜证环节】。', 'system');
                logToScriptKillGame('根据刚才的讨论，各位玩家现在还有【1次】搜证机会。', 'system');
                await GH.sleep(2000);

                // AI 进行第二轮的唯一次搜证
                for (const player of scriptKillGameState.players) {
                    if (player.isUser) continue;
                    const searchCount = scriptKillGameState.evidenceCounts[player.id] || 0;
                    if (searchCount < 3) {
                        // 确保AI也有次数限制
                        logToScriptKillGame(`轮到 ${player.role.name} (${player.name}) 进行补充搜证...`);
                        await GH.sleep(2000);
                        await handleAiSearch(player);
                    }
                }
                logToScriptKillGame('所有AI补充搜证完毕，玩家可以继续搜证或结束本环节进入最终讨论。', 'system');
                break;

            // 第二轮讨论
            case 'discussion_round_2':
                logToScriptKillGame('第二轮搜证结束，现在进入【第二轮讨论环节】。', 'system');
                updateActionAreaSK(); // 显示发言按钮
                break;

            // 第三轮（最终）讨论
            case 'discussion_round_3':
                logToScriptKillGame('第二轮讨论结束，现在进入【最终讨论环节】。', 'system');
                updateActionAreaSK(); // 再次显示发言按钮
                break;

            case 'voting':
                // 投票和结束逻辑保持不变
                logToScriptKillGame('最终讨论结束，现在进入投票环节。请投票指认凶手！', 'system');
                const detailedVotes = {};
                const alivePlayers = scriptKillGameState.players;
                for (const voter of alivePlayers) {
                    let targetId = voter.isUser
                        ? await waitForUserActionSK('请投票指认凶手', 'vote')
                        : await triggerScriptKillAiAction(voter.id, 'vote');
                    detailedVotes[voter.id] = targetId;
                    if (targetId) {
                        const targetPlayer = scriptKillGameState.players.find(p => p.id === targetId);
                        logToScriptKillGame(`${voter.name} 投票给了 ${targetPlayer.name}。`);
                    } else {
                        logToScriptKillGame(`${voter.name} 弃票了。`);
                    }
                }
                scriptKillGameState.votes = detailedVotes;
                scriptKillGameState.gamePhase = 'end';
                await GH.sleep(2000);
                await processScriptKillTurn();
                break;

            case 'end':
                // 结束逻辑保持不变
                logToScriptKillGame('投票结束，正在公布真相...', 'system');
                await GH.sleep(2000);
                const voteCounts = {};
                for (const voterId in scriptKillGameState.votes) {
                    const targetId = scriptKillGameState.votes[voterId];
                    if (targetId) {
                        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
                    }
                }
                let maxVotes = 0,
                    votedPlayerIds = [];
                for (const playerId in voteCounts) {
                    if (voteCounts[playerId] > maxVotes) {
                        maxVotes = voteCounts[playerId];
                        votedPlayerIds = [playerId];
                    } else if (voteCounts[playerId] === maxVotes) {
                        votedPlayerIds.push(playerId);
                    }
                }
                const killer = scriptKillGameState.players.find(p => p.role.isKiller);
                let winner = '',
                    resultText = '';
                if (votedPlayerIds.length === 1 && votedPlayerIds[0] === killer.id) {
                    winner = '好人阵营';
                    resultText = `恭喜！你们成功指认出凶手【${killer.role.name} (${killer.name})】！好人阵营胜利！`;
                } else {
                    winner = '凶手阵营';
                    resultText = `很遗憾，真正的凶手是【${killer.role.name} (${killer.name})】！凶手阵营胜利！`;
                }
                logToScriptKillGame(resultText, 'system');
                await GH.sleep(3000);
                logToScriptKillGame(`【真相】\n${scriptKillGameState.script.truth}`, 'system');
                await showCustomAlert('请稍候...', 'AI正在生成本局复盘摘要...');
                const aiSummary = await generateAiSkSummary();
                const summary = generateSkSummary(winner, aiSummary);
                showScriptKillSummaryModal(summary);
                scriptKillGameState.isActive = false;
                updateActionAreaSK();
                break;
        }
    }


    /**
     * 【剧本杀】处理AI发言的重roll请求
     * @param {number} logIndex - 要重roll的发言在gameLog中的索引
     */
    async function handleScriptKillReroll(logIndex) {
        const logEntry = scriptKillGameState.gameLog[logIndex];
        if (!logEntry || logEntry.type !== 'speech' || !logEntry.message.player || logEntry.message.player.isUser) {
            return; // 安全检查，确保操作的是AI的发言
        }

        const playerToReroll = logEntry.message.player;

        // 给用户一个即时反馈
        const speechTextElement = document
            .querySelector(`button.sk-reroll-btn[data-log-index="${logIndex}"]`)
            .closest('.speech-content')
            .querySelector('.speech-text');
        if (speechTextElement) {
            speechTextElement.innerHTML = '<i>正在重新思考...</i>';
        }

        try {
            // 根据游戏阶段智能判断AI应该执行哪个动作
            let actionType;
            const currentPhase = scriptKillGameState.gamePhase;
            if (currentPhase === 'introduction') {
                actionType = 'introduce';
            } else if (currentPhase === 'timeline_discussion') {
                actionType = 'discuss_timeline';
            } else {
                actionType = 'discuss'; // 默认为自由讨论
            }

            // 重新调用AI生成新的发言
            const newSpeech = await triggerScriptKillAiAction(playerToReroll.id, actionType);

            // 用新的发言内容替换掉旧的
            scriptKillGameState.gameLog[logIndex].message.speech = newSpeech;

            // 重新渲染整个游戏界面以显示更新
            renderScriptKillGameScreen();
        } catch (error) {
            console.error('剧本杀发言重roll失败:', error);
            if (speechTextElement) {
                speechTextElement.innerHTML = `<i style="color:red;">重新生成失败，请检查网络或API设置。</i>`;
            }
        }
    }

    /**
     * 【剧本杀】渲染游戏主界面
     */
    function renderScriptKillGameScreen(options = {}) {
        const playersGrid = document.getElementById('script-kill-players-grid');
        const logContainer = document.getElementById('script-kill-game-log');

        playersGrid.innerHTML = '';
        scriptKillGameState.players.forEach(player => {
            const seat = document.createElement('div');
            seat.className = 'player-seat';
            const avatarClass = `player-avatar ${options.speakingPlayerId === player.id ? 'speaking' : ''}`;

            seat.innerHTML = `
            <img src="${player.avatar}" class="${avatarClass}">
            <span class="player-name">${player.role.name}</span>
        `;
            playersGrid.appendChild(seat);
        });

        logContainer.innerHTML = '';
        scriptKillGameState.gameLog.forEach((log, index) => {
            // 增加index参数
            const logEl = document.createElement('div');
            // 判断是否是AI的发言
            if (log.type === 'speech' && typeof log.message === 'object' && !log.message.player.isUser) {
                logEl.className = 'log-entry speech';
                const { player, speech } = log.message;

                // 为AI发言添加重roll按钮
                logEl.innerHTML = `
            <img src="${player.avatar}" class="speech-avatar">
            <div class="speech-content">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="speaker">${player.role.name} (${player.name})</span>
                    <button class="sk-reroll-btn" data-log-index="${index}" title="重新生成发言" style="background:none; border:none; cursor:pointer; padding:0; color:var(--text-secondary);">
                        <svg class="reroll-btn-icon" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                </div>
                <span class="speech-text">${speech.replace(/\n/g, '<br>')}</span>
            </div>
        `;
            } else if (log.type === 'speech') {
                // 用户的发言保持原样
                logEl.className = 'log-entry speech';
                const { player, speech } = log.message;
                logEl.innerHTML = `
            <img src="${player.avatar}" class="speech-avatar">
            <div class="speech-content">
                <span class="speaker">${player.role.name} (${player.name})</span>
                <span class="speech-text">${speech.replace(/\n/g, '<br>')}</span>
            </div>
        `;
            } else {
                // 其他系统消息也保持原样
                logEl.className = `log-entry ${log.type}`;
                logEl.innerHTML = String(log.message).replace(/\n/g, '<br>');
            }
            logContainer.appendChild(logEl);
        });
        logContainer.scrollTop = logContainer.scrollHeight;
    }


    /**
     * 【剧本杀】添加一条游戏日志
     */
    function logToScriptKillGame(message, type = 'system') {
        scriptKillGameState.gameLog.push({ message, type });
        renderScriptKillGameScreen();
    }

    /**
     * 【剧本杀】更新底部操作区域的按钮
     */
    function updateActionAreaSK() {
        const actionArea = document.getElementById('script-kill-action-area');
        actionArea.innerHTML = '';
        const user = scriptKillGameState.players.find(p => p.isUser);

        const phase = scriptKillGameState.gamePhase;
        const searchCount = scriptKillGameState.evidenceCounts[user.id] || 0;

        if (phase === 'evidence_round_1' || phase === 'evidence_round_2') {
            let searchesLeftInRound, totalInRound;
            if (phase === 'evidence_round_1') {
                searchesLeftInRound = 2 - searchCount;
                totalInRound = 2;
            } else {
                // evidence_round_2
                searchesLeftInRound = 3 - searchCount;
                totalInRound = 1;
            }

            const searchBtn = document.createElement('button');
            searchBtn.id = 'sk-search-evidence-btn';
            searchBtn.className = 'form-button';
            searchBtn.textContent = `搜证 (${searchesLeftInRound}/${totalInRound})`;
            searchBtn.disabled = searchesLeftInRound <= 0;
            actionArea.appendChild(searchBtn);

            const endSearchBtn = document.createElement('button');
            endSearchBtn.id = 'sk-end-search-btn';
            endSearchBtn.className = 'form-button-secondary';
            endSearchBtn.textContent = phase === 'evidence_round_1' ? '进入第一轮讨论' : '进入第二轮讨论';
            actionArea.appendChild(endSearchBtn);
        } else if (phase === 'discussion_round_1' || phase === 'discussion_round_2' || phase === 'discussion_round_3') {
            const speakBtn = document.createElement('button');
            speakBtn.id = 'sk-speak-btn';
            speakBtn.className = 'form-button';
            speakBtn.textContent = '我要发言';
            actionArea.appendChild(speakBtn);
        } else if (!scriptKillGameState.isActive && phase === 'end') {
            const backBtn = document.createElement('button');
            backBtn.className = 'form-button';
            backBtn.textContent = '返回游戏大厅';
            backBtn.onclick = () => showScreen('game-hall-screen');
            actionArea.appendChild(backBtn);
        }
    }


    /**
     * 【剧本杀】等待用户行动的通用函数
     */
    function waitForUserActionSK(promptText, actionType, placeholder = '') {
        return new Promise(resolve => {
            const actionArea = document.getElementById('script-kill-action-area');
            actionArea.innerHTML = '';
            actionArea.className = 'script-kill-action-area'; // 重置class

            if (actionType === 'speak') {
                // --- 这是我们美化后的发言输入区 ---
                actionArea.classList.add('speaking-mode'); // 激活新CSS

                const textarea = document.createElement('textarea');
                textarea.id = 'user-sk-speech-input'; // 使用剧本杀专用的ID
                textarea.rows = 1;
                textarea.placeholder = placeholder || '请输入你的发言...';
                // 实时调整高度
                textarea.addEventListener('input', () => {
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                });

                const endBtn = document.createElement('button');
                endBtn.id = 'sk-end-speech-btn'; // 使用剧本杀专用的ID
                endBtn.className = 'form-button';
                endBtn.textContent = '结束发言';

                actionArea.appendChild(textarea);
                actionArea.appendChild(endBtn);

                textarea.focus();

                endBtn.onclick = () => {
                    const speech = textarea.value.trim() || '我没什么好说的，过。';
                    actionArea.innerHTML = '';
                    actionArea.classList.remove('speaking-mode');
                    resolve(speech);
                };
                return; // 结束 'speak' 分支
            }

            // --- 以下是投票逻辑，保持原样 ---
            else if (actionType === 'vote') {
                const modal = document.getElementById('script-kill-vote-modal');
                const optionsEl = document.getElementById('sk-vote-options-list');
                optionsEl.innerHTML = '';

                scriptKillGameState.players.forEach(player => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="radio" name="sk_vote_target" value="${player.id}"> ${player.role.name} (${player.name})`;
                    optionsEl.appendChild(label);
                });

                document.getElementById('confirm-sk-vote-btn').onclick = () => {
                    const selected = document.querySelector('input[name="sk_vote_target"]:checked');
                    if (selected) {
                        modal.classList.remove('visible');
                        resolve(selected.value);
                    } else {
                        alert('请选择一个投票对象！');
                    }
                };
                document.getElementById('cancel-sk-vote-btn').onclick = () => {
                    modal.classList.remove('visible');
                    resolve(null); // 用户取消
                };
                modal.classList.add('visible');
            }
        });
    }

    /**
     * 处理单个AI的搜证行动 (每次只搜一个线索)
     * @param {object} player - 正在行动的AI玩家对象
     */
    async function handleAiSearch(player) {
        const script = scriptKillGameState.script;

        // 消耗一次搜证机会
        scriptKillGameState.evidenceCounts[player.id] = (scriptKillGameState.evidenceCounts[player.id] || 0) + 1;

        let foundMessage = ''; // 用于记录本轮搜证的结果

        // 1. 增加随机性：有30%的几率什么都搜不到
        if (Math.random() < 0.3) {
            foundMessage = '什么都没发现。';
        } else {
            // 2. 找出所有【全局还未被发现】的线索
            const uncollectedClues = script.clues.filter(c => !scriptKillGameState.collectedClueIds.has(c.description));

            if (uncollectedClues.length > 0) {
                // 3. 随机找到一条新线索
                const foundClue = uncollectedClues[Math.floor(Math.random() * uncollectedClues.length)];
                const clueSource = foundClue.owner === '公共' ? '公共区域' : `角色 ${foundClue.owner} 的私人物品`;

                // 4. 将线索存入AI手牌和全局线索池
                player.evidence.push({ description: foundClue.description, source: clueSource });
                scriptKillGameState.collectedClueIds.add(foundClue.description);

                let revealed = true; // 默认公开

                // 5. 如果线索是关于自己的，让AI决策是否公开
                if (foundClue.owner === player.role.name) {
                    const revealDecision = await triggerScriptKillAiAction(player.id, 'reveal_clue', {
                        clue: foundClue.description,
                    });
                    if (revealDecision && revealDecision.action === 'hide') {
                        revealed = false;
                    }
                }

                // 6. 根据AI的决策，记录不同的搜证结果
                if (revealed) {
                    foundMessage = `在【${clueSource}】发现并公开了线索："${foundClue.description}"`;
                } else {
                    foundMessage = `在【${clueSource}】发现了一条关于自己的线索，并选择将其隐藏。`;
                }
            } else {
                foundMessage = '没有发现更多新线索了。';
            }
        }

        // 7. 将搜证结果记录到游戏日志
        logToScriptKillGame(`${player.name} 完成了一次搜证: ${foundMessage}`);
        await GH.sleep(1500);
    }

    /**
     * 【剧本杀】触发AI行动
     */
    async function triggerScriptKillAiAction(playerId, action, context = {}) {
        const player = scriptKillGameState.players.find(p => p.id === playerId);
        if (!player) return;

        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');


        let jsonFormat = '';
        let extraContext = '';
        let systemPrompt = `
# 任务: 剧本杀角色扮演
# 你的双重身份 (必须严格遵守)
1.  **你的本体**: 你的真实身份是 **${player.name}**，你的核心性格是：**${player.persona}**。
2.  **你的剧本角色**: 在这场游戏中，你需要扮演角色 **【${player.role.name}】**。
    -   **剧本身份设定**: ${player.role.description}
    -   **你的故事线 (时间线)**: ${player.role.storyline} 
    -   **剧本秘密任务**: ${player.role.tasks}

# 你已掌握的线索: 
${player.evidence.map(e => `- ${e.description}`).join('\n') || '(暂无线索)'}

# 当前游戏阶段: ${scriptKillGameState.gamePhase}
# 游戏日志 (最近50条):
${scriptKillGameState.gameLog
                .slice(-50)
                .map(log => {
                    if (log.type === 'speech') return `${log.message.player.role.name}: ${log.message.speech}`;
                    return log.message;
                })
                .join('\n')}
${extraContext}
# 你的行动指令
`;

        switch (action) {
            case 'introduce':
                systemPrompt += '现在轮到你进行自我介绍。请根据你的人设，以第一人称进行一段简短的介绍。';
                jsonFormat = '{"action": "speak", "speech": "你的自我介绍..."}';
                break;

            case 'discuss_timeline':
                systemPrompt +=
                    '现在是时间线陈述环节。请根据你的角色剧本（包括身份设定和秘密任务），详细、清晰地陈述你在案发时间段内的行动轨迹。你的发言必须是第一人称，并且要听起来自然，可以适当隐藏对你不利的信息，但不能凭空捏造。';
                jsonFormat = '{"action": "speak", "speech": "你的时间线陈述..."}';
                break;

            case 'discuss':
                systemPrompt += '现在是自由讨论环节。请根据你掌握的线索和场上其他人的发言，发表你的看法、提出疑问或指证他人。';
                jsonFormat = '{"action": "speak", "speech": "你的发言..."}';
                break;
            case 'vote':
                systemPrompt += '现在是最终投票环节。请综合所有信息，投出你认为的凶手。';
                jsonFormat = '{"action": "vote", "targetId": "你投票的玩家ID"}';
                break;

            case 'reveal_clue':
                systemPrompt += `你刚刚搜到了一个关于你自己的线索："${context.clue}"。\n公开这条线索可能会让你暴露，但也可能洗清嫌疑；隐藏它可能会让你在后期被动。\n请根据你的人设和任务，决定是公开还是隐藏。`;
                jsonFormat = '{"action": "reveal" or "hide", "reasoning": "你的决策理由..."}';
                break;

        }

        systemPrompt += `\n# 存活玩家列表:\n${scriptKillGameState.players
            .map(p => `- ${p.role.name} (id: ${p.id})`)
            .join('\n')}\n# 输出格式: 你的回复【必须且只能】是一个严格的JSON对象，格式如下:\n${jsonFormat}`;

        try {
            let isGemini = proxyUrl === GEMINI_API_URL;
            let messagesForApi = [{ role: 'user', content: systemPrompt }];
            let geminiConfig = toGeminiRequestData(
                model,
                apiKey,
                systemPrompt,
                messagesForApi,
                isGemini,
                state.apiConfig.temperature,
            );

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model,
                        messages: messagesForApi,
                        ...window.buildModelParams(state.apiConfig),
                        response_format: { type: 'json_object' },
                    }),
                });

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(
                /^```json\s*|```$/g,
                '',
            );

            const aiAction = (window.repairAndParseJSON || JSON.parse)(content);

            if (aiAction.action === 'speak') return aiAction.speech;
            if (aiAction.action === 'vote') return aiAction.targetId;
            if (action === 'reveal_clue') return aiAction;

            return null;

        } catch (error) {
            console.error(`AI (${player.name}) 行动失败:`, error);
            // 返回一个保底的行动，防止游戏卡死
            if (action === 'vote') {
                const potentialTargets = scriptKillGameState.players.filter(p => p.id !== player.id);
                return potentialTargets[Math.floor(Math.random() * potentialTargets.length)].id;
            }
            return '我...我需要再想想。';
        }
    }

    /**
     * 【剧本杀】根据ID获取一个内置剧本
     * @param {string} scriptId - 要获取的剧本的ID, 例如 'built_in_1'
     * @returns {object|null} - 找到的剧本对象，或 null
     */
    function getBuiltInScript(scriptId) {

        return BUILT_IN_SCRIPTS.find(script => script.id === scriptId) || null;
    }

    // --- 自定义剧本管理核心功能 ---

    /**
     * 【总入口】打开自定义剧本管理模态框
     */
    async function openScriptManager() {
        await renderScriptManagerList();
        document.getElementById('script-kill-manager-modal').classList.add('visible');
    }

    /**
     * 渲染自定义剧本列表
     */
    async function renderScriptManagerList() {
        const listEl = document.getElementById('custom-scripts-list');
        listEl.innerHTML = '';
        const scripts = await db.scriptKillScripts.toArray();

        if (scripts.length === 0) {
            listEl.innerHTML =
                '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">还没有自定义剧本，点击右上角"添加"创建一个吧！</p>';
            return;
        }

        scripts.forEach(script => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
        <div class="item-title">${script.name}</div>
        <div class="item-content">${(script.storyBackground || '暂无简介').substring(0, 50)}...</div>
    `;

            item.addEventListener('click', () => openScriptEditorForEdit(script.id));

            GH.addLongPressListener(item, async () => {

                const choice = await showChoiceModal(`操作《${script.name}》`, [
                    { text: '📤 导出剧本', value: 'export' }, // <-- 新增
                    { text: '🗑️ 删除剧本', value: 'delete', isDanger: true },
                ]);

                if (choice === 'delete') {
                    deleteCustomScript(script.id, script.name);
                } else if (choice === 'export') {
                    // <-- 新增处理逻辑
                    await exportCustomScript(script.id);
                }

            });
            listEl.appendChild(item);
        });
    }

    /**
     * 渲染可视化剧本编辑器的主界面
     */
    function renderVisualScriptEditor() {
        const rolesContainer = document.getElementById('sk-roles-container');
        const cluesContainer = document.getElementById('sk-clues-container');
        rolesContainer.innerHTML = '';
        cluesContainer.innerHTML = '';

        // 渲染角色列表
        currentEditingScriptData.roles.forEach((role, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'sk-editor-item';
            itemEl.innerHTML = `
            <div class="item-info">
                <div class="item-name">${role.name} ${role.isKiller ? '🔪' : ''}</div>
                <div class="item-meta">${role.description.substring(0, 20)}...</div>
            </div>
            <div class="item-actions">
                <button class="form-button-secondary edit-role-btn" data-index="${index}">编辑</button>
                <button class="form-button-secondary delete-role-btn" data-index="${index}" style="border-color:#ff3b30; color:#ff3b30;">删除</button>
            </div>
        `;
            rolesContainer.appendChild(itemEl);
        });

        // 渲染线索列表
        currentEditingScriptData.clues.forEach((clue, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'sk-editor-item';
            itemEl.innerHTML = `
            <div class="item-info">
                <div class="item-name">线索 ${index + 1}</div>
                <div class="item-meta">归属于: ${clue.owner}</div>
            </div>
            <div class="item-actions">
                <button class="form-button-secondary edit-clue-btn" data-index="${index}">编辑</button>
                <button class="form-button-secondary delete-clue-btn" data-index="${index}" style="border-color:#ff3b30; color:#ff3b30;">删除</button>
            </div>
        `;
            cluesContainer.appendChild(itemEl);
        });
    }

    /**
     * 打开角色编辑器（新建或编辑）
     */
    function openRoleEditor(index = -1) {
        editingItemIndex = index;
        const modal = document.getElementById('sk-item-editor-modal');
        document.getElementById('sk-role-editor-fields').style.display = 'block';
        document.getElementById('sk-clue-editor-fields').style.display = 'none';

        if (index > -1) {
            // 编辑模式
            const role = currentEditingScriptData.roles[index];
            document.getElementById('sk-item-editor-title').textContent = `编辑角色: ${role.name}`;
            document.getElementById('sk-role-name-input').value = role.name;
            document.getElementById('sk-role-desc-input').value = role.description;

            document.getElementById('sk-role-storyline-input').value = role.storyline || ''; // 使用 || '' 确保旧数据不会显示'undefined'

            document.getElementById('sk-role-tasks-input').value = role.tasks;
            document.getElementById('sk-role-killer-toggle').checked = role.isKiller;
        } else {
            // 新建模式
            document.getElementById('sk-item-editor-title').textContent = '添加新角色';
            document.getElementById('sk-role-name-input').value = '';
            document.getElementById('sk-role-desc-input').value = '';

            document.getElementById('sk-role-storyline-input').value = ''; // 新建时清空

            document.getElementById('sk-role-tasks-input').value = '';
            document.getElementById('sk-role-killer-toggle').checked = false;
        }
        modal.classList.add('visible');
    }

    /**
     * 打开线索编辑器（新建或编辑）
     */
    function openClueEditor(index = -1) {
        editingItemIndex = index;
        const modal = document.getElementById('sk-item-editor-modal');
        document.getElementById('sk-role-editor-fields').style.display = 'none';
        document.getElementById('sk-clue-editor-fields').style.display = 'block';

        // 动态填充线索归属的下拉菜单
        const ownerSelect = document.getElementById('sk-clue-owner-select');
        ownerSelect.innerHTML = '<option value="公共">公共线索</option>';
        currentEditingScriptData.roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.name;
            option.textContent = `角色: ${role.name}`;
            ownerSelect.appendChild(option);
        });

        if (index > -1) {
            // 编辑模式
            const clue = currentEditingScriptData.clues[index];
            document.getElementById('sk-item-editor-title').textContent = `编辑线索 ${index + 1}`;
            ownerSelect.value = clue.owner;
            document.getElementById('sk-clue-desc-input').value = clue.description;
            document.getElementById('sk-clue-key-toggle').checked = clue.isKey || false;
        } else {
            // 新建模式
            document.getElementById('sk-item-editor-title').textContent = '添加新线索';
            ownerSelect.value = '公共';
            document.getElementById('sk-clue-desc-input').value = '';
            document.getElementById('sk-clue-key-toggle').checked = false;
        }
        modal.classList.add('visible');
    }

    /**
     * 保存子编辑器（角色或线索）中的数据
     */
    function saveItemFromEditor() {
        const isRoleEditor = document.getElementById('sk-role-editor-fields').style.display === 'block';

        if (isRoleEditor) {
            const roleData = {
                name: document.getElementById('sk-role-name-input').value.trim(),
                description: document.getElementById('sk-role-desc-input').value.trim(),

                storyline: document.getElementById('sk-role-storyline-input').value.trim(),

                tasks: document.getElementById('sk-role-tasks-input').value.trim(),
                isKiller: document.getElementById('sk-role-killer-toggle').checked,
            };
            if (!roleData.name) {
                alert('角色名称不能为空！');
                return;
            }

            if (editingItemIndex > -1) {
                currentEditingScriptData.roles[editingItemIndex] = roleData;
            } else {
                currentEditingScriptData.roles.push(roleData);
            }
        } else {
            const clueData = {
                owner: document.getElementById('sk-clue-owner-select').value,
                description: document.getElementById('sk-clue-desc-input').value.trim(),
                isKey: document.getElementById('sk-clue-key-toggle').checked,
            };
            if (!clueData.description) {
                alert('线索描述不能为空！');
                return;
            }

            if (editingItemIndex > -1) {
                currentEditingScriptData.clues[editingItemIndex] = clueData;
            } else {
                currentEditingScriptData.clues.push(clueData);
            }
        }

        document.getElementById('sk-item-editor-modal').classList.remove('visible');
        renderVisualScriptEditor(); // 刷新主编辑器界面
    }

    /**
     * 替换 openScriptEditorForCreate 函数
     */
    function openScriptEditorForCreate() {
        editingScriptId = null;
        currentEditingScriptData = { roles: [], clues: [] }; // 清空暂存数据
        document.getElementById('script-editor-title').textContent = '创建新剧本';
        document.getElementById('script-name-input').value = '';
        document.getElementById('script-background-input').value = '';
        document.getElementById('sk-truth-input').value = '';
        renderVisualScriptEditor(); // 渲染空的编辑器
        document.getElementById('script-kill-editor-modal').classList.add('visible');
    }

    /**
     * 替换 openScriptEditorForEdit 函数
     */
    async function openScriptEditorForEdit(scriptId) {
        editingScriptId = scriptId;
        const script = await db.scriptKillScripts.get(scriptId);
        if (!script) return;

        // 将数据库数据加载到暂存对象
        currentEditingScriptData = {
            roles: script.roles || [],
            clues: script.clues || [],
        };

        document.getElementById('script-editor-title').textContent = `编辑剧本: ${script.name}`;
        document.getElementById('script-name-input').value = script.name;
        document.getElementById('script-background-input').value = script.storyBackground;
        document.getElementById('sk-truth-input').value = script.truth;

        renderVisualScriptEditor(); // 渲染带有数据的编辑器
        document.getElementById('script-kill-editor-modal').classList.add('visible');
    }

    /**
     * 【可视化版】保存或更新自定义剧本
     */
    async function saveCustomScript() {
        const name = document.getElementById('script-name-input').value.trim();
        const background = document.getElementById('script-background-input').value.trim();
        const truth = document.getElementById('sk-truth-input').value.trim();

        if (!name || !background || !truth) {
            alert('剧本名称、故事背景和最终真相都不能为空！');
            return;
        }

        // 从 currentEditingScriptData 全局变量中获取角色和线索数据
        if (!currentEditingScriptData.roles || currentEditingScriptData.roles.length === 0) {
            alert('请至少添加一个角色！');
            return;
        }

        try {
            const scriptData = {
                name: name,
                storyBackground: background,
                roles: currentEditingScriptData.roles,
                clues: currentEditingScriptData.clues,
                truth: truth,
                isBuiltIn: false,
            };

            if (editingScriptId) {
                await db.scriptKillScripts.update(editingScriptId, scriptData);
                alert('剧本更新成功！');
            } else {
                await db.scriptKillScripts.add(scriptData);
                alert('新剧本保存成功！');
            }

            document.getElementById('script-kill-editor-modal').classList.remove('visible');
            await renderScriptManagerList(); // 刷新管理列表
            editingScriptId = null;
        } catch (error) {
            alert(`保存失败: ${error.message}`);
        }
    }

    /**
     * 删除一个自定义剧本
     * @param {number} scriptId - 要删除的剧本ID
     * @param {string} scriptName - 剧本名称，用于确认提示
     */
    async function deleteCustomScript(scriptId, scriptName) {
        const confirmed = await showCustomConfirm('删除剧本', `确定要永久删除自定义剧本《${scriptName}》吗？`, {
            confirmButtonClass: 'btn-danger',
        });
        if (confirmed) {
            await db.scriptKillScripts.delete(scriptId);
            await renderScriptManagerList();
            alert('剧本已删除。');
        }
    }
    /**
     * 导出指定的自定义剧本
     * @param {number} scriptId - 要导出的剧本ID
     */
    async function exportCustomScript(scriptId) {
        try {
            const script = await db.scriptKillScripts.get(scriptId);
            if (!script) {
                alert('错误：找不到要导出的剧本。');
                return;
            }

            // 1. 准备要导出的纯数据结构 (去除本地数据库ID，保留核心内容)
            const exportData = {
                type: 'EPhoneScriptKill', // 标记文件类型
                version: 1,
                name: script.name,
                storyBackground: script.storyBackground,
                truth: script.truth,
                roles: script.roles,
                clues: script.clues,
            };

            // 2. 转换为JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);

            // 3. 创建并下载文件
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            // 文件名示例: [剧本杀]古堡之谜-2024-01-01.json
            link.href = url;
            link.download = `[剧本杀]${script.name}-${dateStr}.json`;
            document.body.appendChild(link);
            link.click();

            // 4. 清理
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            await showCustomAlert('导出成功', `剧本《${script.name}》已成功导出！`);
        } catch (error) {
            console.error('导出剧本失败:', error);
            await showCustomAlert('导出失败', `发生错误: ${error.message}`);
        }
    }

    /**
     * 导入剧本杀剧本文件
     * @param {File} file - 用户选择的JSON文件
     */
    async function importCustomScript(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async e => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);

                // 1. 简单的格式验证
                if (!data.name || !data.roles || !data.clues || !data.truth) {
                    throw new Error('文件格式无效。缺少必要的剧本字段(name, roles, clues, truth)。');
                }

                // 2. 检查是否重名，如果重名自动重命名
                let newScriptName = data.name;
                const existingScript = await db.scriptKillScripts.where('name').equals(newScriptName).first();
                if (existingScript) {
                    newScriptName = `${newScriptName} (导入)`;
                }

                // 3. 构建入库数据
                const scriptToAdd = {
                    name: newScriptName,
                    storyBackground: data.storyBackground || '（无背景介绍）',
                    truth: data.truth,
                    roles: data.roles,
                    clues: data.clues,
                    isBuiltIn: false, // 标记为自定义剧本
                };

                // 4. 存入数据库
                await db.scriptKillScripts.add(scriptToAdd);

                // 5. 刷新列表并提示
                await renderScriptManagerList();
                await showCustomAlert('导入成功', `剧本《${newScriptName}》已成功导入！`);
            } catch (error) {
                console.error('导入剧本失败:', error);
                await showCustomAlert('导入失败', `解析文件时出错: ${error.message}`);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    /**
     * 【剧本杀】调用AI为整局游戏生成复盘摘要
     * @returns {Promise<string>} - AI生成的摘要文本
     */
    async function generateAiSkSummary() {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) {
            return '（AI摘要生成失败：API未配置）';
        }

        const formattedLog = scriptKillGameState.gameLog
            .map(log => {
                if (log.type === 'speech') {
                    return `${log.message.player.role.name}: ${log.message.speech}`;
                }
                return log.message;
            })
            .join('\n');

        const killer = scriptKillGameState.players.find(p => p.role.isKiller)?.role.name || '未知';

        const prompt = `
# 任务
你是一位专业的剧本杀复盘DM。请根据以下完整的游戏日志，用200字左右，客观、精炼地总结本局游戏的【关键事件】、【重要线索】和【玩家逻辑】。

# 核心要求
- 你的总结需要有逻辑、有条理，像一个真正的游戏复盘。
- 点出关键线索是如何被发现和利用的。
- 分析凶手(${killer})是如何隐藏自己的，以及好人阵营的推理亮点或误区。
- 你的输出【必须且只能】是复盘摘要的纯文本内容，不要包含任何额外的对话或标题。

# 游戏日志
${formattedLog}
`;

        try {
            const messagesForApi = [{ role: 'user', content: prompt }];
            let isGemini = proxyUrl === GEMINI_API_URL;
            let geminiConfig = toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini);

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: messagesForApi,
                        ...window.buildModelParams(state.apiConfig),
                    }),
                });

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            return (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).trim();
        } catch (error) {
            console.error('AI摘要生成失败:', error);
            return '（AI摘要生成失败，请检查网络或API设置）';
        }
    }


    /**
     * 【剧本杀】生成游戏复盘的文本，包含AI摘要和投票详情
     * @param {string} winner - 胜利的阵营名称
     * @param {string} aiSummary - AI生成的摘要文本
     * @returns {string} - 格式化后的完整复盘Markdown文本
     */
    function generateSkSummary(winner, aiSummary) {
        const roleNameMap = {
            wolf: '狼人',
            villager: '平民',
            seer: '预言家',
            witch: '女巫',
            hunter: '猎人',
            guard: '守卫',
            idiot: '白痴',
        };

        let summaryText = `**剧本杀 - 游戏复盘**\n\n`;
        summaryText += `**剧本:** ${scriptKillGameState.script.name}\n`;
        summaryText += `🏆 **胜利方:** ${winner}\n\n`;

        summaryText += `**本局摘要:**\n${aiSummary}\n\n`;

        summaryText += `**玩家身份:**\n`;
        scriptKillGameState.players.forEach(p => {
            const roleName = p.role.name || '未知角色';
            const isKiller = p.role.isKiller ? ' (🔪凶手)' : '';
            summaryText += `- ${p.name}: 扮演 ${roleName}${isKiller}\n`;
        });


        summaryText += `\n**投票详情:**\n`;
        const votes = scriptKillGameState.votes;
        const playerMap = new Map(scriptKillGameState.players.map(p => [p.id, p.name]));

        for (const voterId in votes) {
            const voterName = playerMap.get(voterId) || '未知投票者';
            const targetId = votes[voterId];

            if (targetId) {
                // 如果不是弃票
                const targetName = playerMap.get(targetId) || '未知目标';
                summaryText += `- ${voterName}  →  ${targetName}\n`;
            } else {
                // 如果是弃票
                summaryText += `- ${voterName}  →  弃票\n`;
            }
        }


        return summaryText;
    }


    /**
     * 【剧本杀】显示游戏结算卡片模态框
     * @param {string} summaryText - 复盘文本
     */
    function showScriptKillSummaryModal(summaryText) {
        const modal = document.getElementById('script-kill-summary-modal');
        const contentEl = document.getElementById('script-kill-summary-content');

        contentEl.innerHTML = GH.renderMarkdown(summaryText);

        const repostBtn = document.getElementById('repost-sk-summary-btn');
        const newRepostBtn = repostBtn.cloneNode(true);
        repostBtn.parentNode.replaceChild(newRepostBtn, repostBtn);
        newRepostBtn.onclick = () => openSkSummaryTargetPicker(summaryText);

        const backBtn = document.getElementById('back-to-hall-from-sk-btn');
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.onclick = () => {
            modal.classList.remove('visible');
            showScreen('game-hall-screen');
        };

        modal.classList.add('visible');
    }

    /**
     * 【剧本杀】打开复盘发送目标选择器
     * @param {string} summaryText - 要转发的复盘文本
     */
    function openSkSummaryTargetPicker(summaryText) {
        const modal = document.getElementById('script-kill-target-picker-modal');
        const listEl = document.getElementById('script-kill-target-list');
        listEl.innerHTML = '';

        const aiPlayers = scriptKillGameState.players.filter(p => !p.isUser);

        if (aiPlayers.length === 0) {
            alert('没有可转发的AI玩家。');
            return;
        }

        aiPlayers.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="script-kill-target-checkbox" value="${player.id}" checked>
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
        `;
            listEl.appendChild(item);
        });

        const confirmBtn = document.getElementById('sk-confirm-share-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = () => {
            const selectedIds = Array.from(document.querySelectorAll('.script-kill-target-checkbox:checked')).map(
                cb => cb.value,
            );
            if (selectedIds.length > 0) {
                sendSkSummaryToSelectedPlayers(summaryText, selectedIds);
            } else {
                alert('请至少选择一个转发对象！');
            }
        };

        modal.classList.add('visible');
    }

    /**
     * 【剧本杀】将游戏复盘发送到【选定】的AI角色的单聊中
     * @param {string} summaryText - 复盘文本
     * @param {string[]} targetIds - 目标AI角色的ID数组
     */
    async function sendSkSummaryToSelectedPlayers(summaryText, targetIds) {
        document.getElementById('script-kill-summary-modal').classList.remove('visible');
        document.getElementById('script-kill-target-picker-modal').classList.remove('visible');
        let sentCount = 0;

        const aiContext = `[系统指令：刚刚结束了一局剧本杀，这是游戏复盘。请根据这个复盘内容，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;

        for (const chatId of targetIds) {
            const chat = state.chats[chatId];
            if (chat) {
                const gameBaseTs = window.getUserMessageTimestamp(chat);
                const visibleMessage = {
                    role: 'user',
                    type: 'share_link',
                    timestamp: gameBaseTs,
                    title: '剧本杀 - 游戏复盘',
                    description: '点击查看详细复盘记录',
                    source_name: '游戏中心',
                    content: summaryText,
                };

                const hiddenInstruction = {
                    role: 'system',
                    content: aiContext,
                    timestamp: gameBaseTs + 1,
                    isHidden: true,
                };

                chat.history.push(visibleMessage, hiddenInstruction);
                await db.chats.put(chat);
                sentCount++;
            }
        }

        await showCustomAlert('转发成功', `游戏复盘已发送至 ${sentCount} 位AI玩家的单聊中！`);
        showScreen('game-hall-screen');
    }

    function openAiScriptGenerator() {
        // 隐藏剧本管理弹窗
        document.getElementById('script-kill-manager-modal').classList.remove('visible');

        const modal = document.getElementById('sk-ai-generator-modal');

        document.getElementById('sk-ai-elements-input').value = ''; // 清空要素输入框
        document.getElementById('sk-ai-summary-input').value = ''; // 清空梗概输入框

        document.getElementById('sk-ai-result-preview').textContent = '点击"开始生成"后，结果将显示在这里...';
        document.getElementById('sk-ai-generator-save-btn').disabled = true;
        tempGeneratedScriptData = null;

        modal.classList.add('visible');
    }

    /**
     * 【剧本杀】根据用户的要素和梗概，调用AI生成剧本
     */
    async function generateSkScriptWithAI() {
        // 1. 从新的两个输入框获取数据
        const elements = document.getElementById('sk-ai-elements-input').value.trim();
        const summary = document.getElementById('sk-ai-summary-input').value.trim();
        const playerCount = document.getElementById('sk-ai-player-count-input').value;

        if (!elements) {
            // 核心要素是必填的
            alert('请输入剧本的核心要素！');
            return;
        }

        const previewEl = document.getElementById('sk-ai-result-preview');
        const saveBtn = document.getElementById('sk-ai-generator-save-btn');
        previewEl.textContent = '🧠 AI正在奋力创作中，这可能需要1-2分钟，请耐心等待...';
        saveBtn.disabled = true;


        const systemPrompt = `
# 任务
你是一个专业的剧本杀剧本创作AI。你的任务是根据用户提供的核心要素和剧情梗概，创作一个【${playerCount}人】的、完整、可玩的剧本杀剧本。

# 用户提供的核心要素:
-   **玩家人数**: ${playerCount}人
-   **核心元素**: ${elements}
-   **剧情梗概**: ${summary || '（用户未提供详细梗概，请根据核心元素自由发挥）'}

# 【【【时间线铁律：这是最高指令，必须严格遵守】】】
在生成每个角色的 "storyline" (故事线) 字段时，你【必须】遵循以下规则：
1.  **必须包含明确的时间点**：每一段关键行动前，都必须有一个具体的时间，格式为【**HH:mm**】（例如：**20:30** 或 **晚上8点15分**）。
2.  **必须是具体的行动轨迹**：禁止使用"后来"、"过了一会儿"等模糊描述。必须清楚地写出角色在【什么时间】、【什么地点】、【做了什么事】。
3.  **提供清晰的示例**:
    -   **【【错误的模糊示例】】**: "晚上我和他吵了一架，然后离开了。"
    -   **【【正确的详细示例】】**: "**20:30**: 我在书房因为项目资金问题和王总监大吵一架，他威胁要解雇我。 **20:45**: 我愤怒地摔门而出，回到了自己的工位。"

# 剧本创作核心要求
1.  **完整性**: 你必须生成剧本的所有组成部分，包括：剧本名称(name)、故事背景(storyBackground)、角色设定(roles)、线索卡(clues)、以及最终真相(truth)。
2.  **角色设定 (roles)**:
    -   必须是一个包含【${playerCount}个】角色对象的数组。
    -   每个角色对象必须包含以下字段:
        -   name: 角色名称 (字符串)。
        -   description: 角色简介 (字符串, 简短描述)。
        -   storyline: 角色的个人故事线或时间线 (字符串, **必须遵守【时间线铁律】**)。
        -   tasks: 角色的秘密任务 (字符串)。
        -   isKiller: 是否是凶手 (布尔值, true 或 false)。
    -   剧本中【必须有且只有一个】角色的 isKiller 为 true。
3.  **线索卡 (clues)**:
    -   必须是一个包含多个线索对象的数组。
    -   每个线索对象必须包含以下字段:
        -   owner: 线索归属 (字符串, 可以是某个角色名，也可以是 "公共")。
        -   description: 线索的详细描述 (字符串)。
        -   isKey: 是否是关键线索 (布尔值, true 或 false)。
    -   至少要有一条关键线索。
4.  **最终真相 (truth)**: 必须清晰、有逻辑地揭示整个案件的真相、凶手的动机和作案手法。

# 【格式铁律】
你的回复【必须且只能】是一个严格的JSON对象，直接以 '{' 开头，以 '}' 结尾。禁止包含任何 "json", "\`\`\`" 或其他解释性文字。
`;

        // 3. 调用API (这部分逻辑与之前相同)
        try {
            const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
            let isGemini = proxyUrl === GEMINI_API_URL;
            let messagesForApi = [{ role: 'user', content: systemPrompt }];
            let geminiConfig = toGeminiRequestData(
                model,
                apiKey,
                systemPrompt,
                messagesForApi,
                isGemini,
                state.apiConfig.temperature,
            );

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: messagesForApi,
                        ...window.buildModelParams(state.apiConfig),
                        response_format: { type: 'json_object' },
                    }),
                });

            if (!response.ok) throw new Error(`API请求失败: ${response.status} - ${await response.text()}`);

            const data = await response.json();
            const rawContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content)
                .replace(/^```json\s*|```$/g, '')
                .trim();

            const generatedScript = (window.repairAndParseJSON || JSON.parse)(rawContent);

            if (
                !generatedScript.name ||
                !generatedScript.storyBackground ||
                !Array.isArray(generatedScript.roles) ||
                !Array.isArray(generatedScript.clues) ||
                !generatedScript.truth
            ) {
                throw new Error('AI返回的JSON格式不完整，缺少必要的字段。');
            }

            previewEl.textContent = JSON.stringify(generatedScript, null, 2);
            tempGeneratedScriptData = generatedScript;
            saveBtn.disabled = false;

            await showCustomAlert('生成成功！', '剧本已生成，请在下方预览。如果满意，可以点击保存。');
        } catch (error) {
            console.error('AI剧本生成失败:', error);
            previewEl.textContent = `生成失败！请检查API设置或网络后重试。\n\n错误信息: ${error.message}`;
            await showCustomAlert('生成失败', `发生了一个错误：\n${error.message}`);
        }
    }

    /**
     * 保存AI生成的剧本
     */
    async function saveAiGeneratedScript() {
        if (!tempGeneratedScriptData) {
            alert('没有可以保存的剧本数据。');
            return;
        }

        try {
            const scriptToSave = {
                ...tempGeneratedScriptData,
                isBuiltIn: false, // 标记为非内置剧本
            };

            // 存入数据库
            await db.scriptKillScripts.add(scriptToSave);

            document.getElementById('sk-ai-generator-modal').classList.remove('visible'); // 关闭AI生成器
            await renderScriptManagerList(); // 刷新剧本管理列表

            alert(`剧本《${scriptToSave.name}》已成功保存到你的自定义剧本库中！`);
        } catch (error) {
            console.error('保存AI剧本失败:', error);
            alert(`保存失败: ${error.message}`);
        }
    }

    function initScriptKillEvents() {
        // 剧本杀游戏事件监听器
        document.getElementById('start-script-kill-game-btn').addEventListener('click', startScriptKillGame);
        document.getElementById('exit-script-kill-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出游戏吗？当前进度不会保存。');
            if (confirmed) {
                scriptKillGameState.isActive = false; // 停止游戏循环
                showScreen('game-hall-screen');
            }
        });
        // 剧本杀游戏事件监听器
        document.getElementById('script-kill-my-role-btn').addEventListener('click', () => {
            if (!scriptKillGameState.isActive) return;
            const myPlayer = scriptKillGameState.players.find(p => p.isUser);
            if (myPlayer) {
                const modal = document.getElementById('script-kill-role-modal');
                document.getElementById('sk-role-name').textContent = `你的角色：${myPlayer.role.name}`;

                document.getElementById('sk-role-details').innerHTML = `
            <p><strong>角色介绍:</strong><br>${myPlayer.role.description}</p>
            <p><strong>你的时间线:</strong><br>${myPlayer.role.storyline || '（暂无时间线信息）'}</p>
            <p><strong>你的任务:</strong><br>${myPlayer.role.tasks}</p>
        `;

                modal.classList.add('visible');
            }
        });
        document.getElementById('close-sk-role-modal-btn').addEventListener('click', () => {
            document.getElementById('script-kill-role-modal').classList.remove('visible');
        });

        // 查看线索板
        document.getElementById('script-kill-all-evidence-btn').addEventListener('click', () => {
            if (!scriptKillGameState.isActive) return;
            const modal = document.getElementById('script-kill-evidence-modal');
            const listEl = document.getElementById('sk-evidence-list');
            listEl.innerHTML = '';

            const myPlayer = scriptKillGameState.players.find(p => p.isUser);
            if (myPlayer.evidence.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">你还没有搜到任何线索。</p>';
            } else {
                myPlayer.evidence.forEach(clue => {
                    const card = document.createElement('div');
                    card.className = 'sk-evidence-card';
                    card.innerHTML = `
                <div class="source">来源: ${clue.source}</div>
                <div class="description">${clue.description}</div>
            `;
                    listEl.appendChild(card);
                });
            }
            modal.classList.add('visible');
        });
        document.getElementById('close-sk-evidence-modal-btn').addEventListener('click', () => {
            document.getElementById('script-kill-evidence-modal').classList.remove('visible');
        });


        document.getElementById('script-kill-action-area').addEventListener('click', async e => {
            const phase = scriptKillGameState.gamePhase;


            if (e.target.id === 'sk-search-evidence-btn') {
                const user = scriptKillGameState.players.find(p => p.isUser);
                const script = scriptKillGameState.script;

                const searchCount = scriptKillGameState.evidenceCounts[user.id] || 0;
                const phase = scriptKillGameState.gamePhase;

                // 检查搜证次数限制
                if ((phase === 'evidence_round_1' && searchCount >= 2) || (phase === 'evidence_round_2' && searchCount >= 3)) {
                    alert('本轮搜证次数已用完！');
                    return;
                }

                // 消耗一次搜证机会并更新UI
                scriptKillGameState.evidenceCounts[user.id] = searchCount + 1;
                updateActionAreaSK();

                let foundMessage = '';

                // 找出所有还未被发现的线索
                const uncollectedClues = script.clues.filter(c => !scriptKillGameState.collectedClueIds.has(c.description));

                if (uncollectedClues.length > 0) {
                    // 随机找到一条新线索
                    const foundClue = uncollectedClues[Math.floor(Math.random() * uncollectedClues.length)];
                    const clueSource = foundClue.owner === '公共' ? '公共区域' : `角色 ${foundClue.owner} 的私人物品`;

                    // 无论如何，线索都会先加入玩家手牌，并标记为已发现
                    user.evidence.push({ description: foundClue.description, source: clueSource });
                    scriptKillGameState.collectedClueIds.add(foundClue.description);

                    // --- ★★★ 核心修改逻辑开始 ★★★ ---

                    // 判断这条线索是不是关于玩家自己的
                    if (foundClue.owner === user.role.name) {
                        // 如果是，弹出一个选择框让玩家决定
                        const choice = await showChoiceModal('发现个人线索', [
                            { text: '公开这条线索', value: 'public' },
                            { text: '隐藏这条线索', value: 'private' },
                        ]);

                        if (choice === 'public') {
                            // 玩家选择【公开】
                            foundMessage = `在【${clueSource}】发现并公开了线索："${foundClue.description}"`;
                            logToScriptKillGame(`${user.name} 完成了一次搜证: ${foundMessage}`);
                            await showCustomAlert('搜证结果', foundMessage);
                        } else {
                            // 玩家选择【隐藏】或关闭了弹窗
                            foundMessage = `你在【${clueSource}】发现了一条关于自己的线索，并选择将其隐藏。`;
                            // 只给玩家自己一个弹窗提示，告诉他已经拿到了线索
                            await showCustomAlert('搜证结果', `你已将线索"${foundClue.description}"收入囊中。`);
                            // 在公共日志里只显示一个模糊的信息，告诉大家你搜过证了
                            logToScriptKillGame(`${user.name} 完成了一次搜证。`);
                        }
                    } else {
                        // 如果线索是公共的，或者关于其他人的，就按原来的逻辑直接公开
                        foundMessage = `在【${clueSource}】发现线索："${foundClue.description}"`;
                        logToScriptKillGame(`${user.name} 完成了一次搜证: ${foundMessage}`);
                        await showCustomAlert('搜证结果', foundMessage);
                    }

                } else {
                    // 如果已经没有新线索了
                    foundMessage = '没有发现更多新线索了。';
                    logToScriptKillGame(`${user.name} 完成了一次搜证: ${foundMessage}`);
                    await showCustomAlert('搜证结果', foundMessage);
                }
            }


            // --- 2. 处理"结束搜证"按钮 ---
            if (e.target.id === 'sk-end-search-btn') {
                if (phase === 'evidence_round_1') {
                    scriptKillGameState.gamePhase = 'discussion_round_1';
                    await processScriptKillTurn();
                } else if (phase === 'evidence_round_2') {
                    // 第二轮搜证后，进入第二轮讨论
                    scriptKillGameState.gamePhase = 'discussion_round_2';
                    await processScriptKillTurn();
                }
            }

            // --- 3. 处理"我要发言"按钮 ---
            if (e.target.id === 'sk-speak-btn') {
                const speech = await waitForUserActionSK('轮到你发言了', 'speak', '请输入你的发言...');
                const userPlayer = scriptKillGameState.players.find(p => p.isUser);
                logToScriptKillGame({ player: userPlayer, speech: speech }, 'speech');

                for (const player of scriptKillGameState.players.filter(p => !p.isUser)) {
                    await GH.sleep(2000);
                    renderScriptKillGameScreen({ speakingPlayerId: player.id });
                    const aiSpeech = await triggerScriptKillAiAction(player.id, 'discuss');
                    logToScriptKillGame({ player: player, speech: aiSpeech }, 'speech');
                }
                renderScriptKillGameScreen();

                // 根据当前讨论轮次，决定下一个阶段
                if (phase === 'discussion_round_1') {
                    scriptKillGameState.gamePhase = 'evidence_round_2';
                    await processScriptKillTurn();
                } else if (phase === 'discussion_round_2') {
                    // 第二轮讨论后，进入第三轮（最终）讨论
                    scriptKillGameState.gamePhase = 'discussion_round_3';
                    await processScriptKillTurn();
                } else if (phase === 'discussion_round_3') {
                    // 最终讨论后，才进入投票
                    scriptKillGameState.gamePhase = 'voting';
                    await processScriptKillTurn();
                }
            }
        });

        // 剧本杀管理功能事件监听器
        document.getElementById('manage-custom-scripts-btn').addEventListener('click', openScriptManager);

        // 管理器弹窗的按钮
        document.getElementById('add-new-script-btn').addEventListener('click', () => {
            document.getElementById('script-kill-manager-modal').classList.remove('visible');
            openScriptEditorForCreate();
        });
        document.getElementById('close-script-manager-btn').addEventListener('click', () => {
            document.getElementById('script-kill-manager-modal').classList.remove('visible');
            // 关闭后刷新一下设置页面的剧本下拉框
            openScriptKillSetup();
            showScreen('script-kill-setup-screen');
        });

        // 编辑器弹窗的按钮
        document.getElementById('save-script-btn').addEventListener('click', saveCustomScript);
        document.getElementById('cancel-script-editor-btn').addEventListener('click', () => {
            document.getElementById('script-kill-editor-modal').classList.remove('visible');
            // 如果是从管理界面进来的，就返回管理界面
            if (document.getElementById('script-kill-manager-modal').classList.contains('visible') === false) {
                openScriptManager();
            }
        });
        // 剧本杀可视化编辑器事件监听器
        document.getElementById('sk-add-role-btn').addEventListener('click', () => openRoleEditor());
        document.getElementById('sk-add-clue-btn').addEventListener('click', () => openClueEditor());

        document.getElementById('sk-item-editor-cancel-btn').addEventListener('click', () => {
            document.getElementById('sk-item-editor-modal').classList.remove('visible');
        });
        document.getElementById('sk-item-editor-save-btn').addEventListener('click', saveItemFromEditor);

        // 使用事件委托处理角色和线索卡片上的按钮点击
        document.getElementById('script-kill-editor-modal').addEventListener('click', e => {
            const target = e.target;
            if (target.classList.contains('edit-role-btn')) {
                openRoleEditor(parseInt(target.dataset.index));
            }
            if (target.classList.contains('delete-role-btn')) {
                const index = parseInt(target.dataset.index);
                currentEditingScriptData.roles.splice(index, 1);
                renderVisualScriptEditor();
            }
            if (target.classList.contains('edit-clue-btn')) {
                openClueEditor(parseInt(target.dataset.index));
            }
            if (target.classList.contains('delete-clue-btn')) {
                const index = parseInt(target.dataset.index);
                currentEditingScriptData.clues.splice(index, 1);
                renderVisualScriptEditor();
            }
        });

        // 剧本杀复盘分享功能事件绑定
        document.getElementById('sk-cancel-share-btn').addEventListener('click', () => {
            document.getElementById('script-kill-target-picker-modal').classList.remove('visible');
        });
        document.getElementById('sk-select-all-btn').addEventListener('click', () => {
            document.querySelectorAll('.script-kill-target-checkbox').forEach(cb => (cb.checked = true));
        });
        document.getElementById('sk-deselect-all-btn').addEventListener('click', () => {
            document.querySelectorAll('.script-kill-target-checkbox').forEach(cb => (cb.checked = false));
        });
        // AI剧本生成器事件监听器
        document.getElementById('open-sk-ai-generator-btn').addEventListener('click', openAiScriptGenerator);
        document.getElementById('sk-ai-generator-cancel-btn').addEventListener('click', () => {
            document.getElementById('sk-ai-generator-modal').classList.remove('visible');
            // 返回到剧本管理界面
            openScriptManager();
        });
        document.getElementById('sk-trigger-ai-generation-btn').addEventListener('click', generateSkScriptWithAI);
        document.getElementById('sk-ai-generator-save-btn').addEventListener('click', saveAiGeneratedScript);

        // 剧本杀重roll事件
        document.getElementById('script-kill-game-log').addEventListener('click', e => {
            const rerollBtn = e.target.closest('.sk-reroll-btn');
            if (rerollBtn) {
                const logIndex = parseInt(rerollBtn.dataset.logIndex);
                if (!isNaN(logIndex)) {
                    handleScriptKillReroll(logIndex);
                }
            }
        });

        // --- 剧本杀导入功能事件监听 ---
        const importScriptBtn = document.getElementById('import-script-btn');
        if (importScriptBtn) {
            importScriptBtn.addEventListener('click', () => {
                document.getElementById('script-kill-import-input').click();
            });
        }
        const importScriptInput = document.getElementById('script-kill-import-input');
        if (importScriptInput) {
            importScriptInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (file) {
                    importCustomScript(file);
                }
                e.target.value = null;
            });
        }
    }

    GH.scriptKill = {
        openSetup: openScriptKillSetup,
        initEvents: initScriptKillEvents,
        getState: () => scriptKillGameState,
    };
})();
