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

function save_options() {
  var spotify = $('input[name="spotify"]:checked').val();
  var lookup_behavior = $('input[name="lookup_behavior"]:checked').val();
  var status_area = $('#status-message');
  var options = {spotify: spotify, lookup_behavior: lookup_behavior};
  chrome.storage.sync.set({'youtube2spotify_options': options}, function() {
    status_area.text('Okay, got it!').fadeIn(function() {
      setTimeout(function() {
        status_area.fadeOut();
      }, 2000);
    });
  });
}

function restore_options() {
  chrome.storage.sync.get('youtube2spotify_options', function(opts) {
    opts = opts.youtube2spotify_options || {};
    if (opts.spotify) {
      var selector = 'input[name="spotify"][value="' + opts.spotify + '"]';
      $(selector).attr('checked', 'checked');
    } else {
      $('#web_player').attr('checked', 'checked');
    }
    if (opts.lookup_behavior) {
      var selector = 'input[name="lookup_behavior"][value="' + 
                     opts.lookup_behavior + '"]';
      $(selector).attr('checked', 'checked');
    } else {
      $('#immediate_lookup').attr('checked', 'checked');
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);

$('input[name="spotify"]').on('change', save_options);
$('input[name="lookup_behavior"]').on('change', save_options);
