"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const CryptoJs = require("crypto-js");
const he = require("he");
const dayjs = require("dayjs");
const pageSize = 20;
function formatMusicItem(_) {
    var _a, _b, _c;
    const albumid = _.albumid || ((_a = _.album) === null || _a === void 0 ? void 0 : _a.id);
    const albummid = _.albummid || ((_b = _.album) === null || _b === void 0 ? void 0 : _b.mid);
    const albumname = _.albumname || ((_c = _.album) === null || _c === void 0 ? void 0 : _c.title);
    return {
        id: _.id || _.songid,
        songmid: _.mid || _.songmid,
        title: _.title || _.songname,
        artist: _.singer.map((s) => s.name).join(", "),
        artwork: albummid
            ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albummid}.jpg`
            : undefined,
        album: albumname,
        lrc: _.lyric || undefined,
        albumid: albumid,
        albummid: albummid,
        payPlay: _.pay.pay_play !== undefined ? _.pay.pay_play : _.pay.payPlay,
    };
}
function formatAlbumItem(_) {
    return {
        id: _.albumID || _.albumid,
        albumMID: _.albumMID || _.album_mid,
        title: _.albumName || _.album_name,
        artwork: _.albumPic ||
            `https://y.gtimg.cn/music/photo_new/T002R300x300M000${_.albumMID || _.album_mid}.jpg`,
        date: _.publicTime || _.pub_time,
        singerID: _.singerID || _.singer_id,
        artist: _.singerName || _.singer_name,
        singerMID: _.singerMID || _.singer_mid,
        description: _.desc,
    };
}
function formatArtistItem(_) {
    return {
        name: _.singerName,
        id: _.singerID,
        singerMID: _.singerMID,
        avatar: _.singerPic,
        worksNum: _.songNum,
    };
}
const searchTypeMap = {
    0: "song",
    2: "album",
    1: "singer",
    3: "songlist",
    7: "song",
    12: "mv",
};
const headersBili = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
    accept: "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
};
const headers = {
    referer: "https://y.qq.com",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
    Cookie: "uin=",
};
const validSongFilter = (item) => {
    return true;
};
const validSongUrlFilter = (item) => {
    return !item.title.includes("伴奏") && !item.title.includes("现场") && !item.title.toLowerCase().includes("live".toLowerCase());
};
async function searchBase(query, page, type) {
    const res = (await (0, axios_1.default)({
        url: "https://u.y.qq.com/cgi-bin/musicu.fcg",
        method: "POST",
        data: {
            req_1: {
                method: "DoSearchForQQMusicDesktop",
                module: "music.search.SearchCgiService",
                param: {
                    num_per_page: pageSize,
                    page_num: page,
                    query: query,
                    search_type: type,
                },
            },
        },
        headers: headers,
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
    return {
        isEnd: res.req_1.data.meta.sum <= page * pageSize,
        data: res.req_1.data.body[searchTypeMap[type]].list,
    };
}
async function searchMusic(query, page) {
    const songs = await searchBase(query, page, 0);
    console.log(songs.data[0]);
    return {
        isEnd: songs.isEnd,
        data: songs.data.filter(validSongFilter).map(formatMusicItem),
    };
}
async function searchAlbum(query, page) {
    const albums = await searchBase(query, page, 2);
    return {
        isEnd: albums.isEnd,
        data: albums.data.map(formatAlbumItem),
    };
}
async function searchArtist(query, page) {
    const artists = await searchBase(query, page, 1);
    return {
        isEnd: artists.isEnd,
        data: artists.data.map(formatArtistItem),
    };
}
async function searchMusicSheet(query, page) {
    const musicSheet = await searchBase(query, page, 3);
    return {
        isEnd: musicSheet.isEnd,
        data: musicSheet.data.map((item) => ({
            title: item.dissname,
            createAt: item.createtime,
            description: item.introduction,
            playCount: item.listennum,
            worksNums: item.song_count,
            artwork: item.imgurl,
            id: item.dissid,
            artist: item.creator.name,
        })),
    };
}
async function searchLyric(query, page) {
    const songs = await searchBase(query, page, 7);
    return {
        isEnd: songs.isEnd,
        data: songs.data.map((it) => (Object.assign(Object.assign({}, formatMusicItem(it)), { rawLrcTxt: it.content }))),
    };
}
function getQueryFromUrl(key, search) {
    try {
        const sArr = search.split("?");
        let s = "";
        if (sArr.length > 1) {
            s = sArr[1];
        }
        else {
            return key ? undefined : {};
        }
        const querys = s.split("&");
        const result = {};
        querys.forEach((item) => {
            const temp = item.split("=");
            result[temp[0]] = decodeURIComponent(temp[1]);
        });
        return key ? result[key] : result;
    }
    catch (err) {
        return key ? "" : {};
    }
}
function changeUrlQuery(obj, baseUrl) {
    const query = getQueryFromUrl(null, baseUrl);
    let url = baseUrl.split("?")[0];
    const newQuery = Object.assign(Object.assign({}, query), obj);
    let queryArr = [];
    Object.keys(newQuery).forEach((key) => {
        if (newQuery[key] !== undefined && newQuery[key] !== "") {
            queryArr.push(`${key}=${encodeURIComponent(newQuery[key])}`);
        }
    });
    return `${url}?${queryArr.join("&")}`.replace(/\?$/, "");
}
const typeMap = {
    m4a: {
        s: "C400",
        e: ".m4a",
    },
    128: {
        s: "M500",
        e: ".mp3",
    },
    320: {
        s: "M800",
        e: ".mp3",
    },
    ape: {
        s: "A000",
        e: ".ape",
    },
    flac: {
        s: "F000",
        e: ".flac",
    },
};
async function getSourceUrl(id, type = "128") {
    const mediaId = id;
    let uin = "";
    const guid = (Math.random() * 10000000).toFixed(0);
    const typeObj = typeMap[type];
    const file = `${typeObj.s}${id}${mediaId}${typeObj.e}`;
    const url = changeUrlQuery({
        "-": "getplaysongvkey",
        g_tk: 5381,
        loginUin: uin,
        hostUin: 0,
        format: "json",
        inCharset: "utf8",
        outCharset: "utf-8¬ice=0",
        platform: "yqq.json",
        needNewCode: 0,
        data: JSON.stringify({
            req_0: {
                module: "vkey.GetVkeyServer",
                method: "CgiGetVkey",
                param: {
                    filename: [file],
                    guid: guid,
                    songmid: [id],
                    songtype: [0],
                    uin: uin,
                    loginflag: 1,
                    platform: "20",
                },
            },
            comm: {
                uin: uin,
                format: "json",
                ct: 19,
                cv: 0,
                authst: "",
            },
        }),
    }, "https://u.y.qq.com/cgi-bin/musicu.fcg");
    return (await (0, axios_1.default)({
        method: "GET",
        url: url,
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
}
async function getAlbumInfo(albumItem) {
    const url = changeUrlQuery({
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 10000,
            },
            albumSonglist: {
                method: "GetAlbumSongList",
                param: {
                    albumMid: albumItem.albumMID,
                    albumID: 0,
                    begin: 0,
                    num: 999,
                    order: 2,
                },
                module: "music.musichallAlbum.AlbumSongList",
            },
        }),
    }, "https://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8");
    const res = (await (0, axios_1.default)({
        url: url,
        headers: headers,
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
    return {
        musicList: res.albumSonglist.data.songList
            .filter((_) => validSongFilter(_.songInfo))
            .map((item) => {
            const _ = item.songInfo;
            return formatMusicItem(_);
        }),
    };
}
async function getArtistSongs(artistItem, page) {
    const url = changeUrlQuery({
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0,
            },
            singer: {
                method: "get_singer_detail_info",
                param: {
                    sort: 5,
                    singermid: artistItem.singerMID,
                    sin: (page - 1) * pageSize,
                    num: pageSize,
                },
                module: "music.web_singer_info_svr",
            },
        }),
    }, "http://u.y.qq.com/cgi-bin/musicu.fcg");
    const res = (await (0, axios_1.default)({
        url: url,
        method: "get",
        headers: headers,
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
    return {
        isEnd: res.singer.data.total_song <= page * pageSize,
        data: res.singer.data.songlist.filter(validSongFilter).map(formatMusicItem),
    };
}
async function getArtistAlbums(artistItem, page) {
    const url = changeUrlQuery({
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0,
            },
            singerAlbum: {
                method: "get_singer_album",
                param: {
                    singermid: artistItem.singerMID,
                    order: "time",
                    begin: (page - 1) * pageSize,
                    num: pageSize / 1,
                    exstatus: 1,
                },
                module: "music.web_singer_info_svr",
            },
        }),
    }, "http://u.y.qq.com/cgi-bin/musicu.fcg");
    const res = (await (0, axios_1.default)({
        url,
        method: "get",
        headers: headers,
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
    return {
        isEnd: res.singerAlbum.data.total <= page * pageSize,
        data: res.singerAlbum.data.list.map(formatAlbumItem),
    };
}
async function getArtistWorks(artistItem, page, type) {
    if (type === "music") {
        return getArtistSongs(artistItem, page);
    }
    if (type === "album") {
        return getArtistAlbums(artistItem, page);
    }
}
async function getLyric(musicItem) {
    const result = (await (0, axios_1.default)({
        url: `http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${musicItem.songmid}&pcachetime=${new Date().getTime()}&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`,
        headers: { Referer: "https://y.qq.com", Cookie: "uin=" },
        method: "get",
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
    const res = JSON.parse(result.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, ""));
    return {
        rawLrc: CryptoJs.enc.Base64.parse(res.lyric).toString(CryptoJs.enc.Utf8),
    };
}
async function importMusicSheet(urlLike) {
    let id;
    if (!id) {
        id = (urlLike.match(/https?:\/\/i\.y\.qq\.com\/n2\/m\/share\/details\/taoge\.html\?.*id=([0-9]+)/) || [])[1];
    }
    if (!id) {
        id = (urlLike.match(/https?:\/\/y\.qq\.com\/n\/ryqq\/playlist\/([0-9]+)/) ||
            [])[1];
    }
    if (!id) {
        id = (urlLike.match(/^(\d+)$/) || [])[1];
    }
    if (!id) {
        return;
    }
    const result = (await (0, axios_1.default)({
        url: `http://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&utf8=1&disstid=${id}&loginUin=0`,
        headers: { Referer: "https://y.qq.com/n/yqq/playlist", Cookie: "uin=" },
        method: "get",
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data;
    const res = JSON.parse(result.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, ""));
    return res.cdlist[0].songlist.filter(validSongFilter).map(formatMusicItem);
}
async function getTopLists() {
    const list = await (0, axios_1.default)({
        url: "https://u.y.qq.com/cgi-bin/musicu.fcg?_=1577086820633&data=%7B%22comm%22%3A%7B%22g_tk%22%3A5381%2C%22uin%22%3A123456%2C%22format%22%3A%22json%22%2C%22inCharset%22%3A%22utf-8%22%2C%22outCharset%22%3A%22utf-8%22%2C%22notice%22%3A0%2C%22platform%22%3A%22h5%22%2C%22needNewCode%22%3A1%2C%22ct%22%3A23%2C%22cv%22%3A0%7D%2C%22topList%22%3A%7B%22module%22%3A%22musicToplist.ToplistInfoServer%22%2C%22method%22%3A%22GetAll%22%2C%22param%22%3A%7B%7D%7D%7D",
        method: "get",
        headers: {
            Cookie: "uin=",
        },
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    });
    return list.data.topList.data.group.map((e) => ({
        title: e.groupName,
        data: e.toplist.map((_) => ({
            id: _.topId,
            description: _.intro,
            title: _.title,
            period: _.period,
            coverImg: _.headPicUrl || _.frontPicUrl,
        })),
    }));
}
async function getTopListDetail(topListItem) {
    var _a;
    const res = await (0, axios_1.default)({
        url: `https://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=5381&data=%7B%22detail%22%3A%7B%22module%22%3A%22musicToplist.ToplistInfoServer%22%2C%22method%22%3A%22GetDetail%22%2C%22param%22%3A%7B%22topId%22%3A${topListItem.id}%2C%22offset%22%3A0%2C%22num%22%3A100%2C%22period%22%3A%22${(_a = topListItem.period) !== null && _a !== void 0 ? _a : ""}%22%7D%7D%2C%22comm%22%3A%7B%22ct%22%3A24%2C%22cv%22%3A0%7D%7D`,
        method: "get",
        headers: {
            Cookie: "uin=",
        },
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    });
    return Object.assign(Object.assign({}, topListItem), { musicList: res.data.detail.data.songInfoList
            .filter(validSongFilter)
            .map(formatMusicItem) });
}
async function getRecommendSheetTags() {
    const res = (await axios_1.default.get("https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_tag_conf.fcg?format=json&inCharset=utf8&outCharset=utf-8", {
        headers: {
            referer: "https://y.qq.com/",
        },
    })).data.data.categories;
    const data = res.slice(1).map((_) => ({
        title: _.categoryGroupName,
        data: _.items.map((tag) => ({
            id: tag.categoryId,
            title: tag.categoryName,
        })),
    }));
    const pinned = [];
    for (let d of data) {
        if (d.data.length) {
            pinned.push(d.data[0]);
        }
    }
    return {
        pinned,
        data,
    };
}
async function getRecommendSheetsByTag(tag, page) {
    const pageSize = 20;
    const rawRes = (await axios_1.default.get("https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_by_tag.fcg", {
        headers: {
            referer: "https://y.qq.com/",
        },
        params: {
            inCharset: "utf8",
            outCharset: "utf-8",
            sortId: 5,
            categoryId: (tag === null || tag === void 0 ? void 0 : tag.id) || "10000000",
            sin: pageSize * (page - 1),
            ein: page * pageSize - 1,
        },
    })).data;
    const res = JSON.parse(rawRes.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, "")).data;
    const isEnd = res.sum <= page * pageSize;
    const data = res.list.map((item) => {
        var _a, _b;
        return ({
            id: item.dissid,
            createTime: item.createTime,
            title: item.dissname,
            artwork: item.imgurl,
            description: item.introduction,
            playCount: item.listennum,
            artist: (_b = (_a = item.creator) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
        });
    });
    return {
        isEnd,
        data,
    };
}
async function getMusicSheetInfo(sheet, page) {
    const data = await importMusicSheet(sheet.id);
    return {
        isEnd: true,
        musicList: data,
    };
}
module.exports = {
    platform: "QQ音乐",
    author: '猫头猫',
    version: "0.2.2",
    srcUrl: "https://mirror.ghproxy.com/https://raw.githubusercontent.com/dukunjueji/MusicFreePlugins/master/dist/qq/index.js",
    cacheControl: "no-cache",
    hints: {
        importMusicSheet: [
            "QQ音乐APP：自建歌单-分享-分享到微信好友/QQ好友；然后点开并复制链接，直接粘贴即可",
            "H5：复制URL并粘贴，或者直接输入纯数字歌单ID即可",
            "导入过程中会过滤掉所有VIP/试听/收费音乐，导入时间和歌单大小有关，请耐心等待",
        ],
    },
    primaryKey: ['id', 'songmid'],
    supportedSearchType: ["music", "album", "sheet", "artist", "lyric"],
    async search(query, page, type) {
        if (type === "music") {
            return await searchMusic(query, page);
        }
        if (type === "album") {
            return await searchAlbum(query, page);
        }
        if (type === "artist") {
            return await searchArtist(query, page);
        }
        if (type === "sheet") {
            return await searchMusicSheet(query, page);
        }
        if (type === "lyric") {
            return await searchLyric(query, page);
        }
    },
    async getMediaSource(musicItem, quality) {
        let finalUrl = "";
        if (musicItem.payPlay === 1) {
            const { resultUrl } = await getBiliUrl(musicItem.title + " " + musicItem.artist);
            finalUrl = resultUrl.url;
            const hostUrl = finalUrl.substring(finalUrl.indexOf("/") + 2);
            const _headers = {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
                accept: "*/*",
                host: hostUrl.substring(0, hostUrl.indexOf("/")),
                "accept-encoding": "gzip, deflate, br",
                connection: "keep-alive",
                referer: "https://www.bilibili.com/video/",
            };
            return {
                url: finalUrl,
                headers: _headers,
            };
        }
        else {
            let purl = "";
            let domain = "";
            let type = "128";
            if (quality === "standard") {
                type = "320";
            }
            else if (quality === "high") {
                type = "m4a";
            }
            else if (quality === "super") {
                type = "flac";
            }
            const result = await getSourceUrl(musicItem.songmid, type);
            if (result.req_0 && result.req_0.data && result.req_0.data.midurlinfo) {
                purl = result.req_0.data.midurlinfo[0].purl;
            }
            if (!purl) {
                return null;
            }
            if (domain === "") {
                domain =
                    result.req_0.data.sip.find((i) => !i.startsWith("http://ws")) ||
                        result.req_0.data.sip[0];
            }
            finalUrl = `${domain}${purl}`;
            return {
                url: finalUrl,
            };
        }
    },
    getLyric,
    getAlbumInfo,
    getArtistWorks,
    importMusicSheet,
    getTopLists,
    getTopListDetail,
    getRecommendSheetTags,
    getRecommendSheetsByTag,
    getMusicSheetInfo,
};
async function getBiliUrl(key) {
    const result = await searchAlbumBili(key, 1);
    const resultUrl = await GetMediaSourceByBili(result.data[0].bvid, result.data[0].aid, result.data[0].cid, "high");
    return { resultUrl: resultUrl };
}
async function searchAlbumBili(keyword, page) {
    const resultData = await searchBaseBili(keyword, page, "video");
    const albums = resultData.result.filter(validSongUrlFilter).map(formatMedia);
    console.log(albums);
    return {
        isEnd: resultData.numResults <= page * pageSize,
        data: albums,
    };
}
function formatMedia(result) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return {
        id: (_b = (_a = result.cid) !== null && _a !== void 0 ? _a : result.bvid) !== null && _b !== void 0 ? _b : result.aid,
        aid: result.aid,
        bvid: result.bvid,
        artist: (_c = result.author) !== null && _c !== void 0 ? _c : (_d = result.owner) === null || _d === void 0 ? void 0 : _d.name,
        title: he.decode((_f = (_e = result.title) === null || _e === void 0 ? void 0 : _e.replace(/(\<em(.*?)\>)|(\<\/em\>)/g, "")) !== null && _f !== void 0 ? _f : ""),
        album: (_g = result.bvid) !== null && _g !== void 0 ? _g : result.aid,
        artwork: ((_h = result.pic) === null || _h === void 0 ? void 0 : _h.startsWith("//"))
            ? "http:".concat(result.pic)
            : result.pic,
        description: result.description,
        tags: (_j = result.tag) === null || _j === void 0 ? void 0 : _j.split(","),
        date: dayjs.unix(result.pubdate || result.created).format("YYYY-MM-DD"),
    };
}
async function getCid(bvid, aid) {
    const params = bvid
        ? {
            bvid: bvid,
        }
        : {
            aid: aid,
        };
    const cidRes = (await axios_1.default.get("https://api.bilibili.com/x/web-interface/view?%s", {
        headers: headers,
        params: params,
    })).data;
    return cidRes;
}
async function GetMediaSourceByBili(bvid, aid, cid, quality) {
    var _a;
    if (!cid) {
        cid = (await getCid(cid, aid)).data.cid;
    }
    const _params = bvid
        ? {
            bvid: bvid,
        }
        : {
            aid: aid,
        };
    const res = (await axios_1.default.get("https://api.bilibili.com/x/player/playurl", {
        headers: headersBili,
        params: Object.assign(Object.assign({}, _params), { cid: cid, fnval: 16 }),
    })).data;
    let url;
    if (res.data.dash) {
        const audios = res.data.dash.audio;
        audios.sort((a, b) => a.bandwidth - b.bandwidth);
        switch (quality) {
            case "low":
                url = audios[0].baseUrl;
                break;
            case "standard":
                url = audios[1].baseUrl;
                break;
            case "high":
                url = audios[2].baseUrl;
                break;
            case "super":
                url = audios[3].baseUrl;
                break;
        }
    }
    else {
        url = res.data.durl[0].url;
    }
    const hostUrl = url.substring(url.indexOf("/") + 2);
    const _headers = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
        accept: "*/*",
        host: hostUrl.substring(0, hostUrl.indexOf("/")),
        "accept-encoding": "gzip, deflate, br",
        connection: "keep-alive",
        referer: "https://www.bilibili.com/video/".concat((_a = (bvid !== null && bvid !== undefined
            ? bvid
            : aid)) !== null && _a !== void 0 ? _a : ""),
    };
    return {
        url: url,
        headers: _headers,
    };
}
async function searchBaseBili(keyword, page, searchType) {
    const params = {
        context: "",
        page: page,
        page_size: pageSize,
        keyword: keyword,
        duration: "",
        tids_1: "",
        tids_2: "",
        __refresh__: true,
        _extra: "",
        highlight: 1,
        single_column: 0,
        platform: "pc",
        from_source: "",
        search_type: searchType,
        dynamic_offset: 0,
    };
    const res = (await axios_1.default.get("https://api.bilibili.com/x/web-interface/search/type", {
        headers: Object.assign(Object.assign({}, searchHeadersBili), { cookie: `buvid3=808CCB82-55C4-DFD4-15C2-23473853C38286589infoc` }),
        params: params,
    })).data;
    return res.data;
}
const searchHeadersBili = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63",
    accept: "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br",
    origin: "https://search.bilibili.com",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    referer: "https://search.bilibili.com/",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
};
async function printSearchResult() {
    try {
        const res = await getBiliUrl('天下 张杰');
        console.log(res);
    }
    catch (error) {
        console.error('Error:', error);
    }
}
printSearchResult();
