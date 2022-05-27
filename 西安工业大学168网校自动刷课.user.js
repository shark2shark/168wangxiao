// ==UserScript==
// @name         168网校刷课
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  本插件仅限学习交流使用，禁止商业使用!
// @author       original
// @grant        none
// @match        *://*.168wangxiao.com/*
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';
    // 初始化控制框
    initPanel()
    // 检查当前学期
    checkSemester()
    // 开始学习
    $('#startHangUp').on('click', function() {
        stateOfLearning = true;
        checkHash();
        $('#startHangUp').text('正在学习')
        $('#startHangUp').attr('disabled', true)
        $('#startHangUp').css({'background': 'white', 'color': 'black'})
    })

    // 操作框
    var boxShow = true;
    $('#msgSlider').click(function () {
        let msgSlider = $('#msgSlider');
        let autoHangUpBox = $('#autoHangUpBox')
        if (true === boxShow) {
            boxShow = false;
            msgSlider.text(">>")
            msgSlider.css('padding-right', '20px')
            msgSlider.css('padding-right', '8px')
            autoHangUpBox.animate({left: '-200px'})
        } else {
            boxShow = true;
            msgSlider.text("<<")
            msgSlider.css('padding-right', '0px')
            msgSlider.css('padding-right', '30px')
            autoHangUpBox.animate({left: '0px'})
        }
    })
})();

// 学期
var semester = '第一学期';

// 强制做题
var compulsory = true;

// 视频从头播放
var videoScratch = false;

// 自动执行
var autoExecList = [];

// 计划任务
var scheduledTasks = [];

var autoExec = setInterval(function(){
    if (0 < autoExecList.length) {
        autoExecList.shift()()
    }
}, 1500)

scheduledTasks.push(autoExec)

// 监听视频播放弹框
var autoMonitorChanges = setInterval(function() {
    let modal = $('.ant-modal-body > .ant-modal-confirm-body-wrapper').children()
    if (0 < modal.length) {
        let btnText = modal.eq(1).text().replace(/\s/g, '');
        if (btnText) {
            switch(btnText) {
                case '重新观看':
                    videoScratch = true;
                    msg('检测到播放异常，即将恢复', 'red');
                    break;

                case '关闭':
                    clickChapterNextDom();
                    msg('播放完成，即将跳转到下一节', 'green')
                    break;
            }
            modal.eq(1).find('button').click();
        }
    }
}, 300);

scheduledTasks.push(autoMonitorChanges)

// 选择题选项
let optionMap = [...Array(26).keys()].map(i => String.fromCharCode(i + 65));

// state of learning
var stateOfLearning = false;

// 检测页面点击事件
$('#app').on('click', function(obj) {
    if (true === stateOfLearning && "mouse" == obj.pointerType) {
        autoExecList.push(checkHash)
        msg('检测到页面人为点击，即将恢复', 'red');
    }
});

// 忽略F12
$(document).on('keydown', function(obj) {
    if (stateOfLearning && 'F12' === obj.originalEvent.code) {
        autoExecList.push(checkHash)
        msg('检测到[F12]事件, 即将恢复', 'red')
    }
});

// 监听窗口大小变化
$(window).resize(function() {
    if (stateOfLearning) {
        autoExecList.push(checkHash)
        msg('检测到窗口变化, 即将恢复', 'red')
    }
});

// 检查当前页
function checkHash() {
    let uriMap = {
        'class_center': {uri: '#/LearningCenter', func: 'classCenter'},
        'course_details': {uri: '#/learningcenter/CourseDetails', func: 'courseDetails'},
        'learn_center': {uri: '#/learningcenter/LearningCentreDetails', func: 'learnCenter'},
    };
    let toLearn = true;
    $.each(uriMap, function(i, item) {
        let current = location.hash.match(item.uri)
        if (null != current) {
            toLearn = false;
            eval(item.func)()
        }
    })
    if (toLearn) {
        autoExecList.push(classCenter);
        location.href = uriMap.class_center.uri;
    }
}

