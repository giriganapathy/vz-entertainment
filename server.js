/*-----------------------------------------------------------------------------
This is a sample Verizon Bot which helps the customer by prompting series of
questions to understand the customer intents and helping them to assist
the customers by showing the Verizon offers and helping them to order placements.
 
@author: giriganapathy
@since: May 5, 2016 01:32 PM
-----------------------------------------------------------------------------*/
var restify = require("restify");
var builder = require("botbuilder");

var model = process.env.model || "https://api.projectoxford.ai/luis/v1/application?id=588f2ecf-6889-42a9-9e42-6e345e692543&subscription-key=b27a7109bc1046fb9cc7cfa874e3f819&q=";
var modelUri = "https://api.projectoxford.ai/luis/v1/application?id=588f2ecf-6889-42a9-9e42-6e345e692543&subscription-key=b27a7109bc1046fb9cc7cfa874e3f819";

var dialog = new builder.LuisDialog(model);

var bot = new builder.BotConnectorBot();

var currentOffer = "FiOS Triple Play";



bot.use(function (session, next) {
    if (!session.userData.userNameReceivedFlag) {
        session.userData.userNameReceivedFlag = true;
        session.beginDialog("/userProfile");
    }
    else {
        next();
    }
});

bot.add("/userProfile", [
    function (session) {
        builder.Prompts.text(session, "May i know your name please?");
    },
    function (session, results) {

        builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
            var entity = builder.EntityRecognizer.findEntity(entities, 'name');
            if (null != entity) {
                session.userData.name = entity.entity;
                session.beginDialog("/showOffer");
            }
            else {
                session.send("I am sorry, i did not understand your answser.");
                session.replaceDialog("/userProfile");
            }
        });
    }
]);

//bot.add("/", dialog);

