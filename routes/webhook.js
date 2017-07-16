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
const billerIds = ['ELEC', 'TELCO', 'LOANS', 'SCHOOL', 'WATER', 'CABLE'];

const users = {};


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
            users[sender] = users[sender] || {};
            users[sender].status = users[sender].status || [];
            console.log(`\n\n\n\n\n Status: ${users[sender].status}`);
            console.log(`\n\n\n\n\n Top of stack ${users[sender].status[users[sender].status.length - 1]}`);
            if (users[sender].status[users[sender].status.length - 1] === 'askacctnumber') {
                accountInfo = getAccountInfo(sender, message);
                // console.log('\n\n\n\n\n\n\n\n\n ACCOUNT INFO: ', accountInfo);
                // sendTextMessage(sender, JSON.stringify(accountInfo));
            } else if (users[sender].status[users[sender].status.length - 1] === 'askAmount') {
                makePayment(sender, message);
            } else if (users[sender].status[users[sender].status.length - 1] === 'askTransferAmount') {
                makeTransfer(sender, message);
            } else if (users[sender].status[users[sender].status.length - 1] === 'paybills') {
                users[sender].status.push('askAmount');
                sendTextMessage(sender, 'How much would you like to pay?');
            } else if (users[sender].status[users[sender].status.length - 1] === 'asktargetacctnumber') {
                users[sender].transferAcct = message;
                users[sender].status.push('askTransferAmount');
                sendTextMessage(sender, 'How much would you like to transfer?');
            } else {
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
                                sendBranches(sender);
                            } else if (parameters.location) {
                                if (parameters.location['business-name'] == 'ATM') {
                                    sendATMLocations(sender);
                                } else {
                                    sendBranches(sender);
                                }
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
                            sendChoiceButton(sender, quickReplies, "Here are the list of currencies with available data:");
                        }
                        break;
                    case 'info.account':
                        console.log('\nResponse: ', response);
                        console.log('\n\n\n\n\n\n\n\n\nParameters: ' + JSON.stringify(parameters));
                        if (parameters.currency_name) {

                        } else {
                            // users[sender].status = 'askacctnumber';
                            users[sender].status = users[sender].status || [];
                            users[sender].status.push('askacctnumber');
                            sendTextMessage(sender, "What is your account number?");
                        }
                        break;
                    case 'info.bills':
                        console.log('\nResponse: ', response);
                        console.log('\n\n\n\n\n\n\n\n\nParameters: ' + JSON.stringify(parameters));
                        let quickReplies = billerIds.map((billerId) => {
                            const quickReply = {
                                "content_type": "text",
                                "title": billerId,
                                "payload": "billerId"
                            }
                            return quickReply;
                        });
                        users[sender] = users[sender] || []
                        // users[sender] = users[sender] || {}
                        // users[sender].status = 'askbillerId';
                        users[sender].status.push('paybills');
                        users[sender].status.push('askbillerId');

                        sendChoiceButton(sender, quickReplies, 'Here are available billers');
                        break;
                    case 'info.fund':
                        console.log('\nResponse: ', response);
                        console.log('\n\n\n\n\n\n\n\n\nParameters: ' + JSON.stringify(parameters));
                        // users[sender].status = 'askacctnumber';
                        users[sender].status = users[sender].status || [];
                        users[sender].status.push('asktargetacctnumber');
                        sendTextMessage(sender, "What is the target account number to transfer funds to?");
                    default:
                        sendTextMessage(sender, aiMessage);
                        console.log(`\n\n\n\n\n\n SMALL TALK HANDLER \n\n\n\n\n\n`);
                }
            }

        });

        apiai.on('error', (error) => {
            console.log(error);
        });

        apiai.end();
    }

}


