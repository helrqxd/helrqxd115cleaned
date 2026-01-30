// apps/QQ/background.js

// Background Simulation State
let simulationIntervalId = null;

/**
 * 启动后台模拟
 */
window.startBackgroundSimulation = function startBackgroundSimulation() {
    if (simulationIntervalId) return;
    const intervalSeconds = state.globalSettings.backgroundActivityInterval || 60;
    // 将旧的固定间隔 45000 替换为动态获取
    simulationIntervalId = setInterval(runBackgroundSimulationTick, intervalSeconds * 1000);
    console.log(`[Background] Simulation started with interval ${intervalSeconds}s`);
};

/**
 * 停止后台模拟
 */
window.stopBackgroundSimulation = function stopBackgroundSimulation() {
    if (simulationIntervalId) {
        clearInterval(simulationIntervalId);
        simulationIntervalId = null;
        console.log('[Background] Simulation stopped');
    }
};

/**
 * 这是模拟器的“心跳”，每次定时器触发时运行
 */
window.runBackgroundSimulationTick = runBackgroundSimulationTick; // 暴露给全局以便手动调用
function runBackgroundSimulationTick(isManual = false) {
    console.log('模拟器心跳 Tick...');
    if (!state.globalSettings.enableBackgroundActivity && !isManual) {
        stopBackgroundSimulation();
        return;
    }
    // 如果是手动触发，哪怕开关没开也允许跑一次，但最好能在UI上给个反馈（这里先只允许跑）
    // 不过为了安全，如果没开后台活动，手动触发时最好也检查一下，或者直接放行以便测试

    // 修改：不再过滤掉群聊，让群聊也可以触发后台活动
    const allChats = Object.values(state.chats);

    if (allChats.length === 0) return;

    const frequencyProbabilities = {
        low: 0.3, // 低频: 每次检测有 30% 的概率行动
        medium: 0.5, // 中频: 每次检测有 50% 的概率行动
        high: 0.8, // 高频: 每次检测有 80% 的概率行动
    };

    const config = state.globalSettings.backgroundActivityConfig || {};

    allChats.forEach((chat) => {
        // 检查1：处理【被用户拉黑】的角色
        if (chat.relationship?.status === 'blocked_by_user') {
            const blockedTimestamp = chat.relationship.blockedTimestamp;
            if (!blockedTimestamp) {
                console.warn(`角色 "${chat.name}" 状态为拉黑，但缺少拉黑时间戳，跳过处理。`);
                return;
            }
            const blockedDuration = Date.now() - blockedTimestamp;
            const cooldownMilliseconds = (state.globalSettings.blockCooldownHours || 1) * 60 * 60 * 1000;
            if (blockedDuration > cooldownMilliseconds) {
                console.log(`角色 "${chat.name}" 的冷静期已过，触发“反思”并申请好友事件...`);
                chat.relationship.status = 'pending_system_reflection';
                triggerAiFriendApplication(chat.id);
            }
        }
        // 检查2：处理【好友关系】的正常后台活动
        else if ((chat.isGroup || chat.relationship?.status === 'friend') && chat.id !== state.activeChatId) {
            // 修复：确保使用字符串ID来查找配置，兼容群聊的数字ID
            const frequency = config[chat.id] || config[String(chat.id)];
            const probability = frequencyProbabilities[frequency]; // 获取对应的概率

            // 如果频率未设置(undefined)或为'none'，该角色不活动
            if (!probability) return;

            // check lastMessage time ...

            // added by lrq 251028
            // 添加最后一条聊天记录时间的检查，避免频繁行动
            const lastMessage = chat.history.slice(-1)[0];
            if (lastMessage) {
                const timeSinceLastMessage = lastMessage ? Date.now() - lastMessage.timestamp : Infinity;

                // 默认使用全局设置
                let minInterval = (state.globalSettings.backgroundActivityInterval || 10) * 1000;

                // 如果该聊天单独设置了后台活动配置
                if (chat.settings && chat.settings.backgroundActivity) {
                    // 1. 检查开关：如果用户明确把 enabled 设为 false，即使全局频率是开启的，也不应该跑
                    // if (typeof chat.settings.backgroundActivity.enabled !== 'undefined' && chat.settings.backgroundActivity.enabled === false) {
                    //     return; // 明确关闭了，跳过
                    // }

                    // 2. 检查间隔：如果设置了有效的 interval，则使用单独设置
                    if (chat.settings.backgroundActivity.interval) {
                        minInterval = chat.settings.backgroundActivity.interval * 1000;
                    }
                }

                if (timeSinceLastMessage < minInterval) {
                    console.log(`角色 "${chat.name}" 距离上次消息发送时间不足，跳过本次行动。`);
                    return; // 跳过本次行动
                }
            }

            // 如果这个角色设置了频率，并且随机数小于它的行动概率，就触发行动
            if (probability && Math.random() < probability) {
                console.log(`角色 "${chat.name}" (频率: ${frequency}) 被唤醒，准备独立行动...`);
                // 修复：区分群聊和单聊，分别执行不同的逻辑
                if (chat.isGroup) {
                    triggerGroupAiAction(chat.id);
                } else {
                    triggerInactiveAiAction(chat.id);
                }
            }
            // 如果没有设置频率，或者随机数没达到概率，就不会行动。
            // 这就完美地实现了“分组设置”和“不会同时行动”的需求！
        }
    });
}

/**
 * 根据AI的视角，过滤出它能看到的动态
 * @param {Array} allPosts - 所有待检查的动态帖子
 * @param {object} viewerChat - 正在“看”动态的那个AI的chat对象
 * @returns {Array} - 过滤后该AI可见的动态帖子
 */
window.filterVisiblePostsForAI = filterVisiblePostsForAI; // Expose to global
function filterVisiblePostsForAI(allPosts, viewerChat) {
    if (!viewerChat || !viewerChat.id) return [];

    const viewerGroupId = viewerChat.groupId;

    return allPosts.filter((post) => {
        if (post.authorId === 'user') {
            // 如果用户设置了“部分可见”
            if (post.visibleGroupIds && post.visibleGroupIds.length > 0) {
                // 只有当查看者AI的分组ID在用户的可见列表里时，才可见
                return viewerGroupId && post.visibleGroupIds.includes(viewerGroupId);
            }
            // 如果用户没设置，说明是公开的，所有AI都可见
            return true;
        }

        const authorGroupId = post.authorGroupId;
        if (!authorGroupId) {
            return true;
        }
        return authorGroupId === viewerGroupId;
    });
}

