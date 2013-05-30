var youtube2spotify_data = {
  youtube_developer_key: 'AI39si6koxPUHowThl0aytdIBp8OXNRYu3g08TSBf8UPjuAggM3OQgjh86jyMHj694gf6Aw9lxskseVhHJCcQ-Smem_GX_7dAQ',
  tracks_to_store: {},

  store_track: function(single_track_data, callback) {
    var tracks_to_store = this.tracks_to_store;
    var me = this;
    chrome.storage.local.get('youtube2spotify', function(data) {
      data = data.youtube2spotify || {};
      data.tracks = data.tracks || {};
      data.tracks[single_track_data.id] = single_track_data;
      chrome.storage.local.set({'youtube2spotify': data}, function() {
        callback(single_track_data);
      });
    });
  },

  get_json: function(url, handler, callback, failure_value) {
    $.getJSON(url, handler).error(function() {
      callback(failure_value);
    });
  },

  get_youtube_title: function(video_id, callback) {
    var url = 'http://gdata.youtube.com/feeds/api/videos/' + video_id + 
              '?v=2&alt=json&key=' + this.youtube_developer_key;
    this.get_json(url, function(data) {
      if (data && data.entry && data.entry.title) {
        callback(data.entry.title.$t);
      } else {
        callback(false);
      }
    }, callback, false);
  },

  got_spotify_tracks: function(data, callback) {
    var track = data.tracks[0];
    var track_name = track.name;
    var artists = [];
    for (var i=0; i<track.artists.length; i++) {
      var artist = track.artists[i];
      artists.push({
        name: artist.name,
        app_url: artist.href,
        web_url: youtube2spotify_util.get_spotify_artist_web_url(
          artist.href
        )
      });
    }
    var web_url = youtube2spotify_util.get_spotify_track_web_url(
      track.href
    );
    var track_id = youtube2spotify_util.get_spotify_track_id(track.href);
    var track_data = {app_url: track.href, name: track_name, 
                      artists: artists, web_url: web_url, id: track_id};
    callback(track_data);
  },

  get_spotify_data: function(title, callback) {
    var query_url = youtube2spotify_util.get_spotify_track_search_url(title);
    var me = this;
    this.get_json(query_url, function(data) {
      console.log('got Spotify data for title ' + title);
      if (data && data.info && data.info.num_results > 0) {
        me.got_spotify_tracks(data, callback);
      } else {
        callback(false);
      }
    }, callback, false);
  },

  choose_words: function(original_words, corrected_words) {
    if (original_words.length !== corrected_words.length) {
      console.error('Did not get a corrected word for each word');
      return original_words;
    }
    var chosen_words = [];
    var tolerance = 2;
    var misspellings = 0;
    for (var i=0; i<original_words.length; i++) {
      var original = original_words[i];
      var corrected = corrected_words[i];
      if (original === corrected) {
        chosen_words.push(original);
      } else if (misspellings < tolerance) {
        chosen_words.push(corrected);
        misspellings++;
      } else {
        // Don't want to accept too many typos in case we completely change the
        // original YouTube title, thus getting a bad Spotify match.
        chosen_words.push(original);
      }
    }
    return chosen_words;
  },

  spotify_match_attempt2: function(title, s_choice, callback) {
    var words = title.split(' ');
    var num_words = words.length;
    if (num_words < 1) {
      callback(false);
      return;
    }
    var correct_words = [];
    var me = this;
    var on_spellchecked = function() {
      var chosen_words = me.choose_words(words, correct_words);
      var corrected_title = chosen_words.join(' ');
      me.get_spotify_data(corrected_title, function(data) {
        if (data) {
          me.store_track(data, callback);
        } else {
          callback(false);
        }
      });
    };
    var spellcheck = function(index) {
      if (youtube2spotify_util.in_background_script()) {
        var suggestion = youtube2spotify_spellchecker.spellcheck(words[index]);
        word_handler({index: index + 1, suggestion: suggestion});
      } else {
        youtube2spotify_util.send_message(
          {word: words[index], index: index, action: 'spellcheck'}, 
          word_handler
        );
      }
    };
    var word_handler = function(response) {
      correct_words.push(response.suggestion);
      if (response.index >= num_words) {
        on_spellchecked();
        return true;
      }
      spellcheck(response.index);
      return true;
    };
    spellcheck(0);
  },

  spotify_match_attempt1: function(title, s_choice, callback) {
    var me = this;
    title = youtube2spotify_util.strip_punctuation(title);
    this.get_spotify_data(title, function(data) {
      if (data) {
        me.store_track(data, callback);
      } else {
        me.spotify_match_attempt2(title, s_choice, callback);
      }
    });
  },

  store_spotify_track_for_yt_video: function(vid, s_choice, callback) {
    var me = this;
    this.get_youtube_title(vid, function(title) {
      console.log('got YouTube title for video ID ' + vid);
      if (title) {
        me.spotify_match_attempt1(title, s_choice, callback);
      } else {
        callback(false);
      }
    });
  },

  store_spotify_tracks_from_reddit_data: function(data, s_choice, callback) {
    var youtube_urls = youtube2spotify_util.get_reddit_youtube_urls(data);
    console.log('got ' + youtube_urls.length + ' YouTube URLs from Reddit data');
    var num_youtube_links = youtube_urls.length;
    var me = this;
    var on_data_stored = function(i) {
      console.log('stored data for YouTube URL #' + (i + 1));
      if (i === num_youtube_links - 1) {
        console.log('finished storing all Spotify tracks for YouTube videos');
        callback(s_choice);
      }
    };
    var url_handler = function(i) {
      console.log('handling YouTube video #' + (i+1));
      var vid = youtube2spotify_util.get_youtube_video_id(youtube_urls[i]);
      console.log('got YouTube video ID for #' + (i+1));
      me.store_spotify_track_for_yt_video(vid, s_choice, function(data) {
        on_data_stored(i);
      });
    };
    for (var i=0; i<youtube_urls.length; i++) {
      url_handler(i);
    }
  },

  get_reddit_api_data: function(subreddit_path, spotify_choice, callback) {
    var url = 'http://www.reddit.com' + subreddit_path + '/new.json';
    var me = this;
    this.get_json(url, function(data) {
      if (data && data.data && data.data.children) {
        callback(data.data.children);
      } else {
        callback([]);
      }
    }, callback, []);
  },

  get_options: function(callback) {
    chrome.storage.sync.get('youtube2spotify_options', function(opts) {
      opts = opts.youtube2spotify_options || {};
      var spotify_choice = opts.spotify || 'web_player';
      var lookup_behavior = opts.lookup_behavior || 'immediate_lookup';
      opts.spotify_choice = spotify_choice;
      opts.lookup_behavior = lookup_behavior;
      callback(opts);
    });
  },

  get_spotify_choice: function(callback) {
    this.get_options(function(opts) {
      callback(opts.spotify_choice);
    });
  },

  get_lookup_behavior: function(callback) {
    this.get_options(function(opts) {
      callback(opts.lookup_behavior);
    });
  },

  store_spotify_tracks_from_reddit_api: function(subreddit_path, callback) {
    var me = this;
    this.get_spotify_choice(function(s_choice) {
      me.get_reddit_api_data(subreddit_path, s_choice, function(data) {
        console.log('got Reddit API data for ' + subreddit_path);
        me.store_spotify_tracks_from_reddit_data(data, s_choice, callback);
      });
    });
  }
};