//======================================================================================
/*
	This is a Dicord Bot for SAMP Servers written in Node.js
	Bot Version: 2.1
	Author: Abhay SV Aka DuskFawn Aka Perfectboy. 
*/
//=======================================================================================

//______________________[Discord JS and SAMP Query Library]______________________________
const Discord = require('discord.js');
const client = new Discord.Client();

var query = require('samp-query');

var crypto = require('crypto');
//creating hash object 


//_____________________________[BOT Configuration]_________________________________________
//@audit Settings

const botVer = "2.1.3";
const botChar = "/"; // Bot prefix character
let Samp_IP = "51.178.138.254";
let Samp_Port = 7777;
let Community_Tag ="WG";


let userToSubmitApplicationsTo = '710195458680684695';//Default Channel Id for User Applications
let reportChannelID = '714432112031170562'; // Channel for the ingam reports
let adminCmdsChannelID = '710195250911641741'; // Admin Cmds channel
let botCmdsChannelID = '710194727898579014'; // BOT Cmds channel
let Bot_debug_mode = false;

//_______________________________[APPLICATIONS]______________________________________________
let applicationQuestions = require("./application-questions.js"); //This .js file has the default questions
let usersApplicationStatus = [];
let appNewForm = [];
let isSettingFormUp = false;

//______________________________[SAMP Server MySQL Connection]________________________________
const mysql = require("mysql");
const { promises } = require('dns');
var db = mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASS,
    database: process.env.SQL_DB,
});

//_______________________________[BOT Startup]_________________________________________________
//@audit-ok Client Ready
client.on('ready', () => {

    console.log('Dumbledore Woke Up from sleep!');
	console.log(`Logged in as ${client.user.tag}!`);

	client.user.setPresence({
        status: 'online',
        activity: {
            name: "https://github.com/Warfare-Gaming/WG-Bot-Dumbledore",
            type: "PLAYING",
			url: "https://github.com/Warfare-Gaming/WG-Bot-Dumbledor"
        }
    });

	setTimeout(getLastReportId, 1000);
	setInterval(ReportSync, 20000);
	client.channels.cache.get(adminCmdsChannelID).send(`Dumbledore Woke Up from sleep! Version: ${botVer} `);
	if (Bot_debug_mode)
	{
		client.channels.cache.get(adminCmdsChannelID).send("Disclaimer: Bot Currently In Development Mode , might be unstable");
	} 
	

});
//-----------------------------[Debug]-----------------------------------
function toggle_debug() 
{
	if (Bot_debug_mode) 
	{
	  Bot_debug_mode = false;
	  console.log(`[DEBUG]: Debug Mode Disabled`);
	  return;
	} 
	Bot_debug_mode = true;
	console.log(`[DEBUG]: Debug Mode Enabled`);
	
}
//________________________[User Verification System]_______________________
//@audit-info Verify System

client.on("guildMemberAdd", member => {
	let server = client.guilds.cache.get('710189407428280331');
	var memberRole= server.roles.cache.find(role => role.name === "Verified");
	var unverifiedRole= server.roles.cache.find(role => role.name === "Unverified");
	if (Date.now() - member.user.createdAt < 1000*60*60*24*30) {
	  member.roles.add(unverifiedRole);
	}
  });
