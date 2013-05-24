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

var youtube2spotify_util = {
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

  get_spotify_track_id: function(app_url) {
    return app_url.split('spotify:track:')[1];
  },

  get_spotify_track_web_url: function(app_url) {
    return 'https://play.spotify.com/track/' + 
           this.get_spotify_track_id(app_url);
  },

  get_spotify_artist_web_url: function(app_url) {
    if (!app_url) {
      return app_url;
    }
    var artist_id = app_url.split('spotify:artist:')[1];
    return 'https://play.spotify.com/artist/' + artist_id;
  },

  get_spotify_embed_trackset_url: function(playlist_name, track_ids) {
    var joined_ids = track_ids.join(',');
    return 'https://embed.spotify.com/?uri=spotify:trackset:' + name + ':' + 
           joined_ids;
  },

  remove_str_groups: function(str, open_str, close_str) {
    var open_paren_index = str.indexOf(open_str);
    while (open_paren_index > -1) {
      var closed_paren_index = str.indexOf(close_str, open_paren_index);
      if (closed_paren_index > -1) {
        str = str.substring(0, open_paren_index) + ' ' + 
              str.substring(closed_paren_index + 1);
        open_paren_index = str.indexOf(open_str);
      }
    }
    return str;
  }
};
