var youtube2spotify_data = {
  youtube_developer_key: 'AI39si6koxPUHowThl0aytdIBp8OXNRYu3g08TSBf8UPjuAggM3OQgjh86jyMHj694gf6Aw9lxskseVhHJCcQ-Smem_GX_7dAQ',

  store_track_data: function(single_track_data, callback) {
    chrome.storage.local.get('youtube2spotify', function(data) {
      data = data.youtube2spotify || {};
      var tracks = data.tracks || {};
      tracks[single_track_data.id] = single_track_data;
      data.tracks = tracks;
      chrome.storage.local.set({'youtube2spotify': data}, function() {
        callback(single_track_data);
      });
    });
  },

  get_youtube_title: function(video_id, callback) {
    var url = 'http://gdata.youtube.com/feeds/api/videos/' + video_id + 
              '?v=2&alt=json&key=' + this.youtube_developer_key;
    $.getJSON(url, function(data) {
      if (!data) {
        callback(false);
        return;
      }
      callback(data.entry.title.$t);
    }).error(function() {
      callback(false);
    });
  },

  // store_spotify_url_for_yt_url: function(url, s_choice, is_last, callback) {
  //   var video_id = youtube2spotify_util.get_youtube_video_id(url);
  //   if (!video_id) {
  //     if (is_last) {
  //       callback();
  //     }
  //     return;
  //   }
  //   var me = this;
  //   this.get_youtube_title(video_id, function(title) {
  //     if (title) {
  //       me.on_youtube_title_retrieved(title, s_choice, callback);
  //     } else {
  //       callback();
  //     }
  //   });
  // },

  get_spotify_data: function(title, callback) {
    var query_url = youtube2spotify_util.get_spotify_track_search_url(title);
    var me = this;
    $.getJSON(query_url, function(data) {
      if (data && data.info.num_results > 0) {
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
      } else {
        callback(false);
      }
    });
  },

  choose_words: function(original_words, corrected_words) {
    if (original_words.length !== corrected_words.length) {
      console.error('Did not get a corrected word for each word');
      return original_words;
    }
    var chosen_words = [];
    var misspellings = 0;
    for (var i=0; i<original_words.length; i++) {
      var original = original_words[i];
      var corrected = corrected_words[i];
      if (original === corrected) {
        chosen_words.push(original);
      } else if (misspellings < 1) {
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

  spotify_match_attempt3: function(title, s_choice, callback) {
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
          me.store_track_data(data, callback);
        } else {
          callback(false);
        }
      });
    };
    var spellcheck = function(index) {
      chrome.runtime.sendMessage({word: words[index], index: index, 
                                  action: 'spellcheck'}, word_handler);
    };
    var word_handler = function(response) {
      correct_words.push(response.suggestion);
      if (response.index >= num_words) {
        on_spellchecked();
        return;
      }
      spellcheck(response.index);
    };
    spellcheck(0);
  },

  spotify_match_attempt2: function(title, s_choice, callback) {
    var cleaned_title = youtube2spotify_util.clean_youtube_title(title);
    var me = this;
    this.get_spotify_data(cleaned_title, function(data) {
      if (data) {
        me.store_track_data(data, callback);
      } else {
        me.spotify_match_attempt3(cleaned_title, s_choice, callback);
      }
    });
  },

  spotify_match_attempt1: function(title, s_choice, callback) {
    var me = this;
    this.get_spotify_data(title, function(data) {
      if (data) {
        me.store_track_data(data, callback);
      } else {
        me.spotify_match_attempt2(title, s_choice, callback);
      }
    });
  },

  store_spotify_track_for_yt_video: function(vid, s_choice, callback) {
    var me = this;
    this.get_youtube_title(vid, function(title) {
      if (title) {
        me.spotify_match_attempt1(title, s_choice, callback);
      } else {
        callback(false);
      }
    });
  },

  store_spotify_tracks_from_reddit_data: function(data, s_choice, callback) {
    var youtube_urls = youtube2spotify_util.get_reddit_youtube_urls(data);
    var num_youtube_links = youtube_urls.length;
    var on_data_stored = function(i) {
      if (i === num_youtube_links - 1) {
        callback(s_choice);
      }
    };
    var me = this;
    var url_handler = function(i) {
      var vid = youtube2spotify_util.get_youtube_video_id(youtube_urls[i]);
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
    $.getJSON(url, function(data) {
      if (data && data.data && data.data.children) {
        callback(data.data.children);
      } else {
        callback([]);
      }
    }).error(function() {
      callback([]);
    });
  },

  get_spotify_choice: function(callback) {
    chrome.storage.sync.get('youtube2spotify_options', function(opts) {
      opts = opts.youtube2spotify_options || {};
      var spotify_choice = opts.spotify || 'web_player';
      callback(spotify_choice);
    });
  },

  add_spotify_links_from_reddit_api: function(subreddit_path, callback) {
    var me = this;
    this.get_spotify_choice(function(s_choice) {
      me.get_reddit_api_data(subreddit_path, s_choice, function(data) {
        me.store_spotify_tracks_from_reddit_data(data, s_choice, callback);
      });
    });
  }
};