function verify_user(msg,params) 
{	
	if (msg.guild)
	{	
		msg.author.send("Welcome to Warfare Gaming. To verify your account use /verify");
		msg.author.send("Usage: /verify [ingame-name] [password]");
		return msg.reply("You can only you this cmd in DM\n Do you want your pass to be visible to everyone ?\n If no please DM me /verify \nUsage: /verify [ingame-name] [password]");
	} 
	if(!params[0] || !params[1]) return msg.channel.send("Usage: /verify [ingame-name] [password]");
	
	var uname = params[0],
	pass = params[1],
	user_salt = "SALT_HERE",
	user_hash = "HASH_HERE";

	db.query("SELECT * FROM Accounts WHERE Nick = ? LIMIT 1",
		[uname], function(err,row) {
			if(!row) return console.log(`[ERROR]SQL Error(Verify):${err}`);
			if(!row.length) return msg.channel.send(`No User Account found : ${uname}`);
		
			user_salt = row[0].Salt;
			user_hash = row[0].Password;
			var hash = crypto.createHash('whirlpool');
			data = hash.update(`${user_salt}${pass}`, 'utf-8');
			gen_hash= data.digest('hex');

			if(gen_hash.toUpperCase() !== user_hash) return msg.channel.send("Password Is Incorrect");
			if(row[0].Score < 500) return msg.channel.send(`You currentlu have only ${row[0].Score} Score. Minimum score needed for verification 500`);
			check_verify_status(row,msg);

	});
	
	
}
function set_user_verified(msg,ingame_id) 
{
	userid = msg.author.id;
	let server = client.guilds.cache.get('710189407428280331');
	var memberRole= server.roles.cache.find(role => role.name === "Verified");
	var unverifiedRole= server.roles.cache.find(role => role.name === "Unverified");
	let member = server.members.cache.get(userid);

	
	db.query("INSERT INTO `discord_verification` (`Ingame_Id`, `Discord_Id`) VALUES (?, ?)",
	[ingame_id,userid], function(err,row) {
		if(err){
			msg.channel.send("Discord ID already Verifed to another user");
			msg.channel.send("Verification Failed");
			return;
		}	
		member.roles.add(memberRole);
		member.roles.remove(unverifiedRole);
		const embedColor = 0x00ff00;
					
		const logMessage = {
			embed: {
				title: "Account Sucessfully Verfied",
				color: embedColor,
				fields: [
					{ name: 'Inagme Account ID', value: ingame_id, inline: true },
				],
			}
		}
		msg.channel.send(logMessage);
		return 1;		
	});
	return 1;
}
function check_verify_status(results,msg) {


	db.query("SELECT * FROM discord_verification WHERE Ingame_Id = ? LIMIT 1",
	[results[0].id], function(err,row) {
		if(!row){
		console.log(`[ERROR]SQL Error(Verify):${err}`);
		msg.channel.send("Verification Failed Contact Admin");
		return;
		}
		if(row.length){
		if(msg.author.id == row[0].Discord_Id)	return msg.channel.send("Dont waste my time noob you are already verified");
		msg.channel.send(`The Ingame Account ${results[0].Nick} is already linked to Discord ID: ${row[0].Discord_Id}`);	
		msg.channel.send("If this is a mistake please contact Admins");
		msg.channel.send("Verification Failed");
		return;
		}
		set_user_verified(msg,results[0].id)
	});

}


