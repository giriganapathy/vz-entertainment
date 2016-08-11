/*-----------------------------------------------------------------------------

-----------------------------------------------------------------------------*/

var builder = require('botbuilder');
var restify = require("restify");

var bot = new builder.BotConnectorBot();


//Setting up Restify Server.
var server = restify.createServer();
server.use(bot.verifyBotFramework({ appId: process.env.appId, appSecret: process.env.appSecret }));
server.post("/api/messages", bot.listen());

//Bots Dialogs...
bot.add('/', [
    function (session) {
        builder.Prompts.text(session, "Hello... What's your name?");
    },
    function (session, results) {
        session.userData.name = results.response;
        //builder.Prompts.number(session, "Hi " + results.response + ", How many years have you been coding?");
        var soap = require("soap");
        var url = "https://www98.verizon.com/foryourhome/vzrepair/flowengine/UFDGateway.asmx?wsdl";
        soap.createClient(url, function (err, client) {
            try {
                client.GetFlowUrl(function (err, result) {
                    //console.log("gg:" + result);
                    session.send("UFD Response:", result);
                });
            }
            catch (e) {
                console.log("error: " + e);
            }
        });
    }
]);

