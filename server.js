var http = require('http');
var connect = require('connect');
path = require("path");
var jsonfile = require('jsonfile');
var fs = require('fs');
var session = require('./node_modules/sesh/lib/core').magicSession();
var redis = require("redis"),
client = redis.createClient();
var _ = require('lodash');
var mkdirp = require('mkdirp');

fs.exists = fs.exists || require('path').exists;
fs.existsSync = fs.existsSync || require('path').existsSync;

var crypto = require('crypto'),
algorithm = 'aes-256-ctr',
password = 'asdkjkEjkajsdlkasd445446asd';
var app = connect();
var par;
var resCode;
var usrId;
var buUsrId;
var usrInfo;
var grpInfo;
var reqId;
var log;
var stat;
var backupInfo;
function encrypt(text, callback){
	var cipher = crypto.createCipher(algorithm,password);
	var crypted = cipher.update(text,'utf8','hex');
	crypted += cipher.final('hex');
	callback(crypted);
}

function decrypt(text, callback){

	var decipher = crypto.createDecipher(algorithm,password);
	var dec = decipher.update(text,'hex','utf8');
	dec += decipher.final('utf8');
	callback(dec);
}
function getPar(request, response, next) //Reads URL parameters to object and saves them to global variable "par"
{
	client.hget("config", "doBackup", function(err, reply){
		if(reply == "true") {
			client.hget("config", "autoBackupInterval", function(err, reply) {
				if(reply != "null") {
					client.hget("config", "latestBackup", function(err, latest){
						var d = new Date();
						if(Number(latest) + Number(reply) < d.getTime()/60000) {
							backupCache(function(status){
								console.log("Backing up");
								client.hset("config", "latestBackup", d.getTime()/60000);
							});
						}
					});
				}
			});
		}
	});
	par = request.url.slice(2);
	par = JSON.parse('{"' + decodeURI(par.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}');
	usrId = request.session.data.user;
	buUsrId = request.session.data.user;
	var d = new Date();
	client.hgetall("req", function (err, obj) {
		if(obj.time == d.getHours() + ':' + d.getMinutes()) {
			client.hincrby("req", "liveReq", 1);
		}
		else {
			client.hset("req", "totalReq", obj.liveReq);
			client.hset("req", "liveReq", 0);
			client.hset("req", "time", d.getHours() + ':' + d.getMinutes());
		}
	});
	if(par.origin == "login")
	{
		getRequest(function(code){
			resCode = code;
			next();
		}
		);
		
	}

	if(request.session.data.user != "Guest")
	{
		if(par.request == "attention")
		{
			setAttention(function(code){
				resCode = code;
				next();
			});
		}

		if(par.request == "log") {
			getUsrInfo(usrId, function(usrCache){
				if(usrCache.operator == "true") {
					getLog(function (code){
						resCode = code;
						next();
					});
				}
				else {
					resCode = 403;
					next();
				}
			});
		}

		if(par.request == "stats") {
			getUsrInfo(usrId, function(usrCache){
				if(usrCache.operator == "true") {
					if(par.term == "totalReq")
					{
						client.hgetall("req", function(err, reply) {
							stat = reply.totalReq;
							next();
						});
					}
					else {
						client.get(par.term, function(err, reply) {
							if(err) {
								client.incr('totalErr');
								client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested system stats but redis cache responded with error');
							}
							stat = reply;
							next();
						});
					}
				}
				else {
					stat = 403;
					next();
				}
			});
		}

		if(par.request == "backupInfo") {
			getBackupInfo(function(data){
				backupInfo = data;
				next();
			});
		}

		if(par.request == "backupStatus") {
			client.hgetall("fbackup", function(err, status){
				resCode = status;
				next();
			});
		}

		if(par.request == "saveConfig") {
			saveConfig(par, function(data){
				resCode = data;
				next();
			});
		}

		if(par.request == "forceBackup") {
			console.log("FORCE REQUEST");
			client.hset("fbackup", "started", "true");
			backupCache(function(data){console.log(data);});
			resCode = "200";
			next();
		}

		if(par.request == "getAttention")
		{
			getAttention(function(code){
				resCode = code;
				next();
			});
		}

		if(par.request == "changeUsrInfo")
		{
			changeUsrInfo(par.term, par.value,par.id , function(code){
				resCode = code;
				next();
			});
		}

		if(par.request == "changeGrpInfo")
		{
			changeGrpInfo(par.term, par.value,par.id , function(code){
				resCode = code;
				next();
			});
		}

		if(par.origin == "crtGrp" && par.request == "crtGrp")
		{
			crtGrp(function(code){
				resCode = code;
				next();
			});
		}

		if(par.origin == "database")
		{
			if(par.request == "search")
			{
				searchDatabase(par.term, par.value, function(result){
				});
			}
		}



		if(par.origin == "crtUsr")
		{
			if(par.request == "crtUsr")
			{
				crtUsr(function(code){
					next();
				});
			}
		}

		if(par.origin == "usrMgr")
		{
			if(par.request == "totalUsers")
			{
				getUsrs(function(allUsers){
					resCode = allUsers;
					next();
				});
			}
		}

		if(par.origin == "grpMgr")
		{
			if(par.request == "totalGroups")
			{

				getGrp(function(allGrp){
					resCode = allGrp;
					next();
				});
			}
		}

		if(par.request == "grpInfo")
		{
			getGrpInfo(par.id, function(callback){
				grpInfo = callback;
				if(_.isNumber(callback)) {
					resCode = callback;
				}
				else {
					resCode = 200;
				}
				next();
			});
		}
		if(par.origin == "usrPage")
		{
			if(par.request == "usrName" || par.request == "usrInfo")
			{
				if(par.usrId !== undefined) {
					getUsrInfo(par.usrId, function(callback){
						usrInfo = callback;
						next();		
					});
				}
				else {
					getUsrInfo(usrId, function(callback){
						usrInfo = callback;
						next();		
					});
				}
			}

			if(par.request == "logout")
			{
				request.session.data.user = "Guest";
				next();
			}

			if(par.request == "isAdmin" || par.request == "isOp")
			{
				getUsrInfo(usrId, function(data){
					next();
				});
			}
		}
	}
}



function getRequest(callback) //Figures out what to do with request data
{
	if(par.origin == "login") //If request comes from login page
	{
		checkLogin(function(reg){
			callback(reg);
		});
	}
}

function getLog(callback) {
	client.lrange("log", 0,-1, function(err, lastNode){
		if(err) {
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested system log but redis cache responded with error!');
		}
		log = lastNode;
		callback(200);
	});	
}
/*
function getUsrInfo(callback)
{
	fs.readFile('cred/'+usrId, 'utf8', function (err, data) {
		console.log(usrId);
		if (err)
		{
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested user info but system responded with error');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>'+err);
			callback(503);
		}
		if(data != undefined)
		{
			usrInfo = JSON.parse(data);
			if(buUsrId != usrId) {
				client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font>User '+buUsrId+' requested user info for user '+usrInfo.cred.id);
			};
			var responseCache = usrInfo;
			if(buUsrId != usrInfo.cred.id) {
				usrId = buUsrId;
				getUsrInfo(function (checksumUser) {
					if(checksumUser.admin == "true") {
						callback(responseCache);
					}
					else {
						console.log(403)
						callback(403);
					}
				});
			}
			if(buUsrId == responseCache.cred.id) {
				console.log("loopety loop")
				callback(responseCache);
			}
			else {
				console.log(403)
				callback(403);
			}
		}
	});
}*/

function getUsrInfo(usr, callback) {
	client.hgetall(usrId, function (err, obj){
		if(err) {
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>Couln\'t find user '+usrId);
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>'+err);
			callback(503);
		}
		client.hgetall(usr, function (err, usrInfo) {
			if(obj.admin == "true" || obj.operator == "true" || obj.id == usrInfo.id) {
				if(err) {
					client.incr('totalErr');
					client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>Couln\'t find user '+usr);
					client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>'+err);
					callback(503);
				}
				else {
					callback(usrInfo);
				}
			}
			else {
				callback(403);
			}
		});
	});
}

