Template.livechatInstallation.helpers({
	script() {
		const siteUrl = s.rtrim(RocketChat.settings.get('Site_Url'), '/');

		return `<!-- Start of 51Chat.net Livechat Script -->
<script type="text/javascript">
(function(w, d, s, u) {
	w.liveChat = function(c) { w.liveChat._.push(c) }; w.liveChat._ = []; w.liveChat.url = u;
	var h = d.getElementsByTagName(s)[0], j = d.createElement(s);
	j.async = true; j.src = '${siteUrl}/packages/rocketchat_livechat/assets/rocket-livechat.js';
	h.parentNode.insertBefore(j, h);
})(window, document, 'script', '${siteUrl}/livechat');
</script>
<!-- End of 51Chat.net Livechat Script -->`;
	}
});
