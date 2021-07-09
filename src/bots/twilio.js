const { ActivityTypes } = require('botbuilder');
const { ActivityHandler } = require('botbuilder');

const { db } = require('./../firebase');

class TwilioBot extends ActivityHandler {
    constructor() {
        super();

        const usersDB = db.collection('users');

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity('Bem vindo ao Twilio Bot!');
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const name = context.activity.channelData.ProfileName;
            const any = context.activity.conversation.id;

            let userCli;
            const userDB = await usersDB.doc(any).get();

            if (userDB && userDB.exists) {
                userCli = userDB.data();
            } else {
                userCli = {
                    name,
                    any,
                    channel: 'whatsapp',
                    interactions: []
                };
                await userDB.ref.set(userCli);
            }

            if (!userCli.interactions.length) {
                const initialMsg = (
                    'Olá, <b>' + name + '</b> seja muito bem vindo(a)!' +
                    '😁 Sou o assistente virtual da Yobelle e irei te ajudar daqui para frente. ' +
                    'Você já sabe como nossa empresa funciona?'
                );

                userCli.interactions.push(initialMsg);
                await context.sendActivity(initialMsg).catch(error => console.log(error, context));
            } else {
                const textUserSays = context.activity.text;

                let shouldSentMediaVideo = false;
                let msg = '';

                if (['sim'].includes(textUserSays.toLowerCase())) {
                    msg = (
                        'Que bom que nossa empresa já é de seu conhecimento! ' +
                        'Gostaríamos de já te apresentar nossos planos e ofertas, mas antes, ' +
                        'é de nosso interesse conhecer a razão pela qual você escolheu a Yobelle. ' +
                        'Então me conta, o motivo foi:\n' +
                        '1 - Não tem tempo de ir ao salão/barbearia, \n' +
                        '2 - Viu o anúncio e se interessou pelo preço, \n' +
                        '3 - Falaram bem da Yubelle e se interessou, ou \n' +
                        '4 - Não tem profissional para te atender? 🤔'
                    ).trim();
                } else if (['nao', 'não'].includes(textUserSays.toLowerCase())) {
                    msg = (
                        'Isso não é um problema! Aqui nós temos um vídeo super curto ' +
                        'que você pode assistir para conhecer a gente melhor! 😉'
                    );
                    shouldSentMediaVideo = true;
                }
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
                    while (Date.now() < end) {
                    }

                    msg = (
                        'Agora que você já conheceu um pouquinho de como funcionamos, ' +
                        'gostaríamos de já te apresentar nossos planos e ofertas, mas antes, ' +
                        'é de nosso interesse conhecer a razão pela qual você escolheu a Yobelle. ' +

                        'Então me conta, o motivo foi:\n' +
                        '1 - Não tem tempo de ir ao salão/barbearia, \n' +
                        '2 - Viu o anúncio e se interessou pelo preço, \n' +
                        '3 - Falaram bem da Yubelle e se interessou, ou \n' +
                        '4 - Não tem profissional para te atender? 🤔'
                    );
                    await context.sendActivity(msg);
                    userCli.interactions.push(msg);
                }
            }

            await userDB.ref.set(userCli, { merge: true });
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.TwilioBot = TwilioBot;
