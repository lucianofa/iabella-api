const { ActivityTypes } = require('botbuilder');
const { ActivityHandler, UserState, ConversationState, MemoryStorage } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { IabellaRecognizer } = require('../recognizer/iabellaRecognizer');
const { db } = require('./../firebase');

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
// The accessor names for the conversation flow and user profile state property accessors.
const CONVERSATION_FLOW_PROPERTY = 'CONVERSATION_FLOW_PROPERTY';
const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';

let luisRecognizer;

// Identifies the last question asked.
const question = {
    name: 'name',
    age: 'age',
    date: 'date',
    none: 'none'
};
let conversationFlow;
let userProfile;

let conversationState;
let userState;
class TwilioBot extends ActivityHandler {

    constructor(conversationState, userState) {
        super();

        const config = {
            applicationId: process.env.luisAppId,
            endpointKey: process.env.luisendpointKey,
            endpoint: process.env.luiasEndpoint
        };

        this.luisRecognizer = new IabellaRecognizer(config);
        console.debug(conversationState);

        this.conversationState = conversationState;
        this.userState = userState;

        // Create the state property accessors for the conversation data and user profile.
        this.conversationDataAccessor = conversationState.createProperty(this.CONVERSATION_DATA_PROPERTY);
        this.userProfileAccessor = userState.createProperty(this.USER_PROFILE_PROPERTY);


        // if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');

        const usersDB = db.collection('users');

        this.onMembersAdded(async(context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity('Bem vindo (a) sou a Iabella, assistente digital da Yobellle!');
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async(context, next) => {
            const name = context.activity.channelData.ProfileName;
            const any = context.activity.conversation.id;

            // Get the state properties from the turn context.
            const userProfile = await this.userProfileAccessor.get(context, {});
            const conversationData = await this.conversationDataAccessor.get(
                context, { promptedForUserName: false });

            //Manager Stats of Conversations on Memory 

            /*   if (!userProfile.name) {
                // First time around this is undefined, so we will prompt user for name.
                if (conversationData.promptedForUserName) {
                    // Set the name to what the user provided.
                    userProfile.name = context.activity.text;

                    // Acknowledge that we got their name.
                    await context.sendActivity(`obrigado ${ userProfile.name }. Para ver os dados da conversa, digite algo.`);

                    // Reset the flag to allow the bot to go though the cycle again.
                    conversationData.promptedForUserName = false;
                } else {
                    // Prompt the user for their name.
                    await context.sendActivity('Qual o seu nome?');

                    // Set the flag to true, so we don't prompt in the next turn.
                    conversationData.promptedForUserName = true;
                }
            } else {
                // Add message details to the conversation data.
                conversationData.timestamp = context.activity.timestamp.toLocaleString();
                conversationData.channelId = context.activity.channelId;

                // Display state data.
                await context.sendActivity(`${ userProfile.name } enviado: ${ context.activity.text }`);
                await context.sendActivity(`Mensagem recebida em: ${ conversationData.timestamp }`);
                await context.sendActivity(`Mensagem recebida de: ${ conversationData.channelId }`);
            }
*/


            // Add message details to the conversation data.
            conversationData.timestamp = context.activity.timestamp.toLocaleString();
            conversationData.channelId = context.activity.channelId;

            let userCli;
            const userDB = await usersDB.doc(any).get();

            if (userDB && userDB.exists) {
                userCli = userDB.data();
            } else {
                userCli = {
                    name: name,
                    any,
                    channel: 'whatsapp',
                    interactions: []
                };
                await userDB.ref.set(userCli);
            }

            userCli.timestamp = conversationData.timestamp;
            userCli.channelId = conversationData.channelId;

            this.actStep.bind(this);

            // First time around this is undefined, so we will prompt user for name.
            if (!conversationData.promptedForRazaoEscolha) {
                await this.actStep(context, userCli, conversationData);

            } else if (conversationData.promptedForRazaoEscolha && !conversationData.promptedForTypeService) {
                await this.actStepSpServ(context, userCli, conversationData);

            } else if (conversationData.promptedForTypeService && !conversationData.promptedForChoicePlan) {
                await this.actStepChoicePlan(context, userCli, conversationData);

                // Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Exclusivo do mês de julho, por R$ 99,99 ao mês você realiza 3 sessões de sua preferência e com o segundo mês gratuito. Esse plano é do seu agrado?
            } else {
                let msg = `Maravilha! 🥳 Agora basta que você baixe o aplicativo da Yobelle na loja disponível para seu celular, cadastre o seu cupom BELLE10 e já pode aproveitar para marcar suas sessões. `;
                userCli.interactions.push(msg);

                await context.sendActivity(msg);
            }

            /*
                        if (!userCli.interactions.length) {
                            const initialMsg = (
                                'Olá, <b>' + name + '</b> seja muito bem vindo(a)!' +
                                '😁 Sou a Iabella, assistente virtual da Yobelle e irei te ajudar daqui para frente. ' +
                                'Você já sabe como nossa empresa funciona?'
                            );

                            userCli.interactions.push(initialMsg);
                            await context.sendActivity(initialMsg).catch(error => console.log(error, context));
                        } else {
                            const textUserSays = context.activity.text;

                            let shouldSentMediaVideo = false;
                            let msg = '';

                            this.actStep.bind(this);
                            await this.actStep(context, userCli);

                            if (['sim', '1'].includes(textUserSays.toLowerCase())) {
                                msg = (
                                    'Que bom que nossa empresa já é de seu conhecimento! ' +
                                    'Gostaríamos de já te apresentar nossos planos e ofertas, mas antes, ' +
                                    'é de nosso interesse conhecer a razão pela qual você escolheu a Yobelle. ' +
                                    'Então me conta, o motivo foi:\n' +
                                    '1 - Não tem tempo de ir ao salão/barbearia, \n' +
                                    '2 - Viu o anúncio e se interessou pelo preço, \n' +
                                    '3 - Falaram bem da Yobelle e se interessou, ou \n' +
                                    '4 - Não tem profissional para te atender? 🤔'
                                ).trim();
                            } else if (['nao', 'não', '2'].includes(textUserSays.toLowerCase())) {
                                msg = (
                                    'Isso não é um problema! Aqui nós temos um vídeo super curto ' +
                                    'que você pode assistir para conhecer a gente melhor! 😉'
                                );
                                shouldSentMediaVideo = true;
                            } else if (false) {
                                msg = `Olá, seja muito bem vindo(a) de volta!😁 
                                        Obrigado pelo seu tempo! ❤️
                                        Vi aqui eu você já sabe como nossa empresa funciona.
                                        1 - Sim
                                        2 - Não`.trim();
                            }


                            userCli.interactions.push(textUserSays);
                            userCli.interactions.push(msg);

                            await context.sendActivity(msg);

                            if (shouldSentMediaVideo) {
                                const replyWithAttachment = {
                                    type: ActivityTypes.Message,
                                    text: 'Veja como funciona',
                                    attachments: [{
                                        contentType: 'video',
                                        contentUrl: 'https://firebasestorage.googleapis.com/v0/b/site-yobelle.appspot.com/o/institucional.mp4?alt=media&token=619abddb-aaea-47c7-9f86-83cb4bde2d2d'
                                    }]
                                };
                                await context.sendActivity(replyWithAttachment);

                                const end = Date.now() + 60000;
                                while (Date.now() < end) {}

                                msg = (
                                    'Agora que você já conheceu um pouquinho de como funcionamos, ' +
                                    'gostaríamos de já te apresentar nossos planos e ofertas, mas antes, ' +
                                    'é de nosso interesse conhecer a razão pela qual você escolheu a Yobelle. ' +

                                    'Então me conta, o motivo foi:\n' +
                                    '1 - Não tem tempo de ir ao salão/barbearia, \n' +
                                    '2 - Viu o anúncio e se interessou pelo preço, \n' +
                                    '3 - Falaram bem da Yobelle e se interessou, ou \n' +
                                    '4 - Não tem profissional para te atender? 🤔'
                                );
                                await context.sendActivity(msg);
                                userCli.interactions.push(msg);
                            }
                        }*/

            await userDB.ref.set(userCli, { merge: true });
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }


    /**
     * Second step in the waterfall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    async actStep(stepContext, userCli, conversationData) {
        const bookingDetails = {};

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext);
        const tete = 0;
        let msg;
        const name = stepContext.activity.channelData.ProfileName;
        switch (LuisRecognizer.topIntent(luisResult)) {

            case 'saudacao':
                {
                    msg = (
                        'Olá, <b>' + name + '</b> seja muito bem vindo(a)!' +
                        '😁 Sou a Iabella, assistente virtual da Yobelle e irei te ajudar daqui para frente. ' +
                        'Você já sabe como nossa empresa funciona?'
                    );
                    await stepContext.sendActivity(msg);
                    break;
                }
            case 'InfFuncionamento_sim':
                {
                    msg = (
                        'Que bom que nossa empresa já é de seu conhecimento! ' +
                        'Gostaríamos de já te apresentar nossos planos e ofertas, mas antes, ' +
                        'é de nosso interesse conhecer a razão pela qual você escolheu a Yobelle. ' +
                        'Então me conta, o motivo foi:\n' +
                        '1 - Não tem tempo de ir ao salão/barbearia, \n' +
                        '2 - Viu o anúncio e se interessou pelo preço, \n' +
                        '3 - Falaram bem da Yobelle e se interessou, ou \n' +
                        '4 - Não tem profissional para te atender? 🤔'
                    ).trim();
                    await stepContext.sendActivity(msg);
                    break;
                }
            case 'InfFuncionamento_nao':
                {

                    msg = (
                        'Isso não é um problema! Aqui nós temos um vídeo super curto ' +
                        'que você pode assistir para conhecer a gente melhor! 😉'
                    );
                    await stepContext.sendActivity(msg);

                    const replyWithAttachment = {
                        type: ActivityTypes.Message,
                        text: 'Veja como funciona',
                        attachments: [{
                            contentType: 'video',
                            contentUrl: 'https://firebasestorage.googleapis.com/v0/b/site-yobelle.appspot.com/o/institucional.mp4?alt=media&token=619abddb-aaea-47c7-9f86-83cb4bde2d2d'
                        }]
                    };
                    await stepContext.sendActivity(replyWithAttachment);

                    const end = Date.now() + 30000;
                    while (Date.now() < end) {}

                    msg = (
                        'Agora que você já conheceu um pouquinho de como funcionamos, ' +
                        'gostaríamos de já te apresentar nossos planos e ofertas, mas antes, ' +
                        'é de nosso interesse conhecer a razão pela qual você escolheu a Yobelle. ' +

                        'Então me conta, o motivo foi:\n' +
                        '1 - Não tem tempo de ir ao salão/barbearia, \n' +
                        '2 - Viu o anúncio e se interessou pelo preço, \n' +
                        '3 - Falaram bem da Yobelle e se interessou, ou \n' +
                        '4 - Não tem profissional para te atender? 🤔'
                    );

                    await stepContext.sendActivity(msg);
                    break;

                }
            case 'Razaoescolha_sem_tempo':
                {

                    msg = `Entendi. Me diz uma coisa, quais tipos de serviços você está procurando conosco? \n
                                 1 - <b>Beleza</b> (Manicure, depilação, maquiagem, corte masculino), 
                                 2 - <b>Bem-estar</b> (massagem relaxante, drenagem linfática) ou 
                                 3 - <b>Beleza e Bem-estar</b>`;
                    await stepContext.sendActivity(msg);
                    // Reset the flag to allow the bot to go though the cycle again.
                    conversationData.promptedForRazaoEscolha = true;
                    break;
                }
            case 'Tipo_Servico':
                {

                    msg = `Entendi. Me diz uma coisa, quais tipos de serviços você está procurando conosco? \n
                                     1 - <b>Beleza</b> (Manicure, depilação, maquiagem, corte masculino), 
                                     2 - <b>Bem-estar</b> (massagem relaxante, drenagem linfática) ou 
                                     3 - <b>Beleza e Bem-estar</b>`;
                    await stepContext.sendActivity(msg);
                    // Reset the flag to allow the bot to go though the cycle again.
                    conversationData.promptedForRazaoEscolha = true;
                    break;
                }
            case 'None':
                {
                    // We haven't implemented the reject dialog so we just display a TODO message.
                    msg = 'TODO: flow here';
                    await stepContext.sendActivity(msg);
                    break;
                }

            case 'planodddd':
                {
                    // Extract the values for the composite entities from the LUIS result.
                    const fromEntities = this.luisRecognizer.getFromEntities(luisResult);
                    const toEntities = this.luisRecognizer.getToEntities(luisResult);

                    // Show a warning for Origin and Destination if we can't resolve them.
                    await this.showWarningForUnsupportedCities(stepContext, fromEntities, toEntities);

                    // Initialize BookingDetails with any entities we may have found in the response.
                    bookingDetails.destination = toEntities.airport;
                    bookingDetails.origin = fromEntities.airport;
                    bookingDetails.travelDate = this.luisRecognizer.getTravelDate(luisResult);
                    console.log('LUIS extracted these booking details:', JSON.stringify(bookingDetails));

                    // Run the BookingDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
                    await stepContext.beginDialog('bookingDialog', bookingDetails);
                    break;
                }

            default:
                {
                    // Catch all for unhandled intents
                    msg = `Desculpe, não entendi. Por favor tente escrever de outra forma (intenção era ${ LuisRecognizer.topIntent(luisResult) })`;
                    await stepContext.sendActivity(msg);
                    break;
                }
        }

        if (!msg) {
            userCli.interactions.push(msg);
        }

        //   return await stepContext.next();
    }

    /**
     * Second step in the type service  This will use LUIS to attempt to extract the origin.
     */
    async actStepSpServ(stepContext, userCli, conversationData) {
        const bookingDetails = {};

        // Call LUIS and gather any tipo serviço. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext);
        const tete = 0;
        let msg;
        const name = stepContext.activity.channelData.ProfileName;
        switch (LuisRecognizer.topIntent(luisResult)) {

            case 'saudacao':
                {
                    msg = (
                        'Olá, <b>' + name + '</b> seja muito bem vindo(a)!' +
                        '😁 Sou a Iabella, assistente virtual da Yobelle e irei te ajudar daqui para frente. ' +
                        'Você já sabe como nossa empresa funciona?'
                    );
                    await stepContext.sendActivity(msg);
                    break;
                }
            case 'InfFuncionamento_sim':
                {
                    msg = (`Legal! E com que frequência? 1 - 1x por mês? 2 - 2x por mês? 3- 3x por mês? Ou 4 - mais do que isso?`).trim();
                    await stepContext.sendActivity(msg);
                    conversationData.promptedForTypeService = true;
                    conversationData.promptedForTypeServiceYes = true;
                    break;
                }
            case 'InfFuncionamento_nao':
                {

                    msg = (`E você se interessa em fazer quantas vezes por mês? 1 - 1x por mês? 2 - 2x por mês? 3- 3x por mês? Ou 4 - mais do que isso?`);

                    await stepContext.sendActivity(msg);
                    conversationData.promptedForTypeService = true;
                    break;

                }
            case 'Razaoescolha_sem_tempo':
                {

                    msg = `Entendi. Me diz uma coisa, quais tipos de serviços você está procurando conosco? \n
                                 1 - <b>Beleza</b> (Manicure, depilação, maquiagem, corte masculino), 
                                 2 - <b>Bem-estar</b> (massagem relaxante, drenagem linfática) ou 
                                 3 - <b>Beleza e Bem-estar</b>`;
                    await stepContext.sendActivity(msg);
                    break;
                }
            case 'Tipo_Servico':
                {

                    msg = `Interessante! E você já costuma fazer esse tipo de serviço em casa? 🤔`;
                    await stepContext.sendActivity(msg);
                    break;
                }
            case 'None':
                {
                    // We haven't implemented the GetWeatherDialog so we just display a TODO message.
                    msg = 'Interessante! E você já costuma fazer esse tipo de serviço em casa? 🤔';
                    await stepContext.sendActivity(msg);
                    break;
                }

            case 'planodddd':
                {
                    // Extract the values for the composite entities from the LUIS result.
                    const fromEntities = this.luisRecognizer.getFromEntities(luisResult);
                    const toEntities = this.luisRecognizer.getToEntities(luisResult);

                    // Show a warning for Origin and Destination if we can't resolve them.
                    await this.showWarningForUnsupportedCities(stepContext, fromEntities, toEntities);

                    // Initialize BookingDetails with any entities we may have found in the response.
                    bookingDetails.destination = toEntities.airport;
                    bookingDetails.origin = fromEntities.airport;
                    bookingDetails.travelDate = this.luisRecognizer.getTravelDate(luisResult);
                    console.log('LUIS extracted these booking details:', JSON.stringify(bookingDetails));

                    // Run the BookingDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
                    await stepContext.beginDialog('bookingDialog', bookingDetails);
                    break;
                }

            default:
                {
                    // Catch all for unhandled intents
                    msg = `Desculpe, não entendi. Por favor tente escrever de outra forma (intenção era ${ LuisRecognizer.topIntent(luisResult) })`;
                    await stepContext.sendActivity(msg);
                    break;
                }
        }
        if (!msg) {
            userCli.interactions.push(msg);
        }

    }

    /**
     * Second step in the type service  This will use LUIS to attempt to extract the origin.
     */
    async actStepChoicePlan(stepContext, userCli, conversationData) {
        const bookingDetails = {};

        // Call LUIS and gather any tipo serviço. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext);
        const tete = 0;
        let msg;
        const name = stepContext.activity.channelData.ProfileName;
        switch (LuisRecognizer.topIntent(luisResult)) {
            case 'Tipo_Servico':
                {
                    if (conversationData.promptedForTypeServiceYes) {
                        msg = (`Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Exclusivo do mês de julho, por R$ 99,99 ao mês você realiza 3 sessões de sua preferência e com o segundo mês gratuito. Esse plano é do seu agrado?`).trim();
                    } else {
                        msg = (`Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Básico, por R$ 59,99 ao mês você realiza 2 sessões, podendo escolher qual dos 3 serviços deseja: Massagem relaxante, Drenagem linfática e Manicure e pedicure. Esse plano é do seu agrado?`);
                    }
                    await stepContext.sendActivity(msg);
                    conversationData.promptedForChoicePlan = true;
                    break;
                }
            case 'saudacao':
                {
                    if (conversationData.promptedForTypeServiceYes) {
                        msg = (`Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Exclusivo do mês de julho, por R$ 99,99 ao mês você realiza 3 sessões de sua preferência e com o segundo mês gratuito. Esse plano é do seu agrado?`).trim();
                    } else {
                        msg = (`Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Básico, por R$ 59,99 ao mês você realiza 2 sessões, podendo escolher qual dos 3 serviços deseja: Massagem relaxante, Drenagem linfática e Manicure e pedicure. Esse plano é do seu agrado?`);
                    }
                    await stepContext.sendActivity(msg);
                    conversationData.promptedForChoicePlan = true;
                    break;
                }
            case 'InfFuncionamento_sim':
                {
                    msg = (`Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Exclusivo do mês de julho, por R$ 99,99 ao mês você realiza 3 sessões de sua preferência e com o segundo mês gratuito. Esse plano é do seu agrado?`).trim();
                    await stepContext.sendActivity(msg);
                    conversationData.promptedForChoicePlan = true;
                    break;
                }
            case 'InfFuncionamento_nao':
                {

                    msg = (`Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Básico, por R$ 59,99 ao mês você realiza 2 sessões, podendo escolher qual dos 3 serviços deseja: Massagem relaxante, Drenagem linfática e Manicure e pedicure. Esse plano é do seu agrado?`);

                    await stepContext.sendActivity(msg);
                    conversationData.promptedForChoicePlan = true;
                    break;

                }
            case 'Choice_Plan':
                {

                    msg = `Com base no seu perfil achei um plano ideal pra você! 🤩 É o nosso Plano Exclusivo do mês de julho, por R$ 99,99 ao mês você realiza 3 sessões de sua preferência e com o segundo mês gratuito. Esse plano é do seu agrado?`;
                    await stepContext.sendActivity(msg);
                    break;
                }

            case 'None':
                {
                    // We haven't implemented the GetWeatherDialog so we just display a TODO message.
                    msg = 'Maravilha! Agora basta que você baixe o aplicativo da Yobelle na loja disponível para seu celular, cadastre o seu cupom BELLE10 e já pode aproveitar para marcar suas sessões. ';
                    await stepContext.sendActivity(msg);
                    break;
                }

        }
        if (!msg) {
            userCli.interactions.push(msg);
        }
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    /**
     * Shows a warning if the requested From or To cities are recognized as entities but they are not in the Airport entity list.
     * In some cases LUIS will recognize the From and To composite entities as a valid cities but the From and To Airport values
     * will be empty if those entity values can't be mapped to a canonical item in the Airport.
     */
    async showWarningForUnsupportedCities(context, fromEntities, toEntities) {
        const unsupportedCities = [];
        if (fromEntities.from && !fromEntities.airport) {
            unsupportedCities.push(fromEntities.from);
        }

        if (toEntities.to && !toEntities.airport) {
            unsupportedCities.push(toEntities.to);
        }

        if (unsupportedCities.length) {
            const messageText = `Sorry but the following airports are not supported: ${ unsupportedCities.join(', ') }`;
            await context.sendActivity(messageText, messageText, InputHints.IgnoringInput);
        }
    }

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
    async finalStep(stepContext) {
        // If the child dialog ("bookingDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result;
            // Now we have all the booking details.

            // This is where calls to the booking AOU service or database would go.

            // If the call to the booking service was successful tell the user.
            const timeProperty = new TimexProperty(result.travelDate);
            const travelDateMsg = timeProperty.toNaturalLanguage(new Date(Date.now()));
            const msg = `I have you booked to ${ result.destination } from ${ result.origin } on ${ travelDateMsg }.`;
            await stepContext.context.sendActivity(msg, msg, InputHints.IgnoringInput);
        }

        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
    }

}

module.exports.TwilioBot = TwilioBot;