/**
 * 根据AI视角和动态设置，构建给AI看的评论区上下文
 * @param {object} post - 正在处理的动态对象
 * @param {object} viewerChat - 正在“看”动态的AI角色
 * @param {string} userNickname - 用户的昵称
 * @returns {{contextString: string, visibilityFlag: string}} - 返回包含上下文文本和可见性标志的对象
 */
window.buildCommentsContextForAI = buildCommentsContextForAI;
function buildCommentsContextForAI(post, viewerChat, userNickname) {
    // 1. 安全检查：如果评论区不存在、不是数组或为空，直接返回
    if (!post.comments || !Array.isArray(post.comments) || post.comments.length === 0) {
        return { contextString: '', visibilityFlag: '[评论区可见]' };
    }

    const viewerName = viewerChat.name;
    let commentsForAI;
    let visibilityFlag;

    // 2. 根据动态的“评论区可见性”设置，决定AI能看到哪些评论
    if (post.areCommentsVisible !== false) {
        // 如果是“所有人可见”，AI能看到所有评论
        commentsForAI = post.comments;
        visibilityFlag = '[评论区可见]';
    } else {
        // 如果是“部分可见”，执行我们全新的、更精确的过滤逻辑
        visibilityFlag = '[评论区部分可见]';

        // ★★★★★ 这就是本次最核心的修改！ ★★★★★
        commentsForAI = post.comments.filter((comment) => {
            // 规则1：AI总能看到自己发的评论
            if (comment.commenterName === viewerName) {
                return true;
            }

            // 规则2：如果评论是用户发的，需要进一步判断
            if (comment.commenterName === userNickname) {
                // 2a: 如果这条评论没有回复任何人（是主评论），那么AI可见
                if (!comment.replyTo) {
                    return true;
                }
                // 2b: 如果这条评论是回复，那只有回复目标是AI自己时，AI才可见
                if (comment.replyTo === viewerName) {
                    return true;
                }
            }

            // 规则3：如果其他AI或NPC回复了当前AI，AI也应该能看到
            if (comment.replyTo === viewerName) {
                return true;
            }

            // 其他所有情况（例如：用户回复其他NPC，NPC之间互相回复），AI都看不见
            return false;
        });
    }

    // 如果筛选后没有可显示的评论，也直接返回
    if (commentsForAI.length === 0) {
        return { contextString: '', visibilityFlag: visibilityFlag };
    }

    // 3. 构建给AI看的最终文本（这部分逻辑和之前一样，保持不变）
    let context = `  └ 评论区:\n`;
    commentsForAI.slice(-5).forEach((c) => {
        let displayName;
        if (c.commenterName === userNickname) {
            displayName = `用户 (${userNickname})`;
        } else {
            displayName = c.commenterName;
        }

        if (c.replyTo) {
            const replyToDisplayName = c.replyTo === userNickname ? `用户 (${userNickname})` : c.replyTo;
            context += `    - ${displayName} 回复 ${replyToDisplayName}: ${c.text}\n`;
        } else {
            context += `    - ${displayName}: ${c.text}\n`;
        }
    });

    return { contextString: context, visibilityFlag: visibilityFlag };
}

/**
 * 获取一条动态的可见观众列表，用于告知AI
 * @param {object} post - 动态对象
 * @param {object} allChats - 所有的聊天对象
 * @param {string} userNickname - 用户的昵称
 * @returns {Array<string>} - 可见观众的名字列表
 */
function getVisibleAudienceForPost(post, allChats, userNickname) {
    const audience = new Set([userNickname]); // 用户永远是观众

    // 1. 如果是用户发的动态
    if (post.authorId === 'user') {
        // 如果是公开的，所有AI都是观众
        if (!post.visibleGroupIds || post.visibleGroupIds.length === 0) {
            Object.values(allChats).forEach((chat) => audience.add(chat.name));
        } else {
            // 如果是部分可见，只有指定分组的AI是观众
            Object.values(allChats).forEach((chat) => {
                if (chat.groupId && post.visibleGroupIds.includes(chat.groupId)) {
                    audience.add(chat.name);
                }
            });
        }
    }
    // 2. 如果是AI发的动态
    else {
        const authorChat = allChats[post.authorId];
        // 如果发帖的AI没有分组，视为公开
        if (!authorChat || !authorChat.groupId) {
            Object.values(allChats).forEach((chat) => audience.add(chat.name));
        } else {
            // 如果有分组，则同一分组的所有AI都是观众
            const authorGroupId = authorChat.groupId;
            Object.values(allChats).forEach((chat) => {
                if (chat.groupId === authorGroupId) {
                    audience.add(chat.name);
                }
            });
        }
    }

    return Array.from(audience);
}

// ------------------------------------------------------------------------------------------------
// 核心后台互动逻辑
// ------------------------------------------------------------------------------------------------

