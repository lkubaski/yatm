// http://blogs.microsoft.co.il/gilf/2013/07/22/quick-tip-typescript-declare-keyword/
declare var chrome;
let g_wasMainWindowShrinked;
let g_originalMainWindowWidth;
let g_mainWindowId;
let g_panelWindowId;
let g_clickedTabId;

function getGlobalsAsString():string {
    let result:string = "";
    result += "g_wasMainWindowShrinked=" + g_wasMainWindowShrinked + ", ";
    result += "g_originalMainWindowWidth=" + g_originalMainWindowWidth + ", ";
    result += "g_mainWindowId=" + g_mainWindowId + ", ";
    result += "g_panelWindowId=" + g_panelWindowId + ", ";
    result += "g_clickedTabId=" + g_clickedTabId + ", ";
    return result;
}

/*
 * We potentially need to resize the main window size to leave room for the panel
 *
 * availableWidth = spacing between the right side of the window and the right side of the screen
 * availableWidth = 150 & panelWidth=100 -> delta = 50 -> delta is >= 0 so no need to reduce main window size
 * availableWidth = 20  & panelWidth=100 -> delta = -80 -> delta is <0 so need to reduce window size
 */
function getMainWindowNewWidth(mainWindow):number {
    log(">> bg.getMainWindowNewWidth");
    let availablePanelWidth:number = screen.width - (mainWindow.left + mainWindow.width);
    log("bg.getMainWindowNewWidth: screen.width=" + screen.width + ", window.left=" + mainWindow.left + ", window.width=" + mainWindow.width + ' -> availablePanelWidth=' + availablePanelWidth);
    // TODO: need to check the scenario where for some reason the savedPanelWidth is way too big
    // (larger than the spacing between the MINIMUM left side of the main window and the right side of the screen
    let panelWidth:number = getPanelWidthFromStorage();
    let delta:number = availablePanelWidth - panelWidth;
    log("bg.getMainWindowNewWidth: availablePanelWidth=" + availablePanelWidth + ", panelWidth=" + panelWidth + ' -> delta=' + delta);
    let mainWindowNewWidth:number;
    if (delta >= 0) {
        mainWindowNewWidth = mainWindow.width;
        g_wasMainWindowShrinked = false;
    } else {
        mainWindowNewWidth = mainWindow.width + delta;
        g_wasMainWindowShrinked = true;
        g_originalMainWindowWidth = mainWindow.width;
    }
    if (mainWindowNewWidth < 0) {
        // crap: not enough size, what should we do?
    }
    log("<< bg.getMainWindowNewWidth: mainWindowNewWidth=" + mainWindowNewWidth);
    return mainWindowNewWidth;
}


function initSidePanel():void {
    log(">> bg.initSidePanel");
    chrome.windows.onRemoved.addListener(onWindowsRemovedListener);
    chrome.windows.getCurrent({}, function (mainWindow) {
        g_mainWindowId = mainWindow.id;
        let mainWindowNewWidth:number = getMainWindowNewWidth(mainWindow);
        // optionally resize main window to leave room for right panel:
        chrome.windows.update(
            mainWindow.id,
            {'width': mainWindowNewWidth},
            function (updatedWindow) {
                // close previous panel, if any (in case the user opens the extension from a new window)
                if (g_panelWindowId) { // required since windows.remove() fails if the ID is undefined (checking for lastError won't work)
                    chrome.windows.remove(g_panelWindowId, function () {
                        if (chrome.runtime.lastError) {
                            // that's OK, it just means that there is no other panel window
                        }
                    });
                }
                // create side panel:
                chrome.windows.create({
                    'url': chrome.extension.getURL('src/html/panel.html?mainWindowId=' + g_mainWindowId + "&isPopup=false"),
                    'left': updatedWindow.left + updatedWindow.width,
                    'top': updatedWindow.top,
                    'width': getPanelWidthFromStorage(),
                    'height': screen.height,
                    'type': 'popup'
                }, function (panelWindow) {
                    g_panelWindowId = panelWindow.id;
                    log("bg.initSidePanel: g_mainWindowId=" + g_mainWindowId + ", g_panelWindowId=" + g_panelWindowId);
                    chrome.tabs.onActivated.addListener(onActivatedListener);
                });
            }
        );
    });
    log("<< bg.initSidePanel");
}


