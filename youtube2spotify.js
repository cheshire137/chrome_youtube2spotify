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
    return $(selector);
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
    return url.split('/r/')[1].split(')')[0];
  },

  get_spotify_url: function(title, callback) {
    var query_url = 'http://ws.spotify.com/search/1/track.json?q=' + 
                    encodeURIComponent(title);
    $.getJSON(query_url, function(data) {
      if (data && data.info.num_results > 0) {
        var track = data.tracks[0];
        callback(track.href);
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

  get_spotify_playlist_url: function(name, track_ids) {
    return 'spotify:trackset:' + name + ':' + track_ids.join(',');
  },

  get_playlist_name_for_current_url: function() {
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

  on_spotify_url_retrieved: function(el, app_url, spotify_choice, is_last, tracks, callback) {
    if (!app_url) {
      if (is_last) {
        callback(tracks);
      }
      return;
    }
    var track_id = app_url.split('spotify:track:')[1];
    tracks.push(track_id);
    var spotify_link = $('<a href=""></a>');
    if (spotify_choice === 'desktop_application') {
      spotify_link.attr('href', app_url);
    } else {
      spotify_link.attr('href', 'https://play.spotify.com/track/' + track_id);
      spotify_link.attr('target', '_blank');
    }
    spotify_link.css('vertical-align', 'middle');
    spotify_link.css('display', 'inline-block');
    var title = 'Open track in Spotify';
    spotify_link.attr('title', title);
    var icon = this.get_spotify_image(title);
    spotify_link.append(icon);
    spotify_link.insertAfter(el);
    if (is_last) {
      callback(tracks);
    }
  },

  on_youtube_title_retrieved: function(el, title, s_choice, is_last, tracks, callback) {
    if (!title) {
      if (is_last) {
        callback(tracks);
      }
      return;
    }
    var me = this;
    this.get_spotify_url(title, function(url) {
      me.on_spotify_url_retrieved(el, url, s_choice, is_last, tracks, callback);
    });
  },

  on_spotify_tracklist_retrieved: function(tracks) {
    console.log(tracks);
    var header = $('.side .titlebox h1.redditname');
    var playlist_name = this.get_playlist_name_for_current_url();
    var url = this.get_spotify_playlist_url(playlist_name, tracks);
    var spotify_link = $('<a href="' + url + '"></a>');
    var title = 'Open playlist in Spotify';
    spotify_link.attr('title', title);
    var icon = this.get_spotify_image(title);
    spotify_link.append(icon);
    spotify_link.css('padding-left', '5px');
    header.append(spotify_link);
  },

  add_spotify_link_for_element: function(el, vid, s_choice, is_last, tracks, callback) {
    var me = this;
    this.get_youtube_title(vid, function(title) {
      me.on_youtube_title_retrieved(el, title, s_choice, is_last, tracks, 
                                    callback);
    });
  },

  add_spotify_link_for_yt_link: function(yt_link, s_choice, is_last, tracks, callback) {
    var url = yt_link.attr('href');
    var video_id = this.get_youtube_video_id(url);
    if (!video_id) {
      if (is_last) {
        callback(tracks);
      }
      return;
    }
    this.add_spotify_link_for_element(yt_link, video_id, s_choice, is_last, 
                                      tracks, callback);
  },

  add_spotify_links_for_youtube_links: function(spotify_choice) {
    if (this.get_current_youtube_video_id()) {
      // Don't go littering YouTube with Spotify icons if we're currently on a
      // YouTube video.
      return;
    }
    var youtube_links = this.get_youtube_links();
    var me = this;
    var num_youtube_links = youtube_links.length;
    var tracks_in_prog = [];
    youtube_links.each(function(i) {
      me.add_spotify_link_for_yt_link(
        $(this), spotify_choice, i === num_youtube_links - 1, tracks_in_prog,
        function(tracks) {
          me.on_spotify_tracklist_retrieved(tracks);
        }
      );
    });
  },

  add_spotify_links_on_youtube: function(spotify_choice) {
    var video_id = this.get_current_youtube_video_id();
    if (!video_id) {
      return;
    }
    var el = $('#eow-title');
    if (el.length < 1) {
      el = $('#player-api');
    }
    this.add_spotify_link_for_element(el, video_id, spotify_choice);
  },

  add_spotify_links: function() {
    var me = this;
    chrome.storage.sync.get('youtube2spotify_options', function(opts) {
      opts = opts.youtube2spotify_options || {};
      var spotify_choice = opts.spotify || 'web_player';
      me.add_spotify_links_for_youtube_links(spotify_choice);
      me.add_spotify_links_on_youtube(spotify_choice);
    });
  }
};

youtube2spotify.add_spotify_links();