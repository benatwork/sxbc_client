
/*global $:false */
/*global Handlebars:false */

var count = 2;
var cursor;

var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec" ];
$(document).ready(function() {
	var inputField = $('#message-input');

	$('#message-submit').click(function () {
		var message = {text:inputField.val()};
		addTweet(message);
		inputField.val('');
	});
	$('#next').click(function () {
		loadTweets();
	});

	function loadTweets(){
		//var requestString = 'http://search.twitter.com/search.json?q=from:'+twitter_user+'&rpp='+count+'&callback=?';
		var requestString = 'http://localhost:3001/tweets/'+count;
		if(cursor) {
			requestString += '/'+cursor;
		}

		$.ajax({
			url:requestString,
			dataType:"json",
			success:function(data){
				processTweets(data);
			},
			error:function(error){
				console.log('error fetching tweets: ',error);
			}
		});
	}

	function processTweets(data){
		console.log(data);
		for (var i = 0; i <= data.length-1; i ++) {
			var result = data[i];
			console.log(result.id_str);
			addTweet(result,false);
		}
		//set the cursor the id of the last tweet fetched

		cursor = decStrNum(data[data.length-1].id_str);
	}

	loadTweets();



	function decStrNum(n) {
	    n = n.toString();
	    var result=n;
	    var i=n.length-1;
	    while (i>-1) {
			if (n[i]==="0") {
				result=result.substring(0,i)+"9"+result.substring(i+1);
				i --;
			} else {
				result=result.substring(0,i)+(parseInt(n[i],10)-1).toString()+result.substring(i+1);
				return result;
			}
		}
	    return result;
	}

	function addTweet(tweet){
		var source   = $('#entry-template').html();
		var template = Handlebars.compile(source);
		var date = new Date(tweet.created_at);
		var context = {
			message: ify.clean(tweet.text),
			userImg: tweet.user.profile_image_url,
			userUrl: 'http://twitter.com/'+tweet.user.screen_name,
			fullName: tweet.user.name,
			nickname: '@'+tweet.user.screen_name,
			dateTime: monthNames[date.getMonth()]+' '+date.getDay(),
			favoriteCount:tweet.favourites_count,
			retweetCount:tweet.retweet_count
		};
		var newLi = $.parseHTML(template(context));
		var $newLi = $(newLi);
		$newLi.appendTo($('.feed'));
		$newLi.addClass('with-expansion');
		$newLi.hover(function(){
			$('.tweet-actions',this).fadeIn('fast');
		},function(){
			$('.tweet-actions',this).fadeOut('fast');
		});
		$newLi.click(function(){
			if($('.footer',this).hasClass('expanded')){
				$('.footer',this).removeClass('expanded');
				$('.expand',this).text('expand');
			} else {
				$('.footer',this).addClass('expanded');
				$('.expand',this).text('collapse');

			}
		});

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
	    link: function (tweet) {
	        return tweet.replace(/\b(((https*\:\/\/)|www\.)[^\"\']+?)(([!?,.\)]+)?(\s|$))/g, function (link, m1, m2, m3, m4) {
	            var http = m2.match(/w/) ? 'http://' : '';
	            return '<a class="twtr-hyperlink" target="_blank" href="' + http + m1 + '">' + ((m1.length > 25) ? m1.substr(0, 24) + '...' : m1) + '</a>' + m4;
	        });
	    },

	    at: function (tweet) {
	        return tweet.replace(/\B[@＠]([a-zA-Z0-9_]{1,20})/g, function (m, username) {
	            return '<a target="_blank" class="twtr-atreply" href="http://twitter.com/intent/user?screen_name=' + username + '">@' + username + '</a>';
	        });
	    },

	    list: function (tweet) {
	        return tweet.replace(/\B[@＠]([a-zA-Z0-9_]{1,20}\/\w+)/g, function (m, userlist) {
	            return '<a target="_blank" class="twtr-atreply" href="http://twitter.com/' + userlist + '">@' + userlist + '</a>';
	        });
	    },

	    hash: function (tweet) {
	        return tweet.replace(/(^|\s+)#(\w+)/gi, function (m, before, hash) {
	            return before + '<a target="_blank" class="twtr-hashtag" href="http://twitter.com/search?q=%23' + hash + '">#' + hash + '</a>';
	        });
	    },

	    clean: function (tweet) {
	        return this.hash(this.at(this.list(this.link(tweet))));
	    }
	};

});


