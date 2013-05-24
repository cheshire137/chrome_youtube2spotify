var utility_dict = new Typo();
var aff_data = utility_dict._readFile(chrome.extension.getURL('en_US.aff'));
var word_data = utility_dict._readFile(chrome.extension.getURL('en_US.dic'));
var dictionary = new Typo('en_US', aff_data, word_data);

function spellcheck(word) {
  if (dictionary.check(word)) { // spelled correctly
    return word;
  }
  // misspelled word
  return '';
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'spellcheck') {
    sendResponse({suggestion: spellcheck(request.word), 
                  index: request.index + 1});
  }
});
