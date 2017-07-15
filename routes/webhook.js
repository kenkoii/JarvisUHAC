var request = require('request');
var express = require('express');
// var helpers = require('../helpers');
var app = express.Router();

// Facebook page token
const PAGE_ACCESS_TOKEN = "EAAcAuxG36YUBAGEjS38y3sYhkXYmZAt9xVmAgTpNe4NG4XHefeVGietg5rN9D4Ta35UpTZBlYZAqVLzlb1yLejECj8EjhPdSfDZCLMVZBMKWrDw1iw9k94fAHmpi2UaBCl1hmGTojMy9HoZBX4DFZA2Mk84RyFAruc1B0rTPAU8HeC6i2uVaQ9D"
const apiai = require("apiai");
const apiAIApp = apiai("4908574ffef54ac4a5e4509fba4ec58e");

const currencies = [];
const branchLocations = [];
const atmLocations = [];


// Facebook
app.get('/', (req, res) => {
    if (req.query['hub.verify_token'] === 'toykentschardy') {
        res.send(req.query['hub.challenge'])
    }

    res.send("Wrong token");
});

app.post('/', (req, res) => {
    console.log(req.body);
    if (currencies.length === 0) {
        getCurrencies();
        // helpers.getCurrencies;
    }
    if (atmLocations) {
        if (atmLocations.length === 0) {
            getAtmLocations();
        }
    }
    if (branchLocations) {
        if (branchLocations.length === 0) {
            getBranchLocations();
        }
    }
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message) {
                    // console.log(`\n\n\n\n\n\n Event: ${JSON.stringify(event)} \n\n\n\n\n\n`);
                    console.log(`\n\n\n\n\n\n Event Message: ${JSON.stringify(event.message)} \n\n\n\n\n\n`);
                    if (event.message.attachments) {
                        if (event.message.attachments[0].type === 'location') {
                            receivedPayloadEvent(event);
                        }
                    } else if (event.message.quick_reply) {
                        receivedQuickReplyEvent(event);
                    } else {
                        receivedMessageEvent(event);
                    }
                } else if (event.postback) {
                    receivedPostbackEvent(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });
        res.status(200).end();
    }
});


app.post('/ai', (req, res) => {
    switch (req.body.result.action) {
        case 'sys.location':
            {
                sendTextMessage()
            }
            break;
        case 'input.welcome':
            break;
        case 'input.unknown':

        default:
            break;
    }
});



function receivedMessageEvent(event) {
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
                case 'location':
                    // CALL UNIONBANK API HERE
                    console.log('\n\n\n\n\n\n\n\n\nResponse: ', response);
                    // const aiMessage = response.result.fulfillment.speech;
                    // sendTextMessage(sender, aiMessage);
                    console.log('\n\n\n\n\n\n\n\n\nParameters: ' + JSON.stringify(parameters));
                    if (parameters) {
                        if (parameters.location.city) {
                            console.log('\n\n\n\n\n\n\n\n\n BRANCH!!!');
                            console.log('\n\n\n\n\n\n\n\n\n ' + branchLocations)
                            let elements = [];
                            for (var i = 0; i < 4; i++) {
                                if (branchLocations[i]) {
                                    var lat = branchLocations[i].latitude;
                                    var long = branchLocations[i].longitude;
                                    elements.push({
                                        "title": branchLocations[i].name,
                                        "subtitle": branchLocations[i].address,
                                        "image_url": "https://maps.googleapis.com/maps/api/staticmap?key=" + "AIzaSyC6zxnPD-pVU174ETFz8ihEqvn9wExnTNM" +
                                            "&markers=color:red|label:B|" + lat + "," + long + "&size=360x360&zoom=13"
                                    });
                                }
                            }
                            sendMapsMessage(sender, elements)
                        }
                    } else {
                        sendLocationButton(sender)
                    }
                    break;
                case 'info.forex':
                    console.log('\nResponse: ', response);
                    console.log('\n\n\n\n\n\n\n\n\nParameters: ' + JSON.stringify(parameters));
                    if (parameters.currency_name) {
                        var result = currencies.filter(function (currency) {
                            return currency.symbol == parameters.currency_name;
                        })[0];
                        if (result) {
                            var currency = {
                                title: result.symbol,
                                subtitle: result.name + `\n Buying: ${result.buying} \n Selling: ${result.selling}`
                            }
                            sendGenericMessage(sender, currency);
                        }
                    } else {
                        let quickReplies = currencies.map((currency) => {
                            const quickReply = {
                                "content_type": "text",
                                "title": currency.symbol,
                                "payload": "currency"
                            }
                            return quickReply;
                        });
                        sendChoiceButton(sender, quickReplies);
                    }
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

}

function receivedPayloadEvent(event) {
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
}

function receivedQuickReplyEvent(event) {
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

}

function sendChoiceButton(recipientId, quickReplies) {
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
}


function sendMapsMessage(recipientId, elements) {
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
}

function sendGenericMessage(recipientId, element) {
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
}

function sendTextMessage(recipientId, messageText) {
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
}

function callSendAPI(messageData) {
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
}

function sendLocationButton(recipientId) {
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
}

function getCurrencies() {
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


function getAtmLocations() {
    var options = {
        method: 'GET',
        url: 'https://api-uat.unionbankph.com/uhac/sandbox/locators/atms',
        headers: {
            accept: 'application/json',
            'x-ibm-client-secret': 'P3lI2dG6hP0dJ1kQ5fD4jE4cF4yW8eU1gP0eK7aU4hM0nV8jA6',
            'x-ibm-client-id': '7abd6419-deff-4ae4-8ccb-65ad5032b51c'
        }
    };

    request(options, function (error, response, body) {
        if (error) return console.error('Failed: %s', error.message);
        let jsonbody = JSON.parse(response.body);
        jsonbody.forEach((atmLocation) => {
            atmLocations.push(atmLocation);
        });
        console.log(`\n\n\n NANAY SULOD SI ATMLOCATIONS \n\n\n`);
    });
}

function getBranchLocations() {
    var options = {
        method: 'GET',
        url: 'https://api-uat.unionbankph.com/uhac/sandbox/locators/branches',
        headers: {
            accept: 'application/json',
            'x-ibm-client-secret': 'P3lI2dG6hP0dJ1kQ5fD4jE4cF4yW8eU1gP0eK7aU4hM0nV8jA6',
            'x-ibm-client-id': '7abd6419-deff-4ae4-8ccb-65ad5032b51c'
        }
    };


    request(options, function (error, response, body) {
        if (error) return console.error('Failed: %s', error.message);
        let jsonbody = JSON.parse(response.body);
        jsonbody.forEach((branchLocation) => {
            branchLocations.push(branchLocation);
        });
        console.log(`\n\n\n NANAY SULOD SI BRANCHLOCATIONS \n\n\n`);
    });
}


module.exports = app;