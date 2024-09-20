function onMessage(event) {
    let prompt = event?.message?.text || 'Hi GPT!';
    let userName = event?.user?.name || 'default';
  
    let match = parseCommand(prompt)
    if(match){
      const command = match[0];
      let returnValue = exe(command, userName);
      if (returnValue)
        return { "text": `Context againsts ${event?.user?.displayName} removed` };
    }
  
    let promptWithContext = addContext(prompt, userName);
    let response = askGPT(promptWithContext);
  
    maintainContext(userName, prompt);
    maintainContext(userName, response);
  
    return { "text": response };
  }
  
  /**
   * Helper function(s)
   */
  function addContext(prompt, userName){
    let previousResponses = contextHash.getList(userName) || [];
    let finalPrompt = '';
    previousResponses.forEach(message => {
      finalPrompt += message + '\n';
    })
    finalPrompt += prompt;
    log(`Final Prompt (${userName}):\n${finalPrompt}`)
    return finalPrompt
  }
  
  function maintainContext(userName, message) {
    contextHash.insert(userName, message);
    log(`Updated context (${userName}):\n${contextHash.getList(userName)}`)
  }
  
  function log(message){
     console.log(`[${new Date().toJSON()}] ${message}`);
  }
  
  function findKey(nestedStructure, keyToFind) {
      // Check if the current element is an object
      if (typeof nestedStructure === 'object' && !Array.isArray(nestedStructure)) {
          // If the object has the specified key, return the value
          if (keyToFind in nestedStructure) {
              return nestedStructure[keyToFind];
          }
          // Otherwise, recursively search each value in the object
          else {
              for (const key in nestedStructure) {
                  if (nestedStructure.hasOwnProperty(key)) {
                      const result = findKey(nestedStructure[key], keyToFind);
                      if (result !== undefined && result !== null) {
                          return result;
                      }
                  }
              }
          }
      }
      // Check if the current element is an array
      else if (Array.isArray(nestedStructure)) {
          // Recursively search each item in the array
          for (let i = 0; i < nestedStructure.length; i++) {
              const result = findKey(nestedStructure[i], keyToFind);
              if (result !== undefined && result !== null) {
                  return result;
              }
          }
      }
      // If the key is not found, return undefined implicitly
  }
  
  function askGPT(prompt){
    try{
      let payload = {
        'model': 'gpt-3.5-turbo-0613',
        'messages' : [{"role": "user", "content": prompt}]
      };
      let options = {
        "method": "post",
        "headers": {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + OPENAI_API_KEY
        },
        "payload": JSON.stringify(payload)
      };
      let api_response = UrlFetchApp.fetch(OPENAI_API_URL, options);
      let response = findKey(
        JSON.parse(api_response.getContentText()), 
        'content'
      );  
      return response
    }
    catch(err){
      return "Something went wrong ;("
    } 
  }
  
  function exe(command, ...args){
      if (command in commandsHash){
          return commandsHash[command](...args);
      }
  }
  
  function parseCommand(text){
    const match = text.match(/#(\w+)/);
    return match;
  }
  
  class FixedSizeListHash {
    constructor(size) {
      this.size = size;
      this.cache = CacheService.getScriptCache();
      this.CACHE_EXPIRATION_TIME = 21600 // Cache expiration time in seconds (6 hours)
    }
  
    insert(key, element) {
      let list = this.getList(key)
      if (list.length >= this.size) {
        list.shift(); // Remove the first (oldest) element
      }
      list.push(element); // Add the new element at the end
  
      // Update the cache with the new list
      this.cache.put(key, JSON.stringify(list), this.CACHE_EXPIRATION_TIME);
    }
  
    getList(key) {
      // Optionally, refresh the list from cache to ensure it's up-to-date
      const cachedList = this.cache.get(key);
      let list = cachedList ? JSON.parse(cachedList) : [];
      return list;
    }
    clearCacheKey(key) {
      if(!this.cache)
        this.cache = CacheService.getScriptCache();
      this.cache.remove(key);
      log(`Context againsts ${key} removed`);
      return true;
    }
  }
  
  /**
   * Constants
   */
  const OPENAI_API_KEY = 'replace_with_actual_key';
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  const MAX_CONTEXT_LENGTH = 10;
  
  var contextHash = new FixedSizeListHash(MAX_CONTEXT_LENGTH);
  
  var commandsHash = {
    '#clear': contextHash.clearCacheKey
  }
  
  /**
   * Barely touched Events
   */
  function onAddToSpace(event) {
    var message = "";
  
    if (event.space.singleUserBotDm) {
      message = "Thank you for adding me to a DM, " + event.user.displayName + "!";
    } else {
      message = "Thank you for adding me to " +
          (event.space.displayName ? event.space.displayName : "this chat");
    }
  
    if (event.message) {
      // Bot added through @mention.
      message = message + " and you said: \"" + event.message.text + "\"";
    }
  
    return { "text": message };
  }
  function onRemoveFromSpace(event) {
    console.info("Bot removed from ",
        (event.space.name ? event.space.name : "this chat"));
  }
  
  