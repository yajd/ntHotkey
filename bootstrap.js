const {interfaces: Ci,	utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
const chromePath = 'chrome://ghforkable/content/';
const ignoreFrames = false;

var maxHotkey = 9;
var maxHotkeyLength = 1;

function addDiv(theDoc) {
	
	if (!theDoc) {  return; } //document not provided, it is undefined likely
	if (!theDoc instanceof Ci.nsIDOMXULDocument) {  return; } //not html document, so its likely an xul document
	if(!(theDoc.location && theDoc.location == 'about:newtab')) {  return; }
	
	removeDiv(theDoc, true);
	
	var ntRows = theDoc.querySelectorAll('.newtab-row');
	var ntRowsRevd = [];
	[].forEach.call(ntRows, function(row) {
		ntRowsRevd.push(row);
	});
	ntRowsRevd.reverse();

	var ntThumbs = [];
	[].forEach.call(ntRowsRevd, function(row) {
		var subThumbs = row.querySelectorAll('.newtab-site');
		[].forEach.call(subThumbs, function(st) {
			ntThumbs.push(st);
		});
	});
	
	validHotkeys = ',';
	[].forEach.call(ntThumbs, function(thumb, i) {
		var hint = theDoc.createElement('div');
		var hotkey = i + 1;
		maxHotkey = hotkey;
		maxHotkeyLength = hotkey.toString().length;
		var hintText = theDoc.createTextNode(hotkey);
		validHotkeys += hotkey + ',';
		hint.appendChild(hintText);
		hint.setAttribute('class','ntHotkeyHint ntHotkey-' + hotkey);
		hint.setAttribute('style','position:absolute; opacity:.5; z-index:500; display:inline-block; font-size:5em; color:red; text-shadow:1px 1px 2px; pointer-events:none;');
		thumb.appendChild(hint);
	});
	
	checkWinHasNewTab(theDoc.defaultView);
	
	
	//theDoc.defaultView.addEventListener('unload', listenAboutNewTabUnload, false);
	

	
}
var validHotkeys = '';
function removeDiv(theDoc, skipChecks) {
	//
	if (!skipChecks) {
		if (!theDoc) {  return; } //document not provided, it is undefined likely
		if (!theDoc instanceof Ci.nsIDOMXULDocument) {  return; } //not html document, so its likely an xul document
		if(!(theDoc.location && theDoc.location == 'about:newtab')) {  return; }
	}
	
	
	var hints = theDoc.querySelectorAll('.ntHotkeyHint');
	[].forEach.call(hints, function(hint, i) {
		hint.parentNode.removeChild(hint);
	});
	
	//theDoc.defaultView.removeEventListener('unload', listenAboutNewTabUnload, false);
	
}

/////////////key listener stuff
var buffer = '';
var downFireOnceHack = {};
var time_keyDowned = {};
var prefs = {
	multiKeySpeed: 300
};
var hasNewTab; //true if the currently focused contentWindow has new tab
var hasNewTab_ContentWindow; //holds the content window of the new tab, here it execs the querySelector's
var hasNewTab_ContentWindowTop; //holds the top content win, so if a frame loads on that page and it doesnt have about:newtab, before setting hasNewTab to false we check if contentTop of this no new tab frame is equal to this, if they are equal that that means there is a frame somewhere in this currently focused aDOMWin that has about:newtab //holds the content window of the new tab, here it execs the querySelector's

var keycodes = {
	'48': 0,
	'49': 1,
	'50': 2,
	'51': 3,
	'52': 4,
	'53': 5,
	'54': 6,
	'55': 7,
	'56': 8,
	'57': 9,
	'96': 0,
	'97': 1,
	'98': 2,
	'99': 3,
	'100': 4,
	'101': 5,
	'102': 6,
	'103': 7,
	'104': 8,
	'105': 9
};
var navBufferTO;
function navBuffer() {
	var tBuffer = buffer;
	buffer = '';
	
	
	
	
	var hint = hasNewTab_ContentWindow.document.querySelector('.ntHotkey-' + tBuffer);
	Services.appShell.hiddenDOMWindow.console.error('html of document checking for buffer', hasNewTab_ContentWindow.document.documentElement.innerHTML);
	if (hint) {
		var DOMWin = hasNewTab_ContentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
											.getInterface(Ci.nsIWebNavigation)
											.QueryInterface(Ci.nsIDocShellTreeItem)
											.rootTreeItem
											.QueryInterface(Ci.nsIInterfaceRequestor)
											.getInterface(Ci.nsIDOMWindow);
		var focusedEl = DOMWin.document.activeElement;
		if (focusedEl) {
			try {
				 if (focusedEl.parentNode.parentNode.parentNode.getAttribute('id') == 'urlbar') {
					focusedEl.parentNode.parentNode.parentNode.reset();
					if (DOMWin.gBrowser) {
						if (DOMWin.gBrowser.selectedTab) {
							DOMWin.gBrowser.selectedTab.linkedBrowser.focus();
						}
					} else {
						DOMWin.gBrowser.contentWindow.focus();
					}
				 }
			} catch (ex) {
				
			}
		}
		
		hint.parentNode.querySelector('a').click(); //this is the a in the thumb should be first child of parentNode of hint
	} else {
		
	}
}

function keyDownedListener(e) {
	if (!hasNewTab) { return };
	
	var eKeyCode = e.keyCode;
		
	if (downFireOnceHack[eKeyCode]) { return }
	downFireOnceHack[eKeyCode] = 1;
	
	/* cDump({
		obj:e,
		deep:1,
		title:'kd e',
		inBackground:true
	}); */
	
	try { //moved here trying to address #3, but i dont think it does but it likely adrresses some unoccured bug. because what if checkWinHasNewTab changes the contentWin, rmember the timeout was set on this the last updated global contentWin in keyup
		
		hasNewTab_ContentWindow.clearTimeout(navBufferTO);
	} catch(ex) {  }
	
	if (hasNewTab_ContentWindow && hasNewTab_ContentWindow.document && (hasNewTab_ContentWindow.document instanceof Ci.nsIDOMXULDocument || hasNewTab_ContentWindow.document.location != 'about:newtab')) {
		//likely just navBuffer'ed and need to disconnect this now
		Services.appShell.hiddenDOMWindow.console.info('doing checkWinHasNewTab');
		checkWinHasNewTab(hasNewTab_ContentWindow.top);
		
	} else {
		Services.appShell.hiddenDOMWindow.console.warn('NOTTTT doing checkWinHasNewTab');
	}
	
	//may need to ahve a clearNavBufferTO after the checkWinHasNewTab runs
	
}

function keyUppedListener(e) {
	var eKeyCode = e.keyCode;
    //var now = new Date();
	try { delete downFireOnceHack[eKeyCode]; } catch(ex) {  } //had to put this here because if click "set key" then click to cancel so it sets key for "downed" then on up setting === null so it doesnt get past the  'if (!action[eKeyCode] && settingKey === null) { return }' so downFireOnceHack[eKeyCode] is never deleted
	if (!hasNewTab) { return };
	
	//if focus is in input field (typable field) then dont listen to keys
	//if focus is in urlbar and urlbars value is a validHotkey then keep listening to typing
	
	var key = keycodes[eKeyCode];
	if (key === undefined) {
		
		buffer = '';
		return;
	}
	
	Services.appShell.hiddenDOMWindow.console.log('e = ',e);
	Services.appShell.hiddenDOMWindow.console.log('e.view == ChromeWindow? = ', Object.prototype.toString.call(e.view) == '[object ChromeWindow]');
	var inurlbar = false;
	
	if (e.originalTarget) { //have to use origtarg because when focus is in xul textbox the textbox element is XBL and not an instance of Ci.nsIDOMHTMLInputElement but origTarg is
		var hasCaret = (!e.originalTarget.getAttribute('disabled') && (formHelperIsEditable(e.originalTarget) || (e.originalTarget instanceof Ci.nsIDOMHTMLInputElement && e.originalTarget.mozIsTextField(false)) || e.originalTarget instanceof Ci.nsIDOMHTMLTextAreaElement || e.originalTarget instanceof Ci.nsIDOMXULTextBoxElement));
		if (Object.prototype.toString.call(e.view) == '[object ChromeWindow]' && hasCaret) {
			if (e.target && e.target.getAttribute('id') == 'urlbar') {
				inurlbar = true;
			} else {
				Services.appShell.hiddenDOMWindow.console.info('returing dont listen to key input from chrome as we not in urlbar');
				return; //dont listen to any key input if coming from chrome except if they are in urlbar
			}
		} 
	}
		
	buffer += '' + key;
	
	
	try {
		if (inurlbar) {
			inurlbar = true;
			var input = e.target;
			var sStart = input.selectionStart;
			var sEnd = input.selectionEnd;
			/*
			if (e.target.value == '') {
				if (buffer != '') {
					throw {message:'}
				}
			}
			*/
			var value = input.value;
			if (sStart != sEnd) {
				
				value = value.replace(value.substr(sStart, sEnd), ''); //this removes the autocompletion
			}
			
			
			//if (!((buffer == '' && value.length == 1) || (buffer.length == value.length - 1 && value.indexOf(buffer) == 0))) {
			if (buffer != value || value.length > maxHotkeyLength) {
				
				
				
				buffer = '';
				return;
			} else {
				
			}
			/* if (validHotkeys.indexOf(',' + value) == -1) {
				buffer = '';
				
				return;
			} */
		}
	} catch (ex) {
		
		
	}
	
	if (!inurlbar) {
		//var hasCaret = (!e.target.getAttribute('disabled') && (formHelperIsEditable(e.target) || (e.target instanceof Ci.nsIDOMHTMLInputElement && e.target.mozIsTextField(false)) || e.target instanceof Ci.nsIDOMHTMLTextAreaElement || e.target instanceof Ci.nsIDOMXULTextBoxElement));
		
		if (hasCaret) {
			
			buffer = '';
			return;
		}
	}
	
	if (validHotkeys.indexOf(',' + buffer) == -1) {
		
		buffer = '';
		return;
	}
	
	try { //this definitely has to be here to address #3 because what if user is typing two key hotkey, and lifts the second downed key before or something something adfhalsdfasf too much thinking
		
		hasNewTab_ContentWindow.clearTimeout(navBufferTO);
	} catch(ex) {  }
	
	navBufferTO = hasNewTab_ContentWindow.setTimeout(navBuffer, prefs.multiKeySpeed);
}
////////////////end key listener stuff

function formHelperIsEditable(aElement) {
	if (!aElement)
		return false;
	let canEdit = false;

	if (aElement.isContentEditable || aElement.designMode == "on") {
		canEdit = true;
	} else if (aElement.contentDocument && aElement.contentDocument.body && aElement instanceof Ci.nsIDOMHTMLInputElement &&
		(aElement.contentDocument.body.isContentEditable ||
			aElement.contentDocument.designMode == "on")) {
		canEdit = true;
	} else {
		canEdit = aElement.ownerDocument && aElement.ownerDocument.designMode == "on";
	}

	return canEdit;
}

function winActd(e) {
	/* cDump({
		obj:e,
		deep:1,
		title:'winActd e',
		inBackground:true
	}); */
	//todo: should probably check if documents are loading
	
	var aDOMWindow = e.target;
	var gBrowser = aDOMWindow.gBrowser;
	
	if (gBrowser) {
		//var aTab = gBrowser.selectedTab;
		//var contentWindow = aTab.linkedBrowser.contentWindow;
		var contentWindow = gBrowser.contentWindow;
		
		checkWinHasNewTab(contentWindow);
		
	} else {
		
		checkWinHasNewTab(aDOMWindow);
		
	}
	
	
}

function tabSeld(e) {
	//e.target is tab element
	//todo: should probably check if documents are loading
	var aDOMWindow = e.target.ownerDocument;
	var contentWindow = e.target.linkedBrowser.contentWindow;
	
	checkWinHasNewTab(contentWindow);
	
	
}

function checkWinHasNewTab(theWin) {

	if (hasNewTab == true) {
		if (hasNewTab_ContentWindow && hasNewTab_ContentWindow.document && hasNewTab_ContentWindow.document instanceof Ci.nsIDOMXULDocument && hasNewTab_ContentWindow.document.location == 'about:newtab' && hasNewTab_ContentWindowTop == theWin.top) { //check if that contentwindow when last set to true is still around, if its not around then continue and do the check, because on consequent load like after navBuffer'ing from that tab, the contetnWindow does not get closed attribute or disappears, it morphs into other winodw, its weird but this is what my limited testing from 021314 reveals //theWin.top here is fix for bug#2
			if (theWin.top != hasNewTab_ContentWindow) {
				//check because if a side iframe in the about:newtab window loads, and it doesnt have about:newtab, it will say its false but this willl not be accurate
				//already identified that somewhere in this view is about:newtab so no need to check it again
				
				return;
			}
		}
	}

	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	
	for (var j = 0; j < winArr.length; j++) {
		/*
		if (j == 0) {
			
		} else {
			
		}
		*/
		if (winArr[j].document.location == 'about:newtab') {
			hasNewTab = true;
			hasNewTab_ContentWindow = winArr[j].window;
			hasNewTab_ContentWindowTop = theWin.top;
			return true;
		} else {
			
		}
	}

	hasNewTab = false;
	hasNewTab_ContentWindow = null;
	hasNewTab_ContentWindowTop = null;
	return false;
}
function listenPageLoad(event) {
	var win = event.originalTarget.defaultView;
	var doc = win.document;
	
	if (win.frameElement) {
		//its a frame
		
		if (ignoreFrames) {
			return;//dont want to watch frames
		}
	}
	addDiv(doc);
}

function listenAboutNewTabUnload(e) {
	var win = e.originalTarget.defaultView;
	
	checkWinHasNewTab(win);
	
}
/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
		
		
		//check if currently focused window hasNewTab
		var aDOMWindow = Services.wm.getMostRecentWindow(null);
		var gBrowser = aDOMWindow.gBrowser;
		
		if (gBrowser) {
			//var aTab = gBrowser.selectedTab;
			//var contentWindow = aTab.linkedBrowser.contentWindow;
			var contentWindow = gBrowser.contentWindow;
			checkWinHasNewTab(contentWindow);
			
		} else {
			checkWinHasNewTab(aDOMWindow);
			
		}
		//end - check if currently focused window hasNewTab
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.addEventListener('pageshow', listenPageLoad, true);
			aDOMWindow.addEventListener('keydown', keyDownedListener, false);
			aDOMWindow.addEventListener('keyup', keyUppedListener, false);
			aDOMWindow.addEventListener('activate', winActd, false);

			if (aDOMWindow.gBrowser) {
				if (aDOMWindow.gBrowser.tabContainer) {
					aDOMWindow.gBrowser.tabContainer.addEventListener('TabSelect', tabSeld, false);
					//start - go through all tabs in this window we just added to
					var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
					for (var i = 0; i < tabs.length; i++) {
						
						var tabBrowser = tabs[i].linkedBrowser;
						var win = tabBrowser.contentWindow;
						loadIntoContentWindowAndItsFrames(win);
					}
					//end - go through all tabs in this window we just added to
				} else {
					//does not have tabContainer
					var win = aDOMWindow.gBrowser.contentWindow;
					loadIntoContentWindowAndItsFrames(win);
				}
			} else {
				//window does not have gBrowser, here its fine though, because winActd is on it
				//should maybe check if its new:tab page, if im counting winActd as ok here, typically these windows never have it tho
			}
			/*
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				aDOMWindow.gBrowser.tabContainer.addEventListener('TabSelect', tabSeld, false);
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					
					var tabBrowser = tabs[i].linkedBrowser;
					var win = tabBrowser.contentWindow;
					loadIntoContentWindowAndItsFrames(win);
				}
				//end - go through all tabs in this window we just added to
			} else {
				//does not have tabContainer
				var win = aDOMWindow.gBrowser.contentWindow;
				loadIntoContentWindowAndItsFrames(win);
			}
			*/
		} else {
			//window does not have gBrowser
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.removeEventListener('pageshow', listenPageLoad, true);
			aDOMWindow.removeEventListener('keydown', keyDownedListener, false);
			aDOMWindow.removeEventListener('keyup', keyUppedListener, false);
			aDOMWindow.removeEventListener('activate', winActd, false);
			if (aDOMWindow.gBrowser) {
				if (aDOMWindow.gBrowser.tabContainer) {
					aDOMWindow.gBrowser.tabContainer.removeEventListener('TabSelect', tabSeld, false);
					//start - go through all tabs in this window we just added to
					var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
					for (var i = 0; i < tabs.length; i++) {
						
						var tabBrowser = tabs[i].linkedBrowser;
						var win = tabBrowser.contentWindow;
						unloadFromContentWindowAndItsFrames(win);
					}
					//end - go through all tabs in this window we just added to
				} else {
					//does not have tabContainer
					var win = aDOMWindow.gBrowser.contentWindow;
					unloadFromContentWindowAndItsFrames(win);
				}
			} else {
				//window does not have gBrowser, here its fine though, because winActd is on it
				//should maybe check if its new:tab page, if im counting winActd as ok here, typically these windows never have it tho
			}
			/*
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				aDOMWindow.gBrowser.tabContainer.removeEventListener('TabSelect', tabSeld, false);
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					
					var tabBrowser = tabs[i].linkedBrowser;
					var win = tabBrowser.contentWindow;
					unloadFromContentWindowAndItsFrames(win);
				}
				//end - go through all tabs in this window we just added to
			} else {
				//does not have tabContainer
				var win = aDOMWindow.gBrowser.contentWindow;
				unloadFromContentWindowAndItsFrames(win);
			}
			*/
		} else {
			//window does not have gBrowser
		}
	}
};
/*end - windowlistener*/

function loadIntoContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			
		} else {
			
		}
		var doc = winArr[j].document;
		//START - edit below here
		addDiv(doc);
		if (ignoreFrames) {
			break;
		}
		//END - edit above here
	}
}

function unloadFromContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			
		} else {
			
		}
		var doc = winArr[j].document;
		//START - edit below here
		removeDiv(doc);
		if (ignoreFrames) {
			break;
		}
		//END - edit above here
	}
}

function startup(aData, aReason) {
	windowListener.register();
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	windowListener.unregister();
}

function install() {}

function uninstall() {}