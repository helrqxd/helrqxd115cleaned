// =======================================================================
// ===               谁是卧底 (Undercover) 游戏模块                   ===
// =======================================================================

(function () {
    const GH = window.GameHall;

    let undercoverGameState = {
        isActive: false,
        players: [],
        civilianWord: '',
        undercoverWord: '',
        gamePhase: 'setup',
        dayNumber: 1,
        gameLog: [],
        turnIndex: 0,
        votes: {},
        votedOutPlayers: [],
        tiedPlayers: [],
    };

    async function openUndercoverSetup() {
        showScreen('undercover-setup-screen');
        const selectionEl = document.getElementById('undercover-player-selection');
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
        if (playerOptions.length < 2) {
            selectionEl.innerHTML =
                '<p style="text-align:center; padding-top: 50px; color: var(--text-secondary);">你需要至少2位AI或NPC好友才能开始游戏哦。</p>';
            document.getElementById('start-undercover-game-btn').disabled = true;
            return;
        }

        document.getElementById('start-undercover-game-btn').disabled = false;
        playerOptions.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="undercover-player-checkbox" value="${player.id}">
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

    async function startUndercoverGame() {
        const inviteMode = document.querySelector('input[name="undercover_invite_mode"]:checked').value;
        let invitedPlayerInfos = [];
        let totalPlayers = 0;

        if (inviteMode === 'manual') {
            const selectedCheckboxes = document.querySelectorAll('.undercover-player-checkbox:checked');
            totalPlayers = selectedCheckboxes.length + 1;
            if (totalPlayers < 3) {
                alert(`游戏最少需要3人！当前手动选择了 ${selectedCheckboxes.length} 人。`);
                return;
            }
            selectedCheckboxes.forEach(checkbox => {
                const playerId = checkbox.value;
                const chat = Object.values(state.chats).find(c => c.id === playerId);
                if (chat) {
                    invitedPlayerInfos.push({
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
                            invitedPlayerInfos.push({
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
        } else {
            const randomPlayerCount = parseInt(document.getElementById('undercover-random-player-count').value);
            if (isNaN(randomPlayerCount) || randomPlayerCount < 2) {
                alert('随机邀请人数至少为2人！');
                return;
            }
            totalPlayers = randomPlayerCount + 1;

            const singleChats = Object.values(state.chats).filter(chat => !chat.isGroup);
            const allNpcs = Object.values(state.chats).flatMap(chat =>
                (chat.npcLibrary || []).map(npc => ({ ...npc, owner: chat.name })),
            );
            let allAvailablePlayers = [
                ...singleChats.map(c => ({
                    id: c.id,
                    name: c.name,
                    avatar: c.settings.aiAvatar,
                    persona: c.settings.aiPersona,
                    isUser: false,
                })),
                ...allNpcs.map(n => ({ id: n.id, name: n.name, avatar: n.avatar, persona: n.persona, isUser: false })),
            ];

            if (allAvailablePlayers.length < randomPlayerCount) {
                alert(`可用玩家不足！需要 ${randomPlayerCount} 人，但只有 ${allAvailablePlayers.length} 人可选。`);
                return;
            }

            allAvailablePlayers.sort(() => Math.random() - 0.5);
            invitedPlayerInfos = allAvailablePlayers.slice(0, randomPlayerCount);
        }

        undercoverGameState = {
            isActive: true,
            players: [],
            gamePhase: 'reveal_words',
            dayNumber: 1,
            gameLog: [],
            turnIndex: 0,
            votes: {},
            votedOutPlayers: [],
            tiedPlayers: [],
        };

        let wordPair;
        try {
            wordPair = await generateUndercoverWordsAI();
        } catch (e) {
            await showCustomAlert('AI出题失败', '呜，AI今天没灵感了...将使用内置词库为你出题！');
            const BUILT_IN_WORDS = [
                { civilian: '牛奶', undercover: '豆浆' },
                { civilian: '白菜', undercover: '生菜' },
                { civilian: '饺子', undercover: '馄饨' },
                { civilian: '手套', undercover: '袜子' },
                { civilian: '情书', undercover: '遗书' },
            ];
            wordPair = getRandomItem(BUILT_IN_WORDS);
        }
        undercoverGameState.civilianWord = wordPair.civilian;
        undercoverGameState.undercoverWord = wordPair.undercover;

        const userPlayer = {
            id: 'user',
            name: state.qzoneSettings.nickname || '我',
            avatar: state.qzoneSettings.avatar || defaultAvatar,
            isAlive: true,
            isUser: true,
        };
        undercoverGameState.players.push(userPlayer);
        invitedPlayerInfos.forEach(pInfo => {
            undercoverGameState.players.push({ ...pInfo, isAlive: true });
        });
        undercoverGameState.players.sort(() => Math.random() - 0.5);

        let rolesToAssign = [];
        if (totalPlayers >= 3 && totalPlayers <= 5) {
            rolesToAssign.push('undercover');
        } else if (totalPlayers >= 6 && totalPlayers <= 8) {
            rolesToAssign.push('undercover');
            rolesToAssign.push('whiteboard');
        } else {
            rolesToAssign.push('undercover');
            rolesToAssign.push('undercover');
            rolesToAssign.push('whiteboard');
        }
        while (rolesToAssign.length < totalPlayers) {
            rolesToAssign.push('civilian');
        }
        rolesToAssign.sort(() => Math.random() - 0.5);

        undercoverGameState.players.forEach((player, index) => {
            const role = rolesToAssign[index];
            player.role = role;
            if (role === 'civilian') player.word = undercoverGameState.civilianWord;
            else if (role === 'undercover') player.word = undercoverGameState.undercoverWord;
            else if (role === 'whiteboard') player.word = null;
        });

        showScreen('undercover-game-screen');
        await processUndercoverTurn();
    }

    async function processUndercoverTurn() {
        if (!undercoverGameState.isActive) return;

        renderUndercoverGameScreen();

        switch (undercoverGameState.gamePhase) {
            case 'reveal_words': {
                logToUndercoverGame(`游戏开始，第 ${undercoverGameState.dayNumber} 轮。请查看自己的词语。`, 'system');
                const me = undercoverGameState.players.find(p => p.isUser);
                const roleName = { undercover: '卧底', civilian: '平民', whiteboard: '白板' }[me.role] || '未知';
                const wordText = me.word ? `你的词语是：【${me.word}】` : '你是一个白板，需要根据他人描述猜测平民词语。';
                await showCustomAlert(`你的身份是：【${roleName}】`, wordText);

                undercoverGameState.gamePhase = 'description_round';
                await GH.sleep(1000);
                await processUndercoverTurn();
                break;
            }

            case 'description_round': {
                logToUndercoverGame(`第 ${undercoverGameState.dayNumber} 轮发言开始，请依次描述自己的词语。`, 'system');

                const alivePlayers = undercoverGameState.players.filter(p => p.isAlive);
                for (const player of alivePlayers) {
                    renderUndercoverGameScreen({ speakingPlayerId: player.id });
                    let description;
                    if (player.isUser) {
                        description = await waitForUserUndercoverAction('轮到你发言', 'speak', {
                            placeholder: '请用一句话描述你的词语...',
                        });
                    } else {
                        description = await triggerUndercoverAiAction(player.id, 'describe');
                    }
                    logToUndercoverGame({ player: player, speech: description }, 'speech');
                    await GH.sleep(1000);
                }
                renderUndercoverGameScreen();
                undercoverGameState.gamePhase = 'voting_round';
                await GH.sleep(1000);
                await processUndercoverTurn();
                break;
            }

            case 'voting_round': {
                logToUndercoverGame('描述结束，现在开始投票。', 'system');
                undercoverGameState.votes = {};
                const alivePlayers = undercoverGameState.players.filter(p => p.isAlive);
                for (const voter of alivePlayers) {
                    let voteResult;
                    if (voter.isUser) {
                        voteResult = await waitForUserUndercoverAction('请投票', 'vote');
                    } else {
                        voteResult = await triggerUndercoverAiAction(voter.id, 'vote');
                    }

                    if (voteResult && voteResult.voteForId) {
                        const targetId = voteResult.voteForId;
                        const reason = voteResult.reason || '未说明理由';
                        const targetPlayer = undercoverGameState.players.find(p => p.id === targetId);

                        if (targetPlayer) {
                            logToUndercoverGame(
                                `<strong>${voter.name}</strong> 投票给了 <strong>${targetPlayer.name}</strong>，理由是："${reason}"`,
                            );
                            undercoverGameState.votes[targetId] = (undercoverGameState.votes[targetId] || 0) + 1;
                        }
                    } else {
                        const reason = voteResult ? voteResult.reason || '信息不足，无法判断。' : '信息不足，无法判断。';
                        logToUndercoverGame(`<strong>${voter.name}</strong> 弃票了，理由是："${reason}"`);
                    }
                    await GH.sleep(500);
                }

                undercoverGameState.gamePhase = 'elimination';
                await GH.sleep(2000);
                await processUndercoverTurn();
                break;
            }

            case 'elimination': {
                logToUndercoverGame('投票结束，正在计票...', 'system');
                await GH.sleep(2000);

                const voteCounts = undercoverGameState.votes;
                let maxVotes = 0;
                let playersToEliminate = [];

                for (const playerId in voteCounts) {
                    if (voteCounts[playerId] > maxVotes) {
                        maxVotes = voteCounts[playerId];
                        playersToEliminate = [playerId];
                    } else if (voteCounts[playerId] === maxVotes) {
                        playersToEliminate.push(playerId);
                    }
                }

                if (playersToEliminate.length > 1) {
                    logToUndercoverGame(
                        `出现平票: ${playersToEliminate
                            .map(id => undercoverGameState.players.find(p => p.id === id).name)
                            .join('、 ')}。`,
                        'system',
                    );
                    logToUndercoverGame('平票玩家将进行补充发言，之后再次投票。', 'system');
                    undercoverGameState.tiedPlayers = playersToEliminate;
                    undercoverGameState.gamePhase = 'tie_vote_speech';
                    await GH.sleep(2000);
                    await processUndercoverTurn();
                    return;
                } else if (playersToEliminate.length === 1) {
                    const eliminatedPlayerId = playersToEliminate[0];
                    const eliminatedPlayer = undercoverGameState.players.find(p => p.id === eliminatedPlayerId);
                    eliminatedPlayer.isAlive = false;
                    undercoverGameState.votedOutPlayers.push(eliminatedPlayer);
                    const roleName =
                        { undercover: '卧底', civilian: '平民', whiteboard: '白板' }[eliminatedPlayer.role] || '未知';
                    logToUndercoverGame(`【${eliminatedPlayer.name}】被淘汰！他/她的身份是【${roleName}】。`, 'system');
                } else {
                    logToUndercoverGame('本轮无人被投，无人出局。', 'system');
                }

                renderUndercoverGameScreen();
                if (checkUndercoverGameOver()) return;

                undercoverGameState.dayNumber++;
                undercoverGameState.gamePhase = 'description_round';
                logToUndercoverGame('游戏继续...', 'system');
                await GH.sleep(3000);
                await processUndercoverTurn();
                break;
            }

            case 'tie_vote_speech': {
                logToUndercoverGame('现在请平票玩家依次进行补充发言。', 'system');
                const tiedPlayers = undercoverGameState.players.filter(p => undercoverGameState.tiedPlayers.includes(p.id));
                for (const player of tiedPlayers) {
                    if (!player.isAlive) continue;
                    renderUndercoverGameScreen({ speakingPlayerId: player.id });
                    let speech;
                    if (player.isUser) {
                        speech = await waitForUserUndercoverAction('请进行补充发言', 'speak', {
                            placeholder: '为自己辩解，说服大家不要投你...',
                        });
                    } else {
                        speech = await triggerUndercoverAiAction(player.id, 'tie_speak');
                    }
                    logToUndercoverGame({ player: player, speech: speech }, 'speech');
                    await GH.sleep(1000);
                }
                renderUndercoverGameScreen();
                undercoverGameState.gamePhase = 'tie_vote_re-vote';
                await processUndercoverTurn();
                break;
            }

            case 'tie_vote_re-vote': {
                logToUndercoverGame('补充发言结束，请在平票玩家中投票。', 'system');

                const voters = undercoverGameState.players.filter(
                    p => p.isAlive && !undercoverGameState.tiedPlayers.includes(p.id),
                );
                const targets = undercoverGameState.players.filter(p => undercoverGameState.tiedPlayers.includes(p.id));
                undercoverGameState.votes = {};

                for (const voter of voters) {
                    let voteResult;
                    if (voter.isUser) {
                        voteResult = await waitForUserUndercoverAction('请投票', 'vote', { targets: targets });
                    } else {
                        voteResult = await triggerUndercoverAiAction(voter.id, 'vote', { targets: targets });
                    }

                    if (voteResult && voteResult.voteForId) {
                        const targetId = voteResult.voteForId;
                        const reason = voteResult.reason || '未说明理由';
                        const targetPlayer = targets.find(p => p.id === targetId);
                        if (targetPlayer) {
                            logToUndercoverGame(
                                `<strong>${voter.name}</strong> 投票给了 <strong>${targetPlayer.name}</strong>，理由是："${reason}"`,
                            );
                            undercoverGameState.votes[targetId] = (undercoverGameState.votes[targetId] || 0) + 1;
                        }
                    } else {
                        const reason = voteResult ? voteResult.reason || '信息不足，无法判断。' : '信息不足，无法判断。';
                        logToUndercoverGame(`<strong>${voter.name}</strong> 弃票了，理由是："${reason}"`);
                    }
                    await GH.sleep(500);
                }

                const voteCounts = undercoverGameState.votes;
                let maxVotes = 0;
                let playersToEliminate = [];
                for (const playerId in voteCounts) {
                    if (voteCounts[playerId] > maxVotes) {
                        maxVotes = voteCounts[playerId];
                        playersToEliminate = [playerId];
                    } else if (voteCounts[playerId] === maxVotes) {
                        playersToEliminate.push(playerId);
                    }
                }

                if (playersToEliminate.length !== 1) {
                    logToUndercoverGame('再次平票，本轮无人出局。', 'system');
                } else {
                    const eliminatedPlayerId = playersToEliminate[0];
                    const eliminatedPlayer = undercoverGameState.players.find(p => p.id === eliminatedPlayerId);
                    eliminatedPlayer.isAlive = false;
                    undercoverGameState.votedOutPlayers.push(eliminatedPlayer);
                    const roleName =
                        { undercover: '卧底', civilian: '平民', whiteboard: '白板' }[eliminatedPlayer.role] || '未知';
                    logToUndercoverGame(
                        `PK投票结果：【${eliminatedPlayer.name}】被淘汰！他/她的身份是【${roleName}】。`,
                        'system',
                    );
                }

                renderUndercoverGameScreen();
                if (checkUndercoverGameOver()) return;

                undercoverGameState.tiedPlayers = [];
                undercoverGameState.dayNumber++;
                undercoverGameState.gamePhase = 'description_round';
                await GH.sleep(3000);
                await processUndercoverTurn();
                break;
            }
        }
    }

    async function handleUndercoverReroll(logIndex) {
        const logEntry = undercoverGameState.gameLog[logIndex];
        if (!logEntry || logEntry.type !== 'speech' || !logEntry.message.player || logEntry.message.player.isUser) {
            return;
        }

        const playerToReroll = logEntry.message.player;

        const speechTextElement = document
            .querySelector(`button.uc-reroll-btn[data-log-index="${logIndex}"]`)
            .closest('.speech-content')
            .querySelector('.speech-text');
        if (speechTextElement) {
            speechTextElement.innerHTML = '<i>重新描述中...</i>';
        }

        try {
            const actionType = undercoverGameState.gamePhase === 'tie_vote_speech' ? 'tie_speak' : 'describe';

            const newSpeech = await triggerUndercoverAiAction(playerToReroll.id, actionType);
            undercoverGameState.gameLog[logIndex].message.speech = newSpeech;
            renderUndercoverGameScreen();
        } catch (error) {
            console.error('卧底发言重roll失败:', error);
            if (speechTextElement) {
                speechTextElement.innerHTML = `<i style="color:red;">重新生成失败，请检查网络或API设置。</i>`;
            }
        }
    }

    function renderUndercoverGameScreen(options = {}) {
        const playersGrid = document.getElementById('undercover-players-grid');
        const logContainer = document.getElementById('undercover-game-log');

        playersGrid.innerHTML = '';
        undercoverGameState.players.forEach(player => {
            const seat = document.createElement('div');
            seat.className = 'player-seat';
            const avatarClass = `player-avatar ${!player.isAlive ? 'dead' : ''} ${options.speakingPlayerId === player.id ? 'speaking' : ''
                }`;

            seat.innerHTML = `
            <img src="${player.avatar}" class="${avatarClass}">
            <span class="player-name">${player.name} ${!player.isAlive ? '(淘汰)' : ''}</span>
        `;
            playersGrid.appendChild(seat);
        });

        logContainer.innerHTML = '';
        undercoverGameState.gameLog.forEach((log, index) => {
            const logEl = document.createElement('div');
            if (log.type === 'speech' && typeof log.message === 'object' && !log.message.player.isUser) {
                logEl.className = 'log-entry speech';
                const { player, speech } = log.message;

                logEl.innerHTML = `
            <img src="${player.avatar}" class="speech-avatar">
            <div class="speech-content">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="speaker">${player.name}</span>
                    <button class="uc-reroll-btn" data-log-index="${index}" title="重新生成发言" style="background:none; border:none; cursor:pointer; padding:0; color:var(--text-secondary);">
                        <svg class="reroll-btn-icon" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                </div>
                <span class="speech-text">${speech.replace(/\n/g, '<br>')}</span>
            </div>
        `;
            } else if (log.type === 'speech') {
                logEl.className = 'log-entry speech';
                logEl.innerHTML = `
                <img src="${log.message.player.avatar}" class="speech-avatar">
                <div class="speech-content">
                    <span class="speaker">${log.message.player.name}</span>
                    <span class="speech-text">${log.message.speech.replace(/\n/g, '<br>')}</span>
                </div>
            `;
            } else {
                logEl.className = `log-entry ${log.type}`;
                logEl.innerHTML = String(log.message).replace(/\n/g, '<br>');
            }
            logContainer.appendChild(logEl);
        });
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function logToUndercoverGame(message, type = 'system') {
        undercoverGameState.gameLog.push({ message, type });
        renderUndercoverGameScreen();
    }

    function waitForUserUndercoverAction(promptText, actionType, context = {}) {
        const me = undercoverGameState.players.find(p => p.isUser);
        if (me && !me.isAlive) {
            const actionArea = document.getElementById('undercover-action-area');
            actionArea.innerHTML = `<h5>您已淘汰，正在观战...</h5>`;
            return new Promise(async resolve => {
                await GH.sleep(3000);
                actionArea.innerHTML = '';
                resolve(null);
            });
        }

        return new Promise(resolve => {
            const actionArea = document.getElementById('undercover-action-area');
            actionArea.innerHTML = '';
            actionArea.className = 'undercover-action-area';

            if (actionType === 'speak') {
                actionArea.classList.add('speaking-mode');

                const placeholderText = context.placeholder || '请输入你的发言...';

                actionArea.innerHTML = `<textarea id="undercover-user-speech-input" rows="1" placeholder="${placeholderText}"></textarea><button id="undercover-end-speech-btn" class="form-button">发言</button>`;

                const textarea = document.getElementById('undercover-user-speech-input');
                const endBtn = document.getElementById('undercover-end-speech-btn');
                textarea.addEventListener('input', () => {
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                });
                textarea.focus();
                endBtn.onclick = () => {
                    const speech = textarea.value.trim() || '我过。';
                    actionArea.innerHTML = '';
                    actionArea.classList.remove('speaking-mode');
                    resolve(speech);
                };
            } else if (actionType === 'vote') {
                actionArea.innerHTML = `<h5>${promptText}</h5>`;
                const grid = document.createElement('div');
                grid.className = 'vote-target-grid';

                const targets = context.targets
                    ? context.targets.filter(p => !p.isUser)
                    : undercoverGameState.players.filter(p => p.isAlive && !p.isUser);

                targets.forEach(player => {
                    const btn = document.createElement('button');
                    btn.className = 'form-button-secondary vote-target-btn';
                    btn.textContent = player.name;
                    btn.onclick = async () => {
                        const reason = await showCustomPrompt(`投票给 ${player.name}`, '请输入你的投票理由（可选）');
                        if (reason !== null) {
                            actionArea.innerHTML = '';
                            resolve({ voteForId: player.id, reason: reason.trim() || '没有理由，跟着感觉走。' });
                        }
                    };
                    grid.appendChild(btn);
                });

                if (!context.targets) {
                    const passBtn = document.createElement('button');
                    passBtn.className = 'form-button-secondary vote-target-btn';
                    passBtn.textContent = '弃票';
                    passBtn.onclick = async () => {
                        const reason = await showCustomPrompt(`确认弃票`, '请输入你弃票的理由（可选）');
                        if (reason !== null) {
                            actionArea.innerHTML = '';
                            resolve({ voteForId: null, reason: reason.trim() || '信息不足，无法判断。' });
                        }
                    };
                    grid.appendChild(passBtn);
                }

                actionArea.appendChild(grid);
            }
        });
    }

    async function triggerUndercoverAiAction(playerId, actionType, context = {}) {
        const player = undercoverGameState.players.find(p => p.id === playerId);
        if (!player || !player.isAlive) return null;

        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) {
            if (actionType === 'describe' || actionType === 'tie_speak') return '我...词穷了，过。';
            if (actionType === 'vote') {
                const targets = context.targets || undercoverGameState.players.filter(p => p.isAlive && p.id !== playerId);
                const randomTargetId = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)].id : null;
                return { voteForId: randomTargetId, reason: '我凭直觉投的。' };
            }
            return null;
        }

        let actionPrompt = '';
        let jsonFormat = '';
        let roleDescription = '';
        let votingRule = '';

        const voteTargets = context.targets || undercoverGameState.players.filter(p => p.isAlive && p.id !== player.id);
        const alivePlayersListForVote = voteTargets.map(p => `- ${p.name} (id: ${p.id})`).join('\n');

        const gameLog = undercoverGameState.gameLog
            .filter(log => log.type === 'speech')
            .map(log => `${log.message.player.name}: ${log.message.speech}`)
            .join('\n');

        switch (actionType) {
            case 'describe':
                if (undercoverGameState.dayNumber > 1) {
                    actionPrompt = `游戏进入了第 ${undercoverGameState.dayNumber} 轮。现在轮到你发言。请根据你的身份和词语，用一句【全新的、和之前轮次不同】的话来描述。你的描述必须是真实的，但要足够模糊。禁止重复他人的描述。`;
                } else {
                    actionPrompt = `现在是第一轮，轮到你发言。请根据你的身份和词语，用一句话描述。你的描述必须是真实的，但要足够模糊。禁止重复他人的描述。`;
                }
                jsonFormat = '{"description": "你的描述..."}';
                break;

            case 'tie_speak':
                actionPrompt =
                    '你因为平票正在进行补充发言。请为自己辩解，说服其他人不要投票给你。你的发言要简短有力，符合你的人设和身份。';
                jsonFormat = '{"description": "你的补充发言..."}';
                break;
            case 'vote':
                actionPrompt = `现在是投票环节。请仔细分析【所有玩家的发言】，找出描述最可疑、最偏离主题、或者听起来最心虚的那个人，然后投票给他/她，并给出【简洁且符合逻辑】的理由。或者，如果你觉得信息不足无法判断，也可以选择弃票，并说明你弃票的原因。`;
                jsonFormat = '{"voteForId": "你投票的玩家ID或null", "reason": "你的投票或弃票理由..."}';
                votingRule = `
# 【【【投票铁律：这是最高指令，必须严格遵守】】】
在你的 "reason" 投票理由中，【绝对禁止】直接或间接提及你自己的词语，或猜测别人的词语是什么。你的理由只能基于对他人【发言描述】的分析，例如"他的描述很模糊"、"她的描述和大家不一样"等等。
`;
                break;
        }

        if (player.role === 'civilian') {
            roleDescription = `你是【平民】，你的词是【${player.word}】。你的目标是找出卧底和白板并投票淘汰他们。`;
        } else if (player.role === 'undercover') {
            roleDescription = `你是【卧底】，你的词是【${player.word}】。你的词和平民的词意思相近但不同。你的任务是【伪装】！仔细听别人的发言，找出他们的共同点，让自己听起来像个好人。`;
        } else {
            roleDescription = `你是【白板】，你没有词语。你的任务是【伪装和猜测】！在轮到你发言之前，【仔细听】前面所有人的描述，【猜出】他们的词语大概是什么，然后给出一个【非常模糊】的描述，让自己听起来和他们是一伙的。`;
        }

        const systemPrompt = `
# 游戏背景: 谁是卧底
你正在扮演玩家"${player.name}"，你的人设是："${player.persona}"。

# 你的身份和任务
${roleDescription}
你的所有行为都必须符合你的人设和游戏目标。
${votingRule}
# 当前场上局势
- 可投票的玩家列表:
${alivePlayersListForVote} 
- 本轮所有人的发言记录:
${gameLog || '(暂无发言)'}

# 你的行动指令
${actionPrompt}

# 输出格式
你的回复【必须且只能】是一个严格的JSON对象，格式如下:
${jsonFormat}
`;

        try {
            const messagesForApi = [{ role: 'user', content: systemPrompt }];
            let isGemini = proxyUrl === GEMINI_API_URL;
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

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(
                /^```json\s*|```$/g,
                '',
            );
            const aiAction = (window.repairAndParseJSON || JSON.parse)(content);

            if (actionType === 'describe' || actionType === 'tie_speak') {
                return aiAction.description || '我过。';
            }

            if (actionType === 'vote') {
                if (aiAction.voteForId === player.id) {
                    const targets = voteTargets.filter(p => p.id !== player.id);
                    const randomTargetId = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)].id : null;
                    return { voteForId: randomTargetId, reason: '我感觉有点混乱，随便投一个吧。' };
                }
                return aiAction;
            }
            return null;
        } catch (error) {
            console.error(`卧底AI (${player.name}) 行动失败:`, error);
            if (actionType === 'describe' || actionType === 'tie_speak') return '我想不出来，过。';
            if (actionType === 'vote') {
                const targets = voteTargets.filter(p => p.id !== player.id);
                const randomTargetId = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)].id : null;
                return { voteForId: randomTargetId, reason: '思考超时，凭直觉投的。' };
            }
            return null;
        }
    }

    function checkUndercoverGameOver() {
        const alivePlayers = undercoverGameState.players.filter(p => p.isAlive);
        const aliveCount = alivePlayers.length;
        const undercoverCount = alivePlayers.filter(p => p.role === 'undercover' || p.role === 'whiteboard').length;
        const civilianCount = aliveCount - undercoverCount;

        let winner = null;

        if (undercoverCount === 0) {
            winner = '平民阵营';
        } else if (civilianCount <= undercoverCount) {
            winner = '卧底阵营';
        }

        if (winner) {
            undercoverGameState.isActive = false;
            logToUndercoverGame(`游戏结束！${winner}胜利！`, 'system');

            setTimeout(() => {
                const summaryText = generateUndercoverSummary(winner);
                showUndercoverSummaryModal(summaryText);
            }, 2000);

            document.getElementById('undercover-action-area').innerHTML = '';
            return true;
        }
        return false;
    }

    function generateUndercoverSummary(winner) {
        let summary = `**谁是卧底 - 游戏复盘**\n\n`;
        summary += `🏆 **胜利方:** ${winner}\n\n`;
        summary += `**词语揭晓:**\n- 平民词: **${undercoverGameState.civilianWord}**\n- 卧底词: **${undercoverGameState.undercoverWord}**\n\n`;

        summary += `**玩家身份:**\n`;
        undercoverGameState.players.forEach(p => {
            const roleName = { undercover: '卧底', civilian: '平民', whiteboard: '白板' }[p.role];
            summary += `- ${p.name}: ${roleName}\n`;
        });

        summary += `\n---\n\n**游戏过程回顾:**\n`;
        const formattedLog = undercoverGameState.gameLog
            .map(log => {
                if (log.type === 'speech') {
                    return `${log.message.player.name}: ${log.message.speech}`;
                }
                return log.message.replace(/<strong>/g, '**').replace(/<\/strong>/g, '**');
            })
            .join('\n');
        summary += formattedLog;

        return summary;
    }

    function openUndercoverSummaryTargetPicker(summaryText) {
        const modal = document.getElementById('undercover-target-picker-modal');
        const listEl = document.getElementById('undercover-target-list');
        listEl.innerHTML = '';

        const aiPlayers = undercoverGameState.players.filter(p => !p.isUser);

        if (aiPlayers.length === 0) {
            alert('没有可分享的AI玩家。');
            return;
        }

        aiPlayers.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="undercover-target-checkbox" value="${player.id}" checked>
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
        `;
            listEl.appendChild(item);
        });

        const confirmBtn = document.getElementById('uc-confirm-share-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = () => {
            const selectedIds = Array.from(document.querySelectorAll('.undercover-target-checkbox:checked')).map(
                cb => cb.value,
            );
            if (selectedIds.length > 0) {
                sendUndercoverSummaryToSelectedPlayers(summaryText, selectedIds);
            } else {
                alert('请至少选择一个分享对象！');
            }
        };

        document.getElementById('uc-cancel-share-btn').onclick = () => modal.classList.remove('visible');
        document.getElementById('uc-select-all-btn').onclick = () => {
            document.querySelectorAll('.undercover-target-checkbox').forEach(cb => (cb.checked = true));
        };
        document.getElementById('uc-deselect-all-btn').onclick = () => {
            document.querySelectorAll('.undercover-target-checkbox').forEach(cb => (cb.checked = false));
        };

        modal.classList.add('visible');
    }

    async function sendUndercoverSummaryToSelectedPlayers(summaryText, targetIds) {
        document.getElementById('undercover-summary-modal').classList.remove('visible');
        document.getElementById('undercover-target-picker-modal').classList.remove('visible');
        let sentCount = 0;

        const aiContext = `[系统指令：刚刚结束了一局"谁是卧底"，这是游戏复盘。请根据这个复盘内容，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;

        for (const chatId of targetIds) {
            const chat = state.chats[chatId];
            if (chat) {
                const visibleMessage = {
                    role: 'user',
                    type: 'share_link',
                    timestamp: window.getUserMessageTimestamp(chat),
                    title: '谁是卧底 - 游戏复盘',
                    description: '点击查看详细复盘记录',
                    source_name: '游戏中心',
                    content: summaryText,
                };

                const hiddenInstruction = {
                    role: 'system',
                    content: aiContext,
                    timestamp: window.getUserMessageTimestamp(chat) + 1,
                    isHidden: true,
                };

                chat.history.push(visibleMessage, hiddenInstruction);
                await db.chats.put(chat);
                sentCount++;
            }
        }

        await showCustomAlert('分享成功', `游戏复盘已分享至 ${sentCount} 位AI玩家的单聊中！`);
        showScreen('game-hall-screen');
    }

    function showUndercoverSummaryModal(summaryText) {
        const modal = document.getElementById('undercover-summary-modal');
        const contentEl = document.getElementById('undercover-summary-content');

        contentEl.innerHTML = GH.renderMarkdown(summaryText);

        const repostBtn = document.getElementById('repost-undercover-summary-btn');
        const newRepostBtn = repostBtn.cloneNode(true);
        repostBtn.parentNode.replaceChild(newRepostBtn, repostBtn);
        newRepostBtn.onclick = () => openUndercoverSummaryTargetPicker(summaryText);

        const backBtn = document.getElementById('back-to-hall-from-undercover-btn');
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.onclick = () => {
            modal.classList.remove('visible');
            showScreen('game-hall-screen');
        };

        modal.classList.add('visible');
    }

    async function generateUndercoverWordsAI() {
        await showCustomAlert('请稍候...', 'AI正在为你出题...');
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) {
            throw new Error('API未配置，无法生成词语。');
        }

        const prompt = `
# 任务
你是一个"谁是卧底"游戏出题人。请生成一组有趣且有迷惑性的词语。

# 规则
1.  你必须生成两个词语：一个"平民词(civilianWord)"和一个"卧底词(undercoverWord)"。
2.  这两个词语必须属于同一大类，但具体指向不同。例如：牛奶 vs 豆浆，唇膏 vs 口红。
3.  词语必须是常见的2-4个字的中文名词。
4.  你的回复【必须且只能】是一个严格的JSON对象，格式如下:
    {"civilianWord": "...", "undercoverWord": "..."}
5.  【绝对禁止】返回任何JSON以外的文本、解释或分析。

现在，请出题。`;

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
                        response_format: { type: 'json_object' },
                    }),
                });

            if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

            const data = await response.json();
            const rawContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content)
                .replace(/^```json\s*|```$/g, '')
                .trim();
            const wordPair = (window.repairAndParseJSON || JSON.parse)(rawContent);

            if (wordPair.civilianWord && wordPair.undercoverWord) {
                return { civilian: wordPair.civilianWord, undercover: wordPair.undercoverWord };
            }
            throw new Error('AI返回的词语格式不正确。');
        } catch (error) {
            console.error('AI生成词语失败:', error);
            throw error;
        }
    }

    function initUndercoverEvents() {
        document.getElementById('start-undercover-game-btn').addEventListener('click', startUndercoverGame);
        document.getElementById('exit-undercover-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出游戏吗？当前进度不会保存。');
            if (confirmed) {
                undercoverGameState.isActive = false;
                showScreen('game-hall-screen');
            }
        });
        document.getElementById('undercover-my-word-btn').addEventListener('click', () => {
            if (undercoverGameState.isActive) {
                const me = undercoverGameState.players.find(p => p.isUser);
                if (me) {
                    const roleName = { undercover: '卧底', civilian: '平民', whiteboard: '白板' }[me.role] || '未知';
                    const wordText = me.word ? `你的词语是：【${me.word}】` : '你是一个白板，需要根据他人描述猜测平民词语。';
                    showCustomAlert(`你的身份是：【${roleName}】`, wordText);
                }
            }
        });
        document.getElementById('undercover-game-log').addEventListener('click', e => {
            const rerollBtn = e.target.closest('.uc-reroll-btn');
            if (rerollBtn) {
                const logIndex = parseInt(rerollBtn.dataset.logIndex);
                if (!isNaN(logIndex)) { handleUndercoverReroll(logIndex); }
            }
        });
    }

    GH.undercover = {
        openSetup: openUndercoverSetup,
        initEvents: initUndercoverEvents,
        getState: () => undercoverGameState,
    };
})();