//________________________[FUN STUFF& MISC STUFF]__________________________
//@audit-info Fun CMDS
function PlayerInfo(msg,params)
{
	permcheck = (msg.guild) ? true : false;

	if(!permcheck) return msg.channel.send("This command can only be used in a channel");
	if (!params) return msg.channel.send("Usage: /playerinfo [inagme-name]");
	
	db.query("SELECT * FROM Accounts WHERE Nick = ? LIMIT 1",
     [params], function(err,row) {
		if(!row) return console.log(`[ERROR]SQL Error(PlayerInfo):${err}`);
		if(!row.length) return msg.channel.send("No user found with that name");
		const embedColor = 0xffff00;
		kd_ratio = row[0].Kills/row[0].Deaths;
		profile_url = `https://ucp.warfare-gaming.com/website/player-info?p=${row[0].id}`
		const logMessage = {
			embed: {
				title: `Account Information for User: ${row[0].Nick}`,
				color: embedColor,
				fields: [
					{ name: 'Score', value: row[0].Score, inline: true },
					{ name: 'Money', value: row[0].Money, inline: true },
					{ name: 'K/D', value: kd_ratio, inline: true },
					{ name: 'Profile', value: profile_url, inline: true },
				],
			}
		}
		msg.channel.send(logMessage);
	});

}
function PlayerSign(msg,params)
{
	permcheck = (msg.guild) ? true : false;

	if(!permcheck) return msg.channel.send("This command can only be used in #bit-cmds channel");
	if (!params) return msg.channel.send("Usage: /signature [inagme-name]");
	
	db.query("SELECT * FROM Accounts WHERE Nick = ? LIMIT 1",
     [params], function(err,row) {
		if(!row) return console.log(`[ERROR]SQL Error(signature):${err}`);
		if(!row.length) return msg.channel.send("No user found with that name");

		profile_url = `https://ucp.warfare-gaming.com/website/signature/u/${row[0].id}`

		msg.channel.send(profile_url);
	});

}
//________________________[Inagme Report Sync]_____________________________
//@audit-info Report Sys
var last_report = 0;
function getLastReportId()
{
    db.query("SELECT * FROM `log_reports` ORDER BY `log_reports`.`id` DESC LIMIT 1",
     [], function(err,row) {
		if(!row) return console.log(`[ERROR]SQL Error(GetLastReportId):${err}`);
		
		last_report = parseInt(row[0].id);
		if(Bot_debug_mode)
			console.log(`[DEBUG]Last Report id:${last_report}`);
	});

}
function ReportSync()
{
    db.query(`SELECT * FROM log_reports WHERE id > ${last_report}`,
     [], function(err,row) {
		if(!row) return console.log(`[ERROR]SQL Error(GetLastReportId):${err}`); 
		if(!row.length && Bot_debug_mode) return console.log(`[DEBUG] No New Reports Found Using ${last_report}`);
		for (var i = 0; i < row.length; i++) 
		{
			last_report = parseInt(row[i].id);
			const embedColor = 0xff0000;
			
			const logMessage = {
				embed: {
					title: row[i].report,
					color: embedColor,
					fields: [
						{ name: 'Time:', value: row[i].time, inline: true },
					],
				}
			};
			client.channels.cache.get(reportChannelID).send(logMessage);
			
		}		
	});

}
//________________________[Inagme Functions]_____________________________
function GetPlayersOnline(msg) 
{
	var options = {
		host: Samp_IP,
		port: Samp_Port
	};

	query(options, function (error, response) {
		if(error)
		{
			console.log(error)
			const embedColor = 0xff0000;
			
			const logMessage = {
				embed: {
					title: 'I wasent expecting that , Please try again later',
					color: embedColor,
					fields: [
						{ name: 'Error:', value: error, inline: true },
					],
				}
			}
			msg.channel.send(logMessage)
			
		}    
		else
		{   
			var str = "Server Info";
			var value = str.concat(' IP: ',response['address'],' Players Online: ',response['online'],'/',response['maxplayers']); 
			const embedColor = 0x00ff00;

			const logMessage = {
				embed: {
					title: 'Server Information',
					color: embedColor,
					fields: [
						{ name: 'Server IP', value: response['address'], inline: true },
						{ name: 'Players Online', value: response['online'], inline: true },
						{ name: 'Max Players', value: response['maxplayers'], inline: true },
					],
				}
			}
			msg.channel.send(logMessage)
			if(Bot_debug_mode)
				console.log(value)
		}    
	})

}
//@audit-info Online Helpers
function get_online_helpers(msg)
{
	permcheck = (msg.channel.id === adminCmdsChannelID) ? true : false;

	if(!permcheck) return msg.reply("This command can only be used the admin bot channel.");
		
	var sqlq = "SELECT `id`,`Nick`,`Online`,`HelperLv` FROM `Accounts` WHERE `HelperLv` = 1 AND `Online` = 1";	

	db.query(sqlq,
	[], function(err,row) {
		
		if(Bot_debug_mode)
			console.log(sqlq);
		if(!row) return console.log(`[ERROR]SQL Error(HELPERcheck):${err}`);
		if(!row.length) return client.channels.cache.get(adminCmdsChannelID).send("No helpers online !!!");	
	
		let i = 0, helpers = "";

		for (; i < row.length; i++) {
			helpers += `${row[i].Nick}: ${row[i].HelperLv}\n`;
		}
				
	
		const embedColor = 0xffff00;
			
		const logMessage = {
			embed: {
				title: `List of In-game Helpers`,
				color: embedColor,
				fields: [
					{ name: 'Helper', value: helpers, inline: true },
				],
			}
		};
		client.channels.cache.get(adminCmdsChannelID).send(logMessage);
	});
  
	
	
}
//@audit-info Online Admins
function get_online_admins(msg)
{
	permcheck = (msg.channel.id === adminCmdsChannelID) ? true : false;
	if(!permcheck) return msg.reply("This command can only be used the admin bot channel.");

		
	var	sqlq = "SELECT `id`,`Nick`,`Online`,`Admin` FROM `Accounts` WHERE `Admin` > 0 AND `Online` = 1 ORDER BY `Accounts`.`Admin` DESC";
		

	db.query(sqlq,
	[], function(err,row) {
		if(!row) return console.log(`[ERROR]SQL Error(ADMcheck):${err}`);
		if(!row.length) return client.channels.cache.get(adminCmdsChannelID).send("No admins online !!!"); 
		
		if(Bot_debug_mode)
			console.log(sqlq);

		let i = 0, admins = "";

		for (; i < row.length; i++) {
			admins += `${row[i].Nick}: ${row[i].Admin}\n`;
		}

		const embedColor = 0xffff00;
			
		const logMessage = {
			embed: {
				title: `List of In-game Admins`,
				color: embedColor,
				fields: [
					{ name: 'Admins', value: admins, inline: true },
				],
			}
		};
		client.channels.cache.get(adminCmdsChannelID).send(logMessage);	   
	   
	});

}
//@audit-info BAN Functions
function sBAN(msg,params)
{
	permcheck = (msg.channel.id === adminCmdsChannelID) ? true : false;
	if (params && permcheck) 
    {
		var sqlq;
		if(!isNaN(params))
			sqlq = `SELECT * FROM banlog WHERE name = '${params}' OR id = '${params}' LIMIT 1`;
		else sqlq = `SELECT * FROM banlog WHERE name = '${params}' LIMIT 1`;

		db.query(sqlq,
		[], function(err,row) {
		   if(row)
		   { 	if(Bot_debug_mode)
					console.log(sqlq);
				if(row.length)
				{
					if(Bot_debug_mode)
						console.log(`[DEBUG]Ban ID:${parseInt(row[0].id)}`);
					const embedColor = 0xffff00;
					const date = new Date(row[0].bantime * 1000);
					const logMessage = {
						embed: {
							title: `Active Ban Forund on Account ${row[0].name}`,
							color: embedColor,
							fields: [
								{ name: 'Ban ID', value: row[0].id, inline: true },
								{ name: 'Admin', value: row[0].admin, inline: true },
								{ name: 'Reason', value: row[0].reason, inline: true },
								{ name: 'Expiry(EPOCH)', value: date, inline: true },
							],
						}
					}
					client.channels.cache.get(adminCmdsChannelID).send(logMessage);
				}
				else
				client.channels.cache.get(adminCmdsChannelID).send("No ban found !!!");   
		   }
		   else 
			   console.log(`[ERROR]SQL Error(sBAN):${err}`);
	   
	   	});
  
	} else if (!permcheck) {
		msg.reply("This command can only be used the admin bot channel.");
	} else {
		msg.channel.send("Usage : /sban [BAN-ID/InGame-Name].");
	}
	
}

