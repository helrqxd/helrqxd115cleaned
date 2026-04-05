// =======================================================================
// ===               你说我猜 (Guess What) 游戏模块                    ===
// =======================================================================

(function () {
    const GH = window.GameHall;

    let guessWhatGameState = {
        isActive: false, // 游戏是否正在进行
        mode: 'ai_guesses', // 游戏模式: 'ai_guesses' 或 'user_guesses'
        opponent: null, // 对手玩家对象 { id, name, avatar, persona }
        secretWord: '', // 谜底词语
        gameLog: [], // 游戏日志
        currentTurn: 'user', // 当前轮到谁: 'user' 或 'ai'
    };

    async function openGuessWhatSetup() {
        // 重置游戏状态，以防上次游戏数据残留
        guessWhatGameState = {
            isActive: false,
            mode: 'ai_guesses',
            opponent: null,
            secretWord: '',
            gameLog: [],
            currentTurn: 'user',
        };

        showScreen('guess-what-setup-screen');
        const selectionEl = document.getElementById('guess-what-player-selection');
        selectionEl.innerHTML = '<p>正在加载玩伴列表...</p>';

        const singleChats = Object.values(state.chats).filter(chat => !chat.isGroup);
        const allNpcs = Object.values(state.chats).flatMap(chat =>
            (chat.npcLibrary || []).map(npc => ({ ...npc, owner: chat.name })),
        );
        let playerOptions = [
            ...singleChats.map(c => ({ id: c.id, name: c.name, avatar: c.settings.aiAvatar, type: '角色' })),
            ...allNpcs.map(n => ({ id: n.id, name: n.name, avatar: n.avatar, type: `NPC (${n.owner})` })),
        ];

        selectionEl.innerHTML = '';
        if (playerOptions.length === 0) {
            selectionEl.innerHTML =
                '<p style="text-align:center; color: var(--text-secondary);">还没有可以一起玩的好友哦~</p>';
            return;
        }

        // 使用复选框，并添加专属class
        playerOptions.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="guess-what-player-checkbox" value="${player.id}" id="opponent-${player.id}" ${index === 0 ? 'checked' : ''
                }>
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
            <span class="type-tag">${player.type}</span>
        `;
            selectionEl.appendChild(item);
        });

        // 添加事件监听，实现单选效果
        selectionEl.addEventListener('click', e => {
            if (e.target.type === 'checkbox' && e.target.classList.contains('guess-what-player-checkbox')) {
                // 当点击一个复选框时，取消其他所有同类复选框的选中状态
                document.querySelectorAll('.guess-what-player-checkbox').forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            }
        });

        // 默认显示"我出题"模式的输入框
        document.getElementById('user-word-input-container').style.display = 'block';
    }

    /**
     * 【你说我猜】开始游戏的核心逻辑
     */
    async function startGuessWhatGame() {

        const selectedOpponentCheckbox = document.querySelector('.guess-what-player-checkbox:checked');
        if (!selectedOpponentCheckbox) {
            alert('请选择一位玩伴！');
            return;
        }
        const opponentId = selectedOpponentCheckbox.value;
        const gameMode = document.querySelector('input[name="guess_what_mode"]:checked').value;
        const userWord = document.getElementById('guess-what-user-word').value.trim();

        if (gameMode === 'ai_guesses' && !userWord) {
            alert('"我出题"模式下，词语不能为空！');
            return;
        }

        await showCustomAlert('请稍候...', '正在准备游戏，AI也在摩拳擦掌...');

        const chat = Object.values(state.chats).find(c => c.id === opponentId);
        let opponentInfo = null;
        if (chat) {
            opponentInfo = { id: chat.id, name: chat.name, avatar: chat.settings.aiAvatar, persona: chat.settings.aiPersona };
        } else {
            for (const c of Object.values(state.chats)) {
                const npc = (c.npcLibrary || []).find(n => n.id === opponentId);
                if (npc) {
                    opponentInfo = { id: npc.id, name: npc.name, avatar: npc.avatar, persona: npc.persona };
                    break;
                }
            }
        }
        if (!opponentInfo) {
            alert('找不到所选的玩伴信息！');
            return;
        }

        guessWhatGameState.isActive = true;
        guessWhatGameState.mode = gameMode;
        guessWhatGameState.opponent = opponentInfo;
        guessWhatGameState.gameLog = [];

        document.getElementById('guess-what-game-title').textContent = `与 ${opponentInfo.name} 的游戏`;
        const inputEl = document.getElementById('guess-what-user-input');

        if (gameMode === 'ai_guesses') {
            guessWhatGameState.secretWord = userWord;
            guessWhatGameState.currentTurn = 'user';
            logToGuessWhatGame('游戏开始！你来出题，请给出你的第一个提示。', 'system');
            inputEl.placeholder = '请给出第一个提示...';
            inputEl.disabled = false;
        } else {
            const { secretWord, firstHint } = await triggerGuessWhatAiAction('generate_word');
            if (!secretWord) {
                await showCustomAlert('出题失败', '抱歉，AI今天好像没灵感，想不出题目来。请稍后再试或检查API设置。');
                guessWhatGameState.isActive = false;
                showScreen('game-hall-screen');
                return;
            }
            guessWhatGameState.secretWord = secretWord;
            guessWhatGameState.currentTurn = 'user';
            logToGuessWhatGame(`游戏开始！${opponentInfo.name} 已经想好了一个词。`, 'system');
            logToGuessWhatGame(
                { player: opponentInfo, text: `【${opponentInfo.name}托着下巴想了想】第一个提示是... ${firstHint}` },
                'ai-turn',
            );
            inputEl.placeholder = '请根据提示进行猜测...';
            inputEl.disabled = false;
        }

        showScreen('guess-what-game-screen');
        renderGuessWhatGameScreen();
        inputEl.focus();
        const actionArea = document.getElementById('guess-what-action-area');
        if (actionArea) actionArea.style.display = 'flex';
    }

    /**
     * 【你说我猜】处理AI发言的重roll请求
     * @param {number} logIndex - 要重roll的AI发言在gameLog中的索引
     */
    async function handleGuessWhatReroll(logIndex) {
        // 1. 找到AI的发言和触发它的那条用户发言
        const aiLogIndex = logIndex;
        const userLogIndex = logIndex - 1;

        // 安全检查
        if (
            userLogIndex < 0 ||
            !guessWhatGameState.gameLog[userLogIndex] ||
            guessWhatGameState.gameLog[userLogIndex].type !== 'user-turn'
        ) {
            alert('无法重roll，找不到触发此回应的用户消息。');
            return;
        }

        // 2. 提取用户原始的输入内容
        const originalUserInput = guessWhatGameState.gameLog[userLogIndex].message.text;

        // 3. 从日志中移除这两条记录，实现"时间倒流"
        guessWhatGameState.gameLog.splice(userLogIndex, 2);

        // 4. 立即刷新界面，让用户看到消息消失了
        renderGuessWhatGameScreen();
        await showCustomAlert('请稍候...', 'AI正在换个思路...');

        // 5. 使用用户原始的输入，重新调用游戏主流程
        await processGuessWhatTurn(originalUserInput);
    }

    /**
     * 【你说我猜】渲染游戏主界面
     */
    function renderGuessWhatGameScreen() {
        const logContainer = document.getElementById('guess-what-game-log');
        logContainer.innerHTML = '';

        guessWhatGameState.gameLog.forEach((log, index) => {
            // 增加index参数
            const logEl = document.createElement('div');
            logEl.className = `guess-log-entry ${log.type}`;

            if (log.type === 'system') {
                logEl.textContent = log.message;
            } else if (log.type === 'ai-turn') {
                // 定位到AI的发言
                const avatarUrl = log.message.player.avatar;
                // 为AI发言添加重roll按钮
                logEl.innerHTML = `
                <img src="${avatarUrl}" class="avatar">
                <div class="bubble">
                    <div class="name" style="display: flex; align-items: center; gap: 8px;">
                        ${log.message.player.name}
                        <button class="gw-reroll-btn" data-log-index="${index}" title="让Ta换个说法" style="background:none; border:none; cursor:pointer; padding:0; color:var(--text-secondary);">
                           <svg class="reroll-btn-icon" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                    </div>
                    <div>${log.message.text.replace(/\n/g, '<br>')}</div>
                </div>
            `;
            } else {
                // 用户的发言保持原样
                const avatarUrl = log.message.player.isUser
                    ? state.qzoneSettings.avatar || defaultAvatar
                    : log.message.player.avatar;
                logEl.innerHTML = `
                <img src="${avatarUrl}" class="avatar">
                <div class="bubble">
                    <div class="name">${log.message.player.name}</div>
                    <div>${log.message.text.replace(/\n/g, '<br>')}</div>
                </div>
            `;
            }
            logContainer.appendChild(logEl);
        });

        logContainer.scrollTop = logContainer.scrollHeight;
    }


    /**
     * 【你说我猜】添加一条游戏日志
     */
    function logToGuessWhatGame(message, type = 'system') {
        guessWhatGameState.gameLog.push({ message, type });
        renderGuessWhatGameScreen();
    }

    /**
     * 【你说我猜】游戏主循环/引擎
     * @param {string} userInput - 用户刚刚的输入
     */
    async function processGuessWhatTurn(userInput) {
        if (!guessWhatGameState.isActive) return;

        const inputEl = document.getElementById('guess-what-user-input');
        const userPlayer = { id: 'user', name: state.qzoneSettings.nickname || '我', isUser: true };
        const aiPlayer = guessWhatGameState.opponent;
        const currentMode = guessWhatGameState.mode;

        // 1. 记录并显示用户的行为
        logToGuessWhatGame({ player: userPlayer, text: userInput }, 'user-turn');

        // 2. 轮到AI行动，禁用输入框
        guessWhatGameState.currentTurn = 'ai';
        inputEl.placeholder = `等待 ${aiPlayer.name} 的回应...`;
        inputEl.disabled = true;
        renderGuessWhatGameScreen();
        await GH.sleep(1500);

        // 3. 让AI根据上下文执行动作
        const aiResponse = await triggerGuessWhatAiAction(
            currentMode === 'ai_guesses' ? 'guess_word' : 'give_hint',
            userInput,
        );


        if (aiResponse) {
            switch (aiResponse.type) {
                case 'guess':
                    const guessText = aiResponse.text;
                    // 先把AI的猜测显示出来
                    logToGuessWhatGame({ player: aiPlayer, text: guessText }, 'ai-turn');

                    // 调用裁判函数进行判断
                    if (isGuessCorrect(guessText, guessWhatGameState.secretWord)) {
                        await GH.sleep(1000); // 停顿一下，让玩家看到猜测内容
                        endGuessWhatGame('ai', `我猜对啦！答案就是【${guessWhatGameState.secretWord}】！`);
                        return; // 猜对了，游戏结束，退出函数
                    }
                    // 如果没猜对，则不执行任何操作，流程会自然地走到最后，把控制权还给用户
                    break;

                case 'hint':
                    // AI给出新提示
                    logToGuessWhatGame({ player: aiPlayer, text: aiResponse.text }, 'ai-turn');
                    break;

                case 'game_over':
                    // AI在给提示时直接判断用户猜对了
                    endGuessWhatGame(aiResponse.winner, aiResponse.reason);
                    return; // 游戏结束，退出函数

                case 'error':
                    // AI返回了错误信息
                    logToGuessWhatGame({ player: aiPlayer, text: aiResponse.text }, 'ai-turn');
                    break;

                default:
                    // 未知类型的回复，也记录下来
                    logToGuessWhatGame({ player: aiPlayer, text: '我好像有点跑神了，我们说到哪了？' }, 'ai-turn');
                    console.warn('收到了未知的AI行动类型:', aiResponse);
                    break;
            }
        } else {
            // API调用彻底失败
            logToGuessWhatGame({ player: aiPlayer, text: '我...好像彻底断线了...' }, 'ai-turn');
        }

        // 5. 如果游戏没有结束，则轮到用户行动，恢复输入框
        guessWhatGameState.currentTurn = 'user';
        inputEl.placeholder = currentMode === 'ai_guesses' ? '请继续给出你的提示...' : '请根据提示继续猜测...';
        inputEl.disabled = false;
        inputEl.focus();
    }

    /**
     * 【你说我猜】游戏结束处理
     */
    function endGuessWhatGame(winner, reason) {
        if (!guessWhatGameState.isActive) return; // 防止重复执行
        guessWhatGameState.isActive = false; // 标记游戏为非激活状态

        // 立即隐藏游戏中的输入区域
        const actionArea = document.getElementById('guess-what-action-area');
        if (actionArea) actionArea.style.display = 'none';

        // 生成复盘文本
        const summaryText = generateGuessWhatSummary(winner, reason);
        // 显示结算卡片
        showGuessWhatSummaryModal(summaryText);
    }
    /**
     * 判断AI的猜测是否正确（简单版）
     * @param {string} guess - AI猜测的词语
     * @param {string} answer - 正确答案
     * @returns {boolean}
     */
    function isGuessCorrect(guess, answer) {
        if (!guess || !answer) return false;

        // 为了更宽松的匹配，我们都转为小写并去除空格
        const cleanGuess = guess.toLowerCase().replace(/\s+/g, '');
        const cleanAnswer = answer.toLowerCase().replace(/\s+/g, '');

        // 只要猜测包含了答案，或者答案包含了猜测，就认为正确
        // 例如：答案是"冰淇淋"，猜测"冰淇淋车"或"淇淋"，都算对
        return cleanGuess.includes(cleanAnswer) || cleanAnswer.includes(cleanGuess);
    }

    /**
     * 【你说我猜】调用AI执行游戏逻辑，内置强大的重试机制
     * @param {string} actionType - AI需要执行的动作: 'generate_word', 'give_hint', 'guess_word'
     * @param {string} userInput - 用户刚刚的输入
     * @returns {Promise<object|null>} - AI的行动结果
     */
    async function triggerGuessWhatAiAction(actionType, userInput = null) {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) return null;

        // --- 这部分Prompt逻辑保持不变 ---
        const opponent = guessWhatGameState.opponent;
        const historyText = guessWhatGameState.gameLog
            .map(log =>
                log.type === 'system' ? `[系统提示: ${log.message}]` : `${log.message.player.name}: ${log.message.text}`,
            )
            .slice(-10)
            .join('\n');
        let systemPrompt = `# 你的任务\n你正在扮演角色"${opponent.name}"，人设是："${opponent.persona}"。\n你正在和"${state.qzoneSettings.nickname || '我'
            }"玩"你说我猜"游戏。\n你的所有发言都【必须】严格符合你的人设和口吻，让整个过程像一次真实的聊天互动。\n\n# 游戏历史 (最近的对话)\n${historyText}\n`;
        switch (actionType) {
            case 'generate_word':
                systemPrompt += `# 你的行动指令\n1. 根据你的人设，想一个常见的、2-5个字的中文词语作为谜底。\n2. 为这个词语，给出你的【第一条】符合人设的、有趣的提示。\n3. 你的回复【必须且只能】是一个严格的JSON对象，包含 "secretWord" 和 "firstHint" 两个字段。\n\n# JSON输出格式示例:\n{"secretWord": "月亮", "firstHint": "【指了指天上】晚上才能看到的东西哦，圆圆的，亮亮的~"}`;
                break;
            case 'give_hint':
                systemPrompt += `# 游戏规则
你是出题人，你的谜底是【${guessWhatGameState.secretWord}】。
用户刚刚的猜测是："${userInput}"。

# 你的行动指令
1.  首先判断用户的猜测是否正确。
2.  如果用户猜对了，游戏结束。
3.  如果用户猜错了，你【必须】根据用户的错误猜测，给出【下一条】新的、更具针对性的提示，引导他们。
4.  【【【人设扮演铁律】】】你的所有提示都【必须】符合你的人设和口吻，可以加入动作、表情、语气词，甚至可以对用户【笨笨的猜测进行一些俏皮的吐槽】，让游戏更有趣。
5.  你的回复【必须且只能】是一个严格的JSON对象。

# JSON输出格式
- 如果猜对了: \`{"type": "game_over", "winner": "user", "reason": "恭喜你猜对啦！就是【${guessWhatGameState.secretWord}】！"}\`
- 如果猜错了: \`{"type": "hint", "text": "【叹气】不对哦，再想想。提示是：[在这里写你的新提示]"}\``;
                break;


            case 'guess_word':
                systemPrompt += `# 游戏规则
你是猜题人，用户正在描述一个词语，你需要根据提示猜出这个词。
用户刚刚给你的新提示是："${userInput}"。

# 你的行动指令
1.  综合分析【游戏历史】中用户给出的【所有提示】。
2.  根据所有线索，进行【一次】猜测。
3.  【【【人设扮演铁律】】】你的猜测【必须】符合你的人设和口吻。你可以加入你的思考过程、情绪，甚至可以【对用户的提示进行吐槽】。
4.  【【【趣味性指令】】】为了逗弄用户，你可以【故意给出一些有趣的、沾点边但明显错误的答案】，然后再给出你认为最可能的答案。但这只是偶尔的调剂，你的最终目的还是要猜对。
5.  【【【绝对禁止】】】你【不能】再向用户提问，你的任务是直接猜测。
6.  你的回复【必须且只能】是一个严格的JSON对象。

# JSON输出格式 (注意：你无法判断自己是否猜对，所以永远使用这个格式)
{"type": "guess", "text": "【假装恍-然大悟】哦~我知道了，是"电饭煲"对不对？...好吧好吧不逗你了，我猜是...[你的真实猜测]"}`;
                break;

        }

        // --- 带有智能重试的API请求逻辑 ---
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const messagesForApi = [{ role: 'user', content: '请根据你在系统指令中读到的规则，立即开始你的行动。' }];
                const isGemini = proxyUrl === GEMINI_API_URL;
                const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);

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

                // 智能判断错误类型
                if (!response.ok) {
                    // 对于 4xx 类的客户端错误 (如 401 Unauthorized, 400 Bad Request)，通常重试无效，直接抛出。
                    if (response.status >= 400 && response.status < 500) {
                        const errorText = await response.text();
                        throw new Error(`API客户端错误 (状态码 ${response.status}): ${errorText}`);
                    }
                    // 对于 5xx 服务器错误或 429 速率限制，是可重试的。
                    throw new Error(`API服务器临时错误 (状态码 ${response.status})`);
                }

                const data = await response.json();
                const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(
                    /^```json\s*|```$/g,
                    '',
                );
                return (window.repairAndParseJSON || JSON.parse)(content); // **成功，直接返回结果，跳出循环**
            } catch (error) {
                console.error(`"你说我猜"AI行动[${actionType}]失败 (第 ${attempt}/${maxRetries} 次尝试):`, error.message);

                // 如果是最后一次尝试，或者是一个不可重试的错误，则跳出循环准备返回最终失败信息
                if (attempt === maxRetries || error.message.includes('API客户端错误')) {
                    break;
                }

                // 等待一段时间再重试（比如 1.5s, 3s, 4.5s）
                await GH.sleep(1500 * attempt);
            }
        }

        // --- 所有重试都失败后的最终处理 ---
        console.error(`"你说我猜"AI行动[${actionType}]在所有尝试后均失败。`);
        // 根据失败的阶段，返回一个特定的错误对象
        if (actionType === 'generate_word') {
            return { secretWord: null, firstHint: null };
        }
        // 返回一个全新的 'error' 类型，让游戏主循环知道如何处理
        return { type: 'error', text: '【叹了口气】抱歉，我的网络好像出问题了，试了好几次都没连上...' };
    }


    /**
     * 【你说我猜】生成游戏复盘的文本
     * @param {string} winner - 胜利者 ('user' or 'ai')
     * @param {string} reason - 游戏结束原因
     * @returns {string} 格式化后的复盘Markdown文本
     */
    function generateGuessWhatSummary(winner, reason) {
        let summaryText = `**你说我猜 - 游戏复盘**\n\n`;
        summaryText += `**游戏结果:** ${reason}\n`;
        summaryText += `**谜底:** ${guessWhatGameState.secretWord}\n\n`;
        summaryText += `**参与玩家:** 我, ${guessWhatGameState.opponent.name}\n\n`;
        summaryText += `---\n\n**游戏记录:**\n`;

        const formattedLog = guessWhatGameState.gameLog
            .map(log => {
                if (log.type === 'system') {
                    return `[系统提示: ${log.message}]`;
                } else {
                    return `${log.message.player.name}: ${log.message.text}`;
                }
            })
            .join('\n');

        summaryText += formattedLog;

        return summaryText;
    }

    /**
     * 【你说我猜】显示游戏结算卡片模态框
     * @param {string} summaryText - 复盘文本
     */
    function showGuessWhatSummaryModal(summaryText) {
        const modal = document.getElementById('guess-what-summary-modal');
        const contentEl = document.getElementById('guess-what-summary-content');

        contentEl.innerHTML = GH.renderMarkdown(summaryText);

        // 使用克隆节点技巧，防止事件重复绑定
        const forwardBtn = document.getElementById('forward-guess-what-summary-btn');
        const newForwardBtn = forwardBtn.cloneNode(true);
        forwardBtn.parentNode.replaceChild(newForwardBtn, forwardBtn);

        const closeBtn = document.getElementById('close-guess-what-summary-btn');
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        // 检查对手是否是主要角色（有独立聊天窗口），而不是NPC
        const opponentId = guessWhatGameState.opponent.id;
        const canForward = state.chats[opponentId] !== undefined;

        if (canForward) {
            newForwardBtn.style.display = 'block';
            newForwardBtn.onclick = () => forwardGuessWhatSummary(summaryText);
        } else {
            // 如果对手是NPC，没有独立聊天窗口，则隐藏转发按钮
            newForwardBtn.style.display = 'none';
        }

        newCloseBtn.onclick = () => {
            modal.classList.remove('visible');
            showScreen('game-hall-screen');
        };

        modal.classList.add('visible');
    }

    /**
     * 【你说我猜】将游戏复盘转发到对应的AI角色的聊天中
     * @param {string} summaryText - 复盘文本
     */
    async function forwardGuessWhatSummary(summaryText) {
        const opponentId = guessWhatGameState.opponent.id;
        const chat = state.chats[opponentId];

        if (!chat) {
            await showCustomAlert('转发失败', '找不到该玩家的聊天窗口。');
            return;
        }

        document.getElementById('guess-what-summary-modal').classList.remove('visible');

        // 创建对用户可见的复盘消息
        const gameBaseTs = window.getUserMessageTimestamp(chat);
        const visibleMessage = {
            role: 'user',
            type: 'share_link',
            timestamp: gameBaseTs,
            title: '你说我猜 - 游戏复盘',
            description: '点击查看详细复盘记录',
            source_name: '游戏中心',
            content: summaryText,
        };

        // 创建给AI看的隐藏指令
        const aiContext = `[系统指令：刚刚结束了一局"你说我猜"，这是游戏复盘。请根据这个复盘内容，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;
        const hiddenInstruction = {
            role: 'system',
            content: aiContext,
            timestamp: gameBaseTs + 1,
            isHidden: true,
        };

        chat.history.push(visibleMessage, hiddenInstruction);
        await db.chats.put(chat);

        await showCustomAlert('转发成功', `游戏复盘已发送至与"${chat.name}"的聊天中！`);


        // 我们现在通过 window 对象来调用这两个"公共函数"
        window.openChat(chat.id);
        window.triggerAiResponse();

    }

    function initGuessWhatEvents() {
        document.querySelectorAll('input[name="guess_what_mode"]').forEach(radio => {
            radio.addEventListener('change', function () {
                document.getElementById('user-word-input-container').style.display =
                    this.value === 'ai_guesses' ? 'block' : 'none';
            });
        });
        document.getElementById('start-guess-what-game-btn').addEventListener('click', startGuessWhatGame);

        document.getElementById('exit-guess-what-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出游戏吗？谜底将会揭晓。');
            if (confirmed) {
                endGuessWhatGame('none', '游戏被中途放弃。');
                setTimeout(() => {
                    showScreen('game-hall-screen');
                }, 3000);
            }
        });

        document.getElementById('give-up-guess-what-btn').addEventListener('click', () => {
            endGuessWhatGame(guessWhatGameState.currentTurn === 'user' ? 'ai' : 'user', '玩家放弃了游戏。');
        });

        document.getElementById('send-guess-what-input-btn').addEventListener('click', () => {
            const input = document.getElementById('guess-what-user-input');
            const text = input.value.trim();
            if (text) {
                processGuessWhatTurn(text);
                input.value = '';
            }
        });

        document.getElementById('guess-what-user-input').addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('send-guess-what-input-btn').click();
            }
        });

        document.getElementById('guess-what-game-log').addEventListener('click', e => {
            const rerollBtn = e.target.closest('.gw-reroll-btn');
            if (rerollBtn) {
                const logIndex = parseInt(rerollBtn.dataset.logIndex);
                if (!isNaN(logIndex)) {
                    handleGuessWhatReroll(logIndex);
                }
            }
        });
    }

    GH.guessWhat = {
        openSetup: openGuessWhatSetup,
        initEvents: initGuessWhatEvents,
        getState: () => guessWhatGameState,
    };
})();
