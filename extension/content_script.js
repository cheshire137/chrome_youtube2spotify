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
  get_youtube_links_on_page: function() {
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
        return youtube2spotify_util.get_subreddit_from_url(current_url);
      }
    }
    return false;
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
    var url = youtube2spotify_util.get_spotify_trackset_url(playlist, tracks, 
                                                            s_choice);
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
    var title = youtube2spotify_util.get_spotify_track_link_title(data);
    spotify_link.attr('title', title);
    var icon = this.get_spotify_image('Open track in Spotify');
    spotify_link.append(icon);
    spotify_link.insertAfter(el);
  },

  add_spotify_link_for_element: function(el, vid, s_choice, callback) {
    var me = this;
    youtube2spotify_data.store_spotify_track_for_yt_video(
      vid, s_choice, 
      function(data) {
        if (data) {
          me.add_spotify_track_link(el, data, s_choice);
        }
        callback();
      }
    );
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
    var youtube_links = this.get_youtube_links_on_page();
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
    youtube2spotify_data.get_spotify_choice(function(spotify_choice) {
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
  }
};

youtube2spotify.add_spotify_links_from_page(function(spotify_choice) {});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.action === 'check_for_youtube_links') {
    youtube2spotify.add_spotify_links_from_page(function(spotify_choice) {
      sendResponse(spotify_choice);
    });
  }
});