function uBAN(msg,params)
{
	permcheck = (msg.channel.id === adminCmdsChannelID) ? true : false;
	if (params && permcheck) 
    {
		var sqlq;
		if(!isNaN(params))
			sqlq = `SELECT * FROM banlog WHERE name = '${params}' OR id = '${params}' LIMIT 1`;
		else sqlq = `SELECT * FROM banlog WHERE name = '${params}' LIMIT 1`;

		db.query(sqlq,
		[], function(err,row) {
		   if(row)
		   { 	if(Bot_debug_mode)
					console.log(sqlq);
				if(row.length)
				{
					if(Bot_debug_mode)
						console.log(`[DEBUG]BAN id:${parseInt(row[0].id)}`);
					uBAN_Process(row[0].id)
					
				}
				else
				client.channels.cache.get(adminCmdsChannelID).send("No ban found !!!");   
		   }
		   else 
			   console.log(`[ERROR]SQL Error(uBAN):${err}`);
	   
	   	});
  
	} else if (!permcheck) {
		msg.reply("This command can only be used the admin bot channel.");
	} else {
		msg.channel.send("Usage : /unban [BAN-ID/InGame-Name].");
	}
	
}
function uBAN_Process(banid)
{

	var sqlq;
	sqlq = `DELETE FROM banlog WHERE id = '${banid}'`;
		
	db.query(sqlq,
	[], function(err,row) {
		if(row)
		{ 	
			if(Bot_debug_mode)
				console.log(sqlq);
			client.channels.cache.get(adminCmdsChannelID).send(`The user has been unbanned`); 
		}
		else 
			console.log(`[ERROR]SQL Error(uBAN_Process):${err}`);
	   
	});
  
	
}
function Offline_Ban(msg,params) {
	permcheck = (msg.channel.id === adminCmdsChannelID) ? true : false;
	if(!permcheck) return msg.reply("This command can only be used the admin bot channel.");
	if(!params[0] || !params[1]) return msg.channel.send("Usage: /offlineban [ingame-name] [reason]");
	
	var offender = params[0],
	reason = params[1];

	db.query("INSERT INTO `banlog` (`id`, `name`, `admin`, `ip`, `iprange`, `gpci`, `reason`, `time`, `bantime`) VALUES (NULL, ?, ?, 'Game-Ban', '0.0.0.', 'Game Ban', ?, CURRENT_TIMESTAMP, UNIX_TIMESTAMP(now())+2592000)",
	[offender,msg.author.username,reason], function(err,row) {
		if(err){
			msg.channel.send("Could Not ban user please try gain later");
			return;
		}	
		sBAN(msg,offender);
		return 1;		
	});

}