function getGrpInfo(id, callback)
{
	getUsrInfo(usrId, function(usr){
		client.hgetall('grp'+id, function(err, grpInfo) {
			if (err)
			{
				client.incr('totalErr');
				client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested group info but system responded with error');
				client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>'+err);
				callback(503);
			}
			if(grpInfo !== undefined)
			{
				if(usr.admin == "true" || grpInfo.leader == usr.id) {
					client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font>User '+buUsrId+' requested group info for group '+grpInfo.name);
					resCode = 200;
					callback(grpInfo);
				}
				else {
					resCode = 403;
					callback(403);
				}
			}
		});
	});
}

function changeUsrInfo(term, value, id, callback)
{
	getUsrInfo(usrId, function(usr){
		getUsrInfo(id, function(data){
			if(usr.admin == "true")
			{
				client.lpush('log', '['+Date()+'] <font class="err">[ADMIN]</font>User '+buUsrId+' changed '+data.name+'\'s '+term+' to '+value);
				if(term == 'id')
				{
					data.id = value;
					id = value;
				}
				if(term == 'email')
				{
					value = value.replace(/%40/g, "@");
				}

				if(term == "attentionResponse")
				{
					if(value !== undefined) {
						value = value.replace(/%3F/g, "?");
					}
				}

				client.HSET(id, term, value, function(err){
					if(err)
					{
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to save new user account but FS gave error: '+err);
						callback(403);
					}
					else{
						callback(200);
					}
				});
			}
		});
	});
}

