youtube2spotify_util.receive_message(function(request, sender, sendResponse) {
  if (request.action === 'spellcheck') {
    var suggestion = youtube2spotify_spellchecker.spellcheck(request.word);
    sendResponse({suggestion: suggestion, index: request.index + 1});
    return true;
  } else if (request.action === 'reddit_api') {
    console.log('got request to lookup tracks from ' + request.subreddit_path);
    youtube2spotify_data.store_spotify_tracks_from_reddit_api(
      request.subreddit_path,
      function(spotify_choice) {
        console.log('kicked off track lookup for ' + request.subreddit_path);
        sendResponse(spotify_choice);
      }
    );
    return true;
  }
});
