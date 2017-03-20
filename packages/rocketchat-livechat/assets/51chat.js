(function(w) {
  w.RocketChat = w.liveChat || { _: [] };
  var config = {};
  var widget;
  var iframe;
  var hookQueue = [];
  var ready = false;

  var widgetWidth = '370px';
  var widgetHeightOpened = '590px';
  var widgetHeightClosed = '0';


	function simulatedClick(target, options) {

		var event = target.ownerDocument.createEvent('MouseEvents'),
			options = options || {},
			opts = { // These are the default values, set up for un-modified left clicks
				type: 'click',
				canBubble: true,
				cancelable: true,
				view: target.ownerDocument.defaultView,
				detail: 1,
				screenX: 0, //The coordinates within the entire page
				screenY: 0,
				clientX: 0, //The coordinates within the viewport
				clientY: 0,
				ctrlKey: false,
				altKey: false,
				shiftKey: false,
				metaKey: false, //I *think* 'meta' is 'Cmd/Apple' on Mac, and 'Windows key' on Win. Not sure, though!
				button: 0, //0 = left, 1 = middle, 2 = right
				relatedTarget: null,
			};

		//Merge the options with the defaults
		for (var key in options) {
			if (options.hasOwnProperty(key)) {
				opts[key] = options[key];
			}
		}

		//Pass in the options
		event.initMouseEvent(
			opts.type,
			opts.canBubble,
			opts.cancelable,
			opts.view,
			opts.detail,
			opts.screenX,
			opts.screenY,
			opts.clientX,
			opts.clientY,
			opts.ctrlKey,
			opts.altKey,
			opts.shiftKey,
			opts.metaKey,
			opts.button,
			opts.relatedTarget
		);

		//Fire the event
		target.dispatchEvent(event);
	}

  // hooks
  var callHook = function(action, params) {
    if (!ready) {
      return hookQueue.push(arguments);
    }
    var data = {
      src: 'rocketchat',
      fn: action,
      args: params
    };
    iframe.contentWindow.postMessage(data, '*');
  };

  var closeWidget = function() {
    widget.dataset.state = 'closed';
    widget.style.height = widgetHeightClosed;
    callHook('widgetClosed');
  };

  var openWidget = function() {
    widget.dataset.state = 'opened';
    widget.style.height = widgetHeightOpened;
    callHook('widgetOpened');
    document.querySelector('.rocketchat-widget iframe').focus();
  };

  var api = {
    ready: function() {
      ready = true;
      if (hookQueue.length > 0) {
        hookQueue.forEach(function(hookParams) {
          callHook.apply(this, hookParams);
        });
        hookQueue = [];
      }
    },
    toggleWindow: function(/*forceClose*/) {
      if (widget.dataset.state === 'closed') {
        openWidget();
      } else {
        closeWidget();
      }
    },
    openPopout: function() {
      closeWidget();
      var popup = window.open(config.url + '?mode=popout', 'livechat-popout', 'width=400, height=450, toolbars=no');
      popup.focus();
    },
		triggerClickClose: function() {
			var imgSpan = document.getElementById('toogleSpan');
			// document.getElementById('toogleWindow')[0].click();
			document.getElementById('rocketchat-container').addEventListener('click',function () {
				var options = {};
				simulatedClick(document.getElementById('toogleWindow'), options);
			},false);
			imgSpan.style.backgroundImage = 'url(data:image/png;base64,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)';
			imgSpan.style.backgroundSize = '32px 36px';
			closeWidget();

			if (window.innerWidth < 768) {
				document.querySelector('#toogleWindow').style.display = 'block';
				document.querySelector('.rocketchat-widget').style.bottom = '100px';
			}
		},
    openWidget: function() {
      openWidget();
    },
    removeWidget: function() {
      document.getElementsByTagName('body')[0].removeChild(widget);
    }
  };

  var pageVisited = function(change) {
    callHook('pageVisited', {
      change: change,
      location: JSON.parse(JSON.stringify(document.location)),
      title: document.title
    });
  };

  var setCustomField = function(key, value) {
    callHook('setCustomField', [ key, value ]);
  };

  var setTheme = function(theme) {
    callHook('setTheme', theme);
  };

  var setDepartment = function(department) {
    callHook('setDepartment', department);
  };

  var clearDepartment = function() {
    callHook('clearDepartment');
  };

  var currentPage = {
    href: null,
    title: null
  };
  var trackNavigation = function() {
    setInterval(function() {
      if (document.location.href !== currentPage.href) {
        pageVisited('url');
        currentPage.href = document.location.href;
      }
      if (document.title !== currentPage.title) {
        pageVisited('title');
        currentPage.title = document.title;
      }
    }, 800);
  };

  var init = function(url) {
    if (!url) {
      return;
    }

    config.url = url;

    var chatWidget = document.createElement('div');
    chatWidget.dataset.state = 'closed';
    chatWidget.className = 'rocketchat-widget';
    chatWidget.innerHTML = '<div class="rocketchat-container" id="rocketchat-container" style="width:100%;height:100%">' +
                '<iframe id="rocketchat-iframe" src="' + url + '" style="width:100%;height:100%;border:none;background-color:transparent" allowTransparency="true"></iframe> '+
                '</div><div class="rocketchat-overlay"></div>' +
			'<div id="toogleWindow" style="height: 60px;width: 60px;border-radius: 50%;position: absolute;right: 0;margin-top: 20px;top: 100%;background: #1f8ceb;"><span id="toogleSpan" style="position: absolute; top: 50%; left: 50%; display: inline-block; height: 40px; width: 40px; margin: -20px 0 0 -20px; background-image: url(data:image/png;base64,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); background-repeat: no-repeat; background-position: center center; background-size: 32px 36px; "></span></div>';
    chatWidget.style.position = 'fixed';
    chatWidget.style.width = widgetWidth;
    chatWidget.style.height = widgetHeightClosed;
    chatWidget.style.borderTopLeftRadius = '5px';
    chatWidget.style.borderTopRightRadius = '5px';
    chatWidget.style.bottom = '100px';
    chatWidget.style.right = '50px';
    chatWidget.style.zIndex = '12345';

    document.getElementsByTagName('body')[0].appendChild(chatWidget);

		document.getElementById('toogleWindow').addEventListener('click',function () {
			if (window.innerWidth < 768) {
				document.querySelector('#toogleWindow').style.display = 'none';
				chatWidget.style.height = window.outerHeight;
				chatWidget.style.bottom = '0';
			}else{
				document.querySelector('#toogleWindow').style.display = 'block';
				chatWidget.style.height = widgetHeightOpened;
				chatWidget.style.bottom = '100px';
			};

			var imgSpan = this.querySelector('span');
			if(widget.dataset.state != 'opened'){
				imgSpan.style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcBAMAAACAI8KnAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAIVBMVEUAAAD///////////////////////////////////8AAADPn83rAAAACXRSTlMACq47u/I8r7wWzHxoAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEgAACxIB0t1+/AAAAJJJREFUGNNdzzEKhDAQBdAvwtYWW9hbbSdCDrBnWBDS2Sx7A8HSKwgic1tNxj/jmirDC5P/UTSw01V4ri2nMr7xkg/HIAu+Qi6j9HhEcpB1gHFGGCuSTyQTlQ2Vg3ic4x49TVpzwcQXvI+3x/+r0p9eLAfyYhrIWNOSmfZkVlH2Kpm9Z+bJeh68oSYmnlGMnv1X7RZ2SET5id+LAAAAAElFTkSuQmCC)';
				imgSpan.style.backgroundSize = '14px 14px';
				openWidget();
				if (window.innerWidth < 768) {
					chatWidget.style.height = window.outerHeight;
					chatWidget.style.bottom = '0';
				}
			}else{
				imgSpan.style.backgroundImage = 'url(data:image/png;base64,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)';
				imgSpan.style.backgroundSize = '32px 36px';
				closeWidget();
			}
		});
    widget = document.querySelector('.rocketchat-widget');
    iframe = document.getElementById('rocketchat-iframe');

    w.addEventListener('message', function(msg) {
      if (typeof msg.data === 'object' && msg.data.src !== undefined && msg.data.src === 'rocketchat') {
        if (api[msg.data.fn] !== undefined && typeof api[msg.data.fn] === 'function') {
          var args = [].concat(msg.data.args || []);
          api[msg.data.fn].apply(null, args);
        }
      }
    }, false);

    var mediaqueryresponse = function(mql) {
      if (mql.matches) {
        chatWidget.style.left = '0';
        chatWidget.style.right = '0';
        chatWidget.style.width = '100%';
      } else {
        chatWidget.style.left = 'auto';
        chatWidget.style.right = '50px';
        chatWidget.style.width = widgetWidth;
      }
    };

    var mql = window.matchMedia('screen and (max-device-width: 480px) and (orientation: portrait)');
    mediaqueryresponse(mql);
    mql.addListener(mediaqueryresponse);

    // track user navigation
    trackNavigation();
  };

  if (typeof w.initRocket !== 'undefined') {
    console.warn('initRocket is now deprecated. Please update the livechat code.');
    init(w.initRocket[0]);
  }

  if (typeof w.RocketChat.url !== 'undefined') {
    init(w.RocketChat.url);
  }

  var queue = w.RocketChat._;

  w.RocketChat = w.RocketChat._.push = function(c) {
    c.call(w.RocketChat.livechat);
  };

  // exports
  w.RocketChat.livechat = {
    pageVisited: pageVisited,
    setCustomField: setCustomField,
    setTheme: setTheme,
    setDepartment: setDepartment,
    clearDepartment: clearDepartment
  };

  // proccess queue
  queue.forEach(function(c) {
    c.call(w.RocketChat.livechat);
  });
}(window));




