const {interfaces: Ci,	utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
const chromePath = 'chrome://ghforkable/content/';

function addDiv(theDoc) {
	Cu.reportError('addDiv host = ' + theDoc.location);
	if (!theDoc) { Cu.reportError('no doc!'); return; } //document not provided, it is undefined likely
	if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { Cu.reportError('not html doc'); return; } //not html document, so its likely an xul document
	if(!(theDoc.location && theDoc.location == 'about:newtab')) { Cu.reportError('location not match:' + theDoc.location); return; }
	Cu.reportError('loc pass');
	removeDiv(theDoc, true);
	
	var thumbs = theDoc.querySelectorAll('.newtab-site');
	[].forEach.call(thumbs, function(thumb, i) {
		var hint = theDoc.createElement('div');
		var hotkey = i + 1;
		var hintText = theDoc.createTextNode(hotkey);
		hint.appendChild(hintText);
		hint.setAttribute('class','ntHotkeyHint ntHotkey-' + hotkey);
		hint.setAttribute('style','position:absolute; opacity:.5; z-index:500; display:inline-block; font-size:5em; color:red; text-shadow:1px 1px 2px;');
		thumb.appendChild(hint);
	});
	
	var win = theDoc.defaultView;
	win.addEventListener('keydown', keyDownedListener, false);
	win.addEventListener('keyup', keyUppedListener, false);
	
}

function removeDiv(theDoc, skipChecks) {
	//Cu.reportError('removeDiv');
	if (!skipChecks) {
		if (!theDoc) { Cu.reportError('no doc!'); return; } //document not provided, it is undefined likely
		if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { Cu.reportError('not html doc'); return; } //not html document, so its likely an xul document
		if(!(theDoc.location && theDoc.location == 'about:newtab')) { Cu.reportError('location not match:' + theDoc.location); return; }
	}
	
	
	var hints = theDoc.querySelectorAll('.ntHotkeyHint');
	[].forEach.call(hints, function(hint, i) {
		hint.parentNode.removeChild(hint);
	});
	
	var win = theDoc.defaultView;
	win.removeEventListener('keydown', keyDownedListener, false);
	win.removeEventListener('keyup', keyUppedListener, false);
	
}

/////////////key listener stuff
var buffer = '';
var downFireOnceHack = {};
var time_keyDowned = {};
var prefs = {
	multiKeySpeed: 300
};
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
	'105': 9,
}
var navBufferTO;
var cWin;
function navBuffer() {
	Cu.reportError('execing navBuffer');
	
	var tBuffer = buffer;
	buffer = '';
	var hint = cWin.document.querySelector('.ntHotkey-' + tBuffer);
	if (hint) {
		hint.parentNode.querySelector('a').click(); //this is the a in the thumb should be first child of parentNode of hint
	} else {
		Cu.reportError('no hint matching buffer of ".ntHotkey-' + tBuffer + '"');
	}
}

function keyDownedListener(e) {
	
	var eKeyCode = e.keyCode;
		
	if (downFireOnceHack[eKeyCode]) { return }
	downFireOnceHack[eKeyCode] = 1;
	
	var win = e.target.ownerDocument.defaultView;
	try {
		Cu.reportError('clearing navBufferTO');
		win.clearTimeout(navBufferTO);
	} catch(ex) { Cu.reportError(ex) }
	
}

function keyUppedListener(e, window) {
	var eKeyCode = e.keyCode;
    //var now = new Date();
	try { delete downFireOnceHack[eKeyCode]; } catch(ex) { Cu.reportError('ex on deleting downFireOnceHack:' + ex); } //had to put this here because if click "set key" then click to cancel so it sets key for "downed" then on up setting === null so it doesnt get past the  'if (!action[eKeyCode] && settingKey === null) { return }' so downFireOnceHack[eKeyCode] is never deleted
	var key = keycodes[eKeyCode];
	buffer += '' + key;
	Cu.reportError('buffer updated to "' + buffer + '"'); 
	
	var doc = e.target.ownerDocument
	var win = doc.defaultView;
	cWin = win;
	
	navBufferTO = win.setTimeout(navBuffer, prefs.multiKeySpeed);
}
////////////////end key listener stuff

function listenPageLoad(event) {
	var win = event.originalTarget.defaultView;
	var doc = win.document;
	Cu.reportError('page loaded loc = ' + doc.location);
	if (win.frameElement) {
		//its a frame
		Cu.reportError('its a frame');
		return;//dont want to watch frames
	}
	addDiv(doc);
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
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					Cu.reportError('DOING tab: ' + i);
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
			//window does not have gBrowser
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.removeEventListener('pageshow', listenPageLoad, true);
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					Cu.reportError('DOING tab: ' + i);
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
	Cu.reportError('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			Cu.reportError('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			Cu.reportError('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		addDiv(doc);
		//break; //uncomment this line if you don't want to add to frames
		//END - edit above here
	}
}

function unloadFromContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	Cu.reportError('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			Cu.reportError('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			Cu.reportError('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		removeDiv(doc);
		//break; //uncomment this line if you don't want to remove from frames
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