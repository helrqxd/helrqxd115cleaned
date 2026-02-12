// lofter.js - Lofter 应用功能模块

document.addEventListener('DOMContentLoaded', () => {
    console.log('Lofter App Script Loaded');

    /* =========================================
        1. 核心变量与选择器
       ========================================= */
    const lofterAppIcon = document.getElementById('lofter-app-icon');
    const lofterScreen = document.getElementById('lofter-screen');

    // 视图
    const views = {
        home: document.getElementById('lofter-home-view'),
        subscribe: document.getElementById('lofter-subscribe-view'),
        legu: document.getElementById('lofter-legu-view'),
        profile: document.getElementById('lofter-profile-view'),
        publish: document.getElementById('lofter-publish-view'),
        article: document.getElementById('lofter-article-view'),
        tagDetail: document.getElementById('lofter-tag-detail-view'),
        collectionDetail: document.getElementById('lofter-collection-detail-view')
    };

    // 底部导航
    const bottomNavItems = document.querySelectorAll('#lofter-screen .lofter-nav-item[data-view]');
    const publishNavBtn = document.getElementById('lofter-publish-nav-btn');

    // 首页顶部Tab
    const homeTopTabs = document.querySelectorAll('#lofter-home-view .lofter-tab-item');
    const homeFeeds = {
        follow: document.getElementById('lofter-follow-feed'),
        discover: document.getElementById('lofter-discover-feed'),
        plaza: document.getElementById('lofter-plaza-feed')
    };

    // 订阅页顶部Tab
    const subscribeTopTabs = document.querySelectorAll('#lofter-subscribe-view .lofter-tab-item');
    const subscribeFeeds = {
        tags: document.getElementById('lofter-tags-feed'),
        collections: document.getElementById('lofter-collections-feed')
    };

    // 发布相关
    const publishCloseBtn = document.getElementById('lofter-publish-close');
    const publishSubmitBtn = document.getElementById('lofter-publish-submit');
    const publishTitleInput = document.getElementById('lofter-publish-title-input');
    const publishBodyInput = document.getElementById('lofter-publish-body-input');
    const imageUploadBtn = document.getElementById('lofter-image-upload-btn');
    const imageInput = document.getElementById('lofter-image-input');
    const imagePreviewList = document.getElementById('lofter-image-preview-list');
    const tagInput = document.getElementById('lofter-tag-input');
    const tagsContainer = document.getElementById('lofter-tags-container');

    // 文章详情
    const articleBackBtn = document.getElementById('lofter-article-back');
    const articleFollowBtn = document.getElementById('lofter-article-follow-btn');
    const generateCommentsBtn = document.getElementById('lofter-generate-comments-btn');
    const commentInput = document.getElementById('lofter-comment-input');
    const commentSendBtn = document.getElementById('lofter-comment-send-btn');
    const likeBtn = document.getElementById('lofter-like-btn');
    const collectBtn = document.getElementById('lofter-collect-btn');

    // 生成按钮
    const generateWorksBtn = document.getElementById('lofter-generate-works-btn');

    // 设置
    const settingsBtn = document.getElementById('lofter-settings-btn');
    const settingsModal = document.getElementById('lofter-settings-modal');

    // 当前状态
    let currentView = 'home';
    let currentArticleId = null;
    let publishImages = [];
    let publishTags = [];

    // 默认头像
    const defaultAvatar = 'https://files.catbox.moe/q6z5fc.jpeg';

    // 工具函数：移除AI响应中的思维链标签（如 <think>...</think>）
    function stripThinkingTags(text) {
        if (!text) return text;
        return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    /**
     * 修复并解析AI返回的JSON字符串
     * AI（特别是Claude Opus）经常在JSON字符串值中输出未转义的控制字符（换行、制表符等），
     * 导致标准 JSON.parse 失败。此函数会先尝试直接解析，失败后自动修复再解析。
     */
    function repairAndParseJSON(text) {
        // 先提取JSON对象
        let jsonStr = text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        // 第一次尝试：直接解析
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            // 解析失败，进行修复
        }

        // 修复策略：遍历字符串，在JSON字符串值内部将控制字符转义
        let repaired = '';
        let inString = false;
        let escaped = false;

        for (let i = 0; i < jsonStr.length; i++) {
            const ch = jsonStr[i];

            if (escaped) {
                repaired += ch;
                escaped = false;
                continue;
            }

            if (ch === '\\' && inString) {
                repaired += ch;
                escaped = true;
                continue;
            }

            if (ch === '"') {
                inString = !inString;
                repaired += ch;
                continue;
            }

            if (inString) {
                // 在字符串值内部，转义控制字符
                const code = ch.charCodeAt(0);
                if (code === 10) {         // \n
                    repaired += '\\n';
                } else if (code === 13) {  // \r
                    repaired += '\\r';
                } else if (code === 9) {   // \t
                    repaired += '\\t';
                } else if (code === 8) {   // \b
                    repaired += '\\b';
                } else if (code === 12) {  // \f
                    repaired += '\\f';
                } else if (code < 32) {    // 其他控制字符
                    repaired += '\\u' + code.toString(16).padStart(4, '0');
                } else {
                    repaired += ch;
                }
            } else {
                repaired += ch;
            }
        }

        // 第二次尝试
        try {
            return JSON.parse(repaired);
        } catch (e2) {
            // 最后兜底：如果仍然失败，抛出原始错误信息和部分内容便于调试
            console.error('JSON修复后仍无法解析，原始内容前500字符:', jsonStr.substring(0, 500));
            throw new Error('AI返回的JSON格式无法解析，请重试。错误: ' + e2.message);
        }
    }

    /**
     * 集中式AI调用函数：发送请求并返回完整的响应文本
     * 内部使用SSE流式传输保持连接活跃，防止长时间思考的模型（如Claude Opus）导致连接超时
     * 对外接口为非流式——返回收集完毕的完整文本字符串
     */
    async function callLofterAI(prompt) {
        const apiConfig = window.state?.apiConfig;
        if (!apiConfig || !apiConfig.proxyUrl || !apiConfig.apiKey) {
            throw new Error('请先在设置中配置API');
        }
        const { proxyUrl, apiKey, model, temperature } = apiConfig;
        const isGemini = proxyUrl.includes('googleapis');
        const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8;

        if (isGemini) {
            // Gemini API：使用标准非流式请求（Google Cloud超时足够长）
            const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp }
                })
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                throw new Error(`Gemini API请求失败 (${res.status}): ${errBody || res.statusText}`);
            }
            const json = await res.json();
            if (!json.candidates?.[0]?.content?.parts?.[0]) {
                throw new Error(json.error?.message || json.promptFeedback?.blockReason || 'Gemini API返回格式异常');
            }
            return json.candidates[0].content.parts[0].text;
        }

        // OpenAI兼容API：使用SSE流式传输保持连接，内部收集完整响应
        const res = await fetch(`${proxyUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: requestTemp,
                stream: true
            })
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(`API请求失败 (${res.status}): ${errBody || res.statusText}`);
        }

        const contentType = res.headers.get('content-type') || '';

        // 兼容：如果服务端返回了非流式JSON响应，直接解析
        if (contentType.includes('application/json')) {
            const json = await res.json();
            if (!json.choices?.[0]?.message) {
                throw new Error(json.error?.message || 'API返回格式异常');
            }
            return json.choices[0].message.content;
        }

        // SSE流式响应：逐块读取并拼接完整内容
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const data = trimmed.slice(trimmed.startsWith('data: ') ? 6 : 5).trim();
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta;
                    if (delta?.content) {
                        fullContent += delta.content;
                    }
                } catch (e) {
                    // 跳过非JSON行
                }
            }
        }

        if (!fullContent) {
            throw new Error('API返回内容为空');
        }

        return fullContent;
    }

    // 可选的作品类型配置（统一定义，自定义生成和自由生成共用）
    const WORK_TYPE_CONFIG = {
        // 'image': { name: '同人图/漫画', desc: '详细描述一幅同人插画或漫画的画面内容，包括构图、人物神态、动作、场景氛围等' },
        'short_story': { name: '短篇小说（单篇完结）', desc: '独立完整的短篇故事，有开头、发展、高潮、结尾，情节紧凑，主题明确' },
        'short_series': { name: '短篇系列', desc: '属于某个主题系列的短篇，可以独立阅读但与系列其他作品有关联，需要系列名和章节号' },
        'long_complete': { name: '长篇一发完', desc: '较长的完整故事，情节丰富，人物刻画深入，有完整的故事弧线' },
        'long_serial': { name: '长篇连载章节', desc: '连载小说的一个章节，有承上启下的作用，结尾可以留有悬念，需要小说名和章节号' }
    };

    // 默认文风预设版本号（当更新预设内容时，需要增加此版本号）
    const STYLE_PRESETS_VERSION = 2;

    // 默认文风预设
    const defaultStylePresets = [
        '清新文艺：语言清新淡雅如晨露，善用意象与留白，情感内敛含蓄，以诗意笔触描绘日常美好',
        '甜宠治愈：温暖甜蜜的糖分文风，细腻刻画心动瞬间，氛围轻松明快，充满温馨治愈的生活气息',
        '幽默搞笑：轻松诙谐的喜剧风格，善用吐槽、反差萌和意外展开，对话机智有趣，让人会心一笑',
        '虐心催泪：细腻深沉的情感刻画，善于铺垫与反转，用克制的笔触写浓烈的情感，直击心灵深处',
        '热血激昂：充满张力的燃系文风，节奏明快、场面宏大，用激情澎湃的文字点燃读者的热血与斗志',
        '悬疑烧脑：环环相扣的推理风格，善设伏笔与悬念，氛围紧张神秘，引导读者抽丝剥茧探寻真相',
        '古风雅韵：典雅蕴藉的古典文风，遣词考究、意境悠远，善用诗词典故，展现传统美学韵味',
        '现代都市：贴近生活的都市笔触，节奏利落、描写真实，展现当代人的情感与生活状态'
    ];

    /* =========================================
        2. 工具函数
       ========================================= */

    // 时间格式化
    function formatLofterDate(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return `${diffMin}分钟前`;
        if (diffHour < 24) return `${diffHour}小时前`;
        if (diffDay < 7) return `${diffDay}天前`;

        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${m}-${day}`;
    }

    // 格式化楼中楼回复文本，高亮显示"回复 @xxx："前缀
    function formatReplyText(text) {
        if (!text) return '';
        // 匹配"回复 @xxx："或"回复 @xxx:"格式
        const replyMatch = text.match(/^(回复\s*@([^：:]+)[：:])\s*(.*)$/s);
        if (replyMatch) {
            const replyPrefix = replyMatch[1];
            const replyToName = replyMatch[2];
            const content = replyMatch[3];
            return `<span class="lofter-reply-to">回复 <span class="lofter-reply-to-name">@${replyToName}</span>：</span>${content}`;
        }
        return text;
    }

    // 完整日期格式
    function formatFullDate(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // 完整日期时间格式（包含时分）
    function formatFullDateTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
    }

    // 生成唯一ID
    function generateId() {
        return 'lofter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 显示Toast提示
    function showLofterToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // 获取用户设置
    function getLofterUserSettings() {
        const settings = localStorage.getItem('lofterUserSettings');
        if (settings) {
            return JSON.parse(settings);
        }
        return {
            name: state?.qzoneSettings?.nickname || '你的昵称',
            id: 'lofter_user',
            avatar: state?.qzoneSettings?.avatar || defaultAvatar,
            bgImage: 'https://i.postimg.cc/k495F4W5/profile-banner.jpg',
            posts: 0,
            heat: 0,
            fans: Math.floor(Math.random() * 1000),
            following: Math.floor(Math.random() * 100),
            coins: Math.floor(Math.random() * 500),
            candy: Math.floor(Math.random() * 100)
        };
    }

    // 保存用户设置
    function saveLofterUserSettings(settings) {
        localStorage.setItem('lofterUserSettings', JSON.stringify(settings));
    }

    // 获取文章列表（从IndexedDB）
    async function getLofterArticles() {
        try {
            const articles = await window.db.lofterArticles.toArray();
            return articles || [];
        } catch (error) {
            console.error('获取Lofter文章失败:', error);
            return [];
        }
    }

    // 保存文章列表（到IndexedDB）
    async function saveLofterArticles(articles) {
        try {
            // 清空并重新保存所有文章
            await window.db.lofterArticles.clear();
            if (articles && articles.length > 0) {
                await window.db.lofterArticles.bulkPut(articles);
            }
        } catch (error) {
            console.error('保存Lofter文章失败:', error);
            throw error;
        }
    }

    // 从localStorage迁移数据到IndexedDB（仅执行一次）
    async function migrateFromLocalStorage() {
        const migrationKey = 'lofterArticles_migrated_to_indexeddb';
        if (localStorage.getItem(migrationKey)) {
            return; // 已经迁移过
        }

        try {
            const oldData = localStorage.getItem('lofterArticles');
            if (oldData) {
                const articles = JSON.parse(oldData);
                if (articles && articles.length > 0) {
                    await saveLofterArticles(articles);
                    console.log(`[Lofter] 成功迁移 ${articles.length} 篇文章到IndexedDB`);
                }
                // 迁移成功后删除旧数据以释放localStorage空间
                localStorage.removeItem('lofterArticles');
            }
            localStorage.setItem(migrationKey, 'true');
        } catch (error) {
            console.error('[Lofter] 数据迁移失败:', error);
        }
    }

    // 执行迁移
    migrateFromLocalStorage();

    // 获取订阅的标签
    function getSubscribedTags() {
        const tags = localStorage.getItem('lofterSubscribedTags');
        return tags ? JSON.parse(tags) : [];
    }

    // 保存订阅的标签
    function saveSubscribedTags(tags) {
        localStorage.setItem('lofterSubscribedTags', JSON.stringify(tags));
    }

    // 获取订阅的合集
    function getSubscribedCollections() {
        const collections = localStorage.getItem('lofterSubscribedCollections');
        return collections ? JSON.parse(collections) : [];
    }

    // 保存订阅的合集
    function saveSubscribedCollections(collectionIds) {
        localStorage.setItem('lofterSubscribedCollections', JSON.stringify(collectionIds));
    }

    // 订阅合集
    function subscribeCollection(collectionId) {
        let subscribedCollections = getSubscribedCollections();
        if (!subscribedCollections.includes(collectionId)) {
            subscribedCollections.push(collectionId);
            saveSubscribedCollections(subscribedCollections);
            return true;
        }
        return false;
    }

    // 取消订阅合集
    function unsubscribeCollection(collectionId) {
        let subscribedCollections = getSubscribedCollections();
        subscribedCollections = subscribedCollections.filter(id => id !== collectionId);
        saveSubscribedCollections(subscribedCollections);
    }

    /* =========================================
        2.05 生成设置相关函数
       ========================================= */

    // 获取生成设置
    function getLofterGenSettings() {
        const settings = localStorage.getItem('lofterGenSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            // 检查文风预设版本，如果版本不匹配则更新为最新默认预设
            if (parsed.stylePresetsVersion !== STYLE_PRESETS_VERSION) {
                parsed.stylePresets = [...defaultStylePresets];
                parsed.stylePresetsVersion = STYLE_PRESETS_VERSION;
                saveLofterGenSettings(parsed);
            }
            return parsed;
        }
        return {
            workCount: 3,
            allowedCharacters: [], // 空数组表示允许所有角色
            worldBookIds: [], // 绑定的世界书ID数组（多选）
            stylePresets: [...defaultStylePresets],
            stylePresetsVersion: STYLE_PRESETS_VERSION
        };
    }

    // 保存生成设置
    function saveLofterGenSettings(settings) {
        localStorage.setItem('lofterGenSettings', JSON.stringify(settings));
    }

    // 获取所有可用世界书
    function getAllWorldBooks() {
        if (window.state && window.state.worldBooks) {
            return window.state.worldBooks;
        }
        return [];
    }

    // 获取世界书内容（支持单个ID或ID数组）
    async function getWorldBookContent(worldBookIdOrIds) {
        if (!worldBookIdOrIds) return '';

        const worldBooks = getAllWorldBooks();

        // 兼容旧的单个ID格式，统一转为数组
        const ids = Array.isArray(worldBookIdOrIds) ? worldBookIdOrIds : [worldBookIdOrIds];
        if (ids.length === 0) return '';

        let allContent = '';
        for (const wbId of ids) {
            if (!wbId) continue;
            const worldBook = worldBooks.find(wb => wb.id === wbId);
            if (!worldBook) continue;

            // 构建世界书内容字符串
            allContent += `【世界书: ${worldBook.name}】\n`;
            if (worldBook.entries && worldBook.entries.length > 0) {
                worldBook.entries.forEach(entry => {
                    if (entry.enabled !== false) {
                        allContent += `\n[${entry.keywords?.join(', ') || '条目'}]\n${entry.content}\n`;
                    }
                });
            }
            allContent += '\n';
        }
        return allContent.trim();
    }

    /* =========================================
        2.1 长按删除工具函数
       ========================================= */

    // 设置长按事件（含滑动检测，防止滚动时误触发）
    function setupLongPress(element, callback, duration = 600) {
        let pressTimer = null;
        let isLongPress = false;
        let startX = 0;
        let startY = 0;
        const MOVE_THRESHOLD = 10; // 移动超过10px则视为滑动

        const start = (e) => {
            if (e.type === 'click' && e.button !== 0) return;
            isLongPress = false;
            // 记录起始位置
            if (e.touches && e.touches.length > 0) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }
            pressTimer = setTimeout(() => {
                isLongPress = true;
                callback();
            }, duration);
        };

        const cancel = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        const onMove = (e) => {
            if (!pressTimer) return;
            let currentX, currentY;
            if (e.touches && e.touches.length > 0) {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            const dx = Math.abs(currentX - startX);
            const dy = Math.abs(currentY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                cancel();
            }
        };

        const handleClick = (e) => {
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        element.addEventListener('mousedown', start);
        element.addEventListener('touchstart', start, { passive: true });
        element.addEventListener('mousemove', onMove);
        element.addEventListener('touchmove', onMove, { passive: true });
        element.addEventListener('mouseup', cancel);
        element.addEventListener('mouseleave', cancel);
        element.addEventListener('touchend', cancel);
        element.addEventListener('touchcancel', cancel);
        element.addEventListener('click', handleClick, true);
    }

    // 确认删除弹窗
    function confirmDelete(type, id, name) {
        const typeNames = {
            article: '文章',
            tag: '标签',
            collection: '合集',
            product: '商品'
        };

        const typeName = typeNames[type] || '项目';

        if (confirm(`确定要删除${typeName}「${name}」吗？`)) {
            deleteItem(type, id);
        }
    }

    // 删除项目
    async function deleteItem(type, id) {
        switch (type) {
            case 'article':
                let articles = await getLofterArticles();
                const deletedArticle = articles.find(a => a.id === id);

                // 如果文章属于某个合集，更新合集数据
                if (deletedArticle && deletedArticle.collectionId) {
                    removeArticleFromCollection(deletedArticle, articles);
                }

                articles = articles.filter(a => a.id !== id);
                await saveLofterArticles(articles);
                renderDiscoverFeed();
                showLofterToast('文章已删除');
                break;
            case 'tag':
                let tags = getSubscribedTags();
                tags = tags.filter(t => t !== id);
                saveSubscribedTags(tags);
                renderSubscribedTags();
                showLofterToast('标签已取消订阅');
                break;
            case 'collection':
                // 合集删除逻辑
                showLofterToast('合集已删除');
                break;
            case 'product':
                let products = JSON.parse(localStorage.getItem('lofterLeguProducts') || '[]');
                products = products.filter(p => p.id !== id);
                localStorage.setItem('lofterLeguProducts', JSON.stringify(products));
                renderLeguProducts();
                showLofterToast('商品已删除');
                break;
        }
    }

    // 获取谷子商品数据（提前声明）
    function getLeguProducts() {
        const stored = localStorage.getItem('lofterLeguProducts');
        if (stored) return JSON.parse(stored);
        return [];
    }

    /* =========================================
        2.2 AI生成同人作品功能
       ========================================= */

    // 获取作品合集
    function getLofterCollections() {
        const collections = localStorage.getItem('lofterCollections');
        return collections ? JSON.parse(collections) : [];
    }

    // 保存作品合集
    function saveLofterCollections(collections) {
        localStorage.setItem('lofterCollections', JSON.stringify(collections));
    }

    // 获取或创建作者的合集
    function getOrCreateCollection(authorId, authorName, collectionName, workType, generationSettings = null) {
        let collections = getLofterCollections();
        let collection = collections.find(c => c.authorId === authorId && c.name === collectionName);

        if (!collection) {
            collection = {
                id: generateId(),
                authorId: authorId,
                authorName: authorName,
                name: collectionName,
                workType: workType, // 'series' 或 'serial'
                articleIds: [],
                createdAt: Date.now(),
                // 生成设定（首次生成时保存）
                generationSettings: generationSettings || null,
                // 章节概要映射 { articleId: summary }
                chapterSummaries: {}
            };
            collections.push(collection);
            saveLofterCollections(collections);
        } else if (generationSettings && !collection.generationSettings) {
            // 如果合集已存在但没有设定，保存设定
            collection.generationSettings = generationSettings;
            saveLofterCollections(collections);
        }
        return collection;
    }

    // 更新合集的生成设定
    function updateCollectionSettings(collectionId, generationSettings) {
        let collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (collection) {
            collection.generationSettings = generationSettings;
            saveLofterCollections(collections);
            return true;
        }
        return false;
    }

    // 保存章节概要
    function saveChapterSummary(collectionId, articleId, summary) {
        let collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (collection) {
            if (!collection.chapterSummaries) {
                collection.chapterSummaries = {};
            }
            collection.chapterSummaries[articleId] = summary;
            saveLofterCollections(collections);
        }
    }

    // 添加作品到合集
    function addArticleToCollection(collectionId, articleId) {
        let collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (collection && !collection.articleIds.includes(articleId)) {
            collection.articleIds.push(articleId);
            saveLofterCollections(collections);
        }
    }

    // 从合集中移除作品（删除文章时调用）
    // 彻底删除，不保留已删除章节的任何信息，不影响后续续写
    function removeArticleFromCollection(article, allArticles) {
        let collections = getLofterCollections();
        const collection = collections.find(c => c.id === article.collectionId);
        if (!collection) return;

        const deletedIndex = collection.articleIds.indexOf(article.id);
        if (deletedIndex === -1) return;

        // 1. 从合集的 articleIds 中移除
        collection.articleIds = collection.articleIds.filter(aid => aid !== article.id);

        // 2. 清理 chapterSummaries 中对应的条目
        if (collection.chapterSummaries && collection.chapterSummaries[article.id]) {
            delete collection.chapterSummaries[article.id];
        }

        // 3. 清理 preservedSummaries（如果存在旧数据则一并清除）
        if (collection.preservedSummaries) {
            delete collection.preservedSummaries;
        }

        // 4. 重新编号剩余章节
        collection.articleIds.forEach((aid, index) => {
            const a = allArticles.find(art => art.id === aid);
            if (a) {
                a.chapterNum = index + 1;
            }
        });

        saveLofterCollections(collections);
    }

    // 获取所有角色人设（包括用户角色）
    function getAllCharacterProfiles(allowedCharacterIds = null) {
        const characters = [];

        // 添加用户作为一个角色
        const userName = window.state?.qzoneSettings?.weiboNickname || window.state?.qzoneSettings?.nickname || '';
        const userPersona = window.state?.qzoneSettings?.weiboUserPersona || '';
        const userAvatar = window.state?.qzoneSettings?.weiboAvatar || window.state?.qzoneSettings?.avatar || defaultAvatar;

        if (userName && userPersona) {
            // 用户角色ID固定为 'user'
            const userAllowed = !allowedCharacterIds || allowedCharacterIds.length === 0 || allowedCharacterIds.includes('user');
            if (userAllowed) {
                characters.push({
                    id: 'user',
                    name: userName,
                    avatar: userAvatar,
                    persona: userPersona,
                    isUser: true // 标记为用户角色
                });
            }
        }

        // 从 state.chats 获取角色信息
        if (window.state && window.state.chats) {
            for (const chatId in window.state.chats) {
                const chat = window.state.chats[chatId];
                // 只获取非群组且有人设的角色
                if (!chat.isGroup && chat.settings && chat.settings.aiPersona) {
                    // 如果指定了允许的角色列表，检查是否在列表中
                    if (allowedCharacterIds && allowedCharacterIds.length > 0) {
                        if (!allowedCharacterIds.includes(chatId)) {
                            continue;
                        }
                    }
                    characters.push({
                        id: chatId,
                        name: chat.name,
                        avatar: chat.settings.aiAvatar || defaultAvatar,
                        persona: chat.settings.aiPersona // 完整的人设字符串
                    });
                }
            }
        }

        return characters;
    }

    // 构建AI提示词（单个作品）- 自由生成模式
    // workType: 预先随机决定的作品类型
    function buildLofterGenerationPrompt(characters, worldBookContent, stylePreset, workType) {
        // 构建完整的角色人设信息（不截断）
        const characterInfo = characters.map(c => {
            return `【角色名】${c.name}\n【角色人设】\n${c.persona}`;
        }).join('\n\n---\n\n');

        const typeInfo = WORK_TYPE_CONFIG[workType] || WORK_TYPE_CONFIG['short_story'];

        // 世界书设定
        let worldBookSection = '';
        if (worldBookContent) {
            worldBookSection = `\n\n## 📚 世界观设定背景：\n请严格遵循以下世界观设定进行创作，确保作品与设定相符：\n${worldBookContent}`;
        }

        // 文风要求
        let styleSection = '';
        if (stylePreset) {
            styleSection = `\n\n## ✍️ 文风与写作风格要求：\n请按照以下风格特点进行创作，贯穿全文：\n${stylePreset}\n\n具体要求：\n- 语言风格需保持一致\n- 叙事节奏符合文风特点\n- 对话和描写要体现风格特色`;
        }

        // 合集相关提示
        let collectionHint = '';
        if (workType === 'short_series' || workType === 'long_serial') {
            collectionHint = `\n\n⚠️ 重要提示：由于作品类型是「${typeInfo.name}」，你必须在JSON中提供 collectionName（合集名/小说名）。`;
        }

        return `你是一位资深的同人文创作者，擅长根据角色人设创作高质量的同人作品。请基于以下详细设定，创作一篇精彩的同人作品。

═══════════════════════════════════════
📖 角色资料卡
═══════════════════════════════════════

${characterInfo || '（无特定角色，可自由创作原创角色）'}${worldBookSection}${styleSection}

═══════════════════════════════════════
📝 创作要求
═══════════════════════════════════════

【指定作品类型】${typeInfo.name}
${typeInfo.desc}

【字数要求】
- 短篇类型：800-1500字
- 长篇类型：3000-5000字
- 内容充实，不要为凑字数而注水

【内容质量要求】
1. 开头要引人入胜，迅速抓住读者注意力
2. 人物塑造要立体，对话要生动有个性
3. 情节发展要合理，转折要有铺垫
4. 情感描写要细腻，能引起读者共鸣
5. 结尾要有余韵，让人回味

【必须包含的元素】
- 一个有创意的作者笔名（符合同人圈风格）
- 一个吸引人的标题（可以是诗意的、有梗的或直接点题的）
- 3-5个精准的标签：CP标签（如"XX×XX"）、主题标签（如"校园AU"、"原著向"）、情感标签（如"甜宠"、"虐心"）
- 一段真诚的"作者有话说"（50-150字，可以聊聊创作灵感、心路历程、碎碎念等）
- 2-4条精彩的读者评论（模拟同人圈读者的真实反应，可以是尖叫、催更、深度分析等）

【可选元素】
- 彩蛋内容：番外小剧场、角色花絮、if线等（如果添加，需设置5-30的糖果券解锁价格）${collectionHint}

═══════════════════════════════════════
📤 输出格式（严格JSON）
═══════════════════════════════════════

{
  "type": "${workType}",
  "authorName": "作者笔名",
  "title": "作品标题",
  "content": "作品正文内容",
  "tags": ["CP标签", "主题标签", "情感标签", "其他标签"],
  "authorNotes": "作者有话说的内容",
  "hasBonus": true或false,
  "bonusContent": "彩蛋内容（如果hasBonus为true）",
  "bonusCost": 5到30之间的数字,
  "collectionName": "合集名（short_series和long_serial必填）",
  "comments": [
    {"name": "评论者昵称", "text": "评论内容（要符合同人圈氛围）"},
    {"name": "评论者昵称2", "text": "评论内容2"}
  ]
}

⚠️ 注意：直接输出JSON，不要添加任何markdown代码块标记或其他说明文字。`;
    }

    // 调用AI生成单个作品
    // workType: 预先随机决定的作品类型
    async function generateSingleWork(characters, worldBookContent, stylePreset, workType) {
        const prompt = buildLofterGenerationPrompt(characters, worldBookContent, stylePreset, workType);
        let responseData = await callLofterAI(prompt);

        // 移除思维链标签后解析JSON
        responseData = stripThinkingTags(responseData);
        return repairAndParseJSON(responseData);
    }

    // 调用AI生成作品（分别生成每个作品）
    async function generateFanWorks() {
        const overlay = document.getElementById('lofter-generating-overlay');
        const progressEl = document.getElementById('lofter-generating-progress');

        // 检查API配置
        const apiConfig = window.state?.apiConfig;
        if (!apiConfig || !apiConfig.proxyUrl || !apiConfig.apiKey) {
            showLofterToast('请先在设置中配置API');
            return;
        }

        // 获取生成设置
        const genSettings = getLofterGenSettings();
        const allowedCharIds = genSettings.allowedCharacters && genSettings.allowedCharacters.length > 0
            ? genSettings.allowedCharacters
            : null;

        const characters = getAllCharacterProfiles(allowedCharIds);
        if (characters.length === 0) {
            showLofterToast('未找到任何角色人设，请先创建角色或在设置中选择角色');
            return;
        }

        // 使用设置中的作品数量
        const workCount = Math.min(Math.max(genSettings.workCount || 3, 1), 10);

        // 获取世界书内容（兼容旧版单选和新版多选）
        let worldBookContent = '';
        const wbIds = genSettings.worldBookIds || (genSettings.worldBookId ? [genSettings.worldBookId] : []);
        if (wbIds.length > 0) {
            worldBookContent = await getWorldBookContent(wbIds);
        }

        // 获取文风预设列表
        const stylePresets = genSettings.stylePresets && genSettings.stylePresets.length > 0
            ? genSettings.stylePresets
            : defaultStylePresets;

        overlay.style.display = 'flex';
        progressEl.textContent = `准备生成 ${workCount} 个作品...`;

        const articles = await getLofterArticles();
        const now = Date.now();
        let successCount = 0;

        // 可用的作品类型列表（从 WORK_TYPE_CONFIG 读取）
        const availableWorkTypes = Object.keys(WORK_TYPE_CONFIG);

        try {
            // 分别生成每个作品
            for (let i = 0; i < workCount; i++) {
                // 每个作品随机决定类型
                const randomWorkType = availableWorkTypes[Math.floor(Math.random() * availableWorkTypes.length)];
                progressEl.textContent = `正在生成第 ${i + 1}/${workCount} 个作品（${getWorkTypeName(randomWorkType)}）...`;

                // 随机选择一个文风预设
                const randomStylePreset = stylePresets[Math.floor(Math.random() * stylePresets.length)];

                try {
                    // 调用AI生成单个作品，传入预先决定的作品类型
                    const work = await generateSingleWork(characters, worldBookContent, randomStylePreset, randomWorkType);

                    // 创建作者ID
                    const authorId = 'author_' + generateId();

                    // 处理合集（short_series 和 long_serial 类型需要合集）
                    let collectionId = null;
                    let chapterNum = null;
                    if ((work.type === 'short_series' || work.type === 'long_serial') && work.collectionName) {
                        const collections = getLofterCollections();
                        let collection = collections.find(c => c.authorId === authorId && c.name === work.collectionName);

                        if (collection) {
                            // 如果合集已存在，章节号为现有章节数+1
                            chapterNum = collection.articleIds.length + 1;
                        } else {
                            // 如果是新合集，章节号为1
                            chapterNum = 1;
                        }

                        collection = getOrCreateCollection(
                            authorId,
                            work.authorName,
                            work.collectionName,
                            work.type === 'short_series' ? 'series' : 'serial'
                        );
                        collectionId = collection.id;
                    }

                    // 生成配图（图片类型功能暂时移除，后续继续开发）
                    let images = [];
                    /* 暂时移除图片生成功能
                    if (work.type === 'image' || work.imagePrompt) {
                        try {
                            progressEl.textContent = `正在生成第 ${i + 1}/${workCount} 个作品的配图...`;
                            const imageUrl = await generateWorkImage(work.imagePrompt || work.title);
                            if (imageUrl) images.push(imageUrl);
                        } catch (imgErr) {
                            console.error('配图生成失败:', imgErr);
                        }
                    }
                    */

                    // 处理AI生成的评论
                    let generatedComments = [];
                    if (work.comments && Array.isArray(work.comments)) {
                        const commentAvatars = [
                            'https://api.dicebear.com/7.x/notionists/svg?seed=commenter1',
                            'https://api.dicebear.com/7.x/notionists/svg?seed=commenter2',
                            'https://api.dicebear.com/7.x/notionists/svg?seed=commenter3',
                            'https://api.dicebear.com/7.x/notionists/svg?seed=commenter4'
                        ];
                        generatedComments = work.comments.map((c, idx) => ({
                            id: generateId(),
                            name: c.name || `读者${idx + 1}`,
                            avatar: commentAvatars[idx % commentAvatars.length],
                            text: c.text || c.content || '写得太棒了！',
                            timestamp: now
                        }));
                    }

                    // 创建文章对象
                    const newArticle = {
                        id: generateId(),
                        authorId: authorId,
                        authorName: work.authorName,
                        authorAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(work.authorName)}`,
                        title: work.title,
                        content: work.content,
                        images: images,
                        tags: work.tags || [],
                        workType: work.type,
                        authorNotes: work.authorNotes || '',
                        hasBonus: work.hasBonus || false,
                        bonusContent: work.bonusContent || '',
                        bonusCost: work.bonusCost || 10,
                        bonusUnlocked: false,
                        collectionId: collectionId,
                        collectionName: work.collectionName || null,
                        chapterNum: chapterNum,
                        likes: 0,
                        collects: Math.floor(Math.random() * 100) + 10,
                        comments: generatedComments,
                        tips: [],
                        views: 0,
                        timestamp: now, // 使用实际发布时间
                        isLiked: false,
                        isCollected: false,
                        isAIGenerated: true
                    };
                    // 确保点赞数 < 阅读数
                    newArticle.views = Math.floor(Math.random() * 2000) + 100;
                    newArticle.likes = Math.floor(Math.random() * newArticle.views * 0.5) + 10;

                    articles.unshift(newArticle);

                    // 添加到合集
                    if (collectionId) {
                        addArticleToCollection(collectionId, newArticle.id);
                    }

                    successCount++;

                    // 保存当前进度，防止中途失败丢失已生成的内容
                    await saveLofterArticles(articles);

                } catch (singleError) {
                    console.error(`生成第 ${i + 1} 个作品失败:`, singleError);
                    // 单个作品失败不影响其他作品的生成
                }
            }

            renderDiscoverFeed();

            if (successCount > 0) {
                showLofterToast(`成功生成 ${successCount} 个作品！`);
            } else {
                showLofterToast('所有作品生成失败，请检查API配置');
            }

        } catch (error) {
            console.error('生成作品失败:', error);
            showLofterToast('生成失败: ' + error.message);
        } finally {
            overlay.style.display = 'none';
        }
    }

    // 生成配图
    async function generateWorkImage(prompt) {
        const apiConfig = window.state?.apiConfig;

        // 尝试使用 pollinations 生成图片
        try {
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', anime style, high quality, detailed')}?width=512&height=512&nologo=true`;
            return pollinationsUrl;
        } catch (err) {
            console.error('图片生成失败:', err);
            return null;
        }
    }

    // 获取作品类型显示名称
    function getWorkTypeName(type) {
        const typeNames = {
            'image': '同人图',
            'short_story': '短篇',
            'short_series': '短篇系列',
            'long_complete': '长篇完结',
            'long_serial': '连载中'
        };
        return typeNames[type] || '文章';
    }

    // 获取作品类型CSS类名
    function getWorkTypeClass(type) {
        const typeClasses = {
            'image': 'image',
            'short_story': 'short-story',
            'short_series': 'series',
            'long_complete': 'long-story',
            'long_serial': 'serial'
        };
        return typeClasses[type] || '';
    }

    /* =========================================
        3. 视图切换逻辑
       ========================================= */

    // 切换主视图
    function switchView(viewName) {
        Object.values(views).forEach(v => {
            if (v) v.classList.remove('active');
        });
        if (views[viewName]) {
            views[viewName].classList.add('active');
        }
        currentView = viewName;

        // 更新底部导航高亮
        bottomNavItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });
    }

    // 底部导航点击
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);

            // 进入对应页面时刷新数据
            if (viewName === 'home') {
                renderDiscoverFeed();
            } else if (viewName === 'subscribe') {
                renderSubscribePage();
            } else if (viewName === 'legu') {
                renderLeguPage();
            } else if (viewName === 'profile') {
                renderProfilePage();
            }
        });
    });

    // 发布按钮点击
    if (publishNavBtn) {
        publishNavBtn.addEventListener('click', () => {
            switchView('publish');
            resetPublishForm();
        });
    }

    // 首页顶部Tab切换
    homeTopTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            homeTopTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            Object.values(homeFeeds).forEach(f => {
                if (f) {
                    f.classList.remove('active');
                }
            });
            if (homeFeeds[target]) {
                homeFeeds[target].classList.add('active');
            }

            if (target === 'discover') {
                renderDiscoverFeed();
            } else if (target === 'plaza') {
                renderPlazaPage();
            }
        });
    });

    // 订阅页顶部Tab切换
    subscribeTopTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            subscribeTopTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            Object.values(subscribeFeeds).forEach(f => {
                if (f) {
                    f.classList.remove('active');
                }
            });
            if (subscribeFeeds[target]) {
                subscribeFeeds[target].classList.add('active');
            }
        });
    });

    /* =========================================
        4. 发现页渲染 (瀑布流)
       ========================================= */

    async function renderDiscoverFeed() {
        const feed = document.getElementById('lofter-discover-feed');
        if (!feed) return;

        let articles = await getLofterArticles();

        feed.innerHTML = '';

        // 如果没有文章，显示空状态占位图文
        if (articles.length === 0) {
            feed.innerHTML = `
                <div class="lofter-empty-state lofter-discover-empty">
                    <div class="lofter-empty-icon">✨</div>
                    <p>这里还没有内容哦~</p>
                    <p class="lofter-empty-hint">点击右上角生成按钮创作同人作品吧</p>
                </div>
            `;
            return;
        }

        // 按时间倒序排列
        articles.sort((a, b) => b.timestamp - a.timestamp);

        // 创建双列容器（横向排列：左-右-左-右）
        const leftCol = document.createElement('div');
        leftCol.className = 'lofter-waterfall-column';
        const rightCol = document.createElement('div');
        rightCol.className = 'lofter-waterfall-column';

        feed.appendChild(leftCol);
        feed.appendChild(rightCol);

        articles.forEach((article, index) => {
            const card = createWaterfallCard(article);
            // 偶数索引放左边，奇数索引放右边
            if (index % 2 === 0) {
                leftCol.appendChild(card);
            } else {
                rightCol.appendChild(card);
            }
        });
    }

    // 创建瀑布流卡片
    function createWaterfallCard(article) {
        const card = document.createElement('div');
        card.className = 'lofter-waterfall-card';
        card.dataset.articleId = article.id;

        let imageHtml = '';
        if (article.images && article.images.length > 0) {
            imageHtml = `<img src="${article.images[0]}" class="lofter-wf-image" alt="图片">`;
        }

        // 作品类型标签（移到右上角）
        let typeBadgeHtml = '';
        if (article.workType) {
            typeBadgeHtml = `<div class="lofter-wf-type-badge lofter-wf-type-right">${getWorkTypeName(article.workType)}</div>`;
        }

        // 如果没有图片则显示文字内容（增加显示字数）
        let contentHtml = '';
        if (article.images && article.images.length > 0) {
            contentHtml = `<div class="lofter-wf-title">${article.title}</div>`;
        } else {
            // 增加显示的正文字数到150字
            const displayContent = article.content.length > 150
                ? article.content.substring(0, 150) + '...'
                : article.content;
            contentHtml = `
                <div class="lofter-wf-title">${article.title}</div>
                <div class="lofter-wf-text lofter-wf-text-more">${displayContent}</div>
            `;
        }

        // 合集信息
        let collectionHtml = '';
        if (article.collectionName) {
            collectionHtml = `<div class="lofter-wf-collection">📚 ${article.collectionName}${article.chapterNum ? ` · 第${article.chapterNum}章` : ''}</div>`;
        }

        card.innerHTML = `
            ${typeBadgeHtml}
            ${imageHtml}
            <div class="lofter-wf-content">
                ${contentHtml}
                ${collectionHtml}
                <div class="lofter-wf-author">
                    <img src="${article.authorAvatar || defaultAvatar}" alt="头像">
                    <span>${article.authorName}</span>
                    <div class="lofter-wf-likes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        ${article.likes}
                    </div>
                </div>
            </div>
        `;

        // 点击打开详情
        card.addEventListener('click', () => {
            openArticleDetail(article.id);
        });

        // 长按删除
        setupLongPress(card, () => {
            confirmDelete('article', article.id, article.title);
        });

        return card;
    }

    // 生成示例文章
    function generateSampleArticles() {
        const sampleArticles = [
            {
                id: generateId(),
                authorId: 'sample_author_1',
                authorName: '文艺小镇',
                authorAvatar: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg',
                title: '春日里的一封信',
                content: '亲爱的你：\n\n当你看到这封信的时候，春天应该已经来了吧。窗外的樱花开得正好，我坐在咖啡馆的角落，想着很多很多关于你的事情。\n\n记得去年的这个时候，我们一起在公园里散步，你说最喜欢春天的味道。那时候风轻轻吹过，带着花香和青草的气息。\n\n我把这些都记在心里了。',
                images: ['https://i.postimg.cc/k495F4W5/profile-banner.jpg'],
                tags: ['情书', '春天', '文字'],
                likes: 128,
                collects: 45,
                comments: [],
                views: 892,
                timestamp: Date.now() - 3600000 * 2,
                isLiked: false,
                isCollected: false
            },
            {
                id: generateId(),
                authorId: 'sample_author_2',
                authorName: '摄影师小林',
                authorAvatar: 'https://files.catbox.moe/7n8nqq.jpg',
                title: '【摄影分享】城市的夜色',
                content: '每个城市都有属于自己的夜晚。\n\n霓虹灯闪烁，车流穿梭，行人匆匆。在这些喧嚣之中，我试图用镜头捕捉那些转瞬即逝的美好瞬间。\n\n这组照片是上周在市中心拍摄的，希望你们喜欢。',
                images: [],
                tags: ['摄影', '城市', '夜景'],
                likes: 256,
                collects: 89,
                comments: [],
                views: 1523,
                timestamp: Date.now() - 3600000 * 5,
                isLiked: false,
                isCollected: false
            },
            {
                id: generateId(),
                authorId: 'sample_author_3',
                authorName: '烘焙日记',
                authorAvatar: 'https://files.catbox.moe/q6z5fc.jpeg',
                title: '周末烘焙｜草莓奶油蛋糕',
                content: '今天尝试做了草莓奶油蛋糕！🍰\n\n材料：\n- 低筋面粉 100g\n- 鸡蛋 4个\n- 细砂糖 80g\n- 淡奶油 300ml\n- 新鲜草莓 适量\n\n步骤详见图片～第一次做感觉还不错，分享给大家！',
                images: [],
                tags: ['烘焙', '美食', '蛋糕'],
                likes: 342,
                collects: 156,
                comments: [],
                views: 2341,
                timestamp: Date.now() - 3600000 * 12,
                isLiked: false,
                isCollected: false
            }
        ];

        return sampleArticles;
    }

    // 创建文章卡片
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'lofter-article-card';
        card.dataset.articleId = article.id;

        let imagesHtml = '';
        if (article.images && article.images.length > 0) {
            imagesHtml = `<img src="${article.images[0]}" class="lofter-card-image" alt="文章图片">`;
        }

        let tagsHtml = '';
        if (article.tags && article.tags.length > 0) {
            tagsHtml = `<div class="lofter-card-tags">
                ${article.tags.map(tag => `<span class="lofter-tag" data-tag="${tag}">#${tag}</span>`).join('')}
            </div>`;
        }

        card.innerHTML = `
            <div class="lofter-card-header">
                <img src="${article.authorAvatar || defaultAvatar}" class="lofter-card-avatar" alt="头像">
                <div class="lofter-card-author-info">
                    <div class="lofter-card-author-name">${article.authorName}</div>
                    <div class="lofter-card-time">${formatLofterDate(article.timestamp)}</div>
                </div>
                <button class="lofter-card-follow-btn">+ 关注</button>
            </div>
            ${imagesHtml}
            <div class="lofter-card-content">
                <div class="lofter-card-title">${article.title}</div>
                <div class="lofter-card-summary">${article.content.substring(0, 100)}...</div>
            </div>
            ${tagsHtml}
            <div class="lofter-card-footer">
                <div class="lofter-card-action like-action ${article.isLiked ? 'liked' : ''}" data-id="${article.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>${article.likes}</span>
                </div>
                <div class="lofter-card-action collect-action ${article.isCollected ? 'collected' : ''}" data-id="${article.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span>${article.collects}</span>
                </div>
                <div class="lofter-card-action comment-action" data-id="${article.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <span>${article.comments ? article.comments.length : 0}</span>
                </div>
            </div>
        `;

        // 点击卡片打开详情
        card.addEventListener('click', (e) => {
            // 排除点击操作按钮
            if (e.target.closest('.lofter-card-action') || e.target.closest('.lofter-card-follow-btn') || e.target.closest('.lofter-tag')) {
                return;
            }
            openArticleDetail(article.id);
        });

        // 点赞
        const likeAction = card.querySelector('.like-action');
        likeAction.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLike(article.id, likeAction);
        });

        // 收藏
        const collectAction = card.querySelector('.collect-action');
        collectAction.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollect(article.id, collectAction);
        });

        // 标签点击
        const tagElements = card.querySelectorAll('.lofter-tag');
        tagElements.forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const tag = tagEl.dataset.tag;
                subscribeTag(tag);
            });
        });

        return card;
    }

    // 点赞切换
    async function toggleLike(articleId, element) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        article.isLiked = !article.isLiked;
        article.likes += article.isLiked ? 1 : -1;

        await saveLofterArticles(articles);

        element.classList.toggle('liked');
        element.querySelector('span').textContent = article.likes;
    }

    // 收藏切换
    async function toggleCollect(articleId, element) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        article.isCollected = !article.isCollected;
        article.collects += article.isCollected ? 1 : -1;

        await saveLofterArticles(articles);

        element.classList.toggle('collected');
        element.querySelector('span').textContent = article.collects;

        showLofterToast(article.isCollected ? '已收藏' : '已取消收藏');
    }

    // 订阅标签
    function subscribeTag(tag) {
        let tags = getSubscribedTags();
        if (!tags.includes(tag)) {
            tags.push(tag);
            saveSubscribedTags(tags);
            showLofterToast(`已订阅 #${tag}`);
        } else {
            showLofterToast(`已订阅过 #${tag}`);
        }
    }

    /* =========================================
        5. 文章详情页
       ========================================= */

    async function openArticleDetail(articleId) {
        const articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        currentArticleId = articleId;

        // 增加阅读量
        article.views = (article.views || 0) + 1;
        await saveLofterArticles(articles);

        // 填充数据
        document.getElementById('lofter-article-author-avatar').src = article.authorAvatar || defaultAvatar;
        document.getElementById('lofter-article-author-name').textContent = article.authorName;
        document.getElementById('lofter-article-title').textContent = article.title;
        document.getElementById('lofter-article-date').textContent = formatFullDateTime(article.timestamp);
        document.getElementById('lofter-article-views').textContent = `阅读 ${article.views}`;

        // 渲染带段评标记的正文
        renderArticleBodyWithParagraphComments(article);

        // 图片
        const imagesContainer = document.getElementById('lofter-article-images');
        imagesContainer.innerHTML = '';
        if (article.images && article.images.length > 0) {
            article.images.forEach(imgUrl => {
                const img = document.createElement('img');
                img.src = imgUrl;
                imagesContainer.appendChild(img);
            });
        }

        // 标签
        const tagsContainer = document.getElementById('lofter-article-tags');
        tagsContainer.innerHTML = '';
        if (article.tags && article.tags.length > 0) {
            // 添加作品类型标签
            if (article.workType) {
                const typeTag = document.createElement('span');
                typeTag.className = `lofter-work-type-tag ${getWorkTypeClass(article.workType)}`;
                typeTag.textContent = getWorkTypeName(article.workType);
                tagsContainer.appendChild(typeTag);
            }
            article.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'lofter-tag';
                tagEl.textContent = `#${tag}`;
                tagEl.addEventListener('click', () => subscribeTag(tag));
                tagsContainer.appendChild(tagEl);
            });
        }

        // 作者有话说
        const authorNotesSection = document.getElementById('lofter-author-notes');
        const authorNotesContent = document.getElementById('lofter-author-notes-content');
        if (article.authorNotes) {
            authorNotesSection.style.display = 'block';
            authorNotesContent.textContent = article.authorNotes;
        } else {
            authorNotesSection.style.display = 'none';
        }

        // 作品合集
        const collectionSection = document.getElementById('lofter-work-collection');
        if (article.collectionId && article.collectionName) {
            collectionSection.style.display = 'block';
            document.getElementById('lofter-collection-name').textContent = article.collectionName;

            // 获取合集信息
            const collections = getLofterCollections();
            const collection = collections.find(c => c.id === article.collectionId);
            if (collection) {
                const workCount = collection.articleIds.length;
                const currentIndex = collection.articleIds.indexOf(articleId) + 1;
                document.getElementById('lofter-collection-count').textContent =
                    `共 ${workCount} 篇 · 当前第 ${currentIndex} 篇`;
            }

            // 查看全部按钮
            const viewCollectionBtn = document.getElementById('lofter-view-collection-btn');
            viewCollectionBtn.onclick = () => openCollectionModal(article.collectionId);
        } else {
            collectionSection.style.display = 'none';
        }

        // 彩蛋区域
        const bonusSection = document.getElementById('lofter-bonus-section');
        if (article.hasBonus && article.bonusContent) {
            bonusSection.style.display = 'block';
            document.getElementById('lofter-bonus-cost').textContent = `🍬 ${article.bonusCost || 10}`;

            const lockedDiv = document.getElementById('lofter-bonus-locked');
            const unlockedDiv = document.getElementById('lofter-bonus-unlocked');

            if (article.bonusUnlocked) {
                lockedDiv.style.display = 'none';
                unlockedDiv.style.display = 'block';
                document.getElementById('lofter-bonus-content-text').textContent = article.bonusContent;
            } else {
                lockedDiv.style.display = 'block';
                unlockedDiv.style.display = 'none';
            }

            // 解锁按钮
            const unlockBtn = document.getElementById('lofter-unlock-bonus-btn');
            unlockBtn.onclick = () => unlockBonus(articleId, article.bonusCost || 10);
        } else {
            bonusSection.style.display = 'none';
        }

        // 打赏记录
        renderTipRecord(article);

        // 互动数据
        document.getElementById('lofter-like-count').textContent = article.likes;
        document.getElementById('lofter-collect-count').textContent = article.collects;
        document.getElementById('lofter-comment-count').textContent = article.comments ? article.comments.length : 0;

        // 更新按钮状态
        const likeBtnEl = document.getElementById('lofter-like-btn');
        const collectBtnEl = document.getElementById('lofter-collect-btn');
        likeBtnEl.classList.toggle('liked', article.isLiked);
        collectBtnEl.classList.toggle('collected', article.isCollected);

        // 渲染评论
        renderComments(article);

        // 切换到详情视图
        switchView('article');
    }

    // 打开合集模态框（从文章详情页打开）
    async function openCollectionModal(collectionId) {
        const collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const modal = document.getElementById('lofter-collection-modal');
        const headerEl = document.getElementById('lofter-collection-modal-header');
        const listEl = document.getElementById('lofter-collection-works-list');

        // 检查是否已订阅
        const subscribedCollections = getSubscribedCollections();
        const isSubscribed = subscribedCollections.includes(collectionId);

        // 获取文章数据
        const articles = await getLofterArticles();
        const totalViews = collection.articleIds.reduce((sum, id) => {
            const article = articles.find(a => a.id === id);
            return sum + (article?.views || 0);
        }, 0);

        // 渲染头部合集信息
        headerEl.innerHTML = `
            <div class="lofter-collection-modal-cover">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            </div>
            <div class="lofter-collection-modal-info">
                <h3 class="lofter-collection-modal-title">${collection.name}</h3>
                <div class="lofter-collection-modal-author">@${collection.authorName}</div>
                <div class="lofter-collection-modal-stats">
                    <span class="lofter-collection-modal-stat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        ${collection.articleIds.length}篇
                    </span>
                    <span class="lofter-collection-modal-stat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        ${totalViews}
                    </span>
                </div>
            </div>
            <button class="lofter-collection-modal-subscribe ${isSubscribed ? 'subscribed' : ''}" id="lofter-collection-modal-subscribe">
                ${isSubscribed ? '✓ 已订阅' : '+ 订阅'}
            </button>
        `;

        // 订阅按钮事件
        const subscribeBtn = document.getElementById('lofter-collection-modal-subscribe');
        subscribeBtn.onclick = (e) => {
            e.stopPropagation();
            if (isSubscribed) {
                unsubscribeCollection(collectionId);
                showLofterToast('已取消订阅');
            } else {
                subscribeCollection(collectionId);
                showLofterToast('订阅成功');
            }
            modal.style.display = 'none';
        };

        // 渲染章节列表
        listEl.innerHTML = '';
        collection.articleIds.forEach((aid, index) => {
            const article = articles.find(a => a.id === aid);
            if (!article) return;

            const isCurrent = aid === currentArticleId;
            const itemEl = document.createElement('div');
            itemEl.className = `lofter-collection-modal-item ${isCurrent ? 'current' : ''}`;

            const chapterNum = article.chapterNum || (index + 1);

            itemEl.innerHTML = `
                <div class="lofter-collection-modal-item-num">${chapterNum}</div>
                <div class="lofter-collection-modal-item-content">
                    <div class="lofter-collection-modal-item-title">${article.title}</div>
                    <div class="lofter-collection-modal-item-meta">
                        <span>${formatLofterDate(article.timestamp)}</span>
                        <span class="lofter-collection-modal-item-views">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            ${article.views || 0}
                        </span>
                    </div>
                </div>
                ${isCurrent ? '<div class="lofter-collection-modal-item-badge">当前</div>' : '<div class="lofter-collection-modal-item-arrow">›</div>'}
            `;

            if (!isCurrent) {
                itemEl.addEventListener('click', () => {
                    modal.style.display = 'none';
                    openArticleDetail(aid);
                });
            }

            listEl.appendChild(itemEl);
        });

        modal.style.display = 'flex';

        // 关闭按钮
        document.getElementById('lofter-collection-modal-close').onclick = () => {
            modal.style.display = 'none';
        };
    }

    // 解锁彩蛋
    async function unlockBonus(articleId, cost) {
        const userSettings = getLofterUserSettings();
        const currentCandy = userSettings.candy || 0;

        if (currentCandy < cost) {
            showLofterToast(`糖果不足！需要 ${cost} 糖果，当前只有 ${currentCandy} 糖果`);
            return;
        }

        // 扣除糖果
        userSettings.candy = currentCandy - cost;
        saveLofterUserSettings(userSettings);

        // 更新文章状态
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (article) {
            article.bonusUnlocked = true;
            await saveLofterArticles(articles);

            // 更新UI
            document.getElementById('lofter-bonus-locked').style.display = 'none';
            document.getElementById('lofter-bonus-unlocked').style.display = 'block';
            document.getElementById('lofter-bonus-content-text').textContent = article.bonusContent;

            showLofterToast('彩蛋解锁成功！');
        }
    }

    // 渲染打赏记录
    function renderTipRecord(article) {
        const recordContainer = document.getElementById('lofter-tip-record');
        if (!article.tips || article.tips.length === 0) {
            recordContainer.innerHTML = '';
            return;
        }

        let recordHtml = `<div class="lofter-tip-record-title">打赏记录</div><div class="lofter-tip-record-list">`;
        article.tips.forEach(tip => {
            recordHtml += `
                <div class="lofter-tip-record-item">
                    <img src="${tip.avatar || defaultAvatar}" alt="头像">
                    <span>${tip.name} 送出 ${tip.giftEmoji}</span>
                </div>
            `;
        });
        recordHtml += '</div>';
        recordContainer.innerHTML = recordHtml;
    }

    // 打赏礼物事件
    function setupTipGifts() {
        const gifts = document.querySelectorAll('.lofter-tip-gift');
        gifts.forEach(gift => {
            gift.addEventListener('click', () => {
                if (!currentArticleId) return;

                const coins = parseInt(gift.dataset.coins);
                const giftEmoji = gift.querySelector('.lofter-gift-emoji').textContent;
                const giftName = gift.querySelector('.lofter-gift-name').textContent;

                sendTip(currentArticleId, coins, giftEmoji, giftName);
            });
        });
    }

    // 发送打赏
    async function sendTip(articleId, coins, giftEmoji, giftName) {
        const userSettings = getLofterUserSettings();
        const currentCoins = userSettings.coins || 0;

        if (currentCoins < coins) {
            showLofterToast(`乐乎币不足！需要 ${coins} 币，当前只有 ${currentCoins} 币`);
            return;
        }

        // 扣除乐乎币
        userSettings.coins = currentCoins - coins;
        saveLofterUserSettings(userSettings);

        // 添加打赏记录
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (article) {
            if (!article.tips) article.tips = [];
            article.tips.push({
                name: userSettings.name || '匿名用户',
                avatar: userSettings.avatar,
                giftEmoji: giftEmoji,
                giftName: giftName,
                coins: coins,
                timestamp: Date.now()
            });
            await saveLofterArticles(articles);

            // 更新打赏记录显示
            renderTipRecord(article);
        }

        showLofterToast(`成功送出 ${giftEmoji} ${giftName}！`);
    }

    /* =========================================
        5.5 段评功能
       ========================================= */

    // 渲染带段评标记的文章正文
    function renderArticleBodyWithParagraphComments(article) {
        const bodyContainer = document.getElementById('lofter-article-body');
        bodyContainer.innerHTML = '';

        // 按换行分割段落
        const paragraphs = article.content.split(/\n+/).filter(p => p.trim());

        // 初始化段评数据结构（如果不存在）
        if (!article.paragraphComments) {
            article.paragraphComments = {};
        }

        paragraphs.forEach((para, index) => {
            const paraWrapper = document.createElement('p');
            paraWrapper.className = 'lofter-paragraph-with-comment';

            // 段评标记（Lofter风格的对话框气泡）
            const paragraphComments = article.paragraphComments[index] || [];
            const commentCount = paragraphComments.length;

            // 创建段评标记元素
            const paraMark = document.createElement('span');
            paraMark.className = 'lofter-para-comment-bubble';
            paraMark.dataset.paragraphIndex = index;

            // 显示数字（有评论显示数量，无评论显示省略号）
            paraMark.innerHTML = `<span class="lofter-bubble-count">${commentCount > 0 ? commentCount : '…'}</span><span class="lofter-bubble-arrow"></span>`;
            if (commentCount > 0) {
                paraMark.classList.add('has-comments');
            }

            // 点击打开段评页面
            paraMark.addEventListener('click', (e) => {
                e.stopPropagation();
                openParagraphCommentModal(article.id, index, para);
            });

            // 段落文本 + 内联的段评标记
            paraWrapper.appendChild(document.createTextNode(para));
            paraWrapper.appendChild(paraMark);
            bodyContainer.appendChild(paraWrapper);
        });
    }

    // 打开段评模态框（支持楼中楼）
    async function openParagraphCommentModal(articleId, paragraphIndex, paragraphText) {
        // 移除已有的模态框
        const existingModal = document.querySelector('.lofter-para-comment-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        if (!article.paragraphComments) {
            article.paragraphComments = {};
        }

        const paragraphComments = article.paragraphComments[paragraphIndex] || [];

        // 渲染段评列表HTML（支持楼中楼）
        function renderParaCommentListHtml(comments) {
            if (comments.length === 0) {
                return '<div class="lofter-para-comment-empty">还没有段评，快来抢沙发吧~</div>';
            }
            return comments.map(c => {
                // 渲染楼中楼回复
                let repliesHtml = '';
                if (c.replies && c.replies.length > 0) {
                    repliesHtml = `
                        <div class="lofter-para-replies">
                            ${c.replies.map(r => `
                                <div class="lofter-para-reply-item" data-reply-id="${r.id}" data-parent-id="${c.id}" data-reply-name="${r.name}">
                                    <img src="${r.avatar || defaultAvatar}" class="lofter-para-reply-avatar" alt="头像">
                                    <div class="lofter-para-reply-content">
                                        <span class="lofter-para-reply-name">${r.name}</span>
                                        <span class="lofter-para-reply-text">${formatReplyText(r.text)}</span>
                                        <div class="lofter-para-reply-meta">
                                            <span class="lofter-para-reply-time">${formatLofterDate(r.timestamp)}</span>
                                            <span class="lofter-para-reply-action" data-parent-id="${c.id}" data-reply-name="${r.name}">回复</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                return `
                    <div class="lofter-para-comment-item" data-comment-id="${c.id}">
                        <img src="${c.avatar || defaultAvatar}" class="lofter-para-comment-avatar" alt="头像">
                        <div class="lofter-para-comment-content">
                            <div class="lofter-para-comment-name">${c.name}</div>
                            <div class="lofter-para-comment-text">${c.text}</div>
                            <div class="lofter-para-comment-meta">
                                <span class="lofter-para-comment-time">${formatLofterDate(c.timestamp)}</span>
                                <span class="lofter-para-comment-reply-btn" data-comment-id="${c.id}" data-comment-name="${c.name}">回复</span>
                            </div>
                            ${repliesHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'lofter-para-comment-modal';
        modal.innerHTML = `
            <div class="lofter-para-comment-container">
                <div class="lofter-para-comment-header">
                    <span class="lofter-para-comment-title">段落评论</span>
                    <span class="lofter-para-comment-close">×</span>
                </div>
                <div class="lofter-para-comment-quote">
                    <div class="lofter-para-quote-mark">"</div>
                    <div class="lofter-para-quote-text">${paragraphText.length > 100 ? paragraphText.substring(0, 100) + '...' : paragraphText}</div>
                </div>
                <div class="lofter-para-comment-list" id="lofter-para-comment-list">
                    ${renderParaCommentListHtml(paragraphComments)}
                </div>
                <div class="lofter-para-comment-input-area">
                    <div class="lofter-para-reply-hint" style="display:none;"></div>
                    <input type="text" class="lofter-para-comment-input" placeholder="写下你对这段的感想..." />
                    <button class="lofter-para-comment-send">发送</button>
                    <button class="lofter-para-comment-ai-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                        AI生成
                    </button>
                </div>
            </div>
        `;

        document.getElementById('lofter-article-view').appendChild(modal);

        // 当前回复状态
        let replyingToCommentId = null;
        let replyingToName = null;
        let isReplyingToReply = false;

        const input = modal.querySelector('.lofter-para-comment-input');
        const replyHint = modal.querySelector('.lofter-para-reply-hint');

        // 重新渲染段评列表并绑定事件
        async function refreshParaCommentList() {
            const updatedArticles = await getLofterArticles();
            const updatedArticle = updatedArticles.find(a => a.id === articleId);
            if (!updatedArticle) return;
            const updatedComments = updatedArticle.paragraphComments?.[paragraphIndex] || [];
            const listEl = modal.querySelector('#lofter-para-comment-list');
            listEl.innerHTML = renderParaCommentListHtml(updatedComments);
            bindParaCommentEvents();
        }

        // 绑定段评列表事件
        function bindParaCommentEvents() {
            // 主评论回复按钮
            modal.querySelectorAll('.lofter-para-comment-reply-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    replyingToCommentId = btn.dataset.commentId;
                    replyingToName = btn.dataset.commentName;
                    isReplyingToReply = false;
                    replyHint.textContent = `回复 @${replyingToName}`;
                    replyHint.style.display = 'block';
                    input.placeholder = '写下你的回复...';
                    input.focus();
                });
            });

            // 楼中楼回复按钮
            modal.querySelectorAll('.lofter-para-reply-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    replyingToCommentId = btn.dataset.parentId;
                    replyingToName = btn.dataset.replyName;
                    isReplyingToReply = true;
                    replyHint.textContent = `回复 @${replyingToName}`;
                    replyHint.style.display = 'block';
                    input.placeholder = '写下你的回复...';
                    input.focus();
                });
            });

            // 长按删除主评论
            modal.querySelectorAll('.lofter-para-comment-item').forEach(item => {
                setupLongPress(item, async () => {
                    const commentId = item.dataset.commentId;
                    if (confirm('确定要删除这条段评吗？')) {
                        await deleteParagraphComment(articleId, paragraphIndex, commentId);
                        await refreshParaCommentList();
                        const updatedArticle = (await getLofterArticles()).find(a => a.id === articleId);
                        if (updatedArticle) renderArticleBodyWithParagraphComments(updatedArticle);
                    }
                });
            });

            // 长按删除楼中楼回复
            modal.querySelectorAll('.lofter-para-reply-item').forEach(item => {
                setupLongPress(item, async () => {
                    const replyId = item.dataset.replyId;
                    const parentId = item.dataset.parentId;
                    if (confirm('确定要删除这条回复吗？')) {
                        await deleteParagraphReply(articleId, paragraphIndex, parentId, replyId);
                        await refreshParaCommentList();
                    }
                });
            });
        }

        bindParaCommentEvents();

        // 关闭按钮
        modal.querySelector('.lofter-para-comment-close').addEventListener('click', () => {
            modal.remove();
        });

        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // 发送段评
        const sendBtn = modal.querySelector('.lofter-para-comment-send');

        sendBtn.addEventListener('click', async () => {
            let text = input.value.trim();
            if (!text) {
                showLofterToast('请输入评论内容');
                return;
            }

            if (replyingToCommentId) {
                // 回复模式
                if (isReplyingToReply) {
                    text = `回复 @${replyingToName}：${text}`;
                }
                await addParagraphReply(articleId, paragraphIndex, replyingToCommentId, text);
            } else {
                // 新评论模式
                await addParagraphComment(articleId, paragraphIndex, text);
            }

            // 重置状态
            input.value = '';
            replyingToCommentId = null;
            replyingToName = null;
            isReplyingToReply = false;
            replyHint.style.display = 'none';
            input.placeholder = '写下你对这段的感想...';

            await refreshParaCommentList();
            const updatedArticle = (await getLofterArticles()).find(a => a.id === articleId);
            if (updatedArticle) renderArticleBodyWithParagraphComments(updatedArticle);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendBtn.click();
            }
        });

        // 点击输入框区域取消回复状态
        replyHint.addEventListener('click', () => {
            replyingToCommentId = null;
            replyingToName = null;
            isReplyingToReply = false;
            replyHint.style.display = 'none';
            input.placeholder = '写下你对这段的感想...';
        });

        // AI生成段评
        const aiBtn = modal.querySelector('.lofter-para-comment-ai-btn');
        aiBtn.addEventListener('click', async () => {
            // 添加loading状态
            aiBtn.classList.add('loading');
            aiBtn.innerHTML = `<svg class="lofter-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> 生成中...`;

            await generateAIParagraphComment(articleId, paragraphIndex, paragraphText, article);

            // 移除loading状态
            aiBtn.classList.remove('loading');
            aiBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg> AI生成`;

            await refreshParaCommentList();
            const updatedArticle = (await getLofterArticles()).find(a => a.id === articleId);
            if (updatedArticle) renderArticleBodyWithParagraphComments(updatedArticle);
        });

        // 自动聚焦输入框
        setTimeout(() => input.focus(), 100);
    }

    // 添加段评
    async function addParagraphComment(articleId, paragraphIndex, text) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        if (!article.paragraphComments) {
            article.paragraphComments = {};
        }

        if (!article.paragraphComments[paragraphIndex]) {
            article.paragraphComments[paragraphIndex] = [];
        }

        const userSettings = getLofterUserSettings();
        const newComment = {
            id: generateId(),
            name: userSettings.name,
            avatar: userSettings.avatar,
            text: text,
            timestamp: Date.now(),
            isUser: true,
            replies: [] // 支持楼中楼
        };

        article.paragraphComments[paragraphIndex].push(newComment);
        await saveLofterArticles(articles);
        showLofterToast('段评发送成功');
    }

    // 添加段评楼中楼回复
    async function addParagraphReply(articleId, paragraphIndex, parentCommentId, text) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article || !article.paragraphComments || !article.paragraphComments[paragraphIndex]) return;

        const parentComment = article.paragraphComments[paragraphIndex].find(c => c.id === parentCommentId);
        if (!parentComment) return;

        if (!parentComment.replies) parentComment.replies = [];

        const userSettings = getLofterUserSettings();
        const newReply = {
            id: generateId(),
            name: userSettings.name,
            avatar: userSettings.avatar,
            text: text,
            timestamp: Date.now(),
            isUser: true
        };

        parentComment.replies.push(newReply);
        await saveLofterArticles(articles);
        showLofterToast('回复成功');
    }

    // 删除段评
    async function deleteParagraphComment(articleId, paragraphIndex, commentId) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article || !article.paragraphComments || !article.paragraphComments[paragraphIndex]) return;

        article.paragraphComments[paragraphIndex] = article.paragraphComments[paragraphIndex].filter(c => c.id !== commentId);
        await saveLofterArticles(articles);
        showLofterToast('段评已删除');
    }

    // 删除段评楼中楼回复
    async function deleteParagraphReply(articleId, paragraphIndex, parentCommentId, replyId) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article || !article.paragraphComments || !article.paragraphComments[paragraphIndex]) return;

        const parentComment = article.paragraphComments[paragraphIndex].find(c => c.id === parentCommentId);
        if (!parentComment || !parentComment.replies) return;

        parentComment.replies = parentComment.replies.filter(r => r.id !== replyId);
        await saveLofterArticles(articles);
        showLofterToast('回复已删除');
    }

    // AI生成段评
    async function generateAIParagraphComment(articleId, paragraphIndex, paragraphText, article) {
        const apiConfig = window.state?.apiConfig;
        if (!apiConfig || !apiConfig.proxyUrl || !apiConfig.apiKey) {
            showLofterToast('请先在设置中配置API');
            return;
        }

        showLofterToast('正在生成段评...');

        // 获取当前段落已有的段评
        const existingComments = article.paragraphComments?.[paragraphIndex] || [];

        // 检查未被回复的用户评论（包括主评论和楼中楼）
        const userSettings = getLofterUserSettings();
        const unrepliedUserComments = [];
        existingComments.forEach(c => {
            const isUserComment = c.name === userSettings.name || c.isUser;
            const hasReply = c.replies && c.replies.length > 0;
            if (isUserComment && !hasReply) {
                unrepliedUserComments.push({ type: 'main', id: c.id, name: c.name, text: c.text });
            }
            // 检查楼中楼中的用户评论
            if (c.replies && c.replies.length > 0) {
                c.replies.forEach((r, rIdx) => {
                    const isUserReply = r.name === userSettings.name || r.isUser;
                    // 检查该回复后面是否有其他回复
                    const hasFollowingReply = c.replies.slice(rIdx + 1).some(fr => !(fr.name === userSettings.name || fr.isUser));
                    if (isUserReply && !hasFollowingReply) {
                        unrepliedUserComments.push({ type: 'reply', parentId: c.id, parentName: c.name, id: r.id, name: r.name, text: r.text });
                    }
                });
            }
        });

        // 构建已有评论列表（包含楼中楼结构）
        let existingCommentsSection = '';
        if (existingComments.length > 0) {
            const commentsList = existingComments.map(c => {
                let text = `- [ID:${c.id}] ${c.name}: "${c.text}"`;
                if (c.replies && c.replies.length > 0) {
                    text += '\n' + c.replies.map(r => `    └ [ID:${r.id}] ${r.name}: "${r.text}"`).join('\n');
                }
                return text;
            }).join('\n');
            existingCommentsSection = `\n\n【该段落已有的段评】\n${commentsList}`;
        }

        // 构建未回复评论列表
        let unrepliedSection = '';
        if (unrepliedUserComments.length > 0) {
            unrepliedSection = `\n\n【必须回复的用户评论 - 最高优先级】\n以下是用户发表但尚未被回复的评论，必须为每条生成至少1条回复：\n${unrepliedUserComments.map(c => {
                if (c.type === 'main') {
                    return `- 主评论 [ID:${c.id}] ${c.name}: "${c.text}"`;
                } else {
                    return `- 楼中楼回复 [父评论id:${c.parentId}] [ID:${c.id}] ${c.name}: "${c.text}"`;
                }
            }).join('\n')}`;
        }

        const prompt = `你是一位资深的同人文读者，正在阅读一篇同人文作品。请为指定段落生成精彩的段评。

【作品信息】
标题：${article.title}
作者：${article.authorName}
标签：${article.tags ? article.tags.join('、') : '无'}

【作品全文】
${article.content}

【需要评论的段落】（第${paragraphIndex + 1}段）
"${paragraphText}"${existingCommentsSection}${unrepliedSection}

【段评生成要求】

${unrepliedUserComments.length > 0 ? `★★★ 最高优先级：必须为上述${unrepliedUserComments.length}条未回复的用户评论生成回复！这些回复必须放在replies数组中。 ★★★\n\n` : ''}${existingComments.length > 0 ? `★★ 重要：已有${existingComments.length}条段评，生成的内容中必须包含1-2条对已有段评的楼中楼回复（放在replies数组）。 ★★\n\n` : ''}请生成2-4条段评，要求如下：

1. 评论角度多样化（必须从不同角度评论，不要雷同）：
   - 文笔赏析：评价该段的叙述手法、词句运用、意象选择
   - 情节反应：对故事发展的惊喜/震惊/感叹
   - 角色分析：分析角色心理、动机、性格
   - 情感共鸣：表达被触动的地方
   - 细节发现：挖掘伏笔、照应、隐藏的意涵
   - 幽默吐槽：轻松的玩笑、调侃
   - 引用并评：引用段落中的具体句子并发表看法
   - 联想发散：由该段联想到的其他内容

2. 评论语气/风格多样化（每条评论语气都要不同）：
   - 尖叫吐血型："awsl!!!"、"我死了"、"我哭死"
   - 深度分析型：理性、客观的分析评论
   - 温情感慨型：温柔、带感情的感想
   - 幽默调侃型：轻松的玩笑吐槽
   - 质疑讨论型："这里是不是...?"、"突然想到..."
   - 简短拍案型："绝了!"、"神来之笔!"、"开始暴风哭泣"

3. 文字表达多样化：
   - 可以使用颜文字、网络用语、粉圈语
   - 可以用"“”"引用原文句子
   - 并非所有评论都必须用额外表情符号，正常表达也可
   - 长度有差异：一句话的拍案/10-30字感想/30-60字分析

4. 态度多样化：
   - 正面（60%）：喜爱、感动、赞叹
   - 中性（30%）：讨论、分析、疑问
   - 微负（10%）：小小的遮憾感、心疼、"我不接受"

【重要】每条评论必须有明显区别，不要千篇一律！反应和文风要有差异。

输出格式（严格JSON）：
{
  "comments": [
    {"name": "昵称", "text": "段评内容"}
  ]${(unrepliedUserComments.length > 0 || existingComments.length > 0) ? `,
  "replies": [
    {"targetCommentId": "被回复的评论id", "name": "回复者昵称", "text": "回复 @角色昵称：内容"}
  ]` : ''}
}

直接输出JSON，不要添加markdown代码块标记。`;

        try {
            let responseData = await callLofterAI(prompt);

            // 移除思维链标签后解析JSON
            responseData = stripThinkingTags(responseData);
            console.log('AI段评生成结果:', responseData);

            const result = repairAndParseJSON(responseData);

            // 添加生成的段评
            let articles = await getLofterArticles();
            const articleToUpdate = articles.find(a => a.id === articleId);
            if (!articleToUpdate) return;

            if (!articleToUpdate.paragraphComments) {
                articleToUpdate.paragraphComments = {};
            }
            if (!articleToUpdate.paragraphComments[paragraphIndex]) {
                articleToUpdate.paragraphComments[paragraphIndex] = [];
            }

            const now = Date.now();
            if (result.comments && Array.isArray(result.comments)) {
                result.comments.forEach((c, idx) => {
                    articleToUpdate.paragraphComments[paragraphIndex].push({
                        id: generateId(),
                        name: c.name || `读者${idx + 1}`,
                        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=para${idx}${now}`,
                        text: c.text,
                        timestamp: now,
                        isUser: false,
                        replies: [] // 支持楼中楼
                    });
                });
            }

            // 处理楼中楼回复
            if (result.replies && Array.isArray(result.replies)) {
                result.replies.forEach((r, idx) => {
                    const allComments = articleToUpdate.paragraphComments[paragraphIndex];
                    // 先在主评论中查找
                    let targetComment = allComments.find(c => c.id === r.targetCommentId);
                    let parentComment = targetComment; // 回复将添加到的父评论

                    // 如果没找到，在楼中楼回复中查找
                    if (!targetComment) {
                        for (const c of allComments) {
                            if (c.replies && c.replies.length > 0) {
                                const foundReply = c.replies.find(reply => reply.id === r.targetCommentId);
                                if (foundReply) {
                                    targetComment = foundReply;
                                    parentComment = c; // 回复添加到该主评论的replies中
                                    break;
                                }
                            }
                        }
                    }

                    if (parentComment) {
                        if (!parentComment.replies) parentComment.replies = [];
                        parentComment.replies.push({
                            id: generateId(),
                            name: r.name || '热心读者',
                            avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=parareplier${idx}${now}`,
                            text: r.text,
                            timestamp: now,
                            isUser: false
                        });
                    }
                });
            }

            await saveLofterArticles(articles);
        } catch (error) {
            console.error('生成段评失败:', error);
            showLofterToast('生成段评失败: ' + error.message);
        }
    }

    // 渲染评论
    function renderComments(article) {
        const commentsList = document.getElementById('lofter-comments-list');
        commentsList.innerHTML = '';

        if (!article.comments || article.comments.length === 0) {
            commentsList.innerHTML = '<div class="lofter-empty-state" style="padding: 30px;"><p>还没有评论，快来抢沙发吧~</p></div>';
            return;
        }

        article.comments.forEach(comment => {
            const commentEl = createCommentElement(comment, article.id, false);
            commentsList.appendChild(commentEl);
        });
    }

    // 创建单条评论元素（支持楼中楼）
    function createCommentElement(comment, articleId, isReply = false, parentCommentId = null) {
        const commentEl = document.createElement('div');
        commentEl.className = isReply ? 'lofter-comment-reply' : 'lofter-comment-item';
        commentEl.dataset.commentId = comment.id;

        // 楼中楼回复HTML
        let repliesHtml = '';
        if (!isReply && comment.replies && comment.replies.length > 0) {
            repliesHtml = `
                <div class="lofter-comment-replies">
                    ${comment.replies.map(reply => `
                        <div class="lofter-comment-reply" data-comment-id="${reply.id}" data-parent-id="${comment.id}" data-reply-name="${reply.name}">
                            <img src="${reply.avatar || defaultAvatar}" class="lofter-reply-avatar" alt="头像">
                            <div class="lofter-reply-content">
                                <span class="lofter-reply-name">${reply.name}</span>
                                <span class="lofter-reply-text">${formatReplyText(reply.text)}</span>
                                <div class="lofter-reply-meta">
                                    <span class="lofter-reply-time">${formatLofterDate(reply.timestamp)}</span>
                                    <span class="lofter-reply-action" data-parent-id="${comment.id}" data-reply-name="${reply.name}">回复</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        commentEl.innerHTML = `
            <img src="${comment.avatar || defaultAvatar}" class="lofter-comment-avatar" alt="头像">
            <div class="lofter-comment-content">
                <div class="lofter-comment-header">
                    <span class="lofter-comment-name">${comment.name}</span>
                    <span class="lofter-comment-time">${formatLofterDate(comment.timestamp)}</span>
                </div>
                <div class="lofter-comment-text">${comment.text}</div>
                <div class="lofter-comment-actions">
                    <span class="lofter-comment-reply-btn" data-comment-id="${comment.id}">回复</span>
                </div>
                ${repliesHtml}
            </div>
        `;

        // 点击回复按钮（回复主评论）
        const replyBtn = commentEl.querySelector('.lofter-comment-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openReplyInput(comment.id, comment.name, articleId);
            });
        }

        // 长按删除主评论
        setupLongPress(commentEl, () => {
            if (confirm(`确定要删除这条评论吗？`)) {
                deleteComment(articleId, comment.id);
            }
        });

        // 为楼中楼回复绑定事件
        if (!isReply) {
            const replyElements = commentEl.querySelectorAll('.lofter-comment-reply');
            replyElements.forEach(replyEl => {
                const replyId = replyEl.dataset.commentId;
                const parentId = replyEl.dataset.parentId;
                const replyName = replyEl.dataset.replyName;

                // 长按删除
                setupLongPress(replyEl, () => {
                    if (confirm(`确定要删除这条回复吗？`)) {
                        deleteReply(articleId, parentId, replyId);
                    }
                });
            });

            // 为楼中楼的回复按钮绑定点击事件
            const replyActionBtns = commentEl.querySelectorAll('.lofter-reply-action');
            replyActionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const parentId = btn.dataset.parentId;
                    const replyToName = btn.dataset.replyName;
                    openReplyInput(parentId, replyToName, articleId, true);
                });
            });
        }

        return commentEl;
    }

    // 打开回复输入框
    // isReplyToReply: 是否是回复楼中楼的回复（需要添加@前缀）
    function openReplyInput(commentId, commentName, articleId, isReplyToReply = false) {
        // 移除已有的回复输入框
        const existingInput = document.querySelector('.lofter-reply-input-box');
        if (existingInput) {
            existingInput.remove();
        }

        // 创建回复输入框
        const replyBox = document.createElement('div');
        replyBox.className = 'lofter-reply-input-box';
        replyBox.innerHTML = `
            <div class="lofter-reply-input-header">
                <span>回复 @${commentName}</span>
                <span class="lofter-reply-input-close">×</span>
            </div>
            <div class="lofter-reply-input-wrap">
                <input type="text" class="lofter-reply-input" placeholder="写下你的回复..." />
                <button class="lofter-reply-send-btn">发送</button>
            </div>
        `;

        document.getElementById('lofter-article-view').appendChild(replyBox);

        // 自动聚焦输入框
        const input = replyBox.querySelector('.lofter-reply-input');
        setTimeout(() => input.focus(), 100);

        // 关闭按钮
        replyBox.querySelector('.lofter-reply-input-close').addEventListener('click', () => {
            replyBox.remove();
        });

        // 发送回复
        replyBox.querySelector('.lofter-reply-send-btn').addEventListener('click', () => {
            let text = input.value.trim();
            if (!text) {
                showLofterToast('请输入回复内容');
                return;
            }

            // 如果是回复楼中楼的回复，添加@前缀
            if (isReplyToReply) {
                text = `回复 @${commentName}：${text}`;
            }

            addReplyToComment(articleId, commentId, text);
            replyBox.remove();
        });

        // 回车发送
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                let text = input.value.trim();
                if (text) {
                    // 如果是回复楼中楼的回复，添加@前缀
                    if (isReplyToReply) {
                        text = `回复 @${commentName}：${text}`;
                    }
                    addReplyToComment(articleId, commentId, text);
                    replyBox.remove();
                }
            }
        });
    }

    // 添加楼中楼回复
    async function addReplyToComment(articleId, commentId, text) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article || !article.comments) return;

        const comment = article.comments.find(c => c.id === commentId);
        if (!comment) return;

        const userSettings = getLofterUserSettings();
        const newReply = {
            id: generateId(),
            name: userSettings.name,
            avatar: userSettings.avatar,
            text: text,
            timestamp: Date.now(),
            isUser: true
        };

        if (!comment.replies) comment.replies = [];
        comment.replies.push(newReply);

        await saveLofterArticles(articles);
        renderComments(article);
        showLofterToast('回复成功');
    }

    // 删除主评论
    async function deleteComment(articleId, commentId) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article || !article.comments) return;

        article.comments = article.comments.filter(c => c.id !== commentId);
        await saveLofterArticles(articles);

        document.getElementById('lofter-comment-count').textContent = article.comments.length;
        renderComments(article);
        showLofterToast('评论已删除');
    }

    // 删除楼中楼回复
    async function deleteReply(articleId, parentCommentId, replyId) {
        let articles = await getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article || !article.comments) return;

        const parentComment = article.comments.find(c => c.id === parentCommentId);
        if (!parentComment || !parentComment.replies) return;

        parentComment.replies = parentComment.replies.filter(r => r.id !== replyId);
        await saveLofterArticles(articles);

        renderComments(article);
        showLofterToast('回复已删除');
    }

    // 详情页返回
    if (articleBackBtn) {
        articleBackBtn.addEventListener('click', () => {
            switchView('home');
        });
    }

    // 详情页点赞
    if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
            if (!currentArticleId) return;
            let articles = await getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            article.isLiked = !article.isLiked;
            article.likes += article.isLiked ? 1 : -1;
            await saveLofterArticles(articles);

            likeBtn.classList.toggle('liked');
            document.getElementById('lofter-like-count').textContent = article.likes;
        });
    }

    // 详情页收藏
    if (collectBtn) {
        collectBtn.addEventListener('click', async () => {
            if (!currentArticleId) return;
            let articles = await getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            article.isCollected = !article.isCollected;
            article.collects += article.isCollected ? 1 : -1;
            await saveLofterArticles(articles);

            collectBtn.classList.toggle('collected');
            document.getElementById('lofter-collect-count').textContent = article.collects;
            showLofterToast(article.isCollected ? '已收藏' : '已取消收藏');
        });
    }

    // 发送评论
    if (commentSendBtn) {
        commentSendBtn.addEventListener('click', async () => {
            const text = commentInput.value.trim();
            if (!text || !currentArticleId) return;

            let articles = await getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            const userSettings = getLofterUserSettings();
            const newComment = {
                id: generateId(),
                name: userSettings.name,
                avatar: userSettings.avatar,
                text: text,
                timestamp: Date.now(),
                isUser: true,
                replies: []
            };

            if (!article.comments) article.comments = [];
            article.comments.unshift(newComment);
            await saveLofterArticles(articles);

            commentInput.value = '';
            document.getElementById('lofter-comment-count').textContent = article.comments.length;
            renderComments(article);
            showLofterToast('评论成功');
        });
    }

    // AI生成评论
    if (generateCommentsBtn) {
        generateCommentsBtn.addEventListener('click', async () => {
            if (!currentArticleId) return;

            let articles = await getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            // 检查API配置
            const apiConfig = window.state?.apiConfig;
            if (!apiConfig || !apiConfig.proxyUrl || !apiConfig.apiKey) {
                showLofterToast('请先在设置中配置API');
                return;
            }

            // 添加loading动效（参考小红书）
            const originalContent = generateCommentsBtn.innerHTML;
            generateCommentsBtn.classList.add('loading');
            generateCommentsBtn.innerHTML = `<svg class="lofter-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> 生成中...`;
            generateCommentsBtn.disabled = true;

            try {
                const newComments = await generateAIComments(article);

                if (!article.comments) article.comments = [];
                article.comments.push(...newComments);

                await saveLofterArticles(articles);
                document.getElementById('lofter-comment-count').textContent = article.comments.length;
                renderComments(article);
                showLofterToast(`已生成 ${newComments.length} 条评论`);
            } catch (error) {
                console.error('生成评论失败:', error);
                showLofterToast('生成评论失败: ' + error.message);
            } finally {
                // 移除loading动效
                generateCommentsBtn.classList.remove('loading');
                generateCommentsBtn.innerHTML = originalContent;
                generateCommentsBtn.disabled = false;
            }
        });
    }

    // AI生成评论函数
    async function generateAIComments(article) {
        const apiConfig = window.state?.apiConfig;

        // 检查是否有未被回复的用户评论
        const unrepliedUserComments = [];
        const userSettings = getLofterUserSettings();
        if (article.comments) {
            article.comments.forEach(comment => {
                // 检查是否是用户的评论（通过名字匹配或isUser标记）
                const isUserComment = comment.name === userSettings.name || comment.isUser;
                // 检查该评论是否有回复
                const hasReply = comment.replies && comment.replies.length > 0;
                if (isUserComment && !hasReply) {
                    unrepliedUserComments.push(comment);
                }
            });
        }

        // 构建生成评论的提示词
        const prompt = buildCommentGenerationPrompt(article, unrepliedUserComments);

        let responseData = await callLofterAI(prompt);

        // 移除思维链标签后解析返回的JSON
        responseData = stripThinkingTags(responseData);
        const result = repairAndParseJSON(responseData);
        const now = Date.now();
        const commentAvatars = [
            'https://api.dicebear.com/7.x/notionists/svg?seed=reader1',
            'https://api.dicebear.com/7.x/notionists/svg?seed=reader2',
            'https://api.dicebear.com/7.x/notionists/svg?seed=reader3',
            'https://api.dicebear.com/7.x/notionists/svg?seed=reader4',
            'https://api.dicebear.com/7.x/notionists/svg?seed=reader5'
        ];

        const newComments = [];

        // 处理新评论
        if (result.comments && Array.isArray(result.comments)) {
            result.comments.forEach((c, idx) => {
                newComments.push({
                    id: generateId(),
                    name: c.name || `读者${idx + 1}`,
                    avatar: commentAvatars[idx % commentAvatars.length],
                    text: c.text,
                    timestamp: now,
                    replies: [],
                    isUser: false
                });
            });
        }

        // 处理对用户评论的回复（包括对楼中楼的回复）
        if (result.replies && Array.isArray(result.replies)) {
            result.replies.forEach((r, idx) => {
                // 先在主评论中查找
                let targetComment = article.comments.find(c => c.id === r.targetCommentId);
                let parentComment = targetComment; // 回复将添加到的父评论

                // 如果没找到，在楼中楼回复中查找
                if (!targetComment) {
                    for (const c of article.comments) {
                        if (c.replies && c.replies.length > 0) {
                            const foundReply = c.replies.find(reply => reply.id === r.targetCommentId);
                            if (foundReply) {
                                targetComment = foundReply;
                                parentComment = c; // 回复添加到该主评论的replies中
                                break;
                            }
                        }
                    }
                }

                if (parentComment) {
                    if (!parentComment.replies) parentComment.replies = [];
                    parentComment.replies.push({
                        id: generateId(),
                        name: r.name || '热心读者',
                        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=replier${idx}`,
                        text: r.text,
                        timestamp: now,
                        isUser: false
                    });
                }
            });
        }

        return newComments;
    }

    // 构建评论生成提示词
    function buildCommentGenerationPrompt(article, unrepliedUserComments) {
        // 构建已有评论列表（包含楼中楼结构，用于生成回复）
        let existingCommentsSection = '';
        if (article.comments && article.comments.length > 0) {
            const commentsList = article.comments.slice(0, 10).map(c => {
                let text = `- [ID:${c.id}] ${c.name}: "${c.text}"`;
                if (c.replies && c.replies.length > 0) {
                    text += '\n' + c.replies.map(r => `    └ [ID:${r.id}] ${r.name}: "${r.text}"`).join('\n');
                }
                return text;
            }).join('\n');
            existingCommentsSection = `\n\n【已有评论】\n${commentsList}`;
        }

        // 构建未回复评论列表（包括主评论和楼中楼）
        let unrepliedSection = '';
        if (unrepliedUserComments.length > 0) {
            unrepliedSection = `\n\n【必须回复的用户评论 - 最高优先级】\n以下是用户发表但尚未被回复的评论，必须为每条生成至少1条回复：\n${unrepliedUserComments.map(c => `- 评论ID: ${c.id}\n  评论者: ${c.name}\n  内容: "${c.text}"`).join('\n\n')}`;
        }

        // 检查楼中楼中未被回复的用户评论
        const userSettings = getLofterUserSettings();
        const unrepliedUserReplies = [];
        if (article.comments) {
            article.comments.forEach(c => {
                if (c.replies && c.replies.length > 0) {
                    c.replies.forEach((r, rIdx) => {
                        const isUserReply = r.name === userSettings.name || r.isUser;
                        const hasFollowingReply = c.replies.slice(rIdx + 1).some(fr => !(fr.name === userSettings.name || fr.isUser));
                        if (isUserReply && !hasFollowingReply) {
                            unrepliedUserReplies.push({ parentId: c.id, parentName: c.name, id: r.id, name: r.name, text: r.text });
                        }
                    });
                }
            });
        }

        let unrepliedRepliesSection = '';
        if (unrepliedUserReplies.length > 0) {
            unrepliedRepliesSection = `\n\n【必须回复的用户楼中楼评论 - 最高优先级】\n${unrepliedUserReplies.map(r => `- 父评论id: ${r.parentId}（${r.parentName}）\n  用户回复ID: ${r.id}\n  回复内容: "${r.text}"`).join('\n\n')}`;
        }

        const hasExistingComments = article.comments && article.comments.length > 0;
        const hasUnreplied = unrepliedUserComments.length > 0 || unrepliedUserReplies.length > 0;

        return `你是一位资深的同人文读者，需要为以下作品生成真实、多样化的读者评论。

【作品信息】
标题：${article.title}
作者：${article.authorName}
标签：${article.tags ? article.tags.join('、') : '无'}
类型：${getWorkTypeName(article.workType) || '文章'}

【作品全文】
${article.content}

【作者有话说】
${article.authorNotes || '无'}${existingCommentsSection}${unrepliedSection}${unrepliedRepliesSection}

【评论生成要求】

${hasUnreplied ? `★★★ 最高优先级：必须为上述未回复的用户评论生成回复！这些回复必须放在replies数组中。 ★★★\n\n` : ''}${hasExistingComments ? `★★ 重要：已有${article.comments.length}条评论，生成的内容中必须包含1-2条对已有评论的楼中楼回复（放在replies数组）。 ★★\n\n` : ''}请生成3-5条读者评论，评论可以从以下多个角度：

1. 评论角度多样化（必须从不同角度评论，不要雷同）：
   - 剧情向：讨论故事情节、人物发展、伏笔回收等
   - 文笔向：评价写作技巧、语言风格、氛围营造等
   - CP向：关于角色关系、感情线、糖或刀的感受
   - 情感向：分享阅读后的感受、共鸣、被触动的点
   - 催更向：表达对后续的期待、催更、询问更新
   - 吐槽向：轻松幽默的吐槽、玩梗、调侃

2. 评论语气/风格多样化（每条评论语气都要不同）：
   - 尖叫吐血型："awsl!!!"、"我死了"、"我哭死"
   - 深度分析型：理性、客观的分析评论
   - 温情感慨型：温柔、带感情的感想
   - 幽默调侃型：轻松的玩笑吐槽
   - 质疑讨论型："这里是不是...?"、"突然想到..."
   - 简短拍案型："绝了!"、"神来之笔!"、"开始暴风哭泣"

3. 文字表达多样化：
   - 可以使用网络用语、颜文字、表情
   - 长度不一：有简短的尖叫型也有长篇分析型
   - 每条评论要有不同的昵称

4. 态度多样化：
   - 正面评论（60%）：喜爱、感动、激动、共鸣
   - 中性评论（30%）：讨论、分析、疑问、建议
   - 负面评论（10%）：轻微的不满、遗憾（要委婉礼貌）

【重要】每条评论必须有明显区别，不要千篇一律！

【输出格式（严格JSON）】
{
  "comments": [
    {"name": "昵称1", "text": "评论内容1"},
    {"name": "昵称2", "text": "评论内容2"}
  ]${(hasUnreplied || hasExistingComments) ? `,
  "replies": [
    {"targetCommentId": "被回复的评论id", "name": "回复者昵称", "text": "回复 @角色昵称：回复内容"}
  ]` : ''}
}

⚠️ 注意：直接输出JSON，不要添加任何markdown代码块标记。`;
    }

    /* =========================================
        6. 发布功能
       ========================================= */

    // 重置发布表单
    function resetPublishForm() {
        if (publishTitleInput) publishTitleInput.value = '';
        if (publishBodyInput) publishBodyInput.value = '';
        if (imagePreviewList) imagePreviewList.innerHTML = '';
        if (tagsContainer) tagsContainer.innerHTML = '';
        publishImages = [];
        publishTags = [];
    }

    // 关闭发布页
    if (publishCloseBtn) {
        publishCloseBtn.addEventListener('click', () => {
            switchView('home');
        });
    }

    // 图片上传按钮
    if (imageUploadBtn && imageInput) {
        imageUploadBtn.addEventListener('click', () => {
            imageInput.click();
        });

        imageInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const imgUrl = ev.target.result;
                    publishImages.push(imgUrl);
                    renderImagePreviews();
                };
                reader.readAsDataURL(file);
            });

            imageInput.value = '';
        });
    }

    // 渲染图片预览
    function renderImagePreviews() {
        if (!imagePreviewList) return;
        imagePreviewList.innerHTML = '';

        publishImages.forEach((imgUrl, index) => {
            const preview = document.createElement('div');
            preview.className = 'lofter-image-preview';
            preview.innerHTML = `
                <img src="${imgUrl}" alt="预览">
                <div class="lofter-image-preview-remove" data-index="${index}">×</div>
            `;
            imagePreviewList.appendChild(preview);
        });

        // 绑定删除事件
        imagePreviewList.querySelectorAll('.lofter-image-preview-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                publishImages.splice(index, 1);
                renderImagePreviews();
            });
        });
    }

    // 标签输入
    if (tagInput) {
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = tagInput.value.trim().replace(/^#/, '');
                if (tag && !publishTags.includes(tag)) {
                    publishTags.push(tag);
                    renderPublishTags();
                }
                tagInput.value = '';
            }
        });
    }

    // 渲染发布标签
    function renderPublishTags() {
        if (!tagsContainer) return;
        tagsContainer.innerHTML = '';

        publishTags.forEach((tag, index) => {
            const tagEl = document.createElement('div');
            tagEl.className = 'lofter-publish-tag';
            tagEl.innerHTML = `
                <span>#${tag}</span>
                <span class="lofter-publish-tag-remove" data-index="${index}">×</span>
            `;
            tagsContainer.appendChild(tagEl);
        });

        // 绑定删除事件
        tagsContainer.querySelectorAll('.lofter-publish-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                publishTags.splice(index, 1);
                renderPublishTags();
            });
        });
    }

    // 提交发布
    if (publishSubmitBtn) {
        publishSubmitBtn.addEventListener('click', async () => {
            const title = publishTitleInput ? publishTitleInput.value.trim() : '';
            const content = publishBodyInput ? publishBodyInput.value.trim() : '';

            if (!title) {
                showLofterToast('请输入标题');
                return;
            }
            if (!content) {
                showLofterToast('请输入内容');
                return;
            }

            const userSettings = getLofterUserSettings();
            const newArticle = {
                id: generateId(),
                authorId: 'user',
                authorName: userSettings.name,
                authorAvatar: userSettings.avatar,
                title: title,
                content: content,
                images: [...publishImages],
                tags: [...publishTags],
                likes: 0,
                collects: 0,
                comments: [],
                views: 0,
                timestamp: Date.now(),
                isLiked: false,
                isCollected: false
            };

            let articles = await getLofterArticles();
            articles.unshift(newArticle);
            await saveLofterArticles(articles);

            // 更新用户发布数
            userSettings.posts = (userSettings.posts || 0) + 1;
            saveLofterUserSettings(userSettings);

            showLofterToast('发布成功！');
            resetPublishForm();
            switchView('home');
            renderDiscoverFeed();
        });
    }

    /* =========================================
        7. 订阅页
       ========================================= */

    function renderSubscribePage() {
        renderSubscribedTags();
        renderSubscribedCollections();
    }

    async function renderSubscribedTags() {
        const container = document.getElementById('lofter-subscribed-tags');

        const emptyState = document.getElementById('lofter-tags-empty');
        if (!container) return;

        const tags = getSubscribedTags();

        if (tags.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const articles = await getLofterArticles();

        container.innerHTML = '';
        tags.forEach(tag => {
            // 查找该标签最近更新的作品
            const tagArticles = articles.filter(a => a.tags && a.tags.includes(tag));
            tagArticles.sort((a, b) => b.timestamp - a.timestamp);
            const latestArticle = tagArticles[0];

            const card = document.createElement('div');
            card.className = 'lofter-subscribe-tag-item';

            let latestInfoHtml = '';
            if (latestArticle) {
                latestInfoHtml = `
                    <div class="lofter-tag-latest">
                        <div class="lofter-tag-latest-title">${latestArticle.title}</div>
                        <div class="lofter-tag-latest-meta">${formatLofterDate(latestArticle.timestamp)} · ${latestArticle.authorName}</div>
                    </div>
                `;
            } else {
                latestInfoHtml = `
                    <div class="lofter-tag-latest">
                        <div class="lofter-tag-latest-empty">暂无相关作品</div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="lofter-subscribe-tag-header">
                    <div class="lofter-tag-name">#${tag}</div>
                    <div class="lofter-tag-count">${tagArticles.length}篇</div>
                </div>
                ${latestInfoHtml}
            `;

            // 点击打开标签详情页
            card.addEventListener('click', () => {
                openTagDetailPage(tag);
            });

            // 长按删除
            setupLongPress(card, () => {
                confirmDelete('tag', tag, `#${tag}`);
            });

            container.appendChild(card);
        });
    }

    async function renderSubscribedCollections() {
        const container = document.getElementById('lofter-subscribed-collections');
        const emptyState = document.getElementById('lofter-collections-empty');
        if (!container) return;

        const subscribedCollectionIds = getSubscribedCollections();

        if (subscribedCollectionIds.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const allCollections = getLofterCollections();
        const articles = await getLofterArticles();

        container.innerHTML = '';

        subscribedCollectionIds.forEach(collectionId => {
            const collection = allCollections.find(c => c.id === collectionId);
            if (!collection) return;

            // 获取合集中的文章
            const collectionArticles = articles.filter(a => collection.articleIds.includes(a.id));
            collectionArticles.sort((a, b) => b.timestamp - a.timestamp);
            const latestArticle = collectionArticles[0];

            const card = document.createElement('div');
            card.className = 'lofter-subscribe-collection-item';

            let latestInfoHtml = '';
            if (latestArticle) {
                latestInfoHtml = `
                    <div class="lofter-collection-latest">
                        <div class="lofter-collection-latest-title">${latestArticle.chapterNum ? `第${latestArticle.chapterNum}章 ` : ''}${latestArticle.title}</div>
                        <div class="lofter-collection-latest-meta">${formatLofterDate(latestArticle.timestamp)} · ${latestArticle.authorName}</div>
                    </div>
                `;
            } else {
                latestInfoHtml = `
                    <div class="lofter-collection-latest">
                        <div class="lofter-collection-latest-empty">暂无章节</div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="lofter-subscribe-collection-header">
                    <div class="lofter-collection-icon">📚</div>
                    <div class="lofter-collection-info">
                        <div class="lofter-collection-name">${collection.name}</div>
                        <div class="lofter-collection-count">${collection.articleIds.length}章</div>
                    </div>
                </div>
                ${latestInfoHtml}
            `;

            // 点击打开合集详情页
            card.addEventListener('click', () => {
                openCollectionDetailPage(collectionId);
            });

            // 长按删除（取消订阅）
            setupLongPress(card, () => {
                if (confirm(`确定要取消订阅合集「${collection.name}」吗？`)) {
                    unsubscribeCollection(collectionId);
                    renderSubscribedCollections();
                    showLofterToast('已取消订阅');
                }
            });

            container.appendChild(card);
        });
    }

    /* =========================================
        8. 乐谷页 (CP周边/谷子商城)
       ========================================= */

    function renderLeguPage() {
        renderLeguCPList();
        renderLeguProducts();
        setupLeguCategories();
    }

    // 渲染热门CP列表
    function renderLeguCPList() {
        const container = document.getElementById('lofter-legu-cp-list');
        if (!container) return;

        const cpList = [
            { name: '博君一肖', avatar: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg' },
            { name: '魏无羡×蓝忘机', avatar: 'https://files.catbox.moe/7n8nqq.jpg' },
            { name: '楚云昭×秦绛', avatar: 'https://files.catbox.moe/q6z5fc.jpeg' },
            { name: '时光代理人', avatar: 'https://i.postimg.cc/k495F4W5/profile-banner.jpg' },
            { name: '鸣潮', avatar: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg' }
        ];

        container.innerHTML = '';
        cpList.forEach(cp => {
            const card = document.createElement('div');
            card.className = 'lofter-legu-cp-card';
            card.innerHTML = `
                <img src="${cp.avatar}" class="lofter-legu-cp-avatar" alt="${cp.name}">
                <div class="lofter-legu-cp-name">${cp.name}</div>
            `;
            card.addEventListener('click', () => {
                showLofterToast(`查看 ${cp.name} 相关商品`);
            });
            container.appendChild(card);
        });
    }

    // 获取谷子商品数据
    function getLeguProductsWithDefaults() {
        const stored = localStorage.getItem('lofterLeguProducts');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.length > 0) return parsed;
        }

        // 默认商品
        const defaultProducts = [
            { id: 'p1', title: '【预售】博君一肖 Q版亚克力立牌 双人', image: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg', price: 35, sales: 892, category: 'standee', tags: ['博君一肖', '预售'] },
            { id: 'p2', title: '魏无羡蓝忘机徽章套装 6枚入', image: 'https://files.catbox.moe/7n8nqq.jpg', price: 48, sales: 1256, category: 'badge', tags: ['陈情令', '徽章'] },
            { id: 'p3', title: '时光代理人 陆光×程小时 挂件', image: 'https://files.catbox.moe/q6z5fc.jpeg', price: 28, sales: 567, category: 'keychain', tags: ['时光代理人', '官方'] },
            { id: 'p4', title: '鸣潮 今汐 Q版毛绒公仔 15cm', image: 'https://i.postimg.cc/k495F4W5/profile-banner.jpg', price: 89, sales: 423, category: 'plush', tags: ['鸣潮', '毛绒'] },
            { id: 'p5', title: '原神 钟离/夜兰 双面海报 A3', image: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg', price: 18, sales: 2341, category: 'poster', tags: ['原神', '海报'] },
            { id: 'p6', title: '星铁 景元 黏土人手办', image: 'https://files.catbox.moe/7n8nqq.jpg', price: 358, sales: 156, category: 'figure', tags: ['星铁', '手办'] }
        ];

        localStorage.setItem('lofterLeguProducts', JSON.stringify(defaultProducts));
        return defaultProducts;
    }

    // 渲染商品列表
    function renderLeguProducts(category = 'all') {
        const container = document.getElementById('lofter-legu-products');
        if (!container) return;

        const products = getLeguProductsWithDefaults();
        let filteredProducts = products;

        if (category !== 'all') {
            filteredProducts = products.filter(p => p.category === category);
        }

        container.innerHTML = '';
        filteredProducts.forEach(product => {
            const card = createProductCard(product);
            container.appendChild(card);
        });
    }

    // 创建商品卡片
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'lofter-product-card';
        card.dataset.productId = product.id;

        let tagsHtml = '';
        if (product.tags && product.tags.length > 0) {
            tagsHtml = `<div class="lofter-product-tags">
                ${product.tags.slice(0, 2).map(t => `<span class="lofter-product-tag">${t}</span>`).join('')}
            </div>`;
        }

        card.innerHTML = `
            <img src="${product.image}" class="lofter-product-image" alt="${product.title}">
            <div class="lofter-product-info">
                <div class="lofter-product-title">${product.title}</div>
                ${tagsHtml}
                <div class="lofter-product-bottom">
                    <span class="lofter-product-price">${product.price}</span>
                    <span class="lofter-product-sales">${product.sales}人付款</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            showLofterToast(`查看商品: ${product.title}`);
        });

        // 长按删除
        setupLongPress(card, () => {
            confirmDelete('product', product.id, product.title);
        });

        return card;
    }

    // 设置分类导航
    function setupLeguCategories() {
        const cats = document.querySelectorAll('.lofter-legu-cat');
        cats.forEach(cat => {
            cat.addEventListener('click', () => {
                cats.forEach(c => c.classList.remove('active'));
                cat.classList.add('active');
                renderLeguProducts(cat.dataset.cat);
            });
        });
    }

    /* =========================================
        8.1 广场页 (原乐谷内容)
       ========================================= */

    function renderPlazaPage() {
        const recommendContainer = document.getElementById('lofter-plaza-recommend');
        if (!recommendContainer) return;

        // 生成推荐内容
        const recommendations = [
            { title: '治愈系插画合集', image: 'https://i.postimg.cc/k495F4W5/profile-banner.jpg' },
            { title: '春日摄影挑战', image: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg' },
            { title: '文字创作指南', image: 'https://files.catbox.moe/q6z5fc.jpeg' }
        ];

        recommendContainer.innerHTML = '';
        recommendations.forEach(item => {
            const card = document.createElement('div');
            card.className = 'lofter-recommend-card';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.title}">
                <div class="lofter-recommend-card-info">
                    <div class="lofter-recommend-card-title">${item.title}</div>
                </div>
            `;
            recommendContainer.appendChild(card);
        });
    }

    /* =========================================
        9. 我的页面
       ========================================= */

    function renderProfilePage() {
        const userSettings = getLofterUserSettings();

        // 更新头像和背景
        const avatarImg = document.getElementById('lofter-profile-avatar');
        const bgImg = document.getElementById('lofter-profile-bg-img');
        const nameEl = document.getElementById('lofter-profile-name');
        const idEl = document.getElementById('lofter-profile-id');

        if (avatarImg) avatarImg.src = userSettings.avatar || defaultAvatar;
        if (bgImg) bgImg.src = userSettings.bgImage || 'https://i.postimg.cc/k495F4W5/profile-banner.jpg';
        if (nameEl) nameEl.textContent = userSettings.name || '你的昵称';
        if (idEl) idEl.textContent = userSettings.id || 'lofter_user';

        // 更新统计数据
        document.getElementById('lofter-stat-posts').textContent = userSettings.posts || 0;
        document.getElementById('lofter-stat-heat').textContent = userSettings.heat || 0;
        document.getElementById('lofter-stat-fans').textContent = userSettings.fans || 0;
        document.getElementById('lofter-stat-following').textContent = userSettings.following || 0;

        // 更新账户数据
        document.getElementById('lofter-coins').textContent = userSettings.coins || 0;
        document.getElementById('lofter-candy').textContent = userSettings.candy || 0;
    }

    /* =========================================
        10. 设置功能
       ========================================= */

    // 打开设置
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            const userSettings = getLofterUserSettings();

            document.getElementById('lofter-settings-name').value = userSettings.name || '';
            document.getElementById('lofter-settings-id').value = userSettings.id || '';
            document.getElementById('lofter-settings-avatar').value = userSettings.avatar || '';
            document.getElementById('lofter-settings-bg').value = userSettings.bgImage || '';

            settingsModal.style.display = 'flex';
        });
    }

    // 关闭设置
    const settingsCloseBtn = document.getElementById('lofter-settings-close');
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    // 保存设置
    const settingsSaveBtn = document.getElementById('lofter-settings-save');
    if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener('click', () => {
            const userSettings = getLofterUserSettings();

            userSettings.name = document.getElementById('lofter-settings-name').value.trim() || userSettings.name;
            userSettings.id = document.getElementById('lofter-settings-id').value.trim() || userSettings.id;
            userSettings.avatar = document.getElementById('lofter-settings-avatar').value.trim() || userSettings.avatar;
            userSettings.bgImage = document.getElementById('lofter-settings-bg').value.trim() || userSettings.bgImage;

            saveLofterUserSettings(userSettings);
            settingsModal.style.display = 'none';
            renderProfilePage();
            showLofterToast('设置已保存');
        });
    }

    // 点击模态框背景关闭
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    /* =========================================
        10.5 生成设置功能
       ========================================= */

    const genSettingsBtn = document.getElementById('lofter-gen-settings-btn');
    const genSettingsModal = document.getElementById('lofter-gen-settings-modal');
    const genSettingsClose = document.getElementById('lofter-gen-settings-close');
    const genSettingsSave = document.getElementById('lofter-gen-settings-save');

    // 渲染生成设置模态框内容
    function renderGenSettingsModal() {
        const genSettings = getLofterGenSettings();

        // 设置生成数量
        const countInput = document.getElementById('lofter-gen-count');
        if (countInput) {
            countInput.value = genSettings.workCount || 3;
        }

        // 渲染角色列表
        const charactersContainer = document.getElementById('lofter-gen-characters');
        if (charactersContainer) {
            const allCharacters = getAllCharacterProfiles();
            const allowedIds = genSettings.allowedCharacters || [];

            if (allCharacters.length === 0) {
                charactersContainer.innerHTML = '<div class="lofter-gen-empty">暂无角色，请先创建角色</div>';
            } else {
                charactersContainer.innerHTML = allCharacters.map(char => {
                    const isChecked = allowedIds.length === 0 || allowedIds.includes(char.id);
                    return `
                        <label class="lofter-gen-checkbox-item">
                            <input type="checkbox" value="${char.id}" ${isChecked ? 'checked' : ''} />
                            <img src="${char.avatar}" alt="${char.name}" />
                            <span>${char.name}</span>
                        </label>
                    `;
                }).join('');
            }
        }

        // 渲染世界书选择（多选）
        const worldbookContainer = document.getElementById('lofter-gen-worldbook-list');
        if (worldbookContainer) {
            const worldBooks = getAllWorldBooks();
            // 兼容旧版单选：如果存在旧的 worldBookId 则转换为数组
            const selectedIds = genSettings.worldBookIds || (genSettings.worldBookId ? [genSettings.worldBookId] : []);

            if (worldBooks.length === 0) {
                worldbookContainer.innerHTML = '<div class="lofter-gen-empty">暂无世界书</div>';
            } else {
                worldbookContainer.innerHTML = worldBooks.map(wb => {
                    const isChecked = selectedIds.includes(wb.id);
                    return `
                        <label class="lofter-gen-checkbox-item">
                            <input type="checkbox" value="${wb.id}" ${isChecked ? 'checked' : ''} />
                            <span>${wb.name}</span>
                        </label>
                    `;
                }).join('');
            }
        }

        // 渲染文风预设列表
        const presetsContainer = document.getElementById('lofter-gen-style-presets');
        if (presetsContainer) {
            const presets = genSettings.stylePresets && genSettings.stylePresets.length > 0
                ? genSettings.stylePresets
                : [...defaultStylePresets];

            presetsContainer.innerHTML = presets.map((preset, index) => `
                <div class="lofter-gen-preset-item" data-index="${index}">
                    <span class="lofter-gen-preset-text">${preset}</span>
                    <span class="lofter-gen-preset-delete" data-index="${index}">×</span>
                </div>
            `).join('');

            // 绑定删除事件
            presetsContainer.querySelectorAll('.lofter-gen-preset-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.index);
                    deleteStylePreset(index);
                });
            });
        }
    }

    // 删除文风预设
    function deleteStylePreset(index) {
        const genSettings = getLofterGenSettings();
        const presets = genSettings.stylePresets && genSettings.stylePresets.length > 0
            ? genSettings.stylePresets
            : [...defaultStylePresets];

        if (presets.length <= 1) {
            showLofterToast('至少保留一个文风预设');
            return;
        }

        presets.splice(index, 1);
        genSettings.stylePresets = presets;
        saveLofterGenSettings(genSettings);
        renderGenSettingsModal();
    }

    // 添加文风预设
    function addStylePreset() {
        const input = document.getElementById('lofter-gen-new-preset');
        const text = input.value.trim();
        if (!text) {
            showLofterToast('请输入文风预设内容');
            return;
        }

        const genSettings = getLofterGenSettings();
        const presets = genSettings.stylePresets && genSettings.stylePresets.length > 0
            ? genSettings.stylePresets
            : [...defaultStylePresets];

        presets.push(text);
        genSettings.stylePresets = presets;
        saveLofterGenSettings(genSettings);

        input.value = '';
        renderGenSettingsModal();
        showLofterToast('预设已添加');
    }

    // 打开生成设置
    if (genSettingsBtn) {
        genSettingsBtn.addEventListener('click', () => {
            renderGenSettingsModal();
            if (genSettingsModal) {
                genSettingsModal.style.display = 'flex';
            }
        });
    }

    // 关闭生成设置
    if (genSettingsClose) {
        genSettingsClose.addEventListener('click', () => {
            if (genSettingsModal) {
                genSettingsModal.style.display = 'none';
            }
        });
    }

    // 保存生成设置
    if (genSettingsSave) {
        genSettingsSave.addEventListener('click', () => {
            const genSettings = getLofterGenSettings();

            // 获取生成数量
            const countInput = document.getElementById('lofter-gen-count');
            if (countInput) {
                genSettings.workCount = Math.min(Math.max(parseInt(countInput.value) || 3, 1), 10);
            }

            // 获取选中的角色
            const charactersContainer = document.getElementById('lofter-gen-characters');
            if (charactersContainer) {
                const checkboxes = charactersContainer.querySelectorAll('input[type="checkbox"]');
                const selectedIds = [];
                checkboxes.forEach(cb => {
                    if (cb.checked) {
                        selectedIds.push(cb.value);
                    }
                });
                // 如果全选或全不选，存为空数组（表示允许所有角色）
                const allCharacters = getAllCharacterProfiles();
                if (selectedIds.length === 0 || selectedIds.length === allCharacters.length) {
                    genSettings.allowedCharacters = [];
                } else {
                    genSettings.allowedCharacters = selectedIds;
                }
            }

            // 获取世界书选择（多选）
            const worldbookContainer = document.getElementById('lofter-gen-worldbook-list');
            if (worldbookContainer) {
                const checkboxes = worldbookContainer.querySelectorAll('input[type="checkbox"]');
                const selectedWbIds = [];
                checkboxes.forEach(cb => {
                    if (cb.checked) {
                        selectedWbIds.push(cb.value);
                    }
                });
                genSettings.worldBookIds = selectedWbIds;
                // 清除旧的单选字段
                delete genSettings.worldBookId;
            }

            saveLofterGenSettings(genSettings);
            if (genSettingsModal) {
                genSettingsModal.style.display = 'none';
            }
            showLofterToast('生成设置已保存');
        });
    }

    // 添加预设按钮
    const addPresetBtn = document.getElementById('lofter-gen-add-preset-btn');
    if (addPresetBtn) {
        addPresetBtn.addEventListener('click', addStylePreset);
    }

    // 添加预设输入框回车事件
    const newPresetInput = document.getElementById('lofter-gen-new-preset');
    if (newPresetInput) {
        newPresetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addStylePreset();
            }
        });
    }

    // 点击模态框背景关闭
    if (genSettingsModal) {
        genSettingsModal.addEventListener('click', (e) => {
            if (e.target === genSettingsModal) {
                genSettingsModal.style.display = 'none';
            }
        });
    }

    /* =========================================
        11. 生成模式选择和自定义生成
       ========================================= */

    const genModeModal = document.getElementById('lofter-gen-mode-modal');
    const genModeClose = document.getElementById('lofter-gen-mode-close');
    const customGenModal = document.getElementById('lofter-custom-gen-modal');
    const customGenClose = document.getElementById('lofter-custom-gen-close');
    const customGenSubmit = document.getElementById('lofter-custom-gen-submit');

    // 打开生成模式选择弹窗
    function openGenModeModal() {
        if (genModeModal) {
            genModeModal.style.display = 'flex';
        }
    }

    // 关闭生成模式选择弹窗
    if (genModeClose) {
        genModeClose.addEventListener('click', () => {
            if (genModeModal) genModeModal.style.display = 'none';
        });
    }

    // 点击模态框背景关闭
    if (genModeModal) {
        genModeModal.addEventListener('click', (e) => {
            if (e.target === genModeModal) {
                genModeModal.style.display = 'none';
            }
        });
    }

    // 生成模式选项点击
    document.querySelectorAll('.lofter-gen-mode-item').forEach(item => {
        item.addEventListener('click', () => {
            const mode = item.dataset.mode;
            if (genModeModal) genModeModal.style.display = 'none';

            if (mode === 'free') {
                // 自由生成 - 使用原有逻辑
                generateFanWorks();
            } else if (mode === 'custom') {
                // 按设定生成 - 打开自定义生成弹窗
                openCustomGenModal();
            }
        });
    });

    // 打开自定义生成弹窗
    function openCustomGenModal() {
        renderCustomGenModal();
        if (customGenModal) {
            customGenModal.style.display = 'flex';
        }
    }

    // 渲染自定义生成弹窗内容
    function renderCustomGenModal() {
        const characters = getAllCharacterProfiles();

        // 渲染作品类型选择（从代码中的 WORK_TYPE_CONFIG 读取，不经过数据库）
        const workTypeSelect = document.getElementById('lofter-custom-work-type');
        if (workTypeSelect) {
            workTypeSelect.innerHTML = '';
            Object.entries(WORK_TYPE_CONFIG).forEach(([value, typeInfo]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = typeInfo.name;
                workTypeSelect.appendChild(option);
            });
        }

        // 渲染主角选择（多选）
        const protagonistContainer = document.getElementById('lofter-custom-protagonist');
        if (protagonistContainer) {
            protagonistContainer.innerHTML = '';
            characters.forEach(char => {
                const item = document.createElement('div');
                item.className = 'lofter-custom-char-item';
                item.dataset.id = char.id;
                item.innerHTML = `
                    <img src="${char.avatar}" alt="${char.name}">
                    <span>${char.name}</span>
                `;
                item.addEventListener('click', () => {
                    // 多选
                    item.classList.toggle('selected');
                });
                protagonistContainer.appendChild(item);
            });
        }

        // 渲染配角选择
        const supportingContainer = document.getElementById('lofter-custom-supporting');
        if (supportingContainer) {
            supportingContainer.innerHTML = '';
            characters.forEach(char => {
                const item = document.createElement('div');
                item.className = 'lofter-custom-char-item';
                item.dataset.id = char.id;
                item.innerHTML = `
                    <img src="${char.avatar}" alt="${char.name}">
                    <span>${char.name}</span>
                `;
                item.addEventListener('click', () => {
                    // 多选
                    item.classList.toggle('selected');
                });
                supportingContainer.appendChild(item);
            });
        }

        // 渲染文风选择
        const genSettings = getLofterGenSettings();
        const stylePresets = genSettings.stylePresets && genSettings.stylePresets.length > 0
            ? genSettings.stylePresets
            : defaultStylePresets;

        const styleSelect = document.getElementById('lofter-custom-style');
        if (styleSelect) {
            styleSelect.innerHTML = '<option value="">随机选择</option>';
            stylePresets.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = preset.length > 30 ? preset.substring(0, 30) + '...' : preset;
                styleSelect.appendChild(option);
            });
        }
    }

    // 关闭自定义生成弹窗
    if (customGenClose) {
        customGenClose.addEventListener('click', () => {
            if (customGenModal) customGenModal.style.display = 'none';
        });
    }

    // 点击模态框背景关闭
    if (customGenModal) {
        customGenModal.addEventListener('click', (e) => {
            if (e.target === customGenModal) {
                customGenModal.style.display = 'none';
            }
        });
    }

    // 提交自定义生成
    if (customGenSubmit) {
        customGenSubmit.addEventListener('click', async () => {
            // 获取选中的主角（多选）
            const protagonistEls = document.querySelectorAll('#lofter-custom-protagonist .lofter-custom-char-item.selected');
            if (protagonistEls.length === 0) {
                showLofterToast('请至少选择一个主角');
                return;
            }
            const protagonistIds = Array.from(protagonistEls).map(el => el.dataset.id);

            // 获取选中的配角
            const supportingEls = document.querySelectorAll('#lofter-custom-supporting .lofter-custom-char-item.selected');
            const supportingIds = Array.from(supportingEls).map(el => el.dataset.id);

            // 获取其他设置
            const workType = document.getElementById('lofter-custom-work-type')?.value || 'short_story';
            const styleIndex = document.getElementById('lofter-custom-style')?.value;
            const wordCount = document.getElementById('lofter-custom-word-count')?.value || '800';
            const plotHint = document.getElementById('lofter-custom-plot-hint')?.value.trim() || '';

            // 关闭弹窗
            if (customGenModal) customGenModal.style.display = 'none';

            // 调用自定义生成
            await generateCustomWork(protagonistIds, supportingIds, workType, styleIndex, wordCount, plotHint);
        });
    }

    // 构建自定义生成提示词
    function buildCustomGenerationPrompt(protagonists, supportingChars, workType, stylePreset, wordCount, plotHint, worldBookContent) {
        // 主角信息（支持多主角）
        let protagonistInfo = '';
        if (protagonists.length === 1) {
            protagonistInfo = `【主角】${protagonists[0].name}\n【完整人设】\n${protagonists[0].persona}`;
        } else {
            protagonistInfo = '【主角群像】\n' + protagonists.map(p => {
                return `◆ ${p.name}：\n${p.persona}`;
            }).join('\n\n');
        }

        // 配角信息
        let supportingInfo = '';
        if (supportingChars && supportingChars.length > 0) {
            supportingInfo = '\n\n【配角角色】\n' + supportingChars.map(c => {
                return `◇ ${c.name}：\n${c.persona}`;
            }).join('\n\n');
        }

        // 作品类型详细说明（从统一配置 WORK_TYPE_CONFIG 读取）
        const typeInfo = WORK_TYPE_CONFIG[workType] || WORK_TYPE_CONFIG['short_story'];

        // 世界书设定
        let worldBookSection = '';
        if (worldBookContent) {
            worldBookSection = `\n\n## 📚 世界观设定背景：
请严格遵循以下世界观设定进行创作，确保作品与设定相符：
${worldBookContent}`;
        }

        // 文风要求
        let styleSection = '';
        if (stylePreset) {
            styleSection = `\n\n## ✍️ 文风与写作风格要求：
请按照以下风格特点进行创作，贯穿全文：
${stylePreset}

具体要求：
- 语言风格需保持一致
- 叙事节奏符合文风特点
- 对话和描写要体现风格特色`;
        }

        // 剧情提示
        let plotSection = '';
        if (plotHint) {
            plotSection = `\n\n## 🎬 剧情方向与创作提示：
请围绕以下主题/场景/梗进行创作：
${plotHint}

创作建议：
- 将提示元素自然融入故事
- 可以创意发挥但不偏离主题
- 注意情感铺垫和氛围营造`;
        }

        // 角色互动指导
        let interactionGuide = '';
        const protagonistNames = protagonists.map(p => p.name).join('、');
        if (protagonists.length > 1 || supportingChars.length > 0) {
            let guideContent = '';
            if (protagonists.length > 1) {
                guideContent += `- 多主角群像故事，${protagonistNames}均为核心角色\n- 合理分配每个主角的戏份和视角\n- 注重主角之间的互动和关系发展`;
            } else {
                guideContent += `- 主角${protagonistNames}是故事的核心视角`;
            }
            if (supportingChars.length > 0) {
                guideContent += `\n- 配角${supportingChars.map(c => c.name).join('、')}需要有适当的戏份和互动`;
            }
            guideContent += `\n- 注意角色之间的关系发展和情感张力\n- 对话要符合每个角色的性格特点`;
            interactionGuide = `\n\n## 💫 角色互动指导：\n${guideContent}`;
        }

        return `你是一位资深的同人文创作者，擅长根据角色人设创作高质量的同人作品。请基于以下详细设定，创作一篇精彩的同人作品。

═══════════════════════════════════════
📖 角色资料卡
═══════════════════════════════════════

${protagonistInfo}${supportingInfo}${worldBookSection}${styleSection}${plotSection}${interactionGuide}

═══════════════════════════════════════
📝 创作要求
═══════════════════════════════════════

【作品类型】${typeInfo.name}
${typeInfo.desc}

【字数要求】约 ${wordCount} 字
- 请严格控制在 ${Math.floor(wordCount * 0.9)} ~ ${Math.floor(wordCount * 1.1)} 字范围内
- 内容充实，不要为凑字数而注水
- 如果是长篇类型，确保情节完整不仓促

【内容质量要求】
1. 开头要引人入胜，迅速抓住读者注意力
2. 人物塑造要立体，对话要生动有个性
3. 情节发展要合理，转折要有铺垫
4. 情感描写要细腻，能引起读者共鸣
5. 结尾要有余韵，让人回味

【必须包含的元素】
- 一个有创意的作者笔名（符合同人圈风格）
- 一个吸引人的标题（可以是诗意的、有梗的或直接点题的）
- 3-5个精准的标签：CP标签（如"XX×XX"）、主题标签（如"校园AU"、"原著向"）、情感标签（如"甜宠"、"虐心"）
- 一段真诚的"作者有话说"（50-150字，可以聊聊创作灵感、心路历程、碎碎念等）
- 2-4条精彩的读者评论（模拟同人圈读者的真实反应，可以是尖叫、催更、深度分析等）

【可选元素】
- 彩蛋内容：番外小剧场、角色花絮、if线等（如果添加，需设置5-30的糖果券解锁价格）
- 如果是 short_series 或 long_serial 类型，必须提供合集名(collectionName)和章节号(chapterNum)

═══════════════════════════════════════
📤 输出格式（严格JSON）
═══════════════════════════════════════

{
  "type": "${workType}",
  "authorName": "作者笔名",
  "title": "作品标题（如果是长篇连载，标题必须为【第1章 标题】）",
  "content": "作品正文内容（必须达到${wordCount}字左右）",
  "tags": ["CP标签", "主题标签", "情感标签", "其他标签"],
  "authorNotes": "作者有话说的内容",
  "hasBonus": true或false,
  "bonusContent": "彩蛋内容（如果hasBonus为true）",
  "bonusCost": 5到30之间的数字,
  "collectionName": "合集名（short_series和long_serial必填）",
  "comments": [
    {"name": "评论者昵称", "text": "评论内容（要符合同人圈氛围）"},
    {"name": "评论者昵称2", "text": "评论内容2"}
  ]
}

⚠️ 注意：直接输出JSON，不要添加任何markdown代码块标记或其他说明文字。`;
    }

    // 自定义生成作品
    async function generateCustomWork(protagonistIds, supportingIds, workType, styleIndex, wordCount, plotHint) {
        const overlay = document.getElementById('lofter-generating-overlay');
        const progressEl = document.getElementById('lofter-generating-progress');

        // 检查API配置
        const apiConfig = window.state?.apiConfig;
        if (!apiConfig || !apiConfig.proxyUrl || !apiConfig.apiKey) {
            showLofterToast('请先在设置中配置API');
            return;
        }

        // 获取角色信息
        const allCharacters = getAllCharacterProfiles();
        const protagonists = allCharacters.filter(c => protagonistIds.includes(c.id));
        if (protagonists.length === 0) {
            showLofterToast('未找到主角信息');
            return;
        }

        const supportingChars = allCharacters.filter(c => supportingIds.includes(c.id));

        // 获取生成设置
        const genSettings = getLofterGenSettings();

        // 获取世界书内容（兼容旧版单选和新版多选）
        let worldBookContent = '';
        const wbIds = genSettings.worldBookIds || (genSettings.worldBookId ? [genSettings.worldBookId] : []);
        if (wbIds.length > 0) {
            worldBookContent = await getWorldBookContent(wbIds);
        }

        // 获取文风预设
        const stylePresets = genSettings.stylePresets && genSettings.stylePresets.length > 0
            ? genSettings.stylePresets
            : defaultStylePresets;

        let selectedStyle = '';
        if (styleIndex !== '' && styleIndex !== undefined) {
            selectedStyle = stylePresets[parseInt(styleIndex)] || '';
        } else {
            // 随机选择
            selectedStyle = stylePresets[Math.floor(Math.random() * stylePresets.length)];
        }

        overlay.style.display = 'flex';
        progressEl.textContent = '正在按设定生成作品...';

        try {
            const prompt = buildCustomGenerationPrompt(protagonists, supportingChars, workType, selectedStyle, wordCount, plotHint, worldBookContent);

            // 调用API
            let responseData = await callLofterAI(prompt);

            // 移除思维链标签后解析JSON
            responseData = stripThinkingTags(responseData);
            const work = repairAndParseJSON(responseData);
            const now = Date.now();
            const authorId = 'author_' + generateId();

            // 处理合集
            let collectionId = null;
            let chapterNum = null;
            if ((work.type === 'short_series' || work.type === 'long_serial') && work.collectionName) {
                const collections = getLofterCollections();
                let collection = collections.find(c => c.authorId === authorId && c.name === work.collectionName);

                if (collection) {
                    // 如果合集已存在，章节号为现有章节数+1
                    chapterNum = collection.articleIds.length + 1;
                } else {
                    // 如果是新合集，章节号为1
                    chapterNum = 1;
                }

                // 准备生成设定（首次创建时保存，包含剧情提示词）
                const generationSettings = {
                    protagonistIds,
                    supportingIds,
                    workType: work.type,
                    styleIndex: styleIndex !== undefined ? styleIndex.toString() : '',
                    wordCount: wordCount,
                    worldBookIds: wbIds,
                    plotHint: plotHint || ''
                };

                collection = getOrCreateCollection(
                    authorId,
                    work.authorName,
                    work.collectionName,
                    work.type === 'short_series' ? 'series' : 'serial',
                    generationSettings
                );
                collectionId = collection.id;
            }

            // 处理AI生成的评论
            let generatedComments = [];
            if (work.comments && Array.isArray(work.comments)) {
                const commentAvatars = [
                    'https://api.dicebear.com/7.x/notionists/svg?seed=custom1',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=custom2',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=custom3',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=custom4'
                ];
                generatedComments = work.comments.map((c, idx) => ({
                    id: generateId(),
                    name: c.name || `读者${idx + 1}`,
                    avatar: commentAvatars[idx % commentAvatars.length],
                    text: c.text || c.content || '写得太棒了！',
                    timestamp: now
                }));
            }

            // 创建文章对象
            const newArticle = {
                id: generateId(),
                authorId: authorId,
                authorName: work.authorName,
                authorAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(work.authorName)}`,
                title: work.title,
                content: work.content,
                images: [],
                tags: work.tags || [],
                workType: work.type,
                authorNotes: work.authorNotes || '',
                hasBonus: work.hasBonus || false,
                bonusContent: work.bonusContent || '',
                bonusCost: work.bonusCost || 10,
                bonusUnlocked: false,
                collectionId: collectionId,
                collectionName: work.collectionName || null,
                chapterNum: chapterNum,
                likes: 0,
                collects: Math.floor(Math.random() * 100) + 10,
                comments: generatedComments,
                tips: [],
                views: 0,
                timestamp: now,
                isLiked: false,
                isCollected: false,
                isAIGenerated: true,
                isCustomGenerated: true // 标记为自定义生成
            };
            // 确保点赞数 < 阅读数
            newArticle.views = Math.floor(Math.random() * 2000) + 100;
            newArticle.likes = Math.floor(Math.random() * newArticle.views * 0.5) + 10;

            let articles = await getLofterArticles();
            articles.unshift(newArticle);
            await saveLofterArticles(articles);

            // 添加到合集
            if (collectionId) {
                addArticleToCollection(collectionId, newArticle.id);
            }

            renderDiscoverFeed();
            showLofterToast('作品生成成功！');

        } catch (error) {
            console.error('自定义生成失败:', error);
            showLofterToast('生成失败: ' + error.message);
        } finally {
            overlay.style.display = 'none';
        }
    }

    /* =========================================
        12. 乐乎币/糖果券充值兑换
       ========================================= */

    const coinsRechargeModal = document.getElementById('lofter-coins-recharge-modal');
    const coinsRechargeClose = document.getElementById('lofter-coins-recharge-close');
    const candyExchangeModal = document.getElementById('lofter-candy-exchange-modal');
    const candyExchangeClose = document.getElementById('lofter-candy-exchange-close');

    // 点击乐乎币卡片打开充值弹窗
    const coinsCard = document.querySelector('.lofter-account-card:has(#lofter-coins)');
    if (coinsCard) {
        coinsCard.style.cursor = 'pointer';
        coinsCard.addEventListener('click', () => {
            openCoinsRechargeModal();
        });
    }

    // 点击糖果券卡片打开兑换弹窗
    const candyCard = document.querySelector('.lofter-account-card:has(#lofter-candy)');
    if (candyCard) {
        candyCard.style.cursor = 'pointer';
        candyCard.addEventListener('click', () => {
            openCandyExchangeModal();
        });
    }

    // 打开乐乎币充值弹窗
    function openCoinsRechargeModal() {
        const userSettings = getLofterUserSettings();

        // 更新当前乐乎币余额显示
        const currentCoinsEl = document.getElementById('lofter-recharge-coins-current');
        if (currentCoinsEl) {
            currentCoinsEl.textContent = userSettings.coins || 0;
        }

        // 获取用户钱包余额（从淘宝的 state.globalSettings.userBalance 读取）
        const walletBalance = state?.globalSettings?.userBalance || 0;
        const walletBalanceEl = document.getElementById('lofter-wallet-balance');
        if (walletBalanceEl) {
            walletBalanceEl.textContent = walletBalance.toFixed(2);
        }

        if (coinsRechargeModal) {
            coinsRechargeModal.style.display = 'flex';
        }
    }

    // 关闭乐乎币充值弹窗
    if (coinsRechargeClose) {
        coinsRechargeClose.addEventListener('click', () => {
            if (coinsRechargeModal) coinsRechargeModal.style.display = 'none';
        });
    }

    if (coinsRechargeModal) {
        coinsRechargeModal.addEventListener('click', (e) => {
            if (e.target === coinsRechargeModal) {
                coinsRechargeModal.style.display = 'none';
            }
        });
    }

    // 充值选项点击
    document.querySelectorAll('.lofter-recharge-option').forEach(option => {
        option.addEventListener('click', async () => {
            const amount = parseInt(option.dataset.amount);
            const cost = parseInt(option.dataset.cost);

            // 获取用户钱包余额（从淘宝的 state.globalSettings.userBalance）
            const walletBalance = state?.globalSettings?.userBalance || 0;

            if (walletBalance < cost) {
                showLofterToast('钱包余额不足');
                return;
            }

            // 扣除钱包余额并记录交易（与淘宝一致的方式）
            state.globalSettings.userBalance = walletBalance - cost;

            const newTransaction = {
                type: 'expense',
                amount: cost,
                description: `购买 ${amount} 乐乎币`,
                timestamp: Date.now(),
            };

            // 使用数据库事务，确保余额和交易记录同时更新
            if (window.db && window.db.globalSettings && window.db.userWalletTransactions) {
                await window.db.transaction('rw', window.db.globalSettings, window.db.userWalletTransactions, async () => {
                    await window.db.globalSettings.put(state.globalSettings);
                    await window.db.userWalletTransactions.add(newTransaction);
                });
            }

            // 增加乐乎币
            const userSettings = getLofterUserSettings();
            userSettings.coins = (userSettings.coins || 0) + amount;
            saveLofterUserSettings(userSettings);

            // 更新显示
            const currentCoinsEl = document.getElementById('lofter-recharge-coins-current');
            if (currentCoinsEl) {
                currentCoinsEl.textContent = userSettings.coins;
            }
            const walletBalanceEl = document.getElementById('lofter-wallet-balance');
            if (walletBalanceEl) {
                walletBalanceEl.textContent = state.globalSettings.userBalance.toFixed(2);
            }
            const coinsDisplay = document.getElementById('lofter-coins');
            if (coinsDisplay) {
                coinsDisplay.textContent = userSettings.coins;
            }

            showLofterToast(`充值成功！获得 ${amount} 乐乎币`);
        });
    });

    // 打开糖果券兑换弹窗
    function openCandyExchangeModal() {
        const userSettings = getLofterUserSettings();

        // 更新余额显示
        const coinsEl = document.getElementById('lofter-exchange-coins');
        const candyEl = document.getElementById('lofter-exchange-candy');
        if (coinsEl) coinsEl.textContent = `${userSettings.coins || 0} 🪙`;
        if (candyEl) candyEl.textContent = `${userSettings.candy || 0} 🍬`;

        if (candyExchangeModal) {
            candyExchangeModal.style.display = 'flex';
        }
    }

    // 关闭糖果券兑换弹窗
    if (candyExchangeClose) {
        candyExchangeClose.addEventListener('click', () => {
            if (candyExchangeModal) candyExchangeModal.style.display = 'none';
        });
    }

    if (candyExchangeModal) {
        candyExchangeModal.addEventListener('click', (e) => {
            if (e.target === candyExchangeModal) {
                candyExchangeModal.style.display = 'none';
            }
        });
    }

    // 兑换选项点击
    document.querySelectorAll('.lofter-exchange-option').forEach(option => {
        option.addEventListener('click', () => {
            const coinsNeeded = parseInt(option.dataset.coins);
            const candyAmount = parseInt(option.dataset.candy);

            const userSettings = getLofterUserSettings();
            if ((userSettings.coins || 0) < coinsNeeded) {
                showLofterToast('乐乎币不足');
                return;
            }

            // 扣除乐乎币
            userSettings.coins = (userSettings.coins || 0) - coinsNeeded;
            // 增加糖果券
            userSettings.candy = (userSettings.candy || 0) + candyAmount;
            saveLofterUserSettings(userSettings);

            // 更新弹窗显示
            const coinsEl = document.getElementById('lofter-exchange-coins');
            const candyEl = document.getElementById('lofter-exchange-candy');
            if (coinsEl) coinsEl.textContent = `${userSettings.coins} 🪙`;
            if (candyEl) candyEl.textContent = `${userSettings.candy} 🍬`;

            // 更新页面显示
            const coinsDisplay = document.getElementById('lofter-coins');
            const candyDisplay = document.getElementById('lofter-candy');
            if (coinsDisplay) coinsDisplay.textContent = userSettings.coins;
            if (candyDisplay) candyDisplay.textContent = userSettings.candy;

            showLofterToast(`兑换成功！获得 ${candyAmount} 糖果券`);
        });
    });

    /* =========================================
        13. 应用入口
       ========================================= */

    // 点击桌面图标打开Lofter
    if (lofterAppIcon) {
        lofterAppIcon.addEventListener('click', () => {
            if (window.showScreen) {
                window.showScreen('lofter-screen');
            }
            // 初始化首页
            switchView('home');
            renderDiscoverFeed();
        });
    }

    // 我的消息菜单项点击
    document.querySelectorAll('.lofter-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            showLofterToast(`功能开发中: ${action}`);
        });
    });

    // 创作者中心菜单项点击
    document.querySelectorAll('.lofter-menu-row').forEach(row => {
        row.addEventListener('click', () => {
            const action = row.dataset.action;
            showLofterToast(`功能开发中: ${action}`);
        });
    });

    // 生成按钮点击 - 打开模式选择
    if (generateWorksBtn) {
        generateWorksBtn.addEventListener('click', () => {
            openGenModeModal();
        });
    }

    // 初始化打赏礼物事件
    setupTipGifts();

    /* =========================================
        标签详情页
       ========================================= */

    // 打开标签详情页
    async function openTagDetailPage(tag) {
        const articles = await getLofterArticles();
        const tagArticles = articles.filter(a => a.tags && a.tags.includes(tag));
        tagArticles.sort((a, b) => b.timestamp - a.timestamp);

        // 设置标题
        document.getElementById('lofter-tag-detail-title').textContent = `#${tag}`;

        // 渲染作品列表
        const content = document.getElementById('lofter-tag-detail-content');
        content.innerHTML = '';

        if (tagArticles.length === 0) {
            content.innerHTML = `
                <div class="lofter-empty-state">
                    <div class="lofter-empty-icon">📝</div>
                    <p>该标签下还没有作品</p>
                </div>
            `;
        } else {
            // 使用瀑布流布局
            const leftCol = document.createElement('div');
            leftCol.className = 'lofter-waterfall-column';
            const rightCol = document.createElement('div');
            rightCol.className = 'lofter-waterfall-column';

            content.appendChild(leftCol);
            content.appendChild(rightCol);

            tagArticles.forEach((article, index) => {
                const card = createWaterfallCard(article);
                if (index % 2 === 0) {
                    leftCol.appendChild(card);
                } else {
                    rightCol.appendChild(card);
                }
            });
        }

        // 切换到标签详情视图
        switchView('tagDetail');
    }

    // 标签详情返回按钮
    const tagDetailBackBtn = document.getElementById('lofter-tag-detail-back');
    if (tagDetailBackBtn) {
        tagDetailBackBtn.addEventListener('click', () => {
            switchView('subscribe');
        });
    }

    /* =========================================
        合集详情页
       ========================================= */

    // 当前合集排序方式（true=顺序，false=倒序）
    let collectionSortAsc = true;

    // 打开合集详情页
    async function openCollectionDetailPage(collectionId) {
        const collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const articles = await getLofterArticles();

        // 设置标题
        document.getElementById('lofter-collection-detail-title').textContent = collection.name;

        // 更新订阅按钮状态
        const subscribeBtn = document.getElementById('lofter-collection-subscribe-btn');
        const subscribedCollections = getSubscribedCollections();
        const isSubscribed = subscribedCollections.includes(collectionId);
        subscribeBtn.textContent = isSubscribed ? '已订阅' : '+ 订阅';
        subscribeBtn.classList.toggle('subscribed', isSubscribed);

        // 订阅按钮点击事件
        subscribeBtn.onclick = () => {
            if (isSubscribed) {
                unsubscribeCollection(collectionId);
                showLofterToast('已取消订阅');
            } else {
                subscribeCollection(collectionId);
                showLofterToast('订阅成功');
            }
            openCollectionDetailPage(collectionId); // 刷新页面
        };

        // 渲染合集信息
        const infoContainer = document.getElementById('lofter-collection-detail-info');
        infoContainer.innerHTML = `
            <div class="lofter-collection-header-card">
                <div class="lofter-collection-cover-section">
                    <div class="lofter-collection-cover-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                    </div>
                </div>
                <div class="lofter-collection-info-section">
                    <h2 class="lofter-collection-name">${collection.name}</h2>
                    <div class="lofter-collection-author">${collection.authorName}</div>
                    <div class="lofter-collection-stats">
                        <span class="lofter-collection-stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                            ${collection.articleIds.length}章
                        </span>
                        <span class="lofter-collection-stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            ${collection.articleIds.reduce((sum, id) => {
            const article = articles.find(a => a.id === id);
            return sum + (article?.views || 0);
        }, 0)} 阅读
                        </span>
                    </div>
                    <div class="lofter-collection-type-badge">${collection.workType === 'series' ? '短篇系列' : '长篇连载'}</div>
                </div>
            </div>
            <div class="lofter-collection-action-bar">
                <button class="lofter-collection-action-btn-new" id="lofter-collection-settings-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6"></path>
                        <path d="M16.24 7.76l-2.12 2.12m-4.24 4.24l-2.12 2.12m8.48 0l-2.12-2.12m-4.24-4.24L7.76 7.76"></path>
                    </svg>
                    <span>故事设定</span>
                </button>
                <button class="lofter-collection-action-btn-new lofter-collection-update-btn-new" id="lofter-collection-update-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>催更下一章</span>
                </button>
            </div>
        `;

        // 设定按钮点击事件
        document.getElementById('lofter-collection-settings-btn').onclick = () => {
            openCollectionSettingsPage(collectionId);
        };

        // 催更按钮点击事件
        document.getElementById('lofter-collection-update-btn').onclick = () => {
            openCollectionUpdateModal(collectionId);
        };

        // 渲染作品列表
        renderCollectionWorks(collection, articles);

        // 排序按钮点击事件
        const sortBtn = document.getElementById('lofter-collection-sort-btn');
        sortBtn.onclick = () => {
            collectionSortAsc = !collectionSortAsc;
            renderCollectionWorks(collection, articles);
            showLofterToast(collectionSortAsc ? '切换为顺序' : '切换为倒序');
        };

        // 切换到合集详情视图
        switchView('collectionDetail');
    }

    // 渲染合集中的作品列表
    function renderCollectionWorks(collection, articles) {
        const content = document.getElementById('lofter-collection-detail-content');
        content.innerHTML = '';

        if (collection.articleIds.length === 0) {
            content.innerHTML = `
                <div class="lofter-empty-state">
                    <div class="lofter-empty-icon">📚</div>
                    <p>合集中还没有作品</p>
                </div>
            `;
            return;
        }

        // 获取合集中的文章并排序
        const collectionArticles = collection.articleIds.map(aid => {
            return articles.find(a => a.id === aid);
        }).filter(a => a); // 过滤掉不存在的文章

        // 根据排序方式调整顺序
        if (!collectionSortAsc) {
            collectionArticles.reverse();
        }

        // 创建作品列表
        collectionArticles.forEach((article, index) => {
            const chapterIndex = collectionSortAsc ? index + 1 : collectionArticles.length - index;
            const itemEl = document.createElement('div');
            itemEl.className = 'lofter-collection-chapter-item';

            const hasCover = article.images && article.images.length > 0;
            const coverImg = hasCover ? article.images[0] : null;

            itemEl.innerHTML = `
                <div class="lofter-chapter-number">
                    <span class="lofter-chapter-num-text">${article.chapterNum || chapterIndex}</span>
                </div>
                <div class="lofter-chapter-content-wrapper">
                    <div class="lofter-chapter-text-info">
                        <div class="lofter-chapter-title-new">${article.title}</div>
                        <div class="lofter-chapter-meta-new">
                            <span class="lofter-chapter-date">${formatLofterDate(article.timestamp)}</span>
                            <span class="lofter-chapter-stats">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                ${article.views || 0}
                            </span>
                            <span class="lofter-chapter-stats">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                ${article.likes || 0}
                            </span>
                        </div>
                    </div>
                    ${hasCover ? `<img src="${coverImg}" class="lofter-chapter-thumb" alt="封面">` : ''}
                </div>
            `;

            itemEl.addEventListener('click', () => {
                openArticleDetail(article.id);
            });

            content.appendChild(itemEl);
        });
    }

    // 合集详情返回按钮
    const collectionDetailBackBtn = document.getElementById('lofter-collection-detail-back');
    if (collectionDetailBackBtn) {
        collectionDetailBackBtn.addEventListener('click', () => {
            switchView('subscribe');
        });
    }

    /* =========================================
        故事设定页面（复用自定义生成页面）
       ========================================= */

    // 当前正在编辑设定的合集ID
    let currentEditingCollectionId = null;

    // 打开故事设定页面（复用自定义生成弹窗）
    function openCollectionSettingsPage(collectionId) {
        const collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        currentEditingCollectionId = collectionId;

        // 获取合集的生成设定，如果没有则使用默认值
        const settings = collection.generationSettings || {
            protagonistIds: [],
            supportingIds: [],
            workType: collection.workType === 'series' ? 'short_series' : 'long_serial',
            styleIndex: '',
            wordCount: 1500,
            worldBookIds: [],
            plotHint: ''
        };

        // 复用自定义生成弹窗并修改标题和按钮文本
        const modal = document.getElementById('lofter-custom-gen-modal');
        const modalTitle = modal.querySelector('.modal-header span:nth-child(2)');
        const submitBtn = document.getElementById('lofter-custom-gen-submit');
        const originalTitle = modalTitle.textContent;
        const originalBtnText = submitBtn.textContent;
        modalTitle.textContent = '故事设定';
        submitBtn.textContent = '确定';

        // 预填充数据
        renderCustomGenModal();

        // 设置选中的角色
        setTimeout(() => {
            // 主角
            document.querySelectorAll('#lofter-custom-protagonist .lofter-custom-char-item').forEach(item => {
                if (settings.protagonistIds.includes(item.dataset.id)) {
                    item.classList.add('selected');
                }
            });

            // 配角
            document.querySelectorAll('#lofter-custom-supporting .lofter-custom-char-item').forEach(item => {
                if (settings.supportingIds.includes(item.dataset.id)) {
                    item.classList.add('selected');
                }
            });

            // 作品类型
            const workTypeSelect = document.getElementById('lofter-custom-work-type');
            if (workTypeSelect) workTypeSelect.value = settings.workType;

            // 文风
            const styleSelect = document.getElementById('lofter-custom-style');
            if (styleSelect) styleSelect.value = settings.styleIndex;

            // 字数
            const wordCountInput = document.getElementById('lofter-custom-word-count');
            if (wordCountInput) wordCountInput.value = settings.wordCount;

            // 剧情提示词
            const plotHintInput = document.getElementById('lofter-custom-plot-hint');
            if (plotHintInput) plotHintInput.value = settings.plotHint || '';
        }, 50);

        modal.style.display = 'flex';

        // 临时移除原有的事件监听器，然后添加新的（通过克隆替换按钮）
        const submitBtnClone = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(submitBtnClone, submitBtn);
        const closeBtnTemp = document.getElementById('lofter-custom-gen-close');
        const closeBtnClone = closeBtnTemp.cloneNode(true);
        closeBtnTemp.parentNode.replaceChild(closeBtnClone, closeBtnTemp);

        // 重新获取替换后的元素
        const newSubmitBtn = document.getElementById('lofter-custom-gen-submit');
        const newCloseBtn = document.getElementById('lofter-custom-gen-close');

        // 定义故事设定保存函数
        const saveSettingsHandler = () => {
            const protagonistEls = document.querySelectorAll('#lofter-custom-protagonist .lofter-custom-char-item.selected');
            if (protagonistEls.length === 0) {
                showLofterToast('请至少选择一个主角');
                return;
            }
            const protagonistIds = Array.from(protagonistEls).map(el => el.dataset.id);

            const supportingEls = document.querySelectorAll('#lofter-custom-supporting .lofter-custom-char-item.selected');
            const supportingIds = Array.from(supportingEls).map(el => el.dataset.id);

            const workType = document.getElementById('lofter-custom-work-type')?.value || 'long_serial';
            const styleIndex = document.getElementById('lofter-custom-style')?.value;
            const wordCount = parseInt(document.getElementById('lofter-custom-word-count')?.value) || 1500;
            const plotHint = document.getElementById('lofter-custom-plot-hint')?.value.trim() || '';

            const newSettings = {
                protagonistIds,
                supportingIds,
                workType,
                styleIndex,
                wordCount,
                plotHint
            };

            updateCollectionSettings(currentEditingCollectionId, newSettings);
            showLofterToast('设定已保存');

            // 恢复标题、按钮文本和状态
            modal.style.display = 'none';
            modalTitle.textContent = originalTitle;
            newSubmitBtn.textContent = originalBtnText;
            currentEditingCollectionId = null;

            // 恢复原始按钮（带有原始事件监听器）
            newSubmitBtn.parentNode.replaceChild(submitBtn, newSubmitBtn);
            newCloseBtn.parentNode.replaceChild(closeBtnTemp, newCloseBtn);
        };

        // 定义关闭函数
        const closeSettingsHandler = () => {
            modal.style.display = 'none';
            modalTitle.textContent = originalTitle;
            newSubmitBtn.textContent = originalBtnText;
            currentEditingCollectionId = null;

            // 恢复原始按钮（带有原始事件监听器）
            newSubmitBtn.parentNode.replaceChild(submitBtn, newSubmitBtn);
            newCloseBtn.parentNode.replaceChild(closeBtnTemp, newCloseBtn);
        };

        // 添加临时事件监听器
        newSubmitBtn.addEventListener('click', saveSettingsHandler);
        newCloseBtn.addEventListener('click', closeSettingsHandler);
    }

    /* =========================================
        催更功能和章节概要生成
       ========================================= */

    // 打开催更弹窗
    function openCollectionUpdateModal(collectionId) {
        const collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        // 检查是否有生成设定
        if (!collection.generationSettings) {
            showLofterToast('请先配置故事设定');
            return;
        }

        // 创建催更弹窗
        const modal = document.createElement('div');
        modal.className = 'lofter-update-modal';
        modal.innerHTML = `
            <div class="lofter-update-modal-content">
                <div class="lofter-update-modal-header">
                    <span>催更下一章</span>
                    <span class="lofter-update-modal-close">×</span>
                </div>
                <div class="lofter-update-modal-body">
                    <div class="lofter-update-hint">💡 您可以提示接下来的剧情走向</div>
                    <textarea class="lofter-update-plot-input" placeholder="例如：主角终于向对方表白...（选填，留空则AI自由发挥）" id="lofter-update-plot-input"></textarea>
                </div>
                <div class="lofter-update-modal-footer">
                    <button class="lofter-update-cancel-btn">取消</button>
                    <button class="lofter-update-submit-btn" id="lofter-update-submit-btn">立即生成</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 关闭按钮
        modal.querySelector('.lofter-update-modal-close').onclick = () => {
            modal.remove();
        };

        modal.querySelector('.lofter-update-cancel-btn').onclick = () => {
            modal.remove();
        };

        // 点击遮罩关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        // 提交生成
        document.getElementById('lofter-update-submit-btn').onclick = async () => {
            const userPlotHint = document.getElementById('lofter-update-plot-input').value.trim();
            modal.remove();
            // 合并合集存储的剧情提示词和用户本次输入的提示词
            const storedPlotHint = collection.generationSettings?.plotHint || '';
            let mergedPlotHint = '';
            if (storedPlotHint && userPlotHint) {
                mergedPlotHint = `【合集剧情设定】${storedPlotHint}\n\n【本章剧情提示】${userPlotHint}`;
            } else {
                mergedPlotHint = userPlotHint || storedPlotHint;
            }
            await generateNextChapter(collectionId, mergedPlotHint);
        };
    }

    // 生成下一章节
    async function generateNextChapter(collectionId, plotHint = '') {
        const overlay = document.getElementById('lofter-generating-overlay');
        const progressEl = document.getElementById('lofter-generating-progress');

        // 检查API配置
        const apiConfig = window.state?.apiConfig;
        if (!apiConfig || !apiConfig.proxyUrl || !apiConfig.apiKey) {
            showLofterToast('请先在设置中配置API');
            return;
        }

        const collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection || !collection.generationSettings) {
            showLofterToast('合集设定错误');
            return;
        }

        overlay.style.display = 'flex';
        progressEl.textContent = '正在生成下一章...';

        try {
            const settings = collection.generationSettings;
            const articles = await getLofterArticles();

            // 获取主角和配角信息
            const allCharacters = getAllCharacterProfiles();
            const protagonists = allCharacters.filter(c => settings.protagonistIds.includes(c.id));
            const supportingChars = allCharacters.filter(c => settings.supportingIds.includes(c.id));

            if (protagonists.length === 0) {
                showLofterToast('未找到主角信息');
                return;
            }

            // 获取世界书内容（兼容旧版单选和新版多选）
            let worldBookContent = '';
            const settingsWbIds = settings.worldBookIds || (settings.worldBookId ? [settings.worldBookId] : []);
            if (settingsWbIds.length > 0) {
                worldBookContent = await getWorldBookContent(settingsWbIds);
            }

            // 获取文风
            const genSettings = getLofterGenSettings();
            const stylePresets = genSettings.stylePresets && genSettings.stylePresets.length > 0
                ? genSettings.stylePresets
                : defaultStylePresets;

            let selectedStyle = '';
            if (settings.styleIndex !== '' && settings.styleIndex !== undefined) {
                selectedStyle = stylePresets[parseInt(settings.styleIndex)] || '';
            } else {
                selectedStyle = stylePresets[Math.floor(Math.random() * stylePresets.length)];
            }

            // 获取上一章全文 + 更早章节的概要（仅基于当前实际存在的章节）
            const chapterNum = collection.articleIds.length + 1;
            let previousContext = '';

            if (chapterNum > 1) {
                // 上一章（合集中最后一篇）全文
                const previousArticleId = collection.articleIds[collection.articleIds.length - 1];
                const previousArticle = articles.find(a => a.id === previousArticleId);

                if (chapterNum === 2) {
                    // 第2章，只使用第1章全文
                    if (previousArticle) {
                        previousContext = `\n\n【上一章（第1章）内容】\n${previousArticle.title}\n\n${previousArticle.content}`;
                    }
                } else {
                    // 第3章及以后：每个更早章节的概要 + 上一章全文
                    let allSummaries = '';

                    // 收集第1章到倒数第2章的概要
                    for (let i = 0; i < collection.articleIds.length - 1; i++) {
                        const articleId = collection.articleIds[i];
                        const summary = collection.chapterSummaries?.[articleId];
                        if (summary) {
                            allSummaries += `【第${i + 1}章情节概要】\n${summary}\n\n`;
                        } else {
                            // 如果没有概要，用文章标题做简略标记
                            const a = articles.find(art => art.id === articleId);
                            if (a) {
                                allSummaries += `【第${i + 1}章】${a.title}（概要待生成）\n\n`;
                            }
                        }
                    }

                    if (allSummaries) {
                        previousContext = `\n\n【之前章节概要】\n${allSummaries}`;
                    }

                    // 添加上一章全文
                    if (previousArticle) {
                        previousContext += `\n\n【上一章（第${chapterNum - 1}章）内容】\n${previousArticle.title}\n\n${previousArticle.content}`;
                    }
                }
            }

            // 构建生成prompt
            const prompt = buildChapterGenerationPrompt(
                protagonists,
                supportingChars,
                settings.workType,
                selectedStyle,
                settings.wordCount,
                plotHint,
                worldBookContent,
                previousContext,
                chapterNum,
                collection.name
            );

            // 调用API生成
            let responseData = await callLofterAI(prompt);

            // 移除思维链标签后解析JSON
            responseData = stripThinkingTags(responseData);
            const work = repairAndParseJSON(responseData);
            const now = Date.now();

            // 处理AI生成的评论
            let generatedComments = [];
            if (work.comments && Array.isArray(work.comments)) {
                const commentAvatars = [
                    'https://api.dicebear.com/7.x/notionists/svg?seed=update1',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=update2',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=update3',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=update4'
                ];
                generatedComments = work.comments.map((c, idx) => ({
                    id: generateId(),
                    name: c.name || `读者${idx + 1}`,
                    avatar: commentAvatars[idx % commentAvatars.length],
                    text: c.text || c.content || '写得太棒了！',
                    timestamp: now
                }));
            }

            // 创建新章节文章对象
            const newArticle = {
                id: generateId(),
                authorId: collection.authorId,
                authorName: collection.authorName,
                authorAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(collection.authorName)}`,
                title: work.title,
                content: work.content,
                images: [],
                tags: work.tags || [],
                workType: settings.workType,
                authorNotes: work.authorNotes || '',
                hasBonus: work.hasBonus || false,
                bonusContent: work.bonusContent || '',
                bonusCost: work.bonusCost || 10,
                bonusUnlocked: false,
                collectionId: collectionId,
                collectionName: collection.name,
                chapterNum: chapterNum,
                likes: 0,
                collects: Math.floor(Math.random() * 100) + 10,
                comments: generatedComments,
                tips: [],
                views: 0,
                timestamp: now,
                isLiked: false,
                isCollected: false,
                isAIGenerated: true
            };
            // 确保点赞数 < 阅读数
            newArticle.views = Math.floor(Math.random() * 2000) + 100;
            newArticle.likes = Math.floor(Math.random() * newArticle.views * 0.5) + 10;

            articles.unshift(newArticle);
            await saveLofterArticles(articles);

            // 添加到合集
            addArticleToCollection(collectionId, newArticle.id);

            // 保存上一章的概要（如果有）
            if (work.previousChapterSummary && chapterNum > 1) {
                const previousArticleId = collection.articleIds[collection.articleIds.length - 2]; // 因为刚添加了新章节
                saveChapterSummary(collectionId, previousArticleId, work.previousChapterSummary);
            }

            renderDiscoverFeed();
            showLofterToast(`第${chapterNum}章生成成功！`);

            // 刷新合集详情页
            openCollectionDetailPage(collectionId);

        } catch (error) {
            console.error('生成下一章失败:', error);
            showLofterToast('生成失败: ' + error.message);
        } finally {
            overlay.style.display = 'none';
        }
    }

    // 构建章节生成prompt
    function buildChapterGenerationPrompt(protagonists, supportingChars, workType, stylePreset, wordCount, plotHint, worldBookContent, previousContext, chapterNum, collectionName) {
        // 构建角色信息
        const protagonistInfo = protagonists.map(c => {
            return `【主角】${c.name}\n【人设】\n${c.persona}`;
        }).join('\n\n');

        const supportingInfo = supportingChars.length > 0
            ? supportingChars.map(c => {
                return `【配角】${c.name}\n【人设】\n${c.persona}`;
            }).join('\n\n')
            : '';

        // 世界书设定
        let worldBookSection = '';
        if (worldBookContent) {
            worldBookSection = `\n\n## 📚 世界观设定背景：\n${worldBookContent}`;
        }

        // 文风要求
        let styleSection = '';
        if (stylePreset) {
            styleSection = `\n\n## ✍️ 文风要求：\n${stylePreset}`;
        }

        // 剧情提示
        let plotSection = '';
        if (plotHint) {
            plotSection = `\n\n## 💡 用户期望的剧情走向：\n${plotHint}`;
        }

        // 生成上一章概要的要求
        let summaryRequirement = '';
        if (chapterNum > 1) {
            summaryRequirement = `\n\n## 📝 重要：生成上一章概要\n请在JSON的 previousChapterSummary 字段中，用300字概括上一章（第${chapterNum - 1}章）的核心情节，包括：\n- 主要事件和冲突\n- 关键人物互动\n- 情感变化\n- 结局或悬念\n\n这个概要将用于生成下一章时提供上下文，请确保信息准确且简洁。`;
        }

        return `你是一位资深的连载小说作者。现在需要你为连载小说《${collectionName}》创作第${chapterNum}章。

═══════════════════════════════════════
📖 角色设定
═══════════════════════════════════════

${protagonistInfo}

${supportingInfo}${worldBookSection}${styleSection}${previousContext}${plotSection}${summaryRequirement}

═══════════════════════════════════════
📝 创作要求
═══════════════════════════════════════

【章节号】第${chapterNum}章
【字数要求】约${wordCount}字
【作品类型】${workType === 'short_series' ? '短篇系列' : '长篇连载'}

【内容要求】
1. 与前面的情节自然衔接，保持连贯性
2. 推进主线剧情，但不要一次性展开太多
3. 人物性格要与设定保持一致
4. 对话生动自然，符合人物身份
5. 适当的悬念或情感张力
6. 结尾可以留有期待感

【必须包含的元素】
- 章节标题（可以诗意、有梗或直接点题）
- 3-5个精准标签
- 作者有话说（50-150字）
- 2-4条读者评论

【可选元素】
- 彩蛋内容（需设置5-30糖果券解锁价格）

═══════════════════════════════════════
📤 输出格式（严格JSON）
═══════════════════════════════════════

{
  "title": "第${chapterNum}章标题",
  "content": "章节正文内容（必须达到${wordCount}字左右）",
  "tags": ["标签1", "标签2", "标签3"],
  "authorNotes": "作者有话说",
  "hasBonus": true或false,
  "bonusContent": "彩蛋内容",
  "bonusCost": 10,
  "previousChapterSummary": "${chapterNum > 1 ? '上一章的情节概要（300字）' : ''}",
  "comments": [
    {"name": "读者昵称", "text": "评论内容"}
  ]
}

⚠️ 注意：直接输出JSON，不要添加任何markdown代码块标记。${chapterNum > 1 ? '必须包含 previousChapterSummary 字段。' : ''}`;
    }

    console.log('Lofter App Initialized');
});