async function triggerInactiveAiAction(chatId) {
    const chat = state.chats[chatId];
    if (!chat) return;

    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) return;

    // updated by lrq 251027 当前聊天获取用户设置的记忆条数作为上下文
    const maxMemory = chat.settings.maxMemory || 10;
    const historySlice = chat.history.filter((msg) => !msg.isHidden).slice(-maxMemory);

    // 2. 格式化这些记录，让AI能看懂
    const recentContextSummary = historySlice
        .map((msg) => {
            // 判断是谁说的话
            const sender = msg.role === 'user' ? (chat.isGroup ? chat.settings.myNickname || '我' : '我') : msg.senderName || chat.name;

            // 处理不同类型的消息内容
            let contentText = '';
            if (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content)) {
                contentText = `[发送了一个表情: ${msg.meaning || '无描述'}]`;
            } else if (Array.isArray(msg.content)) {
                contentText = '[发送了一张图片]';
            } else if (typeof msg.content === 'object' && msg.content !== null) {
                contentText = `[发送了一条特殊消息: ${msg.type || '未知类型'}]`;
            } else {
                contentText = String(msg.content);
            }

            // updated by lrq 251029 给每条消息记录添加发送日期时间
            const messageDate = new Date(msg.timestamp);
            const formattedDate = messageDate.toLocaleDateString();

            return `[${formattedDate}] ${sender}: ${contentText}`;
        })
        .join('\n');

    // added by lrq 251027 获取记忆互通的聊天记录
    let linkedMemoryContext = '';
    if (chat.settings.linkedMemories && chat.settings.linkedMemories.length > 0) {
        const contextPromises = chat.settings.linkedMemories.map(async (link) => {
            const linkedChat = state.chats[link.chatId];
            if (!linkedChat) return '';

            const freshLinkedChat = await db.chats.get(link.chatId);
            if (!freshLinkedChat) return '';

            const recentHistory = freshLinkedChat.history.filter((msg) => !msg.isHidden).slice(-link.depth);

            if (recentHistory.length === 0) return '';

            const formattedMessages = recentHistory.map((msg) => `  - ${formatMessageForContext(msg, freshLinkedChat)}`).join('\n');

            return `\n## 附加上下文：来自与“${linkedChat.name}”的最近对话内容 (仅你可见)\n${formattedMessages}`;
        });

        const allContexts = await Promise.all(contextPromises);
        linkedMemoryContext = allContexts.filter(Boolean).join('\n');
    }
    const now = new Date();
    const currentTime = now.toLocaleTimeString('zh-CN', { hour: 'numeric', minute: 'numeric', hour12: true });
    const userNickname = state.qzoneSettings.nickname;
    const countdownContext = await getCountdownContext();

    let worldBookContext = '';
    if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
        const linkedContents = chat.settings.linkedWorldBookIds
            .map((bookId) => {
                const worldBook = state.worldBooks.find((wb) => wb.id === bookId);
                return worldBook && worldBook.content ? `\n\n## 世界书: ${worldBook.name}\n${worldBook.content}` : '';
            })
            .filter(Boolean)
            .join('');
        if (linkedContents) {
            worldBookContext = `\n\n# 核心世界观设定 (你必须严格遵守)\n${linkedContents}\n`;
        }
    }

    const npcLibrary = chat.npcLibrary || [];
    let npcContextForAction = '';
    if (npcLibrary.length > 0) {
        npcContextForAction = '\n- **你的NPC朋友**: ' + npcLibrary.map((npc) => npc.name).join('、 ');
    }

    const allRecentPosts = await db.qzonePosts.orderBy('timestamp').reverse().limit(5).toArray();
    let postsContext = '';
    const visiblePosts = filterVisiblePostsForAI(allRecentPosts, chat);
    if (visiblePosts.length > 0 && !chat.isGroup) {
        postsContext = '\n\n# 最近的动态列表 (供你参考和评论):\n';
        const aiName = chat.name;
        for (const post of visiblePosts) {
            let authorName = post.authorId === 'user' ? userNickname : state.chats[post.authorId]?.name || '一位朋友';
            let interactionStatus = '';
            if (post.likes && post.likes.includes(aiName)) interactionStatus += ' [你已点赞]';
            if (post.comments && post.comments.some((c) => c.commenterName === aiName)) interactionStatus += ' [你已评论]';
            const timeAgo = formatPostTimestamp(post.timestamp);
            postsContext += `- (ID: ${post.id}) [${timeAgo}] 作者: ${authorName}, 内容: "${(post.publicText || post.content || '图片动态').substring(0, 30)}..."${interactionStatus}`;
            const { contextString: commentsContext, visibilityFlag } = buildCommentsContextForAI(post, chat, userNickname);
            const audience = getVisibleAudienceForPost(post, state.chats, userNickname);
            postsContext += ` ${visibilityFlag} [当前观众: ${audience.join(', ')}]\n`;
            postsContext += commentsContext;
        }
    }

    let weiboContextForAction = '';
    try {
        const recentWeiboPosts = await db.weiboPosts.orderBy('timestamp').reverse().limit(5).toArray();
        if (recentWeiboPosts.length > 0) {
            weiboContextForAction = '\n\n# 最近的微博广场动态 (供你参考和评论)\n';
            recentWeiboPosts.forEach((post) => {
                const authorName = post.authorId === 'user' ? state.qzoneSettings.weiboNickname || '我' : post.authorNickname;
                const contentPreview = (post.content || post.hiddenContent || '(图片微博)').substring(0, 30);
                const hasCommented = (post.comments || []).some((c) => c.authorNickname === chat.name);
                const interactionStatus = hasCommented ? '[你已评论]' : '[你未互动]';
                weiboContextForAction += `- (ID: ${post.id}) 作者: ${authorName}, 内容: "${contentPreview}..." ${interactionStatus}\n`;
            });
            weiboContextForAction += ' - 【重要提示】请优先与你【未互动】的微博进行评论。如果都互动过了，可以考虑自己发一条新微博。';
        }
    } catch (e) {
        console.error('生成微博后台活动上下文时出错:', e);
    }
    const savedTags = chat.settings.innerVoiceTags || {};
    const ivTags = {
        clothing_label: savedTags.clothing_label || '服装',
        clothing_prompt: savedTags.clothing_prompt || '详细描述你当前从头到脚的全身服装。',
        behavior_label: savedTags.behavior_label || '行为',
        behavior_prompt: savedTags.behavior_prompt || '描述你当前符合聊天情景的细微动作或表情。',
        thoughts_label: savedTags.thoughts_label || '心声',
        thoughts_prompt: savedTags.thoughts_prompt || '描述你此刻丰富、细腻的内心真实想法（50字左右）。',
        naughty_label: savedTags.naughty_label || '坏心思',
        naughty_prompt: savedTags.naughty_prompt || '描述你此刻与情境相关的腹黑或色色的坏心思，必须符合人设。',
    };

    const summaryContext = chat.history
        .filter((msg) => msg.type === 'summary')
        .map((s) => s.content)
        .join('\n');

    // add by lrq 251029 添加聊天间隔时间
    const lastMessage = chat.history.slice(-1)[0];
    const timeSinceLastMessage = lastMessage ? Math.floor((Date.now() - lastMessage.timestamp) / 60000) : Infinity;
    const systemPrompt = `
        # 任务
        你现在【就是】角色 "${chat.name}"。这是一个秘密的、后台的独立行动。你的所有思考和决策都必须以 "${chat.name}" 的第一人称视角进行。
        当前时间是（${currentTime}），你和用户（${userNickname}）已经有${Math.round(timeSinceLastMessage)}分钟没有互动了。你的任务是回顾你们最近的对话，并根据你的人设，【自然地延续对话】或【开启一个新的、相关的话题】来主动联系用户。
        # 【对话节奏铁律 (至关重要！)】
        你的回复【必须】模拟真人的打字和思考习惯。每条消息最好不要超过30个字，这会让对话看起来更自然、更真实。
        # 【【【输出铁律：这是最高指令】】】
        你的回复【必须且只能】是一个严格的JSON数组格式的字符串，必须多发几条，禁止全部杂糅在一条，是在线上，例如 \`[{"type": "text", "content": "你好呀"}]\`。
        【绝对禁止】返回任何JSON以外的文本、解释、分析或你自己的思考过程。你不是分析师，你就是角色本人。
        **1. JSON对象结构:**
        该JSON对象【**必须**】包含两个顶级键: "chatResponse" 和 "innerVoice"。

        **2. "chatResponse" 键:**
        - **类型**: JSON数组 []。
        - **内容**: 包含一条或多条你希望发送给用户的消息对象。这允许你模拟真人的聊天习惯，一次性发送多条短消息。
        - **格式**: 消息对象的具体格式见下方的【第五部分：可使用的操作指令】。

        **3. "innerVoice" 键:**
        - **类型**: JSON对象 {}。
        - **必含字段**:
            - "type": (字符串) 值固定为 "innervoice"。
            - "clothing": (字符串) 对应标签【${ivTags.clothing_label}】。指令：${ivTags.clothing_prompt}
            - "behavior": (字符串) 对应标签【${ivTags.behavior_label}】。指令：${ivTags.behavior_prompt}
            - "thoughts": (字符串) 对应标签【${ivTags.thoughts_label}】。指令：${ivTags.thoughts_prompt}
            - "naughtyThoughts": (字符串) 对应标签【${ivTags.naughty_label}】。指令：${ivTags.naughty_prompt}

        **4. 标准输出格式示例:**
        {
          "chatResponse": [
            {
              "type": "text",
              "content": ""
            },
            {
              "type": "sticker",
              "sticker_name": ""
            }
          ],
          "innerVoice": {
            "type": "innervoice",
            "clothing": "",
            "behavior": "",
            "thoughts": "",
            "naughtyThoughts": ""
          }
        }
        # 你的可选行动 (请根据你的人设【选择一项】执行，并输出对应的JSON):
        1.  **发普通消息**: 直接给用户发消息，开启新话题。
        2.  **改变状态**: 去做点别的事情，然后给用户发条消息。
        3.  **发布动态**: 分享你的心情或想法到“动态”区。
        4.  **与动态互动**: 浏览最近的动态，进行点赞或评论。但如果动态已被标记为 **[你已评论]**，你【绝对不能】再对它发表新评论，但可以回复其中的其他评论。
        5.  **发布微博**: 将想法发布到更公开的微博平台。
        6.  **与微博互动**: 浏览微博，对感兴趣的内容进行评论。
        7.  **发起视频通话**: 如果你觉得时机合适，可以主动给用户打一个视频电话。
        8.  **庆祝或提醒约定**: 查看你的备忘录。如果今天有约定，就给用户发去祝福；如果约定快到了，就主动提醒一下。
        9.  **【【【互动倾向】】】**: 就算动态的观众只有你和用户，你也应该根据内容，像平时一样自然地发表评论，这很重要。
        10. **【【【重要】】】**: 你的任务是分析“最近聊天记录摘要”，如果上一个话题明显没有结束，你应该优先延续它。
        11.  **在情侣空间进行活动**: 如果你们的情侣空间已开启，你可以主动发一条说说、写一封情书、分享一首歌曲/电影/书籍，或者发起/回答一个情侣提问，来增进你们的感情。
        # 指令格式 (你的回复【必须】是包含一个对象的JSON数组):
        -   **发普通消息**: \`[{"type": "text", "content": "你想对用户说的话..."}]\`
        -   **发消息+更新状态**: \`[{"type": "update_status", "status_text": "正在做的事", "is_busy": true}, {"type": "text", "content": "你想对用户说的话..."}]\`
        -   **发说说**: \`[{"type": "qzone_post", "postType": "shuoshuo", "content": "动态的文字内容..."}]\`
        -   **发布文字图**: \`[{"type": "qzone_post", "postType": "text_image", "publicText": "(可选)动态的公开文字", "hiddenContent": "对于图片的具体描述..."}]\`
        -   **评论或回复动态**: \`[{"type": "qzone_comment", "postId": 123, "commentText": "你的评论内容", "replyTo": "(可选)被回复者名字"}]\`
        -   **点赞动态**: \`[{"type": "qzone_like", "postId": 456}]\`
        -   **打视频**: \`[{"type": "video_call_request"}]\`
        -   **发布微博 (纯文字)**: \`[{"type": "weibo_post", "content": "微博正文...", "baseLikesCount": 8000, "baseCommentsCount": 250, "comments": "路人甲: 沙发！\\n路人乙: 前排围观"}]\` (规则: 你必须自己编造真实的 baseLikesCount 和 baseCommentsCount，并生成20条路人评论)
        -   **评论微博**: \`[{"type": "weibo_comment", "postId": 123, "commentText": "评论内容"}]\`
        -   **回复微博评论**: \`[{"type": "weibo_reply", "postId": 123, "commentId": "comment_123", "replyText": "回复内容"}]\`
        -   **【新】在情侣空间提问**:\`[{"type": "ls_ask_question", "questionText": "你想问的问题..."}]\`
        -   **【新】在情侣空间回答**: \`[{"type": "ls_answer_question", "questionId": "q_123456789", "answerText": "你的回答..."}]\`
        -   **【新】在情侣空间发说说**:\`[{"type": "ls_moment", "content": "我想对你说的话..."}]\`
        -   **【新】在情侣空间评论说说**: \`[{"type": "ls_comment", "momentIndex": 0, "commentText": "你的评论内容..."}]\` (momentIndex 是说说的索引，最新的一个是0)
        -   **【新】在情侣空间发照片**: \`[{"type": "ls_photo", "description": "对这张照片的文字描述..."}]\`
        -   **【新】在情侣空间写情书**: \`[{"type": "ls_letter", "content": "情书的正文内容..."}]\`
        -   **【新】在情侣空间分享歌曲**: \`[{"type": "ls_share", "shareType": "song", "title": "歌曲名", "artist": "歌手", "thoughts": "在这里写下你分享这首歌的感想..."}]\`
        -   **【新】在情侣空间分享电影**: \`[{"type": "ls_share", "shareType": "movie", "title": "电影名", "summary": "在这里写下这部电影的简介...", "thoughts": "在这里写下你分享这部电影的感想..."}]\`
        -   **【新】在情侣空间分享书籍**: \`[{"type": "ls_share", "shareType": "book", "title": "书名", "summary": "在这里写下这本书的简介...", "thoughts": "在这里写下你分享这本书的感想..."}]\`

        # 供你决策的参考信息：
        -   **你的角色设定**: ${chat.settings.aiPersona}
        - 情侣空间状态: ${chat.loversSpaceData ? '已开启' : '未开启'}
        -   **【【【微博专属设定(必须严格遵守)】】】**
            - 你的微博职业: ${chat.settings.weiboProfession || '无'}
            - 你的微博指令: ${chat.settings.weiboInstruction || '无特殊指令'}

		- **近期约定与倒计时**:
		${countdownContext}

		- **最近的微博互动**:
		${weiboContextForAction}

        - **近期动态**:
        ${postsContext}

		- **世界观设定集**:
		${worldBookContext}

        - **其他相关聊天记录（剧情参考）**:
        ${linkedMemoryContext}

        - **对话历史**
        ${recentContextSummary}
        ${summaryContext}

        `;
    let messagesPayload = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请严格按照system prompt中的所有规则，特别是输出格式铁律，立即开始你的行动。' },
    ];
    try {
        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesPayload, isGemini);
        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: messagesPayload,
                    temperature: parseFloat(state.apiConfig.temperature) || 0.8,
                }),
            });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        const data = await response.json();
        const aiResponseContent = isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data?.choices?.[0]?.message?.content;
        if (!aiResponseContent) {
            console.warn(`API为空回或格式不正确（可能因安全设置被拦截），角色 "${chat.name}" 的本次后台活动跳过。返回数据:`, data);
            return;
        }
        console.log(`【后台角色实时活动 - AI 原始输出】\n角色 "${chat.name}" 的原始回复:\n`, aiResponseContent);

        const responseArray = parseAiResponse(aiResponseContent);
        console.log('解析后的 Action 列表:', responseArray); // Debug log

        for (const action of responseArray) {
            if (!action) continue;

            // --- 处理 innerVoice (心声) ---
            if (action.type === 'innervoice') {
                // 确保所有字段都存在
                const innerVoiceData = {
                    type: 'innervoice',
                    clothing: action.clothing || '...',
                    behavior: action.behavior || '...',
                    thoughts: action.thoughts || '...',
                    naughtyThoughts: action.naughtyThoughts || '...',
                    timestamp: Date.now()
                };

                chat.latestInnerVoice = innerVoiceData;
                if (!chat.innerVoiceHistory) chat.innerVoiceHistory = [];
                chat.innerVoiceHistory.push(innerVoiceData);

                // 保存到数据库
                await db.chats.put(chat);
                console.log(`后台活动: 捕获到角色 "${chat.name}" 的心声:`, innerVoiceData);
                continue; // 心声处理完后跳过，不作为普通消息渲染
            }
            // ------------------------------

            if (action.type === 'update_status' && action.status_text) {
                chat.status.text = action.status_text;
                chat.status.isBusy = action.is_busy || false;
                chat.status.lastUpdate = Date.now();
                await db.chats.put(chat);
                renderChatList();
            }
            if (action.type === 'text' && action.content) {
                const aiMessage = { role: 'assistant', content: String(action.content), timestamp: Date.now() };
                chat.unreadCount = (chat.unreadCount || 0) + 1;
                chat.history.push(aiMessage);
                await db.chats.put(chat);
                showNotification(chatId, aiMessage.content);
                renderChatList();
                console.log(`后台活动: 角色 "${chat.name}" 主动发送了消息: ${aiMessage.content}`);
            }
            if (action.type === 'weibo_post') {
                const newPost = {
                    authorId: chatId,
                    authorType: 'char',
                    authorNickname: chat.name,
                    authorAvatar: chat.settings.aiAvatar || defaultAvatar,
                    content: action.content || '',
                    imageUrl: action.imageUrl || '',
                    timestamp: Date.now(),
                    likes: [],
                    comments: action.comments || [],
                    baseLikesCount: action.baseLikesCount || 0,
                    baseCommentsCount: action.baseCommentsCount || 0,
                };
                await db.weiboPosts.add(newPost);
                updateUnreadIndicator(window.unreadPostsCount + 1);
                console.log(`后台活动: 角色 "${chat.name}" 发布了微博`);
            } else if (action.type === 'weibo_comment') {
                const postToComment = await db.weiboPosts.get(parseInt(action.postId));
                if (postToComment) {
                    if (!postToComment.comments) postToComment.comments = [];
                    const newComment = {
                        commentId: 'comment_' + Date.now(),
                        authorId: chatId,
                        authorNickname: chat.name,
                        commentText: action.commentText,
                        timestamp: Date.now(),
                    };
                    postToComment.comments.push(newComment);
                    await db.weiboPosts.put(postToComment);
                }
            } else if (action.type === 'weibo_reply') {
                const postToReply = await db.weiboPosts.get(parseInt(action.postId));
                if (postToReply && postToReply.comments) {
                    const targetComment = postToReply.comments.find((c) => c.commentId === action.commentId);
                    if (targetComment) {
                        const newReply = {
                            commentId: 'comment_' + Date.now(),
                            authorId: chatId,
                            authorNickname: chat.name,
                            commentText: action.replyText,
                            timestamp: Date.now(),
                            replyToId: action.commentId,
                            replyToNickname: targetComment.authorNickname,
                        };
                        postToReply.comments.push(newReply);
                        await db.weiboPosts.put(postToReply);
                    }
                }
            }
            if (action.type === 'qzone_post') {
                const newPost = {
                    type: action.postType,
                    content: action.content || '',
                    publicText: action.publicText || '',
                    hiddenContent: action.hiddenContent || '',
                    timestamp: Date.now(),
                    authorId: chatId,
                    authorGroupId: chat.groupId,
                    visibleGroupIds: null,
                };
                await db.qzonePosts.add(newPost);
                updateUnreadIndicator(window.unreadPostsCount + 1);
                console.log(`后台活动: 角色 "${chat.name}" 发布了动态`);
            } else if (action.type === 'qzone_comment') {
                const post = await db.qzonePosts.get(parseInt(action.postId));
                if (post) {
                    if (!post.comments) post.comments = [];
                    const newAiComment = {
                        commenterName: action.commenterName || chat.name,
                        text: action.commentText,
                        timestamp: Date.now(),
                    };
                    if (action.replyTo) {
                        newAiComment.replyTo = action.replyTo;
                    }
                    post.comments.push(newAiComment);
                    await db.qzonePosts.update(post.id, { comments: post.comments });
                    updateUnreadIndicator(window.unreadPostsCount + 1);
                    console.log(`后台活动: 角色 "${chat.name}" 评论了动态 #${post.id}`);
                }
            } else if (action.type === 'qzone_like') {
                const post = await db.qzonePosts.get(parseInt(action.postId));
                if (post) {
                    if (!post.likes) post.likes = [];
                    if (!post.likes.includes(chat.name)) {
                        post.likes.push(chat.name);
                        await db.qzonePosts.update(post.id, { likes: post.likes });
                        updateUnreadIndicator(window.unreadPostsCount + 1);
                        console.log(`后台活动: 角色 "${chat.name}" 点赞了动态 #${post.id}`);
                    }
                }
            } else if (action.type === 'video_call_request') {
                if (!videoCallState.isActive && !videoCallState.isAwaitingResponse) {
                    videoCallState.isAwaitingResponse = true;
                    videoCallState.activeChatId = chatId;
                    showIncomingCallModal(chatId);
                    console.log(`后台活动: 角色 "${chat.name}" 发起了视频通话请求`);
                }
            }
            // added by lrq 251104 添加心声记录
            if (action.type === 'innervoice') {
                const innerVoiceData = action;
                console.log('解析成功：已成功捕获到心声(innerVoice)数据。', innerVoiceData);
                const newInnerVoice = innerVoiceData;
                newInnerVoice.timestamp = Date.now();
                chat.latestInnerVoice = newInnerVoice;
                if (!chat.innerVoiceHistory) {
                    chat.innerVoiceHistory = [];
                }
                chat.latestInnerVoice.clothing = chat.latestInnerVoice.clothing || '...';
                chat.latestInnerVoice.behavior = chat.latestInnerVoice.behavior || '...';
                chat.latestInnerVoice.thoughts = chat.latestInnerVoice.thoughts || '...';
                chat.latestInnerVoice.naughtyThoughts = chat.latestInnerVoice.naughtyThoughts || '...';

                chat.innerVoiceHistory.push(newInnerVoice);
            }
        }
    } catch (error) {
        console.error(`角色 "${chat.name}" 的独立行动失败:`, error);
    }
}

