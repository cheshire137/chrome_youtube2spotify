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

  get_domain_urls: function(domains) {
    var urls = [];
    for (var i=0; i<domains.length; i++) {
      var domain = domains[i];
      urls.push('http://' + domain);
      urls.push('http://www.' + domain);
      urls.push('https://' + domain);
      urls.push('https://www.' + domain);
    }
    return urls;
  },

  get_youtube_urls: function() {
    return this.get_domain_urls(['youtu.be', 'youtube.com']);
  },

  get_reddit_urls: function() {
    return this.get_domain_urls(['redd.it', 'reddit.com']);
  },

  get_youtube_links: function() {
    var urls = this.get_youtube_urls();
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

  get_youtube_video_id: function(url) {
    if (url.indexOf('youtu.be') > -1) {
      return url.split('youtu.be/')[1];
    }
    if (url.indexOf('v=') > -1) {
      var video_id_etc = url.split('v=')[1];
      var index = video_id_etc.indexOf('&');
      if (index > -1) {
        return video_id_etc.substring(0, index);
      }
      return video_id_etc;
    }
    return url.split('.com/v/')[1];
  },

  get_subreddit: function(url) {
    // e.g., http://www.reddit.com/r/electronicmusic => electronicmusic
    var subreddit_etc = url.split('/r/')[1];
    if (subreddit_etc) {
      return subreddit_etc.split('/')[0];
    }
    return subreddit_etc;
  },

  get_spotify_track_search_url: function(query) {
    return 'http://ws.spotify.com/search/1/track.json?q=' + 
            encodeURIComponent(query);
  },

  get_spotify_data: function(title, callback) {
    var query_url = this.get_spotify_track_search_url(title);
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
            web_url: me.get_spotify_artist_web_url(artist.href)
          });
        }
        var track_data = {app_url: track.href, name: track_name, 
                          artists: artists,
                          id: me.get_spotify_track_id(track.href),
                          web_url: me.get_spotify_track_web_url(track.href)};
        callback(track_data);
      } else {
        callback(false);
      }
    });
  },

  get_current_youtube_video_id: function() {
    var current_url = window.location.href;
    var youtube_urls = this.get_youtube_urls();
    for (var i=0; i<youtube_urls.length; i++) {
      if (current_url.indexOf(youtube_urls[i]) > -1) {
        return this.get_youtube_video_id(current_url);
      }
    }
    return false;
  },

  get_current_subreddit: function() {
    var current_url = window.location.href;
    var reddit_urls = this.get_reddit_urls();
    for (var i=0; i<reddit_urls.length; i++) {
      if (current_url.indexOf(reddit_urls[i]) > -1) {
        return this.get_subreddit(current_url);
      }
    }
    return false;
  },

  get_spotify_artist_web_url: function(app_url) {
    var artist_id = app_url.split('spotify:artist:')[1];
    return 'https://play.spotify.com/artist/' + artist_id;
  },

  get_spotify_track_web_url: function(app_url) {
    return 'https://play.spotify.com/track/' + 
           this.get_spotify_track_id(app_url);
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

  get_spotify_track_id: function(app_url) {
    return app_url.split('spotify:track:')[1];
  },

  on_spotify_data_retrieved: function(el, data, s_choice, is_last, callback) {
    if (data) {
      this.add_spotify_track_link(el, data, s_choice);
      this.store_track_data(data, function() {
        if (is_last) {
          callback();
        }
      });
    } else if (is_last) {
      callback();
    }
  },

  on_youtube_title_retrieved: function(el, title, s_choice, is_last, callback) {
    if (!title) {
      if (is_last) {
        callback();
      }
      return;
    }
    var me = this;
    this.get_spotify_data(title, function(data) {
      me.on_spotify_data_retrieved(el, data, s_choice, is_last, callback);
    });
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

  add_spotify_trackset_link: function(spotify_choice) {
    var tracks = [];
    $('a.spotify-track[data-track-id]').each(function() {
      tracks.push($(this).attr('data-track-id'));
    });
    if (tracks.length < 1) {
      return;
    }
    var header = $('.side .titlebox h1.redditname');
    var playlist_name = this.get_trackset_name_for_current_url();
    var url = this.get_spotify_trackset_url(playlist_name, tracks, 
                                            spotify_choice);
    var spotify_link = $('<a href="' + url + '" class="trackset-link"></a>');
    if (spotify_choice !== 'desktop_application') {
      spotify_link.attr('target', '_blank');
    }
    var title = 'Open playlist in Spotify';
    spotify_link.attr('title', title);
    var icon = this.get_spotify_image(title);
    spotify_link.append(icon);
    spotify_link.css('padding-left', '5px');
    header.children('.trackset-link').remove();
    header.append(spotify_link);
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

  on_spotify_tracks_identified: function(spotify_choice, callback) {
    this.add_spotify_trackset_link(spotify_choice);
  },

  on_spotify_links_updated: function(spotify_choice) {
    chrome.extension.sendRequest({
      action: 'spotify_links_updated',
      spotify_choice: spotify_choice
    });
  },

  add_spotify_link_for_element: function(el, vid, s_choice, is_last, callback) {
    var me = this;
    this.get_youtube_title(vid, function(title) {
      me.on_youtube_title_retrieved(el, title, s_choice, is_last, callback);
    });
  },

  add_spotify_link_for_yt_link: function(yt_link, s_choice, is_last, callback) {
    var url = yt_link.attr('href');
    var video_id = this.get_youtube_video_id(url);
    if (!video_id) {
      if (is_last) {
        callback();
      }
      return;
    }
    this.add_spotify_link_for_element(yt_link, video_id, s_choice, is_last, 
                                      callback);
  },

  add_spotify_links_for_youtube_links: function(spotify_choice, callback) {
    if (this.get_current_youtube_video_id()) {
      // Don't go littering YouTube with Spotify icons if we're currently on a
      // YouTube video.
      return;
    }
    var youtube_links = this.get_youtube_links();
    var me = this;
    var num_youtube_links = youtube_links.length;
    youtube_links.each(function(i) {
      me.add_spotify_link_for_yt_link(
        $(this), spotify_choice, i === num_youtube_links - 1,
        function() {
          me.on_spotify_tracks_identified(spotify_choice, callback);
        }
      );
    });
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
    this.add_spotify_link_for_element(el, video_id, spotify_choice, true, 
                                      callback);
  },

  add_spotify_links: function(callback) {
    var me = this;
    chrome.storage.sync.get('youtube2spotify_options', function(opts) {
      opts = opts.youtube2spotify_options || {};
      var spotify_choice = opts.spotify || 'web_player';
      if (me.get_current_youtube_video_id()) {
        me.add_spotify_links_on_youtube(spotify_choice, function() {
          callback(spotify_choice);
        });
      } else {
        me.add_spotify_links_for_youtube_links(spotify_choice, function() {
          callback(spotify_choice);
        });
      }
    });
  }
};

youtube2spotify.add_spotify_links(function(spotify_choice) {
  youtube2spotify.on_spotify_links_updated(spotify_choice);
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.action === 'check_for_youtube_links') {
    youtube2spotify.add_spotify_links(function(spotify_choice) {
      youtube2spotify.on_spotify_links_updated(spotify_choice);
    });
  }
});