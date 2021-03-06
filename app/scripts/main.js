
/*global $:false */
/*global Handlebars:false */
/*global io:false */
/*global Modernizr:false */


//_______________________ config _______________________________
// true to use localhost, false for heroku server
var dev = false;

//how many tweets to fetch on load
var initialLoadCount = 20;
var count = 40;


//user name of twitter account to fetch

//list to fetch, use https://dev.twitter.com/console
//list must belong to same user 'accountToFetch'
var listToFetch = {
	user:'sxbackchannel',
	userId:'1145788693',
	listSlug:'sxbc'
};

var cursor;
var isTouch = Modernizr.touch ? true : false;


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
var hasAt = false;
var firstLoadComplete = true;



var shiftPressed = false;



//_______________________ app ____________________________________

$(document).ready(function() {
	var inputField = $('#message-input');
	var notifications = $('#notifications');

	//init websockets after js has been loaded from server
	$.getScript(serverUri+'/socket.io/socket.io.js',function(){
		initWebsockets();
	});

	//use to force twitter GET limit to be exceeded for testing
	//breakTwitterRateLimit();

	init();

	//init
	function init(){

		inputField.keydown(validateText);
		inputField.keyup(validateText);

		//listen for the shift key
		$(document).bind('keyup keydown', function(e){
			shiftPressed = e.shiftKey;
		} );


		if(isTouch){
			$('#message-submit').on('touchstart', submitHandler);
		} else {
			$('#message-submit').click(submitHandler);
		}

		function submitHandler(){
			notifications.text('');

			//if shift is pressed, pass the id of an alternate twitter account to post from
			if(shiftPressed){
				submitMessage(inputField.val(),1);
			} else {
				submitMessage(inputField.val());
			}

			inputField.val('');
		}

		//catch enter press
		inputField.keyup(function(event){
		    if(event.keyCode === 13){
		        submitHandler();
		    }
		});

		//set focus to textinput
		inputField.focus();

		//load more tweets on footer click
		if(isTouch){
			$('.feed-footer').on('touchstart',loadTweets);
		} else {
			$('.feed-footer').click(loadTweets);
		}

		//initial load
		loadTweets(initialLoadCount);
		setTimeout(initFollowButton,100);
	}

	function initWebsockets(){
		//init connection
		var socket = io.connect(serverUri,{
			port:dev ? 5000 : ''
		});
		socket.removeAllListeners();
		socket.on('connect', function () {
			//listener for new tweets
			console.log('websocket connected - listening for new tweets');
			socket.removeListener('tweet');
			socket.on('tweet',function(tweetData){
				addTweet(tweetData);
			});
		});
	}

	function validateText() {

		var limitCount = 140;
		var limitField = inputField;
		//remove any @ signs that are typed
		if(!hasAt) {clearNotification();}
		if (limitField.val().match('@')){
            //limitField.val(limitField.val().replace('@',''));
            setNotifictation("Warning: @'s will be removed",true);
        }
		if (limitField.val().length > limitCount) {
			limitField.val(limitField.val().substring(0, limitCount));
			$("#countdown").text(0);
			//setNotifictation(0);
		} else {
			//setNotifictation(limitCount - limitField.val().length);
		}
	}



	function submitMessage(message,overrideAccountId){
		var _accountId = overrideAccountId || 0;

		$.ajax({
			url:serverUri,
			type:'POST',
			dataType:'json',
			data:{"message":message,'accountId':_accountId},
			success:function(data){
				console.log('success',data);
			},
			error:function(error){
				console.log('error fetching tweets: ',error);
				var parsedErrorMessage = JSON.parse(JSON.parse(error.responseText).error.data).errors[0].message;
				setNotifictation(parsedErrorMessage,true);
			}
		});
	}
	function loadTweets(overrideCount){
		var _count = overrideCount || count;

		showLoader();

		$.ajax({
			url:serverUri+'/get_list_tweets',
			dataType:"json",
			headers: {
				'x-name': listToFetch.user,
				'x-count': _count,
				'x-cursor': cursor,
				//'x-list-id': listToFetch.listId,
				'x-list-slug':listToFetch.listSlug
			},
			success:function(data){
				processTweets(data);
			},
			error:function(error){
				if(error.status === 0){
					setNotifictation('Could not connect to the server',true);
				} else {
					console.log('error fetching tweets: ',error);
					setNotifictation(error.statusText,true);
				}
			}
		});

		function processTweets(data){
			for (var i = 0; i <= data.length-1; i ++) {
				var result = data[i];
				addTweet(result,true);
			}

			//if(data.length < initialLoadCount) {
				//$('.feed-footer').remove();
			//} else {
				//set the cursor the id of the last tweet fetched
				cursor = decStrNum(data[data.length-1].id_str);
			//}
			hideLoader();
		}
		function hideLoader(){
			$('.footer-more').fadeIn(0.4);
			$('.footer-loading').fadeOut(0.4);
		}
		function showLoader(){
			$('.footer-more').fadeOut(0.4);
			$('.footer-loading').fadeIn(0.4);
		}


	}


	function addTweet(tweet,fromBottom){
		
		var source   = $('#entry-template').html();
		var template = Handlebars.compile(source);
		var date = new Date(tweet.created_at);
		var context = {
			message: ify.clean(tweet.text),
			userImg: tweet.user.profile_image_url,
			userUrl: 'http://twitter.com/'+tweet.user.screen_name,
			fullName: tweet.user.name,
			nickname: '@'+tweet.user.screen_name,
			dateTime: monthNames[date.getMonth()]+' '+date.getDate(),
			favoriteCount:tweet.favourites_count,
			retweetCount:tweet.retweet_count,
			tweetId: tweet.id_str
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
		$('.feed');
		//if there are retweets, enable the expandable area
		if(tweet.retweet_count > 0) {
			$newLi.addClass('with-expansion');
			if(isTouch){
				$newLi.on('touchstart',toggleExpand);
			} else{
				$newLi.click(toggleExpand);
			}
		}
		function toggleExpand(){
			if($('.footer',this).hasClass('expanded')){
				$('.footer',this).removeClass('expanded');
				$('.expand',this).text('expand');
			} else {
				$('.footer',this).addClass('expanded');
				$('.expand',this).text('collapse');
			}
		}
		//show action buttons on hover
		$newLi.hover(function(){
			$('.tweet-actions',this).fadeIn('fast');
		},function(){
			$('.tweet-actions',this).fadeOut('fast');
		});

		//give the li a chance to render then remove new-li, causing it to move into position
		setTimeout(function () {
			$newLi.removeClass('new-li');
		},0);
	}

	function setNotifictation(message,isError){
		notifications.text(message);
		notifications.removeClass('error-text');
		if(isError) {
			notifications.addClass('error-text');
		}
	}

	function clearNotification(){
		notifications.text('');
		notifications.removeClass('error-text');
	}
	function initFollowButton(){
		//code from twitter
		(function (d, s, id) {
		    var js, fjs = d.getElementsByTagName(s)[0];
		    if (!d.getElementById(id)) {
		        js = d.createElement(s);
		        js.id = id;
		        js.src = "//platform.twitter.com/widgets.js";
		        fjs.parentNode.insertBefore(js, fjs);
		    }
		})(document, "script", "twitter-wjs");
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

// function breakTwitterRateLimit(){
// 	var r = window.confirm(":::: break twitter rate limit? ::::");
// 	if (r){
// 		setInterval(function(){
// 			$.ajax({
// 				url:serverUri+'/get_tweets',
// 				dataType:"json",
// 				headers: {
// 					'x-name': 'sxbackchannel',
// 					'x-count': 1
// 					//'x-cursor': cursor
// 				},
// 				success:function(){
// 					//processTweets(data);
// 					//hideLoader();
// 					count ++;
// 					console.log(count);
// 				},
// 				error:function(error){
// 					console.log('error fetching tweets: ',error);
// 					//notifications.text(error.responseText);
// 				}
// 			});
// 		},10);
// 	}

// }

