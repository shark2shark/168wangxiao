// ==UserScript==
// @name         168网校自动刷课
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       original
// @grant        none
// @match        *://*.168wangxiao.com/*
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';
    initPanel()
    $('#startHangUp').on('click', function() {
        startHangUp();
    })
    $('#msgSlider').click(function () {
        if ($(this).attr('status') == 'open') {
            closeSlider()
        } else if ($(this).attr('status') == 'close') {
            openSlider()
        }
    })
})();

var setTimeoutList = []
var setIntervalList = []
var videoId = ''

function initPanel() {
    $('body').append('<style type="text/css">#msgBox::-webkit-scrollbar{width:0!important}</style><div id="autoHangUpBox"style="font-family: 黑体; z-index: 999; width: 200px;height: 400px; background: white; opacity: 1; position: absolute; bottom: 0px; left: 0px; margin: 0px; border-radius: 5px;"><button id="startHangUp"style="width: 100%; height: 40px; border-radius: 0px; background: green; font-size: 18px; color: white;font-weight: bold; cursor: pointer;">开始挂机</button><div id="msgBox"style="width: 100%; height: 360px; background: black; font-size: 14px; color: white; border-radius: 0px; overflow-y: scroll;padding-top: 10px"></div><div id="msgSlider"status="open"style="z-index: 998;background: Gainsboro; width: 25px;height: 120px;position: relative; bottom: 225px; left: 200px; line-height: 120px;border-radius: 0px 5px 5px 0px; font-size:20px; text-align: center; padding-right: 30px; color: white; cursor: pointer; font-weight: bold;">《</div></div>')
}

function startHangUp() {
    if (location.hash == '#/learningcenter/LearningCentreDetails') {
        $('#startHangUp').css('background', 'white')
        $('#startHangUp').css('color', 'black')
        $('#startHangUp').attr('disabled', true)
        $('#startHangUp').text('挂机中')
        start()
    } else {
        msg('<span style="font-weight:bold">请进入课程播放页面后再开始挂机操作!</span>', 'red')
    }
}

function start() {
    playVideo()
    let timer = setTimeout(function() {
        listening()
    }, 10000)
    setTimeoutList.push(timer)
}

function listening() {
    // 检测是否弹出莫弹框
    let timer = setInterval(function() {
        if($('.ant-modal-body').length > 0) {
            if ($('.ant-btn-primary').text() != '重 新 观 看') {
                next()
            }
            $('.ant-btn-primary').trigger('click')
        }
    }, 500)
    // 检测是否由于窗口变动等原因引起的video变化
    let timerChange = setInterval(function() {
        if (videoId != '' && $($('video').get(0)).attr('id') != videoId) {
            msg('检测到播放器变化，以为你自动播放', 'red')
            videoId = ''
            clerAllTimer()
            start()
        }
    }, 500)
    setIntervalList.push(timer)
    setIntervalList.push(timerChange)
}

function next() {
    setTimeout(function() {
        msg('检测到播放完毕!')
        nextClass()
        videoId = ''
        playVideo()
    }, 3000)
}

function nextClass() {
    msg('即将播放下一节课')
    if ($('.ant-tree-treenode-selected').parent().children().length - 1 == $('.ant-tree-treenode-selected').index()) {
        if ($('.ant-tree-treenode-selected').parents('li').parent().children().length - 1 == $('.ant-tree-treenode-selected').parents('li').index()) {
            msg('恭喜你,当前课程已经播放完毕', 'green')
            window.location.reload()
        } else {
            $('.ant-tree-treenode-selected').parents('li').next().find('ul').find('li').first().find('.ant-tree-title').trigger('click')
        }
    } else {
        $('.ant-tree-treenode-selected').next().find('.ant-tree-title').trigger('click')
    }
}

function playVideo() {
    msg('准备播放中')
    let timer = setTimeout(function() {
        var player = document.getElementsByClassName('vjs-tech')
        if (player.length > 0) {
            msg('开始播放 <span style="color:green; font-weight: bold;">' + $('.ant-tree-treenode-selected').text() + '</span>')
            videoId = $(player[0]).attr('id')
            console.log(videoId, 'videoId')
            player[0].muted = true
            player[0].play()
            player[0].addEventListener('ended', function() {
                next()
            })
            // 不让暂停
            player[0].addEventListener('pause', function() {
                msg('检测到了暂停操作，为了刷题速度，已帮你取消了暂停操作', 'red')
                player[0].play()
            })
            console.log(player);
        } else {
            msg('自动做题')
            getAnswer()
        }
    }, 5000)
    setTimeoutList.push(timer)
}

