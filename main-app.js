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

    function hideCustomModal() {
        modalOverlay.classList.remove('visible');
        modalConfirmBtn.classList.remove('btn-danger');
        if (modalResolve) modalResolve(null);
    }

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
    window.toggleVoiceTranscript = toggleVoiceTranscript; // Expose to global
    function toggleVoiceTranscript(bubble) {
        if (!bubble) return;

        const transcriptEl = bubble.querySelector('.voice-transcript');
        if (!transcriptEl) return;

        // 核心逻辑：直接检查文字区域当前是不是显示状态
        const isCurrentlyExpanded = transcriptEl.style.display === 'block';

        if (isCurrentlyExpanded) {
            // 如果是展开的，就直接收起来
            transcriptEl.style.display = 'none';
            bubble.dataset.state = 'collapsed'; // 更新状态标记
        } else {
            // 如果是收起的，就执行展开流程
            bubble.dataset.state = 'expanded'; // 更新状态标记

            // 1. 先显示一个“正在转写”的提示，给用户即时反馈
            transcriptEl.textContent = '正在转文字...';
            transcriptEl.style.display = 'block';

            // 2. 模拟一个短暂的“识别”过程
            setTimeout(() => {
                // 再次检查元素是否还在页面上，防止用户切换聊天导致错误
                if (document.body.contains(transcriptEl)) {
                    // 获取并显示真正的转写文字
                    const voiceText = bubble.dataset.voiceText || '(无法识别)';
                    transcriptEl.textContent = voiceText;
                }
            }, 300); // 300毫秒的延迟，感觉更灵敏
        }
    }

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




    /**
     * 处理用户选择的角色卡文件
     * @param {File} file - 用户选择的文件对象
     */
    async function handleCharacterImport(file) {
        if (!file) return;

        try {
            let characterData;
            let avatarBase64;

            if (file.name.toLowerCase().endsWith('.png')) {
                // 如果是PNG文件，调用PNG解析函数
                const result = await parseCharPng(file);
                characterData = result.characterData;
                avatarBase64 = result.avatarBase64;
            } else if (file.name.toLowerCase().endsWith('.json')) {
                // 如果是JSON文件，调用JSON解析函数
                characterData = await parseCharJson(file);
                // JSON卡通常不包含图片，我们给一个默认头像
                avatarBase64 = defaultAvatar;
            } else {
                alert('不支持的文件格式，请选择 .png 或 .json 文件。');
                return;
            }

            if (characterData) {
                // 成功解析出数据后，调用创建函数
                await createCharacterFromData(characterData, avatarBase64);
            }
        } catch (error) {
            console.error('导入角色卡失败:', error);
            alert(`导入失败: ${error.message}`);
        }
    }

    /**
     * 解析SillyTavern的PNG角色卡，通过字节级操作彻底解决中文乱码问题。
     * @param {File} file - PNG文件
     * @returns {Promise<{characterData: object, avatarBase64: string}>}
     */
    async function parseCharPng(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const dataView = new DataView(arrayBuffer);

                if (dataView.getUint32(0) !== 0x89504e47 || dataView.getUint32(4) !== 0x0d0a1a0a) {
                    return reject(new Error('文件不是一个有效的PNG图片。'));
                }

                let offset = 8;
                let characterJson = null;

                while (offset < dataView.byteLength) {
                    const length = dataView.getUint32(offset);
                    const type = String.fromCharCode(dataView.getUint8(offset + 4), dataView.getUint8(offset + 5), dataView.getUint8(offset + 6), dataView.getUint8(offset + 7));

                    if (type === 'tEXt') {
                        const chunkData = new Uint8Array(arrayBuffer, offset + 8, length);

                        // 1. 先用一个简单的编码将字节转为字符串，以便查找关键字 "chara"
                        let text = '';
                        for (let i = 0; i < chunkData.length; i++) {
                            text += String.fromCharCode(chunkData[i]);
                        }

                        // 2. 检查关键字是否存在
                        const keyword = 'chara' + String.fromCharCode(0);
                        if (text.startsWith(keyword)) {
                            // 3. 提取出关键字后面的 Base64 编码的字符串
                            const base64Data = text.substring(keyword.length);
                            try {
                                // 4. 使用 atob() 解码 Base64，得到一个“二进制字符串”
                                const binaryString = atob(base64Data);

                                // 5. 将这个“二进制字符串”重新转换为原始的 UTF-8 字节数组
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }

                                // 6. 使用 TextDecoder 将这个纯净的 UTF-8 字节数组解码为正确的字符串
                                const decodedJsonString = new TextDecoder('utf-8').decode(bytes);

                                // 7. 解析最终的JSON字符串
                                characterJson = JSON.parse(decodedJsonString);
                                break;
                            } catch (e) {
                                return reject(new Error('解析图片内嵌的角色数据失败，可能是数据损坏。'));
                            }
                        }
                    }

                    if (type === 'IEND') break;
                    offset += 12 + length;
                }

                if (characterJson) {
                    const imageReader = new FileReader();
                    imageReader.onload = (imgEvent) => {
                        resolve({
                            characterData: characterJson,
                            avatarBase64: imgEvent.target.result,
                        });
                    };
                    imageReader.onerror = () => reject(new Error('读取图片作为头像失败。'));
                    imageReader.readAsDataURL(file);
                } else {
                    reject(new Error('在这张PNG图片中没有找到SillyTavern角色数据。'));
                }
            };
            reader.onerror = () => reject(new Error('读取PNG文件失败。'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 【修正版】解析JSON角色卡，强制使用UTF-8编码
     * @param {File} file - JSON文件
     * @returns {Promise<object>}
     */
    async function parseCharJson(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // 先读取为ArrayBuffer，再用TextDecoder指定UTF-8解码
                    const arrayBuffer = e.target.result;
                    const textDecoder = new TextDecoder('utf-8');
                    const jsonString = textDecoder.decode(arrayBuffer);
                    const data = JSON.parse(jsonString);
                    // 兼容两种可能的格式
                    resolve(data.data || data);
                } catch (error) {
                    reject(new Error('解析JSON文件失败，请检查文件格式或编码。'));
                }
            };
            reader.onerror = () => reject(new Error('读取JSON文件失败。'));
            // 读取为ArrayBuffer而不是Text
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 根据解析出的数据创建新角色和世界书。
     * 这个版本将优先查找您提供的 character_book 标准格式。
     * @param {object} data - 从卡片解析出的最原始的JSON数据
     * @param {string} avatarBase64 - 角色的头像图片 (Base64)
     */
    async function createCharacterFromData(data, avatarBase64) {
        // 步骤 1: 确定核心角色数据 (不变)
        const charData = data.data || data;
        const characterName = charData.name ? charData.name.trim() : '未命名角色';

        // 步骤 2: 创建新的聊天对象 (不变)
        const newChatId = 'chat_' + Date.now();

        const newChat = {
            id: newChatId,
            name: characterName,
            isGroup: false,
            isPinned: false,
            history: [],
            unreadCount: 0,
            musicData: { totalTime: 0 },
            npcLibrary: [],
            relationship: { status: 'friend', blockedTimestamp: null, applicationReason: '' },
            status: { text: '在线', lastUpdate: Date.now(), isBusy: false },
            weiboDms: [],
            loversSpaceData: null,
            settings: {
                aiPersona: charData.description || '该角色没有描述。',
                myPersona: '我是谁呀。',
                maxMemory: 10,
                aiAvatar: avatarBase64,
                myAvatar: defaultAvatar,
                background: '',
                theme: 'default',
                fontSize: 13,
                customCss: '',
                linkedWorldBookIds: [],
                aiAvatarLibrary: [],
                stickerLibrary: [],
                summary: {
                    enabled: false,
                    mode: 'auto',
                    count: 20,
                    prompt: '请你以第三人称的视角，客观、冷静、不带任何感情色彩地总结以下对话的核心事件和信息。禁止进行任何角色扮演或添加主观评论。',
                    lastSummaryIndex: -1,
                },
                linkedMemories: [],
                offlineMode: {
                    enabled: false,
                    prompt: '',
                    style: '',
                    wordCount: 300,
                    presets: [],
                },
                timePerceptionEnabled: true,
                customTime: '',
                isCoupleAvatar: false,
                coupleAvatarDescription: '',
                weiboProfession: '',
                weiboInstruction: '',
                visualVideoCallEnabled: false,
                charVideoImage: '',
                userVideoImage: '',
                videoCallVoiceAccess: false,
                petAdopted: false,
                pet: null,
            },
            characterPhoneData: {
                lastGenerated: null,
                chats: {},
                shoppingCart: [],
                memos: [],
                browserHistory: [],
                photoAlbum: [],
                bank: { balance: 0, transactions: [] },
                trajectory: [],
                appUsage: [],
                diary: [],
            },
        };

        await db.chats.put(newChat);
        state.chats[newChatId] = newChat;

        // 重构世界书查找逻辑
        console.log('开始检测世界书数据...');
        let worldBookFound = false;

        // 策略一：【最高优先级】查找提供的 character_book 标准格式
        if (charData.character_book && charData.character_book.entries && Array.isArray(charData.character_book.entries) && charData.character_book.entries.length > 0) {
            console.log(`检测到最新的 character_book 格式 (${charData.character_book.entries.length}条)，开始导入...`);
            const newCategory = { name: characterName };
            const newCategoryId = await db.worldBookCategories.add(newCategory);

            await window.WorldBookModule.saveWorldBookEntriesFromArray(charData.character_book.entries, newCategoryId);
            worldBookFound = true;
        }

        // 策略二：兼容旧的 world_entries 格式
        else if (charData.world_entries && Array.isArray(charData.world_entries) && charData.world_entries.length > 0) {
            console.log(`检测到旧版 world_entries 格式 (${charData.world_entries.length}条)，开始导入...`);
            const newCategory = { name: characterName };
            const newCategoryId = await db.worldBookCategories.add(newCategory);
            await window.WorldBookModule.saveWorldBookEntriesFromArray(charData.world_entries, newCategoryId);
            worldBookFound = true;
        }

        // 策略三：兼容更旧的 data.world 格式
        else if (data.world && typeof data.world === 'string' && data.world.trim()) {
            console.log('检测到外层 world 字段格式，开始导入...');
            const newCategory = { name: characterName };
            const newCategoryId = await db.worldBookCategories.add(newCategory);
            await window.WorldBookModule.parseAndSaveWorldBooks(data.world, newCategoryId);
            worldBookFound = true;
        }

        // 策略四：最后的兼容手段 world_info
        else if (charData.world_info && typeof charData.world_info === 'string' && charData.world_info.trim()) {
            console.log('检测到旧版 world_info 字段格式，开始导入...');
            const newCategory = { name: characterName };
            const newCategoryId = await db.worldBookCategories.add(newCategory);
            await window.WorldBookModule.parseAndSaveWorldBooks(charData.world_info, newCategoryId);
            worldBookFound = true;
        }

        if (!worldBookFound) {
            console.log('诊断：在此角色卡中未找到任何可识别的世界书字段。');
        }

        // 步骤 4: 刷新UI (不变)
        await renderChatList();
        await showCustomAlert('导入成功！', `角色“${characterName}”已成功创建！`);
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


    // Qzone function (renderQzonePosts) moved to apps/QQ/qzone.js



    // Qzone function (renderFollowingFeed) moved to apps/QQ/qzone.js


    /* favorites functions moved to apps/QQ/favorites.js */


    // Qzone function (resetCreatePostModal) moved to apps/QQ/qzone.js


    let githubBackupTimer = null; // Re-declared for compatibility if needed, but functions using it are being removed.



    // backupToGithub moved to settings.js



    // restoreBackupFromGitHub + uploadSingleFile moved to settings.js







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

    function prependLoadMoreButton(container) {
        const button = document.createElement('button');
        button.id = 'load-more-btn';
        button.textContent = '加载更早的记录';
        button.addEventListener('click', loadMoreMessages);
        container.prepend(button);
    }

    function loadMoreMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        const chat = state.chats[state.activeChatId];
        if (!chat) return;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) loadMoreBtn.remove();
        const totalMessages = chat.history.length;
        const nextSliceStart = totalMessages - currentRenderedCount - MESSAGE_RENDER_WINDOW;
        const nextSliceEnd = totalMessages - currentRenderedCount;
        const messagesToPrepend = chat.history.slice(Math.max(0, nextSliceStart), nextSliceEnd);
        const oldScrollHeight = messagesContainer.scrollHeight;

        // 1. 找到屏幕上已有的、最老的那条【真实消息】的时间戳
        const firstVisibleMessage = messagesContainer.querySelector('.message-wrapper:not(.date-stamp-wrapper)');
        let subsequentMessageTimestamp = firstVisibleMessage ? parseInt(firstVisibleMessage.dataset.timestamp) : null;

        // 2. 从后往前（从新到旧）遍历我们要新加载的消息
        messagesToPrepend.reverse().forEach((currentMsg) => {
            // 检查这条新消息和它后面那条（可能是屏幕上已有的，也可能是刚加载的）消息是否跨天
            if (subsequentMessageTimestamp && isNewDay(subsequentMessageTimestamp, currentMsg.timestamp)) {
                // 如果跨天，就为后面那条“较新”的消息创建一个日期戳
                const dateStampEl = createDateStampElement(subsequentMessageTimestamp);
                messagesContainer.prepend(dateStampEl);
            }

            // 正常地把当前这条新消息放到最前面
            prependMessage(currentMsg, chat);

            // 更新追踪器，为下一次比较做准备
            subsequentMessageTimestamp = currentMsg.timestamp;
        });

        // 3. 【边界处理】处理所有新加载消息的最前面（也就是整个聊天记录的最老）的那条消息
        // 它也需要一个日期戳
        if (subsequentMessageTimestamp) {
            const dateStampEl = createDateStampElement(subsequentMessageTimestamp);
            messagesContainer.prepend(dateStampEl);
        }

        currentRenderedCount += messagesToPrepend.length;
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop += newScrollHeight - oldScrollHeight;
        if (totalMessages > currentRenderedCount) {
            prependLoadMoreButton(messagesContainer);
        }
    }

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
        const bg = window.newWallpaperBase64 || newWallpaperBase64 || state.globalSettings.wallpaper;
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
    function openLoversSpaceFromCard(charId, viewId) {
        // 1. 打开指定角色的情侣空间主界面
        openLoversSpace(charId);

        // 2. 等待一小会儿，确保界面已渲染
        setTimeout(() => {
            // 3. 找到对应的页签按钮并模拟点击它
            const targetTab = document.querySelector(`.ls-tab-item[data-view='${viewId}']`);
            if (targetTab) {
                targetTab.click();
            }
        }, 100); // 100毫秒的延迟通常足够了
    }

    function createMessageElement(msg, chat) {
        if (msg.type === 'recalled_message') {
            const wrapper = document.createElement('div');
            // 1. 给 wrapper 也加上 timestamp，方便事件委托时查找
            wrapper.className = 'message-wrapper system-pat';
            wrapper.dataset.timestamp = msg.timestamp;

            const bubble = document.createElement('div');
            // 2. 让这个元素同时拥有 .message-bubble 和 .recalled-message-placeholder 两个class
            //    这样它既能被选择系统识别，又能保持原有的居中灰色样式
            bubble.className = 'message-bubble recalled-message-placeholder';
            // 3. 把 timestamp 放在 bubble 上，这是多选逻辑的关键
            bubble.dataset.timestamp = msg.timestamp;
            bubble.textContent = msg.content;

            wrapper.appendChild(bubble);

            // 4. 为它补上和其他消息一样的标准事件监听器
            addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
            wrapper.addEventListener('click', () => {
                if (isSelectionMode) {
                    toggleMessageSelection(msg.timestamp);
                }
            });

            // 5. 在之前的“点击查看原文”的逻辑中，我们已经使用了事件委托，所以这里不需要再单独为这个元素添加点击事件了。
            //    init() 函数中的那个事件监听器会处理它。

            return wrapper;
        }

        if (msg.isHidden) {
            return null;
        }

        if (msg.type === 'pat_message') {
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper system-pat';
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble system-bubble';
            bubble.dataset.timestamp = msg.timestamp;
            bubble.textContent = msg.content;
            wrapper.appendChild(bubble);
            addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
            wrapper.addEventListener('click', () => {
                if (isSelectionMode) toggleMessageSelection(msg.timestamp);
            });
            return wrapper;
        } else if (msg.type === 'narrative') {
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper system-pat'; // 复用系统消息的居中样式
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble system-bubble';
            bubble.dataset.timestamp = msg.timestamp;

            bubble.style.textAlign = 'left';
            bubble.style.display = 'inline-block'; // 保持气泡自适应内容宽度
            bubble.style.maxWidth = '100%'; // 限制最大宽度，避免太宽

            // 这里给它加个小图标，让它看起来更有“剧情感”
            bubble.innerHTML = `
			                            <div style="font-weight:bold; color:#5f6368;">📝 旁白</div>
			                            <div style="line-height: 1.5;">${msg.content.replace(/\n/g, '<br>')}</div>
			                        `;

            wrapper.appendChild(bubble);

            // 绑定长按和点击事件（用于删除等操作）
            addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
            wrapper.addEventListener('click', () => {
                if (isSelectionMode) toggleMessageSelection(msg.timestamp);
            });
            return wrapper;
        }

        const isUser = msg.role === 'user';
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isUser ? 'user' : 'ai'}`;

        if (chat.isGroup) {
            const senderLine = document.createElement('div');
            senderLine.className = 'group-sender-line';

            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'group-sender-tags';

            let senderDisplayName;

            if (isUser) {
                // 如果是用户自己
                senderDisplayName = chat.settings.myNickname || '我';

                // 检查用户是否是群主
                if (chat.ownerId === 'user') {
                    const roleTag = document.createElement('span');
                    roleTag.className = 'group-role-tag owner';
                    roleTag.textContent = '群主';
                    tagsContainer.appendChild(roleTag);
                }
                // 检查用户是否被设为管理员
                else if (chat.settings.isUserAdmin) {
                    const roleTag = document.createElement('span');
                    roleTag.className = 'group-role-tag admin';
                    roleTag.textContent = '管理员';
                    tagsContainer.appendChild(roleTag);
                }

                // 检查用户是否有头衔
                if (chat.settings.myGroupTitle) {
                    const titleTag = document.createElement('span');
                    titleTag.className = 'group-title-tag';
                    titleTag.textContent = chat.settings.myGroupTitle;
                    tagsContainer.appendChild(titleTag);
                }
            } else {
                // 如果是其他成员 (AI/NPC)，这部分逻辑保持不变
                const member = chat.members.find((m) => m.originalName === msg.senderName);
                senderDisplayName = member ? member.groupNickname : msg.senderName || '未知成员';

                // 如果该成员被禁言了，就添加一个禁言标签
                if (member && member.isMuted) {
                    const muteTag = document.createElement('span');
                    muteTag.className = 'group-title-tag'; // 复用头衔标签的样式
                    muteTag.style.color = '#ff3b30'; // 让它变成红色
                    muteTag.style.backgroundColor = '#ffe5e5'; // 淡红色背景
                    muteTag.textContent = '🚫已禁言';
                    tagsContainer.appendChild(muteTag);
                }

                if (member && chat.ownerId === member.id) {
                    const roleTag = document.createElement('span');
                    roleTag.className = 'group-role-tag owner';
                    roleTag.textContent = '群主';
                    tagsContainer.appendChild(roleTag);
                } else if (member && member.isAdmin) {
                    const roleTag = document.createElement('span');
                    roleTag.className = 'group-role-tag admin';
                    roleTag.textContent = '管理员';
                    tagsContainer.appendChild(roleTag);
                }

                if (member && member.groupTitle) {
                    const titleTag = document.createElement('span');
                    titleTag.className = 'group-title-tag';
                    titleTag.textContent = member.groupTitle;
                    tagsContainer.appendChild(titleTag);
                }
            }

            const senderNameSpan = document.createElement('span');
            senderNameSpan.className = 'sender-name';
            senderNameSpan.textContent = senderDisplayName;

            // 修复用户标签显示在右边的问题
            if (isUser) {
                senderLine.appendChild(tagsContainer); // 标签在左
                senderLine.appendChild(senderNameSpan); // 昵称在右
            } else {
                senderLine.appendChild(senderNameSpan); // 昵称在左
                senderLine.appendChild(tagsContainer); // 标签在右
            }

            wrapper.appendChild(senderLine);
        }

        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${isUser ? 'user' : 'ai'}`;
        bubble.dataset.timestamp = msg.timestamp;

        const timestampEl = document.createElement('span');
        timestampEl.className = 'timestamp';
        timestampEl.textContent = formatTimestamp(msg.timestamp);

        // 找到确定 avatarSrc 的那段代码
        let avatarSrc,
            avatarFrameSrc = ''; // <--- 声明两个变量
        if (chat.isGroup) {
            if (isUser) {
                avatarSrc = chat.settings.myAvatar || defaultMyGroupAvatar;
                avatarFrameSrc = chat.settings.myAvatarFrame || ''; // <--- 获取“我”的头像框
            } else {
                const member = chat.members.find((m) => m.originalName === msg.senderName);
                avatarSrc = member ? member.avatar : defaultGroupMemberAvatar;
                avatarFrameSrc = member ? member.avatarFrame || '' : ''; // <--- 获取成员的头像框
            }
        } else {
            if (isUser) {
                avatarSrc = chat.settings.myAvatar || defaultAvatar;
                avatarFrameSrc = chat.settings.myAvatarFrame || ''; // <--- 获取“我”的头像框
            } else {
                avatarSrc = chat.settings.aiAvatar || defaultAvatar;
                avatarFrameSrc = chat.settings.aiAvatarFrame || ''; // <--- 获取AI的头像框
            }
        }

        let avatarHtml;
        // 如果存在头像框URL
        if (avatarFrameSrc) {
            avatarHtml = `
			            <div class="avatar-with-frame">
			                <img src="${avatarSrc}" class="avatar-img">
			                <img src="${avatarFrameSrc}" class="avatar-frame">
			            </div>
			        `;
        } else {
            // 如果没有，就使用最简单的头像结构
            avatarHtml = `<img src="${avatarSrc}" class="avatar">`;
        }

        let contentHtml;

        if (msg.type === 'share_link') {
            bubble.classList.add('is-link-share');

            // onclick="openBrowser(...)" 移除，我们将在JS中动态绑定事件
            contentHtml = `
			            <div class="link-share-card" data-timestamp="${msg.timestamp}">
			                <div class="title">${msg.title || '无标题'}</div>
			                <div class="description">${msg.description || '点击查看详情...'}</div>
			                <div class="footer">
			                    <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
			                    <span>${msg.source_name || '链接分享'}</span>
			                </div>
			            </div>
			        `;
        }
        // ... 其他 case ...
        else if (msg.type === 'dating_summary_card') {
            bubble.classList.add('is-dating-summary');
            const payload = msg.payload;
            let cardClass = '';

            if (payload.ratingType === 'romantic') {
                cardClass = 'romantic';
            } else if (payload.ratingType === 'passionate') {
                cardClass = 'passionate';
            } else if (payload.ratingType === 'perfect') {
                cardClass = 'perfect';
            }

            // 不再存储复杂的JSON字符串
            contentHtml = `
			        <div class="dating-summary-chat-card ${cardClass}" data-timestamp="${msg.timestamp}">
			            <div class="rating">${payload.rating}</div>
			            <div class="tip">点击查看详情</div>
			        </div>
			    `;
        } else if (msg.type === 'share_card') {
            bubble.classList.add('is-link-share'); // 复用链接分享的卡片样式
            // 把时间戳加到卡片上，方便后面点击时识别
            contentHtml = `
			        <div class="link-share-card" style="cursor: pointer;" data-timestamp="${msg.timestamp}">
			            <div class="title">${msg.payload.title}</div>
			            <div class="description">共 ${msg.payload.sharedHistory.length} 条消息</div>
			            <div class="footer">
			                <svg class="footer-icon" ...>...</svg> <!-- 复用链接分享的图标 -->
			                <span>聊天记录</span>
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'eleme_order_notification') {
            bubble.classList.add('is-gift-notification');
            const payload = msg.payload;

            let remarkHtml = '';
            if (payload.remark && payload.remark.trim()) {
                remarkHtml = `
			            <div class="waimai-remark">
			                <span class="remark-label">备注:</span>
			                <span class="remark-text">${payload.remark}</span>
			            </div>
			        `;
            }

            // 1. 我们删除了写在HTML里的蓝色渐变样式。
            // 2. 将卡片的 class 从 "gift-card" 改为 "waimai-meituan-card"，方便我们定制专属样式。
            // 3. 将图标从面条 🍜 换成了外卖小摩托 🛵，更符合主题。
            contentHtml = `
			        <div class="waimai-meituan-card">
			            <div class="gift-card-header">
			                <div class="icon">🛵</div>
			                <div class="title">一份来自 ${payload.senderName} 的外卖</div>
			            </div>
			            <div class="gift-card-body">
			                <img src="${payload.foodImageUrl}" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
			                <p class="greeting" style="font-weight: bold; font-size: 16px;">${payload.foodName}</p>
			                <p style="font-size: 13px; color: #888;">你的专属外卖已送达</p>
			                ${remarkHtml}
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'borrow_money_request') {
            bubble.classList.add('is-borrow-request'); // 应用透明气泡样式
            const payload = msg.payload;
            // 直接将卡片的HTML赋给contentHtml，不再拼接任何文本
            contentHtml = `
			        <div class="borrow-card">
			            <div class="borrow-header">
			                向 <span>${payload.lenderName}</span> 借钱
			            </div>
			            <div class="borrow-body">
			                <p class="label">借款金额</p>
			                <p class="amount">¥${payload.amount.toFixed(2)}</p>
			                <p class="reason">
			                    <strong>借款用途:</strong><br>
			                    ${payload.reason}
			                </p>
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'repost_forum_post') {
            bubble.classList.add('is-link-share'); // 复用链接分享的样式，省事！
            const postPayload = msg.payload;
            //把帖子的ID存到卡片的 data-post-id 属性里，方便以后点击跳转
            contentHtml = `
			        <div class="link-share-card" style="cursor: pointer;" data-post-id="${postPayload.postId}">
			            <div class="title">【小组帖子】${postPayload.title}</div>
			            <div class="description">${postPayload.content}</div>
			            <div class="footer">
			                <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c.35 0 .69-.02 1.03-.06"></path><path d="M18.5 12.5c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3c.83 0 1.58-.34 2.12-.88"></path></svg>
			                <span>来自小组的分享</span>
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'series_share') {
            bubble.classList.add('is-book-share');
            const payload = msg.payload || {};
            const titleText = payload.seriesTitle || (msg.content && msg.content.split('\n')[0].replace('【连载分享】', '')) || '连载';
            const desc = payload.summary || '连载分享';
            const latest = payload.latestChapterIndex ? `第${payload.latestChapterIndex}章 ${payload.latestTitle || ''}` : '最新章节';
            const meta = `${payload.pairing || ''} · ${payload.statusText || ''} · 共${payload.chapterCount || '?'}章`;
            contentHtml = `
                <div class="book-share-card" style="cursor: pointer;" data-post-id="${payload.latestPostId || ''}">
                <div class="book-spine"></div>
                <div class="book-body">
                    <div class="book-tag">连载</div>
                    <div class="book-title">${titleText}</div>
                    <div class="book-meta">${meta}</div>
                    <div class="book-desc">${desc}</div>
                    <div class="book-latest">最新：${latest}</div>
                </div>
                </div>
            `;
        } else if (msg.type === 'kk_item_share') {
            bubble.classList.add('is-link-share'); // 复用透明背景样式(如果已定义)，或者不加这行让它有气泡背景
            // 如果你没有 is-link-share 样式，可以忽略上一行，或者定义 bubble.style.background = 'transparent';
            bubble.style.background = 'transparent';
            bubble.style.padding = '0';

            const payload = msg.payload;

            contentHtml = `
                <div class="kk-share-card">
                    <div class="header">
                        <span class="icon">🔍</span>
                        <span>查岗线索：${payload.itemName}</span>
                    </div>
                    <div class="content">${payload.content}</div>
                    <div class="footer">
                        来源：${payload.areaName}
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'cart_share_request') {
            bubble.classList.add('is-cart-share-request');
            const payload = msg.payload;
            let statusText = '等待对方处理...';
            let cardClass = '';

            if (payload.status === 'paid') {
                statusText = '对方已为你买单';
                cardClass = 'paid';
            } else if (payload.status === 'rejected') {
                statusText = '对方拒绝了你的请求';
                cardClass = 'rejected';
            }

            contentHtml = `
			        <div class="cart-share-card ${cardClass}">
			            <div class="cart-share-header">
			                <div class="icon">🛒</div>
			                <div class="title">购物车代付请求</div>
			            </div>
			            <div class="cart-share-body">
			                <div class="label">共 ${payload.itemCount} 件商品，合计</div>
			                <div class="amount">¥${payload.totalPrice.toFixed(2)}</div>
			                <div class="status-text">${statusText}</div>
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'waimai_gift_from_char') {
            bubble.classList.add('is-gift-notification');
            const payload = msg.payload;

            contentHtml = `
			        <div class="waimai-meituan-card">
			            <div class="gift-card-header">
			                <div class="icon">🛵</div>
			                <div class="title">你的专属外卖已送达</div>
			            </div>
			            <div class="gift-card-body">
			                <img src="${payload.foodImageUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
			                <p class="greeting" style="font-weight: bold; font-size: 16px;">${payload.foodName}</p>
			                <p style="font-size: 13px; color: #888;">来自: ${payload.restaurant}</p>
			            </div>
			            <div class="waimai-remark">
			                ${payload.greeting}
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'gift_notification') {
            bubble.classList.add('is-gift-notification'); // 应用透明气泡样式
            const payload = msg.payload;

            // 在这里构建卡片的完整HTML内容
            contentHtml = `
			        <div class="gift-card">
			            <div class="gift-card-header">
			                <div class="icon">🎁</div>
			                <!-- 1. 清晰指明是谁送的礼物 -->
			                <div class="title">一份来自 ${payload.senderName} 的礼物</div>
			            </div>
			            <div class="gift-card-body">
			                <p class="greeting">这是我为你挑选的礼物，希望你喜欢！</p>
			                <!-- 2. 清晰列出有什么商品 -->
			                <div class="gift-card-items">
			                    <strong>商品列表:</strong><br>
			                    ${payload.itemSummary.replace(/、/g, '<br>')} <!-- 将顿号替换为换行，让列表更清晰 -->
			                </div>
			                <!-- 3. 清晰标明总金额 -->
			                <div class="gift-card-footer">
			                    共 ${payload.itemCount} 件，合计: <span class="total-price">¥${payload.totalPrice.toFixed(2)}</span>
			                </div>
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'location') {
            bubble.classList.add('is-location');

            const currentChat = state.chats[state.activeChatId] || Object.values(state.chats).find((c) => c.history.some((h) => h.timestamp === msg.timestamp));
            const myNickname = currentChat.settings.myNickname || '我';
            const aiNickname = currentChat.name;

            // --- SVG 动态生成 ---
            const trajectoryPoints = msg.trajectoryPoints || [];
            const hasTrajectory = trajectoryPoints.length > 0;

            // 1. 定义SVG路径和坐标
            const pathData = 'M 20 45 Q 115 10 210 45'; // 一条预设的优美曲线
            const startPoint = { x: 20, y: 45 };
            const endPoint = { x: 210, y: 45 };

            // 2. 生成起点和终点的SVG元素
            let pinsSvg = '';
            if (msg.userLocation) {
                pinsSvg += `<circle class="svg-pin user-pin" cx="${startPoint.x}" cy="${startPoint.y}" r="6" />`;
            }
            if (msg.aiLocation) {
                pinsSvg += `<circle class="svg-pin ai-pin" cx="${endPoint.x}" cy="${endPoint.y}" r="6" />`;
            }

            // 3. 如果有轨迹，生成途经点的SVG元素
            let trajectorySvg = '';

            if (hasTrajectory) {
                // --- 使用浏览器API精确计算坐标 ---

                // 1. 定义我们的S形曲线路径数据 (不变)
                const s_curve_pathData = 'M 20 45 C 80 70, 150 20, 210 45';
                trajectorySvg += `<path class="svg-trajectory-path" d="${s_curve_pathData}" />`;

                // 2. 在内存中创建一个真实的SVG路径元素，以便使用API
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', s_curve_pathData);

                // 3. 获取这条路径的总长度
                const totalPathLength = path.getTotalLength();

                const totalPoints = trajectoryPoints.length;
                trajectoryPoints.forEach((point, index) => {
                    // 4. 计算每个点应该在路径总长度的哪个位置
                    const progress = (index + 1) / (totalPoints + 1);
                    const lengthOnPath = totalPathLength * progress;

                    // 5. 直接向浏览器查询这个位置的精确坐标
                    const pointOnPath = path.getPointAtLength(lengthOnPath);
                    const pointX = pointOnPath.x;
                    const pointY = pointOnPath.y;

                    // 6. 后续的“一上一下”布局逻辑保持不变
                    let yOffset;
                    if (index % 2 === 0) {
                        // 第1, 3...个点
                        yOffset = 18; // 向下
                    } else {
                        // 第2, 4...个点
                        yOffset = -10; // 向上
                    }

                    const footprintY = pointY + yOffset;
                    const labelY = footprintY + (yOffset > 0 ? 12 : -12);

                    // 7. 使用100%精确的坐标生成SVG
                    trajectorySvg += `
			            <text class="svg-footprint" x="${pointX}" y="${footprintY}" text-anchor="middle">🐾</text>
			            <text class="svg-location-label" x="${pointX}" y="${labelY}" text-anchor="middle">${point.name}</text>
			        `;
                });
            }

            // 4. 构建地点信息HTML
            const userLocationHtml = `<p class="${!msg.userLocation ? 'hidden' : ''}"><span class="name-tag">${myNickname}:</span> ${msg.userLocation}</p>`;
            const aiLocationHtml = `<p class="${!msg.aiLocation ? 'hidden' : ''}"><span class="name-tag">${aiNickname}:</span> ${msg.aiLocation}</p>`;

            // 5. 拼接最终的 contentHtml
            contentHtml = `
			        <div class="location-card">
			            <div class="location-map-area">
			                <svg viewBox="0 0 230 90">
			                    ${trajectorySvg}
			                    ${pinsSvg}
			                </svg>
			            </div>
			            <div class="location-info">
			                <div class="location-address">
			                    ${aiLocationHtml}
			                    ${userLocationHtml}
			                </div>
			                <div class="location-distance">相距 ${msg.distance}</div>
			            </div>
			        </div>
			    `;
        }

        // 后续的其他 else if 保持不变
        else if (msg.type === 'user_photo' || msg.type === 'ai_image') {
            bubble.classList.add('is-ai-image');
            const altText = msg.type === 'user_photo' ? '用户描述的照片' : 'AI生成的图片';
            contentHtml = `<img src="https://i.postimg.cc/KYr2qRCK/1.jpg" class="ai-generated-image" alt="${altText}" data-description="${msg.content}">`;
        } else if (msg.type === 'voice_message') {
            bubble.classList.add('is-voice-message');

            // 将语音原文存储在父级气泡的 data-* 属性中，方便事件处理器获取
            bubble.dataset.voiceText = msg.content;

            const duration = Math.max(1, Math.round((msg.content || '').length / 5));
            const durationFormatted = `0:${String(duration).padStart(2, '0')}''`;
            const waveformHTML = '<div></div><div></div><div></div><div></div><div></div>';

            // 构建包含所有新元素的完整 HTML
            contentHtml = `
			        <div class="voice-message-body">
			            <div class="voice-waveform">${waveformHTML}</div>
			            <div class="loading-spinner"></div>
			            <span class="voice-duration">${durationFormatted}</span>
			        </div>
			        <div class="voice-transcript"></div>
			    `;
        } else if (msg.type === 'transfer') {
            bubble.classList.add('is-transfer');

            let titleText, noteText;
            const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';

            if (isUser) {
                // 消息是用户发出的
                if (msg.isRefund) {
                    // 用户发出的退款（即用户拒收了AI的转账）
                    titleText = `退款给 ${chat.name}`;
                    noteText = '已拒收对方转账';
                } else {
                    // 用户主动发起的转账
                    titleText = `转账给 ${msg.receiverName || chat.name}`;
                    if (msg.status === 'accepted') {
                        noteText = '对方已收款';
                    } else if (msg.status === 'declined') {
                        noteText = '对方已拒收';
                    } else {
                        noteText = msg.note || '等待对方处理...';
                    }
                }
            } else {
                // 消息是 AI 发出的
                if (msg.isRefund) {
                    // AI 的退款（AI 拒收了用户的转账）
                    titleText = `退款来自 ${msg.senderName}`;
                    noteText = '转账已被拒收';
                } else if (msg.receiverName === myNickname) {
                    // AI 主动给用户的转账
                    titleText = `转账给 ${myNickname}`;
                    if (msg.status === 'accepted') {
                        noteText = '你已收款';
                    } else if (msg.status === 'declined') {
                        noteText = '你已拒收';
                    } else {
                        // 用户需要处理的转账
                        bubble.style.cursor = 'pointer';
                        bubble.dataset.status = 'pending';
                        noteText = msg.note || '点击处理';
                    }
                } else {
                    // AI 发给群里其他人的转账，对当前用户来说只是一个通知
                    titleText = `转账: ${msg.senderName} → ${msg.receiverName}`;
                    noteText = msg.note || '群聊内转账';
                }
            }

            const heartIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="vertical-align: middle;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`;

            contentHtml = `
			        <div class="transfer-card">
			            <div class="transfer-title">${heartIcon} ${titleText}</div>
			            <div class="transfer-amount">¥ ${Number(msg.amount).toFixed(2)}</div>
			            <div class.transfer-note">${noteText}</div>
			        </div>
			    `;
        } else if (msg.type === 'waimai_request') {
            bubble.classList.add('is-waimai-request');
            if (msg.status === 'paid' || msg.status === 'rejected') {
                bubble.classList.add(`status-${msg.status}`);
            }
            let displayName;
            // 如果是群聊
            if (chat.isGroup) {
                // 就执行原来的逻辑：在成员列表里查找昵称
                const member = chat.members.find((m) => m.originalName === msg.senderName);
                displayName = member ? member.groupNickname : msg.senderName;
            } else {
                // 否则（是单聊），直接使用聊天对象的名称
                displayName = chat.name;
            }

            const requestTitle = `来自 ${displayName} 的代付请求`;
            let actionButtonsHtml = '';
            if (msg.status === 'pending' && !isUser) {
                actionButtonsHtml = `
			                <div class="waimai-user-actions">
			                    <button class="waimai-decline-btn" data-choice="rejected">残忍拒绝</button>
			                    <button class="waimai-pay-btn" data-choice="paid">为Ta买单</button>
			                </div>`;
            }
            contentHtml = `
			            <div class="waimai-card">
			                <div class="waimai-header">
			                    <img src="https://files.catbox.moe/mq179k.png" class="icon" alt="Meituan Icon">
			                    <div class="title-group">
			                        <span class="brand">美团外卖</span><span class="separator">|</span><span>外卖美食</span>
			                    </div>
			                </div>
			                <div class="waimai-catchphrase">Hi，你和我的距离只差一顿外卖～</div>
			                <div class="waimai-main">
			                    <div class="request-title">${requestTitle}</div>
			                    <div class="payment-box">
			                        <div class="payment-label">需付款</div>
			                        <div class="amount">¥${Number(msg.amount).toFixed(2)}</div>
			                        <div class="countdown-label">剩余支付时间
			                            <div class="countdown-timer" id="waimai-timer-${msg.timestamp}"></div>
			                        </div>
			                    </div>
			                    <button class="waimai-details-btn">查看详情</button>
			                </div>
			                ${actionButtonsHtml}
			            </div>`;

            setTimeout(() => {
                const timerEl = document.getElementById(`waimai-timer-${msg.timestamp}`);
                if (timerEl && msg.countdownEndTime) {
                    if (waimaiTimers[msg.timestamp]) clearInterval(waimaiTimers[msg.timestamp]);
                    if (msg.status === 'pending') {
                        waimaiTimers[msg.timestamp] = startWaimaiCountdown(timerEl, msg.countdownEndTime);
                    } else {
                        timerEl.innerHTML = `<span>已</span><span>处</span><span>理</span>`;
                    }
                }
                const detailsBtn = document.querySelector(`.message-bubble[data-timestamp="${msg.timestamp}"] .waimai-details-btn`);
                if (detailsBtn) {
                    detailsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const paidByText = msg.paidBy ? `<br><br><b>状态：</b>由 ${msg.paidBy} 为您代付成功` : '';
                        showCustomAlert('订单详情', `<b>商品：</b>${msg.productInfo}<br><b>金额：</b>¥${Number(msg.amount).toFixed(2)}${paidByText}`);
                    });
                }
                const actionButtons = document.querySelectorAll(`.message-bubble[data-timestamp="${msg.timestamp}"] .waimai-user-actions button`);
                actionButtons.forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const choice = e.target.dataset.choice;
                        handleWaimaiResponse(msg.timestamp, choice);
                    });
                });
            }, 0);
        } else if (msg.type === 'red_packet') {
            bubble.classList.add('is-red-packet');
            const myNickname = chat.settings.myNickname || '我';

            // 从最新的 msg 对象中获取状态
            const hasClaimed = msg.claimedBy && msg.claimedBy[myNickname];
            const isFinished = msg.isFullyClaimed;

            let cardClass = '';
            let claimedInfoHtml = '';
            let typeText = '拼手气红包';

            // 1. 判断红包卡片的样式 (颜色)
            if (isFinished) {
                cardClass = 'opened';
            } else if (msg.packetType === 'direct' && Object.keys(msg.claimedBy || {}).length > 0) {
                cardClass = 'opened'; // 专属红包被领了也变灰
            }

            // 2. 判断红包下方的提示文字
            if (msg.packetType === 'direct') {
                typeText = `专属红包: 给 ${msg.receiverName}`;
            }

            if (hasClaimed) {
                claimedInfoHtml = `<div class="rp-claimed-info">你领取了红包，金额 ${msg.claimedBy[myNickname].toFixed(2)} 元</div>`;
            } else if (isFinished) {
                claimedInfoHtml = `<div class="rp-claimed-info">红包已被领完</div>`;
            } else if (msg.packetType === 'direct' && Object.keys(msg.claimedBy || {}).length > 0) {
                claimedInfoHtml = `<div class="rp-claimed-info">已被 ${msg.receiverName} 领取</div>`;
            }

            // 3. 拼接最终的HTML，确保onclick调用的是我们注册到全局的函数
            contentHtml = `
			        <div class="red-packet-card ${cardClass}">
			            <div class="rp-header">
			                <img src="https://files.catbox.moe/lo9xhc.png" class="rp-icon">
			                <span class="rp-greeting">${msg.greeting || '恭喜发财，大吉大利！'}</span>
			            </div>
			            <div class="rp-type">${typeText}</div>
			            ${claimedInfoHtml}
			        </div>
			    `;
        } else if (msg.type === 'ls_diary_notification') {
            bubble.classList.add('is-ls-diary-notification'); // 应用透明气泡样式
            const cardData = msg.content;

            contentHtml = `
			        <div class="ls-diary-notification-card" onclick="openLoversSpaceFromCard('${chat.id}', 'ls-diary-view')">
			            <div class="ls-diary-card-header">
			                <span>${cardData.userEmoji || '💌'}</span>
			                <span>一封来自心情日记的提醒</span>
			            </div>
			            <div class="ls-diary-card-body">
			                <p>${cardData.text}</p>
			            </div>
			            <div class="ls-diary-card-footer">
			                点击查看 →
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'lovers_space_invitation') {
            bubble.classList.add('is-waimai-request'); // 复用外卖卡片的样式，很方便！
            const isUserSender = msg.role === 'user';
            const senderName = isUserSender ? chat.settings.myNickname || '我' : chat.name;
            const receiverName = isUserSender ? chat.name : chat.settings.myNickname || '我';

            let cardContent = '';

            switch (msg.status) {
                case 'pending':
                    if (isUserSender) {
                        // 用户发出的，等待对方回应
                        cardContent = `
			                        <div class="waimai-main" style="background-color: #f0f8ff;">
			                            <div class="request-title" style="color: #333;">已向 ${receiverName} 发出邀请</div>
			                            <p style="font-size:14px; color:#555; margin:15px 0;">等待对方同意...</p>
			                        </div>`;
                    } else {
                        // 用户收到的，需要用户回应
                        cardContent = `
			                        <div class="waimai-main" style="background-color: #fff0f5;">
			                            <div class="request-title" style="color: #d63384;">${senderName} 邀请你开启情侣空间</div>
			                            <p style="font-size:14px; color:#555; margin:15px 0;">开启后可以记录你们的专属回忆哦~</p>
			                        </div>
			                        <div class="waimai-user-actions">
			                            <button class="waimai-decline-btn" data-choice="rejected">残忍拒绝</button>
			                            <button class="waimai-pay-btn" data-choice="accepted" style="background-color: #d63384; border-color: #b02a6e;">立即开启</button>
			                        </div>`;
                    }
                    break;
                case 'accepted':
                    cardContent = `
			                    <div class="waimai-main" style="background-color: #e6ffed;">
			                        <div class="request-title" style="color: #198754;">✅ 邀请已同意</div>
			                        <p style="font-size:14px; color:#555; margin:15px 0;">你们的情侣空间已成功开启！</p>
			                    </div>`;
                    break;
                case 'rejected':
                    cardContent = `
			                    <div class="waimai-main" style="background-color: #f8d7da;">
			                        <div class="request-title" style="color: #842029;">❌ 邀请被拒绝</div>
			                    </div>`;
                    break;
            }

            contentHtml = `
			            <div class="waimai-card">
			                <div class="waimai-header">
			                    <span class="icon" style="font-size: 20px;">💌</span>
			                    <div class="title-group"><span class="brand">情侣空间邀请</span></div>
			                </div>
			                ${cardContent}
			            </div>`;
        } else if (msg.type === 'poll') {
            bubble.classList.add('is-poll');

            let totalVotes = 0;
            const voteCounts = {};

            // 计算总票数和每个选项的票数
            for (const option in msg.votes) {
                const count = msg.votes[option].length;
                voteCounts[option] = count;
                totalVotes += count;
            }

            const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
            let myVote = null;
            for (const option in msg.votes) {
                if (msg.votes[option].includes(myNickname)) {
                    myVote = option;
                    break;
                }
            }

            let optionsHtml = '<div class="poll-options-list">';
            msg.options.forEach((optionText) => {
                const count = voteCounts[optionText] || 0;
                const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                const isVotedByMe = myVote === optionText;

                optionsHtml += `
			            <div class="poll-option-item ${isVotedByMe ? 'voted' : ''}" data-option="${optionText}">
			                <div class="poll-option-bar" style="width: ${percentage}%;"></div>
			                <div class="poll-option-content">
			                    <span class="poll-option-text">${optionText}</span>
			                    <span class="poll-option-votes">${count} 票</span>
			                </div>
			            </div>
			        `;
            });
            optionsHtml += '</div>';

            let footerHtml = '';
            // 统一按钮的显示逻辑
            if (msg.isClosed) {
                // 如果投票已结束，总是显示“查看结果”
                footerHtml = `<div class="poll-footer"><span class="poll-total-votes">共 ${totalVotes} 人投票</span><button class="poll-action-btn">查看结果</button></div>`;
            } else {
                // 如果投票未结束，总是显示“结束投票”
                footerHtml = `<div class="poll-footer"><span class="poll-total-votes">共 ${totalVotes} 人投票</span><button class="poll-action-btn">结束投票</button></div>`;
            }

            contentHtml = `
			        <div class="poll-card ${msg.isClosed ? 'closed' : ''}" data-poll-timestamp="${msg.timestamp}">
			            <div class="poll-question">${msg.question}</div>
			            ${optionsHtml}
			            ${footerHtml}
			        </div>
			    `;
        } else if (msg.type === 'tarot_reading') {
            bubble.classList.add('is-tarot-reading');
            const reading = msg.payload;
            let cardsText = reading.cards
                .map((card) => {
                    return `[${card.position}] ${card.name} ${card.isReversed ? '(逆位)' : ''}`;
                })
                .join('\n');

            contentHtml = `
			        <div class="tarot-reading-card">
			            <div class="tarot-reading-header">
			                <div class="question">${reading.question}</div>
			                <div class="spread">${reading.spread.name}</div>
			            </div>
			            <div class="tarot-reading-body">
			                ${cardsText}
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'lovers_space_disconnect') {
            bubble.classList.add('is-ls-disconnect'); // 应用我们写的透明气泡CSS
            contentHtml = `
			        <div class="lovers-space-disconnect-card">
			            <div class="icon">💔</div>
			            <div class="text-content">
			                <div class="title">情侣空间已解除</div>
			            </div>
			        </div>
			    `;
        } else if (msg.type === 'sticker' && msg.content) {
            bubble.classList.add('is-sticker');
            // 直接从消息对象中获取 url 和 meaning
            contentHtml = `<img src="${msg.content}" alt="${msg.meaning || 'Sticker'}" class="sticker-image">`;
        }

        // 旧的逻辑保持不变，作为兼容
        else if (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content)) {
            bubble.classList.add('is-sticker');
            contentHtml = `<img src="${msg.content}" alt="${msg.meaning || 'Sticker'}" class="sticker-image">`;
        } else if (Array.isArray(msg.content) && msg.content[0]?.type === 'image_url') {
            bubble.classList.add('has-image');
            const imageUrl = msg.content[0].image_url.url;
            contentHtml = `<img src="${imageUrl}" class="chat-image" alt="User uploaded image">`;
        } else if (msg.type === 'naiimag') {
            // NovelAI图片渲染（复用realimag样式）
            bubble.classList.add('is-realimag', 'is-card-like');
            contentHtml = `<img src="${msg.imageUrl}" class="realimag-image" alt="NovelAI图片分享" loading="lazy" onerror="this.src='https://i.postimg.cc/KYr2qRCK/1.jpg'; this.alt='图片加载失败';" title="${msg.fullPrompt || msg.prompt || 'NovelAI生成'}">`;
        } else {
            contentHtml = String(msg.content || '').replace(/\n/g, '<br>');
        }

        // 1. 检查消息对象中是否存在引用信息 (msg.quote)
        let quoteHtml = '';
        // 无论是用户消息还是AI消息，只要它包含了 .quote 对象，就执行这段逻辑
        if (msg.quote) {
            // a. 直接获取完整的、未经截断的引用内容
            const fullQuotedContent = String(msg.quote.content || '');

            // b. 构建引用块的HTML
            quoteHtml = `
			        <div class="quoted-message">
			            <div class="quoted-sender">回复 ${msg.quote.senderName}:</div>
			            <div class="quoted-content">${fullQuotedContent}</div>
			        </div>
			    `;
        }

        // 2. 拼接最终的气泡内容
        //    将构建好的 quoteHtml (如果存在) 和 contentHtml 组合起来
        // --- 将头像和内容都放回气泡内部 ---
        bubble.innerHTML = `
			        ${avatarHtml}
			        <div class="content">
			            ${quoteHtml}
			            ${contentHtml}
			        </div>
			    `;

        // --- 将完整的“气泡”和“时间戳”放入容器 ---
        wrapper.appendChild(bubble);
        wrapper.appendChild(timestampEl);

        addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
        wrapper.addEventListener('click', () => {
            if (isSelectionMode) toggleMessageSelection(msg.timestamp);
        });

        if (!isUser) {
            const avatarEl = wrapper.querySelector('.avatar, .avatar-with-frame');
            if (avatarEl) {
                avatarEl.style.cursor = 'pointer';
                avatarEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const characterName = chat.isGroup ? msg.senderName : chat.name;
                    handleUserPat(chat.id, characterName);
                });
            }
        }

        return wrapper;
    }

    function prependMessage(msg, chat) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageEl = createMessageElement(msg, chat);

        if (!messageEl) return; // <--- 新增这行，同样的处理

        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            messagesContainer.insertBefore(messageEl, loadMoreBtn.nextSibling);
        } else {
            messagesContainer.prepend(messageEl);
        }
    }

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
        window.openChat = openChat;

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
    function formatMessageForContext(msg, chat) {
        let senderName = '';
        if (msg.role === 'user') {
            senderName = chat.isGroup ? chat.settings.myNickname || '我' : '我';
        } else {
            // assistant
            senderName = msg.senderName || chat.name;
        }

        let contentText = '';
        if (msg.type === 'sticker' || (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content))) {
            contentText = msg.meaning ? `[表情: ${msg.meaning}]` : '[表情]';
        } else if (msg.type === 'ai_image' || msg.type === 'user_photo' || Array.isArray(msg.content)) {
            contentText = '[图片]';
        } else if (msg.type === 'voice_message') {
            contentText = `[语音]: ${msg.content}`;
        } else if (msg.type === 'transfer') {
            contentText = `[转账] 金额: ${msg.amount}, 备注: ${msg.note || '无'}`;
        } else {
            contentText = String(msg.content || '');
        }

        // added by lrq 251029 在每条消息记录前添加发送日期时间
        const date = new Date(msg.timestamp);
        const formattedDate = date.toLocaleString(); // 格式化为本地时间字符串
        return `${formattedDate} ${senderName}: ${contentText}`;
    }
    window.formatMessageForContext = formatMessageForContext;

    // triggerAiResponse moved to apps/QQ/chat.js

    // sendSticker moved to apps/QQ/functions.js

    // sendUserTransfer moved to apps/QQ/functions.js

    function enterSelectionMode(initialMsgTimestamp) {
        if (isSelectionMode) return;
        isSelectionMode = true;
        document.getElementById('chat-interface-screen').classList.add('selection-mode');
        toggleMessageSelection(initialMsgTimestamp);
    }

    function exitSelectionMode() {
        cleanupWaimaiTimers();
        if (!isSelectionMode) return;
        isSelectionMode = false;
        document.getElementById('chat-interface-screen').classList.remove('selection-mode');
        selectedMessages.forEach((ts) => {
            const bubble = document.querySelector(`.message-bubble[data-timestamp="${ts}"]`);
            if (bubble) bubble.classList.remove('selected');
        });
        selectedMessages.clear();
    }

    function toggleMessageSelection(timestamp) {
        const elementToSelect = document.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);

        if (!elementToSelect) return;

        if (selectedMessages.has(timestamp)) {
            selectedMessages.delete(timestamp);
            elementToSelect.classList.remove('selected');
        } else {
            selectedMessages.add(timestamp);
            elementToSelect.classList.add('selected');
        }

        document.getElementById('selection-count').textContent = `已选 ${selectedMessages.size} 条`;

        if (selectedMessages.size === 0) {
            exitSelectionMode();
        }
    }

    function addLongPressListener(element, callback) {
        let pressTimer;
        const startPress = (e) => {
            if (isSelectionMode) return;
            e.preventDefault();
            pressTimer = window.setTimeout(() => callback(e), 500);
        };
        const cancelPress = () => clearTimeout(pressTimer);
        element.addEventListener('mousedown', startPress);
        element.addEventListener('mouseup', cancelPress);
        element.addEventListener('mouseleave', cancelPress);
        element.addEventListener('touchstart', startPress, { passive: true });
        element.addEventListener('touchend', cancelPress);
        element.addEventListener('touchmove', cancelPress);
    }
    window.addLongPressListener = addLongPressListener;



























    const personaLibraryModal = document.getElementById('persona-library-modal');
    const personaEditorModal = document.getElementById('persona-editor-modal');
    const presetActionsModal = document.getElementById('preset-actions-modal');

    // --- EXPOSE TO GLOBAL SCOPE ---
    window.openPersonaLibrary = openPersonaLibrary;
    window.closePersonaLibrary = closePersonaLibrary;
    window.openPersonaEditorForCreate = openPersonaEditorForCreate;
    window.closePersonaEditor = closePersonaEditor;
    window.openPersonaEditorForEdit = openPersonaEditorForEdit;
    window.deletePersonaPreset = deletePersonaPreset;
    window.hidePresetActions = hidePresetActions;
    window.savePersonaPreset = savePersonaPreset;
    // ------------------------------

    function openPersonaLibrary() {
        renderPersonaLibrary();
        personaLibraryModal.classList.add('visible');
    }

    function closePersonaLibrary() {
        personaLibraryModal.classList.remove('visible');
    }

    function renderPersonaLibrary() {
        const grid = document.getElementById('persona-library-grid');
        grid.innerHTML = '';
        if (state.personaPresets.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; margin-top: 20px;">空空如也~ 点击右上角"添加"来创建你的第一个人设预设吧！</p>';
            return;
        }
        state.personaPresets.forEach((preset) => {
            const item = document.createElement('div');
            item.className = 'persona-preset-item';
            item.style.backgroundImage = `url(${preset.avatar})`;
            item.dataset.presetId = preset.id;
            item.addEventListener('click', () => applyPersonaPreset(preset.id));
            addLongPressListener(item, () => showPresetActions(preset.id));
            grid.appendChild(item);
        });
    }

    function showPresetActions(presetId) {
        editingPersonaPresetId = presetId;
        presetActionsModal.classList.add('visible');
    }

    function hidePresetActions() {
        presetActionsModal.classList.remove('visible');
        editingPersonaPresetId = null;
    }

    function applyPersonaPreset(presetId) {
        const preset = state.personaPresets.find((p) => p.id === presetId);
        if (preset) {
            document.getElementById('my-avatar-preview').src = preset.avatar;
            document.getElementById('my-persona').value = preset.persona;
        }
        closePersonaLibrary();
    }

    function openPersonaEditorForCreate() {
        editingPersonaPresetId = null;

        document.getElementById('persona-editor-title').textContent = '添加人设预设';
        document.getElementById('preset-avatar-preview').src = defaultAvatar;
        document.getElementById('preset-persona-input').value = '';

        // 根据用户人设模式，显隐特定UI元素
        document.getElementById('npc-editor-name-group').style.display = 'none';
        document.getElementById('persona-editor-change-frame-btn').style.display = 'inline-block';

        // 直接覆盖保存按钮的 onclick 事件，强制它只执行保存用户人设的函数
        document.getElementById('save-persona-preset-btn').onclick = savePersonaPreset;

        document.getElementById('persona-editor-modal').classList.add('visible');
    }

    function openPersonaEditorForEdit() {
        const preset = state.personaPresets.find((p) => p.id === editingPersonaPresetId);
        if (!preset) return;

        document.getElementById('persona-editor-title').textContent = '编辑人设预设';
        document.getElementById('preset-avatar-preview').src = preset.avatar;
        document.getElementById('preset-persona-input').value = preset.persona;

        // 根据用户人设模式，显隐特定UI元素
        document.getElementById('npc-editor-name-group').style.display = 'none';
        document.getElementById('persona-editor-change-frame-btn').style.display = 'inline-block';

        // 直接覆盖保存按钮的 onclick 事件，强制它只执行保存用户人设的函数
        document.getElementById('save-persona-preset-btn').onclick = savePersonaPreset;

        presetActionsModal.classList.remove('visible');
        document.getElementById('persona-editor-modal').classList.add('visible');
    }

    async function deletePersonaPreset() {
        const confirmed = await showCustomConfirm('删除预设', '确定要删除这个人设预设吗？此操作不可恢复。', {
            confirmButtonClass: 'btn-danger',
        });
        if (confirmed && editingPersonaPresetId) {
            await db.personaPresets.delete(editingPersonaPresetId);
            state.personaPresets = state.personaPresets.filter((p) => p.id !== editingPersonaPresetId);
            hidePresetActions();
            renderPersonaLibrary();
        }
    }

    function closePersonaEditor() {
        personaEditorModal.classList.remove('visible');
        editingPersonaPresetId = null;
    }

    async function savePersonaPreset() {
        const avatar = document.getElementById('preset-avatar-preview').src;
        const persona = document.getElementById('preset-persona-input').value.trim();
        if (avatar === defaultAvatar && !persona) {
            alert('头像和人设不能都为空哦！');
            return;
        }
        if (editingPersonaPresetId) {
            const preset = state.personaPresets.find((p) => p.id === editingPersonaPresetId);
            if (preset) {
                preset.avatar = avatar;
                preset.persona = persona;
                await db.personaPresets.put(preset);
            }
        } else {
            const newPreset = { id: 'preset_' + Date.now(), avatar: avatar, persona: persona };
            await db.personaPresets.add(newPreset);
            state.personaPresets.push(newPreset);
        }
        renderPersonaLibrary();
        closePersonaEditor();
    }

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


    // Qzone function (renderAlbumList) moved to apps/QQ/qzone.js

    // Qzone function (openAlbum) moved to apps/QQ/qzone.js

    // Qzone function (renderAlbumPhotosScreen) moved to apps/QQ/qzone.js

    // Qzone function (openPhotoViewer) moved to apps/QQ/qzone.js

    // Qzone function (renderPhotoViewer) moved to apps/QQ/qzone.js

    // Qzone function (showNextPhoto) moved to apps/QQ/qzone.js

    // Qzone function (showPrevPhoto) moved to apps/QQ/qzone.js

    // Qzone function (closePhotoViewer) moved to apps/QQ/qzone.js


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

    function startBackgroundSimulation() {
        if (simulationIntervalId) return;
        const intervalSeconds = state.globalSettings.backgroundActivityInterval || 60;
        // 将旧的固定间隔 45000 替换为动态获取
        simulationIntervalId = setInterval(runBackgroundSimulationTick, intervalSeconds * 1000);
    }
    window.startBackgroundSimulation = startBackgroundSimulation;

    function stopBackgroundSimulation() {
        if (simulationIntervalId) {
            clearInterval(simulationIntervalId);
            simulationIntervalId = null;
        }
    }
    window.stopBackgroundSimulation = stopBackgroundSimulation;

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
    window.buildCommentsContextForAI = buildCommentsContextForAI;
    window.filterVisiblePostsForAI = filterVisiblePostsForAI;

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
			${npcContextForAction}
			${weiboContextForAction}
			${countdownContext}
			${worldBookContext}
			-   **当前时间**: ${currentTime}
			-   **你们最近的对话摘要**:
			${recentContextSummary}
            ${summaryContext}
			${linkedMemoryContext}
			-   **【【【微博专属设定(必须严格遵守)】】】**
			    - 你的微博职业: ${chat.settings.weiboProfession || '无'}
			    - 你的微博指令: ${chat.settings.weiboInstruction || '无特殊指令'}
			${postsContext}
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

    /**
     * 将用户自定义的CSS安全地应用到指定的作用域
     * @param {string} cssString 用户输入的原始CSS字符串
     * @param {string} scopeId 应用样式的作用域ID (例如 '#chat-messages' 或 '#settings-preview-area')
     * @param {string} styleTagId 要操作的 <style> 标签的ID
     */
    window.applyScopedCss = applyScopedCss; // Expose to global
    function applyScopedCss(cssString, scopeId, styleTagId) {
        const styleTag = document.getElementById(styleTagId);
        if (!styleTag) return;

        if (!cssString || cssString.trim() === '') {
            styleTag.innerHTML = '';
            return;
        }

        // 增强作用域处理函数 - 专门解决.user和.ai样式冲突问题
        const scopedCss = cssString
            .replace(/\s*\.message-bubble\.user\s+([^{]+\{)/g, `${scopeId} .message-bubble.user $1`)
            .replace(/\s*\.message-bubble\.ai\s+([^{]+\{)/g, `${scopeId} .message-bubble.ai $1`)
            .replace(/\s*\.message-bubble\s+([^{]+\{)/g, `${scopeId} .message-bubble $1`);

        styleTag.innerHTML = scopedCss;
    }

    function updateSettingsPreview() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        const previewArea = document.getElementById('settings-preview-area');
        if (!previewArea) return;

        // 1. 获取当前设置的值
        const selectedTheme = document.querySelector('input[name="theme-select"]:checked')?.value || 'default';
        const fontSize = document.getElementById('font-size-slider').value;
        const customCss = document.getElementById('custom-css-input').value;
        const background = chat.settings.background; // 直接获取背景设置

        // 2. 更新预览区的基本样式
        previewArea.dataset.theme = selectedTheme;
        previewArea.style.setProperty('--chat-font-size', `${fontSize}px`);

        // --- 直接更新预览区的背景样式 ---
        if (background && background.startsWith('data:image')) {
            previewArea.style.backgroundImage = `url(${background})`;
            previewArea.style.backgroundColor = 'transparent'; // 如果有图片，背景色设为透明
        } else {
            previewArea.style.backgroundImage = 'none'; // 如果没有图片，移除图片背景
            // 如果背景是颜色值或渐变（非图片），则直接应用
            previewArea.style.background = background || '#f0f2f5';
        }

        // 3. 渲染模拟气泡
        previewArea.innerHTML = '';

        // 创建“对方”的气泡
        // 注意：我们将一个虚拟的 timestamp 传入，以防有CSS依赖于它
        const aiMsg = { role: 'ai', content: '对方消息预览', timestamp: 1, senderName: chat.name };
        const aiBubble = createMessageElement(aiMsg, chat);
        if (aiBubble) previewArea.appendChild(aiBubble);

        // 创建“我”的气泡
        const userMsg = { role: 'user', content: '我的消息预览', timestamp: 2 };
        const userBubble = createMessageElement(userMsg, chat);
        if (userBubble) previewArea.appendChild(userBubble);

        // 4. 应用自定义CSS到预览区
        applyScopedCss(customCss, '#settings-preview-area', 'preview-bubble-style');
    }

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
    /**
     * 当长按消息时，显示操作菜单
     * @param {number} timestamp - 被长按消息的时间戳
     */
    window.showMessageActions = showMessageActions; // Expose to global
    function showMessageActions(timestamp) {
        // 如果已经在多选模式，则不弹出菜单
        if (isSelectionMode) return;

        activeMessageTimestamp = timestamp;

        // --- 新增逻辑开始 ---
        const chat = state.chats[state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === timestamp);
        const rerollNaiBtn = document.getElementById('reroll-nai-btn');

        // 检查消息类型是否为 naiimag
        if (message && (message.type === 'naiimag' || (message.type === 'qzone_post' && message.postType === 'naiimag'))) {
            rerollNaiBtn.style.display = 'block';
        } else {
            rerollNaiBtn.style.display = 'none';
        }
        // --- 新增逻辑结束 ---

        document.getElementById('message-actions-modal').classList.add('visible');
    }
    /**
     * 处理 NAI 图片重绘
     */
    async function handleNaiReroll() {
        if (!activeMessageTimestamp || !state.activeChatId) return;

        const chat = state.chats[state.activeChatId];
        const msgIndex = chat.history.findIndex((m) => m.timestamp === activeMessageTimestamp);
        if (msgIndex === -1) return;

        const message = chat.history[msgIndex];

        // 关闭菜单
        hideMessageActions();

        // 获取提示词 (优先使用保存的完整提示词 fullPrompt，如果没有则重新构建)
        let finalPositivePrompt = message.fullPrompt;
        if (!finalPositivePrompt) {
            const naiPrompts = getCharacterNAIPrompts(chat.id);
            const aiPrompt = message.prompt || 'a beautiful scene';
            finalPositivePrompt = aiPrompt + ', ' + naiPrompts.positive;
        }

        // 获取负面提示词
        const naiPrompts = getCharacterNAIPrompts(chat.id);
        const finalNegativePrompt = naiPrompts.negative;

        // 获取设置
        const apiKey = localStorage.getItem('novelai-api-key');
        const model = localStorage.getItem('novelai-model') || 'nai-diffusion-4-5-full';
        const settings = getNovelAISettings();

        if (!apiKey) {
            alert('请先配置 NovelAI API Key！');
            return;
        }

        // 显示加载提示
        await showCustomAlert('正在重绘...', '正在重新连接 NovelAI 生成图片，请稍候...');

        try {
            const [width, height] = settings.resolution.split('x').map(Number);
            let requestBody;

            // 构建请求体 (逻辑与你原有的 generateNovelAIImage 一致)
            // 这里为了简洁，提取关键构建逻辑
            const commonParams = {
                width,
                height,
                scale: settings.cfg_scale,
                sampler: settings.sampler,
                steps: settings.steps,
                seed: Math.floor(Math.random() * 4294967295), // 关键：重绘必须用随机种子
                n_samples: 1,
                ucPreset: settings.uc_preset,
                qualityToggle: settings.quality_toggle,
            };

            if (model.includes('nai-diffusion-4')) {
                requestBody = {
                    input: finalPositivePrompt,
                    model: model,
                    action: 'generate',
                    parameters: {
                        ...commonParams,
                        params_version: 3,
                        negative_prompt: finalNegativePrompt,
                        v4_prompt: {
                            caption: { base_caption: finalPositivePrompt, char_captions: [] },
                            use_coords: false,
                            use_order: true,
                        },
                        v4_negative_prompt: {
                            caption: { base_caption: finalNegativePrompt, char_captions: [] },
                            legacy_uc: false,
                        },
                    },
                };
            } else {
                requestBody = {
                    input: finalPositivePrompt,
                    model: model,
                    action: 'generate',
                    parameters: {
                        ...commonParams,
                        negative_prompt: finalNegativePrompt,
                        sm: settings.smea,
                        sm_dyn: settings.smea_dyn,
                        add_original_image: false,
                    },
                };
            }

            let apiUrl = model.includes('nai-diffusion-4') ? 'https://image.novelai.net/ai/generate-image-stream' : 'https://image.novelai.net/ai/generate-image';
            let corsProxy = settings.cors_proxy === 'custom' ? settings.custom_proxy_url : settings.cors_proxy;
            if (corsProxy) apiUrl = corsProxy + encodeURIComponent(apiUrl);

            // Chrome 兼容头
            const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
            let headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey };
            if (isChrome) {
                const cleanHeaders = {};
                for (const [k, v] of Object.entries(headers)) cleanHeaders[k] = v.replace(/[^\x00-\xFF]/g, '');
                headers = cleanHeaders;
            }

            const res = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
            if (!res.ok) throw new Error(`NAI API Error: ${res.status}`);

            // 解析结果 (复用你的解析逻辑)
            const contentType = res.headers.get('content-type');
            let imageDataUrl = null;
            let zipBlob = null;

            if (contentType && contentType.includes('text/event-stream')) {
                const text = await res.text();
                const lines = text.trim().split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        const dataContent = line.substring(6);
                        try {
                            const jsonData = JSON.parse(dataContent);
                            if ((jsonData.event_type === 'final' && jsonData.image) || jsonData.data || jsonData.image) {
                                const base64Data = jsonData.image || jsonData.data;
                                const isPNG = base64Data.startsWith('iVBORw0KGgo');
                                const binaryString = atob(base64Data);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);
                                const blobType = isPNG ? 'image/png' : 'image/jpeg';
                                const imageBlob = new Blob([bytes], { type: blobType });
                                const reader = new FileReader();
                                imageDataUrl = await new Promise((r) => {
                                    reader.onloadend = () => r(reader.result);
                                    reader.readAsDataURL(imageBlob);
                                });
                                break;
                            }
                        } catch (e) { }
                    }
                }
            } else {
                zipBlob = await res.blob();
            }

            if (!imageDataUrl && zipBlob) {
                if (typeof JSZip === 'undefined') throw new Error('JSZip库未加载');
                const zip = await JSZip.loadAsync(zipBlob);
                const file = Object.values(zip.files)[0];
                if (file) {
                    const imgBlob = await file.async('blob');
                    const reader = new FileReader();
                    imageDataUrl = await new Promise((r) => {
                        reader.onloadend = () => r(reader.result);
                        reader.readAsDataURL(imgBlob);
                    });
                }
            }

            if (imageDataUrl) {
                // *** 核心：更新原来的消息 ***
                message.imageUrl = imageDataUrl;

                // 保存数据库
                await db.chats.put(chat);

                // 隐藏遮罩
                document.getElementById('custom-modal-overlay').classList.remove('visible'); // 假设 showCustomAlert 使用的是这个

                // 刷新界面
                renderChatInterface(state.activeChatId);

                // 提示成功
                // alert('图片重绘成功！'); // 可选，因为看到图片变了就知道成功了
            } else {
                throw new Error('未解析到图片数据');
            }
        } catch (error) {
            console.error('重绘失败:', error);
            document.getElementById('custom-modal-overlay').classList.remove('visible');
            alert(`重绘失败: ${error.message}`);
        }
    }

    /**
     * 隐藏消息操作菜单
     */
    window.hideMessageActions = hideMessageActions; // Expose to global
    function hideMessageActions() {
        document.getElementById('message-actions-modal').classList.remove('visible');
        window.activeMessageTimestamp = null; // Use current global
    }

    async function openMessageEditor() {
        if (!activeMessageTimestamp) return;

        const timestampToEdit = activeMessageTimestamp;
        const chat = state.chats[state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === timestampToEdit);
        if (!message) return;

        hideMessageActions();

        let contentForEditing;
        const isSpecialType = message.type && ['voice_message', 'ai_image', 'transfer', 'share_link', 'borrow_money_request'].includes(message.type);

        if (isSpecialType) {
            if (message.type === 'borrow_money_request') {
                // ★★★ 这就是我们新增的核心逻辑！ ★★★
                // 当编辑的是借钱卡片时，我们从 payload 中提取数据并拼接成你想要的文本格式
                const payload = message.payload;
                contentForEditing = `向你借钱${payload.amount}元，用于${payload.reason}`;
            } else {
                // 其他特殊类型的处理逻辑保持不变
                let fullMessageObject = { type: message.type };
                if (message.type === 'voice_message') fullMessageObject.content = message.content;
                else if (message.type === 'ai_image') fullMessageObject.description = message.content;
                else if (message.type === 'transfer') {
                    fullMessageObject.amount = message.amount;
                    fullMessageObject.note = message.note;
                } else if (message.type === 'share_link') {
                    fullMessageObject.title = message.title;
                    fullMessageObject.description = message.description;
                    fullMessageObject.source_name = message.source_name;
                    fullMessageObject.content = message.content;
                }
                contentForEditing = JSON.stringify(fullMessageObject, null, 2);
            }
        } else if (typeof message.content === 'object') {
            contentForEditing = JSON.stringify(message.content, null, 2);
        } else {
            contentForEditing = message.content;
        }

        const templates = {
            voice: { type: 'voice_message', content: '在这里输入语音内容' },
            image: { type: 'ai_image', description: '在这里输入图片描述' },
            transfer: { type: 'transfer', amount: 5.2, note: '一点心意' },
            link: {
                type: 'share_link',
                title: '文章标题',
                description: '文章摘要...',
                source_name: '来源网站',
                content: '文章完整内容...',
            },
        };

        const helpersHtml = `
			        <div class="format-helpers">
			            <button class="format-btn" data-template='${JSON.stringify(templates.voice)}'>语音</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.image)}'>图片</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.transfer)}'>转账</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.link)}'>链接</button>
			        </div>
			    `;

        const newContent = await showCustomPrompt('编辑消息', '在此修改，或点击上方按钮使用格式模板...', contentForEditing, 'textarea', helpersHtml);

        if (newContent !== null) {
            await saveEditedMessage(timestampToEdit, newContent);
        }
    }

    /**
     * 复制消息的文本内容到剪贴板
     */
    window.copyMessageContent = copyMessageContent; // Expose to global
    async function copyMessageContent() {
        if (!activeMessageTimestamp) return;
        const chat = state.chats[state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === activeMessageTimestamp);
        if (!message) return;

        let textToCopy;
        if (typeof message.content === 'object') {
            textToCopy = JSON.stringify(message.content);
        } else {
            textToCopy = String(message.content);
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            await showCustomAlert('复制成功', '消息内容已复制到剪贴板。');
        } catch (err) {
            await showCustomAlert('复制失败', '无法访问剪贴板。');
        }

        hideMessageActions();
    }

    /**
     * 创建一个可编辑的消息块（包含文本框、格式助手和删除按钮）
     * @param {string} initialContent - 文本框的初始内容
     * @returns {HTMLElement} - 创建好的DOM元素
     */
    function createMessageEditorBlock(initialContent = '') {
        const block = document.createElement('div');
        block.className = 'message-editor-block';

        // 添加 'link' 模板
        const templates = {
            voice: { type: 'voice_message', content: '在这里输入语音内容' },
            image: { type: 'ai_image', description: '在这里输入图片描述' },
            transfer: { type: 'transfer', amount: 5.2, note: '一点心意' },
            link: {
                type: 'share_link',
                title: '文章标题',
                description: '文章摘要...',
                source_name: '来源网站',
                content: '文章完整内容...',
            },
        };

        block.innerHTML = `
			        <button class="delete-block-btn" title="删除此条">×</button>
			        <textarea>${initialContent}</textarea>
			        <div class="format-helpers">
			            <button class="format-btn" data-template='${JSON.stringify(templates.voice)}'>语音</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.image)}'>图片</button>
			            <button class="format-btn" data-template='${JSON.stringify(templates.transfer)}'>转账</button>
			            
			            <button class="format-btn" data-template='${JSON.stringify(templates.link)}'>链接</button>
			        </div>
			    `;

        // 绑定删除按钮事件
        block.querySelector('.delete-block-btn').addEventListener('click', () => {
            // 确保至少保留一个编辑块
            if (document.querySelectorAll('.message-editor-block').length > 1) {
                block.remove();
            } else {
                alert('至少需要保留一条消息。');
            }
        });

        // 绑定格式助手按钮事件
        block.querySelectorAll('.format-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const templateStr = btn.dataset.template;
                const textarea = block.querySelector('textarea');
                if (templateStr && textarea) {
                    try {
                        const templateObj = JSON.parse(templateStr);
                        textarea.value = JSON.stringify(templateObj, null, 2);
                        textarea.focus();
                    } catch (e) {
                        console.error('解析格式模板失败:', e);
                    }
                }
            });
        });

        return block;
    }

    /**
     * 打开全新的、可视化的多消息编辑器，并动态绑定其所有按钮事件
     */
    window.openAdvancedMessageEditor = openAdvancedMessageEditor; // Expose to global
    function openAdvancedMessageEditor() {
        if (!activeMessageTimestamp) return;

        // 1. 在关闭旧菜单前，将需要的时间戳捕获到局部变量中
        const timestampToEdit = activeMessageTimestamp;

        const chat = state.chats[state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === timestampToEdit);
        if (!message) return;

        // 2. 现在可以安全地关闭旧菜单了，因为它不会影响我们的局部变量
        hideMessageActions();

        const editorModal = document.getElementById('message-editor-modal');
        const editorContainer = document.getElementById('message-editor-container');
        editorContainer.innerHTML = '';

        // 3. 准备初始内容
        let initialContent;
        const isSpecialType = message.type && ['voice_message', 'ai_image', 'transfer'].includes(message.type);
        if (isSpecialType) {
            let fullMessageObject = { type: message.type };
            if (message.type === 'voice_message') fullMessageObject.content = message.content;
            else if (message.type === 'ai_image') fullMessageObject.description = message.content;
            else if (message.type === 'transfer') {
                fullMessageObject.amount = message.amount;
                fullMessageObject.note = message.note;
            }
            initialContent = JSON.stringify(fullMessageObject, null, 2);
        } else if (typeof message.content === 'object') {
            initialContent = JSON.stringify(message.content, null, 2);
        } else {
            if (message.type === 'sticker' || (typeof message.content === 'string' && STICKER_REGEX.test(message.content))) {
                initialContent = message.meaning ? `[sticker:${message.meaning}]` : message.content;
            } else {
                initialContent = message.content;
            }
        }

        const firstBlock = createMessageEditorBlock(initialContent);
        editorContainer.appendChild(firstBlock);

        // 4. 动态绑定所有控制按钮的事件
        // 为了防止事件重复绑定，我们使用克隆节点的方法来清除旧监听器
        const addBtn = document.getElementById('add-message-editor-block-btn');
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        newAddBtn.addEventListener('click', () => {
            const newBlock = createMessageEditorBlock();
            editorContainer.appendChild(newBlock);
            newBlock.querySelector('textarea').focus();
        });

        const cancelBtn = document.getElementById('cancel-advanced-editor-btn');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', () => {
            editorModal.classList.remove('visible');
        });

        const saveBtn = document.getElementById('save-advanced-editor-btn');
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        // 将捕获到的时间戳，直接绑定给这一次的保存点击事件
        newSaveBtn.addEventListener('click', () => {
            saveEditedMessage(timestampToEdit);
        });

        // 5. 最后，显示模态框
        editorModal.classList.add('visible');
    }

    function parseEditedContent(text) {
        const trimmedText = text.trim();
        // 1. 优先检查是否是 [sticker:名字] 格式
        const stickerNameMatch = trimmedText.match(/^\[sticker:(.+?)\]$/i);
        if (stickerNameMatch) {
            const name = stickerNameMatch[1];
            // 尝试去所有表情库里找回这个名字对应的URL
            const allStickers = [...(state.userStickers || []), ...(state.charStickers || [])];
            // 尝试获取当前聊天对象的专属表情(如果有)
            if (window.state && window.state.activeChatId && window.state.chats[window.state.activeChatId]) {
                const currentChat = window.state.chats[window.state.activeChatId];
                if (currentChat.settings.stickerLibrary) {
                    allStickers.push(...currentChat.settings.stickerLibrary);
                }
            }

            const found = allStickers.find((s) => s.name === name);
            if (found) {
                // 如果找到了，这就还原成一个标准的表情包对象！
                return [{ type: 'sticker', content: found.url, meaning: found.name }];
            }
        }

        // 优先检查是否匹配“借钱”格式
        const borrowMatch = trimmedText.match(/向你借钱(\d+(\.\d+)?)元，用于(.+)/);
        if (borrowMatch) {
            const amount = parseFloat(borrowMatch[1]);
            const reason = borrowMatch[3].trim();

            // 1. 创建文本消息对象
            const textMessage = {
                type: 'text',
                content: trimmedText,
            };

            // 2. 创建借条卡片对象
            const cardMessage = {
                type: 'borrow_money_request',
                payload: {
                    lenderName: '你', // 默认是向“你”借钱
                    amount: amount,
                    reason: reason,
                },
            };

            // 3. 将两条消息打包成一个数组返回！
            return [textMessage, cardMessage];
        }

        // 如果不是借钱格式，则执行原来的逻辑，但为了统一，也返回一个数组
        if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmedText);
                if (parsed.type) {
                    return [parsed]; // 单个对象也包装成数组
                }
            } catch (e) {
                /* 解析失败，继续往下走 */
            }
        }

        if (STICKER_REGEX.test(trimmedText)) {
            return [{ type: 'sticker', content: trimmedText }];
        }

        // 默认返回一个只包含单条文本消息的数组
        return [{ type: 'text', content: trimmedText }];
    }

    async function saveEditedMessage(timestamp, simpleContent = null) {
        if (!timestamp) return;

        const chat = state.chats[state.activeChatId];
        const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
        if (messageIndex === -1) return;

        const originalMessage = chat.history[messageIndex];
        if (!originalMessage) return;

        let newMessagesData = [];

        if (simpleContent !== null) {
            newMessagesData = parseEditedContent(simpleContent.trim());
        } else {
            // 高级编辑器的逻辑保持不变，但要确保它也返回数组
            const editorContainer = document.getElementById('message-editor-container');
            const editorBlocks = editorContainer.querySelectorAll('.message-editor-block');
            for (const block of editorBlocks) {
                const textarea = block.querySelector('textarea');
                const rawContent = textarea.value.trim();
                if (rawContent) {
                    // parseEditedContent 现在总是返回数组，我们用concat来合并
                    newMessagesData = newMessagesData.concat(parseEditedContent(rawContent));
                }
            }
        }

        if (newMessagesData.length === 0) {
            document.getElementById('message-editor-modal').classList.remove('visible');
            return;
        }

        const messagesToInsert = newMessagesData.map((newMsgData) => ({
            ...originalMessage, // 继承原消息的角色、发送者等信息
            ...newMsgData, // 用新解析出的数据覆盖 type, content, payload 等
        }));

        chat.history.splice(messageIndex, 1, ...messagesToInsert);

        // 后续的时间戳重新分配和UI刷新逻辑保持不变
        let reassignTimestamp = timestamp;
        for (let i = messageIndex; i < chat.history.length; i++) {
            chat.history[i].timestamp = reassignTimestamp;
            reassignTimestamp++;
        }

        await db.chats.put(chat);
        document.getElementById('message-editor-modal').classList.remove('visible');
        renderChatInterface(state.activeChatId);
        await showCustomAlert('成功', '消息已更新！');
    }

    /**
     * 当点击“…”时，显示动态操作菜单
     * @param {number} postId - 被操作的动态的ID
     */

    // Qzone function (showPostActions) has been moved to apps/QQ/qzone.js

    // Qzone function (hidePostActions) has been moved to apps/QQ/qzone.js

    // Qzone function (openPostEditor) has been moved to apps/QQ/qzone.js

    // Qzone function (saveEditedPost) has been moved to apps/QQ/qzone.js

    // Qzone function (copyPostContent) has been moved to apps/QQ/qzone.js


    // 创建群聊与拉人功能核心函数
    let selectedContacts = new Set();

    window.openContactPickerForGroupCreate = openContactPickerForGroupCreate; // Expose to global
    async function openContactPickerForGroupCreate() {
        selectedContacts.clear(); // 清空上次选择

        // 为“完成”按钮明确绑定“创建群聊”的功能
        const confirmBtn = document.getElementById('confirm-contact-picker-btn');
        // 使用克隆节点技巧，清除掉之前可能绑定的任何其他事件（比如“添加成员”）
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        // 重新绑定正确的“创建群聊”函数
        newConfirmBtn.addEventListener('click', handleCreateGroup);

        await renderContactPicker();
        showScreen('contact-picker-screen');
    }

    async function renderContactPicker() {
        const listEl = document.getElementById('contact-picker-list');
        listEl.innerHTML = '';
        selectedContacts.clear(); // 清空上次的选择

        const allAvailablePeople = [];
        // 1. 添加主要角色
        Object.values(state.chats)
            .filter((c) => !c.isGroup)
            .forEach((c) => {
                allAvailablePeople.push({
                    id: c.id,
                    name: c.name,
                    avatar: c.settings.aiAvatar || defaultAvatar,
                    isNpc: false, // 标记为非NPC
                    type: '角色',
                });
            });

        // 2. 添加所有角色库里的NPC，并自动去重
        const npcMap = new Map();
        Object.values(state.chats).forEach((chat) => {
            if (chat.npcLibrary) {
                chat.npcLibrary.forEach((npc) => {
                    // 使用NPC的ID作为key，确保同一个NPC不会被重复添加
                    if (!npcMap.has(npc.id)) {
                        npcMap.set(npc.id, {
                            id: npc.id,
                            name: npc.name,
                            avatar: npc.avatar || defaultGroupMemberAvatar,
                            isNpc: true, // 标记为NPC
                            type: `NPC (${chat.name})`, // 显示该NPC所属的角色
                        });
                    }
                });
            }
        });
        allAvailablePeople.push(...Array.from(npcMap.values()));

        if (allAvailablePeople.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#8a8a8a; margin-top:50px;">还没有可以拉进群的联系人哦~</p>';
            return;
        }

        // 3. 渲染整合后的列表
        allAvailablePeople.forEach((contact) => {
            const item = document.createElement('div');
            item.className = 'contact-picker-item';
            item.dataset.contactId = contact.id;

            // 核心修改：为NPC添加一个“(NPC)”的标签，方便区分
            item.innerHTML = `
			            <div class="checkbox"></div>
			            <img src="${contact.avatar}" class="avatar">
			            <span class="name">${contact.name} ${contact.isNpc ? '<span style="color: #888; font-size: 12px;">(NPC)</span>' : ''}</span>
			        `;

            item.addEventListener('click', () => {
                if (selectedContacts.has(contact.id)) {
                    selectedContacts.delete(contact.id);
                    item.classList.remove('selected');
                } else {
                    selectedContacts.add(contact.id);
                    item.classList.add('selected');
                }
                updateContactPickerConfirmButton();
            });

            listEl.appendChild(item);
        });

        updateContactPickerConfirmButton();
    }

    /**
     * 更新“完成”按钮的计数
     */
    function updateContactPickerConfirmButton() {
        const btn = document.getElementById('confirm-contact-picker-btn');
        btn.textContent = `完成(${selectedContacts.size})`;
        btn.disabled = selectedContacts.size < 2; // 至少需要2个人才能创建群聊
    }

    /**
     * 处理创建群聊的最终逻辑
     */
    async function handleCreateGroup() {
        if (selectedContacts.size < 2) {
            alert('创建群聊至少需要选择2个联系人。');
            return;
        }

        const groupName = await showCustomPrompt('设置群名', '请输入群聊的名字', '我们的群聊');
        if (!groupName || !groupName.trim()) return;

        const newChatId = 'group_' + Date.now();
        const members = [];

        for (const contactId of selectedContacts) {
            const contactChat = state.chats[contactId];
            if (contactChat) {
                // 这是原来的逻辑，用于处理普通角色(Char)
                members.push({
                    id: contactId,
                    originalName: contactChat.name,
                    groupNickname: contactChat.name,
                    avatar: contactChat.settings.aiAvatar || defaultAvatar,
                    persona: contactChat.settings.aiPersona,
                    avatarFrame: contactChat.settings.aiAvatarFrame || '',
                    isAdmin: false,
                    groupTitle: '',
                });
            } else {
                // 处理NPC的逻辑
                let foundNpc = null;
                // 遍历所有角色，查找他们各自的NPC库
                for (const chat of Object.values(state.chats)) {
                    if (chat.npcLibrary) {
                        const npc = chat.npcLibrary.find((n) => n.id === contactId);
                        if (npc) {
                            foundNpc = npc;
                            break; // 找到了就跳出循环
                        }
                    }
                }
                // 如果找到了这个NPC，就把它添加到成员列表里
                if (foundNpc) {
                    members.push({
                        id: foundNpc.id,
                        originalName: foundNpc.name,
                        groupNickname: foundNpc.name,
                        avatar: foundNpc.avatar || defaultGroupMemberAvatar,
                        persona: foundNpc.persona,
                        avatarFrame: '', // NPC没有头像框
                        isAdmin: false,
                        groupTitle: '',
                    });
                }
            }
        }

        const newGroupChat = {
            id: newChatId,
            name: groupName.trim(),
            isGroup: true,
            // 设置群主为当前用户
            ownerId: 'user',
            members: members,
            settings: {
                myPersona: '我是谁呀。',
                myNickname: '我',
                maxMemory: 10,
                groupAvatar: defaultGroupAvatar,
                myAvatar: defaultMyGroupAvatar,
                myAvatarFrame: '', // 别忘了自己的头像框
                background: '',
                theme: 'default',
                fontSize: 13,
                customCss: '',
                linkedWorldBookIds: [],
                stickerLibrary: [],
                linkedMemories: [],
                // 为用户自己也加上管理员和头衔的初始设置
                isUserAdmin: false,
                myGroupTitle: '',
            },
            history: [],
            musicData: { totalTime: 0 },
        };

        state.chats[newChatId] = newGroupChat;
        await db.chats.put(newGroupChat);

        // 创建群聊后，发送一条系统通知
        await logSystemMessage(newChatId, `你创建了群聊，并邀请了 ${members.map((m) => `“${m.groupNickname}”`).join('、')} 加入群聊。`);

        // 后续逻辑不变
        await renderChatList();
        showScreen('chat-list-screen');
        openChat(newChatId);
    }

    // 群成员管理核心函数

    /**
     * 打开群成员管理屏幕
     */
    function openMemberManagementScreen() {
        if (!state.activeChatId || !state.chats[state.activeChatId].isGroup) return;
        renderMemberManagementList();
        showScreen('member-management-screen');
    }

    /**
     * 渲染群成员管理列表
     */
    function renderMemberManagementList() {
        const listEl = document.getElementById('member-management-list');
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) {
            listEl.innerHTML = '<p>错误：非群聊无法管理成员。</p>';
            return;
        }
        listEl.innerHTML = ''; // 清空

        // 1. 创建一个包含所有人的完整列表
        const allParticipants = [
            // 把你自己(user)作为一个普通参与者对象放进去
            {
                id: 'user',
                avatar: chat.settings.myAvatar || defaultMyGroupAvatar,
                groupNickname: chat.settings.myNickname || '我',
                // 修复Bug 1：在这里正确地读取你自己的群头衔
                groupTitle: chat.settings.myGroupTitle || '',
            },
            // 使用展开运算符(...)，把其他所有成员也加到这个列表里
            ...(chat.members || []),
        ];

        // 2. (可选但推荐) 对列表进行排序，确保群主永远在最上面，其次是管理员
        allParticipants.sort((a, b) => {
            const isAOwner = a.id === chat.ownerId;
            const isBOwner = b.id === chat.ownerId;
            // 修复Bug 2：在这里正确地判断自己是不是管理员
            const isAAdmin = a.id === 'user' ? chat.settings.isUserAdmin : a.isAdmin;
            const isBAdmin = b.id === 'user' ? chat.settings.isUserAdmin : b.isAdmin;

            if (isAOwner) return -1; // a是群主，排最前
            if (isBOwner) return 1; // b是群主，排最前
            if (isAAdmin && !isBAdmin) return -1; // a是管理员但b不是，a排前
            if (!isAAdmin && isBAdmin) return 1; // b是管理员但a不是，b排前
            return 0; // 其他情况保持原顺序
        });

        // 3. 遍历这个统一的列表，并渲染每一项
        const isCurrentUserOwner = chat.ownerId === 'user';
        allParticipants.forEach((participant) => {
            const participantItem = createMemberManagementItem(participant, chat, isCurrentUserOwner);
            listEl.appendChild(participantItem);
        });
    }

    /**
     * 创建一个成员管理列表项
     * @param {object} member - 成员对象数据
     * @param {object} chat - 当前群聊对象
     * @returns {HTMLElement} - 创建好的DOM元素
     */
    function createMemberManagementItem(member, chat) {
        const item = document.createElement('div');
        item.className = 'member-management-item';

        // --- 权限判断 ---
        const isCurrentUserOwner = chat.ownerId === 'user';
        const isCurrentUserAdmin = chat.settings.isUserAdmin;
        const isThisMemberOwner = member.id === chat.ownerId;
        const isThisMemberAdmin = (member.id === 'user' && chat.settings.isUserAdmin) || member.isAdmin;

        // 权限计算：我能对TA做什么？
        const canManageAdmin = isCurrentUserOwner && !isThisMemberOwner; // 只有群主能设置/取消管理员
        const canManageTitle = isCurrentUserOwner || isCurrentUserAdmin; // 管理员和群主都能设置头衔
        const canKick = (isCurrentUserOwner && member.id !== 'user') || (isCurrentUserAdmin && !isThisMemberOwner && !isThisMemberAdmin && member.id !== 'user');
        const canMute = (isCurrentUserOwner && member.id !== 'user') || (isCurrentUserAdmin && !isThisMemberOwner && !isThisMemberAdmin && member.id !== 'user');

        // --- 标签显示 ---
        let roleTag = '';
        if (isThisMemberOwner) {
            roleTag = '<span class="role-tag owner">群主</span>';
        } else if (isThisMemberAdmin) {
            roleTag = '<span class="role-tag admin">管理员</span>';
        }
        const titleText = member.id === 'user' ? chat.settings.myGroupTitle || '' : member.groupTitle || '';
        const titleTag = titleText ? `<span class="title-tag">${titleText}</span>` : '';
        // 如果被禁言，显示一个特殊的标签
        const muteTag = member.isMuted ? '<span class="group-title-tag" style="color: #ff3b30; background-color: #ffe5e5;">🚫已禁言</span>' : '';

        // --- 动态生成按钮HTML ---
        let actionsHtml = '';

        // 用户自己的按钮
        if (member.id === 'user') {
            actionsHtml += `<button class="action-btn" data-action="set-nickname" data-member-id="user">改名</button>`;
            // 用户被禁言时，显示“解除禁言”按钮
            if (member.isMuted) {
                actionsHtml += `<button class="action-btn" data-action="unmute-self" data-member-id="user">解除禁言</button>`;
            }
        }

        // 管理员和群主的操作按钮
        if (canManageTitle) {
            actionsHtml += `<button class="action-btn" data-action="set-title" data-member-id="${member.id}">头衔</button>`;
        }
        if (canManageAdmin) {
            const adminActionText = isThisMemberAdmin ? '取消管理' : '设为管理';
            actionsHtml += `<button class="action-btn" data-action="toggle-admin" data-member-id="${member.id}">${adminActionText}</button>`;
        }
        if (isCurrentUserOwner && member.id !== 'user') {
            actionsHtml += `<button class="action-btn" data-action="transfer-owner" data-member-id="${member.id}">转让</button>`;
        }
        // 禁言/解禁按钮
        if (canMute) {
            const muteButtonText = member.isMuted ? '解禁' : '禁言';
            actionsHtml += `<button class="action-btn" data-action="mute-member" data-member-id="${member.id}">${muteButtonText}</button>`;
        }
        if (canKick) {
            actionsHtml += `<button class="action-btn danger" data-action="remove-member" data-member-id="${member.id}">踢出</button>`;
        }

        // 最终拼接
        item.innerHTML = `
			        <img src="${member.avatar}" class="avatar">
			        <div class="info">
			            <span class="name">${member.groupNickname}</span>
			            <div class="tags">
			                ${roleTag}
			                ${titleTag}
			                ${muteTag}
			            </div>
			        </div>
			        <div class="actions">${actionsHtml}</div>
			    `;
        return item;
    }

    /**
     * 处理禁言/解禁群成员
     * @param {string} memberId - 要操作的成员ID
     */
    async function handleMuteMember(memberId) {
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) return;

        // --- 权限检查 (和之前保持一致) ---
        const isOwner = chat.ownerId === 'user';
        const isAdmin = chat.settings.isUserAdmin;
        let targetMember, targetIsOwner, targetIsAdmin;

        // 判断操作目标是普通成员还是用户自己
        if (memberId === 'user') {
            targetMember = { id: 'user', ...chat.settings }; // 构造一个临时的“成员”对象代表用户
            targetIsOwner = isOwner;
            targetIsAdmin = isAdmin;
        } else {
            targetMember = chat.members.find((m) => m.id === memberId);
            if (!targetMember) return;
            targetIsOwner = chat.ownerId === memberId;
            targetIsAdmin = targetMember.isAdmin;
        }

        const canMute = (isOwner && !targetIsOwner) || (isAdmin && !targetIsOwner && !targetIsAdmin);

        if (!canMute) {
            alert('你没有权限操作该成员！');
            return;
        }

        // --- 切换禁言状态 ---
        if (memberId === 'user') {
            // 如果操作的是用户自己，就更新 chat.settings.isUserMuted
            if (typeof chat.settings.isUserMuted === 'undefined') chat.settings.isUserMuted = false;
            chat.settings.isUserMuted = !chat.settings.isUserMuted;
        } else {
            // 如果操作的是其他成员，就更新成员对象
            if (typeof targetMember.isMuted === 'undefined') targetMember.isMuted = false;
            targetMember.isMuted = !targetMember.isMuted;
        }

        // 保存更新后的群聊数据到数据库
        await db.chats.put(chat);

        // 重新渲染成员管理列表，按钮文字会立刻更新
        renderMemberManagementList();

        // 发送系统通知
        const myNickname = chat.settings.myNickname || '我';
        const targetNickname = memberId === 'user' ? chat.settings.myNickname || '我' : targetMember.groupNickname;
        const actionText = (memberId === 'user' ? chat.settings.isUserMuted : targetMember.isMuted) ? '禁言' : '解除禁言';
        await logSystemMessage(chat.id, `“${myNickname}”将“${targetNickname}”${actionText}。`);
    }

    /**
     * 处理用户自己解除禁言
     */
    async function handleUserUnmute() {
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.settings.isUserMuted) return;

        const confirmed = await showCustomConfirm('解除禁言', '确定要为自己解除禁言吗？');
        if (confirmed) {
            chat.settings.isUserMuted = false;
            await db.chats.put(chat);

            await logSystemMessage(chat.id, `“${chat.settings.myNickname || '我'}”为自己解除了禁言。`);

            renderMemberManagementList(); // 刷新列表
        }
    }

    /**
     * 处理拉人入群的逻辑（已添加系统消息）
     */
    async function handleAddMembersToGroup() {
        if (selectedContacts.size === 0) {
            alert('请至少选择一个要添加的联系人。');
            return;
        }

        const chat = state.chats[state.activeChatId];
        const addedNames = [];

        for (const contactId of selectedContacts) {
            const contactChat = state.chats[contactId];
            if (contactChat) {
                // 这是原来的逻辑，用于处理普通角色(Char)
                chat.members.push({
                    id: contactId,
                    originalName: contactChat.name,
                    groupNickname: contactChat.name,
                    avatar: contactChat.settings.aiAvatar || defaultAvatar,
                    persona: contactChat.settings.aiPersona,
                    avatarFrame: contactChat.settings.aiAvatarFrame || '',
                    isAdmin: false,
                    groupTitle: '',
                });
                addedNames.push(`“${contactChat.name}”`);
            } else {
                // 处理NPC的逻辑
                let foundNpc = null;
                for (const c of Object.values(state.chats)) {
                    if (c.npcLibrary) {
                        const npc = c.npcLibrary.find((n) => n.id === contactId);
                        if (npc) {
                            foundNpc = npc;
                            break;
                        }
                    }
                }
                if (foundNpc) {
                    chat.members.push({
                        id: foundNpc.id,
                        originalName: foundNpc.name,
                        groupNickname: foundNpc.name,
                        avatar: foundNpc.avatar || defaultGroupMemberAvatar,
                        persona: foundNpc.persona,
                        avatarFrame: '',
                        isAdmin: false,
                        groupTitle: '',
                    });
                    addedNames.push(`“${foundNpc.name}”`);
                }
            }
        }

        await db.chats.put(chat);

        // 发送一条系统消息通知
        const myNickname = chat.settings.myNickname || '我';
        await logSystemMessage(chat.id, `“${myNickname}”邀请 ${addedNames.join('、')} 加入了群聊。`);

        // 返回到群成员管理界面并刷新
        openMemberManagementScreen();
        renderGroupMemberSettings(chat.members); // 同时更新聊天设置里的头像
    }

    /**
     * 处理设置用户自己的群昵称
     */
    async function handleSetUserNickname() {
        const chat = state.chats[state.activeChatId];
        const oldNickname = chat.settings.myNickname || '我';

        const newNickname = await showCustomPrompt('修改我的群昵称', '请输入新的昵称', oldNickname);
        if (newNickname !== null && newNickname.trim()) {
            chat.settings.myNickname = newNickname.trim();
            await db.chats.put(chat);

            // 发送一条系统消息通知群友
            await logSystemMessage(chat.id, `“${oldNickname}”将群昵称修改为“${newNickname.trim()}”`);

            renderMemberManagementList(); // 刷新成员管理列表
        }
    }

    /**
     * 处理设置用户自己的群头衔
     */
    async function handleSetUserTitle() {
        const chat = state.chats[state.activeChatId];
        const oldTitle = chat.settings.myGroupTitle || '';

        const newTitle = await showCustomPrompt('修改我的群头衔', '留空则为取消头衔', oldTitle);
        if (newTitle !== null) {
            chat.settings.myGroupTitle = newTitle.trim();
            await db.chats.put(chat);

            // 调用你已有的函数来发送系统通知
            const myNickname = chat.settings.myNickname || '我';
            await logTitleChange(chat.id, myNickname, myNickname, newTitle.trim());

            renderMemberManagementList();
        }
    }

    /**
     * 从群聊中移除一个成员
     * @param {string} memberId - 要移除的成员ID
     */
    async function removeMemberFromGroup(memberId) {
        const chat = state.chats[state.activeChatId];
        const isOwner = chat.ownerId === 'user';
        const isAdmin = chat.settings.isUserAdmin;
        const memberToRemove = chat.members.find((m) => m.id === memberId);

        // 权限检查
        if (!isOwner && !(isAdmin && !memberToRemove.isAdmin && memberToRemove.id !== chat.ownerId)) {
            alert('你没有权限移出该成员！');
            return;
        }

        const memberIndex = chat.members.findIndex((m) => m.id === memberId);
        if (memberIndex === -1) return;

        const memberName = memberToRemove.groupNickname;
        const confirmed = await showCustomConfirm('移出成员', `确定要将“${memberName}”移出群聊吗？`, {
            confirmButtonClass: 'btn-danger',
        });

        if (confirmed) {
            chat.members.splice(memberIndex, 1);
            await db.chats.put(chat);

            const myNickname = chat.settings.myNickname || '我';
            await logSystemMessage(chat.id, `“${myNickname}”将“${memberName}”移出了群聊。`);

            renderMemberManagementList();
        }
    }

    async function openContactPickerForAddMember() {
        selectedContacts.clear();

        // 绑定正确的“添加成员”函数
        const confirmBtn = document.getElementById('confirm-contact-picker-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', handleAddMembersToGroup);

        const listEl = document.getElementById('contact-picker-list');
        listEl.innerHTML = '';

        const chat = state.chats[state.activeChatId];
        const existingMemberIds = new Set(chat.members.map((m) => m.id));
        existingMemberIds.add('user'); // 把用户自己也算作已存在成员

        // 和创建群聊时一样，整合所有角色和NPC
        const allAvailablePeople = [];
        Object.values(state.chats)
            .filter((c) => !c.isGroup)
            .forEach((c) => {
                allAvailablePeople.push({
                    id: c.id,
                    name: c.name,
                    avatar: c.settings.aiAvatar || defaultAvatar,
                    isNpc: false,
                });
            });
        const npcMap = new Map();
        Object.values(state.chats).forEach((c) => {
            if (c.npcLibrary) {
                c.npcLibrary.forEach((npc) => {
                    if (!npcMap.has(npc.id)) {
                        npcMap.set(npc.id, {
                            id: npc.id,
                            name: npc.name,
                            avatar: npc.avatar || defaultGroupMemberAvatar,
                            isNpc: true,
                        });
                    }
                });
            }
        });
        allAvailablePeople.push(...Array.from(npcMap.values()));

        // 过滤掉已经是群成员的人
        const contacts = allAvailablePeople.filter((p) => !existingMemberIds.has(p.id));

        if (contacts.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#8a8a8a; margin-top:50px;">没有更多可以邀请的联系人了。</p>';
        } else {
            contacts.forEach((contact) => {
                const item = document.createElement('div');
                item.className = 'contact-picker-item';
                item.dataset.contactId = contact.id;
                item.innerHTML = `
			                <div class="checkbox"></div>
			                <img src="${contact.avatar}" class="avatar">
			                <span class="name">${contact.name} ${contact.isNpc ? '<span style="color: #888; font-size: 12px;">(NPC)</span>' : ''}</span>
			            `;
                listEl.appendChild(item);
            });
        }

        updateContactPickerConfirmButton();
        showScreen('contact-picker-screen');
    }

    /**
     * 在群聊中创建一个全新的虚拟成员
     */
    async function createNewMemberInGroup() {
        const name = await showCustomPrompt('创建新成员', '请输入新成员的名字 (这将是TA的“本名”，不可更改)');
        if (!name || !name.trim()) return;

        // 检查本名是否已在群内存在
        const chat = state.chats[state.activeChatId];
        if (chat.members.some((m) => m.originalName === name.trim())) {
            alert(`错误：群内已存在名为“${name.trim()}”的成员！`);
            return;
        }

        const persona = await showCustomPrompt('设置人设', `请输入“${name}”的人设`, '', 'textarea');
        if (persona === null) return;

        // 为新创建的NPC也建立双重命名机制
        const newMember = {
            id: 'npc_' + Date.now(),
            originalName: name.trim(), // 新成员的“本名”
            groupNickname: name.trim(), // 新成员的初始“群昵称”
            avatar: defaultGroupMemberAvatar,
            persona: persona,
            avatarFrame: '',
        };

        chat.members.push(newMember);
        await db.chats.put(chat);

        renderMemberManagementList();
        renderGroupMemberSettings(chat.members);

        alert(`新成员“${name}”已成功加入群聊！`);
    }


    // 外卖请求功能已移动至 apps/QQ/functions.js
    // startWaimaiCountdown, cleanupWaimaiTimers, handleWaimaiResponse have been moved.

    // videoCallState and callTimerInterval moved to apps/QQ/functions.js

    /**
     * 用户点击“发起视频通话”或“发起群视频”按钮
     */
    // video call functions (handleInitiateCall, startVideoCall) moved to functions.js

    /**
     * 结束视频通话
     */

    // endVideoCall moved to functions.js

    // minimizeVideoCall, restoreVideoCall, initVideoBubbleDrag, updateParticipantAvatars, handleUserJoinCall, updateCallTimer moved to functions.js

    // showIncomingCallModal_moved and hideIncomingCallModal_moved moved to functions.js

    // triggerAiInCallAction_moved moved to functions.js

    // toggleCallButtons moved to functions.js

    // handleWaimaiResponse defined here was duplicate/moved.


    /**
     * 处理用户点击头像发起的“拍一-拍”，带有自定义后缀功能
     * @param {string} chatId - 发生“拍一-拍”的聊天ID
     * @param {string} characterName - 被拍的角色名
     */
    window.handleUserPat = handleUserPat; // Expose to global
    async function handleUserPat(chatId, characterName) {
        const chat = state.chats[chatId];
        if (!chat) return;

        // 1. 触发屏幕震动动画
        const phoneScreen = document.getElementById('phone-screen');
        phoneScreen.classList.remove('pat-animation');
        void phoneScreen.offsetWidth;
        phoneScreen.classList.add('pat-animation');
        setTimeout(() => phoneScreen.classList.remove('pat-animation'), 500);

        // 2. 弹出输入框让用户输入后缀
        const suffix = await showCustomPrompt(`你拍了拍 “${characterName}”`, '（可选）输入后缀', '', 'text');

        // 如果用户点了取消，则什么也不做
        if (suffix === null) return;

        // 3. 创建对用户可见的“拍一-拍”消息
        const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
        // 将后缀拼接到消息内容中
        const visibleMessageContent = `${myNickname} 拍了拍 “${characterName}” ${suffix.trim()}`;
        const visibleMessage = {
            role: 'system', // 仍然是系统消息
            type: 'pat_message',
            content: visibleMessageContent,
            timestamp: Date.now(),
        };
        chat.history.push(visibleMessage);

        // 4. 创建一条对用户隐藏、但对AI可见的系统消息，以触发AI的回应
        // 同样将后缀加入到给AI的提示中
        const hiddenMessageContent = `[系统提示：用户（${myNickname}）刚刚拍了拍你（${characterName}）${suffix.trim()}。请你对此作出回应。]`;
        const hiddenMessage = {
            role: 'system',
            content: hiddenMessageContent,
            timestamp: Date.now() + 1, // 时间戳+1以保证顺序
            isHidden: true,
        };
        chat.history.push(hiddenMessage);

        // 5. 保存更改并更新UI
        await db.chats.put(chat);
        if (state.activeChatId === chatId) {
            appendMessage(visibleMessage, chat);
        }
        await renderChatList();
    }

    /**
     * 【重构版】渲染回忆与约定界面，使用单一循环和清晰的if/else逻辑
     */


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
     * 根据聊天类型，决定打开转账弹窗还是红包弹窗
     */
    // handlePaymentButtonClick moved to apps/QQ/functions.js

    /**
     * 打开并初始化发红包模态框
     */
    /**
     * 打开并初始化发红包模态框 - Moved to apps/QQ/functions.js
     */
    // window.openRedPacketModal = openRedPacketModal; // Already defined in functions.js if loaded

    /**
     * 发送群红包（拼手气） - Moved to apps/QQ/functions.js
     */

    /**
     * 发送专属红包 - Moved to apps/QQ/functions.js
     */

    /**
     * 当用户点击红包卡片时触发
     * @param {number} timestamp - 被点击的红包消息的时间戳
     */
    async function handlePacketClick(timestamp) {
        const currentChatId = state.activeChatId;
        const freshChat = await db.chats.get(currentChatId);
        if (!freshChat) return;

        state.chats[currentChatId] = freshChat;
        const packet = freshChat.history.find((m) => m.timestamp === timestamp);
        if (!packet) return;

        const myNickname = freshChat.settings.myNickname || '我';
        const hasClaimed = packet.claimedBy && packet.claimedBy[myNickname];

        // 如果是专属红包且不是给我的，或已领完，或已领过，都只显示详情
        if ((packet.packetType === 'direct' && packet.receiverName !== myNickname) || packet.isFullyClaimed || hasClaimed) {
            showRedPacketDetails(packet);
        } else {
            // 核心流程：先尝试打开红包
            const claimedAmount = await handleOpenRedPacket(packet);

            // 如果成功打开（claimedAmount不为null）
            if (claimedAmount !== null) {
                // **关键：在数据更新后，再重新渲染UI**
                renderChatInterface(currentChatId);

                // 显示成功提示
                await showCustomAlert('恭喜！', `你领取了 ${packet.senderName} 的红包，金额为 ${claimedAmount.toFixed(2)} 元。`);
            }

            // 无论成功与否，最后都显示详情页
            // 此时需要从state中获取最新的packet对象，因为它可能在handleOpenRedPacket中被更新了
            const updatedPacket = state.chats[currentChatId].history.find((m) => m.timestamp === timestamp);
            showRedPacketDetails(updatedPacket);
        }
    }

    /**
     * 处理用户打开红包的逻辑
     */
    async function handleOpenRedPacket(packet) {
        const chat = state.chats[state.activeChatId];
        const myNickname = chat.settings.myNickname || '我';

        // 1. 检查红包是否还能领
        const remainingCount = packet.count - Object.keys(packet.claimedBy || {}).length;
        if (remainingCount <= 0) {
            packet.isFullyClaimed = true;
            await db.chats.put(chat);
            await showCustomAlert('手慢了', '红包已被领完！');
            return null; // 返回null表示领取失败
        }

        // 2. 计算领取金额
        let claimedAmount = 0;
        const remainingAmount = packet.totalAmount - Object.values(packet.claimedBy || {}).reduce((sum, val) => sum + val, 0);
        if (packet.packetType === 'lucky') {
            if (remainingCount === 1) {
                claimedAmount = remainingAmount;
            } else {
                const min = 0.01;
                const max = remainingAmount - (remainingCount - 1) * min;
                claimedAmount = Math.random() * (max - min) + min;
            }
        } else {
            claimedAmount = packet.totalAmount;
        }
        claimedAmount = parseFloat(claimedAmount.toFixed(2));

        // 3. 更新红包数据
        if (!packet.claimedBy) packet.claimedBy = {};
        packet.claimedBy[myNickname] = claimedAmount;

        const isNowFullyClaimed = Object.keys(packet.claimedBy).length >= packet.count;
        if (isNowFullyClaimed) {
            packet.isFullyClaimed = true;
        }

        // 4. 构建系统消息和AI指令
        let hiddenMessageContent = '';

        // 如果红包被领完了，就准备“战报”
        if (isNowFullyClaimed) {
            const finishedMessage = {
                role: 'system',
                type: 'pat_message',
                content: `${packet.senderName} 的红包已被领完`,
                timestamp: Date.now() + 1,
            };
            chat.history.push(finishedMessage);

            hiddenMessageContent = `[系统提示：用户 (${myNickname}) 领取了最后一个红包，现在 ${packet.senderName} 的红包已被领完。`;

            let luckyKing = { name: '', amount: -1 };
            if (packet.packetType === 'lucky' && packet.count > 1) {
                Object.entries(packet.claimedBy).forEach(([name, amount]) => {
                    if (amount > luckyKing.amount) {
                        luckyKing = { name, amount };
                    }
                });
            }
            if (luckyKing.name) {
                hiddenMessageContent += ` 手气王是 ${luckyKing.name}！`;
            }
            hiddenMessageContent += ' 请对此事件发表评论。]';
        }
        // 如果还没被领完
        else {
            hiddenMessageContent = `[系统提示：用户 (${myNickname}) 刚刚领取了红包 (时间戳: ${packet.timestamp})。红包还未领完。]`;
        }

        // 创建并添加给AI看的隐藏消息
        const hiddenMessage = {
            role: 'system',
            content: hiddenMessageContent,
            timestamp: Date.now() + 2,
            isHidden: true,
        };
        chat.history.push(hiddenMessage);

        // 5. 保存到数据库
        await db.chats.put(chat);

        // 6. 返回领取的金额，用于后续弹窗
        return claimedAmount;
    }

    /**
     * 显示红包领取详情的模态框
     */
    async function showRedPacketDetails(packet) {
        // 1. 直接检查传入的packet对象是否存在，无需再查找
        if (!packet) {
            console.error('showRedPacketDetails收到了无效的packet对象');
            return;
        }

        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const modal = document.getElementById('red-packet-details-modal');
        const myNickname = chat.settings.myNickname || '我';

        // 2. 后续所有逻辑保持不变，直接使用传入的packet对象
        document.getElementById('rp-details-sender').textContent = packet.senderName;
        document.getElementById('rp-details-greeting').textContent = packet.greeting || '恭喜发财，大吉大利！';

        const myAmountEl = document.getElementById('rp-details-my-amount');
        if (packet.claimedBy && packet.claimedBy[myNickname]) {
            myAmountEl.querySelector('span:first-child').textContent = packet.claimedBy[myNickname].toFixed(2);
            myAmountEl.style.display = 'block';
        } else {
            myAmountEl.style.display = 'none';
        }

        const claimedCount = Object.keys(packet.claimedBy || {}).length;
        const claimedAmountSum = Object.values(packet.claimedBy || {}).reduce((sum, val) => sum + val, 0);
        let summaryText = `${claimedCount}/${packet.count}个红包，共${claimedAmountSum.toFixed(2)}/${packet.totalAmount.toFixed(2)}元。`;
        if (!packet.isFullyClaimed && claimedCount < packet.count) {
            const timeLeft = Math.floor((packet.timestamp + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60));
            if (timeLeft > 0) summaryText += ` 剩余红包将在${timeLeft}小时内退还。`;
        }
        document.getElementById('rp-details-summary').textContent = summaryText;

        const listEl = document.getElementById('rp-details-list');
        listEl.innerHTML = '';
        const claimedEntries = Object.entries(packet.claimedBy || {});

        let luckyKing = { name: '', amount: -1 };
        if (packet.packetType === 'lucky' && packet.isFullyClaimed && claimedEntries.length > 1) {
            claimedEntries.forEach(([name, amount]) => {
                if (amount > luckyKing.amount) {
                    luckyKing = { name, amount };
                }
            });
        }

        claimedEntries.sort((a, b) => b[1] - a[1]);

        claimedEntries.forEach(([name, amount]) => {
            const item = document.createElement('div');
            item.className = 'rp-details-item';
            let luckyTag = '';
            if (luckyKing.name && name === luckyKing.name) {
                luckyTag = '<span class="lucky-king-tag">手气王</span>';
            }
            item.innerHTML = `
			            <span class="name">${name}</span>
			            <span class="amount">${amount.toFixed(2)} 元</span>
			            ${luckyTag}
			        `;
            listEl.appendChild(item);
        });

        modal.classList.add('visible');
    }

    // 绑定关闭详情按钮的事件
    document.getElementById('close-rp-details-btn').addEventListener('click', () => {
        document.getElementById('red-packet-details-modal').classList.remove('visible');
    });

    // 供全局调用的函数，以便红包卡片上的 onclick 能找到它
    window.handlePacketClick = handlePacketClick;



    // AI头像库管理功能函数

    window.openAiAvatarLibraryModal = openAiAvatarLibraryModal; // Expose to global

    /**
     * 打开AI头像库管理模态框
     */
    function openAiAvatarLibraryModal() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        document.getElementById('ai-avatar-library-title').textContent = `“${chat.name}”的头像库`;
        renderAiAvatarLibrary();
        document.getElementById('ai-avatar-library-modal').classList.add('visible');
    }

    /**
     * 渲染AI头像库的内容
     */
    function renderAiAvatarLibrary() {
        const grid = document.getElementById('ai-avatar-library-grid');
        grid.innerHTML = '';
        const chat = state.chats[state.activeChatId];
        const library = chat.settings.aiAvatarLibrary || [];

        if (library.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">这个头像库还是空的，点击右上角“添加”吧！</p>';
            return;
        }

        library.forEach((avatar, index) => {
            const item = document.createElement('div');
            item.className = 'sticker-item'; // 复用表情面板的样式
            item.style.backgroundImage = `url(${avatar.url})`;
            item.title = avatar.name;

            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.display = 'block'; // 总是显示删除按钮
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await showCustomConfirm('删除头像', `确定要从头像库中删除“${avatar.name}”吗？`, {
                    confirmButtonClass: 'btn-danger',
                });
                if (confirmed) {
                    chat.settings.aiAvatarLibrary.splice(index, 1);
                    await db.chats.put(chat);
                    renderAiAvatarLibrary();
                }
            };
            item.appendChild(deleteBtn);
            grid.appendChild(item);
        });
    }

    /**
     * 向当前AI的头像库中添加新头像
     */
    window.addAvatarToLibrary = addAvatarToLibrary; // Expose to global
    async function addAvatarToLibrary() {
        const name = await showCustomPrompt('添加头像', '请为这个头像起个名字（例如：开心、哭泣）');
        if (!name || !name.trim()) return;

        // 1. 弹出选择框，让用户选是本地还是URL
        const choice = await showChoiceModal('选择图片来源', [
            { text: '📁 本地上传', value: 'local' },
            { text: '🌐 网络URL', value: 'url' },
        ]);

        let finalUrl = null;

        // 2. 根据选择执行不同逻辑
        if (choice === 'local') {
            // 调用现有的本地上传辅助函数 (代码里原本就有的)
            finalUrl = await uploadImageLocally();
        } else if (choice === 'url') {
            finalUrl = await showCustomPrompt('添加头像', '请输入头像的图片URL', '', 'url');
        }

        // 3. 如果没获取到图片(用户取消了)，直接结束
        if (!finalUrl) return;

        const chat = state.chats[state.activeChatId];
        if (!chat.settings.aiAvatarLibrary) {
            chat.settings.aiAvatarLibrary = [];
        }

        // 4. 保存到数据库
        chat.settings.aiAvatarLibrary.push({ name: name.trim(), url: finalUrl.trim() });
        await db.chats.put(chat);
        renderAiAvatarLibrary();
    }

    /**
     * 关闭AI头像库管理模态框
     */
    window.closeAiAvatarLibraryModal = closeAiAvatarLibraryModal; // Expose to global
    function closeAiAvatarLibraryModal() {
        document.getElementById('ai-avatar-library-modal').classList.remove('visible');
    }

    /**
     * 渲染主屏幕个人资料卡的头像框
     */


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
			**角色回复顺序不固定，可以交叉回复，例如角色A、角色B、角色B、角色A、角色C这样的交叉顺序。不一定要一个人全部说完了才轮到下一个人。角色之间【必须】有互动对话。**
			# 核心规则
			1.  **【【【身份铁律】】】**: 用户【绝对不在场】。你【绝对不能】生成与用户对话的内容。整段对话必须是AI角色之间的互动。你的唯一任务是扮演【且仅能扮演】下方“群成员列表”中明确列出的角色。【绝对禁止】扮演任何未在“群成员列表”中出现的角色。
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

			${worldBookContent}
			${musicContext}
			${countdownContext} 
			${sharedContext}
			# 群成员列表及人设
			${membersList}
			# 用户的角色
			- **${myNickname}**: ${chat.settings.myPersona}
			# 对话历史参考
			${recentContextSummary}
            ${summaryContext}
			${linkedMemoryContext}

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

            const messagesArray = JSON.parse(aiResponseContent);

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
     * 群聊的后台活动逻辑已合并到 runBackgroundSimulationTick 中
     */
    /*
    let groupSimulationIntervalId = null;
    // ... 原有的群聊时钟逻辑已移除 ...
    */
    /*
                const now = Date.now();

                // 检查2：使用该群聊自己设置的间隔期
                const intervalMs = (bgSettings.interval || 120) * 1000;
                //const lastActivity = bgSettings.lastActivityTimestamp || 0;

                // updated by lrq 251028
                // 使用当前群聊最后一条消息时间作为最后活动时间
                const lastMessage = chat.history.slice(-1)[0];
                const lastActivity = lastMessage ? lastMessage.timestamp : 0;

                // 检查3：是否到达了该群聊的行动时间
                if (now - lastActivity > intervalMs) {
                    console.log(`群聊 "${chat.name}" 到达行动时间 (间隔: ${bgSettings.interval}秒)，准备触发后台互动...`);
                    // 触发群聊专属的后台行动函数
                    triggerGroupAiAction(chat.id);
                }
            }
        });
    }
    */
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
     * 在外观设置页面渲染出所有App图标的设置项
     */


    /**
     * 当用户点击链接卡片时，打开伪浏览器
     * @param {number} timestamp - 被点击消息的时间戳
     */
    function openBrowser(timestamp) {
        if (!state.activeChatId) return;

        const chat = state.chats[state.activeChatId];
        // 安全检查，确保 chat 和 history 都存在
        if (!chat || !chat.history) return;

        const message = chat.history.find((m) => m.timestamp === timestamp);
        if (!message || message.type !== 'share_link') {
            console.error('无法找到或消息类型不匹配的分享链接:', timestamp);
            return; // 如果找不到消息，就直接退出
        }

        // 填充浏览器内容
        document.getElementById('browser-title').textContent = message.source_name || '文章详情';
        const browserContent = document.getElementById('browser-content');
        browserContent.innerHTML = `
			        <h1 class="article-title">${message.title || '无标题'}</h1>
			        <div class="article-meta">
			            <span>来源: ${message.source_name || '未知'}</span>
			        </div>
			        <div class="article-body">
			            <p>${(message.content || '内容为空。').replace(/\n/g, '</p><p>')}</p>
			        </div>
			    `;

        // 显示浏览器屏幕
        showScreen('browser-screen');
    }

    /**
     * 关闭伪浏览器，返回聊天界面
     * (这个函数现在由 init() 中的事件监听器调用)
     */
    function closeBrowser() {
        showScreen('chat-interface-screen');
    }





    // buildCommentsContextForAI and filterVisiblePostsForAI were redundant here.
    // They are defined around line 4094 and exposed to window there.
    // Removed duplicate definitions from here.

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

    window.startReplyToMessage = startReplyToMessage; // Expose to global
    function startReplyToMessage() {
        if (!activeMessageTimestamp) return;

        const chat = state.chats[state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === activeMessageTimestamp);
        if (!message) return;

        // 1. 同时获取“完整内容”和“预览片段”
        const fullContent = String(message.content || '');
        let previewSnippet = '';

        if (typeof message.content === 'string' && STICKER_REGEX.test(message.content)) {
            previewSnippet = '[表情]';
        } else if (message.type === 'ai_image' || message.type === 'user_photo') {
            previewSnippet = '[图片]';
        } else if (message.type === 'voice_message') {
            previewSnippet = '[语音]';
        } else {
            // 预览片段依然截断，但只用于UI显示
            previewSnippet = fullContent.substring(0, 50) + (fullContent.length > 50 ? '...' : '');
        }

        // 2. 将“完整内容”存入上下文，以备发送时使用
        currentReplyContext = {
            timestamp: message.timestamp,
            senderName: message.senderName || (message.role === 'user' ? chat.settings.myNickname || '我' : chat.name),
            content: fullContent, // <--- 这里存的是完整的原文！
        };

        // 3. 仅在更新“回复预览栏”时，才使用“预览片段”
        const previewBar = document.getElementById('reply-preview-bar');
        previewBar.querySelector('.sender').textContent = `回复 ${currentReplyContext.senderName}:`;
        previewBar.querySelector('.text').textContent = previewSnippet; // <--- 这里用的是缩略版！
        previewBar.style.display = 'block';

        // 4. 后续操作保持不变
        hideMessageActions();
        document.getElementById('chat-input').focus();
    }

    /**
     * 取消引用模式
     */
    window.cancelReplyMode = cancelReplyMode; // Expose to global
    function cancelReplyMode() {
        currentReplyContext = null;
        document.getElementById('reply-preview-bar').style.display = 'none';
    }

    window.activeTransferTimestamp = null; // 用于暂存被点击的转账消息的时间戳

    /**
     * 显示处理转账的操作菜单
     * @param {number} timestamp - 被点击的转账消息的时间戳
     */
    function showTransferActionModal(timestamp) {
        window.activeTransferTimestamp = timestamp;

        const chat = state.chats[state.activeChatId];
        const message = chat.history.find((m) => m.timestamp === timestamp);
        if (message) {
            // 将AI的名字填入弹窗
            document.getElementById('transfer-sender-name').textContent = message.senderName;
        }
        document.getElementById('transfer-actions-modal').classList.add('visible');
    }

    /**
     * 隐藏处理转账的操作菜单
     */
    function hideTransferActionModal() {
        document.getElementById('transfer-actions-modal').classList.remove('visible');
        window.activeTransferTimestamp = null;
    }


    // 通话记录功能核心函数

    async function renderCallHistoryScreen() {
        showScreen('call-history-screen');

        const listEl = document.getElementById('call-history-list');
        const titleEl = document.getElementById('call-history-title');
        listEl.innerHTML = '';
        titleEl.textContent = '所有通话记录';

        const records = await db.callRecords.orderBy('timestamp').reverse().toArray();

        if (records.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">这里还没有通话记录哦~</p>';
            return; // 现在的 return 就没问题了，因为它只跳过了后续的渲染逻辑
        }

        records.forEach((record) => {
            const card = createCallRecordCard(record);

            addLongPressListener(card, async () => {
                // 1. 弹出输入框，并将旧名称作为默认值，方便修改
                const newName = await showCustomPrompt(
                    '自定义通话名称',
                    '请输入新的名称（留空则恢复默认）',
                    record.customName || '' // 如果已有自定义名称，就显示它
                );

                // 2. 如果用户点击了“取消”，则什么都不做
                if (newName === null) return;

                // 3. 更新数据库中的这条记录
                await db.callRecords.update(record.id, { customName: newName.trim() });

                // 4. 刷新整个列表，让更改立刻显示出来
                await renderCallHistoryScreen();

                // 5. 给用户一个成功的提示
                await showCustomAlert('成功', '通话名称已更新！');
            });
            listEl.appendChild(card);
        });
    }

    /**
     * 根据单条记录数据，创建一张能显示聊天对象的通话卡片
     * @param {object} record - 一条通话记录对象
     * @returns {HTMLElement} - 创建好的卡片div
     */
    function createCallRecordCard(record) {
        const card = document.createElement('div');
        card.className = 'call-record-card';
        card.dataset.recordId = record.id;

        // 获取通话对象的名字
        const chatInfo = state.chats[record.chatId];
        const chatName = chatInfo ? chatInfo.name : '未知会话';

        const callDate = new Date(record.timestamp);
        const dateString = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, '0')}-${String(callDate.getDate()).padStart(2, '0')} ${String(callDate.getHours()).padStart(2, '0')}:${String(callDate.getMinutes()).padStart(2, '0')}`;
        const durationText = `${Math.floor(record.duration / 60)}分${record.duration % 60}秒`;

        const avatarsHtml = record.participants.map((p) => `<img src="${p.avatar}" alt="${p.name}" class="participant-avatar" title="${p.name}">`).join('');

        card.innerHTML = `
			        <div class="card-header">
			            <span class="date">${dateString}</span>
			            <span class="duration">${durationText}</span>
			        </div>
			        <div class="card-body">
			            
			            ${record.customName ? `<div class="custom-title">${record.customName}</div>` : ''}

			            <div class="participants-info"> <!-- 新增一个容器方便布局 -->
			                <div class="participants-avatars">${avatarsHtml}</div>
			                <span class="participants-names">与 ${chatName}</span>
			            </div>
			        </div>
			    `;
        return card;
    }

    /**
     * 显示指定通话记录的完整文字稿
     * @param {number} recordId - 通话记录的ID
     */
    async function showCallTranscript(recordId) {
        const record = await db.callRecords.get(recordId);
        if (!record) return;

        const modal = document.getElementById('call-transcript-modal');
        const titleEl = document.getElementById('transcript-modal-title');
        const bodyEl = document.getElementById('transcript-modal-body');

        titleEl.textContent = `通话于 ${new Date(record.timestamp).toLocaleString()} (时长: ${Math.floor(record.duration / 60)}分${record.duration % 60}秒)`;
        bodyEl.innerHTML = '';

        if (!record.transcript || record.transcript.length === 0) {
            bodyEl.innerHTML = '<p style="text-align:center; color: #8a8a8a;">这次通话没有留下文字记录。</p>';
        } else {
            record.transcript.forEach((entry) => {
                const bubble = document.createElement('div');
                // 根据角色添加不同的class，应用不同的样式
                bubble.className = `transcript-entry ${entry.role}`;
                bubble.textContent = entry.content;
                bodyEl.appendChild(bubble);
            });
        }

        const deleteBtn = document.getElementById('delete-transcript-btn');

        // 使用克隆节点技巧，防止事件重复绑定
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        // 为新的、干净的按钮绑定事件
        newDeleteBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('确认删除', '确定要永久删除这条通话记录吗？此操作不可恢复。', {
                confirmButtonClass: 'btn-danger',
            });

            if (confirmed) {
                // 1. 关闭当前的详情弹窗
                modal.classList.remove('visible');

                // 2. 从数据库删除
                await db.callRecords.delete(recordId);

                // 3. 刷新通话记录列表
                await renderCallHistoryScreen();

                // 4. (可选) 给出成功提示
                alert('通话记录已删除。');
            }
        });
        modal.classList.add('visible');
    }

    /**
     * 处理用户点击状态栏，弹出编辑框让用户修改AI的当前状态
     */
    async function handleEditStatusClick() {
        // 1. 安全检查，确保在单聊界面
        if (!state.activeChatId || state.chats[state.activeChatId].isGroup) {
            return;
        }
        const chat = state.chats[state.activeChatId];

        // 2. 弹出输入框，让用户输入新的状态，并将当前状态作为默认值
        const newStatusText = await showCustomPrompt(
            '编辑对方状态',
            '请输入对方现在的新状态：',
            chat.status.text // 将当前状态作为输入框的默认内容
        );

        // 3. 如果用户输入了内容并点击了“确定”
        if (newStatusText !== null) {
            // 4. 更新内存和数据库中的状态数据
            chat.status.text = newStatusText.trim() || '在线'; // 如果用户清空了，就默认为“在线”
            chat.status.isBusy = false; // 每次手动编辑都默认其不处于“忙碌”状态
            chat.status.lastUpdate = Date.now();
            await db.chats.put(chat);

            // 5. 立刻刷新UI，让用户看到修改后的状态
            renderChatInterface(state.activeChatId);
            renderChatList();

            // 6. 给出一个无伤大雅的成功提示
            await showCustomAlert('状态已更新', `“${chat.name}”的当前状态已更新为：${chat.status.text}`);
        }
    }

    // 放在你的JS功能函数定义区
    async function openShareTargetPicker() {
        const modal = document.getElementById('share-target-modal');
        const listEl = document.getElementById('share-target-list');
        listEl.innerHTML = '';

        // 获取所有聊天作为分享目标
        const chats = Object.values(state.chats);

        chats.forEach((chat) => {
            // 复用联系人选择器的样式
            const item = document.createElement('div');
            item.className = 'contact-picker-item';
            item.innerHTML = `
			            <input type="checkbox" class="share-target-checkbox" data-chat-id="${chat.id}" style="margin-right: 15px;">
			            <img src="${chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar || defaultAvatar}" class="avatar">
			            <span class="name">${chat.name}</span>
			        `;
            listEl.appendChild(item);
        });

        modal.classList.add('visible');
    }

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

    window.handleRecallClick = handleRecallClick; // Expose to global
    /**
     * 处理用户点击“撤回”按钮的入口函数
     */
    async function handleRecallClick() {
        if (!activeMessageTimestamp) return;

        const RECALL_TIME_LIMIT_MS = 2 * 60 * 1000; // 设置2分钟的撤回时限
        const messageTime = activeMessageTimestamp;
        const now = Date.now();

        // 检查是否超过了撤回时限
        if (now - messageTime > RECALL_TIME_LIMIT_MS) {
            hideMessageActions();
            await showCustomAlert('操作失败', '该消息发送已超过2分钟，无法撤回。');
            return;
        }

        // 如果在时限内，执行真正的撤回逻辑
        await recallMessage(messageTime, true);
        hideMessageActions();
    }

    /**
     * 消息撤回的核心逻辑
     * @param {number} timestamp - 要撤回的消息的时间戳
     * @param {boolean} isUserRecall - 是否是用户主动撤回
     */
    async function recallMessage(timestamp, isUserRecall) {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
        if (messageIndex === -1) return;

        const messageToRecall = chat.history[messageIndex];

        // 1. 修改消息对象，将其变为“已撤回”状态
        const recalledData = {
            originalType: messageToRecall.type || 'text',
            originalContent: messageToRecall.content,
            // 保存其他可能存在的原始数据
            originalMeaning: messageToRecall.meaning,
            originalQuote: messageToRecall.quote,
        };

        messageToRecall.type = 'recalled_message';
        messageToRecall.content = isUserRecall ? '你撤回了一条消息' : '对方撤回了一条消息';
        messageToRecall.recalledData = recalledData;
        // 清理掉不再需要的旧属性
        delete messageToRecall.meaning;
        delete messageToRecall.quote;

        // 2. 如果是用户撤回，需要给AI发送一条它看不懂内容的隐藏提示
        if (isUserRecall) {
            const hiddenMessageForAI = {
                role: 'system',
                content: `[系统提示：用户撤回了一条消息。你不知道内容是什么，只需知道这个事件即可。]`,
                timestamp: Date.now(),
                isHidden: true,
            };
            chat.history.push(hiddenMessageForAI);
        }

        // 3. 保存到数据库并刷新UI
        await db.chats.put(chat);
        renderChatInterface(state.activeChatId);
        if (isUserRecall) renderChatList(); // 用户撤回时，最后一条消息变了，需要刷新列表
    }

    /**
     * 打开分类管理模态框
     */
    // openCategoryManager moved to WorldBookModule


    /**
     * 在模态框中渲染已存在的分类列表
     */
    // renderCategoryListInManager and addNewCategory moved to WorldBookModule


    /**
     * 删除一个世界书分类
    // 角色专属NPC库管理功能函数
    let editingNpcId = null; // 用于追踪正在编辑的NPC

    /**
     * 打开NPC库管理界面
     */
    function openNpcManager() {
        if (!state.activeChatId || state.chats[state.activeChatId].isGroup) return;
        const chat = state.chats[state.activeChatId];
        document.getElementById('npc-management-title').textContent = `“${chat.name}”的NPC库`;
        renderNpcList();
        showScreen('npc-management-screen');
    }

    /**
     * 渲染NPC列表
     */
    function renderNpcList() {
        const listEl = document.getElementById('npc-management-list');
        const chat = state.chats[state.activeChatId];
        const npcLibrary = chat.npcLibrary || [];
        listEl.innerHTML = '';

        if (npcLibrary.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">这里空空如也，点击右上角“+”添加第一个NPC吧！</p>';
            return;
        }

        npcLibrary.forEach((npc) => {
            // 复用聊天列表的样式，非常方便
            const item = document.createElement('div');
            item.className = 'chat-list-item';
            item.style.cursor = 'pointer';
            item.innerHTML = `
			            <img src="${npc.avatar || defaultGroupMemberAvatar}" class="avatar">
			            <div class="info">
			                <span class="name">${npc.name}</span>
			                <div class="last-msg">${npc.persona.substring(0, 30)}...</div>
			            </div>
			        `;
            // 点击编辑
            item.addEventListener('click', () => openNpcEditor(npc.id));
            // 长按删除
            addLongPressListener(item, () => deleteNpc(npc.id, npc.name));
            listEl.appendChild(item);
        });
    }

    async function openNpcEditor(npcId = null) {
        editingNpcId = npcId;
        // 使用正确的 state.activeChatId 来获取当前聊天对象
        const chat = state.chats[state.activeChatId];
        if (!chat) return; // 安全检查

        let npc = { name: '', persona: '', avatar: defaultGroupMemberAvatar };

        if (npcId) {
            // 从正确的 chat.npcLibrary 中查找数据
            npc = (chat.npcLibrary || []).find((n) => n.id === npcId) || npc;
            document.getElementById('persona-editor-title').textContent = `编辑NPC: ${npc.name}`;
        } else {
            document.getElementById('persona-editor-title').textContent = '添加新NPC';
        }

        // 填充编辑器内容
        document.getElementById('npc-editor-name-input').value = npc.name;
        document.getElementById('preset-avatar-preview').src = npc.avatar;
        document.getElementById('preset-persona-input').value = npc.persona;

        // 根据NPC模式，显隐特定UI元素
        document.getElementById('npc-editor-name-group').style.display = 'block';
        document.getElementById('persona-editor-change-frame-btn').style.display = 'none';

        // 绑定正确的保存函数
        document.getElementById('save-persona-preset-btn').onclick = saveNpc;

        // 最后才显示弹窗
        document.getElementById('persona-editor-modal').classList.add('visible');
    }

    /**
     * 保存NPC（新建或更新）
     */
    async function saveNpc() {
        const chat = state.chats[state.activeChatId];

        // 从编辑器中获取所有数据
        const name = document.getElementById('npc-editor-name-input').value.trim();
        const persona = document.getElementById('preset-persona-input').value.trim();
        const avatar = document.getElementById('preset-avatar-preview').src;

        if (!name) {
            alert('NPC名字不能为空！');
            return;
        }

        if (editingNpcId) {
            // 更新现有的NPC
            const npc = chat.npcLibrary.find((n) => n.id === editingNpcId);
            if (npc) {
                npc.name = name;
                npc.persona = persona;
                npc.avatar = avatar;
            }
        } else {
            // 添加一个全新的NPC
            const newNpc = {
                id: 'npc_' + Date.now(),
                name: name,
                persona: persona,
                avatar: avatar,
            };
            chat.npcLibrary.push(newNpc);
        }

        await db.chats.put(chat);
        renderNpcList();
        closePersonaEditor(); // 复用关闭编辑器的函数
    }

    /**
     * 删除一个NPC
     * @param {string} npcId - 要删除的NPC的ID
     * @param {string} npcName - 要删除的NPC的名字，用于确认提示
     */
    async function deleteNpc(npcId, npcName) {
        const confirmed = await showCustomConfirm('删除NPC', `确定要从“${state.chats[state.activeChatId].name}”的NPC库中删除 “${npcName}” 吗？`, { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            const chat = state.chats[state.activeChatId];
            chat.npcLibrary = chat.npcLibrary.filter((n) => n.id !== npcId);
            await db.chats.put(chat);
            renderNpcList();
        }
    }

    // --- 自定义头像框管理功能 ---

    function openFrameManager() {
        renderFrameManager();
        document.getElementById('custom-frame-manager-modal').classList.add('visible');
    }

    async function renderFrameManager() {
        const grid = document.getElementById('custom-frame-grid');
        grid.innerHTML = '';
        const customFrames = await db.customAvatarFrames.toArray();
        if (customFrames.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">你还没有上传过头像框哦~</p>';
            return;
        }
        customFrames.forEach((frame) => {
            const item = document.createElement('div');
            // 复用表情面板的样式，很方便
            item.className = 'sticker-item';
            item.style.backgroundImage = `url(${frame.url})`;
            item.title = frame.name;

            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await showCustomConfirm('删除头像框', `确定要删除“${frame.name}”吗？`, {
                    confirmButtonClass: 'btn-danger',
                });
                if (confirmed) {
                    await db.customAvatarFrames.delete(frame.id);
                    renderFrameManager(); // 刷新管理列表
                }
            };
            item.appendChild(deleteBtn);
            grid.appendChild(item);
        });
    }

    /**
     * 处理用户上传自定义头像框的逻辑
     */
    function handleUploadCustomFrame() {
        document.getElementById('custom-frame-upload-input').addEventListener(
            'change',
            async (event) => {
                const files = event.target.files;
                if (!files.length) return;

                const newFrames = [];

                // 使用 for...of 循环来逐个处理选中的文件
                for (const file of files) {
                    // 自动生成名字，而不是让用户输入
                    // 用 "文件名 (前8位) + 时间戳" 来确保名字几乎不会重复
                    const fileName = file.name.replace(/\.[^/.]+$/, '').substring(0, 8);
                    const autoName = `${fileName}_${Date.now()}`;

                    const base64Url = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });

                    newFrames.push({
                        id: 'frame_' + (Date.now() + newFrames.length), // 确保ID唯一
                        name: autoName,
                        url: base64Url,
                    });
                }

                // 循环结束后，批量添加到数据库
                if (newFrames.length > 0) {
                    await db.customAvatarFrames.bulkAdd(newFrames);
                    renderFrameManager(); // 刷新管理列表
                    await showCustomAlert('上传成功', `已成功添加 ${newFrames.length} 个新头像框！`);
                }

                // 清空文件选择器的值
                event.target.value = null;
            },
            { once: true }
        );

        document.getElementById('custom-frame-upload-input').click();
    }

    async function openFrameSelectorModal(type, targetId = null) {
        const grid = document.getElementById('avatar-frame-grid');
        grid.innerHTML = '';

        currentFrameSelection.type = type;
        currentFrameSelection.target = targetId;

        const chat = state.chats[state.activeChatId];
        let currentFrameUrl = '';
        let previewAvatarUrl = '';

        if (type === 'char-weibo') {
            // 如果是为“角色微博”换框
            const charChat = state.chats[currentViewingWeiboProfileId];
            currentFrameUrl = charChat.settings.weiboAvatarFrame || '';
            previewAvatarUrl = charChat.settings.weiboAvatar || defaultAvatar;
        } else if (type === 'home_profile') {
            currentFrameUrl = state.globalSettings.homeAvatarFrame || '';
            previewAvatarUrl = document.getElementById('profile-avatar-img').src;
        } else if (type === 'weibo_profile') {
            currentFrameUrl = state.qzoneSettings.weiboAvatarFrame || '';
            previewAvatarUrl = state.qzoneSettings.weiboAvatar || defaultAvatar;
        } else if (type === 'ai') {
            currentFrameUrl = chat.settings.aiAvatarFrame || '';
            previewAvatarUrl = chat.settings.aiAvatar || defaultAvatar;
        } else if (type === 'my') {
            currentFrameUrl = chat.settings.myAvatarFrame || '';
            previewAvatarUrl = chat.settings.myAvatar || defaultAvatar;
        } else if (type === 'member' && targetId) {
            const member = chat.members.find((m) => m.id === targetId);
            if (member) {
                currentFrameUrl = member.avatarFrame || '';
                previewAvatarUrl = member.avatar || defaultGroupMemberAvatar;
            }
        }

        // 后续渲染逻辑保持不变
        const customFrames = await db.customAvatarFrames.toArray();
        const frameUrlSet = new Set();
        const allFrames = [...avatarFrames, ...customFrames].filter((frame) => {
            if (!frame.url || !frameUrlSet.has(frame.url)) {
                frameUrlSet.add(frame.url);
                return true;
            }
            return false;
        });

        allFrames.forEach((frame) => {
            const item = createFrameItem(frame, previewAvatarUrl);
            if (currentFrameUrl === frame.url) {
                item.classList.add('selected');
                currentFrameSelection.url = frame.url;
            }
            grid.appendChild(item);
        });

        document.getElementById('avatar-frame-modal').classList.add('visible');
    }

    // 辅助函数：创建一个头像框选项
    function createFrameItem(frame, previewAvatarSrc) {
        const item = document.createElement('div');
        item.className = 'frame-item';
        item.title = frame.name;
        item.innerHTML = `
			        <img src="${previewAvatarSrc}" class="preview-avatar">
			        ${frame.url ? `<img src="${frame.url}" class="preview-frame" style="pointer-events: none;">` : ''}
			    `;
        item.addEventListener('click', () => {
            document.querySelectorAll('#avatar-frame-grid .frame-item').forEach((el) => el.classList.remove('selected'));
            item.classList.add('selected');
            currentFrameSelection.url = frame.url;
        });
        return item;
    }

    // 保存选择

    async function saveSelectedFrames() {
        const { type, url, target } = currentFrameSelection;

        // 对于不属于“角色设置”的功能 (比如主屏幕、微博)，保持原有的立即保存逻辑
        if (type === 'char-weibo') {
            const charChat = state.chats[currentViewingWeiboProfileId];
            if (charChat) {
                charChat.settings.weiboAvatarFrame = url;
                await db.chats.put(charChat);
                await renderWeiboCharProfile(currentViewingWeiboProfileId);
            }
        } else if (type === 'home_profile') {
            if (!state.globalSettings) state.globalSettings = {};
            state.globalSettings.homeAvatarFrame = url;
            await db.globalSettings.put(state.globalSettings);
            if (window.renderHomeScreenProfileFrame) window.renderHomeScreenProfileFrame();
        } else if (type === 'weibo_profile') {
            if (!state.qzoneSettings) state.qzoneSettings = {};
            state.qzoneSettings.weiboAvatarFrame = url;
            await saveQzoneSettings();
            await renderWeiboProfile();
        }
        // 对于“角色设置”里的头像框不再立即保存，只在内存中更新
        else {
            const chat = state.chats[state.activeChatId];
            if (!chat) return; // 安全检查

            if (type === 'ai') {
                chat.settings.aiAvatarFrame = url;
            } else if (type === 'my') {
                chat.settings.myAvatarFrame = url;
            } else if (type === 'member' && target) {
                const member = chat.members.find((m) => m.id === target);
                if (member) member.avatarFrame = url;
            }

            // 数据将在用户点击角色设置主面板的“保存”按钮时，与其他所有设置一起被保存。
            console.log(`头像框选择已暂存: type=${type}, url=${url}`);
        }

        // 只需关闭头像框选择弹窗即可，不做其他多余操作
        document.getElementById('avatar-frame-modal').classList.remove('visible');
    }

    /**
     * 检查两个时间戳是否在不同的自然日
     * @param {number} timestamp1 - 新消息的时间戳
     * @param {number | null} timestamp2 - 上一条消息的时间戳
     * @returns {boolean} - 如果是新的一天，返回 true
     */
    window.isNewDay = isNewDay; // Expose to global
    function isNewDay(timestamp1, timestamp2) {
        // 如果没有上一条消息的时间戳，说明这是第一条消息，肯定要显示日期
        if (!timestamp2) return true;

        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);

        // 比较年、月、日是否完全相同
        return date1.getFullYear() !== date2.getFullYear() || date1.getMonth() !== date2.getMonth() || date1.getDate() !== date2.getDate();
    }

    /**
     * 将时间戳格式化为 "X月X日 HH:mm" 的形式
     * @param {number} timestamp - 时间戳
     * @returns {string} - 格式化后的日期字符串
     */
    function formatDateStamp(timestamp) {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}月${day}日 ${hours}:${minutes}`;
    }

    /**
     * 根据时间戳，格式化聊天列表右侧的日期/时间显示
     * @param {number} timestamp - 消息的时间戳
     * @returns {string} - 格式化后的字符串 (例如 "14:30", "昨天", "08/03")
     */
    function formatChatListTimestamp(timestamp) {
        if (!timestamp) return ''; // 如果没有时间戳，返回空字符串

        const now = new Date();
        const msgDate = new Date(timestamp);

        // 判断是否为今天
        const isToday = now.getFullYear() === msgDate.getFullYear() && now.getMonth() === msgDate.getMonth() && now.getDate() === msgDate.getDate();

        if (isToday) {
            // 如果是今天，只显示时间
            return msgDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }

        // 判断是否为昨天
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = yesterday.getFullYear() === msgDate.getFullYear() && yesterday.getMonth() === msgDate.getMonth() && yesterday.getDate() === msgDate.getDate();

        if (isYesterday) {
            return '昨天';
        }

        // 判断是否为今年
        if (now.getFullYear() === msgDate.getFullYear()) {
            // 如果是今年，显示 "月/日"
            const month = String(msgDate.getMonth() + 1).padStart(2, '0');
            const day = String(msgDate.getDate()).padStart(2, '0');
            return `${month}/${day}`;
        }

        // 如果是更早的年份，显示 "年/月/日"
        const year = msgDate.getFullYear();
        const month = String(msgDate.getMonth() + 1).padStart(2, '0');
        const day = String(msgDate.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    /**
     * 创建一个功能完整的日期戳“伪消息”元素
     * @param {number} timestamp - 该日期戳代表的时间
     * @returns {HTMLElement} - 创建好的 DOM 元素
     */
    window.createDateStampElement = createDateStampElement; // Expose to global
    function createDateStampElement(timestamp) {
        // 1. 创建最外层的包裹 div，和真实消息一样
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper date-stamp-wrapper';
        // 把时间戳存起来，这是多选和删除的关键
        wrapper.dataset.timestamp = timestamp;

        // 2. 创建气泡 div
        const bubble = document.createElement('div');
        // 同时加上 .message-bubble 类，让多选逻辑能找到它
        bubble.className = 'message-bubble date-stamp-bubble';
        bubble.dataset.timestamp = timestamp;
        bubble.textContent = formatDateStamp(timestamp);

        wrapper.appendChild(bubble);

        // 3. 为它绑定和真实消息完全一样的事件监听器
        addLongPressListener(wrapper, () => {
            // 日期戳不支持复杂操作，长按直接进入多选
            enterSelectionMode(timestamp);
        });
        wrapper.addEventListener('click', () => {
            if (isSelectionMode) {
                toggleMessageSelection(timestamp);
            }
        });

        return wrapper;
    }

    // --- 美化功能的核心变量 ---
    let activeThemeId = null; // 用于追踪当前正在编辑的主题ID

    /**
     * 将CSS代码应用到页面上
     * @param {string} cssCode - 要应用的CSS代码字符串
     */


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
     * 渲染并填充气泡样式预设的下拉选择框
     */
    function renderBubblePresetSelector() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const customCssInput = document.getElementById('custom-css-input');

        selectEl.innerHTML = '<option value="">-- 无预设 --</option>';

        if (state.bubbleStylePresets) {
            state.bubbleStylePresets.forEach((preset) => {
                const option = document.createElement('option');
                option.value = preset.id;
                option.textContent = preset.name;
                selectEl.appendChild(option);
            });
        }

        // 检查当前聊天的CSS是否匹配任何一个预设
        const currentCss = customCssInput.value.trim();
        const matchingPreset = state.bubbleStylePresets ? state.bubbleStylePresets.find((p) => p.css.trim() === currentCss) : null;

        if (matchingPreset) {
            selectEl.value = matchingPreset.id;
        } else {
            selectEl.value = ''; // 如果不匹配任何预设，则选中“无预设”
        }
    }

    /**
     * 当用户在下拉框中选择一个预设时触发
     */
    function handlePresetSelectChange() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const customCssInput = document.getElementById('custom-css-input');
        const selectedId = parseInt(selectEl.value);

        if (selectedId && state.bubbleStylePresets) {
            const selectedPreset = state.bubbleStylePresets.find((p) => p.id === selectedId);
            if (selectedPreset) {
                customCssInput.value = selectedPreset.css;
            }
        }
        updateSettingsPreview(); // 无论如何都更新预览
    }

    /**
     * 打开预设管理的操作菜单
     */
    async function openBubblePresetManager() {
        const selectEl = document.getElementById('bubble-style-preset-select');
        const selectedId = parseInt(selectEl.value);
        const selectedPreset = state.bubbleStylePresets ? state.bubbleStylePresets.find((p) => p.id === selectedId) : null;

        const modal = document.getElementById('preset-actions-modal'); // 复用现有模态框
        const footer = modal.querySelector('.custom-modal-footer');

        footer.innerHTML = `
			        <button id="preset-action-save-new">保存</button>
			        <button id="preset-action-update-current" ${!selectedPreset ? 'disabled' : ''}>更新</button>
			        <button id="preset-action-delete-current" class="btn-danger" ${!selectedPreset ? 'disabled' : ''}>删除</button>
			        <button id="preset-action-cancel" style="margin-top: 8px; border-radius: 8px; background-color: #f0f0f0;">取消</button>
			    `;

        // 重新绑定事件
        document.getElementById('preset-action-save-new').addEventListener('click', saveCurrentCssAsPreset);
        if (selectedPreset) {
            document.getElementById('preset-action-update-current').addEventListener('click', () => updateSelectedPreset(selectedId));
            document.getElementById('preset-action-delete-current').addEventListener('click', () => deleteSelectedPreset(selectedId));
        }
        document.getElementById('preset-action-cancel').addEventListener('click', () => modal.classList.remove('visible'));

        modal.classList.add('visible');
    }

    /**
     * 将当前CSS文本框的内容保存为一个新的预设
     */
    async function saveCurrentCssAsPreset() {
        const customCssInput = document.getElementById('custom-css-input');
        const css = customCssInput.value.trim();
        if (!css) {
            alert('CSS内容不能为空！');
            return;
        }

        const name = await showCustomPrompt('保存预设', '请为这个气泡样式命名：');
        if (name && name.trim()) {
            const newPreset = { name: name.trim(), css: css };
            const newId = await db.bubbleStylePresets.add(newPreset);

            if (!state.bubbleStylePresets) state.bubbleStylePresets = [];
            state.bubbleStylePresets.push({ id: newId, ...newPreset });

            renderBubblePresetSelector();
            document.getElementById('bubble-style-preset-select').value = newId;
            document.getElementById('preset-actions-modal').classList.remove('visible');
            await showCustomAlert('成功', `预设 "${name.trim()}" 已保存！`);
        }
    }

    /**
     * 更新当前选中的预设
     */
    async function updateSelectedPreset(presetId) {
        const customCssInput = document.getElementById('custom-css-input');
        const css = customCssInput.value.trim();

        const preset = state.bubbleStylePresets.find((p) => p.id === presetId);
        if (preset) {
            preset.css = css;
            await db.bubbleStylePresets.put(preset);
            document.getElementById('preset-actions-modal').classList.remove('visible');
            await showCustomAlert('成功', `预设 "${preset.name}" 已更新！`);
        }
    }

    /**
     * 删除当前选中的预设
     */
    async function deleteSelectedPreset(presetId) {
        const preset = state.bubbleStylePresets.find((p) => p.id === presetId);
        if (preset) {
            const confirmed = await showCustomConfirm('确认删除', `确定要删除预设 "${preset.name}" 吗？`, {
                confirmButtonClass: 'btn-danger',
            });
            if (confirmed) {
                await db.bubbleStylePresets.delete(presetId);
                state.bubbleStylePresets = state.bubbleStylePresets.filter((p) => p.id !== presetId);

                renderBubblePresetSelector();
                document.getElementById('custom-css-input').value = '';
                updateSettingsPreview();

                document.getElementById('preset-actions-modal').classList.remove('visible');
                await showCustomAlert('成功', '预设已删除。');
            }
        }
    }

    /**
     * 播放来电铃声
     */
    window.playRingtone = function playRingtone() {
        const ringtonePlayer = document.getElementById('ringtone-player');
        // 优先使用用户在设置中保存的URL，如果没设置，就用我们预设的URL
        const ringtoneUrl = state.globalSettings.ringtoneUrl || 'https://files.catbox.moe/3w7gla.mp3';

        if (ringtonePlayer && ringtoneUrl) {
            ringtonePlayer.src = ringtoneUrl;
            // play() 返回一个 Promise，我们最好用 try...catch 包裹以防止浏览器报错
            const playPromise = ringtonePlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error('铃声播放失败:', error);
                    // 可以在这里给用户一个静音提示，如果需要的话
                });
            }
        }
    }

    /**
     * 停止并重置来电铃声
     */
    window.stopRingtone = function stopRingtone() {
        const ringtonePlayer = document.getElementById('ringtone-player');
        if (ringtonePlayer) {
            ringtonePlayer.pause();
            ringtonePlayer.currentTime = 0; // 将播放进度重置到开头
        }
    }

    /**
     * 播放消息提示音，增加健壮性
     */
    function playNotificationSound() {
        const soundUrl = state.globalSettings.notificationSoundUrl || 'https://laddy-lulu.github.io/Ephone-stuffs/message.mp3';

        // 1. 增加安全检查：如果链接为空，直接返回，不执行任何操作
        if (!soundUrl || !soundUrl.trim()) return;

        try {
            const audio = new Audio(soundUrl);
            audio.volume = 0.7;

            audio.play().catch((error) => {
                // 2. 优化错误提示，现在能更准确地反映问题
                if (error.name === 'NotAllowedError') {
                    console.warn('播放消息提示音失败：用户需要先与页面进行一次交互（如点击）才能自动播放音频。');
                } else {
                    // 对于其他错误（比如我们这次遇到的），直接打印错误详情
                    console.error(`播放消息提示音失败 (${error.name}): ${error.message}`, 'URL:', soundUrl);
                }
            });
        } catch (error) {
            console.error('创建提示音Audio对象时出错:', error);
        }
    }

    // 音频上下文解锁函数
    function unlockAudioContext() {
        const ringtonePlayer = document.getElementById('ringtone-player');
        // 检查播放器是否处于暂停状态，并且我们之前没有成功播放过
        if (ringtonePlayer && ringtonePlayer.paused) {
            // 尝试播放，然后立刻暂停。
            // 这个操作对用户是无感知的，但能告诉浏览器用户已与音频交互。
            ringtonePlayer.play().catch(() => { }); // play() 会返回一个 Promise，我们忽略任何可能发生的错误
            ringtonePlayer.pause();
            console.log("Ringtone audio context unlocked.");
        }
    }
    // “查手机”内容单条删除功能
    // 锁屏功能核心函数

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

    // openBulkAddStickersModal moved to apps/QQ/functions.js



    // “一键重roll”功能核心代码



    function initDraggableLyricsBar() {
        const bar = document.getElementById('floating-lyrics-bar');
        const phoneScreen = document.getElementById('phone-screen');

        let isDragging = false;
        let offsetX, offsetY;

        const onDragStart = (e) => {
            // 检查点击的是否是按钮，如果是，则不开始拖动
            if (e.target.closest('#lyrics-settings-btn') || e.target.closest('.close-btn')) {
                return;
            }

            isDragging = true;
            bar.classList.add('dragging');

            const rect = bar.getBoundingClientRect();
            const coords = getEventCoords(e);

            offsetX = coords.x - rect.left;
            offsetY = coords.y - rect.top;

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!isDragging) return;

            e.preventDefault();

            const phoneRect = phoneScreen.getBoundingClientRect();
            const coords = getEventCoords(e);

            let newLeft = coords.x - offsetX - phoneRect.left;
            let newTop = coords.y - offsetY - phoneRect.top;

            const maxLeft = phoneScreen.clientWidth - bar.offsetWidth;
            const maxTop = phoneScreen.clientHeight - bar.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            // 在拖动时，同时设置left, top并清除transform
            bar.style.left = `${newLeft}px`;
            bar.style.top = `${newTop}px`;
            bar.style.transform = 'none';
        };

        const onDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            bar.classList.remove('dragging');

            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('touchend', onDragEnd);
        };

        bar.addEventListener('mousedown', onDragStart);
        bar.addEventListener('touchstart', onDragStart, { passive: true });
    }

    function applyLyricsSettings() {
        const bar = document.getElementById('floating-lyrics-bar');
        const toggleBtn = document.getElementById('toggle-lyrics-bar-btn');

        // 应用样式
        bar.style.fontSize = `${lyricsBarSettings.fontSize}px`;
        bar.style.color = lyricsBarSettings.fontColor;
        bar.style.backgroundColor = `rgba(0, 0, 0, ${lyricsBarSettings.bgOpacity / 100})`;

        // 更新设置模态框里的控件值
        document.getElementById('lyrics-font-size-slider').value = lyricsBarSettings.fontSize;
        document.getElementById('lyrics-font-size-value').textContent = `${lyricsBarSettings.fontSize}px`;
        document.getElementById('lyrics-bg-opacity-slider').value = lyricsBarSettings.bgOpacity;
        document.getElementById('lyrics-bg-opacity-value').textContent = `${lyricsBarSettings.bgOpacity}%`;
        document.getElementById('lyrics-font-color-picker').value = lyricsBarSettings.fontColor;

        // 更新播放器里的开关按钮状态
        if (toggleBtn) {
            toggleBtn.textContent = lyricsBarSettings.showOnClose ? '悬浮' : '隐藏';
            toggleBtn.style.opacity = lyricsBarSettings.showOnClose ? '1' : '0.5';
        }
    }



    // moved switchVideoViews and handleVideoCallReroll to functions.js

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




    /**
     * 打开心声面板，应用背景和所有自定义设置
     */
    function openInnerVoiceModal() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // --- 应用自定义样式  ---
        applySavedInnerVoiceStyles();

        applyInnerVoiceBackground(chat.innerVoiceBackground || '');

        if (!chat.latestInnerVoice) {
            alert('还没有捕捉到Ta的心声哦，试着再聊一句吧！');
            return;
        }

        const modal = document.getElementById('inner-voice-modal');
        const data = chat.latestInnerVoice;

        // --- 角色信息填充 ---
        document.getElementById('inner-voice-avatar').src = chat.settings.aiAvatar || defaultAvatar;
        document.getElementById('inner-voice-char-name').textContent = chat.name;
        const frameImg = document.getElementById('inner-voice-avatar-frame');
        const avatarWrapper = document.getElementById('inner-voice-avatar-wrapper');
        const frameUrl = chat.settings.aiAvatarFrame || '';

        if (frameUrl) {
            frameImg.src = frameUrl;
            frameImg.style.display = 'block';
            avatarWrapper.classList.remove('has-border');
        } else {
            frameImg.src = '';
            frameImg.style.display = 'none';
            avatarWrapper.classList.add('has-border');
        }

        const labelFormat = chat.settings.innerVoiceAdopterLabelFormat || '领养人: {{user}}';
        const userNickname = chat.settings.myNickname || '你';
        const finalAdopterText = labelFormat.replace('{{user}}', userNickname);

        document.getElementById('inner-voice-adopter-avatar').src = chat.settings.myAvatar || defaultAvatar;
        document.getElementById('inner-voice-adopter-name').textContent = finalAdopterText;

        const header = document.querySelector('#inner-voice-main-panel .modal-header');
        if (header) {
            const shouldHideBorder = chat.settings.innerVoiceHideHeaderBorder || false;
            header.classList.toggle('no-border', shouldHideBorder);
        }

        // === 【修复重点开始】：获取标签并设置默认值 ===
        // 防止 chat.settings.innerVoiceTags 为空或部分字段缺失
        const tags = chat.settings.innerVoiceTags || {};

        const label1 = tags.clothing_label || '服装';
        const label2 = tags.behavior_label || '行为';
        const label3 = tags.thoughts_label || '心声';
        const label4 = tags.naughty_label || '坏心思';

        // 1. 设置第一个标签
        const clothingLabel = document.querySelector('#inner-voice-content-area div:nth-child(1) strong');
        if (clothingLabel) clothingLabel.textContent = label1 + ':';
        document.getElementById('inner-voice-clothing').textContent = data.clothing || '...';

        // 2. 设置第二个标签
        const behaviorLabel = document.querySelector('#inner-voice-content-area div:nth-child(2) strong');
        if (behaviorLabel) behaviorLabel.textContent = label2 + ':';
        document.getElementById('inner-voice-behavior').textContent = data.behavior || '...';

        // 3. 设置第三个标签
        const thoughtsLabel = document.querySelector('#inner-voice-content-area div:nth-child(3) strong');
        if (thoughtsLabel) thoughtsLabel.textContent = label3 + ':';
        document.getElementById('inner-voice-thoughts').textContent = data.thoughts || '...';

        // 4. 设置第四个标签
        const naughtyLabel = document.querySelector('#inner-voice-content-area div:nth-child(4) strong');
        if (naughtyLabel) naughtyLabel.textContent = label4 + ':';
        document.getElementById('inner-voice-naughty-thoughts').textContent = data.naughtyThoughts || '...';
        // === 【修复重点结束】 ===

        // --- 显示面板 ---
        modal.classList.add('visible');
        document.getElementById('inner-voice-history-panel').style.display = 'none';
        document.getElementById('inner-voice-main-panel').style.display = 'flex';
        isInnerVoiceHistoryOpen = false;
    }

    /**
     * 打开或关闭历史记录面板
     */
    function toggleInnerVoiceHistory() {
        const mainPanel = document.getElementById('inner-voice-main-panel');
        const historyPanel = document.getElementById('inner-voice-history-panel');

        if (isInnerVoiceHistoryOpen) {
            // 如果是打开的，就关闭它，显示主面板
            mainPanel.style.display = 'flex';
            historyPanel.style.display = 'none';
        } else {
            // 如果是关闭的，就打开它，隐藏主面板
            renderInnerVoiceHistory(); // 渲染历史记录
            mainPanel.style.display = 'none';
            historyPanel.style.display = 'flex';
        }
        isInnerVoiceHistoryOpen = !isInnerVoiceHistoryOpen; // 切换状态
    }

    /**
     * 渲染心声的历史记录列表
     */
    function renderInnerVoiceHistory() {
        const listEl = document.getElementById('inner-voice-history-list');
        listEl.innerHTML = '';
        const chat = state.chats[state.activeChatId];
        const history = chat.innerVoiceHistory || [];

        if (history.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">还没有历史记录</p>';
            return;
        }

        // 从新到旧显示
        [...history].reverse().forEach((item) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inner-voice-history-item';

            const date = new Date(item.timestamp);
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            // 在HTML中加入删除按钮
            itemEl.innerHTML = `
			            <button class="history-item-delete-btn" data-timestamp="${item.timestamp}">×</button>
			            <div class="history-item-timestamp">${dateString}</div>
			            <div class="history-item-content">
			                <p><strong>服装:</strong> ${item.clothing || '...'}</p>
			                <p><strong>行为:</strong> ${item.behavior || '...'}</p>
			                <p><strong>心声:</strong> ${item.thoughts || '...'}</p>
			                <p><strong>坏心思:</strong> ${item.naughtyThoughts || '...'}</p>
			            </div>
			        `;
            listEl.appendChild(itemEl);
        });
    }
    /**
     * 删除单条心声记录
     * @param {number} timestamp - 要删除的心声的时间戳
     */
    async function deleteSingleInnerVoice(timestamp) {
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.innerVoiceHistory) return;

        // 弹出确认框
        const confirmed = await showCustomConfirm('确认删除', '确定要删除这条心声记录吗？', {
            confirmButtonClass: 'btn-danger',
        });
        if (confirmed) {
            // 从数组中过滤掉匹配的项
            chat.innerVoiceHistory = chat.innerVoiceHistory.filter((item) => item.timestamp !== timestamp);
            // 保存回数据库
            await db.chats.put(chat);
            // 重新渲染列表
            renderInnerVoiceHistory();
        }
    }

    /**
     * 清空所有心声记录（包括当前心声）
     */
    async function clearAllInnerVoiceHistory() {
        const chat = state.chats[state.activeChatId];
        // 优化了判断条件，确保只要有历史或当前心声，就可以执行清空
        if (!chat || ((!chat.innerVoiceHistory || chat.innerVoiceHistory.length === 0) && !chat.latestInnerVoice)) {
            alert('没有可以清空的心声记录。');
            return;
        }

        const confirmed = await showCustomConfirm('确认清空', '确定要清空所有心声历史记录吗？此操作不可恢复。', {
            confirmButtonClass: 'btn-danger',
        });
        if (confirmed) {
            // 不仅清空历史数组，也要清空当前的心声对象
            chat.innerVoiceHistory = [];
            chat.latestInnerVoice = null; // 将当前心声设为null

            await db.chats.put(chat);

            // 手动清空主面板的显示，防止返回时看到旧数据
            document.getElementById('inner-voice-clothing').textContent = '...';
            document.getElementById('inner-voice-behavior').textContent = '...';
            document.getElementById('inner-voice-thoughts').textContent = '...';
            document.getElementById('inner-voice-naughty-thoughts').textContent = '...';

            // 刷新历史记录列表（这行是原本就有的，会显示“还没有历史记录”）
            renderInnerVoiceHistory();

            // (可选但推荐) 给用户一个成功的提示
            alert('所有心声记录已清空！');
        }
    }


    // Qzone function (handleNpcSummonClick) has been moved to apps/QQ/qzone.js

    // Qzone function (handleCharPostCommentTrigger) has been moved to apps/QQ/qzone.js

    // Qzone function (handleUserPostCommentTrigger) has been moved to apps/QQ/qzone.js

    // Qzone function (generateNpcCommentsForPost) has been moved to apps/QQ/qzone.js

    // Qzone function (generateNpcCommentsForPost body) has been moved to apps/QQ/qzone.js

    /**
     * 如果数据库中没有，则自动创建一个内置的夜间模式主题
     */
    async function addDefaultDarkModeThemeIfNeeded() {
        const themeName = '内置夜间模式'; // 这是我们要内置的主题名字
        try {
            // 检查数据库里是否已经有了这个名字的主题
            const existingTheme = await db.themes.where('name').equals(themeName).first();

            // 如果没有找到 (existingTheme 是 undefined)，就创建它
            if (!existingTheme) {
                console.log('内置夜间模式不存在，正在创建...');

                // 这就是完整的夜间模式CSS代码
                const darkModeCss = `
			/* 1. 全局重新定义颜色变量 */
			:root {
			  --secondary-bg: #1c1c1e;
			  --border-color: #38383a;
			  --text-primary: #ffffff;
			  --text-secondary: #8e8e93;
			  --status-bar-text-color: #ffffff;
			  --accent-color: #0A84FF; /* iOS风格的蓝色 */
			}

			/* 2. 为所有屏幕和主要容器设置基础深色背景 */
			#phone-screen, .screen, #chat-list, #world-book-list, .list-container, .form-container, #chat-messages,
			#wallpaper-screen, #font-settings-screen, #api-settings-screen, #character-selection-screen,
			#world-book-screen, #world-book-editor-screen, #character-phone-inner-screen, #character-phone-page {
			    background-color: #000000 !important;
			}

			/* 3. 主屏幕专属样式 */
			#home-screen { background: #111827 !important; }
			#desktop-dock { background-color: rgba(55, 65, 81, 0.5); }
			.desktop-app-icon .label, .widget-subtext { color: #e5e7eb; text-shadow: 0 1px 2px rgba(0,0,0,0.7); }
			#profile-widget .profile-info { background: linear-gradient(to bottom, rgba(28, 28, 30, 0.85) 20%, rgba(28, 28, 30, 0)); color: #f9fafb; }
			#profile-username, #profile-bio, #profile-location span { color: #f9fafb; }
			#profile-sub-username, #profile-location { color: #9ca3af; }
			#profile-location { background-color: rgba(255,255,255,0.1); }
			.widget-bubble { background-color: rgba(55, 65, 81, 0.9); color: #e5e7eb; }
			.widget-bubble::after { border-top-color: rgba(55, 65, 81, 0.9); }

			/* 4. 适配所有页面的头部Header */
			.header, .qzone-header, .character-phone-header {
			    background-color: rgba(28, 28, 30, 0.85) !important;
			    border-bottom-color: var(--border-color) !important;
			    color: var(--text-primary) !important;
			}

			/* 5. 适配所有通用组件 */
			#chat-input-area, #chat-list-bottom-nav { background-color: rgba(28, 28, 30, 0.85); border-top-color: var(--border-color); }
			#chat-input { background-color: var(--secondary-bg); color: var(--text-primary); }
			.modal-content, #custom-modal { background-color: #2c2c2e; }
			.modal-header, .modal-footer, .custom-modal-footer, .custom-modal-footer button:first-child { border-color: var(--border-color); }
			.form-group input, .form-group select, .form-group textarea { background-color: var(--secondary-bg); color: var(--text-primary); border-color: var(--border-color); }
			.list-item, .chat-list-item-swipe-container:not(:last-child), .chat-group-container, .world-book-group-container { border-bottom-color: var(--border-color) !important; }
			.chat-group-container:first-of-type { border-top-color: var(--border-color) !important; }
			.list-item:hover, .chat-list-item:hover { background-color: #2c2c2e; }

			/* 6. 特殊页面深度适配 */
			.chat-group-header, .world-book-group-header { background-color: #1c1c1e; }
			.chat-list-item-content.pinned { background-color: #3a3a3c; }
			#font-preview, #wallpaper-preview, .font-preset-slot { background-color: #1c1c1e !important; border-color: #38383a !important; }

			/* 7. 角色手机内部适配 & 全局文字颜色修复 */
			#character-phone-container { background-color: #000000; }
			.character-phone-frame { background-color: #111; }
			#character-chat-history-messages { background-color: #0e0e0e !important; }
			.character-chat-bubble.received { background-color: #2c2c2e !important; }
			.character-data-item, .character-bank-transaction, .character-cart-item, .character-browser-item {
			    background-color: #1c1c1e;
			    border-color: #38383a;
			}

			/* ▼▼▼ 核心修复：把所有这些元素的文字颜色都改为低饱和度的浅灰色 ▼▼▼ */
			.character-data-item .title,
			.character-data-item .content,
			.character-data-item .meta,
			.cart-item-price,
			.cart-item-info .title,
			.character-browser-item .title,
			.transaction-details .title,
			.transaction-amount,
			.character-select-item .name,  /* 修复角色选择列表的名字颜色 */
			#character-diary-list .character-data-item .content,
			#character-diary-list .character-data-item .content h1,
			#character-diary-list .character-data-item .content h2 {
			    color: #E0E0E0 !important; /* 使用一个柔和的、不刺眼的白色 */
			}

			.character-data-item .meta span,
			#character-diary-list .character-data-item .meta {
			    color: #9E9E9E !important; /* 次要信息使用更暗的灰色 */
			}

			#character-diary-list .character-data-item {
			    background-color: #26211a; /* 夜间模式下的信纸背景色 */
			    border-color: #524a3d;
			    border-left-color: #9e8a70;
			}

			`;

                await db.themes.add({ name: themeName, css: darkModeCss });
                console.log('内置夜间模式已成功创建！');
            } else {
                console.log('内置夜间模式已存在，跳过创建。');
            }
        } catch (error) {
            console.error('检查或创建内置夜间模式时出错:', error);
        }
    }
    // 聊天记录搜索功能核心函数

    /**
     * 打开并准备聊天记录搜索界面
     */
    function openChatSearchScreen() {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 清空旧的搜索条件和结果
        document.getElementById('keyword-search-input').value = '';
        document.getElementById('sender-search-select').innerHTML = '';
        document.getElementById('date-search-input').value = '';
        document.getElementById('chat-search-results-list').innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">输入条件开始搜索</p>';

        // 动态填充“人物”下拉菜单
        const senderSelect = document.getElementById('sender-search-select');
        senderSelect.innerHTML = '<option value="">所有人</option>'; // 默认选项

        const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
        const myOption = document.createElement('option');
        myOption.value = myNickname;
        myOption.textContent = myNickname;
        senderSelect.appendChild(myOption);

        if (chat.isGroup) {
            chat.members.forEach((member) => {
                const memberOption = document.createElement('option');
                memberOption.value = member.originalName; // 使用本名进行精确匹配
                memberOption.textContent = member.groupNickname; // 显示群昵称给用户看
                senderSelect.appendChild(memberOption);
            });
        } else {
            const aiOption = document.createElement('option');
            aiOption.value = chat.name;
            aiOption.textContent = chat.name;
            senderSelect.appendChild(aiOption);
        }

        // 关闭聊天设置弹窗，并显示搜索界面
        document.getElementById('chat-settings-modal').classList.remove('visible');
        showScreen('chat-search-screen');
    }

    /**
     * 执行搜索操作
     */
    function performChatSearch() {
        const chat = state.chats[state.activeChatId];
        if (!chat) {
            // 如果找不到聊天对象，给用户一个明确的提示
            alert('无法执行搜索，因为没有找到当前聊天。');
            return;
        }

        // 1. 获取所有搜索条件
        const keyword = document.getElementById('keyword-search-input').value.trim();
        const senderValue = document.getElementById('sender-search-select').value;
        const dateValue = document.getElementById('date-search-input').value;

        // 将关键词保存到全局变量，以便在渲染结果时用于高亮
        currentSearchKeyword = keyword;

        if (!keyword && !senderValue && !dateValue) {
            alert('请至少输入一个搜索条件！');
            return;
        }

        // 2. 筛选聊天记录
        console.log(`开始搜索: 关键词='${keyword}', 发言人='${senderValue}', 日期='${dateValue}'`);

        const results = chat.history.filter((msg) => {
            // 过滤掉系统消息和对用户隐藏的消息
            if (msg.isHidden || msg.role === 'system' || msg.type === 'recalled_message') {
                return false;
            }

            // a. 筛选日期
            if (dateValue) {
                const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
                if (msgDate !== dateValue) {
                    return false;
                }
            }

            // b. 筛选发言人
            if (senderValue) {
                const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';
                let msgSenderName = '';

                if (msg.role === 'user') {
                    msgSenderName = myNickname;
                } else {
                    // AI或群成员的消息
                    // 这里我们使用 originalName 来精确匹配，因为群昵称可能会变
                    msgSenderName = chat.isGroup ? msg.senderName : chat.name;
                }
                if (msgSenderName !== senderValue) {
                    return false;
                }
            }

            // c. 筛选关键词
            if (keyword) {
                let contentText = '';
                // 将所有可能包含文本的内容都转换成字符串进行搜索
                if (typeof msg.content === 'string') {
                    contentText = msg.content;
                } else if (typeof msg.content === 'object' && msg.content !== null) {
                    // 对于复杂对象，我们可以简单地将它们转为JSON字符串来搜索
                    contentText = JSON.stringify(msg.content);
                }

                if (!contentText.toLowerCase().includes(keyword.toLowerCase())) {
                    return false;
                }
            }

            return true; // 所有条件都满足
        });

        console.log(`搜索到 ${results.length} 条结果`);

        // 3. 渲染结果
        renderSearchResults(results);
    }

    /**
     * 渲染搜索结果列表
     * @param {Array} results - 筛选出的消息数组
     */
    function renderSearchResults(results) {
        const listEl = document.getElementById('chat-search-results-list');
        listEl.innerHTML = '';
        listEl.scrollTop = 0; // 每次渲染前，都将滚动条重置到顶部

        if (results.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">未找到相关记录</p>';
            return;
        }

        const chat = state.chats[state.activeChatId];
        const myNickname = chat.isGroup ? chat.settings.myNickname || '我' : '我';

        // 为了性能，只渲染最新的100条结果
        results
            .slice(-100)
            .reverse()
            .forEach((msg) => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.dataset.timestamp = msg.timestamp; // 关键！用于跳转

                let senderName, senderAvatar;
                if (msg.role === 'user') {
                    senderName = myNickname;
                    senderAvatar = chat.settings.myAvatar;
                } else {
                    if (chat.isGroup) {
                        senderName = msg.senderName;
                        const member = chat.members.find((m) => m.originalName === senderName);
                        senderAvatar = member ? member.avatar : defaultGroupMemberAvatar;
                    } else {
                        senderName = chat.name;
                        senderAvatar = chat.settings.aiAvatar;
                    }
                }

                let contentText = '';
                if (msg.type === 'sticker' || (typeof msg.content === 'string' && STICKER_REGEX.test(msg.content))) {
                    contentText = '[表情]';
                } else if (msg.type === 'ai_image' || msg.type === 'user_photo' || Array.isArray(msg.content)) {
                    contentText = '[图片]';
                } else {
                    contentText = String(msg.content);
                }

                item.innerHTML = `
			            <img src="${senderAvatar || defaultAvatar}" class="avatar">
			            <div class="search-result-info">
			                <div class="search-result-meta">
			                    <span class="name">${senderName}</span>
			                    <span class="timestamp">${formatDateStamp(msg.timestamp)}</span>
			                </div>
			                <div class="search-result-content">
			                    ${highlightText(contentText, currentSearchKeyword)}
			                </div>
			            </div>
			        `;
                listEl.appendChild(item);
            });
    }

    /**
     * 辅助函数：高亮文本中的关键词
     * @param {string} text - 原始文本
     * @param {string} keyword - 要高亮的关键词
     * @returns {string} - 处理后的HTML字符串
     */
    function highlightText(text, keyword) {
        if (!keyword || !text) {
            return text;
        }
        const regex = new RegExp(keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        return text.replace(regex, `<span class="highlight">$&</span>`);
    }

    /**
     * 点击搜索结果，跳转到对应的消息位置
     * @param {number} timestamp - 目标消息的时间戳
     */
    async function jumpToMessage(timestamp) {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const targetIndex = chat.history.findIndex((msg) => msg.timestamp === timestamp);
        if (targetIndex === -1) {
            await showCustomAlert('错误', '找不到该条消息，可能已被删除。');
            return;
        }

        // 1. 切换回聊天界面
        showScreen('chat-interface-screen');
        await new Promise((resolve) => setTimeout(resolve, 50));

        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = ''; // 清空当前内容

        // 2. 计算要渲染的消息窗口（以目标消息为中心）
        const windowSize = 50; // 和 MESSAGE_RENDER_WINDOW 保持一致
        const startIndex = Math.max(0, targetIndex - Math.floor(windowSize / 2));
        const messagesToRender = chat.history.slice(startIndex);

        // 3. 更新 currentRenderedCount 以同步加载状态
        //    这一步至关重要，它告诉“加载更多”功能下次应该从哪里开始加载
        currentRenderedCount = messagesToRender.length;

        // 4. 如果计算出的起始位置大于0，说明前面还有更早的记录，需要显示“加载更多”按钮
        if (startIndex > 0) {
            prependLoadMoreButton(messagesContainer);
        }

        // 5. 渲染消息窗口和日期戳
        let lastMessageTimestamp = startIndex > 0 ? chat.history[startIndex - 1].timestamp : null;
        messagesToRender.forEach((msg) => {
            if (msg.isHidden) return;
            if (isNewDay(msg.timestamp, lastMessageTimestamp)) {
                const dateStampEl = createDateStampElement(msg.timestamp);
                messagesContainer.appendChild(dateStampEl);
            }
            // 使用 true 作为第三个参数，表示这是初始加载，不应播放动画
            appendMessage(msg, chat, true);
            lastMessageTimestamp = msg.timestamp;
        });

        // 6. 滚动到目标消息并高亮它
        //    使用 setTimeout 确保 DOM 元素已经完全渲染到页面上
        setTimeout(() => {
            const targetMessage = messagesContainer.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);
            if (targetMessage) {
                // 使用 'auto' 滚动，比 'smooth' 更快速直接
                targetMessage.scrollIntoView({ behavior: 'auto', block: 'center' });

                // 添加闪烁高亮效果，让用户能注意到
                targetMessage.classList.add('flash');
                setTimeout(() => {
                    targetMessage.classList.remove('flash');
                }, 1500);
            }
        }, 100);
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

    /* 主屏幕美化预设核心功能函数 */

    let activeHomePresetId = null; // 用于追踪当前选中的预设ID

    /**
     * 启用或禁用预设管理按钮
     */


    /**
     * 角色表情包管理核心功能
     */
    // openCharStickerManager moved to apps/QQ/functions.js

    // renderCharStickers... moved to apps/QQ/functions.js

    /**
    /**
     * 塔罗牌占卜功能核心 - moved to apps/QQ/functions.js
     */

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
    async function handleSendToPet() {
        const chat = state.chats[state.activeChatId];
        const pet = chat.settings.pet;
        const input = document.getElementById('pet-chat-input');
        const userInput = input.value.trim();
        if (!userInput) return;

        input.value = '';
        input.style.height = 'auto';

        pet.petChatHistory.push({ sender: 'user', content: userInput });
        renderPetChatHistory();

        const petResponse = await getPetApiResponse(pet);
        if (petResponse) {
            pet.petChatHistory.push({ sender: 'pet', content: petResponse });
            renderPetChatHistory();
        }

        // 创建对用户【可见】的系统消息，记录这次对话
        const visibleLog = `[系统：你和宠物“${pet.name}”进行了对话。你说：“${userInput}”，它回应：“${petResponse}”。]`;
        const visibleMessage = {
            role: 'system',
            type: 'pat_message', // 使用这个类型来显示居中灰色气泡
            content: visibleLog,
            timestamp: Date.now(),
        };
        chat.history.push(visibleMessage);

        // 只有当用户正在查看当前聊天时，才实时追加到界面上
        if (document.getElementById('chat-interface-screen').classList.contains('active') && state.activeChatId === chat.id) {
            appendMessage(visibleMessage, chat);
        }

        // 创建给AI看的【隐藏】指令
        const hiddenMessageForAI = `[系统提示：用户刚刚和宠物“${pet.name}”进行了一次对话。用户说：“${userInput}”，宠物回应：“${petResponse}”。]`;
        const hiddenMessage = {
            role: 'system',
            content: hiddenMessageForAI,
            timestamp: Date.now() + 1,
            isHidden: true,
        };
        chat.history.push(hiddenMessage);

        await db.chats.put(chat);
    }



    /**
     * 渲染线下模式预设的下拉框
     */
    function renderOfflinePresetsSelector() {
        const select = document.getElementById('offline-preset-select');
        // 直接从全局 state 读取预设
        const presets = state.offlinePresets || [];
        select.innerHTML = '<option value="">-- 使用自定义输入 --</option>';

        presets.forEach((preset) => {
            const option = document.createElement('option');
            // 使用数据库的 ID 作为 option 的 value，这更可靠
            option.value = preset.id;
            option.textContent = preset.name;
            select.appendChild(option);
        });
    }

    /**
     * 当用户选择一个预设时，自动填充输入框
     */
    function handleOfflinePresetSelection() {
        const select = document.getElementById('offline-preset-select');
        const selectedId = parseInt(select.value);

        // 如果选择的不是“自定义输入”
        if (selectedId) {
            // 从全局 state 中根据 ID 查找预设
            const preset = state.offlinePresets.find((p) => p.id === selectedId);
            if (preset) {
                document.getElementById('offline-prompt-input').value = preset.prompt;
                document.getElementById('offline-style-input').value = preset.style;
            }
        }
    }

    /**
     * 打开预设管理的操作菜单
     */
    async function openOfflinePresetManager() {
        const select = document.getElementById('offline-preset-select');
        // 获取当前选中的预设ID
        const selectedId = select.value ? parseInt(select.value) : null;

        const choice = await showChoiceModal('管理线下模式预设', [
            { text: '💾 保存当前为新预设', value: 'save_new' },
            { text: '✏️ 更新选中预设', value: 'update_selected', disabled: !selectedId },
            { text: '🗑️ 删除选中预设', value: 'delete_selected', disabled: !selectedId },
        ]);

        // 根据选择执行相应的全局操作函数
        switch (choice) {
            case 'save_new':
                await saveCurrentAsOfflinePreset();
                break;
            case 'update_selected':
                if (selectedId) await updateSelectedOfflinePreset(selectedId);
                break;
            case 'delete_selected':
                if (selectedId) await deleteSelectedOfflinePreset(selectedId);
                break;
        }
    }

    /**
     * 将当前输入框的内容保存为一个新预设
     */
    async function saveCurrentAsOfflinePreset() {
        const name = await showCustomPrompt('保存新预设', '请输入预设名称：');

        if (name && name.trim()) {
            const newPreset = {
                name: name.trim(),
                prompt: document.getElementById('offline-prompt-input').value.trim(),
                style: document.getElementById('offline-style-input').value.trim(),
            };
            // 直接添加到全局的 offlinePresets 表中
            const newId = await db.offlinePresets.add(newPreset);

            // 更新内存中的 state
            if (!state.offlinePresets) state.offlinePresets = [];
            state.offlinePresets.push({ id: newId, ...newPreset });

            renderOfflinePresetsSelector(); // 刷新下拉框
            document.getElementById('offline-preset-select').value = newId; // 自动选中新保存的
            alert(`预设 "${name.trim()}" 已保存！`);
        }
    }

    /**
     * 用当前输入框的内容更新选中的预设
     */
    async function updateSelectedOfflinePreset(presetId) {
        const preset = state.offlinePresets.find((p) => p.id === presetId);
        if (!preset) return;

        const confirmed = await showCustomConfirm('确认更新', `确定要用当前内容覆盖预设 "${preset.name}" 吗？`);
        if (confirmed) {
            const updatedData = {
                prompt: document.getElementById('offline-prompt-input').value.trim(),
                style: document.getElementById('offline-style-input').value.trim(),
            };
            // 更新数据库
            await db.offlinePresets.update(presetId, updatedData);
            // 更新内存
            preset.prompt = updatedData.prompt;
            preset.style = updatedData.style;
            alert('预设已更新！');
        }
    }

    /**
     * 删除选中的预设
     */
    async function deleteSelectedOfflinePreset(presetId) {
        const preset = state.offlinePresets.find((p) => p.id === presetId);
        if (!preset) return;

        const confirmed = await showCustomConfirm('确认删除', `确定要删除预设 "${preset.name}" 吗？`, {
            confirmButtonClass: 'btn-danger',
        });
        if (confirmed) {
            // 从数据库删除
            await db.offlinePresets.delete(presetId);
            // 从内存中删除
            state.offlinePresets = state.offlinePresets.filter((p) => p.id !== presetId);

            renderOfflinePresetsSelector(); // 刷新下拉框
            // 清空输入框
            document.getElementById('offline-prompt-input').value = '';
            document.getElementById('offline-style-input').value = '';
            alert('预设已删除。');
        }
    }

    let isSummarizing = false; // 全局锁，防止重复触发总结

    /**
     * 检查是否需要触发总结或提醒
     * @param {string} chatId - 当前聊天的ID
     */
    window.checkAndTriggerSummary = checkAndTriggerSummary; // Expose to global
    async function checkAndTriggerSummary(chatId) {
        if (isSummarizing) return;

        const chat = state.chats[chatId];
        if (!chat || !chat.settings.summary || !chat.settings.summary.enabled) return;

        const summarySettings = chat.settings.summary;
        // 不再从0开始，而是从上次总结的位置开始计算
        const lastSummaryIndex = summarySettings.lastSummaryIndex;
        const messagesSinceLastSummary = chat.history.slice(lastSummaryIndex + 1);

        if (messagesSinceLastSummary.length >= summarySettings.count) {
            isSummarizing = true;
            if (summarySettings.mode === 'auto') {
                await performAutomaticSummary(chatId);
            } else {
                // 对于手动模式，现在只弹提醒
                await notifyForManualSummary(chatId);
            }
            isSummarizing = false;
        }
    }

    /**
     * 自动在后台执行总结，只总结触发条件的N条消息
     */
    async function performAutomaticSummary(chatId) {
        console.log(`自动总结触发 for chat: ${chatId}`);
        const chat = state.chats[chatId];
        const summarySettings = chat.settings.summary;

        // 精确截取最后N条消息作为总结范围
        const messagesToSummarize = chat.history.slice(-summarySettings.count);

        try {
            const summaryText = await generateSummary(chatId, messagesToSummarize);
            if (summaryText) {
                await saveSummaryAsMemory(chatId, summaryText);
            }
        } catch (e) {
            // generateSummary 内部已经处理了错误弹窗，这里我们只需要记录日志即可
            console.error('自动总结过程中发生未捕获的错误:', e);
        }
    }

    /**
     * 弹出提示框，【提醒】用户可以进行手动总结了
     */
    async function notifyForManualSummary(chatId) {
        console.log(`手动总结提醒触发 for chat: ${chatId}`);

        // 只弹出一个简单的通知
        await showCustomAlert('总结提醒', '对话已达到设定长度，你可以随时在“聊天设置”中点击“立即手动总结”来生成对话记忆。');

        // 这意味着计时器会从现在重新开始计算。
        const chat = state.chats[chatId];
        chat.settings.summary.lastSummaryIndex = chat.history.length - 1;
        await db.chats.put(chat);
    }

    /**
     * 调用API生成总结内容
     * @param {string} chatId - 聊天的ID
     * @param {Array | null} specificMessages - 如果提供，则只总结这个数组里的消息；如果为null，则总结自上次以来的所有消息。
     * @returns {Promise<string|null>} - AI生成的总结文本
     */
    async function generateSummary(chatId, specificMessages = null) {
        const chat = state.chats[chatId];
        const { proxyUrl, apiKey, model } = state.apiConfig;

        if (!proxyUrl || !apiKey || !model) {
            throw new Error('API未配置，无法生成总结。');
        }

        const summarySettings = chat.settings.summary;
        let messagesToSummarize;

        if (specificMessages && specificMessages.length > 0) {
            messagesToSummarize = specificMessages;
        } else {
            const lastSummaryIndex = summarySettings.lastSummaryIndex > -1 ? summarySettings.lastSummaryIndex : 0;
            messagesToSummarize = chat.history.slice(lastSummaryIndex + 1);
        }

        const filteredMessagesForSummary = messagesToSummarize.filter((msg) => msg.type !== 'summary');

        if (filteredMessagesForSummary.length === 0) {
            if (!specificMessages) {
                await showCustomAlert('无需总结', '自上次总结以来没有新的对话内容。');
            }
            return null;
        }

        // --- 在构建对话文本时，加入时间戳 ---
        const conversationText = filteredMessagesForSummary
            .map((msg) => {
                const sender = msg.role === 'user' ? (chat.isGroup ? chat.settings.myNickname || '我' : '我') : msg.senderName || chat.name;
                let content = '';
                if (typeof msg.content === 'string') {
                    content = msg.content;
                } else if (Array.isArray(msg.content)) {
                    content = '[图片]';
                } else if (msg.type) {
                    content = `[${msg.type}]`;
                }
                // 将毫秒时间戳转换为人类可读的日期时间字符串
                const readableTime = new Date(msg.timestamp).toLocaleString('zh-CN', { hour12: false });
                return `[${readableTime}] ${sender}: ${content}`;
            })
            .join('\n');

        // --- 更新系统指令，要求AI使用时间戳 ---
        const systemPrompt = summarySettings.prompt + `\n\n重要提示：每条消息开头都有一个 [时间] 标记。你在总结时，【必须】参考这些时间，在总结关键事件时附上对应的时间范围或具体时间点，让总结包含时间线索。\n\n--- 对话开始 ---\n${conversationText}\n--- 对话结束 ---`;

        try {
            if (!specificMessages) {
                await showCustomAlert('正在生成...', 'AI正在努力总结你们的对话，请稍候...');
            }

            const isGemini = proxyUrl === GEMINI_API_URL;
            const messagesForApi = [{ role: 'user', content: systemPrompt }];
            const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: messagesForApi,
                        temperature: parseFloat(state.apiConfig.temperature) || 0.3,
                    }),
                });

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const aiContent = isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data?.choices?.[0]?.message?.content;

            if (!aiContent) {
                throw new Error('AI返回了空内容。');
            }

            return aiContent;
        } catch (error) {
            console.error('生成总结失败:', error);
            await showCustomAlert('总结失败', `发生错误: ${error.message}`);
            return null;
        }
    }

    /**
     * 将生成的总结作为一条特殊的记忆消息保存起来
     */
    async function saveSummaryAsMemory(chatId, summaryText) {
        const chat = state.chats[chatId];

        // 记录下总结操作发生时的最后一条消息的索引
        const newLastSummaryIndex = chat.history.length - 1;

        const summaryMessage = {
            role: 'system',
            type: 'summary', // 特殊类型
            content: summaryText,
            timestamp: Date.now(),
            isHidden: true, // 这条消息对AI可见，但对用户隐藏
        };

        chat.history.push(summaryMessage);
        chat.settings.summary.lastSummaryIndex = newLastSummaryIndex; // 更新索引

        await db.chats.put(chat);
        console.log(`新的总结已作为记忆保存 for chat: ${chatId}`);
    }

    // --- 总结管理界面的函数 ---

    let editingSummaryTimestamp = null;

    async function openSummaryViewer() {
        const chat = state.chats[state.activeChatId];
        document.getElementById('summary-viewer-title').textContent = `“${chat.name}”的对话记忆`;

        const listEl = document.getElementById('summary-list');
        listEl.innerHTML = '';

        const summaries = chat.history.filter((msg) => msg.type === 'summary');

        if (summaries.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a;">还没有生成过任何总结。</p>';
        } else {
            [...summaries].reverse().forEach((summary) => {
                const card = document.createElement('div');
                card.className = 'summary-item-card';

                card.innerHTML = `
			                <div class="summary-actions">
			                    <button class="concise-summary-btn" data-timestamp="${summary.timestamp}" title="精简总结">✨</button>
			                    <button class="edit-summary-btn" data-timestamp="${summary.timestamp}" title="编辑">✏️</button>
			                    <button class="delete-summary-btn" data-timestamp="${summary.timestamp}" title="删除">🗑️</button>
			                </div>
			                <div class="summary-content">${summary.content.replace(/\n/g, '<br>')}</div>
			                <div class="summary-meta">
			                    <span>生成于: ${new Date(summary.timestamp).toLocaleString('zh-CN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                })}</span>
			                </div>
			            `;
                listEl.appendChild(card);
            });
        }

        document.getElementById('chat-settings-modal').classList.remove('visible');
        document.getElementById('summary-viewer-modal').classList.add('visible');
    }

    /**
     * 编辑一条总结
     */
    async function editSummary(timestamp) {
        const chat = state.chats[state.activeChatId];
        const summary = chat.history.find((msg) => msg.timestamp === timestamp);
        if (!summary) return;

        const newContent = await showCustomPrompt('编辑总结', '修改总结内容:', summary.content, 'textarea');

        if (newContent !== null) {
            summary.content = newContent.trim();
            await db.chats.put(chat);
            openSummaryViewer(); // 重新渲染列表
        }
    }

    /**
     * 删除一条总结，并智能更新总结索引
     */
    async function deleteSummary(timestamp) {
        const confirmed = await showCustomConfirm('确认删除', '确定要删除这条总结记忆吗？这可能会影响AI的长期记忆。', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            const chat = state.chats[state.activeChatId];

            // 1. 从历史记录中过滤掉被删除的总结
            chat.history = chat.history.filter((msg) => msg.timestamp !== timestamp);

            // 2. --- 重新计算 lastSummaryIndex ---
            // 找到剩下的总结中，最新的那一条
            const lastRemainingSummary = chat.history.filter((m) => m.type === 'summary').pop();

            let newLastSummaryIndex;

            if (lastRemainingSummary) {
                // 3. 如果还有其他总结，就找到它在历史记录中的位置
                const lastSummaryMessageIndexInHistory = chat.history.findIndex((m) => m.timestamp === lastRemainingSummary.timestamp);
                // 4. 新的索引就是它前面那条普通消息的索引
                newLastSummaryIndex = lastSummaryMessageIndexInHistory > 0 ? lastSummaryMessageIndexInHistory - 1 : -1;
            } else {
                // 5. 如果一条总结都不剩了，就彻底重置索引
                newLastSummaryIndex = -1;
            }

            // 6. 更新设置
            if (chat.settings.summary) {
                chat.settings.summary.lastSummaryIndex = newLastSummaryIndex;
            }

            // 保存更改并刷新UI
            await db.chats.put(chat);
            openSummaryViewer();
            await showCustomAlert('操作成功', '总结已删除！');
        }
    }

    /**
     * 调用API将指定文本精简为摘要
     * @param {string} originalText - 原始的、较长的总结文本
     * @returns {Promise<string|null>} - AI生成的精简摘要，如果失败则返回null
     */
    async function generateConciseSummary(originalText) {
        const { proxyUrl, apiKey, model } = state.apiConfig;
        if (!proxyUrl || !apiKey || !model) {
            throw new Error('API未配置，无法生成精简摘要。');
        }

        // 核心Prompt：指示AI将内容精简为一句话
        const systemPrompt = `请你将以下内容精简为一句话的核心摘要，保留最关键的人物、事件和结论，字数控制在20字以内：\n\n--- 内容开始 ---\n${originalText}\n--- 内容结束 ---`;

        try {
            const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: systemPrompt }],
                    temperature: parseFloat(state.apiConfig.temperature) || 0.5,
                }),
            });

            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('生成精简摘要失败:', error);
            await showCustomAlert('精简失败', `发生错误: ${error.message}`);
            return null;
        }
    }

    /**
     * 处理单条总结的精简
     * @param {number} timestamp - 要精简的总结消息的时间戳
     */
    async function handleConciseSummary(timestamp) {
        const chat = state.chats[state.activeChatId];
        const summary = chat.history.find((msg) => msg.timestamp === timestamp);
        if (!summary) return;

        await showCustomAlert('请稍候...', 'AI正在努力为您精简内容...');

        const conciseText = await generateConciseSummary(summary.content);

        if (conciseText) {
            summary.content = conciseText.trim();
            await db.chats.put(chat); // 保存到数据库
            await openSummaryViewer(); // 重新渲染列表
            await showCustomAlert('成功', '本条总结已精简！');
        }
    }

    /**
     * 处理全部总结的精简
     */
    async function handleConciseAllSummaries() {
        const chat = state.chats[state.activeChatId];
        const summaries = chat.history.filter((msg) => msg.type === 'summary');

        if (summaries.length === 0) {
            alert('没有可以精简的总结。');
            return;
        }

        const confirmed = await showCustomConfirm('确认全部精简', `确定要精简全部 ${summaries.length} 条总结吗？此操作会覆盖原始内容且不可恢复。`, { confirmButtonClass: 'btn-danger' });
        if (!confirmed) return;

        await showCustomAlert('请稍候...', `正在批量精简 ${summaries.length} 条总结，这可能需要一些时间...`);

        try {
            // 使用 for...of 循环来逐条处理，避免同时发送太多API请求导致被限制
            for (const summary of summaries) {
                const conciseText = await generateConciseSummary(summary.content);
                if (conciseText) {
                    summary.content = conciseText.trim();
                }
                // 每处理完一条，稍微等待一下，给API一点喘息时间
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            await db.chats.put(chat);
            await openSummaryViewer();
            await showCustomAlert('成功', '所有总结都已精简完毕！');
        } catch (error) {
            // generateConciseSummary 内部已经处理了错误弹窗，这里我们只需要确保流程正常结束
            console.error('批量精简时出错:', error);
        }
    }

    /**
     * 用户点击“立即手动总结”按钮时触发的函数 (支持不同模式)
     * @param {'latest' | 'range'} mode - 总结模式
     * @param {{start: number, end: number} | null} range - 如果是范围模式，则为起始和结束序号
     */
    async function triggerManualSummaryNow(mode = 'latest', range = null) {
        if (isSummarizing) {
            alert('正在处理上一个总结任务，请稍候...');
            return;
        }

        const chat = state.chats[state.activeChatId];
        if (!chat) {
            alert('错误：找不到当前聊天，无法总结。');
            return;
        }

        isSummarizing = true; // 上锁

        try {
            let messagesToSummarize = [];

            // 1. 根据传入的模式，决定要截取哪些消息
            if (mode === 'latest') {
                const summarySettings = chat.settings.summary;
                const count = summarySettings && summarySettings.count > 0 ? summarySettings.count : 20;
                messagesToSummarize = chat.history.slice(-count);
                console.log(`手动总结最新 ${count} 条消息...`);
            } else if (mode === 'range' && range) {
                // 注意：数组索引从0开始，而用户输入从1开始，所以需要-1
                messagesToSummarize = chat.history.slice(range.start - 1, range.end);
                console.log(`手动总结从 ${range.start} 到 ${range.end} 的消息...`);
            } else {
                throw new Error('无效的总结模式或范围。');
            }

            // 后续的逻辑保持不变
            if (messagesToSummarize.length === 0) {
                alert('选定的范围内没有可总结的聊天记录。');
                isSummarizing = false; // 解锁
                return;
            }

            const summaryText = await generateSummary(state.activeChatId, messagesToSummarize);

            if (summaryText) {
                await saveSummaryAsMemory(state.activeChatId, summaryText);
                await showCustomAlert('总结完成', '新的对话记忆已生成！');
                if (document.getElementById('summary-viewer-modal').classList.contains('visible')) {
                    openSummaryViewer();
                }
            }
        } catch (e) {
            console.error('手动总结过程中发生未捕获的错误:', e);
            await showCustomAlert('错误', '手动总结时发生错误，详情请查看控制台。');
        } finally {
            isSummarizing = false; // 别忘了无论成功失败都要解锁
        }
    }

    /**
     * 更新角色手机钱包的余额和交易记录
     * @param {string} charId - 要更新钱包的角色ID
     * @param {number} amount - 交易金额 (正数为收入, 负数为支出)
     * @param {string} description - 交易描述 (例如: "转账给 XX", "收到 XX 的红包")
     */
    window.updateCharacterBankBalance = updateCharacterBankBalance; // Expose to global
    async function updateCharacterBankBalance(charId, amount, description) {
        // 安全检查：如果缺少关键信息，则直接返回
        if (!charId || !amount || isNaN(amount)) {
            console.warn(
                "updateCharacterBankBalance 调用失败：缺少charId或有效的amount。"
            );
            return;
        }

        // 从全局状态中获取角色对象
        const chat = state.chats[charId];
        // 安全检查：确保角色存在且不是群聊
        if (!chat || chat.isGroup) {
            console.warn(
                `updateCharacterBankBalance 跳过：找不到ID为 ${charId} 的角色或该ID为群聊。`
            );
            return;
        }

        // --- 确保数据结构完整，兼容旧数据 ---
        if (!chat.characterPhoneData) {
            chat.characterPhoneData = {};
        }
        if (!chat.characterPhoneData.bank) {
            chat.characterPhoneData.bank = { balance: 0, transactions: [] };
        }
        // 如果旧数据的余额不是数字，则强制设为0
        if (typeof chat.characterPhoneData.bank.balance !== "number") {
            chat.characterPhoneData.bank.balance = 0;
        }
        // 如果旧数据的交易记录不是数组，则创建一个空数组
        if (!Array.isArray(chat.characterPhoneData.bank.transactions)) {
            chat.characterPhoneData.bank.transactions = [];
        }

        // --- 核心逻辑 ---
        // 1. 创建一条新的交易记录
        const newTransaction = {
            type: amount > 0 ? "收入" : "支出",
            amount: Math.abs(amount), // 交易记录里的金额总是正数
            description: description,
            timestamp: Date.now(), // 记录交易发生的时间
        };

        // 2. 更新余额
        chat.characterPhoneData.bank.balance += amount;

        // 3. 将新交易记录添加到列表的开头（让最新的显示在最前面）
        chat.characterPhoneData.bank.transactions.unshift(newTransaction);

        // 4. 将更新后的角色数据保存回数据库
        await db.chats.put(chat);

        console.log(
            `✅ 钱包同步成功: 角色[${chat.name
            }], 交易[${description}], 金额[${amount.toFixed(
                2
            )}], 新余额[${chat.characterPhoneData.bank.balance.toFixed(2)}]`
        );
    }

    let isIntentionalStop = false;
    window.isTtsPlaying = false;
    window.currentTtsAudioBubble = null;

    /**
     * 查找从指定位置开始的所有连续AI语音消息
     * @param {Array} history - 完整的聊天历史记录数组
     * @param {number} startIndex - 开始查找的索引位置
     * @returns {Array} - 一个包含所有连续AI语音消息对象的数组
     */
    window.findConsecutiveAiVoiceMessages = findConsecutiveAiVoiceMessages; // Expose to global
    function findConsecutiveAiVoiceMessages(history, startIndex) {
        const messagesToPlay = [];
        if (startIndex < 0 || startIndex >= history.length) {
            return messagesToPlay;
        }

        // 从点击的那条消息开始，向后遍历
        for (let i = startIndex; i < history.length; i++) {
            const msg = history[i];
            // 检查这条消息是否是AI发送的，并且类型是语音
            if (msg.role === 'assistant' && msg.type === 'voice_message') {
                messagesToPlay.push(msg); // 如果是，就把它加入待播放列表
            } else {
                // 一旦遇到不是AI语音的消息（比如用户的回复，或AI的图片/文字消息），就立刻停止查找
                break;
            }
        }
        return messagesToPlay;
    }
    /**
     * 停止当前正在播放的Minimax TTS语音
     */
    window.stopMinimaxAudio = stopMinimaxAudio; // Expose
    function stopMinimaxAudio() {
        if (!window.isTtsPlaying) return;

        isIntentionalStop = true;
        const ttsPlayer = document.getElementById('tts-audio-player');
        ttsPlayer.pause();
        ttsPlayer.src = ''; // 这会触发 onerror 事件，从而执行清理

        if (window.currentAnimatingBubbles) {
            window.currentAnimatingBubbles.forEach((b) => {
                const spinner = b.querySelector('.loading-spinner');
                if (spinner) spinner.style.display = 'none';
                b.classList.remove('playing');
            });
        }

        window.isTtsPlaying = false;
        window.currentTtsAudioBubble = null;
        window.currentAnimatingBubbles = null;

        setTimeout(() => {
            isIntentionalStop = false;
        }, 100);
    }

    /**
     * 【辅助函数】将Hex字符串转换为可播放的Blob URL
     * @param {string} hex - 十六进制编码的音频数据
     * @returns {string|null} - Blob URL 或 null
     */
    function hexToBlobUrl(hex) {
        if (!hex) return null;
        const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
        const length = cleanHex.length;
        if (length % 2 !== 0) {
            console.error('Hex string has an odd length.');
            return null;
        }
        const buffer = new Uint8Array(length / 2);
        for (let i = 0; i < length; i += 2) {
            buffer[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
        }
        // 根据文档，推荐使用 mp3 格式
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
    }

    /**
     * 调用 Minimax TTS API 生成语音并播放
     * @param {string} text - 要转换为语音的合并后的文本
     * @param {string} voiceId - Minimax 的语音 ID
     * @param {Array<HTMLElement>} bubblesToAnimate - 需要播放动画的所有语音气泡元素的数组
     */
    window.playMinimaxAudio = playMinimaxAudio; // Expose
    async function playMinimaxAudio(text, voiceId, bubblesToAnimate) {
        stopMinimaxAudio();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const ttsPlayer = document.getElementById('tts-audio-player');
        const firstBubble = bubblesToAnimate[0];
        if (!firstBubble) return;

        window.isTtsPlaying = true;
        window.currentTtsAudioBubble = firstBubble;
        window.currentAnimatingBubbles = bubblesToAnimate;
        bubblesToAnimate.forEach((b) => {
            const spinner = b.querySelector('.loading-spinner');
            if (spinner) spinner.style.display = 'block';
        });

        const mainAudioPlayer = document.getElementById('audio-player');
        if (mainAudioPlayer && !mainAudioPlayer.paused) {
            mainAudioPlayer.pause();
            state.musicState.isPlaying = false;
            updatePlayerUI();
        }

        const groupId = state.apiConfig.minimaxGroupId;
        const apiKey = state.apiConfig.minimaxApiKey;
        if (!groupId || !apiKey) {
            await showCustomAlert('语音播放失败', '尚未配置Minimax的Group ID和API Key。');
            stopMinimaxAudio();
            return;
        }

        const chat = state.chats[state.activeChatId];
        if (!chat) {
            stopMinimaxAudio();
            return;
        }

        const provider = state.apiConfig.minimaxProvider || 'cn';
        const speechModel = state.apiConfig.minimaxSpeechModel || 'speech-01-turbo';
        const baseUrl = provider === 'cn' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';
        const requestUrl = `${baseUrl}/v1/t2a_v2`;
        // 1. 从当前角色的设置中读取语速和语言增强
        const speed = chat.settings.speed ?? 1.0;
        const langBoost = chat.settings.language_boost; // 如果是null或undefined, 就让它是null/undefined

        const textForTts = text.replace(/\(.*?\)|（.*?）|【.*?】/g, '').trim();

        // 2. 构建包含新参数的请求体
        const requestBody = {
            model: speechModel,
            text: textForTts, // <--- 核心修改在这里！使用过滤后的文本
            voice_setting: {
                voice_id: voiceId,
                speed: speed, // ★ 在这里加入语速
            },
        };

        // 3. 如果 language_boost 有效，才将它添加到请求体中
        if (langBoost) {
            requestBody.language_boost = langBoost;
        }

        console.log(`[Minimax TTS] Request to ${requestUrl}`, requestBody);

        try {
            const response = await fetch(`${requestUrl}?GroupId=${groupId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (!response.ok || (result.base_resp && result.base_resp.status_code !== 0)) {
                throw new Error(`API错误码 ${result.base_resp?.status_code || response.status}: ${result.base_resp?.status_msg || response.statusText}`);
            }

            if (!result.data || !result.data.audio) {
                throw new Error('API响应中未找到有效的音频数据。');
            }

            const audioUrl = hexToBlobUrl(result.data.audio);
            if (!audioUrl) {
                throw new Error('Hex音频数据转换失败。');
            }

            bubblesToAnimate.forEach((b) => {
                const spinner = b.querySelector('.loading-spinner');
                if (spinner) spinner.style.display = 'none';
                b.classList.add('playing');
            });

            ttsPlayer.src = audioUrl;

            const cleanupAndReset = () => {
                if (window.isTtsPlaying) {
                    window.isTtsPlaying = false;
                    URL.revokeObjectURL(audioUrl);
                    if (window.currentAnimatingBubbles) {
                        window.currentAnimatingBubbles.forEach((b) => b.classList.remove('playing'));
                    }
                    currentTtsAudioBubble = null;
                    window.currentAnimatingBubbles = null;
                }
            };

            ttsPlayer.onended = cleanupAndReset;

            ttsPlayer.onerror = (e) => {
                if (!isIntentionalStop) {
                    console.error('TTS音频播放时发生错误:', e);
                }
                cleanupAndReset();
            };

            await ttsPlayer.play();
        } catch (error) {
            console.error('Minimax TTS 调用失败:', error);
            await showCustomAlert('语音合成失败', `错误信息: ${error.message}`);
            stopMinimaxAudio();
        }
    }

    // 角色手机外观预设功能核心函数

    /**
     * 启用或禁用角色手机预设管理按钮
     * @param {boolean} isEnabled - 是否启用
     */
    function toggleCharPhonePresetButtons(isEnabled) {
        document.getElementById("apply-char-phone-preset-btn").disabled =
            !isEnabled;
        document.getElementById("update-char-phone-preset-btn").disabled =
            !isEnabled;
        document.getElementById("rename-char-phone-preset-btn").disabled =
            !isEnabled;
        document.getElementById("delete-char-phone-preset-btn").disabled =
            !isEnabled;
        document.getElementById("export-char-phone-preset-btn").disabled =
            !isEnabled;
    }

    // 心声背景更换功能核心函数

    /**
     * 当用户点击“更换背景”按钮时，弹出操作菜单
     */
    async function handleInnerVoiceBgChange() {
        const choice = await showChoiceModal('更换心声背景', [
            { text: '上传新背景', value: 'upload' },
            { text: '恢复默认', value: 'reset' },
        ]);

        if (choice === 'upload') {
            // 触发隐藏的文件选择器
            document.getElementById('inner-voice-bg-input').click();
        } else if (choice === 'reset') {
            // 调用保存函数并传入空字符串，表示恢复默认
            await saveInnerVoiceBackground('');
        }
    }

    /**
     * 保存新的背景图片URL到【当前角色】
     * @param {string} url - 图片的URL (可以是网络链接或Base64)
     */
    async function saveInnerVoiceBackground(url) {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 1. 将背景URL保存在当前角色的数据中
        chat.innerVoiceBackground = url;

        // 2. 将更新后的整个 chat 对象保存回数据库
        await db.chats.put(chat);

        // 3. 立即应用新的背景
        applyInnerVoiceBackground(url);

        // 4. 给用户一个反馈
        alert(url ? '当前角色背景已更新！' : '当前角色背景已恢复默认。');
    }

    /**
     * 将指定的背景图应用到心声面板上
     * @param {string} url - 图片的URL
     */
    function applyInnerVoiceBackground(url) {
        const panel = document.getElementById('inner-voice-main-panel');
        if (!panel) return;

        if (url) {
            panel.style.backgroundImage = `url(${url})`;
        } else {
            // 如果URL为空，就移除背景图，恢复CSS中定义的默认样式
            panel.style.backgroundImage = 'none';
        }
    }

    function calculateTokenCount(text) {
        if (!text) return 0;
        // 简单估算：如果是中文环境，通常可以直接用字符数作为参考
        // 或者粗略估算：Token ≈ 字符数
        // 如果你想显示的数值小一点（更接近GPT的Token），可以乘以 0.7
        return text.length;
    }

    /**
     * 【升级版】获取Token详情 + 异常消息检测
     * @param {string} chatId - 目标聊天的ID
     */
    async function getTokenDetailedBreakdown(chatId) {
        const chat = state.chats[chatId];
        if (!chat) return null;

        const settings = chat.settings;
        const breakdown = [];
        const outlierThreshold = 300; // 设定阈值：超过300字符被视为"大消息"
        let outliers = []; // 用于存储异常大的消息

        // ... (前1-4部分保持不变: 人设、世界书、表情包、总结) ...
        // 1. 核心人设
        let personaText = chat.isGroup ? `群聊...${chat.members.map((m) => m.persona).join('')}` : (chat.settings.aiPersona || '') + (chat.settings.myPersona || '');
        breakdown.push({ name: '核心人设', count: calculateTokenCount(personaText) });

        // 2. 世界书
        let wbText = '';
        if (settings.linkedWorldBookIds) {
            wbText = settings.linkedWorldBookIds
                .map((id) => {
                    const b = state.worldBooks.find((wb) => wb.id === id);
                    return b ? b.content : '';
                })
                .join('');
        }
        breakdown.push({ name: '世界书', count: calculateTokenCount(wbText) });

        // 3. 表情包定义
        let stickerText = '';
        const allStickers = [...(settings.stickerLibrary || []), ...(state.charStickers || [])];
        if (allStickers.length > 0) stickerText = allStickers.map((s) => s.name).join('');
        breakdown.push({ name: '表情包定义', count: calculateTokenCount(stickerText) });

        // 4. 长期记忆
        const summaryText = chat.history
            .filter((m) => m.type === 'summary')
            .map((s) => s.content)
            .join('');
        breakdown.push({ name: '长期记忆(总结)', count: calculateTokenCount(summaryText) });

        // 5. 短期记忆 (对话) - 【核心修改部分】
        const history = chat.history.filter((msg) => !msg.isHidden);
        const memoryDepth = settings.maxMemory || 10;
        const contextMessages = history.slice(-memoryDepth);

        let userMsgLen = 0;
        let aiMsgLen = 0;

        contextMessages.forEach((msg) => {
            let content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            let len = calculateTokenCount(content);

            // --- 异常检测逻辑 ---
            if (len > outlierThreshold) {
                outliers.push({
                    role: msg.role,
                    preview: content.substring(0, 15) + '...', // 预览前15个字
                    count: len,
                    timestamp: msg.timestamp, // 用于跳转
                });
            }
            // ------------------

            if (msg.role === 'user') userMsgLen += len;
            else aiMsgLen += len;
        });

        // 对异常消息按大小排序 (最大的在前面)
        outliers.sort((a, b) => b.count - a.count);

        breakdown.push({ name: '短期记忆(用户)', count: userMsgLen });
        breakdown.push({ name: '短期记忆(AI)', count: aiMsgLen });
        breakdown.push({ name: '系统格式指令', count: 800 });

        // 返回数据增加了 outliers 字段
        return { items: breakdown, outliers: outliers };
    }

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
     * 打开手动总结的模式选择弹窗
     */
    async function openManualSummaryOptions() {
        const choice = await showChoiceModal('手动总结', [
            { text: '总结最新内容', value: 'latest' },
            { text: '总结指定范围', value: 'range' },
        ]);

        if (choice === 'latest') {
            // 用户选择总结最新，调用主函数并传入'latest'模式
            await triggerManualSummaryNow('latest');
        } else if (choice === 'range') {
            // 用户选择总结范围，调用范围输入函数
            await promptForSummaryRange();
        }
    }

    /**
     * 提示用户输入要总结的消息范围
     */
    async function promptForSummaryRange() {
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const totalMessages = chat.history.length;
        if (totalMessages === 0) {
            alert('聊天记录为空，无法进行总结。');
            return;
        }

        // 弹出输入框，让用户输入开始序号
        const startStr = await showCustomPrompt('指定范围', `请输入开始的消息序号 (1 - ${totalMessages})`, '1', 'number');
        if (startStr === null) return; // 用户点击了取消

        const startNum = parseInt(startStr);
        if (isNaN(startNum) || startNum < 1 || startNum > totalMessages) {
            alert('请输入有效的开始序号。');
            return;
        }

        // 弹出输入框，让用户输入结束序号
        const endStr = await showCustomPrompt('指定范围', `请输入结束的消息序号 (${startNum} - ${totalMessages})`, totalMessages, 'number');
        if (endStr === null) return; // 用户点击了取消

        const endNum = parseInt(endStr);
        if (isNaN(endNum) || endNum < startNum || endNum > totalMessages) {
            alert('请输入有效的结束序号。');
            return;
        }

        // 调用主函数并传入'range'模式和具体的范围
        await triggerManualSummaryNow('range', { start: startNum, end: endNum });
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
     * 处理设置/取消管理员
     */
    async function handleToggleAdmin(memberId) {
        const chat = state.chats[state.activeChatId];
        // 权限检查：确保操作者是群主
        if (!chat || chat.ownerId !== 'user') {
            alert('你不是群主，没有权限执行此操作！');
            return;
        }

        let targetNickname;
        let isAdminNow;

        // 1. 判断操作目标是不是用户自己
        if (memberId === 'user') {
            // 如果是用户，就修改 chat.settings 里的专属标志
            // 我们使用 isUserAdmin 属性来记录用户是否是管理员
            chat.settings.isUserAdmin = !chat.settings.isUserAdmin;
            targetNickname = chat.settings.myNickname || '我';
            isAdminNow = chat.settings.isUserAdmin;
        } else {
            // 如果是其他成员，保持原有逻辑不变
            const member = chat.members.find((m) => m.id === memberId);
            if (!member) return;

            // 不能将群主设为管理员或取消其管理员身份
            if (member.id === chat.ownerId) {
                alert('不能对群主进行此操作。');
                return;
            }

            member.isAdmin = !member.isAdmin;
            targetNickname = member.groupNickname;
            isAdminNow = member.isAdmin;
        }

        await db.chats.put(chat);

        // 准备并发送系统通知消息
        const actionText = isAdminNow ? '设为管理员' : '取消了管理员身份';
        const myNickname = chat.settings.myNickname || '我';
        // 这里我们用 logSystemMessage 函数来发送通知，它会自动刷新UI
        await logSystemMessage(chat.id, `“${myNickname}”将“${targetNickname}”${actionText}。`);

        // 刷新成员管理列表的显示
        renderMemberManagementList();
    }

    /**
     * 处理设置群成员头衔
     */
    async function handleSetMemberTitle(memberId) {
        const chat = state.chats[state.activeChatId];
        // 权限检查：群主或管理员才能设置
        const isOwner = chat.ownerId === 'user';
        const isAdmin = chat.settings.isUserAdmin;

        if (!chat || (!isOwner && !isAdmin)) {
            alert('你不是群主或管理员，没有权限执行此操作！');
            return;
        }

        let targetNickname;
        let oldTitle;

        if (memberId === 'user') {
            targetNickname = chat.settings.myNickname || '我';
            oldTitle = chat.settings.myGroupTitle || '';
        } else {
            const member = chat.members.find((m) => m.id === memberId);
            if (!member) return;
            targetNickname = member.groupNickname;
            oldTitle = member.groupTitle || '';
        }

        const newTitle = await showCustomPrompt(`为“${targetNickname}”设置头衔`, '留空则为取消头衔', oldTitle);

        if (newTitle !== null) {
            const trimmedTitle = newTitle.trim();

            if (memberId === 'user') {
                chat.settings.myGroupTitle = trimmedTitle;
            } else {
                const member = chat.members.find((m) => m.id === memberId);
                if (member) member.groupTitle = trimmedTitle;
            }

            await db.chats.put(chat);

            const myNickname = chat.settings.myNickname || '我';
            await logTitleChange(chat.id, myNickname, targetNickname, trimmedTitle);

            renderMemberManagementList();
        }
    }

    /**
     * 处理转让群主 (已添加系统消息通知)
     */
    async function handleTransferOwnership(memberId) {
        const chat = state.chats[state.activeChatId];
        const newOwner = chat.members.find((m) => m.id === memberId);
        if (!newOwner) return;

        // 获取旧群主的昵称，也就是你自己的昵称
        const oldOwnerNickname = chat.settings.myNickname || '我';

        const confirmed = await showCustomConfirm('转让群主', `你确定要将群主身份转让给“${newOwner.groupNickname}”吗？\n此操作不可撤销，你将失去群主权限。`, { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            // 更新群主ID
            chat.ownerId = newOwner.id;

            // 将新群主设为管理员（如果他之前不是）
            newOwner.isAdmin = true;

            // 1. 构建系统消息的内容
            const message = `“${oldOwnerNickname}”已将群主转让给“${newOwner.groupNickname}”`;

            // 2. 调用你已有的函数来发送这条系统消息
            //    这个函数会自动保存数据并刷新聊天列表，非常方便！
            await logSystemMessage(chat.id, message);

            // 刷新成员管理列表的显示
            renderMemberManagementList();

            // 给出成功提示
            await showCustomAlert('操作成功', `群主已成功转让给“${newOwner.groupNickname}”。`);
        }
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
     * 记录并发送群头衔变更的系统消息
     * @param {string} chatId - 发生变更的群聊ID
     * @param {string} actorName - 执行操作的人的昵称
     * @param {string} targetName - 被修改头衔的人的昵称
     * @param {string} newTitle - 新的头衔
     */
    async function logTitleChange(chatId, actorName, targetName, newTitle) {
        // 1. 构造消息内容
        const messageContent = newTitle ? `${actorName} 将“${targetName}”的群头衔修改为“${newTitle}”` : `${actorName} 取消了“${targetName}”的群头衔`;

        // 2. 调用通用的系统消息函数
        await logSystemMessage(chatId, messageContent);
    }

    /* 群公告功能核心函数 */

    /**
     * 打开群公告弹窗并渲染内容
     */
    function openGroupAnnouncementModal() {
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) return;

        const modal = document.getElementById('group-announcement-modal');
        const contentArea = document.getElementById('announcement-content-area');
        const footer = document.getElementById('announcement-footer');

        const announcement = chat.settings.groupAnnouncement || '暂无公告';
        contentArea.innerHTML = announcement.replace(/\n/g, '<br>');

        const canEdit = chat.ownerId === 'user' || chat.settings.isUserAdmin;

        footer.innerHTML = '';
        if (canEdit) {
            const editBtn = document.createElement('button');
            editBtn.className = 'cancel';
            editBtn.textContent = '编辑';
            // 改用 addEventListener 来绑定事件，更安全可靠
            editBtn.addEventListener('click', editGroupAnnouncement);
            footer.appendChild(editBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'save';
        closeBtn.textContent = '关闭';
        // 同样改用 addEventListener
        closeBtn.addEventListener('click', closeGroupAnnouncementModal);
        footer.appendChild(closeBtn);

        modal.classList.add('visible');
    }

    /**
     * 进入公告编辑模式
     */
    function editGroupAnnouncement() {
        const chat = state.chats[state.activeChatId];
        const contentArea = document.getElementById('announcement-content-area');
        const footer = document.getElementById('announcement-footer');

        const currentContent = chat.settings.groupAnnouncement || '';
        contentArea.innerHTML = `<textarea id="announcement-editor">${currentContent}</textarea>`;

        // 这里也全部改用 addEventListener 的方式绑定
        footer.innerHTML = ''; // 先清空

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', closeGroupAnnouncementModal); // 直接调用函数

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', saveGroupAnnouncement); // 直接调用函数

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);

        document.getElementById('announcement-editor').focus();
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
     * 关闭群公告弹窗
     */
    function closeGroupAnnouncementModal() {
        // 关闭后，重新渲染一次查看状态，以防用户取消了编辑
        const modal = document.getElementById('group-announcement-modal');
        modal.classList.remove('visible');
        // 延迟一点点再打开，可以避免视觉上的冲突
        setTimeout(() => {
            if (modal.classList.contains('visible')) {
                // 做个检查，万一用户快速操作
                openGroupAnnouncementModal();
            }
        }, 10);
        // 直接关闭，不再重新打开
        document.getElementById('group-announcement-modal').classList.remove('visible');
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

    // 用户表情包批量删除核心函数

    // toggle/exit StickerSelectionMode moved to apps/QQ/functions.js

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
     * 打开AI生成群成员的模态框
     */
    function openAiGenerateMembersModal() {
        // 清空上次的输入
        document.getElementById('ai-member-count-input').value = '3';
        document.getElementById('ai-member-prompt-input').value = '';
        // 显示弹窗
        document.getElementById('ai-generate-members-modal').classList.add('visible');
    }

    /**
     * 处理用户点击“开始生成”按钮的逻辑
     */
    async function handleGenerateMembers() {
        if (!state.activeChatId) return;
        const chat = state.chats[state.activeChatId];
        if (!chat || !chat.isGroup) return;

        const count = parseInt(document.getElementById('ai-member-count-input').value);
        const requirements = document.getElementById('ai-member-prompt-input').value.trim();

        if (isNaN(count) || count < 1 || count > 20) {
            alert('请输入1到20之间的有效人数！');
            return;
        }

        document.getElementById('ai-generate-members-modal').classList.remove('visible');
        await showCustomAlert('请稍候...', `AI正在为“${chat.name}”创造 ${count} 位新朋友...`);

        const systemPrompt = `
			# 任务
			你是一个群聊成员生成器。请根据用户的要求，为群聊“${chat.name}”创建${count}个新成员。

			# 用户要求:
			${requirements || '无特殊要求，请自由发挥。'}

			# 核心规则
			1.  你生成的每个成员都必须有独特的名字(name)和鲜明的性格人设(persona)。
			2.  人设描述要生动、具体，能体现出角色的特点。
			3.  【格式铁律】: 你的回复【必须且只能】是一个严格的JSON数组，直接以'['开头, 以']'结尾。数组中的每个元素都是一个代表成员的JSON对象。

			# JSON输出格式示例:
			[
			  {
			    "name": "林风",
			    "persona": "一个阳光开朗的运动系少年，热爱篮球，性格直爽，是团队里的气氛担当。"
			  },
			  {
			    "name": "陈雪",
			    "persona": "文静内向的学霸少女，喜欢读书和画画，心思细腻，不善言辞但观察力敏锐。"
			  }
			]
			`;

        try {
            const { proxyUrl, apiKey, model } = state.apiConfig;
            let isGemini = proxyUrl === GEMINI_API_URL;
            let messagesForApi = [{ role: 'user', content: systemPrompt }];
            let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);

            const response = isGemini
                ? await fetch(geminiConfig.url, geminiConfig.data)
                : await fetch(`${proxyUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: model, messages: messagesForApi, temperature: 1.0 }),
                });

            if (!response.ok) throw new Error(`API请求失败: ${response.status} - ${await response.text()}`);

            const data = await response.json();
            const rawContent = (isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content).replace(/^```json\s*|```$/g, '').trim();
            const newMembersData = JSON.parse(rawContent);

            if (Array.isArray(newMembersData) && newMembersData.length > 0) {
                const addedNames = [];
                newMembersData.forEach((memberData, index) => {
                    if (memberData.name && memberData.persona) {
                        const newMember = {
                            id: 'npc_' + (Date.now() + index),
                            originalName: memberData.name.trim(),
                            groupNickname: memberData.name.trim(),
                            avatar: defaultGroupMemberAvatar,
                            persona: memberData.persona.trim(),
                            avatarFrame: '',
                            isAdmin: false,
                            groupTitle: '',
                        };
                        chat.members.push(newMember);
                        addedNames.push(`“${newMember.groupNickname}”`);
                    }
                });

                if (addedNames.length > 0) {
                    await db.chats.put(chat);
                    await logSystemMessage(chat.id, `邀请了 ${addedNames.length} 位新成员: ${addedNames.join('、')}加入了群聊。`);
                    await showCustomAlert('生成成功！', `${addedNames.length} 位新成员已加入群聊！`);
                    renderMemberManagementList(); // 刷新成员管理列表
                } else {
                    throw new Error('AI返回的数据格式不正确，缺少name或persona字段。');
                }
            } else {
                throw new Error('AI返回的数据不是有效的数组。');
            }
        } catch (error) {
            console.error('AI生成群成员失败:', error);
            await showCustomAlert('生成失败', `发生了一个错误：\n${error.message}`);
        }
    }

    // renderStickerCategories, openStickerCategoryModal, handleMoveStickers moved to apps/QQ/functions.js

    // 视频通话控制按钮的事件委托
    // handleCallControls and handleUserSpeakInCall moved to functions.js

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

    /**
     * 打开高级导入导出模态框，并动态生成选项列表
     */
    async function openAdvancedTransferModal() {
        const appsListEl = document.getElementById('export-apps-list');
        const charactersListEl = document.getElementById('export-characters-list');
        appsListEl.innerHTML = '';
        charactersListEl.innerHTML = '';

        // 1. 定义可独立导出的App数据及其关联的数据库表
        const appsToExport = [
            { id: 'weibo', name: '微博 (全部帖子/角色资料/粉丝数等)', tables: ['weiboPosts', 'qzoneSettings'] },
            {
                id: 'forum',
                name: '圈子 (小组/帖子/评论/分类/连载)',
                tables: ['forumGroups', 'forumPosts', 'forumComments', 'forumCategories', 'forumSeries', 'forumChapters'],
            },
            {
                id: 'taobao',
                name: '桃宝 (所有商品/订单/购物车/余额记录)',
                tables: ['taobaoProducts', 'taobaoOrders', 'taobaoCart', 'userWalletTransactions'],
            },
            { id: 'worldBooks', name: '世界书 (全部书籍及分类)', tables: ['worldBooks', 'worldBookCategories'] },

            {
                id: 'dateALive',
                name: '约会大作战 (场景/预设/立绘/历史)',
                tables: ['datingScenes', 'datingPresets', 'datingSpriteGroups', 'datingSprites', 'datingHistory'],
            },

            {
                id: 'tukeyAccounting',
                name: '兔k记账 (账户/群聊/账单/设置)',
                tables: ['tukeyAccounts', 'tukeyAccountingGroups', 'tukeyAccountingRecords', 'tukeyAccountingReplies', 'tukeyUserSettings', 'tukeyCustomConfig'],
            },

            {
                id: 'studio',
                name: '小剧场 (所有剧本/演绎记录)',
                tables: ['studioScripts', 'studioHistory'],
            },

            { id: 'userStickers', name: '我的表情包 (包含分类)', tables: ['userStickers', 'userStickerCategories'] },
            { id: 'charStickers', name: '角色通用表情包', tables: ['charStickers'] },
            {
                id: 'gameData',
                name: '游戏大厅数据 (剧本杀/飞行棋题库等)',
                tables: ['scriptKillScripts', 'ludoQuestionBanks', 'ludoQuestions'],
            },
            {
                id: 'appearance',
                name: '通用外观预设 (主题/字体/头像框等)',
                tables: ['themes', 'fontPresets', 'homeScreenPresets', 'customAvatarFrames', 'apiPresets', 'bubbleStylePresets'],
            },
        ];

        appsToExport.forEach((app) => {
            appsListEl.innerHTML += `
			            <label style="display: block; margin-bottom: 5px;">
			                <input type="checkbox" class="export-app-checkbox" value="${app.id}"> ${app.name}
			            </label>
			        `;
        });

        // 2. 加载所有单聊角色
        const characters = Object.values(state.chats).filter((chat) => !chat.isGroup);
        if (characters.length === 0) {
            charactersListEl.innerHTML = '<p>没有可导出的角色</p>';
        } else {
            characters.forEach((char) => {
                charactersListEl.innerHTML += `
			                <label style="display: block; margin-bottom: 5px;">
			                    <input type="checkbox" class="export-char-checkbox" value="${char.id}"> ${char.name}
			                </label>
			            `;
            });
        }

        // 重置并绑定全选框
        const selectAllCheckbox = document.getElementById('select-all-characters-checkbox');
        selectAllCheckbox.checked = false;

        // 使用克隆节点技巧，防止事件重复绑定
        const newSelectAllCheckbox = selectAllCheckbox.cloneNode(true);
        selectAllCheckbox.parentNode.replaceChild(newSelectAllCheckbox, selectAllCheckbox);
        newSelectAllCheckbox.addEventListener('change', (e) => {
            document.querySelectorAll('.export-char-checkbox').forEach((cb) => {
                cb.checked = e.target.checked;
            });
        });

        // 3. 显示模态框
        document.getElementById('advanced-transfer-modal').classList.add('visible');
    }





    const isImage = (text, content) => { // dummy placeholder if needed or move real function here
        // implementation found above
        return [];
    }


    /**
     * 恢复所有App名称为默认值
     */
    async function resetAppNamesToDefault() {
        // 1. 弹出确认框，防止误操作
        const confirmed = await showCustomConfirm('恢复默认名称', '确定要将所有App的名称恢复为默认设置吗？此操作不可撤销。', { confirmButtonClass: 'btn-danger' });

        if (confirmed) {
            // 2. 清空存储自定义名称的对象
            state.globalSettings.appLabels = {};

            // 3. 将更改保存到数据库
            await db.globalSettings.put(state.globalSettings);

            // 4. 立即应用更改到UI
            applyAppLabels(); // 更新主屏幕上App的显示名称
            renderAppNameSettings(); // 刷新外观设置页面的输入框，显示回默认名

            // 5. 给出成功提示
            await showCustomAlert('操作成功', '所有App名称已恢复为默认。');
        }
    }

    window.activeGroupId = null;

    const SYMBOL_THRESHOLDS = [
        {
            id: 'first_heartbeat',
            level: 100,
            symbol: 'https://i.postimg.cc/DZSsNzMB/5BF06FFB38AAF2B394F89F6270D328D5.png',
            name: '初识心动',
            description: '心跳是故事的开始。',
        },
        {
            id: 'shining_star',
            level: 300,
            symbol: 'https://i.postimg.cc/L47gJRb3/7227080E4BF5950D1B182043D1F734DB.png',
            name: '星光闪烁',
            description: '你们的关系像星光一样开始闪耀。',
        },
        {
            id: 'burning_passion',
            level: 700,
            symbol: 'https://i.postimg.cc/yNQcnRvT/BD0C0CC3C6692D736014BACE73C07F8E.png',
            name: '热情如火',
            description: '每一次互动都让感情升温。',
        },
        {
            id: 'only_crown',
            level: 1500,
            symbol: 'https://i.postimg.cc/B6jDzvVh/92DD1E30EFEEC589E3BE0FFB630F8B4E.png',
            name: '唯一王冠',
            description: '在彼此的世界里，对方是独一无二的存在。',
        },
        {
            id: 'eternal_diamond',
            level: 5000,
            symbol: 'https://i.postimg.cc/C1RD2KQc/B0E2B3034728540DA4198357D5B8131C.png',
            name: '永恒之钻',
            description: '你们的关系如钻石般坚固而璀璨。',
        },
    ];

    /**
     * 核心：计算亲密值
     * @param {object} chat - 聊天对象
     * @returns {number} - 计算出的亲密值分数
     */
    function calculateIntimacy(chat) {
        if (!chat || !chat.settings.streak) return 0;

        // 基础分：火花天数，每天都很重要！
        const streakDays = chat.settings.streak.currentDays || 0;
        const streakScore = streakDays * 15; // 每天火花提供15点基础分

        // 互动分：累计消息总数
        const stats = chat.interactionStats || {};
        const totalMessages = Object.values(stats).reduce((sum, count) => sum + count, 0);
        const messageScore = totalMessages * 0.2; // 每条消息提供0.2点互动分

        const intimacy = streakScore + messageScore;
        return Math.floor(intimacy); // 返回整数
    }

    /**
     * 核心：检查并解锁新的徽章
     * @param {object} chat - 聊天对象
     * @param {number} intimacyValue - 当前的亲密值
     * @returns {Promise<boolean>} - 如果有新徽章解锁，返回true
     */
    async function checkAndUnlockSymbols(chat, intimacyValue) {
        let newUnlock = false;
        if (!chat.unlockedSymbols) chat.unlockedSymbols = [];

        SYMBOL_THRESHOLDS.forEach((threshold) => {
            // 检查：亲密值是否达标？这个徽章是不是还没解锁过？
            if (intimacyValue >= threshold.level && !chat.unlockedSymbols.some((s) => s.symbol === threshold.symbol)) {
                // 如果都满足，就解锁！
                chat.unlockedSymbols.push({
                    symbol: threshold.symbol,
                    name: threshold.name,
                    unlockedAt: Date.now(), // 记录解锁的精确时间
                });
                newUnlock = true;
                console.log(`徽章解锁！角色: ${chat.name}, 徽章: ${threshold.name}`);
            }
        });

        // 如果有新解锁的徽章，就更新数据库并弹窗提示
        if (newUnlock) {
            await db.chats.put(chat);
            // 找到最新解锁的那个徽章来显示通知
            const latestUnlock = chat.unlockedSymbols[chat.unlockedSymbols.length - 1];
            await showCustomAlert('新徽章已解锁！', `恭喜你和“${chat.name}”解锁了新的亲密徽章：${latestUnlock.name}`);
        }
        return newUnlock;
    }

    async function openIntimacyPanel(chatId) {
        const chat = state.chats[chatId];
        if (!chat) return;

        // --- 数据计算 ---
        const intimacyValue = calculateIntimacy(chat);
        await checkAndUnlockSymbols(chat, intimacyValue);

        // --- 填充UI (这部分逻辑不变) ---
        document.getElementById('intimacy-score-display').textContent = intimacyValue;
        const today = new Date().toISOString().split('T')[0];
        const todayMsgs = chat.interactionStats?.[today] || 0;
        const totalMsgs = Object.values(chat.interactionStats || {}).reduce((sum, count) => sum + count, 0);
        document.getElementById('intimacy-streak-days').textContent = `${chat.settings.streak?.currentDays || 0} 天`;
        document.getElementById('intimacy-today-msgs').textContent = `${todayMsgs} 条`;
        document.getElementById('intimacy-total-msgs').textContent = `${totalMsgs} 条`;

        // --- 渲染可点击的徽章列表 ---
        const symbolListContainer = document.getElementById('symbol-list-container');
        symbolListContainer.innerHTML = '';

        // 添加一个“不佩戴”的选项
        const noneItem = document.createElement('div');
        noneItem.className = 'symbol-item unlocked'; // 让它总是可点击
        if (!chat.settings.selectedIntimacyBadge) {
            noneItem.classList.add('selected'); // 如果当前没佩戴，就高亮这个
        }
        noneItem.innerHTML = `<div class="symbol-icon no-badge">🚫</div><div class="symbol-name">不佩戴</div>`;
        noneItem.onclick = () => selectIntimacyBadge(chatId, ''); // 点击时，传入空字符串表示不佩戴
        symbolListContainer.appendChild(noneItem);

        // 渲染所有可解锁的徽章
        SYMBOL_THRESHOLDS.forEach((threshold) => {
            const isUnlocked = intimacyValue >= threshold.level;
            const isSelected = chat.settings.selectedIntimacyBadge === threshold.symbol;

            const item = document.createElement('div');
            item.className = `symbol-item ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}`;

            // 使用 <img> 标签来显示图片
            item.innerHTML = `
			            <div class="symbol-icon ${!isUnlocked ? 'not-unlocked' : ''}">
			                <img src="${threshold.symbol}" alt="${threshold.name}">
			            </div>
			            <div class="symbol-name">${threshold.name}</div>
			            <div class="symbol-level">${isUnlocked ? '已解锁' : `${threshold.level}分解锁`}</div>
			        `;

            // 只有解锁了的徽章才能点击
            if (isUnlocked) {
                item.onclick = () => selectIntimacyBadge(chatId, threshold.symbol);
            }

            symbolListContainer.appendChild(item);
        });

        // --- 渲染解锁记录 ---
        const recordsContainer = document.getElementById('unlocked-symbols-record');
        recordsContainer.innerHTML = '';
        if (chat.unlockedSymbols && chat.unlockedSymbols.length > 0) {
            const sortedRecords = [...chat.unlockedSymbols].sort((a, b) => b.unlockedAt - a.unlockedAt);
            sortedRecords.forEach((record) => {
                const recordItem = document.createElement('div');
                recordItem.className = 'record-item';
                recordItem.innerHTML = `<span class="symbol"><img src="${record.symbol}" style="height:1em; vertical-align:middle;"></span><span>${record.name}</span><span class="date">${new Date(record.unlockedAt).toLocaleDateString()}</span>`;
                recordsContainer.appendChild(recordItem);
            });
        } else {
            recordsContainer.innerHTML = '<p style="text-align:center; color:#999; font-size:13px;">暂无已解锁的徽章</p>';
        }

        // --- 显示面板 ---
        document.getElementById('intimacy-panel').classList.add('visible');
    }

    /**
     * 选择并佩戴一个亲密徽章
     * @param {string} chatId - 角色ID
     * @param {string} symbol - 要佩戴的徽章符号，或''表示不佩戴
     */
    async function selectIntimacyBadge(chatId, symbol) {
        const chat = state.chats[chatId];
        if (!chat) return;

        // 更新选择
        chat.settings.selectedIntimacyBadge = symbol;

        // 保存到数据库
        await db.chats.put(chat);

        // 重新渲染面板，更新高亮状态
        await openIntimacyPanel(chatId);

        // 重新渲染聊天列表，让徽章立刻显示出来
        await renderChatList();
    }

    /**
     * 核心：为指定聊天的今天消息数+1
     * @param {string} chatId - 聊天ID
     */
    window.incrementMessageCount = incrementMessageCount; // Expose to global
    async function incrementMessageCount(chatId) {
        const chat = state.chats[chatId];
        // 只为单人聊天计数
        if (!chat || chat.isGroup) return;

        const today = new Date().toISOString().split('T')[0]; // 获取 YYYY-MM-DD 格式的日期

        if (!chat.interactionStats) {
            chat.interactionStats = {};
        }

        chat.interactionStats[today] = (chat.interactionStats[today] || 0) + 1;

        // 将更新后的聊天数据保存回数据库
        await db.chats.put(chat);
    }

    /**
     * 获取或生成当前设备的唯一设备码
     * @returns {string} - 一长串唯一的设备码
     */
    function getDeviceCode() {
        const deviceIdKey = 'ephone-device-code';
        let deviceId = localStorage.getItem(deviceIdKey);
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(deviceIdKey, deviceId);
        }
        return deviceId;
    }
    window.getDeviceCode = getDeviceCode;


    /**
     * 根据设备码生成对应的PIN码 (这个函数必须和 get_pin.html 中的完全一致！)
     * @param {string} deviceCode - 设备码
     * @returns {string} - 6位大写的PIN码
     */
    function generatePinFromDeviceCode(deviceCode) {
        if (!deviceCode || deviceCode.length < 6) return 'INVALID';
        // 算法：将设备码反转，取前6位，转大写
        return deviceCode.split('').reverse().join('').substring(0, 6).toUpperCase();
    }
    window.generatePinFromDeviceCode = generatePinFromDeviceCode;

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

    /**
     * 切换世界书的编辑模式
     */
    // World Book helper functions (toggleWorldBookEditMode, handleWorldBookListClick, updateWorldBookDeleteButton, handleBulkDeleteWorldBooks, deleteCategory, createWorldBookGroup) moved to worldbooks.js


    // 快捷回复 (Quick Reply) functions moved to apps/QQ/functions.js


    /* 时间轴/存档功能核心函数 (已移动至 apps/QQ/functions.js) */


    /* 漫游书架/极光模式功能已移至 apps/QQ/functions.js */


    // repairAllData moved to settings.js


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
        window.openLoversSpaceFromCard = openLoversSpaceFromCard;
        window.renderChatListProxy = renderChatList;
        window.renderApiSettingsProxy = window.renderApiSettings;
        window.renderWallpaperScreenProxy = renderWallpaperScreen;
        window.renderWorldBookScreenProxy = () => { if (window.WorldBookModule) window.WorldBookModule.renderWorldBookScreen(); };

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

        // Init external modules
        if (typeof window.initLoversSpace === 'function') initLoversSpace();
        if (typeof window.initTaobao === 'function') initTaobao();
        if (typeof window.initTukeyAccounting === 'function') initTukeyAccounting();
        if (typeof window.initKkCheckin === 'function') initKkCheckin();

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
                updateSettingsPreview: typeof updateSettingsPreview !== 'undefined' ? updateSettingsPreview : undefined,
                renderBubblePresetSelector: typeof renderBubblePresetSelector !== 'undefined' ? renderBubblePresetSelector : undefined,
                handlePresetSelectChange: typeof handlePresetSelectChange !== 'undefined' ? handlePresetSelectChange : undefined,
                openBubblePresetManager: typeof openBubblePresetManager !== 'undefined' ? openBubblePresetManager : undefined,
                exportSelectedBubblePreset: typeof exportSelectedBubblePreset !== 'undefined' ? exportSelectedBubblePreset : undefined,
                importBubblePreset: typeof importBubblePreset !== 'undefined' ? importBubblePreset : undefined,
                resetBubblePreset: typeof resetBubblePreset !== 'undefined' ? resetBubblePreset : undefined,
                renderOfflinePresetsSelector: typeof renderOfflinePresetsSelector !== 'undefined' ? renderOfflinePresetsSelector : undefined,
                openFrameSelectorModal: typeof openFrameSelectorModal !== 'undefined' ? openFrameSelectorModal : undefined,
                defaultAvatar, defaultGroupAvatar, defaultMyGroupAvatar,
                appendMessage: typeof appendMessage !== 'undefined' ? appendMessage : window.appendMessage,
                openCharStickerManager: window.openCharStickerManager,
                openNpcManager: typeof openNpcManager !== 'undefined' ? openNpcManager : undefined,
                openManualSummaryOptions: typeof openManualSummaryOptions !== 'undefined' ? openManualSummaryOptions : undefined,
                openMemberManagementScreen: typeof openMemberManagementScreen !== 'undefined' ? openMemberManagementScreen : undefined,
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



        // Character sticker management listeners moved to apps/QQ/functions.js

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

        document.getElementById('import-character-card-btn').addEventListener('click', async () => {
            const unlockKey = 'isCharacterImportUnlocked';

            // 1. 检查是否已经解锁
            if (localStorage.getItem(unlockKey) === 'true') {
                document.getElementById('character-card-input').click();
                return;
            }

            // 2. 如果未解锁，获取设备码
            const deviceCode = getDeviceCode();

            // 3. 构建一个包含设备码和输入框的HTML内容
            const modalHtmlContent = `
			        <p style="margin-bottom: 15px;">请前往取PIN网站，使用下面的设备码获取PIN。</p>
			        <div style="background: #eee; padding: 10px; border-radius: 6px; margin-bottom: 15px; user-select: all; cursor: copy;" title="点击复制设备码">
			            <strong>设备码:</strong> <span id="device-code-to-copy">${deviceCode}</span>
			        </div>
			        <p id="copy-device-code-feedback" style="height: 15px; font-size: 12px; color: green;"></p>
			    `;

            // 4. 使用 showCustomPrompt 弹出增强版模态框
            const userPin = await window.showCustomPrompt(
                '功能解锁',
                '请在此输入获取到的PIN码...', // 这是输入框的placeholder
                '',
                'text',
                modalHtmlContent // 这是我们额外添加的HTML内容
            );

            // 5. 如果用户点击了取消，则直接返回
            if (userPin === null) return;

            // 6. 验证PIN码
            const correctPin = generatePinFromDeviceCode(deviceCode);
            if (userPin.trim().toUpperCase() === correctPin) {
                localStorage.setItem(unlockKey, 'true');
                await showCustomAlert('解锁成功！', '导入功能已解锁，此设备无需再次输入PIN码。');
                document.getElementById('character-card-input').click();
            } else {
                await showCustomAlert('解锁失败', 'PIN码错误，请重新获取或输入。');
            }
        });

        // 为自定义模态框添加点击复制设备码的功能
        document.getElementById('custom-modal-body').addEventListener('click', (e) => {
            const codeElement = e.target.closest('#device-code-to-copy');
            if (codeElement) {
                const deviceCode = codeElement.textContent;
                const feedbackEl = document.getElementById('copy-device-code-feedback');
                navigator.clipboard
                    .writeText(deviceCode)
                    .then(() => {
                        if (feedbackEl) feedbackEl.textContent = '设备码已复制！';
                        setTimeout(() => {
                            if (feedbackEl) feedbackEl.textContent = '';
                        }, 2000);
                    })
                    .catch((err) => {
                        if (feedbackEl) feedbackEl.textContent = '复制失败，请手动复制。';
                    });
            }
        });

        document.getElementById('character-card-input').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // 当用户选择了文件后，调用我们的总处理函数
                handleCharacterImport(file);
            }
            // 清空选择，这样用户下次还能选择同一个文件
            event.target.value = null;
        });

        document.getElementById('phone-screen').addEventListener('click', unlockAudioContext, { once: true });

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

        // 在 init() 的事件监听器区域添加
        document.getElementById('selection-share-btn').addEventListener('click', () => {
            if (selectedMessages.size > 0) {
                openShareTargetPicker(); // 打开我们即将创建的目标选择器
            }
        });

        // 在 init() 的事件监听器区域添加
        document.getElementById('confirm-share-target-btn').addEventListener('click', async () => {
            const sourceChat = state.chats[state.activeChatId];
            const selectedTargetIds = Array.from(document.querySelectorAll('.share-target-checkbox:checked')).map((cb) => cb.dataset.chatId);

            if (selectedTargetIds.length === 0) {
                alert('请至少选择一个要分享的聊天。');
                return;
            }

            // 1. 打包聊天记录
            const sharedHistory = [];
            const sortedTimestamps = [...selectedMessages].sort((a, b) => a - b);
            for (const timestamp of sortedTimestamps) {
                const msg = sourceChat.history.find((m) => m.timestamp === timestamp);
                if (msg) {
                    sharedHistory.push(msg);
                }
            }

            // 2. 创建分享卡片消息对象
            const shareCardMessage = {
                role: 'user',
                senderName: sourceChat.isGroup ? sourceChat.settings.myNickname || '我' : '我',
                type: 'share_card',
                timestamp: Date.now(),
                payload: {
                    sourceChatName: sourceChat.name,
                    title: `来自“${sourceChat.name}”的聊天记录`,
                    sharedHistory: sharedHistory,
                },
            };

            // 3. 循环发送到所有目标聊天
            for (const targetId of selectedTargetIds) {
                const targetChat = state.chats[targetId];
                if (targetChat) {
                    targetChat.history.push(shareCardMessage);
                    await db.chats.put(targetChat);
                }
            }

            // 4. 收尾工作
            document.getElementById('share-target-modal').classList.remove('visible');
            exitSelectionMode(); // 退出多选模式
            await showCustomAlert('分享成功', `聊天记录已成功分享到 ${selectedTargetIds.length} 个会话中。`);
            renderChatList(); // 刷新列表，可能会有新消息提示
        });

        // 绑定取消按钮
        document.getElementById('cancel-share-target-btn').addEventListener('click', () => {
            document.getElementById('share-target-modal').classList.remove('visible');
        });

        // 在 init() 的事件监听器区域添加
        document.getElementById('chat-messages').addEventListener('click', (e) => {
            // 处理分享卡片的点击
            const shareCard = e.target.closest('.link-share-card[data-timestamp]');
            if (shareCard && shareCard.closest('.message-bubble.is-link-share')) {
                const timestamp = parseInt(shareCard.dataset.timestamp);
                openSharedHistoryViewer(timestamp);
            }
        });

        // 绑定查看器的关闭按钮
        document.getElementById('close-shared-history-viewer-btn').addEventListener('click', () => {
            document.getElementById('shared-history-viewer-modal').classList.remove('visible');
        });

        // 创建新函数来处理渲染逻辑
        function openSharedHistoryViewer(timestamp) {
            const chat = state.chats[state.activeChatId];
            const message = chat.history.find((m) => m.timestamp === timestamp);
            if (!message || message.type !== 'share_card') return;

            const viewerModal = document.getElementById('shared-history-viewer-modal');
            const viewerTitle = document.getElementById('shared-history-viewer-title');
            const viewerContent = document.getElementById('shared-history-viewer-content');

            viewerTitle.textContent = message.payload.title;
            viewerContent.innerHTML = ''; // 清空旧内容

            // 复用 createMessageElement 来渲染每一条被分享的消息
            message.payload.sharedHistory.forEach((sharedMsg) => {
                // 注意：这里我们传入的是 sourceChat 对象，以确保头像、昵称等正确
                const sourceChat = Object.values(state.chats).find((c) => c.name === message.payload.sourceChatName) || chat;
                const bubbleEl = createMessageElement(sharedMsg, sourceChat);
                if (bubbleEl) {
                    viewerContent.appendChild(bubbleEl);
                }
            });

            viewerModal.classList.add('visible');
        }











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

        // Category manager listeners moved to WorldBookModule


        // --- 自定义头像框功能事件绑定 ---

        // 打开“选择”弹窗的按钮
        document.getElementById('chat-settings-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('change-frame-btn')) {
                openFrameSelectorModal(e.target.dataset.type);
            }
        });
        document.getElementById('member-settings-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('change-frame-btn')) {
                openFrameSelectorModal('member', editingMemberId);
            }
        });

        // “选择”弹窗内的按钮
        // “选择”弹窗内的按钮（已修正）
        document.getElementById('manage-custom-frames-btn').addEventListener('click', () => {
            // 1. 先关闭当前的选择弹窗
            document.getElementById('avatar-frame-modal').classList.remove('visible');

            // 2. 然后再打开管理弹窗
            openFrameManager();
        });
        document.getElementById('cancel-frame-settings-btn').addEventListener('click', () => document.getElementById('avatar-frame-modal').classList.remove('visible'));
        document.getElementById('save-frame-settings-btn').addEventListener('click', saveSelectedFrames);

        // “管理”弹窗内的按钮
        document.getElementById('upload-custom-frame-btn').addEventListener('click', handleUploadCustomFrame);
        document.getElementById('close-frame-manager-btn').addEventListener('click', () => {
            document.getElementById('custom-frame-manager-modal').classList.remove('visible');
            // 关闭管理后，刷新选择界面，因为列表可能变了
            openFrameSelectorModal(currentFrameSelection.type, currentFrameSelection.target);
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
        // NPC库管理功能事件绑定

        // 聊天设置里的“管理NPC库”按钮
        document.getElementById('chat-settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'manage-npcs-btn') {
                // 先关闭聊天设置，再打开NPC管理
                document.getElementById('chat-settings-modal').classList.remove('visible');
                openNpcManager();
            }
        });

        // NPC管理界面的返回按钮
        document.getElementById('back-from-npc-management').addEventListener('click', () => {
            // 返回时，重新打开聊天设置
            showScreen('chat-interface-screen');
            document.getElementById('chat-settings-btn').click();
        });

        // NPC管理界面的“+”按钮
        document.getElementById('add-new-npc-btn').addEventListener('click', () => openNpcEditor(null));

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

        // ▼气泡样式预设导入/导出功能

        /**
         * 导出当前选中的气泡样式预设
         */
        async function exportSelectedBubblePreset() {
            const selectEl = document.getElementById('bubble-style-preset-select');
            const selectedId = parseInt(selectEl.value);

            if (!selectedId) {
                alert('请先从下拉框中选择一个要导出的预设。');
                return;
            }

            const preset = await db.bubbleStylePresets.get(selectedId);
            if (!preset) {
                alert('找不到选中的预设。');
                return;
            }

            // 准备要导出的数据
            const exportData = {
                presetName: preset.name,
                presetCss: preset.css,
            };

            // 创建并触发下载
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `[EPhone气泡]${preset.name}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * 导入气泡预设 (支持 JSON, TXT, CSS, DOCX)
         * 如果是 JSON，保存为预设；如果是 TXT/DOCX，直接填入输入框
         */
        function importBubblePreset(file) {
            if (!file) return;

            const fileName = file.name.toLowerCase();
            const customCssInput = document.getElementById('custom-css-input'); // 获取气泡CSS输入框

            // --- 情况A: Word 文档 ---
            if (fileName.endsWith('.docx')) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    mammoth
                        .extractRawText({ arrayBuffer: e.target.result })
                        .then(function (result) {
                            customCssInput.value = result.value; // 填入输入框
                            updateSettingsPreview(); // 刷新预览
                            alert('已从Word提取CSS代码到输入框！(请点击“保存”以存为预设)');
                        })
                        .catch(function (err) {
                            alert('读取Word文件失败');
                        });
                };
                reader.readAsArrayBuffer(file);
                return;
            }

            // --- 情况B: 文本文件 ---
            if (fileName.endsWith('.txt') || fileName.endsWith('.css')) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    customCssInput.value = e.target.result; // 填入输入框
                    updateSettingsPreview(); // 刷新预览
                    alert('已读取CSS代码到输入框！(请点击“保存”以存为预设)');
                };
                reader.readAsText(file);
                return;
            }

            // --- 情况C: JSON 文件 (保持原有逻辑) ---
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // 验证文件内容是否正确
                    if (data.presetName && typeof data.presetCss !== 'undefined') {
                        const newPreset = {
                            name: `${data.presetName} (导入)`,
                            css: data.presetCss,
                        };
                        const newId = await db.bubbleStylePresets.add(newPreset);

                        if (!state.bubbleStylePresets) state.bubbleStylePresets = [];
                        state.bubbleStylePresets.push({ id: newId, ...newPreset });

                        // 刷新下拉框并自动选中新导入的预设
                        renderBubblePresetSelector();
                        document.getElementById('bubble-style-preset-select').value = newId;
                        handlePresetSelectChange();
                        await showCustomAlert('导入成功', `气泡预设 "${newPreset.name}" 已成功导入！`);
                    } else {
                        // 如果不是标准预设JSON，尝试直接填入输入框
                        customCssInput.value = e.target.result;
                        updateSettingsPreview();
                        alert('JSON格式不是标准预设，已将内容填入输入框。');
                    }
                } catch (error) {
                    // 解析出错，当作纯文本填入
                    customCssInput.value = e.target.result;
                    updateSettingsPreview();
                    alert('已将文件内容填入输入框。');
                }
            };
            reader.readAsText(file);
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


        // 绑定线下模式预设的下拉框和管理按钮
        document.getElementById('offline-preset-select').addEventListener('change', handleOfflinePresetSelection);
        document.getElementById('manage-offline-presets-btn').addEventListener('click', openOfflinePresetManager);

        // 聊天总结功能事件绑定
        document.getElementById('view-summaries-btn').addEventListener('click', openSummaryViewer);
        document.getElementById('close-summary-viewer-btn').addEventListener('click', () => {
            document.getElementById('summary-viewer-modal').classList.remove('visible');
            // 关闭后重新打开设置弹窗，回到上一级
            document.getElementById('chat-settings-btn').click();
        });

        // 使用事件委托处理总结列表中的所有按钮
        document.getElementById('summary-list').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-summary-btn');
            if (editBtn) {
                const timestamp = parseInt(editBtn.dataset.timestamp);
                editSummary(timestamp);
                return;
            }

            const deleteBtn = e.target.closest('.delete-summary-btn');
            if (deleteBtn) {
                const timestamp = parseInt(deleteBtn.dataset.timestamp);
                deleteSummary(timestamp);
                return;
            }

            // 处理单条精简按钮的点击
            const conciseBtn = e.target.closest('.concise-summary-btn');
            if (conciseBtn) {
                const timestamp = parseInt(conciseBtn.dataset.timestamp);
                handleConciseSummary(timestamp);
                return;
            }
        });

        // 为“全部精简”按钮绑定事件
        document.getElementById('concise-all-summaries-btn').addEventListener('click', handleConciseAllSummaries);

        document.getElementById('chat-settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'manual-summary-btn') {
                // 点击后先关闭设置弹窗
                document.getElementById('chat-settings-modal').classList.remove('visible');
                // 【调用我们新创建的选择函数，而不是直接总结
                openManualSummaryOptions();
            }
        });

        /* 角色微博资料编辑器事件绑定 */

        // 1. 使用事件委托，为角色微博编辑弹窗内的所有按钮绑定事件
        document.getElementById('char-weibo-editor-modal').addEventListener('click', (e) => {
            // a. 如果点击的是“更换头像框”按钮
            if (e.target.classList.contains('change-frame-btn')) {
                const type = e.target.dataset.type; // 获取按钮类型 'char-weibo'
                const targetId = currentViewingWeiboProfileId; // 获取当前正在查看的角色ID

                // 调用头像框选择函数，并传入正确的参数
                openFrameSelectorModal(type, targetId);
            }
            // b. 如果点击的是“取消”按钮
            else if (e.target.id === 'cancel-char-weibo-editor-btn') {
                document.getElementById('char-weibo-editor-modal').classList.remove('visible');
            }
            // c. 如果点击的是“保存”按钮
            else if (e.target.id === 'save-char-weibo-editor-btn') {
                saveCharWeiboProfile();
            }
        });

        // 2. 为角色手机的图片上传输入框绑定事件（这是之前就有的，确保它在正确的位置）
        setupFileUpload('char-weibo-editor-avatar-input', (base64) => {
            document.getElementById('char-weibo-editor-avatar-preview').src = base64;
        });
        setupFileUpload('char-weibo-editor-bg-input', (base64) => {
            document.getElementById('char-weibo-editor-bg-preview').src = base64;
        });

        // 心声背景更换功能事件监听
        document.getElementById('change-inner-voice-bg-btn').addEventListener('click', handleInnerVoiceBgChange);

        document.getElementById('inner-voice-bg-input').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // 将图片文件转换为Base64，以便保存和显示
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            // 调用保存函数
            await saveInnerVoiceBackground(dataUrl);

            // 每次用完后清空，以便下次能选择同一个文件
            event.target.value = null;
        });

        // 情侣空间取消和解除▼▼▼
        document.getElementById('ls-cancel-space-btn').addEventListener('click', handleCancelLoversSpace);
        document.getElementById('ls-disconnect-space-btn').addEventListener('click', handleDisconnectLoversSpace);

        document.getElementById('member-management-list').addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;

            const action = button.dataset.action;
            const memberId = button.dataset.memberId;

            if (!action || !memberId) return;

            // --- 处理用户自己的按钮 ---
            if (memberId === 'user') {
                if (action === 'set-nickname') handleSetUserNickname();
                if (action === 'set-title') handleSetUserTitle();
                // 用户点击自己的“解禁”按钮
                if (action === 'unmute-self') {
                    handleUserUnmute();
                }
                return;
            }

            // --- 处理其他成员的按钮 ---
            switch (action) {
                case 'toggle-admin':
                    handleToggleAdmin(memberId);
                    break;
                case 'set-title':
                    handleSetMemberTitle(memberId);
                    break;
                case 'transfer-owner':
                    handleTransferOwnership(memberId);
                    break;
                case 'remove-member':
                    removeMemberFromGroup(memberId);
                    break;
                case 'mute-member': // 禁言/解禁统一走这里
                    handleMuteMember(memberId);
                    break;
            }
        });

        // 群公告功能事件绑定
        document.getElementById('group-announcement-btn').addEventListener('click', openGroupAnnouncementModal);

        // More sticker listeners moved to apps/QQ/functions.js

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

        // AI生成群成员功能事件绑定
        document.getElementById('ai-generate-members-btn').addEventListener('click', openAiGenerateMembersModal);
        document.getElementById('cancel-ai-generate-members-btn').addEventListener('click', () => {
            document.getElementById('ai-generate-members-modal').classList.remove('visible');
        });
        document.getElementById('confirm-ai-generate-members-btn').addEventListener('click', handleGenerateMembers);

        // 预设功能按钮
        document.getElementById('dating-preset-select').addEventListener('change', handleDatingPresetSelect);
        document.getElementById('manage-dating-presets-btn').addEventListener('click', openDatingPresetManager);

        // --- 表情分类功能事件绑定 ---
        document.getElementById('move-selected-stickers-btn').addEventListener('click', openStickerCategoryModal);
        document.getElementById('cancel-sticker-category-btn').addEventListener('click', () => {
            document.getElementById('sticker-category-modal').classList.remove('visible');
        });
        document.getElementById('confirm-sticker-category-btn').addEventListener('click', handleMoveStickers);
        // 高级导入/导出功能事件监听器
        document.getElementById('advanced-transfer-btn').addEventListener('click', openAdvancedTransferModal);

        document.getElementById('close-advanced-transfer-btn').addEventListener('click', () => {
            document.getElementById('advanced-transfer-modal').classList.remove('visible');
        });

        document.getElementById('export-selected-data-btn').addEventListener('click', exportChunkedData);

        document.getElementById('import-chunked-data-btn').addEventListener('click', () => {
            document.getElementById('import-chunked-data-input').click();
        });

        document.getElementById('import-chunked-data-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importChunkedData(file);
            }
            e.target.value = null; // 清空以便下次选择
        });
        document.getElementById('export-for-330-btn').addEventListener('click', exportDataFor330);

        // 为“兼容330格式导入”按钮绑定事件
        document.getElementById('import-from-330-btn').addEventListener('click', () => {
            // 点击按钮时，触发隐藏的文件选择器
            document.getElementById('import-from-330-input').click();
        });

        // 为隐藏的文件选择器绑定change事件
        document.getElementById('import-from-330-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 当用户选择了文件后，调用我们的核心导入函数
                importFrom330Format(file);
            }
            // 每次用完后清空，这样用户下次还能选择同一个文件
            e.target.value = null;
        });

        document.getElementById('compress-all-images-btn').addEventListener('click', compressAllImagesInDB);
        document.getElementById('export-data-stream-btn').addEventListener('click', exportDataStream);
        // 在 init() 函数的事件监听器区域末尾，粘贴下面这行代码
        document.getElementById('reset-app-names-btn').addEventListener('click', resetAppNamesToDefault);
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

        // Sticker category tabs listener moved to apps/QQ/functions.js

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

        document.getElementById('open-intimacy-panel-btn').addEventListener('click', () => openIntimacyPanel(state.activeChatId));

        // 使用事件委托，为动态页面的头部按钮绑定事件
        document.getElementById('qzone-screen').addEventListener('click', (e) => {
            // 检查点击的是否是清空按钮
            const clearBtn = e.target.closest('#clear-qzone-posts-btn');
            if (clearBtn) {
                clearAllQzonePosts(); // 如果是，就调用我们刚刚创建的函数
                return;
            }
        });

        // 兔k记账相关事件监听已移至 tukey-accounting.js

        // “kk查岗”功能事件监听器 - 已移至 kk-checkin.js


        // 快捷回复事件绑定 (Moved to apps/QQ/functions.js)

        // 时间轴功能事件绑定 (已移动至 apps/QQ/functions.js)

        // 极光/漫游模式事件监听已移动至 apps/QQ/functions.js

        // GitHub listeners moved to settings.js
        // KK查岗相关事件监听已移至 kk-checkin.js
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
    function tryLogin() {
        // 获取元素
        const uidEl = document.getElementById('login-uid');
        const pwdEl = document.getElementById('login-pwd');
        const msgEl = document.getElementById('login-msg');

        // 安全检查：如果元素不存在（比如还没渲染），直接返回，防止报错
        if (!uidEl || !pwdEl) {
            console.error('找不到登录输入框，请刷新页面');
            return;
        }

        const uid = uidEl.value.trim();
        const pwd = pwdEl.value.trim();

        if (!uid || !pwd) {
            msgEl.textContent = '请输入完整的账号和密码';
            return;
        }

        // 验证逻辑
        if (verifyLogin(uid, pwd)) {
            msgEl.style.color = '#32d74b';
            msgEl.textContent = '验证通过，正在进入...';

            try {
                // 保存登录状态
                localStorage.setItem('ephone_saved_uid', uid);

                // 【关键修改】使用固定数据库名，找回你的旧数据
                // 确保 script.js 上方的 initDatabase 函数里写的是 db = new Dexie('GeminiChatDB');
                initDatabase(uid);

                // 移除遮罩
                const overlay = document.getElementById('login-overlay');
                if (overlay) {
                    overlay.style.transition = 'opacity 0.5s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 500);
                }

                // 启动 App
                init();
            } catch (e) {
                console.error(e);
                msgEl.style.color = '#ff453a';
                msgEl.textContent = '初始化失败，请重试';
            }
        } else {
            msgEl.style.color = '#ff453a';
            msgEl.textContent = '账号或密码错误';
            const btn = document.getElementById('btn-login-submit');
            btn.style.background = '#ff453a';
            setTimeout(() => (btn.style.background = '#007aff'), 500);
        }
    }

    /*
     * ===================================================================
     * === 全局接口 (Public API for other scripts) ===
     * ===================================================================
     * 将主应用的核心功能暴露给其他脚本文件（如 game-hall.js）使用
     */
    window.openChat = openChat;
    window.openChat = openChat;
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
    window.openLoversSpaceFromCard = openLoversSpaceFromCard;



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
// ========================================
// 🖼️ NAI图片三击下载功能（非入侵式）
// ========================================
// 功能：为所有NAI图片（realimag-image、naiimag-image）添加三击下载功能
// 适用场景：群聊、私聊、动态、测试弹窗等所有显示NAI图片的地方
// 实现方式：事件委托，不修改任何现有代码
// 触发方式：在图片上快速点击三次
// ========================================

(function () {
    'use strict';

    // 下载图片的核心函数
    function downloadImage(imageSrc, filename) {
        try {
            // 创建一个隐藏的下载链接
            const link = document.createElement('a');
            link.href = imageSrc;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click(); // 触发下载

            // 短暂延迟后移除链接
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);

            console.log('✅ [NAI下载] 开始下载图片:', filename);

            // 显示下载提示
            showDownloadToast();
        } catch (error) {
            console.error('❌ [NAI下载] 下载失败:', error);
            showDownloadToast('下载失败，请重试', 'error');
        }
    }

    // 显示下载提示（临时Toast）
    function showDownloadToast(message = '📥 图片下载中...', type = 'success') {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
			            position: fixed;
			            bottom: 20px;
			            right: 20px;
			            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
			            color: white;
			            padding: 12px 24px;
			            border-radius: 8px;
			            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			            z-index: 10000;
			            font-size: 14px;
			            pointer-events: none;
			            opacity: 0;
			            transform: translateY(20px);
			            transition: all 0.3s ease;
			        `;

        document.body.appendChild(toast);

        // 动画进入
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // 2秒后淡出并移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2000);
    }

    // 生成智能文件名
    function generateFilename(imgElement) {
        // 尝试从title属性获取prompt（用于文件名）
        const title = imgElement.getAttribute('title') || imgElement.getAttribute('alt') || '';

        // 清理title，提取前30个有效字符
        let cleanTitle = title
            .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '_') // 保留中英文字母数字和空格
            .replace(/\s+/g, '_') // 空格转下划线
            .substring(0, 30);

        if (!cleanTitle) {
            cleanTitle = 'NAI_Image';
        }

        // 添加时间戳（精确到秒）
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0]; // 格式：20250124_123045

        // 生成文件名
        return `${cleanTitle}_${timestamp}.png`;
    }

    // 为图片添加双击时的视觉反馈
    function addVisualFeedback(imgElement) {
        const originalTransform = imgElement.style.transform || '';
        const originalTransition = imgElement.style.transition || '';

        // 添加缩放动画
        imgElement.style.transition = 'transform 0.15s ease';
        imgElement.style.transform = 'scale(0.95)';

        setTimeout(() => {
            imgElement.style.transform = originalTransform;
            setTimeout(() => {
                imgElement.style.transition = originalTransition;
            }, 150);
        }, 150);
    }

    // 三击检测相关变量
    let clickCount = 0;
    let clickTimer = null;
    let lastClickedElement = null;

    // 全局事件监听器（事件委托 - 三击触发）
    document.addEventListener(
        'click',
        function (e) {
            const target = e.target;

            // 检查是否是NAI图片（realimag-image 或 naiimag-image）
            if (target.tagName === 'IMG' && (target.classList.contains('realimag-image') || target.classList.contains('naiimag-image'))) {
                // 如果点击的是同一个元素，增加计数
                if (target === lastClickedElement) {
                    clickCount++;
                } else {
                    // 点击了不同的元素，重置计数
                    clickCount = 1;
                    lastClickedElement = target;
                }

                // 清除之前的定时器
                if (clickTimer) {
                    clearTimeout(clickTimer);
                }

                // 如果达到三击
                if (clickCount === 3) {
                    // 重置计数
                    clickCount = 0;
                    lastClickedElement = null;

                    // 阻止默认行为和事件冒泡
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('🖼️ [NAI下载] 检测到三击NAI图片');

                    // 添加视觉反馈
                    addVisualFeedback(target);

                    // 获取图片源（可能是base64或URL）
                    const imageSrc = target.src;

                    if (!imageSrc || imageSrc === 'about:blank') {
                        console.warn('⚠️ [NAI下载] 图片源为空，无法下载');
                        showDownloadToast('图片加载中，请稍后重试', 'error');
                        return;
                    }

                    // 生成文件名
                    const filename = generateFilename(target);

                    // 触发下载
                    downloadImage(imageSrc, filename);
                } else {
                    // 设置定时器，500ms后重置计数（如果用户停止点击）
                    clickTimer = setTimeout(() => {
                        clickCount = 0;
                        lastClickedElement = null;
                    }, 500);
                }
            }
        },
        true
    ); // 使用捕获阶段，确保优先处理

    console.log('✅ [NAI下载] 三击下载功能已初始化');
    console.log('💡 [NAI下载] 提示：三击任意NAI图片即可下载');
})();