# Google Chat Bot with LLM Integration

This Google Chat bot integrates Large Language Models (LLMs) using Groq, an online hosted model service, to interact with users. The bot is capable of answering technical questions and can be added to Google Workspaces, allowing multiple users to engage with it. Users can set, view, or list available models and clear their chat context.

## Features
- **LLM-powered responses:** Uses models hosted on Groq to answer user queries.
- **Command system:** Users can execute various commands such as clearing context or setting a preferred model.
- **Context maintenance:** Stores conversation context per user for more meaningful interactions.
- **Multi-user support:** Can be added to Google Workspaces, where multiple users can chat with the bot simultaneously.

## Commands

The bot supports the following commands:

- **`#list`**: Lists available models from the Groq API.
- **`#set [model_name]`**: Sets the specified model for the user.
- **`#view`**: Displays the current model associated with the user.
- **`#clear`**: Clears the chat context for the user.

## Example Interaction

```plaintext
User 1: What is quantum computing?
Bot: Quantum computing is a type of computation that leverages quantum mechanics...

User 1: #list
Bot: *Model Information:* Model ID: gemma-7b-it ...

User 2: #set gemma-13b
Bot: Model: *gemma-13b* set against user *User 2*

## Context Management

The bot maintains a rolling history of user conversations (up to 10 messages per user) to provide context-aware responses. This is handled by the `FixedSizeListHash` class, which stores user prompts and responses in Google Apps Script's cache. Each user's context is updated with new messages and old ones are removed once the limit is reached, ensuring relevant context for ongoing conversations.

