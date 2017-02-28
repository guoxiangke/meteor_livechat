/* globals Livechat, LivechatVideoCall, MsgTyping */

Template.messages.helpers({
	livechatOnline() {
		return Livechat.online;
	},
	offlineMessage() {
		return Livechat.offlineMessage;
	},
	offlineData() {
		return {
			offlineMessage: Livechat.offlineMessage.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2'),
			offlineSuccessMessage: Livechat.offlineSuccessMessage,
			offlineUnavailableMessage: Livechat.offlineUnavailableMessage.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2'),
			displayOfflineForm: Livechat.displayOfflineForm
		};
	},
	showRegisterForm() {
		if (Session.get('triggered') || Meteor.userId()) {
			return false;
		}
		return Livechat.registrationForm;
	},
	messages() {
		return ChatMessage.find({
			rid: visitor.getRoom(),
			t: {
				'$ne': 't'
			}
		}, {
			sort: {
				ts: 1
			}
		});
	},
	showOptions() {
		if (Template.instance().showOptions.get()) {
			return 'show';
		} else {
			return '';
		}
	},
	optionsLink() {
		if (Template.instance().showOptions.get()) {
			return t('Close_menu');
		} else {
			return t('Options');
		}
	},
	videoCallEnabled() {
		return Livechat.videoCall;
	},
	showConnecting() {
		return Livechat.connecting;
	},
	usersTyping() {
		const users = MsgTyping.get(visitor.getRoom());
		if (users.length === 0) {
			return;
		}
		if (users.length === 1) {
			return {
				multi: false,
				selfTyping: MsgTyping.selfTyping.get(),
				users: users[0]
			};
		}
		// usernames = _.map messages, (message) -> return message.u.username
		let last = users.pop();
		if (users.length > 4) {
			last = t('others');
		}
		// else
		let usernames = users.join(', ');
		usernames = [usernames, last];
		return {
			multi: true,
			selfTyping: MsgTyping.selfTyping.get(),
			users: usernames.join(` ${t('and')} `)
		};
	},
	agentData() {
		const agent = Livechat.agent;
		if (!agent) {
			return null;
		}

		const agentData = {
			avatar: getAvatarUrlFromUsername(agent.username)
		};

		if (agent.name) {
			agentData.name = agent.name;
		}

		if (agent.emails && agent.emails[0] && agent.emails[0].address) {
			agentData.email = agent.emails[0].address;
		}

		if (agent.customFields && agent.customFields.phone) {
			agentData.phone = agent.customFields.phone;
		}

		return agentData;
	}
});

Template.messages.events({
	'keyup .input-message': function(event, instance) {
		instance.chatMessages.keyup(visitor.getRoom(), event, instance);
		instance.updateMessageInputHeight(event.currentTarget);
	},
	'keydown .input-message': function(event, instance) {
		return instance.chatMessages.keydown(visitor.getRoom(), event, instance);
	},
	'click .send-button': function(event, instance) {
		const input = instance.find('.input-message');
		const sent = instance.chatMessages.send(visitor.getRoom(), input);
		input.focus();
		instance.updateMessageInputHeight(input);

		return sent;
	},
	'click .new-message': function(event, instance) {
		instance.atBottom = true;
		return instance.find('.input-message').focus();
	},
	'click .error': function(event) {
		return $(event.currentTarget).removeClass('show');
	},
	'click .toggle-options': function(event, instance) {
		instance.showOptions.set(!instance.showOptions.get());
	},
	'click .video-button': function(event) {
		event.preventDefault();

		if (!Meteor.userId()) {
			Meteor.call('livechat:registerGuest', { token: visitor.getToken() }, (error, result) => {
				if (error) {
					return console.log(error.reason);
				}

				Meteor.loginWithToken(result.token, (error) => {
					if (error) {
						return console.log(error.reason);
					}

					LivechatVideoCall.request();
				});
			});
		} else {
			LivechatVideoCall.request();
		}
	}
});

