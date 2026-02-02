// TAROT_DECK moved to apps/QQ/functions.js
// Ensure db is defined globally to avoid ReferenceError in other scripts or early execution
window.db = window.db || null;

// ★★★ 注册 Service Worker 以支持系统通知 ★★★
if ('serviceWorker' in navigator) {
    // 检测是否运行在支持 SW 的协议下 (http, https, chrome-extension 等，排除 file)
    if (window.location.protocol === 'file:' || window.location.origin === 'null') {
        console.warn('【注意】Service Worker 无法在 file:// 协议或本地文件模式下运行。系统通知功能将不可用。请使用 Web Server (如 VSCode Live Server) 或 localhost 访问。');
    } else {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('sw.js')
                .then((registration) => {
                    console.log('ServiceWorker 注册成功，Scope:', registration.scope);
                })
                .catch((err) => {
                    console.log('ServiceWorker 注册失败:', err);
                });
        });
    }
}

const BLOCKED_API_SITES = ['api.pisces.ink', 'aiapi.qzz.io', 'api520.pro', 'api521.pro', 'api522.pro'];

(function () {
    window.errorLogs = [];

    // === 核心逻辑：只抓错误 ===
    function captureError(source, msg) {
        const time = new Date().toLocaleTimeString();
        const logLine = `⏰ [${time}] ${source}\n❌ ${msg}\n----------------------------------\n`;
        window.errorLogs.push(logLine);

        // 实时更新UI
        const textarea = document.getElementById('error-log-viewer');
        if (textarea) {
            textarea.value = window.errorLogs.join('');
            textarea.scrollTop = textarea.scrollHeight;
        }
    }

    // 1. 劫持 console.error (代码里主动打印的红字)
    const originalError = console.error;
    console.error = function (...args) {
        // 将对象转为字符串，防止显示 [object Object]
        const msg = args
            .map((a) => {
                try {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                } catch (e) {
                    return String(a);
                }
            })
            .join(' ');
        captureError('Console Error', msg);
        originalError.apply(console, args);
    };

    // 2. 捕获运行时的崩溃 (语法错误、未定义变量等)
    window.addEventListener('error', function (event) {
        captureError('System Crash', `${event.message}\n📍 位置: ${event.filename}:${event.lineno}`);
    });

    // 3. 捕获 Promise 报错 (API请求失败等)
    window.addEventListener('unhandledrejection', function (event) {
        let reason = event.reason;
        if (typeof reason === 'object') reason = reason.message || JSON.stringify(reason);
        captureError('Unhandled Promise', reason);
    });
})();

// 打开面板
window.openBugStation = function () {
    const modal = document.getElementById('bug-report-modal');
    const textarea = document.getElementById('error-log-viewer');
    const emptyTip = '✨ 一切正常！没有检测到任何报错 (好耶！)';

    if (window.errorLogs.length === 0) {
        textarea.value = emptyTip;
        textarea.style.color = '#52c41a'; // 绿色
        textarea.style.textAlign = 'center';
        textarea.style.paddingTop = '50px';
    } else {
        textarea.value = window.errorLogs.join('');
        textarea.style.color = '#ff4d4f'; // 红色
        textarea.style.textAlign = 'left';
        textarea.style.paddingTop = '15px';
    }

    modal.classList.add('visible');
};

// 复制
window.copyBugReport = function () {
    const textarea = document.getElementById('error-log-viewer');
    if (textarea.value.includes('一切正常')) {
        alert('没有报错，不用复制啦~');
        return;
    }
    textarea.select();
    document.execCommand('copy');
    alert('💉 报错信息已复制！快发给开发者急救！');
};

// 清空
window.clearBugReport = function () {
    window.errorLogs = [];
    window.openBugStation(); // 刷新显示
};

// 关闭
window.closeBugStation = function () {
    document.getElementById('bug-report-modal').classList.remove('visible');
};

const BUILT_IN_SCRIPTS = [
    {
        id: 'built_in_1',
        name: '办公室疑云',
        storyBackground: '深夜，顶级互联网公司“比特无限”灯火通明。以苛刻闻名的项目总监王强，被发现死在自己的座位上，死因为药物中毒。警方初步锁定了当晚还在公司的五位嫌疑人，每个人似乎都与死者有着千丝万缕的联系。在这座欲望与代码交织的钢铁森林里，谁的秘密被永远埋葬，谁的双手沾染了罪恶？',
        roles: [
            {
                name: '李思',
                description: '公司新晋的天才程序员，技术过硬，但性格内向，不善言辞。',
                storyline: `今天是项目上线的最后期限，我被王总监逼着加班到深夜。\n**晚上8:00**：王总监把我叫进他办公室，因为一个微不足道的bug对我破口大骂，甚至撕掉了我的绩效评估报告，说我“不合格”。我气得浑身发抖，和他大吵了一架，然后摔门而出。\n**晚上8:30**：我回到工位，越想越气，打开电脑写了一封辞职信，但还没发送。\n**晚上9:00**：我起身去茶水间倒水，路过总监办公室时，看到人事主管陈静端着一杯咖啡走了进去。我当时没太在意。\n**晚上9:30**：我有点饿，点了一份外卖。等外卖的时候，我看到设计师孙伟鬼鬼祟祟地从茶水间的方向走出来，手里好像攥着什么东西。\n**晚上10:00**：外卖到了，我吃完外卖继续改bug，直到被发现尸体的惊叫声打断。`,
                tasks: '1. 隐藏你与王强总监发生过激烈争吵，并被他评为“不合格”的事实。\n2. 你的首要目标是自保，找到证据证明你离开后另有其人进入过办公室。\n3. 你怀疑陈静和孙伟，尝试找出他们的可疑之处。',
                isKiller: false,
            },
            {
                name: '赵娜',
                description: '公司的市场部经理，能力出众，是典型的职场女强人，野心勃勃。',
                storyline: `今晚本不需要我加班，但我为了准备一个重要的竞标方案，主动留了下来。\n**晚上7:30**：我在自己的办公室整理资料，无意中发现了王强挪用项目公款的证据。我立刻起草了一封匿名举报邮件，准备发给总部。\n**晚上8:10**：我听到隔壁总监办公室传来激烈的争吵声，好像是李思在和王强吵架。\n**晚上8:45**：我需要一些数据，就去找王强签字。进他办公室时，他正在喝咖啡，脸色很差。我把文件给他，他很不耐烦地签了字。我注意到他桌上放着一瓶没贴标签的药瓶。\n**晚上9:15**：我回到自己办公室，思考着举报邮件的事情。我担心这会影响公司声誉，最终还是没有发送。\n**晚上10:15**：我准备下班，路过总监办公室时，发现门虚掩着，里面很安静。我没有进去看，直接离开了公司。`,
                tasks: '1. 你的首要任务是找出真凶，洗清自己的嫌疑，确保公司丑闻不被曝光，以免影响你的职业前途。\n2. 隐藏你发现王强挪用公款并准备举报他的事实。\n3. 你看到他桌上的药瓶，这是一个重要线索，你需要引导大家注意到这一点。',
                isKiller: false,
            },
            {
                name: '孙伟',
                description: '公司的资深UI设计师，也是王强的老部下，表面对他毕恭毕敬。',
                storyline: `我恨透了王强！他克扣了我们团队辛辛苦苦做完的项目奖金，自己却拿了大头。\n**晚上9:00**：我借口加班，实际上是想潜入王强的办公室，找到他克扣奖金的证据。我看到陈静端着咖啡进去后不久就出来了。\n**晚上9:20**：我确认王强办公室没人注意，就偷偷溜了进去。我看到他趴在桌上睡着了，旁边是那杯几乎没喝的咖啡。我在他抽屉里翻找，果然找到了一份内部奖金分配表，证实了他中饱私囊。我用手机拍了下来。\n**晚上9:30**：我拿着证据悄悄离开办公室，准备去茶水间处理一下。这时迎面撞上了去倒水的李思，我吓了一跳，赶紧把手机藏进口袋里。\n**晚上10:00后**：我一直在自己的工位上，盘算着怎么利用这个证据让他身败名裂。`,
                tasks: '1. 隐藏你曾潜入总监办公室并偷拍证据的事实。\n2. 王强死了对你有利，你需要引导大家怀疑其他有动机的人，比如与他争吵的李思。\n3. 保护好你手机里的照片证据，这是你的护身符。',
                isKiller: false,
            },
            {
                name: '陈静',
                description: '公司的人事主管，外表温柔体贴，善于处理人际关系。',
                storyline: `我曾是王强秘密的情人，他承诺过会和妻子离婚娶我。但最近，我发现他为了攀附一个富家女，准备抛弃我。更让我恐惧的是，他手机里存着我们大量的私密照片和视频，如果曝光，我的职业生涯就全毁了。\n**晚上8:45**：我知道王强有喝咖啡的习惯。我提前准备了强效安眠药，磨成粉末，藏在身上。\n**晚上9:00**：我以关心他为由，为他冲了一杯咖啡，并将安眠药全部倒了进去，然后端进了他的办公室。他当时正在处理文件，没有怀疑，喝了一大口。\n**晚上9:10**：我借口离开，在外面观察。不一会儿，就看到他趴在桌上睡着了。\n**晚上9:20**：我返回办公室，想找到他的手机删除资料。但我怎么也找不到他的手机。此时我发现他已经没了呼吸，我吓坏了，慌乱中，我不小心将他桌上的一条项链（他准备送给那个富家女的）碰掉，掉进了我的手提包里。\n**晚上9:40**：我惊慌失措地逃离了办公室，回到自己的工位假装加班，心乱如麻。`,
                tasks: `【你的核心任务】\n请隐藏你为了销毁证据而失手用安眠药毒杀王强的事实。你是本案的唯一真凶。\n\n【你的行动指南】\n1. 嫁祸他人。你可以利用你看到的、听到的信息，将嫌疑引向李思或孙伟。\n2. 你包里的项链是定时炸弹，想办法合理解释它的来历，或者神不知鬼不觉地处理掉它。\n3. 你的目标是误导所有人，让他们投出错误的凶手。`,
                isKiller: true,
            },
            {
                name: '周毅',
                description: '公司大楼的夜班保安，看起来忠厚老实，但观察力敏锐。',
                storyline: `作为保安，我负责大楼夜间的安全巡逻。\n**晚上8:10**：我巡逻到18楼，听到总监办公室里有激烈的争吵声，好像是那个叫李思的程序员，我没敢靠近。\n**晚上9:00**：我看到人事主管陈静端着杯咖啡进了总监办公室，几分钟后就出来了，看起来有点紧张。\n**晚上9:20**：我看到UI设计师孙伟，像做贼一样溜进了总监办公室。\n**晚上9:40**：我又看到陈静从总监办公室出来，这次她脸色惨白，脚步匆忙，好像丢了魂一样。我觉得很奇怪，但没敢多问。\n**晚上10:30**：我进行例行检查，发现总监办公室的门没关，进去一看，发现王总监已经……我立刻报了警。`,
                tasks: '1. 你是本案最重要的目击证人，你的任务是诚实、准确地向大家提供你看到的时间线索。\n2. 你觉得陈静的行为最可疑，你需要重点观察她，并向大家说明你的怀疑。\n3. 找出对公司最有利的真相，避免事件扩大化。',
                isKiller: false,
            },
        ],
        clues: [
            {
                owner: '李思',
                description: '一张被揉成一团、丢在垃圾桶里的绩效评估报告，上面有王强龙飞凤舞的签名和“不合格，建议辞退”的批注。',
            },
            {
                owner: '赵娜',
                description: '你的电脑里有一封未发送的邮件，收件人是集团总部纪检委，标题是“关于比特无限项目总监王强涉嫌严重职务侵占的实名举报”。',
            },
            {
                owner: '孙伟',
                description: '你的手机相册里有一张照片，内容是一份内部奖金分配表，表格显示项目总奖金的70%都流向了王强的个人账户。',
            },
            {
                owner: '陈静',
                description: '在你的手提包夹层里，发现了一条价值不菲的钻石项链，包装盒还在，但没有贺卡。',
                isKey: true,
            },
            {
                owner: '周毅',
                description: '一份保安巡逻日志，清晰地记录了你在不同时间点看到不同人进出总监办公室的情况。',
            },
            { owner: '公共', description: '在茶水间垃圾桶里发现一个空的安眠药药瓶，上面的标签被撕掉了。' },
            { owner: '公共', description: '在死者办公桌下发现一部手机，但不是死者常用的那部，手机已经没电了。' },
        ],
        truth: '凶手是人事主管陈静。她与总监王强有私情，但王强近期为了利益想和她分手并娶一位富家女。当晚，陈静在王强的咖啡里下了过量安眠药，想让他睡着后偷走他手机里存有的两人亲密照片。但由于药量过大，王强意外死亡。陈静在慌乱中没找到手机，反而不小心将王强准备送给富家女的项链碰进了自己的包里。',
    },
    // --- 【全新剧本1：深海遗书】 ---
    {
        id: 'built_in_2',
        name: '深海遗书',
        storyBackground: '在与世隔绝的“回响岛”上，著名的海洋学家李博士被发现死在自己反锁的书房中，桌上放着一封打印的遗书，死因为氰化物中毒。一场突如其来的风暴切断了岛上与外界的所有联系，将剩下的四个人困在了这座孤岛上：李博士的得意门生、一位竞争对手、一位沉默寡言的技术员，以及一位不请自来的记者。',
        roles: [
            {
                name: '高远',
                description: '李博士的学生，才华横溢但野心勃勃。',
                storyline: `我一直觉得老师窃取了我的研究成果。今晚，我本想和他摊牌。\n**晚上7:00**：我和老师在实验室大吵一架，他承认参考了我的数据，但拒绝公开承认。我愤怒地离开。\n**晚上8:00**：我回到宿舍，越想越气。我利用权限，远程删除了部分对他有利、对我不利的核心实验数据，想让他无法发布论文。\n**晚上9:00**：我去食堂吃饭，看到技术员陈默在调试监控设备，他看起来心事重重。\n**晚上9:45**：我看到记者张莱在李博士书房门口徘徊，似乎想进去但又不敢。`,
                tasks: '1. 隐藏你和老师的学术纠纷以及你删除数据的行为。\n2. 你认为自己的前途受到了威胁，必须找到真凶来洗清嫌疑。\n3. 引导大家怀疑其他有动机的人。',
                isKiller: false,
            },
            {
                name: '林雪',
                description: '另一位海洋学家，与李博士是长期的竞争对手。',
                storyline: `我和李博士在竞争一个重要的国际科研基金。我知道他这次的研究有重大突破。\n**晚上7:30**：我去找李博士，希望他能分享一些数据，被他无情拒绝了。我们不欢而散。\n**晚上8:30**：我在自己的房间里整理资料，听到外面有奇怪的电流声，好像是停电了一瞬间又恢复了。\n**晚上9:10**：我口渴去厨房倒水，看到高远神色慌张地从机房的方向出来。\n**晚上10:00**：我经过书房时，闻到一股淡淡的杏仁味（氰化物的典型气味），但我当时以为是实验室的化学品味道，没有在意。`,
                tasks: '1. 李博士的死对你的基金申请有利，这是你的嫌疑点，你需要撇清关系。\n2. 隐藏你曾私下找他索要数据被拒的事实。\n3. 你闻到的杏仁味是关键线索，需要让大家知道。',
                isKiller: false,
            },
            {
                name: '陈默',
                description: '研究站的技术员，性格内向，暗恋着李博士。',
                storyline: `我深爱着李博士，但她似乎对我毫不在意。我掌管着整个研究站的设备和监控。\n**晚上8:30**：我接到高远的请求，他让我“不小心”让监控系统断电一分钟。我虽然觉得奇怪，但因为他答应帮我向李博士说好话，我还是照做了。\n**晚上9:00**：我看到李博士把自己锁在书房里，神情悲伤。我很难过，但不敢打扰。\n**晚上9:20**：我看到记者张莱试图撬书房的门锁，被我发现后他慌忙走开了。\n**晚上10:30**：我越想越不对劲，用备用钥匙打开了书房的门，发现了博士的尸体。`,
                tasks: '1. 隐藏你曾受高远指使，人为制造监控断电的事实。\n2. 你有备用钥匙，这让你有重大嫌疑，你需要找到合理的解释。\n3. 你怀疑记者张莱有不轨行为。',
                isKiller: false,
            },
            {
                name: '张莱',
                description: '一位追踪学术丑闻的记者，秘密登岛。',
                storyline: `我收到线报，称李博士的研究涉嫌造假，我是来调查真相的。今晚是最好的机会。\n**晚上9:00**：我绕到李博士书房的窗外，看到她正在电脑前打字，似乎在写着什么重要的东西。我用长焦相机拍下了几张模糊的照片。\n**晚上9:20**：我尝试从正门进入书房，想找她当面对质，但门被反锁了。我试图用铁丝开锁，结果被技术员陈默撞见了，我只好假装路过离开。\n**晚上9:50**：我回到自己的住处，放大相机里的照片，发现她打字的内容似乎是一封遗书，但内容很奇怪，好像在暗示什么。我还拍到她桌上有一个遥控器一样的东西。`,
                tasks: '1. 隐藏你记者的身份和你登岛的真实目的。\n2. 你拍到的照片是关键证据，但直接拿出来会暴露你自己。你需要巧妙地引导大家发现遗书和遥控器的问题。\n3. 你是外来者，嫌疑最大，必须尽快找到凶手。',
                isKiller: true,
            },
        ],
        clues: [
            {
                owner: '高远',
                description: '你的电脑回收站里有一份未发送的邮件，内容是向竞争对手的公司投递简历，并附言可以提供“比特无限”的核心代码。',
            },
            { owner: '林雪', description: '在你的抽屉里，发现了一瓶标签被撕掉的化学试剂，经过检验，是无毒的营养液。' },
            { owner: '陈默', description: '一张工作日志，上面写着“20:30-20:31，18楼东区服务器意外重启，原因排查中”。' },
            {
                owner: '张莱',
                description: '你的相机里有多张照片，其中一张清晰地拍到死者电脑屏幕上的遗书内容，另一张模糊地拍到了桌上的一个小型遥控装置。',
                isKey: true,
            },
            { owner: '公共', description: '死者手边的咖啡杯里检测出高浓度的氰化物，但奇怪的是，咖啡基本没喝。' },
            {
                owner: '公共',
                description: '书房的通风口内侧，发现一个被改装过的、连接着小型雾化喷嘴的遥控香薰机，里面残留有氰化物液体。',
            },
            {
                owner: '公共',
                description: '死者的电脑浏览器历史显示，她在死前最后一个访问的页面是她已故丈夫的纪念网站。',
            },
        ],
        truth: '凶手是记者张莱。他并非想杀死李博士，而是想制造混乱以窃取学术造假的证据。他提前在书房的通风口安装了遥控毒气装置，计划在采访时如果李博士不配合，就少量释放让她昏迷。但他没想到，当晚李博士因为思念亡夫而情绪低落，正在写一封真的遗书。张莱在窗外看到遗书，误以为时机已到，便按下了遥控器，导致李博士吸入过量毒气身亡。他之后尝试进入房间取回装置未果。',
    },
    // --- 【全新剧本2：古堡魅影】 ---
    {
        id: 'built_in_3',
        name: '古堡魅影',
        storyBackground: '在浓雾笼罩的偏远古堡里，富有而古怪的伯爵被发现死在反锁的书房中，胸口插着一把古董拆信刀。猛烈的暴风雨切断了城堡与外界的唯一桥梁，所有人都被困于此：伯爵年轻貌美的妻子、与他素有嫌隙的侄子、负债累累的私人医生，以及一位被请来进行降神会的女巫。',
        roles: [
            {
                name: '安娜',
                description: '伯爵的年轻妻子，被外界传言是为了财产才嫁给年迈的伯爵。',
                storyline: `我受够了这段没有爱情的婚姻。我爱上了侄子爱德华，我们计划私奔。\n**晚上8:00**：我和爱德华在花园秘密会面，商量私奔的细节。我告诉他，我找到了一条可以通往书房的密道。\n**晚上9:00**：伯爵把我叫到书房，再次因为我购买奢侈品的事与我争吵，并威胁要修改遗嘱，剥夺我的继承权。我愤怒地离开。\n**晚上9:30**：我回到房间，收拾好我的珠宝准备离开。此时我听到楼下传来一声女人的尖叫，但很快就消失了。\n**晚上10:00**：我从房间的密道入口进入，想去书房偷走遗嘱。当我从书房的壁炉后走出来时，发现伯爵已经倒在血泊里。我吓坏了，立刻原路返回，不敢声张。`,
                tasks: '1. 隐藏你和爱德华的私情以及私奔计划。\n2. 隐藏你曾通过密道进入案发现场的事实。\n3. 你认为凶手是其他人，需要尽快找到证据洗脱嫌疑。',
                isKiller: false,
            },
            {
                name: '爱德华',
                description: '伯爵的侄子，放荡不羁，是城堡的法定继承人，但与伯爵关系恶劣。',
                storyline: `我急需用钱，但老家伙一分钱都不肯给我。我今晚准备偷点东西去卖。\n**晚上8:00**：我和安娜在花园见面，她告诉我一条通往书房的密道，这正合我意。\n**晚上8:30**：我看到医生马丁行色匆匆地进了伯爵的书房。\n**晚上9:10**：我准备通过安娜告诉我的密道进入书房，但在密道口听到了里面有奇怪的响动，我害怕被发现，就退了回来。\n**晚上9:40**：我在走廊里遇到了女巫罗兰女士，她警告我今晚城堡会有血光之灾，让我不要乱走动。她的眼神很奇怪，让我不寒而栗。`,
                tasks: '1. 隐藏你计划偷窃以及知道密道的事实。\n2. 伯爵死了，你是最大受益人，你的嫌疑最大。你需要将嫌疑转移到他人身上，比如医生或行为诡异的女巫。\n3. 你需要找到对你有利的证据。',
                isKiller: false,
            },
            {
                name: '马丁医生',
                description: '伯爵的私人医生，医术高明，但深陷赌博债务。',
                storyline: `我欠了伯爵一大笔钱，他拿走了我的行医执照作为抵押，并威胁如果我还不上钱，就让我身败名裂。\n**晚上8:30**：我去找伯爵，恳求他再宽限我一段时间。他不仅拒绝了，还羞辱了我一番。我绝望地离开。\n**晚上9:00**：我回到我的房间，准备了一些强效镇定剂，我计划让他睡着，然后偷回我的行医执照。\n**晚上9:20**：我再次来到书房门口，却听到里面安娜和伯爵在激烈争吵。我只好暂时放弃计划，躲在附近观察。\n**晚上9:40后**：我看到安娜气冲冲地离开后，就再也没人进出过书房。我因为害怕一直没敢动手，直到尸体被发现。`,
                tasks: '1. 隐藏你欠下巨额赌债并被伯爵威胁的事实。\n2. 隐藏你准备了镇定剂并计划偷东西的意图。\n3. 你是最后一个见到伯爵的人之一，你需要证明你离开后还有作案时间。',
                isKiller: false,
            },
            {
                name: '罗兰女士',
                description: '著名的灵媒、女巫，被伯爵请来进行降神会，与城堡的“幽灵”对话。',
                storyline: `我是个骗子。伯爵发现了我的秘密，并以此敲诈我，让我免费为他“服务”。\n**晚上9:10**：伯爵把我叫到书房，再次威胁我，说如果今晚的降神会不能让他满意，就要揭穿我的一切。我感到前所未有的恐惧。\n**晚上9:30**：我借口准备仪式，独自留在书房。伯爵背对着我，在欣赏一幅画。我看到桌上有一把锋利的拆信刀，一时冲动，拿起刀从背后刺向了他。他当场倒下。我发出一声短促的尖叫，但立刻捂住了嘴。\n**晚上9:35**：我慌乱地将书房门从内反锁，然后从墙角的书架后面启动了密道（这是我之前偷偷发现的），逃离了现场。在密道中，我的一片蕾丝袖口被挂掉了。\n**晚上9:40**：我从密道出来，遇到了爱德华，我故作神秘地警告他有血光之灾，以掩饰我的慌张。`,
                tasks: '1. 你是真凶！你的任务是隐藏一切，将罪行嫁祸给他人。\n2. 利用你“女巫”的身份，编造一些鬼神之说来混淆视听。\n3. 爱德华和安娜都知道密道，这是嫁祸他们的好机会。马丁医生有强烈的动机，也可以加以利用。',
                isKiller: true,
            },
        ],
        clues: [
            { owner: '安娜', description: '你的珠宝盒里有一张单程的火车票，目的地是巴黎，时间是明天一早。' },
            { owner: '爱德华', description: '你的口袋里有一张当票，上面是一枚属于伯爵家族的古董怀表。' },
            {
                owner: '马丁医生',
                description: '你的药箱里有一瓶几乎满装的强效镇定剂，以及一张伯爵写的、要求你一周内还清10万英镑欠款的字条。',
            },
            {
                owner: '罗兰女士',
                description: '你的长裙袖口处有一块明显的撕裂痕迹，似乎是被什么东西挂坏的。',
                isKey: true,
            },
            {
                owner: '公共',
                description: '在书房壁炉后面发现一个隐蔽的按钮，按下后，旁边的一整面书架会旋转打开，露出一条通往楼上走廊的密道。',
            },
            { owner: '公共', description: '在密道的地板上，发现了一小片黑色的蕾丝布料。' },
            {
                owner: '公共',
                description: '伯爵的书桌上摊开着一本关于“灵媒与欺诈”的书，其中一页用红笔圈出了“罗兰女士”的名字。',
            },
        ],
        truth: '凶手是女巫罗兰女士。伯爵发现了她是个骗子并以此敲诈她。当晚，伯爵再次威胁她，罗兰在恐惧和愤怒之下，用拆信刀从背后杀害了伯主。她知道城堡的密道，于是反锁房门，通过密道逃离，伪造了密室杀人案。但慌乱中，她的一片蕾f丝袖口挂在了密道里，成为了关键证据。',
    },
];

/**
 * 【全新】从一个已领完的红包中找出“手气王”
 * @param {object} packet - 已领完的红包消息对象
 * @returns {object|null} - 返回手气王的信息 { name, amount }，或 null
 */
function findLuckyKing(packet) {
    const claimedBy = packet.claimedBy || {};
    const claimedEntries = Object.entries(claimedBy);

    // 如果红包是“拼手气”类型，并且有超过1个人领取
    if (packet.packetType === 'lucky' && claimedEntries.length > 1) {
        let luckyKing = { name: '', amount: -1 };
        claimedEntries.forEach(([name, amount]) => {
            if (amount > luckyKing.amount) {
                luckyKing = { name, amount };
            }
        });
        return luckyKing;
    }
    return null; // 如果不满足条件，则没有手气王
}

window.state = {
    chats: {},
    activeChatId: null,
    globalSettings: {},
    apiConfig: {},
    userStickers: [],
    worldBooks: [],
    personaPresets: [],
    qzoneSettings: {},
    activeAlbumId: null,
};

const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
const defaultMyGroupAvatar = 'https://i.postimg.cc/cLPP10Vm/4.jpg';
const defaultGroupMemberAvatar = 'https://i.postimg.cc/VkQfgzGJ/1.jpg';
const defaultGroupAvatar = 'https://i.postimg.cc/gc3QYCDy/1-NINE7-Five.jpg';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// gemini如果是多个密钥, 那么随机获取一个
function getRandomValue(str) {
    // 检查字符串是否包含逗号
    if (str.includes(',')) {
        // 用逗号分隔字符串并移除多余空格
        const arr = str.split(',').map((item) => item.trim());
        // 生成随机索引 (0 到 arr.length-1)
        const randomIndex = Math.floor(Math.random() * arr.length);
        // 返回随机元素
        return arr[randomIndex];
    }
    // 没有逗号则直接返回原字符串
    return str;
}
function isImage(text, content) {
    let currentImageData = content.image_url.url;
    // 提取Base64数据（去掉前缀）
    const base64Data = currentImageData.split(',')[1];
    // 根据图片类型获取MIME类型
    const mimeType = currentImageData.match(/^data:(.*);base64/)[1];
    return [
        { text: `${text.text}用户向你发送了一张图片` },
        {
            inline_data: {
                mime_type: mimeType,
                data: base64Data,
            },
        },
    ];
}