function onActivatedListener(activeInfo):void {
    log(">> bg.onActivatedListener: activeWindowId=" + activeInfo.windowId + ", activeTabId=" + activeInfo.tabId + ", g_clickedTabId=" + g_clickedTabId);
    if (g_clickedTabId) {
        // for some unknown reason, when using chrome.tabs.update to make a tab active, sometimes the side panel keeps the focus and sometimes loses it
        // to handle the second scenario, we always give back the focus to the side panel after a tab was selected
        chrome.windows.update(g_panelWindowId, {focused: true}, function () {
            g_clickedTabId = null;
        })
    }
    log("<< bg.onActivatedListener");
}


function restoreMainWindowSize():void {
    log(">> bg.restoreMainWindowSize: g_mainWindowId=" + g_mainWindowId + ", g_wasMainWindowShrinked=" + g_wasMainWindowShrinked);
    if (g_mainWindowId && g_wasMainWindowShrinked) {
        chrome.windows.get(g_mainWindowId, {}, function (mainWindow) {
            if (!chrome.runtime.lastError) {
                log("bg.restoreMainWindowSize: restoring size of window with id=" + mainWindow.id);
                chrome.windows.update(
                    mainWindow.id,
                    {'width': g_originalMainWindowWidth}
                );
            }
        });
    }
    log("<< bg.restoreMainWindowSize");
}


function onWindowsRemovedListener(removedWindowID):void {
    log(">> bg.onWindowsRemovedListener: removedWindowID=" + removedWindowID);
    if (removedWindowID === g_panelWindowId) { // panel was closed
        restoreMainWindowSize();
        chrome.windows.onActivated.removeListener(onActivatedListener);
        chrome.windows.onRemoved.removeListener(onWindowsRemovedListener);
        g_panelWindowId = null;
        g_mainWindowId = null;
    } else if ((removedWindowID === g_mainWindowId) && g_panelWindowId) { // main window was closed
        log("bg.onWindowsRemovedListener: removing g_panelWindowId=" + g_panelWindowId);
        // this is going to fire the windows.onRemoved listener on the panel window which will take care of the cleanup:
        chrome.windows.remove(g_panelWindowId);
    }
    log("<< bg.onWindowsRemovedListener");
}

// @ts-ignore
function init():void {
    log(">> bg.init()");
    if (getIsPopupFromStorage()) {
        chrome.browserAction.getPopup({}, function (popup) {
            if (!popup) {
                chrome.browserAction.setPopup({popup: "src/html/panel.html?isPopup=true"});
            }
        });
    } else {
        // browserAction.onClicked() will NOT fire if the browser action has a popup so we first remove it
        chrome.browserAction.setPopup({popup: ""});
        let hasListener = chrome.browserAction.onClicked.hasListener(initSidePanel);
        if (!hasListener) {
            chrome.browserAction.onClicked.addListener(initSidePanel);
        }
    }
    log("<< bg.init()");
}

// Because the listeners themselves only exist in the context of the event page, you must use addListener each time the event page loads
init();

/*
 * Official documentation: Fired when a **profile** that has this extension installed first starts up
 *
 * in devmode:
 * - NOT invoked when you install the unpacked extension
 */
chrome.runtime.onStartup.addListener(function () {
    log(">> << bg.runtime.onStartup");
});

/*
 * Official documentation: Fired when the extension is first installed, when the extension is updated to a new version, and when Chrome is updated to a new version.
 *
 * in dev mode:
 * - invoked when you install the unpacked extension
 * - invoked when you click on the "reload" button on the extension page OR when you reload the extension page
 * - NOT invoked when you click on the "inspect views: background page (inactive)" link (however main() is invoked)
 * - NOT invoked when you click on the "inspect views: background page" link since the background page is already loaded (main() is also NOT invoked)
 */
chrome.runtime.onInstalled.addListener(function () {
    log(">> << bg.runtime.onInstalled");
});

/*
 * Official documentation: Sent to the event page just before it is unloaded
 *
 * in dev mode:
 * - invoked when the background page becomes inactive
 */
chrome.runtime.onSuspend.addListener(function () {
    log(">> << bg.runtime.onSuspend");
});

chrome.runtime.onSuspendCanceled.addListener(function () {
    log(">> << bg.runtime.onSuspendCanceled");
});