function sendATMLocations(sender) {
    let elements = [];
    for (var i = 0; i < 4; i++) {
        if (atmLocations[i]) {
            var lat = atmLocations[i].latitude;
            var long = atmLocations[i].longitude;
            elements.push({
                "title": atmLocations[i].name,
                "subtitle": atmLocations[i].address,
                "image_url": "https://maps.googleapis.com/maps/api/staticmap?key=" + "AIzaSyC6zxnPD-pVU174ETFz8ihEqvn9wExnTNM" +
                    "&markers=color:red|label:B|" + lat + "," + long + "&size=360x360&zoom=13"
            });
        }
    }
    sendMapsMessage(sender, elements)
}

function sendBranches(sender) {
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
    var sender = event.sender.id;
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
                    subtitle: result.name + `\n Buying: ${result.buying} \n Selling: ${result.selling}`
                }
                sendGenericMessage(sender, currency);
                // sendTextMessage(senderID, `buying: 38.276, \nselling: 39.877,`);
            }
            break;
        case 'billerId':
            // {   channel_id: 'UHAC_TEAM',
            //     source_account: 'XXXXXXXXXXX1',
            //     source_currency: 'PHP',
            //     biller_id: 'ELEC',
            //     reference1: 'sample string 1',
            //     reference2: 'sample string 2',
            //     reference3: 'sample string 3',
            //     amount: 9 }
            users[sender] = users[sender] || {};
            // if (users[sender].status === 'askbillerId') {
            //     accountInfo = getAccountInfo(sender, message);
            //     // console.log('\n\n\n\n\n\n\n\n\n ACCOUNT INFO: ', accountInfo);
            //     // sendTextMessage(sender, JSON.stringify(accountInfo));
            // }
            users[sender].billerId = messageText;
            console.log(users[sender]);
            if (users[sender].accountNumber) {
                // users[sender].status = 'askAmount';
                users[sender].status = users[sender].status || [];
                users[sender].status.push('askAmount');
                sendTextMessage(sender, 'How much would you like to pay?');
            } else {
                users[sender].status = users[sender].status || [];
                users[sender].status.push('askacctnumber');
                sendTextMessage(sender, 'What is your account number?');
            }
            break;
        default:

    }

}

function sendChoiceButton(sender, quickReplies, text) {
    console.log(JSON.stringify(quickReplies));
    var messageData = {
        recipient: {
            id: sender
        },
        message: {
            text: text,
            quick_replies: quickReplies
        }
    };
    users[sender].status = users[sender].status || [];
    users[sender].status.pop();
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

function makeTransfer(sender, amount) {
    console.log('\n\n\n\n\n\n ACCOUNT NUMBER: ' + users[sender].accountNumber);
    console.log('\n\n\n\n\n\n TARGET ACCT NUMBER: ' + users[sender].transferAcct);
    console.log('\n\n\n\n\n\n AMOUNT: ' + amount);

    var options = {
        method: 'POST',
        url: 'https://api-uat.unionbankph.com/uhac/sandbox/transfers/initiate',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-ibm-client-secret': 'P3lI2dG6hP0dJ1kQ5fD4jE4cF4yW8eU1gP0eK7aU4hM0nV8jA6',
            'x-ibm-client-id': '7abd6419-deff-4ae4-8ccb-65ad5032b51c'
        },
        body: {
            channel_id: 'UHAC_TEAM',
            transaction_id: " " + (Math.floor(Math.random() * 1500)),
            source_account: users[sender].accountNumber,
            source_currency: 'PHP',
            target_account: users[sender].transferAcct,
            target_currency: 'PHP',
            amount: amount
        },
        json: true
    };

    request(options, function (error, response, body) {
        if (error) return console.error('Failed: %s', error.message);
        console.log(`\n\n\n\n\n\n Response: ${response.body}`)
        let jsonbody = response.body;
        console.log('\n\n\n\n\n\n API RESPONSE: ' + JSON.stringify(jsonbody));
        if (jsonbody.status === 'S') {

            sendTextMessage(sender, 'Payment successful, updated account info:');
            getAccountInfo(sender, users[sender].accountNumber);
        } else {
            sendTextMessage(sender, 'Payment unsuccessful, no money deducted from account.');
        }
        // return jsonbody[0];
        users[sender].status = users[sender].status || []
        // users[sender].status = 'default';
        users[sender].status.pop();
        // sendTextMessage(sender, JSON.stringify(jsonbody[0]));
    });
}

