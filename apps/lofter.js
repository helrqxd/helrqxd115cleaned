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
        article: document.getElementById('lofter-article-view')
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

    // 获取文章列表
    function getLofterArticles() {
        const articles = localStorage.getItem('lofterArticles');
        return articles ? JSON.parse(articles) : [];
    }

    // 保存文章列表
    function saveLofterArticles(articles) {
        localStorage.setItem('lofterArticles', JSON.stringify(articles));
    }

    // 获取订阅的标签
    function getSubscribedTags() {
        const tags = localStorage.getItem('lofterSubscribedTags');
        return tags ? JSON.parse(tags) : [];
    }

    // 保存订阅的标签
    function saveSubscribedTags(tags) {
        localStorage.setItem('lofterSubscribedTags', JSON.stringify(tags));
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
            worldBookId: '',
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

    // 获取世界书内容
    async function getWorldBookContent(worldBookId) {
        if (!worldBookId) return '';

        const worldBooks = getAllWorldBooks();
        const worldBook = worldBooks.find(wb => wb.id === worldBookId);
        if (!worldBook) return '';

        // 构建世界书内容字符串
        let content = `【世界书: ${worldBook.name}】\n`;
        if (worldBook.entries && worldBook.entries.length > 0) {
            worldBook.entries.forEach(entry => {
                if (entry.enabled !== false) {
                    content += `\n[${entry.keywords?.join(', ') || '条目'}]\n${entry.content}\n`;
                }
            });
        }
        return content;
    }

    /* =========================================
        2.1 长按删除工具函数
       ========================================= */

    // 设置长按事件
    function setupLongPress(element, callback, duration = 600) {
        let pressTimer = null;
        let isLongPress = false;

        const start = (e) => {
            if (e.type === 'click' && e.button !== 0) return;
            isLongPress = false;
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

        const handleClick = (e) => {
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        element.addEventListener('mousedown', start);
        element.addEventListener('touchstart', start, { passive: true });
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
    function deleteItem(type, id) {
        switch (type) {
            case 'article':
                let articles = getLofterArticles();
                articles = articles.filter(a => a.id !== id);
                saveLofterArticles(articles);
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
    function getOrCreateCollection(authorId, authorName, collectionName, workType) {
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
                createdAt: Date.now()
            };
            collections.push(collection);
            saveLofterCollections(collections);
        }
        return collection;
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

    // 获取所有角色人设
    function getAllCharacterProfiles(allowedCharacterIds = null) {
        const characters = [];

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

    // 构建AI提示词（单个作品）
    function buildLofterGenerationPrompt(characters, worldBookContent, stylePreset) {
        // 构建完整的角色人设信息（不截断）
        const characterInfo = characters.map(c => {
            return `【角色名】${c.name}\n【角色人设】\n${c.persona}`;
        }).join('\n\n---\n\n');

        const workTypes = [
            { type: 'image', name: '同人图/漫画', desc: '一张或多张同人插画、漫画作品' },
            { type: 'short_story', name: '短篇小说', desc: '单篇完结的短篇同人文，不属于任何合集' },
            { type: 'short_series', name: '短篇系列', desc: '属于某个系列的短篇，需要系列名和在合集内的排序号' },
            { type: 'long_complete', name: '长篇一篇完', desc: '较长的一篇完结文，不属于任何合集' },
            { type: 'long_serial', name: '长篇连载', desc: '连载中的长篇小说章节，需要小说名和在合集内的排序号' }
        ];

        // 世界书设定
        let worldBookSection = '';
        if (worldBookContent) {
            worldBookSection = `\n\n## 世界观设定（请参考以下世界书内容进行创作）：\n${worldBookContent}`;
        }

        // 文风要求
        let styleSection = '';
        if (stylePreset) {
            styleSection = `\n\n## 文风要求：\n请按照以下风格进行创作：${stylePreset}`;
        }

        return `你是一个同人创作平台的内容生成器。请基于以下角色人设，生成1个同人作品。

## 可用角色人设：
${characterInfo || '（无特定角色，可自由创作）'}${worldBookSection}${styleSection}

## 作品类型说明：
${workTypes.map(t => `- ${t.type}: ${t.name} - ${t.desc}`).join('\n')}

## 要求：
1. 生成1个作品，从以上可用角色中选择任意角色进行同人创作
2. 为作品创建一个有创意的作者笔名
3. 作品需要3-5个标签，包含：CP属性（如"XX×XX"）、主题/梗（如"校园AU"、"甜宠"、"虐心"、"原著向"等）
4. 写一段"作者有话说"，表达创作意图、灵感来源、心路历程或碎碎念（50-150字）
5. 可以选择为作品添加彩蛋内容（额外小剧场或花絮）
6. 如果是图片类型，详细描述图片内容；如果是文字类型，写出完整的小说内容（至少800字）
7. 如果选择 short_series 或 long_serial 类型，必须提供 collectionName（合集名）和 chapterNum（在合集内的排序号，从1开始）
8. 同时生成2-4条网友评论，评论内容要符合同人圈氛围（如尖叫、催更、表达喜爱等）

## 输出JSON格式（严格按照此格式）：
{
  "type": "short_story 或 short_series 或 long_complete 或 long_serial 或 image",
  "authorName": "作者笔名",
  "title": "作品标题",
  "content": "作品正文内容",
  "tags": ["CP标签", "主题标签", "情感标签", "其他标签"],
  "authorNotes": "作者有话说的内容",
  "hasBonus": true或false,
  "bonusContent": "彩蛋内容（如果hasBonus为true则必填）",
  "bonusCost": 5到30之间的数字,
  "collectionName": "合集名（short_series和long_serial类型必填）",
  "chapterNum": 1,
  "comments": [
    {"name": "评论者昵称", "text": "评论内容"},
    {"name": "评论者昵称2", "text": "评论内容2"}
  ]
}

直接输出JSON，不要添加任何其他说明文字。`;
    }

    // 调用AI生成单个作品
    async function generateSingleWork(characters, worldBookContent, stylePreset) {
        const apiConfig = window.state?.apiConfig;
        const { proxyUrl, apiKey, model, temperature } = apiConfig;
        const isGemini = proxyUrl.includes('googleapis');

        // 使用设置中的 temperature，如果没有设置则使用默认值
        const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8;

        const prompt = buildLofterGenerationPrompt(characters, worldBookContent, stylePreset);
        let responseData;

        if (isGemini) {
            const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: requestTemp }
                })
            });
            const json = await res.json();
            if (!json.candidates?.[0]?.content?.parts?.[0]) {
                throw new Error(json.error?.message || 'API返回格式异常');
            }
            responseData = json.candidates[0].content.parts[0].text;
        } else {
            const res = await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: requestTemp
                })
            });
            const json = await res.json();
            if (!json.choices?.[0]?.message) {
                throw new Error(json.error?.message || 'API返回格式异常');
            }
            responseData = json.choices[0].message.content;
        }

        // 解析JSON
        let cleanJson = responseData;
        const jsonMatch = responseData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanJson = jsonMatch[0];
        }

        return JSON.parse(cleanJson);
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

        // 获取世界书内容
        let worldBookContent = '';
        if (genSettings.worldBookId) {
            worldBookContent = await getWorldBookContent(genSettings.worldBookId);
        }

        // 获取文风预设列表
        const stylePresets = genSettings.stylePresets && genSettings.stylePresets.length > 0
            ? genSettings.stylePresets
            : defaultStylePresets;

        overlay.style.display = 'flex';
        progressEl.textContent = `准备生成 ${workCount} 个作品...`;

        const articles = getLofterArticles();
        const now = Date.now();
        let successCount = 0;

        try {
            // 分别生成每个作品
            for (let i = 0; i < workCount; i++) {
                progressEl.textContent = `正在生成第 ${i + 1}/${workCount} 个作品...`;

                // 随机选择一个文风预设
                const randomStylePreset = stylePresets[Math.floor(Math.random() * stylePresets.length)];

                try {
                    // 调用AI生成单个作品
                    const work = await generateSingleWork(characters, worldBookContent, randomStylePreset);

                    // 创建作者ID
                    const authorId = 'author_' + generateId();

                    // 处理合集（short_series 和 long_serial 类型需要合集）
                    let collectionId = null;
                    if ((work.type === 'short_series' || work.type === 'long_serial') && work.collectionName) {
                        const collection = getOrCreateCollection(
                            authorId,
                            work.authorName,
                            work.collectionName,
                            work.type === 'short_series' ? 'series' : 'serial'
                        );
                        collectionId = collection.id;
                    }

                    // 生成配图（如果是图片类型或有图片提示词）
                    let images = [];
                    if (work.type === 'image' || work.imagePrompt) {
                        try {
                            progressEl.textContent = `正在生成第 ${i + 1}/${workCount} 个作品的配图...`;
                            const imageUrl = await generateWorkImage(work.imagePrompt || work.title);
                            if (imageUrl) images.push(imageUrl);
                        } catch (imgErr) {
                            console.error('配图生成失败:', imgErr);
                        }
                    }

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
                            timestamp: now - Math.floor(Math.random() * 3600000)
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
                        chapterNum: work.chapterNum || null,
                        likes: Math.floor(Math.random() * 500) + 50,
                        collects: Math.floor(Math.random() * 100) + 10,
                        comments: generatedComments,
                        tips: [],
                        views: Math.floor(Math.random() * 2000) + 100,
                        timestamp: now, // 使用实际发布时间
                        isLiked: false,
                        isCollected: false,
                        isAIGenerated: true
                    };

                    articles.unshift(newArticle);

                    // 添加到合集
                    if (collectionId) {
                        addArticleToCollection(collectionId, newArticle.id);
                    }

                    successCount++;

                    // 保存当前进度，防止中途失败丢失已生成的内容
                    saveLofterArticles(articles);

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

    function renderDiscoverFeed() {
        const feed = document.getElementById('lofter-discover-feed');
        if (!feed) return;

        let articles = getLofterArticles();

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
    function toggleLike(articleId, element) {
        let articles = getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        article.isLiked = !article.isLiked;
        article.likes += article.isLiked ? 1 : -1;

        saveLofterArticles(articles);

        element.classList.toggle('liked');
        element.querySelector('span').textContent = article.likes;
    }

    // 收藏切换
    function toggleCollect(articleId, element) {
        let articles = getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        article.isCollected = !article.isCollected;
        article.collects += article.isCollected ? 1 : -1;

        saveLofterArticles(articles);

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

    function openArticleDetail(articleId) {
        const articles = getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        currentArticleId = articleId;

        // 增加阅读量
        article.views = (article.views || 0) + 1;
        saveLofterArticles(articles);

        // 填充数据
        document.getElementById('lofter-article-author-avatar').src = article.authorAvatar || defaultAvatar;
        document.getElementById('lofter-article-author-name').textContent = article.authorName;
        document.getElementById('lofter-article-title').textContent = article.title;
        document.getElementById('lofter-article-date').textContent = formatFullDateTime(article.timestamp);
        document.getElementById('lofter-article-views').textContent = `阅读 ${article.views}`;
        document.getElementById('lofter-article-body').textContent = article.content;

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

    // 打开合集模态框
    function openCollectionModal(collectionId) {
        const collections = getLofterCollections();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const modal = document.getElementById('lofter-collection-modal');
        const titleEl = document.getElementById('lofter-collection-modal-title');
        const listEl = document.getElementById('lofter-collection-works-list');

        titleEl.textContent = collection.name;
        listEl.innerHTML = '';

        const articles = getLofterArticles();
        collection.articleIds.forEach((aid, index) => {
            const article = articles.find(a => a.id === aid);
            if (!article) return;

            const isCurrent = aid === currentArticleId;
            const itemEl = document.createElement('div');
            itemEl.className = `lofter-collection-work-item ${isCurrent ? 'lofter-collection-work-current' : ''}`;

            let coverImg = article.images && article.images.length > 0
                ? article.images[0]
                : 'https://via.placeholder.com/80x80?text=文';

            itemEl.innerHTML = `
                <img src="${coverImg}" class="lofter-collection-work-cover" alt="封面">
                <div class="lofter-collection-work-info">
                    <div class="lofter-collection-work-title">${article.chapterNum ? `第${article.chapterNum}章 ` : ''}${article.title}</div>
                    <div class="lofter-collection-work-meta">${formatLofterDate(article.timestamp)} · ${article.views || 0} 阅读</div>
                </div>
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
    function unlockBonus(articleId, cost) {
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
        let articles = getLofterArticles();
        const article = articles.find(a => a.id === articleId);
        if (article) {
            article.bonusUnlocked = true;
            saveLofterArticles(articles);

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
    function sendTip(articleId, coins, giftEmoji, giftName) {
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
        let articles = getLofterArticles();
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
            saveLofterArticles(articles);

            // 更新打赏记录显示
            renderTipRecord(article);
        }

        showLofterToast(`成功送出 ${giftEmoji} ${giftName}！`);
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
            const commentEl = document.createElement('div');
            commentEl.className = 'lofter-comment-item';
            commentEl.innerHTML = `
                <img src="${comment.avatar || defaultAvatar}" class="lofter-comment-avatar" alt="头像">
                <div class="lofter-comment-content">
                    <div class="lofter-comment-header">
                        <span class="lofter-comment-name">${comment.name}</span>
                        <span class="lofter-comment-time">${formatLofterDate(comment.timestamp)}</span>
                    </div>
                    <div class="lofter-comment-text">${comment.text}</div>
                </div>
            `;
            commentsList.appendChild(commentEl);
        });
    }

    // 详情页返回
    if (articleBackBtn) {
        articleBackBtn.addEventListener('click', () => {
            switchView('home');
        });
    }

    // 详情页点赞
    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            if (!currentArticleId) return;
            let articles = getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            article.isLiked = !article.isLiked;
            article.likes += article.isLiked ? 1 : -1;
            saveLofterArticles(articles);

            likeBtn.classList.toggle('liked');
            document.getElementById('lofter-like-count').textContent = article.likes;
        });
    }

    // 详情页收藏
    if (collectBtn) {
        collectBtn.addEventListener('click', () => {
            if (!currentArticleId) return;
            let articles = getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            article.isCollected = !article.isCollected;
            article.collects += article.isCollected ? 1 : -1;
            saveLofterArticles(articles);

            collectBtn.classList.toggle('collected');
            document.getElementById('lofter-collect-count').textContent = article.collects;
            showLofterToast(article.isCollected ? '已收藏' : '已取消收藏');
        });
    }

    // 发送评论
    if (commentSendBtn) {
        commentSendBtn.addEventListener('click', () => {
            const text = commentInput.value.trim();
            if (!text || !currentArticleId) return;

            let articles = getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            const userSettings = getLofterUserSettings();
            const newComment = {
                id: generateId(),
                name: userSettings.name,
                avatar: userSettings.avatar,
                text: text,
                timestamp: Date.now()
            };

            if (!article.comments) article.comments = [];
            article.comments.unshift(newComment);
            saveLofterArticles(articles);

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

            let articles = getLofterArticles();
            const article = articles.find(a => a.id === currentArticleId);
            if (!article) return;

            showLofterToast('正在生成评论...');

            // 模拟AI生成评论
            const sampleComments = [
                { name: '路人甲', text: '写得真好，很有感触！', avatar: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg' },
                { name: '文艺青年', text: '这篇文章让我想起了很多往事...', avatar: 'https://files.catbox.moe/7n8nqq.jpg' },
                { name: '小确幸', text: '太喜欢这种风格了，已关注！', avatar: 'https://files.catbox.moe/q6z5fc.jpeg' },
                { name: '读书人', text: '文笔很细腻，期待更多作品～', avatar: defaultAvatar }
            ];

            // 随机选择1-3条评论
            const numComments = Math.floor(Math.random() * 3) + 1;
            const selectedComments = sampleComments.sort(() => 0.5 - Math.random()).slice(0, numComments);

            if (!article.comments) article.comments = [];

            selectedComments.forEach(c => {
                article.comments.push({
                    id: generateId(),
                    name: c.name,
                    avatar: c.avatar,
                    text: c.text,
                    timestamp: Date.now() - Math.floor(Math.random() * 3600000)
                });
            });

            saveLofterArticles(articles);
            document.getElementById('lofter-comment-count').textContent = article.comments.length;
            renderComments(article);
            showLofterToast(`已生成 ${numComments} 条评论`);
        });
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
        publishSubmitBtn.addEventListener('click', () => {
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

            let articles = getLofterArticles();
            articles.unshift(newArticle);
            saveLofterArticles(articles);

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

    function renderSubscribedTags() {
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

        container.innerHTML = '';
        tags.forEach(tag => {
            const card = document.createElement('div');
            card.className = 'lofter-tag-card';
            card.innerHTML = `
                <div class="lofter-tag-card-name">#${tag}</div>
                <div class="lofter-tag-card-count">${Math.floor(Math.random() * 10000)}篇内容</div>
            `;

            // 长按删除
            setupLongPress(card, () => {
                confirmDelete('tag', tag, `#${tag}`);
            });

            container.appendChild(card);
        });
    }

    function renderSubscribedCollections() {
        const container = document.getElementById('lofter-subscribed-collections');
        const emptyState = document.getElementById('lofter-collections-empty');
        if (!container) return;

        // 暂时显示空状态
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
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

        // 渲染世界书选择
        const worldbookSelect = document.getElementById('lofter-gen-worldbook');
        if (worldbookSelect) {
            const worldBooks = getAllWorldBooks();
            worldbookSelect.innerHTML = '<option value="">不使用世界书</option>';
            worldBooks.forEach(wb => {
                const selected = genSettings.worldBookId === wb.id ? 'selected' : '';
                worldbookSelect.innerHTML += `<option value="${wb.id}" ${selected}>${wb.name}</option>`;
            });
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

            // 获取世界书选择
            const worldbookSelect = document.getElementById('lofter-gen-worldbook');
            if (worldbookSelect) {
                genSettings.worldBookId = worldbookSelect.value;
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

        // 作品类型详细说明
        const workTypeDetails = {
            'short_story': {
                name: '短篇小说（单篇完结）',
                desc: '独立完整的短篇故事，有开头、发展、高潮、结尾，情节紧凑，主题明确'
            },
            'short_series': {
                name: '短篇系列',
                desc: '属于某个主题系列的短篇，可以独立阅读但与系列其他作品有关联，需要系列名和章节号'
            },
            'long_complete': {
                name: '长篇一篇完',
                desc: '较长的完整故事，情节丰富，人物刻画深入，有完整的故事弧线，不允许分章节'
            },
            'long_serial': {
                name: '长篇连载章节',
                desc: '连载小说的一个章节，有承上启下的作用，结尾可以留有悬念，需要小说名和章节号'
            },
            'image': {
                name: '同人图/漫画',
                desc: '详细描述一幅同人插画或漫画的画面内容，包括构图、人物神态、动作、场景氛围等'
            }
        };

        const typeInfo = workTypeDetails[workType] || workTypeDetails['short_story'];

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
  "title": "作品标题",
  "content": "作品正文内容（必须达到${wordCount}字左右）",
  "tags": ["CP标签", "主题标签", "情感标签", "其他标签"],
  "authorNotes": "作者有话说的内容",
  "hasBonus": true或false,
  "bonusContent": "彩蛋内容（如果hasBonus为true）",
  "bonusCost": 5到30之间的数字,
  "collectionName": "合集名（short_series和long_serial必填）",
  "chapterNum": 1,
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

        // 获取世界书内容
        let worldBookContent = '';
        if (genSettings.worldBookId) {
            worldBookContent = await getWorldBookContent(genSettings.worldBookId);
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
            const { proxyUrl, apiKey, model, temperature } = apiConfig;
            const isGemini = proxyUrl.includes('googleapis');
            const requestTemp = temperature !== undefined ? parseFloat(temperature) : 0.8;

            let responseData;

            if (isGemini) {
                const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: requestTemp }
                    })
                });
                const json = await res.json();
                if (!json.candidates?.[0]?.content?.parts?.[0]) {
                    throw new Error(json.error?.message || 'API返回格式异常');
                }
                responseData = json.candidates[0].content.parts[0].text;
            } else {
                const res = await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model || 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: requestTemp
                    })
                });
                const json = await res.json();
                if (!json.choices?.[0]?.message) {
                    throw new Error(json.error?.message || 'API返回格式异常');
                }
                responseData = json.choices[0].message.content;
            }

            // 解析JSON
            let cleanJson = responseData;
            const jsonMatch = responseData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanJson = jsonMatch[0];
            }

            const work = JSON.parse(cleanJson);
            const now = Date.now();
            const authorId = 'author_' + generateId();

            // 处理合集
            let collectionId = null;
            if ((work.type === 'short_series' || work.type === 'long_serial') && work.collectionName) {
                const collection = getOrCreateCollection(
                    authorId,
                    work.authorName,
                    work.collectionName,
                    work.type === 'short_series' ? 'series' : 'serial'
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
                    timestamp: now - Math.floor(Math.random() * 3600000)
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
                chapterNum: work.chapterNum || null,
                likes: Math.floor(Math.random() * 500) + 50,
                collects: Math.floor(Math.random() * 100) + 10,
                comments: generatedComments,
                tips: [],
                views: Math.floor(Math.random() * 2000) + 100,
                timestamp: now,
                isLiked: false,
                isCollected: false,
                isAIGenerated: true,
                isCustomGenerated: true // 标记为自定义生成
            };

            let articles = getLofterArticles();
            articles.unshift(newArticle);
            saveLofterArticles(articles);

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

    console.log('Lofter App Initialized');
});