function extractArray(text) {
    // 正则表达式模式：匹配开头的时间戳部分和后续的JSON数组
    const pattern = /^\(Timestamp: (\d+)\)(.*)$/s;
    const match = text.match(pattern);

    if (match) {
        const timestampPart = `(Timestamp: ${match[1]}) `;
        const jsonPart = match[2].trim();

        try {
            // 尝试解析JSON部分
            const parsedJson = JSON.parse(jsonPart);
            // 验证解析结果是否为数组
            if (Array.isArray(parsedJson)) {
                return [timestampPart, parsedJson[0]];
            }
        } catch (error) {
            // 解析失败，返回原始文本
        }
    }

    // 不匹配格式或解析失败时返回原值
    return text;
}
function transformChatData(item) {
    let type = {
        send_and_recall: '撤回了消息',
        update_status: '更新了状态',
        change_music: '切换了歌曲',
        create_memory: '记录了回忆',
        create_countdown: '创建了约定/倒计时',
        text: '发送了文本',
        sticker: '发送了表情',
        ai_image: '发送了图片',
        voice_message: '发送了语音',
        transfer: '发起了转账',
        waimai_request: '发起了外卖请求',
        waimai_response: {
            paid: '回应了外卖-同意',
            rejected: '回应了外卖-拒绝',
        },
        video_call_request: '发起了视频通话',
        video_call_response: {
            accept: '回应了视频通话-接受',
            reject: '回应了视频通话-拒绝',
        },
        qzone_post: {
            shuoshuo: '发布了说说',
            text_image: '发布了文字图',
        },
        qzone_comment: '评论了动态',
        qzone_like: '点赞了动态',
        pat_user: '拍一拍了用户',
        block_user: '拉黑了用户',
        friend_request_response: '回应了好友申请',
        change_avatar: '更换了头像',
        share_link: '分享了链接',
        accept_transfer: '回应了转账-接受',
        decline_transfer: '回应了转账-拒绝/退款',
        quote_reply: '引用了回复',
        text: '',
    };
    let res = extractArray(item.content);

    if (Array.isArray(res)) {
        let obj = res[1];
        let itemType = obj.type;
        let time = res[0];
        let text = type[itemType];
        if (text) {
            if (itemType === 'sticker') {
                return [{ text: `${time}[${text}] 含义是:${obj.meaning}` }];
            } else if (itemType === 'send_and_recall') {
                return [{ text: `${time}[${text}] ${obj.content}` }];
            } else if (itemType === 'update_status') {
                return [{ text: `${time}[${text}] ${obj.status_text}(${obj.is_busy ? '忙碌/离开' : '空闲'})` }];
            } else if (itemType === 'change_music') {
                return [{ text: `${time}[${text}] ${obj.change_music}, 歌名是:${obj.song_name}` }];
            } else if (itemType === 'create_memory') {
                return [{ text: `${time}[${text}] ${obj.description}` }];
            } else if (itemType === 'create_countdown') {
                return [{ text: `${time}[${text}] ${obj.title}(${obj.date})` }];
            } else if (itemType === 'ai_image') {
                return [{ text: `${time}[${text}] 图片描述是:${obj.description}` }];
            } else if (itemType === 'voice_message') {
                return [{ text: `${time}[${text}] ${obj.content}` }];
            } else if (itemType === 'transfer') {
                return [{ text: `${time}[${text}] 金额是:${obj.amount} 备注是:${obj.amount}` }];
            } else if (itemType === 'waimai_request') {
                return [{ text: `${time}[${text}] 金额是:${obj.amount} 商品是:${obj.productInfo}` }];
            } else if (itemType === 'waimai_response') {
                return [{ text: `${time}[${text[obj.status]}] ${obj.status === 'paid' ? '同意' : '拒绝'}` }];
            } else if (itemType === 'video_call_request') {
                return [{ text: `${time}[${text}]` }];
            } else if (itemType === 'video_call_request') {
                return [{ text: `${time}[${text[obj.decision]}] ${obj.decision === 'accept' ? '同意' : '拒绝'}` }];
            } else if (itemType === 'qzone_post') {
                return [
                    {
                        text: `${time}[${text[obj.postType]}] ${obj.postType === 'shuoshuo' ? `${obj.content}` : `图片描述是:${obj.hiddenContent} ${obj.publicText ? `文案是: ${obj.publicText}` : ''}`}`,
                    },
                ];
            } else if (itemType === 'qzone_comment') {
                return [{ text: `${time}[${text}] 评论的id是: ${obj.postId} 评论的内容是: ${obj.commentText}` }];
            } else if (itemType === 'qzone_like') {
                return [{ text: `${time}[${text}] 点赞的id是: ${obj.postId}` }];
            } else if (itemType === 'pat_user') {
                return [{ text: `${time}[${text}] ${obj.suffix ? obj.suffix : ''}` }];
            } else if (itemType === 'block_user') {
                return [{ text: `${time}[${text}]` }];
            } else if (itemType === 'friend_request_response') {
                return [{ text: `${time}[${text}] 结果是:${obj.decision === 'accept' ? '同意' : '拒绝'}` }];
            } else if (itemType === 'change_avatar') {
                return [{ text: `${time}[${text}] 头像名是:${obj.name}` }];
            } else if (itemType === 'share_link') {
                return [
                    {
                        text: `${time}[${text}] 文章标题是:${obj.title}  文章摘要是:${obj.description} 来源网站名是:${obj.source_name} 文章正文是:${obj.content}`,
                    },
                ];
            } else if (itemType === 'accept_transfer') {
                return [{ text: `${time}[${text}]` }];
            } else if (itemType === 'accept_transfer') {
                return [{ text: `${time}[${text}]` }];
            } else if (itemType === 'quote_reply') {
                return [{ text: `${time}[${text}] 引用的内容是:${obj.reply_content}` }];
            } else if (itemType === 'text') {
                return [{ text: `${time}${obj.content}` }];
            }
        }

        // (例如，它是一个数组，或者一个AI返回的、我们不认识的JSON对象)
        if (typeof res !== 'string') {
            // 我们就强制使用最原始、最安全的 item.content 字符串
            res = item.content;
        }

        return [{ text: String(res || '') }];
    }
}

/**
 * 【已修复 Gemini 直连问题】构建 Gemini API 请求数据
 * 修复内容：
 * 1. 自动合并连续的相同角色消息 (解决 context 丢失和 400 错误)
 * 2. 智能去重 System Prompt (解决重复生成和忽略用户输入)
 * 3. 确保 contents 不为空 (解决功能性 400 错误)
 */
