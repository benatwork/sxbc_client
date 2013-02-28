'use strict';
/*global $:false */
$(document).ready(function() {
	$('#message-submit').click(function () {
		var inputField = $('#message-input');
		var message = inputField.val();


		inputField.val('');

		var newLi = $('<li>'+message+'</li>').prependTo($('.feed')).addClass('new-li');

		setTimeout(function () {
			newLi.removeClass('new-li');
		},0);

		// $.getJSON(
		// 	"https://api.twitter.com/1.1/statuses/show.json?id=210462857140252672&callback=twitterCallback",
		// 	function(data){
		// 		console.log(data);
		// 	});


		// setTimeout(function(){
		// 	newLi.text(message);
		// },2000);

	});
	// function updateDelays(){
	// 	$('ul li').each(function(i){
	// 		var t = $(this);
	// 	    setTimeout(function(){ t.addClass('animation'); }, (i+1) * 50);
	// 	});

	// }
});