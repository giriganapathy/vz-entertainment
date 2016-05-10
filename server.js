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



/*bot.use(function (session, next) {
    if (!session.userData.userNameReceivedFlag) {
        session.userData.userNameReceivedFlag = true;
        session.beginDialog("/userProfile");
    }
    else {
        next();
    }
});
*/

bot.add("/userProfile", [
    function (session, args, next) {
        if (!session.userData.nameAlreadyAsked) {
            builder.Prompts.text(session, "May i know your name please?");
        }
        else {
            next();
        }
    },
    function (session, results) {
        builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
            if (null != err) {
                session.endDialog("Unexpected error while parsing your answer. Try again after sometime!");
                return;
            }
            session.userData.nameAlreadyAsked = true;
            var entity = builder.EntityRecognizer.findEntity(entities, 'name');
            if (null != entity) {
                session.userData.name = entity.entity;
                session.beginDialog("/showOffer");
            }
            else {
                //session.send("I am sorry, i did not understand your answser. Please provide your name again.");
                //session.replaceDialog("/userProfile");
                session.userData.name = session.message.text;
                session.beginDialog("/showOffer");
            }
        });
    }
]);

//bot.add("/", dialog);

//bot.add("/showOffer", [
bot.add("/", [
    function (session, args, next) {
        if (!session.userData.selectedOffer) {
            //builder.Prompts.confirm(session, "Hello " + session.userData.name + "! Are you interested in " + currentOffer + " Offer?");
            builder.Prompts.confirm(session, "Hi! Are you interested in " + currentOffer + " Offer?");
        }
        else {
            next({ response: true });
        }
    },
    function (session, results, next) {
        if (true === results.response) {
            if (!session.userData.selectedOffer) {
                session.userData.selectedOffer = "FiOS Triple Play";
                builder.Prompts.text(session, "I appreciate your interest in  " + session.userData.selectedOffer + ". \n\n" +
                    "I would be glad to help you with available package and prices associated with it.\n\n" +
                    "May I have the address, including zip code, so that I can check service availability and pricing for your home?");
            }
            else {
                next({ response: session.message.text });
            }
        }
        else {
            session.send("ok. no problem., Thanks for checking with me. bye");
            delete session.userData.userNameReceivedFlag;
            delete session.userData.nameAlreadyAsked;
            delete session.userData.name;
            delete session.userData.selectedOffer;
            delete session.userData.zipCode;
            delete session.userData.serviceAvailable;
            session.endDialog();
        }
    },
    function (session, results, next) {
        if (results.response && !session.userData.zipCode) {
            var zipAndState = "";
            var zipCode = "";

            var userResponse = results.response;

            var zipAndStatePattern = "\\w{2}\\s\\d{5}";
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
                    builder.DialogAction.send("Allow me few moments to check available Internet and TV services at your location...");
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
                            //var msg = "Great! " + session.userData.selectedOffer + " is available in your address with the zip code:" + zipCode + "\n\n" +
                            //    "To recommend best plan, can u tell me your usage..like do u use internet more or tv...etc.";
                            var msg = "Great! Fios services are available at your location.\n\nLet me ask you few usage questions to help you select suitable Fios package.\n\n" +
                                "How many devices does your family connect to the Internet such as: cell phone, tablet, laptop, Smart TV, etc.? Also, do you do any gaming or stream any videos?"
                            builder.Prompts.text(session, msg);
                        }
                        else {
                            session.userData.serviceAvailable = false;
                            session.send("Sorry! " + session.userData.selectedOffer + " is unavailable in your address with the zip code:" + session.userData.zipCode + "\nPlease try again with different address and zip code!");
                            delete session.userData.zipCode
                        }
                    });
                }
            }
            else {
                //Pl. provide the valid zip code.
                //session.userData.zipCode = null;
                session.send("Sorry! " + "I dont see the zip code in the address you provided...\nPlease provide me the address with zip code.");
                //session.replaceDialog("/showOffer");
            }
        }
        else {
            if (!session.userData.serviceAvailable) {
                session.send("Sorry! " + session.userData.selectedOffer + " is unavailable in your address with the zip code:" + session.userData.zipCode + "\nPlease try again with different address and zip code!");
                delete session.userData.zipCode
            }
            else {
                next({ response: session.message.text });
            }
        }
    },
    function (session, results, next) {
        if (results.response && !session.userData.numberOfDevices) {
            builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
                if (null != err) {
                    session.endDialog("Unexpected error while parsing your answer. Try again after sometime!");
                    return;
                }
                var entity = builder.EntityRecognizer.findEntity(entities, 'builtin.number');
                if (null != entity) {
                    var numberOfDevices = entity.entity;
                    if (null != numberOfDevices) {
                        session.userData.numberOfDevices = numberOfDevices;
                        var msg = "May I know your must have channels to help you select suitable Fios TV plan?";
                        builder.Prompts.text(session, msg);
                    }
                    else {
                        session.send("I am sorry, i did not understand your answser... How many devices does your family connect to the Internet such as: cell phone, tablet, laptop, Smart TV, etc.?");
                    }
                }
                else {
                    session.send("I am sorry, i did not understand your answser... How many devices does your family connect to the Internet such as: cell phone, tablet, laptop, Smart TV, etc.?");
                }
            });
        }
    },
    function (session, results, next) {
        if (results.response && !session.userData.selectedPlan) {
            builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
                if (null != err) {
                    session.endDialog("Unexpected error while parsing your answer. Try again after sometime!");
                    return;
                }
                var entity = builder.EntityRecognizer.findEntity(entities, 'channel-type');
                if (null != entity) {
                    var channelType = entity.entity;
                    if (null != channelType) {
                        switch (channelType) {

                            case "sports":
                                session.userData.selectedPlan = "Custom TV Sports";
                                session.userData.selectedChannel = "sports";

                                var captionText = "Based on what we discussed, I'd recommend:\n[Custom TV - Sports & More Plan](http://www.verizon.com/home/fiostv/)\n" +
                                    "Catch the best live sports plus lifestyle and entertainment channels for $64.99 mo plus taxes and other fees.";
                                var reply = new builder.Message()
                                    .setText(session, captionText)
                                    .addAttachment({
                                        text: "Custom TV - Sports & More Plan",
                                        title: "",
                                        titleLink: "",
                                        contentType: "image/jpeg",
                                        contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/customtv-sportsmore-7-logos.png"
                                    });
                                //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                                session.send(reply);
                                builder.Prompts.confirm(session, "Do you like to proceed with the plan " + session.userData.selectedPlan + "?\nPlease confirm.");
                                break;

                            case "entertainment":
                                session.userData.selectedPlan = "Ultimate HD Plan";
                                session.userData.selectedChannel = "entertainment";

                                var captionText = "Based on what we discussed, I'd recommend:\n[Ultimate HD Plan](http://www.verizon.com/home/fiostv/)\n" +
                                    "Our most popular package, for total entertainment junkies. Get access to all of the top sports and movies for $89.99 mo plus taxes and other fees.";
                                var reply = new builder.Message()
                                    .setText(session, captionText)
                                    .addAttachment({
                                        text: "Ultimate HD Plan",
                                        title: "",
                                        titleLink: "",
                                        contentType: "image/jpeg",
                                        contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/fios-ultimate-hd-channels-n.png"
                                    });
                                //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                                session.send(reply);
                                builder.Prompts.confirm(session, "Do you like to proceed with the plan " + session.userData.selectedPlan + "?\nPlease confirm.");

                                break;
                            case "news":
                                session.userData.selectedPlan = "Custom TV Essential Plan";
                                session.userData.selectedChannel = "news";

                                var captionText = "Based on what we discussed, I'd recommend:\n[Custom TV Essential Plan](http://www.verizon.com/home/fiostv/)\n" +
                                    "Get a mix of your favorite original series, news and family channels for $64.99 mo plus taxes and other fees.";
                                var reply = new builder.Message()
                                    .setText(session, captionText)
                                    .addAttachment({
                                        text: "Custom TV Essential Plan",
                                        title: "",
                                        titleLink: "",
                                        contentType: "image/jpeg",
                                        contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/customtv-essentials-logos-4-16.png"
                                    });
                                session.send(reply);
                                builder.Prompts.confirm(session, "Do you like to proceed with the plan " + session.userData.selectedPlan + "?\nPlease confirm.");
                                break;
                            case "music":
                                session.userData.selectedPlan = "Preferred HD Plan";
                                session.userData.selectedChannel = "music";

                                var captionText = "Based on what we discussed, I'd recommend:\n[Preferred HD Plan](http://www.verizon.com/home/fiostv/)\n" +
                                    "Watch exciting sports, music, comedy and travel – there’s never a dull moment for $74.99 mo plus taxes and other fees.";
                                var reply = new builder.Message()
                                    .setText(session, captionText)
                                    .addAttachment({
                                        text: "Preferred HD Plan",
                                        title: "",
                                        titleLink: "",
                                        contentType: "image/jpeg",
                                        contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/verizon-ftv-preferred-hd-logos.jpg"
                                    });
                                session.send(reply);
                                builder.Prompts.confirm(session, "Do you like to proceed with the plan " + session.userData.selectedPlan + "?\nPlease confirm.");
                                break;

                            case "local":
                                session.userData.selectedPlan = "FiOS TV Local Plan";
                                session.userData.selectedChannel = "local";

                                var captionText = "Based on what we discussed, I'd recommend:\n[FiOS TV Local Plan](http://www.verizon.com/home/fiostv/)\n" +
                                    "Get your core local channels with great local news, entertainment, variety and more for $10.00 mo plus taxes and other fees.";
                                var reply = new builder.Message()
                                    .setText(session, captionText)
                                    .addAttachment({
                                        text: "FiOS TV Local Plan",
                                        title: "",
                                        titleLink: "",
                                        contentType: "image/jpeg",
                                        contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/verizon-ftv-local-hd.jpg"
                                    });
                                session.send(reply);
                                builder.Prompts.confirm(session, "Do you like to proceed with the plan " + session.userData.selectedPlan + "?\nPlease confirm.");

                                break;

                            default:
                                session.send("I am sorry, i did not understand your answser... Please tell me your must have channels again.");
                                break;
                        }
                    }
                    else {
                        session.send("I am sorry, i did not understand your answser... May I know your must have channels to help you select suitable Fios TV plan?");
                    }
                }
                else {
                    session.send("I am sorry, i did not understand your answser... May I know your must have channels to help you select suitable Fios TV plan?");
                }
            });
        }
    },

    /*function (session, results, next) {
        if (results.response) {
            builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
                if (null != err) {
                    session.endDialog("Unexpected error while parsing your answer. Try again after sometime!");
                    return;
                }
                var entity = builder.EntityRecognizer.findEntity(entities, 'sub-product');
                if (null != entity) {
                    switch (entity.entity) {
                        case "tv":
                            var captionText = "We have found a perfect offer for you. Please check this.\n[50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo](http://www.verizon.com/home/fiostv/)";
                            //var newText = "We have found a perfect offer for you. Please check this.\n ![](http://www.verizon.com/cs/groups/public/documents/adacct/tv-internet-phone.png =100x100) [50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo](http://www.verizon.com/home/fiostv/)";
                            
                            var reply = new builder.Message()
                                .setText(session, captionText)
                                .addAttachment({
                                    text: "50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo",
                                    title: session.userData.selectedOffer + " offer for TV",
                                    titleLink: "http://www.verizon.com/home/fiostv/",
                                    contentType: "image/jpeg",
                                    contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/tv-internet-phone.png"                                    
                                });
                                //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                            session.send(reply);
                            builder.Prompts.confirm(session, "Do you like to proceed " + session.userData.name + "?\nPlease confirm." );
                            break;
                        case "internet":                            
                            var captionText = "We have found a perfect offer for you. Please check this.\n[150/150 Mbps Internet + Custom TV + Phone starting at $89.99/mo](http://www.verizon.com/home/fios-fastest-internet/)";
                            var reply = new builder.Message()
                                .setText(session, captionText)
                                .addAttachment({
                                    text: "150/150 Mbps Internet + Custom TV + Phone starting at $89.99/mo",
                                    title: session.userData.selectedOffer + " offer for Internet",
                                    titleLink: "http://www.verizon.com/home/fios-fastest-internet/",
                                    contentType: "image/jpeg",
                                    contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/tv-internet-phone.png"                                    
                                });
                            //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                            session.send(reply);
                            builder.Prompts.confirm(session, "Do you like to proceed " + session.userData.name + "?\nPlease confirm." );
                            break;

                        case "phone":
                            var captionText = "We have found a perfect offer for you. Please check this.\n[100/100 Mbps Internet + Custom TV + Phone starting at $69.99/mo](http://www.verizon.com/home/fios-fastest-internet/)";
                            var reply = new builder.Message()
                                .setText(session, captionText)
                                .addAttachment({
                                    text: "100/100 Mbps Internet + Custom TV + Phone starting at $69.99/mo",
                                    title: session.userData.selectedOffer + " offer for Phone",
                                    titleLink: "http://www.verizon.com/home/fios-fastest-internet/",
                                    contentType: "image/jpeg",
                                    contentUrl: "http://www.verizon.com/cs/groups/public/documents/adacct/tv-internet-phone.png"
                                });
                            //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
                            session.send(reply);
                            builder.Prompts.confirm(session, "Do you like to proceed " + session.userData.name + "?\nPlease confirm." );
                            break;

                        default:
                            session.send("I am sorry, i did not understand your answser... Please tell me which one do you use more..like internet/tv/phone...");
                            //session.replaceDialog("/showOffer");
                            break;
                    }
                }
                else {
                    session.send("I am sorry, i did not understand your answser... Please tell me which one do you use more..like internet/tv/phone...");
                    //session.replaceDialog("/showOffer");
                }
            });
        }
    },*/
    function (session, results) {
        if (results.response) {
            //session.send("Please click the Terms of Service Page.");            
            var captionText = "Please click the [Terms of Service](http://www.verizon.com/about/terms-conditions/overview) Page.\n";
            var reply = new builder.Message()
                .setText(session, captionText)
                .addAttachment({
                    text: "Terms of Service",
                    title: "Terms of Service",
                    titleLink: "http://www.verizon.com/about/terms-conditions/overview",
                    contentType: "image/jpeg",
                    contentUrl: "http://www.verizon.com/about/sites/default/files/terms-of-service.png"
                });
            //session.send("50/50 Mbps Internet + Custom TV + Phone starting at $79.99/mo");
            session.send(reply);

            delete session.userData.userNameReceivedFlag;
            delete session.userData.nameAlreadyAsked;
            delete session.userData.name;
            delete session.userData.selectedOffer;
            delete session.userData.zipCode;
            delete session.userData.serviceAvailable;
            delete session.userData.numberOfDevices;
            delete session.userData.selectedPlan;
            delete session.userData.selectedChannel;

            session.endDialog();

        }
        else {
            session.send("Ok. Thank you!\n\nYou can tell your usage again please!");
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