window.toGeminiRequestData = function (model, apiKey, systemInstruction, messagesForDecision, isGemini, temperature) {
    if (!isGemini) {
        return undefined;
    }

    let roleType = {
        user: 'user',
        assistant: 'model',
        system: 'user', // System 消息在 Gemini 中通常作为 User 消息的一部分或 SystemInstruction
    };

    // --- 1. 预处理消息列表 ---
    let processedMessages = [...messagesForDecision];
    let finalSystemInstruction = systemInstruction;

    // 场景A：聊天模式
    // 如果消息列表很长，且最后一条消息的内容等于 System Instruction
    // 说明这是 triggerAiResponse 自动追加的，我们需要把它移除，防止重复和覆盖用户输入
    if (finalSystemInstruction && processedMessages.length > 1) {
        const lastMsg = processedMessages[processedMessages.length - 1];
        if (lastMsg.role === 'system' && lastMsg.content === finalSystemInstruction) {
            processedMessages.pop();
        }
    }
    // 场景B：功能生成模式 (如查手机、生成图片描述)
    // 这种情况下 messagesForDecision 通常只包含一条与 System Instruction 相同的消息
    // 为了避免 contents 为空 (导致400)，我们清空 systemInstruction 字段，让这条消息作为唯一的 User 消息发送
    else if (processedMessages.length === 1 && finalSystemInstruction) {
        if (processedMessages[0].content === finalSystemInstruction) {
            finalSystemInstruction = ''; // 清空系统指令，依靠 contents 里的消息
        }
    }

    // --- 2. 构建 contents 数组 (核心：合并连续角色) ---
    const contents = [];
    let currentTurn = null;

    processedMessages.forEach((item) => {
        const targetRole = roleType[item.role] || 'user';

        // 处理消息内容，兼容多模态 (图片) 和纯文本
        let parts = [];
        if (Array.isArray(item.content)) {
            // 检查是否包含图片
            const hasImage = item.content.some((sub) => sub.type === 'image_url');
            if (hasImage) {
                parts = isImage(item.content[0], item.content[1]);
            } else {
                // 纯文本数组转字符串
                parts = [{ text: JSON.stringify(item.content) }];
            }
        } else {
            // 普通字符串
            const textVal = String(item.content || '');
            if (textVal.trim() === '') return; // 跳过空消息
            parts = [{ text: textVal }];
        }

        if (parts.length === 0) return;

        // 【关键逻辑】如果当前消息角色与上一条相同，则合并到上一条的 parts 中
        // 这让 Gemini 能够同时看到 [用户输入] 和 [系统补充的Context]，而不会把它们当成两轮对话
        if (currentTurn && currentTurn.role === targetRole) {
            currentTurn.parts.push(...parts);
        } else {
            // 否则，开始新的一轮
            if (currentTurn) contents.push(currentTurn);
            currentTurn = {
                role: targetRole,
                parts: [...parts],
            };
        }
    });

    // 推入最后一轮
    if (currentTurn) contents.push(currentTurn);

    // --- 3. 最后的兜底检查 ---
    // Gemini 要求 contents 不能为空。如果经过过滤后为空，必须补救。
    if (contents.length === 0) {
        if (finalSystemInstruction) {
            // 如果有系统指令，就把它挪到 contents 里作为 User 消息
            contents.push({ role: 'user', parts: [{ text: finalSystemInstruction }] });
            finalSystemInstruction = ''; // 避免重复
        } else {
            // 实在没东西发了，发个空格防止报错 (极罕见情况)
            contents.push({ role: 'user', parts: [{ text: ' ' }] });
        }
    }

    // --- 4. 组装请求体 ---
    const body = {
        contents: contents,
        generationConfig: {
            temperature: parseFloat(temperature) || 0.8,
        },
    };

    // 只有当 systemInstruction 不为空时才添加该字段
    if (finalSystemInstruction && finalSystemInstruction.trim()) {
        body.systemInstruction = { parts: [{ text: finalSystemInstruction }] };
    }

    return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getRandomValue(apiKey)}`,
        data: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        },
    };
};
document.addEventListener('DOMContentLoaded', async () => {
    // ===================================================================
    // 1. 所有变量和常量定义
    // ===================================================================

    let pieChartInstance = null;
    let lineChartInstance = null;

    // const db = new Dexie("GeminiChatDB");
    // window.db = db; // Expose to window for WorldBookModule


    const BLOCKED_API_SITES = ['api.pisces.ink', 'aiapi.qzz.io'];

    // --- 已修正 ---

    // --- 修正结束 ---
    // Variables moved to apps/QQ/functions.js
    let isLocked = false;
    let newLockscreenWallpaperBase64 = null;
    let newGlobalBgBase64 = null; // 用于暂存新的全局聊天背景
    window.state.musicState = {
        isActive: false,
        activeChatId: null,
        isPlaying: false,
        playlist: [],
        currentIndex: -1,
        playMode: 'order',
        totalElapsedTime: 0,
        timerId: null,

        parsedLyrics: [], // 当前歌曲解析后的歌词数组
        currentLyricIndex: -1, // 当前高亮的歌词行索引
    };

    // Variables moved to worldbooks.js
    // let isWorldBookEditMode = false;
    // let selectedWorldBooks = new Set();

    // Shared globals defined in apps/QQ/chat.js
    // isSelectionMode, selectedMessages, etc. are now on window.

    // let waimaiTimers = {}; // Moved to apps/QQ/functions.js

    // 一个简单的网络请求函数
    if (typeof Http_Get_External === 'undefined') {
        window.Http_Get_External = function (url) {
            return new Promise((resolve) => {
                fetch(url)
                    .then((res) => res.json().catch(() => res.text()))
                    .then(resolve)
                    .catch(() => resolve(null));
            });
        };
    }
    async function Http_Get(url) {
        return await Http_Get_External(url);
    }

    let photoViewerState = {
        isOpen: false,
        photos: [], // 存储当前相册的所有照片URL
        currentIndex: -1, // 当前正在查看的照片索引
    };

    window.unreadPostsCount = 0;

    /* favorites variables moved to favorites.js */

    let simulationIntervalId = null;

    let currentFrameSelection = { type: null, url: '', target: null };

    let notificationTimeout;

    const MESSAGE_RENDER_WINDOW = 50;
    window.MESSAGE_RENDER_WINDOW = MESSAGE_RENDER_WINDOW; // Expose to global

    let currentRenderedCount = 0;
    let lastKnownBatteryLevel = 1;
    let alertFlags = { hasShown40: false, hasShown20: false, hasShown10: false };
    let batteryAlertTimeout;
    const dynamicFontStyle = document.createElement('style');
    dynamicFontStyle.id = 'dynamic-font-style';
    document.head.appendChild(dynamicFontStyle);

    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('custom-modal-title');
    const modalBody = document.getElementById('custom-modal-body');
    const modalConfirmBtn = document.getElementById('custom-modal-confirm');
    const modalCancelBtn = document.getElementById('custom-modal-cancel');
    let modalResolve;

    function showCustomModal() {
        modalOverlay.classList.add('visible');
    }
    window.showCustomModal = showCustomModal;

    function hideCustomModal() {
        modalOverlay.classList.remove('visible');
        modalConfirmBtn.classList.remove('btn-danger');
        if (modalResolve) modalResolve(null);
    }
    window.hideCustomModal = hideCustomModal;

    window.showCustomConfirm = function (title, message, options = {}) {
        return new Promise((resolve) => {
            modalResolve = resolve;
            modalTitle.textContent = title;
            modalBody.innerHTML = `<p>${message}</p>`;
            modalCancelBtn.style.display = 'block';
            modalConfirmBtn.textContent = '确定';
            if (options.confirmButtonClass) modalConfirmBtn.classList.add(options.confirmButtonClass);
            modalConfirmBtn.onclick = () => {
                resolve(true);
                hideCustomModal();
            };
            modalCancelBtn.onclick = () => {
                resolve(false);
                hideCustomModal();
            };
            showCustomModal();
        });
    };

    window.showCustomAlert = function (title, message) {
        return new Promise((resolve) => {
            // 1. 只要系统想弹窗，第一件事就是关掉加载动画！
            const loadingOverlay = document.getElementById('generation-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('visible');
            }

            // 2. 正常的弹窗逻辑
            modalResolve = resolve;
            modalTitle.textContent = title;
            modalBody.innerHTML = `<p style="text-align: left; white-space: pre-wrap;">${message}</p>`;
            modalCancelBtn.style.display = 'none';
            modalConfirmBtn.textContent = '好的';

            // 3. 强行提高弹窗层级，确保它压在一切之上
            document.getElementById('custom-modal-overlay').style.zIndex = '9999';

            modalConfirmBtn.onclick = () => {
                modalCancelBtn.style.display = 'block';
                modalConfirmBtn.textContent = '确定';
                document.getElementById('custom-modal-overlay').style.zIndex = ''; // 恢复层级
                resolve(true);
                hideCustomModal();
            };
            showCustomModal();
        });
    };

    /**
     * 【全新】一个专门清除HTML标签和代码的函数
     * @param {string} text - 包含HTML或代码的原始文本
     * @returns {string} - 清理后的纯文本
     */
    function stripHtmlAndCode(text) {
        if (!text || typeof text !== 'string') {
            return ''; // 如果输入为空或不是字符串，返回空字符串
        }
        // 1. 移除所有HTML标签 (例如 <b>, <div>)
        let cleanedText = text.replace(/<\/?[^>]+(>|$)/g, '');

        // 2. 移除所有Markdown代码块 (例如 ```code``` 或 `code`)
        cleanedText = cleanedText.replace(/```[\s\S]*?```/g, ''); // 移除多行代码块
        cleanedText = cleanedText.replace(/`[^`]*`/g, ''); // 移除行内代码

        // 3. 将HTML实体 (例如 &lt; &gt;) 转换回正常字符 (< >)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedText;

        return tempDiv.textContent || tempDiv.innerText || '';
    }

    window.showCustomPrompt = function (title, placeholder, initialValue = '', type = 'text', extraHtml = '') {
        return new Promise((resolve) => {
            modalResolve = resolve;
            modalTitle.textContent = title;
            const inputId = 'custom-prompt-input';

            const inputHtml = type === 'textarea' ? `<textarea id="${inputId}" placeholder="${placeholder}" rows="4" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box; resize: vertical;">${initialValue}</textarea>` : `<input type="${type}" id="${inputId}" placeholder="${placeholder}" value="${initialValue}">`;

            modalBody.innerHTML = extraHtml + inputHtml;
            const input = document.getElementById(inputId);

            modalBody.querySelectorAll('.format-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const templateStr = btn.dataset.template;
                    if (templateStr) {
                        try {
                            const templateObj = JSON.parse(templateStr);
                            // 使用 null, 2 参数让JSON字符串格式化，带缩进，更易读
                            input.value = JSON.stringify(templateObj, null, 2);
                            input.focus();
                        } catch (e) {
                            console.error('解析格式模板失败:', e);
                        }
                    }
                });
            });

            modalConfirmBtn.onclick = () => {
                resolve(input.value);
                hideCustomModal();
            };
            modalCancelBtn.onclick = () => {
                resolve(null);
                hideCustomModal();
            };
            document.getElementById('custom-modal-overlay').style.zIndex = '10005';
            showCustomModal();
            setTimeout(() => input.focus(), 100);
        });
    };

    /**
     * 【全新】从一个数组中随机获取一个元素
     * @param {Array} arr - 目标数组
     * @returns {*} - 数组中的一个随机元素
     */
    function getRandomItem(arr) {
        // 安全检查，如果数组为空或不存在，返回空字符串
        if (!arr || arr.length === 0) return '';
        // 返回一个随机索引对应的元素
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ===================================================================
    // 2. 数据库结构定义
    // ===================================================================

    // main-app.js
    var db; // 声明全局变量，但不初始化
    const APP_SECRET = 'EPHONE_2026_SUPER_SECRET_KEY_V1'; // 必须与机器人一致

    // HMAC-SHA256 验证函数
    function verifyLogin(uid, pwd) {
        if (!uid || !pwd) return false;

        // 1. 计算 HMAC-SHA256 (得到原始数据)
        const rawHash = CryptoJS.HmacSHA256(uid.trim(), APP_SECRET);

        // 2. 转为 Base64 字符串 (天然包含大小写字母和数字)
        let base64 = CryptoJS.enc.Base64.stringify(rawHash);

        // 3. 截取前 12 位 (增加长度)
        let generated = base64.substring(0, 12);

        // 4. 强制插入特殊符号 (增强复杂度)
        // 将字符串转为数组进行替换
        let chars = generated.split('');
        chars[2] = '@'; // 第3位强制变为 @
        chars[7] = '!'; // 第8位强制变为 !

        // 重新组合
        const correctPassword = chars.join('');

        // console.log("正确密码应为:", correctPassword); // 调试用，上线可注释
        return pwd.trim() === correctPassword;
    }

    // 动态初始化数据库函数
    function initDatabase(userId) {
        // 数据库名带上用户ID，实现每个人数据隔离
        db = new Dexie('GeminiChatDB');
        db.version(60).stores({
            // 版本号从 51 升级到 52
            chats: '&id, isGroup, groupId, ownerId, isPinned, characterPhoneData, latestInnerVoice, innerVoiceHistory, loversSpaceData.emotionDiaries, settings.summary, settings.weiboNickname, settings.innerVoiceHideHeaderBorder, settings.innerVoiceAdopterLabelFormat, interactionStats, unlockedSymbols, settings.selectedIntimacyBadge',
            apiConfig: '&id',
            globalSettings: '&id, activeThemeId',
            userStickers: '&id, url, name, categoryId',
            userStickerCategories: '++id, &name',
            charStickers: '&id, url, name',
            worldBooks: '&id, name, categoryId',
            worldBookCategories: '++id, name',
            musicLibrary: '&id',
            personaPresets: '&id',
            qzoneSettings: '&id',
            qzonePosts: '++id, authorId, timestamp',
            qzoneAlbums: '++id, name, createdAt',
            qzonePhotos: '++id, albumId',
            favorites: '++id, type, timestamp, originalTimestamp',
            qzoneGroups: '++id, name',
            memories: '++id, chatId, timestamp, type, targetDate',
            callRecords: '++id, chatId, timestamp, customName',
            customAvatarFrames: '&id, name, url',
            themes: '++id, name, css',
            apiPresets: '++id, name, proxyUrl',
            bubbleStylePresets: '++id, name, css',
            fontPresets: '&id, name, url',
            homeScreenPresets: '++id, name',
            weiboPosts: '++id, authorId, timestamp',
            forumGroups: '++id, name, worldview, *categories',
            forumPosts: '++id, groupId, timestamp, *categories, seriesId, lengthType, chapterIndex',
            forumComments: '++id, postId, timestamp',
            forumCategories: '++id, name',
            forumSeries: '++id, groupId, isFollowed, updatedAt, bookshelfAddedAt',
            forumChapters: '++id, seriesId, chapterIndex, createdAt, postId',
            tarotReadings: '++id, timestamp',
            pomodoroSessions: '++id, chatId, startTime',
            scriptKillScripts: '++id, name, isBuiltIn',
            taobaoProducts: '++id, name, category',
            taobaoOrders: '++id, productId, timestamp',
            taobaoCart: '++id, productId',
            userWalletTransactions: '++id, timestamp',
            charPhonePresets: '++id, name',
            ludoQuestionBanks: '++id, name',
            ludoQuestions: '++id, bankId, text, type',
            datingScenes: '&uid, imageUrl',
            datingPresets: '++id, name, settings.spriteGroupId',
            datingSpriteGroups: '++id, name',
            datingSprites: '++id, groupId, description, url',
            datingHistory: '++id, characterId, timestamp',
            offlinePresets: '++id, name',
            elemeFoods: '++id, name, category',
            elemeOrders: '++id, recipientId, timestamp',
            studioScripts: '++id, name',
            studioHistory: '++id, timestamp',
            tukeyAccounts: '++id, category, type', // 这是你已有的，保持不变
            tukeyAccountingGroups: '&id', // 记账群聊设置 (id, name, members, replySettings)
            tukeyAccountingRecords: '++id, groupId, timestamp, isRepliedTo, accountId',
            tukeyAccountingReplies: '++id, recordId, charId', // AI的回复记录
            tukeyUserSettings: '&id',
            tukeyCustomConfig: '&id',
            auroraBooks: '++id, title, content, addedAt',
            passerbyAvatars: '++id, url',
            clawMachineDolls: '++id, url',
            xhsSettings: '&id',
            xhsNotes: '++id, timestamp',
        });
        window.db = db;
        console.log(`[System] 已加载用户 ${userId} 的数据库`);
    }

    // ===================================================================
    // 3. 所有功能函数定义
    // ===================================================================

    /**
     * 切换语音消息的文字显示/隐藏
     * @param {HTMLElement} bubble - 被点击的语音消息的 .message-bubble 元素
     */
    // Expose to global


    /**
     * 【V2智能版】应用指定的主题，并智能刷新当前打开的任何界面
     * @param {string} theme - 'light' 或 'dark'
     */
    function applyTheme(theme) {
        const phoneScreen = document.getElementById('phone-screen');
        const toggleSwitch = document.getElementById('theme-toggle-switch');

        const isDark = theme === 'dark';

        // 核心操作：为手机屏幕添加或移除 .dark-mode 类
        phoneScreen.classList.toggle('dark-mode', isDark);

        // 同步开关的状态
        if (toggleSwitch) {
            toggleSwitch.checked = isDark;
        }

        // 保存用户的选择
        localStorage.setItem('ephone-theme', theme);

        // 不再只关心聊天界面，而是找出当前究竟是哪个界面处于激活状态
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return; // 如果找不到，就退出

        // 根据当前激活的界面ID，调用它专属的刷新函数
        switch (activeScreen.id) {
            case 'chat-interface-screen':
                if (state.activeChatId) {
                    renderChatInterface(state.activeChatId);
                }
                break;
            case 'wallpaper-screen':
                // 外观设置页也需要重新渲染来应用新主题
                renderWallpaperScreen();
                break;
            case 'font-settings-screen':
                // 字体预设页同样需要
                renderFontPresets();
                break;
            // 如果未来还有其他页面需要适配，在这里添加 case 即可
        }
    }






    function getEventCoords(e) {
        // 如果是触摸事件，就从 e.touches[0] 获取
        if (e.touches && e.touches[0]) {
            return { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
        // 否则，就是鼠标事件，直接从 e 获取
        return { x: e.pageX, y: e.pageY };
    }

    window.showScreen = function showScreen(screenId) {
        if (!document.getElementById('logistics-screen').classList.contains('active')) {
            logisticsUpdateTimers.forEach((timerId) => clearTimeout(timerId));
            logisticsUpdateTimers = [];
        }

        if (screenId === 'chat-list-screen') {
            renderChatList();
            switchToChatListView('messages-view');
        }
        if (screenId === 'api-settings-screen') {
            if (window.renderApiSettings) window.renderApiSettings();
        }
        if (screenId === 'wallpaper-screen') {
            // 【UI修复】每次重新进入外观设置页时，清理掉未保存的临时预览状态
            // 这样能保证用户看到的是当前实际生效的设置，而不是上次没保存的残留
            window.newWallpaperBase64 = null;
            window.newLockscreenWallpaperBase64 = null;
            window.newGlobalBgBase64 = null;

            renderWallpaperScreen();
        }
        if (screenId === 'world-book-screen') {
            if (window.WorldBookModule) window.WorldBookModule.renderWorldBookScreen();
        }

        document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
        const screenToShow = document.getElementById(screenId);
        if (screenToShow) {
            screenToShow.classList.add('active');
        }

        if (screenId === 'chat-interface-screen') {
            if (window.updateListenTogetherIconProxy) {
                window.updateListenTogetherIconProxy(state.activeChatId);
            }
        }

        if (screenId === 'font-settings-screen') {
            document.getElementById('font-preview').style.fontFamily = '';
            applyCustomFont(state.globalSettings.fontUrl || '', true);
            renderFontPresets();
        }
    }
    window.showScreen = showScreen; // 确保 showScreen 自己也是全局的

    window.updateListenTogetherIconProxy = () => { };

    function switchToChatListView(viewId) {
        const chatListScreen = document.getElementById('chat-list-screen');
        const views = {
            'messages-view': document.getElementById('messages-view'),
            'qzone-screen': document.getElementById('qzone-screen'),
            'favorites-view': document.getElementById('favorites-view'),
            'memories-view': document.getElementById('memories-view'), // <-- 新增这一行
        };
        const mainHeader = document.getElementById('main-chat-list-header');
        const mainBottomNav = document.getElementById('chat-list-bottom-nav'); // 获取主导航栏

        if (window.exitFavoritesSelectionMode) {
            window.exitFavoritesSelectionMode();
        }

        // 隐藏所有视图
        Object.values(views).forEach((v) => v.classList.remove('active'));
        // 显示目标视图
        if (views[viewId]) {
            views[viewId].classList.add('active');
        }

        // 更新底部导航栏高亮
        document.querySelectorAll('#chat-list-bottom-nav .nav-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        // 统一管理所有UI元素的显隐
        if (viewId === 'messages-view') {
            mainHeader.style.display = 'flex';
            mainBottomNav.style.display = 'flex';
        } else {
            mainHeader.style.display = 'none';
            mainBottomNav.style.display = 'none';
        }

        if (viewId !== 'memories-view') {
            if (window.clearCountdownTimers) {
                window.clearCountdownTimers();
            }
        }

        // 根据视图ID执行特定的渲染/更新逻辑
        switch (viewId) {
            case 'qzone-screen':
                views['qzone-screen'].style.backgroundColor = '#f0f2f5';
                updateUnreadIndicator(0);
                renderQzoneScreen();
                renderQzonePosts();
                break;
            case 'favorites-view':
                views['favorites-view'].style.backgroundColor = '#f9f9f9';
                renderFavoritesScreen();
                break;
            case 'messages-view':
                // 如果需要，可以在这里添加返回消息列表时要执行的逻辑
                break;
        }
    }
    window.switchToChatListView = switchToChatListView;


    // Qzone function (renderQzoneScreen, saveQzoneSettings) moved to apps/QQ/qzone.js


    function formatPostTimestamp(timestamp) {
        if (!timestamp) return '';
        const now = new Date();
        const date = new Date(timestamp);
        const diffSeconds = Math.floor((now - date) / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffMinutes < 1) return '刚刚';
        if (diffMinutes < 60) return `${diffMinutes}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        if (now.getFullYear() === year) {
            return `${month}-${day} ${hours}:${minutes}`;
        } else {
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
    }

    async function loadAllDataFromDB() {
        const [
            chatsArr,
            apiConfig,
            globalSettings,
            userStickers,
            charStickers,
            worldBooks,
            musicLib,
            personaPresets,
            qzoneSettings,
            initialFavorites,
            apiPresets,
            bubbleStylePresets,
            datingScenes, // <--- 在这里新增
            localUserStickerCategories,
            offlinePresetsFromDB,
            xhsSettingsFromDB,
        ] = await Promise.all([
            db.chats.toArray(),
            db.apiConfig.get('main'),
            db.globalSettings.get('main'),
            db.userStickers.toArray(),
            db.charStickers.toArray(),
            db.worldBooks.toArray(),
            db.musicLibrary.get('main'),
            db.personaPresets.toArray(),
            db.qzoneSettings.get('main'),
            db.favorites.orderBy('timestamp').reverse().toArray(),
            db.apiPresets.toArray(),
            db.bubbleStylePresets.toArray(),
            db.datingScenes.toArray(), // <--- 在这里新增
            db.userStickerCategories.toArray(),
            db.offlinePresets.toArray(),
            db.xhsSettings.get('main'),
        ]);
        state.offlinePresets = offlinePresetsFromDB || [];
        state.chats = chatsArr.reduce((acc, chat) => {
            if (!chat.checkpoints) {
                chat.checkpoints = [];
            }

            // 为旧的群聊数据兼容专属表情库
            if (chat.isGroup && (!chat.settings || !chat.settings.stickerLibrary)) {
                if (!chat.settings) chat.settings = {}; // 以防万一连settings都没有
                chat.settings.stickerLibrary = [];
                console.log(`为旧群聊 "${chat.name}" 补全了专属表情库(stickerLibrary)属性。`);
            }
            // 兼容旧数据：为没有专属表情库的角色添加一个空的表情库
            if (!chat.isGroup && (!chat.settings || !chat.settings.stickerLibrary)) {
                if (!chat.settings) chat.settings = {}; // 以防万一连settings都没有
                chat.settings.stickerLibrary = [];
                console.log(`为旧角色 "${chat.name}" 补全了专属表情库(stickerLibrary)属性。`);
            }

            if (typeof chat.unreadCount === 'undefined') {
                chat.unreadCount = 0; // 如果这个聊天对象没有 unreadCount 属性，就给它初始化为 0
            }

            // 兼容旧数据：为没有心声背景的角色添加一个空字符串
            if (typeof chat.innerVoiceBackground === 'undefined') {
                chat.innerVoiceBackground = '';
            }

            // ★★★ 这就是本次新增的兼容性代码！ ★★★
            if (chat.settings && typeof chat.settings.innerVoiceAdopterLabelFormat === 'undefined') {
                chat.settings.innerVoiceAdopterLabelFormat = '领养人: {{user}}';
            }
            // ★★★ 新增结束 ★★★

            // 检查是否是群聊，并且其成员对象使用的是旧的 `name` 结构
            if (chat.isGroup && chat.members && chat.members.length > 0 && chat.members[0].name) {
                console.log(`检测到旧版群聊数据 for "${chat.name}"，正在执行迁移...`);
                chat.members.forEach((member) => {
                    // 如果这个成员对象没有 originalName，说明是旧数据
                    if (typeof member.originalName === 'undefined') {
                        member.originalName = member.name; // 将旧的 name 作为 originalName
                        member.groupNickname = member.name; // 同时创建一个初始的 groupNickname
                        delete member.name; // 删除旧的、有歧义的 name 字段
                        needsUpdate = true; // 标记需要存回数据库
                    }
                });
                console.log(`迁移完成 for "${chat.name}"`);
            }

            // 检查1：如果是一个单聊，并且没有 status 属性
            if (!chat.isGroup && !chat.status) {
                // 就为它补上一个默认的 status 对象
                chat.status = {
                    text: '在线',
                    lastUpdate: Date.now(),
                    isBusy: false,
                };
                console.log(`为旧角色 "${chat.name}" 补全了status属性。`);
            }

            // 检查2：兼容最新的“关系”功能
            if (!chat.isGroup && !chat.relationship) {
                // 如果是单聊，且没有 relationship 对象，就补上一个默认的
                chat.relationship = {
                    status: 'friend',
                    blockedTimestamp: null,
                    applicationReason: '',
                };
                console.log(`为旧角色 "${chat.name}" 补全了 relationship 属性。`);
            }

            if (!chat.isGroup && (!chat.settings || !chat.settings.aiAvatarLibrary)) {
                if (!chat.settings) chat.settings = {}; // 以防万一连settings都没有
                chat.settings.aiAvatarLibrary = [];
                console.log(`为旧角色 "${chat.name}" 补全了aiAvatarLibrary属性。`);
            }

            // 兼容旧数据：为没有总结设置的聊天添加默认值
            if (!chat.settings.summary) {
                chat.settings.summary = {
                    enabled: false,
                    mode: 'auto',
                    count: 20,
                    prompt: '请你以第三人称的视角，客观、冷静、不带任何感情色彩地总结以下对话的核心事件和信息。禁止进行任何角色扮演或添加主观评论。',
                    lastSummaryIndex: -1, // -1表示从未总结过
                };
            }

            // 兼容旧数据：为没有NPC库的单聊角色添加空的NPC库
            if (!chat.isGroup && !chat.npcLibrary) {
                chat.npcLibrary = [];
                console.log(`为旧角色 "${chat.name}" 补全了 npcLibrary 属性。`);
            }

            // 兼容旧数据：为没有微博设置的单聊角色添加空的微博设置
            if (!chat.isGroup && (!chat.settings.weiboProfession || typeof chat.settings.weiboInstruction === 'undefined')) {
                chat.settings.weiboProfession = '';
                chat.settings.weiboInstruction = '';
                console.log(`为旧角色 "${chat.name}" 补全了微博设置属性。`);
            }

            if (!chat.musicData) chat.musicData = { totalTime: 0 };
            if (chat.settings && chat.settings.linkedWorldBookId && !chat.settings.linkedWorldBookIds) {
                chat.settings.linkedWorldBookIds = [chat.settings.linkedWorldBookId];
                delete chat.settings.linkedWorldBookId;
            }

            // 兼容旧数据，为没有 isPinned 属性的聊天添加默认值
            if (typeof chat.isPinned === 'undefined') {
                chat.isPinned = false;
            }

            // 统一修复并初始化所有角色的手机数据
            if (!chat.isGroup) {
                // 第一步：确保最外层的 characterPhoneData 对象存在
                if (!chat.characterPhoneData) {
                    chat.characterPhoneData = {}; // 如果不存在，就创建一个空的
                }

                // 第二步：逐一检查并补全所有APP的数据结构
                // 这样无论角色多老，都能确保所有字段都存在
                if (!chat.characterPhoneData.widgets) chat.characterPhoneData.widgets = {};
                if (!chat.characterPhoneData.lastGenerated) chat.characterPhoneData.lastGenerated = null;
                if (!chat.characterPhoneData.chats) chat.characterPhoneData.chats = {};
                if (!chat.characterPhoneData.shoppingCart) chat.characterPhoneData.shoppingCart = [];
                if (!chat.characterPhoneData.memos) chat.characterPhoneData.memos = [];
                if (!chat.characterPhoneData.browserHistory) chat.characterPhoneData.browserHistory = [];
                if (!chat.characterPhoneData.photoAlbum) chat.characterPhoneData.photoAlbum = [];
                if (!chat.characterPhoneData.bank) chat.characterPhoneData.bank = { balance: 0, transactions: [] };
                if (!chat.characterPhoneData.trajectory) chat.characterPhoneData.trajectory = [];
                if (!chat.characterPhoneData.appUsage) chat.characterPhoneData.appUsage = [];
                if (!chat.characterPhoneData.diary) chat.characterPhoneData.diary = [];
                if (!chat.characterPhoneData.appWallpaper) {
                    chat.characterPhoneData.appWallpaper = '';
                }
            }

            // 兼容旧数据，为没有后台活动设置的群聊添加默认值
            if (chat.isGroup && (!chat.settings || typeof chat.settings.backgroundActivity === 'undefined')) {
                if (!chat.settings) chat.settings = {}; // 以防万一连settings都没有
                chat.settings.backgroundActivity = {
                    enabled: false,
                    interval: null, // 默认使用全局设置
                    lastActivityTimestamp: 0,
                };
            }

            // 兼容旧数据：为没有情侣头像设置的角色添加默认值
            if (typeof chat.settings.isCoupleAvatar === 'undefined') {
                chat.settings.isCoupleAvatar = false;
                chat.settings.coupleAvatarDescription = '';
            }

            // 1. [Refactored] 宠物设置初始化
            if (window.ensurePetSettings) {
                window.ensurePetSettings(chat);
            }


            // 兼容旧数据：为没有记忆互通设置的聊天添加一个空的数组
            if (!chat.settings.linkedMemories) {
                chat.settings.linkedMemories = [];
            }

            // 为旧数据添加默认的记忆条数设置
            if (typeof chat.settings.linkMemoryDepth === 'undefined') {
                chat.settings.linkMemoryDepth = 5;
            }

            // 兼容线下模式设置
            if (!chat.settings.offlineMode) {
                chat.settings.offlineMode = {
                    enabled: false,
                    prompt: '',
                    style: '',
                    wordCount: 300,
                    presets: [],
                };
            }

            if (!chat.isGroup) {
                // 只为单聊角色添加
                if (!chat.characterPhoneData) {
                    chat.characterPhoneData = {}; // 以防万一连 characterPhoneData 都没有
                }
                if (!chat.characterPhoneData.wallpaper) {
                    chat.characterPhoneData.wallpaper = ''; // 初始化壁纸为空
                }
                if (!chat.characterPhoneData.appIcons) {
                    chat.characterPhoneData.appIcons = {}; // 初始化App图标为空对象
                }
            }
            // 为旧角色数据兼容微博独立设置
            if (!chat.isGroup) {
                if (!chat.settings.weiboNickname) {
                    chat.settings.weiboNickname = chat.name; // 默认使用角色名作为微博昵称
                }
                if (!chat.settings.weiboAvatar) {
                    chat.settings.weiboAvatar = chat.settings.aiAvatar; // 默认使用AI头像
                }
                if (!chat.settings.weiboAvatarFrame) {
                    chat.settings.weiboAvatarFrame = chat.settings.aiAvatarFrame || ''; // 默认使用AI头像框
                }
                if (!chat.settings.weiboBackground) {
                    chat.settings.weiboBackground = 'https://i.postimg.cc/mk93Y3j1/weibo-bg-default.jpg'; // 给一个默认背景
                }
                // weiboProfession 和 weiboInstruction 之前已经兼容过了，这里不用重复
            }
            // 兼容旧数据：为没有微博设置的单聊角色添加空的微博设置
            if (!chat.isGroup && (!chat.settings.weiboProfession || typeof chat.settings.weiboInstruction === 'undefined')) {
                chat.settings.weiboProfession = '';
                chat.settings.weiboInstruction = '';
                console.log(`为旧角色 "${chat.name}" 补全了微博设置属性。`);
            }

            // 为旧角色数据兼容微博粉丝/关注数
            if (!chat.isGroup && (typeof chat.settings.weiboFansCount === 'undefined' || typeof chat.settings.weiboFollowingCount === 'undefined')) {
                const initialStats = getInitialWeiboStats(chat);
                chat.settings.weiboFansCount = initialStats.fans;
                chat.settings.weiboFollowingCount = initialStats.following;
                console.log(`为旧角色 "${chat.name}" 初始化了微博数据。`);
            }

            if (!chat.isGroup && (!chat.settings || typeof chat.settings.minimaxVoiceId === 'undefined')) {
                if (!chat.settings) chat.settings = {};
                chat.settings.minimaxVoiceId = ''; // 默认为空
                console.log(`为旧角色 "${chat.name}" 补全了 minimaxVoiceId 属性。`);
            }

            // 兼容旧数据：为没有火花设置的聊天添加默认值
            if (!chat.settings.streak) {
                chat.settings.streak = {
                    enabled: false,
                    initialDays: 0, // 【新】用户填写的初始天数
                    currentDays: 0, // 当前的火花天数
                    extinguishThreshold: 1, // 【新】熄灭阈值，默认1天
                    lastInteractionDate: null, // 上次互动日期
                };
                console.log(`为角色 "${chat.name}" 补全了增强版火花(streak)设置。`);
            } else if (typeof chat.settings.streak.extinguishThreshold === 'undefined') {
                // 兼容你上个版本的数据，为它们也加上熄灭阈值
                chat.settings.streak.extinguishThreshold = 1;
                console.log(`为角色 "${chat.name}" 的旧火花设置添加了熄灭阈值。`);
            }

            // 兼容旧的群聊数据，为它们添加群主、管理员和头衔属性
            if (chat.isGroup) {
                if (typeof chat.settings.groupAnnouncement === 'undefined') {
                    chat.settings.groupAnnouncement = '';
                }

                // 如果没有ownerId，则默认创建者（也就是你）为群主
                if (!chat.ownerId) {
                    chat.ownerId = 'user'; // 我们假设用户的ID为 'user'
                }
                // 遍历所有成员，为他们添加新属性
                if (chat.members && Array.isArray(chat.members)) {
                    chat.members.forEach((member) => {
                        if (typeof member.isAdmin === 'undefined') {
                            member.isAdmin = false; // 默认不是管理员
                        }
                        if (typeof member.groupTitle === 'undefined') {
                            member.groupTitle = ''; // 默认没有头衔
                        }
                    });
                }
                // 为用户自己也添加管理员和头衔的默认属性
                if (chat.settings) {
                    if (typeof chat.settings.isUserAdmin === 'undefined') {
                        chat.settings.isUserAdmin = false;
                    }
                    if (typeof chat.settings.myGroupTitle === 'undefined') {
                        chat.settings.myGroupTitle = '';
                    }
                }
            }

            // 在 loadAllDataFromDB 函数的 forEach 循环内，acc[chat.id] = chat; 之前添加：

            // 为旧数据兼容心声面板样式设置
            if (!chat.settings.innerVoiceStyles) {
                chat.settings.innerVoiceStyles = {
                    clothingColor: '#f0a1a8',
                    behaviorColor: '#81c784',
                    thoughtsColor: '#64b5f6',
                    naughtyColor: '#ba68c8',
                    cardBgColor: '#ffffff',
                    cardOpacity: 0.7,
                };
            }
            // 为旧数据兼容图标颜色设置
            if (chat.settings.innerVoiceStyles && typeof chat.settings.innerVoiceStyles.iconColor === 'undefined') {
                chat.settings.innerVoiceStyles.iconColor = '#ff8a80'; // 默认粉红色
            }

            // 兼容亲密值系统：为旧数据添加互动统计和已解锁徽章
            if (!chat.interactionStats) {
                chat.interactionStats = {};
            }
            if (!chat.unlockedSymbols) {
                chat.unlockedSymbols = [];
            }

            // 兼容亲密值系统：为旧数据添加佩戴徽章的字段
            if (chat.settings && typeof chat.settings.selectedIntimacyBadge === 'undefined') {
                chat.settings.selectedIntimacyBadge = ''; // 默认为空，不佩戴
            }

            if (!chat.isGroup && chat.settings) {
                if (typeof chat.settings.language_boost === 'undefined') {
                    chat.settings.language_boost = null; // 默认为null
                }
                if (typeof chat.settings.speed === 'undefined') {
                    chat.settings.speed = 1.0; // 默认为1.0
                }
            }
            // 为旧数据补全情侣头像库
            if (!chat.isGroup && !chat.settings.coupleAvatarLibrary) {
                chat.settings.coupleAvatarLibrary = [];
                console.log(`为旧角色 "${chat.name}" 补全了情侣头像库(coupleAvatarLibrary)属性。`);
            }

            acc[chat.id] = chat;
            return acc;
        }, {});

        state.apiConfig = apiConfig || {
            id: 'main',
            proxyUrl: '',
            apiKey: '',
            model: '',
            temperature: 0.8, // 新增：为温度设置一个默认值 0.8
            minimaxGroupId: '',
            minimaxApiKey: '',
            minimaxProvider: 'cn',
            minimaxSpeechModel: 'speech-01-turbo',
            pollinationsApiKey: '',
        };

        // 兼容旧数据，如果加载的设置里没有温度，也给一个默认值
        if (typeof state.apiConfig.temperature === 'undefined') {
            state.apiConfig.temperature = 0.8;
        }

        state.globalSettings = globalSettings || {
            id: 'main',
            quickReplies: ['你好', '继续', '有趣'],
            ringtoneUrl: 'https://files.catbox.moe/3w7gla.mp3',
            notificationSoundUrl: 'https://files.catbox.moe/k369mf.mp3', // <-- 在这里新增这一行
            widgetData: {},
            wallpaper: 'linear-gradient(135deg, #89f7fe, #66a6ff)',
            lockscreenWallpaper: 'linear-gradient(135deg, #764ba2, #667eea)',
            password: '',
            fontUrl: '',
            enableBackgroundActivity: false,
            backgroundActivityInterval: 60,
            blockCooldownHours: 1,
            appIcons: { ...DEFAULT_APP_ICONS },
            appLabels: {},
            ringtoneUrl: 'https://files.catbox.moe/3w7gla.mp3',
            notificationSoundUrl: 'https://files.catbox.moe/k369mf.mp3',
            widgetData: {}, // 【核心修改】在这里新增一个空对象，用来存放你的自定义内容
            // 在 state.globalSettings 的初始化对象里添加：
            homeAvatarFrame: '', // 为主屏幕头像框添加默认空值

            globalChatBackground: '',
            homeIconWidgetTextColor: '#FFFFFF', // <-- 修改这里的名字
            imageCompressionQuality: 0.7,
            userBalance: 520,

            homeAvatarFrame: '', // 为主屏幕头像框添加默认空值
        };
        // 确保即使从旧数据库加载，这个属性也存在
        if (!state.globalSettings.widgetData) {
            state.globalSettings.widgetData = {};
        }

        if (!state.globalSettings.homeIconWidgetTextColor) {
            // <-- 修改这里的名字
            state.globalSettings.homeIconWidgetTextColor = '#FFFFFF';
        }
        // 兼容字体阴影设置
        if (typeof state.globalSettings.removeHomeFontShadow === 'undefined') {
            state.globalSettings.removeHomeFontShadow = false;
        }

        // 兼容旧数据：如果加载的设置里没有appLabels，就给它一个空对象
        if (!state.globalSettings.appLabels) {
            state.globalSettings.appLabels = {};
        }

        if (typeof state.globalSettings.imageCompressionQuality === 'undefined') {
            state.globalSettings.imageCompressionQuality = 0.7;
        }

        // 兼容旧数据：默认开启系统通知
        if (typeof state.globalSettings.enableSystemNotifications === 'undefined') {
            state.globalSettings.enableSystemNotifications = true;
        }

        // 加载歌词栏设置，如果不存在则使用默认值
        lyricsBarSettings = state.globalSettings.lyricsBarSettings || lyricsBarSettings;
        // 兼容旧数据：初始化快捷回复 (默认为空)
        if (!state.globalSettings.quickReplies) {
            state.globalSettings.quickReplies = [];
        }

        // 合并已保存的图标和默认图标，防止更新后旧数据丢失新图标
        state.globalSettings.appIcons = { ...DEFAULT_APP_ICONS, ...(state.globalSettings.appIcons || {}) };

        state.userStickers = userStickers || [];
        userStickerCategories = localUserStickerCategories || [];
        state.charStickers = charStickers || [];
        state.worldBooks = worldBooks || [];
        currentDatingScenes = datingScenes || [];
        // 加载播放列表并注入“隐形”保活音频
        window.state.musicState.playlist = musicLib?.playlist || [];

        const keepAliveUrl = 'https://files.catbox.moe/7jn7bp.mp3';

        // 检查列表中是否已经有这个音频了
        const existingKeepAliveIndex = window.state.musicState.playlist.findIndex((t) => t.src === keepAliveUrl);

        // 如果已经存在，先删掉旧的，确保它永远在第一位且信息最新
        if (existingKeepAliveIndex > -1) {
            window.state.musicState.playlist.splice(existingKeepAliveIndex, 1);
        }

        // 创建保活专用对象
        const keepAliveTrack = {
            name: '【后台保活模式】(静音)',
            artist: '点击播放以保持后台运行',
            src: keepAliveUrl,
            // 使用 API设置 的图标作为封面
            cover: 'https://i.postimg.cc/y8YfDNNr/D9FD94FC0A3523D02D9EE3A7B0F57396.png',
            isLocal: false,
            lrcContent: '[00:00.00]⚠️ 后台保活运行中...\n[00:02.00]此音频无声\n[00:05.00]用于防止API请求中断\n[99:99.99]End',
            isTemporary: false,
            addedTimestamp: Date.now(),
            // ★★★ 核心标记：这是一个保活音轨 ★★★
            isKeepAlive: true,
        };

        // 强制插到播放列表的第 0 位
        window.state.musicState.playlist.unshift(keepAliveTrack);

        state.personaPresets = personaPresets || [];
        state.apiPresets = apiPresets || [];
        state.bubbleStylePresets = bubbleStylePresets || [];

        state.qzoneSettings = qzoneSettings || {
            id: 'main',
            nickname: '{{user}}',
            avatar: 'https://files.catbox.moe/q6z5fc.jpeg',
            banner: 'https://files.catbox.moe/r5heyt.gif',
            weiboAvatar: 'https://files.catbox.moe/q6z5fc.jpeg',
            weiboNickname: '你的昵称',
            weiboFansCount: '0',
            weiboBackground: 'https://i.postimg.cc/mk93Y3j1/weibo-bg-default.jpg',

            weiboUserProfession: '点击设置职业',
            weiboUserPersona: '一个普通的微博用户。',
            weiboUserPersonaPresets: [],
        };

        state.xhsSettings = xhsSettingsFromDB || {
            id: 'main',
            nickname: 'MOMO',
            xhsId: '123456789',
            avatar: 'https://i.postimg.cc/qRqpK5kP/anime-avatar.jpg',
            desc: '点击编辑简介，让大家更了解你',
            persona: '一个热爱生活的小红书博主。', // 隐藏人设
            fansCount: '0',
            followCount: '0',
            likesCount: '0',
            tags: ['双子座', '广东'],
            // --- 新增配置项 ---
            allowedPosters: [], // 允许发帖的角色ID列表 (包括char和npc)
            linkedWorldBooks: [], // 绑定的世界书ID列表
            enableChatMemory: true, // 读取聊天记忆
            enableAutoPost: false, // 角色自动发笔记
            enableAutoRefresh: false, // 发现页自动更新
            enableFansFluctuation: true, // 粉丝数浮动
            enableDMs: true, // 私信开关
        };

        // 兼容旧数据，如果加载进来的数据没有这些新字段，就补上默认值
        if (!state.qzoneSettings.weiboAvatar) state.qzoneSettings.weiboAvatar = state.qzoneSettings.avatar || 'https://files.catbox.moe/q6z5fc.jpeg';
        if (!state.qzoneSettings.weiboNickname) state.qzoneSettings.weiboNickname = state.qzoneSettings.nickname || '你的昵称';
        if (!state.qzoneSettings.weiboFansCount) state.qzoneSettings.weiboFansCount = '0';
        if (!state.qzoneSettings.weiboBackground) state.qzoneSettings.weiboBackground = 'https://i.postimg.cc/mk93Y3j1/weibo-bg-default.jpg';

        if (!state.qzoneSettings.weiboUserProfession) state.qzoneSettings.weiboUserProfession = '点击设置职业';
        if (!state.qzoneSettings.weiboUserPersona) state.qzoneSettings.weiboUserPersona = '一个普通的微博用户。';
        if (!state.qzoneSettings.weiboUserPersonaPresets) state.qzoneSettings.weiboUserPersonaPresets = [];

        if (!state.qzoneSettings.weiboAvatarFrame) state.qzoneSettings.weiboAvatarFrame = '';

        allFavoriteItems = initialFavorites || [];

        if (typeof state.globalSettings.notificationSoundUrl === 'undefined') {
            state.globalSettings.notificationSoundUrl = 'https://files.catbox.moe/k369mf.mp3';
        }
    }



    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * 统一的系统通知发送函数，兼容 PWA/ServiceWorker
     */
    window.sendSystemNotification = function (title, options) {
        options = options || {};

        const dispatchLegacy = () => {
            try {
                new Notification(title, options);
            } catch (e) {
                console.warn('传统 Notification 构造失败:', e);
                // 最后的兜底：如果是在不支持 new Notification 的环境下，且没有 SW，那确实无法发送
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration) {
                    // Android Chrome PWA 环境下推荐使用此方式
                    registration.showNotification(title, options).catch((e) => {
                        console.warn('SW.showNotification 失败，尝试回退:', e);
                        dispatchLegacy();
                    });
                } else {
                    // 没有激活的 SW，尝试传统方式
                    dispatchLegacy();
                }
            }).catch((e) => {
                console.warn('获取 SW Registration 失败:', e);
                dispatchLegacy();
            });
        } else {
            dispatchLegacy();
        }
    };

    window.showNotification = showNotification; // Expose to global

    function showNotification(chatId, messageContent) {
        playNotificationSound();
        clearTimeout(notificationTimeout);
        const chat = state.chats[chatId];
        if (!chat) return;

        // 1. 获取头像和名称
        const avatarUrl = chat.isGroup ? chat.settings.groupAvatar || defaultGroupAvatar : chat.settings.aiAvatar || defaultAvatar;

        const notifName = !chat.isGroup && chat.settings.remarkName ? chat.settings.remarkName : chat.name;

        if (
            'Notification' in window &&
            Notification.permission === 'granted' &&
            state.globalSettings.enableSystemNotifications === true // <--- 核心修改
        ) {
            const isChatActive = document.getElementById('chat-interface-screen').classList.contains('active') && state.activeChatId === chatId;

            if (document.hidden || !isChatActive) {
                try {
                    // 尝试发送通知 (使用兼容函数)
                    window.sendSystemNotification(notifName, {
                        body: messageContent,
                        icon: avatarUrl, // Android支持图标，iOS可能只显示应用图标
                        tag: chatId, // 防止同一角色的消息无限堆叠
                        silent: true, // 设为静音，因为我们已经有 playNotificationSound() 播放网页声音了
                    });
                } catch (e) {
                    console.warn('系统通知发送失败:', e);
                }
            }
        }
        // ---------------------------------

        // 2. 原有的应用内顶部横幅逻辑 (保持不变)
        const bar = document.getElementById('notification-bar');
        document.getElementById('notification-avatar').src = avatarUrl;

        document.getElementById('notification-content').querySelector('.name').textContent = notifName;
        document.getElementById('notification-content').querySelector('.message').textContent = messageContent;

        const newBar = bar.cloneNode(true);
        bar.parentNode.replaceChild(newBar, bar);
        newBar.addEventListener('click', () => {
            openChat(chatId);
            newBar.classList.remove('visible');
        });
        newBar.classList.add('visible');
        notificationTimeout = setTimeout(() => {
            newBar.classList.remove('visible');
        }, 4000);
    }

    /**
     * 显示一个包含多个选项的操作菜单模态框
     * 这是让图片编辑时能够选择“本地上传”或“URL”的关键函数！
     * @param {string} title - 模态框的标题
     * @param {Array<object>} options - 按钮选项数组, e.g., [{ text: '按钮文字', value: '返回值' }]
     * @returns {Promise<string|null>} - 返回用户点击按钮的value，如果取消则返回null
     */
    function showChoiceModal(title, options) {
        return new Promise((resolve) => {
            // 复用你现有的自定义模态框
            const modal = document.getElementById('preset-actions-modal');
            const footer = modal.querySelector('.custom-modal-footer');

            // 清空旧按钮并动态创建新按钮
            footer.innerHTML = '';

            options.forEach((option) => {
                const button = document.createElement('button');
                button.textContent = option.text;
                button.onclick = () => {
                    modal.classList.remove('visible');
                    resolve(option.value); // 返回被点击按钮的值
                };
                footer.appendChild(button);
            });

            // 添加一个标准的取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.marginTop = '8px';
            cancelButton.style.borderRadius = '8px';
            cancelButton.style.backgroundColor = '#f0f0f0';
            cancelButton.onclick = () => {
                modal.classList.remove('visible');
                resolve(null); // 用户取消，返回 null
            };
            footer.appendChild(cancelButton);
            modal.style.zIndex = '10005';
            modal.classList.add('visible');
        });
    }



    /**
     * 更新所有时钟（状态栏和锁屏）
     */
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });

        // 更新状态栏时钟 (这个元素一直存在)
        const statusBarTime = document.getElementById('status-bar-time');
        if (statusBarTime) {
            statusBarTime.textContent = timeString;
        }

        // 更新锁屏时钟 (只有当锁屏元素存在时才更新，避免报错)
        const lockTime = document.getElementById('lock-main-time');
        const lockDate = document.getElementById('lock-main-date');
        if (lockTime) {
            lockTime.textContent = timeString;
        }
        if (lockDate) {
            lockDate.textContent = dateString;
        }
    }

    /**
     * 解析AI返回的、可能格式不规范的响应内容
     * @param {string} content - AI返回的原始字符串
     * @returns {Array} - 一个标准化的消息对象数组
     */
    window.parseAiResponse = parseAiResponse; // Expose to global
    function parseAiResponse(content) {
        // 预处理：去除可能存在的 Markdown 代码块标记（```json 或 ```）
        let trimmedContent = content.trim();
        // 移除开头的 ```json 或 ``` (忽略大小写)
        trimmedContent = trimmedContent.replace(/^```(?:json)?\s*/i, '');
        // 移除结尾的 ```
        trimmedContent = trimmedContent.replace(/\s*```$/, '');
        trimmedContent = trimmedContent.trim();

        let initialResult = null;

        // 方案1：【最优先】尝试作为标准的、单一的JSON数组解析
        // 这是最理想、最高效的情况
        if (trimmedContent.startsWith('[') && trimmedContent.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmedContent);
                if (Array.isArray(parsed)) {
                    console.log('解析成功：标准JSON数组格式。');
                    initialResult = parsed;
                }
            } catch (e) {
                // 如果解析失败，说明它虽然看起来像个数组，但内部格式有问题。
                // 此时我们不报错，而是继续尝试下面的“强力解析”方案。
                console.warn('标准JSON数组解析失败，将尝试强力解析...');
            }
        }

        // 方案2：【强力解析】使用正则表达式，从混乱的字符串中提取出所有独立的JSON对象
        // 如果方案1失败了（或者根本不像数组），即使 initialResult 为空，我们也尝试这个
        if (!initialResult) {
            // 这能完美解决您遇到的 "(Timestamp: ...)[{...}](Timestamp: ...)[{...}]" 这种格式
            const jsonMatches = trimmedContent.match(/{[^{}]*}/g);

            if (jsonMatches) {
                const results = [];
                for (const match of jsonMatches) {
                    try {
                        // 尝试解析每一个被我们“揪”出来的JSON字符串
                        const parsedObject = JSON.parse(match);
                        results.push(parsedObject);
                    } catch (e) {
                        // 如果某个片段不是有效的JSON，就忽略它，继续处理下一个
                        console.warn('跳过一个无效的JSON片段:', match);
                    }
                }

                // 如果我们成功提取出了至少一个有效的JSON对象
                if (results.length > 0) {
                    console.log('解析成功：通过强力提取模式。');
                    initialResult = results;
                }
            }
        }

        // --- 统一后处理：展平嵌套结构 (Flattening) ---
        // 某些提示词可能会导致AI返回 { chatResponse: [...] } 这样的嵌套结构（即使在数组中）
        // 我们在这里统一处理，确保返回给业务层的是扁平的 actions 数组，同时保留 innerVoice
        if (initialResult) {
            const flattened = [];
            for (const item of initialResult) {
                if (!item || typeof item !== 'object') continue;

                // 1. 如果包含 chatResponse 数组，说明是嵌套结构，提取出来
                if (item.chatResponse && Array.isArray(item.chatResponse)) {
                    flattened.push(...item.chatResponse);
                }

                // 2. 如果包含 innerVoice 对象，也将其保留在 flattened 数组中
                if (item.innerVoice && typeof item.innerVoice === 'object' && item.innerVoice.type === 'innervoice') {
                    flattened.push(item.innerVoice);
                }

                // 3. 兼容单层结构：如果 item 本身就是 action 对象(有type且不是chatResponse那种大包)，保留它
                // 注意：如果 item 是那个包含 chatResponse 的大包，我们已经在上面处理了它的内容，
                // 但如果这个大包本身也有 type 属性怎么办？目前的 Prompt 结构中大包通常没有 type。
                // 为了安全，如果它没有 chatResponse 列，或者它明确有 type 属性，我们就认为它是一个独立的 action
                if (!item.chatResponse && !item.innerVoice) {
                    flattened.push(item);
                } else if (item.type && item.type !== 'innervoice') {
                    // 即使它有 innerVoice 字段，如果它自己也是一个 action (例如 type='text')，也应该保留
                    flattened.push(item);
                }
            }
            return flattened;
        }

        // 方案3：【最终备用】如果以上所有方法都失败了，说明AI返回的可能就是纯文本
        // 我们将原始的、未处理的内容，包装成一个标准的文本消息对象返回，确保程序不会崩溃
        console.error('所有解析方案均失败！将返回原始文本。');
        return [{ type: 'text', content: content }];
    }
    /**
     * “拉取”并填充Minimax语音模型的下拉框
     */
    function fetchMinimaxSpeechModels() {
        const modelSelect = document.getElementById('minimax-speech-model-select');
        if (!modelSelect) return;
        modelSelect.innerHTML = ''; // 清空旧选项

        // 从文档中获取的完整模型列表
        const models = ['speech-2.6-hd', 'speech-2.6-turbo', 'speech-02-hd', 'speech-02-turbo', 'speech-01-hd', 'speech-01-turbo'];

        models.forEach((modelId) => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            modelSelect.appendChild(option);
        });

        // 自动选中当前已保存的模型，如果没有则使用一个推荐的默认值
        modelSelect.value = state.apiConfig.minimaxSpeechModel || 'speech-01-turbo';

        alert('Minimax 语音模型列表已更新！');
    }
    // NovelAI设置相关函数（加载、保存、重置）
    // NovelAI设置相关函数


    /**
     * 为指定角色生成NovelAI图像（将来聊天调用时使用）
     * @param {string} chatId - 聊天/角色ID
     * @param {string} customPrompt - 可选的自定义正面提示词（如果提供则追加到配置的提示词后）
     * @returns {Promise<string>} 返回生成的图像Base64数据URL
     */






    /**
     * 渲染后台活动的角色选择和频率设置UI
     */
    function renderBackgroundFrequencySelector() {
        const container = document.getElementById('background-activity-char-list');
        const detailsContainer = document.getElementById('background-activity-details');
        const masterSwitch = document.getElementById('background-activity-switch');

        // 根据总开关的状态，决定是否显示详细设置
        detailsContainer.style.display = masterSwitch.checked ? 'block' : 'none';

        container.innerHTML = ''; // 清空旧列表
        // 修改：不再过滤掉群聊，让群聊也显示在列表里
        const allChats = Object.values(state.chats);

        if (allChats.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">还没有可以设置的角色</p>';
            return;
        }

        const config = state.globalSettings.backgroundActivityConfig || {};

        allChats.forEach((chat) => {
            const freq = config[chat.id] || 'none'; // 获取当前角色的频率设置
            let badgeHtml = '';
            if (freq !== 'none') {
                const freqText = { low: '低', medium: '中', high: '高' }[freq];
                badgeHtml = `<span class="char-freq-badge ${freq}">${freqText}</span>`;
            }

            const item = document.createElement('div');
            item.className = 'char-list-item';
            item.innerHTML = `
			            <input type="checkbox" class="bg-char-checkbox" data-chat-id="${chat.id}">
			            <span class="char-name">${chat.name}</span>
			            ${badgeHtml}
			        `;
            container.appendChild(item);
        });
    }
    window.renderBackgroundFrequencySelector = renderBackgroundFrequencySelector;

    window.renderApiSettingsProxy = window.renderApiSettings;

    // renderChatList moved to apps/QQ/chat.js

    function createChatListItem(chat) {
        const lastMsgObj = chat.history.filter((msg) => !msg.isHidden).slice(-1)[0] || {};
        let lastMsgDisplay;

        if (!chat.isGroup && chat.relationship?.status === 'pending_user_approval') {
            lastMsgDisplay = `<span style="color: #ff8c00;">[好友申请] ${chat.relationship.applicationReason || '请求添加你为好友'}</span>`;
        } else if (!chat.isGroup && chat.relationship?.status === 'blocked_by_ai') {
            lastMsgDisplay = `<span style="color: #dc3545;">[你已被对方拉黑]</span>`;
        } else if (chat.isGroup) {
            if (lastMsgObj.type === 'pat_message') {
                lastMsgDisplay = `[系统消息] ${lastMsgObj.content}`;
            } else if (lastMsgObj.type === 'transfer') {
                lastMsgDisplay = '[转账]';
            } else if (lastMsgObj.type === 'ai_image' || lastMsgObj.type === 'user_photo') {
                lastMsgDisplay = '[照片]';
            } else if (lastMsgObj.type === 'voice_message') {
                lastMsgDisplay = '[语音]';
            } else if (typeof lastMsgObj.content === 'string' && STICKER_REGEX.test(lastMsgObj.content)) {
                lastMsgDisplay = lastMsgObj.meaning ? `[表情: ${lastMsgObj.meaning}]` : '[表情]';
            } else if (Array.isArray(lastMsgObj.content)) {
                lastMsgDisplay = `[图片]`;
            } else {
                lastMsgDisplay = String(lastMsgObj.content || '...').substring(0, 20);
            }
            if (lastMsgObj.senderName && lastMsgObj.type !== 'pat_message') {
                const member = chat.members.find((m) => m.originalName === lastMsgObj.senderName);
                const displayName = member ? member.groupNickname : lastMsgObj.senderName;
                lastMsgDisplay = `${displayName}: ${lastMsgDisplay}`;
            }
        } else {
            const statusText = chat.status?.text || '在线';
            lastMsgDisplay = `[${statusText}]`;
        }

        const lastMsgTimestamp = lastMsgObj?.timestamp;
        const timeDisplay = formatChatListTimestamp(lastMsgTimestamp);

        const container = document.createElement('div');
        container.className = 'chat-list-item-swipe-container';
        container.dataset.chatId = chat.id;

        const content = document.createElement('div');
        content.className = `chat-list-item-content ${chat.isPinned ? 'pinned' : ''}`;

        const avatar = chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar;

        let streakHtml = '';
        let selectedBadgeHtml = '';

        if (!chat.isGroup && chat.settings.streak && chat.settings.streak.enabled) {
            const streak = chat.settings.streak;
            let isExtinguished = false;
            if (streak.lastInteractionDate && streak.extinguishThreshold !== -1) {
                const lastDate = new Date(streak.lastInteractionDate);
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                const daysDiff = (todayDate - lastDate) / (1000 * 3600 * 24);
                if (daysDiff >= streak.extinguishThreshold) {
                    isExtinguished = true;
                }
            }
            const litIconUrl = streak.litIconUrl;
            const extinguishedIconUrl = streak.extinguishedIconUrl;
            const fontColor = streak.fontColor || '#ff6f00';
            let iconHtml = '';
            if (isExtinguished) {
                iconHtml = extinguishedIconUrl ? `<img src="${extinguishedIconUrl}" style="height: 1.2em; vertical-align: middle;">` : '🧊';
            } else if (streak.currentDays > 0 || streak.initialDays > 0) {
                iconHtml = litIconUrl ? `<img src="${litIconUrl}" style="height: 1.2em; vertical-align: middle;">` : '🔥';
            }
            if (iconHtml) {
                if (isExtinguished) {
                    streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}</span>`;
                } else if (streak.currentDays === -1 || streak.initialDays === -1) {
                    streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}∞</span>`;
                } else {
                    streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}${streak.currentDays}</span>`;
                }
            }
        }

        // 使用 <img> 标签来显示佩戴的徽章图片
        if (!chat.isGroup && chat.settings.selectedIntimacyBadge) {
            selectedBadgeHtml = `<span class="intimacy-badge-display"><img src="${chat.settings.selectedIntimacyBadge}" alt="badge"></span>`;
        }

        content.innerHTML = `
			        <div class="chat-list-item" data-chat-id="${chat.id}">
			            <img src="${avatar || defaultAvatar}" class="avatar">
			            <div class="info">
			                <div class="name-line">
			                    <span class="name">${!chat.isGroup && chat.settings.remarkName ? chat.settings.remarkName : chat.name}</span>
			                    ${chat.isGroup ? '<span class="group-tag">群聊</span>' : ''}
			                    ${streakHtml}
			                    ${selectedBadgeHtml} <!-- 把徽章放在火花后面 -->
			                </div>
			                <div class="last-msg" style="color: ${chat.isGroup ? 'var(--text-secondary)' : '#b5b5b5'}; font-style: italic;">${lastMsgDisplay}</div>
			            </div>
			            <div class="chat-list-right-column">
			                <div class="chat-list-time">${timeDisplay}</div>
			                <div class="unread-count-wrapper">
			                    <span class="unread-count" style="display: none;">0</span>
			                </div>
			            </div>
			        </div>
			    `;

        // ... 后续的滑动删除、事件绑定等代码保持不变 ...
        const actions = document.createElement('div');
        actions.className = 'swipe-actions';
        const pinButtonText = chat.isPinned ? '取消置顶' : '置顶';
        const pinButtonClass = chat.isPinned ? 'unpin' : 'pin';
        actions.innerHTML = `<button class="swipe-action-btn ${pinButtonClass}">${pinButtonText}</button><button class="swipe-action-btn delete">删除</button>`;

        container.appendChild(content);
        container.appendChild(actions);

        const unreadCount = chat.unreadCount || 0;
        const unreadEl = content.querySelector('.unread-count');
        if (unreadCount > 0) {
            unreadEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
            unreadEl.style.display = 'inline-flex';
        } else {
            unreadEl.style.display = 'none';
        }

        const infoEl = content.querySelector('.info');
        if (infoEl) {
            infoEl.addEventListener('click', () => openChat(chat.id));
        }
        const avatarEl = content.querySelector('.avatar, .avatar-with-frame');
        if (avatarEl) {
            avatarEl.addEventListener('click', (e) => {
                e.stopPropagation();
                handleUserPat(chat.id, chat.name);
            });
        }

        return container;
    }

    // renderChatInterface moved to apps/QQ/chat.js





    window.renderWallpaperScreen = renderWallpaperScreen;
    async function renderWallpaperScreen() {
        // 锁屏开关
        const lockScreenEnabled = localStorage.getItem('lockScreenEnabled') !== 'false';
        const toggle = document.getElementById('enable-lock-screen-toggle');
        if (toggle) {
            toggle.checked = lockScreenEnabled;
        }

        // 主屏幕字体颜色和阴影
        const savedColor = state.globalSettings.homeIconWidgetTextColor || '#FFFFFF';
        document.getElementById('home-icon-widget-text-color-picker').value = savedColor;
        document.getElementById('home-icon-widget-text-color-input').value = savedColor;
        document.getElementById('remove-home-font-shadow-toggle').checked = !!state.globalSettings.removeHomeFontShadow;

        // 主屏幕壁纸预览
        const preview = document.getElementById('wallpaper-preview');
        const bg = window.newWallpaperBase64 || state.globalSettings.wallpaper;
        if (bg && bg.startsWith('data:image')) {
            preview.style.backgroundImage = `url(${bg})`;
            preview.textContent = '';
        } else if (bg) {
            preview.style.backgroundImage = bg;
            preview.textContent = '当前为渐变色';
        }

        // 锁屏壁纸预览
        const lockscreenPreview = document.getElementById('lockscreen-wallpaper-preview');
        const lockBg = window.newLockscreenWallpaperBase64 || newLockscreenWallpaperBase64 || state.globalSettings.lockscreenWallpaper;
        if (lockBg && lockBg.startsWith('data:image')) {
            lockscreenPreview.style.backgroundImage = `url(${lockBg})`;
            lockscreenPreview.textContent = '';
        } else if (lockBg) {
            lockscreenPreview.style.backgroundImage = lockBg;
            lockscreenPreview.textContent = '当前为渐变色';
        }

        // 密码输入框
        document.getElementById('password-set-input').value = state.globalSettings.password || '';

        // 全局聊天背景预览
        const globalBgPreview = document.getElementById('global-bg-preview');
        const globalBg = window.newGlobalBgBase64 || newGlobalBgBase64 || state.globalSettings.globalChatBackground;
        if (globalBg && globalBg.startsWith('data:image')) {
            globalBgPreview.style.backgroundImage = `url(${globalBg})`;
            globalBgPreview.textContent = '';
        } else if (globalBg) {
            globalBgPreview.style.background = globalBg;
            globalBgPreview.textContent = '当前为渐变色';
        } else {
            globalBgPreview.style.backgroundImage = 'none';
            globalBgPreview.textContent = '点击下方上传';
        }

        // 铃声和提示音
        document.getElementById('ringtone-url-input').value = state.globalSettings.ringtoneUrl || '';
        document.getElementById('notification-sound-url-input').value = state.globalSettings.notificationSoundUrl || '';

        await loadThemesToDropdown(); // 确保主题列表已加载
        const editor = document.getElementById('theme-css-editor');
        const selector = document.getElementById('theme-selector');

        // 优先加载 activeCustomCss
        if (state.globalSettings.activeCustomCss) {
            editor.value = state.globalSettings.activeCustomCss;
            // 如果自定义CSS存在，则将下拉框重置为“未选择”状态
            selector.value = '';
        }
        // 如果没有自定义CSS，但有选中的主题ID
        else if (state.globalSettings.activeThemeId) {
            const theme = await db.themes.get(state.globalSettings.activeThemeId);
            if (theme) {
                editor.value = theme.css;
                selector.value = theme.id; // 自动选中该主题
            } else {
                editor.value = THEME_CSS_TEMPLATE; // 如果ID无效，则显示模板
            }
        }
        // 如果什么都没保存，显示模板
        else {
            editor.value = THEME_CSS_TEMPLATE;
        }

        // 渲染App图标和名称设置
        renderIconSettings();
        renderAppNameSettings();

        // 加载预设下拉框
        loadHomeScreenPresetsToDropdown();
    }

    window.renderWallpaperScreenProxy = renderWallpaperScreen;


    // renderStickerPanel moved to apps/QQ/functions.js

    // handleDeleteStickerCategory moved to apps/QQ/functions.js

    // handleBulkDeleteUserStickers moved to apps/QQ/functions.js

    /**
     * 【全新】从卡片点击后，打开情侣空间并跳转到指定页签
     * @param {string} charId - 角色ID
     * @param {string} viewId - 要跳转到的视图ID (例如 'ls-diary-view')
     */






    // appendMessage moved to apps/QQ/chat.js

    window.openChat = async function openChat(chatId) {
        state.activeChatId = chatId;
        const chat = state.chats[chatId];
        if (!chat) return; // 安全检查

        // 将未读数清零
        if (chat.unreadCount > 0) {
            chat.unreadCount = 0;
            await db.chats.put(chat); // 别忘了把这个改变同步到数据库
            // 我们稍后会在渲染列表时重新渲染，所以这里不需要立即重绘列表
        }
        // 把 openChat 函数挂载到全局 window 对象上


        renderChatInterface(chatId);
        showScreen('chat-interface-screen');
        window.updateListenTogetherIconProxy(state.activeChatId);
        toggleCallButtons(chat.isGroup || false);
        // 【心声功能】根据是否为单聊，显示或隐藏心形按钮
        document.getElementById('char-heart-btn').style.display = chat.isGroup ? 'none' : 'inline-flex';

        if (!chat.isGroup && chat.relationship?.status === 'pending_ai_approval') {
            console.log(`检测到好友申请待处理状态，为角色 "${chat.name}" 自动触发AI响应...`);
            triggerAiResponse();
        }

        // 根据是否为群聊，显示或隐藏投票按钮
        document.getElementById('send-poll-btn').style.display = chat.isGroup ? 'flex' : 'none';
        document.getElementById('pet-action-btn').style.display = chat.isGroup ? 'none' : 'flex';
        startPetDecayTimer();
    }

    /**
     * 格式化单条消息，用于记忆互通的上下文
     * @param {object} msg - 消息对象
     * @param {object} chat - 该消息所属的聊天对象
     * @returns {string} - 格式化后的文本，例如 "张三: 你好"
     */













    // Code related to Persona Library has been moved to settings.js


    const batteryAlertModal = document.getElementById('battery-alert-modal');

    function showBatteryAlert(imageUrl, text) {
        clearTimeout(batteryAlertTimeout);
        document.getElementById('battery-alert-image').src = imageUrl;
        document.getElementById('battery-alert-text').textContent = text;
        batteryAlertModal.classList.add('visible');
        const closeAlert = () => {
            batteryAlertModal.classList.remove('visible');
            batteryAlertModal.removeEventListener('click', closeAlert);
        };
        batteryAlertModal.addEventListener('click', closeAlert);
        batteryAlertTimeout = setTimeout(closeAlert, 2000);
    }

    function updateBatteryDisplay(battery) {
        const batteryContainer = document.getElementById('status-bar-battery');
        const batteryLevelEl = batteryContainer.querySelector('.battery-level');
        const batteryTextEl = batteryContainer.querySelector('.battery-text');
        const level = Math.floor(battery.level * 100);
        batteryLevelEl.style.width = `${level}%`;
        batteryTextEl.textContent = `${level}%`;
        if (battery.charging) {
            batteryContainer.classList.add('charging');
        } else {
            batteryContainer.classList.remove('charging');
        }
    }

    function handleBatteryChange(battery) {
        updateBatteryDisplay(battery);
        const level = battery.level;
        if (!battery.charging) {
            if (level <= 0.4 && lastKnownBatteryLevel > 0.4 && !alertFlags.hasShown40) {
                showBatteryAlert('https://i.postimg.cc/T2yKJ0DV/40.jpg', '有点饿了，可以去找充电器惹');
                alertFlags.hasShown40 = true;
            }
            if (level <= 0.2 && lastKnownBatteryLevel > 0.2 && !alertFlags.hasShown20) {
                showBatteryAlert('https://i.postimg.cc/qB9zbKs9/20.jpg', '赶紧的充电，要饿死了');
                alertFlags.hasShown20 = true;
            }
            if (level <= 0.1 && lastKnownBatteryLevel > 0.1 && !alertFlags.hasShown10) {
                showBatteryAlert('https://i.postimg.cc/ThMMVfW4/10.jpg', '已阵亡，还有30秒爆炸');
                alertFlags.hasShown10 = true;
            }
        }
        if (level > 0.4) alertFlags.hasShown40 = false;
        if (level > 0.2) alertFlags.hasShown20 = false;
        if (level > 0.1) alertFlags.hasShown10 = false;
        lastKnownBatteryLevel = level;
    }

    async function initBatteryManager() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                lastKnownBatteryLevel = battery.level;
                handleBatteryChange(battery);
                battery.addEventListener('levelchange', () => handleBatteryChange(battery));
                battery.addEventListener('chargingchange', () => {
                    handleBatteryChange(battery);
                    if (battery.charging) {
                        showBatteryAlert('https://i.postimg.cc/3NDQ0dWG/image.jpg', '窝爱泥，电量吃饱饱');
                    }
                });
            } catch (err) {
                console.error('无法获取电池信息:', err);
                document.querySelector('.battery-text').textContent = 'ᗜωᗜ';
            }
        } else {
            console.log('浏览器不支持电池状态API。');
            document.querySelector('.battery-text').textContent = 'ᗜωᗜ';
        }
    }

    /**
     * 更新动态小红点的显示
     * @param {number} count - 未读动态的数量
     */
    function updateUnreadIndicator(count) {
        window.unreadPostsCount = count;
        localStorage.setItem('unreadPostsCount', count); // 持久化存储

        // --- 更新底部导航栏的“动态”按钮 ---
        const navItem = document.querySelector('.nav-item[data-view="qzone-screen"]');

        const targetSpan = navItem.querySelector('span'); // 定位到文字 "动态"
        let indicator = navItem.querySelector('.unread-indicator');

        if (count > 0) {
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'unread-indicator';
                targetSpan.style.position = 'relative'; // 把相对定位加在 span 上
                targetSpan.appendChild(indicator); // 把小红点作为 span 的子元素
            }
            indicator.textContent = count > 99 ? '99+' : count;
            indicator.style.display = 'block';
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
        }

        // --- 更新聊天界面返回列表的按钮 ---
        const backBtn = document.getElementById('back-to-list-btn');
        let backBtnIndicator = backBtn.querySelector('.unread-indicator');

        if (count > 0) {
            if (!backBtnIndicator) {
                backBtnIndicator = document.createElement('span');
                backBtnIndicator.className = 'unread-indicator back-btn-indicator';
                backBtn.style.position = 'relative'; // 确保能正确定位
                backBtn.appendChild(backBtnIndicator);
            }
            // 返回键上的小红点通常不显示数字，只显示一个点
            backBtnIndicator.style.display = 'block';
        } else {
            if (backBtnIndicator) {
                backBtnIndicator.style.display = 'none';
            }
        }
    }

    /**
     * 【数据迁移】在首次加载时，将旧的硬编码问题迁移到数据库
     */
    async function migrateDefaultLudoQuestions() {
        const defaultBankName = '默认题库';
        const existingBank = await db.ludoQuestionBanks.where('name').equals(defaultBankName).first();
        // 如果“默认题库”已经存在，就说明迁移过了，直接返回
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

        const questionsToAdd = defaultQuestions.map((q) => ({
            bankId: bankId,
            text: q.text,
            type: q.type, // <-- 关键修复：把类型也存进去！
        }));

        await db.ludoQuestions.bulkAdd(questionsToAdd);
        console.log(`成功迁移了 ${questionsToAdd.length} 条默认问题。`);
    }
    /**
     * 将用户自定义的CSS安全地应用到指定的作用域
     * @param {string} cssString 用户输入的原始CSS字符串
     * @param {string} scopeId 应用样式的作用域ID (例如 '#chat-messages' 或 '#settings-preview-area')
     * @param {string} styleTagId 要操作的 <style> 标签的ID
     */




    async function openGroupManager() {
        await renderGroupList();
        document.getElementById('group-management-modal').classList.add('visible');
    }

    async function renderGroupList() {
        const listEl = document.getElementById('existing-groups-list');
        const groups = await db.qzoneGroups.toArray();
        listEl.innerHTML = '';
        if (groups.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">还没有任何分组</p>';
        }
        groups.forEach((group) => {
            const item = document.createElement('div');
            item.className = 'existing-group-item';
            item.innerHTML = `
			            <span class="group-name">${group.name}</span>
			            <span class="delete-group-btn" data-id="${group.id}">×</span>
			        `;
            listEl.appendChild(item);
        });
    }

    async function addNewGroup() {
        const input = document.getElementById('new-group-name-input');
        const name = input.value.trim();
        if (!name) {
            alert('分组名不能为空！');
            return;
        }

        // 在添加前，先检查分组名是否已存在
        const existingGroup = await db.qzoneGroups.where('name').equals(name).first();
        if (existingGroup) {
            alert(`分组 "${name}" 已经存在了，换个名字吧！`);
            return;
        }

        await db.qzoneGroups.add({ name });
        input.value = '';
        await renderGroupList();
    }

    async function deleteGroup(groupId) {
        const confirmed = await showCustomConfirm('确认删除', '删除分组后，该组内的好友将变为“未分组”。确定要删除吗？', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            await db.qzoneGroups.delete(groupId);
            // 将属于该分组的好友的 groupId 设为 null
            const chatsToUpdate = await db.chats.where('groupId').equals(groupId).toArray();
            for (const chat of chatsToUpdate) {
                chat.groupId = null;
                await db.chats.put(chat);
                if (state.chats[chat.id]) state.chats[chat.id].groupId = null;
            }
            await renderGroupList();
        }
    }

    function applyWidgetData() {
        if (!state.globalSettings.widgetData) return;
        for (const elementId in state.globalSettings.widgetData) {
            const element = document.getElementById(elementId);
            const savedValue = state.globalSettings.widgetData[elementId];
            if (element) {
                if (element.tagName === 'IMG') {
                    element.src = savedValue;
                }

                // 如果是地点这个特殊元素，就用 innerHTML 来正确显示图标
                else if (elementId === 'profile-location') {
                    element.innerHTML = savedValue;
                } else {
                    // 其他普通文本元素，保持原来的逻辑不变
                    element.textContent = savedValue;
                }
            }
        }
    }

    /**
     * 打开文件选择器，并返回本地图片的Base64编码
     * @returns {Promise<string|null>} - 返回图片的Base64 Data URL，如果用户取消则返回null
     */
    function uploadImageLocally() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*'; // 只接受图片文件

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                        resolve(readerEvent.target.result); // 返回Base64字符串
                    };
                    reader.readAsDataURL(file);
                } else {
                    resolve(null); // 用户关闭了文件选择框
                }
            };

            input.click();
        });
    }

    async function handleEditText(element) {
        const elementId = element.id;
        const placeholder = element.dataset.placeholder || '请输入新的内容：';
        const textSpan = element.querySelector('span');
        const isComplexElement = !!textSpan;
        const targetElement = isComplexElement ? textSpan : element;
        const currentValue = targetElement.textContent;

        const newValue = await showCustomPrompt('修改文字', '请输入新的内容：', currentValue === placeholder ? '' : currentValue);

        if (newValue !== null) {
            const trimmedValue = newValue.trim();
            targetElement.textContent = trimmedValue ? trimmedValue : placeholder;
            state.globalSettings.widgetData[elementId] = isComplexElement ? element.innerHTML : targetElement.textContent;
            await db.globalSettings.put(state.globalSettings);
        }
    }

    async function handleEditImage(element) {
        const elementId = element.id;

        // 移除按钮文字中的图标
        const choice = await showChoiceModal('修改图片', [
            { text: '从本地上传', value: 'local' },
            { text: '使用网络URL', value: 'url' },
        ]);

        let newValue = null;

        if (choice === 'local') {
            newValue = await uploadImageLocally();
        } else if (choice === 'url') {
            newValue = await showCustomPrompt('修改图片', '请输入新的图片URL：', element.src, 'url');
        }

        if (newValue && newValue.trim()) {
            const trimmedValue = newValue.trim();
            element.src = trimmedValue;
            state.globalSettings.widgetData[elementId] = trimmedValue;
            await db.globalSettings.put(state.globalSettings);
        } else if (choice === 'url' && newValue !== null) {
            alert('请输入一个有效的图片URL！');
        }
    }

    /**
     * 将保存的图标URL应用到主屏幕的App图标上
     */
    function applyAppIcons() {
        if (!state.globalSettings.appIcons) return;

        for (const iconId in state.globalSettings.appIcons) {
            const imgElement = document.getElementById(`icon-img-${iconId}`);
            if (imgElement) {
                imgElement.src = state.globalSettings.appIcons[iconId];
            }
        }
    }

    /**
     * 应用指定的主题（'light' 或 'dark'）
     * @param {string} theme - 要应用的主题名称
     */
    function applyTheme(theme) {
        const phoneScreen = document.getElementById('phone-screen');
        const toggleSwitch = document.getElementById('theme-toggle-switch');

        const isDark = theme === 'dark';

        phoneScreen.classList.toggle('dark-mode', isDark);

        // 如果开关存在，就同步它的状态
        if (toggleSwitch) {
            toggleSwitch.checked = isDark;
        }

        localStorage.setItem('ephone-theme', theme);
    }

    /**
     * 切换当前的主题
     */
    function toggleTheme() {
        const toggleSwitch = document.getElementById('theme-toggle-switch');
        // 直接根据开关的选中状态来决定新主题
        const newTheme = toggleSwitch.checked ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    window.activeTransferTimestamp = null; // 用于暂存被点击的转账消息的时间戳

    function closeMusicPlayerWithAnimation(callback) {
        const overlay = document.getElementById('music-player-overlay');
        if (!overlay.classList.contains('visible')) {
            if (callback) callback();
            return;
        }
        overlay.classList.remove('visible');
        setTimeout(() => {
            document.getElementById('music-playlist-panel').classList.remove('visible');
            if (callback) callback();
        }, 400);
    }

    function parseLRC(lrcContent) {
        if (!lrcContent) return [];
        const lines = lrcContent.split('\n');
        const lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;

        for (const line of lines) {
            const text = line.replace(timeRegex, '').trim();
            if (!text) continue;
            timeRegex.lastIndex = 0;
            let match;
            while ((match = timeRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
                const time = minutes * 60 + seconds + milliseconds / 1000;
                lyrics.push({ time, text });
            }
        }
        return lyrics.sort((a, b) => a.time - b.time);
    }

    function renderLyrics() {
        const lyricsList = document.getElementById('music-lyrics-list');
        lyricsList.innerHTML = '';
        if (!state.musicState.parsedLyrics || state.musicState.parsedLyrics.length === 0) {
            lyricsList.innerHTML = '<div class="lyric-line">♪ 暂无歌词 ♪</div>';
            return;
        }
        state.musicState.parsedLyrics.forEach((line, index) => {
            const lineEl = document.createElement('div');
            lineEl.className = 'lyric-line';
            lineEl.textContent = line.text;
            lineEl.dataset.index = index;
            lyricsList.appendChild(lineEl);
        });
        lyricsList.style.transform = `translateY(0px)`;
    }

    function updateActiveLyric(currentTime) {
        if (state.musicState.parsedLyrics.length === 0) return;
        let newLyricIndex = -1;
        for (let i = 0; i < state.musicState.parsedLyrics.length; i++) {
            if (currentTime >= state.musicState.parsedLyrics[i].time) {
                newLyricIndex = i;
            } else {
                break;
            }
        }
        if (newLyricIndex === state.musicState.currentLyricIndex) return;
        state.musicState.currentLyricIndex = newLyricIndex;
        updateLyricsUI();
    }

    function updateLyricsUI() {
        const lyricsList = document.getElementById('music-lyrics-list');
        const container = document.getElementById('music-lyrics-container');
        const lines = lyricsList.querySelectorAll('.lyric-line');
        lines.forEach((line) => line.classList.remove('active'));
        if (state.musicState.currentLyricIndex === -1) {
            lyricsList.style.transform = `translateY(0px)`;
            return;
        }
        const activeLine = lyricsList.querySelector(`.lyric-line[data-index="${state.musicState.currentLyricIndex}"]`);
        if (activeLine) {
            activeLine.classList.add('active');
            const containerHeight = container.offsetHeight;
            const offset = containerHeight / 3 - activeLine.offsetTop - activeLine.offsetHeight / 2;
            lyricsList.style.transform = `translateY(${offset}px)`;
        }

        // 同步歌词到悬浮栏
        const floatingLyricText = document.getElementById('floating-lyric-text');
        if (activeLine) {
            floatingLyricText.textContent = activeLine.textContent;
        } else if (state.musicState.parsedLyrics.length > 0) {
            floatingLyricText.textContent = '♪ ♪ ♪'; // 歌曲前奏
        } else {
            floatingLyricText.textContent = '♪ 暂无歌词 ♪';
        }
    }

    function formatMusicTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    function updateMusicProgressBar() {
        const currentTimeEl = document.getElementById('music-current-time');
        const totalTimeEl = document.getElementById('music-total-time');
        const progressFillEl = document.getElementById('music-progress-fill');
        if (!audioPlayer.duration) {
            currentTimeEl.textContent = '0:00';
            totalTimeEl.textContent = '0:00';
            progressFillEl.style.width = '0%';
            return;
        }
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFillEl.style.width = `${progressPercent}%`;
        currentTimeEl.textContent = formatMusicTime(audioPlayer.currentTime);
        totalTimeEl.textContent = formatMusicTime(audioPlayer.duration);
        updateActiveLyric(audioPlayer.currentTime);
    }

    /**
     * 导出当前选中的主题为一个JSON文件
     */
    async function exportTheme() {
        if (!activeThemeId) {
            alert('请先选择一个要导出的方案。');
            return;
        }
        const theme = await db.themes.get(activeThemeId);
        const exportData = {
            themeName: theme.name,
            themeCss: theme.css,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name}-Theme.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 导入主题 (支持 JSON, TXT, CSS, DOCX)
     */
    function importTheme(file) {
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const editor = document.getElementById('theme-css-editor'); // 获取编辑器文本框

        // --- 情况A: 如果是 Word 文档 (.docx) ---
        if (fileName.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const arrayBuffer = e.target.result;
                // 使用 mammoth 提取纯文本
                mammoth
                    .extractRawText({ arrayBuffer: arrayBuffer })
                    .then(function (result) {
                        const extractedText = result.value; // 获取提取的文字
                        editor.value = extractedText; // 填入文本框
                        applyThemeCss(extractedText); // 立即应用预览
                        alert(`成功从Word文档读取CSS！`);
                    })
                    .catch(function (err) {
                        console.error(err);
                        alert('读取Word文件失败，请确保文件未损坏。');
                    });
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        // --- 情况B: 如果是文本文件 (.txt 或 .css) ---
        if (fileName.endsWith('.txt') || fileName.endsWith('.css')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                editor.value = text; // 填入文本框
                applyThemeCss(text); // 立即应用预览
                alert(`成功导入文本内容！`);
            };
            reader.readAsText(file);
            return;
        }

        // --- 情况C: 如果是 JSON (旧逻辑) ---
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.themeName && typeof data.themeCss !== 'undefined') {
                    const newTheme = {
                        name: `${data.themeName} (导入)`,
                        css: data.themeCss,
                    };
                    const newId = await db.themes.add(newTheme);
                    await loadThemesToDropdown();
                    document.getElementById('theme-selector').value = newId;
                    handleThemeSelection(); // 导入后自动选中并应用
                    alert(`方案 "${newTheme.name}" 导入成功！`);
                } else {
                    // 如果解析JSON失败，可能是用户选错了文件，尝试当作纯文本填入
                    editor.value = e.target.result;
                    alert('JSON格式不匹配，已尝试将内容作为纯文本填入编辑器。');
                }
            } catch (error) {
                // 最后的兜底：如果不是JSON，直接填进去
                editor.value = e.target.result;
                applyThemeCss(e.target.result);
                alert('已将文件内容填入编辑器。');
            }
        };
        reader.readAsText(file);
    }

    /**
     * 渲染并填充API预设的下拉选择框
     */
    function renderApiPresetSelector() {
        const selectEl = document.getElementById('api-preset-select');
        if (!selectEl) return;

        selectEl.innerHTML = '<option value="">-- 自定义配置 --</option>';

        if (state.apiPresets) {
            state.apiPresets.forEach((preset) => {
                const option = document.createElement('option');
                option.value = preset.id;
                option.textContent = preset.name;
                selectEl.appendChild(option);
            });
        }

        // 检查当前配置是否匹配任何一个预设
        const { proxyUrl, apiKey } = state.apiConfig;
        const matchingPreset = state.apiPresets ? state.apiPresets.find((p) => p.proxyUrl === proxyUrl && p.apiKey === apiKey) : null;

        if (matchingPreset) {
            selectEl.value = matchingPreset.id;
        } else {
            selectEl.value = ''; // 如果不匹配任何预设，则选中“自定义配置”
        }
    }
    window.renderApiPresetSelector = renderApiPresetSelector;

    /**
     * 当用户在下拉框中选择一个预设时触发
     */
    function handleApiPresetSelectChange() {
        const selectEl = document.getElementById('api-preset-select');
        const proxyUrlInput = document.getElementById('proxy-url');
        const apiKeyInput = document.getElementById('api-key');
        const selectedId = parseInt(selectEl.value);

        if (selectedId && state.apiPresets) {
            const selectedPreset = state.apiPresets.find((p) => p.id === selectedId);
            if (selectedPreset) {
                proxyUrlInput.value = selectedPreset.proxyUrl;
                apiKeyInput.value = selectedPreset.apiKey;
            }
        }
    }

    /**
     * 打开预设管理的操作菜单
     */
    async function openApiPresetManager() {
        const selectEl = document.getElementById('api-preset-select');
        const selectedId = parseInt(selectEl.value);
        const selectedPreset = state.apiPresets ? state.apiPresets.find((p) => p.id === selectedId) : null;

        const modal = document.getElementById('preset-actions-modal');
        const footer = modal.querySelector('.custom-modal-footer');

        footer.innerHTML = `
			        <button id="preset-action-save-new">保存当前配置为新预设</button>
			        <button id="preset-action-update-current" ${!selectedPreset ? 'disabled' : ''}>更新当前配置</button>
			        <button id="preset-action-delete-current" class="btn-danger" ${!selectedPreset ? 'disabled' : ''}>删除当前配置</button>
			        <button id="preset-action-cancel" style="margin-top: 8px; border-radius: 8px; background-color: #f0f0f0;">取消</button>
			    `;

        document.getElementById('preset-action-save-new').addEventListener('click', saveCurrentApiConfigAsPreset);
        if (selectedPreset) {
            document.getElementById('preset-action-update-current').addEventListener('click', () => updateSelectedApiPreset(selectedId));
            document.getElementById('preset-action-delete-current').addEventListener('click', () => deleteSelectedApiPreset(selectedId));
        }
        document.getElementById('preset-action-cancel').addEventListener('click', () => modal.classList.remove('visible'));

        modal.classList.add('visible');
    }

    /**
     * 将当前输入框的内容保存为一个新的预设
     */
    async function saveCurrentApiConfigAsPreset() {
        const proxyUrl = document.getElementById('proxy-url').value.trim();
        const apiKey = document.getElementById('api-key').value.trim();

        if (!proxyUrl || !apiKey) {
            alert('代理地址和密钥都不能为空！');
            return;
        }

        const name = await showCustomPrompt('保存API预设', '请为这个配置起个名字：');
        if (name && name.trim()) {
            const newPreset = { name: name.trim(), proxyUrl, apiKey };
            const newId = await db.apiPresets.add(newPreset);

            if (!state.apiPresets) state.apiPresets = [];
            state.apiPresets.push({ id: newId, ...newPreset });

            renderApiPresetSelector();
            document.getElementById('api-preset-select').value = newId;
            document.getElementById('preset-actions-modal').classList.remove('visible');
            await showCustomAlert('成功', `API预设 "${name.trim()}" 已保存！`);
        }
    }

    /**
     * 更新当前选中的预设
     */
    async function updateSelectedApiPreset(presetId) {
        const proxyUrl = document.getElementById('proxy-url').value.trim();
        const apiKey = document.getElementById('api-key').value.trim();

        if (!proxyUrl || !apiKey) {
            alert('代理地址和密钥都不能为空！');
            return;
        }

        const preset = state.apiPresets.find((p) => p.id === presetId);
        if (preset) {
            preset.proxyUrl = proxyUrl;
            preset.apiKey = apiKey;
            await db.apiPresets.put(preset);
            document.getElementById('preset-actions-modal').classList.remove('visible');
            await showCustomAlert('成功', `预设 "${preset.name}" 已更新！`);
        }
    }

    /**
     * 删除当前选中的预设
     */
    async function deleteSelectedApiPreset(presetId) {
        const preset = state.apiPresets.find((p) => p.id === presetId);
        if (preset) {
            const confirmed = await showCustomConfirm('确认删除', `确定要删除API预设 "${preset.name}" 吗？`, {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                await db.apiPresets.delete(presetId);
                state.apiPresets = state.apiPresets.filter((p) => p.id !== presetId);

                renderApiPresetSelector();
                document.getElementById('preset-actions-modal').classList.remove('visible');
                await showCustomAlert('成功', '预设已删除。');
            }
        }
    }

    /**
     * 应用锁屏壁纸到 #lock-screen 元素
     */
    function applyLockscreenWallpaper() {
        const lockScreen = document.getElementById('lock-screen');
        const wallpaper = state.globalSettings.lockscreenWallpaper;
        if (wallpaper && wallpaper.startsWith('data:image')) {
            lockScreen.style.backgroundImage = `url(${wallpaper})`;
        } else if (wallpaper) {
            lockScreen.style.backgroundImage = wallpaper;
        }
    }

    /**
     * 显示锁屏界面
     */
    function lockPhone() {
        console.log('正在锁定手机...');
        isLocked = true;
        document.getElementById('lock-screen').classList.add('active');
        document.querySelectorAll('.screen:not(#lock-screen)').forEach((s) => s.classList.remove('active'));
    }

    /**
     * 解锁手机，显示主屏幕
     */
    function unlockPhone() {
        console.log('手机已解锁！');
        isLocked = false;
        // 彻底隐藏锁屏和毛玻璃背景
        document.getElementById('lock-screen').classList.remove('active');
        const blurBg = document.getElementById('lock-screen-background-blur');
        blurBg.style.display = 'none';
        blurBg.style.opacity = '0';

        // 确保主屏幕是唯一激活的顶层屏幕
        showScreen('home-screen');

        // 重置锁屏的样式，为下次锁定做准备
        setTimeout(() => {
            const lockScreen = document.getElementById('lock-screen');
            const unlockHint = document.getElementById('unlock-hint');
            lockScreen.style.transition = 'none';
            unlockHint.style.transition = 'none';
            lockScreen.style.transform = 'translateY(0)';
            lockScreen.offsetHeight;
            lockScreen.style.transition = 'transform 0.3s ease-out';
            unlockHint.style.transition = 'opacity 0.3s ease-out';
        }, 500);
    }

    /**
     * 显示密码输入弹窗
     */
    function showPasswordModal() {
        const modal = document.getElementById('password-modal-overlay');
        const input = document.getElementById('password-input-field');
        input.value = ''; // 清空上次输入
        modal.classList.add('visible');
        setTimeout(() => input.focus(), 100); // 延迟聚焦，确保动画流畅
    }

    /**
     * 隐藏密码输入弹窗
     */
    function hidePasswordModal() {
        document.getElementById('password-modal-overlay').style.backgroundImage = 'none';

        const modal = document.getElementById('password-modal-overlay');
        modal.classList.remove('visible');
        // 移除可能存在的错误动画类
        modal.querySelector('.password-modal-content').classList.remove('error');
        // 当取消输入密码时...
        // 1. 隐藏毛玻璃背景
        const blurBg = document.getElementById('lock-screen-background-blur');
        blurBg.style.opacity = '0';
        setTimeout(() => {
            blurBg.style.display = 'none';
        }, 300); // 动画结束后再隐藏

        // 2. 让锁屏界面滑回来
        const lockScreen = document.getElementById('lock-screen');
        const unlockHint = document.getElementById('unlock-hint');
        lockScreen.style.transform = 'translateY(0)';
        unlockHint.style.opacity = '1';
    }

    /**
     * 检查用户输入的密码是否正确
     */
    function checkPassword() {
        const input = document.getElementById('password-input-field');
        const enteredPassword = input.value;
        const correctPassword = state.globalSettings.password;

        if (enteredPassword === correctPassword) {
            // --- 密码正确 ---

            // 1. 提前把主屏幕在最底层激活并准备好
            //    因为它 z-index 最低，所以暂时还看不到它。
            showScreen('home-screen');

            // 2. 隐藏密码输入框 (它会自己播放淡出动画)
            document.getElementById('password-modal-overlay').classList.remove('visible');

            // 3. 让毛玻璃背景也开始淡出
            document.getElementById('lock-screen-background-blur').style.opacity = '0';

            // 4. 等待淡出动画播放完毕 (300毫秒)，再执行最终的清理工作
            setTimeout(unlockPhone, 300);
        } else {
            // --- 密码错误 (逻辑保持不变) ---
            const content = document.querySelector('.password-modal-content');
            content.classList.add('error');
            input.value = '';
            setTimeout(() => content.classList.remove('error'), 400);
        }
    }

    /**
     * 更新锁屏界面的时钟
     */
    function updateLockClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
        document.getElementById('lock-main-time').textContent = timeString;
        document.getElementById('lock-main-date').textContent = dateString;
    }





    /**
     * 应用指定的主题（'light' 或 'dark'）
     * @param {string} theme - 要应用的主题名称
     */
    function applyTheme(theme) {
        const phoneScreen = document.getElementById('phone-screen');
        const toggleSwitch = document.getElementById('theme-toggle-switch');

        const isDark = theme === 'dark';

        // 核心操作：添加或移除 .dark-mode 类
        phoneScreen.classList.toggle('dark-mode', isDark);

        // 如果开关存在，就同步它的状态
        if (toggleSwitch) {
            toggleSwitch.checked = isDark;
        }

        // 将用户的选择保存到本地存储，以便下次打开时记住
        localStorage.setItem('ephone-theme', theme);

        // 因为聊天背景色依赖模式，切换后需要重新渲染
        if (state.activeChatId) {
            renderChatInterface(state.activeChatId);
        }
    }

    async function openQZonePublisher(mode) {
        resetCreatePostModal();
        const modal = document.getElementById('create-post-modal');
        modal.dataset.mode = mode;
        document.getElementById('create-post-modal-title').textContent = '发布动态';

        if (mode === 'shuoshuo') {
            modal.querySelector('.post-mode-switcher').style.display = 'none';
            modal.querySelector('#image-mode-content').style.display = 'none';
            modal.querySelector('#text-image-mode-content').style.display = 'none';
            modal.querySelector('#post-public-text').placeholder = '分享新鲜事...';
        } else {
            modal.querySelector('.post-mode-switcher').style.display = 'flex';
            modal.querySelector('#image-mode-content').classList.add('active');
            modal.querySelector('#text-image-mode-content').classList.remove('active');
            modal.querySelector('#post-public-text').placeholder = '分享新鲜事...（非必填的公开文字）';
        }

        document.getElementById('post-comments-toggle-group').style.display = 'block';

        const visibilityGroup = document.getElementById('post-visibility-group');
        const groupsContainer = document.getElementById('post-visibility-groups');
        const visibilityRadios = document.querySelectorAll('input[name="visibility"]');

        visibilityGroup.style.display = 'block';
        groupsContainer.innerHTML = ''; // 清空旧的分组列表

        // 从数据库读取你的好友分组
        const groups = await db.qzoneGroups.toArray();
        if (groups.length > 0) {
            groups.forEach((group) => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${group.id}"> ${group.name}`;
                groupsContainer.appendChild(label);
            });
        } else {
            groupsContainer.innerHTML = '<p style="color: #8a8a8a; font-size: 13px;">还没有创建任何好友分组哦。</p>';
        }

        // 默认选中“所有人可见”并隐藏分组选择
        visibilityRadios[0].checked = true;
        groupsContainer.style.display = 'none';

        // 监听单选按钮的变化
        visibilityRadios.forEach((radio) => {
            radio.onchange = function () {
                groupsContainer.style.display = this.value === 'groups' ? 'block' : 'none';
            };
        });

        modal.classList.add('visible');
    }

    /**
     * 一键清空所有单人聊天背景
     */
    async function clearAllSingleChatBackgrounds() {
        // 弹出确认框，防止误操作
        const confirmed = await showCustomConfirm('确认操作', '此操作将移除所有角色单独设置的聊天背景，统一使用全局背景。确定要继续吗？', { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            let updatedCount = 0;
            const chatsToUpdate = [];

            // 遍历所有聊天
            for (const chatId in state.chats) {
                const chat = state.chats[chatId];
                // 如果这个聊天设置了单人背景
                if (chat.settings && chat.settings.background) {
                    chat.settings.background = ''; // 清空它
                    chatsToUpdate.push(chat);
                    updatedCount++;
                }
            }

            // 如果有需要更新的聊天，就批量写入数据库
            if (chatsToUpdate.length > 0) {
                await db.chats.bulkPut(chatsToUpdate);
            }

            await showCustomAlert('操作成功', `已成功清空 ${updatedCount} 个角色的单人聊天背景！`);
        }
    }

    /**
     * 应用主屏幕图标和小组件的文字颜色
     * @param {string} color - 颜色代码, e.g., '#FFFFFF'
     */
    function applyHomeIconWidgetTextColor(color) {
        const phoneScreen = document.getElementById('phone-screen');
        if (phoneScreen && color) {
            // 使用新的CSS变量名
            phoneScreen.style.setProperty('--home-icon-widget-text-color', color);
        }
    }
    /**
     * 将时长字符串（如“2.5小时”, "30m"）解析为分钟数
     * @param {string} durationString - 时长描述文本
     * @returns {number} - 对应的分钟数
     */
    function parseDurationToMinutes(durationString) {
        if (!durationString || typeof durationString !== 'string') return 0;

        const text = durationString.toLowerCase();
        const num = parseFloat(text.match(/(\d+(\.\d+)?)/)?.[0]) || 0;

        if (text.includes('小时') || text.includes('h')) {
            return num * 60;
        }
        if (text.includes('分钟') || text.includes('m')) {
            return num;
        }
        // 如果没有单位，但数值大于等于10，我们猜测是分钟
        if (num >= 10) {
            return num;
        }
        // 其他情况（如数值很小且无单位），猜测是小时
        return num * 60;
    }

    /**
     * 将总分钟数格式化为 "X小时Y分钟" 的字符串
     * @param {number} totalMinutes - 总分钟数
     * @returns {string} - 格式化后的时长字符串
     */
    function formatMinutesToDuration(totalMinutes) {
        if (totalMinutes < 1) return '不到1分钟';

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);

        if (hours > 0 && minutes > 0) {
            return `${hours}小时${minutes}分钟`;
        } else if (hours > 0) {
            return `${hours}小时`;
        } else {
            return `${minutes}分钟`;
        }
    }

    /**
     * 处理用户在宠物聊天框中发送消息
     */


    /**
     * 更新角色手机钱包的余额和交易记录
     * @param {string} charId - 要更新钱包的角色ID
     * @param {number} amount - 交易金额 (正数为收入, 负数为支出)
     * @param {string} description - 交易描述 (例如: "转账给 XX", "收到 XX 的红包")
     */
    // Expose to global


    let isIntentionalStop = false;
    window.isTtsPlaying = false;
    window.currentTtsAudioBubble = null;

    /**
     * 为Token计算准备完整的上下文和提示词
     * @param {string} chatId - 目标聊天的ID
     * @returns {Promise<string>} - 拼接好的、将要发送给AI的完整文本
     */
    async function getContextForTokenCalculation(chatId) {
        const chat = state.chats[chatId];
        if (!chat) return '';

        let combinedText = '';
        const settings = chat.settings;

        // 1. 添加核心提示词 (人设)
        if (chat.isGroup) {
            const membersList = chat.members.map((m) => `- **${m.originalName}**: ${m.persona}`).join('\n');
            const myNickname = chat.settings.myNickname || '我';
            combinedText += `你是一个群聊AI... # 群成员列表及人设\n${membersList}\n# 用户的角色\n- **${myNickname}**: ${chat.settings.myPersona}`;
        } else {
            combinedText += chat.settings.aiPersona || '';
            combinedText += chat.settings.myPersona || '';
        }

        // 2. 添加世界书内容
        if (settings.linkedWorldBookIds && settings.linkedWorldBookIds.length > 0) {
            const linkedContents = settings.linkedWorldBookIds
                .map((bookId) => {
                    const worldBook = state.worldBooks.find((wb) => wb.id === bookId);
                    return worldBook ? worldBook.content : '';
                })
                .join('\n');
            combinedText += linkedContents;
        }

        // 3. 添加所有总结作为长期记忆
        const summaryContext = chat.history
            .filter((msg) => msg.type === 'summary')
            .map((s) => s.content)
            .join('\n');
        combinedText += summaryContext;

        // 4. 添加最近的对话记录 (上下文记忆)
        const history = chat.history.filter((msg) => !msg.isHidden);
        const memoryDepth = settings.maxMemory || 10;
        const contextMessages = history.slice(-memoryDepth);

        const messageText = contextMessages
            .map((msg) => {
                let content = '';
                if (typeof msg.content === 'string') {
                    content = msg.content;
                } else if (Array.isArray(msg.content)) {
                    content = '[图片]'; // 将图片简化为占位符
                } else if (msg.type) {
                    content = `[${msg.type}]`;
                }
                const sender = msg.role === 'user' ? '用户' : msg.senderName || chat.name;
                return `${sender}: ${content}`;
            })
            .join('\n');

        combinedText += '\n' + messageText;

        return combinedText;
    }


    /**
     * 处理取消情侣空间
     */
    async function handleCancelLoversSpace() {
        if (!activeLoversSpaceCharId) return;
        const confirmed = await showCustomConfirm('取消情侣空间', '确定要取消情侣空间吗？这会使空间变为未启用状态，但所有数据（说说、照片等）都会被保留。此操作不会通知对方。', { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            const chat = state.chats[activeLoversSpaceCharId];
            if (chat && chat.loversSpaceData) {
                // 将情侣空间数据设置为null，即可禁用它
                chat.loversSpaceData = null;
                await db.chats.put(chat);
                document.getElementById('ls-settings-modal').classList.remove('visible');
                alert('情侣空间已取消。');
                // 返回到聊天列表主屏幕
                showScreen('chat-list-screen');
            }
        }
    }

    /**
     * 处理解除情侣关系
     */
    async function handleDisconnectLoversSpace() {
        if (!activeLoversSpaceCharId) return;
        const chat = state.chats[activeLoversSpaceCharId];
        if (!chat) return;

        const confirmed = await showCustomConfirm('解除关系', `确定要与“${chat.name}”解除关系吗？情侣空间将被取消，并且对方会收到通知并对此发表意见。`, { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            // 1. 禁用空间
            chat.loversSpaceData = null;

            // 2. 创建您发出的、在右侧的“解除卡片”
            const userDisconnectCardMessage = {
                role: 'user',
                type: 'lovers_space_disconnect', // 一个新类型，用于渲染卡片
                content: `情侣空间已解除`, // 卡片底层可编辑的文字
                timestamp: Date.now(),
            };
            chat.history.push(userDisconnectCardMessage);

            // 3. 创建居中的、灰色的“系统通知”
            const systemNotification = {
                role: 'system',
                type: 'pat_message', // 复用“拍一拍”的居中灰色气泡样式
                content: `你和 ${chat.name} 的情侣空间已解除`,
                timestamp: Date.now() + 1, // 时间戳+1确保在卡片之后
            };
            chat.history.push(systemNotification);

            // 4. 给AI看的隐藏指令
            const hiddenMessageForAI = {
                role: 'system',
                content: `[系统指令：用户刚刚解除了与你的情侣关系。]`,
                timestamp: Date.now() + 2, // 时间戳再+1
                isHidden: true,
            };
            chat.history.push(hiddenMessageForAI);

            // 5. 保存、关闭弹窗、跳转、触发回应
            await db.chats.put(chat);
            document.getElementById('ls-settings-modal').classList.remove('visible');
            document.getElementById('lovers-space-screen').classList.remove('visible');

            openChat(activeLoversSpaceCharId);

            alert('关系已解除，对方已知晓。');
            triggerAiResponse();
        }
    }

    /**
     * 将时间字符串（如 "20:00", "早上9点"）解析为分钟数
     * @param {string} timeStr - 时间字符串
     * @returns {number} - 从午夜0点开始的分钟数
     */
    function parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return -1; // 错误或无效输入返回-1

        let hours = 0;
        let minutes = 0;

        // 匹配 "HH:mm" 或 "H:mm" 格式
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
        } else {
            // 如果不是标准格式，尝试匹配中文描述
            const numMatch = timeStr.match(/(\d+)/);
            const num = numMatch ? parseInt(numMatch[0], 10) : -1;

            if (num !== -1) {
                if (timeStr.includes('下午') || timeStr.includes('晚上')) {
                    // 下午1点(13点)到晚上11点(23点)
                    if (num < 12) {
                        hours = num + 12;
                    } else {
                        hours = num; // 如果已经是24小时制如“晚上20点”，直接使用
                    }
                } else {
                    // 早上或上午
                    hours = num;
                }
            } else {
                return -1; // 无法解析
            }
        }

        // 处理特殊情况，如晚上12点应为0点
        if ((timeStr.includes('晚上') || timeStr.includes('凌晨')) && hours === 12) {
            hours = 0;
        }
        // 处理下午12点应为12点
        if ((timeStr.includes('下午') || timeStr.includes('中午')) && hours === 24) {
            hours = 12;
        }

        return hours * 60 + minutes;
    }
    /**
     * 检查并更新火花天数 (已修复熄灭后从1开始的问题)
     * @param {string} chatId - 要更新火花的聊天ID
     * @returns {Promise<boolean>} - 如果火花天数有变化，则返回true
     */
    window.updateStreak = updateStreak; // Expose to global
    async function updateStreak(chatId) {
        const chat = state.chats[chatId];
        // 如果不是单聊，或者功能未开启，直接返回
        if (!chat || chat.isGroup || !chat.settings.streak?.enabled) {
            return false;
        }

        const streak = chat.settings.streak;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式

        // 如果今天已经互动过了，就什么都不做
        if (streak.lastInteractionDate === today) {
            return false;
        }

        let changed = false;

        // 检查火花是否已熄灭
        if (streak.lastInteractionDate && streak.extinguishThreshold !== -1) {
            const lastDate = new Date(streak.lastInteractionDate);
            const todayDate = new Date(today);
            // 为了精确计算天数差异，我们将两个日期都设置为UTC时间的午夜
            const lastDateUTC = Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
            const todayDateUTC = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

            const daysDiff = (todayDateUTC - lastDateUTC) / (1000 * 60 * 60 * 24);

            if (daysDiff >= streak.extinguishThreshold) {
                // 如果断联天数达到了你设置的阈值，就将当前火花天数归零。
                streak.currentDays = 0;
                console.log(`🔥 与 ${chat.name} 的火花因超过 ${streak.extinguishThreshold} 天未联系而熄灭，将重新从 1 开始计算。`);
                changed = true;
            }
        }

        // 今天是新的互动日，天数+1
        // 如果是永不熄灭模式，currentDays 为 -1, 不应该增加
        if (streak.currentDays >= 0) {
            streak.currentDays++;
            changed = true;
        }

        // 无论火花是否熄灭，只要今天互动了，就把“最后互动日期”更新为今天。
        streak.lastInteractionDate = today;

        await db.chats.put(chat);

        if (changed) {
            console.log(`🔥 与 ${chat.name} 的火花天数更新为: ${streak.currentDays}`);
        }

        return changed; // 返回是否发生了变化
    }



    /**
     * 发送一条居中显示的系统消息到当前聊天
     * @param {string} chatId - 目标聊天的ID
     * @param {string} messageContent - 要显示的消息内容
     */
    async function logSystemMessage(chatId, messageContent) {
        const chat = state.chats[chatId];
        if (!chat) return;

        // 1. 创建系统消息对象
        const systemMessage = {
            role: 'system', // 这是一个系统角色的消息
            type: 'pat_message', // 复用“拍一拍”的居中灰色气泡样式
            content: messageContent,
            timestamp: Date.now(),
        };

        // 2. 将消息添加到聊天记录并保存
        chat.history.push(systemMessage);
        await db.chats.put(chat);

        // 3. 如果用户正在查看此聊天，则立即显示新消息
        if (state.activeChatId === chatId && document.getElementById('chat-interface-screen').classList.contains('active')) {
            appendMessage(systemMessage, chat);
        }

        // 4. 刷新聊天列表以更新预览
        await renderChatList();

        console.log(`系统消息已记录: ${messageContent}`);
    }

    /**
     * 保存新的群公告
     */
    async function saveGroupAnnouncement() {
        const chat = state.chats[state.activeChatId];
        const newContent = document.getElementById('announcement-editor').value.trim();

        chat.settings.groupAnnouncement = newContent;
        await db.chats.put(chat);

        const myNickname = chat.settings.myNickname || '我';
        await logSystemMessage(chat.id, `“${myNickname}”修改了群公告。`);

        closeGroupAnnouncementModal();
        alert('群公告已更新！');
    }

    /**
     * 获取并格式化当前聊天的续火花状态，生成给AI看的上下文
     * @param {object} chat - 当前的聊天对象
     * @returns {string} - 格式化后的火花状态文本，或空字符串
     */
    window.getStreakContext = getStreakContext; // Expose to global
    async function getStreakContext(chat) {
        // 1. 安全检查：如果不是单聊，或者功能未开启，则直接返回空内容
        if (!chat || chat.isGroup || !chat.settings.streak?.enabled) {
            return '';
        }

        const streak = chat.settings.streak;
        const currentDays = streak.currentDays || 0;
        const extinguishThreshold = streak.extinguishThreshold || 1;
        const lastInteractionDate = streak.lastInteractionDate;
        let isExtinguished = false;

        // 2. 判断火花是否已熄灭
        if (lastInteractionDate && extinguishThreshold !== -1) {
            const lastDate = new Date(lastInteractionDate);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0); // 将时间设为当日零点，以精确计算天数

            // 计算最后一次互动到今天过了多少天
            const daysDiff = (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff >= extinguishThreshold) {
                isExtinguished = true;
            }
        }

        let statusText = '';

        // 3. 根据不同状态，生成给AI看的不同文本
        if (isExtinguished && currentDays > 0) {
            // 这种状态表示“曾经有过火花，但现在断了”
            statusText = `你们的聊天火花【已熄灭】。之前曾连续聊了 ${currentDays} 天，但现在中断了。`;
        } else if (currentDays > 10) {
            statusText = `你们的聊天火花正在热烈燃烧，已经持续了【${currentDays}】天了！这是一个值得纪念的数字。`;
        } else if (currentDays > 0) {
            statusText = `你们的聊天火花正在延续，已经持续了【${currentDays}】天。`;
        } else {
            // 天数为0，说明是刚开启或刚重置
            statusText = '你们刚刚点燃了聊天火花，要继续保持哦！';
        }

        // 4. 拼接成最终的上下文格式
        return `\n- **聊天火花状态**: ${statusText}`;
    }

    /**
     * 当用户点击心声面板的编辑按钮时，打开操作菜单
     */
    async function showInnerVoiceEditOptions() {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const borderHidden = chat.settings.innerVoiceHideHeaderBorder || false;
        const borderOptionText = borderHidden ? '显示分割线' : '隐藏分割线';

        // 选项数组里新增 'editStyles'
        const choice = await showChoiceModal('编辑心声面板', [
            { text: '🎨 编辑面板样式', value: 'editStyles' },
            { text: borderOptionText, value: 'toggleBorder' },
            { text: '修改领养人', value: 'editAdopter' },
        ]);

        if (choice === 'editStyles') {
            openInnerVoiceStyleEditor(); // 调用我们新写的函数来打开样式编辑器
        } else if (choice === 'toggleBorder') {
            await toggleInnerVoiceHeaderBorder();
        } else if (choice === 'editAdopter') {
            await editInnerVoiceAdopterName();
        }
    }

    /**
     * 切换心声面板头部分割线的显示/隐藏
     */
    async function toggleInnerVoiceHeaderBorder() {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 确保 chat.settings 存在
        if (!chat.settings) chat.settings = {};

        // 切换布尔值
        chat.settings.innerVoiceHideHeaderBorder = !(chat.settings.innerVoiceHideHeaderBorder || false);

        // 保存到数据库
        await db.chats.put(chat);

        // 更新UI
        const header = document.querySelector('#inner-voice-main-panel .modal-header');
        if (header) {
            header.classList.toggle('no-border', chat.settings.innerVoiceHideHeaderBorder);
        }

        await showCustomAlert('操作成功', `分割线已${chat.settings.innerVoiceHideHeaderBorder ? '隐藏' : '显示'}。`);
    }

    /**
     * 修改“领养人”的标签模板
     */
    async function editInnerVoiceAdopterName() {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 获取当前的标签模板，如果没有设置过，就使用默认值
        const currentFormat = chat.settings.innerVoiceAdopterLabelFormat || '领养人: {{user}}';

        // 弹出输入框，让用户编辑整个模板字符串
        const newFormat = await showCustomPrompt('修改领养人标签', '你可以修改整个标签，其中 {{user}} 会被自动替换为你的昵称。', currentFormat);

        // 如果用户输入了新内容（不是取消）
        if (newFormat !== null) {
            // 保存新模板，如果输入为空则恢复默认
            chat.settings.innerVoiceAdopterLabelFormat = newFormat.trim() || '领养人: {{user}}';
            await db.chats.put(chat);

            // 重新渲染心声面板以显示新标签
            openInnerVoiceModal();
            await showCustomAlert('修改成功', '领养人标签已更新！');
        }
    }

    /* ▼▼▼ 心声面板样式编辑功能的核心函数 ▼▼▼ */

    /**
     * 将十六进制颜色(#FFFFFF)转换为 "R, G, B" 字符串 (255, 255, 255)
     * @param {string} hex - 十六进制颜色代码
     * @returns {string} - RGB字符串
     */
    function hexToRgb(hex) {
        if (!hex || hex.length < 4) return '255, 255, 255';
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
    }

    /**
     * 将保存的样式应用到心声面板
     */
    function applySavedInnerVoiceStyles() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.settings.innerVoiceStyles) return;

        const styles = chat.settings.innerVoiceStyles;
        const panel = document.getElementById('inner-voice-main-panel');

        panel.style.setProperty('--iv-color-clothing', styles.clothingColor);
        panel.style.setProperty('--iv-color-behavior', styles.behaviorColor);
        panel.style.setProperty('--iv-color-thoughts', styles.thoughtsColor);
        panel.style.setProperty('--iv-color-naughty', styles.naughtyColor);
        panel.style.setProperty('--iv-card-bg-rgb', hexToRgb(styles.cardBgColor));
        panel.style.setProperty('--iv-card-opacity', styles.cardOpacity);

        // 应用保存的图标颜色
        panel.style.setProperty('--iv-icon-color', styles.iconColor || '#ff8a80');
    }

    /**
     * 打开心声面板样式编辑器
     */
    function openInnerVoiceStyleEditor() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.settings.innerVoiceStyles) return;

        document.getElementById('inner-voice-edit-options-modal')?.classList.remove('visible');

        const styles = chat.settings.innerVoiceStyles;
        // === 【修复重点】：安全获取标签配置 ===
        const tags = chat.settings.innerVoiceTags || {};
        const modal = document.getElementById('inner-voice-editor-modal');

        // 加载标签名和指令（如果为空则显示默认值）
        document.getElementById('iv-label-clothing').value = tags.clothing_label || '服装';
        document.getElementById('iv-prompt-clothing').value = tags.clothing_prompt || '详细描述你当前从头到脚的全身服装。';

        document.getElementById('iv-label-behavior').value = tags.behavior_label || '行为';
        document.getElementById('iv-prompt-behavior').value = tags.behavior_prompt || '描述你当前符合聊天情景的细微动作或表情。';

        document.getElementById('iv-label-thoughts').value = tags.thoughts_label || '心声';
        document.getElementById('iv-prompt-thoughts').value = tags.thoughts_prompt || '描述你此刻丰富、细腻的内心真实想法（50字左右）。';

        document.getElementById('iv-label-naughty').value = tags.naughty_label || '坏心思';
        document.getElementById('iv-prompt-naughty').value = tags.naughty_prompt || '描述你此刻与情境相关的腹黑或色色的坏心思，必须符合人设。';

        // 加载当前样式到编辑器
        document.getElementById('iv-color-clothing').value = styles.clothingColor;
        document.getElementById('iv-color-behavior').value = styles.behaviorColor;
        document.getElementById('iv-color-thoughts').value = styles.thoughtsColor;
        document.getElementById('iv-color-naughty').value = styles.naughtyColor;
        document.getElementById('iv-card-bg-color').value = styles.cardBgColor;
        document.getElementById('iv-opacity-slider').value = styles.cardOpacity;
        document.getElementById('iv-opacity-value').textContent = `${Math.round(styles.cardOpacity * 100)}%`;

        // 加载保存的图标颜色
        document.getElementById('iv-icon-color').value = styles.iconColor || '#ff8a80';

        modal.classList.add('visible');
    }

    /**
     * 保存用户修改的样式
     */
    async function saveInnerVoiceStyles() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];

        // 1. 保存样式 (保持不变)
        const newStyles = {
            clothingColor: document.getElementById('iv-color-clothing').value,
            behaviorColor: document.getElementById('iv-color-behavior').value,
            thoughtsColor: document.getElementById('iv-color-thoughts').value,
            naughtyColor: document.getElementById('iv-color-naughty').value,
            cardBgColor: document.getElementById('iv-card-bg-color').value,
            cardOpacity: parseFloat(document.getElementById('iv-opacity-slider').value),
            iconColor: document.getElementById('iv-icon-color').value,
        };

        // 2. 保存标签名和指令 (新增)
        // 如果用户留空，就使用默认值兜底
        const newTags = {
            clothing_label: document.getElementById('iv-label-clothing').value.trim() || '服装',
            clothing_prompt: document.getElementById('iv-prompt-clothing').value.trim() || '详细描述你当前从头到脚的全身服装。',

            behavior_label: document.getElementById('iv-label-behavior').value.trim() || '行为',
            behavior_prompt: document.getElementById('iv-prompt-behavior').value.trim() || '描述你当前符合聊天情景的细微动作或表情。',

            thoughts_label: document.getElementById('iv-label-thoughts').value.trim() || '心声',
            thoughts_prompt: document.getElementById('iv-prompt-thoughts').value.trim() || '描述你此刻丰富、细腻的内心真实想法（50字左右）。',

            naughty_label: document.getElementById('iv-label-naughty').value.trim() || '坏心思',
            naughty_prompt: document.getElementById('iv-prompt-naughty').value.trim() || '描述你此刻与情境相关的腹黑或色色的坏心思，必须符合人设。',
        };

        // 更新到state和数据库
        chat.settings.innerVoiceStyles = newStyles;
        chat.settings.innerVoiceTags = newTags;

        await db.chats.put(chat);

        // 关闭弹窗
        document.getElementById('inner-voice-editor-modal').classList.remove('visible');

        // 重新应用样式
        applySavedInnerVoiceStyles();

        // 如果面板开着，重新打开一下以刷新标签文字
        if (document.getElementById('inner-voice-modal').classList.contains('visible')) {
            openInnerVoiceModal();
        }

        await showCustomAlert('保存成功', '心声配置已更新！\nAI将在下次回复时遵循你的新指令。');
    }

    /**
     * 初始化默认的小组
     */
    async function initializeDefaultGroups() {
        const groupCount = await db.forumGroups.count();
        if (groupCount === 0) {
            const defaultGroups = [
                { name: '娱乐小组', description: '分享八卦和快乐', icon: '🍿' },
                { name: '灵异小组', description: '分享你的灵异经历', icon: '👻' },
                { name: '今天我crush了吗', description: '记录心动瞬间', icon: '💖' },
                { name: '请帮我选择小组', description: '选择困难症患者互助', icon: '🤔' },
                { name: '同人文小组', description: '为爱发电，创作故事', icon: '✍️' },

                { name: '梦角小组', description: 'Char们分享关于user的梦境', icon: '🌙' },
            ];
            await db.forumGroups.bulkAdd(defaultGroups);
            console.log('已成功创建默认小组（包含梦角小组）。');
        }
    }

    const isImage = (text, content) => { // dummy placeholder if needed or move real function here
        // implementation found above
        return [];
    }

    window.activeGroupId = null;

    /**
     * 清空所有好友动态（不包括微博和圈子）
     */
    async function clearAllQzonePosts() {
        // 1. 弹出确认框，防止用户误操作
        const confirmed = await showCustomConfirm(
            '确认清空',
            '此操作将永久删除所有好友动态（不包括微博和圈子），且无法恢复。确定要继续吗？',
            { confirmButtonClass: 'btn-danger' } // 使用红色按钮警示
        );

        if (!confirmed) {
            return; // 如果用户点击“取消”，则不执行任何操作
        }

        try {
            // 2. 清空数据库中的 `qzonePosts` 表，这是存储所有动态的地方
            await db.qzonePosts.clear();
            console.log('`qzonePosts` table has been cleared.');

            // 3. 清理所有角色的历史记录，移除与动态相关的系统通知，保持数据一致性
            const allChats = Object.values(state.chats);
            const chatsToUpdate = [];
            for (const chat of allChats) {
                const originalHistoryLength = chat.history.length;
                // 筛选掉内容包含“发布了”的系统消息
                chat.history = chat.history.filter((msg) => !(msg.role === 'system' && msg.content && msg.content.includes('发布了')));
                if (chat.history.length < originalHistoryLength) {
                    chatsToUpdate.push(chat);
                }
            }
            if (chatsToUpdate.length > 0) {
                await db.chats.bulkPut(chatsToUpdate);
                console.log(`已从 ${chatsToUpdate.length} 个角色的历史记录中移除动态通知。`);
            }

            // 4. 重新渲染动态列表，界面会显示为空
            await renderQzonePosts();

            // 5. 给出成功提示
            alert('所有好友动态已清空！');
        } catch (error) {
            console.error('清空好友动态时出错:', error);
            await showCustomAlert('操作失败', `清空动态时发生错误: ${error.message}`);
        }
    }

    // 4. 初始化函数 init()
    // ===================================================================
    async function init() {
        // Initialize WorldBookModule after db is ready
        if (window.WorldBookModule) {
            window.WorldBookModule.init({
                db: db,
                addLongPressListener: addLongPressListener,
                showCustomConfirm: window.showCustomConfirm,
                showCustomAlert: window.showCustomAlert,
                showChoiceModal: showChoiceModal,
                showCustomPrompt: window.showCustomPrompt,
                showScreen: window.showScreen
            });
        }

        const savedTheme = localStorage.getItem('ephone-theme') || 'light'; // 默认为日间模式
        applyTheme(savedTheme);

        const customBubbleStyleTag = document.createElement('style');
        customBubbleStyleTag.id = 'custom-bubble-style';
        document.head.appendChild(customBubbleStyleTag);

        const previewBubbleStyleTag = document.createElement('style');
        previewBubbleStyleTag.id = 'preview-bubble-style';
        document.head.appendChild(previewBubbleStyleTag);

        applyScopedCss('', '#chat-messages', 'custom-bubble-style'); // 清除真实聊天界面的自定义样式
        applyScopedCss('', '#settings-preview-area', 'preview-bubble-style'); // 清除预览区的自定义样式

        window.showScreen = showScreen;

        window.renderChatListProxy = renderChatList;
        window.renderApiSettingsProxy = window.renderApiSettings;
        window.renderWallpaperScreenProxy = renderWallpaperScreen;
        window.renderWorldBookScreenProxy = () => { if (window.WorldBookModule) window.WorldBookModule.renderWorldBookScreen(); };

        const keepAliveUnlocker = () => {
            const player = document.getElementById('strong-keep-alive-player');
            if (player) {
                // 将音量设置为极小值，以避免被系统判断为静音而挂起，同时允许 Media Session 显示
                player.volume = 0.001;

                player.play()
                    .then(() => {
                        console.log('🔥 强力保活模式已激活：静音音频正在循环播放');

                        // 播放成功后移除监听器，避免重复触发
                        document.removeEventListener('click', keepAliveUnlocker);
                        document.removeEventListener('touchstart', keepAliveUnlocker);

                        if ('mediaSession' in navigator) {
                            // 如果主音乐播放器正在播放，不要覆盖 Media Session
                            if (window.audioPlayer && !window.audioPlayer.paused) {
                                console.log('音乐播放中，保活音频跳过接管 MediaSession');
                                return;
                            }

                            // 仅当应用首次加载且没有任何音乐播放时，保活音频才注册 Media Session
                            // 一旦主播放器启动，它将接管。

                            // 注意：我们这里故意不注册 play/pause handler 指向 keepAlive player
                            // 因为如果用户点击 play，他们通常期望播放音乐，而不是这个静音音频。
                            // 但为了让系统认为我们在播放，我们需要设置 state。

                            navigator.mediaSession.metadata = new MediaMetadata({
                                title: '后台保活运行中',
                                artist: '点击暂停可能导致应用休眠',
                                album: 'EPhone',
                                artwork: [
                                    { src: 'https://i.postimg.cc/Fz25WLbr/7D99384EE38C42D2BA98F53E4582FEA8.jpg', sizes: '192x192', type: 'image/png' },
                                    { src: 'https://i.postimg.cc/Fz25WLbr/7D99384EE38C42D2BA98F53E4582FEA8.jpg', sizes: '512x512', type: 'image/png' }
                                ]
                            });

                            navigator.mediaSession.playbackState = 'playing';

                            // 定义保活音频的 MediaSession 更新逻辑
                            const updateKeepAliveSession = () => {
                                if ('mediaSession' in navigator && !player.paused) {
                                    const duration = player.duration;
                                    const currentTime = player.currentTime;
                                    if (Number.isFinite(duration) && duration > 0) {
                                        try {
                                            navigator.mediaSession.setPositionState({
                                                duration: duration,
                                                playbackRate: player.playbackRate || 1,
                                                position: Math.min(Math.max(0, currentTime), duration)
                                            });
                                        } catch (e) { }
                                    }
                                }
                            };

                            // 初始设置
                            updateKeepAliveSession();

                            // 监听时间更新以处理循环播放时的进度重置
                            // 节流更新：不需要每次 timeupdate 都更新，只要在关键时刻（如循环归零）更新即可
                            // 但为了显示准确，我们允许它自然走，只在检测到 loop (currentTime 变小) 时强制更新
                            let lastTime = 0;
                            player.addEventListener('timeupdate', () => {
                                const nowTime = player.currentTime;
                                // 简单的循环检测：如果当前时间小于上一次时间，说明发生了循环
                                if (nowTime < lastTime) {
                                    updateKeepAliveSession();
                                }
                                lastTime = nowTime;

                                // 也可以定期（比如每5秒）同步一次以防漂移
                                if (Math.abs(nowTime % 5) < 0.3) {
                                    updateKeepAliveSession();
                                }
                            });

                            // 确保元数据加载后更新一次时长
                            player.addEventListener('loadedmetadata', updateKeepAliveSession);
                            player.addEventListener('ratechange', updateKeepAliveSession);

                            // 绑定空的 handler 防止报错，或者指向主播放器（如果已加载）
                            navigator.mediaSession.setActionHandler('play', () => {
                                // 优先通过界面按钮触发，因为 musicplayer.js 内部可能有复杂的恢复逻辑（如重新加载）
                                const btn = document.getElementById('music-play-pause-btn');
                                if (btn) {
                                    btn.click();
                                } else if (window.audioPlayer) {
                                    window.audioPlayer.play().catch(() => { });
                                }
                            });
                            navigator.mediaSession.setActionHandler('pause', () => {
                                // 允许暂停保活，但通常这会导致休眠
                                player.pause();
                            });
                        }
                    })
                    .catch((e) => {
                        console.warn('保活启动失败 (可能被自动播放策略拦截，等待用户交互):', e);
                        // 失败时不移除监听器，等待用户下一次点击
                    });
            }
        };

        // 尝试立即启动 (针对允许自动播放的环境)
        keepAliveUnlocker();

        // 注册交互监听器 (针对需要用户交互的环境)
        document.addEventListener('click', keepAliveUnlocker);
        document.addEventListener('touchstart', keepAliveUnlocker);

        // --- 修复：初始化QQ底部导航栏点击事件 ---
        const bottomNavItems = document.querySelectorAll('#chat-list-bottom-nav .nav-item');
        bottomNavItems.forEach((item) => {
            // 移除可能存在的旧监听器（如果是克隆节点的方式则需要，这里直接绑定即可，因为init只运行一次）
            item.onclick = () => {
                const viewId = item.dataset.view;
                if (viewId && window.switchToChatListView) {
                    window.switchToChatListView(viewId);
                }
            };
        });

        // --- 修复：初始化各子模块的事件监听 ---
        // 动态(QZone)模块
        if (window.initQzoneEventListeners) {
            window.initQzoneEventListeners();
        }
        // 收藏模块
        if (window.initFavoritesModule) {
            window.initFavoritesModule();
        }
        // 补充收藏页面的返回按钮逻辑(如果模块内未定义)
        const favoritesBackBtn = document.getElementById('favorites-back-btn');
        if (favoritesBackBtn) {
            favoritesBackBtn.onclick = () => {
                if (window.switchToChatListView) window.switchToChatListView('messages-view');
            };
        }
        // 回忆模块
        if (window.initMemoriesEventListeners) {
            window.initMemoriesEventListeners();
        }
        // ------------------------------------

        await loadAllDataFromDB();

        // 1. 加载数据到内存
        state.passerbyAvatars = await db.passerbyAvatars.toArray();

        // 2. 绑定设置页面的按钮
        document.getElementById('manage-passerby-avatars-btn').addEventListener('click', openPasserbyManager);
        document.getElementById('add-passerby-avatar-btn').addEventListener('click', handleAddPasserbyAvatar);

        // 3. 绑定弹窗内的按钮
        document.getElementById('close-passerby-manager-btn').addEventListener('click', () => {
            document.getElementById('passerby-avatar-manager-modal').classList.remove('visible');
        });
        document.getElementById('bulk-add-passerby-btn').addEventListener('click', handleAddPasserbyAvatar);

        // 4. 绑定文件输入框
        document.getElementById('passerby-upload-input').addEventListener('change', handlePasserbyFileChange);

        // Init external modules
        if (typeof window.initLoversSpace === 'function') initLoversSpace();
        if (typeof window.initTaobao === 'function') initTaobao();
        if (typeof window.initTukeyAccounting === 'function') initTukeyAccounting();
        if (typeof window.initKkCheckin === 'function') initKkCheckin();
        initDesktopManager();

        // 修复：初始化 QQ 设置模块
        if (typeof window.initQQSettings === 'function') {
            // 尽可能传递常用的依赖，部分函数如果未定义则传 undefined
            window.initQQSettings({
                state, db, renderChatInterface, renderChatList,
                showCustomAlert, showCustomConfirm, applyScopedCss,
                getTokenDetailedBreakdown: typeof getTokenDetailedBreakdown !== 'undefined' ? getTokenDetailedBreakdown : undefined,
                exportChatHistory: typeof exportChatHistory !== 'undefined' ? exportChatHistory : undefined,
                importChatHistory: typeof importChatHistory !== 'undefined' ? importChatHistory : undefined,
                handleImageUploadAndCompress: typeof handleImageUploadAndCompress !== 'undefined' ? handleImageUploadAndCompress : undefined,
                applyCustomFont: typeof applyCustomFont !== 'undefined' ? applyCustomFont : undefined,
                defaultAvatar, defaultGroupAvatar, defaultMyGroupAvatar,
                appendMessage: typeof appendMessage !== 'undefined' ? appendMessage : window.appendMessage,
                openCharStickerManager: window.openCharStickerManager,
                // openNpcManager moved to setting.js internal
                openManualSummaryOptions: typeof openManualSummaryOptions !== 'undefined' ? openManualSummaryOptions : undefined,
                openMemberManagementScreen: typeof openMemberManagementScreen !== 'undefined' ? openMemberManagementScreen : undefined,
                showChoiceModal: typeof showChoiceModal !== 'undefined' ? showChoiceModal : undefined,
                showCustomPrompt: typeof showCustomPrompt !== 'undefined' ? showCustomPrompt : undefined,
                logSystemMessage: typeof logSystemMessage !== 'undefined' ? logSystemMessage : undefined,
                toGeminiRequestData: typeof toGeminiRequestData !== 'undefined' ? toGeminiRequestData : undefined,
                GEMINI_API_URL: typeof GEMINI_API_URL !== 'undefined' ? GEMINI_API_URL : undefined,
                addLongPressListener: typeof addLongPressListener !== 'undefined' ? addLongPressListener : undefined,
                closePersonaEditor: typeof closePersonaEditor !== 'undefined' ? closePersonaEditor : undefined,
                toggleInnerVoiceHistory: typeof toggleInnerVoiceHistory !== 'undefined' ? toggleInnerVoiceHistory : undefined,
                renderMemberManagementList: typeof renderMemberManagementList !== 'undefined' ? renderMemberManagementList : undefined,
            });
        }

        // 自动启动后台活动模拟（如果已开启）
        if (state.globalSettings && state.globalSettings.enableBackgroundActivity) {
            console.log('检测到后台活动设置为开启，正在自动启动后台模拟...');
            startBackgroundSimulation();
        }

        // 添加启动时加载CSS的逻辑
        // 优先应用保存在 activeCustomCss 里的代码
        if (state.globalSettings.activeCustomCss) {
            applyThemeCss(state.globalSettings.activeCustomCss);
        }
        // 如果没有自定义CSS，再尝试应用上次选中的主题
        else if (state.globalSettings.activeThemeId) {
            const activeTheme = await db.themes.get(state.globalSettings.activeThemeId);
            if (activeTheme) {
                console.log(`正在应用已保存的主题: "${activeTheme.name}"`);
                applyThemeCss(activeTheme.css);
            }
        }

        if (typeof state.globalSettings.notificationSoundUrl === 'undefined') {
            state.globalSettings.notificationSoundUrl = 'https://files.catbox.moe/k369mf.mp3';
        }

        if (window.renderHomeScreenProfileFrame) window.renderHomeScreenProfileFrame(); // 初始化时渲染主页头像框

        applyHomeIconWidgetTextColor(state.globalSettings.homeIconWidgetTextColor);
        if (window.loadAllFontPresetsOnStartup) await window.loadAllFontPresetsOnStartup();
        await migrateDefaultLudoQuestions();
        await addDefaultDarkModeThemeIfNeeded();
        applyWidgetData();

        if (state.globalSettings.homeIconWidgetTextColor) {
            applyHomeIconWidgetTextColor(state.globalSettings.homeIconWidgetTextColor);
        }

        // 2. 应用已保存的“去除阴影”设置
        document.getElementById('phone-screen').classList.toggle('no-home-font-shadow', !!state.globalSettings.removeHomeFontShadow);

        // 初始化未读动态计数
        const storedCount = parseInt(localStorage.getItem('unreadPostsCount')) || 0;
        updateUnreadIndicator(storedCount);

        if (state.globalSettings && state.globalSettings.fontUrl) {
            applyCustomFont(state.globalSettings.fontUrl);
        }

        // 初始化时，自动加载并应用已保存的主题
        if (state.globalSettings.activeThemeId) {
            const activeTheme = await db.themes.get(state.globalSettings.activeThemeId);
            if (activeTheme) {
                console.log(`正在应用已保存的主题: "${activeTheme.name}"`);
                applyThemeCss(activeTheme.css);
            }
        }

        updateClock();
        setInterval(updateClock, 1000 * 30);
        window.applyGlobalWallpaper();
        initBatteryManager();

        window.applyAppIcons();
        window.applyAppLabels();

        // Initialize settings listeners from settings.js
        if (window.initSettingsListeners) window.initSettingsListeners();

        initDraggableLyricsBar(); // 初始化悬浮歌词栏的拖动功能

        // ==========================================================
        // --- 各种事件监听器 ---
        // ==========================================================



        // 主屏幕预设功能事件绑定
        document.getElementById('home-preset-selector').addEventListener('change', handleHomePresetSelection);
        document.getElementById('apply-home-preset-btn').addEventListener('click', applySelectedHomeScreenPreset);

        document.getElementById('save-home-preset-btn').addEventListener('click', saveCurrentHomeScreenAsPreset);
        document.getElementById('update-home-preset-btn').addEventListener('click', updateSelectedHomeScreenPreset); // <-- 新增这一行
        document.getElementById('rename-home-preset-btn').addEventListener('click', renameSelectedHomeScreenPreset);
        document.getElementById('delete-home-preset-btn').addEventListener('click', deleteSelectedHomeScreenPreset);
        document.getElementById('export-home-preset-btn').addEventListener('click', exportHomeScreenPreset);
        document.getElementById('import-home-preset-btn').addEventListener('click', () => document.getElementById('import-home-preset-input').click());
        document.getElementById('import-home-preset-input').addEventListener('change', (e) => {
            importHomeScreenPreset(e.target.files[0]);
            e.target.value = null;
        });

        document.getElementById('theme-toggle-switch').addEventListener('change', toggleTheme);
        // 聊天记录搜索功能事件绑定
        document.getElementById('search-chat-btn').addEventListener('click', openChatSearchScreen);

        document.getElementById('search-back-btn').addEventListener('click', () => {
            // 返回时，重新打开聊天设置弹窗
            showScreen('chat-interface-screen');
            document.getElementById('chat-settings-btn').click();
        });

        document.getElementById('perform-search-btn').addEventListener('click', performChatSearch);

        // 使用事件委托来处理所有搜索结果的点击
        document.getElementById('chat-search-results-list').addEventListener('click', (e) => {
            const item = e.target.closest('.search-result-item');
            if (item && item.dataset.timestamp) {
                jumpToMessage(parseInt(item.dataset.timestamp));
            }
        });

        document.getElementById('create-weibo-post-btn').addEventListener('click', openWeiboPublisherClean);

        // 心声历史记录删除功能事件绑定
        document.getElementById('clear-all-history-btn').addEventListener('click', clearAllInnerVoiceHistory);

        // 使用事件委托处理单条删除
        document.getElementById('inner-voice-history-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('history-item-delete-btn')) {
                const timestamp = parseInt(e.target.dataset.timestamp);
                if (!isNaN(timestamp)) {
                    deleteSingleInnerVoice(timestamp);
                }
            }
        });





        document.getElementById('custom-modal-cancel').addEventListener('click', hideCustomModal);
        document.getElementById('custom-modal-overlay').addEventListener('click', (e) => {
            if (e.target === modalOverlay) hideCustomModal();
        });
        document.getElementById('clear-orphaned-data-btn').addEventListener('click', () => { if (window.clearOrphanedData) window.clearOrphanedData(); });
        const factoryResetBtn = document.getElementById('factory-reset-btn');
        if (factoryResetBtn) {
            factoryResetBtn.addEventListener('click', () => { if (window.handleFactoryReset) window.handleFactoryReset(); });
        }
        document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-data-input').click());

        if (window.setupChatListeners) window.setupChatListeners();

        // 在你的 init() 函数的事件监听器区域...

        document.getElementById('chat-messages').addEventListener('click', (e) => {
            // 1. 向上查找被点击的元素是否在一个消息气泡内
            const bubble = e.target.closest('.message-bubble');
            if (!bubble) return; // 如果不在，就退出

            // 2. 添加严格的筛选条件
            // 必须是 AI 的消息 (.ai)
            // 必须是转账类型 (.is-transfer)
            // 必须是我们标记为“待处理”的 (data-status="pending")
            if (bubble.classList.contains('ai') && bubble.classList.contains('is-transfer') && bubble.dataset.status === 'pending') {
                // 3. 只有满足所有条件，才执行后续逻辑
                const timestamp = parseInt(bubble.dataset.timestamp);
                if (!isNaN(timestamp)) {
                    showTransferActionModal(timestamp);
                }
            }
        });


        // 3. 监听卡片点击的逻辑保持不变

        document.getElementById('call-history-list').addEventListener('click', (e) => {
            const card = e.target.closest('.call-record-card');
            if (card && card.dataset.recordId) {
                showCallTranscript(parseInt(card.dataset.recordId));
            }
        });

        // 4. 关闭详情弹窗的逻辑保持不变
        document.getElementById('close-transcript-modal-btn').addEventListener('click', () => {
            document.getElementById('call-transcript-modal').classList.remove('visible');
        });



        document.getElementById('chat-header-status').addEventListener('click', handleEditStatusClick);

        // [Refactor] Shared History logic moved to apps/QQ/chat.js

        // 使用事件委托来处理所有“已撤回消息”的点击事件
        document.getElementById('chat-messages').addEventListener('click', (e) => {
            // 检查被点击的元素或其父元素是否是“已撤回”提示
            const placeholder = e.target.closest('.recalled-message-placeholder');
            if (!placeholder) return; // 如果不是，就退出

            // 如果是，就从聊天记录中找到对应的数据并显示
            const chat = state.chats[state.activeChatId];
            const wrapper = placeholder.closest('.message-wrapper'); // 找到它的父容器
            if (chat && wrapper) {
                // 从父容器上找到时间戳
                const timestamp = parseInt(wrapper.dataset.timestamp);
                const recalledMsg = chat.history.find((m) => m.timestamp === timestamp);

                if (recalledMsg && recalledMsg.recalledData) {
                    let originalContentText = '';
                    const recalled = recalledMsg.recalledData;

                    if (recalled.originalType === 'text') {
                        originalContentText = `原文: "${recalled.originalContent}"`;
                    } else {
                        originalContentText = `撤回了一条[${recalled.originalType}]类型的消息`;
                    }
                    showCustomAlert('已撤回的消息', originalContentText);
                }
            }
        });

        // 聊天列表左滑功能JS逻辑
        const chatListEl = document.getElementById('chat-list');
        let chatSwipeState = { isDragging: false, startX: 0, activeContent: null };

        // 关闭所有已滑开的项
        function resetAllChatSwipes(exceptThisOne = null) {
            document.querySelectorAll('.chat-list-item-content.swiped').forEach((content) => {
                if (content !== exceptThisOne) {
                    content.classList.remove('swiped');
                }
            });
        }

        chatListEl.addEventListener('mousedown', (e) => {
            const content = e.target.closest('.chat-list-item-content');
            if (content) {
                resetAllChatSwipes(content);
                chatSwipeState.isDragging = true;
                chatSwipeState.startX = e.pageX;
                chatSwipeState.activeContent = content;
                // 阻止拖动时选中文本
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;
            const diffX = e.pageX - chatSwipeState.startX;
            if (diffX < 0 && diffX > -170) {
                // 只允许向左滑, 限制最大距离
                chatSwipeState.activeContent.style.transition = 'none'; // 滑动时禁用动画
                chatSwipeState.activeContent.style.transform = `translateX(${diffX}px)`;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;

            chatSwipeState.activeContent.style.transition = 'transform 0.3s ease';
            const transformStyle = window.getComputedStyle(chatSwipeState.activeContent).transform;
            const currentTranslateX = new DOMMatrix(transformStyle).m41;

            if (currentTranslateX < -60) {
                // 滑动超过阈值
                chatSwipeState.activeContent.classList.add('swiped');
            } else {
                chatSwipeState.activeContent.classList.remove('swiped');
            }
            chatSwipeState.activeContent.style.transform = ''; // 清除内联样式，交由CSS class控制

            // 重置状态
            chatSwipeState.isDragging = false;
            chatSwipeState.activeContent = null;
        });

        // 移动端触摸事件的兼容
        chatListEl.addEventListener(
            'touchstart',
            (e) => {
                const content = e.target.closest('.chat-list-item-content');
                if (content) {
                    resetAllChatSwipes(content);
                    chatSwipeState.isDragging = true;
                    chatSwipeState.startX = e.touches[0].pageX;
                    chatSwipeState.activeContent = content;
                }
            },
            { passive: true }
        );

        chatListEl.addEventListener(
            'touchmove',
            (e) => {
                if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;
                const diffX = e.touches[0].pageX - chatSwipeState.startX;
                if (diffX < 0 && diffX > -170) {
                    chatSwipeState.activeContent.style.transition = 'none';
                    chatSwipeState.activeContent.style.transform = `translateX(${diffX}px)`;
                }
            },
            { passive: true }
        );

        chatListEl.addEventListener('touchend', (e) => {
            if (!chatSwipeState.isDragging || !chatSwipeState.activeContent) return;

            chatSwipeState.activeContent.style.transition = 'transform 0.3s ease';
            const transformStyle = window.getComputedStyle(chatSwipeState.activeContent).transform;
            const currentTranslateX = new DOMMatrix(transformStyle).m41;

            if (currentTranslateX < -60) {
                chatSwipeState.activeContent.classList.add('swiped');
            } else {
                chatSwipeState.activeContent.classList.remove('swiped');
            }
            chatSwipeState.activeContent.style.transform = '';

            chatSwipeState.isDragging = false;
            chatSwipeState.activeContent = null;
        });

        // 聊天列表操作按钮点击事件
        chatListEl.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('swipe-action-btn')) {
                const container = target.closest('.chat-list-item-swipe-container');
                if (!container) return;

                const chatId = container.dataset.chatId;
                const chat = state.chats[chatId];
                if (!chat) return;

                if (target.classList.contains('pin') || target.classList.contains('unpin')) {
                    // 置顶或取消置顶
                    chat.isPinned = !chat.isPinned;
                    await db.chats.put(chat);
                    await renderChatList(); // 重新渲染列表以更新排序
                } else if (target.classList.contains('delete')) {
                    // 删除
                    const confirmed = await showCustomConfirm('删除对话', `确定要删除与 "${chat.name}" 的整个对话吗？此操作不可撤销。`, { confirmButtonClass: 'btn-danger' });
                    if (confirmed) {
                        if (state.musicState.isActive && state.musicState.activeChatId === chat.id) await endListenTogetherSession(false);
                        delete state.chats[chat.id];
                        if (state.activeChatId === chat.id) state.activeChatId = null;
                        await db.chats.delete(chat.id);
                        await renderChatList();
                    } else {
                        // 如果取消删除，则把滑块收回去
                        const content = container.querySelector('.chat-list-item-content');
                        if (content) content.classList.remove('swiped');
                    }
                }
            }
        });



        // --- 美化功能事件绑定 ---
        const themeEditor = document.getElementById('theme-css-editor');

        // 页面加载时，加载主题列表并显示模板
        await loadThemesToDropdown();
        themeEditor.value = THEME_CSS_TEMPLATE;

        // 绑定下拉框选择事件
        document.getElementById('theme-selector').addEventListener('change', handleThemeSelection);

        // 绑定所有操作按钮
        document.getElementById('apply-theme-btn').addEventListener('click', () => applyThemeCss(themeEditor.value));
        document.getElementById('save-theme-btn').addEventListener('click', saveCurrentTheme);
        document.getElementById('save-as-new-theme-btn').addEventListener('click', saveAsNewTheme);
        document.getElementById('rename-theme-btn').addEventListener('click', renameSelectedTheme);
        document.getElementById('delete-theme-btn').addEventListener('click', deleteSelectedTheme);
        document.getElementById('export-theme-btn').addEventListener('click', exportTheme);
        document.getElementById('reset-theme-css-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('重置CSS', '确定要将CSS重置为默认模板吗？\n当前编辑框内的代码将丢失。', { confirmButtonClass: 'btn-danger' });

            if (confirmed) {
                const editor = document.getElementById('theme-css-editor');
                // 恢复为默认的注释模板
                editor.value = THEME_CSS_TEMPLATE;
                // 立即应用效果
                applyThemeCss(THEME_CSS_TEMPLATE);

                // 重置下拉框选择状态
                document.getElementById('theme-selector').value = '';
                state.globalSettings.activeThemeId = null;

                alert("已重置为默认模板 (请点击'保存'以应用更改到系统)");
            }
        });

        document.getElementById('manage-char-css-btn').addEventListener('click', openCharCssManager);

        // 绑定导入按钮和隐藏的文件选择器
        document.getElementById('import-theme-btn').addEventListener('click', () => {
            document.getElementById('import-theme-input').click();
        });
        document.getElementById('import-theme-input').addEventListener('change', (e) => {
            importTheme(e.target.files[0]);
            e.target.value = null; // 清空，以便下次能选择同一个文件
        });

        document.getElementById('api-preset-select').addEventListener('change', handleApiPresetSelectChange);
        document.getElementById('manage-api-presets-btn').addEventListener('click', openApiPresetManager);

        // 锁屏功能事件监听器

        // 1. 锁屏壁纸上传
        document.getElementById('lockscreen-wallpaper-upload-input').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const dataUrl = await new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result);
                    reader.onerror = () => rej(reader.error);
                    reader.readAsDataURL(file);
                });
                newLockscreenWallpaperBase64 = dataUrl;
                renderWallpaperScreen(); // 上传后实时预览
            }
        });

        // 2. 密码输入框按钮
        document.getElementById('password-confirm-btn').addEventListener('click', checkPassword);
        document.getElementById('password-cancel-btn').addEventListener('click', hidePasswordModal);
        // 允许在输入框内按回车键确认
        document.getElementById('password-input-field').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });

        // 3. 带有动画效果的上滑解锁手势
        const lockScreen = document.getElementById('lock-screen');
        const unlockHint = document.getElementById('unlock-hint');
        let touchStartY = 0;
        let isSwiping = false;

        // 统一的开始处理函数
        const handleUnlockStart = (e) => {
            if (document.getElementById('password-modal-overlay').classList.contains('visible')) return;

            // (你原来的其他逻辑保持不变)
            const blurBg = document.getElementById('lock-screen-background-blur');
            if (state.globalSettings.password) {
                blurBg.style.backgroundImage = lockScreen.style.backgroundImage;
                blurBg.style.display = 'block';
            } else {
                document.getElementById('home-screen').classList.add('active');
            }

            touchStartY = getEventCoords(e).y; // 使用辅助函数获取Y坐标
            isSwiping = true;
            lockScreen.style.transition = 'none';
            unlockHint.style.transition = 'none';
        };

        // 统一的移动处理函数
        const handleUnlockMove = (e) => {
            if (!isSwiping) return;
            const currentY = getEventCoords(e).y; // 使用辅助函数
            let diffY = currentY - touchStartY;
            // (你原来的其他逻辑保持不变)
            if (diffY > 0) diffY = 0;
            lockScreen.style.transform = `translateY(${diffY}px)`;
            unlockHint.style.opacity = Math.max(0, 1 - Math.abs(diffY) / 100);
            if (state.globalSettings.password) {
                const blurBg = document.getElementById('lock-screen-background-blur');
                blurBg.style.opacity = Math.min(1, Math.abs(diffY) / 80);
            }
        };

        // 统一的结束处理函数
        const handleUnlockEnd = (e) => {
            if (!isSwiping) return;
            isSwiping = false;

            lockScreen.style.transition = 'transform 0.3s ease-out';
            unlockHint.style.transition = 'opacity 0.3s ease-out';
            const blurBg = document.getElementById('lock-screen-background-blur');

            // 注意：touchend事件的坐标在 e.changedTouches[0]
            const touchEndY = e.changedTouches ? e.changedTouches[0].clientY : e.pageY;
            const swipeDistance = touchStartY - touchEndY;

            if (swipeDistance > 80) {
                lockScreen.style.transform = 'translateY(-100%)';
                setTimeout(() => {
                    if (state.globalSettings.password) {
                        showPasswordModal();
                    } else {
                        unlockPhone();
                    }
                }, 300);
            } else {
                lockScreen.style.transform = 'translateY(0)';
                unlockHint.style.opacity = '1';
                if (state.globalSettings.password) {
                    blurBg.style.opacity = '0';
                    setTimeout(() => {
                        blurBg.style.display = 'none';
                    }, 300);
                } else {
                    document.getElementById('home-screen').classList.remove('active');
                }
            }
        };

        // 2. 绑定两种事件到同一套处理逻辑上
        lockScreen.addEventListener('touchstart', handleUnlockStart, { passive: true });
        lockScreen.addEventListener('touchmove', handleUnlockMove, { passive: true });
        lockScreen.addEventListener('touchend', handleUnlockEnd, { passive: true });

        lockScreen.addEventListener('mousedown', handleUnlockStart);
        // 注意：mousemove和mouseup最好绑定在document上，防止鼠标拖出范围后失效
        document.addEventListener('mousemove', handleUnlockMove);
        document.addEventListener('mouseup', handleUnlockEnd);

        // 【全新】为聊天底部工具栏添加鼠标拖动滚动功能
        const actionsTopBar = document.getElementById('chat-input-actions-top');
        let isDown = false;
        let startX;
        let scrollLeft;

        actionsTopBar.addEventListener('mousedown', (e) => {
            isDown = true;
            actionsTopBar.classList.add('grabbing'); // 添加一个class来改变鼠标样式
            startX = e.pageX - actionsTopBar.offsetLeft;
            scrollLeft = actionsTopBar.scrollLeft;
        });

        actionsTopBar.addEventListener('mouseleave', () => {
            isDown = false;
            actionsTopBar.classList.remove('grabbing');
        });

        actionsTopBar.addEventListener('mouseup', () => {
            isDown = false;
            actionsTopBar.classList.remove('grabbing');
        });

        actionsTopBar.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - actionsTopBar.offsetLeft;
            const walk = (x - startX) * 2; // 乘以2可以增加拖动速度，感觉更灵敏
            actionsTopBar.scrollLeft = scrollLeft - walk;
        });

        // --- 悬浮歌词栏设置功能 ---
        document.getElementById('lyrics-settings-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡触发拖动或打开播放器
            document.getElementById('lyrics-settings-modal').classList.add('visible');
        });

        document.getElementById('close-lyrics-settings-btn').addEventListener('click', async () => {
            // 保存设置到全局状态并写入数据库
            state.globalSettings.lyricsBarSettings = lyricsBarSettings;
            await db.globalSettings.put(state.globalSettings);
            document.getElementById('lyrics-settings-modal').classList.remove('visible');
            alert('设置已保存！');
        });

        document.getElementById('reset-lyrics-settings-btn').addEventListener('click', () => {
            // 恢复到默认值
            lyricsBarSettings = { fontSize: 14, bgOpacity: 0, fontColor: '#FFFFFF', showOnClose: true };
            applyLyricsSettings(); // 应用默认设置
        });

        // 实时更新样式
        document.getElementById('lyrics-font-size-slider').addEventListener('input', (e) => {
            lyricsBarSettings.fontSize = e.target.value;
            applyLyricsSettings();
        });
        document.getElementById('lyrics-bg-opacity-slider').addEventListener('input', (e) => {
            lyricsBarSettings.bgOpacity = e.target.value;
            applyLyricsSettings();
        });
        document.getElementById('lyrics-font-color-picker').addEventListener('input', (e) => {
            lyricsBarSettings.fontColor = e.target.value;
            applyLyricsSettings();
        });

        // 歌词栏上的关闭按钮
        document.querySelector('#floating-lyrics-bar .close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('floating-lyrics-bar').style.display = 'none';
        });

        // 播放器里的“悬浮/隐藏”开关
        document.getElementById('toggle-lyrics-bar-btn').addEventListener('click', async (e) => {
            lyricsBarSettings.showOnClose = !lyricsBarSettings.showOnClose;
            e.target.textContent = lyricsBarSettings.showOnClose ? '悬浮' : '隐藏';
            e.target.style.opacity = lyricsBarSettings.showOnClose ? '1' : '0.5';
            // 立即保存这个设置
            state.globalSettings.lyricsBarSettings = lyricsBarSettings;
            await db.globalSettings.put(state.globalSettings);
        });

        // 在页面加载时，就应用一次已保存的设置
        applyLyricsSettings();


        // --- 后台活动设置界面的事件绑定 ---

        // 1. 总开关的事件
        document.getElementById('background-activity-switch').addEventListener('change', () => {
            // 每次点击总开关，都重新渲染一次详细设置区（它会根据开关状态自动显示或隐藏）
            renderBackgroundFrequencySelector();
        });

        // 2. 全选按钮
        document.getElementById('bg-select-all-chars').addEventListener('click', () => {
            document.querySelectorAll('.bg-char-checkbox').forEach((checkbox) => {
                checkbox.checked = true;
            });
        });

        // 3. 全不选按钮
        document.getElementById('bg-deselect-all-chars').addEventListener('click', () => {
            document.querySelectorAll('.bg-char-checkbox').forEach((checkbox) => {
                checkbox.checked = false;
            });
        });

        document.querySelector('#background-activity-details').addEventListener('click', async (e) => {
            // 注意这里加了 async
            if (e.target.classList.contains('bg-freq-btn')) {
                const freq = e.target.dataset.freq;
                const selectedCheckboxes = document.querySelectorAll('.bg-char-checkbox:checked');

                if (selectedCheckboxes.length === 0) {
                    alert('请先选择至少一个角色！');
                    return;
                }

                const config = state.globalSettings.backgroundActivityConfig || {};
                selectedCheckboxes.forEach((checkbox) => {
                    const chatId = checkbox.dataset.chatId;
                    if (freq === 'none') {
                        delete config[chatId];
                    } else {
                        config[chatId] = freq;
                    }
                });

                state.globalSettings.backgroundActivityConfig = config;

                // ★★★★★ 这就是我们新加的关键代码！★★★
                await db.globalSettings.put(state.globalSettings);

                renderBackgroundFrequencySelector();

                const freqTextMap = { low: '低', medium: '中', high: '高', none: '关闭' };
                const freqText = freqTextMap[freq];
                alert(`已为 ${selectedCheckboxes.length} 个角色将后台活动频率设为 "${freqText}"`);
            }
        });
        // 使用事件委托，为所有可编辑元素统一绑定点击事件

        // 使用事件委托，为所有可编辑元素统一绑定点击事件
        document.getElementById('home-screen').addEventListener('click', async (e) => {
            // <-- 把这行也改成 async
            // 使用 .closest() 来确保即使点击到子元素也能正确触发
            const editableText = e.target.closest('.editable-text');
            if (editableText) {
                handleEditText(editableText);
                return; // 处理完就退出，避免重复触发
            }

            const editableImage = e.target.closest('.editable-image');
            if (editableImage) {
                // 1. 判断被点击的图片是不是主屏幕的那个大头像
                if (editableImage.id === 'profile-avatar-img') {
                    // 2. 如果是，就弹出一个选择菜单
                    const choice = await showChoiceModal('编辑头像', [
                        { text: '更换头像图片', value: 'avatar' },
                        { text: '更换头像框', value: 'frame' },
                    ]);

                    // 3. 根据用户的选择，执行不同的操作
                    if (choice === 'avatar') {
                        handleEditImage(editableImage); // 调用原来的更换图片函数
                    } else if (choice === 'frame') {
                        openFrameSelectorModal('home_profile'); // 调用我们新增的更换头像框函数
                    }
                } else {
                    // 4. 如果点击的不是主头像（比如是其他小组件的图片），就还执行原来的逻辑
                    handleEditImage(editableImage);
                }

                return;
            }
        });

        // 使用事件委托来处理所有删除按钮的点击
        document.getElementById('character-phone-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('item-delete-btn')) {
                const dataType = e.target.dataset.type;
                const index = parseInt(e.target.dataset.index);
                if (dataType && !isNaN(index)) {
                    handleCharacterDataDeletion(dataType, index);
                }
            }
        });


        // startGroupSimulation(); // 移除旧的群聊时钟，改用统一的后台循环
        handleAutoBackupTimer();
        // 使用事件委托，监听整个动态列表的“焦点移出”事件
        document.getElementById('qzone-posts-list').addEventListener('focusout', (e) => {
            // 如果是评论输入框失去了焦点
            if (e.target.classList.contains('comment-input')) {
                const commentInput = e.target;
                // 并且输入框是空的
                if (commentInput.value.trim() === '') {
                    // 就重置它的状态，取消回复
                    commentInput.placeholder = '友善的评论是交流的起点';
                    delete commentInput.dataset.replyTo;
                }
            }
        });

        // 为时间感知开关添加实时交互事件
        document.getElementById('time-perception-toggle').addEventListener('change', (e) => {
            const customTimeContainer = document.getElementById('custom-time-container');
            customTimeContainer.style.display = e.target.checked ? 'none' : 'block';
        });

        document.getElementById('char-heart-btn').addEventListener('click', openInnerVoiceModal);

        document.getElementById('close-inner-voice-modal').addEventListener('click', () => {
            document.getElementById('inner-voice-modal').classList.remove('visible');
        });
        document.getElementById('inner-voice-history-btn').addEventListener('click', toggleInnerVoiceHistory);
        document.getElementById('back-from-history-btn').addEventListener('click', toggleInnerVoiceHistory);

        /**
         * 导出当前角色的聊天记录
         */
        async function exportChatHistory() {
            if (!state.activeChatId) return;
            const chat = state.chats[state.activeChatId];
            if (!chat) return;

            // 1. 创建一个只包含聊天记录和角色名的对象
            const exportData = {
                characterName: chat.name,
                exportedAt: new Date().toISOString(),
                history: chat.history,
            };

            // 2. 将这个对象转换为格式化的JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);

            // 3. 创建一个Blob对象
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 4. 创建一个临时的下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            // 5. 设置下载链接的属性，包括文件名
            const dateStr = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `[${chat.name}]-聊天记录-${dateStr}.json`;

            // 6. 模拟点击链接来触发下载
            document.body.appendChild(link);
            link.click();

            // 7. 清理临时创建的元素和URL
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            await showCustomAlert('导出成功', `与“${chat.name}”的聊天记录已开始下载！`);
        }

        /**
         * 导入聊天记录到当前角色
         */
        async function importChatHistory(file) {
            if (!file) return;
            if (!state.activeChatId) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // 关键验证：检查导入的文件是否包含一个名为 'history' 的数组
                    if (!data.history || !Array.isArray(data.history)) {
                        throw new Error("文件格式不正确，缺少有效的'history'数据。");
                    }

                    const chat = state.chats[state.activeChatId];

                    // 安全警告：提醒用户这将覆盖现有记录
                    const confirmed = await showCustomConfirm('确认导入', `这将会【覆盖】你与“${chat.name}”的当前所有聊天记录。此操作无法撤销，确定要继续吗？`, { confirmButtonClass: 'btn-danger' });

                    if (confirmed) {
                        // 替换历史记录
                        chat.history = data.history;
                        // 保存到数据库
                        await db.chats.put(chat);
                        // 刷新界面
                        renderChatInterface(state.activeChatId);
                        renderChatList(); // 刷新列表以更新最后一条消息
                        await showCustomAlert('导入成功', '聊天记录已成功导入并覆盖！');
                    }
                } catch (error) {
                    console.error('导入聊天记录失败:', error);
                    await showCustomAlert('导入失败', `无法导入文件，请检查文件是否为正确的聊天记录备份文件。\n\n错误: ${error.message}`);
                }
            };
            reader.readAsText(file, 'UTF-8');
        }



        // --- 塔罗牌占卜功能事件绑定 ---
        // Tarot event listeners moved to apps/QQ/functions.js

        // 1. 初始化时创建默认小组
        await initializeDefaultGroups();
        /* === 修复后的主屏幕滑动逻辑（支持PC鼠标拖拽） === */
        function initHomeScreenSlider() {
            const slider = document.querySelector('.home-screen-slider');
            const dots = document.querySelectorAll('.pagination-dots .dot');

            if (!slider || dots.length === 0) return;

            // 1. 监听滚动事件（用于更新小圆点状态）
            slider.addEventListener('scroll', () => {
                const pageIndex = Math.round(slider.scrollLeft / slider.clientWidth);
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === pageIndex);
                });
            });

            // 2. PC端鼠标拖拽滑动逻辑
            let isDown = false;
            let startX;
            let scrollLeft;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.cursor = 'grabbing'; // 改变鼠标样式
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
                // 防止拖动时选中文本
                e.preventDefault();
            });

            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.cursor = 'default';
            });

            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.cursor = 'default';

                // 鼠标松开时，自动吸附到最近的一页（模拟翻页效果）
                const pageWidth = slider.clientWidth;
                const currentPage = Math.round(slider.scrollLeft / pageWidth);
                slider.scrollTo({
                    left: currentPage * pageWidth,
                    behavior: 'smooth',
                });
            });

            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 2; // 乘以2可以让滑动更灵敏
                slider.scrollLeft = scrollLeft - walk;
            });
        }

        initHomeScreenSlider(); // 初始化主屏幕滑动功能

        // --- 颜色选择器与文本框联动逻辑 ---
        const colorPicker = document.getElementById('home-icon-widget-text-color-picker');
        const colorInput = document.getElementById('home-icon-widget-text-color-input');

        // 1. 当选色盘变化时 -> 同步给文本框 + 实时应用
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            colorInput.value = color.toUpperCase(); // 同步文字
            applyHomeIconWidgetTextColor(color); // 实时应用
        });

        // 2. 当文本框输入时 -> 验证 -> 同步给选色盘 + 实时应用
        colorInput.addEventListener('input', (e) => {
            let val = e.target.value;

            // 自动添加 # 号 (如果用户忘了加)
            if (val.length > 0 && !val.startsWith('#')) {
                val = '#' + val;
            }

            // 简单的正则验证：必须是 # 加上 6位 0-9/A-F
            const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;

            if (hexRegex.test(val)) {
                // 如果格式正确
                colorPicker.value = val; // 同步选色盘
                applyHomeIconWidgetTextColor(val); // 实时应用
                // (可选) 可以在这里去掉错误提示样式
                colorInput.style.color = 'inherit';
            } else {
                // 如果格式不对，不应用，但也不阻止输入 (可以把字变红提示)
                colorInput.style.color = 'red';
            }
        });

        // 3. 当文本框失去焦点时，如果内容不完整，重置回选色盘的值
        colorInput.addEventListener('blur', () => {
            colorInput.value = colorPicker.value.toUpperCase();
            colorInput.style.color = 'inherit';
        });

        // 主屏幕字体阴影开关的实时预览事件
        document.getElementById('remove-home-font-shadow-toggle').addEventListener('change', (e) => {
            document.getElementById('phone-screen').classList.toggle('no-home-font-shadow', e.target.checked);
        });
        // 宠物功能事件监听器
        // 1. 绑定输入框上方的宠物图标按钮
        document.getElementById('pet-action-btn').addEventListener('click', openPetModal);

        // 2. 绑定宠物弹窗内的各种按钮
        document.getElementById('pet-modal-cancel-btn').addEventListener('click', () => {
            document.getElementById('pet-modal').classList.remove('visible');
            currentPetData = null; // 取消时也要清理
        });
        document.getElementById('pet-modal-save-btn').addEventListener('click', savePetSettings);

        // 3. 实时更新预览
        document.getElementById('pet-type-input').addEventListener('input', updatePetPreview);
        document.getElementById('pet-name-input').addEventListener('input', updatePetPreview);
        document.getElementById('pet-image-input').addEventListener('input', updatePetPreview);

        // 4. “在聊天界面显示”开关的交互
        document.getElementById('pet-display-toggle').addEventListener('change', (e) => {
            document.getElementById('pet-position-controls').style.display = e.target.checked ? 'block' : 'none';
        });

        // 5. 尺寸滑块的交互
        const sizeSlider = document.getElementById('pet-size-slider');
        sizeSlider.addEventListener('input', () => {
            document.getElementById('pet-size-value').textContent = `${sizeSlider.value}px`;
        });

        // 6. 绑定更换自定义图片的点击事件



        document.getElementById('chat-settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'manual-summary-btn') {
                // 点击后先关闭设置弹窗
                document.getElementById('chat-settings-modal').classList.remove('visible');
                // 【调用我们新创建的选择函数，而不是直接总结
                openManualSummaryOptions();
            }
        });

        // 情侣空间取消和解除▼▼▼
        document.getElementById('ls-cancel-space-btn').addEventListener('click', handleCancelLoversSpace);
        document.getElementById('ls-disconnect-space-btn').addEventListener('click', handleDisconnectLoversSpace);

        // 心声面板编辑按钮事件监听
        document.getElementById('inner-voice-modal').addEventListener('click', (e) => {
            if (e.target.closest('#inner-voice-edit-btn')) {
                showInnerVoiceEditOptions();
            }
        });

        // 心声样式编辑器事件绑定
        const ivEditorModal = document.getElementById('inner-voice-editor-modal');
        const ivPanel = document.getElementById('inner-voice-main-panel');

        // 实时预览功能
        ivEditorModal.addEventListener('input', (e) => {
            const targetId = e.target.id;
            const value = e.target.value;

            switch (targetId) {
                case 'iv-color-clothing':
                    ivPanel.style.setProperty('--iv-color-clothing', value);
                    break;
                case 'iv-color-behavior':
                    ivPanel.style.setProperty('--iv-color-behavior', value);
                    break;
                case 'iv-color-thoughts':
                    ivPanel.style.setProperty('--iv-color-thoughts', value);
                    break;
                case 'iv-color-naughty':
                    ivPanel.style.setProperty('--iv-color-naughty', value);
                    break;
                case 'iv-card-bg-color':
                    ivPanel.style.setProperty('--iv-card-bg-rgb', hexToRgb(value));
                    break;
                case 'iv-opacity-slider':
                    document.getElementById('iv-opacity-value').textContent = `${Math.round(value * 100)}%`;
                    ivPanel.style.setProperty('--iv-card-opacity', value);
                    break;

                case 'iv-icon-color':
                    ivPanel.style.setProperty('--iv-icon-color', value);
                    break;
            }
        });

        // 保存按钮
        document.getElementById('iv-editor-save-btn').addEventListener('click', saveInnerVoiceStyles);

        // 取消按钮
        document.getElementById('iv-editor-cancel-btn').addEventListener('click', () => {
            ivEditorModal.classList.remove('visible');
            // 取消时，重新应用一下保存好的样式，以撤销预览改动
            applySavedInnerVoiceStyles();
        });



        // 预设功能按钮
        document.getElementById('dating-preset-select').addEventListener('change', handleDatingPresetSelect);
        document.getElementById('manage-dating-presets-btn').addEventListener('click', openDatingPresetManager);

        // --- 表情分类功能事件绑定 ---
        document.getElementById('move-selected-stickers-btn').addEventListener('click', openStickerCategoryModal);
        document.getElementById('cancel-sticker-category-btn').addEventListener('click', () => {
            document.getElementById('sticker-category-modal').classList.remove('visible');
        });
        document.getElementById('confirm-sticker-category-btn').addEventListener('click', handleMoveStickers);

        // [已迁移] document.getElementById('reset-app-names-btn').addEventListener('click', resetAppNamesToDefault);
        document.addEventListener('DOMContentLoaded', function () {
            const toggleCheckbox = document.getElementById('dark-mode-toggle');
            const storageKey = 'darkModeManualPref';
            const darkReaderOptions = {
                brightness: 100,
                contrast: 90,
                sepia: 10,
            };
            const manualPref = localStorage.getItem(storageKey);
            if (manualPref === 'true') {
                DarkReader.enable(darkReaderOptions);
                toggleCheckbox.checked = true;
            } else if (manualPref === 'false') {
                DarkReader.disable();
                toggleCheckbox.checked = false;
            } else {
                DarkReader.auto(darkReaderOptions);
                setTimeout(() => {
                    toggleCheckbox.checked = DarkReader.isEnabled();
                }, 100);
            }
            toggleCheckbox.addEventListener('change', function () {
                if (this.checked) {
                    DarkReader.enable(darkReaderOptions);
                    localStorage.setItem(storageKey, 'true');
                } else {
                    DarkReader.disable();
                    localStorage.setItem(storageKey, 'false');
                }
            });
        });

        // --- 亲密值面板事件绑定 ---

        // 1. 使用事件委托，为整个聊天列表绑定点击事件
        document.getElementById('chat-list').addEventListener('click', (e) => {
            // 检查被点击的是否是我们的亲密值按钮
            const intimacyBtn = e.target.closest('.intimacy-btn');
            if (intimacyBtn) {
                const chatId = intimacyBtn.dataset.chatId;
                if (chatId) {
                    openIntimacyPanel(chatId);
                }
            }
        });

        // 2. 为面板的关闭按钮绑定事件
        document.getElementById('close-intimacy-panel').addEventListener('click', () => {
            document.getElementById('intimacy-panel').classList.remove('visible');
        });


        // 使用事件委托，为动态页面的头部按钮绑定事件
        document.getElementById('qzone-screen').addEventListener('click', (e) => {
            // 检查点击的是否是清空按钮
            const clearBtn = e.target.closest('#clear-qzone-posts-btn');
            if (clearBtn) {
                clearAllQzonePosts(); // 如果是，就调用我们刚刚创建的函数
                return;
            }
        });

        initVideoBubbleDrag(); // 初始化视频悬浮球拖拽

        // 修复：创建群聊界面的取消按钮
        const cancelContactPickerBtn = document.getElementById('cancel-contact-picker-btn');
        if (cancelContactPickerBtn) {
            cancelContactPickerBtn.addEventListener('click', () => {
                // 如果是从“创建群聊”进入，返回聊天列表
                // 如果是从“添加群成员”进入（在设置页），返回设置页（逻辑稍微复杂，暂时统一返回聊天列表或主页）
                // 观察 index.html，chat-list-screen 是消息列表页
                showScreen('chat-list-screen');
            });
        }

        // ===================================================================
        // 5. 启动！

        // 应用壁纸并更新所有时钟
        applyLockscreenWallpaper();
        updateLockClock();

        // 1. 读取、应用并监听“启用锁屏”设置
        const enableLockScreenToggle = document.getElementById('enable-lock-screen-toggle');
        const lockScreenEnabled = localStorage.getItem('lockScreenEnabled') !== 'false';
        enableLockScreenToggle.checked = lockScreenEnabled;

        // 2. 读取、应用并监听“显示状态栏”设置
        const showStatusBarToggle = document.getElementById('show-status-bar-toggle');
        const statusBar = document.getElementById('status-bar');
        // 读取保存的状态，如果没保存过，默认是 true (显示)
        const showStatusBar = localStorage.getItem('showStatusBar') !== 'false';
        // 让开关的状态和保存的状态同步
        showStatusBarToggle.checked = showStatusBar;
        // 根据保存的状态，决定一加载进来时是否显示状态栏
        if (showStatusBar) {
            statusBar.style.display = 'flex';
        } else {
            statusBar.style.display = 'none';
        }

        // 3. 给开关添加“变化”监听器，这样你每次点击它都会保存状态
        showStatusBarToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            // a. 将新的开关状态 (true 或 false) 保存到浏览器的 localStorage 里
            localStorage.setItem('showStatusBar', isEnabled);
            // b. 立刻根据新的状态来显示或隐藏状态栏
            statusBar.style.display = isEnabled ? 'flex' : 'none';
        });

        // 4. 根据最终的锁屏设置，决定应用启动时第一个显示的屏幕
        if (lockScreenEnabled) {
            lockPhone(); // 如果设置是“启用”，就锁定手机
        } else {
            showScreen('home-screen'); // 否则，直接进入主屏幕
        }
    }
    function renderLoginOverlay() {
        if (document.getElementById('login-overlay')) return;

        // 1. 引入字体
        if (!document.getElementById('pixel-font-link')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'pixel-font-link';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }

        // 2. 样式定义
        const style = document.createElement('style');
        style.innerHTML = `
            #login-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: #dbc6c6; 
                z-index: 99999;
                display: flex; flex-direction: column;
                justify-content: center; align-items: center;
                font-family: 'VT323', monospace;
                overflow: hidden;
            }

            /* --- 机身 --- */
            .gameboy-body {
                width: 360px; height: 640px;
                background-color: #eed7d5; /* 枯玫瑰粉 */
                border-radius: 60px;
                box-shadow: 
                    20px 20px 60px #c5b0ae, 
                    -20px -20px 60px #fffaf8,
                    inset 2px 2px 5px rgba(255,255,255,0.5);
                border: 6px solid #e6cfcd;
                display: flex; flex-direction: column;
                align-items: center;
                padding: 30px; box-sizing: border-box; position: relative;
            }

            /* --- 屏幕外框 --- */
            .screen-bezel {
                width: 100%;
                background-color: #dcbdbb;
                border-radius: 40px 40px 50px 40px;
                padding: 20px; box-sizing: border-box;
                box-shadow: inset 3px 3px 10px rgba(0,0,0,0.1);
                display: flex; flex-direction: column; align-items: center;
                margin-bottom: 30px; position: relative;
            }
            .bezel-dots { position: absolute; top: 12px; left: 25px; display: flex; gap: 6px; }
            .dot { width: 6px; height: 6px; border-radius: 50%; background: #b09896; opacity: 0.5;}

            /* --- 液晶屏幕 --- */
            .screen-lcd {
                width: 100%; height: 320px;
                background-color: #4a3b3b;
                border-radius: 20px;
                box-shadow: inset 0 0 15px rgba(0,0,0,0.6);
                background-image: 
                    linear-gradient(rgba(255, 192, 203, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 192, 203, 0.03) 1px, transparent 1px);
                background-size: 4px 4px;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                color: #fce4ec; text-shadow: 0 0 4px rgba(252, 228, 236, 0.6);
                position: relative; overflow: hidden;
            }
            
            .scanline {
                width: 100%; height: 100%; position: absolute; left: 0; top: 0;
                background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
                background-size: 100% 4px; pointer-events: none; z-index: 5; opacity: 0.3;
            }

            .game-logo { font-size: 28px; margin-bottom: 30px; letter-spacing: 4px; opacity: 0.9; }

            /* --- 输入框组 (包含行走的小人) --- */
            .input-group {
                width: 85%;
                position: relative;
                margin-bottom: 25px; /* 增加间距给小人留位置 */
            }

            .pixel-input {
                width: 100%; height: 40px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid #8d7878;
                border-radius: 10px;
                color: #fff;
                font-family: 'VT323', monospace;
                font-size: 20px;
                padding: 0 10px;
                text-align: center;
                outline: none;
                transition: all 0.3s;
                box-sizing: border-box; /* 确保padding不撑大宽度 */
            }
            .pixel-input:focus {
                background: rgba(255, 255, 255, 0.2);
                border-color: #f8a5c2;
                box-shadow: 0 0 10px rgba(248, 165, 194, 0.4);
            }
            .pixel-input::placeholder { color: rgba(252, 228, 236, 0.3); font-size: 18px; }

            /* --- 行走的小人动画 --- */
            .walker {
                position: absolute;
                /* 放在输入框上方边框的位置 */
                top: -38px; 
                height: 40px; /* 稍微大一点点 */
                width: auto;
                z-index: 10;
                pointer-events: none; /* 让鼠标点击穿透图片，不影响点输入框 */
                image-rendering: pixelated; /* 保持像素清晰 */
            }

            /* 定义行走动画：从左跑到右，然后瞬间回到左边循环 */
            @keyframes walkRight {
                0% { left: -10px; }
                100% { left: calc(100% - 30px); } 
            }

            .walker-uid {
                animation: walkRight 8s linear infinite;
            }
            
            .walker-pwd {
                /* 稍微慢一点，并且有延迟，制造距离感 */
                animation: walkRight 9s linear infinite; 
                animation-delay: -4s; /* 负延迟表示动画一开始就在中间 */
            }

            #login-msg { height: 20px; font-size: 16px; color: #fab1a0; margin-top: 5px; }

            /* --- 操控区 --- */
            .controls-area { width: 100%; flex: 1; position: relative; }

            .d-pad { position: absolute; top: 20px; left: 20px; width: 100px; height: 100px; }
            .d-pad-h, .d-pad-v {
                background: #b5a3a3; border-radius: 10px;
                box-shadow: inset 2px 2px 5px rgba(255,255,255,0.2), 3px 3px 5px rgba(0,0,0,0.1);
                position: absolute;
            }
            .d-pad-h { width: 100px; height: 34px; top: 33px; }
            .d-pad-v { width: 34px; height: 100px; left: 33px; }
            .d-pad-center {
                width: 34px; height: 34px; background: #b5a3a3;
                position: absolute; top: 33px; left: 33px; z-index: 2;
                border-radius: 50%; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1);
            }

            .action-btns { position: absolute; top: 30px; right: 20px; display: flex; gap: 20px; transform: rotate(-10deg); }
            .round-btn {
                width: 55px; height: 55px; border-radius: 50%; border: none; cursor: pointer;
                font-family: 'VT323', monospace; font-size: 24px; color: rgba(255,255,255,0.6);
                display: flex; justify-content: center; align-items: center;
                box-shadow: 0 6px 0 rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.1);
                transition: transform 0.1s; position: relative;
            }
            .btn-a { background: radial-gradient(circle at 30% 30%, #eababa, #cd8d8d); margin-top: -20px; }
            .btn-b { background: radial-gradient(circle at 30% 30%, #c4d4c4, #8fa08f); margin-top: 20px; }
            .round-btn:active { transform: translateY(6px); box-shadow: 0 0 0 rgba(0,0,0,0.15); }
            .btn-label { position: absolute; bottom: -25px; width: 100%; text-align: center; color: #bcaaaa; font-size: 14px; font-weight: bold; }

            .options-group { position: absolute; bottom: 20px; width: 100%; display: flex; justify-content: center; gap: 30px; }
            .pill-btn { width: 60px; height: 16px; background: #cbbaba; border-radius: 20px; transform: rotate(-15deg); box-shadow: inset 1px 1px 3px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2); }
            .speakers { position: absolute; bottom: 30px; right: 30px; display: flex; gap: 5px; transform: rotate(-15deg); }
            .sp-slot { width: 6px; height: 6px; background: rgba(0,0,0,0.05); border-radius: 50%; box-shadow: inset 1px 1px 1px rgba(0,0,0,0.1); }
          `;
        document.head.appendChild(style);

        // 3. HTML结构
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';

        overlay.innerHTML = `
            <div class="gameboy-body">
                <div class="screen-bezel">
                    <div class="bezel-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                    
                    <div class="screen-lcd">
                        <div class="scanline"></div>
                        <div class="game-logo">E-PHONE TUKI</div>
                        
                        <!-- 账号输入框组 -->
                        <div class="input-group">
                            <img src="https://i.postimg.cc/bwyK9rVr/1000109644.png" class="walker walker-uid" alt="char1">
                            <input type="text" id="login-uid" class="pixel-input" placeholder="ACCOUNT ID" spellcheck="false" autocomplete="off">
                        </div>

                        <!-- 密码输入框组 -->
                        <div class="input-group">
                            <img src="https://i.postimg.cc/NjsWkFCQ/test.png" class="walker walker-pwd" alt="char2">
                            <input type="password" id="login-pwd" class="pixel-input" placeholder="PASSWORD" autocomplete="off">
                        </div>
                        
                        <p id="login-msg">WAITING...</p>
                        
                        <div style="margin-top: 15px; font-size: 14px; color: rgba(252, 228, 236, 0.5);">● REC</div>
                    </div>
                    
                    <div style="margin-top: 10px; color: #a69292; font-size: 12px; letter-spacing: 1px; font-weight: bold;">
                        Ephone TUKI ^ ̳- ‧̫ • ̳^ฅ
                    </div>
                </div>

                <div class="controls-area">
                    <div class="d-pad">
                        <div class="d-pad-h"></div><div class="d-pad-v"></div><div class="d-pad-center"></div>
                    </div>
                    <div class="action-btns">
                        <div style="position:relative;">
                             <button id="btn-login-reset" class="round-btn btn-b">B</button>
                             <div class="btn-label">RESET</div>
                        </div>
                        <div style="position:relative;">
                             <button id="btn-login-submit" class="round-btn btn-a">A</button>
                             <div class="btn-label">START</div>
                        </div>
                    </div>
                    <div class="options-group">
                        <div class="pill-btn"></div><div class="pill-btn"></div>
                    </div>
                    <div class="speakers">
                        <div class="sp-slot"></div><div class="sp-slot"></div><div class="sp-slot"></div>
                        <div class="sp-slot"></div><div class="sp-slot"></div><div class="sp-slot"></div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 25px; font-size: 14px; color: #7f6e6e;">
                PRESS <span style="color:#cd8d8d; font-weight:bold;">( A )</span> TO LOGIN
            </div>
          `;

        document.body.prepend(overlay);

        // 4. 事件绑定
        const submitBtn = document.getElementById('btn-login-submit');
        const resetBtn = document.getElementById('btn-login-reset');
        const uidInput = document.getElementById('login-uid');
        const pwdInput = document.getElementById('login-pwd');

        function handleLoginTrigger() {
            const msg = document.getElementById('login-msg');
            if (msg) msg.textContent = 'CONNECTING...';
            setTimeout(() => {
                if (typeof tryLogin === 'function') {
                    tryLogin();
                } else {
                    console.error('tryLogin function missing');
                }
            }, 200);
        }

        submitBtn.onclick = handleLoginTrigger;
        resetBtn.onclick = () => {
            pwdInput.value = '';
            const msg = document.getElementById('login-msg');
            if (msg) msg.textContent = 'CLEARED';
            pwdInput.focus();
        };
        pwdInput.onkeypress = function (e) {
            if (e.key === 'Enter') handleLoginTrigger();
        };

        const bindVisualEffect = (btn) => {
            const down = () => {
                btn.style.transform = 'translateY(6px)';
                btn.style.boxShadow = 'none';
            };
            const up = () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 6px 0 rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.1)';
            };
            btn.addEventListener('mousedown', down);
            btn.addEventListener('mouseup', up);
            btn.addEventListener('mouseleave', up);
            btn.addEventListener('touchstart', down, { passive: true });
            btn.addEventListener('touchend', up);
        };
        bindVisualEffect(submitBtn);
        bindVisualEffect(resetBtn);
    }

    // 2. 验证与启动函数
    async function tryLogin() {
        // 获取元素
        const uidEl = document.getElementById('login-uid');
        const pwdEl = document.getElementById('login-pwd');
        const msgEl = document.getElementById('login-msg');
        const submitBtn = document.getElementById('btn-login-submit');

        // 安全检查
        if (!uidEl || !pwdEl) {
            console.error('找不到登录输入框，请刷新页面');
            return;
        }

        const uid = uidEl.value.trim();
        const pwd = pwdEl.value.trim();

        if (!uid || !pwd) {
            msgEl.textContent = '请输入完整的账号和密码';
            if (msgEl) msgEl.style.color = '#ff453a'; // 红色警告
            return;
        }

        // 1. 设置加载状态
        msgEl.style.color = '#fab1a0'; // 恢复默认颜色
        msgEl.textContent = 'VERIFYING...';
        if (submitBtn) submitBtn.disabled = true; // 防止重复点击

        try {
            // 2. 发起网络请求 (你的新逻辑)
            const res = await fetch('https://puppy-subscription-api.zeabur.app/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account: uid, password: pwd }),
            });

            // 处理网络层面的错误 (如404, 500)
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            // 3. 处理验证结果
            if (data.success) {
                // --- 验证成功 ---
                msgEl.style.color = '#32d74b'; // 绿色成功
                msgEl.textContent = '验证通过，正在进入...';

                // 保存登录状态
                localStorage.setItem('ephone_saved_uid', uid);
                // 同时保存你的新验证标记
                localStorage.setItem('ephone_auth', 'true');

                // 初始化数据库 (使用 uid 作为数据库标识)
                initDatabase(uid);

                // 移除遮罩动画
                const overlay = document.getElementById('login-overlay');
                if (overlay) {
                    overlay.style.transition = 'opacity 0.5s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 500);
                }

                // 启动 App
                init();
            } else {
                // --- 验证失败 (业务逻辑拒绝，如密码错误) ---
                throw new Error(data.message || '账号或密码错误');
            }
        } catch (error) {
            // --- 错误处理 ---
            console.error('登录出错:', error);
            msgEl.style.color = '#ff453a'; // 红色警告
            // 显示具体错误信息，如果是网络错误显示"网络连接失败"
            msgEl.textContent = error.message.includes('fetch') ? '网络连接失败' : error.message || '验证失败';

            // 按钮视觉反馈 (变红一下)
            if (submitBtn) {
                const originalBg = submitBtn.style.background;
                submitBtn.style.background = '#ff453a';
                setTimeout(() => (submitBtn.style.background = originalBg || ''), 500);
                submitBtn.disabled = false; // 恢复按钮可用
            }
        }
    }

    /**
                 * 统一的 Pollinations 生图函数 (从 Taobao, Date, XHS 提取并合并)
                 * 优先使用 API Key，支持无限重试机制
                 * @param {string} prompt - 英文提示词
                 * @param {object} options - 配置项 { width, height, model, seed, nologo }
                 * @returns {Promise<string>} - 返回图片地址 (Blob URL 或 公网 URL)
                 */
    window.generatePollinationsImage = async function (prompt, options = {}) {
        const { width = 1024, height = 1024, model = 'flux', seed = Math.floor(Math.random() * 100000), nologo = false } = options;

        console.log(`[Global Image Gen] Prompt: ${prompt}, Options:`, options);

        while (true) {
            try {
                const encodedPrompt = encodeURIComponent(prompt);
                // 尝试获取全局 state，如果不存在则为 null
                const currentApiConfig = window.state && window.state.apiConfig ? window.state.apiConfig : null;
                const pollApiKey = currentApiConfig ? currentApiConfig.pollinationsApiKey : null;

                // 构建基础参数
                let queryParams = `width=${width}&height=${height}&seed=${seed}&model=${model}`;
                if (nologo) queryParams += '&nologo=true';

                // 1. === 有 API Key 的情况 ===
                if (pollApiKey) {
                    const primaryUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?${queryParams}&key=${pollApiKey}`;
                    console.log(`[Global Image Gen] 使用 API Key 请求: ${primaryUrl}`);

                    const response = await fetch(primaryUrl, { method: 'GET' });

                    if (!response.ok) {
                        throw new Error(`API Key 请求失败: ${response.status}`);
                    }

                    const blob = await response.blob();
                    // 将 Blob 转为 Base64 以便存储和持久化加载 (解决 blob:null 报错问题)
                    return await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }

                // 2. === 无 API Key (公开接口) 的情况 ===
                // 定义加载器
                const loadImage = (url) =>
                    new Promise((resolve, reject) => {
                        const img = new Image();
                        img.src = url;
                        img.onload = () => resolve(url);
                        img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
                    });

                // 优先尝试 gen.pollinations.ai
                const primaryUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?${queryParams}`;

                return await loadImage(primaryUrl).catch(async () => {
                    console.warn(`[Global Image Gen] 主接口失败，尝试备用接口...`);
                    // 备用接口 pollinations.ai/p/
                    const fallbackUrl = `https://pollinations.ai/p/${encodedPrompt}?${queryParams}`;
                    return await loadImage(fallbackUrl);
                });
            } catch (error) {
                console.error(`[Global Image Gen] 生成失败，5秒后自动重试... 错误: ${error.message}`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    };
    /* ==================================================
【全屏三击触发版】桌面拖拽系统
触发方式：在主屏幕任意位置（非弹窗/非设置页）连续点击 3 次
修复内容：包含对第二页组件位置的逻辑兼容
================================================== */
    function initDesktopManager() {
        const homeScreen = document.getElementById('home-screen');
        const doneBtn = document.getElementById('desktop-edit-done-btn');
        const sliderContainer = document.querySelector('.home-screen-slider');

        // 创建“重置布局”按钮
        let resetBtn = document.getElementById('desktop-reset-layout-btn');
        if (!resetBtn) {
            resetBtn = document.createElement('div');
            resetBtn.id = 'desktop-reset-layout-btn';
            resetBtn.textContent = '重置布局';
            resetBtn.style.cssText = `
            position: absolute;
            top: 50px;
            right: 80px; 
            background: rgba(255, 59, 48, 0.9);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            cursor: pointer;
            backdrop-filter: blur(10px);
            display: none; 
        `;
            homeScreen.appendChild(resetBtn);
        }

        // 定义所有可拖拽的目标
        const selector = '.home-page .desktop-app-icon, .home-page .custom-widget-container, #new-custom-widget, #profile-widget, #desktop-widget-column, #center-avatar-wrapper, .draggable-group, #glass-music-widget';

        let isEditMode = false;
        let dragItem = null;
        let originalParent = null;
        let shiftX = 0;
        let shiftY = 0;

        // --- 初始化ID ---
        const assignStableIds = () => {
            document.querySelectorAll(selector).forEach((el, index) => {
                if (!el.id) {
                    const label = el.querySelector('.label');
                    const innerImg = el.querySelector("img[id^='icon-img-']");
                    if (innerImg && innerImg.id) {
                        el.id = 'wrapper_' + innerImg.id;
                    } else if (label) {
                        el.id = 'auto_pos_' + label.innerText.trim();
                    } else {
                        el.id = 'auto_pos_idx_' + index;
                    }
                }
            });
        };
        assignStableIds();

        // 延迟恢复布局，并应用CSS居中修复
        setTimeout(() => {
            restoreLayout();
            // 强制刷新一次第二页组件的位置，确保CSS生效
            const centerWidget = document.getElementById('center-avatar-wrapper');
            if (centerWidget && centerWidget.style.position !== 'absolute') {
                // 如果没有被拖拽过（没有保存绝对定位），则清除内联样式，让CSS的居中生效
                centerWidget.style.left = '';
                centerWidget.style.top = '';
                centerWidget.style.transform = '';
            }
        }, 200);

        // ============================================================
        // ★★★ 【重点修改】全屏三击逻辑 ★★★
        // ============================================================
        let clickCount = 0;
        let clickTimer = null;

        // 我们把监听器绑在 homeScreen 上，覆盖整个桌面区域
        homeScreen.addEventListener(
            'click',
            (e) => {
                // 1. 如果已经在编辑模式，不处理
                // 2. 如果点击的是“完成”或“重置”按钮，不处理
                if (isEditMode || e.target.id === 'desktop-edit-done-btn' || e.target.id === 'desktop-reset-layout-btn') return;

                // 3. 计数
                clickCount++;

                // 第一次点击开启计时器
                if (clickCount === 1) {
                    clickTimer = setTimeout(() => {
                        clickCount = 0; // 500ms 内没点够3次，归零
                    }, 500);
                }

                // 达到3次
                if (clickCount >= 3) {
                    clearTimeout(clickTimer);
                    clickCount = 0;

                    // 震动反馈
                    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

                    // 阻止这次点击可能引发的 APP 打开等行为
                    e.preventDefault();
                    e.stopPropagation();

                    enterEditMode();
                }
            },
            true,
        ); // 使用捕获阶段 (true)，确保比 APP 图标的点击事件先触发

        // ============================================================

        // --- 拖拽逻辑 ---
        // 这里去掉了原来的长按计时器，只保留拖拽
        const handleInputDown = (e) => {
            if (!isEditMode) return; // 只有编辑模式下才允许拖拽

            if (e.target.id === 'desktop-edit-done-btn' || e.target.id === 'desktop-reset-layout-btn') return;

            let target = e.target.closest(selector);
            if (target && target.parentElement.closest(selector)) {
                target = target.parentElement.closest(selector);
            }

            if (target) {
                prepareDrag(e, target);
            }
        };

        sliderContainer.addEventListener('mousedown', handleInputDown);
        sliderContainer.addEventListener('touchstart', handleInputDown, {
            passive: false,
        });

        // --- 准备拖拽 ---
        function prepareDrag(e, item) {
            e.preventDefault();
            dragItem = item;
            const rect = dragItem.getBoundingClientRect();
            originalParent = dragItem.parentNode;

            // 修复：拖拽时如果是居中的组件，先计算出它当前的实际像素位置，转为 absolute left/top
            // 否则一拖动，transform: translate(-50%, -50%) 会导致坐标突变
            if (dragItem.id === 'center-avatar-wrapper') {
                dragItem.style.transform = 'none'; // 暂时移除 CSS 居中变换
                dragItem.style.left = rect.left + 'px'; // 固化当前视觉位置
                dragItem.style.top = rect.top + 'px';
            }

            const parentStyle = window.getComputedStyle(originalParent);
            if (parentStyle.position === 'static') {
                originalParent.style.position = 'relative';
            }

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            shiftX = clientX - rect.left;
            shiftY = clientY - rect.top;

            document.body.appendChild(dragItem);
            dragItem.classList.add('is-dragging-active');

            dragItem.style.position = 'fixed';
            dragItem.style.zIndex = '99999';
            dragItem.style.width = rect.width + 'px';
            dragItem.style.height = rect.height + 'px';
            dragItem.style.left = rect.left + 'px';
            dragItem.style.top = rect.top + 'px';
            dragItem.style.margin = '0'; // 清除 margin
            dragItem.style.transform = 'none'; // 清除 transform

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, {
                passive: false,
            });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        }

        // --- 拖拽移动 ---
        function onDragMove(e) {
            if (!dragItem) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            dragItem.style.left = clientX - shiftX + 'px';
            dragItem.style.top = clientY - shiftY + 'px';
        }

        // --- 拖拽结束 ---
        function onDragEnd() {
            if (dragItem && originalParent) {
                dragItem.classList.remove('is-dragging-active');
                const rect = dragItem.getBoundingClientRect();
                const parentRect = originalParent.getBoundingClientRect();
                const parentStyle = window.getComputedStyle(originalParent);
                const borderLeft = parseFloat(parentStyle.borderLeftWidth) || 0;
                const borderTop = parseFloat(parentStyle.borderTopWidth) || 0;

                const relativeLeft = rect.left - parentRect.left - borderLeft + originalParent.scrollLeft;
                const relativeTop = rect.top - parentRect.top - borderTop + originalParent.scrollTop;

                originalParent.appendChild(dragItem);

                dragItem.style.position = 'absolute';
                dragItem.style.zIndex = '';
                dragItem.style.left = relativeLeft + 'px';
                dragItem.style.top = relativeTop + 'px';
                dragItem.style.width = rect.width + 'px';
                dragItem.style.height = rect.height + 'px';
                dragItem.style.margin = '0'; // 确保放回后也没有margin
                dragItem.style.transform = 'none'; // 确保放回后没有transform

                // 特殊处理：如果是居中组件，被拖动后，它就变成了普通绝对定位组件
                // 不需要额外操作，上面的 left/top 已经固化了它的位置

                if (originalParent.clientHeight < 50 && originalParent.id !== 'phone-screen') {
                    originalParent.style.minHeight = '100px';
                }

                dragItem = null;
                originalParent = null;
            }

            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchend', onDragEnd);
        }

        function enterEditMode() {
            isEditMode = true;
            homeScreen.classList.add('editing-mode');
            doneBtn.style.display = 'block';
            const resetBtn = document.getElementById('desktop-reset-layout-btn');
            if (resetBtn) resetBtn.style.display = 'block';
            document.addEventListener('click', blockClickInEditMode, true);
        }

        doneBtn.addEventListener('click', () => {
            isEditMode = false;
            homeScreen.classList.remove('editing-mode');
            doneBtn.style.display = 'none';
            const resetBtn = document.getElementById('desktop-reset-layout-btn');
            if (resetBtn) resetBtn.style.display = 'none';
            document.removeEventListener('click', blockClickInEditMode, true);
            saveLayout();
        });

        resetBtn.addEventListener('click', async () => {
            if (confirm('确定要重置所有布局吗？页面将刷新。')) {
                if (window.state && window.state.globalSettings) {
                    window.state.globalSettings.desktopLayoutV2 = null;
                    await window.db.globalSettings.put(window.state.globalSettings);
                    location.reload();
                }
            }
        });

        function blockClickInEditMode(e) {
            if (e.target.id === 'desktop-edit-done-btn' || e.target.id === 'desktop-reset-layout-btn') return;
            if (isEditMode) {
                e.stopPropagation();
                e.preventDefault();
            }
        }

        // --- 保存布局 ---
        async function saveLayout() {
            if (!window.db || !window.state) return;
            assignStableIds();
            const layoutData = {};
            const items = document.querySelectorAll(selector);
            items.forEach((item) => {
                // 检查：只有当元素被明确设为 absolute 时才保存位置
                // 这可以兼容第一步CSS里写的初始居中状态（没有absolute left/top）
                if (item.id && item.style.position === 'absolute' && item.style.left) {
                    layoutData[item.id] = {
                        left: item.style.left,
                        top: item.style.top,
                        width: item.style.width,
                        height: item.style.height,
                        parentId: item.parentNode.id || null,
                    };
                }
            });
            window.state.globalSettings.desktopLayoutV2 = layoutData;
            await window.db.globalSettings.put(window.state.globalSettings);
        }

        // --- 恢复布局 ---
        async function restoreLayout() {
            if (!window.db || !window.state || !window.state.globalSettings) {
                setTimeout(restoreLayout, 500);
                return;
            }
            const layoutData = window.state.globalSettings.desktopLayoutV2;
            if (layoutData) {
                assignStableIds();
                for (const [id, pos] of Object.entries(layoutData)) {
                    const el = document.getElementById(id);
                    if (el) {
                        el.style.position = 'absolute';
                        el.style.left = pos.left;
                        el.style.top = pos.top;
                        el.style.width = pos.width;
                        el.style.height = pos.height;
                        el.style.margin = '0';
                        // 如果读取到了自定义位置，就必须移除 CSS 里的 transform 居中
                        el.style.transform = 'none';
                        el.style.bottom = 'auto';
                        el.style.right = 'auto';

                        const parent = el.parentNode;
                        if (parent) {
                            const parentStyle = window.getComputedStyle(parent);
                            if (parentStyle.position === 'static') {
                                parent.style.position = 'relative';
                            }
                            if (parent.clientHeight < 50 && parent.id !== 'phone-screen') {
                                parent.style.minHeight = '100px';
                            }
                        }
                    }
                }
            }
        }
    }

    function captureVideoFrame(videoElement) {
        if (!videoElement || videoElement.paused || videoElement.ended) return null;
        try {
            const canvas = document.createElement('canvas');
            // 限制一下尺寸，防止token消耗过大或传输过慢，宽设置为 512px 左右足够了
            const scale = 512 / videoElement.videoWidth;
            canvas.width = 512;
            canvas.height = videoElement.videoHeight * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            // 返回 jpeg 格式，质量 0.6
            return canvas.toDataURL('image/jpeg', 0.6);
        } catch (e) {
            console.error('截图失败:', e);
            return null;
        }
    }

    /*
     * ===================================================================
     * === 全局接口 (Public API for other scripts) ===
     * ===================================================================
     * 将主应用的核心功能暴露给其他脚本文件（如 game-hall.js）使用
     */


    // 【新增】把跳转函数暴露给全局，以便在弹窗中点击调用
    window.jumpToMessage = async function (timestamp) {
        // 1. 关闭所有可能挡住视线的模态框
        document.querySelectorAll('.modal').forEach((el) => el.classList.remove('visible'));
        document.getElementById('custom-modal-overlay').classList.remove('visible');
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 切换回聊天界面
        showScreen('chat-interface-screen');

        // 简单的滚动实现
        setTimeout(() => {
            const bubble = document.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);
            if (bubble) {
                bubble.scrollIntoView({ behavior: 'auto', block: 'center' });
                bubble.classList.add('flash'); // 闪烁特效
                setTimeout(() => bubble.classList.remove('flash'), 1500);
            } else {
                alert("该消息不在当前显示范围内（可能太久远），请先点击'加载更多'。");
            }
        }, 300);
    };

    window.triggerAiResponse = triggerAiResponse;




    // Expose functions for other modules (like apps/QQ/functions.js)
    window.showChoiceModal = showChoiceModal;
    window.appendMessage = appendMessage;
    window.renderChatList = renderChatList;
    // window.updateUserBalanceAndLogTransaction is already global

    // --- Initialize Apps manually since defer scripts run after this logic might be too late for some bindings
    // But since we are inside DOMContentLoaded, defer scripts SHOULD have run already.
    // console.log('Main App DOMContentLoaded finished. Initializing external apps...');
    // if (typeof window.initTaobao === 'function') { window.initTaobao(); } else { console.warn('initTaobao not found'); }
    // if (typeof window.initLoversSpace === 'function') { window.initLoversSpace(); } else { console.warn('initLoversSpace not found'); }
    // if (typeof window.initKkCheckin === 'function') { window.initKkCheckin(); } else { console.warn('initKkCheckin not found'); }
    // if (typeof window.initTukeyAccounting === 'function') { window.initTukeyAccounting(); } else { console.warn('initTukeyAccounting not found'); }

    // --- 启动应用 ---
    console.log('[System] 应用初始化...');

    // 尝试自动填充保存的账号
    const savedUid = localStorage.getItem('ephone_saved_uid');

    if (savedUid) {
        console.log('[System] 检测到已登录账号，自动进入:', savedUid);
        // 直接初始化数据库和应用，跳过登录页
        initDatabase(savedUid);
        init();
    } else {
        // 未登录，显示登录页
        renderLoginOverlay();
    }
});


