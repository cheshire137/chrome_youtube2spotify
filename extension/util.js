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

  get_subreddit_from_url: function(url) {
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

  get_spotify_trackset_url: function(name, track_ids, spotify_choice) {
    var joined_ids = track_ids.join(',');
    if (spotify_choice === 'desktop_application') {
      return 'spotify:trackset:' + name + ':' + joined_ids;
    }
    return 'https://play.spotify.com/trackset/' + encodeURIComponent(name) + 
           '/' + joined_ids;
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
    var youtube_url_prefixes = this.get_youtube_urls();
    var reddit_yt_urls = [];
    if (!content) {
      return reddit_yt_urls;
    }
    for (var i=0; i<content.length; i++) {
      var item = content[i];
      var data = item.data;
      if (item.kind === 't3' && data) {
        var post_url = data.url;
        if (this.string_starts_with(post_url, youtube_url_prefixes)) {
          reddit_yt_urls.push(post_url.replace('&amp;', '&'));
        }
      }
    }
    return reddit_yt_urls;
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
    title = this.remove_str_groups(title, '(', ')');
    title = this.remove_str_groups(title, '[', ']');
    title = title.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    title = $.trim(title.replace(/\s+/, ' '));
    return title;
  }
};