bot.add("/showOffer", [
    function (session, args, next) {
        if (!session.userData.selectedOffer) {
            builder.Prompts.confirm(session, "Hello " + session.userData.name + "! Are you interested in " + currentOffer + " Offer?");
        }
        else {
            next({ response: true });
        }
    },
    function (session, results, next) {
        if (true === results.response) {
            if (null == session.userData.selectedOffer) {
                session.userData.selectedOffer = "FiOS Triple Play";
                builder.Prompts.text(session, "Thanks for showing interest on " + session.userData.selectedOffer + ". \n" +
                    "To check whether the service is available in your location, can u please tell me your address with zip code.");
            }
            else {
                next({ response: session.userData.zipCode });
            }
        }
        else {
            session.send("ok. no problem., Thanks for checking with me. bye");
            session.endDialog();
        }
    },
    function (session, results, next) {
        if (results.response && !session.userData.zipCode) {
            var zipAndState = "";
            var zipCode = "";

            var userResponse = results.response;

            var zipAndStatePattern = "\\s\\w{2}\\s\\d{5}";
            var regExpZipAndStatePattern = new RegExp(zipAndStatePattern);
            if (regExpZipAndStatePattern.test(userResponse)) {
                var zipAndStateArr = regExpZipAndStatePattern.exec(userResponse);
                if (null != zipAndStateArr) {
                    zipAndState = zipAndStateArr[0];

                    var zipCodePattern = new RegExp("\\d{5}");
                    var zipCodeArr = zipCodePattern.exec(zipAndState);
                    if (null != zipCodeArr) {
                        zipCode = zipCodeArr[0];
                    }
                }
                if (null != zipCode && zipCode.trim().length > 0) {
                    session.userData.zipCode = zipCode;
                    builder.DialogAction.send("Please wait while checking the service availability...");
                    var Client = require('node-rest-client').Client;
                    var client = new Client();
                    // set content-type header and data as json in args parameter 
                    var args = {
                        headers: { "Content-Type": "application/json" }
                    };
                    client.get("http://fiosserviceavailabilityapp.azurewebsites.net/zipcode/" + zipCode, args, function (data, response) {
                        // parsed response body as js object 
                        var result = data["status"];
                        if (result) {
                            session.userData.serviceAvailable = true;
                            var msg = "Great! " + session.userData.selectedOffer + " is available in your address with the zip code:" + zipCode + "\n\n" +
                                "To recommend best plan, can u tell me your usage..like do u use internet more or tv...etc.";
                            builder.Prompts.text(session, msg);
                        }
                        else {
                            session.userData.serviceAvailable = false;
                            session.send("Sorry! " + session.userData.selectedOffer + " is unavailable in your address with the zip code:" + zipCode);
                        }
                    });
                }
            }
            else {
                //Pl. provide the valid zip code.
                session.userData.zipCode = null;
                session.send("Sorry! " + "I dont see the zip code in the address you provided...\nPlease provide me the address with zip code.");
                //session.replaceDialog("/showOffer");
            }
        }
        else {
            if (!session.userData.serviceAvailable) {
                session.send("Sorry! " + session.userData.selectedOffer + " is unavailable in your address with the zip code:" + session.userData.zipCode);
            }
            else {
                next({ response: session.message.text });
            }            
        }
    },
    function (session, results) {
        if (results.response) {
            builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
                var entity = builder.EntityRecognizer.findEntity(entities, 'sub-product');
                if (null != entity) {
                    switch (entity.entity) {
                        case "tv":
                            var captionText = "We have found a perfect offer for you. Please check this.\n";
                            var reply = new builder.Message()
                                .setText(session, captionText)
                                .addAttachment({
                                    text: "50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo",
                                    title: session.userData.selectedOffer + " offer for TV",
                                    titleLink: "http://www.verizon.com/home/fiostv/",
                                    contentType: "image/jpeg",
                                    contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/mob_ocw_ftp_ofr2_0403.png"                                    
                                });
                                //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                            session.send(reply);
                            builder.Prompts.confirm(session, "Do you like to proceed?\nPlease confirm " + session.userData.name);
                            break;
                        case "internet":                            
                            var captionText = "We have found a perfect offer for you. Please check this.\n";
                            var reply = new builder.Message()
                                .setText(session, captionText)
                                .addAttachment({
                                    text: "150/150 Mbps Internet + Custom TV + Phone starting at $89.99/mo",
                                    title: session.userData.selectedOffer + " offer for Internet",
                                    titleLink: "http://www.verizon.com/home/fios-fastest-internet/",
                                    contentType: "image/jpeg",
                                    contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/mob_ocw_ftp_ofr2_0403.png"                                    
                                });
                            //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                            session.send(reply);
                            builder.Prompts.confirm(session, + "Do you like to proceed?\nPlease confirm " + session.userData.name);
                            break;

                        case "phone":
                            var captionText = "We have found a perfect offer for you. Please check this.\n";
                            var reply = new builder.Message()
                                .setText(session, captionText)
                                .addAttachment({
                                    text: "100/100 Mbps Internet + Custom TV + Phone starting at $69.99/mo",
                                    title: session.userData.selectedOffer + " offer for Phone",
                                    titleLink: "http://www.verizon.com/home/fios-fastest-internet/",
                                    contentType: "image/jpeg",
                                    contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/mob_ocw_ftp_ofr2_0403.png"
                                });
                            //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                            session.send(reply);
                            builder.Prompts.confirm(session, "Do you like to proceed?\nPlease confirm " + session.userData.name);
                            break;

                        default:
                            session.send("I am sorry, i did not understand your answser.");
                            //session.replaceDialog("/showOffer");
                            break;
                    }
                }
                else {
                    session.send("I am sorry, i did not understand your answser.");
                    //session.replaceDialog("/showOffer");
                }
            });
        }
    }
]);


//dialog.onDefault(builder.DialogAction.send("I am sorry, i did not understand your answser"));

//bot.listenStdin();
var server = restify.createServer();
//server.use(bot.verifyBotFramework({ appId: process.env.appId, appSecret: process.env.appSecret }));
server.use(bot.verifyBotFramework());
server.post("/api/messages", bot.listen());
server.listen(process.env.port, function () {
    console.log("%s listening to %s", server.name, server.url);
});
