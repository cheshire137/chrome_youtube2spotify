var youtube2spotify_spellchecker = {
  dictionary: false,

  get_aff_data: function(utility_dict) {
    return utility_dict._readFile(chrome.extension.getURL('en_US.aff'));
  },

  get_word_data: function(utility_dict) {
    return utility_dict._readFile(chrome.extension.getURL('en_US.dic'));
  },

  initialize_dictionary: function() {
    var utility_dict = new Typo();
    var aff_data = this.get_aff_data(utility_dict);
    var word_data = this.get_word_data(utility_dict);
    this.dictionary = new Typo('en_US', aff_data, word_data);
  },

  get_dictionary: function() {
    if (!this.dictionary) {
      this.initialize_dictionary();
    }
    return this.dictionary;
  },

  is_numeric: function(str) {
    return !isNaN(str);
  },

  spellcheck: function(word) {
    var dictionary = this.get_dictionary();
    if (this.is_numeric(word) || dictionary.check(word)) { // spelled correctly
      return word;
    }
    var suggestions = dictionary.suggest(word);
    if (suggestions.length < 1) {
      // Assume if the dictionary has no idea what this word is, then it's 
      // probably some band name.
      return word;
    }
    // misspelled word
    return suggestions[0];
  }
};
