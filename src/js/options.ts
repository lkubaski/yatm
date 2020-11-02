// http://blogs.microsoft.co.il/gilf/2013/07/22/quick-tip-typescript-declare-keyword/
declare var chrome;

function saveOptions() {
    let panelWidthAsString:string = (<HTMLInputElement>byid('panelWidth')).value;
    let panelWidth:number = panelWidthAsString ? parseInt(panelWidthAsString) : null;
    panelWidth = panelWidth < 200 ? 200 : panelWidth; // basic validation

    let displayModeElt = <HTMLSelectElement>byid("displayMode");
    let displayMode:string = displayModeElt.options[displayModeElt.selectedIndex].value;
    let isPopup:boolean = (displayMode === "popup");

    log(">> options.saveOptions: panelWidth=" + panelWidth + ", isPopup=" + isPopup);
    savePanelWidthToStorage(panelWidth);
    let switchDisplayMode:boolean = getIsPopupFromStorage() !== isPopup;
    saveIsPopupToStorage(isPopup);
    if (switchDisplayMode) {
        // reloading the whole extension to change the way the side panel is displayed
        // the issue of doing this here is that this going to dismiss the options dialog
        log("options.saveOptions: reloading extension");
        // - in dev mode, calling runtime.reload() loads the background script
        // - in production mode, calling runtime.reload() does NOT load the background script
        chrome.runtime.getBackgroundPage(function (bg) {
            // note that this will invoked init() twice in case the background page is already loaded
            // that's OK since init() is clever init not to do the same things twice
            bg.init();
            log("options.saveOptions: done reloading extension");
        });
    }
    let status:HTMLElement = byid('status');
    status.textContent = ' Options saved!';
    setTimeout(function () {
        status.textContent = '';
    }, 750);
    log("<< options.saveOptions");
}

function restoreOptions() {
    log(">> options.restoreOptions");
    (<HTMLInputElement>byid('panelWidth')).value = getPanelWidthFromStorage().toString();
    if (getIsPopupFromStorage()) {
        (<HTMLInputElement>byid('displayMode')).value = "popup";
    } else {
        (<HTMLInputElement>byid('displayMode')).value = "sidePanel";
    }
    log("<< options.restoreOptions");
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);