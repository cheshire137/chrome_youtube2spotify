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
  youtube_domains: ['youtu.be', 'youtube.com'],
  reddit_domains: ['redd.it', 'reddit.com'],

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
    return this.get_domain_urls(this.youtube_domains);
  },

  get_reddit_urls: function() {
    return this.get_domain_urls(this.reddit_domains);
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

  get_spotify_track_link_title: function(data) {
    var title = data.name;
    var artist_names = [];
    for (var i=0; i<data.artists.length; i++) {
      artist_names.push(data.artists[i].name);
    }
    title += ' by ' + artist_names.join(', ');
    title = title.replace(/"/g, "'");
    return title;
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

  strip_punctuation: function(str) {
    str = str.replace(/[\[\]\.,-\/#!$%"\^&\*;:{}=\-_`~()']/g, ' ');
    return $.trim(str.replace(/\s+/g, ' '));
  }
};