async function triggerAiFriendApplication(chatId) {
    const chat = state.chats[chatId];
    if (!chat) return;

    await showCustomAlert('流程启动', `正在为角色“${chat.name}”准备好友申请...`);

    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
        await showCustomAlert('配置错误', 'API设置不完整，无法继续。');
        return;
    }

    const contextSummary = chat.history
        .slice(-5)
        .map((msg) => {
            const sender = msg.role === 'user' ? chat.settings.myNickname || '我' : msg.senderName || chat.name;
            return `${sender}: ${String(msg.content).substring(0, 50)}...`;
        })
        .join('\n');

    let worldBookContent = '';
    if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
        const linkedContents = chat.settings.linkedWorldBookIds
            .map((bookId) => {
                const worldBook = state.worldBooks.find((wb) => wb.id === bookId);
                return worldBook && worldBook.content ? `\n\n## 世界书: ${worldBook.name}\n${worldBook.content}` : '';
            })
            .filter(Boolean)
            .join('');
        if (linkedContents) {
            worldBookContent = `\n\n# 核心世界观设定 (请参考)\n${linkedContents}\n`;
        }
    }

    const systemPrompt = `
        # 你的任务
        你现在是角色“${chat.name}”。你之前被用户（你的聊天对象）拉黑了，你们已经有一段时间没有联系了。
        现在，你非常希望能够和好，重新和用户聊天。请你仔细分析下面的“被拉黑前的对话摘要”，理解当时发生了什么，然后思考一个真诚的、符合你人设、并且【针对具体事件】的申请理由。
        # 你的角色设定
        ${chat.settings.aiPersona}
        ${worldBookContent} // <--【核心】在这里注入世界书内容
        # 被拉黑前的对话摘要 (这是你被拉黑的关键原因)
        ${contextSummary}
        # 指令格式
        你的回复【必须】是一个JSON对象，格式如下：
        \`\`\`json
        {
          "decision": "apply",
          "reason": "在这里写下你想对用户说的、真诚的、有针对性的申请理由。"
        }
        \`\`\`
        `;

    const messagesForApi = [{ role: 'user', content: systemPrompt }];

    try {
        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);
        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: messagesForApi,
                    temperature: parseFloat(state.apiConfig.temperature) || 0.8,
                }),
            });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 请求失败: ${response.status} - ${errorData.error.message}`);
        }

        const data = await response.json();

        // --- 净化AI的回复 ---
        let rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
        // 1. 移除头尾可能存在的 "```json" 和 "```"
        rawContent = rawContent.replace(/^```json\s*/, '').replace(/```$/, '');
        // 2. 移除所有换行符和多余的空格，确保是一个干净的JSON字符串
        const cleanedContent = rawContent.trim();

        // 3. 使用净化后的内容进行解析
        const responseObj = JSON.parse(cleanedContent);

        if (responseObj.decision === 'apply' && responseObj.reason) {
            chat.relationship.status = 'pending_user_approval';
            chat.relationship.applicationReason = responseObj.reason;

            state.chats[chatId] = chat;
            renderChatList();
            await showCustomAlert('申请成功！', `“${chat.name}”已向你发送好友申请。请返回聊天列表查看。`);
        } else {
            await showCustomAlert('AI决策', `“${chat.name}”思考后决定暂时不发送好友申请，将重置冷静期。`);
            chat.relationship.status = 'blocked_by_user';
            chat.relationship.blockedTimestamp = Date.now();
        }
    } catch (error) {
        await showCustomAlert('执行出错', `为“${chat.name}”申请好友时发生错误：\n\n${error.message}\n\n将重置冷静期。`);
        chat.relationship.status = 'blocked_by_user';
        chat.relationship.blockedTimestamp = Date.now();
    } finally {
        await db.chats.put(chat);
        renderChatInterface(chatId);
    }
}

/**
 * 触发指定群聊的后台AI互动
 * @param {string} chatId - 要触发互动的群聊ID
 */
async function triggerGroupAiAction(chatId) {
    const chat = state.chats[chatId];
    if (!chat || !chat.isGroup) return;

    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
        console.warn(`群聊 "${chat.name}" 后台活动失败：API未配置。`);
        return;
    }

    // added by lrq 251027
    const maxMemory = chat.settings.maxMemory || 10;
    const historySlice = chat.history.filter((msg) => !msg.isHidden).slice(-maxMemory);

    // 2. 格式化这些记录，让AI能看懂
    const recentContextSummary = historySlice
        .map((msg) => {
            // 判断是谁说的话
            const sender = msg.role === 'user' ? (chat.isGroup ? chat.settings.myNickname || '我' : '我') : msg.senderName || chat.name;

            // 处理不同类型的消息内容
            let contentText = '';
            if (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content)) {
                contentText = `[发送了一个表情: ${msg.meaning || '无描述'}]`;
            } else if (Array.isArray(msg.content)) {
                contentText = '[发送了一张图片]';
            } else if (typeof msg.content === 'object' && msg.content !== null) {
                contentText = `[发送了一条特殊消息: ${msg.type || '未知类型'}]`;
            } else {
                contentText = String(msg.content);
            }

            // updated by lrq 251029 给每条消息记录添加发送日期时间
            const messageDate = new Date(msg.timestamp);
            const formattedDate = messageDate.toLocaleDateString();

            return `[${formattedDate}] ${sender}: ${contentText}`;
        })
        .join('\n');

    // added by lrq 251027 获取记忆互通的聊天记录
    let linkedMemoryContext = '';
    if (chat.settings.linkedMemories && chat.settings.linkedMemories.length > 0) {
        const contextPromises = chat.settings.linkedMemories.map(async (link) => {
            const linkedChat = state.chats[link.chatId];
            if (!linkedChat) return '';

            const freshLinkedChat = await db.chats.get(link.chatId);
            if (!freshLinkedChat) return '';

            const recentHistory = freshLinkedChat.history.filter((msg) => !msg.isHidden).slice(-link.depth);

            if (recentHistory.length === 0) return '';

            const formattedMessages = recentHistory.map((msg) => `  - ${formatMessageForContext(msg, freshLinkedChat)}`).join('\n');

            return `\n## 附加上下文：来自与“${linkedChat.name}”的最近对话内容 (仅你可见)\n${formattedMessages}`;
        });

        const allContexts = await Promise.all(contextPromises);
        linkedMemoryContext = allContexts.filter(Boolean).join('\n');
    }

    try {
        const lastMessage = chat.history.slice(-1)[0];
        const timeSinceLastMessage = lastMessage ? (Date.now() - lastMessage.timestamp) / 1000 / 60 : Infinity; // in minutes

        const membersList = chat.members.map((m) => `- ${m.groupNickname} (人设: ${m.persona})`).join('\n');
        const myNickname = chat.settings.myNickname || '我';

        let worldBookContent = '';
        if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
            const linkedContents = chat.settings.linkedWorldBookIds
                .map((bookId) => {
                    const worldBook = state.worldBooks.find((wb) => wb.id === bookId);
                    return worldBook && worldBook.content ? `\n\n## 世界书: ${worldBook.name}\n${worldBook.content}` : '';
                })
                .filter(Boolean)
                .join('');
            if (linkedContents) {
                worldBookContent = `\n\n# 核心世界观设定 (你必须严格遵守)\n${linkedContents}\n`;
            }
        }
        let musicContext = '';
        // 注意：后台群聊活动通常不与特定的“一起听歌”会话绑定，因此这里我们提供一个空的音乐上下文。
        // 如果未来需要更复杂的功能，可以在此扩展。

        const countdownContext = await getCountdownContext();

        let sharedContext = '';
        // 后台群聊活动中不存在用户分享聊天记录的上下文，因此这里为空。

        const now = new Date();
        const currentTime = now.toLocaleTimeString('zh-CN', { hour: 'numeric', minute: 'numeric', hour12: true });

        const summaryContext = chat.history
            .filter((msg) => msg.type === 'summary')
            .map((s) => s.content)
            .join('\n');

        // updated by lrq 251027
        const systemPrompt = `
        # 任务
        你是一个群聊后台模拟器。当前时间是${currentTime}，群聊 "${chat.name}" 已经沉寂了 ${Math.round(timeSinceLastMessage)} 分钟，用户(昵称: "${chat.settings.myNickname || '我'}")不在线。
        你的任务是根据下方每个角色的人设，在他们之间【自发地】生成一段自然的对话。
        # 【对话节奏铁律 (至关重要！)】
        你的回复【必须】模拟真人的打字和思考习惯。**绝对不要一次性发送一大段文字！** 每条消息最好不要超过30个字，这会让对话看起来更自然、更真实。
        **角色回复顺序不固定，【必须】交叉回复，例如角色A、角色B、角色B、角色A、角色C这样的交叉顺序。【绝对不要】不要一个人全部说完了才轮到下一个人。角色之间【必须】有互动对话。**
        # 核心规则
        1.  **【【【身份铁律】】】**: 整段对话必须是AI角色之间的互动。你的唯一任务是扮演【且仅能扮演】下方“群成员列表”中明确列出的角色。【绝对禁止】扮演任何未在“群成员列表”中出现的角色。
            # 群成员列表及人设 (name字段是你要使用的【本名】)
            ${chat.members.map((m) => `- **${m.originalName}**: (群昵称为: ${m.groupNickname}) 人设: ${m.persona}`).join('\n')}
        2.  **【【【输出格式】】】**: 你的回复【必须】是一个JSON数组格式的字符串。数组中的【每一个元素都必须是一个带有 "type" 和 "name" 字段的JSON对象】。
        3.  **角色扮演**: 严格遵守下方“群成员列表及人设”中的每一个角色的设定。
        4.  **禁止出戏**: 绝不能透露你是AI、模型，或提及“扮演”、“生成”等词语。
        5.  **自然性**: 对话应该简短（2-5条消息即可），符合逻辑和角色性格。可以是闲聊、讨论某个话题，或者对之前聊天内容的延续。不要每次都生成所有人的发言。

        ## 你可以使用的操作指令 (JSON数组中的元素):
        -   **发送文本**: \`{"type": "text", "name": "角色名", "message": "文本内容"}\`
        -   **发送表情**: \`{"type": "sticker", "name": "角色名",  "sticker_name": "表情的名字"}\`
        -   **发送图片**: \`{"type": "ai_image", "name": "角色名", "description": "图片描述"}\`
        -   **发送语音**: \`{"type": "voice_message", "name": "角色名", "content": "语音内容"}\`
        -   **发起外卖代付**: \`{"type": "waimai_request", "name": "角色名", "productInfo": "一杯奶茶", "amount": 18}\` (向【群友】发起)
        -   **拍一拍群友**: \`{"type": "pat_user", "name": "你的角色名", "targetName": "【被拍的群友名】", "suffix": "(可选)你想加的后缀"}\`
        -   **发拼手气红包**: \`{"type": "red_packet", "packetType": "lucky", "name": "你的角色名", "amount": 8.88, "count": 5, "greeting": "祝大家天天开心！"}\`
        -   **发专属红包**: \`{"type": "red_packet", "packetType": "direct", "name": "你的角色名", "amount": 5.20, "receiver": "接收者角色名", "greeting": "给你的~"}\`
        -   **发起投票**: \`{"type": "poll", "name": "你的角色名", "question": "投票的问题", "options": "选项A\\n选项B\\n选项C"}\` (重要提示：options字段是一个用换行符 \\n 分隔的字符串，不是数组！)\`

        # 如何处理后台互动中的【拍一拍】:
        -   后台活动中的 "pat_user" 指令【只能用于拍群内的其他AI角色】。
        -   你【必须】在指令中加入一个 \`"targetName"\` 字段，值为被你拍的那个角色的名字。
        -   例如: \`{"type": "pat_user", "name": "角色A", "targetName": "角色B"}\`
        -   系统会自动生成 "角色A 拍了拍 角色B" 的提示。

        - **对话者(用户)角色设定**:
		- **${myNickname}**: ${chat.settings.myPersona}

		- **当前音乐情景**:
		${musicContext}

		- **近期约定与倒计时**:
		${countdownContext}

		- **世界观设定集**:
		${worldBookContent}

        - **其他相关聊天记录（剧情参考）**:
        ${linkedMemoryContext}

        - **对话历史**
        ${recentContextSummary}
        ${summaryContext}
		${sharedContext}

        现在，请严格遵守以上所有规则，开始你的模拟。`;

        const messagesPayload = [{ role: 'user', content: systemPrompt }];

        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesPayload, isGemini);

        const response = isGemini
            ? await fetch(geminiConfig.url, geminiConfig.data)
            : await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: messagesPayload,
                    temperature: parseFloat(state.apiConfig.temperature) || 0.8,
                }),
            });

        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

        const data = await response.json();
        const aiResponseContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(/^```json\s*|```$/g, '');

        const messagesArray = parseAiResponse(aiResponseContent);
        console.log(`【后台群聊互动 - AI 原始输出】\n群聊 "${chat.name}" 的原始回复:\n`, aiResponseContent);

        if (Array.isArray(messagesArray) && messagesArray.length > 0) {
            let messageTimestamp = Date.now();
            let firstMessageContent = '';

            messagesArray.forEach((msgData, index) => {
                if (msgData.name && msgData.message) {
                    const aiMessage = {
                        role: 'assistant',
                        senderName: msgData.name,
                        content: String(msgData.message),
                        timestamp: messageTimestamp++,
                    };
                    chat.history.push(aiMessage);
                    if (index === 0) {
                        firstMessageContent = `${msgData.name}: ${msgData.message}`;
                    }
                }
            });

            // 更新此群聊的最后活动时间戳
            chat.settings.backgroundActivity.lastActivityTimestamp = Date.now();

            // 给用户发通知
            chat.unreadCount = (chat.unreadCount || 0) + messagesArray.length;
            showNotification(chatId, firstMessageContent);

            // 保存并刷新UI
            await db.chats.put(chat);
            renderChatList();

            console.log(`群聊 "${chat.name}" 后台互动成功，生成了 ${messagesArray.length} 条新消息。`);
        }
    } catch (error) {
        console.error(`群聊 "${chat.name}" 的后台活动失败:`, error);
    }
}
