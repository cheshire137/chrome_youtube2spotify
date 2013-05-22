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
  get_youtube_links: function() {
    var domains = ['youtu.be', 'youtube.com'];
    var urls = [];
    for (var i=0; i<domains.length; i++) {
      var domain = domains[i];
      urls.push('http://' + domain);
      urls.push('http://www.' + domain);
      urls.push('https://' + domain);
      urls.push('https://www.' + domain);
    }
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

  on_spotify_url_retrieved: function(youtube_link, app_url) {
    if (app_url) {
      var track_id = app_url.split('spotify:track:')[1];
      var web_url = 'https://play.spotify.com/track/' + track_id;
      var spotify_link = $('<a href="' + web_url + '" target="_blank"></a>');
      spotify_link.css('vertical-align', 'middle');
      spotify_link.css('display', 'inline-block');
      spotify_link.attr('title', 'Open track in Spotify');
      var icon_url = chrome.extension.getURL('spotify.png');
      var icon = $('<img src="' + icon_url + '" alt="Spotify" width="16" ' + 
                   'height="16">');
      spotify_link.append(icon);
      spotify_link.insertAfter(youtube_link);
    }
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

  on_youtube_title_retrieved: function(youtube_link, title) {
    console.log(title);
    if (title) {
      var me = this;
      this.get_spotify_url(title, function(url) {
        me.on_spotify_url_retrieved(youtube_link, url);
      });
    }
  },

  add_spotify_link: function(youtube_link) {
    var url = youtube_link.attr('href');
    var video_id = this.get_youtube_video_id(url);
    var me = this;
    this.get_youtube_title(video_id, function(title) {
      me.on_youtube_title_retrieved(youtube_link, title);
    });
  },

  add_spotify_links: function() {
    var me = this;
    var links = this.get_youtube_links();
    links.each(function() {
      me.add_spotify_link($(this));
    });
  }
};

youtube2spotify.add_spotify_links();