// http://blogs.microsoft.co.il/gilf/2013/07/22/quick-tip-typescript-declare-keyword/
declare var chrome;
declare var Sortable;
let g_sortable;
let g_isPopup:boolean;

/*
 *
 */
// @ts-ignore
function init():void {
    let g_mainWindowId:number = parseInt(getQueryParameterByName("mainWindowId"));
    g_isPopup = "true" === getQueryParameterByName("isPopup");
    log(">> panel.init: mainWindowId=" + g_mainWindowId + ", g_isPopup=" + g_isPopup);

    if (g_isPopup) {
        // extension is displayed as a standard popup
        // popup dynamically adjusts to its content: need to explicitly set the width in case the search returns nothing
        byid("main").setAttribute("style", "width:" + getPanelWidthFromStorage() + "px; height: 100px;");

    } else {
        // extension is displayed in a side panel
        window.addEventListener("resize", onWindowResized);
    }

    g_sortable = createSortable(byid("list"));

    let queryParams = g_mainWindowId ? {windowId: g_mainWindowId} : {currentWindow: true};
    chrome.tabs.query(queryParams, createTabList);
    /////////
    // SEARCH
    /////////
    byid("searchInput").addEventListener("keyup", search);
    // https://www.w3schools.com/jsref/event_onsearch.asp
    byid("searchInput").addEventListener("search", search);
    byid("searchInput").focus();
    ///////////
    // Options
    //////////
    byid("config").addEventListener("click", function () {
        chrome.runtime.openOptionsPage();
    });
    ///////////
    // Help
    //////////
    byid("help").addEventListener("click", function () {
        window.open("https://youtu.be/S5v1gYUEqmk");
        //chrome.runtime.getBackgroundPage(function() {});
    });
    /////////
    // RENAME
    /////////
    byid("renameTabNameInput").addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            byid("renameOkButton").click();
        }
    });
    byid("renameCancelButton").addEventListener("click", function () {
        byid("renameDialog").style.display = "none";
    });
    byid("renameOkButton").addEventListener("click", rename);
    log("<< panel.init");
}


function onWindowResized(event):void {
    let width:number = event.currentTarget.outerWidth;
    log(">> panel.onWindowResized:width=" + width);
    savePanelWidthToStorage(width);
    log("<< panel.onWindowResized");
}


function search(event):void {
    let searched:string = event.target.value;
    log(">> panel.search: searched='" + searched + "'");
    if (searched.length > 0) {
        g_sortable.option("disabled", true);
        let liElts:NodeList = byid('list').childNodes;
        for (let i = 0; i < liElts.length; i++) {
            let nextLiElt:HTMLLIElement = <HTMLLIElement>liElts[i];
            let titleElt:HTMLSpanElement = byclass(nextLiElt, "title");
            let matches = titleElt.textContent.match(new RegExp(searched, "i"));
            if (matches) {
                nextLiElt.style.display = "inline-block";
                byclass(nextLiElt, "drag").style.cursor = "no-drop";
                byclass(nextLiElt, "drag").title = "drag'n'drop is disabled when searching";
                removeTextHighlight(titleElt);
                addTextHighlight(titleElt, matches[0], "searched");
            } else {
                nextLiElt.style.display = "none";
            }
        }
    } else {
        g_sortable.option("disabled", false);
        location.reload();
    }
    log("<< panel.search");
}


function rename():void {
    log(">> panel.rename");
    let tabId:string = (<HTMLInputElement>byid('renameTabIdInput')).value;
    let tabName:string = (<HTMLInputElement>byid('renameTabNameInput')).value;
    chrome.tabs.executeScript(parseInt(tabId), {code: "document.title = '" + tabName + "'"}, function (results) {
        byid("renameDialog").style.display = "none";
        byclass(byid(tabId), "title").textContent = tabName;
    });
    log("<< panel.rename");
}