function changeGrpInfo(term, value, id, callback)
{
	getUsrInfo(usrId, function(usr){
		getGrpInfo(id, function(data){
			if(usr.admin == "true")
			{
				client.HSET('grp'+id, term, value, function(err){
					if(err)
					{
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to save new group but FS gave error: '+err);
					}
					else{
						callback(200);
					}
				});
			}
		});
	});
}

function checkLogin(callback) //Needs somekind of lock function for encryptor but not big deal yet
{
	client.hgetall(par.id, function(err, usrInfo){
		if (err) {
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>System tried access "/cred" but FS gave error: '+err);
			callback(403);
		}
		if(usrInfo !== undefined)
		{
			encrypt(par.pass, function(usrPass){
				if(usrPass == usrInfo.pass && usrInfo.user == "true")
				{
					callback(200);
				}
				else
				{
					if(usrInfo.user != "true")
					{
						callback(410);
						console.log(usrInfo.name + " tried to log in with disabled account!");
					}
					callback(403);
					console.log(par.id+" had wrong password");
				}
			});
		}
		else
		{
			callback(403);
		}
	});
}


function toArray(data, callback)
{
	data = data.toString().split('\n');
	callback(data);
}

function getUsrs(callback)
{
	getUsrInfo(usrId, function(reqUsr){
		if(reqUsr !== undefined)
		{
			if(reqUsr.admin == "true")
			{
				client.lrange("users", 0, -1, function(err, files) {
					if (err) {
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to list all the users but couldn\'t reach it');
					}
					client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font> User '+buUsrId+' listed all users in system. Result was '+files.length);
					console.log(files);
					callback(files);
				});
			}
			else
			{
				callback(403);
			}
		}
		else
		{
			callback(403);
		}
	});
}

function getGrp(callback)
{
	getUsrInfo(usrId, function(reqUsr){
		if(reqUsr !== undefined)
		{
			if(reqUsr.admin == "true")
			{
				client.lrange("groups", 0, -1, function(err, reply){
					if(err) {
						console.log(err);
						callback(503);
					}
					callback(reply);
				});
			}
			else
			{
				callback(403);
			}
		}
		else
		{
			callback(403);
		}
	});
}

