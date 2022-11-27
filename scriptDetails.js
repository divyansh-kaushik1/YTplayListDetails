const puppeteer = require('puppeteer');
const pdf = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { time } = require('console');

const link = "https://www.youtube.com/playlist?list=PLRBp0Fe2GpglJwMzaCkRtI_BqQgU_O6Oy";

let page;
(async function () {
    try {
        let browserOpen = puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        })

        let browserInstance = await browserOpen;
        let allTabsArr = await browserInstance.pages();
        page = allTabsArr[0];

        await page.goto(link);
        await page.waitForSelector('h1#title');
        let playlistName = await page.evaluate(function (select) { return document.querySelector(select).innerText }, 'h1#title');
        playlistName = playlistName.trim();
        let channelName = await page.evaluate(function (select) { return document.querySelector(select).innerText }, '#owner-container #text>.style-scope.yt-formatted-string');
        channelName = channelName.trim();

        let allData = await page.evaluate(getData, '#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer');
        console.log(playlistName, allData.noOfVideos, allData.noOfViews);
        let TotalVideos = allData.noOfVideos.split(" ")[0];
        console.log(TotalVideos);
        let currentVideos = await getCVideosLength();
        console.log(currentVideos);

        while (TotalVideos - currentVideos > 2) {
            await scrollToBottom();
            currentVideos = await getCVideosLength();
        }
        
        let finalList = await getStats();

        let folderpath = path.join(__dirname, "PlaylistDetails");
        dirCreater(folderpath);
        let subPath = path.join(folderpath, channelName);
        dirCreater(subPath);
        playlistName = playlistName.includes(":")?playlistName.split(":")[1].trim():playlistName;
        playlistName = playlistName.includes("/")?playlistName.split("/")[0].trim():playlistName;
        let filePath = path.join(subPath, playlistName + ".pdf");
        console.log(filePath);

        let pdfDoc = new pdf;
        pdfDoc.pipe(fs.createWriteStream(filePath));
        pdfDoc.text(JSON.stringify(finalList));
        pdfDoc.end();

    } catch (error) {
        console.log(error);
    }
})()

async function getCVideosLength() {
    let length = await page.evaluate(getLength, '#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer');
    return length;
}

async function scrollToBottom() {
    await page.evaluate(goToBottom);
    function goToBottom() {
        window.scrollBy(0, window.innerHeight);
    }
}

async function getStats() {
    let list = page.evaluate(getNameAndDuration, '#video-title', '#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer');
    return list;
}

function getData(selector) {
    let allElems = document.querySelectorAll(selector);
    let noOfVideos = allElems[0].innerText;
    let noOfViews = allElems[1].innerText;

    return {
        noOfVideos,
        noOfViews
    }
}

function getLength(durationSelect) {
    let durationElem = document.querySelectorAll(durationSelect);
    return durationElem.length;
}

function getNameAndDuration(videoSelector, durationSelector) {
    let videoElem = document.querySelectorAll(videoSelector);
    let durationElem = document.querySelectorAll(durationSelector);

    let currentlist = [];
    let totalVideoLength = 0;

    for (let i = 0; i < durationElem.length; i++) {
        let videoTitle = videoElem[i].innerText.trim();
        let duration = durationElem[i].innerText.trim();
        console.log(duration);
        totalVideoLength += getDurationToSecond(duration);
        currentlist.push({ videoTitle, duration });
    }

    totalVideoLength = secondsToHms(totalVideoLength);
    currentlist.push({ totalVideoLength });
    return currentlist;

    function getDurationToSecond(duration) {
        time = duration.split(":");
        if (time.length == 3) {
            return Number(time[0]) * 3600 + Number(time[1]) * 60 + Number(time[2]);
        } else if (time.length == 2) {
            return Number(time[0]) * 60 + Number(time[1]);
        } else {
            return Number(time);
        }
    }

    function secondsToHms(time) {
        time = Number(time);
        var h = Math.floor(time / 3600);
        var m = Math.floor(time % 3600 / 60);
        var s = Math.floor(time % 3600 % 60);

        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return hDisplay + mDisplay + sDisplay;
    }
}

function dirCreater(folderpath) {
    if (fs.existsSync(folderpath) == false) {
        fs.mkdirSync(folderpath);
    }
}