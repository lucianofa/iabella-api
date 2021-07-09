// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const env = require('dotenv');

const ENV_FILE = path.join(__dirname, '..', '.env');
env.config({ path: ENV_FILE });

const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');
const { TwilioWhatsAppAdapter } = require('@botbuildercommunity/adapter-twilio-whatsapp');

// This bot's main dialog.
const { MainBot } = require('./bots/main');
const { TwilioBot } = require('./bots/twilio');

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
});

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
adapter.onTurnError = async (context, error) => {
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

// Create the main dialog.
const mainBot = new MainBot();
const twilioBot = new TwilioBot();

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        await mainBot.run(context);
    });
});

// WhatsApp endpoint for Twilio
server.post('/api/whatsapp/messages', async (req, res) => {
    await whatsAppAdapter.processActivity(req, res, async (context) => {
        await twilioBot.run(context);
    });
});