function crtUsr(callback)
{
	getUsrInfo(usrId, function(reqUsr){
		encrypt(par.pass, function(pass){
			if(reqUsr.admin == "true")
			{
				client.hset(par.id, "name", par.name);
				client.hset(par.id, "id", par.id);
				client.hset(par.id, "admin", par.admin);
				client.hset(par.id, "operator", par.op);
				client.hset(par.id, "staff", par.staff);
				client.hset(par.id, "user", "true");
				client.hset(par.id, "pass", pass);
				client.hset(par.id, "gsm", par.gsm);
				client.hset(par.id, "email", par.email);
				client.hset(par.id, "attention", "false");
				client.hset(par.id, "attentionReason", "undefined");
				client.hset(par.id, "attentionResponse", "undefined");
				client.rpush("users", par.id);
				client.lpush('log', '['+Date()+'] <font class="err">[ADMIN]</font> User '+buUsrId+' Created new user account '+par.id+' for '+par.name);
				callback(200);
			}
			else
			{
				callback(403);
			}
		});
	});
}

function crtGrp(callback)
{
	getUsrInfo(usrId, function(reqUsr){
		getGrp(function(id){
			if(reqUsr.admin == "true")
			{
				id = id.length + 1;
				console.log(par);
				client.hset('grp'+id, "name", par.name);
				client.hset('grp'+id, "id", id);
				client.hset('grp'+id, "leader", par.leader);
				client.hset('grp'+id, "description", par.description);
				client.hset('grp'+id, "location", par.location);
				client.hset('grp'+id, "gsm", par.gsm);
				client.rpush("groups", id);
				client.lpush('log', '['+Date()+'] <font class="err">[ADMIN]</font> User '+buUsrId+' Created new user account '+par.id+' for '+par.name);
				callback(200);
			}
			else
			{
				callback(403);
			}
		});
	});
}

function setAttention(callback)
{
	getUsrInfo(usrId, function(code){
		if(code!=403)
		{
			usrInfo = code;
			client.lpush('log', '['+Date()+'] User '+buUsrId+' set attention request.');
			client.hset(usrId, "attention", "true");
			client.hset(usrId, "attentionReason", par.comment.replace(/%3F/g, "?"));
			client.hset(usrId, "attentionResponse", "undefined");
			callback(200);
		}
	});
}

function getAttention(callback)
{
	var res1 = [];
	getUsrInfo(usrId, function(reqUsr){
		if(reqUsr.admin == "true")
		{
			client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font>User '+buUsrId+' is reading attentions.');
			var usrCache;
			getUsrs(function(users){
				var index = 1;
				users.forEach(function(user){
					getUsrInfo(user, function (usrCache) {
						if(usrCache.attention == "true" && usrCache.id != usrId)
						{
							res1.push(usrCache.id);

						}
						if(index == users.length)
						{
							callback(res1);
						}

						index++;
					});

				});

			});
		}
		else {
			callback(403);
		}
	});

}


function userArr(user, callback)
{
	var res1 = [];
	getUsrInfo(user, function (data) {
		if(usrCache.attention == "true")
		{
			res1.push(usrCache.id);

		}
		callback(res1);
	});

}