//_____________________[APPLICATION SYSTEM FUCNTIONS]_____________________________________

const applicationFormCompleted = (data) => {
	let i = 0, answers = "";

	for (; i < applicationQuestions.length; i++) {
		answers += `${applicationQuestions[i]}: ${data.answers[i]}\n`;
	}

    const embedColor = 0xffff00;

    const logMessage = {
        embed: {
            title: `${Community_Tag} APPLICATION SUBMISSION BY ${data.user.username}`,
            color: embedColor,
            fields: [
                { name: 'Application Content', value: answers, inline: true },
            ],
        }
    }
    client.channels.cache.get(userToSubmitApplicationsTo).send(logMessage);
};

const addUserToRole = (msg, roleName) => {
	if (roleName === "Admin") {
		msg.reply("Stop trying to commit mutiny.")
		return;
	}

	if (roleName && msg.guild) {
		const role = msg.guild.roles.find("name", roleName);

		if (!role) {
			msg.member.roles.add(role);

			msg.reply(`Added you to role: '${roleName}'`);
		} else {
			msg.reply(`Role '${roleName}' does not exist.`);
		}
	} else if (!msg.guild) {
		msg.reply("This command can only be used in a guild.");
	} else {
		msg.reply("Please specify a role.");
	}
};

const sendUserApplyForm = (msg, appName) => {
	const user = usersApplicationStatus.find(user => user.id === msg.author.id);

    if (appName && msg.guild) 
    {
		
        if (!user) {
            msg.author.send(`Application commands: \`\`\`${botChar}cancel to cancel the app, ${botChar}redo to restart the app process\`\`\``);
            msg.author.send(applicationQuestions[0]);
            usersApplicationStatus.push({id: msg.author.id, currentStep: 0, answers: [], user: msg.author});
            msg.channel.send(`You Application process is started in DM.`);
        } else if(applicationQuestions[user.currentStep]) {
            msg.author.send(applicationQuestions[user.currentStep]);
        } else {
            msg.channel.send(`You Application is already sumbitted and is under review.`);
        }

	} else if (!msg.guild) {
		msg.reply("This command can only be used in a guild.");
	} else {
		msg.reply(`Usage : $apply [Application Type]. \n Application Open are ${Community_Tag}-TAG \n Example Usage: $apply ${Community_Tag}-TAG `);
	}
    
    

};
//@tsd
const cancelUserApplicationForm = (msg, isRedo = false) => {
	const user = usersApplicationStatus.find(user => user.id === msg.author.id);

	if (user) {
		usersApplicationStatus = usersApplicationStatus.filter(el => el.id !== user.id)
		msg.reply("Application canceled.");
	} else if (!isRedo) {
		msg.reply("You have not started an application form yet.");
	}
};

