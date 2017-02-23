/* globals Department, Livechat, LivechatVideoCall */

Template.newregister.helpers({
  error() {
    return Template.instance().error.get();
  },
  welcomeMessage() {
    return '';
  },
  showDepartments() {
    return Department.find({ showOnRegistration: true }).count() > 1;
  },
  departments() {
    return Department.find({ showOnRegistration: true });
  },
  videoCallEnabled() {
    return Livechat.videoCall;
  },
  selectedDepartment() {
    return this._id === Livechat.department;
  }
});

Template.newregister.events({
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
      return instance.showError(TAPi18n.__('Please_fill_name_and_email'));//
      console.log('//TODO 必须选择一个通知方式');
    }else{
      $name = $name.val().trim();
      $email = $name + '@' + $type;

      var departmentId = instance.$('select[name=department]').val();
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
      console.log('//TODO add sms wechat & phone meta!');
      console.log('//TODO append 10分钟内客服会上线哦!');
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
  'click .intercom-notification-channels-input-submit-button'(e, instance) {
    e.preventDefault();
    instance.$('#livechat-registration').submit();
  },
});

Template.newregister.onCreated(function() {
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
});
