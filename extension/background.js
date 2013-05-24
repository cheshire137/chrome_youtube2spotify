var utility_dict = new Typo();
var aff_data = utility_dict._readFile(chrome.extension.getURL('en_US.aff'));
var word_data = utility_dict._readFile(chrome.extension.getURL('en_US.dic'));
var dictionary = new Typo('en_US', aff_data, word_data);

function is_numeric(str) {
  return !isNaN(str);
}

function spellcheck(word) {
  if (is_numeric(word) || dictionary.check(word)) { // spelled correctly
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'spellcheck') {
    sendResponse({suggestion: spellcheck(request.word), 
                  index: request.index + 1});
  }
});