const applicationFormSetup = (msg) => {
	if (!msg.guild) {
		msg.reply("This command can only be used in a guild.");
		return;
	}

	if (!msg.member.roles.find("name", "Admin")) {
		msg.reply("This command can only be used by an admin.");
		return;
	}

	if (isSettingFormUp) {
		msg.reply("Someone else is already configuring the form.");
		return;
	}

	appNewForm = [];
	isSettingFormUp = msg.author.id;

	msg.author.send(`Enter questions and enter \`${botChar}endsetup\` when done.`);
};

const endApplicationFormSetup = (msg) => {
	if (isSettingFormUp !== msg.author.id) {
		msg.reply("You are not the one setting the form up.");
		return;
	}

	isSettingFormUp = false;
	applicationQuestions = appNewForm;
};


//______________________[APP-SYS END]___________________________________

//_______________________[GENERAL UTILITY CMDS]______________________________
//@audit-info Utility Cmds
const Clear_Messages = (msg,amount) => {

	if (!msg.guild) return msg.reply("This command can only be used in a guild.");

	if (!amount) return msg.channel.send("Usage: /clear [no of messages to clear]");
	
	if (isNaN(amount)) return msg.reply('The amount parameter isn`t a number!'); 

	if (amount > 100) return msg.reply('You can`t delete more than 100 messages at once!'); 
	if (amount < 1) return msg.reply('You have to delete at least 1 message!'); 

	const member = msg.guild.member(msg.author);
	if (!msg.guild.member(msg.author).hasPermission("MANAGE_MESSAGES")) 
	{
        msg.channel.send("Sorry, you don't have the permission to execute the command \""+msg.content+"\"");
        return;
	} else if (!msg.guild.member(client.user).hasPermission("MANAGE_MESSAGES")) 
	{
        msg.channel.send("Sorry, I don't have the permission to execute the command \""+msg.content+"\"");
        return;
    }

    
    if (msg.channel.type == 'text') {
        msg.channel.messages.fetch({limit : amount})
          .then(messages => {
            msg.channel.bulkDelete(messages);
            messagesDeleted = messages.array().length;

            msg.channel.send("Deletion of messages successful. Total messages deleted: "+messagesDeleted);
            console.log('Deletion of messages successful. Total messages deleted: '+messagesDeleted)
          })
          .catch(err => {
            console.log('Error while doing Bulk Delete');
            console.log(err);
        });
    }
	msg.channel.send(`No of messaes deleted ${amount}`)
};
const setChannel = (msg,param) => {
	if (!msg.guild) 
	{
		msg.reply("This command can only be used in a guild.");
		return;
	}

	if (!msg.member.roles.find("name", "Admin")) 
	{
		msg.reply("Only Members with Role **Admin** can do this.")
		return;
	}

	if(!param)
	{
		msg.channel.send("Usage: /setchannel [options] \n Avaliabe Options: reports apps adminchannel")
		return;
	}

	if(param == "reports")
	{
	reportChannelID = msg.channel.id;
	msg.channel.send("Ingame Reports will now be sent to this channel.")
	}
	if(param == "apps")
	{
	userToSubmitApplicationsTo = msg.channel.id;
	msg.channel.send("Form submissions will now be sent to this channel.")
	}
	if(param == "adminchannel")
	{
	adminCmdsChannelID = msg.channel.id;
	msg.channel.send("Admins can now use this channel for admin cmds.")
	}
};
const setSampIP = (msg,param) => {
	if (!msg.guild) 
	{
		msg.reply("This command can only be used in a guild.");
		return;
	}

	if (!msg.member.roles.find("name", "Admin")) 
	{
		msg.reply("Only Members with Role **Admin** can do this.")
		return;
	}

	if(!param)
	{
		msg.channel.send("Usage: /setip [ip without port] \n Example: /setip 127.0.0.1")
		return;
	}

	Samp_IP = param;
	msg.channel.send(`Server IP Set To : ${Samp_IP}`);

};
const setSampPort = (msg,param) => {
	if (!msg.guild) 
	{
		msg.reply("This command can only be used in a guild.");
		return;
	}

	if (!msg.member.roles.find("name", "Admin")) 
	{
		msg.reply("Only Members with Role **Admin** can do this.")
		return;
	}

	if(!param)
	{
		msg.channel.send("Usage: /setport [port] \n Example: /setport 7777")
		return;
	}
	if(!isNaN(param))
	{
		Samp_Port = Number(param);
		msg.channel.send(`Server Port Set To : ${Samp_Port}`);
	}	
	

};
const helpinfo = (msg) => {
	if (!msg.guild) 
	{
		msg.reply("This command can only be used in a guild.");
		return;
	}
	const embedColor = 0xffff00;
	pcmds = `\`\`\`${botChar}apply, ${botChar}players, ${botChar}ip, ${botChar}playerinfo, ${botChar}verify, ${botChar}help\`\`\``;
	acmds = `\`\`\`${botChar}setip, ${botChar}setport, ${botChar}setchannel, ${botChar}offlineban, ${botChar}sban, ${botChar}unban, ${botChar}clearmsg\`\`\``;

    const logMessage = {
        embed: {
            title: `Discord Bot DumbleDore Help Info`,
            color: embedColor,
            fields: [
				{ name: 'Player Cmds', value: pcmds, inline: true },
				{ name: 'Admin Cmds', value: acmds, inline: true },
            ],
        }
    }

	msg.channel.send(logMessage);

};