function backupCache(callback) {
	client.lrange("users", 0, -1, function(err, userList){
		if(err) {
			console.log(err);
		}
		if(par.request == "forceBackup") {
			getUsrInfo(usrId, function(user){
				if(user.operator != "true") {
					callback(403);
				}
				else {
					jsonfile.writeFile("backup/"+time+"/FORCE_BACKUP_INFO", user, function(err){
						client.hset("fbackup", "backupInformationSaved", "true");
					});
				}
			});
		}
		var time = new Date();
		console.log(par.term);
		if(par.term !== "true") {
			client.hset("config", "latestBackup", time.getTime()/60000);       
		}
		console.log("BACK UP");
		client.hset("fbackup", "backupStarted", "true");
		mkdirp('backup/'+time+'/', function(err) { 
			if(err) {
				console.log(err);
			}
			jsonfile.writeFile("backup/"+time+"/userList", userList, function(err){
				userList.forEach(function(user, index){
					client.hset("fbackup", "users", "true");
					client.hgetall(user, function(err, userInfo){
						jsonfile.writeFile("backup/"+time+"/user"+userInfo.id, userInfo, function(err){
						});
						if(index+1 == userList.length) {
							if(par.request == "forceBackup") {
								userList.forEach(function(userVer, index){
									fs.readFile("backup/"+time+"/user"+Number(userVer), 'utf8', function (err, data) {
										if(data !== undefined)
										{
											var verificationConfig = JSON.parse(data);
											client.hget(verificationConfig.id, "id", function(err, reply){
												if(verificationConfig.id == reply) {
													client.hset("fbackup", "usersVerified", "true");
												}
											});
										}
									});
								});
							}
						}
					});
					client.lrange("groups",0,-1, function(err, groups){
						jsonfile.writeFile("backup/"+time+"/groupList", groups, function(err){
							groups.forEach(function(group){
								client.hset("fbackup", "groups", "true");
								client.hgetall('grp'+group, function(err, groupInfo){
									jsonfile.writeFile("backup/"+time+"/group"+groupInfo.id, groupInfo, function(err){
									});
									if(index+1 == userList.length) {
										if(par.request == "forceBackup") {
											groups.forEach(function(groupVer, index){
												fs.readFile("backup/"+time+"/group"+Number(groupVer), 'utf8', function (err, data) {
													if(data !== undefined)
													{
														var verificationGroup = JSON.parse(data);
														client.hget('grp'+verificationGroup.id, "id", function(err, reply){
															if(verificationGroup.id == reply) {
																client.hset("fbackup", "groupsVerified", "true");
															}
														});
													}
												});
											});
										}
									}
								}); 
							});
						});
					});
					client.hgetall("config", function(err, config){
						jsonfile.writeFile("backup/"+time+"/config", config, function(err){
							client.hset("fbackup", "config", "true");
							if(par.request == "forceBackup") {
								fs.readFile("backup/"+time+"/config", 'utf8', function (err, data) {
									if(data !== undefined)
									{
										var verificationConfig = JSON.parse(data);
										if(verificationConfig.doBackup == config.doBackup) {
											client.hset("fbackup", "configValidate", "true");
											client.hset("fbackup", "overallVerified", "true");
										}
									}
								});
							}
						});
					});
				});
			});
		});
	});
	callback(200);
}

function getBackupInfo(callback) {
	var response = new Object();
	getUsrInfo(usrId, function(usrData){
		if(usrData.operator == "true") {
			client.hgetall("config", function(err, reply){
				if(err) {
					console.log(err);
				}
				reply.latestBackup = reply.latestBackup * 60000;
				var latest = new Date(reply.latestBackup);
				var next = new Date(Number(reply.latestBackup) + Number(reply.autoBackupInterval)*60000);
				var yearLatest = latest.getYear() + 1900;
				console.log(latest.getMonth());
				var yearNext = next.getYear() + 1900;
				response.latestBackup = latest.getHours() + ':' + latest.getMinutes() + ' ' + latest.getDate() + '/' + (latest.getMonth() + 1)+ '/' + yearLatest;
				response.nextBackup = next.getHours() + ':' + next.getMinutes() + ' ' + next.getDate() + '/' + (next.getMonth() + 1) + '/' + yearNext;
				fs.readdir('backup', function(err, backups){
					response.savedBackup = backups.length;
					response.autoBackupInterval = reply.autoBackupInterval;
					response.doBackup = reply.doBackup;
					callback(response);
				});
			});
		}
		else {
			callback(403);
		}
	});
}

function saveConfig(parameters, callback) {
	getUsrInfo(usrId, function(usrInfo){
		if(usrInfo.operator == "true") {
			if(parameters.term == "backup") {
				client.hmset("config", "autoBackupInterval", parameters.autoBackupInterval, "doBackup", parameters.doBackup);
				callback(200);
			}
		}
		else {
			callback(403);
		}
	});
}

