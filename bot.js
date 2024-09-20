function onMessage(event) {
  let prompt = event?.message?.text || 'Hi! Introduce your self';
  let userName = event?.user?.name || DEFAULT_USER_NAME;
  let match = parseCommand(prompt)
  if(match){
    const command = match[0];
    let returnValue = exe(command, event);
    log(returnValue);
    if (returnValue)
      return { "text": returnValue };
  }

  let promptWithContext = addContext(prompt, userName);
  let model = userProperties.getProperty(userName) || DEFUALT_MODEL;
  let response = askGPT(promptWithContext, model);

  maintainContext(userName, prompt);
  maintainContext(userName, response);

  return { "text": response };
}

function onClearContext(event){
    let userName = event?.user?.name || DEFAULT_USER_NAME;
    contextHash.clearCacheKey(userName);
    return `Context againsts ${event?.user?.displayName} removed`;
}

function onListModels(event){
  try{
    let options = {
      "method": "get",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      },
    };
    let api_response = UrlFetchApp.fetch(GROQ_MODEL_LISTING_API_URL, options);
    let response = findKey(
      JSON.parse(api_response.getContentText()), 
      'data'
    );  
    let updatedResponse = response.map(model => `*Model Information:*\n\n*Model ID:* \`${model?.id}\`\n*Owned By:* _${model?.owned_by}_\n\n*----------------------*`);
    return updatedResponse.join("\n");
  }
  catch(err){
    return USER_EXCEPTION_MESSAGE
  } 
}

function onViewModel(event){
  let userName = event?.user?.name || DEFAULT_USER_NAME;
  let modelName = userProperties.getProperty(userName) || DEFUALT_MODEL;
  let displayName = event?.user?.displayName || DEFAULT_USER_NAME;
  return `All requests made by ${displayName} are directed to the *${modelName}* model, which is currently set for your account.`
}

function onSetModel(event){
  let modelName = event?.message?.text.split(" ")[1] || DEFUALT_MODEL;
  let userName = event?.user?.name || DEFAULT_USER_NAME;
  let displayName = event?.user?.displayName || DEFAULT_USER_NAME;
  userProperties.setProperty(userName, modelName);
  return `Model: *${modelName}* set against user *${displayName}*`
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

function askGPT(prompt, model){
  try{
    let payload = {
      'model': model,
      'messages' : [{"role": "user", "content": prompt}]
    };
    let options = {
      "method": "post",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      },
      "payload": JSON.stringify(payload)
    };
    let api_response = UrlFetchApp.fetch(GROQ_CHAT_COMPLETION_API_URL, options);
    let response = findKey(
      JSON.parse(api_response.getContentText()), 
      'content'
    );  
    return response
  }
  catch(err){
    return USER_EXCEPTION_MESSAGE
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
const GROQ_API_KEY = "replace_with_actual_key";
const GROQ_CHAT_COMPLETION_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL_LISTING_API_URL = "https://api.groq.com/openai/v1/models";

const MAX_CONTEXT_LENGTH = 10;
const USER_EXCEPTION_MESSAGE = "Oops, it looks like something went wrong! If the issue persists, please feel free to report it to *talhatahir@folio3.com*";
const DEFUALT_MODEL = "gemma-7b-it"; // A model by Google
const DEFAULT_USER_NAME = "default";

var contextHash = new FixedSizeListHash(MAX_CONTEXT_LENGTH);
// persistant storage to store model against each user
var userProperties = PropertiesService.getUserProperties();

var commandsHash = {
  "#clear": onClearContext,
  "#list": onListModels,
  "#set": onSetModel,
  "#view": onViewModel
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