//______________________[COMMAND PROCESSOR]__________________________________
//@audit-ok Commands

client.on('message', msg => {

	//------------------------------[Medthod 1 For cmds]--------------------------------
    if (msg.content === 'dumbledore') 
    {

        msg.reply(`Hi Im Dumbledore ${Community_Tag} Bot`);

    }

    if (msg.content === '/ip') 
    {

        msg.reply(`Server IP: ${Samp_IP}`);
 
    }  
    //------------------------------[Medthod 2]-------------------------------------------
    if (msg.content.charAt(0) === botChar) {
		const request = msg.content.substr(1);
		let command, parameters = [];

		if (request.indexOf(" ") !== -1) {
			command = request.substr(0, request.indexOf(" "));
			parameters = request.split(" ");
			parameters.shift();
		} else {
			command = request;
		}

		switch (command.toLowerCase()) {
			case "apply":
				sendUserApplyForm(msg, parameters.join(" "));
				break;
			case "players":
				GetPlayersOnline(msg);
				break;
			case "cancel":
				cancelUserApplicationForm(msg);
				break;
			case "redo":
				cancelUserApplicationForm(msg, true);
				sendUserApplyForm(msg);
				break;
			case "setup":
				applicationFormSetup(msg);
				break;
			case "endsetup":
				endApplicationFormSetup(msg);
				break;
			case "setchannel":
				setChannel(msg, parameters.join(" "));
				break;
			case "help":
				helpinfo(msg);
				break;
			case "sban":
				sBAN(msg, parameters.join(" "));
				break; 
			case "unban":
				uBAN(msg, parameters.join(" "));
				break; 
			case "clearmsg":
					Clear_Messages(msg, parameters.join(" "));
					break;
			case "setip":
					setSampIP(msg, parameters.join(" "))
					break;
			case "setport":
					setSampPort(msg, parameters.join(" "))
					break;		 	
            case "ip":
					break;
			case "debug":
					toggle_debug()
					break;				
            case "admins":
					get_online_admins(msg)
					break;
			case "helpers":
				    get_online_helpers(msg)
				    break;
			case "verify":
					verify_user(msg, parameters)
					break;
			case "offlineban":
					Offline_Ban(msg, parameters)
					break;
			case "playerinfo":
					PlayerInfo(msg, parameters.join(" "))
					break;
			case "signature":
					PlayerSign(msg, parameters.join(" "))
					break;									
			default:
				
		}
	} else {
		if (msg.channel.type === "dm") {
			if (msg.author.id === isSettingFormUp) {
				appNewForm.push(msg.content);
			} else {
				const user = usersApplicationStatus.find(user => user.id === msg.author.id);

				if (user && msg.content) {
					user.answers.push(msg.content);
					user.currentStep++;

					if (user.currentStep >= applicationQuestions.length) {
						applicationFormCompleted(user);
						msg.author.send("Congratulations your application has been sent!");
					} else {
						msg.author.send(applicationQuestions[user.currentStep]);
					}
				}
			}
		}
	}  

});
//_____________________________________[END-SAMP CMDS]____________________________________________________________________
 

//====================== BOT TOKEN FROM ENV VAIABLE ===================================

client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret

//=====================================================================================
