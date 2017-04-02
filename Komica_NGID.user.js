// ==UserScript==
// @name         Komica NGID
// @description  NG id and post on komica
// @namespace    https://github.com/usausausausak
// @include      http://*.komica.org/*/*
// @include      https://*.komica.org/*/*
// @version      1.3.1
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==
(function (window) {
    GM_addStyle(`
        .ngid-ngthread > .reply, .ngid-ngpost > *:not(.post-head) {
            display: none;
        }

        .ngid-ngpost {
            opacity: 0.3;
        }

        .ngid-button > div {
            display: inline-block;
            visibility: hidden;
            position: absolute;
            padding: 5px 10px;
            background-color: rgba(238, 170, 136, 0.9);
            border-radius: 5px;
            overflow: hidden;
            white-space: nowrap;
            max-height: 0px;
            transition: max-height 200ms;
        }

        .ngid-button:hover > div {
            visibility: visible;
            max-height: 200px;
        }
    `);

    let ngIds = GM_getValue("ngIdList", "").split(/\n/)
        .map(v => v.replace(/^ID:/g, "")).filter(v => v.length);
    let ngNos = GM_getValue("ngNoList", "").split(/\n/)
        .map(v => v.replace(/^No./g, "")).filter(v => v.length);
    let ngWords = GM_getValue("ngWordList", "").split(/\n/)
        .filter(v => v.length);

    function doNgPost(post) {
        if (post.classList.contains("threadpost")) {
            post.parentElement.classList.add("ngid-ngthread");
        }
        post.classList.add("ngid-ngpost");
    }

    function removeNgPost(post) {
        if (post.classList.contains("threadpost")) {
            post.parentElement.classList.remove("ngid-ngthread");
        }
        post.classList.remove("ngid-ngpost");
    }

    function doNgList(post) {
        let idSpan = post.querySelector(".post-head .id") ||
            post.querySelector(".post-head .now");
        let contentBlock = post.querySelector(".quote");

        let postNo = post.dataset.no;
        let postId = idSpan.dataset.id ||
            idSpan.innerHTML.replace(/^.*ID:/, "");
        let postContent = contentBlock.innerText;

        if (ngIds.includes(postId)) {
            console.log(`NGID ${postId}`);
            doNgPost(post);
        } else if (ngNos.includes(postNo)) {
            console.log(`NGNO ${postNo}`);
            doNgPost(post);
        } else if (ngWords.some(word => postContent.includes(word))) {
            console.log(`NGWord`);
            doNgPost(post);
        } else if (post.classList.contains("ngid-ngpost")) {
            removeNgPost(post);
        }
    }

    // add NG button
    function addNgIdCb(ev) {
        let id = this.dataset.id;
        if (!ngIds.includes(id)) {
            console.log(`add NGID ${id}`);
            ngIds.push(id);
            saveSetting();
        }
    }

    function addNgNoCb(ev) {
        let no = this.dataset.no;
        let isNgPost = document.querySelector(`.post[data-no="${no}"]`)
            .classList.contains("ngid-ngpost");
        if (isNgPost) {
            ngNos = ngNos.filter(v => v !== no);
            saveSetting();
        } else if (!ngNos.includes(no)) {
            console.log(`add NGNO ${no}`);
            ngNos.push(no);
            saveSetting();
        }
    }

    function initPost(post) {
        let idSpan = post.querySelector(".post-head .id") ||
            post.querySelector(".post-head .now");

        let postNo = post.dataset.no;
        let postId = idSpan.dataset.id ||
            idSpan.innerHTML.replace(/^.*ID:/, "");

        let ngButton = document.createElement("span");
        ngButton.className = "text-button ngid-button";

        let delButton = post.querySelector(".post-head .-del-button");
        let parent = delButton.parentElement;
        parent.insertBefore(ngButton, delButton);

        let ngButtonContainer = document.createElement("div");
        ngButton.appendChild(ngButtonContainer);
        ngButton.appendChild(document.createTextNode("NG"));

        let ngIdButton = document.createElement("div");
        ngIdButton.className = "text-button";
        ngIdButton.dataset.id = postId;
        ngIdButton.innerHTML = `NGID: ${postId}`;
        ngIdButton.addEventListener("click", addNgIdCb, false);

        let ngNoButton = document.createElement("div");
        ngNoButton.className = "text-button";
        ngNoButton.dataset.no = postNo;
        ngNoButton.innerHTML = `Toggle NG post: No.${postNo}`;
        ngNoButton.addEventListener("click", addNgNoCb, false);

        ngButtonContainer.appendChild(ngNoButton);
        ngButtonContainer.appendChild(ngIdButton);
    }

    function handlePost(post) {
        if (!post.querySelector(".ngid-button")) {
            initPost(post);
        }
        doNgList(post);
    }

    document.querySelectorAll(".post").forEach(handlePost);

    // observe thread expand
    let threadObserver = new MutationObserver(function (records) {
        let postReplys = records.reduce((total, record) => {
            for (let node of record.addedNodes) {
                if ((node.classList) &&
                    (node.classList.contains("reply"))) {
                    total.push(node);
                }
            }
            return total;
        } , []);
        let replySize = postReplys.length;
        console.log(`Reply size change: ${replySize}`);
        postReplys.forEach(post => handlePost(post));
    });

    document.querySelectorAll(".thread").forEach(thread => {
        threadObserver.observe(thread, { childList: true });
    });

    // add setting block
    let ngSettingIdInput = document.createElement("textarea");
    ngSettingIdInput.style.height = "10em";

    let ngSettingNoInput = document.createElement("textarea");
    ngSettingNoInput.style.height = "10em";

    let ngSettingWordInput = document.createElement("textarea");
    ngSettingWordInput.style.height = "10em";

    function updateSetting() {
        ngSettingIdInput.value = ngIds.map(v => `ID:${v}`).join("\n");
        ngSettingNoInput.value = ngNos.map(v => `No.${v}`).join("\n");
        ngSettingWordInput.value = ngWords.join("\n");
    }

    function saveSettingCb(ev) {
        ngIds = ngSettingIdInput.value.split(/\n/)
            .map(v => v.replace(/^ID:/g, "")).filter(v => v.length);
        ngNos = ngSettingNoInput.value.split(/\n/)
            .map(v => v.replace(/^No./g, "")).filter(v => v.length);
        ngWords = ngSettingWordInput.value.split(/\n/)
            .filter(v => v.length);
        saveSetting();
    }

    function saveSetting() {
        GM_setValue("ngIdList", ngIds.filter(v => v.length)
            .map(v => `ID:${v}`).join("\n"));
        GM_setValue("ngNoList", ngNos.filter(v => v.length)
            .map(v => `No.${v}`).join("\n"));
        GM_setValue("ngWordList", ngWords.filter(v => v.length)
            .join("\n"));
        updateSetting();

        // update posts
        document.querySelectorAll(".post").forEach(doNgList);
    }

    let ngSettingSave = document.createElement("button");
    ngSettingSave.style.marginTop = "5px";
    ngSettingSave.innerHTML = "Save";
    ngSettingSave.addEventListener("click", saveSettingCb, false);

    let ngSettingBlock = document.createElement("div");
    ngSettingBlock.style = `position: absolute; right: 0px;
                            display: none; flex-direction: column;
                            width: 20em;  padding: 5px;
                            background-color:rgba(0, 0, 0, 0.2);`;
    ngSettingBlock.appendChild(document.createTextNode("NGID:(id per line)"));
    ngSettingBlock.appendChild(ngSettingIdInput);
    ngSettingBlock.appendChild(document.createTextNode("NGNO:(no per line)"));
    ngSettingBlock.appendChild(ngSettingNoInput);
    ngSettingBlock.appendChild(document.createTextNode("NGWord:(word per line)"));
    ngSettingBlock.appendChild(ngSettingWordInput);
    ngSettingBlock.appendChild(ngSettingSave);

    function switchSettingCb(ev) {
        let isShow = ngSettingBlock.style.display === "none";
        ngSettingBlock.style.display = isShow ? "flex" : "none";
        updateSetting();
    }

    let ngSetting = document.createElement("a");
    ngSetting.className = "text-button";
    ngSetting.innerHTML = "NGID";
    ngSetting.addEventListener("click", switchSettingCb, false);

    let toplink = document.querySelector("#toplink");
    toplink.appendChild(document.createTextNode(" ["));
    toplink.appendChild(ngSetting);
    toplink.appendChild(document.createTextNode("]"));

    toplink.parentElement.insertBefore(ngSettingBlock, toplink.nextSibling);
})(window);
// vim: set sw=4 ts=4 sts=4 et:
