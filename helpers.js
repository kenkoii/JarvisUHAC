'use strict'

const helpers = {

    receivedMessageEvent: function (event) {
        let sender = event.sender.id;
        let message = event.message.text;

        let apiai = apiAIApp.textRequest(message, {
            sessionId: 'someTokenHere'
        });


        if (message) {
            console.log(`\n\n\n\n\n\n ${message} , ${sender} \n\n\n\n\n\n`);
            apiai.on('response', (response) => {

                var result = response.result;
                var parameters = result.parameters;
                var action = result.action;
                console.log('\nAction: ', action);
                const aiMessage = response.result.fulfillment.speech;
                switch (action) {
                    case 'location.atm':
                        // CALL UNIONBANK API HERE
                        console.log('\nResponse: ', response);
                        // const aiMessage = response.result.fulfillment.speech;
                        // sendTextMessage(sender, aiMessage);
                        sendLocationButton(sender)
                        break;
                    case 'info.forex':
                        console.log('\nResponse: ', response);
                        // const aiMessage = response.result.fulfillment.speech;
                        // sendTextMessage(sender, aiMessage);
                        // sendLocationButton(sender)
                        let quickReplies = currencies.map((currency) => {
                            const quickReply = {
                                "content_type": "text",
                                "title": currency.symbol,
                                "payload": "currency"
                            }
                            return quickReply;
                        });
                        sendChoiceButton(sender, quickReplies);
                        break;
                    default:
                        sendTextMessage(sender, aiMessage);
                        console.log(`\n\n\n\n\n\n SMALL TALK HANDLER \n\n\n\n\n\n`);
                }
                if (action == 'location.atm') {

                } else {

                }
            });

            apiai.on('error', (error) => {
                console.log(error);
            });

            apiai.end();
        }

    },
    receivedPayloadEvent: function (event) {
        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfMessage = event.timestamp;
        var message = event.message;


        var messageText = message.text;
        var messageAttachments = message.attachments;
        var messageId = message.mid;

        console.log(message);

        console.log(JSON.stringify(event));
        console.log("Received payload for user %d and page %d at %d with message:",
            senderID, recipientID, timeOfMessage);
        console.log(JSON.stringify(message));
        if (messageAttachments) {
            // if(messageAttachments[0].payload.coordinates)
            console.log("Message Attachments:", messageAttachments[0].payload.coordinates);
            if (messageAttachments[0].type == 'location') {
                console.log("Nisud diri");
                sendTextMessage(senderID, `Message with attachment received:\nLat: ${messageAttachments[0].payload.coordinates.lat}\nLong: ${messageAttachments[0].payload.coordinates.long}`);
            }
        }
    },
    receivedQuickReplyEvent: function (event) {
        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfMessage = event.timestamp;
        var message = event.message;

        var quickReply = message.quick_reply;
        var messageText = message.text;
        var messageId = message.mid;

        switch (quickReply.payload) {
            case 'currency':
                //should check for currency/value of text, search it in currencies const
                // currencies.indexOf()
                var result = currencies.filter(function (currency) {
                    return currency.symbol == messageText;
                })[0];
                if (result) {
                    var currency = {
                        title: result.symbol,
                        subtitle: result.name + `\n Buying: ${result.buying} \n Selling: ${result.selling}`,
                        // item_url: "https://www.oculus.com/en-us/rift/",
                        // image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                        // buttons: [{
                        //     type: "web_url",
                        //     url: "https://www.oculus.com/en-us/rift/",
                        //     title: "Open Web URL"
                        // }, {
                        //     type: "postback",
                        //     title: "Call Postback",
                        //     payload: "Payload for first bubble",
                        // }],
                    }
                    sendGenericMessage(senderID, currency);
                    // sendTextMessage(senderID, `buying: 38.276, \nselling: 39.877,`);
                }
                break;
            default:

        }
    },
    sendChoiceButton: function (recipientId, quickReplies) {
        console.log(JSON.stringify(quickReplies));
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: "What do you want to know?",
                quick_replies: quickReplies
            }
        };
        console.log("sendChoiceButton: ", messageData);
        callSendAPI(messageData);
    },
    sendGenericMessage: function (recipientId, element) {
        const elements = [];
        elements.push(element)
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: elements
                    }
                }
            }
        };
        callSendAPI(messageData);
    },
    sendTextMessage: function (recipientId, messageText) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: messageText
            }
        };
        console.log("sendTextMessage: ", messageData);
        callSendAPI(messageData);
    },
    callSendAPI: function (messageData) {
        console.log("callSendAPI: ", messageData);
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: PAGE_ACCESS_TOKEN
            },
            method: 'POST',
            json: messageData
        }, function (error, response, body) {
            // console.log("response: ", response);
            console.log("body: ", body);
            console.log("error: ", error);
            if (!error && response.statusCode == 200) {
                var recipientId = body.recipient_id;
                var messageId = body.message_id;

                console.log("Successfully sent generic message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.error("Unable to send message.");
                //   console.error(response);
                console.error(error);
            }
        });
    },
    sendLocationButton: function (recipientId) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: "Please share your location:",
                quick_replies: [{
                    content_type: "location",
                }]
            }
        };
        console.log("sendLocationButton: ", messageData);
        callSendAPI(messageData);
    },
    getCurrencies: function () {
        var options = {
            method: 'GET',
            url: 'https://api-uat.unionbankph.com/uhac/sandbox/forex/currencies',
            headers: {
                accept: 'application/json',
                'x-ibm-client-secret': 'P3lI2dG6hP0dJ1kQ5fD4jE4cF4yW8eU1gP0eK7aU4hM0nV8jA6',
                'x-ibm-client-id': '7abd6419-deff-4ae4-8ccb-65ad5032b51c'
            }
        };

        request(options, function (error, response, body) {
            if (error) return console.error('Failed: %s', error.message);
            let jsonbody = JSON.parse(response.body);
            jsonbody.forEach((currency) => {
                currencies.push(currency);
            });
            console.log(`\n\n\n NANAY SULOD SI CURRENCY \n\n\n`);
        });
    }

};

module.exports = helpers;