// 检查当前学期
function checkSemester(list) {
    if (undefined === list) {
        curl('semester/list', {}, checkSemester);
        return false;
    }
    if (1 > list.length) {
        msg('学期数据获取异常', 'red')
        console.error('学期数据获取异常')
    } else {
        $.each(list, function(i, item) {
            if ('1' == item.state) {
                semester = item.name
                msg('<p style="margin-top: -15px; font-size: 16px;" align="center"><strong>『'+ semester+'』</strong></p>')
            }
        })
    }
}

// 课程
function classCenter(list) {
    if (undefined === list) {
        curl('plan/list', {
            "page": 1,
            "rows": 15,
            "semester": semester,
            "type": "1"
        }, classCenter);
        return false;
    }

    if (1 > list.length) {
        msg('课程列表数据获取异常', 'red')
        console.error('课程列表数据获取异常')
    } else {
        let isOver = true;
        $.each(list, function(i, item) {
            if (100 > item.duration) {
                isOver = false;
                msg("正在学习...")
                msg('正在跳转至：'+item.name)
                autoExecList.push(courseDetails)
                location.href = '#/learningcenter/CourseDetails?id='+item.plan_id+'&state=1'
                return false;
            }
        })
        if (true === isOver) {
            msg('你已学完所有课程！', 'green')
            $.each(scheduledTasks, function(i, timer) {
                // 清除所有任务
                clearInterval(timer)
            });
            stateOfLearning = false;
            location.href = '#/LearningCenter'
            $('#startHangUp').text('下学期再来')
        }
    }
}

// 目录
function courseDetails(data) {
    if (undefined === data) {
        curl('plan/view', {
            "id": getUrlParam('id'),
            "grade_id": localStorage.getItem('grade_id')
        }, courseDetails);
        return false;
    }
    if (undefined === data.id) {
        msg('课程目录获取异常', 'red')/
        console.error('课程目录获取异常')
    } else {
        if (100 > data.duration) {
            $.each($('.ant-list'), function(i, item) {
                let state = '已完成' == $(item).find('img').attr('alt');
                if (false === state) {
                    msg('正在跳转至未完成章节：'+$(item).first('span').text())
                    $(item).find('li').click()
                    autoExecList.push(learnCenter)
                    return false;
                }
            })
        } else {
            classCenter();
            location.href = '#/LearningCenter'
        }
    }
}

// 刷课
function learnCenter(info) {
    if (undefined === info) {
        curl('chapter/view', {id: localStorage.getItem('chapterid')}, learnCenter)
        return false;
    }
    let video = $.parseJSON(info.video);
    let checkCompulsory = function() {
        return checkCompulsory && 0 == video.length;
    };
    if (true === info.isover && !checkCompulsory()) {
        clickChapterNextDom();
        msg(info.title+'：已完成，正在检测跳转至未完成小节', 'green');
        return false;
    }
    1 > video.length ? learnChapterTest(info) : learnPlayVideo(info);
}

// 播放视频
function learnPlayVideo(info) {
    msg('正在播放：'+info.title)
    let player = $('video')[0];
    let startPlay = function() {
        setTimeout(function() {
            player.muted = true;
            player.play();
        }, 500)
    }
    if (videoScratch) {
        player.currentTime = 0;
    }
    videoScratch = false;
    startPlay();
    player.addEventListener('ended', function() {
        clickChapterNextDom();
        msg('播放完成：'+info.title, 'green');
    });
    player.addEventListener('pause', function(o) {
        msg('检测到暂停操作，即将恢复', 'red')
        startPlay();
    });
}