function responder(request, response, next)
{
	if(par.origin == "usrPage" && par.request == "logout")
	{
		client.lpush('log', '['+Date()+']User '+usrId+' logged out');
		client.decr('loggedInCount');
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("User logged off");
		next();
	}
	if(par.origin == "usrPage" && par.request == "usrName")
	{
		client.lpush('log', '['+Date()+'] User '+request.session.data.user+' requested name. Responded with '+usrInfo.name);
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo.name);
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && par.request == "usrInfo" && usrInfo != 403)
	{
		response.writeHead(resCode, {"Content-Type: ": "text/plain"});
		response.write(JSON.stringify(usrInfo));
		next();
	}
	if(par.request == "backupInfo")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(JSON.stringify(backupInfo));
		resCode = 200;
		next();
	}
	if(par.request == "backupStatus" && resCode != 403)
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(JSON.stringify(resCode));
		resCode = 200;
		next();
	}
	if(par.request == "forceBackup")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(resCode);
		resCode = 200;
		next();
	}
	if(par.request == "saveConfig" && resCode != 403)
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("<script type='text/javascript'>window.location.href = 'dash.html?success=true&saved=Backup%20settings'</script>");
		resCode = 200;
		next();
	}
	if(par.request == "stats")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(stat.toString());
		resCode = 200;
		next();
	}
	if(par.request == "grpInfo")
	{
		console.log(resCode);
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(JSON.stringify(grpInfo));
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && resCode == 200 && par.request == "attention")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("Attention set");
		next();
	}
	if(resCode == 200 && par.request == "changeUsrInfo" || par.request == "changeGrpInfo")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("Info Updated");
		next();
	}
	if(par.origin == "usrPage" && par.request == "getAttention")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(resCode.toString());
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && par.request == "isAdmin")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo.admin);
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && par.request == "isOp")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo.operator);
		resCode = 200;
		next();
	}
	if(par.origin == "usrMgr" && par.request == "totalUsers" && resCode != 403)
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(resCode.toString());
		resCode = 200;
		next();
	}
	if(par.origin == "grpMgr" && par.request == "totalGroups" && resCode != 403)
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(resCode.toString());
		resCode = 200;
		next();
	}
	if(par.origin == "login" && resCode == 200)
	{
		client.lpush("log", '['+Date()+'] '+par.id+' LOGGED IN.');
		client.incr('loggedInCount');
		request.session.data.user = par.id;
		request.session.lifetime = 604800;
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("You have been logged in");
		next();
	}
	if(par.origin == "getName")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(request.session);
		response.end();

	}
	if(par.request == "crtGrp" && resCode != 403)
	{
		response.writeHead(301, {"Content-Type: ": "text/plain"});
		response.write("<a href='/grpMgmt.html?success=true'>Group Saved Click Me to Contiune</a>");
		response.end();

	}
	if(par.request == "crtUsr" && resCode != 403)
	{
		response.writeHead(301, {"Content-Type: ": "text/plain"});
		response.write("<script type='text/javascript'>window.location.href = 'crtUsr.html?success=true</script>'");
		response.end();

	}
	if(par.request == "log" && resCode == 200)
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(log.toString());
		response.end();

	}
	if(resCode != 200)
	{
		response.writeHead(resCode, {"Content-Type: ": "text/plain"});
		response.write("code: "+resCode);
		next();
	}
	response.end();
}

client.hgetall('config', function(err, config){
	if(err) {
		client.incr('totalErr');
		client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>Cannot load config from redis');
		console.log(err);
	}
	app.use(getPar);
	app.use(responder);

	if(config.resetLoggedInCount == "true") {
		client.set('loggedInCount', 0);
	}

	if(config.resetTotalReq == "true") {
		client.set('totalReq', 0);
	}
	if(config.resetTotalErr == "true") {
		client.set('totalErr', 0);
	}

	http.createServer(app).listen(8000);
	console.log("Server is running On port 8000");
});