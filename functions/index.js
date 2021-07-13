const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//


const path = require('path');
const env = require('dotenv');

const ENV_FILE = path.join(__dirname, '..', '.env');
env.config({ path: ENV_FILE });

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');
const { UserState, ConversationState, MemoryStorage } = require('botbuilder');
const { TwilioWhatsAppAdapter } = require('@botbuildercommunity/adapter-twilio-whatsapp');

// This bot's main dialog.
const { MainBot } = require('./bots/main');
const { TwilioBot } = require('./bots/twilio');

const express = require('express');
const cors = require('cors');
console.log(`\n ########################$$$$$$$$$$$$$$$$$$$$$$$$`);
const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Add middleware to authenticate requests
//app.use(myMiddleware);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

const whatsAppAdapter = new TwilioWhatsAppAdapter({
    accountSid: process.env.TwilioAccountSid,
    authToken: process.env.TwilioAuthToken,
    phoneNumber: process.env.TwilioPhoneNumber,
    endpointUrl: process.env.TwilioEndpointURL
});

// Catch-all for errors.
adapter.onTurnError = async(context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

console.log(`\n ########################$$$$$$$$$$$$$$$$$$$$$$$$`);
console.log('index >>>>>> 2');
console.log(`\n ########################$$$$$$$$$$$$$$$$$$$$$$$$`);


// Define state store for your bot.
// See https://aka.ms/about-bot-state to learn more about bot state.
const memoryStorage = new MemoryStorage();

// Create conversation and user state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
//const mainBot = new MainBot();
const twilioBot = new TwilioBot(conversationState, userState);

// build multiple CRUD interfaces:
app.post('/api/whatsapp/messages', async(req, res) => {

    await whatsAppAdapter.processActivity(req, res, async(context) => {
        await twilioBot.run(context);
    });
});

// Expose Express API as a single Cloud Function:
exports.iabella = functions.https.onRequest(app);