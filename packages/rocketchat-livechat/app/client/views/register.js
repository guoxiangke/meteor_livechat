/* globals Department, Livechat, LivechatVideoCall */
Template.register.helpers({
	error() {
		return Template.instance().error.get();
	},
	videoCallEnabled() {
		return Livechat.videoCall;
	},
	selectedDepartment() {
		return this._id === Livechat.department;
	}
});

Template.register.events({
	'submit #livechat-registration'(e, instance) {
		var $email, $name;
		e.preventDefault();

		const start = () => {
			instance.hideError();
			if (instance.request === 'video') {
				LivechatVideoCall.request();
			}
		};

		var $type = instance.$('#input').attr('name');
		$name = instance.$('input[name='+$type+']');

		if(!$name.val().trim()){
			instance.$('.intercom-notification-channels-input').addClass('intercom-notification-channels-input-error');
			instance.$('#input').attr('placeholder','').focus();
			return instance.showError('请选择一个通知方式');//TAPi18n.__('Please_fill_name_and_email')
		}else{
			$name = $name.val().trim();
			$email = $name + '@' + $type;
			//默认添加到对于的domain department！
			var domain = FlowRouter.getQueryParam("domain");
			var departmentId = Department.findOne({ showOnRegistration: true,'description': domain })._id;

			if (!departmentId) {
				var department = Department.findOne({ showOnRegistration: true });
				if (department) {
					departmentId = department._id;
				}
			}

			var guest = {
				token: visitor.getToken(),
				name: $name,
				email: $email,
				department: Livechat.deparment || departmentId
			};
			Meteor.call('livechat:registerGuest', guest, function(error, result) {
				if (error != null) {
					return instance.showError(error.reason);
				}
				Meteor.loginWithToken(result.token, function(error) {
					if (error) {
						return instance.showError(error.reason);
					}
					start();
				});
			});
		}
	},
	'click .error'(e, instance) {
		return instance.hideError();
	},
	'click .request-chat'(e, instance) {
		instance.request = 'chat';
	},
	'click .request-video'(e, instance) {
		instance.request = 'video';
	},
	'click #message'(e, instance) {
		if(!instance.$('#input').val())
			instance.$('#input').attr('placeholder','').focus();
	},
	'click .intercom-notification-channels-input-submit-button'(e, instance) {
		e.preventDefault();
		instance.$('#livechat-registration').submit();
	},
	'click .intercom-notification-channels-option-container a'(e, instance) {
		instance.$('.intercom-notification-channels-input').removeClass('intercom-notification-channels-input-error');
		instance.hideError();
		e.preventDefault();
		instance.$('.intercom-notification-channels-option').removeClass('intercom-notification-channels-option-selected');
		$(e.currentTarget).addClass('intercom-notification-channels-option-selected');
		instance.$('#input').attr('name',$(e.currentTarget).attr('data-type'));

		if($(e.currentTarget).attr('data-type')=='sms'){
			if(!instance.$('#input').val())
				instance.$('#input').attr('placeholder','135 2005 5900');
			instance.$('.intercom-flag').show();
			instance.$('.intercom-notification-channels-input-container .intercom-notification-channels-input').addClass('intercom-notification-channels-phone-input');
		}
		if($(e.currentTarget).attr('data-type')=='wechat'){
			instance.$('.intercom-flag').hide();
			if(!instance.$('#input').val())
				instance.$('#input').attr('placeholder','love711');
			instance.$('.intercom-notification-channels-input-container .intercom-notification-channels-input').removeClass('intercom-notification-channels-phone-input');
		}
		if($(e.currentTarget).attr('data-type')=='qq'){
			instance.$('.intercom-flag').hide();
			if(!instance.$('#input').val())
				instance.$('#input').attr('placeholder','4740542360');
			instance.$('.intercom-notification-channels-input-container .intercom-notification-channels-input').removeClass('intercom-notification-channels-phone-input');
		}

	}
});

Template.register.onCreated(function() {
	// this.pageVisited = this.subscribe('livechat:visitorPageVisited', { rid: currentData.rid });
	this.error = new ReactiveVar();
	this.request = '';
	this.showError = (msg) => {
		$('.error').addClass('show');
		this.error.set(msg);
	};
	this.hideError = () => {
		$('.error').removeClass('show');
		this.error.set();
	};


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
});