// 章节测试
function learnChapterTest(info) {
    msg(info.title+'：正在做题')

    let questions = $('.videodisplayh3 > div > div').children()

    $.each(questions, function(i, item) {
        let question = info.questionlist[i];
        switch (question.que_type_str) {
            case '单选题':
            case '多选题':
            case '判断题':
                var answer = question.answer.match(/[\u4e00-\u9fa5|\w]/g);
                var options = $(item).find('.answers label');
                for (let o = 0; o < options.length; o++) {
                    let val = $(options[o]).find('input').val();
                    if (1 < answer.length) {
                        $.each(answer, function(k, v) {
                            if(val == optionMap.indexOf(v)) {
                                setTimeout(function() {
                                    $(options[o]).eq(0).click();
                                }, 50)
                            }
                        })
                    } else if(val == optionMap.indexOf(answer[0]) || val == answer[0]) {
                        $(options[o]).eq(0).click();
                    }
                }
                break;

            default: // 填空题
                answer = []
                try {
                    $.each($(question.answer), function(k, p) {
                        let text = $(p).text().trim()
                        text = text.replace(/^答案(\:|：)?/gi, '')
                        if (text) {
                            answer.push(text)
                        }
                    })
                } catch (err) {
                    answer.push(question.answer)
                }
                var inpuTextarea = $(item).find('.ant-input').get(0);
                $(inpuTextarea).val(answer.join("\r\n"))
                inpuTextarea.dispatchEvent(new InputEvent('input', {
                    inputType: 'insertText'
                }))
                break;
        }
    })

    msg(info.title+"：已完成，即将跳转到下一节")

    // 提交答案
    setTimeout(function(){
        let submitBtn = $('.ant-tabs-tabpane').find('button.ant-btn');
        submitBtn.removeAttr('disabled');
        submitBtn.click();

        // 跳转到下一节
        clickChapterNextDom()
    }, 1000)
}

// 点击下节课程
function clickChapterNextDom() {
    function getChapterNextDom() {
        let nextDom;
        let liDoms = $('.xiang > ul > li > ul').find('li');
        for (let i = 0; i < liDoms.length; i++) {
            if (0 < liDoms[i].className.indexOf('ant-tree-treenode-selected')) {
                nextDom = liDoms[++i];
                break;
            }
        }
        return undefined === nextDom ? false : nextDom;
    }
    let nextDom = getChapterNextDom();
    if (!nextDom) {
        classCenter()
        msg('当前课程已完成，即将跳转至下个未学习课程', 'green')
        return false;
    }
    autoExecList.push(learnCenter);
    $(getChapterNextDom()).find('span').eq(1).click();
}

// 请求接口数据
function curl(uri, param, func) {
    let host = "https://xatu.168wangxiao.com/other/student/";
    fetch(host + uri, {
        headers: {
            "authorization": localStorage.getItem('token'),
            "content-type": "application/json",
        },
        body: JSON.stringify(Object.assign({token: localStorage.getItem('token')}, param)),
        method: "POST",
    })
        .then(response => response.json())
        .then(data => {
        if (200 == data.errCode) {
            if (undefined !== func) func(data.data)
        } else {
            console.error('接口返回异常:', data.message);
        }
    })
        .catch((error) => {
        console.error('接口请求异常:', error);
    });
}

// 控制框
function initPanel() {
    $('body').append('<style type="text/css">#msgBox::-webkit-scrollbar{width:0!important}</style><div id="autoHangUpBox"style="font-family: 黑体; z-index: 999; width: 200px;height: 400px; background: white; opacity: 1; position: absolute; bottom: 15px; left: 0px; margin: 0px; border-radius: 5px;"><button id="startHangUp"style="width: 100%; height: 40px; border-radius: 0px; background: green; font-size: 18px; color: white;font-weight: bold; cursor: pointer;">开始学习</button><div id="msgBox"style="width: 100%; height: 360px; background: black; font-size: 14px; color: white; border-radius: 0px; overflow-y: scroll;padding-top: 10px"></div><div id="msgSlider"status="open"style="z-index: 998;background: Gainsboro; width: 25px;height: 120px;position: relative; bottom: 225px; left: 200px; line-height: 120px;border-radius: 0px 5px 5px 0px; font-size:20px; text-align: center; padding-right: 30px; color: white; cursor: pointer; font-weight: bold;">《</div></div>')
}

// 向控制框输出信息
function msg(str, color) {
    if (!color) {
        color = 'white'
    }
    $('#msgBox').append('&nbsp;>_&nbsp;<p style="color:' + color + '"><strong>' + str + '</strong></p>')
    $('#msgBox').scrollTop($('#msgBox')[0].scrollHeight);
}

function getUrlParam(m) {
    var sValue = location.hash.match(new RegExp("[\?\&]" + m + "=([^\&]*)(\&?)", "i"));
    return sValue ? sValue[1] : sValue;
}