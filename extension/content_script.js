/*
 * Copyright 2013 Sarah Vessels
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var youtube2spotify = {
  youtube_developer_key: 'AI39si6koxPUHowThl0aytdIBp8OXNRYu3g08TSBf8UPjuAggM3OQgjh86jyMHj694gf6Aw9lxskseVhHJCcQ-Smem_GX_7dAQ',

  get_youtube_links: function() {
    var urls = youtube2spotify_util.get_youtube_urls();
    // a.title[href^="http://youtu.be"], a.title[href^="http://www.youtu.be"], 
    // a.title[href^="https://youtu.be"], a.title[href^="https://www.youtu.be"], 
    // a.title[href^="http://youtube.com"], 
    // a.title[href^="http://www.youtube.com"], 
    // a.title[href^="https://youtube.com"], 
    // a.title[href^="https://www.youtube.com"] 
    var selector = 'a.title[href^="' + urls.join('"], a.title[href^="') + '"]';
    var links = $(selector).filter(function() {
      return $(this).next('.spotify-track').length < 1;
    });
    return links;
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

  get_current_youtube_video_id: function() {
    var current_url = window.location.href;
    var youtube_urls = youtube2spotify_util.get_youtube_urls();
    for (var i=0; i<youtube_urls.length; i++) {
      if (current_url.indexOf(youtube_urls[i]) > -1) {
        return youtube2spotify_util.get_youtube_video_id(current_url);
      }
    }
    return false;
  },

  get_current_subreddit: function() {
    var current_url = window.location.href;
    var reddit_urls = youtube2spotify_util.get_reddit_urls();
    for (var i=0; i<reddit_urls.length; i++) {
      if (current_url.indexOf(reddit_urls[i]) > -1) {
        return youtube2spotify_util.get_subreddit(current_url);
      }
    }
    return false;
  },

  get_spotify_trackset_url: function(name, track_ids, spotify_choice) {
    var joined_ids = track_ids.join(',');
    if (spotify_choice === 'desktop_application') {
      return 'spotify:trackset:' + name + ':' + joined_ids;
    }
    return 'https://play.spotify.com/trackset/' + encodeURIComponent(name) + 
           '/' + joined_ids;
  },

  get_trackset_name_for_current_url: function() {
    var playlist_name = this.get_current_subreddit();
    if (!playlist_name) {
      playlist_name = 'Playlist from ' + window.location.hostname;
    }
    return playlist_name;
  },

  get_spotify_image: function(alt) {
    var icon_url = chrome.extension.getURL('spotify.png');
    return $('<img src="' + icon_url + '" alt="' + alt + 
             '" width="16" height="16">');
  },

  get_spotify_choice: function(callback) {
    chrome.storage.sync.get('youtube2spotify_options', function(opts) {
      opts = opts.youtube2spotify_options || {};
      var spotify_choice = opts.spotify || 'web_player';
      callback(spotify_choice);
    });
  },

  clean_youtube_title: function(title) {
    var colon_index = title.indexOf(':');
    if (colon_index > -1) {
      var before_colon = title.substring(0, colon_index)
      var after_colon = title.substring(colon_index + 1);
      if (before_colon.length < after_colon.length) {
        title = after_colon;
      } else {
        title = before_colon;
      }
    }
    title.replace("'s ", ' ');
    title = youtube2spotify_util.remove_str_groups(title, '(', ')');
    title = youtube2spotify_util.remove_str_groups(title, '[', ']');
    title = title.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    title = $.trim(title.replace(/\s+/, ' '));
    return title;
  },

  on_spotify_data_retrieved: function(data, s_choice, callback) {
    this.store_track_data(data, function() {
      callback(data);
    });
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
      var corrected_title = correct_words.join(' ');
      me.get_spotify_data(corrected_title, function(data) {
        if (data) {
          me.on_spotify_data_retrieved(data, s_choice, callback);
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
    var cleaned_title = this.clean_youtube_title(title);
    var me = this;
    this.get_spotify_data(cleaned_title, function(data) {
      if (data) {
        me.on_spotify_data_retrieved(data, s_choice, callback);
      } else {
        me.spotify_match_attempt3(cleaned_title, s_choice, callback);
      }
    });
  },

  spotify_match_attempt1: function(title, s_choice, callback) {
    var me = this;
    this.get_spotify_data(title, function(data) {
      if (data) {
        me.on_spotify_data_retrieved(data, s_choice, callback);
      } else {
        me.spotify_match_attempt2(title, s_choice, callback);
      }
    });
  },

  on_youtube_title_retrieved: function(title, s_choice, callback) {
    if (!title) {
      callback(false);
      return;
    }
    this.spotify_match_attempt1(title, s_choice, callback);
  },

  store_track_data: function(single_track_data, callback) {
    chrome.storage.local.get('youtube2spotify', function(data) {
      data = data.youtube2spotify || {};
      var tracks = data.tracks || {};
      tracks[single_track_data.id] = single_track_data;
      data.tracks = tracks;
      chrome.storage.local.set({'youtube2spotify': data}, function() {
        callback();
      });
    });
  },

  add_spotify_trackset_player: function(playlist_name, tracks, header) {
    var iframe = $('<iframe class="trackset-embed" src="" frameborder="0" ' + 
                   'allowtransparency="true" style="width: 250px; ' + 
                   'height: 80px; margin: 0;"></iframe>');
    var embed_url = youtube2spotify_util.get_spotify_embed_trackset_url(
      playlist_name, tracks
    );
    iframe.attr('src', embed_url);
    header.parent().children('.trackset-embed').remove();
    iframe.insertAfter(header);
  },

  add_spotify_trackset_link: function(playlist, tracks, s_choice, header) {
    var url = this.get_spotify_trackset_url(playlist, tracks, s_choice);
    var spotify_link = $('<a href="' + url + '" class="trackset-link"></a>');
    if (s_choice !== 'desktop_application') {
      spotify_link.attr('target', '_blank');
    }
    var title = 'Open playlist in Spotify';
    spotify_link.attr('title', title);
    var icon = this.get_spotify_image(title);
    spotify_link.append(icon);
    spotify_link.css('padding-left', '5px');
    header.children('.trackset-link').remove();
    header.append(spotify_link).show();
  },

  add_spotify_trackset_link_and_player: function(spotify_choice) {
    var tracks = [];
    $('a.spotify-track[data-track-id]').each(function() {
      tracks.push($(this).attr('data-track-id'));
    });
    if (tracks.length < 1) {
      return;
    }
    var playlist = this.get_trackset_name_for_current_url();
    var header = $('.side .titlebox h1.redditname');
    this.add_spotify_trackset_link(playlist, tracks, spotify_choice, header);
    this.add_spotify_trackset_player(playlist, tracks, header);
  },

  add_spotify_track_link: function(el, data, spotify_choice) {
    var spotify_link = $('<a href="" class="spotify-track"></a>');
    spotify_link.attr('data-track-id', data.id);
    if (spotify_choice === 'desktop_application') {
      spotify_link.attr('href', data.app_url);
    } else {
      spotify_link.attr('href', data.web_url);
      spotify_link.attr('target', '_blank');
    }
    spotify_link.css('vertical-align', 'middle');
    spotify_link.css('display', 'inline-block');
    var title = 'Open track in Spotify';
    spotify_link.attr('title', title);
    var icon = this.get_spotify_image(title);
    spotify_link.append(icon);
    spotify_link.insertAfter(el);
  },

  store_spotify_track_for_yt_video: function(vid, s_choice, callback) {
    var me = this;
    this.get_youtube_title(vid, function(title) {
      me.on_youtube_title_retrieved(title, s_choice, function(data) {
        callback(data);
      });
    });
  },

  add_spotify_link_for_element: function(el, vid, s_choice, callback) {
    var me = this;
    this.store_spotify_track_for_yt_video(vid, s_choice, function(data) {
      me.add_spotify_track_link(el, data, s_choice);
      callback();
    });
  },

  add_spotify_link_for_yt_link: function(yt_link, s_choice, callback) {
    var url = yt_link.attr('href');
    var video_id = youtube2spotify_util.get_youtube_video_id(url);
    if (!video_id) {
      callback();
      return;
    }
    this.add_spotify_link_for_element(yt_link, video_id, s_choice, callback);
  },

  add_spotify_links_on_reddit: function(spotify_choice, callback) {
    var youtube_links = this.get_youtube_links();
    var me = this;
    var num_youtube_links = youtube_links.length;
    if (num_youtube_links < 1) {
      callback();
      return;
    }
    var on_last_track_stored = function() {
      me.add_spotify_trackset_link_and_player(spotify_choice);
      callback();
    };
    var youtube_link_handler = function(i) {
      me.add_spotify_link_for_yt_link(
        $(this), spotify_choice,
        function() {
          if (i === num_youtube_links - 1) {
            on_last_track_stored();
          }
        }
      );
    };
    youtube_links.each(youtube_link_handler);
  },

  add_spotify_links_on_youtube: function(spotify_choice, callback) {
    var video_id = this.get_current_youtube_video_id();
    if (!video_id) {
      return;
    }
    var el = $('#eow-title');
    if (el.length < 1) {
      el = $('#player-api');
    }
    if (el.next('.spotify-track').length > 0) {
      return;
    }
    this.add_spotify_link_for_element(el, video_id, spotify_choice, callback);
  },

  add_spotify_links_from_page: function(callback) {
    var me = this;
    this.get_spotify_choice(function(spotify_choice) {
      if (me.get_current_youtube_video_id()) {
        me.add_spotify_links_on_youtube(spotify_choice, function() {
          callback(spotify_choice);
        });
      } else {
        me.add_spotify_links_on_reddit(spotify_choice, function() {
          callback(spotify_choice);
        });
      }
    });
  },

  string_starts_with: function(str, prefixes) {
    if (!str) {
      return false;
    }
    for (var i=0; i<prefixes.length; i++) {
      var prefix = prefixes[i];
      if (str.substring(0, prefix.length) === prefix) {
        return true;
      }
    }
    return false;
  },

  get_reddit_youtube_urls: function(content) {
    var youtube_url_prefixes = youtube2spotify_util.get_youtube_urls();
    var reddit_yt_urls = [];
    for (var i=0; i<content.length; i++) {
      var item = content[i];
      var data = item.data;
      if (item.kind === 't3' && data) {
        var post_url = data.url;
        if (this.string_starts_with(post_url, youtube_url_prefixes)) {
          reddit_yt_urls.push(post_url);
        }
      }
    }
    console.log(reddit_yt_urls);
    return reddit_yt_urls;
  },

  store_spotify_url_for_yt_url: function(url, s_choice, is_last, callback) {
    var video_id = youtube2spotify_util.get_youtube_video_id(url);
    if (!video_id) {
      if (is_last) {
        callback();
      }
      return;
    }
    console.log(url);
    this.get_youtube_title(video_id, function(title) {
      console.log(title);
      me.on_youtube_title_retrieved(false, title, s_choice, is_last, callback);
    });
  },

  get_reddit_api_data: function(subreddit_path, spotify_choice, callback) {
    var url = 'http://www.reddit.com' + subreddit_path + '/new.json';
    var me = this;
    $.getJSON(url, function(data) {
      if (!data) {
        callback([]);
        return;
      }
      callback(data.children);
    }).error(function() {
      callback([]);
    });
  },

  store_spotify_tracks_from_reddit_data: function(data, s_choice, callback) {
    var youtube_urls = me.get_reddit_youtube_urls(data);
    var num_youtube_links = youtube_urls.length;
    for (var i=0; i<youtube_urls.length; i++) {
      me.store_spotify_url_for_yt_url(
        youtube_urls[i], s_choice, i === num_youtube_links - 1,
        function() {
          callback(s_choice);
        }
      );
    }
  },

  add_spotify_links_from_reddit_api: function(subreddit_path, callback) {
    var me = this;
    this.get_spotify_choice(function(spotify_choice) {
      me.get_reddit_api_data(subreddit_path, spotify_choice, function(data) {
        me.store_spotify_tracks_from_reddit_data(data, spotify_choice, 
                                                 callback);
      });
    });
  }
};

youtube2spotify.add_spotify_links_from_page(function(spotify_choice) {
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.action === 'check_for_youtube_links') {
    youtube2spotify.add_spotify_links_from_page(function(spotify_choice) {
      sendResponse(spotify_choice);
    });
  } else if (request.action === 'query_reddit_api') {
    youtube2spotify.add_spotify_links_from_reddit_api(
      request.subreddit_path,
      function(s_choice) {
        sendResponse(s_choice);
      }
    );
  }
});