Template.messages.onCreated(function() {
	const defaultAppLanguage = () => {
		let lng = window.navigator.userLanguage || window.navigator.language || 'en';
		const regexp = /([a-z]{2}-)([a-z]{2})/;
		if (regexp.test(lng)) {
			lng = lng.replace(regexp, function(match, ...parts) {
				return parts[0] + parts[1].toUpperCase();
			});
		}
		return lng;
	};
	// get all needed live chat info for the user
	Meteor.call('livechat:getInitialData', visitor.getToken(), (err, result) => {
		if (err) {
			console.error(err);
		} else {
			if (!result.enabled) {
				Triggers.setDisabled();
				return parentCall('removeWidget');
			}
			console.log(result);
			if (!result.online) {
				Triggers.setDisabled();
				Livechat.title = result.offlineTitle;
				Livechat.offlineColor = result.offlineColor;
				Livechat.offlineMessage = result.offlineMessage;
				Livechat.displayOfflineForm = result.displayOfflineForm;
				Livechat.offlineUnavailableMessage = result.offlineUnavailableMessage;
				Livechat.offlineSuccessMessage = result.offlineSuccessMessage;
				Livechat.online = false;
			} else {
				Livechat.title = result.title;
				Livechat.onlineColor = result.color;
				Livechat.online = true;
				Livechat.transcript = result.transcript;
				Livechat.transcriptMessage = result.transcriptMessage;
			}
			Livechat.videoCall = result.videoCall;
			Livechat.registrationForm = result.registrationForm;

			if (result.room) {
				Livechat.room = result.room._id;
			}

			if (result.agentData) {
				Livechat.agent = result.agentData;
			}

			TAPi18n.setLanguage((result.language || defaultAppLanguage()).split('-').shift());

			Triggers.setTriggers(result.triggers);
			Triggers.init();

			result.departments.forEach((department) => {
				Department.insert(department);
			});

			Livechat.ready();
		}
	});

	this.atBottom = true;

	this.showOptions = new ReactiveVar(false);

	this.updateMessageInputHeight = function(input) {
		// Inital height is 28. If the scrollHeight is greater than that( we have more text than area ),
		// increase the size of the textarea. The max-height is set at 200
		// even if the scrollHeight become bigger than that it should never exceed that.
		// Account for no text in the textarea when increasing the height.
		// If there is no text, reset the height.
		const inputScrollHeight = $(input).prop('scrollHeight');
		if (inputScrollHeight > 28) {
			return $(input).height($(input).val() === '' ? '15px' : (inputScrollHeight >= 200 ? inputScrollHeight - 50 : inputScrollHeight - 20));
		}
	};

	$(document).click((/*event*/) => {
		if (!this.showOptions.get()) {
			return;
		}
		const target = $(event.target);
		if (!target.closest('.options-menu').length && !target.is('.options-menu') && !target.closest('.toggle-options').length && !target.is('.toggle-options')) {
			this.showOptions.set(false);
		}
	});
});

Template.messages.onRendered(function() {
	this.chatMessages = new ChatMessages();
	this.chatMessages.init(this.firstNode);
});

Template.messages.onRendered(function() {
	var messages, newMessage, onscroll, template;
	messages = this.find('.messages');
	newMessage = this.find('.new-message');
	template = this;
	if (messages) {
		onscroll = _.throttle(function() {
			template.atBottom = messages.scrollTop >= messages.scrollHeight - messages.clientHeight;
		}, 200);
		Meteor.setInterval(function() {
			if (template.atBottom) {
				messages.scrollTop = messages.scrollHeight - messages.clientHeight;
				newMessage.className = 'new-message not';
			}
		}, 100);
		messages.addEventListener('touchstart', function() {
			template.atBottom = false;
		});
		messages.addEventListener('touchend', function() {
			onscroll();
		});
		messages.addEventListener('scroll', function() {
			template.atBottom = false;
			onscroll();
		});
		messages.addEventListener('mousewheel', function() {
			template.atBottom = false;
			onscroll();
		});
		messages.addEventListener('wheel', function() {
			template.atBottom = false;
			onscroll();
		});
	}
});
