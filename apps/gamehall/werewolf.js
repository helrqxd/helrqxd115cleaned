// =======================================================================
// ===               狼人杀 (Werewolf) 游戏模块                       ===
// =======================================================================

(function () {
    const GH = window.GameHall;

    let werewolfGameState = {
        isActive: false,
        players: [],
        roles: {},
        gamePhase: 'setup',
        dayNumber: 0,
        gameLog: [],
        turnIndex: 0,
        votes: {},
        seerLastNightResult: null,
        witchPotions: { save: 1, poison: 1 },
        hunterTarget: null,
        lastNightKilled: [],
        waitingFor: null,
        gameConfig: {},
    };

    async function openWerewolfSetup() {
        showScreen('werewolf-setup-screen');
        const selectionEl = document.getElementById('werewolf-player-selection');
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
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="werewolf-player-checkbox" value="${player.id}">
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
            <span class="type-tag">${player.type}</span>
        `;
            selectionEl.appendChild(item);
        });

        const inviteModeRadios = document.querySelectorAll('input[name="undercover_invite_mode"]');
        const manualOptions = document.getElementById('undercover-manual-invite-options');
        const randomOptions = document.getElementById('undercover-random-invite-options');

        inviteModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'manual') {
                    manualOptions.style.display = 'block';
                    randomOptions.style.display = 'none';
                } else {
                    manualOptions.style.display = 'none';
                    randomOptions.style.display = 'block';
                }
            });
        });

        document.querySelector('input[name="undercover_invite_mode"]:checked').dispatchEvent(new Event('change'));
    }

    async function startWerewolfGame() {
        const countSelect = document.getElementById('werewolf-player-count');
        const totalPlayers = parseInt(countSelect.value);

        const selectedCheckboxes = document.querySelectorAll('.werewolf-player-checkbox:checked');
        if (selectedCheckboxes.length !== totalPlayers - 1) {
            alert(`请选择 ${totalPlayers - 1} 位AI或NPC玩家！`);
            return;
        }

        werewolfGameState = {
            isActive: true,
            players: [],
            roles: {},
            gamePhase: 'start',
            dayNumber: 0,
            gameLog: [],
            turnIndex: 0,
            votes: {},
            seerLastNightResult: null,
            witchPotions: { save: 1, poison: 1 },
            hunterTarget: null,
            lastNightKilled: [],
            waitingFor: null,
            gameConfig: { totalPlayers },
        };

        werewolfGameState.players.push({
            id: 'user',
            name: state.qzoneSettings.nickname || '我',
            avatar: state.qzoneSettings.avatar || defaultAvatar,
            isAlive: true,
            isUser: true,
        });

        selectedCheckboxes.forEach(checkbox => {
            const playerId = checkbox.value;
            const chat = Object.values(state.chats).find(c => c.id === playerId);
            if (chat) {
                werewolfGameState.players.push({
                    id: chat.id,
                    name: chat.name,
                    avatar: chat.settings.aiAvatar,
                    persona: chat.settings.aiPersona,
                    isAlive: true,
                    isUser: false,
                });
            } else {
                for (const c of Object.values(state.chats)) {
                    const npc = (c.npcLibrary || []).find(n => n.id === playerId);
                    if (npc) {
                        werewolfGameState.players.push({
                            id: npc.id,
                            name: npc.name,
                            avatar: npc.avatar,
                            persona: npc.persona,
                            isAlive: true,
                            isUser: false,
                        });
                        break;
                    }
                }
            }
        });

        werewolfGameState.players.sort(() => Math.random() - 0.5);

        const roleConfigs = {
            6: { wolf: 2, villager: 2, seer: 1, guard: 1 },
            9: { wolf: 3, villager: 3, seer: 1, witch: 1, hunter: 1 },
            12: { wolf: 4, villager: 4, seer: 1, witch: 1, hunter: 1, idiot: 1 },
        };

        const rolesToAssign = [];
        const config = roleConfigs[totalPlayers];
        werewolfGameState.roles = config;
        for (const role in config) {
            for (let i = 0; i < config[role]; i++) {
                rolesToAssign.push(role);
            }
        }

        rolesToAssign.sort(() => Math.random() - 0.5);

        werewolfGameState.players.forEach((player, index) => {
            player.role = rolesToAssign[index];
        });

        const roleNameMap = {
            wolf: '狼人', villager: '平民', seer: '预言家',
            witch: '女巫', hunter: '猎人', guard: '守卫', idiot: '白痴',
        };

        const userPlayer = werewolfGameState.players.find(p => p.isUser);
        if (userPlayer) {
            const myRoleName = roleNameMap[userPlayer.role] || userPlayer.role;
            await showCustomAlert('你的身份', `你在本局游戏中的身份是：【${myRoleName}】`);
        }

        showScreen('werewolf-game-screen');
        await processGameTurn();
    }

    async function processGameTurn() {
        if (!werewolfGameState.isActive) return;

        renderWerewolfGameScreen();

        switch (werewolfGameState.gamePhase) {
            case 'start':
                logToWerewolfGame('游戏开始，正在分配身份...');
                const roleNameMapForLog = {
                    wolf: '狼人', villager: '平民', seer: '预言家',
                    witch: '女巫', hunter: '猎人', guard: '守卫', idiot: '白痴',
                };
                const configText = Object.entries(werewolfGameState.roles)
                    .map(([role, count]) => `${roleNameMapForLog[role] || role}x${count}`)
                    .join(', ');
                logToWerewolfGame(`本局配置: ${configText}`);
                werewolfGameState.gamePhase = 'night_start';
                await GH.sleep(3000);
                await processGameTurn();
                break;

            case 'night_start':
                werewolfGameState.dayNumber++;
                werewolfGameState.lastNightKilled = [];
                werewolfGameState.votes = {};
                logToWerewolfGame(`第 ${werewolfGameState.dayNumber} 天，天黑请闭眼。`);
                werewolfGameState.gamePhase = 'guard_action';
                await GH.sleep(2000);
                await processGameTurn();
                break;

            case 'guard_action': {
                const guard = werewolfGameState.players.find(p => p.role === 'guard' && p.isAlive);
                if (guard) {
                    logToWerewolfGame('守卫请睁眼，请选择你要守护的玩家。');
                    let protectedId;
                    if (guard.isUser) {
                        protectedId = await waitForUserAction('请选择你要守护的玩家', 'guard_protect');
                    } else {
                        protectedId = await triggerWerewolfAiAction(guard.id, 'guard_protect');
                    }
                    werewolfGameState.guardLastNightProtected = protectedId;
                    logToWerewolfGame(`守卫请闭眼。`);
                }
                werewolfGameState.gamePhase = 'wolf_action';
                await GH.sleep(2000);
                await processGameTurn();
                break;
            }

            case 'wolf_action': {
                logToWerewolfGame('狼人请睁眼，请选择一个目标。');
                const wolves = werewolfGameState.players.filter(p => p.role === 'wolf' && p.isAlive);
                const userPlayer = wolves.find(w => w.isUser);
                let allWolfVotes = [];

                if (userPlayer) {
                    const aiWolves = wolves.filter(w => !w.isUser);
                    let suggestionsText = '🐺 狼人频道 (秘密):\n';

                    if (aiWolves.length > 0) {
                        const aiVotePromises = aiWolves.map(wolf =>
                            triggerWerewolfAiAction(wolf.id, 'wolf_kill', { isUserWolfAlly: true }),
                        );
                        const aiVotes = (await Promise.all(aiVotePromises)).filter(Boolean);
                        allWolfVotes.push(...aiVotes);

                        aiVotes.forEach((targetId, index) => {
                            const votingWolf = aiWolves[index];
                            const targetPlayer = werewolfGameState.players.find(p => p.id === targetId);
                            if (votingWolf && targetPlayer) {
                                suggestionsText += `- ${votingWolf.name} 提议击杀: ${targetPlayer.name}\n`;
                            }
                        });
                        suggestionsText += '\n请参考队友意见后进行投票。';
                        await showCustomAlert('狼人请沟通', suggestionsText);
                    } else {
                        await showCustomAlert('你是唯一的狼', '请独自决定今晚的目标。');
                    }

                    const userVote = await waitForUserAction('请选择最终攻击目标', 'wolf_kill');
                    if (userVote) {
                        allWolfVotes.push(userVote);
                    }
                } else {
                    const wolfPromises = wolves.map(wolf => triggerWerewolfAiAction(wolf.id, 'wolf_kill'));
                    const wolfVotes = (await Promise.all(wolfPromises)).filter(Boolean);
                    allWolfVotes.push(...wolfVotes);
                }

                const voteCounts = {};
                allWolfVotes.forEach(vote => {
                    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
                });

                let maxVotes = 0;
                let targetId = null;
                let tied = false;
                for (const id in voteCounts) {
                    if (voteCounts[id] > maxVotes) {
                        maxVotes = voteCounts[id];
                        targetId = id;
                        tied = false;
                    } else if (voteCounts[id] === maxVotes) {
                        tied = true;
                    }
                }

                if (tied && maxVotes > 0) {
                    const tiedTargets = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
                    targetId = tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
                    logToWerewolfGame(
                        `(狼人内部经过一番激烈讨论，最终决定目标为 ${werewolfGameState.players.find(p => p.id === targetId).name})`,
                    );
                }

                if (targetId) {
                    werewolfGameState.lastNightKilled = [targetId];
                    logToWerewolfGame(`狼人请闭眼。`);
                } else {
                    logToWerewolfGame(`狼人放弃了行动，今晚无人被袭击。`);
                    werewolfGameState.lastNightKilled = [];
                }

                werewolfGameState.gamePhase = 'seer_action';
                await GH.sleep(2000);
                await processGameTurn();
                break;
            }

            case 'seer_action': {
                const seer = werewolfGameState.players.find(p => p.role === 'seer' && p.isAlive);
                if (seer) {
                    logToWerewolfGame('预言家请睁眼，请选择你要查验的玩家。');
                    let targetId;
                    if (seer.isUser) {
                        targetId = await waitForUserAction('请选择你要查验的玩家', 'seer_check');
                    } else {
                        targetId = await triggerWerewolfAiAction(seer.id, 'seer_check');
                    }
                    const targetPlayer = werewolfGameState.players.find(p => p.id === targetId);
                    const isWolf = targetPlayer.role === 'wolf';
                    werewolfGameState.seerLastNightResult = { targetName: targetPlayer.name, isWolf: isWolf };
                    logToWerewolfGame(`预言家请闭眼。`);
                    if (seer.isUser) {
                        await showCustomAlert('查验结果', `${targetPlayer.name} 的身份是：${isWolf ? '狼人' : '好人'}`);
                    }
                }
                werewolfGameState.gamePhase = 'witch_action';
                await GH.sleep(2000);
                await processGameTurn();
                break;
            }

            case 'witch_action': {
                const witch = werewolfGameState.players.find(p => p.role === 'witch' && p.isAlive);
                if (witch) {
                    logToWerewolfGame('女巫请睁眼。');
                    const killedId = werewolfGameState.lastNightKilled[0];
                    let killedPlayerName = null;
                    if (killedId) {
                        killedPlayerName = werewolfGameState.players.find(p => p.id === killedId).name;
                        logToWerewolfGame(`今晚 ${killedPlayerName} 被袭击了。`);
                    }

                    let witchAction;
                    if (witch.isUser) {
                        witchAction = await waitForUserAction('女巫请行动', 'witch_action', { killedId, killedPlayerName });
                    } else {
                        witchAction = await triggerWerewolfAiAction(witch.id, 'witch_action', { killedId });
                    }

                    if (witchAction?.action === 'save' && killedId) {
                        werewolfGameState.lastNightKilled = [];
                        werewolfGameState.witchPotions.save = 0;
                    } else if (witchAction?.action === 'poison' && witchAction.targetId) {
                        werewolfGameState.lastNightKilled.push(witchAction.targetId);
                        werewolfGameState.witchPotions.poison = 0;
                    }
                }
                logToWerewolfGame(`女巫请闭眼。`);
                werewolfGameState.gamePhase = 'day_start';
                await GH.sleep(2000);
                await processGameTurn();
                break;
            }

            case 'day_start': {
                logToWerewolfGame('天亮了。');
                let deathAnnouncements = [];
                const deathsThisNight = new Set();

                werewolfGameState.lastNightKilled.forEach(killedId => {
                    if (killedId === werewolfGameState.guardLastNightProtected) {
                        logToWerewolfGame(
                            `昨晚 ${werewolfGameState.players.find(p => p.id === killedId).name} 被袭击但同时也被守护了。`,
                        );
                    } else {
                        deathsThisNight.add(killedId);
                    }
                });

                if (deathsThisNight.size === 0) {
                    logToWerewolfGame('昨晚是一个平安夜。');
                } else {
                    deathsThisNight.forEach(deadId => {
                        const deadPlayer = werewolfGameState.players.find(p => p.id === deadId);
                        if (deadPlayer.isAlive) {
                            deadPlayer.isAlive = false;
                            deathAnnouncements.push(`${deadPlayer.name} 昨晚被淘汰了。`);
                        }
                    });
                    deathAnnouncements.forEach(announcement => logToWerewolfGame(announcement));
                }

                renderWerewolfGameScreen();
                if (checkGameOver()) return;

                let hunterDied = null;
                deathsThisNight.forEach(deadId => {
                    const deadPlayer = werewolfGameState.players.find(p => p.id === deadId);
                    if (deadPlayer.role === 'hunter') hunterDied = deadPlayer;
                });

                if (hunterDied) {
                    logToWerewolfGame(`${hunterDied.name} 是猎人，可以选择一名玩家带走。`);
                    let targetId;
                    if (hunterDied.isUser) {
                        targetId = await waitForUserAction('请选择你要带走的玩家', 'hunter_shoot');
                    } else {
                        targetId = await triggerWerewolfAiAction(hunterDied.id, 'hunter_shoot');
                    }
                    if (targetId) {
                        const targetPlayer = werewolfGameState.players.find(p => p.id === targetId);
                        targetPlayer.isAlive = false;
                        logToWerewolfGame(`猎人开枪带走了 ${targetPlayer.name}。`);
                        renderWerewolfGameScreen();
                        if (checkGameOver()) return;
                    }
                }

                werewolfGameState.gamePhase = 'day_discussion';
                await GH.sleep(2000);
                await processGameTurn();
                break;
            }

            case 'day_discussion': {
                logToWerewolfGame('现在开始依次发言。');
                const alivePlayersForSpeech = werewolfGameState.players.filter(p => p.isAlive);
                for (const player of alivePlayersForSpeech) {
                    renderWerewolfGameScreen({ speakingPlayerId: player.id });
                    let speech;
                    if (player.isUser) {
                        speech = await waitForUserAction('轮到你发言', 'speak');
                    } else {
                        speech = await triggerWerewolfAiAction(player.id, 'speak');
                    }
                    logToWerewolfGame({ player: player, speech: speech }, 'speech');
                    await GH.sleep(1000);
                }
                renderWerewolfGameScreen();
                werewolfGameState.gamePhase = 'day_vote';
                await processGameTurn();
                break;
            }

            case 'day_vote': {
                logToWerewolfGame('请投票选出你认为是狼人的玩家。');
                const voterPromises = werewolfGameState.players
                    .filter(p => p.isAlive)
                    .map(player => {
                        if (player.isUser) {
                            return waitForUserAction('请投票', 'vote');
                        } else {
                            return triggerWerewolfAiAction(player.id, 'vote');
                        }
                    });
                const allVotesResult = (await Promise.all(voterPromises)).filter(Boolean);

                const voteTallyResult = {};
                allVotesResult.forEach(vote => {
                    voteTallyResult[vote] = (voteTallyResult[vote] || 0) + 1;
                });

                let maxVotesResult = 0,
                    playersToEliminate = [];
                for (const playerId in voteTallyResult) {
                    if (voteTallyResult[playerId] > maxVotesResult) {
                        maxVotesResult = voteTallyResult[playerId];
                        playersToEliminate = [playerId];
                    } else if (voteTallyResult[playerId] === maxVotesResult) {
                        playersToEliminate.push(playerId);
                    }
                }

                if (playersToEliminate.length === 1) {
                    const eliminatedPlayer = werewolfGameState.players.find(p => p.id === playersToEliminate[0]);
                    eliminatedPlayer.isAlive = false;
                    logToWerewolfGame(`投票结果：${eliminatedPlayer.name} 被淘汰。`);
                    renderWerewolfGameScreen();
                    if (checkGameOver()) return;
                    if (eliminatedPlayer.role === 'hunter') {
                        logToWerewolfGame(`${eliminatedPlayer.name} 是猎人，可以选择一名玩家带走。`);
                        let targetId;
                        if (eliminatedPlayer.isUser) {
                            targetId = await waitForUserAction('请选择你要带走的玩家', 'hunter_shoot');
                        } else {
                            targetId = await triggerWerewolfAiAction(eliminatedPlayer.id, 'hunter_shoot');
                        }
                        if (targetId) {
                            const targetPlayer = werewolfGameState.players.find(p => p.id === targetId);
                            targetPlayer.isAlive = false;
                            logToWerewolfGame(`猎人开枪带走了 ${targetPlayer.name}。`);
                            renderWerewolfGameScreen();
                            if (checkGameOver()) return;
                        }
                    }
                } else {
                    logToWerewolfGame('投票平票，无人出局。');
                }

                werewolfGameState.gamePhase = 'night_start';
                await GH.sleep(3000);
                await processGameTurn();
                break;
            }
        }
    }

    async function handleWerewolfReroll(logIndex) {
        const logEntry = werewolfGameState.gameLog[logIndex];
        if (!logEntry || logEntry.type !== 'speech' || logEntry.message.player.isUser) {
            return;
        }

        const playerToReroll = logEntry.message.player;

        const speechTextElement = document
            .querySelector(`button[data-log-index="${logIndex}"]`)
            .closest('.speech-content')
            .querySelector('.speech-text');
        if (speechTextElement) {
            speechTextElement.innerHTML = '<i>正在重新思考...</i>';
        }

        try {
            const newSpeech = await triggerWerewolfAiAction(playerToReroll.id, 'speak');
            werewolfGameState.gameLog[logIndex].message.speech = newSpeech;
            renderWerewolfGameScreen();
        } catch (error) {
            console.error('狼人杀发言重roll失败:', error);
            if (speechTextElement) {
                speechTextElement.innerHTML = `<i style="color:red;">重新生成失败，请检查网络或API设置。</i>`;
            }
        }
    }

    function renderWerewolfGameScreen(options = {}) {
        const playersGrid = document.getElementById('werewolf-players-grid');
        const logContainer = document.getElementById('werewolf-game-log');

        playersGrid.innerHTML = '';
        werewolfGameState.players.forEach(player => {
            const seat = document.createElement('div');
            seat.className = 'player-seat';
            const avatarClass = `player-avatar ${!player.isAlive ? 'dead' : ''} ${options.speakingPlayerId === player.id ? 'speaking' : ''
                } ${options.activePlayerId === player.id ? 'active-turn' : ''}`;

            let roleIndicator = '';
            const user = werewolfGameState.players.find(p => p.isUser);
            if (user.role === 'wolf' && player.role === 'wolf') {
                roleIndicator = '<div class="player-role-indicator" style="display: flex;">W</div>';
            }

            seat.innerHTML = `
            ${roleIndicator}
            <img src="${player.avatar}" class="${avatarClass}">
            <span class="player-name">${player.name} (${player.isAlive ? '存活' : '淘汰'})</span>
        `;
            playersGrid.appendChild(seat);
        });

        logContainer.innerHTML = werewolfGameState.gameLog
            .map((log, index) => {
                if (log.type === 'speech' && typeof log.message === 'object' && !log.message.player.isUser) {
                    const { player, speech } = log.message;
                    return `
            <div class="log-entry speech">
                <img src="${player.avatar}" class="speech-avatar">
                <div class="speech-content">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="speaker">${player.name}</span>
                        <button class="werewolf-reroll-btn" data-log-index="${index}" title="重新生成发言" style="background:none; border:none; cursor:pointer; padding:0; color:var(--text-secondary);">
                            <svg class="reroll-btn-icon" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                    </div>
                    <span class="speech-text">${speech.replace(/\n/g, '<br>')}</span>
                </div>
            </div>
        `;
                } else if (log.type === 'speech' && typeof log.message === 'object') {
                    const { player, speech } = log.message;
                    return `
            <div class="log-entry speech">
                <img src="${player.avatar}" class="speech-avatar">
                <div class="speech-content">
                    <span class="speaker">${player.name}</span>
                    <span class="speech-text">${speech.replace(/\n/g, '<br>')}</span>
                </div>
            </div>
        `;
                } else {
                    return `<div class="log-entry ${log.type}">${String(log.message).replace(/\n/g, '<br>')}</div>`;
                }
            })
            .join('');
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function waitForUserVote() {
        return new Promise(resolve => {
            const actionArea = document.getElementById('werewolf-action-area');
            const alivePlayers = werewolfGameState.players.filter(p => p.isAlive && !p.isUser);

            actionArea.innerHTML = '<h5>请投票:</h5>';
            const grid = document.createElement('div');
            grid.className = 'vote-target-grid';

            alivePlayers.forEach(player => {
                const btn = document.createElement('button');
                btn.className = 'form-button-secondary vote-target-btn';
                btn.textContent = player.name;
                btn.onclick = () => {
                    actionArea.innerHTML = '';
                    resolve(player.id);
                };
                grid.appendChild(btn);
            });
            actionArea.appendChild(grid);
        });
    }

    function logToWerewolfGame(message, type = 'system') {
        werewolfGameState.gameLog.push({ message, type });
        renderWerewolfGameScreen();
    }

    async function generateAiGameSummary() {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) {
            return '（AI摘要生成失败：API未配置）';
        }

        const formattedLog = werewolfGameState.gameLog
            .map(log => {
                if (log.type === 'speech') {
                    return `${log.message.player.name}: ${log.message.speech}`;
                }
                return log.message;
            })
            .join('\n');

        const prompt = `
# 任务
你是一位专业的狼人杀复盘分析师。请根据以下完整的游戏日志，用100-150字，客观、精炼地总结本局游戏的【关键事件】和【转折点】。

# 核心要求
- 你的总结需要有逻辑、有条理。
- 指出关键玩家的行为，例如预言家的查验、女巫的操作、猎人的开枪等。
- 分析狼人阵营和好人阵营的博弈过程。
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

    function generateWerewolfSummary(winner, aiSummary) {
        const roleNameMap = {
            wolf: '狼人', villager: '平民', seer: '预言家',
            witch: '女巫', hunter: '猎人', guard: '守卫', idiot: '白痴',
        };

        let summaryText = `**狼人杀 - 游戏复盘**\n\n`;
        summaryText += `🏆 **胜利方:** ${winner}\n`;
        summaryText += `📅 **游戏天数:** ${werewolfGameState.dayNumber} 天\n\n`;
        summaryText += `**本局摘要:**\n${aiSummary}\n\n`;
        summaryText += `**玩家复盘:**\n`;
        werewolfGameState.players.forEach(p => {
            const status = p.isAlive ? '存活' : '淘汰';
            const roleName = roleNameMap[p.role] || p.role;
            summaryText += `- ${p.name} (${roleName}) - ${status}\n`;
        });

        return summaryText;
    }

    function openWerewolfSummaryTargetPicker(summaryText) {
        const modal = document.getElementById('werewolf-target-picker-modal');
        const listEl = document.getElementById('werewolf-target-list');
        listEl.innerHTML = '';

        const aiPlayers = werewolfGameState.players.filter(p => !p.isUser);

        if (aiPlayers.length === 0) {
            alert('没有可发送的AI玩家。');
            return;
        }

        aiPlayers.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="werewolf-target-checkbox" value="${player.id}" checked>
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
        `;
            listEl.appendChild(item);
        });

        const confirmBtn = document.getElementById('wt-confirm-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = () => {
            const selectedIds = Array.from(document.querySelectorAll('.werewolf-target-checkbox:checked')).map(
                cb => cb.value,
            );
            if (selectedIds.length > 0) {
                sendSummaryToSelectedPlayers(summaryText, selectedIds);
            } else {
                alert('请至少选择一个发送对象！');
            }
        };

        const cancelBtn = document.getElementById('wt-cancel-btn');
        cancelBtn.onclick = () => modal.classList.remove('visible');

        document.getElementById('wt-select-all-btn').onclick = () => {
            document.querySelectorAll('.werewolf-target-checkbox').forEach(cb => (cb.checked = true));
        };
        document.getElementById('wt-deselect-all-btn').onclick = () => {
            document.querySelectorAll('.werewolf-target-checkbox').forEach(cb => (cb.checked = false));
        };

        modal.classList.add('visible');
    }

    function showWerewolfSummaryModal(summaryText) {
        const modal = document.getElementById('werewolf-summary-modal');
        const contentEl = document.getElementById('werewolf-summary-content');

        contentEl.innerHTML = GH.renderMarkdown(summaryText);

        const repostBtn = document.getElementById('repost-summary-btn');
        const newRepostBtn = repostBtn.cloneNode(true);
        repostBtn.parentNode.replaceChild(newRepostBtn, repostBtn);
        newRepostBtn.onclick = () => openWerewolfSummaryTargetPicker(summaryText);

        const backBtn = document.getElementById('back-to-hall-btn');
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.onclick = () => {
            modal.classList.remove('visible');
            showScreen('game-hall-screen');
        };

        modal.classList.add('visible');
    }

    async function sendSummaryToSelectedPlayers(summaryText, targetIds) {
        document.getElementById('werewolf-summary-modal').classList.remove('visible');
        document.getElementById('werewolf-target-picker-modal').classList.remove('visible');

        const aiPlayers = werewolfGameState.players.filter(p => !p.isUser);
        let sentCount = 0;

        const aiContext = `[系统指令：刚刚结束了一局狼人杀，这是游戏复盘。请根据这个复盘内容，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;

        for (const chatId of targetIds) {
            const chat = state.chats[chatId];
            if (chat) {
                const gameBaseTs = window.getUserMessageTimestamp(chat);
                const visibleMessage = {
                    role: 'user', type: 'share_link', timestamp: gameBaseTs,
                    title: '狼人杀 - 游戏复盘', description: '点击查看详细复盘记录',
                    source_name: '游戏中心', content: summaryText,
                };
                const hiddenInstruction = {
                    role: 'system', content: aiContext, timestamp: gameBaseTs + 1, isHidden: true,
                };
                chat.history.push(visibleMessage, hiddenInstruction);
                await db.chats.put(chat);
                sentCount++;
            }
        }

        await showCustomAlert('发送成功', `游戏复盘已发送至 ${sentCount} 位AI角色的聊天中！`);
        showScreen('game-hall-screen');
    }

    function checkGameOver() {
        const alivePlayers = werewolfGameState.players.filter(p => p.isAlive);
        const aliveWolves = alivePlayers.filter(p => p.role === 'wolf').length;
        const aliveGods = alivePlayers.filter(p => ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role)).length;
        const aliveVillagers = alivePlayers.filter(p => p.role === 'villager').length;

        let winner = null;

        if (aliveWolves === 0) {
            winner = '好人阵营';
        } else if (aliveWolves >= aliveGods + aliveVillagers) {
            winner = '狼人阵营';
        } else if (aliveGods === 0 && aliveVillagers === 0) {
            winner = '狼人阵营';
        }

        if (winner) {
            logToWerewolfGame(`游戏结束！${winner}胜利！`);
            const roleNameMap = {
                wolf: '狼人', villager: '平民', seer: '预言家',
                witch: '女巫', hunter: '猎人', guard: '守卫', idiot: '白痴',
            };
            const rolesReveal = werewolfGameState.players.map(p => `${p.name}: ${roleNameMap[p.role] || p.role}`).join('\n');
            logToWerewolfGame(`身份公布:\n${rolesReveal}`);

            (async () => {
                await showCustomAlert('请稍候...', 'AI正在生成本局摘要...');
                const aiSummary = await generateAiGameSummary();
                const summary = generateWerewolfSummary(winner, aiSummary);
                showWerewolfSummaryModal(summary);
            })();

            werewolfGameState.isActive = false;
            document.getElementById('werewolf-action-area').innerHTML = '';

            return true;
        }

        return false;
    }

    function waitForUserAction(prompt, actionType, context = {}) {
        const me = werewolfGameState.players.find(p => p.isUser);

        if (me && !me.isAlive && actionType !== 'hunter_shoot') {
            const actionArea = document.getElementById('werewolf-action-area');
            actionArea.innerHTML = `<h5>您已淘汰，正在观战...</h5>`;
            return new Promise(async resolve => {
                await GH.sleep(3000);
                actionArea.innerHTML = '';
                resolve(null);
            });
        }

        return new Promise(resolve => {
            const actionArea = document.getElementById('werewolf-action-area');
            actionArea.innerHTML = '';
            actionArea.className = 'werewolf-action-area';

            if (actionType === 'speak') {
                actionArea.classList.add('speaking-mode');

                const textarea = document.createElement('textarea');
                textarea.id = 'user-speech-input';
                textarea.rows = 1;
                textarea.placeholder = '请输入你的发言...';
                textarea.addEventListener('input', () => {
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                });

                const endBtn = document.createElement('button');
                endBtn.id = 'end-speech-btn';
                endBtn.className = 'form-button';
                endBtn.textContent = '结束发言';

                actionArea.appendChild(textarea);
                actionArea.appendChild(endBtn);
                textarea.focus();

                endBtn.onclick = () => {
                    const speech = textarea.value.trim() || '我过麦。';
                    actionArea.innerHTML = '';
                    actionArea.classList.remove('speaking-mode');
                    resolve(speech);
                };
                return;
            }

            actionArea.innerHTML = `<h5>${prompt}</h5>`;
            const grid = document.createElement('div');
            grid.className = 'vote-target-grid';

            if (actionType === 'witch_action') {
                if (context.killedId && werewolfGameState.witchPotions.save > 0) {
                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'form-button';
                    saveBtn.textContent = `使用解药救 ${context.killedPlayerName}`;
                    saveBtn.onclick = () => {
                        actionArea.innerHTML = '';
                        resolve({ action: 'save' });
                    };
                    grid.appendChild(saveBtn);
                }
                if (werewolfGameState.witchPotions.poison > 0) {
                    const poisonBtn = document.createElement('button');
                    poisonBtn.className = 'form-button form-button-secondary';
                    poisonBtn.textContent = '使用毒药';
                    poisonBtn.onclick = async () => {
                        const targetId = await waitForUserAction('选择要毒杀的玩家', 'witch_poison_target');
                        resolve({ action: 'poison', targetId: targetId });
                    };
                    grid.appendChild(poisonBtn);
                }
                const passBtn = document.createElement('button');
                passBtn.className = 'form-button form-button-secondary';
                passBtn.textContent = '跳过';
                passBtn.onclick = () => {
                    actionArea.innerHTML = '';
                    resolve({ action: 'none' });
                };
                grid.appendChild(passBtn);
                actionArea.appendChild(grid);
                return;
            }

            let targets = [];
            if (['guard_protect', 'seer_check', 'hunter_shoot', 'witch_poison_target'].includes(actionType)) {
                targets = werewolfGameState.players.filter(p => p.isAlive);
            } else if (actionType === 'wolf_kill') {
                targets = werewolfGameState.players.filter(p => p.isAlive && p.role !== 'wolf');
            } else if (actionType === 'vote') {
                targets = werewolfGameState.players.filter(p => p.isAlive);
            }

            if (actionType === 'hunter_shoot') {
                targets = targets.filter(p => p.id !== me.id);
            }

            targets.forEach(player => {
                const btn = document.createElement('button');
                btn.className = 'form-button-secondary vote-target-btn';
                btn.textContent = player.name;
                btn.onclick = () => {
                    actionArea.innerHTML = '';
                    resolve(player.id);
                };
                grid.appendChild(btn);
            });

            if (actionType === 'vote') {
                const passBtn = document.createElement('button');
                passBtn.className = 'form-button-secondary vote-target-btn';
                passBtn.textContent = '弃票';
                passBtn.onclick = () => {
                    actionArea.innerHTML = '';
                    resolve(null);
                };
                grid.appendChild(passBtn);
            }
            actionArea.appendChild(grid);
        });
    }

    async function triggerWerewolfAiAction(playerId, action, context = {}) {
        const player = werewolfGameState.players.find(p => p.id === playerId);
        if (!player || !player.isAlive) return null;

        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');

        let actionPrompt = '';
        let jsonFormat = '';

        const alivePlayersList = werewolfGameState.players
            .filter(p => p.isAlive)
            .map(p => `- ${p.name} (id: ${p.id})`)
            .join('\n');

        const fullGameLog = werewolfGameState.gameLog
            .map(log => {
                if (log.type === 'speech') {
                    return `${log.message.player.name}: ${log.message.speech}`;
                }
                return log.message.replace(/<strong>/g, '').replace(/<\/strong>/g, '');
            })
            .join('\n');

        let extraContext = '';
        if (player.role === 'seer' && action === 'speak' && werewolfGameState.seerLastNightResult) {
            const result = werewolfGameState.seerLastNightResult;
            extraContext = `\n# 预言家专属情报 (此信息仅你可见)\n- **重要信息**: 昨晚你查验了 **${result.targetName
                }**，Ta的身份是【${result.isWolf ? '狼人' : '好人'
                }】。\n- **你的任务**: 你可以选择在发言中公布这个信息（可以说真话，也可以为了迷惑狼人而说谎），或者暂时隐藏它。请根据你的人设和当前局势做出最有利的决策。\n`;
            werewolfGameState.seerLastNightResult = null;
        }

        switch (action) {
            case 'guard_protect':
                actionPrompt = '你是守卫，请选择一名玩家进行守护。你不能连续两晚守护同一个人。';
                jsonFormat = '{"action": "vote", "targetId": "你选择守护的玩家ID"}';
                if (werewolfGameState.guardLastNightProtected)
                    extraContext = `\n- 提示: 你昨晚守护了 ${werewolfGameState.players.find(p => p.id === werewolfGameState.guardLastNightProtected).name}。`;
                break;
            case 'wolf_kill': {
                const wolfTeammates = werewolfGameState.players
                    .filter(p => p.role === 'wolf' && p.id !== player.id)
                    .map(w => w.name)
                    .join('、');
                if (context.isUserWolfAlly) {
                    actionPrompt = `你是狼人，你的队友是【${wolfTeammates}】和【用户】。请给你的用户队友一个击杀建议。`;
                } else {
                    actionPrompt = `你是狼人，你的队友是【${wolfTeammates || '无'}】。请选择一个非狼人角色进行攻击。`;
                }
                extraContext += `\n# 狼人战术指令 (至关重要)\n- **团队合作**: 你的首要目标是和你的狼队友们【集火】同一个目标，以确保击杀成功。\n- **攻击优先级**: 请优先攻击你认为是【预言家】、【女巫】等神职的玩家，或者发言逻辑清晰、对狼人阵营威胁大的好人。`;
                jsonFormat = '{"action": "vote", "targetId": "你选择攻击的玩家ID"}';
                break;
            }
            case 'seer_check':
                actionPrompt = '你是预言家，请选择一名玩家查验其身份（好人或狼人）。';
                jsonFormat = '{"action": "vote", "targetId": "你选择查验的玩家ID"}';
                break;
            case 'witch_action':
                actionPrompt = '你是女巫。';
                if (context.killedId) {
                    actionPrompt += `今晚 ${werewolfGameState.players.find(p => p.id === context.killedId).name} 被袭击了。`;
                } else {
                    actionPrompt += '今晚是平安夜。';
                }
                actionPrompt += ` 你有 ${werewolfGameState.witchPotions.save} 瓶解药和 ${werewolfGameState.witchPotions.poison} 瓶毒药。请决定你的行动。`;
                jsonFormat = '{"action": "save" | "poison" | "none", "targetId": "(如果用毒药，填写目标ID)"}';
                break;
            case 'hunter_shoot':
                actionPrompt = '你是猎人，你出局了，请选择一名玩家与你一同出局。';
                jsonFormat = '{"action": "vote", "targetId": "你选择带走的玩家ID"}';
                break;
            case 'speak':
                actionPrompt = '现在轮到你发言。请根据你的角色身份、人设和当前局势，发表你的看法，可以撒谎或引导。你的发言应该围绕游戏本身，而不是只和用户聊天。';
                jsonFormat = '{"action": "speak", "speech": "你的发言内容..."}';
                break;
            case 'vote':
                actionPrompt = '现在是白天投票环节，请根据大家的发言和你自己的判断，投票选出你认为是狼人的玩家。';
                jsonFormat = '{"action": "vote", "targetId": "你投票的玩家ID"}';
                break;
        }

        const worldBookContent = await GH.getGameWorldBookContent('werewolf');
        const systemPrompt = `
# 游戏背景: 狼人杀
${worldBookContent ? `# 世界观设定\n${worldBookContent}\n` : ''}# 你的身份和人设
- **你的名字**: ${player.name}
- **你的角色**: ${player.role}
- **你的性格人设**: ${player.persona}

# 当前局势
- **存活玩家列表**:
${alivePlayersList}
- **游戏日志 (这是完整的游戏记录，你必须通读并记住所有信息)**:
${fullGameLog}
${extraContext}

# 你的任务: ${actionPrompt}

# 输出格式: 你的回复【必须且只能】是一个严格的JSON对象，格式如下:
${jsonFormat}
`;
        try {
            const messagesForApi = [{ role: 'user', content: systemPrompt }];
            let isGemini = proxyUrl === GEMINI_API_URL;
            let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini, state.apiConfig.temperature);

            const response = await fetch(
                isGemini ? geminiConfig.url : `${proxyUrl}/v1/chat/completions`,
                isGemini
                    ? geminiConfig.data
                    : {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: model,
                            messages: messagesForApi,
                            ...window.buildModelParams(state.apiConfig),
                            response_format: { type: 'json_object' },
                        }),
                    },
            );
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(
                /^```json\s*|```$/g, '',
            );
            const aiAction = (window.repairAndParseJSON || JSON.parse)(content);

            if (action === 'witch_action') return aiAction;
            if (aiAction.action === 'vote') return aiAction.targetId;
            if (aiAction.action === 'speak') return aiAction.speech;

            return null;
        } catch (error) {
            console.error(`AI (${player.name}) 行动失败:`, error);
            if (action.includes('vote') || action.includes('kill') || action.includes('protect') || action.includes('check') || action.includes('shoot')) {
                const potentialTargets = werewolfGameState.players.filter(p => p.isAlive && p.id !== player.id);
                if (potentialTargets.length > 0)
                    return potentialTargets[Math.floor(Math.random() * potentialTargets.length)].id;
            }
            if (action === 'witch_action') return { action: 'none' };
            return '我...我不知道该说什么了。';
        }
    }

    // --- 事件监听器注册 ---
    function initWerewolfEvents() {
        document.getElementById('start-werewolf-game-btn').addEventListener('click', startWerewolfGame);

        document.getElementById('exit-werewolf-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出游戏吗？当前进度不会保存。');
            if (confirmed) {
                werewolfGameState.isActive = false;
                showScreen('game-hall-screen');
            }
        });

        document.getElementById('werewolf-my-role-btn').addEventListener('click', () => {
            if (werewolfGameState.isActive) {
                const me = werewolfGameState.players.find(p => p.isUser);
                if (me) {
                    alert(`你的身份是：【${me.role}】`);
                }
            }
        });

        document.getElementById('werewolf-game-log').addEventListener('click', e => {
            const rerollBtn = e.target.closest('.werewolf-reroll-btn');
            if (rerollBtn) {
                const logIndex = parseInt(rerollBtn.dataset.logIndex);
                if (!isNaN(logIndex)) {
                    handleWerewolfReroll(logIndex);
                }
            }
        });
    }

    // 导出到 GameHall 命名空间
    GH.werewolf = {
        openSetup: openWerewolfSetup,
        initEvents: initWerewolfEvents,
        getState: () => werewolfGameState,
    };
})();
