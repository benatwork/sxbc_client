
/*global $:false */
/*global Handlebars:false */
/*global io:false */


//_______________________ config _______________________________
// true to use localhost, false for heroku server
var dev = false;

//how many tweets to fetch at a time
var count = 30;
var initialLoadCount = 30;

//user name of twitter account to fetch
var accountToFetch = 'sxbackchannel';

var cursor;

var serverUri;
if(dev){
	//dev settings
	serverUri = "http://localhost:5000";
	console.warn('using development server');
} else {
	//production settings
	serverUri = "http://sxbc.herokuapp.com";
	console.warn('using production server');
}

var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec" ];


$(document).ready(function() {
	var inputField = $('#message-input');
	var notifications = $('#notifications');

	//init websockets after js has been loaded from server
	$.getScript(serverUri+'/socket.io/socket.io.js',function(){
		initWebsockets();
	});

	init();

	// setInterval(function(){
	// 	$.ajax({
	// 		url:serverUri+'/get_tweets',
	// 		dataType:"json",
	// 		headers: {
	// 			'x-name': 'sxbackchannel',
	// 			'x-count': 1
	// 			//'x-cursor': cursor
	// 		},
	// 		success:function(){
	// 			//processTweets(data);
	// 			//hideLoader();
	// 			count ++;
	// 			console.log(count);
	// 		},
	// 		error:function(error){
	// 			console.log('error fetching tweets: ',error);
	// 			//notifications.text(error.responseText);
	// 		}
	// 	});
	// },10);

	//init
	function init(){
		$('#message-submit').click(function () {
			notifications.text('');
			$.ajax({
				url:serverUri,
				type:'POST',
				dataType:'json',
				data:{"message":inputField.val()},
				success:function(data){
					console.log('success',data);
				},
				error:function(error){
					console.log('error fetching tweets: ',error);
					notifications.text(JSON.parse(JSON.parse(error.responseText).error.data).errors[0].message);
				}
			});
			inputField.val('');
		});

		//catch enter press
		inputField.keyup(function(event){
		    if(event.keyCode === 13){
		        $('#message-submit').click();
		    }
		});

		//set focus to textinput
		inputField.focus();

		//load more tweets on footer click
		$('.feed-footer').click(function () {
			loadTweets();
		});

		//initial load
		loadTweets(initialLoadCount);
	}

	function initWebsockets(){
		//init connection
		var socket = io.connect(serverUri,{
			port:dev ? 5000 : ''
		});
		//socket.off('connect');
		socket.on('connect', function () {
			console.log('websocket connected');
			//listener for new tweets
			socket.on('tweet',function(tweetData){
				addTweet(tweetData);
			});
		});
	}

	function loadTweets(overrideCount,overrideUser){
		//var requestString = 'http://search.twitter.com/search.json?q=from:'+twitter_user+'&rpp='+count+'&callback=?';
		var _count = overrideCount || count;
		var _user = overrideUser || accountToFetch;


		showLoader();

		$.ajax({
			url:serverUri+'/get_tweets',
			dataType:"json",
			headers: {
				'x-name': _user,
				'x-count': _count,
				'x-cursor': cursor
			},
			success:function(data){
				processTweets(data);
				hideLoader();
			},
			error:function(error){
				if(error.status === 0){
					notifications.text('Could not connect to the server');
				} else {
					console.log('error fetching tweets: ',error);
					console.log(error);
					notifications.text(error.statusText);
				}
			}
		});

		function processTweets(data){
			for (var i = 0; i <= data.length-1; i ++) {
				var result = data[i];
				addTweet(result,true);
			}

			if(data.length < _count) {
				$('.feed-footer').remove();
			} else {
				//set the cursor the id of the last tweet fetched
				cursor = decStrNum(data[data.length-1].id_str);
			}
		}
		function hideLoader(){
			$('.footer-more').fadeIn('fast');
			$('.footer-loading').fadeOut('fast');
		}
		function showLoader(){
			$('.footer-more').fadeOut('fast');
			$('.footer-loading').fadeIn('fast');
		}
	}


	function addTweet(tweet,fromBottom){
		console.log(tweet);
		var source   = $('#entry-template').html();
		var template = Handlebars.compile(source);
		var date = new Date(tweet.created_at);
		var context = {
			tweetId: tweet.id_str,
			message: ify.clean(tweet.text),
			userImg: tweet.user.profile_image_url,
			userUrl: 'http://twitter.com/'+tweet.user.screen_name,
			fullName: tweet.user.name,
			nickname: '@'+tweet.user.screen_name,
			dateTime: monthNames[date.getMonth()]+' '+date.getDate(),
			favoriteCount:tweet.favourites_count,
			retweetCount:tweet.retweet_count
		};

		//render template
		var newLi = $.parseHTML(template(context));
		var $newLi = $(newLi);


		if(fromBottom){
			//add li elements before the list footer
			$newLi.addClass('bottom');
			$('.feed li').last().before($newLi);
		} else {
			$newLi.prependTo($('.feed'));
		}

		//if there are retweets, enable the expandable area
		if(tweet.retweet_count > 0) {
			$newLi.addClass('with-expansion');
			$newLi.click(function(){
				if($('.footer',this).hasClass('expanded')){
					$('.footer',this).removeClass('expanded');
					$('.expand',this).text('expand');
				} else {
					$('.footer',this).addClass('expanded');
					$('.expand',this).text('collapse');
				}
			});
		}

		//show action buttons on hover
		$newLi.hover(function(){
			$('.tweet-actions',this).fadeIn('fast');
		},function(){
			$('.tweet-actions',this).fadeOut('fast');
		});

		//remove the new-li class to trigger the animation back to final position
		setTimeout(function () {
			$newLi.removeClass('new-li');
		},0);
	}

	
});


//__________________________ utils ___________________________________________________

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