function previewTab(event):void {
    let tabId:number = parseInt(event.currentTarget.getAttribute("id"));
    log(">> panel.previewTab: tabId=" + tabId);
    chrome.runtime.getBackgroundPage(function (bgPage) {
        bgPage.g_clickedTabId = tabId;
        chrome.tabs.update(tabId, {active: true});
    });
    let liElts:NodeList = byid('list').childNodes;
    for (let i = 0; i < liElts.length; i++) {
        // https://www.w3schools.com/jsref/prop_element_classlist.asp
        // TODO: do not loop over all the nodes: find the ones who have the "selected" class and remove it
        (<HTMLLIElement>liElts[i]).classList.remove("selected");
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/Event
    // event.target actually points to the HTML element you clicked on it and NOT to the "li" element:
    event.currentTarget.classList.add("selected");
    log("<< panel.previewTab");
}


function openTab(event):void {
    log(">> panel.openTab");
    let tabId:string = event.currentTarget.getAttribute("id");
    chrome.tabs.update(parseInt(tabId), {active: true});
    window.close();
    log(">> panel.openTab");
}


function closeTab(event):void {
    log(">> panel.closeTab");
    let liElt:HTMLLIElement = event.currentTarget.parentNode;
    let isSelected:boolean = liElt.classList.contains("selected");
    let tabId:string = liElt.getAttribute("id");
    log("panel.closeTab: tabId=" + tabId + ", isSelected=" + isSelected);
    chrome.tabs.remove(parseInt(tabId), function () {
        liElt.parentNode.removeChild(liElt);
        // we've closed the currently selected tab -> need to find which one is now selected
        if (isSelected) {
            // required so that the newly selected tab is properly highlighted in the list
            // for some reason, invoking "chrome.tabs.query({active:true})" returns the
            // tab that was just closed by chrome.tabs.remove() so we can't use it.
            location.reload();
        }
    });
    event.stopPropagation();
    event.preventDefault();
    log("<< panel.closeTab");
}


function showRenameDialog(event):void {
    log(">> panel.showRenameDialog");
    (<HTMLInputElement>byid('renameTabIdInput')).value = event.currentTarget.parentNode.getAttribute("id");
    let renameTabNameInputElt:HTMLInputElement = <HTMLInputElement>byid('renameTabNameInput');
    renameTabNameInputElt.value = byclass(event.currentTarget.parentNode, "title").innerHTML;
    renameTabNameInputElt.setSelectionRange(0, 0);

    let dialogElt:HTMLElement = byid('renameDialog');
    dialogElt.style.display = "inline-block";
    // https://stackoverflow.com/questions/15615552/get-div-height-with-plain-javascript
    dialogElt.style.top = event.clientY + dialogElt.clientHeight + "px"; // event.clientY is the mouse position
    renameTabNameInputElt.focus();

    event.stopPropagation();
    event.preventDefault();
    log("<< panel.showRenameDialog");
}


function createTabList(tabs):void {
    log(">> panel.createTabList: nbTabs=" + tabs.length);
    let mainElt:HTMLElement = byid('main');
    let ulElt:HTMLElement = byid('list');

    for (let i = 0; i < tabs.length; i++) {
        let nextTab = tabs[i];

        // https://developer.mozilla.org/en-US/docs/Web/API/Element
        let liElt:HTMLElement = newElt("li", {id: nextTab.id, class: "item" + (nextTab.selected ? ' selected' : '')});
        if (g_isPopup) {
            liElt.addEventListener('click', openTab);
        } else {
            liElt.addEventListener('click', previewTab);
            liElt.addEventListener('dblclick', openTab);
        }
        ulElt.appendChild(liElt);
        let dragElt:HTMLElement = newElt("span", {class: "drag", title: "Drag'n'drop to reorder tabs"});
        liElt.appendChild(dragElt);
        let faviconElt:HTMLElement = newElt("img", {
            class: "favicon",
            alt: "",
            src: (nextTab.favIconUrl ? nextTab.favIconUrl : '../png/empty.png')
        });
        liElt.appendChild(faviconElt);
        let spanTitle:string;
        if (g_isPopup) {
            spanTitle = "Click to open tab";
        } else {
            spanTitle = "Click to preview this tab, Double click to open it";
        }
        let titleElt:HTMLElement = newElt("span", {
            class: "title",
            title: spanTitle
        }, nextTab.title);
        liElt.appendChild(titleElt);
        let editElt:HTMLElement = newElt("span", {class: "edit", title: "Click to rename this tab"});
        editElt.addEventListener('click', showRenameDialog);
        liElt.appendChild(editElt);
        let closeElt:HTMLElement = newElt("span", {class: "close", title: "Click to close this tab"});
        closeElt.addEventListener('click', closeTab);
        liElt.appendChild(closeElt);

    }

    mainElt.appendChild(ulElt);
    log("<< panel.createTabList");

}

/*
 $ https://github.com/RubaXa/Sortable
 init exemple here: https://github.com/RubaXa/Sortable/wiki/Sorting-with-the-help-of-HTML5-Drag'n'Drop-API
 */
function createSortable(elt):void {
    log(">> panel.createSortable");
    let sortable = Sortable.create(elt, {
            animation: 200,
            onStart: function (event) {
                byclass(event.item, "favicon").style.display = "none";
                byclass(event.item, "drag").style.display = "none";
            },
            onEnd: function (event) {
                // now we restore what was hidden in onStart()
                // TODO: this is really a hack since we assume that these 2 elements are always visible
                byclass(event.item, "favicon").style.display = "inline-block";
                byclass(event.item, "drag").style.display = "inline-block";

                let tabId:string = event.item.getAttribute("id");
                //log("createSortable.onEnd: liEl=" + liEl + ", oldIndex=" + event.oldIndex, ", newIndex=" + event.newIndex);
                chrome.tabs.move(parseInt(tabId), {index: event.newIndex}, function (movedTab) {
                    // note that the movedTab.index property may NOT be the actual one: if you try to drop the element
                    // between 2 pinned tabs, Chrome will automatically move the tab AFTER them but tab.index will
                    // not reflect that. We need to invoke tabs.get() to know where the tab was actually inserted
                    chrome.tabs.get(parseInt(tabId), function (tab) {
                        // https://developer.mozilla.org/en-US/docs/Web/API/Location/reload
                        if (movedTab.index !== tab.index) location.reload();
                    })

                });
            }
        }
    );
    log("<< panel.createSortable");
    return sortable;

}


document.addEventListener("DOMContentLoaded", init);