// 三次点击下载NAI图片功能（完整代码）

/**
 * 统一的 Pollinations 生图函数 (从 Taobao, Date, XHS 提取并合并)
 * 优先使用 API Key，支持无限重试机制
 * @param {string} prompt - 英文提示词
 * @param {object} options - 配置项 { width, height, model, seed, nologo }
 * @returns {Promise<string>} - 返回图片地址 (Blob URL 或 公网 URL)
 */
window.generatePollinationsImage = async function (prompt, options = {}) {
    const {
        width = 1024,
        height = 1024,
        model = 'flux',
        seed = Math.floor(Math.random() * 100000),
        nologo = true
    } = options;

    console.log(`[Global Image Gen] Prompt: ${prompt}, Options:`, options);

    while (true) {
        try {
            const encodedPrompt = encodeURIComponent(prompt);
            // 尝试获取全局 state，如果不存在则为 null
            const currentApiConfig = (window.state && window.state.apiConfig) ? window.state.apiConfig : null;
            const pollApiKey = currentApiConfig ? currentApiConfig.pollinationsApiKey : null;

            // 构建基础参数
            let queryParams = `width=${width}&height=${height}&seed=${seed}&model=${model}`;
            if (nologo) queryParams += '&nologo=true';

            // 1. === 有 API Key 的情况 ===
            if (pollApiKey) {
                const primaryUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?${queryParams}&key=${pollApiKey}`;
                console.log(`[Global Image Gen] 使用 API Key 请求: ${primaryUrl}`);

                const response = await fetch(primaryUrl, { method: "GET" });

                if (!response.ok) {
                    throw new Error(`API Key 请求失败: ${response.status}`);
                }

                const blob = await response.blob();
                // 将 Blob 转为 Base64 以便存储和持久化加载 (解决 blob:null 报错问题)
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            // 2. === 无 API Key (公开接口) 的情况 ===
            // 定义加载器
            const loadImage = (url) => new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(url);
                img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
            });

            // 优先尝试 gen.pollinations.ai
            const primaryUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?${queryParams}`;

            return await loadImage(primaryUrl).catch(async () => {
                console.warn(`[Global Image Gen] 主接口失败，尝试备用接口...`);
                // 备用接口 pollinations.ai/p/
                const fallbackUrl = `https://pollinations.ai/p/${encodedPrompt}?${queryParams}`;
                return await loadImage(fallbackUrl);
            });

        } catch (error) {
            console.error(`[Global Image Gen] 生成失败，5秒后自动重试... 错误: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};
