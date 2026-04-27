// =======================================================================
// ===               心动飞行棋 (Ludo) 游戏模块                        ===
// =======================================================================

(function () {
    const GH = window.GameHall;

    const LUDO_BOARD_SIZE = 42;

    let ludoGameState = {
        isActive: false,
        opponent: null,
        players: [], // { id, name, avatar, piecePosition: -1 (at home), isUser }
        currentTurnIndex: 0,
        gameLog: [],
        boardLayout: [],
        isDiceRolling: false,
    };

    let activeQuestionBankId = null;
    let editingQuestionId = null;

    async function exportLudoQuestionBank(bankId) {
        try {
            const bank = await db.ludoQuestionBanks.get(bankId);
            const questions = await db.ludoQuestions.where('bankId').equals(bankId).toArray();

            if (!bank) {
                alert('错误：找不到要导出的题库。');
                return;
            }

            // 1. 准备要导出的数据结构，只包含纯粹的数据
            const exportData = {
                bankName: bank.name,
                questions: questions.map(q => ({
                    text: q.text,
                    type: q.type,
                })),
            };

            // 2. 将数据转换为格式化的JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);

            // 3. 创建Blob对象
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 4. 创建并触发下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `[飞行棋题库]${bank.name}-${dateStr}.json`;
            document.body.appendChild(link);
            link.click();

            // 5. 清理临时创建的对象
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            await showCustomAlert('导出成功', `问题库"${bank.name}"已成功导出！`);
        } catch (error) {
            console.error('导出飞行棋题库失败:', error);
            await showCustomAlert('导出失败', `发生了一个错误: ${error.message}`);
        }
    }

    /**
     * 处理导入的飞行棋问题库文件
     * @param {File} file - 用户选择的JSON文件
     */
    async function importLudoQuestionBank(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async e => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);

                // 1. 验证文件格式
                if (!data.bankName || !Array.isArray(data.questions)) {
                    throw new Error("文件格式无效。必须包含 'bankName' 和 'questions' 数组。");
                }

                // 2. 检查题库名称是否已存在
                let newBankName = data.bankName;
                const existingBank = await db.ludoQuestionBanks.where('name').equals(newBankName).first();
                if (existingBank) {
                    newBankName = `${newBankName} (导入)`; // 如果重名，自动添加后缀
                }

                // 3. 创建新的题库
                const newBankId = await db.ludoQuestionBanks.add({ name: newBankName });

                // 4. 准备要批量添加的新问题
                const questionsToAdd = data.questions.map(q => ({
                    bankId: newBankId,
                    text: q.text,
                    type: q.type || 'both_answer', // 兼容旧的没有type的题库
                }));

                // 5. 如果有问题，就批量添加到数据库
                if (questionsToAdd.length > 0) {
                    await db.ludoQuestions.bulkAdd(questionsToAdd);
                }

                // 6. 刷新UI并给出提示
                await renderLudoQuestionBanks();
                await showCustomAlert('导入成功', `问题库"${newBankName}"已成功导入，包含 ${questionsToAdd.length} 个问题！`);
            } catch (error) {
                console.error('导入飞行棋题库失败:', error);
                await showCustomAlert('导入失败', `无法解析文件，请确保它是正确的题库备份文件。\n\n错误: ${error.message}`);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    /**
     * 【飞行棋】打开游戏设置界面
     */
    async function openLudoSetup() {
        showScreen('ludo-setup-screen');
        const selectionEl = document.getElementById('ludo-player-selection');
        selectionEl.innerHTML = '<p>正在加载角色列表...</p>';

        // 加载NPC作为可选玩伴
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

        // 渲染复选框列表
        playerOptions.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
            <input type="checkbox" class="ludo-player-checkbox" value="${player.id}" id="ludo-opponent-${player.id}" ${index === 0 ? 'checked' : ''
                }>
            <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
            <span class="name">${player.name}</span>
            <span class="type-tag">${player.type}</span>
        `;
            selectionEl.appendChild(item);
        });

        // 添加事件监听以实现单选
        selectionEl.addEventListener('click', e => {
            if (e.target.type === 'checkbox' && e.target.classList.contains('ludo-player-checkbox')) {
                document.querySelectorAll('.ludo-player-checkbox').forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            }
        });

        // 加载问题库到下拉框
        const bankSelect = document.getElementById('ludo-question-bank-select');
        bankSelect.innerHTML = '';
        const banks = await db.ludoQuestionBanks.toArray();
        if (banks.length === 0) {
            bankSelect.innerHTML = '<option value="">暂无可用题库</option>';
        } else {
            banks.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = bank.name;
                bankSelect.appendChild(option);
            });
        }
    }

    /**
     * 【飞行棋】开始游戏的核心逻辑 (V2 - 复选框版)
     */
    async function startLudoGame() {

        const selectedOpponentRadio = document.querySelector('.ludo-player-checkbox:checked');
        if (!selectedOpponentRadio) {
            alert('请选择一位玩伴！');
            return;
        }
        const opponentId = selectedOpponentRadio.value;
        const opponentChat =
            state.chats[opponentId] ||
            Object.values(state.chats)
                .flatMap(c => c.npcLibrary)
                .find(n => n.id === opponentId);

        const selectedBankId = parseInt(document.getElementById('ludo-question-bank-select').value);
        if (isNaN(selectedBankId)) {
            alert('请选择一个有效的问题库！');
            return;
        }

        // 查找对手的完整信息（和旧逻辑一样）
        let opponentInfo = null;
        const mainChat = Object.values(state.chats).find(c => c.id === opponentId);
        if (mainChat) {
            opponentInfo = { ...mainChat, persona: mainChat.settings.aiPersona, avatar: mainChat.settings.aiAvatar };
        } else {
            for (const c of Object.values(state.chats)) {
                const npc = (c.npcLibrary || []).find(n => n.id === opponentId);
                if (npc) {
                    opponentInfo = npc;
                    break;
                }
            }
        }
        if (!opponentInfo) {
            alert('找不到所选的玩伴信息！');
            return;
        }

        // 初始化游戏状态 (和旧逻辑一样)
        ludoGameState = {
            isActive: true,
            opponent: opponentInfo,
            players: [],
            currentTurnIndex: 0,
            gameLog: [],
            boardLayout: [],
            isDiceRolling: false,
            activeQuestionBankId: selectedBankId,
        };
        const userPlayer = {
            id: 'user',
            name: '你',
            avatar: state.qzoneSettings.avatar || defaultAvatar,
            piecePosition: -1,
            isUser: true,
        };
        const charPlayer = {
            id: opponentInfo.id,
            name: opponentInfo.name,
            avatar: opponentInfo.avatar || defaultAvatar,
            piecePosition: -1,
            isUser: false,
            persona: opponentInfo.persona,
        };
        if (Math.random() > 0.5) {
            ludoGameState.players = [userPlayer, charPlayer];
        } else {
            ludoGameState.players = [charPlayer, userPlayer];
        }
        ludoGameState.currentTurnIndex = 0;
        generateLudoBoard();
        showScreen('ludo-game-screen');
        renderLudoGameScreen();
        logToLudoGame('游戏开始！掷出6点即可起飞。', 'system');
        await GH.sleep(1000);
        await processLudoTurn();
    }

    /**
     * 【飞行棋】处理AI发言的重roll请求
     * @param {number} logIndex - 要重roll的发言在gameLog中的索引
     */
    async function handleLudoReroll(logIndex) {
        const logEntry = ludoGameState.gameLog[logIndex];
        if (!logEntry || logEntry.type !== 'char') return;

        // 提取原始发言内容
        const originalSpeech = logEntry.message.replace(/<strong>.*?<\/strong>:\s*/, '');

        // 重新调用AI，让它换个说法
        const newSpeech = await triggerLudoAiAction('reroll_comment', { originalSpeech: originalSpeech });

        // 更新日志并重新渲染
        ludoGameState.gameLog[logIndex].message = `<strong>${ludoGameState.opponent.name}:</strong> ${newSpeech}`;
        renderLudoGameScreen();
    }

    function renderLudoGameScreen(options = {}) {
        if (!ludoGameState.isActive) return;

        const userPieceEl = document.getElementById('ludo-user-piece');
        const charPieceEl = document.getElementById('ludo-char-piece');
        if (!userPieceEl || !charPieceEl) return;

        userPieceEl.style.backgroundImage = `url(${ludoGameState.players.find(p => p.isUser).avatar})`;
        charPieceEl.style.backgroundImage = `url(${ludoGameState.players.find(p => !p.isUser).avatar})`;

        ludoGameState.players.forEach(player => {
            const pieceEl = player.isUser ? userPieceEl : charPieceEl;
            const pos = player.piecePosition;

            if (pos === -1) {
                const startCell = document.querySelector('.ludo-cell.start');
                if (startCell) {
                    pieceEl.style.left = `${startCell.offsetLeft + (player.isUser ? 0 : 5)}px`;
                    pieceEl.style.top = `${startCell.offsetTop + (player.isUser ? 0 : 5)}px`;
                }
            } else if (pos >= LUDO_BOARD_SIZE) {
                const endCell = document.querySelector('.ludo-cell.end');
                if (endCell) {
                    pieceEl.style.left = `${endCell.offsetLeft + (player.isUser ? 0 : 5)}px`;
                    pieceEl.style.top = `${endCell.offsetTop + (player.isUser ? 0 : 5)}px`;
                }
            } else {
                const cell = document.querySelector(`.ludo-cell[data-index="${pos}"]`);
                if (cell) {
                    pieceEl.style.left = `${cell.offsetLeft + (player.isUser ? 0 : 5)}px`;
                    pieceEl.style.top = `${cell.offsetTop + (player.isUser ? 0 : 5)}px`;
                }
            }
        });

        const logContainer = document.getElementById('ludo-game-log');
        // 在map函数中加入 index 参数
        logContainer.innerHTML = ludoGameState.gameLog
            .map((log, index) => {
                // 判断是否为AI发言
                if (log.type === 'char') {
                    // 为AI发言添加重roll按钮
                    return `
                <div class="log-entry char">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span>${log.message.replace(/\n/g, '<br>')}</span>
                        <button class="ludo-reroll-btn" data-log-index="${index}" title="让Ta换个说法" style="background:none; border:none; cursor:pointer; padding:0 5px; color:var(--text-secondary);">
                           <svg class="reroll-btn-icon" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                    </div>
                </div>
            `;
                }
                // 其他类型的日志保持原样
                return `<div class="log-entry ${log.type}">${log.message.replace(/\n/g, '<br>')}</div>`;
            })
            .join('');
        logContainer.scrollTop = logContainer.scrollHeight;
    }


    /**
     * 飞行棋专用的用户输入函数
     * @param {string} promptText - 提示文字 (虽然我们没用上，但保留接口)
     * @param {string} placeholder - 输入框的占位文字
     * @returns {Promise<string>} - 返回用户的输入内容
     */
    function waitForLudoUserAction(promptText, placeholder) {
        return new Promise(resolve => {
            const actionArea = document.getElementById('ludo-action-area');
            actionArea.innerHTML = ''; // 清空旧内容（比如骰子）
            actionArea.classList.add('speaking-mode'); // 复用剧本杀的发言样式

            const textarea = document.createElement('textarea');
            textarea.id = 'ludo-user-speech-input'; // 使用新ID，避免冲突
            textarea.rows = 1;
            textarea.placeholder = placeholder || '请输入你的回答...';

            // 实时调整高度
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'form-button'; // 使用通用按钮样式
            confirmBtn.textContent = '确认回答';

            actionArea.appendChild(textarea);
            actionArea.appendChild(confirmBtn);
            textarea.focus();

            confirmBtn.onclick = () => {
                const answer = textarea.value.trim() || '...（跳过）';
                actionArea.innerHTML = ''; // 清空输入框和按钮
                actionArea.classList.remove('speaking-mode');
                resolve(answer);
            };
        });
    }

    /**
     * 【飞行棋】添加一条游戏日志
     */
    function logToLudoGame(message, type) {
        ludoGameState.gameLog.push({ message, type });
        renderLudoGameScreen();
    }

    /**
     * 一个带"魔法"的掷骰子函数
     * @param {object} player - 正在掷骰子的玩家对象
     * @returns {number} - 最终的骰子点数
     */
    function rollTheDice(player) {
        // 如果玩家还在起点（没有起飞）
        if (player.piecePosition === -1) {
            // 就有50%的超高概率直接掷出6！
            if (Math.random() < 0.5) {
                return 6;
            }
            // 另外50%的概率，随机掷出1-5
            return Math.floor(Math.random() * 5) + 1;
        }
        // 如果已经起飞了，就恢复正常的公平骰子
        return Math.floor(Math.random() * 6) + 1;
    }


    /**
     * 【飞行棋】游戏主循环
     */
    async function processLudoTurn() {
        if (!ludoGameState.isActive) return;

        const currentPlayer = ludoGameState.players[ludoGameState.currentTurnIndex];
        logToLudoGame(`轮到 <strong>${currentPlayer.name}</strong> 行动了。`, 'system');

        if (currentPlayer.isUser) {
            // 用户回合
            const actionArea = document.getElementById('ludo-action-area');
            actionArea.innerHTML = `
            <div id="ludo-dice-container" title="点击掷骰子">
                <div class="dice">
                    <div class="face front">1</div><div class="face back">6</div>
                    <div class="face right">3</div><div class="face left">4</div>
                    <div class="face top">2</div><div class="face bottom">5</div>
                </div>
            </div>
        `;
            document.getElementById('ludo-dice-container').onclick = handleUserRollDice;
        } else {
            // AI回合
            document.getElementById('ludo-action-area').innerHTML = `<p>${currentPlayer.name} 正在思考...</p>`;
            await GH.sleep(2000);
            const diceRoll = rollTheDice(currentPlayer);
            await handlePlayerMove(currentPlayer, diceRoll, false);
        }
    }

    /**
     * 【飞行棋】处理用户掷骰子
     */
    async function handleUserRollDice() {
        if (ludoGameState.isDiceRolling) return;
        ludoGameState.isDiceRolling = true;

        const diceEl = document.querySelector('.dice');
        diceEl.classList.add('rolling');
        document.getElementById('ludo-dice-container').onclick = null; // 防止重复点击

        const userPlayer = ludoGameState.players.find(p => p.isUser); // 先找到用户玩家对象
        const diceRoll = rollTheDice(userPlayer); // 调用新函数

        setTimeout(async () => {
            diceEl.classList.remove('rolling');
            // 根据点数旋转到对应面 (这是一个简化的视觉效果)
            const rotations = {
                1: 'rotateY(0deg)',
                2: 'rotateX(-90deg)',
                3: 'rotateY(-90deg)',
                4: 'rotateY(90deg)',
                5: 'rotateX(90deg)',
                6: 'rotateY(180deg)',
            };
            diceEl.style.transform = rotations[diceRoll];

            const userPlayer = ludoGameState.players.find(p => p.isUser);
            await handlePlayerMove(userPlayer, diceRoll, true);

            ludoGameState.isDiceRolling = false;
        }, 1500);
    }


    async function handlePlayerMove(player, diceRoll, isUserMove) {
        logToLudoGame(
            `<strong>${player.name}</strong> 掷出了 <strong>${diceRoll}</strong> 点！`,
            isUserMove ? 'user' : 'char',
        );

        if (player.piecePosition === -1) {
            // 如果棋子还在起点
            if (diceRoll === 6) {
                player.piecePosition = 0; // 起飞到第0格
                logToLudoGame(`<strong>${player.name}</strong> 的棋子起飞了！`, 'system');
                renderLudoGameScreen();

                if (!isUserMove) {
                    await triggerLudoAiAction('roll_6');
                }
                logToLudoGame(`掷出6点，<strong>${player.name}</strong> 再行动一次。`, 'system');
                await GH.sleep(1000);
                await processLudoTurn(); // 重新执行当前玩家的回合
            } else {
                logToLudoGame('点数不是6，无法起飞。', 'system');
                await advanceTurn(); // 切换到下一位玩家
            }
            return; // 结束本次移动处理
        }

        const newPosition = player.piecePosition + diceRoll;
        const finalPositionIndex = LUDO_BOARD_SIZE - 1; // 终点格子的索引

        // 1. 只要新位置大于或等于终点，就直接判定胜利
        if (newPosition >= finalPositionIndex) {
            player.piecePosition = finalPositionIndex; // 无论掷出几点，都让棋子停在终点格子上
            renderLudoGameScreen();
            logToLudoGame(`🎉 <strong>${player.name}</strong> 到达了终点！`, 'system');
            await triggerLudoAiAction(isUserMove ? 'user_win' : 'char_win');
            ludoGameState.isActive = false;
            document.getElementById('ludo-action-area').innerHTML = '';
            await GH.sleep(1000);
            showLudoSummary(player.name); // 显示结算界面
            return; // 游戏结束，直接返回
        }
        // 2. 如果不是胜利，就正常移动
        else {
            player.piecePosition = newPosition;
        }

        renderLudoGameScreen();
        await GH.sleep(500);

        // 检查是否踩到对方棋子
        const opponent = ludoGameState.players.find(p => p.id !== player.id);
        if (player.piecePosition === opponent.piecePosition && opponent.piecePosition !== -1) {
            opponent.piecePosition = -1; // 将对方棋子送回起点
            logToLudoGame(`💥 <strong>${player.name}</strong> 踩中了 <strong>${opponent.name}</strong>！`, 'system');
            renderLudoGameScreen();
            await triggerLudoAiAction(isUserMove ? 'kick_char' : 'kick_user');
            await GH.sleep(1000);
        }

        // 检查是否踩到事件格子
        const cellIndex = ludoGameState.boardLayout.findIndex(c => c && c.index === player.piecePosition);
        if (cellIndex > -1 && ludoGameState.boardLayout[cellIndex].event) {
            const cellData = ludoGameState.boardLayout[cellIndex];
            const eventType = cellData.event;
            if (eventType === 'question') {
                // 将格子上的问题对象，直接传给处理函数
                await handleLudoQuestionEvent(player, cellData.question);
                return;
            }
        }


        // 如果掷出6点，再行动一次
        if (diceRoll === 6) {
            if (!isUserMove) {
                await triggerLudoAiAction('roll_6');
            }
            logToLudoGame(`掷出6点，<strong>${player.name}</strong> 再行动一次。`, 'system');
            await GH.sleep(1000);
            await processLudoTurn();
        } else {
            await advanceTurn(); // 否则切换到下一位玩家
        }
    }


    /**
     * 【飞行棋】推进到下一个回合
     */
    async function advanceTurn() {
        ludoGameState.currentTurnIndex = (ludoGameState.currentTurnIndex + 1) % ludoGameState.players.length;
        await processLudoTurn();
    }


    async function triggerLudoAiAction(eventType, context = {}) {
        const aiPlayer = ludoGameState.players.find(p => !p.isUser);
        const userPlayer = ludoGameState.players.find(p => p.isUser);

        const eventPrompts = {
            roll_6: '你掷出了6点，可以再行动一次！',
            kick_char: '你刚刚把我踢回了起点！',
            kick_user: '我刚刚把你的棋子踢回了起点！',
            char_win: '我赢得了这场游戏！',
            user_win: '你赢得了这场游戏！',
        };

        let eventPrompt = eventPrompts[eventType] || '请根据当前情况自由发挥。';

        // --- 为不同的问答场景提供更详细的指令 ---
        if (eventType === 'answer_question') {
            eventPrompt = `现在请根据你的人设，详细回答这个问题："${context.question}"`;
        } else if (eventType === 'evaluate_answer') {
            eventPrompt = `对于问题"${context.question}"，对方的回答是："${context.answer}"。现在请你以你的角色身份，对这个回答详细地发表一下看法或感受。`;
        }
        else if (eventType === 'reroll_comment') {
            eventPrompt = `你之前说了："${context.originalSpeech}"。请换一种说法，但表达类似的情绪或意思。`;
        }
        const ludoWorldBook = await GH.getGameWorldBookContent('ludo');
        const systemPrompt = `
# 角色扮演指令
${ludoWorldBook ? `# 世界观设定\n${ludoWorldBook}\n` : ''}你正在和你的伴侣(${userPlayer.name})玩一场心动的线上飞行棋游戏。
你的名字是"${aiPlayer.name}"，你的人设是：${aiPlayer.persona}
你的回复必须完全符合你的人设，自然地表达你的情绪。

# 游戏当前状态
- 你的棋子位置: ${aiPlayer.piecePosition}
- 对方的棋子位置: ${userPlayer.piecePosition}
- 当前回合: 轮到 ${ludoGameState.players[ludoGameState.currentTurnIndex].name}

# 刚刚发生的事件
${eventPrompt}

# 你的任务
根据以上所有信息，生成一段符合你人设的回应。你的回应可以包含动作、心理活动和对话，让互动更生动，要非常的贴合你的人设，以人设为主。

# 输出格式
你的回复【必须且只能】是一个严格的JSON对象，格式如下:
{"speech": "你的回应..."}
`;

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

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(
                /^```json\s*|```$/g,
                '',
            );
            const aiResponse = (window.repairAndParseJSON || JSON.parse)(content);
            // 如果是重roll请求，直接返回新的发言内容
            if (eventType === 'reroll_comment') {
                return aiResponse.speech || '嗯...好吧。';
            }
            if (eventType === 'answer_question' || eventType === 'evaluate_answer') {
                return aiResponse.speech || '嗯...让我想想。';
            }

            if (aiResponse.speech) {
                logToLudoGame(`<strong>${aiPlayer.name}:</strong> ${aiResponse.speech}`, 'char');
            }
        } catch (error) {
            console.error('飞行棋AI响应失败:', error);
            if (eventType === 'answer_question' || eventType === 'evaluate_answer') {
                return '我...我不知道该怎么回答了。';
            }
        }
    }

    /**
     * 【飞行棋】生成棋盘格子 (V4 - 问题数量精确匹配版)
     */
    async function generateLudoBoard() {
        const boardEl = document.getElementById('ludo-board');
        boardEl.innerHTML = '';
        const pathCoordinates = [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
            [5, 0],
            [6, 0],
            [7, 0],
            [8, 0],
            [9, 0],
            [9, 1],
            [9, 2],
            [8, 2],
            [7, 2],
            [6, 2],
            [5, 2],
            [4, 2],
            [3, 2],
            [2, 2],
            [1, 2],
            [0, 2],
            [0, 3],
            [0, 4],
            [1, 4],
            [2, 4],
            [3, 4],
            [4, 4],
            [5, 4],
            [6, 4],
            [7, 4],
            [8, 4],
            [9, 4],
            [9, 5],
            [8, 5],
            [7, 5],
            [6, 5],
            [5, 5],
            [4, 5],
            [3, 5],
            [2, 5],
            [1, 5],
            [0, 5],
        ];

        let cells = Array(60).fill(null);
        pathCoordinates.slice(0, LUDO_BOARD_SIZE).forEach((coord, i) => {
            const pos = coord[1] * 10 + coord[0];
            cells[pos] = { type: 'path', index: i };
        });

        cells[21] = { type: 'start', index: -1 };
        cells[38] = { type: 'end', index: LUDO_BOARD_SIZE };

        // 1. 获取当前游戏选择的问题库ID
        const questionBankId = ludoGameState.activeQuestionBankId;
        let questionsInBank = [];

        // 2. 从数据库中加载该问题库的所有问题
        if (questionBankId) {
            questionsInBank = await db.ludoQuestions.where('bankId').equals(questionBankId).toArray();
        }

        // 4. 筛选出所有可以放置问题的普通格子
        const availableCellIndices = [];
        cells.forEach((cellData, index) => {
            if (cellData && cellData.type === 'path' && cellData.index > 0) {
                availableCellIndices.push(index);
            }
        });

        // 5. 打乱可用的格子索引
        availableCellIndices.sort(() => Math.random() - 0.5);

        // 6. 确定要放置的问题数量，仍然是取问题数和可用格子数的最小值
        const questionCount = Math.min(questionsInBank.length, availableCellIndices.length);

        if (questionsInBank.length > availableCellIndices.length) {
            console.warn(
                `飞行棋警告：问题库中的问题数量(${questionsInBank.length})超过了棋盘上的可用格子数量(${availableCellIndices.length})，部分问题将不会出现。`,
            );
        }

        // 7. 将问题库里的问题，按顺序放置到【被打乱顺序】的格子里
        for (let i = 0; i < questionCount; i++) {
            // 这次我们是从被打乱的格子列表里取出一个随机的格子
            const cellIndexToModify = availableCellIndices[i];
            // 然后按顺序从问题库里拿一个问题放上去
            const questionToPlace = questionsInBank[i];

            if (cells[cellIndexToModify]) {
                cells[cellIndexToModify].event = 'question';
                cells[cellIndexToModify].question = questionToPlace;
            }
        }


        ludoGameState.boardLayout = cells;

        // 后续的渲染逻辑保持不变...
        cells.forEach((cellData, i) => {
            if (cellData) {
                const cellEl = document.createElement('div');
                cellEl.className = 'ludo-cell';

                if (cellData.type === 'path') {
                    cellEl.dataset.index = cellData.index;
                    cellEl.innerHTML = `<span class="cell-number">${cellData.index + 1}</span>`;
                }
                if (cellData.type === 'start') {
                    cellEl.classList.add('start');
                    cellEl.innerHTML = '🏠';
                }
                if (cellData.type === 'end') {
                    cellEl.classList.add('end');
                    cellEl.innerHTML = '🏁';
                }
                if (cellData.event === 'question') {
                    cellEl.classList.add(`event-truth`);
                    cellEl.innerHTML += '❓';
                }

                const position = ludoGameState.boardLayout.indexOf(cellData);
                const row = Math.floor(position / 10);
                const col = position % 10;
                cellEl.style.gridRowStart = row + 1;
                cellEl.style.gridColumnStart = col + 1;

                boardEl.appendChild(cellEl);
            }
        });
    }

    /**
     * 【数据迁移】在首次加载时，将旧的硬编码问题迁移到数据库
     */
    async function migrateDefaultLudoQuestions() {
        const defaultBankName = '默认题库';
        const existingBank = await db.ludoQuestionBanks.where('name').equals(defaultBankName).first();
        // 如果"默认题库"已经存在，就说明迁移过了，直接返回
        if (existingBank) return;

        console.log('正在迁移飞行棋默认问题到数据库...');

        // 创建默认题库
        const bankId = await db.ludoQuestionBanks.add({ name: defaultBankName });

        const defaultQuestions = [
            // --- 类型1: 共同回答 (双方都需要回答) ---
            { type: 'both_answer', text: '如果我们一起去旅行，你最想去哪里，为什么？' },
            { type: 'both_answer', text: '你认为一段完美的关系中，最不可或缺的三个要素是什么？' },
            { type: 'both_answer', text: '分享一件最近因为我而让你感到心动或开心的小事。' },
            { type: 'both_answer', text: '回忆一下，我们第一次见面时，你对我的第一印象是什么？' },
            { type: 'both_answer', text: '如果我们可以一起学习一项新技能，你希望是什么？' },
            { type: 'both_answer', text: '描述一个你最希望和我一起度过的完美周末。' },
            { type: 'both_answer', text: '你觉得我们之间最有默契的一件事是什么？' },
            { type: 'both_answer', text: '如果用一种动物来形容我，你觉得是什么？为什么？' },
            { type: 'both_answer', text: '在未来的一年里，你最想和我一起完成的一件事是什么？' },
            { type: 'both_answer', text: '分享一部你最近很喜欢、并且想推荐给我一起看的电影或剧。' },
            { type: 'both_answer', text: '我们下次约会，你希望穿什么风格的衣服？' },

            // --- 类型2: 一人回答，对方评价 ---
            { type: 'single_answer', text: '描述一下我最让你心动的一个瞬间。' },
            { type: 'single_answer', text: '诚实地说，我做的哪件事曾经让你偷偷生过气？' },
            { type: 'single_answer', text: '如果我有一种超能力，你希望是什么？' },
            { type: 'single_answer', text: '给我三个最贴切的标签。' },
            { type: 'single_answer', text: '在你心里，我的形象和你的理想型有多接近？' },
            { type: 'single_answer', text: '分享一个你觉得我可能不知道的，关于你的小秘密。' },
            { type: 'single_answer', text: '如果我们的故事是一首歌，你觉得歌名应该叫什么？' },
            { type: 'single_answer', text: '说一件你觉得我做得比你好/更擅长的事情。' },
            { type: 'single_answer', text: '如果可以回到我们认识的任意一天，你会选择哪一天，想做什么？' },
            { type: 'single_answer', text: '用三个词来形容你眼中的我们的关系。' },
        ];

        const questionsToAdd = defaultQuestions.map(q => ({
            bankId: bankId,
            text: q.text,
            type: q.type,
        }));

        await db.ludoQuestions.bulkAdd(questionsToAdd);
        console.log(`成功迁移了 ${questionsToAdd.length} 条默认问题。`);
    }


    /**
     * 打开问题库管理弹窗
     */
    async function openLudoQuestionBankManager() {
        await renderLudoQuestionBanks();
        document.getElementById('ludo-qbank-manager-modal').classList.add('visible');
    }

    /**
     * 渲染问题库列表
     */
    async function renderLudoQuestionBanks() {
        const listEl = document.getElementById('ludo-qbank-list');
        listEl.innerHTML = '';
        const banks = await db.ludoQuestionBanks.toArray();

        if (banks.length === 0) {
            listEl.innerHTML =
                '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">还没有问题库，点击右上角"新建"创建一个吧！</p>';
        } else {
            banks.forEach(bank => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `<div class="item-title">${bank.name}</div>`;
                item.addEventListener('click', () => openLudoQuestionEditor(bank.id, bank.name));
                addLongPressListener(item, async () => {

                    const choice = await showChoiceModal(`操作"${bank.name}"`, [
                        { text: '✏️ 重命名', value: 'rename' },
                        { text: '📤 导出', value: 'export' },
                        { text: '🗑️ 删除', value: 'delete', isDanger: true },
                    ]);

                    if (choice === 'rename') {
                        const newName = await showCustomPrompt('重命名问题库', '请输入新的名称：', bank.name);
                        if (newName && newName.trim()) {
                            await db.ludoQuestionBanks.update(bank.id, { name: newName.trim() });
                            await renderLudoQuestionBanks();
                        }
                    } else if (choice === 'export') {

                        await exportLudoQuestionBank(bank.id);
                    } else if (choice === 'delete') {
                        const confirmed = await showCustomConfirm(
                            '确认删除',
                            `确定要删除问题库"${bank.name}"吗？这将同时删除库内所有问题。`,
                            { confirmButtonClass: 'btn-danger' },
                        );
                        if (confirmed) {
                            await db.transaction('rw', db.ludoQuestionBanks, db.ludoQuestions, async () => {
                                await db.ludoQuestions.where('bankId').equals(bank.id).delete();
                                await db.ludoQuestionBanks.delete(bank.id);
                            });
                            await renderLudoQuestionBanks();
                        }
                    }
                });
                listEl.appendChild(item);
            });
        }
    }

    /**
     * 添加一个新的问题库
     */
    async function addNewLudoQuestionBank() {
        const name = await showCustomPrompt('新建问题库', '请输入问题库的名称：');
        if (name && name.trim()) {
            await db.ludoQuestionBanks.add({ name: name.trim() });
            await renderLudoQuestionBanks();
        }
    }

    /**
     * 打开指定问题库的问题编辑器
     */
    async function openLudoQuestionEditor(bankId, bankName) {
        activeQuestionBankId = bankId;
        document.getElementById('ludo-question-editor-title').textContent = `编辑 - ${bankName}`;
        await renderLudoQuestionsInBank(bankId);
        document.getElementById('ludo-question-editor-modal').classList.add('visible');
    }

    /**
     * 渲染一个问题库中的所有问题
     */
    async function renderLudoQuestionsInBank(bankId) {
        const listEl = document.getElementById('ludo-question-list');
        listEl.innerHTML = '';
        const questions = await db.ludoQuestions.where('bankId').equals(bankId).toArray();

        if (questions.length === 0) {
            listEl.innerHTML =
                '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">这个题库还是空的，点击右上角"+"添加第一个问题吧！</p>';
        } else {
            questions.forEach(q => {
                const item = document.createElement('div');
                item.className = 'list-item';

                // 核心修改：根据问题类型添加标签
                const typeText = q.type === 'single_answer' ? '一人回答' : '共同回答';
                const typeClass = q.type === 'single_answer' ? 'single-answer' : 'both-answer';

                item.innerHTML = `
                <div class="item-title" style="white-space: normal; display: flex; align-items: center;">
                    <span>${q.text}</span>
                    <span class="question-type-tag ${typeClass}">${typeText}</span>
                </div>
            `;

                item.addEventListener('click', () => openSingleQuestionEditor(q.id));
                addLongPressListener(item, async () => {
                    const confirmed = await showCustomConfirm('删除问题', '确定要删除这个问题吗？', {
                        confirmButtonClass: 'btn-danger',
                    });
                    if (confirmed) {
                        await db.ludoQuestions.delete(q.id);
                        await renderLudoQuestionsInBank(bankId);
                    }
                });
                listEl.appendChild(item);
            });
        }
    }

    /**
     * 打开单个问题编辑器（用于新建或编辑）
     */
    async function openSingleQuestionEditor(questionId = null) {
        editingQuestionId = questionId;
        const modal = document.getElementById('ludo-single-question-editor-modal');
        const titleEl = document.getElementById('ludo-single-question-title');
        const textInput = document.getElementById('ludo-question-text-input');
        const typeRadios = document.querySelectorAll('input[name="ludo_question_type"]');

        if (questionId) {
            // 编辑模式
            const question = await db.ludoQuestions.get(questionId);
            if (!question) return;
            titleEl.textContent = '编辑问题';
            textInput.value = question.text;
            typeRadios.forEach(radio => (radio.checked = radio.value === (question.type || 'both_answer')));
        } else {
            // 新建模式
            titleEl.textContent = '添加新问题';
            textInput.value = '';
            typeRadios[0].checked = true; // 默认选中"共同回答"
        }

        modal.classList.add('visible');
    }

    /**
     * 保存单个问题（新建或更新）
     */
    async function saveSingleQuestion() {
        const text = document.getElementById('ludo-question-text-input').value.trim();
        if (!text) {
            alert('问题内容不能为空！');
            return;
        }
        const type = document.querySelector('input[name="ludo_question_type"]:checked').value;

        if (editingQuestionId) {
            // 更新
            await db.ludoQuestions.update(editingQuestionId, { text, type });
        } else {
            // 新建
            await db.ludoQuestions.add({ bankId: activeQuestionBankId, text, type });
        }

        document.getElementById('ludo-single-question-editor-modal').classList.remove('visible');
        await renderLudoQuestionsInBank(activeQuestionBankId); // 刷新列表
        editingQuestionId = null;
    }

    /**
     * 【飞行棋】处理踩中问题格子的事件 (V3 - 直接使用传入的问题)
     */
    async function handleLudoQuestionEvent(player, questionObj) {
        // 1. 安全检查：如果因为某种原因没有拿到问题，就跳过
        if (!questionObj || !questionObj.text) {
            logToLudoGame('未找到问题，跳过本轮问答。', 'system');
            await GH.sleep(1500);
            await advanceTurn();
            return;
        }

        // 2. 直接使用传入的问题对象，不再随机抽取
        const questionText = questionObj.text;
        const mode = questionObj.type || 'both_answer'; // 直接从问题对象获取模式

        logToLudoGame(
            `【${mode === 'both_answer' ? '共同回答' : '一人回答，一人评价'}】抽到的问题是："${questionText}"`,
            'system',
        );
        await GH.sleep(1500);

        const currentPlayer = player;
        const otherPlayer = ludoGameState.players.find(p => p.id !== currentPlayer.id);

        // --- 流程分支 (这部分逻辑保持不变) ---
        if (mode === 'both_answer') {
            logToLudoGame(`请 <strong>${currentPlayer.name}</strong> 先回答。`, 'system');
            let answer1 = currentPlayer.isUser
                ? await waitForLudoUserAction('轮到你回答问题', '请输入你的回答...')
                : await triggerLudoAiAction('answer_question', { question: questionText });
            logToLudoGame(`<strong>${currentPlayer.name}:</strong> ${answer1}`, currentPlayer.isUser ? 'user' : 'char');
            await GH.sleep(2000);

            logToLudoGame(`现在请 <strong>${otherPlayer.name}</strong> 回答。`, 'system');
            let answer2 = otherPlayer.isUser
                ? await waitForLudoUserAction('轮到你回答问题', '请输入你的回答...')
                : await triggerLudoAiAction('answer_question', { question: questionText });
            logToLudoGame(`<strong>${otherPlayer.name}:</strong> ${answer2}`, otherPlayer.isUser ? 'user' : 'char');
        } else if (mode === 'single_answer') {
            logToLudoGame(`请 <strong>${currentPlayer.name}</strong> 回答这个问题。`, 'system');
            let answer = currentPlayer.isUser
                ? await waitForLudoUserAction('轮到你回答问题', '请输入你的回答...')
                : await triggerLudoAiAction('answer_question', { question: questionText });
            logToLudoGame(`<strong>${currentPlayer.name}:</strong> ${answer}`, currentPlayer.isUser ? 'user' : 'char');
            await GH.sleep(2000);

            logToLudoGame(`现在请 <strong>${otherPlayer.name}</strong> 对Ta的回答发表一下看法吧。`, 'system');
            let evaluation = otherPlayer.isUser
                ? await waitForLudoUserAction(`对"${answer}"的看法`, '请输入你的评价...')
                : await triggerLudoAiAction('evaluate_answer', { question: questionText, answer: answer });
            logToLudoGame(`<strong>${otherPlayer.name}:</strong> ${evaluation}`, otherPlayer.isUser ? 'user' : 'char');
        }

        await GH.sleep(1500);
        logToLudoGame('本轮问答结束，游戏继续！', 'system');
        await advanceTurn();
    }


    /**
     * 【全新】显示飞行棋游戏结算卡片
     * @param {string} winnerName - 胜利者的名字
     */
    function showLudoSummary(winnerName) {
        const modal = document.getElementById('ludo-summary-modal');
        const contentEl = document.getElementById('ludo-summary-content');

        // 1. 提取问答记录
        let qaLogHtml = '<h4>心动问答记录</h4>';
        const questionsAndAnswers = [];
        let currentQuestion = null;

        ludoGameState.gameLog.forEach(log => {
            // 通过识读系统日志里的特定文本来找到"问题"
            if (log.type === 'system' && log.message.includes('抽到的问题是')) {
                const questionText = log.message.match(/"(.+?)"/);
                if (questionText && questionText[1]) {
                    currentQuestion = { question: questionText[1], answers: [] };
                    questionsAndAnswers.push(currentQuestion);
                }
            }
            // 如果我们刚刚找到了一个问题，那么后续的用户或角色发言就是"回答"
            else if (currentQuestion && (log.type === 'user' || log.type === 'char') && !log.message.includes('掷出了')) {
                const answerText = log.message.replace(/<strong>.*?<\/strong>:\s*/, '');
                const speakerNameMatch = log.message.match(/<strong>(.*?)<\/strong>/);
                if (speakerNameMatch && speakerNameMatch[1]) {
                    currentQuestion.answers.push({ speaker: speakerNameMatch[1], text: answerText });
                }
            }
        });

        // 2. 将提取出的问答记录格式化为HTML
        if (questionsAndAnswers.length > 0) {
            questionsAndAnswers.forEach((qa, index) => {
                qaLogHtml += `<div class="qa-item">
                <div class="qa-question">Q${index + 1}: ${qa.question}</div>`;
                qa.answers.forEach(ans => {
                    qaLogHtml += `<div class="qa-answer"><strong>${ans.speaker}:</strong> ${ans.text}</div>`;
                });
                qaLogHtml += `</div>`;
            });
        } else {
            qaLogHtml += '<p>本局没有触发任何问答。</p>';
        }

        // 3. 拼接完整的结算卡片内容
        contentEl.innerHTML = `
        <h3>🎉 恭喜 ${winnerName} 获胜！ 🎉</h3>
        <div class="ludo-qa-log">${qaLogHtml}</div>
    `;

        // 4. 为按钮绑定事件 (使用克隆节点技巧防止重复绑定)
        const shareBtn = document.getElementById('share-ludo-summary-btn');
        const backBtn = document.getElementById('back-to-hall-from-ludo-btn');

        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = () => {
            // 准备纯文本格式的复盘内容用于分享
            const summaryForShare =
                `飞行棋游戏结束啦！🎉\n\n胜利者: ${winnerName}\n\n--- 心动问答 ---\n` +
                questionsAndAnswers
                    .map(
                        (qa, i) => `Q${i + 1}: ${qa.question}\n` + qa.answers.map(ans => `${ans.speaker}: ${ans.text}`).join('\n'),
                    )
                    .join('\n\n');

            shareLudoSummary(summaryForShare, winnerName);
        };

        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.onclick = () => {
            modal.classList.remove('visible');
            showScreen('game-hall-screen');
        };

        // 5. 显示结算弹窗
        modal.classList.add('visible');
    }

    /**
     * 【全新】将飞行棋游戏复盘发送给对手
     * @param {string} summaryText - 要发送的复盘文本
     */
    async function shareLudoSummary(summaryText, winnerName) {
        const opponentId = ludoGameState.opponent?.id;
        if (!opponentId) {
            alert('找不到对手信息，无法分享。');
            return;
        }

        const chat = state.chats[opponentId];
        if (!chat) {
            alert('找不到与对手的聊天窗口，无法分享。');
            return;
        }

        // 创建对用户可见的复盘消息
        const visibleMessage = {
            role: 'user',
            type: 'share_link',
            timestamp: window.getUserMessageTimestamp(chat),
            title: '心动飞行棋 - 游戏复盘',
            description: '点击查看详细复盘记录',
            source_name: '游戏中心',
            content: summaryText,
        };

        // 创建给AI看的隐藏指令，让它可以就游戏结果发表感想
        const aiContext = `[系统指令：刚刚结束了一局飞行棋。重要：本次游戏的胜利者是【${winnerName}】。这是游戏复盘，请根据这个结果，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;
        const hiddenInstruction = {
            role: 'system',
            content: aiContext,
            timestamp: window.getUserMessageTimestamp(chat) + 1,
            isHidden: true,
        };

        chat.history.push(visibleMessage, hiddenInstruction);
        await db.chats.put(chat);

        // 关闭结算卡片
        document.getElementById('ludo-summary-modal').classList.remove('visible');

        await showCustomAlert('分享成功', `游戏复盘已发送至与"${chat.name}"的聊天中！`);

        window.openChat(chat.id);
        window.triggerAiResponse();
    }

    function initLudoEvents() {
        document.getElementById('start-ludo-game-btn').addEventListener('click', startLudoGame);
        document.getElementById('manage-ludo-question-banks-btn').addEventListener('click', openLudoQuestionBankManager);

        document.getElementById('exit-ludo-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出游戏吗？');
            if (confirmed) {
                ludoGameState.isActive = false;
                showScreen('game-hall-screen');
            }
        });
        document.getElementById('restart-ludo-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('重新开始', '确定要重新开始这一局吗？');
            if (confirmed) {
                startLudoGame();
            }
        });

        document.getElementById('close-qbank-manager-btn').addEventListener('click', async () => {
            document.getElementById('ludo-qbank-manager-modal').classList.remove('visible');
            if (document.getElementById('ludo-setup-screen').classList.contains('active')) {
                await openLudoSetup();
            }
        });
        document.getElementById('add-ludo-qbank-btn').addEventListener('click', addNewLudoQuestionBank);

        document.getElementById('back-to-qbank-manager-btn').addEventListener('click', () => {
            document.getElementById('ludo-question-editor-modal').classList.remove('visible');
            openLudoQuestionBankManager();
        });
        document.getElementById('add-ludo-question-btn').addEventListener('click', () => openSingleQuestionEditor(null));

        document.getElementById('cancel-single-question-btn').addEventListener('click', () => {
            document.getElementById('ludo-single-question-editor-modal').classList.remove('visible');
        });
        document.getElementById('save-single-question-btn').addEventListener('click', saveSingleQuestion);

        document.getElementById('import-ludo-qbank-btn').addEventListener('click', () => {
            document.getElementById('ludo-qbank-import-input').click();
        });

        document.getElementById('ludo-qbank-import-input').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                importLudoQuestionBank(file);
            }
            e.target.value = null;
        });

        document.getElementById('ludo-game-log').addEventListener('click', e => {
            const rerollBtn = e.target.closest('.ludo-reroll-btn');
            if (rerollBtn) {
                const logIndex = parseInt(rerollBtn.dataset.logIndex);
                if (!isNaN(logIndex)) {
                    handleLudoReroll(logIndex);
                }
            }
        });
    }

    GH.ludo = {
        openSetup: openLudoSetup,
        initEvents: initLudoEvents,
        getState: () => ludoGameState,
        migrateDefaultQuestions: migrateDefaultLudoQuestions,
    };
})();
