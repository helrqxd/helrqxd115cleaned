// =======================================================================
// ===               国王游戏 (King's Game) 游戏模块                   ===
// =======================================================================

(function () {
    const GH = window.GameHall;
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    const CARD_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const CARD_SUITS = ['♠', '♥', '♦', '♣'];

    let kgState = {
        isActive: false,
        settings: {
            questionerMode: 'random',
            userParticipate: false,
            gameType: 'both',
            questionSource: 'ai',
            truthBank: [],
            dareBank: [],
        },
        allPlayers: [],
        cardAssignments: [],
        kingPlayer: null,
        currentRoundType: null,
        roundNumber: 0,
        gameLog: [],
        lastSummary: '',
    };

    // =====================================================================
    //                         设置页面逻辑
    // =====================================================================

    function openKingsGameSetup() {
        showScreen('kings-game-setup-screen');
        const selectionEl = document.getElementById('kg-player-selection');
        selectionEl.innerHTML = '<p>正在加载角色列表...</p>';

        const singleChats = Object.values(state.chats).filter(chat => !chat.isGroup);
        const allNpcs = Object.values(state.chats).flatMap(chat =>
            (chat.npcLibrary || []).map(npc => ({ ...npc, owner: chat.name })),
        );
        const playerOptions = [
            ...singleChats.map(c => ({ id: c.id, name: c.name, avatar: c.settings.aiAvatar, type: '角色' })),
            ...allNpcs.map(n => ({ id: n.id, name: n.name, avatar: n.avatar, type: `NPC (${n.owner})` })),
        ];

        selectionEl.innerHTML = '';
        if (playerOptions.length < 1) {
            selectionEl.innerHTML =
                '<p style="text-align:center; padding-top: 50px; color: var(--text-secondary);">你需要至少1位AI或NPC好友才能开始游戏。</p>';
            document.getElementById('start-kings-game-btn').disabled = true;
            return;
        }

        document.getElementById('start-kings-game-btn').disabled = false;
        playerOptions.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
                <input type="checkbox" class="kg-player-checkbox" value="${player.id}" data-name="${player.name}">
                <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
                <span class="name">${player.name}</span>
                <span class="type-tag">${player.type}</span>
            `;
            selectionEl.appendChild(item);
        });
    }

    function bindSetupEvents() {
        const questionerRadios = document.querySelectorAll('input[name="kg_questioner_mode"]');
        const userPartOption = document.getElementById('kg-user-participate-option');
        questionerRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                userPartOption.style.display = radio.value === 'user' && radio.checked ? 'block' : '';
                if (radio.value === 'random' && radio.checked) {
                    userPartOption.style.display = 'none';
                }
            });
        });

        const sourceRadios = document.querySelectorAll('input[name="kg_question_source"]');
        const customBankArea = document.getElementById('kg-custom-bank-area');
        sourceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                customBankArea.style.display = radio.value === 'custom' && radio.checked ? 'block' : 'none';
            });
        });
    }

    // =====================================================================
    //                         开始游戏
    // =====================================================================

    async function startKingsGame() {
        const selectedCheckboxes = document.querySelectorAll('.kg-player-checkbox:checked');
        if (selectedCheckboxes.length < 1) {
            alert('请至少选择1位角色参与游戏！');
            return;
        }
        if (selectedCheckboxes.length > 12) {
            alert('最多只能选择12位角色参与游戏！');
            return;
        }

        const questionerMode = document.querySelector('input[name="kg_questioner_mode"]:checked').value;
        const userParticipate = questionerMode === 'user'
            ? document.querySelector('input[name="kg_user_participate"]:checked').value === 'yes'
            : true;
        const gameType = document.querySelector('input[name="kg_game_type"]:checked').value;
        const questionSource = document.querySelector('input[name="kg_question_source"]:checked').value;

        let truthBank = [];
        let dareBank = [];
        if (questionSource === 'custom') {
            const truthText = document.getElementById('kg-truth-bank').value.trim();
            const dareText = document.getElementById('kg-dare-bank').value.trim();
            truthBank = truthText ? truthText.split('\n').map(l => l.trim()).filter(Boolean) : [];
            dareBank = dareText ? dareText.split('\n').map(l => l.trim()).filter(Boolean) : [];
            if (gameType === 'truth' && truthBank.length === 0) {
                alert('请导入真心话题库！');
                return;
            }
            if (gameType === 'dare' && dareBank.length === 0) {
                alert('请导入大冒险题库！');
                return;
            }
            if (gameType === 'both' && truthBank.length === 0 && dareBank.length === 0) {
                alert('请至少导入一个题库！');
                return;
            }
        }

        const invitedPlayers = [];
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
            persona: '游戏的主持者和参与者',
            isUser: true,
        };

        kgState = {
            isActive: true,
            settings: {
                questionerMode,
                userParticipate,
                gameType,
                questionSource,
                truthBank,
                dareBank,
            },
            allPlayers: userParticipate ? [userPlayer, ...invitedPlayers] : invitedPlayers,
            userPlayer,
            cardAssignments: [],
            kingPlayer: null,
            currentRoundType: null,
            roundNumber: 0,
            gameLog: [],
            lastSummary: '',
        };

        showScreen('kings-game-screen');
        await startNewRound();
    }

    // =====================================================================
    //                        抽牌逻辑
    // =====================================================================

    function buildDeck(playerCount, mode) {
        // 从A开始按顺序取牌，出题人可以明确知道本轮包含哪些牌号
        // mode: 'random' — 前 (playerCount-1) 张顺序牌 + K（国王牌）
        //       'user_no_participate' — 前 playerCount 张顺序牌，不含K
        //       'user_participate' — 前 playerCount 张顺序牌（满13人时含K，但K无国王属性）
        const nonKingCards = CARD_LABELS.filter(c => c !== 'K');
        let selectedLabels;

        if (mode === 'random') {
            selectedLabels = ['K', ...nonKingCards.slice(0, playerCount - 1)];
        } else if (mode === 'user_no_participate') {
            selectedLabels = nonKingCards.slice(0, playerCount);
        } else {
            selectedLabels = CARD_LABELS.slice(0, playerCount);
        }

        selectedLabels.sort(() => Math.random() - 0.5);
        return selectedLabels.map(label => ({
            label,
            suit: CARD_SUITS[Math.floor(Math.random() * 4)],
            isKing: mode === 'random' && label === 'K',
        }));
    }

    function dealCards() {
        const { questionerMode, userParticipate } = kgState.settings;
        const players = kgState.allPlayers;
        const playerCount = players.length;

        let mode;
        if (questionerMode === 'random') {
            mode = 'random';
        } else if (userParticipate) {
            mode = 'user_participate';
        } else {
            mode = 'user_no_participate';
        }

        const deck = buildDeck(playerCount, mode);

        kgState.cardAssignments = players.map((player, i) => ({
            player,
            card: deck[i],
        }));

        kgState.kingPlayer = null;
        if (questionerMode === 'user') {
            kgState.kingPlayer = kgState.userPlayer;
        } else {
            const kingAssignment = kgState.cardAssignments.find(a => a.card.isKing);
            if (kingAssignment) {
                kgState.kingPlayer = kingAssignment.player;
            }
        }
    }

    function getCardDisplay(card) {
        const isRed = card.suit === '♥' || card.suit === '♦';
        return `<span class="kg-card ${isRed ? 'kg-card-red' : 'kg-card-black'}">${card.suit}${card.label}</span>`;
    }

    // =====================================================================
    //                        游戏轮次
    // =====================================================================

    async function startNewRound() {
        kgState.roundNumber++;
        kgState.gameLog = [];

        logToGame(`--- 第 ${kgState.roundNumber} 轮开始 ---`, 'system');

        dealCards();
        renderGameScreen();

        await animateCardDeal();

        if (kgState.settings.questionerMode === 'user' && !kgState.settings.userParticipate) {
            logToGame(`👑 你是本轮的国王！你将为其他人出题。`, 'system');
        } else if (kgState.settings.questionerMode === 'user' && kgState.settings.userParticipate) {
            logToGame(`👑 你是出题人！请在看牌前指定行动。`, 'system');
            logToGame(`提示：你也参与了抽牌，可能会指定到自己哦~`, 'system');
        } else {
            const kingAssign = kgState.cardAssignments.find(a => a.card.isKing);
            if (kingAssign) {
                logToGame(`👑 ${kingAssign.player.name} 抽到了K，成为本轮国王！`, 'system');
            }
        }

        renderGameScreen();
        await runQuestionPhase();
    }

    async function animateCardDeal() {
        const { questionerMode, userParticipate } = kgState.settings;

        logToGame('🃏 正在发牌...', 'system');
        await GH.sleep(1000);

        const userAssignment = kgState.cardAssignments.find(a => a.player.isUser);
        if (questionerMode === 'user' && userParticipate) {
            logToGame(`每人拿到了一张牌（稍后揭晓）`, 'system');
        } else if (userAssignment) {
            logToGame(`你拿到了 ${getCardDisplay(userAssignment.card)}，其他人也各自拿到了牌。`, 'system');
        } else {
            logToGame(`所有参与者各自拿到了一张牌。`, 'system');
        }

        await GH.sleep(800);
        renderGameScreen();
    }

    // =====================================================================
    //                        出题阶段
    // =====================================================================

    async function runQuestionPhase() {
        const { questionerMode, userParticipate, gameType, questionSource } = kgState.settings;

        let roundType = gameType;
        if (gameType === 'both') {
            if (questionerMode === 'user') {
                roundType = await waitForUserChoice('本轮类型', ['真心话', '大冒险']);
                roundType = roundType === '真心话' ? 'truth' : 'dare';
            } else {
                if (questionSource === 'custom') {
                    const hasTruth = kgState.settings.truthBank.length > 0;
                    const hasDare = kgState.settings.dareBank.length > 0;
                    if (hasTruth && hasDare) roundType = Math.random() < 0.5 ? 'truth' : 'dare';
                    else if (hasTruth) roundType = 'truth';
                    else roundType = 'dare';
                } else {
                    roundType = Math.random() < 0.5 ? 'truth' : 'dare';
                }
                logToGame(`🎯 本轮是 ${roundType === 'truth' ? '【真心话】' : '【大冒险】'}！`, 'system');
            }
        } else {
            logToGame(`🎯 本轮是 ${roundType === 'truth' ? '【真心话】' : '【大冒险】'}！`, 'system');
        }
        kgState.currentRoundType = roundType;

        const isKingUser = kgState.kingPlayer && kgState.kingPlayer.isUser;
        const selectableCards = kgState.cardAssignments
            .filter(a => {
                if (questionerMode === 'random') return !a.card.isKing;
                return true;
            })
            .map(a => a.card.label)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .sort((a, b) => CARD_LABELS.indexOf(a) - CARD_LABELS.indexOf(b));

        let question = '';
        let targetCardNumbers = [];

        if (isKingUser || questionerMode === 'user') {
            const result = await waitForUserQuestion(roundType, selectableCards);
            question = result.question;
            targetCardNumbers = result.targets;
        } else {
            const aiResult = await generateAIQuestion(roundType, selectableCards);
            question = aiResult.question;
            targetCardNumbers = aiResult.targets;
        }

        let targetPlayers = findPlayersByCardLabels(targetCardNumbers);

        if (roundType === 'truth') {
            logToGame(`📋 题目：持有 ${targetCardNumbers.map(n => `【${n}号牌】`).join('、')} 的人 —— ${question}`, 'highlight');
        } else {
            logToGame(`📋 指令：持有 ${targetCardNumbers.map(n => `【${n}号牌】`).join('、')} 的人 —— ${question}`, 'highlight');
        }

        if (targetPlayers.length === 2 && targetPlayers.some(p => p.isUser)) {
            const shuffled = [...targetPlayers].sort(() => Math.random() - 0.5);
            targetPlayers = shuffled;
        }

        await GH.sleep(1500);

        logToGame('🔓 揭晓纸牌！', 'system');
        await GH.sleep(800);

        for (const assignment of kgState.cardAssignments) {
            logToGame(`${assignment.player.name} 的纸牌是 ${getCardDisplay(assignment.card)}`, 'system');
            await GH.sleep(300);
        }

        await GH.sleep(1000);

        if (targetPlayers.length > 0) {
            const targetNames = targetPlayers.map(p => p.name).join('、');
            logToGame(`🎯 被选中的是：${targetNames}！`, 'highlight');
        } else {
            logToGame('⚠️ 没有人持有指定的牌号，本轮无人被选中。', 'system');
            await showRoundEnd();
            return;
        }

        await GH.sleep(1500);
        await executeAction(targetPlayers, question, roundType);
    }

    function findPlayersByCardLabels(labels) {
        const results = [];
        for (const label of labels) {
            const assignment = kgState.cardAssignments.find(a => a.card.label === label);
            if (assignment) {
                results.push(assignment.player);
            }
        }
        return results;
    }

    // =====================================================================
    //                      用户交互
    // =====================================================================

    function waitForUserChoice(promptText, options) {
        return new Promise(resolve => {
            const actionArea = document.getElementById('kg-action-area');
            actionArea.innerHTML = `<h5 style="margin:0">${promptText}</h5>`;
            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; justify-content:center;';
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'form-button-secondary';
                btn.textContent = opt;
                btn.onclick = () => {
                    actionArea.innerHTML = '';
                    resolve(opt);
                };
                btnRow.appendChild(btn);
            });
            actionArea.appendChild(btnRow);
        });
    }

    function waitForUserQuestion(roundType, availableCards) {
        return new Promise(resolve => {
            const actionArea = document.getElementById('kg-action-area');
            actionArea.innerHTML = '';

            const maxTargets = roundType === 'truth' ? 1 : 2;
            const typeLabel = roundType === 'truth' ? '真心话' : '大冒险';
            const { questionSource, truthBank, dareBank } = kgState.settings;

            let html = `<div style="width:100%;">`;
            html += `<h5 style="margin:0 0 8px 0">👑 请出题（${typeLabel}）</h5>`;
            html += `<div style="margin-bottom:8px; font-size:13px; color:var(--text-secondary)">
                选择 ${maxTargets === 1 ? '1' : '1-2'} 张牌号，持有该牌的人将执行任务</div>`;

            html += `<div id="kg-card-select" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">`;
            availableCards.forEach(label => {
                html += `<button class="kg-card-pick-btn form-button-secondary" data-card="${label}" style="min-width:36px">${label}</button>`;
            });
            html += `</div>`;

            if (questionSource === 'custom') {
                const bank = roundType === 'truth' ? truthBank : dareBank;
                if (bank.length > 0) {
                    const randomQ = bank[Math.floor(Math.random() * bank.length)];
                    html += `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px">题库随机推荐：${randomQ}</div>`;
                }
            }

            html += `<textarea id="kg-user-question-input" rows="2" placeholder="输入你的${typeLabel}问题或指令..."
                style="width:100%; box-sizing:border-box; padding:8px; border-radius:8px; border:1px solid var(--border-color); font-size:14px; resize:none"></textarea>`;
            html += `<button id="kg-confirm-question-btn" class="form-button" style="margin-top:8px; width:100%">确认出题</button>`;
            html += `</div>`;

            actionArea.innerHTML = html;

            const selectedCards = new Set();
            actionArea.querySelectorAll('.kg-card-pick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const card = btn.dataset.card;
                    if (selectedCards.has(card)) {
                        selectedCards.delete(card);
                        btn.classList.remove('kg-card-selected');
                    } else {
                        if (selectedCards.size >= maxTargets) {
                            const first = selectedCards.values().next().value;
                            selectedCards.delete(first);
                            actionArea.querySelector(`.kg-card-pick-btn[data-card="${first}"]`)
                                ?.classList.remove('kg-card-selected');
                        }
                        selectedCards.add(card);
                        btn.classList.add('kg-card-selected');
                    }
                });
            });

            document.getElementById('kg-confirm-question-btn').addEventListener('click', () => {
                const question = document.getElementById('kg-user-question-input').value.trim();
                if (selectedCards.size === 0) {
                    alert('请至少选择一张牌号！');
                    return;
                }
                if (!question) {
                    alert('请输入题目或指令！');
                    return;
                }
                actionArea.innerHTML = '';
                resolve({ question, targets: Array.from(selectedCards) });
            });
        });
    }

    // =====================================================================
    //                      AI 出题
    // =====================================================================

    async function generateAIQuestion(roundType, availableCards) {
        const { questionSource, truthBank, dareBank } = kgState.settings;

        if (questionSource === 'custom') {
            const bank = roundType === 'truth' ? truthBank : dareBank;
            if (bank.length > 0) {
                const question = bank[Math.floor(Math.random() * bank.length)];
                const maxTargets = roundType === 'truth' ? 1 : Math.min(2, availableCards.length);
                const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
                const count = roundType === 'truth' ? 1 : (Math.random() < 0.5 ? 1 : Math.min(2, shuffled.length));
                return { question, targets: shuffled.slice(0, count) };
            }
        }

        logToGame('国王正在思考题目...', 'system');
        renderGameScreen();

        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) {
            const fallbackQuestions = roundType === 'truth'
                ? ['你最尴尬的经历是什么？', '你做过最疯狂的事是什么？', '你最大的秘密是什么？']
                : ['学一段动物叫声', '做一个搞怪表情并保持10秒', '向在座一位角色表白'];
            const question = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
            const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
            const count = roundType === 'truth' ? 1 : (Math.random() < 0.5 ? 1 : Math.min(2, shuffled.length));
            return { question, targets: shuffled.slice(0, count) };
        }

        const playerProfiles = kgState.allPlayers.map(p =>
            `- ${p.name}${p.isUser ? '（用户）' : ''}: ${p.persona || '无特别人设'}`
        ).join('\n');

        const kingInfo = kgState.kingPlayer && !kgState.kingPlayer.isUser
            ? `\n你正在扮演国王"${kgState.kingPlayer.name}"，人设：${kgState.kingPlayer.persona || '无'}。请以该角色的性格风格出题。`
            : '';

        const prompt = `
# 任务
你是一个国王游戏的出题AI。现在需要你作为国王出一个${roundType === 'truth' ? '真心话问题' : '大冒险指令'}。${kingInfo}

# 参与角色（含用户和所有AI角色的人设）
${playerProfiles}

# 可选的纸牌号码
${availableCards.join(', ')}

# 规则
1. ${roundType === 'truth'
    ? '选择1张纸牌号码，向持有该纸牌的人提出一个真心话问题。问题要有趣、有深度，能引发有趣的回答。'
    : '选择1-2张纸牌号码，向持有该纸牌的人发出一项大冒险指令。指令要有趣但不过分，如果选两人则必须涉及角色间的互动。'}
2. 你选择的是纸牌号码，不是角色姓名！你不知道谁持有哪张牌。
3. 出题时要考虑所有参与角色的人设，让问题或指令更有趣。
4. 你的回复【必须且只能】是一个JSON对象:
   {"targets": ["牌号1"], "question": "你的问题或指令..."}
5. targets数组中只能包含可选纸牌号码中存在的值。`;

        try {
            const messagesForApi = [{ role: 'user', content: prompt }];
            const isGemini = proxyUrl === GEMINI_API_URL;
            const geminiConfig = toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini, state.apiConfig.temperature);

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
            const content = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content)
                .replace(/^```json\s*|```$/g, '').trim();
            const aiResult = (window.repairAndParseJSON || JSON.parse)(content);

            const validTargets = (aiResult.targets || []).filter(t => availableCards.includes(t));
            if (validTargets.length === 0) {
                const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
                validTargets.push(shuffled[0]);
            }

            return {
                question: aiResult.question || '请说出你的心里话。',
                targets: validTargets.slice(0, roundType === 'truth' ? 1 : 2),
            };
        } catch (error) {
            console.error('AI出题失败:', error);
            const fallbackQ = roundType === 'truth' ? '说出你最难忘的一件事。' : '即兴表演一段才艺。';
            const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
            return { question: fallbackQ, targets: [shuffled[0]] };
        }
    }

    // =====================================================================
    //                      执行行动 & AI生成结果
    // =====================================================================

    function waitForUserActionInput(roundType, question) {
        const typeLabel = roundType === 'truth' ? '真心话' : '大冒险';
        const placeholder = roundType === 'truth'
            ? '请输入你对这个问题的回答...'
            : '请描述你完成这个挑战的过程...';

        return new Promise(resolve => {
            const actionArea = document.getElementById('kg-action-area');
            actionArea.innerHTML = '';

            let html = `<div style="width:100%;">`;
            html += `<h5 style="margin:0 0 6px 0">🎯 轮到你了！（${typeLabel}）</h5>`;
            html += `<div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px">${question}</div>`;
            html += `<textarea id="kg-user-action-input" rows="3" placeholder="${placeholder}"
                style="width:100%; box-sizing:border-box; padding:10px; border-radius:10px; border:1px solid var(--border-color); font-size:14px; resize:vertical; max-height:120px; overflow-y:auto; background:var(--secondary-bg); color:var(--text-primary)"></textarea>`;
            html += `<button id="kg-confirm-action-btn" class="form-button" style="margin-top:8px; width:100%">确认</button>`;
            html += `</div>`;

            actionArea.innerHTML = html;

            const textarea = document.getElementById('kg-user-action-input');
            textarea.focus();

            document.getElementById('kg-confirm-action-btn').addEventListener('click', () => {
                const text = textarea.value.trim();
                if (!text) {
                    alert('请输入你的回答或行动描述！');
                    return;
                }
                actionArea.innerHTML = '';
                resolve(text);
            });
        });
    }

    async function callAI(prompt) {
        const { proxyUrl, apiKey, model } = window.getApiConfigForFunction('game');
        if (!proxyUrl || !apiKey || !model) return null;

        const messagesForApi = [{ role: 'user', content: prompt }];
        const isGemini = proxyUrl === GEMINI_API_URL;
        const geminiConfig = toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini, state.apiConfig.temperature);

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model,
                    messages: messagesForApi,
                    ...window.buildModelParams(state.apiConfig),
                }),
            });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).trim();
    }

    function buildSceneHeader(question, roundType) {
        const kingName = kgState.kingPlayer ? kgState.kingPlayer.name : 'AI';
        const typeLabel = roundType === 'truth' ? '真心话' : '大冒险';
        const allPlayerProfiles = kgState.allPlayers.map(p =>
            `- ${p.name}${p.isUser ? '（你/用户）' : ''}: ${p.persona || '无特别描述'}`
        ).join('\n');
        const userName = kgState.userPlayer ? kgState.userPlayer.name : '用户';

        return { kingName, typeLabel, allPlayerProfiles, userName, header: `
# 场景
这是一场国王游戏。国王（出题者）是：${kingName}。本轮类型：${typeLabel}。

# 所有参与者人设
${allPlayerProfiles}

# 本轮题目/指令
${question}` };
    }

    async function executeAction(targetPlayers, question, roundType) {
        const userIdx = targetPlayers.findIndex(p => p.isUser);
        const userInTargets = userIdx !== -1;
        const aiTargets = targetPlayers.filter(p => !p.isUser);
        const scene = buildSceneHeader(question, roundType);

        // ── 情况A：两人行动，其中包含用户 ──
        if (targetPlayers.length === 2 && userInTargets) {
            const aiPartner = aiTargets[0];
            const userGoesFirst = userIdx === 0;

            if (userGoesFirst) {
                // 用户先行动
                const userText = await waitForUserActionInput(roundType, question);
                logToGame(`💬 你的${roundType === 'truth' ? '回答' : '行动'}：${userText}`, 'user-action');
                renderGameScreen();
                await GH.sleep(800);

                logToGame(`⏳ 等待 ${aiPartner.name} 行动并生成大家的反应...`, 'system');
                renderGameScreen();

                const prompt = `${scene.header}

# 行动顺序
本轮有两位被选中：用户"${scene.userName}"先行动，${aiPartner.name}后行动。

# 用户已完成的行动
用户"${scene.userName}"${roundType === 'truth' ? '的回答' : '的行动描述'}如下：
"${userText}"

# 后行动的角色
${aiPartner.name}: ${aiPartner.persona || '无特别描述'}

# 任务
请以生动、幽默的叙事风格，完成以下内容：
1. 描述${aiPartner.name}${roundType === 'truth' ? '回答问题' : '执行指令'}的完整过程，要符合其人设和性格。
2. 描述在场其他角色对${aiPartner.name}和对用户表现的反应（笑声、吐槽、起哄、调侃等）。

要求：
1. 【绝对禁止】描写用户"${scene.userName}"本人的任何动作、语言、表情、心理。
2. 其他角色可以评论用户的表现，但不能替用户说话或描写用户的行为。
3. 全文500字左右，直接输出描述文字。`;

                await generateAndLogResult(prompt, aiPartner.name);

            } else {
                // 用户后行动，AI角色先
                logToGame(`⏳ 等待 ${aiPartner.name} 先行动...`, 'system');
                renderGameScreen();

                const promptFirst = `${scene.header}

# 行动顺序
本轮有两位被选中：${aiPartner.name}先行动，用户"${scene.userName}"后行动。现在轮到${aiPartner.name}先行动。

# 先行动的角色
${aiPartner.name}: ${aiPartner.persona || '无特别描述'}

# 任务
请以生动、幽默的叙事风格，描述${aiPartner.name}${roundType === 'truth' ? '回答这个问题' : '执行这个指令'}的完整过程。

要求：
1. 描述要符合${aiPartner.name}的人设和性格。
2. ${roundType === 'truth'
    ? '写出回答时的神态、语气和具体回答内容。'
    : '写出执行时的动作、表情、心理活动。'}
3. 此时只描写${aiPartner.name}一人的行动，不要描写观众反应（稍后统一描写）。
4. 【绝对禁止】描写用户"${scene.userName}"的任何内容。
5. 全文200字左右，直接输出描述文字。`;

                await generateAndLogResult(promptFirst, aiPartner.name);
                await GH.sleep(800);

                // 轮到用户行动
                const userText = await waitForUserActionInput(roundType, question);
                logToGame(`💬 你的${roundType === 'truth' ? '回答' : '行动'}：${userText}`, 'user-action');
                renderGameScreen();
                await GH.sleep(800);

                logToGame('⏳ 正在生成大家的反应...', 'system');
                renderGameScreen();

                const promptReactions = `${scene.header}

# 已完成的行动
1. ${aiPartner.name}（先行动）已完成了${roundType === 'truth' ? '回答' : '挑战'}。
2. 用户"${scene.userName}"（后行动）${roundType === 'truth' ? '的回答' : '的行动描述'}如下：
"${userText}"

# 任务
请以生动、幽默的叙事风格，描述在场其他角色对两人表现的反应。

要求：
1. 【绝对禁止】描写用户"${scene.userName}"本人的任何动作、语言、表情、心理。
2. 描写其他角色对${aiPartner.name}和用户各自表现的评价和反应，如惊讶、大笑、吐槽、起哄等。
3. 反应要符合各角色的人设。
4. 全文300字左右，直接输出描述文字。`;

                await generateAndLogResult(promptReactions);
            }

        // ── 情况B：仅用户被选中（1人） ──
        } else if (userInTargets && aiTargets.length === 0) {
            const userText = await waitForUserActionInput(roundType, question);
            logToGame(`💬 你的${roundType === 'truth' ? '回答' : '行动'}：${userText}`, 'user-action');
            renderGameScreen();
            await GH.sleep(800);

            logToGame('⏳ 正在生成其他人的反应...', 'system');
            renderGameScreen();

            const prompt = `${scene.header}

# 用户的行动
用户"${scene.userName}"被选中了。用户自己${roundType === 'truth' ? '回答' : '描述了行动'}如下：
"${userText}"

# 任务
请以生动、幽默的叙事风格，描述在场其他角色看到用户的${roundType === 'truth' ? '回答' : '表现'}后的反应。

要求：
1. 【绝对禁止】描写用户本人的任何动作、语言、表情、心理。
2. 只写其他在场角色的反应，如：惊讶、大笑、吐槽、起哄、感动、调侃等，要符合各自人设。
3. 全文500字左右，直接输出描述文字。`;

            await generateAndLogResult(prompt);

        // ── 情况C：仅AI角色（1人或2人，不含用户） ──
        } else {
            const targetNames = aiTargets.map(p => p.name).join('、');
            const targetProfiles = aiTargets.map(p =>
                `${p.name}: ${p.persona || '无特别描述'}`
            ).join('\n');

            logToGame('⏳ 正在生成行动结果...', 'system');
            renderGameScreen();

            const prompt = `${scene.header}

# 被指定的角色
${targetProfiles}

# 任务
请以生动、幽默的叙事风格，描述被指定的角色（${targetNames}）${roundType === 'truth' ? '回答这个真心话问题' : '执行这个大冒险指令'}的过程。

要求：
1. 描述内容要符合每个角色的人设和性格。
2. ${roundType === 'truth'
    ? '写出角色回答问题时的神态、表情、语气，以及具体的回答内容。'
    : '写出角色执行指令时的动作、表情、心理活动。'}
3. 描述其他在场角色的反应（笑声、吐槽、起哄等），让场景更有趣。
4. 【绝对禁止】描写用户"${scene.userName}"的任何动作、语言、表情或心理活动。用户只作为旁观者存在。
5. 全文500字左右，直接输出描述文字。`;

            await generateAndLogResult(prompt, targetNames);
        }

        renderGameScreen();
        await showRoundEnd();
    }

    async function generateAndLogResult(prompt, fallbackName) {
        try {
            const result = await callAI(prompt);
            if (result) {
                logToGame(result, 'result');
            } else {
                const name = fallbackName || '角色们';
                logToGame(`${name}完成了行动。周围的人纷纷发出了反应。（API未配置）`, 'result');
            }
        } catch (error) {
            console.error('生成行动结果失败:', error);
            logToGame('其他角色纷纷做出了反应...（AI生成失败，请检查API设置）', 'result');
        }
        renderGameScreen();
    }

    // =====================================================================
    //                      轮次结算
    // =====================================================================

    async function showRoundEnd() {
        const summary = generateRoundSummary();
        kgState.lastSummary = summary;

        const actionArea = document.getElementById('kg-action-area');
        actionArea.innerHTML = '';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; justify-content:center;';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'form-button';
        nextBtn.textContent = '🔄 下一轮';
        nextBtn.onclick = async () => {
            actionArea.innerHTML = '';
            await startNewRound();
        };

        const shareBtn = document.createElement('button');
        shareBtn.className = 'form-button-secondary';
        shareBtn.textContent = '📤 分享本轮';
        shareBtn.onclick = () => showSummaryModal(summary);

        const exitBtn = document.createElement('button');
        exitBtn.className = 'form-button-secondary';
        exitBtn.textContent = '🚪 退出游戏';
        exitBtn.onclick = async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要退出国王游戏吗？');
            if (confirmed) {
                kgState.isActive = false;
                showScreen('game-hall-screen');
            }
        };

        btnRow.appendChild(nextBtn);
        btnRow.appendChild(shareBtn);
        btnRow.appendChild(exitBtn);
        actionArea.appendChild(btnRow);
    }

    function generateRoundSummary() {
        let summary = `**👑 国王游戏 - 第${kgState.roundNumber}轮**\n\n`;
        summary += `**国王:** ${kgState.kingPlayer ? kgState.kingPlayer.name : 'AI'}\n`;
        summary += `**类型:** ${kgState.currentRoundType === 'truth' ? '真心话' : '大冒险'}\n\n`;

        summary += `**牌面揭晓:**\n`;
        kgState.cardAssignments.forEach(a => {
            summary += `- ${a.player.name}: ${a.card.suit}${a.card.label}${a.card.isKing ? ' 👑' : ''}\n`;
        });

        summary += `\n---\n\n**过程回顾:**\n`;
        kgState.gameLog
            .filter(log => log.type === 'highlight' || log.type === 'result' || log.type === 'user-action')
            .forEach(log => {
                summary += log.message.replace(/<[^>]*>/g, '') + '\n\n';
            });

        return summary;
    }

    // =====================================================================
    //                    结算弹窗 & 分享
    // =====================================================================

    function showSummaryModal(summaryText) {
        const modal = document.getElementById('kg-summary-modal');
        const contentEl = document.getElementById('kg-summary-content');
        contentEl.innerHTML = GH.renderMarkdown(summaryText);

        const shareBtn = document.getElementById('kg-share-summary-btn');
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = () => openTargetPicker(summaryText);

        const nextBtn = document.getElementById('kg-next-round-btn');
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.onclick = async () => {
            modal.classList.remove('visible');
            await startNewRound();
        };

        const backBtn = document.getElementById('kg-back-to-hall-btn');
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.onclick = () => {
            modal.classList.remove('visible');
            kgState.isActive = false;
            showScreen('game-hall-screen');
        };

        modal.classList.add('visible');
    }

    function openTargetPicker(summaryText) {
        const modal = document.getElementById('kg-target-picker-modal');
        const listEl = document.getElementById('kg-target-list');
        listEl.innerHTML = '';

        const aiPlayers = kgState.allPlayers.filter(p => !p.isUser);
        if (aiPlayers.length === 0) {
            alert('没有可分享的AI玩家。');
            return;
        }

        aiPlayers.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-selection-item';
            item.innerHTML = `
                <input type="checkbox" class="kg-target-checkbox" value="${player.id}" checked>
                <img src="${player.avatar || defaultAvatar}" alt="${player.name}">
                <span class="name">${player.name}</span>
            `;
            listEl.appendChild(item);
        });

        const confirmBtn = document.getElementById('kg-confirm-share-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = () => {
            const selectedIds = Array.from(document.querySelectorAll('.kg-target-checkbox:checked')).map(cb => cb.value);
            if (selectedIds.length > 0) {
                sendSummaryToPlayers(summaryText, selectedIds);
            } else {
                alert('请至少选择一个分享对象！');
            }
        };

        document.getElementById('kg-cancel-share-btn').onclick = () => modal.classList.remove('visible');
        document.getElementById('kg-select-all-btn').onclick = () => {
            document.querySelectorAll('.kg-target-checkbox').forEach(cb => (cb.checked = true));
        };
        document.getElementById('kg-deselect-all-btn').onclick = () => {
            document.querySelectorAll('.kg-target-checkbox').forEach(cb => (cb.checked = false));
        };

        modal.classList.add('visible');
    }

    function findChatForPlayer(playerId) {
        const directChat = state.chats[playerId];
        if (directChat) return directChat;
        for (const c of Object.values(state.chats)) {
            if ((c.npcLibrary || []).some(npc => npc.id === playerId)) return c;
        }
        return null;
    }

    async function sendSummaryToPlayers(summaryText, targetIds) {
        document.getElementById('kg-summary-modal').classList.remove('visible');
        document.getElementById('kg-target-picker-modal').classList.remove('visible');
        let sentCount = 0;
        const sentChatIds = new Set();

        const aiContext = `[系统指令：刚刚结束了一轮"国王游戏"，这是本轮的回顾。请根据这个内容，以你的角色人设，和用户聊聊刚才的游戏。]\n\n${summaryText}`;

        for (const playerId of targetIds) {
            const chat = findChatForPlayer(playerId);
            if (chat && !sentChatIds.has(chat.id)) {
                sentChatIds.add(chat.id);
                const visibleMessage = {
                    role: 'user',
                    type: 'share_link',
                    timestamp: window.getUserMessageTimestamp(chat),
                    title: `国王游戏 - 第${kgState.roundNumber}轮`,
                    description: '点击查看本轮回顾',
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

        await showCustomAlert('分享成功', `游戏回顾已分享至 ${sentCount} 位AI玩家的单聊中！`);
    }

    // =====================================================================
    //                       渲染
    // =====================================================================

    function renderGameScreen() {
        const playersGrid = document.getElementById('kg-players-grid');
        const logWrapper = document.getElementById('kg-log-container');
        const logContainer = document.getElementById('kg-game-log');

        playersGrid.innerHTML = '';
        kgState.allPlayers.forEach(player => {
            const isKing = kgState.kingPlayer && kgState.kingPlayer.id === player.id;
            const seat = document.createElement('div');
            seat.className = 'player-seat';
            seat.innerHTML = `
                <img src="${player.avatar || defaultAvatar}" class="player-avatar ${isKing ? 'speaking' : ''}">
                <span class="player-name">${player.name}${isKing ? ' 👑' : ''}</span>
            `;
            playersGrid.appendChild(seat);
        });

        if (!kgState.settings.userParticipate && kgState.settings.questionerMode === 'user') {
            const userSeat = document.createElement('div');
            userSeat.className = 'player-seat';
            userSeat.innerHTML = `
                <img src="${kgState.userPlayer.avatar || defaultAvatar}" class="player-avatar speaking">
                <span class="player-name">${kgState.userPlayer.name} 👑</span>
            `;
            playersGrid.insertBefore(userSeat, playersGrid.firstChild);
        }

        logContainer.innerHTML = '';
        kgState.gameLog.forEach(log => {
            const logEl = document.createElement('div');
            logEl.className = `kg-log-entry kg-log-${log.type}`;
            if (log.type === 'result') {
                logEl.innerHTML = GH.renderMarkdown(log.message);
            } else {
                logEl.innerHTML = log.message;
            }
            logContainer.appendChild(logEl);
        });
        logWrapper.scrollTop = logWrapper.scrollHeight;
    }

    function logToGame(message, type = 'system') {
        kgState.gameLog.push({ message, type });
        renderGameScreen();
    }

    // =====================================================================
    //                       事件绑定
    // =====================================================================

    function initKingsGameEvents() {
        document.getElementById('start-kings-game-btn').addEventListener('click', startKingsGame);

        document.getElementById('exit-kings-game-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('退出游戏', '确定要中途退出国王游戏吗？当前进度不会保存。');
            if (confirmed) {
                kgState.isActive = false;
                showScreen('game-hall-screen');
            }
        });

        bindSetupEvents();
    }

    GH.kingsGame = {
        openSetup: openKingsGameSetup,
        initEvents: initKingsGameEvents,
        getState: () => kgState,
    };
})();
