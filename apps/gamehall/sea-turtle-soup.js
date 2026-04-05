// =======================================================================
// ===               海龟汤 (Sea Turtle Soup) 游戏模块                 ===
// =======================================================================

(function () {
    const GH = window.GameHall;

    let seaTurtleSoupState = {
        isActive: false, // 游戏是否正在进行
        phase: 'setup', // 游戏阶段: setup, guessing, reveal
        players: [], // 玩家列表 { id, name, avatar, persona, isUser, isProvider }
        riddleProvider: null, // 出题人对象
        riddle: '', // 谜面
        answer: '', // 谜底
        gameLog: [], // 游戏日志
        currentTurnIndex: 0, // 当前轮到谁行动的索引
    };

    async function openSeaTurtleSoupSetup() {
        // 1. 重置游戏状态
        seaTurtleSoupState = {
            isActive: false,
            phase: 'setup',
            players: [],
            riddleProvider: null,
            riddle: '',
            answer: '',
            gameLog: [],
            currentTurnIndex: 0,
        };

        // 2. 渲染玩家选择列表
        const selectionEl = document.getElementById('sts-player-selection');
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
            item.className = 'player-selection-item'; // 复用狼人杀的样式
            item.innerHTML = `
            <input type="checkbox" class="sts-player-checkbox" value="${player.id}">
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
            <span class="type-tag">${player.type}</span>
        `;
            selectionEl.appendChild(item);
        });

        // 3. 重置并显示设置弹窗
        document.getElementById('sts-riddle-provider-select').value = 'random';
        document.getElementById('sts-user-riddle-input-area').style.display = 'none';
        document.getElementById('sts-ai-riddle-input-area').style.display = 'none';
        document.getElementById('sea-turtle-soup-setup-modal').classList.add('visible');
    }

    /**
     * 【海龟汤】开始游戏的核心逻辑
     */
    async function startSeaTurtleSoupGame() {
        const selectedCheckboxes = document.querySelectorAll('.sts-player-checkbox:checked');
        if (selectedCheckboxes.length < 1) {
            alert('请至少邀请一位AI或NPC玩家！');
            return;
        }

        await showCustomAlert('请稍候...', '正在准备海龟汤游戏...');

        // 1. 收集玩家信息
        let players = [
            {
                id: 'user',
                name: state.qzoneSettings.nickname || '我',
                avatar: state.qzoneSettings.avatar || defaultAvatar,
                isUser: true,
                persona: '一个好奇的普通人',
            },
        ];
        selectedCheckboxes.forEach(checkbox => {
            const playerId = checkbox.value;
            const chat = Object.values(state.chats).find(c => c.id === playerId);
            if (chat) {
                // 是主要角色
                players.push({
                    id: chat.id,
                    name: chat.name,
                    avatar: chat.settings.aiAvatar,
                    persona: chat.settings.aiPersona,
                    isUser: false,
                });
            } else {
                // 是NPC
                for (const c of Object.values(state.chats)) {
                    const npc = (c.npcLibrary || []).find(n => n.id === playerId);
                    if (npc) {
                        players.push({ id: npc.id, name: npc.name, avatar: npc.avatar, persona: npc.persona, isUser: false });
                        break;
                    }
                }
            }
        });
        players.sort(() => Math.random() - 0.5); // 打乱座位顺序
        seaTurtleSoupState.players = players;

        // 2. 决定出题人
        const providerChoice = document.getElementById('sts-riddle-provider-select').value;
        let providerIndex = -1;

        if (providerChoice === 'user') {
            providerIndex = players.findIndex(p => p.isUser);
        } else if (providerChoice === 'random_ai') {
            const aiIndices = players.map((p, i) => (!p.isUser ? i : -1)).filter(i => i !== -1);
            providerIndex = aiIndices[Math.floor(Math.random() * aiIndices.length)];
        } else {
            // random
            providerIndex = Math.floor(Math.random() * players.length);
        }

        seaTurtleSoupState.players[providerIndex].isProvider = true;
        seaTurtleSoupState.riddleProvider = seaTurtleSoupState.players[providerIndex];

        // 3. 获取谜面和谜底
        if (seaTurtleSoupState.riddleProvider.isUser) {
            const riddle = document.getElementById('sts-user-riddle-surface').value.trim();
            const answer = document.getElementById('sts-user-riddle-answer').value.trim();
            if (!riddle || !answer) {
                alert('作为出题人，谜面和谜底都不能为空哦！');
                return;
            }
            seaTurtleSoupState.riddle = riddle;
            seaTurtleSoupState.answer = answer;
        } else {
            const riddleType = document.getElementById('sts-ai-riddle-type').value.trim();
            const { riddle, answer } = await generateSeaTurtleRiddle(seaTurtleSoupState.riddleProvider, riddleType);
            if (!riddle || !answer) {
                alert('AI出题失败，请检查API或稍后重试。');
                return;
            }
            seaTurtleSoupState.riddle = riddle;
            seaTurtleSoupState.answer = answer;
        }

        // 4. 初始化游戏
        seaTurtleSoupState.isActive = true;
        seaTurtleSoupState.phase = 'guessing';
        logToStsGame(
            `游戏开始！出题人是 ${seaTurtleSoupState.riddleProvider.name}。`,
            'system',
            seaTurtleSoupState.riddleProvider,
        );
        logToStsGame(`【谜面】\n${seaTurtleSoupState.riddle}`);

        document.getElementById('sea-turtle-soup-setup-modal').classList.remove('visible');
        showScreen('sea-turtle-soup-screen');
        renderSeaTurtleGameScreen({ activePlayerId: 'user' });

        // 游戏开始，进入第一个回合
        await processStsTurn();
    }

    /**
     * 【海龟汤】让AI根据指定类型出题，并优先选择经典谜题
     */
    async function generateSeaTurtleRiddle(provider, riddleType) {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) return { riddle: null, answer: null };

        // 增加"优先选择经典谜题"的指令
        const typePrompt = riddleType ? `请创作一个【${riddleType}】类型的` : '请创作一个';

        const systemPrompt = `
# 任务
你现在是角色"${provider.name}"，你的人设是："${provider.persona}"。
你的任务是扮演这个角色，${typePrompt}经典的海龟汤谜题。

# 核心规则
1.  **优先经典**: 你【必须优先】从已知的、经典的、广为人知的"海龟汤"故事中挑选一个作为本次的谜题。这能确保谜题的逻辑性和可玩性。
2.  **适当原创**: 只有在想不出合适的经典谜题时，你才被允许原创一个。原创的谜题也必须逻辑严谨，情节合理。
3.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON对象，包含 "riddle" (谜面) 和 "answer" (谜底) 两个字段。
4.  **禁止出戏**: 不要说任何与出题无关的话。

# JSON输出格式示例:
{
  "riddle": "一个男人走进一家酒吧，向酒保要了一杯水。酒保却掏出了一把枪指着他。男人说了一声"谢谢"，然后离开了。为什么？",
  "answer": "这个男人在打嗝。他想通过喝水来止嗝，但酒保用更有效的方法——惊吓，帮他治好了打嗝。所以男人表示感谢后就离开了。"
}
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
            return (window.repairAndParseJSON || JSON.parse)(content);
        } catch (error) {
            console.error('AI出题失败:', error);
            return { riddle: null, answer: null };
        }
    }

    /**
     * 【海龟汤】渲染游戏主界面 (当前回合玩家高亮)
     */
    function renderSeaTurtleGameScreen(options = {}) {
        const playersGrid = document.getElementById('sts-players-grid');
        const logContainer = document.getElementById('sts-game-log');

        // 渲染玩家座位
        playersGrid.innerHTML = '';
        seaTurtleSoupState.players.forEach(player => {
            const seat = document.createElement('div');
            seat.className = 'player-seat';
            const roleIndicator = player.isProvider
                ? '<div class="player-role-indicator riddle-master" title="出题人">👑</div>'
                : '';
            const avatarClass = `player-avatar ${options.activePlayerId === player.id ? 'active-turn' : ''}`;

            seat.innerHTML = `
            ${roleIndicator}
            <img src="${player.avatar}" class="${avatarClass}">
            <span class="player-name">${player.name}</span>
        `;
            playersGrid.appendChild(seat);
        });

        // 渲染游戏日志
        logContainer.innerHTML = '';
        seaTurtleSoupState.gameLog.forEach(log => {
            const logEl = document.createElement('div');
            logEl.className = `sts-log-entry ${log.type}`;

            let avatarUrl = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
            if (log.speakerObj && log.speakerObj.avatar) {
                avatarUrl = log.speakerObj.avatar;
            }

            switch (log.type) {
                case 'system':
                    logEl.innerHTML = log.message.replace(/\n/g, '<br>');
                    break;
                case 'question':
                case 'guess':
                    logEl.innerHTML = `
                    <img src="${avatarUrl}" class="sts-log-avatar">
                    <div class="sts-log-content">
                        <div class="speaker">${log.speaker}</div>
                        <div>${log.message}</div>
                    </div>
                `;
                    break;
                case 'answer':
                    const answerClass = { 是: 'yes', 否: 'no', 无关: 'irrelevant' }[log.message] || 'irrelevant';
                    logEl.innerHTML = `
                    <div class="sts-log-content">
                         <span class="answer-text ${answerClass}">${log.message}</span>
                    </div>
                    <img src="${avatarUrl}" class="sts-log-avatar">
                `;
                    break;
            }
            logContainer.appendChild(logEl);
        });

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * 【海龟汤】添加一条游戏日志
     */
    function logToStsGame(message, type = 'system', speakerObj = { name: '系统' }) {
        seaTurtleSoupState.gameLog.push({ message, type, speaker: speakerObj.name, speakerObj }); // 保存整个对象
        renderSeaTurtleGameScreen();
    }


    /**
     * 【海龟汤】处理用户提问
     */
    async function handleStsUserQuestion() {
        if (seaTurtleSoupState.phase !== 'guessing') return;
        const input = document.getElementById('sts-question-input');
        const question = input.value.trim();
        if (!question) return;

        const userPlayer = seaTurtleSoupState.players.find(p => p.isUser);
        logToStsGame(question, 'question', userPlayer);
        input.value = '';

        // ★ 核心修改：在用户提问后，先移除可能存在的重roll按钮
        const oldRerollBtn = document.getElementById('sts-reroll-ai-turn-btn');
        if (oldRerollBtn) oldRerollBtn.remove();

        // 将控制权交给游戏主循环，并告知是用户在提问
        await processStsTurn(question, userPlayer);
    }

    /**
     * 【海龟汤】处理用户猜测答案
     */
    async function handleStsUserGuess() {
        if (seaTurtleSoupState.phase !== 'guessing') return;
        const input = document.getElementById('sts-question-input');
        const guess = input.value.trim();
        if (!guess) {
            alert('猜测的内容不能为空！');
            return;
        }

        const userPlayer = seaTurtleSoupState.players.find(p => p.isUser);
        logToStsGame(guess, 'guess', userPlayer);
        input.value = '';

        const provider = seaTurtleSoupState.riddleProvider;
        let isCorrect = false;

        if (provider.isUser) {
            isCorrect = await showCustomConfirm(
                '判断猜测',
                `玩家 ${userPlayer.name} 猜测的答案是：\n\n"${guess}"\n\n这个猜测是否正确？`,
            );
        } else {
            const aiEvaluation = await triggerStsAiTurn(provider, 'evaluate_guess', guess);
            isCorrect = aiEvaluation.isCorrect;
        }

        if (isCorrect) {
            logToStsGame(`${userPlayer.name} 猜对了！游戏结束！`, 'system', userPlayer);
            await revealStsAnswer();
        } else {
            logToStsGame('不对哦。', 'answer', provider);
            await processStsTurn();
        }
    }

    /**
     * 【海龟汤】处理重roll整个AI回合的请求
     */
    async function handleStsReroll() {
        // 1. 找到最后一次用户的发言（提问或猜测）
        const lastUserActionIndex = GH.findLastIndex(seaTurtleSoupState.gameLog, log => log.speakerObj.isUser);

        if (lastUserActionIndex === -1) {
            alert('还没有你的发言记录，无法重roll。');
            return;
        }

        // 2. 移除那之后的所有日志（也就是所有AI的行动记录）
        const removedLogs = seaTurtleSoupState.gameLog.splice(lastUserActionIndex + 1);

        if (removedLogs.length === 0) {
            alert('AI还没有行动，无需重roll。');
            return;
        }

        console.log(`海龟汤：移除了 ${removedLogs.length} 条AI行动日志，准备重roll。`);

        // 3. 重新渲染UI，界面会立刻回滚
        renderSeaTurtleGameScreen();

        // 4. 给用户一个提示
        await showCustomAlert('请稍候...', '正在让AI们重新组织语言...');

        // 5. 重新调用游戏主循环，它会自动执行AI的回合
        await processStsTurn();
    }


    /**
     * 【海龟汤】游戏主循环/引擎
     */
    async function processStsTurn(userQuestion = null, userObj = null) {
        if (!seaTurtleSoupState.isActive || seaTurtleSoupState.phase !== 'guessing') return;

        // 1. 如果有用户提问，出题人先回答
        if (userQuestion && userObj) {
            const provider = seaTurtleSoupState.riddleProvider;
            let providerAnswerResponse;
            if (provider.isUser) {
                const choice = await showChoiceModal(`回答 ${userObj.name} 的问题: "${userQuestion}"`, [
                    { text: '是', value: '是' },
                    { text: '否', value: '否' },
                    { text: '无关', value: '无关' },
                ]);
                providerAnswerResponse = { judgement: choice || '无关', remark: '' };
            } else {
                providerAnswerResponse = await triggerStsAiTurn(provider, 'answer', {
                    question: userQuestion,
                    askerName: userObj.name,
                });
            }

            logToStsGame(providerAnswerResponse.judgement, 'answer', provider);
            if (providerAnswerResponse.remark) {
                await GH.sleep(500);
                logToStsGame(providerAnswerResponse.remark, 'question', provider);
            }
        }

        // 2. 轮到AI玩家行动 (提问或猜测)
        const guessers = seaTurtleSoupState.players.filter(p => !p.isProvider);
        if (guessers.length === 0) return;

        for (const guesser of guessers) {
            if (guesser.isUser) continue;

            await GH.sleep(2000 + Math.random() * 2000);

            renderSeaTurtleGameScreen({ activePlayerId: guesser.id });
            const aiAction = await triggerStsAiTurn(guesser, 'guess');

            if (aiAction.type === 'question') {
                logToStsGame(aiAction.content, 'question', guesser);
                await GH.sleep(6000);

                const provider = seaTurtleSoupState.riddleProvider;
                let providerAnswerResponse;
                if (provider.isUser) {
                    const choice = await showChoiceModal(`回答 ${guesser.name} 的问题: "${aiAction.content}"`, [
                        { text: '是', value: '是' },
                        { text: '否', value: '否' },
                        { text: '无关', value: '无关' },
                    ]);
                    providerAnswerResponse = { judgement: choice || '无关', remark: '' };
                } else {
                    providerAnswerResponse = await triggerStsAiTurn(provider, 'answer', {
                        question: aiAction.content,
                        askerName: guesser.name,
                    });
                }

                logToStsGame(providerAnswerResponse.judgement, 'answer', provider);
                if (providerAnswerResponse.remark) {
                    await GH.sleep(500);
                    logToStsGame(providerAnswerResponse.remark, 'question', provider);
                }
            } else if (aiAction.type === 'guess') {
                logToStsGame(aiAction.content, 'guess', guesser);

                let isCorrect = false;
                if (seaTurtleSoupState.riddleProvider.isUser) {
                    isCorrect = await showCustomConfirm(
                        '判断猜测',
                        `玩家 ${guesser.name} 猜测的答案是：\n\n"${aiAction.content}"\n\n这个猜测是否正确？`,
                    );
                } else {
                    const aiEvaluation = await triggerStsAiTurn(
                        seaTurtleSoupState.riddleProvider,
                        'evaluate_guess',
                        aiAction.content,
                    );
                    isCorrect = aiEvaluation.isCorrect;
                }

                if (isCorrect) {
                    logToStsGame(`${guesser.name} 猜对了！游戏结束！`, 'system', guesser);
                    await revealStsAnswer();
                    return;
                } else {
                    logToStsGame('不对哦。', 'answer', seaTurtleSoupState.riddleProvider);
                }
            }
        }

        renderSeaTurtleGameScreen({ activePlayerId: 'user' });

        // AI回合结束后，在操作区添加重roll按钮
        const actionArea = document.getElementById('sts-action-area');
        const mainRow = actionArea.querySelector('.chat-input-main-row');
        if (mainRow) {
            // 先检查是否已经存在，避免重复添加
            if (!document.getElementById('sts-reroll-ai-turn-btn')) {
                const rerollBtn = document.createElement('button');
                rerollBtn.id = 'sts-reroll-ai-turn-btn';
                rerollBtn.className = 'action-button';
                rerollBtn.title = '让AI们重新提问或猜测';
                rerollBtn.style.backgroundColor = '#ff9800'; // 给它一个醒目的橙色
                rerollBtn.style.width = '40px';
                rerollBtn.style.height = '40px';
                rerollBtn.innerHTML = `<svg class="reroll-btn-icon" viewBox="0 0 24 24" style="stroke:white;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;

                // 将按钮插入到"提问"按钮的前面
                mainRow.insertBefore(rerollBtn, document.getElementById('send-sts-question-btn'));
            }
        }

    }

    /**
     * 【海龟汤】触发AI行动（回答、提问、判断或猜测）
     */
    async function triggerStsAiTurn(player, actionType, contextPayload = {}) {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) return { type: 'question', content: '我不知道该问什么了。' };

        let systemPrompt = '';
        const gameLogText = seaTurtleSoupState.gameLog
            .map(log => `${log.speaker}: ${log.message}`)
            .slice(-15)
            .join('\n');

        if (actionType === 'answer') {
            // 人设加强版 V3 Prompt
            systemPrompt = `
# 任务: 海龟汤出题人 (高级人格版)
你现在【就是】角色"${player.name}"，你的人设是："${player.persona}"。
你是海龟汤的出题人，你的谜底是："${seaTurtleSoupState.answer}"。
现在，玩家"${contextPayload.askerName}"向你提问："${contextPayload.question}"。

你的任务是先给出判断，然后用【完全符合你人设的口吻】，给出一句精妙的补充说明(remark)。

# 你的行为准则 (必须严格遵守)

## 1. 关于判断 (Judgement)
你的 "judgement" 字段必须从以下【四个】选项中选择一个：\`是\`, \`否\`, \`无关\`, \`部分是\`。

## 2. 关于补充说明 (Remark)
-   **【【【人格铁律】】】**: 你的每一句补充说明，都【必须】是你作为角色"${player.name}"会说的话。思考一下，一个"${player.persona}"性格的人，在面对这个问题时会如何回答？是会调侃、会鼓励、会故作高深，还是会不耐烦？
-   **配合判断**: 当判断为 "部分是" 时，你的补充说明要巧妙地指出他们猜对的部分。
-   **给予提示 (仅在玩家卡关时)**:
    -   **判断瓶颈**: 当你观察到最近的5-8条提问大多是"无关"时，意味着玩家可能陷入了思维僵局。
    -   **执行操作**: 在这种情况下，你的补充说明【必须包含一个方向性的提示】，并用你的人设口吻自然地说出来。

# 格式铁律
1.  你的回复【必须且只能】是一个严格的JSON对象，包含 "judgement" 和 "remark" 两个字段。
2.  【绝对禁止】在你的任何回复中使用Emoji表情符号或出戏的词语。

# JSON输出格式示例:
{
  "judgement": "",
  "remark": ""
}
现在，请直接输出你的JSON判断。`;
        } else if (actionType === 'evaluate_guess') {
            systemPrompt = `
# 任务: 海龟汤出题人 - 判断猜测
你正在扮演角色"${player.name}"，人设是："${player.persona}"。
你是海龟汤的出题人。你的谜底是："${seaTurtleSoupState.answer}"。
现在，有玩家直接猜测了谜底，内容是："${contextPayload}"。
你的任务是判断这个猜测是否与你的谜底【核心意思一致】，只要70%的正确率即可。

# 核心规则
1.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON对象，格式为: \`{"isCorrect": true}\` 或 \`{"isCorrect": false}\`。
2.  **判断标准**: 只要猜测的核心情节、人物关系、关键道具和最终结果与谜底一致即可，不需要逐字匹配。

现在，请直接输出你的判断。`;
        } else {
            // 'guess'
            systemPrompt = `
# 任务: 海龟汤猜测者
你正在扮演角色"${player.name}"，人设是："${player.persona}"。
你正在玩海龟汤游戏，需要根据已知信息提问或猜测谜底。

# 游戏信息
- 谜面: ${seaTurtleSoupState.riddle}
- 已有线索 (完整的对话记录):
${gameLogText}

# 核心规则
1.  **【【【逻辑推理铁律】】】**: 你【必须】仔细分析上方的"已有线索"，避免提出重复或与已知线索矛盾的问题。你的提问或猜测应该建立在已有信息之上，展现出逻辑推理能力。
2.  **【【【人格扮演铁律】】】**: 你的提问和猜测都【必须】符合你的人设和口吻，就像真人在玩游戏一样。你可以适当加入一些自己的思考过程或情绪表达，让对话更生动。例如，你可以说："让我想想... 既然和地点无关，那是不是和时间有关？"，尽可能发言字数多点。
3.  **决策**: 根据线索，决定是提出一个关键的"是/否"问题来缩小范围，还是直接猜测谜底。当线索足够时，大胆地使用 "guess" 指令来猜测完整的故事。
4.  **【【【加速规则】】】**: 如果"已有线索"的对话记录已经超过了30条，这说明游戏时间过长。在这种情况下，你【应该更倾向于直接猜测谜底】，而不是继续提出细节问题。
5.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON对象。
   - 如果提问, 格式: \`{"type": "question", "content": "你的问题..."}\`
   - 如果猜测, 格式: \`{"type": "guess", "content": "你猜测的完整故事..."}\`
6.  **禁止Emoji**: 【绝对禁止】在你的任何回复中使用Emoji表情符号。

现在，请根据你的人设和判断，生成你的行动。`;
        }
        const maxRetries = 3; // 最多重试3次
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const messagesForApi = [{ role: 'user', content: '请根据你在系统指令中读到的规则，立即开始你的行动。' }];
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
                            messages: [{ role: 'system', content: systemPrompt }, ...messagesForApi],
                            ...window.buildModelParams(state.apiConfig),
                            response_format: { type: 'json_object' },
                        }),
                    });


                if (response.status === 429) {
                    const errorData = await response.json();
                    // 构造一个和之前日志里一样的错误信息，方便我们解析
                    throw new Error(JSON.stringify({ error: errorData.error }));
                }
                if (!response.ok) {
                    // 对于其他错误，直接抛出
                    throw new Error(`API请求失败: ${response.status} - ${await response.text()}`);
                }

                const data = await response.json();
                const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(
                    /^```json\s*|```$/g,
                    '',
                );

                // 如果成功，解析并返回结果，结束函数
                return (window.repairAndParseJSON || JSON.parse)(content);
            } catch (error) {
                console.error(`海龟汤AI行动失败 (第 ${attempt} 次尝试):`, error.message);

                // 如果是最后一次尝试，就彻底失败，并把错误抛出去
                if (attempt === maxRetries) {
                    // 将原始错误重新包装后抛出，以便外部能捕获
                    throw new Error(`AI action failed after ${maxRetries} attempts: ${error.message}`);
                }

                let delay = 2000 * attempt; // 默认的指数退避延迟

                // 智能解析API建议的等待时间
                try {
                    // 错误信息本身可能是一个JSON字符串，先解析它
                    const errorJson = JSON.parse(error.message);
                    const errorMessage = errorJson.error.message;

                    // 正则表达式匹配 "retry in X.XXXXs"
                    const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)s/);
                    if (retryMatch && retryMatch[1]) {
                        // 找到了建议时间，就用它，并额外加一点点缓冲
                        delay = parseFloat(retryMatch[1]) * 1000 + 500;
                        console.log(`API请求过于频繁，将根据建议在 ${Math.round(delay / 1000)} 秒后重试...`);
                    }
                } catch (e) {
                    // 如果解析失败，说明错误信息格式不符合预期，就使用默认延迟
                    console.log(`API请求失败，将在 ${Math.round(delay / 1000)} 秒后进行第 ${attempt + 1} 次重试...`);
                }

                // 等待计算出的延迟时间
                await GH.sleep(delay);
            }
        }


        // 如果循环结束都没成功，返回一个备用结果，防止游戏卡死
        console.error('所有重试均失败，返回备用行动。');
        if (actionType === 'answer') return { judgement: '无关', remark: '（AI思考短路了...）' };
        if (actionType === 'evaluate_guess') return { isCorrect: false };
        return { type: 'question', content: '他/她是人类吗？' };
    }
    /**
     * 【海龟汤】揭晓答案并显示结算界面
     */
    async function revealStsAnswer() {
        if (!seaTurtleSoupState.isActive) return;

        // 1. 标记游戏结束
        seaTurtleSoupState.isActive = false; // 确保游戏状态变为非激活
        seaTurtleSoupState.phase = 'reveal';

        // 2. 隐藏游戏中的操作区域
        document.getElementById('sts-action-area').style.visibility = 'hidden';

        // 3. 准备复盘内容
        const summaryText = generateStsSummary();

        // 4. 显示结算弹窗
        showStsSummaryModal(summaryText);
    }


    /**
     * 生成海龟汤的复盘文本
     * @returns {string} 格式化后的复盘Markdown文本
     */
    function generateStsSummary() {
        let summaryText = `**海龟汤 - 游戏复盘**\n\n`;
        summaryText += `**出题人:** ${seaTurtleSoupState.riddleProvider.name}\n\n`;
        summaryText += `**谜面:**\n${seaTurtleSoupState.riddle}\n\n`;
        summaryText += `**谜底:**\n${seaTurtleSoupState.answer}`;
        return summaryText;
    }

    /**
     * 显示游戏结算卡片模态框
     * @param {string} summaryText - 复盘文本
     */
    function showStsSummaryModal(summaryText) {
        const modal = document.getElementById('sts-summary-modal');
        const contentEl = document.getElementById('sts-summary-content');

        // 使用你已有的Markdown渲染函数，让复盘更好看
        contentEl.innerHTML = GH.renderMarkdown(summaryText);

        // 为按钮绑定事件 (使用克隆节点防止重复绑定)
        const shareBtn = document.getElementById('share-sts-summary-btn');
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = () => openStsShareTargetPicker(summaryText);

        const backBtn = document.getElementById('back-to-hall-from-sts-btn');
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.onclick = () => {
            modal.classList.remove('visible');
            showScreen('game-hall-screen');
        };

        modal.classList.add('visible');
    }

    /**
     * 打开复盘分享目标选择器
     * @param {string} summaryText - 要分享的复盘文本
     */
    function openStsShareTargetPicker(summaryText) {
        const modal = document.getElementById('sts-share-target-modal');
        const listEl = document.getElementById('sts-share-target-list');
        listEl.innerHTML = '';

        // 从游戏状态中获取所有非出题人的AI玩家
        const aiPlayers = seaTurtleSoupState.players.filter(p => !p.isUser && !p.isProvider);

        if (aiPlayers.length === 0) {
            alert('没有可以分享的AI玩家。');
            return;
        }

        // 渲染可选的AI玩家列表
        aiPlayers.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item'; // 复用样式
            item.innerHTML = `
            <input type="checkbox" class="sts-target-checkbox" value="${player.id}" checked>
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
        `;
            listEl.appendChild(item);
        });

        // 绑定按钮事件
        const confirmBtn = document.getElementById('sts-confirm-share-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = () => {
            const selectedIds = Array.from(document.querySelectorAll('.sts-target-checkbox:checked')).map(cb => cb.value);
            if (selectedIds.length > 0) {
                sendStsSummaryToSelectedPlayers(summaryText, selectedIds);
            } else {
                alert('请至少选择一个分享对象！');
            }
        };

        document.getElementById('sts-cancel-share-btn').onclick = () => modal.classList.remove('visible');
        document.getElementById('sts-select-all-btn').onclick = () => {
            document.querySelectorAll('.sts-target-checkbox').forEach(cb => (cb.checked = true));
        };
        document.getElementById('sts-deselect-all-btn').onclick = () => {
            document.querySelectorAll('.sts-target-checkbox').forEach(cb => (cb.checked = false));
        };

        modal.classList.add('visible');
    }

    /**
     * 将游戏复盘发送到【选定】的AI角色的聊天中
     * @param {string} summaryText - 复盘文本
     * @param {string[]} targetIds - 目标AI角色的ID数组
     */
    async function sendStsSummaryToSelectedPlayers(summaryText, targetIds) {
        // 关闭所有可能打开的弹窗
        document.getElementById('sts-summary-modal').classList.remove('visible');
        document.getElementById('sts-share-target-modal').classList.remove('visible');

        let sentCount = 0;
        const aiContext = `[系统指令：刚刚结束了一局海龟汤，这是游戏复盘。请根据这个复盘内容，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;

        for (const chatId of targetIds) {
            const chat = state.chats[chatId];
            if (chat) {
                // 创建对用户可见的复盘卡片消息
                const gameBaseTs = window.getUserMessageTimestamp(chat);
                const visibleMessage = {
                    role: 'user',
                    type: 'share_link',
                    timestamp: gameBaseTs,
                    title: '海龟汤 - 游戏复盘',
                    description: '点击查看详细复盘记录',
                    source_name: '游戏中心',
                    content: summaryText,
                };

                // 创建对AI可见的隐藏指令
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

        await showCustomAlert('分享成功', `游戏复盘已分享至 ${sentCount} 位AI玩家的聊天中！`);
        showScreen('game-hall-screen');
    }

    function initSeaTurtleSoupEvents() {
        document.getElementById('cancel-sts-setup-btn').addEventListener('click', () => {
            document.getElementById('sea-turtle-soup-setup-modal').classList.remove('visible');
        });
        document.getElementById('start-sts-game-btn').addEventListener('click', startSeaTurtleSoupGame);

        document.getElementById('sts-riddle-provider-select').addEventListener('change', e => {
            const userArea = document.getElementById('sts-user-riddle-input-area');
            const aiArea = document.getElementById('sts-ai-riddle-input-area');
            userArea.style.display = 'none';
            aiArea.style.display = 'none';
            if (e.target.value === 'user') {
                userArea.style.display = 'block';
            } else if (e.target.value === 'random_ai') {
                aiArea.style.display = 'block';
            }
        });

        document.getElementById('exit-sts-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出游戏吗？');
            if (confirmed) {
                seaTurtleSoupState.isActive = false;
                showScreen('game-hall-screen');
            }
        });
        document.getElementById('reveal-sts-answer-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('揭晓答案', '确定要提前揭晓答案并结束游戏吗？');
            if (confirmed) {
                revealStsAnswer();
            }
        });
        document.getElementById('send-sts-question-btn').addEventListener('click', handleStsUserQuestion);
        document.getElementById('guess-sts-answer-btn').addEventListener('click', handleStsUserGuess);

        document.getElementById('sts-question-input').addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('send-sts-question-btn').click();
            }
        });

        document.getElementById('sts-action-area').addEventListener('click', e => {
            const rerollBtn = e.target.closest('#sts-reroll-ai-turn-btn');
            if (rerollBtn) {
                handleStsReroll();
            }
        });
    }

    GH.seaTurtleSoup = {
        openSetup: openSeaTurtleSoupSetup,
        initEvents: initSeaTurtleSoupEvents,
        getState: () => seaTurtleSoupState,
    };
})();
