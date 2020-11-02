const IS_LOG_TO_LOCALSTORAGE = true;
const DEFAULT_PANEL_WIDTH = 500;
const DEFAULT_IS_POPUP = true;
const PANEL_WIDTH_STORAGE_KEY = "panelWidth";
const IS_POPUP_STORAGE_KEY = "isPopup";
const LOGS_STORAGE_KEY = "logs";

function log(log:string):void {
    let now:Date = new Date();
    log = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + " " + log;
    console.log(log);
    if (IS_LOG_TO_LOCALSTORAGE) {
        let logs:string = localStorage.getItem(LOGS_STORAGE_KEY);
        if (!logs) logs = "";
        logs += (log + "\n");
        localStorage.setItem(LOGS_STORAGE_KEY, logs);
    }
}

function saveIsPopupToStorage(isPopup:boolean):void {
    log(">> utils.saveIsPopupToStorage: isPopup=" + isPopup);
    localStorage.setItem(IS_POPUP_STORAGE_KEY, isPopup.toString());
    log("<< utils.saveIsPopupToStorage");
}

function getIsPopupFromStorage():boolean {
    log(">> utils.getIsPopupFromStorage");
    // https://www.w3schools.com/html/html5_webstorage.asp
    let isPopupAsString:string = localStorage.getItem(IS_POPUP_STORAGE_KEY);
    let isPopup:boolean = isPopupAsString ? isPopupAsString === 'true' : DEFAULT_IS_POPUP;
    log("<< utils.getIsPopupFromStorage: isPopup=" + isPopup);
    return isPopup;
}

function savePanelWidthToStorage(panelWidth:number):void {
    log(">> utils.savePanelWidthToStorage: panelWidth=" + panelWidth);
    let panelWidthAsString:string = panelWidth != null ? panelWidth.toString() : "";
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, panelWidthAsString);
    log("<< utils.savePanelWidthToStorage");
}

function getPanelWidthFromStorage():number {
    log(">> utils.getPanelWidthFromStorage");
    // https://www.w3schools.com/html/html5_webstorage.asp
    // I could have used https://developer.chrome.com/extensions/storage but those methods are asynchronous and I don't feel like using them
    // localStorage.getItem() returns 'null' if there is no key (which will be the case if YATM was just installed)
    // note that uninstalling YATM removes the localStorage
    let panelWidthAsString:string = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    let panelWidth:number = panelWidthAsString ? parseInt(panelWidthAsString) : DEFAULT_PANEL_WIDTH;
    log("<< utils.getPanelWidthFromStorage: panelWidth=" + panelWidth);
    return panelWidth;
}

/*
 * https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
 */
function getQueryParameterByName(name):string {
    let url:string = window.location.href;
    //log(">> utils.getQueryParameterByName: url=" + url + ", name=" + name);
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    let result;
    if (!results) {
        result = null;
    } else if (!results[2]) {
        result = '';
    } else {
        result = decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    //log("<< utils.getQueryParameterByName: result=" + result);
    return result;
}

function byid(idValue):HTMLElement {
    return document.getElementById(idValue);
}

function byclass(elt, className):HTMLElement {
    return elt.getElementsByClassName(className)[0];
}

function newElt(tagName:string, attributes, textContent?:string):HTMLElement {
    //log(">> newElt= tagName=" + tagName + ", attributes=" + JSON.stringify(attributes) + ", textContent=" + textContent);
    let elt:HTMLElement = document.createElement(tagName);
    for (let key in attributes) {
        elt.setAttribute(key, attributes[key]);
    }
    if (textContent !== undefined) {
        elt.textContent = textContent;
    }
    //log("<< newElt=" + elt.outerHTML);
    return elt;
}

function addTextHighlight(elt:HTMLElement, text:string, highlightClass:string):void {
    //log(">> addTextHighlight: elt='" + elt.outerHTML + "', text='" + text + "', class='" + highlightClass + "'");
    let highlightedText:string = "<span class=\"" + highlightClass + "\">" + text + "</span>";
    elt.innerHTML = elt.innerHTML.replace(new RegExp(text, "i"), highlightedText); // "g"=global "i"=case insensitive
    //log("<< addTextHighlight: elt='" + elt.outerHTML + "'");
}

function removeTextHighlight(elt:HTMLElement):void {
    //log(">> removeTextHighlight: elt='" + elt.outerHTML + "'");
    elt.innerHTML = elt.textContent;
    //log("<< removeTextHighlight: elt=" + elt.outerHTML + "'");
}