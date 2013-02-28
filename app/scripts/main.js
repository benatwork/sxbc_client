'use strict';
/*global $:false */
/*global Handlebars:false */
var twitter_user = "canttweetthis_";

var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];
$(document).ready(function() {
	var inputField = $('#message-input');

	$('#message-submit').click(function () {
		var message = {text:inputField.val()};
		addMessage(message);
		inputField.val('');

	});


	function initTweets(){
		$.getJSON(
		'http://search.twitter.com/search.json?q=from:'+twitter_user+'&callback=?',
		function(data){
			console.log(data);
			for (var i = data.results.length-1; i >= 0; i --) {
				var result = data.results[i];
				addMessage(result);
			}
		});
	}

	initTweets();



	function addMessage(message){
		var source   = $('#entry-template').html();
		var template = Handlebars.compile(source);
		console.log(message.profile_image_url);
		var date = new Date(message.created_at)
		var context = {
			message: ify.clean(message.text),
			userImg: message.profile_image_url,
			userUrl: 'http://twitter.com/'+message.from_user,
			fullName: message.from_user_name,
			nickname: '@'+message.from_user,
			dateTime: monthNames[date.getMonth()]+' '+date.getDay()

		};
		var newLi    = $.parseHTML(template(context));
		var $newLi = $(newLi);
		$newLi.prependTo($('.feed'));

		setTimeout(function () {
			$newLi.removeClass('new-li');
		},0);
	}


	/**
	  * The Twitalinkahashifyer!
	  * http://www.dustindiaz.com/basement/ify.html
	  * Eg:
	  * ify.clean('your tweet text');
	  */
	var ify = {
	  link: function(tweet) {
	    return tweet.replace(/\b(((https*\:\/\/)|www\.)[^\"\']+?)(([!?,.\)]+)?(\s|$))/g, function(link, m1, m2, m3, m4) {
	      var http = m2.match(/w/) ? 'http://' : '';
	      return '<a class="twtr-hyperlink" target="_blank" href="' + http + m1 + '">' + ((m1.length > 25) ? m1.substr(0, 24) + '...' : m1) + '</a>' + m4;
	    });
	  },

	  at: function(tweet) {
	    return tweet.replace(/\B[@＠]([a-zA-Z0-9_]{1,20})/g, function(m, username) {
	      return '<a target="_blank" class="twtr-atreply" href="http://twitter.com/intent/user?screen_name=' + username + '">@' + username + '</a>';
	    });
	  },

	  list: function(tweet) {
	    return tweet.replace(/\B[@＠]([a-zA-Z0-9_]{1,20}\/\w+)/g, function(m, userlist) {
	      return '<a target="_blank" class="twtr-atreply" href="http://twitter.com/' + userlist + '">@' + userlist + '</a>';
	    });
	  },

	  hash: function(tweet) {
	    return tweet.replace(/(^|\s+)#(\w+)/gi, function(m, before, hash) {
	      return before + '<a target="_blank" class="twtr-hashtag" href="http://twitter.com/search?q=%23' + hash + '">#' + hash + '</a>';
	    });
	  },

	  clean: function(tweet) {
	    return this.hash(this.at(this.list(this.link(tweet))));
	  }
	} // ify

});


