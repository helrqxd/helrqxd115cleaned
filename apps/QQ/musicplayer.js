
// 全局定义 lyricsBarSettings，以便 main-app.js 可以访问
window.lyricsBarSettings = {
    fontSize: 14,
    bgOpacity: 0,
    fontColor: '#FFFFFF',
    showOnClose: true,
};

document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 音乐播放器相关变量
    // ===================================================================

    const audioPlayer = document.getElementById('audio-player');
    window.audioPlayer = audioPlayer;

    const defaultAvatar = 'https://i.postimg.cc/PxZrFFFL/o-o-1.jpg';
    const defaultMyGroupAvatar = 'https://i.postimg.cc/cLPP10Vm/4.jpg';
    const defaultGroupMemberAvatar = 'https://i.postimg.cc/VkQfgzGJ/1.jpg';
    const defaultGroupAvatar = 'https://i.postimg.cc/gc3QYCDy/1-NINE7-Five.jpg';

    // 重新定义 Http_Get，确保在此文件作用域内可用
    async function Http_Get(url) {
        if (window.Http_Get_External) {
            return await window.Http_Get_External(url);
        }
        return null;
    }

    // ===================================================================
    // 音乐播放器功能函数
    // ===================================================================

    function checkAudioAvailability(url) {
        return new Promise((resolve) => {
            const tester = new Audio();
            tester.addEventListener('loadedmetadata', () => resolve(true), { once: true });
            tester.addEventListener('error', () => resolve(false), { once: true });
            tester.src = url;
        });
    }

    async function searchNeteaseMusic(name, singer) {
        try {
            let searchTerm = name.replace(/\s/g, '');
            if (singer) {
                searchTerm += ` ${singer.replace(/\s/g, '')}`;
            }

            const apiUrl = `https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(searchTerm)}`;

            console.log('正在尝试直接请求:', apiUrl);

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.code !== 200 || !result.data || result.data.length === 0) {
                console.log('vkeys API返回无结果:', result);
                return [];
            }

            return result.data
                .map((song) => ({
                    name: song.song,
                    artist: song.singer,
                    id: song.id,
                    cover: song.cover || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png',
                    source: 'netease',
                }))
                .slice(0, 15);
        } catch (e) {
            console.error('【vkeys API 直连】搜索失败:', e);
            await showCustomAlert('网易云接口直连失败', `如果浏览器控制台(F12)提示CORS错误，说明此API禁止直接访问。错误: ${e.message}`);
            return [];
        }
    }

    async function searchGdstudioMusic(name) {
        try {
            const searchTerm = name.replace(/\s/g, '');
            const [neteaseResults, tencentResults] = await Promise.all([Http_Get(`https://music-api.gdstudio.xyz/api.php?btwaf=9018895&types=search&source=netease&name=${encodeURIComponent(searchTerm)}&count=10&pages=1`), Http_Get(`https://music-api.gdstudio.xyz/api.php?btwaf=9018895&types=search&source=tencent&name=${encodeURIComponent(searchTerm)}&count=10&pages=1`)]);

            const combined = [...(neteaseResults || []), ...(tencentResults || [])];

            if (!combined.length) return [];

            const uniqueSongs = new Map();
            combined.forEach((song) => {
                if (song && song.id && !uniqueSongs.has(song.id)) {
                    uniqueSongs.set(song.id, {
                        name: song.name,
                        artist: song.artist?.map((a) => a.name).join(' / ') || song.artist?.[0] || '未知艺术家',
                        id: song.id,
                        pic_id: song.pic_id || song.album?.id,
                        lyric_id: song.lyric_id || song.id,
                        cover: song.pic || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png',
                        originalSource: song.source,
                        apiProvider: 'gdstudio',
                    });
                }
            });

            return Array.from(uniqueSongs.values());
        } catch (e) {
            console.error('【GD 音乐台】搜索API失败:', e);
            return [];
        }
    }

    async function searchTencentMusic(name) {
        try {
            name = name.replace(/\s/g, '');
            const result = await Http_Get(`https://api.vkeys.cn/v2/music/tencent?word=${encodeURIComponent(name)}`);
            if (!result?.data?.length) return [];
            return result.data
                .map((song) => ({
                    name: song.song,
                    artist: song.singer,
                    id: song.id,
                    cover: song.cover || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png',
                    source: 'tencent',
                }))
                .slice(0, 5);
        } catch (e) {
            console.error('QQ音乐搜索API失败:', e);
            return [];
        }
    }

    async function addSongFromSearch() {
        const source = await showSearchSourceSelector();
        if (!source) return;

        const searchTerm = await showCustomPrompt('搜索歌曲', '请输入 歌名 或 歌名-歌手');
        if (!searchTerm || !searchTerm.trim()) return;

        await showCustomAlert('请稍候...', '正在搜索歌曲资源...');

        let musicName = searchTerm.trim();
        let singerName = '';
        if (searchTerm.includes('-') || searchTerm.includes('–')) {
            const parts = searchTerm.split(/[-–]/);
            musicName = parts[0].trim();
            singerName = parts.slice(1).join(' ').trim();
        }

        let combinedResults = [];

        if (source === 'gdstudio') {
            combinedResults = await searchGdstudioMusic(musicName);
        } else if (source === 'all') {
            const [neteaseResults, tencentResults] = await Promise.all([searchNeteaseMusic(musicName, singerName), searchTencentMusic(musicName)]);
            combinedResults = [...neteaseResults, ...tencentResults];
        } else if (source === 'netease') {
            combinedResults = await searchNeteaseMusic(musicName, singerName);
        } else if (source === 'tencent') {
            combinedResults = await searchTencentMusic(musicName);
        }

        if (combinedResults.length === 0) {
            await showCustomAlert('无结果', '抱歉，在所选来源中未能找到相关歌曲。');
            return;
        }

        const modal = document.getElementById('music-search-results-modal');
        const listEl = document.getElementById('search-results-list');
        listEl.innerHTML = '';

        combinedResults.forEach((song) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.dataset.songJson = JSON.stringify(song);

            let sourceLabel = '';
            if (song.apiProvider === 'gdstudio') {
                sourceLabel = 'GD音乐台';
            } else if (song.source === 'netease') {
                sourceLabel = '网易云';
            } else if (song.source === 'tencent') {
                sourceLabel = 'QQ音乐';
            }

            item.innerHTML = `
                        <div class="title">${song.name}</div>
                        <div class="artist">${song.artist} <span class="source">${sourceLabel}</span></div>
                    `;
            listEl.appendChild(item);
        });

        modal.classList.add('visible');
    }

    async function handleSearchResultClick(songData) {
        const modal = document.getElementById('music-search-results-modal');
        modal.classList.remove('visible');

        await showCustomAlert('请稍候...', `正在获取《${songData.name}》的播放链接...`);

        let playableResult = null;
        let finalSource = songData.originalSource || songData.source;

        if (songData.apiProvider === 'gdstudio') {
            const gdApiUrl = `https://music-api.gdstudio.xyz/api.php?btwaf=20639888&types=url&source=${finalSource}&id=${songData.id}&br=320`;
            const result = await Http_Get(gdApiUrl);
            console.log('GD 音乐台获取链接返回:', result);

            const songUrl = (result?.url || result?.data?.url || '').trim();

            if (songUrl && (await checkAudioAvailability(songUrl))) {
                playableResult = { url: songUrl, id: songData.id, source: finalSource, apiProvider: 'gdstudio' };
            } else {
                console.warn('GD 音乐台获取链接失败或链接无效:', result);
            }
        } else {
            const primaryApiUrl = finalSource === 'netease' ? `https://api.vkeys.cn/v2/music/netease?id=${songData.id}` : `https://api.vkeys.cn/v2/music/tencent?id=${songData.id}`;
            let primaryResult = await Http_Get(primaryApiUrl);
            if (primaryResult?.data?.url && (await checkAudioAvailability(primaryResult.data.url))) {
                playableResult = { url: primaryResult.data.url, id: songData.id, source: finalSource };
            }

            if (!playableResult) {
                await showCustomAlert('请稍候...', '主音源获取失败，正在尝试备用音源...');
                const fallbackSource = finalSource === 'netease' ? 'tencent' : 'netease';
                const fallbackResults = fallbackSource === 'tencent' ? await searchTencentMusic(songData.name) : await searchNeteaseMusic(songData.name, songData.artist);

                if (fallbackResults.length > 0) {
                    const fallbackApiUrl = fallbackSource === 'netease' ? `https://api.vkeys.cn/v2/music/netease?id=${fallbackResults[0].id}` : `https://api.vkeys.cn/v2/music/tencent?id=${fallbackResults[0].id}`;
                    const fallbackResult = await Http_Get(fallbackApiUrl);
                    if (fallbackResult?.data?.url && (await checkAudioAvailability(fallbackResult.data.url))) {
                        playableResult = { url: fallbackResult.data.url, id: fallbackResults[0].id, source: fallbackSource };
                        finalSource = fallbackSource;
                    }
                }
            }
        }

        if (!playableResult) {
            await showCustomAlert('获取失败', '无法获取该歌曲的有效播放链接。可能是歌曲需要VIP或地区限制。');
            return;
        }

        const lrcContent = (await getLyricsForSong(playableResult.id, playableResult.source, playableResult.apiProvider)) || '';

        let coverUrl = songData.cover;
        if (playableResult.apiProvider === 'gdstudio' && songData.pic_id) {
            const picApiUrl = `https://music-api.gdstudio.xyz/api.php?btwaf=20639888&types=pic&source=${playableResult.source}&id=${songData.pic_id}&size=500`;
            const picResult = await Http_Get(picApiUrl);
            if (picResult && picResult.url) {
                coverUrl = picResult.url;
            }
        }

        const newSong = {
            name: songData.name,
            artist: songData.artist,
            src: playableResult.url,
            cover: coverUrl,
            isLocal: false,
            lrcContent: lrcContent,
            isTemporary: false,
            addedTimestamp: Date.now(),
            musicId: playableResult.id,
            musicSource: finalSource,
            apiProvider: playableResult.apiProvider,
        };

        state.musicState.playlist.push(newSong);

        await saveGlobalPlaylist();

        updatePlaylistUI();

        if (state.musicState.currentIndex === -1) {
            state.musicState.currentIndex = state.musicState.playlist.length - 1;
            loadSong(state.musicState.currentIndex);
        } else {
            await showCustomAlert('添加成功', `《${songData.name}》已保存，链接失效时会自动更新。`);
        }

        try {
            if (state.activeChatId) {
                const chat = state.chats[state.activeChatId];
                if (chat) {
                    const hiddenMessage = {
                        role: 'system',
                        content: `[系统提示：用户添加了歌曲《${songData.name}》到列表。]`,
                        timestamp: Date.now(),
                        isHidden: true,
                    };
                    chat.history.push(hiddenMessage);
                    await db.chats.put(chat);
                }
            }
        } catch (e) { }
    }

    async function getLyricsForSong(songId, source, apiProvider) {
        let url = '';

        if (apiProvider === 'gdstudio') {
            url = `https://music-api.gdstudio.xyz/api.php?btwaf=20639888&types=lyric&source=${source}&id=${songId}`;
        } else {
            url = source === 'netease' ? `https://api.vkeys.cn/v2/music/netease/lyric?id=${songId}` : `https://api.vkeys.cn/v2/music/tencent/lyric?id=${songId}`;
        }

        const response = await Http_Get(url);
        const responseData = response?.data || response;

        if (responseData) {
            const lrc = responseData.lrc || responseData.lyric || '';
            const tlyric = responseData.tlyric || responseData.trans || '';
            return tlyric ? lrc + '\n' + tlyric : lrc;
        }
        return '';
    }

    function showSearchSourceSelector() {
        return new Promise((resolve) => {
            const modal = document.getElementById('music-source-selector-modal');
            const confirmBtn = document.getElementById('confirm-source-select-btn');
            const cancelBtn = document.getElementById('cancel-source-select-btn');

            modal.classList.add('visible');

            const onConfirm = () => {
                const selectedSource = document.querySelector('input[name="search-source"]:checked').value;
                cleanup();
                resolve(selectedSource);
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            const cleanup = () => {
                modal.classList.remove('visible');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
            };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    async function searchAndPlaySong(name, artist) {
        await showCustomAlert('请稍候...', `AI为你分享了《${name}》，正在努力寻找播放资源...`);

        let songData = null;

        const neteaseResults = await searchNeteaseMusic(name, artist);
        if (neteaseResults.length > 0) {
            songData = neteaseResults[0];
        }
        else {
            const tencentResults = await searchTencentMusic(name);
            if (tencentResults.length > 0) {
                songData = tencentResults[0];
            }
        }

        if (!songData) {
            await showCustomAlert('找不到歌曲', `抱歉，在网易云和QQ音乐都没能找到《${name}》的可播放资源。`);
            return;
        }

        const apiUrl = songData.source === 'netease' ? `https://api.vkeys.cn/v2/music/netease?id=${songData.id}` : `https://api.vkeys.cn/v2/music/tencent?id=${songData.id}`;

        const result = await Http_Get(apiUrl);

        if (!result?.data?.url || !(await checkAudioAvailability(result.data.url))) {
            await showCustomAlert('获取失败', `找到了《${name}》，但无法获取有效的播放链接。`);
            return;
        }

        const lrcContent = (await getLyricsForSong(songData.id, songData.source)) || '';

        const newSong = {
            name: songData.name,
            artist: songData.artist,
            src: result.data.url,
            cover: songData.cover,
            isLocal: false,
            lrcContent: lrcContent,
            isTemporary: true,
            addedTimestamp: Date.now(),
        };

        const existingIndex = state.musicState.playlist.findIndex((t) => t.name === newSong.name && t.artist === newSong.artist);
        if (existingIndex !== -1) {
            playSong(existingIndex);
        } else {
            state.musicState.playlist.push(newSong);
            updatePlaylistUI();
            playSong(state.musicState.playlist.length - 1);
        }

        if (!state.musicState.isActive) {
            startListenTogetherSession(state.activeChatId);
        } else {
            document.getElementById('music-player-overlay').classList.add('visible');
        }
    }

    async function handleListenTogetherClick() {
        const targetChatId = state.activeChatId;
        const chat = state.chats[targetChatId];
        if (!chat) return;

        if (state.musicState.isActive) {
            if (state.musicState.activeChatId === targetChatId) {
                document.getElementById('music-player-overlay').classList.add('visible');
            } else {
                const confirmed = await showCustomConfirm('切换一起听对象', `你正在和其他人一起听歌。是否结束当前会话，并开始和“${chat.name}”一起听？`);
                if (confirmed) {
                    await endListenTogetherSession(true);
                    startListenTogetherSession(targetChatId);
                }
            }
        } else {
            // 优先检查内存中的播放列表
            if (state.musicState.playlist && state.musicState.playlist.length > 0) {
                startListenTogetherSession(targetChatId);
                return;
            }

            const savedPlaylist = await db.musicLibrary.get('main');
            if (savedPlaylist && savedPlaylist.playlist && savedPlaylist.playlist.length > 0) {
                state.musicState.playlist = savedPlaylist.playlist;
                startListenTogetherSession(targetChatId);
            } else {
                const addNow = await showCustomConfirm('开启一起听', '你的播放列表是空的。是否现在去添加一些歌曲？');
                if (addNow) {
                    updatePlaylistUI();
                    document.getElementById('music-playlist-panel').classList.add('visible');
                }
                startListenTogetherSession(targetChatId);
            }
        }
    }

    async function startListenTogetherSession(chatId) {
        const chat = state.chats[chatId];
        if (!chat) return;
        state.musicState.totalElapsedTime = chat.musicData.totalTime || 0;
        state.musicState.isActive = true;
        state.musicState.activeChatId = chatId;
        if (state.musicState.playlist.length > 0) {
            state.musicState.currentIndex = 0;
        } else {
            state.musicState.currentIndex = -1;
        }
        if (state.musicState.timerId) clearInterval(state.musicState.timerId);
        state.musicState.timerId = setInterval(() => {
            if (state.musicState.isPlaying) {
                state.musicState.totalElapsedTime++;
                updateElapsedTimeDisplay();
            }
        }, 1000);
        updatePlayerUI();
        updatePlaylistUI();
        document.getElementById('music-player-overlay').classList.add('visible');
    }

    async function endListenTogetherSession(saveState = true) {
        if (!state.musicState.isActive) return;
        const oldChatId = state.musicState.activeChatId;
        const cleanupLogic = async () => {
            document.getElementById('floating-lyrics-bar').style.display = 'none';

            if (state.musicState.timerId) clearInterval(state.musicState.timerId);
            if (state.musicState.isPlaying) audioPlayer.pause();
            if (saveState && oldChatId && state.chats[oldChatId]) {
                const chat = state.chats[oldChatId];
                chat.musicData.totalTime = state.musicState.totalElapsedTime;
                await db.chats.put(chat);
            }
            state.musicState.isActive = false;
            state.musicState.activeChatId = null;
            state.musicState.totalElapsedTime = 0;
            state.musicState.timerId = null;
            updateListenTogetherIcon(oldChatId, true);
        };
        closeMusicPlayerWithAnimation(cleanupLogic);
    }

    function returnToChat() {
        closeMusicPlayerWithAnimation(() => {
            if (state.musicState.isActive && lyricsBarSettings.showOnClose) {
                document.getElementById('floating-lyrics-bar').style.display = 'flex';
            }
        });
    }

    function updateListenTogetherIcon(chatId, forceReset = false) {
        const iconImg = document.querySelector('#listen-together-btn img');
        if (!iconImg) return;
        if (forceReset || !state.musicState.isActive || state.musicState.activeChatId !== chatId) {
            iconImg.src = 'https://i.postimg.cc/CxjpF6gK/yi-qi-ting.png';
            iconImg.className = '';
            return;
        }
        iconImg.src = 'https://cdn.jsdelivr.net.cn/gh/qdqqd/tc_temp/jli60izy2n.png';
        iconImg.classList.add('rotating');
        if (state.musicState.isPlaying) iconImg.classList.remove('paused');
        else iconImg.classList.add('paused');
    }
    window.updateListenTogetherIconProxy = updateListenTogetherIcon;

    function updatePlayerUI() {
        updateListenTogetherIcon(state.musicState.activeChatId);
        updateElapsedTimeDisplay();
        const titleEl = document.getElementById('music-player-song-title');
        const artistEl = document.getElementById('music-player-artist');
        const playPauseBtn = document.getElementById('music-play-pause-btn');
        const chat = state.chats[state.musicState.activeChatId];
        const charAvatarEl = document.getElementById('music-char-avatar');
        const userAvatarEl = document.getElementById('music-user-avatar');
        const albumCoverEl = document.getElementById('music-album-cover');
        const avatarsContainer = document.getElementById('music-avatars-container');
        const displayArea = document.getElementById('music-display-area');

        if (chat) {
            if (chat.isGroup) {
                charAvatarEl.src = chat.settings.groupAvatar || defaultGroupAvatar;
            } else {
                charAvatarEl.src = chat.settings.aiAvatar || defaultAvatar;
            }
            userAvatarEl.src = chat.settings.myAvatar || defaultAvatar;
        }

        if (state.musicState.currentIndex > -1 && state.musicState.playlist.length > 0) {
            const track = state.musicState.playlist[state.musicState.currentIndex];
            titleEl.textContent = track.name;
            artistEl.textContent = track.artist;
            albumCoverEl.src = track.cover || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
        } else {
            titleEl.textContent = '请添加歌曲';
            artistEl.textContent = '...';
            albumCoverEl.src = 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png';
        }

        playPauseBtn.textContent = state.musicState.isPlaying ? '❚❚' : '▶';
        avatarsContainer.classList.toggle('flashing', state.musicState.isPlaying);

        albumCoverEl.classList.toggle('rotating', state.musicState.currentIndex > -1);
        albumCoverEl.classList.toggle('paused', !state.musicState.isPlaying);

        if (displayArea) {
            displayArea.classList.remove('show-lyrics');
        }
    }

    function updateElapsedTimeDisplay() {
        const hours = (state.musicState.totalElapsedTime / 3600).toFixed(1);
        document.getElementById('music-time-counter').textContent = `已经一起听了${hours}小时`;
    }

    async function handleCoverUpload(index) {
        if (index < 0 || index >= state.musicState.playlist.length) return;

        const choice = await showChoiceModal('选择封面来源', [
            { text: '使用网络URL', value: 'url' },
            { text: '从本地上传', value: 'local' },
        ]);

        let newCoverUrl = null;

        if (choice === 'url') {
            const url = await showCustomPrompt('封面URL', '请输入图片文件的网络链接');
            if (url && url.trim().startsWith('http')) {
                newCoverUrl = url.trim();
            } else if (url !== null) {
                alert('请输入一个有效的图片URL！');
            }
        } else if (choice === 'local') {
            newCoverUrl = await uploadImageLocally();
        }

        if (newCoverUrl) {
            state.musicState.playlist[index].cover = newCoverUrl;
            await saveGlobalPlaylist();
            updatePlaylistUI();
            if (state.musicState.currentIndex === index) {
                updatePlayerUI();
            }
            alert('歌曲封面已更新！');
        }
    }

    function updatePlaylistUI() {
        const playlistBody = document.getElementById('playlist-body');
        playlistBody.innerHTML = '';
        if (state.musicState.playlist.length === 0) {
            playlistBody.innerHTML = '<p style="text-align:center; padding: 20px; color: #888;">播放列表是空的~</p>';
            return;
        }
        state.musicState.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            if (index === state.musicState.currentIndex) item.classList.add('playing');
            item.innerHTML = `
                        <div class="playlist-item-info">
                            <div class="title">${track.name}</div>
                            <div class="artist">${track.artist}</div>
                        </div>
                        <div class="playlist-item-actions">
                            <span class="playlist-action-btn cover-btn" data-index="${index}">封面</span>
                            <span class="playlist-action-btn lyrics-btn" data-index="${index}">词</span>
                            <span class="playlist-action-btn delete-track-btn" data-index="${index}">×</span>
                        </div>
                    `;
            item.querySelector('.playlist-item-info').addEventListener('click', () => playSong(index));
            playlistBody.appendChild(item);
        });
    }

    async function loadSong(index) {
        if (index < 0 || index >= state.musicState.playlist.length) return;
        state.musicState.currentIndex = index;
        let track = state.musicState.playlist[index];

        if (!track.isLocal && track.musicId && track.musicSource) {
            const isUrlValid = await checkAudioAvailability(track.src);

            if (!isUrlValid) {
                console.log(`检测到歌曲《${track.name}》链接失效，正在自动续期...`);
                const statusEl = document.getElementById('music-player-artist');
                if (statusEl) statusEl.textContent = '正在更新链接...';

                try {
                    const apiUrl = track.musicSource === 'netease' ? `https://api.vkeys.cn/v2/music/netease?id=${track.musicId}` : `https://api.vkeys.cn/v2/music/tencent?id=${track.musicId}`;

                    const res = await Http_Get(apiUrl);
                    if (res?.data?.url) {
                        track.src = res.data.url;
                        state.musicState.playlist[index] = track;
                        await saveGlobalPlaylist();
                        console.log(`续期成功！新链接: ${track.src}`);
                    }
                } catch (e) {
                    console.error('自动续期失败:', e);
                }
            }
        }

        if (track.lrcUrl && !track.lrcContent) {
            try {
                const response = await fetch(track.lrcUrl);
                if (response.ok) track.lrcContent = await response.text();
            } catch (error) {
                console.error('加载歌词URL失败:', error);
            }
        }

        state.musicState.parsedLyrics = parseLRC(track.lrcContent || '');
        state.musicState.currentLyricIndex = -1;
        renderLyrics();

        if (track.isLocal && track.src instanceof Blob) {
            audioPlayer.src = URL.createObjectURL(track.src);
        } else if (!track.isLocal) {
            audioPlayer.src = track.src;
        } else {
            console.error('本地歌曲源错误:', track);
            return;
        }

        updatePlaylistUI();
        updatePlayerUI();

        // ★★★ 核心修复：更新 Media Session Metadata (通知栏显示) ★★★
        if ('mediaSession' in navigator) {
            // 先清除旧的进度状态，防止显示异常
            if (navigator.mediaSession.setPositionState) {
                try { navigator.mediaSession.setPositionState(null); } catch (e) { }
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.name || '未知歌曲',
                artist: track.artist || 'Together Listen',
                album: 'EPhone 音乐',
                artwork: [
                    { src: track.cover || 'https://i.postimg.cc/pT2xKzPz/album-cover-placeholder.png', sizes: '512x512', type: 'image/png' }
                ]
            });

            // 绑定媒体控制事件
            navigator.mediaSession.setActionHandler('play', () => {
                // 解锁播放状态，无需isActive限制
                if (audioPlayer.paused) {
                    audioPlayer.play().catch(e => console.error("MediaSession Play Error:", e));
                }
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if (!audioPlayer.paused) {
                    audioPlayer.pause();
                }
            });
            navigator.mediaSession.setActionHandler('previoustrack', playPrev);
            navigator.mediaSession.setActionHandler('nexttrack', playNext);
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.fastSeek && 'fastSeek' in audioPlayer) {
                    audioPlayer.fastSeek(details.seekTime);
                    return;
                }
                audioPlayer.currentTime = details.seekTime;
                updateMusicProgressBar();
            });
        }

        try {
            if (state.musicState.isPlaying) {
                await audioPlayer.play();
            }
        } catch (e) {
            console.warn('加载后自动播放被拦截', e);
        }

        audioPlayer.onloadedmetadata = () => {
            updateMusicProgressBar();
        };
    }

    async function playSong(index) {
        await loadSong(index);
        try {
            await audioPlayer.play();

            state.musicState.isPlaying = true;
            updatePlayerUI();
        } catch (error) {
            console.error('音频播放失败:', error);
            state.musicState.isPlaying = false;
            updatePlayerUI();
        }
    }

    function togglePlayPause() {
        if (audioPlayer.paused) {
            if (state.musicState.currentIndex > -1) {
                playSong(state.musicState.currentIndex);
            }
        } else {
            audioPlayer.pause();

            state.musicState.isPlaying = false;
            updatePlayerUI();
        }
    }

    function playNext() {
        if (state.musicState.playlist.length === 0) return;

        let nextIndex = state.musicState.currentIndex;
        let attempts = 0;

        do {
            switch (state.musicState.playMode) {
                case 'random':
                    nextIndex = Math.floor(Math.random() * state.musicState.playlist.length);
                    break;
                case 'single':
                    nextIndex = (nextIndex + 1) % state.musicState.playlist.length;
                    break;
                case 'order':
                default:
                    nextIndex = (nextIndex + 1) % state.musicState.playlist.length;
                    break;
            }

            attempts++;
        } while (
            state.musicState.playlist[nextIndex].isKeepAlive &&
            state.musicState.playlist.length > 1 &&
            attempts < state.musicState.playlist.length * 2
        );

        playSong(nextIndex);
    }

    function playPrev() {
        if (state.musicState.playlist.length === 0) return;
        let newIndex = state.musicState.currentIndex;
        let attempts = 0;

        do {
            newIndex = (newIndex - 1 + state.musicState.playlist.length) % state.musicState.playlist.length;
            attempts++;
        } while (state.musicState.playlist[newIndex].isKeepAlive && state.musicState.playlist.length > 1 && attempts < state.musicState.playlist.length * 2);

        playSong(newIndex);
    }

    function changePlayMode() {
        const modes = ['order', 'random', 'single'];
        const currentModeIndex = modes.indexOf(state.musicState.playMode);
        state.musicState.playMode = modes[(currentModeIndex + 1) % modes.length];
        document.getElementById('music-mode-btn').textContent = { order: '顺序', random: '随机', single: '单曲' }[state.musicState.playMode];
    }

    async function addSongFromURL() {
        const url = await showCustomPrompt('添加网络歌曲', '请输入歌曲的URL', '', 'url');
        if (!url) return;
        const name = await showCustomPrompt('歌曲信息', '请输入歌名');
        if (!name) return;
        const artist = await showCustomPrompt('歌曲信息', '请输入歌手名');
        if (!artist) return;

        const wantLrc = await showCustomConfirm('导入歌词', `要为《${name}》提供一个歌词文件 (.lrc) 的URL吗？`);
        let lrcUrl = '';

        if (wantLrc) {
            const inputLrcUrl = await showCustomPrompt('歌词URL', '请输入 .lrc 歌词文件的网络链接', '', 'url');
            if (inputLrcUrl) {
                lrcUrl = inputLrcUrl;
            }
        }

        state.musicState.playlist.push({
            name,
            artist,
            src: url,
            isLocal: false,
            lrcUrl: lrcUrl,
            lrcContent: '',
        });

        await saveGlobalPlaylist();
        updatePlaylistUI();

        if (state.musicState.currentIndex === -1) {
            loadSong(state.musicState.playlist.length - 1);
        }
    }

    async function addSongFromLocal(event) {
        const files = event.target.files;
        if (!files.length) return;

        for (const file of files) {
            let name = file.name.replace(/\.[^/.]+$/, '');
            name = await showCustomPrompt('歌曲信息', '请输入歌名', name);
            if (name === null) continue;

            const artist = await showCustomPrompt('歌曲信息', '请输入歌手名', '未知歌手');
            if (artist === null) continue;

            let lrcContent = '';
            const wantLrc = await showCustomConfirm('导入歌词', `要为《${name}》导入歌词文件 (.lrc) 吗？`);
            if (wantLrc) {
                lrcContent = await new Promise((resolve) => {
                    const lrcInput = document.getElementById('lrc-upload-input');
                    const lrcChangeHandler = (e) => {
                        const lrcFile = e.target.files[0];
                        if (lrcFile) {
                            const reader = new FileReader();
                            reader.onload = (readEvent) => resolve(readEvent.target.result);
                            reader.onerror = () => resolve('');
                            reader.readAsText(lrcFile);
                        } else {
                            resolve('');
                        }
                        lrcInput.removeEventListener('change', lrcChangeHandler);
                        lrcInput.value = '';
                    };
                    lrcInput.addEventListener('change', lrcChangeHandler);
                    lrcInput.click();
                });
            }

            state.musicState.playlist.push({
                name,
                artist,
                src: file,
                isLocal: true,
                lrcContent: lrcContent,
            });
        }

        await saveGlobalPlaylist();
        updatePlaylistUI();

        if (state.musicState.currentIndex === -1 && state.musicState.playlist.length > 0) {
            loadSong(0);
        }
        event.target.value = null;
    }

    async function deleteTrack(index) {
        if (index < 0 || index >= state.musicState.playlist.length) return;
        const track = state.musicState.playlist[index];
        const wasPlaying = state.musicState.isPlaying && state.musicState.currentIndex === index;
        if (track.isLocal && audioPlayer.src.startsWith('blob:') && state.musicState.currentIndex === index) URL.revokeObjectURL(audioPlayer.src);
        state.musicState.playlist.splice(index, 1);
        await saveGlobalPlaylist();
        if (state.musicState.playlist.length === 0) {
            if (state.musicState.isPlaying) audioPlayer.pause();
            audioPlayer.src = '';
            state.musicState.currentIndex = -1;
            state.musicState.isPlaying = false;
        } else {
            if (wasPlaying) {
                playNext();
            } else {
                if (state.musicState.currentIndex >= index) state.musicState.currentIndex = Math.max(0, state.musicState.currentIndex - 1);
            }
        }
        updatePlayerUI();
        updatePlaylistUI();
    }

    async function saveGlobalPlaylist() {
        const permanentPlaylist = state.musicState.playlist.filter((track) => !track.isTemporary);
        await db.musicLibrary.put({ id: 'main', playlist: permanentPlaylist });
        console.log('已将永久播放列表保存到数据库。');
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

        const floatingLyricText = document.getElementById('floating-lyric-text');
        if (activeLine) {
            floatingLyricText.textContent = activeLine.textContent;
        } else if (state.musicState.parsedLyrics.length > 0) {
            floatingLyricText.textContent = '♪ ♪ ♪';
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

    // ===================================================================
    // 事件监听器
    // ===================================================================

    document.getElementById('listen-together-btn').addEventListener('click', handleListenTogetherClick);
    document.getElementById('music-exit-btn').addEventListener('click', () => endListenTogetherSession(true));
    document.getElementById('music-return-btn').addEventListener('click', returnToChat);
    document.getElementById('music-play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('music-next-btn').addEventListener('click', playNext);
    document.getElementById('music-prev-btn').addEventListener('click', playPrev);
    document.getElementById('music-mode-btn').addEventListener('click', changePlayMode);
    document.getElementById('music-playlist-btn').addEventListener('click', () => {
        updatePlaylistUI();
        document.getElementById('music-playlist-panel').classList.add('visible');
    });
    document.getElementById('close-playlist-btn').addEventListener('click', () => document.getElementById('music-playlist-panel').classList.remove('visible'));
    document.getElementById('add-song-url-btn').addEventListener('click', addSongFromURL);
    document.getElementById('add-song-local-btn').addEventListener('click', () => document.getElementById('local-song-upload-input').click());
    document.getElementById('local-song-upload-input').addEventListener('change', addSongFromLocal);

    document.getElementById('add-song-search-btn').addEventListener('click', addSongFromSearch);

    document.getElementById('cancel-music-search-btn').addEventListener('click', () => {
        document.getElementById('music-search-results-modal').classList.remove('visible');
    });

    document.getElementById('search-results-list').addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item && item.dataset.songJson) {
            const songData = JSON.parse(item.dataset.songJson);
            handleSearchResultClick(songData);
        }
    });

    audioPlayer.addEventListener('ended', () => {
        const currentTrack = state.musicState.playlist[state.musicState.currentIndex];

        if (currentTrack && currentTrack.isKeepAlive) {
            console.log('保活音频循环中...');
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch((e) => console.error('重播失败:', e));
        } else {
            // ★★★ 修复4：单曲循环逻辑 ★★★
            if (state.musicState.playMode === 'single') {
                audioPlayer.currentTime = 0;
                audioPlayer.play().catch((e) => console.error('单曲循环重播失败:', e));
            } else {
                playNext();
            }
        }
    });

    audioPlayer.addEventListener('timeupdate', () => {
        const currentTrack = state.musicState.playlist[state.musicState.currentIndex];

        // 更新进度条和歌词
        updateMusicProgressBar();

        // 【修复】定期同步 Media Session 状态（每约1秒），强制刷新系统进度条
        if ('mediaSession' in navigator && !audioPlayer.paused) {
            const now = Date.now();
            if (!audioPlayer._lastSessionSync || now - audioPlayer._lastSessionSync > 1000) {
                audioPlayer._lastSessionSync = now;
                if (typeof updateMediaSessionState === 'function') {
                    updateMediaSessionState();
                }
            }
        }

        // 仅当保持活跃音频时检查循环
        if (currentTrack && currentTrack.isKeepAlive && audioPlayer.currentTime > 600) {
            console.log('保活音频已播放20分钟，执行循环...');
            audioPlayer.currentTime = 0;
            if (audioPlayer.paused) {
                audioPlayer.play().catch((e) => console.error('循环重播失败:', e));
            }
        }
    });

    // 在关键事件时更新 MediaSession 状态
    const updateMediaSessionState = () => {
        if ('mediaSession' in navigator) {
            // 总是尝试更新播放状态
            // 注意：如果主播放器暂停了，我们希望状态是 paused。
            // 即使后台保活音频在播放，这属于"实现细节"，不应影响 UI 状态。
            const isPlaying = !audioPlayer.paused;
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

            const duration = audioPlayer.duration;
            const currentTime = audioPlayer.currentTime;

            // 只有当时长有效且非无限时才更新具体进度
            if (Number.isFinite(duration) && duration > 0 && !isNaN(duration)) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: duration,
                        playbackRate: audioPlayer.playbackRate || 1,
                        position: Math.min(Math.max(0, currentTime), duration)
                    });
                } catch (e) {
                    // 只有在非 AbortError 时才警告
                    if (e.name !== 'AbortError') {
                        // console.warn('SetPositionState Error:', e);
                    }
                }
            } else {
                // 如果 duration 无效，尝试清除 position state
                // 但如果是因为暂停而导致 duration 暂时不可用（罕见），我们保留上一次的可能更好？
                // 不，为了安全，清除它。
                try { navigator.mediaSession.setPositionState(null); } catch (e) { }
            }
        }
    };

    audioPlayer.addEventListener('play', () => {
        // 1. 暂停保活音频，实行“独占播放”，防止系统进度条被通过保活音频干扰
        const keepAlive = document.getElementById('strong-keep-alive-player');
        if (keepAlive && !keepAlive.paused) {
            keepAlive.pause();
            console.log('音乐播放开始，已挂起后台保活音频');
        }

        // 延迟一点更新，以防 Audio 状态切换造成的竞态
        state.musicState.isPlaying = true;
        updatePlayerUI();

        // 关键修复：给一定延迟确保 currentTime 和 duration 稳定
        setTimeout(updateMediaSessionState, 100);
    });

    audioPlayer.addEventListener('pause', () => {
        state.musicState.isPlaying = false;
        updatePlayerUI();

        // 更新 MediaSession 为 paused
        updateMediaSessionState();

        // 1. 恢复保活音频，确保 App 不会被系统杀掉
        // 放在 updateMediaSessionState 之后执行，希望能让系统先捕捉到 pause 状态
        const keepAlive = document.getElementById('strong-keep-alive-player');
        if (keepAlive && keepAlive.paused) {
            // 延迟恢复保活，避免立即抢占 MediaSession
            setTimeout(() => {
                keepAlive.play().catch(e => console.warn('恢复保活失败:', e));
                console.log('音乐已暂停，恢复后台保活音频');
            }, 500);
        }
    });

    // 增加: 在元数据加载完成和时长变化时也更新状态 (解决初始加载时duration可能为NaN的问题)
    audioPlayer.addEventListener('loadedmetadata', updateMediaSessionState);
    audioPlayer.addEventListener('durationchange', updateMediaSessionState);

    audioPlayer.addEventListener('seeked', updateMediaSessionState);
    audioPlayer.addEventListener('ratechange', updateMediaSessionState);


    // 补全 playlist-body 的事件委托
    const playlistBody = document.getElementById('playlist-body');
    if (playlistBody) {
        playlistBody.addEventListener('click', async (e) => {
            const target = e.target;
            const btn = target.closest('.playlist-action-btn');

            // 如果点击的是删除按钮
            if (target.classList.contains('delete-track-btn') || (btn && btn.classList.contains('delete-track-btn'))) {
                const element = target.classList.contains('delete-track-btn') ? target : btn;
                const index = parseInt(element.dataset.index);
                const track = state.musicState.playlist[index];
                const confirmed = await showCustomConfirm('删除歌曲', `确定要从播放列表中删除《${track.name}》吗？`);
                if (confirmed) {
                    deleteTrack(index);
                }
                return;
            }

            // 如果点击的是封面按钮
            if (target.classList.contains('cover-btn') || (btn && btn.classList.contains('cover-btn'))) {
                const element = target.classList.contains('cover-btn') ? target : btn;
                const index = parseInt(element.dataset.index);
                if (!isNaN(index)) {
                    handleCoverUpload(index);
                }
                return;
            }

            // 如果点击的是歌词按钮
            if (target.classList.contains('lyrics-btn') || (btn && btn.classList.contains('lyrics-btn'))) {
                const element = target.classList.contains('lyrics-btn') ? target : btn;
                const index = parseInt(element.dataset.index);
                if (isNaN(index)) return;

                const choice = await showChoiceModal('选择歌词来源', [
                    { text: '使用网络URL', value: 'url' },
                    { text: '从本地上传', value: 'local' },
                ]);

                let lrcContent = null;

                if (choice === 'url') {
                    const url = await showCustomPrompt('歌词URL', '请输入.lrc歌词文件的网络链接');
                    if (url && url.trim()) {
                        try {
                            const response = await fetch(url.trim());
                            if (response.ok) {
                                lrcContent = await response.text();
                            } else {
                                alert('无法获取歌词文件，请检查URL是否正确。');
                            }
                        } catch (error) {
                            alert('获取歌词失败: ' + error.message);
                        }
                    }
                } else if (choice === 'local') {
                    lrcContent = await new Promise((resolve) => {
                        const lrcInput = document.getElementById('lrc-upload-input');
                        const handler = (event) => {
                            const file = event.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (re) => resolve(re.target.result);
                                reader.readAsText(file);
                            } else {
                                resolve(null);
                            }
                            lrcInput.removeEventListener('change', handler);
                            lrcInput.value = '';
                        };
                        lrcInput.addEventListener('change', handler);
                        lrcInput.click();
                    });
                }

                if (lrcContent !== null) {
                    state.musicState.playlist[index].lrcContent = lrcContent;
                    await saveGlobalPlaylist();
                    alert('歌词导入成功！');
                    if (state.musicState.currentIndex === index) {
                        state.musicState.parsedLyrics = parseLRC(lrcContent);
                        renderLyrics();
                        updateActiveLyric(audioPlayer.currentTime);
                    }
                }
            }
        });
    }


    // 检查并删除所有失效的API歌曲
    async function deleteExpiredSearchedSongs() {
        await showCustomAlert('请稍候...', '正在检查播放列表中所有在线歌曲的有效性...');

        const songsToCheck = state.musicState.playlist.filter((track) => track.src && track.src.includes('api.vkeys.cn'));

        if (songsToCheck.length === 0) {
            await showCustomAlert('提示', '播放列表中没有需要检查的在线歌曲。');
            return;
        }

        const songsToDelete = [];
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        await Promise.all(
            songsToCheck.map(async (track) => {
                const isUrlInvalid = !(await checkAudioAvailability(track.src));
                const isOlderThan24h = track.addedTimestamp && track.addedTimestamp < twentyFourHoursAgo;

                if (isUrlInvalid || isOlderThan24h) {
                    songsToDelete.push(track);
                    console.log(`标记删除: ${track.name} (原因: ${isUrlInvalid ? '链接失效' : ''} ${isOlderThan24h ? '超过24小时' : ''})`);
                }
            })
        );

        if (songsToDelete.length === 0) {
            await showCustomAlert('检查完成', '播放列表中的所有在线歌曲当前均有效。');
            return;
        }

        const confirmed = await showCustomConfirm('确认清理', `检测到 ${songsToDelete.length} 首已失效的在线歌曲。确定要将它们从列表中移除吗？`, { confirmButtonClass: 'btn-danger' });

        if (!confirmed) return;

        const currentTrack = state.musicState.currentIndex > -1 ? state.musicState.playlist[state.musicState.currentIndex] : null;
        state.musicState.playlist = state.musicState.playlist.filter((track) => !songsToDelete.includes(track));
        const newIndex = currentTrack ? state.musicState.playlist.findIndex((t) => t.src === currentTrack.src && t.name === currentTrack.name) : -1;

        if (newIndex === -1) {
            if (state.musicState.isPlaying) {
                audioPlayer.pause();
                audioPlayer.src = '';
            }
            state.musicState.isPlaying = false;
            if (state.musicState.playlist.length > 0) {
                playSong(0);
            } else {
                state.musicState.currentIndex = -1;
                updatePlayerUI();
            }
        } else {
            state.musicState.currentIndex = newIndex;
            updatePlayerUI();
        }

        await saveGlobalPlaylist();
        updatePlaylistUI();
        await showCustomAlert('清理完成', `${songsToDelete.length} 首歌曲已从列表中移除。`);
    }

    const deleteExpiredBtn = document.getElementById('delete-expired-songs-btn');
    if (deleteExpiredBtn) {
        deleteExpiredBtn.addEventListener('click', deleteExpiredSearchedSongs);
    }

    // 进度条点击跳转
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (!audioPlayer.duration) return;
            const barWidth = progressBar.clientWidth;
            const clickX = e.offsetX;
            const duration = audioPlayer.duration;
            audioPlayer.currentTime = (clickX / barWidth) * duration;
        });
    }

});