function autoTest(list) {
    // 没有获取到答案就瞎几把做
    if (!list) {
        $('.ant-checkbox-input').trigger('click')
        $('.ant-radio').trigger('click')
        $('.ant-input').focus()
        var doms = document.getElementsByClassName('ant-input')
        var st = 'unknow'
        for (let i = 0; i < doms.length; i ++) {
            var dom = doms[i]
            var evt = new InputEvent('input', {
                inputType: 'insertText',
                data: st,
                dataTransfer: null,
                isComposing: false
            });
            dom.value = st;
            dom.dispatchEvent(evt);
        }
    } else {
        for (let i = 0; i < list.length; i ++) {
            let item = list[i]
            if (item.que_type_str == "单选题") {
                makeRadio(i, item.answer)
            } else if (item.que_type_str == "判断题") {
                makeJudge(i, item.answer)
            } else if (item.que_type_str == "多选题") {
                multipleChoice(i, item.answer)
            } else if (item.que_type_str == "填空题") {
                makeFull(i, item.answer)
            }
        }
    }
    let timerSub = setTimeout(function() {
        $('.ant-btn-primary').removeAttr('disabled')
        $('.ant-btn-primary').click()
        msg('做题完毕2秒后播放下一节')
    }, 1000)
    let timer = setTimeout(function() {
         nextClass()
         playVideo()
    }, 3000)
    setTimeoutList.push(timerSub)
    setTimeoutList.push(timer)
}

function getAnswer() {
    msg("正在获取答案")
    fetch("https://xatu.168wangxiao.com/other/student/chapter/view", {
        headers: {
            "authorization": localStorage.getItem('token'),
            "content-type": "application/json",
        },
        body: JSON.stringify({token: localStorage.getItem('token'), id: localStorage.getItem("chapterid")}),
        method: "POST",
    })
        .then(response => response.json())
        .then(data => {
        autoTest(data.data.questionlist)
    })
        .catch((error) => {
        console.error('获取答案出错:', error);
        autoTest(undefined)
    });
}

function hasVideo() {
    return document.getElementsByClassName('vjs-tech').length > 0
}

function msg(str, color) {
    if (!color) {
        color = 'white'
    }
    let date = new Date()
    $('#msgBox').append('&nbsp;>_&nbsp;' + date.toLocaleTimeString() + '<p style="color:' + color + '">' + str + '</p>')
    $('#msgBox').scrollTop($('#msgBox')[0].scrollHeight);
}

function getAnswerMap() {
    return {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, "I": 8, '对': 0, '错': 1}
}

function getAnswerOptions() {
    return $('.videodisplayh3').children(':first').children(':first').children();
}

function makeRadio(index, answer) {
    let answerIndex = getAnswerMap()[answer]
    $(getAnswerOptions().get(index)).find('.ant-radio').each(function(itemIndex) {
        if (itemIndex == answerIndex) {
            $(this).trigger('click')
        }
    })
}

function makeJudge(index, answer) {
    makeRadio(index, answer)
}

function multipleChoice(index, answer) {
    let answerList = answer.split('.')
    let options = getAnswerOptions()
    console.log(answerList)
    let checkbox = $(options.get(index)).find('.ant-checkbox-input')
    for (let j = 0; j < checkbox.length; j ++) {
        for (let i = 0; i < answerList.length; i++) {
            if (j == getAnswerMap()[answerList[i]]) {
                let timer = setTimeout(function() {
                    checkbox[j].click()
                }, (j + 1) * 100)
                setTimeoutList.push(timer)
            }
        }
    }
}

function makeFull(index, answer) {
    let regT = /<[^>]+>/g
    if (regT.test(answer)) {
        let reg = /\\/g
        answer = answer.replace(reg, '')
        answer = $(answer).text()
    }
    let element = $(getAnswerOptions()).get(index)
    $(element).find('.ant-input').focus();
    let dom = $(element).find('.ant-input').get(0)
    let evt = new InputEvent('input', {
        inputType: 'insertText',
        data: answer,
        dataTransfer: null,
        isComposing: false
    });
    dom.value = answer;
    dom.dispatchEvent(evt);
}

function clerAllTimer() {
    for(let i = 0; i < setTimeoutList.length; i ++) {
        clearTimeout(setTimeoutList[i])
    }
    for(let j = 0; j < setTimeoutList.length; j ++) {
        clearTimeout(clearInterval[j])
    }
}

function openSlider() {
    $('#msgSlider').attr('status', 'open')
    $('#msgSlider').text('《')
    $('#msgSlider').css('padding-left', '0px')
    $('#msgSlider').css('padding-right', '30px')
    $('#autoHangUpBox').animate({left: '0px'})
}

function closeSlider() {
    $('#msgSlider').attr('status', 'close')
    $('#msgSlider').text('》')
    $('#msgSlider').css('padding-right', '20px')
    $('#msgSlider').css('padding-left', '8px')
    $('#autoHangUpBox').animate({left: '-200px'})
}