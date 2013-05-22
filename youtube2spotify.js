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
  get_youtube_urls: function() {
    var domains = ['youtu.be', 'youtube.com'];
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

  get_youtube_links: function() {
    var urls = this.get_youtube_urls();
    var selector = 'a[href^="' + urls.join('"], a[href^="') + '"]';
    return $(selector);
  },

  get_youtube_title: function(video_id, callback) {
    var url = 'http://gdata.youtube.com/feeds/api/videos/' + video_id + 
              '?v=2&alt=json';
    $.getJSON(url, function(data) {
      if (!data) {
        callback(false);
        return;
      }
      callback(data.entry.title.$t);
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

  on_spotify_url_retrieved: function(el, app_url, spotify_choice) {
    if (!app_url) {
      return;
    }
    var spotify_link = $('<a href=""></a>');
    if (spotify_choice === 'desktop_application') {
      spotify_link.attr('href', app_url);
    } else {
      var track_id = app_url.split('spotify:track:')[1];
      spotify_link.attr('href', 'https://play.spotify.com/track/' + track_id);
      spotify_link.attr('target', '_blank');
    }
    spotify_link.css('vertical-align', 'middle');
    spotify_link.css('display', 'inline-block');
    var title = 'Open track in Spotify';
    spotify_link.attr('title', title);
    var icon_url = chrome.extension.getURL('spotify.png');
    var icon = $('<img src="' + icon_url + '" alt="' + title + 
                 '" width="16" height="16">');
    spotify_link.append(icon);
    spotify_link.insertAfter(el);
  },

  on_youtube_title_retrieved: function(el, title, spotify_choice) {
    if (!title) {
      return;
    }
    var me = this;
    this.get_spotify_url(title, function(url) {
      me.on_spotify_url_retrieved(el, url, spotify_choice);
    });
  },

  add_spotify_link_for_element: function(el, video_id, spotify_choice) {
    var me = this;
    this.get_youtube_title(video_id, function(title) {
      me.on_youtube_title_retrieved(el, title, spotify_choice);
    });
  },

  add_spotify_link_for_yt_link: function(youtube_link, spotify_choice) {
    var url = youtube_link.attr('href');
    var video_id = this.get_youtube_video_id(url);
    if (!video_id) {
      return;
    }
    this.add_spotify_link_for_element(youtube_link, video_id, spotify_choice);
  },

  add_spotify_links_for_youtube_links: function(spotify_choice) {
    var links = this.get_youtube_links();
    var me = this;
    links.each(function() {
      me.add_spotify_link_for_yt_link($(this), spotify_choice);
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