function makePayment(sender, amount) {
    console.log('\n\n\n\n\n\n ACCOUNT NUMBER: ' + users[sender].accountNumber);
    console.log('\n\n\n\n\n\n AMOUNT: ' + amount);
    var options = {
        method: 'POST',
        url: `https://api-uat.unionbankph.com/uhac/sandbox/payments/initiate`,
        headers: {
            accept: 'application/json',
            'x-ibm-client-secret': 'P3lI2dG6hP0dJ1kQ5fD4jE4cF4yW8eU1gP0eK7aU4hM0nV8jA6',
            'x-ibm-client-id': '7abd6419-deff-4ae4-8ccb-65ad5032b51c'
        },
        body: {
            channel_id: "UHAC_TEAM",
            source_account: users[sender].accountNumber,
            transaction_id: " " + (Math.floor(Math.random() * 1500)),
            source_currency: "PHP",
            biller_id: users[sender].billerId,
            reference1: "sample string 1",
            reference2: "sample string 2",
            reference3: "sample string 3",
            amount: amount
        },
        json: true
    };

    request(options, function (error, response, body) {
        if (error) return console.error('Failed: %s', error.message);
        console.log(`\n\n\n\n\n\n Response: ${response.body}`)
        let jsonbody = response.body;
        console.log('\n\n\n\n\n\n API RESPONSE: ' + JSON.stringify(jsonbody));
        if (jsonbody.status === 'S') {

            sendTextMessage(sender, 'Payment successful, updated account info:');
            getAccountInfo(sender, users[sender].accountNumber);
        } else {
            sendTextMessage(sender, 'Payment unsuccessful, no money deducted from account.');
        }
        // return jsonbody[0];
        users[sender].status = users[sender].status || []
        // users[sender].status = 'default';
        users[sender].status.pop();
        // sendTextMessage(sender, JSON.stringify(jsonbody[0]));
    });
}

function getAccountInfo(sender, accountNumber) {
    console.log('\n\n\n\n\n\n ACCOUNT NUMBER: ' + accountNumber);
    var options = {
        method: 'GET',
        url: `https://api-uat.unionbankph.com/uhac/sandbox/accounts/${accountNumber}`,
        headers: {
            accept: 'application/json',
            'x-ibm-client-secret': 'P3lI2dG6hP0dJ1kQ5fD4jE4cF4yW8eU1gP0eK7aU4hM0nV8jA6',
            'x-ibm-client-id': '7abd6419-deff-4ae4-8ccb-65ad5032b51c'
        }
    };

    request(options, function (error, response, body) {
        if (error) return console.error('Failed: %s', error.message);
        let jsonbody = JSON.parse(response.body);
        console.log('\n\n\n\n\n\n API RESPONSE: ' + JSON.stringify(jsonbody[0]));
        // return jsonbody[0];
        var accountInfo = {
            title: jsonbody[0].account_name,
            subtitle: `\n Account Number: ${jsonbody[0].account_no} \nAvailable: ${jsonbody[0].avaiable_balance} \nCurrent:  ${jsonbody[0].current_balance}`,
            image_url: jsonbody[0].status === 'ACTIVE' ? "https://cdn.pixabay.com/photo/2017/01/13/01/22/ok-1976099_1280.png" : "https://cdn.pixabay.com/photo/2017/02/12/21/29/false-2061131_1280.png",
        }
        users[sender].accountNumber = jsonbody[0].account_no;
        // users[sender].status = 'default';
        users[sender].status = users[sender].status || [];
        users[sender].status.pop();
        sendGenericMessage(sender, accountInfo);
        // sendTextMessage(sender, JSON.stringify(jsonbody[0]));
    });
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